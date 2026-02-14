/**
 * Battle Engine Constants
 *
 * Ship and defense combat stats, costs, and rapid fire tables.
 * Values based on classic OGame mechanics.
 */

import type { UnitStats, UnitCost, RapidFireTable } from './types'

// ============================================================================
// SHIP STATS (attack, shield, hull)
// ============================================================================

/**
 * Combat stats for all ships
 * Key is the ship key from game constants
 */
export const SHIP_STATS: Record<string, UnitStats> = {
  // Military ships
  light_fighter: { attack: 50, shield: 10, hull: 4000 },
  heavy_fighter: { attack: 150, shield: 25, hull: 10000 },
  cruiser: { attack: 400, shield: 50, hull: 27000 },
  battleship: { attack: 1000, shield: 200, hull: 60000 },
  battlecruiser: { attack: 700, shield: 400, hull: 70000 },
  bomber: { attack: 1000, shield: 500, hull: 75000 },
  destroyer: { attack: 2000, shield: 500, hull: 110000 },
  deathstar: { attack: 200000, shield: 50000, hull: 9000000 },
  reaper: { attack: 2800, shield: 700, hull: 140000 },
  pathfinder: { attack: 200, shield: 100, hull: 23000 },
  // Civil ships (still participate in combat)
  small_cargo: { attack: 5, shield: 10, hull: 4000 },
  large_cargo: { attack: 5, shield: 25, hull: 12000 },
  colony_ship: { attack: 50, shield: 100, hull: 30000 },
  recycler: { attack: 1, shield: 10, hull: 16000 },
  espionage_probe: { attack: 0, shield: 0, hull: 1000 },
  solar_satellite: { attack: 0, shield: 1, hull: 2000 },
}

/**
 * Ship IDs mapping from game constants
 */
export const SHIP_IDS: Record<string, number> = {
  small_cargo: 202,
  large_cargo: 203,
  light_fighter: 204,
  heavy_fighter: 205,
  cruiser: 206,
  battleship: 207,
  colony_ship: 208,
  recycler: 209,
  espionage_probe: 210,
  bomber: 211,
  solar_satellite: 212,
  destroyer: 213,
  deathstar: 214,
  battlecruiser: 215,
  reaper: 218,
  pathfinder: 219,
}

/**
 * Ship costs for debris calculation
 */
export const SHIP_COSTS: Record<string, UnitCost> = {
  small_cargo: { metal: 2000, crystal: 2000, deuterium: 0 },
  large_cargo: { metal: 6000, crystal: 6000, deuterium: 0 },
  light_fighter: { metal: 3000, crystal: 1000, deuterium: 0 },
  heavy_fighter: { metal: 6000, crystal: 4000, deuterium: 0 },
  cruiser: { metal: 20000, crystal: 7000, deuterium: 2000 },
  battleship: { metal: 45000, crystal: 15000, deuterium: 0 },
  colony_ship: { metal: 10000, crystal: 20000, deuterium: 10000 },
  recycler: { metal: 10000, crystal: 6000, deuterium: 2000 },
  espionage_probe: { metal: 0, crystal: 1000, deuterium: 0 },
  bomber: { metal: 50000, crystal: 25000, deuterium: 15000 },
  solar_satellite: { metal: 0, crystal: 2000, deuterium: 500 },
  destroyer: { metal: 60000, crystal: 50000, deuterium: 15000 },
  deathstar: { metal: 5000000, crystal: 4000000, deuterium: 1000000 },
  battlecruiser: { metal: 30000, crystal: 40000, deuterium: 15000 },
  reaper: { metal: 85000, crystal: 55000, deuterium: 20000 },
  pathfinder: { metal: 8000, crystal: 15000, deuterium: 8000 },
}

// ============================================================================
// DEFENSE STATS (attack, shield, hull)
// ============================================================================

/**
 * Combat stats for all defenses
 */
export const DEFENSE_STATS: Record<string, UnitStats> = {
  rocket_launcher: { attack: 80, shield: 20, hull: 2000 },
  light_laser: { attack: 100, shield: 25, hull: 2000 },
  heavy_laser: { attack: 250, shield: 100, hull: 8000 },
  gauss_cannon: { attack: 1100, shield: 200, hull: 35000 },
  ion_cannon: { attack: 150, shield: 500, hull: 8000 },
  plasma_turret: { attack: 3000, shield: 300, hull: 100000 },
  small_shield_dome: { attack: 1, shield: 2000, hull: 20000 },
  large_shield_dome: { attack: 1, shield: 10000, hull: 100000 },
}

/**
 * Defense IDs mapping from game constants
 */
export const DEFENSE_IDS: Record<string, number> = {
  rocket_launcher: 401,
  light_laser: 402,
  heavy_laser: 403,
  gauss_cannon: 404,
  ion_cannon: 405,
  plasma_turret: 406,
  small_shield_dome: 407,
  large_shield_dome: 408,
}

/**
 * Defense costs for loss calculation (defenses don't generate debris)
 */
