/**
 * ColonizationMission Handler
 *
 * Handles colonization missions that establish new colonies on empty planets.
 * - On arrival: creates a new planet at target coordinates if conditions are met
 * - On return: returns remaining fleet if colonization failed
 *
 * Colonization Rules (OGame):
 * - Requires at least 1 colony ship (consumed on success)
 * - Target position must be empty (no existing planet)
 * - Position must be 1-15
 * - Player must not have reached maximum colony limit
 * - Planet characteristics depend on position:
 *   - Position 1-3: Small, very hot
 *   - Position 4-6: Medium, hot
 *   - Position 7-9: Large, temperate (optimal)
 *   - Position 10-12: Medium, cold
 *   - Position 13-15: Small, very cold
 */

import type { MissionType, Planet, PlanetType } from '@/types/database'
import { BaseMission } from '../BaseMission'
import {
  MissionContext,
  MissionArrivalResult,
  MissionReturnResult,
  ShipCounts,
  Coordinates,
  emptyShipCounts,
  emptyResources,
} from '../types'

/**
 * Planet field ranges by position (min-max fields)
 * Based on OGame original values
 */
const PLANET_FIELDS_BY_POSITION: Record<number, { min: number; max: number }> = {
  1: { min: 40, max: 70 },
  2: { min: 43, max: 77 },
  3: { min: 47, max: 84 },
  4: { min: 75, max: 120 },
  5: { min: 95, max: 130 },
  6: { min: 105, max: 145 },
  7: { min: 98, max: 170 },
  8: { min: 105, max: 195 },
  9: { min: 98, max: 170 },
  10: { min: 95, max: 145 },
  11: { min: 85, max: 125 },
  12: { min: 75, max: 110 },
  13: { min: 50, max: 75 },
  14: { min: 40, max: 62 },
  15: { min: 35, max: 55 },
}

/**
 * Temperature ranges by position (min-max temperature)
 * Based on OGame original values
 */
const TEMP_BY_POSITION: Record<number, { min: number; max: number }> = {
  1: { min: 220, max: 260 },
  2: { min: 170, max: 220 },
  3: { min: 120, max: 170 },
  4: { min: 70, max: 120 },
  5: { min: 60, max: 110 },
  6: { min: 50, max: 100 },
  7: { min: 30, max: 80 },
  8: { min: 10, max: 60 },
  9: { min: -10, max: 40 },
  10: { min: -50, max: 10 },
  11: { min: -80, max: -20 },
  12: { min: -100, max: -40 },
  13: { min: -130, max: -70 },
  14: { min: -160, max: -100 },
  15: { min: -190, max: -130 },
}

/**
 * Maximum number of planets (including homeworld)
 */
const MAX_PLANETS = 9

/**
 * Starting resources for a new colony
 */
const COLONY_STARTING_RESOURCES = {
  metal: 500,
  crystal: 500,
  deuterium: 0,
}

interface ColonizationCheckResult {
  canColonize: boolean
  reason?: string
}

interface PlanetCharacteristics {
  fieldsMin: number
  fieldsMax: number
  tempMin: number
  tempMax: number
}

export class ColonizationMission extends BaseMission {
  readonly missionType: MissionType = 'colonization'
  readonly hasReturn: boolean = true
  readonly name: string = 'Colonization'

