/**
 * Galaxy Service
 * High-level service for galaxy operations with Supabase integration
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { SeededRandom, galaxySeed, systemSeed } from './prng'
import {
  generateGalaxy,
  generateSolarSystem,
  generateStarEffects,
  generateSystemBodies,
} from './generators'
import { STAR_TYPES } from './constants'
import type {
  Galaxy,
  SolarSystem,
  CelestialBody,
  StarEffects,
  PlayerColony,
  GalaxyViewEntry,
  UniverseConfig,
  GalaxySummary,
  SolarSystemWithStar,
  CelestialBodyWithMoons,
  ColonyWithBody,
  GalacticCoordinates,
} from './types'

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class GalaxyService {
  constructor(private supabase: SupabaseClient) {}

  // ==========================================================================
  // UNIVERSE OPERATIONS
  // ==========================================================================

  /**
   * Get universe configuration
   */
  async getUniverseConfig(): Promise<UniverseConfig | null> {
    const { data, error } = await this.supabase
      .from('universe_config')
      .select('*')
      .limit(1)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      masterSeed: data.master_seed,
      name: data.name,
      galaxyCount: data.galaxy_count,
      systemsPerGalaxyMin: data.systems_per_galaxy_min,
      systemsPerGalaxyMax: data.systems_per_galaxy_max,
      universeSpeed: data.universe_speed,
      fleetSpeed: data.fleet_speed,
      resourceMultiplier: data.resource_multiplier,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  /**
   * Initialize universe with a seed
   */
  async initializeUniverse(seed?: number): Promise<string> {
    const { data, error } = await this.supabase.rpc('initialize_universe', {
      p_seed: seed ?? null,
    })

    if (error) {
      throw new Error(`Failed to initialize universe: ${error.message}`)
    }

    return data as string
  }

  // ==========================================================================
  // GALAXY OPERATIONS
  // ==========================================================================

  /**
   * Get all galaxies
   */
  async getAllGalaxies(): Promise<GalaxySummary[]> {
    const { data, error } = await this.supabase
      .from('galaxies')
      .select('id, galaxy_index, name, galaxy_type, system_count')
      .order('galaxy_index')

    if (error) {
      throw new Error(`Failed to fetch galaxies: ${error.message}`)
    }

    return (data || []).map((g) => ({
      id: g.id,
      galaxyIndex: g.galaxy_index,
      name: g.name,
      galaxyType: g.galaxy_type,
      systemCount: g.system_count,
    }))
  }

  /**
   * Get a specific galaxy by index
   */
  async getGalaxy(galaxyIndex: number): Promise<Galaxy | null> {
    const { data, error } = await this.supabase
      .from('galaxies')
      .select('*')
      .eq('galaxy_index', galaxyIndex)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      galaxyIndex: data.galaxy_index,
      name: data.name,
      seed: data.seed,
      galaxyType: data.galaxy_type,
      systemCount: data.system_count,
      centerX: data.center_x,
      centerY: data.center_y,
      centerZ: data.center_z,
      rotationAngle: data.rotation_angle,
      createdAt: data.created_at,
    }
  }

  // ==========================================================================
  // SOLAR SYSTEM OPERATIONS
  // ==========================================================================

  /**
   * Get or generate a solar system
   * This is the main entry point for lazy loading
   */
  async getOrGenerateSystem(
    galaxyIndex: number,
    systemIndex: number
  ): Promise<SolarSystemWithStar> {
    // Call the database function that handles lazy generation
    const { data: systemId, error } = await this.supabase.rpc(
      'get_or_generate_system',
      {
        p_galaxy_index: galaxyIndex,
        p_system_index: systemIndex,
      }
    )

    if (error) {
      throw new Error(`Failed to get/generate system: ${error.message}`)
    }

    // Fetch the system with star info
    const { data: system, error: fetchError } = await this.supabase
      .from('solar_systems')
      .select(`
        *,
        star_types!solar_systems_star_type_fkey (*)
      `)
      .eq('id', systemId)
      .single()

    if (fetchError || !system) {
      throw new Error(`Failed to fetch system: ${fetchError?.message}`)
    }

    return this.mapSolarSystem(system)
  }

  /**
   * Get all systems in a galaxy (paginated)
   */
  async getSystemsInGalaxy(
    galaxyId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ systems: SolarSystem[]; total: number }> {
    const offset = (page - 1) * pageSize

    const { data, error, count } = await this.supabase
      .from('solar_systems')
      .select('*', { count: 'exact' })
      .eq('galaxy_id', galaxyId)
      .order('system_index')
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error(`Failed to fetch systems: ${error.message}`)
    }

    return {
      systems: (data || []).map(this.mapSolarSystemBasic),
      total: count || 0,
    }
  }

  // ==========================================================================
  // CELESTIAL BODY OPERATIONS
  // ==========================================================================

  /**
   * Get all bodies in a system
   */
  async getBodiesInSystem(systemId: string): Promise<CelestialBodyWithMoons[]> {
    const { data, error } = await this.supabase
      .from('celestial_bodies')
      .select('*')
      .eq('solar_system_id', systemId)
      .order('orbital_position')

    if (error) {
      throw new Error(`Failed to fetch bodies: ${error.message}`)
    }

    // Group moons with their parents
    const planets: CelestialBodyWithMoons[] = []
    const moonMap = new Map<string, CelestialBody[]>()

    for (const body of data || []) {
      const mapped = this.mapCelestialBody(body)

      if (mapped.parentBodyId) {
        const moons = moonMap.get(mapped.parentBodyId) || []
        moons.push(mapped)
        moonMap.set(mapped.parentBodyId, moons)
      } else {
        planets.push({ ...mapped, moons: [] })
      }
    }

    // Attach moons to planets
    for (const planet of planets) {
      planet.moons = moonMap.get(planet.id) || []
    }

    return planets
  }

  /**
   * Get a specific celestial body by ID
   */
  async getCelestialBody(bodyId: string): Promise<CelestialBody | null> {
    const { data, error } = await this.supabase
      .from('celestial_bodies')
      .select('*')
      .eq('id', bodyId)
      .single()

    if (error || !data) return null

    return this.mapCelestialBody(data)
  }

  // ==========================================================================
  // STAR EFFECTS
  // ==========================================================================

  /**
   * Get star effects for a system
   */
  async getStarEffects(systemId: string): Promise<StarEffects | null> {
    const { data, error } = await this.supabase
      .from('star_effects')
      .select('*')
      .eq('solar_system_id', systemId)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      solarSystemId: data.solar_system_id,
      metalMultiplier: data.metal_multiplier,
      crystalMultiplier: data.crystal_multiplier,
      deuteriumMultiplier: data.deuterium_multiplier,
      energyMultiplier: data.energy_multiplier,
      expeditionBonus: data.expedition_bonus,
      fleetDamageChance: data.fleet_damage_chance,
      fleetLossChance: data.fleet_loss_chance,
      isColonizable: data.is_colonizable,
      hasRadiationHazard: data.has_radiation_hazard,
      hasGravitationalAnomaly: data.has_gravitational_anomaly,
      createdAt: data.created_at,
    }
  }

  // ==========================================================================
  // COLONY OPERATIONS
  // ==========================================================================

  /**
   * Get all colonies for a user
   */
  async getUserColonies(userId: string): Promise<ColonyWithBody[]> {
    const { data, error } = await this.supabase
      .from('player_colonies')
      .select(`
        *,
        celestial_bodies (*,
          solar_systems (*,
            galaxies (*)
          )
        )
      `)
      .eq('user_id', userId)
      .eq('destroyed', false)
      .order('created_at')

    if (error) {
      throw new Error(`Failed to fetch colonies: ${error.message}`)
    }

    return (data || []).map((colony) => this.mapColonyWithBody(colony))
  }

  /**
   * Colonize a celestial body
   */
  async colonize(
    userId: string,
    celestialBodyId: string,
    colonyName: string = 'Colony'
  ): Promise<PlayerColony> {
    // Check if body is colonizable
    const body = await this.getCelestialBody(celestialBodyId)
    if (!body) {
      throw new Error('Celestial body not found')
    }
    if (!body.isColonizable) {
      throw new Error('This body cannot be colonized')
    }
    if (body.colonizedAt) {
      throw new Error('This body is already colonized')
    }

    // Create colony
    const { data: colony, error: colonyError } = await this.supabase
      .from('player_colonies')
      .insert({
        user_id: userId,
        celestial_body_id: celestialBodyId,
        name: colonyName,
        is_homeworld: false,
        metal: 500,
        crystal: 500,
        deuterium: 0,
      })
      .select()
      .single()

    if (colonyError) {
      throw new Error(`Failed to create colony: ${colonyError.message}`)
    }

    // Mark body as colonized
    await this.supabase
      .from('celestial_bodies')
      .update({ colonized_at: new Date().toISOString() })
      .eq('id', celestialBodyId)

    return this.mapColony(colony)
  }

  // ==========================================================================
  // GALAXY VIEW
  // ==========================================================================

  /**
   * Get galaxy view data for a specific system
   */
  async getGalaxyView(
    galaxyIndex: number,
    systemIndex: number
  ): Promise<GalaxyViewEntry[]> {
    // First ensure the system is generated
    await this.getOrGenerateSystem(galaxyIndex, systemIndex)

    // Then fetch the view
    const { data, error } = await this.supabase
      .from('galaxy_view')
      .select('*')
      .eq('galaxy', galaxyIndex)
      .eq('system', systemIndex)
      .order('position')

    if (error) {
      throw new Error(`Failed to fetch galaxy view: ${error.message}`)
    }

    return (data || []).map((entry) => ({
      galaxy: entry.galaxy,
      system: entry.system,
      position: entry.position,
      celestialBodyId: entry.celestial_body_id,
      colonyId: entry.colony_id,
      planetName: entry.planet_name,
      planetType: entry.planet_type,
      userId: entry.user_id,
      username: entry.username,
      allianceTag: entry.alliance_tag,
      fieldsMax: entry.fields_max,
      fieldsUsed: entry.fields_used,
      diameter: entry.diameter,
      temperatureMin: entry.temperature_min,
      temperatureMax: entry.temperature_max,
      starType: entry.star_type,
      secondaryStarType: entry.secondary_star_type,
      starColor: entry.star_color,
      isColonizable: entry.is_colonizable,
      hasMoon: entry.has_moon,
      debrisMetal: entry.debris_metal,
      debrisCrystal: entry.debris_crystal,
    }))
  }

  /**
   * Find body by coordinates
   */
  async findBodyByCoordinates(
    coords: GalacticCoordinates
  ): Promise<CelestialBody | null> {
    // Ensure system is generated
    await this.getOrGenerateSystem(coords.galaxy, coords.system)

    // Find the body
    const { data, error } = await this.supabase
      .from('galaxy_view')
      .select('celestial_body_id')
      .eq('galaxy', coords.galaxy)
      .eq('system', coords.system)
      .eq('position', coords.position)
      .single()

    if (error || !data) return null

    return this.getCelestialBody(data.celestial_body_id)
  }

  // ==========================================================================
  // PRIVATE MAPPERS
  // ==========================================================================

  private mapSolarSystem(data: any): SolarSystemWithStar {
    const star = STAR_TYPES[data.star_type as keyof typeof STAR_TYPES]
    const secondaryStar = data.secondary_star_type
      ? STAR_TYPES[data.secondary_star_type as keyof typeof STAR_TYPES]
      : undefined

    return {
      id: data.id,
      galaxyId: data.galaxy_id,
      systemIndex: data.system_index,
      seed: data.seed,
      starType: data.star_type,
      secondaryStarType: data.secondary_star_type,
      planetCount: data.planet_count,
      habitableZoneInner: data.habitable_zone_inner,
      habitableZoneOuter: data.habitable_zone_outer,
      positionX: data.position_x,
      positionY: data.position_y,
      positionZ: data.position_z,
      isGenerated: data.is_generated,
      generatedAt: data.generated_at,
      createdAt: data.created_at,
      star: {
        id: star.id,
        name: star.name,
        probability: star.probability,
        color: star.color,
        temperatureKelvin: star.temperatureKelvin,
        luminosity: star.luminosity,
        isBinary: star.isBinary,
        isExotic: star.isExotic,
        colonizable: star.colonizable,
        metalMultiplier: star.metalMultiplier,
        crystalMultiplier: star.crystalMultiplier,
        deuteriumMultiplier: star.deuteriumMultiplier,
        energyMultiplier: star.energyMultiplier,
        expeditionBonus: star.expeditionBonus,
        fleetDamageChance: star.fleetDamageChance,
        fleetLossChance: star.fleetLossChance,
        description: star.description,
      },
      secondaryStar: secondaryStar
        ? {
            id: secondaryStar.id,
            name: secondaryStar.name,
            probability: secondaryStar.probability,
            color: secondaryStar.color,
            temperatureKelvin: secondaryStar.temperatureKelvin,
            luminosity: secondaryStar.luminosity,
            isBinary: secondaryStar.isBinary,
            isExotic: secondaryStar.isExotic,
            colonizable: secondaryStar.colonizable,
            metalMultiplier: secondaryStar.metalMultiplier,
            crystalMultiplier: secondaryStar.crystalMultiplier,
            deuteriumMultiplier: secondaryStar.deuteriumMultiplier,
            energyMultiplier: secondaryStar.energyMultiplier,
            expeditionBonus: secondaryStar.expeditionBonus,
            fleetDamageChance: secondaryStar.fleetDamageChance,
            fleetLossChance: secondaryStar.fleetLossChance,
            description: secondaryStar.description,
          }
        : undefined,
    }
  }

  private mapSolarSystemBasic(data: any): SolarSystem {
    return {
      id: data.id,
      galaxyId: data.galaxy_id,
      systemIndex: data.system_index,
      seed: data.seed,
      starType: data.star_type,
      secondaryStarType: data.secondary_star_type,
      planetCount: data.planet_count,
      habitableZoneInner: data.habitable_zone_inner,
      habitableZoneOuter: data.habitable_zone_outer,
      positionX: data.position_x,
      positionY: data.position_y,
      positionZ: data.position_z,
      isGenerated: data.is_generated,
      generatedAt: data.generated_at,
      createdAt: data.created_at,
    }
  }

  private mapCelestialBody(data: any): CelestialBody {
    return {
      id: data.id,
      solarSystemId: data.solar_system_id,
      parentBodyId: data.parent_body_id,
      bodyType: data.body_type,
      orbitalPosition: data.orbital_position,
      name: data.name,
      diameter: data.diameter,
      fieldsMax: data.fields_max,
      moonCapacity: data.moon_capacity,
      temperatureMin: data.temperature_min,
      temperatureMax: data.temperature_max,
      atmosphereType: data.atmosphere_type,
      seed: data.seed,
      planetVisualType: data.planet_visual_type,
      planetVisualVariant: data.planet_visual_variant,
      hasRings: data.has_rings,
      ringColor: data.ring_color,
      metalMultiplier: data.metal_multiplier,
      crystalMultiplier: data.crystal_multiplier,
      deuteriumMultiplier: data.deuterium_multiplier,
      isColonizable: data.is_colonizable,
      colonizedAt: data.colonized_at,
      createdAt: data.created_at,
    }
  }

  private mapColony(data: any): PlayerColony {
    return {
      id: data.id,
      userId: data.user_id,
      celestialBodyId: data.celestial_body_id,
      name: data.name,
      isHomeworld: data.is_homeworld,
      metal: data.metal,
      metalPerHour: data.metal_per_hour,
      metalMax: data.metal_max,
      crystal: data.crystal,
      crystalPerHour: data.crystal_per_hour,
      crystalMax: data.crystal_max,
      deuterium: data.deuterium,
      deuteriumPerHour: data.deuterium_per_hour,
      deuteriumMax: data.deuterium_max,
      energyUsed: data.energy_used,
      energyMax: data.energy_max,
      fieldsUsed: data.fields_used,
      metalMine: data.metal_mine,
      crystalMine: data.crystal_mine,
      deuteriumSynthesizer: data.deuterium_synthesizer,
      solarPlant: data.solar_plant,
      fusionPlant: data.fusion_plant,
      metalStorage: data.metal_storage,
      crystalStorage: data.crystal_storage,
      deuteriumTank: data.deuterium_tank,
      robotFactory: data.robot_factory,
      naniteFactory: data.nanite_factory,
      shipyard: data.shipyard,
      researchLab: data.research_lab,
      terraformer: data.terraformer,
      allianceDepot: data.alliance_depot,
      missileSilo: data.missile_silo,
      spaceDock: data.space_dock,
      lunarBase: data.lunar_base,
      sensorPhalanx: data.sensor_phalanx,
      jumpGate: data.jump_gate,
      jumpGateCooldown: data.jump_gate_cooldown,
      lightFighter: data.light_fighter,
      heavyFighter: data.heavy_fighter,
      cruiser: data.cruiser,
      battleship: data.battleship,
      battlecruiser: data.battlecruiser,
      bomber: data.bomber,
      destroyer: data.destroyer,
      deathstar: data.deathstar,
      smallCargo: data.small_cargo,
      largeCargo: data.large_cargo,
      colonyShip: data.colony_ship,
      recycler: data.recycler,
      espionageProbe: data.espionage_probe,
      solarSatellite: data.solar_satellite,
      crawler: data.crawler,
      reaper: data.reaper,
      pathfinder: data.pathfinder,
      rocketLauncher: data.rocket_launcher,
      lightLaser: data.light_laser,
      heavyLaser: data.heavy_laser,
      gaussCannon: data.gauss_cannon,
      ionCannon: data.ion_cannon,
      plasmaTurret: data.plasma_turret,
      smallShieldDome: data.small_shield_dome,
      largeShieldDome: data.large_shield_dome,
      antiBallisticMissile: data.anti_ballistic_missile,
      interplanetaryMissile: data.interplanetary_missile,
      lastResourceUpdate: data.last_resource_update,
      destroyed: data.destroyed,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }

  private mapColonyWithBody(data: any): ColonyWithBody {
    const colony = this.mapColony(data)
    const body = this.mapCelestialBody(data.celestial_bodies)
    const system = this.mapSolarSystemBasic(data.celestial_bodies.solar_systems)
    const galaxy: Galaxy = {
      id: data.celestial_bodies.solar_systems.galaxies.id,
      galaxyIndex: data.celestial_bodies.solar_systems.galaxies.galaxy_index,
      name: data.celestial_bodies.solar_systems.galaxies.name,
      seed: data.celestial_bodies.solar_systems.galaxies.seed,
      galaxyType: data.celestial_bodies.solar_systems.galaxies.galaxy_type,
      systemCount: data.celestial_bodies.solar_systems.galaxies.system_count,
      centerX: data.celestial_bodies.solar_systems.galaxies.center_x,
      centerY: data.celestial_bodies.solar_systems.galaxies.center_y,
      centerZ: data.celestial_bodies.solar_systems.galaxies.center_z,
      rotationAngle: data.celestial_bodies.solar_systems.galaxies.rotation_angle,
      createdAt: data.celestial_bodies.solar_systems.galaxies.created_at,
    }

    return {
      ...colony,
      celestialBody: body,
      solarSystem: system,
      galaxy,
      starEffects: {
        id: '',
        solarSystemId: system.id,
        metalMultiplier: 1,
        crystalMultiplier: 1,
        deuteriumMultiplier: 1,
        energyMultiplier: 1,
        expeditionBonus: 1,
        fleetDamageChance: 0,
        fleetLossChance: 0,
        isColonizable: true,
        hasRadiationHazard: false,
        hasGravitationalAnomaly: false,
        createdAt: '',
      },
    }
  }
}

export default GalaxyService