export const DEFENSE_COSTS: Record<string, UnitCost> = {
  rocket_launcher: { metal: 2000, crystal: 0, deuterium: 0 },
  light_laser: { metal: 1500, crystal: 500, deuterium: 0 },
  heavy_laser: { metal: 6000, crystal: 2000, deuterium: 0 },
  gauss_cannon: { metal: 20000, crystal: 15000, deuterium: 2000 },
  ion_cannon: { metal: 2000, crystal: 6000, deuterium: 0 },
  plasma_turret: { metal: 50000, crystal: 50000, deuterium: 30000 },
  small_shield_dome: { metal: 10000, crystal: 10000, deuterium: 0 },
  large_shield_dome: { metal: 50000, crystal: 50000, deuterium: 0 },
}

// ============================================================================
// RAPID FIRE TABLE
// ============================================================================

/**
 * Rapid fire table: attacker -> target -> number of shots
 *
 * When a ship has rapid fire against another unit, it can fire multiple times
 * per round. The probability of each additional shot is (rapidFire - 1) / rapidFire.
 *
 * Example: Deathstar has 200 rapid fire vs Light Fighter
 * - First shot: 100%
 * - Second shot: 199/200 = 99.5%
 * - Third shot: 199/200 = 99.5%
 * - ... continues until miss
 *
 * This table stores the rapid fire values.
 */
export const RAPID_FIRE: RapidFireTable = {
  // Small Cargo
  small_cargo: {
    espionage_probe: 5,
    solar_satellite: 5,
  },

  // Large Cargo
  large_cargo: {
    espionage_probe: 5,
    solar_satellite: 5,
  },

  // Light Fighter
  light_fighter: {
    espionage_probe: 5,
    solar_satellite: 5,
  },

  // Heavy Fighter
  heavy_fighter: {
    espionage_probe: 5,
    solar_satellite: 5,
    small_cargo: 3,
  },

  // Cruiser
  cruiser: {
    espionage_probe: 5,
    solar_satellite: 5,
    light_fighter: 6,
    rocket_launcher: 10,
  },

  // Battleship
  battleship: {
    espionage_probe: 5,
    solar_satellite: 5,
  },

  // Colony Ship
  colony_ship: {
    espionage_probe: 5,
    solar_satellite: 5,
  },

  // Recycler
  recycler: {
    espionage_probe: 5,
    solar_satellite: 5,
  },

  // Bomber
  bomber: {
    espionage_probe: 5,
    solar_satellite: 5,
    rocket_launcher: 20,
    light_laser: 20,
    heavy_laser: 10,
    ion_cannon: 10,
    gauss_cannon: 5,
    plasma_turret: 5,
  },

  // Destroyer
  destroyer: {
    espionage_probe: 5,
    solar_satellite: 5,
    light_laser: 10,
    battlecruiser: 2,
  },

  // Deathstar
  deathstar: {
    espionage_probe: 1250,
    solar_satellite: 1250,
    small_cargo: 250,
    large_cargo: 250,
    light_fighter: 200,
    heavy_fighter: 100,
    cruiser: 33,
    battleship: 30,
    colony_ship: 250,
    recycler: 250,
    bomber: 25,
    destroyer: 5,
    battlecruiser: 15,
    rocket_launcher: 200,
    light_laser: 200,
    heavy_laser: 100,
    gauss_cannon: 50,
    ion_cannon: 100,
    reaper: 10,
    pathfinder: 30,
  },

  // Battlecruiser
  battlecruiser: {
    espionage_probe: 5,
    solar_satellite: 5,
    small_cargo: 3,
    large_cargo: 3,
    light_fighter: 4,
    heavy_fighter: 4,
    cruiser: 4,
    battleship: 7,
  },

  // Reaper
  reaper: {
    espionage_probe: 5,
    solar_satellite: 5,
    battleship: 7,
    bomber: 4,
    destroyer: 3,
  },

  // Pathfinder
  pathfinder: {
    espionage_probe: 5,
    solar_satellite: 5,
    cruiser: 3,
    light_fighter: 3,
    heavy_fighter: 2,
  },
}

// ============================================================================
// COMBAT CONSTANTS
// ============================================================================

/**
 * Combat mechanic constants
 */
export const COMBAT_CONSTANTS = {
  /** Maximum number of combat rounds */
  MAX_ROUNDS: 6,

  /** Minimum damage percentage to penetrate shields (1%) */
  MIN_DAMAGE_PERCENT: 0.01,

  /** Hull damage threshold for explosion chance (70%) */
  EXPLOSION_THRESHOLD: 0.7,

  /** Debris percentage from destroyed ships (30%) */
  DEBRIS_PERCENTAGE: 0.3,

  /** Moon chance per 100k debris (1%) */
  MOON_CHANCE_PER_100K: 1,

  /** Maximum moon chance (20%) */
  MAX_MOON_CHANCE: 20,

  /** Defense rebuild chance (70% chance to survive) */
  DEFENSE_REBUILD_CHANCE: 0.7,
}

/**
 * Get all ship keys that can participate in combat
 */
export const COMBAT_SHIP_KEYS = Object.keys(SHIP_STATS)

/**
 * Get all defense keys that can participate in combat
 */
export const COMBAT_DEFENSE_KEYS = Object.keys(DEFENSE_STATS)