  /**
   * Process colonization mission arrival
   *
   * 1. Check if position is colonizable
   * 2. Check if player has not reached max colonies
   * 3. Create new planet if conditions met
   * 4. Consume colony ship on success
   * 5. Return remaining fleet
   */
  async processArrival(context: MissionContext): Promise<MissionArrivalResult> {
    const { mission, targetPlanet } = context

    const coords: Coordinates = {
      galaxy: mission.destination_galaxy,
      system: mission.destination_system,
      position: mission.destination_position,
    }

    const ships = this.getShips(mission)
    const resources = this.getResources(mission)

    // Check if we have a colony ship
    if (ships.colony_ship < 1) {
      return this.errorArrival('No colony ship in fleet')
    }

    // Check if position is colonizable
    const checkResult = await this.checkColonizable(
      mission.user_id,
      coords,
      targetPlanet
    )

    const coordsStr = this.formatCoords(coords.galaxy, coords.system, coords.position)

    if (!checkResult.canColonize) {
      // Colonization failed - return fleet with all ships including colony ship
      const message = this.createMessage(
        mission.user_id,
        'system',
        'Colonization Failed',
        `Your colonization fleet has arrived at ${coordsStr} but colonization failed.\n` +
          `Reason: ${checkResult.reason}\n` +
          `The fleet is returning to origin.`
      )

      return this.successArrival(
        true, // shouldReturn
        resources, // return all resources
        ships, // return all ships including colony ship
        [message],
        []
      )
    }

    // Create the colony
    const createResult = await this.createColony(mission.user_id, coords)

    if (!createResult.success) {
      // Colony creation failed - return fleet
      const message = this.createMessage(
        mission.user_id,
        'system',
        'Colonization Failed',
        `Your colonization fleet has arrived at ${coordsStr} but colony creation failed.\n` +
          `Reason: ${createResult.error}\n` +
          `The fleet is returning to origin.`
      )

      return this.successArrival(
        true,
        resources,
        ships,
        [message],
        []
      )
    }

    // Success - consume colony ship
    const returnShips: ShipCounts = { ...ships }
    returnShips.colony_ship = Math.max(0, ships.colony_ship - 1)

    // Add any remaining ships to the new colony instead of returning them
    const addShipsResult = await this.addShipsToPlanet(createResult.planetId!, returnShips)
    if (!addShipsResult.success) {
      console.error(`Failed to add ships to new colony: ${addShipsResult.error}`)
    }

    // Add resources to the new colony
    const addResourcesResult = await this.addResourcesToPlanet(createResult.planetId!, resources)
    if (!addResourcesResult.success) {
      console.error(`Failed to add resources to new colony: ${addResourcesResult.error}`)
    }

    // Success message
    const message = this.createMessage(
      mission.user_id,
      'system',
      'Colony Established',
      `Your colonization fleet has arrived at ${coordsStr}.\n` +
        `A new colony has been founded!\n` +
        `Planet size: ${createResult.fields} fields\n` +
        `Temperature: ${createResult.tempMin}C to ${createResult.tempMax}C`
    )

    // No return - ships stay at colony
    return this.successArrival(
      false, // shouldReturn - ships stay at colony
      emptyResources(),
      emptyShipCounts(),
      [message],
      []
    )
  }

  /**
   * Process colonization mission return
   *
   * This only happens when colonization fails.
   * 1. Add ships back to origin planet
   * 2. Add resources back to origin planet
   * 3. Send return message
   */
  async processReturn(context: MissionContext): Promise<MissionReturnResult> {
    const { mission, originPlanet } = context

    if (!originPlanet) {
      return this.errorReturn('Origin planet not found')
    }

    const ships = this.getShips(mission)
    const resources = this.getResources(mission)

    // Add ships back to origin planet
    const addShipsResult = await this.addShipsToPlanet(originPlanet.id, ships)
    if (!addShipsResult.success) {
      return this.errorReturn(`Failed to return ships: ${addShipsResult.error}`)
    }

    // Add resources back to origin planet
    const addResourcesResult = await this.addResourcesToPlanet(originPlanet.id, resources)
    if (!addResourcesResult.success) {
      return this.errorReturn(`Failed to return resources: ${addResourcesResult.error}`)
    }

    // Format coordinates
    const originCoords = this.formatCoords(
      mission.destination_galaxy,
      mission.destination_system,
      mission.destination_position
    )

    // Create return message
    const message = this.createMessage(
      mission.user_id,
      'system',
      'Fleet Returned',
      `Your colonization fleet has returned from ${originCoords} after a failed colonization attempt.`
    )

    return this.successReturn([message], [])
  }

  /**
   * Check if a position is colonizable
   */
  private async checkColonizable(
    userId: string,
    coords: Coordinates,
    existingPlanet: Planet | null
  ): Promise<ColonizationCheckResult> {
    // Check position is valid (1-15)
    if (coords.position < 1 || coords.position > 15) {
      return {
        canColonize: false,
        reason: 'Invalid position. Planets can only exist at positions 1-15.',
      }
    }

    // Check if position is already occupied
    if (existingPlanet) {
      return {
        canColonize: false,
        reason: 'Position is already occupied by another planet.',
      }
    }

    // Double-check with direct query (in case context didn't find it)
    const { data: planetAtPosition } = await this.supabase
      .from('planets')
      .select('id')
      .eq('galaxy', coords.galaxy)
      .eq('system', coords.system)
      .eq('position', coords.position)
      .eq('planet_type', 'planet')
      .eq('destroyed', false)
      .maybeSingle()

    if (planetAtPosition) {
      return {
        canColonize: false,
        reason: 'Position is already occupied by another planet.',
      }
    }

    // Check player's colony limit
    const maxColonies = await this.getMaxColonies(userId)
    const currentColonies = await this.getCurrentColonyCount(userId)

    if (currentColonies >= maxColonies) {
      return {
        canColonize: false,
        reason: `Maximum number of colonies reached (${maxColonies}). Research Astrophysics to colonize more planets.`,
      }
    }

    return { canColonize: true }
  }

