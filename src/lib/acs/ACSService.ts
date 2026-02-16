/**
 * ACS Service - Alliance Combat System
 *
 * Manages coordinated multi-fleet attack and defense operations.
 *
 * Key Features:
 * - Create and manage ACS operations (attack or defend)
 * - Invite alliance members to join
 * - Synchronize fleet arrival times
 * - Execute combined fleet battles
 * - Distribute loot based on cargo capacity
 *
 * ACS Rules:
 * - Maximum 5 attacking fleets, 5 defending fleets
 * - All fleets must arrive within 30 seconds of each other
 * - Loot is distributed based on cargo capacity contribution
 * - Debris is accessible to all after battle
 * - A player can only participate in one ACS operation at a time
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { calculateFleetCargoCapacity } from '@/lib/game'
import {
  ACSOperation,
  ACSOperationDB,
  ACSParticipant,
  ACSParticipantDB,
  ACSInvitation,
  ACSInvitationDB,
  CreateACSOperationParams,
  JoinACSParams,
  InviteToACSParams,
  ACSBattleResult,
  ACS_MAX_PARTICIPANTS,
  ACS_DEFAULT_HOLD_TIME,
  ACS_INVITATION_EXPIRY_HOURS,
  ACS_SYNC_TOLERANCE_SECONDS,
} from '@/types/acs'
import type { Resources, ShipCounts } from '@/lib/missions/types'
import { BattleEngine } from '@/lib/battle/BattleEngine'
import type { FleetComposition, DefenseComposition, TechLevels, BattleResult } from '@/lib/battle/types'
import { SHIP_KEYS } from '@/lib/missions/types'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert database row to ACSOperation
 */
function dbToOperation(row: ACSOperationDB, participants: ACSParticipant[] = []): ACSOperation {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    target_planet_id: row.target_planet_id,
    target_coordinates: {
      galaxy: row.target_galaxy,
      system: row.target_system,
      position: row.target_position,
    },
    organizer_id: row.organizer_id,
    alliance_id: row.alliance_id || undefined,
    scheduled_arrival: new Date(row.scheduled_arrival),
    hold_time: row.hold_time,
    status: row.status,
    max_participants: row.max_participants,
    participants,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  }
}

/**
 * Convert database row to ACSParticipant
 */
function dbToParticipant(row: ACSParticipantDB): ACSParticipant {
  return {
    id: row.id,
    acs_operation_id: row.acs_operation_id,
    user_id: row.user_id,
    fleet_mission_id: row.fleet_mission_id,
    ships: row.ships || {},
    resources: {
      metal: row.metal || 0,
      crystal: row.crystal || 0,
      deuterium: row.deuterium || 0,
    },
    status: row.status,
    arrival_time: row.arrival_time ? new Date(row.arrival_time) : null,
    ships_lost: row.ships_lost || undefined,
    loot_share: row.loot_metal !== null
      ? {
          metal: row.loot_metal || 0,
          crystal: row.loot_crystal || 0,
          deuterium: row.loot_deuterium || 0,
        }
      : undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  }
}

/**
 * Convert database row to ACSInvitation
 */
function dbToInvitation(row: ACSInvitationDB): ACSInvitation {
  return {
    id: row.id,
    acs_operation_id: row.acs_operation_id,
    invited_user_id: row.invited_user_id,
    invited_by: row.invited_by,
    message: row.message || undefined,
    status: row.status,
    created_at: new Date(row.created_at),
    expires_at: new Date(row.expires_at),
  }
}

// calculateFleetCargoCapacity imported from @/game/constants

/**
 * Merge multiple fleets into one combined fleet
 */
function mergeFleets(fleets: Array<Record<string, number>>): Record<string, number> {
  const merged: Record<string, number> = {}
  for (const fleet of fleets) {
    for (const [ship, count] of Object.entries(fleet)) {
      merged[ship] = (merged[ship] || 0) + count
    }
  }
  return merged
}

