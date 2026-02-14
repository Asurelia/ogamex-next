/**
 * Moon Service
 *
 * Service for managing moon operations including creation, phalanx scanning,
 * jump gate transfers, and moon destruction.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { Planet } from '@/types/database'
import type { ShipCounts } from '../missions/types'
import { SHIP_KEYS } from '../missions/types'
import type {
  Moon,
  MoonCreationResult,
  PhalanxScanResult,
  FleetMovement,
  JumpGateTransferRequest,
  JumpGateTransferResult,
  JumpGateStatus,
  MoonDestructionResult,
  MoonDestructionChances,
} from './types'
import {
  MOON_CREATION,
  MOON_DESTRUCTION,
  PHALANX,
  JUMP_GATE_CONFIG,
  calculateMoonDiameter,
  calculateMoonFields,
  calculateMoonChance,
  calculatePhalanxRange,
  isInPhalanxRange,
  calculateTotalMoonFields,
} from './constants'

export class MoonService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // ============================================================================
  // MOON CREATION
  // ============================================================================

  /**
   * Attempt to create a moon from battle debris
   *
   * @param planetId - The ID of the planet where the battle occurred
   * @param debris - The debris field from the battle
   * @returns MoonCreationResult
   */
  async createMoon(
    planetId: string,
    debris: { metal: number; crystal: number }
  ): Promise<MoonCreationResult> {
    // Calculate moon creation chance
    const chance = calculateMoonChance(debris.metal, debris.crystal)

    if (chance <= 0) {
      return {
        success: true,
        moonCreated: false,
        chance: 0,
      }
    }

    // Roll for moon creation
    const roll = Math.random() * 100
    if (roll > chance) {
      return {
        success: true,
        moonCreated: false,
        chance,
      }
    }

    // Get planet details
    const { data: planet, error: planetError } = await this.supabase
      .from('planets')
      .select('id, user_id, galaxy, system, position')
      .eq('id', planetId)
      .eq('planet_type', 'planet')
      .single()

    if (planetError || !planet) {
      return {
        success: false,
        moonCreated: false,
        chance,
        error: 'Planet not found',
      }
    }

    // Check if moon already exists at this position
    const existingMoon = await this.getMoonAtPosition(
      planet.galaxy,
      planet.system,
      planet.position
    )

    if (existingMoon) {
      return {
        success: true,
        moonCreated: false,
        chance,
        error: 'Moon already exists at this position',
      }
    }

    // Calculate moon properties
    const diameter = calculateMoonDiameter()
    const fields = calculateMoonFields(diameter)

    // Create the moon
    const { data: moon, error: createError } = await this.supabase
      .from('planets')
      .insert({
        user_id: planet.user_id,
        name: MOON_CREATION.DEFAULT_NAME,
        galaxy: planet.galaxy,
        system: planet.system,
        position: planet.position,
        planet_type: 'moon',
        diameter,
        fields_used: 0,
        fields_max: fields,
        temp_min: MOON_CREATION.TEMP_MIN,
        temp_max: MOON_CREATION.TEMP_MAX,
        // No production on moons
        metal: 0,
        metal_per_hour: 0,
        metal_max: 1000000,
        crystal: 0,
        crystal_per_hour: 0,
        crystal_max: 1000000,
        deuterium: 0,
        deuterium_per_hour: 0,
        deuterium_max: 1000000,
        energy_used: 0,
        energy_max: 0,
        // All buildings start at 0
        ...this.getEmptyBuildingsAndUnits(),
      })
      .select('id')
      .single()

    if (createError || !moon) {
      return {
        success: false,
        moonCreated: false,
        chance,
        error: createError?.message || 'Failed to create moon',
      }
    }

    return {
      success: true,
      moonCreated: true,
      moonId: moon.id,
      diameter,
      fields,
      chance,
    }
  }

  /**
   * Calculate moon creation chance from debris
   */
  calculateMoonChance(debrisTotal: number): number {
    return Math.min(
      Math.floor(debrisTotal / 100000) * MOON_CREATION.CHANCE_PER_100K_DEBRIS,
      MOON_CREATION.MAX_CHANCE
    )
  }

  /**
   * Calculate random moon diameter
   */
  calculateDiameter(): number {
    return calculateMoonDiameter()
  }

  // ============================================================================
  // MOON RETRIEVAL
  // ============================================================================

  /**
   * Get the moon associated with a planet
   */
  async getMoonByPlanet(planetId: string): Promise<Moon | null> {
    // First get the planet's coordinates
    const { data: planet } = await this.supabase
      .from('planets')
      .select('galaxy, system, position')
      .eq('id', planetId)
      .eq('planet_type', 'planet')
      .single()

    if (!planet) {
      return null
    }

    return this.getMoonAtPosition(planet.galaxy, planet.system, planet.position)
  }

  /**
   * Get moon at specific coordinates
   */
  async getMoonAtPosition(
    galaxy: number,
    system: number,
    position: number
  ): Promise<Moon | null> {
    const { data: moon } = await this.supabase
      .from('planets')
      .select('*')
      .eq('galaxy', galaxy)
      .eq('system', system)
      .eq('position', position)
      .eq('planet_type', 'moon')
      .single()

    if (!moon) {
      return null
    }

    return this.mapPlanetToMoon(moon)
  }

  /**
   * Get moon by ID
   */
  async getMoonById(moonId: string): Promise<Moon | null> {
    const { data: moon } = await this.supabase
      .from('planets')
      .select('*')
      .eq('id', moonId)
      .eq('planet_type', 'moon')
      .single()

    if (!moon) {
      return null
    }

    return this.mapPlanetToMoon(moon)
  }

  /**
   * Get all moons owned by a user
   */
  async getUserMoons(userId: string): Promise<Moon[]> {
    const { data: moons } = await this.supabase
      .from('planets')
      .select('*')
      .eq('user_id', userId)
      .eq('planet_type', 'moon')
      .order('galaxy', { ascending: true })
      .order('system', { ascending: true })
      .order('position', { ascending: true })

    if (!moons) {
      return []
    }

    return moons.map((moon) => this.mapPlanetToMoon(moon))
  }

  // ============================================================================
  // SENSOR PHALANX
  // ============================================================================

  /**
   * Scan a planet with the Sensor Phalanx
   *
   * @param moonId - The moon with the phalanx
   * @param targetPlanetId - The planet to scan
   * @returns PhalanxScanResult
   */
  async scanWithPhalanx(
    moonId: string,
    targetPlanetId: string
  ): Promise<PhalanxScanResult> {
    // Get the moon with phalanx
    const moon = await this.getMoonById(moonId)

    if (!moon) {
      return {
        success: false,
        targetPlanetId,
        targetCoordinates: '',
        fleets: [],
        deuteriumCost: 0,
        error: 'Moon not found',
      }
    }

    if (moon.sensor_phalanx <= 0) {
      return {
        success: false,
        targetPlanetId,
        targetCoordinates: '',
        fleets: [],
        deuteriumCost: 0,
        error: 'No Sensor Phalanx on this moon',
      }
    }

    // Get the target planet
    const { data: targetPlanet } = await this.supabase
      .from('planets')
      .select('id, user_id, galaxy, system, position, planet_type')
      .eq('id', targetPlanetId)
      .single()

    if (!targetPlanet) {
      return {
        success: false,
        targetPlanetId,
        targetCoordinates: '',
        fleets: [],
        deuteriumCost: 0,
        error: 'Target planet not found',
      }
    }

    // Cannot scan moons
    if (targetPlanet.planet_type === 'moon' && !PHALANX.CAN_SCAN_MOONS) {
      return {
        success: false,
        targetPlanetId,
        targetCoordinates: `[${targetPlanet.galaxy}:${targetPlanet.system}:${targetPlanet.position}]`,
        fleets: [],
        deuteriumCost: 0,
        error: 'Cannot scan moons',
      }
    }

    // Cannot scan own planets
    if (targetPlanet.user_id === moon.user_id && !PHALANX.CAN_SCAN_OWN) {
      return {
        success: false,
        targetPlanetId,
        targetCoordinates: `[${targetPlanet.galaxy}:${targetPlanet.system}:${targetPlanet.position}]`,
        fleets: [],
        deuteriumCost: 0,
        error: 'Cannot scan your own planets',
      }
    }

    // Check range
    if (
      !isInPhalanxRange(
        moon.galaxy,
        moon.system,
        targetPlanet.galaxy,
        targetPlanet.system,
        moon.sensor_phalanx
      )
    ) {
      const range = calculatePhalanxRange(moon.sensor_phalanx)
      return {
        success: false,
        targetPlanetId,
        targetCoordinates: `[${targetPlanet.galaxy}:${targetPlanet.system}:${targetPlanet.position}]`,
        fleets: [],
        deuteriumCost: 0,
        error: `Target out of range (current range: ${range} systems)`,
      }
    }

    // Check deuterium
    if (moon.deuterium < PHALANX.SCAN_COST) {
      return {
        success: false,
        targetPlanetId,
        targetCoordinates: `[${targetPlanet.galaxy}:${targetPlanet.system}:${targetPlanet.position}]`,
        fleets: [],
        deuteriumCost: PHALANX.SCAN_COST,
        error: `Not enough deuterium (need ${PHALANX.SCAN_COST}, have ${moon.deuterium})`,
      }
    }

    // Deduct deuterium
    const { error: updateError } = await this.supabase
      .from('planets')
      .update({ deuterium: moon.deuterium - PHALANX.SCAN_COST })
      .eq('id', moonId)

    if (updateError) {
      return {
        success: false,
        targetPlanetId,
        targetCoordinates: `[${targetPlanet.galaxy}:${targetPlanet.system}:${targetPlanet.position}]`,
        fleets: [],
        deuteriumCost: PHALANX.SCAN_COST,
        error: 'Failed to deduct deuterium',
      }
    }

    // Get all fleet movements to/from the target planet
    const fleets = await this.getFleetMovementsForPlanet(targetPlanet)

    return {
      success: true,
      targetPlanetId,
      targetCoordinates: `[${targetPlanet.galaxy}:${targetPlanet.system}:${targetPlanet.position}]`,
      fleets,
      deuteriumCost: PHALANX.SCAN_COST,
    }
  }

  /**
   * Get all fleet movements to/from a planet
   */
  private async getFleetMovementsForPlanet(
    planet: { galaxy: number; system: number; position: number }
  ): Promise<FleetMovement[]> {
    const now = new Date().toISOString()

    // Get incoming and outgoing fleets
    const { data: missions } = await this.supabase
      .from('fleet_missions')
      .select('*')
      .eq('processed', false)
      .eq('cancelled', false)
      .or(
        `and(destination_galaxy.eq.${planet.galaxy},destination_system.eq.${planet.system},destination_position.eq.${planet.position}),` +
          `and(origin_galaxy.eq.${planet.galaxy},origin_system.eq.${planet.system},origin_position.eq.${planet.position})`
      )
      .gt('arrives_at', now)

    if (!missions || missions.length === 0) {
      return []
    }

    return missions.map((mission) => this.mapMissionToFleetMovement(mission))
  }

  // ============================================================================
  // JUMP GATE
  // ============================================================================

  /**
   * Transfer ships instantly between two moons via Jump Gate
   */
  async jumpGateTransfer(
    request: JumpGateTransferRequest
  ): Promise<JumpGateTransferResult> {
    const { sourceMoonId, targetMoonId, ships } = request

    // Get source moon
    const sourceMoon = await this.getMoonById(sourceMoonId)

    if (!sourceMoon) {
      return {
        success: false,
        sourceMoonId,
        targetMoonId,
        ships,
        cooldownUntil: '',
        error: 'Source moon not found',
      }
    }

    if (sourceMoon.jump_gate <= 0) {
      return {
        success: false,
        sourceMoonId,
        targetMoonId,
        ships,
        cooldownUntil: '',
        error: 'No Jump Gate on source moon',
      }
    }

    // Check cooldown
    const sourceStatus = this.getJumpGateStatus(sourceMoon)
    if (sourceStatus.isOnCooldown) {
      return {
        success: false,
        sourceMoonId,
        targetMoonId,
        ships,
        cooldownUntil: sourceStatus.cooldownUntil || '',
        error: `Jump Gate on cooldown (${sourceStatus.cooldownRemainingSeconds} seconds remaining)`,
      }
    }

    // Get target moon
    const targetMoon = await this.getMoonById(targetMoonId)

    if (!targetMoon) {
      return {
        success: false,
        sourceMoonId,
        targetMoonId,
        ships,
        cooldownUntil: '',
        error: 'Target moon not found',
      }
    }

    if (targetMoon.jump_gate <= 0) {
      return {
        success: false,
        sourceMoonId,
        targetMoonId,
        ships,
        cooldownUntil: '',
        error: 'No Jump Gate on target moon',
      }
    }

    // Check target cooldown
    const targetStatus = this.getJumpGateStatus(targetMoon)
    if (targetStatus.isOnCooldown) {
      return {
        success: false,
        sourceMoonId,
        targetMoonId,
        ships,
        cooldownUntil: targetStatus.cooldownUntil || '',
        error: `Target Jump Gate on cooldown (${targetStatus.cooldownRemainingSeconds} seconds remaining)`,
      }
    }

    // Verify both moons belong to the same user
    if (sourceMoon.user_id !== targetMoon.user_id) {
      return {
        success: false,
        sourceMoonId,
        targetMoonId,
        ships,
        cooldownUntil: '',
        error: 'Jump Gates must belong to the same player',
      }
    }

    // Verify source moon has enough ships
    const hasEnoughShips = this.verifyShipCounts(sourceMoon.ships, ships)
    if (!hasEnoughShips) {
      return {
        success: false,
        sourceMoonId,
        targetMoonId,
        ships,
        cooldownUntil: '',
        error: 'Not enough ships on source moon',
      }
    }

    // Calculate cooldown time
    const cooldownUntil = new Date(Date.now() + JUMP_GATE_CONFIG.COOLDOWN_MS).toISOString()

    // Perform the transfer
    const sourceShipUpdates = this.calculateShipRemoval(sourceMoon.ships, ships)
    const targetShipUpdates = this.calculateShipAddition(targetMoon.ships, ships)

    // Update source moon (remove ships, set cooldown)
    const { error: sourceError } = await this.supabase
      .from('planets')
      .update({
        ...sourceShipUpdates,
        jump_gate_cooldown: cooldownUntil,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sourceMoonId)

    if (sourceError) {
      return {
        success: false,
        sourceMoonId,
        targetMoonId,
        ships,
        cooldownUntil: '',
        error: 'Failed to update source moon',
      }
    }

    // Update target moon (add ships, set cooldown)
    const { error: targetError } = await this.supabase
      .from('planets')
      .update({
        ...targetShipUpdates,
        jump_gate_cooldown: cooldownUntil,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetMoonId)

    if (targetError) {
      // Rollback source moon changes
      await this.supabase
        .from('planets')
        .update(this.calculateShipAddition({}, ships))
        .eq('id', sourceMoonId)

      return {
        success: false,
        sourceMoonId,
        targetMoonId,
        ships,
        cooldownUntil: '',
        error: 'Failed to update target moon',
      }
    }

    return {
      success: true,
      sourceMoonId,
      targetMoonId,
      ships,
      cooldownUntil,
    }
  }

  /**
   * Get jump gate status for a moon
   */
  getJumpGateStatus(moon: Moon): JumpGateStatus {
    const now = Date.now()
    const cooldownUntil = moon.jump_gate_cooldown
      ? new Date(moon.jump_gate_cooldown).getTime()
      : 0

    const isOnCooldown = cooldownUntil > now
    const cooldownRemainingSeconds = isOnCooldown
      ? Math.ceil((cooldownUntil - now) / 1000)
      : 0

    return {
      moonId: moon.id,
      hasJumpGate: moon.jump_gate > 0,
      level: moon.jump_gate,
      isOnCooldown,
      cooldownUntil: moon.jump_gate_cooldown,
      cooldownRemainingSeconds,
    }
  }

  // ============================================================================
  // MOON DESTRUCTION (RIP ATTACK)
  // ============================================================================

  /**
   * Attempt to destroy a moon with Deathstars (RIPs)
   *
   * @param moonId - The moon to destroy
   * @param ripsCount - Number of Deathstars attacking
   * @returns MoonDestructionResult
   */
  async attemptMoonDestruction(
    moonId: string,
    ripsCount: number
  ): Promise<MoonDestructionResult> {
    if (ripsCount <= 0) {
      return {
        success: false,
        moonDestroyed: false,
        ripsDestroyed: 0,
        ripsRemaining: 0,
        moonDestroyChance: 0,
        ripDestroyChance: 0,
        fleetSurvived: false,
        error: 'No Deathstars in fleet',
      }
    }

    const moon = await this.getMoonById(moonId)

    if (!moon) {
      return {
        success: false,
        moonDestroyed: false,
        ripsDestroyed: 0,
        ripsRemaining: ripsCount,
        moonDestroyChance: 0,
        ripDestroyChance: 0,
        fleetSurvived: true,
        error: 'Moon not found',
      }
    }

    // Calculate chances
    const chances = this.calculateMoonDestructionChances(moon.diameter, ripsCount)

    // Roll for moon destruction
    const moonRoll = Math.random() * 100
    const moonDestroyed = moonRoll <= chances.moonDestroyChance

    // Roll for RIP destruction
    const ripRoll = Math.random() * 100
    const ripsDestroyed = ripRoll <= chances.ripDestroyChance ? ripsCount : 0
    const fleetSurvived = ripsDestroyed === 0

    // If moon is destroyed, delete it
    if (moonDestroyed) {
      const { error } = await this.supabase
        .from('planets')
        .delete()
        .eq('id', moonId)

      if (error) {
        return {
          success: false,
          moonDestroyed: false,
          ripsDestroyed,
          ripsRemaining: ripsCount - ripsDestroyed,
          moonDestroyChance: chances.moonDestroyChance,
          ripDestroyChance: chances.ripDestroyChance,
          fleetSurvived,
          error: 'Failed to delete moon',
        }
      }
    }

    return {
      success: true,
      moonDestroyed,
      ripsDestroyed,
      ripsRemaining: ripsCount - ripsDestroyed,
      moonDestroyChance: chances.moonDestroyChance,
      ripDestroyChance: chances.ripDestroyChance,
      fleetSurvived,
    }
  }

  /**
   * Calculate moon destruction chances
   */
  calculateMoonDestructionChances(
    moonDiameter: number,
    ripsCount: number
  ): MoonDestructionChances {
    return {
      moonDestroyChance: MOON_DESTRUCTION.moonDestroyChance(moonDiameter, ripsCount),
      ripDestroyChance: MOON_DESTRUCTION.ripDestroyChance(moonDiameter),
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Map a planet row to a Moon object
   */
  private mapPlanetToMoon(planet: Planet): Moon {
    const ships: Partial<ShipCounts> = {}
    for (const key of SHIP_KEYS) {
      const count = (planet as Record<string, unknown>)[key] as number
      if (count > 0) {
        ships[key] = count
      }
    }

    return {
      id: planet.id,
      planet_id: '', // Not stored, would need to look up
      user_id: planet.user_id,
      name: planet.name,
      galaxy: planet.galaxy,
      system: planet.system,
      position: planet.position,
      diameter: planet.diameter,
      fields: planet.fields_max,
      fields_used: planet.fields_used,
      lunar_base: planet.lunar_base,
      sensor_phalanx: planet.sensor_phalanx,
      jump_gate: planet.jump_gate,
      metal_storage: planet.metal_storage,
      crystal_storage: planet.crystal_storage,
      deuterium_tank: planet.deuterium_tank,
      metal: planet.metal,
      crystal: planet.crystal,
      deuterium: planet.deuterium,
      ships,
      jump_gate_cooldown: planet.jump_gate_cooldown || null,
      created_at: planet.created_at,
      updated_at: planet.updated_at,
    }
  }

  /**
   * Map a fleet mission to a FleetMovement
   */
  private mapMissionToFleetMovement(mission: Record<string, unknown>): FleetMovement {
    const ships: Partial<ShipCounts> = {}
    for (const key of SHIP_KEYS) {
      const count = mission[key] as number
      if (count > 0) {
        ships[key] = count
      }
    }

    return {
      missionId: mission.id as string,
      missionType: mission.mission_type as string,
      originGalaxy: mission.origin_galaxy as number,
      originSystem: mission.origin_system as number,
      originPosition: mission.origin_position as number,
      originPlanetType: 'planet', // Simplified
      destinationGalaxy: mission.destination_galaxy as number,
      destinationSystem: mission.destination_system as number,
      destinationPosition: mission.destination_position as number,
      destinationPlanetType: (mission.destination_type as 'planet' | 'moon' | 'debris') || 'planet',
      ships,
      departedAt: mission.departed_at as string,
      arrivesAt: mission.arrives_at as string,
      returnsAt: mission.returns_at as string | null,
      isReturning: mission.is_returning as boolean,
    }
  }

  /**
   * Get empty buildings and units object for moon creation
   */
  private getEmptyBuildingsAndUnits(): Record<string, number | boolean> {
    return {
      metal_mine: 0,
      crystal_mine: 0,
      deuterium_synthesizer: 0,
      solar_plant: 0,
      fusion_plant: 0,
      metal_storage: 0,
      crystal_storage: 0,
      deuterium_tank: 0,
      robot_factory: 0,
      nanite_factory: 0,
      shipyard: 0,
      research_lab: 0,
      terraformer: 0,
      alliance_depot: 0,
      missile_silo: 0,
      space_dock: 0,
      lunar_base: 0,
      sensor_phalanx: 0,
      jump_gate: 0,
      light_fighter: 0,
      heavy_fighter: 0,
      cruiser: 0,
      battleship: 0,
      battlecruiser: 0,
      bomber: 0,
      destroyer: 0,
      deathstar: 0,
      small_cargo: 0,
      large_cargo: 0,
      colony_ship: 0,
      recycler: 0,
      espionage_probe: 0,
      solar_satellite: 0,
      crawler: 0,
      reaper: 0,
      pathfinder: 0,
      rocket_launcher: 0,
      light_laser: 0,
      heavy_laser: 0,
      gauss_cannon: 0,
      ion_cannon: 0,
      plasma_turret: 0,
      small_shield_dome: 0,
      large_shield_dome: 0,
      anti_ballistic_missile: 0,
      interplanetary_missile: 0,
      destroyed: false,
    }
  }

  /**
   * Verify that the moon has enough ships for transfer
   */
  private verifyShipCounts(
    available: Partial<ShipCounts>,
    requested: Partial<ShipCounts>
  ): boolean {
    for (const key of SHIP_KEYS) {
      const requestedCount = requested[key] || 0
      const availableCount = available[key] || 0
      if (requestedCount > availableCount) {
        return false
      }
    }
    return true
  }

  /**
   * Calculate ship removal updates
   */
  private calculateShipRemoval(
    current: Partial<ShipCounts>,
    toRemove: Partial<ShipCounts>
  ): Record<string, number> {
    const updates: Record<string, number> = {}
    for (const key of SHIP_KEYS) {
      const removeCount = toRemove[key] || 0
      if (removeCount > 0) {
        updates[key] = Math.max(0, (current[key] || 0) - removeCount)
      }
    }
    return updates
  }

  /**
   * Calculate ship addition updates
   */
  private calculateShipAddition(
    current: Partial<ShipCounts>,
    toAdd: Partial<ShipCounts>
  ): Record<string, number> {
    const updates: Record<string, number> = {}
    for (const key of SHIP_KEYS) {
      const addCount = toAdd[key] || 0
      if (addCount > 0) {
        updates[key] = (current[key] || 0) + addCount
      }
    }
    return updates
  }
}

// Export singleton factory
export function createMoonService(supabase: SupabaseClient): MoonService {
  return new MoonService(supabase)
}
