/**
 * Moon System Constants
 *
 * Constants for moon creation, lunar buildings, and related mechanics.
 * Based on classic OGame mechanics.
 */

// ============================================================================
// MOON CREATION CONSTANTS
// ============================================================================

/**
 * Moon creation parameters
 */
export const MOON_CREATION = {
  /** Minimum moon diameter in km */
  MIN_DIAMETER: 2000,

  /** Maximum moon diameter in km */
  MAX_DIAMETER: 8000,

  /** Fields per 1000km of diameter */
  FIELDS_PER_1000KM: 1,

  /** Moon chance percentage per 100k debris (metal + crystal) */
  CHANCE_PER_100K_DEBRIS: 1,

  /** Maximum moon creation chance (20%) */
  MAX_CHANCE: 20,

  /** Default moon name */
  DEFAULT_NAME: 'Moon',

  /** Moon temperature range */
  TEMP_MIN: -40,
  TEMP_MAX: -20,
} as const

// ============================================================================
// LUNAR BUILDING CONSTANTS
// ============================================================================

/**
 * Lunar Base - Provides additional fields on the moon
 */
export const LUNAR_BASE = {
  /** Building ID */
  id: 41,

  /** Fields provided per level */
  fields_per_level: 3,

  /** Base cost */
  cost: {
    metal: 20000,
    crystal: 40000,
    deuterium: 20000,
  },

  /** Cost multiplier per level */
  cost_factor: 2,

  /** Requirements */
  requirements: {},
} as const

/**
 * Sensor Phalanx - Allows scanning fleet movements
 */
export const SENSOR_PHALANX = {
  /** Building ID */
  id: 42,

  /** Range formula: level^2 - 1 systems */
  range_formula: (level: number): number => level * level - 1,

  /** Deuterium cost per scan */
  deuterium_cost_per_scan: 5000,

  /** Base cost */
  cost: {
    metal: 20000,
    crystal: 40000,
    deuterium: 20000,
  },

  /** Cost multiplier per level */
  cost_factor: 2,

  /** Requirements */
  requirements: {
    lunar_base: 1,
  },
} as const

/**
 * Jump Gate - Allows instant fleet transfer between moons
 */
export const JUMP_GATE = {
  /** Building ID */
  id: 43,

  /** Cooldown in hours */
  cooldown_hours: 1,

  /** Cooldown in milliseconds */
  cooldown_ms: 1 * 60 * 60 * 1000,

  /** Base cost */
  cost: {
    metal: 2000000,
    crystal: 4000000,
    deuterium: 2000000,
  },

  /** Cost multiplier per level (only level 1 needed) */
  cost_factor: 2,

  /** Requirements */
  requirements: {
    lunar_base: 1,
    hyperspace_technology: 7,
  },
} as const

/**
 * All lunar buildings configuration
 */
export const LUNAR_BUILDINGS = {
  lunar_base: LUNAR_BASE,
  sensor_phalanx: SENSOR_PHALANX,
  jump_gate: JUMP_GATE,
} as const

// ============================================================================
// MOON DESTRUCTION CONSTANTS
// ============================================================================

/**
 * Moon destruction mechanics (RIP/Deathstar attack)
 */
export const MOON_DESTRUCTION = {
  /**
   * Calculate moon destruction chance
   * Formula: (100 - sqrt(diameter)) * ripsCount / 100
   *
   * Examples:
   * - 8000km moon, 1 RIP: (100 - 89.44) * 1 / 100 = 10.56%
   * - 8000km moon, 5 RIPs: (100 - 89.44) * 5 / 100 = 52.8%
   * - 2000km moon, 1 RIP: (100 - 44.72) * 1 / 100 = 55.28%
   */
  moonDestroyChance: (diameter: number, ripsCount: number): number => {
    const sqrtDiameter = Math.sqrt(diameter)
    return Math.min(100, Math.max(0, ((100 - sqrtDiameter) * ripsCount) / 100))
  },

  /**
   * Calculate RIP destruction chance
   * Formula: sqrt(diameter) / 2
   *
   * Examples:
   * - 8000km moon: sqrt(8000) / 2 = 44.72%
   * - 2000km moon: sqrt(2000) / 2 = 22.36%
   */
  ripDestroyChance: (diameter: number): number => {
    return Math.sqrt(diameter) / 2
  },

  /** Maximum moon destruction chance */
  MAX_MOON_DESTROY_CHANCE: 100,

  /** Maximum RIP destruction chance */
  MAX_RIP_DESTROY_CHANCE: 100,
} as const

