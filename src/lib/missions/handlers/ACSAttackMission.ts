/**
 * ACSAttackMission Handler
 *
 * Handles ACS (Alliance Combat System) attack missions where multiple fleets
 * attack together in a coordinated assault.
 *
 * Key Differences from Regular Attack:
 * - Waits for all participating fleets to arrive
 * - Combines all attacking fleets into one battle
 * - Distributes loot based on cargo capacity
 * - All participants receive battle reports
 */

import type { MissionType } from '@/types/database'
import { BaseMission } from '../BaseMission'
import {
  MissionContext,
  MissionArrivalResult,
  MissionReturnResult,
  Resources,
  ShipCounts,
  emptyResources,
  emptyShipCounts,
  SHIP_KEYS,
  hasResources,
} from '../types'
import { createACSService } from '@/lib/acs'
import type { ACSParticipantDB } from '@/types/acs'

export class ACSAttackMission extends BaseMission {
  readonly missionType: MissionType = 'acs_attack'
  readonly hasReturn: boolean = true
  readonly name: string = 'ACS Attack'

  /**
   * Process ACS attack mission arrival
   *
   * When a fleet arrives at the ACS target:
   * 1. Mark participant as arrived
   * 2. Check if all participants have arrived
   * 3. If all arrived, execute combined battle via ACSService
   * 4. If not all arrived, wait (fleet stays at target)
   */
  async processArrival(context: MissionContext): Promise<MissionArrivalResult> {
    const { mission, targetPlanet, attackerResearch } = context

    // Find the ACS operation this mission belongs to
    const { data: participant } = await this.supabase
      .from('acs_participants')
      .select('*, acs_operations(*)')
      .eq('fleet_mission_id', mission.id)
      .single()

    if (!participant) {
      // Not part of an ACS operation - shouldn't happen, but handle gracefully
      const ships = this.getShips(mission)
      const resources = this.getResources(mission)

      const message = this.createMessage(
        mission.user_id,
        'battle',
        'ACS Mission Error',
        'This fleet was not properly linked to an ACS operation. Returning home.'
      )

      return this.successArrival(true, resources, ships, [message], [])
    }

    const operation = participant.acs_operations

    // Mark this participant as arrived
    await this.supabase
      .from('acs_participants')
      .update({
        status: 'arrived',
        arrival_time: new Date().toISOString(),
      })
      .eq('id', participant.id)

    // Check if all participants have arrived
    const { data: allParticipants } = await this.supabase
      .from('acs_participants')
      .select('*')
      .eq('acs_operation_id', operation.id)
      .in('status', ['confirmed', 'en_route', 'arrived'])

    const arrivedCount = allParticipants?.filter(p => p.status === 'arrived').length || 0
    const totalCount = allParticipants?.length || 0

    if (arrivedCount < totalCount) {
      // Not all fleets have arrived yet
      // The fleet waits at the target (no immediate return)
      // The mission processor will check again later
      const message = this.createMessage(
        mission.user_id,
        'battle',
        'ACS Fleet Waiting',
        `Your fleet has arrived at the target coordinates and is waiting for ${totalCount - arrivedCount} more fleet(s) to arrive.`
      )

      // Don't return yet - fleet waits
      return this.successArrival(false, emptyResources(), emptyShipCounts(), [message], [])
    }

    // All fleets have arrived - execute the ACS battle
    const acsService = createACSService(this.supabase)

    // Update operation status to in_progress
    await this.supabase
      .from('acs_operations')
      .update({ status: 'in_progress' })
      .eq('id', operation.id)

    // Execute the combined battle
    const battleResult = await acsService.executeACSBattle(operation.id)

    if (!battleResult.success) {
      const ships = this.getShips(mission)
      const resources = this.getResources(mission)

      const message = this.createMessage(
        mission.user_id,
        'battle',
        'ACS Battle Error',
        `An error occurred during the ACS battle: ${battleResult.error}`
      )

      return this.successArrival(true, resources, ships, [message], [])
    }

    // Find this participant's results
    const myResult = battleResult.result!.participant_results.find(
      r => r.user_id === mission.user_id
    )

    if (!myResult) {
      const ships = this.getShips(mission)
      const resources = this.getResources(mission)
      return this.successArrival(true, resources, ships, [], [])
    }

    // Create battle message for this participant
    const targetCoords = `[${operation.target_galaxy}:${operation.target_system}:${operation.target_position}]`
    const winnerText = battleResult.result!.winner === 'attacker'
      ? 'The attackers have won the battle!'
      : battleResult.result!.winner === 'defender'
        ? 'The defender has won the battle!'
        : 'The battle ended in a draw.'

    const lossesText = this.formatShipLosses(myResult.ships_lost)
    const lootText = `Metal: ${myResult.loot_share.metal.toLocaleString()}\nCrystal: ${myResult.loot_share.crystal.toLocaleString()}\nDeuterium: ${myResult.loot_share.deuterium.toLocaleString()}`

    const message = this.createMessage(
      mission.user_id,
      'battle',
      `ACS Battle Report - ${targetCoords}`,
      `${winnerText}\n\n` +
        `Total rounds: ${battleResult.result!.total_rounds}\n` +
        `Total participants: ${totalCount}\n\n` +
        `Your losses:\n${lossesText || 'None'}\n\n` +
        `Your loot share:\n${lootText}\n\n` +
        `Debris field created:\n` +
        `Metal: ${battleResult.result!.debris.metal.toLocaleString()}\n` +
        `Crystal: ${battleResult.result!.debris.crystal.toLocaleString()}\n\n` +
        (battleResult.result!.moon_created
          ? `A moon has been created! (${battleResult.result!.moon_chance}% chance)`
          : battleResult.result!.moon_chance > 0
            ? `Moon chance: ${battleResult.result!.moon_chance}% (no moon created)`
            : '')
    )

    // Calculate return ships and resources
    const returnShips = this.convertToShipCounts(myResult.ships_remaining)
    const originalResources = this.getResources(mission)
    const returnResources: Resources = {
      metal: originalResources.metal + myResult.loot_share.metal,
      crystal: originalResources.crystal + myResult.loot_share.crystal,
      deuterium: originalResources.deuterium + myResult.loot_share.deuterium,
    }

    return this.successArrival(true, returnResources, returnShips, [message], [])
  }