  /**
   * Get maximum number of colonies for a player
   * Base: 1 planet (homeworld) + 1 per 2 levels of Astrophysics
   * Max: 9 planets total
   */
  private async getMaxColonies(userId: string): Promise<number> {
    const { data: research } = await this.supabase
      .from('user_research')
      .select('astrophysics')
      .eq('user_id', userId)
      .single()

    const astrophysicsLevel = research?.astrophysics || 0

    // Base is 1 (homeworld) + floor(astrophysics / 2)
    // This gives additional colony slots
    const additionalColonies = Math.floor(astrophysicsLevel / 2)

    // Total max planets = 1 (homeworld) + additional colonies
    // But capped at MAX_PLANETS
    return Math.min(1 + additionalColonies, MAX_PLANETS)
  }

  /**
   * Get current colony count for a player
   */
  private async getCurrentColonyCount(userId: string): Promise<number> {
    const { count } = await this.supabase
      .from('planets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('planet_type', 'planet')
      .eq('destroyed', false)

    return count || 0
  }

  /**
   * Calculate planet characteristics based on position
   */
  private calculatePlanetCharacteristics(position: number): PlanetCharacteristics {
    const fields = PLANET_FIELDS_BY_POSITION[position] || { min: 50, max: 100 }
    const temps = TEMP_BY_POSITION[position] || { min: -20, max: 40 }

    return {
      fieldsMin: fields.min,
      fieldsMax: fields.max,
      tempMin: temps.min,
      tempMax: temps.max,
    }
  }

  /**
   * Generate random value within range
   */
  private randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * Create a new colony planet
   */
  private async createColony(
    userId: string,
    coords: Coordinates
  ): Promise<{ success: boolean; planetId?: string; fields?: number; tempMin?: number; tempMax?: number; error?: string }> {
    const characteristics = this.calculatePlanetCharacteristics(coords.position)

    // Random fields within range
    const fields = this.randomInRange(characteristics.fieldsMin, characteristics.fieldsMax)

    // Random temperature within range
    const tempMax = this.randomInRange(characteristics.tempMin, characteristics.tempMax)
    const tempMin = tempMax - this.randomInRange(20, 40) // Temperature range of 20-40 degrees

    // Calculate diameter based on fields (roughly)
    const diameter = Math.floor(fields * 100 + Math.random() * 5000)

    // Generate default planet name
    const planetName = `Colony`

    const newPlanet = {
      user_id: userId,
      name: planetName,
      galaxy: coords.galaxy,
      system: coords.system,
      position: coords.position,
      planet_type: 'planet' as PlanetType,
      diameter,
      fields_used: 0,
      fields_max: fields,
      temp_min: tempMin,
      temp_max: tempMax,
      // Starting resources
      metal: COLONY_STARTING_RESOURCES.metal,
      metal_per_hour: 0,
      metal_max: 10000,
      crystal: COLONY_STARTING_RESOURCES.crystal,
      crystal_per_hour: 0,
      crystal_max: 10000,
      deuterium: COLONY_STARTING_RESOURCES.deuterium,
      deuterium_per_hour: 0,
      deuterium_max: 10000,
      energy_used: 0,
      energy_max: 0,
      // Buildings - all at level 0
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
      // Ships - all at 0
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
      // Defense - all at 0
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
      // Timestamps
      last_resource_update: new Date().toISOString(),
      destroyed: false,
    }

    const { data, error } = await this.supabase
      .from('planets')
      .insert(newPlanet)
      .select('id')
      .single()

    if (error) {
      return {
        success: false,
        error: `Failed to create colony: ${error.message}`,
      }
    }

    return {
      success: true,
      planetId: data.id,
      fields,
      tempMin,
      tempMax,
    }
  }
}