// ============================================================================
// PHALANX CONSTANTS
// ============================================================================

/**
 * Sensor Phalanx constants
 */
export const PHALANX = {
  /** Calculate phalanx range in systems */
  calculateRange: (level: number): number => {
    if (level <= 0) return 0
    return level * level - 1
  },

  /** Deuterium cost per scan */
  SCAN_COST: 5000,

  /** Cannot scan own planets */
  CAN_SCAN_OWN: false,

  /** Cannot scan moons (only planets) */
  CAN_SCAN_MOONS: false,
} as const

// ============================================================================
// JUMP GATE CONSTANTS
// ============================================================================

/**
 * Jump Gate constants
 */
export const JUMP_GATE_CONFIG = {
  /** Cooldown duration in milliseconds (1 hour) */
  COOLDOWN_MS: 60 * 60 * 1000,

  /** Cooldown duration in seconds */
  COOLDOWN_SECONDS: 60 * 60,

  /** No fuel cost for jump gate transfer */
  FUEL_COST: 0,

  /** No travel time for jump gate transfer */
  TRAVEL_TIME: 0,

  /** Ships that CANNOT use jump gate */
  EXCLUDED_SHIPS: [] as string[],

  /** Resources CANNOT be transferred via jump gate */
  CAN_TRANSFER_RESOURCES: false,
} as const

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate moon diameter (random within range)
 */
export function calculateMoonDiameter(): number {
  const range = MOON_CREATION.MAX_DIAMETER - MOON_CREATION.MIN_DIAMETER
  return Math.floor(MOON_CREATION.MIN_DIAMETER + Math.random() * range)
}

/**
 * Calculate moon fields from diameter
 */
export function calculateMoonFields(diameter: number): number {
  return Math.floor(diameter / 1000) * MOON_CREATION.FIELDS_PER_1000KM
}

/**
 * Calculate moon creation chance from debris
 */
export function calculateMoonChance(debrisMetal: number, debrisCrystal: number): number {
  const totalDebris = debrisMetal + debrisCrystal
  const chance = Math.floor(totalDebris / 100000) * MOON_CREATION.CHANCE_PER_100K_DEBRIS
  return Math.min(chance, MOON_CREATION.MAX_CHANCE)
}

/**
 * Calculate phalanx range
 */
export function calculatePhalanxRange(level: number): number {
  return PHALANX.calculateRange(level)
}

/**
 * Check if a planet is within phalanx range
 */
export function isInPhalanxRange(
  moonGalaxy: number,
  moonSystem: number,
  targetGalaxy: number,
  targetSystem: number,
  phalanxLevel: number
): boolean {
  // Must be in same galaxy
  if (moonGalaxy !== targetGalaxy) {
    return false
  }

  const range = calculatePhalanxRange(phalanxLevel)
  const systemDistance = Math.abs(moonSystem - targetSystem)

  return systemDistance <= range
}

/**
 * Calculate lunar base fields bonus
 */
export function calculateLunarBaseFieldsBonus(level: number): number {
  return level * LUNAR_BASE.fields_per_level
}

/**
 * Calculate total moon fields (base + lunar base bonus)
 */
export function calculateTotalMoonFields(baseDiameter: number, lunarBaseLevel: number): number {
  const baseFields = calculateMoonFields(baseDiameter)
  const bonusFields = calculateLunarBaseFieldsBonus(lunarBaseLevel)
  return baseFields + bonusFields
}
