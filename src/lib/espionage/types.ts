/**
 * Espionage System Types
 * TypeScript types for the espionage mission system
 */

import type { Resources, ShipCounts } from '../missions/types'

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Information level revealed by espionage
 * Based on espionage tech difference and probe count
 */
export enum InfoLevel {
  /** Always revealed - basic resources */
  RESOURCES = 1,
  /** Revealed at +1 tech difference - fleet composition */
  FLEET = 2,
  /** Revealed at +3 tech difference - defense structures */
  DEFENSE = 3,
  /** Revealed at +5 tech difference - building levels */
  BUILDINGS = 4,
  /** Revealed at +7 tech difference - research levels */
  RESEARCH = 5,
}

// ============================================================================
// ESPIONAGE REPORT
// ============================================================================

/**
 * Complete espionage report structure
 */
export interface EspionageReport {
  /** Unique report identifier */
  id: string
  /** Target planet ID */
  target_planet_id: string
  /** Target player ID */
  target_player_id: string
  /** Target planet name */
  target_planet_name: string
  /** Target planet coordinates */
  target_coordinates: string
  /** Number of probes sent */
  spy_count: number
  /** Maximum info level achieved */
  info_level: InfoLevel
  /** Resources on target (always revealed) */
  resources?: Resources
  /** Fleet on target (info level >= 2) */
  fleet?: Record<string, number>
  /** Defense on target (info level >= 3) */
  defense?: Record<string, number>
  /** Buildings on target (info level >= 4) */
  buildings?: Record<string, number>
  /** Research levels of target player (info level >= 5) */
  research?: Record<string, number>
  /** Whether counter-espionage was triggered */
  counter_espionage: boolean
  /** Number of probes destroyed by counter-espionage */
  probes_lost: number
  /** Counter-espionage chance percentage */
  counter_espionage_chance: number
  /** Report creation timestamp */
  created_at: string
}

// ============================================================================
// COUNTER-ESPIONAGE RESULT
// ============================================================================

/**
 * Result of counter-espionage check
 */
export interface CounterEspionageResult {
  /** Whether probes were detected */
  detected: boolean
  /** Number of probes destroyed */
  probesLost: number
  /** Detection chance percentage (0-100) */
  detectionChance: number
}

// ============================================================================
// ESPIONAGE CALCULATION PARAMS
// ============================================================================

/**
 * Parameters for calculating espionage info level
 */
export interface EspionageCalcParams {
  /** Attacker's espionage technology level */
  attackerTech: number
  /** Defender's espionage technology level */
  defenderTech: number
  /** Number of probes sent */
  probeCount: number
}

// ============================================================================
// TARGET DATA STRUCTURES
// ============================================================================

/**
 * Resources data from target planet
 */
export interface TargetResources {
  metal: number
  crystal: number
  deuterium: number
}

/**
 * Fleet data from target planet
 */
export interface TargetFleet {
  light_fighter: number
  heavy_fighter: number
  cruiser: number
  battleship: number
  battlecruiser: number
  bomber: number
  destroyer: number
  deathstar: number
  small_cargo: number
  large_cargo: number
  colony_ship: number
  recycler: number
  espionage_probe: number
  solar_satellite: number
  crawler: number
  reaper: number
  pathfinder: number
}

/**
 * Defense data from target planet
 */
export interface TargetDefense {
  rocket_launcher: number
  light_laser: number
  heavy_laser: number
  gauss_cannon: number
  ion_cannon: number
  plasma_turret: number
  small_shield_dome: number
  large_shield_dome: number
  anti_ballistic_missile: number
  interplanetary_missile: number
}

/**
 * Building data from target planet
 */
export interface TargetBuildings {
  metal_mine: number
  crystal_mine: number
  deuterium_synthesizer: number
  solar_plant: number
  fusion_plant: number
  metal_storage: number
  crystal_storage: number
  deuterium_tank: number
  robot_factory: number
  nanite_factory: number
  shipyard: number
  research_lab: number
  terraformer: number
  alliance_depot: number
  missile_silo: number
  space_dock: number
  lunar_base: number
  sensor_phalanx: number
  jump_gate: number
}

/**
 * Research data from target player
 */
export interface TargetResearch {
  energy_technology: number
  laser_technology: number
  ion_technology: number
  hyperspace_technology: number
  plasma_technology: number
  combustion_drive: number
  impulse_drive: number
  hyperspace_drive: number
  espionage_technology: number
  computer_technology: number
  astrophysics: number
  intergalactic_research_network: number
  graviton_technology: number
  weapons_technology: number
  shielding_technology: number
  armor_technology: number
}

// ============================================================================
// PROBE STATS
// ============================================================================

/**
 * Espionage probe combat statistics
 * Probes have minimal combat stats - mostly used for detection rolls
 */
export const PROBE_STATS = {
  /** Base attack power (minimal) */
  attack: 0.01,
  /** Base shield power (minimal) */
  shield: 0.01,
  /** Hull points */
  hull: 1000,
  /** Speed (very fast) */
  speed: 100000000,
  /** Cargo capacity (none) */
  cargo: 0,
  /** Fuel consumption per unit distance */
  fuelConsumption: 1,
} as const

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Tech difference thresholds for revealing information
 */
export const INFO_LEVEL_THRESHOLDS = {
  /** Resources always visible */
  [InfoLevel.RESOURCES]: 0,
  /** Fleet visible at +1 tech */
  [InfoLevel.FLEET]: 1,
  /** Defense visible at +3 tech */
  [InfoLevel.DEFENSE]: 3,
  /** Buildings visible at +5 tech */
  [InfoLevel.BUILDINGS]: 5,
  /** Research visible at +7 tech */
  [InfoLevel.RESEARCH]: 7,
} as const

/**
 * Counter-espionage base factor
 * Formula: chance = (defTech - attTech) * probeCount * BASE_FACTOR
 */
export const COUNTER_ESPIONAGE_BASE_FACTOR = 0.02

/**
 * Additional probes bonus for info level
 * Each probe beyond minimum adds to effective tech difference
 */
export const PROBE_INFO_BONUS = 0.25