// ============================================================================
// ACS SERVICE CLASS
// ============================================================================

export class ACSService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // ==========================================================================
  // CREATE OPERATIONS
  // ==========================================================================

  /**
   * Create a new ACS operation
   *
   * @param organizerId - User ID of the organizer
   * @param params - Operation parameters
   * @returns Created operation or error
   */
  async createACSOperation(
    organizerId: string,
    params: CreateACSOperationParams
  ): Promise<{ success: boolean; operation?: ACSOperation; error?: string }> {
    try {
      // Check if user is already in an active ACS operation
      const { data: existingParticipation } = await this.supabase
        .from('acs_participants')
        .select('id, acs_operation_id')
        .eq('user_id', organizerId)
        .in('status', ['invited', 'confirmed', 'en_route'])
        .single()

      if (existingParticipation) {
        return {
          success: false,
          error: 'You are already participating in an active ACS operation',
        }
      }

      let targetPlanetId = params.target_planet_id
      if (!targetPlanetId) {
        const { data: planet } = await this.supabase
          .from('planets_compat')
          .select('id')
          .eq('galaxy', params.target_galaxy)
          .eq('system', params.target_system)
          .eq('position', params.target_position)
          .single()

        if (planet) {
          targetPlanetId = planet.id
        }
      }

      // Create the operation
      const operationData = {
        name: params.name,
        type: params.type,
        target_planet_id: targetPlanetId || null,
        target_galaxy: params.target_galaxy,
        target_system: params.target_system,
        target_position: params.target_position,
        organizer_id: organizerId,
        alliance_id: params.alliance_id || null,
        scheduled_arrival: params.scheduled_arrival.toISOString(),
        hold_time: params.hold_time ?? ACS_DEFAULT_HOLD_TIME,
        status: 'forming' as const,
        max_participants: ACS_MAX_PARTICIPANTS,
      }

      const { data: operation, error } = await this.supabase
        .from('acs_operations')
        .insert(operationData)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Organizer automatically becomes a participant
      await this.supabase.from('acs_participants').insert({
        acs_operation_id: operation.id,
        user_id: organizerId,
        ships: {},
        metal: 0,
        crystal: 0,
        deuterium: 0,
        status: 'confirmed',
        arrival_time: null,
      })

      return {
        success: true,
        operation: dbToOperation(operation as ACSOperationDB, []),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create ACS operation',
      }
    }
  }

  // ==========================================================================
  // INVITATION MANAGEMENT
  // ==========================================================================

  /**
   * Invite a user to join an ACS operation
   *
   * @param inviterId - User ID sending the invitation
   * @param params - Invitation parameters
   * @returns Created invitation or error
   */
  async inviteToACS(
    inviterId: string,
    params: InviteToACSParams
  ): Promise<{ success: boolean; invitation?: ACSInvitation; error?: string }> {
    try {
      // Get the operation
      const { data: operation } = await this.supabase
        .from('acs_operations')
        .select('*')
        .eq('id', params.operation_id)
        .single()

      if (!operation) {
        return { success: false, error: 'ACS operation not found' }
      }

      // Check if inviter is the organizer or a participant
      const isOrganizer = operation.organizer_id === inviterId
      const { data: inviterParticipant } = await this.supabase
        .from('acs_participants')
        .select('id')
        .eq('acs_operation_id', params.operation_id)
        .eq('user_id', inviterId)
        .single()

      if (!isOrganizer && !inviterParticipant) {
        return {
          success: false,
          error: 'Only organizers or participants can invite others',
        }
      }

      // Check operation status
      if (operation.status !== 'forming') {
        return {
          success: false,
          error: 'Cannot invite to an operation that is not forming',
        }
      }

      // Check current participant count
      const { count } = await this.supabase
        .from('acs_participants')
        .select('*', { count: 'exact', head: true })
        .eq('acs_operation_id', params.operation_id)

      if ((count || 0) >= ACS_MAX_PARTICIPANTS) {
        return {
          success: false,
          error: `Maximum ${ACS_MAX_PARTICIPANTS} participants reached`,
        }
      }

      // Check if user is already invited or participating
      const { data: existingInvite } = await this.supabase
        .from('acs_invitations')
        .select('id, status')
        .eq('acs_operation_id', params.operation_id)
        .eq('invited_user_id', params.user_id)
        .single()

      if (existingInvite) {
        return {
          success: false,
          error: 'User has already been invited to this operation',
        }
      }

      // Check if user is already participating in another operation
      const { data: activeParticipation } = await this.supabase
        .from('acs_participants')
        .select('id')
        .eq('user_id', params.user_id)
        .in('status', ['invited', 'confirmed', 'en_route'])
        .single()

      if (activeParticipation) {
        return {
          success: false,
          error: 'User is already participating in another ACS operation',
        }
      }

      // Create invitation
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + ACS_INVITATION_EXPIRY_HOURS)

      const { data: invitation, error } = await this.supabase
        .from('acs_invitations')
        .insert({
          acs_operation_id: params.operation_id,
          invited_user_id: params.user_id,
          invited_by: inviterId,
          message: params.message || null,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        invitation: dbToInvitation(invitation as ACSInvitationDB),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invitation',
      }
    }
  }

  /**
   * Accept an invitation and configure fleet
   *
   * @param userId - User accepting the invitation
   * @param params - Join parameters with fleet configuration
   * @returns Participant entry or error
   */
  async joinACS(
    userId: string,
    params: JoinACSParams
  ): Promise<{ success: boolean; participant?: ACSParticipant; error?: string }> {
    try {
      // Get the operation
      const { data: operation } = await this.supabase
        .from('acs_operations')
        .select('*')
        .eq('id', params.operation_id)
        .single()

      if (!operation) {
        return { success: false, error: 'ACS operation not found' }
      }

      if (operation.status !== 'forming') {
        return {
          success: false,
          error: 'Cannot join an operation that is not forming',
        }
      }

      // Check if user has a valid invitation
      const { data: invitation } = await this.supabase
        .from('acs_invitations')
        .select('*')
        .eq('acs_operation_id', params.operation_id)
        .eq('invited_user_id', userId)
        .eq('status', 'pending')
        .single()

      if (!invitation) {
        return { success: false, error: 'No pending invitation found' }
      }

      // Check if invitation expired
      if (new Date(invitation.expires_at) < new Date()) {
        await this.supabase
          .from('acs_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id)
        return { success: false, error: 'Invitation has expired' }
      }

      // Check current participant count
      const { count } = await this.supabase
        .from('acs_participants')
        .select('*', { count: 'exact', head: true })
        .eq('acs_operation_id', params.operation_id)

      if ((count || 0) >= ACS_MAX_PARTICIPANTS) {
        return {
          success: false,
          error: `Maximum ${ACS_MAX_PARTICIPANTS} participants reached`,
        }
      }

      // Validate ships
      if (!params.ships || Object.keys(params.ships).length === 0) {
        return { success: false, error: 'At least one ship type is required' }
      }

      // Create participant
      const { data: participant, error } = await this.supabase
        .from('acs_participants')
        .insert({
          acs_operation_id: params.operation_id,
          user_id: userId,
          ships: params.ships,
          metal: params.resources?.metal || 0,
          crystal: params.resources?.crystal || 0,
          deuterium: params.resources?.deuterium || 0,
          status: 'confirmed',
          arrival_time: null,
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Update invitation status
      await this.supabase
        .from('acs_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id)

      return {
        success: true,
        participant: dbToParticipant(participant as ACSParticipantDB),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join ACS operation',
      }
    }
  }

  /**
   * Decline an invitation
   */
  async declineInvitation(
    userId: string,
    invitationId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('acs_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId)
      .eq('invited_user_id', userId)
      .eq('status', 'pending')

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  }

  // ==========================================================================
  // OPERATION MANAGEMENT
  // ==========================================================================

  /**
   * Get operation by ID with participants
   */
  async getOperation(
    operationId: string
  ): Promise<{ success: boolean; operation?: ACSOperation; error?: string }> {
    try {
      const { data: operation } = await this.supabase
        .from('acs_operations')
        .select('*')
        .eq('id', operationId)
        .single()

      if (!operation) {
        return { success: false, error: 'Operation not found' }
      }

      const { data: participants } = await this.supabase
        .from('acs_participants')
        .select('*')
        .eq('acs_operation_id', operationId)

      return {
        success: true,
        operation: dbToOperation(
          operation as ACSOperationDB,
          (participants || []).map(dbToParticipant)
        ),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get operation',
      }
    }
  }

  /**
   * Get all operations for a user (organizer or participant)
   */
  async getUserOperations(
    userId: string,
    includeCompleted = false
  ): Promise<{ success: boolean; operations: ACSOperation[] }> {
    try {
      // Get operations where user is organizer
      const { data: organized } = await this.supabase
        .from('acs_operations')
        .select('*')
        .eq('organizer_id', userId)
        .order('created_at', { ascending: false })

      // Get operations where user is participant
      const { data: participations } = await this.supabase
        .from('acs_participants')
        .select('acs_operation_id')
        .eq('user_id', userId)

      const participatedIds = participations?.map(p => p.acs_operation_id) || []

      const { data: participated } = await this.supabase
        .from('acs_operations')
        .select('*')
        .in('id', participatedIds)
        .not('organizer_id', 'eq', userId)
        .order('created_at', { ascending: false })

      // Combine and filter
      const allOperations = [...(organized || []), ...(participated || [])]
      const filtered = includeCompleted
        ? allOperations
        : allOperations.filter(op => op.status !== 'completed' && op.status !== 'cancelled')

      if (filtered.length === 0) {
        return { success: true, operations: [] }
      }

      // Batch fetch all participants for filtered operations (fixes N+1 query)
      const operationIds = filtered.map(op => op.id)
      const { data: allParticipants } = await this.supabase
        .from('acs_participants')
        .select('*')
        .in('acs_operation_id', operationIds)

      // Group participants by operation ID
      const participantsByOp = new Map<string, typeof allParticipants>()
      for (const p of allParticipants || []) {
        const existing = participantsByOp.get(p.acs_operation_id) || []
        existing.push(p)
        participantsByOp.set(p.acs_operation_id, existing)
      }

      // Build operations with their participants
      const operations: ACSOperation[] = filtered.map(op =>
        dbToOperation(
          op as ACSOperationDB,
          (participantsByOp.get(op.id) || []).map(dbToParticipant)
        )
      )

      return { success: true, operations }
    } catch (error) {
      return { success: true, operations: [] }
    }
  }

  /**
   * Cancel an ACS operation (organizer only)
   */
  async cancelOperation(
    userId: string,
    operationId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data: operation } = await this.supabase
      .from('acs_operations')
      .select('organizer_id, status')
      .eq('id', operationId)
      .single()

    if (!operation) {
      return { success: false, error: 'Operation not found' }
    }

    if (operation.organizer_id !== userId) {
      return { success: false, error: 'Only the organizer can cancel the operation' }
    }

    if (operation.status === 'in_progress') {
      return { success: false, error: 'Cannot cancel an operation in progress' }
    }

    const { error } = await this.supabase
      .from('acs_operations')
      .update({ status: 'cancelled' })
      .eq('id', operationId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Leave an ACS operation (participant only, not organizer)
   */
  async leaveOperation(
    userId: string,
    operationId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data: operation } = await this.supabase
      .from('acs_operations')
      .select('organizer_id, status')
      .eq('id', operationId)
      .single()

    if (!operation) {
      return { success: false, error: 'Operation not found' }
    }

    if (operation.organizer_id === userId) {
      return {
        success: false,
        error: 'Organizer cannot leave. Cancel the operation instead.',
      }
    }

    if (operation.status !== 'forming') {
      return { success: false, error: 'Cannot leave an operation that has launched' }
    }

    // Delete participation
    const { error } = await this.supabase
      .from('acs_participants')
      .delete()
      .eq('acs_operation_id', operationId)
      .eq('user_id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  // ==========================================================================
  // TIMING CALCULATIONS
  // ==========================================================================

  /**
   * Calculate synchronized arrival time for all participants
   * All fleets should arrive within the tolerance window
   */
  calculateSyncedArrival(participants: ACSParticipant[]): Date {
    const confirmedParticipants = participants.filter(
      p => p.status === 'confirmed' && p.arrival_time
    )

    if (confirmedParticipants.length === 0) {
      return new Date()
    }

    // Find the latest arrival time
    const arrivalTimes = confirmedParticipants
      .map(p => p.arrival_time!.getTime())
      .sort((a, b) => b - a)

    const latestArrival = arrivalTimes[0]

    // Add hold time for synchronization
    return new Date(latestArrival + ACS_SYNC_TOLERANCE_SECONDS * 1000)
  }

  // ==========================================================================
  // BATTLE EXECUTION
  // ==========================================================================

  /**
   * Execute an ACS battle when all participants have arrived
   *
   * This combines all attacking/defending fleets and runs a single battle.
   */
  async executeACSBattle(
    operationId: string
  ): Promise<{ success: boolean; result?: ACSBattleResult; error?: string }> {
    try {
      // Get operation
      const { data: operation } = await this.supabase
        .from('acs_operations')
        .select('*')
        .eq('id', operationId)
        .single()

      if (!operation) {
        return { success: false, error: 'Operation not found' }
      }

      if (operation.status !== 'in_progress') {
        return { success: false, error: 'Operation is not in progress' }
      }

      // Get all participants
      const { data: participants } = await this.supabase
        .from('acs_participants')
        .select('*')
        .eq('acs_operation_id', operationId)
        .eq('status', 'arrived')

      if (!participants || participants.length === 0) {
        return { success: false, error: 'No participants have arrived' }
      }

      const { data: targetPlanet } = await this.supabase
        .from('planets_compat')
        .select('*')
        .eq('id', operation.target_planet_id)
        .single()

      if (!targetPlanet) {
        await this.handleEmptyTarget(operationId, participants)
        return {
          success: true,
          result: {
            winner: 'attacker',
            total_rounds: 0,
            debris: { metal: 0, crystal: 0 },
            moon_chance: 0,
            moon_created: false,
            participant_results: await Promise.all(participants.map(async p => ({
              user_id: p.user_id,
              ships_remaining: p.ships,
              ships_lost: {},
              loot_share: { metal: 0, crystal: 0, deuterium: 0 },
              cargo_used: 0,
              cargo_capacity: await calculateFleetCargoCapacity(p.ships),
            }))),
          },
        }
      }

      // Build combined attacker fleet
      const attackerFleets = participants.map(p => p.ships as Record<string, number>)
      const combinedAttackerFleet = mergeFleets(attackerFleets)

      // Get defender's fleet and defense
      const defenderFleet = this.extractFleetFromPlanet(targetPlanet)
      const defenderDefense = this.extractDefenseFromPlanet(targetPlanet)
      const defenderResources: Resources = {
        metal: targetPlanet.metal || 0,
        crystal: targetPlanet.crystal || 0,
        deuterium: targetPlanet.deuterium || 0,
      }

      // Get tech levels for attacker (use average or highest)
      const attackerTech = await this.getAverageTechLevels(
        participants.map(p => p.user_id)
      )

      // Get defender tech levels
      const { data: defenderResearch } = await this.supabase
        .from('user_research')
        .select('weapons_technology, shielding_technology, armor_technology')
        .eq('user_id', targetPlanet.user_id)
        .single()

      const defenderTech: TechLevels = {
        weaponsTech: defenderResearch?.weapons_technology || 0,
        shieldTech: defenderResearch?.shielding_technology || 0,
        armorTech: defenderResearch?.armor_technology || 0,
      }

      // Execute battle
      const engine = await BattleEngine.create(attackerTech, defenderTech)
      const battleResult = engine.simulate(
        combinedAttackerFleet as FleetComposition,
        defenderFleet,
        defenderDefense,
        defenderResources
      )

      // Distribute results among participants
      const acsResult = await this.distributeResults(
        operationId,
        participants,
        battleResult,
        targetPlanet.id
      )

      // Update operation status
      await this.supabase
        .from('acs_operations')
        .update({ status: 'completed' })
        .eq('id', operationId)

      return { success: true, result: acsResult }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute ACS battle',
      }
    }
  }

  /**
   * Distribute battle results among ACS participants
   */
  private async distributeResults(
    operationId: string,
    participants: ACSParticipantDB[],
    battleResult: BattleResult,
    targetPlanetId: string
  ): Promise<ACSBattleResult> {
    // Calculate total cargo capacity
    const participantCargos = await Promise.all(participants.map(async p => ({
      userId: p.user_id,
      capacity: await calculateFleetCargoCapacity(p.ships),
      ships: p.ships as Record<string, number>,
    })))

    const totalCargo = participantCargos.reduce((sum, p) => sum + p.capacity, 0)

    // Distribute loot based on cargo capacity proportion
    const totalLoot = battleResult.loot.metal + battleResult.loot.crystal + battleResult.loot.deuterium
    const participantResults: ACSBattleResult['participant_results'] = []

    for (const participant of participantCargos) {
      const proportion = totalCargo > 0 ? participant.capacity / totalCargo : 0
      const lootShare: Resources = {
        metal: Math.floor(battleResult.loot.metal * proportion),
        crystal: Math.floor(battleResult.loot.crystal * proportion),
        deuterium: Math.floor(battleResult.loot.deuterium * proportion),
      }

      // Distribute ship losses proportionally
      const shipProportion = this.calculateShipProportion(
        participant.ships,
        participants.map(p => p.ships as Record<string, number>)
      )

      const shipsLost = this.calculateProportionalLosses(
        battleResult.attackerLosses.ships,
        shipProportion
      )

      const shipsRemaining: Record<string, number> = {}
      for (const [ship, count] of Object.entries(participant.ships)) {
        shipsRemaining[ship] = Math.max(0, (count as number) - (shipsLost[ship] || 0))
      }

      const cargoUsed = lootShare.metal + lootShare.crystal + lootShare.deuterium

      participantResults.push({
        user_id: participant.userId,
        ships_remaining: shipsRemaining,
        ships_lost: shipsLost,
        loot_share: lootShare,
        cargo_used: cargoUsed,
        cargo_capacity: participant.capacity,
      })
    }

    // Batch update all participants in parallel (fixes N+1 query)
    await Promise.all(participantResults.map(result =>
      this.supabase
        .from('acs_participants')
        .update({
          status: 'returned',
          ships_lost: result.ships_lost,
          loot_metal: result.loot_share.metal,
          loot_crystal: result.loot_share.crystal,
          loot_deuterium: result.loot_share.deuterium,
        })
        .eq('acs_operation_id', operationId)
        .eq('user_id', result.user_id)
    ))

    if (battleResult.winner === 'attacker') {
      await this.supabase
        .from('player_colonies')
        .update({
          metal: Math.max(0, (await this.getPlanetResources(targetPlanetId)).metal - battleResult.loot.metal),
          crystal: Math.max(0, (await this.getPlanetResources(targetPlanetId)).crystal - battleResult.loot.crystal),
          deuterium: Math.max(0, (await this.getPlanetResources(targetPlanetId)).deuterium - battleResult.loot.deuterium),
        })
        .eq('id', targetPlanetId)
    }

    return {
      winner: battleResult.winner,
      total_rounds: battleResult.totalRounds,
      debris: battleResult.debris,
      moon_chance: battleResult.moonChance,
      moon_created: battleResult.moonCreated,
      participant_results: participantResults,
    }
  }

  /**
   * Handle case when target position is empty
   */
  private async handleEmptyTarget(
    operationId: string,
    participants: ACSParticipantDB[]
  ): Promise<void> {
    // Batch update all participants in parallel (fixes N+1 query)
    await Promise.all([
      // Update all participants at once using IN clause
      this.supabase
        .from('acs_participants')
        .update({
          status: 'returned',
          ships_lost: {},
          loot_metal: 0,
          loot_crystal: 0,
          loot_deuterium: 0,
        })
        .eq('acs_operation_id', operationId)
        .in('user_id', participants.map(p => p.user_id)),
      // Update operation status
      this.supabase
        .from('acs_operations')
        .update({ status: 'completed' })
        .eq('id', operationId)
    ])
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private extractFleetFromPlanet(planet: Record<string, unknown>): FleetComposition {
    const fleet: FleetComposition = {}
    for (const key of SHIP_KEYS) {
      const count = planet[key] as number | undefined
      if (count && count > 0) {
        fleet[key] = count
      }
    }
    return fleet
  }

  private extractDefenseFromPlanet(planet: Record<string, unknown>): DefenseComposition {
    const defenseKeys = [
      'rocket_launcher',
      'light_laser',
      'heavy_laser',
      'gauss_cannon',
      'ion_cannon',
      'plasma_turret',
      'small_shield_dome',
      'large_shield_dome',
    ]

    const defense: DefenseComposition = {}
    for (const key of defenseKeys) {
      const count = planet[key] as number | undefined
      if (count && count > 0) {
        defense[key as keyof DefenseComposition] = count
      }
    }
    return defense
  }

  private async getAverageTechLevels(userIds: string[]): Promise<TechLevels> {
    const { data: researches } = await this.supabase
      .from('user_research')
      .select('weapons_technology, shielding_technology, armor_technology')
      .in('user_id', userIds)

    if (!researches || researches.length === 0) {
      return { weaponsTech: 0, shieldTech: 0, armorTech: 0 }
    }

    const totals = researches.reduce(
      (acc, r) => ({
        weapons: acc.weapons + (r.weapons_technology || 0),
        shields: acc.shields + (r.shielding_technology || 0),
        armor: acc.armor + (r.armor_technology || 0),
      }),
      { weapons: 0, shields: 0, armor: 0 }
    )

    return {
      weaponsTech: Math.round(totals.weapons / researches.length),
      shieldTech: Math.round(totals.shields / researches.length),
      armorTech: Math.round(totals.armor / researches.length),
    }
  }

  private calculateShipProportion(
    fleet: Record<string, number>,
    allFleets: Array<Record<string, number>>
  ): number {
    const totalShips = allFleets.reduce((sum, f) => {
      return sum + Object.values(f).reduce((s, c) => s + (c as number), 0)
    }, 0)

    const myShips = Object.values(fleet).reduce((sum, c) => sum + (c as number), 0)
    return totalShips > 0 ? myShips / totalShips : 0
  }

  private calculateProportionalLosses(
    totalLosses: Partial<ShipCounts>,
    proportion: number
  ): Record<string, number> {
    const losses: Record<string, number> = {}
    for (const [ship, count] of Object.entries(totalLosses)) {
      if (count) {
        losses[ship] = Math.ceil(count * proportion)
      }
    }
    return losses
  }

  private async getPlanetResources(planetId: string): Promise<Resources> {
    const { data } = await this.supabase
      .from('planets_compat')
      .select('metal, crystal, deuterium')
      .eq('id', planetId)
      .single()

    return {
      metal: data?.metal || 0,
      crystal: data?.crystal || 0,
      deuterium: data?.deuterium || 0,
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create an ACS service instance
 */
export function createACSService(supabase: SupabaseClient): ACSService {
  return new ACSService(supabase)
}
