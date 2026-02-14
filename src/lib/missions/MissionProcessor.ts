/**
 * MissionProcessor - Main dispatcher for fleet mission processing
 *
 * Handles:
 * - Fetching pending missions from database
 * - Dispatching to appropriate mission handlers
 * - Processing mission arrivals and returns
 * - Error handling and logging
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { FleetMission, MissionType, Planet, UserResearch } from '@/types/database'
import {
  MissionContext,
  MissionProcessResult,
  MissionProcessorOptions,
  MissionError,
  DEFAULT_PROCESSOR_OPTIONS,
  IMissionHandler,
} from './types'

// Import mission handlers
import { TransportMission } from './handlers/TransportMission'
import { DeploymentMission } from './handlers/DeploymentMission'
import { AttackMission } from './handlers/AttackMission'
import { ColonizationMission } from './handlers/ColonizationMission'
import { EspionageMission } from './handlers/EspionageMission'
import { RecycleMission } from './handlers/RecycleMission'
import { ExpeditionMission } from './handlers/ExpeditionMission'
import { MoonDestructionMission } from './handlers/MoonDestructionMission'

export class MissionProcessor {
  private supabase: SupabaseClient
  private handlers: Map<MissionType, IMissionHandler>
  private options: Required<MissionProcessorOptions>

  constructor(
    supabase: SupabaseClient,
    options: MissionProcessorOptions = {}
  ) {
    this.supabase = supabase
    this.options = { ...DEFAULT_PROCESSOR_OPTIONS, ...options }
    this.handlers = new Map()

    // Register mission handlers
    this.registerHandler(new TransportMission(supabase))
    this.registerHandler(new DeploymentMission(supabase))
    this.registerHandler(new AttackMission(supabase))
    this.registerHandler(new ColonizationMission(supabase))
    this.registerHandler(new EspionageMission(supabase))
    this.registerHandler(new RecycleMission(supabase))
    this.registerHandler(new ExpeditionMission(supabase))
    this.registerHandler(new MoonDestructionMission(supabase))

    // TODO: Register additional handlers as they are implemented
    // this.registerHandler(new AcsDefendMission(supabase))
  }

  /**
   * Register a mission handler
   */
  private registerHandler(handler: IMissionHandler): void {
    this.handlers.set(handler.missionType, handler)
  }

  /**
   * Get handler for a specific mission type
   */
  private getHandler(missionType: MissionType): IMissionHandler | undefined {
    return this.handlers.get(missionType)
  }

  /**
   * Process all pending missions
   * This is the main entry point called by the API endpoint or cron
   */
  async processPendingMissions(): Promise<MissionProcessResult> {
    const errors: MissionError[] = []
    let processedCount = 0

    const currentTime = this.options.currentTime.toISOString()

    // Fetch pending missions that have arrived
    const { data: missions, error: fetchError } = await this.supabase
      .from('fleet_missions')
      .select('*')
      .eq('processed', false)
      .eq('cancelled', false)
      .lte('arrives_at', currentTime)
      .order('arrives_at', { ascending: true })
      .limit(this.options.batchSize)

    if (fetchError) {
      return {
        success: false,
        processedCount: 0,
        errors: [{
          missionId: 'N/A',
          missionType: 'transport',
          error: `Failed to fetch missions: ${fetchError.message}`,
          timestamp: currentTime,
        }],
      }
    }

    if (!missions || missions.length === 0) {
      return {
        success: true,
        processedCount: 0,
        errors: [],
      }
    }

    // Process each mission
    for (const mission of missions) {
      try {
        await this.processMission(mission as FleetMission)
        processedCount++
      } catch (error) {
        const missionError: MissionError = {
          missionId: mission.id,
          missionType: mission.mission_type,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        }
        errors.push(missionError)

        // Log error
        console.error(`Mission processing error [${mission.id}]:`, error)

        // Stop if not continuing on error
        if (!this.options.continueOnError) {
          break
        }
      }
    }

    return {
      success: errors.length === 0,
      processedCount,
      errors,
    }
  }

  /**
   * Process a single mission
   */
  async processMission(mission: FleetMission): Promise<void> {
    const handler = this.getHandler(mission.mission_type)

    if (!handler) {
      throw new Error(`No handler registered for mission type: ${mission.mission_type}`)
    }

    // Build mission context
    const context = await this.buildMissionContext(mission)

    // Determine if this is an arrival or return
    if (mission.is_returning) {
      await this.processReturn(handler, context)
    } else {
      await this.processArrival(handler, context)
    }
  }

  /**
   * Build the context object for mission processing
   */
  private async buildMissionContext(mission: FleetMission): Promise<MissionContext> {
    // Fetch origin planet
    const originPlanet = await this.fetchPlanet(mission.origin_planet_id)

    // Fetch target planet (if exists)
    const targetPlanet = await this.fetchTargetPlanet(
      mission.destination_galaxy,
      mission.destination_system,
      mission.destination_position,
      mission.destination_type
    )

    // Fetch research for attacker (mission owner)
    const attackerResearch = await this.fetchResearch(mission.user_id)

    // Fetch research for defender (target planet owner)
    let defenderResearch: UserResearch | null = null
    if (targetPlanet) {
      defenderResearch = await this.fetchResearch(targetPlanet.user_id)
    }

    return {
      mission,
      originPlanet,
      targetPlanet,
      attackerResearch,
      defenderResearch,
    }
  }

  /**
   * Process mission arrival
   */
  private async processArrival(
    handler: IMissionHandler,
    context: MissionContext
  ): Promise<void> {
    const result = await handler.processArrival(context)

    if (!result.success) {
      throw new Error(result.error || 'Mission arrival processing failed')
    }

    // Mark mission as processed
    await this.markMissionProcessed(context.mission.id)

    // Create return mission if needed
    if (result.shouldReturn && handler.hasReturn) {
      await this.createReturnMission(
        context.mission,
        result.returnResources,
        result.returnShips as unknown as Record<string, number>
      )
    }

    // Send messages
    for (const message of result.messages) {
      await this.sendMessage(message)
    }

    // Apply updates
    for (const update of result.updates) {
      await this.applyUpdate(update)
    }
  }

  /**
   * Process mission return
   */
  private async processReturn(
    handler: IMissionHandler,
    context: MissionContext
  ): Promise<void> {
    const result = await handler.processReturn(context)

    if (!result.success) {
      throw new Error(result.error || 'Mission return processing failed')
    }

    // Mark mission as processed
    await this.markMissionProcessed(context.mission.id)

    // Send messages
    for (const message of result.messages) {
      await this.sendMessage(message)
    }

    // Apply updates
    for (const update of result.updates) {
      await this.applyUpdate(update)
    }
  }

  // ============================================================================
  // DATABASE HELPERS
  // ============================================================================

  private async fetchPlanet(planetId: string): Promise<Planet | null> {
    const { data } = await this.supabase
      .from('planets')
      .select('*')
      .eq('id', planetId)
      .single()

    return data as Planet | null
  }

  private async fetchTargetPlanet(
    galaxy: number,
    system: number,
    position: number,
    planetType: string
  ): Promise<Planet | null> {
    const { data } = await this.supabase
      .from('planets')
      .select('*')
      .eq('galaxy', galaxy)
      .eq('system', system)
      .eq('position', position)
      .eq('planet_type', planetType)
      .single()

    return data as Planet | null
  }

  private async fetchResearch(userId: string): Promise<UserResearch | null> {
    const { data } = await this.supabase
      .from('user_research')
      .select('*')
      .eq('user_id', userId)
      .single()

    return data as UserResearch | null
  }

  private async markMissionProcessed(missionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('fleet_missions')
      .update({ processed: true })
      .eq('id', missionId)

    if (error) {
      throw new Error(`Failed to mark mission as processed: ${error.message}`)
    }
  }

  private async createReturnMission(
    originalMission: FleetMission,
    resources: { metal: number; crystal: number; deuterium: number },
    ships: Record<string, number>
  ): Promise<void> {
    // Calculate return timing
    const now = new Date()
    const arrivalTime = new Date(originalMission.arrives_at)
    const departedTime = new Date(originalMission.departed_at)
    const oneWayDuration = arrivalTime.getTime() - departedTime.getTime()
    const returnArrival = new Date(now.getTime() + oneWayDuration)

    const returnMission = {
      user_id: originalMission.user_id,
      origin_planet_id: originalMission.origin_planet_id,
      origin_galaxy: originalMission.destination_galaxy,
      origin_system: originalMission.destination_system,
      origin_position: originalMission.destination_position,
      destination_galaxy: originalMission.origin_galaxy,
      destination_system: originalMission.origin_system,
      destination_position: originalMission.origin_position,
      destination_type: 'planet',
      mission_type: originalMission.mission_type,
      // Ships
      light_fighter: ships.light_fighter || 0,
      heavy_fighter: ships.heavy_fighter || 0,
      cruiser: ships.cruiser || 0,
      battleship: ships.battleship || 0,
      battlecruiser: ships.battlecruiser || 0,
      bomber: ships.bomber || 0,
      destroyer: ships.destroyer || 0,
      deathstar: ships.deathstar || 0,
      small_cargo: ships.small_cargo || 0,
      large_cargo: ships.large_cargo || 0,
      colony_ship: ships.colony_ship || 0,
      recycler: ships.recycler || 0,
      espionage_probe: ships.espionage_probe || 0,
      reaper: ships.reaper || 0,
      pathfinder: ships.pathfinder || 0,
      // Resources
      metal: resources.metal,
      crystal: resources.crystal,
      deuterium: resources.deuterium,
      // Timing
      departed_at: now.toISOString(),
      arrives_at: returnArrival.toISOString(),
      returns_at: null,
      // Status
      is_returning: true,
      processed: false,
      cancelled: false,
    }

    const { error } = await this.supabase
      .from('fleet_missions')
      .insert(returnMission)

    if (error) {
      throw new Error(`Failed to create return mission: ${error.message}`)
    }
  }

  private async sendMessage(message: {
    userId: string
    type: string
    subject: string
    body: string
  }): Promise<void> {
    const { error } = await this.supabase.from('messages').insert({
      user_id: message.userId,
      sender_id: null,
      type: message.type,
      subject: message.subject,
      body: message.body,
      read: false,
      deleted: false,
    })

    if (error) {
      console.error(`Failed to send message: ${error.message}`)
      // Don't throw - messages are not critical
    }
  }

  private async applyUpdate(update: {
    target: string
    targetId: string
    data: Record<string, unknown>
  }): Promise<void> {
    const tableMap: Record<string, string> = {
      origin_planet: 'planets',
      target_planet: 'planets',
      debris_field: 'debris_fields',
      mission: 'fleet_missions',
    }

    const table = tableMap[update.target]
    if (!table) {
      console.error(`Unknown update target: ${update.target}`)
      return
    }

    const { error } = await this.supabase
      .from(table)
      .update(update.data)
      .eq('id', update.targetId)

    if (error) {
      throw new Error(`Failed to apply update to ${update.target}: ${error.message}`)
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get list of registered mission types
   */
  getRegisteredMissionTypes(): MissionType[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * Check if a mission type has a handler
   */
  hasHandler(missionType: MissionType): boolean {
    return this.handlers.has(missionType)
  }

  /**
   * Get statistics about pending missions
   */
  async getPendingMissionStats(): Promise<{
    total: number
    byType: Record<MissionType, number>
  }> {
    const currentTime = new Date().toISOString()

    const { data: missions } = await this.supabase
      .from('fleet_missions')
      .select('mission_type')
      .eq('processed', false)
      .eq('cancelled', false)
      .lte('arrives_at', currentTime)

    const byType: Record<string, number> = {}

    if (missions) {
      for (const mission of missions) {
        byType[mission.mission_type] = (byType[mission.mission_type] || 0) + 1
      }
    }

    return {
      total: missions?.length || 0,
      byType: byType as Record<MissionType, number>,
    }
  }
}

// Export factory function for easy instantiation
export function createMissionProcessor(
  supabase: SupabaseClient,
  options?: MissionProcessorOptions
): MissionProcessor {
  return new MissionProcessor(supabase, options)
}