  /**
   * Process ACS attack mission return
   */
  async processReturn(context: MissionContext): Promise<MissionReturnResult> {
    const { mission, originPlanet } = context

    if (!originPlanet) {
      return this.errorReturn('Origin planet not found')
    }

    const ships = this.getShips(mission)
    const resources = this.getResources(mission)

    // Add ships back to origin
    const addShipsResult = await this.addShipsToPlanet(originPlanet.id, ships)
    if (!addShipsResult.success) {
      return this.errorReturn(`Failed to return ships: ${addShipsResult.error}`)
    }

    // Add resources (including loot share)
    if (hasResources(resources)) {
      const addResourcesResult = await this.addResourcesToPlanet(originPlanet.id, resources)
      if (!addResourcesResult.success) {
        return this.errorReturn(`Failed to return resources: ${addResourcesResult.error}`)
      }
    }

    // Update participant status
    await this.supabase
      .from('acs_participants')
      .update({ status: 'returned' })
      .eq('fleet_mission_id', mission.id)

    const message = this.createMessage(
      mission.user_id,
      'battle',
      'ACS Fleet Returned',
      `Your fleet has returned from the ACS attack mission.${
        hasResources(resources)
          ? `\n\nResources carried:\nMetal: ${resources.metal.toLocaleString()}\nCrystal: ${resources.crystal.toLocaleString()}\nDeuterium: ${resources.deuterium.toLocaleString()}`
          : ''
      }`
    )

    return this.successReturn([message], [])
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private convertToShipCounts(ships: Record<string, number>): ShipCounts {
    const result = emptyShipCounts()
    for (const key of SHIP_KEYS) {
      result[key] = ships[key] || 0
    }
    return result
  }

  private formatShipLosses(losses: Record<string, number>): string {
    const lines: string[] = []
    for (const [key, count] of Object.entries(losses)) {
      if (count > 0) {
        const name = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        lines.push(`${name}: ${count.toLocaleString()}`)
      }
    }
    return lines.join('\n')
  }
}
