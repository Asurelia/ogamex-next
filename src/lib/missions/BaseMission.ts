/**
 * BaseMission - Abstract base class for all mission handlers
 *
 * Provides common functionality for mission processing including:
 * - Resource and ship extraction from missions
 * - Return mission creation
 * - Message sending utilities
 * - Planet update utilities
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { FleetMission, Planet, MissionType } from '@/types/database'
import {
  IMissionHandler,
  MissionContext,
  MissionArrivalResult,
  MissionReturnResult,
  MissionMessage,
  MissionUpdate,
  Resources,
  ShipCounts,
  SHIP_KEYS,
  emptyResources,
  emptyShipCounts,
  formatCoordinates,
  hasResources,
  getTotalShips,
} from './types'

export abstract class BaseMission implements IMissionHandler {
  abstract readonly missionType: MissionType
  abstract readonly hasReturn: boolean
  abstract readonly name: string

  protected supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // ============================================================================
  // ABSTRACT METHODS - Must be implemented by child classes
  // ============================================================================

  abstract processArrival(context: MissionContext): Promise<MissionArrivalResult>
  abstract processReturn(context: MissionContext): Promise<MissionReturnResult>

  // ============================================================================
  // RESOURCE EXTRACTION
  // ============================================================================

  /**
   * Extract resources from a fleet mission
   */
  protected getResources(mission: FleetMission): Resources {
    return {
      metal: mission.metal || 0,
      crystal: mission.crystal || 0,
      deuterium: mission.deuterium || 0,
    }
  }

  /**
   * Extract ship counts from a fleet mission
   */
  protected getShips(mission: FleetMission): ShipCounts {
    const ships = emptyShipCounts()
    for (const key of SHIP_KEYS) {
      ships[key] = (mission as unknown as Record<string, number>)[key] || 0
    }
    return ships
  }

  // ============================================================================
  // RETURN MISSION HELPERS
  // ============================================================================

  /**
   * Create a return mission from the current mission
   * Returns the data needed to insert a new return mission
   */
  protected createReturnMissionData(
    mission: FleetMission,
    resources: Resources,
    ships: ShipCounts
  ): Partial<FleetMission> {
    const now = new Date()
    const arrivalTime = new Date(mission.arrives_at)
    const departedTime = new Date(mission.departed_at)

    // Calculate one-way duration
    const oneWayDuration = arrivalTime.getTime() - departedTime.getTime()

    // Return departure is now (arrival time of outbound mission)
    const returnDeparture = arrivalTime
    const returnArrival = new Date(returnDeparture.getTime() + oneWayDuration)

    return {
      user_id: mission.user_id,
      // Swap origin and destination
      origin_planet_id: mission.origin_planet_id, // Keep original origin for return
      origin_galaxy: mission.destination_galaxy,
      origin_system: mission.destination_system,
      origin_position: mission.destination_position,
      destination_galaxy: mission.origin_galaxy,
      destination_system: mission.origin_system,
      destination_position: mission.origin_position,
      destination_type: 'planet' as const,
      mission_type: mission.mission_type,
      // Ships
      light_fighter: ships.light_fighter,
      heavy_fighter: ships.heavy_fighter,
      cruiser: ships.cruiser,
      battleship: ships.battleship,
      battlecruiser: ships.battlecruiser,
      bomber: ships.bomber,
      destroyer: ships.destroyer,
      deathstar: ships.deathstar,
      small_cargo: ships.small_cargo,
      large_cargo: ships.large_cargo,
      colony_ship: ships.colony_ship,
      recycler: ships.recycler,
      espionage_probe: ships.espionage_probe,
      reaper: ships.reaper,
      pathfinder: ships.pathfinder,
      // Resources
      metal: resources.metal,
      crystal: resources.crystal,
      deuterium: resources.deuterium,
      // Timing
      departed_at: returnDeparture.toISOString(),
      arrives_at: returnArrival.toISOString(),
      returns_at: null,
      // Status
      is_returning: true,
      processed: false,
      cancelled: false,
    }
  }

  /**
   * Insert a return mission into the database
   */
  protected async insertReturnMission(
    mission: FleetMission,
    resources: Resources,
    ships: ShipCounts
  ): Promise<{ success: boolean; missionId?: string; error?: string }> {
    // Don't create return mission if no ships remaining
    if (getTotalShips(ships) === 0) {
      return { success: true }
    }

    const returnData = this.createReturnMissionData(mission, resources, ships)

    const { data, error } = await this.supabase
      .from('fleet_missions')
      .insert(returnData)
      .select('id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, missionId: data.id }
  }

  // ============================================================================
  // PLANET UPDATE HELPERS
  // ============================================================================

  /**
   * Add resources to a planet
   */
  protected async addResourcesToPlanet(
    planetId: string,
    resources: Resources
  ): Promise<{ success: boolean; error?: string }> {
    if (!hasResources(resources)) {
      return { success: true }
    }

    const { error } = await this.supabase.rpc('add_resources_to_planet', {
      p_planet_id: planetId,
      p_metal: resources.metal,
      p_crystal: resources.crystal,
      p_deuterium: resources.deuterium,
    })

    // Fallback if RPC doesn't exist - use direct update
    if (error?.code === 'PGRST202') {
      const { data: planet } = await this.supabase
        .from('planets')
        .select('metal, crystal, deuterium')
        .eq('id', planetId)
        .single()

      if (!planet) {
        return { success: false, error: 'Planet not found' }
      }

      const { error: updateError } = await this.supabase
        .from('planets')
        .update({
          metal: planet.metal + resources.metal,
          crystal: planet.crystal + resources.crystal,
          deuterium: planet.deuterium + resources.deuterium,
        })
        .eq('id', planetId)

      if (updateError) {
        return { success: false, error: updateError.message }
      }
    } else if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Deduct resources from a planet
   */
  protected async deductResourcesFromPlanet(
    planetId: string,
    resources: Resources
  ): Promise<{ success: boolean; error?: string }> {
    if (!hasResources(resources)) {
      return { success: true }
    }

    const { data: planet } = await this.supabase
      .from('planets')
      .select('metal, crystal, deuterium')
      .eq('id', planetId)
      .single()

    if (!planet) {
      return { success: false, error: 'Planet not found' }
    }

    const { error } = await this.supabase
      .from('planets')
      .update({
        metal: Math.max(0, planet.metal - resources.metal),
        crystal: Math.max(0, planet.crystal - resources.crystal),
        deuterium: Math.max(0, planet.deuterium - resources.deuterium),
      })
      .eq('id', planetId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Add ships to a planet
   */
  protected async addShipsToPlanet(
    planetId: string,
    ships: ShipCounts
  ): Promise<{ success: boolean; error?: string }> {
    if (getTotalShips(ships) === 0) {
      return { success: true }
    }

    const { data: planet } = await this.supabase
      .from('planets')
      .select(SHIP_KEYS.join(', '))
      .eq('id', planetId)
      .single()

    if (!planet) {
      return { success: false, error: 'Planet not found' }
    }

    const planetData = planet as unknown as Record<string, number>
    const updateData: Record<string, number> = {}
    for (const key of SHIP_KEYS) {
      if (ships[key] > 0) {
        updateData[key] = (planetData[key] || 0) + ships[key]
      }
    }

    const { error } = await this.supabase
      .from('planets')
      .update(updateData)
      .eq('id', planetId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  /**
   * Remove ships from a planet
   */
  protected async removeShipsFromPlanet(
    planetId: string,
    ships: ShipCounts
  ): Promise<{ success: boolean; error?: string }> {
    if (getTotalShips(ships) === 0) {
      return { success: true }
    }

    const { data: planet } = await this.supabase
      .from('planets')
      .select(SHIP_KEYS.join(', '))
      .eq('id', planetId)
      .single()

    if (!planet) {
      return { success: false, error: 'Planet not found' }
    }

    const planetData = planet as unknown as Record<string, number>
    const updateData: Record<string, number> = {}
    for (const key of SHIP_KEYS) {
      if (ships[key] > 0) {
        updateData[key] = Math.max(0, (planetData[key] || 0) - ships[key])
      }
    }

    const { error } = await this.supabase
      .from('planets')
      .update(updateData)
      .eq('id', planetId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  // ============================================================================
  // MESSAGE HELPERS
  // ============================================================================

  /**
   * Create a system message for a user
   */
  protected createMessage(
    userId: string,
    type: 'transport' | 'battle' | 'espionage' | 'expedition' | 'system',
    subject: string,
    body: string
  ): MissionMessage {
    return {
      recipient: 'origin',
      userId,
      type,
      subject,
      body,
    }
  }

  /**
   * Send a message to a user
   */
  protected async sendMessage(
    userId: string,
    type: 'transport' | 'battle' | 'espionage' | 'expedition' | 'system',
    subject: string,
    body: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase.from('messages').insert({
      user_id: userId,
      sender_id: null,
      type,
      subject,
      body,
      read: false,
      deleted: false,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  // ============================================================================
  // MISSION STATUS HELPERS
  // ============================================================================

  /**
   * Mark a mission as processed
   */
  protected async markMissionProcessed(
    missionId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('fleet_missions')
      .update({ processed: true })
      .eq('id', missionId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Create a success result for arrival
   */
  protected successArrival(
    shouldReturn: boolean,
    returnResources: Resources = emptyResources(),
    returnShips: ShipCounts = emptyShipCounts(),
    messages: MissionMessage[] = [],
    updates: MissionUpdate[] = []
  ): MissionArrivalResult {
    return {
      success: true,
      shouldReturn,
      returnResources,
      returnShips,
      messages,
      updates,
    }
  }

  /**
   * Create an error result for arrival
   */
  protected errorArrival(error: string): MissionArrivalResult {
    return {
      success: false,
      shouldReturn: false,
      returnResources: emptyResources(),
      returnShips: emptyShipCounts(),
      messages: [],
      updates: [],
      error,
    }
  }

  /**
   * Create a success result for return
   */
  protected successReturn(
    messages: MissionMessage[] = [],
    updates: MissionUpdate[] = []
  ): MissionReturnResult {
    return {
      success: true,
      messages,
      updates,
    }
  }

  /**
   * Create an error result for return
   */
  protected errorReturn(error: string): MissionReturnResult {
    return {
      success: false,
      messages: [],
      updates: [],
      error,
    }
  }

  /**
   * Format coordinates for display in messages
   */
  protected formatCoords(galaxy: number, system: number, position: number): string {
    return formatCoordinates({ galaxy, system, position })
  }
}
