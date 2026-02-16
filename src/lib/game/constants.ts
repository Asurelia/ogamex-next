/**
 * OGameX Game Constants
 *
 * This file contains:
 * - Type definitions for game entities
 * - Universe constants (galaxy/system/position limits)
 * - Mission type constants
 *
 * For actual game data (ships, buildings, defenses, research),
 * use the cached functions from @/lib/game:
 *
 * ```typescript
 * import { getCachedGameConfig, getShipByKey } from '@/lib/game'
 *
 * // Get full config (most efficient)
 * const config = await getCachedGameConfig()
 * const ship = config.shipsByKey['light_fighter']
 *
 * // Or get specific data
 * const ship = await getShipByKey('light_fighter')
 * ```
 */

// ============================================================================
// UNIVERSE CONSTANTS (Legacy - compatible with old planet system)
// ============================================================================

export const UNIVERSE = {
  MIN_GALAXY: 1,
  MAX_GALAXY: 9,
  MIN_SYSTEM: 1,
  MAX_SYSTEM: 499,
  MIN_POSITION: 1,
  MAX_POSITION: 15,
  EXPEDITION_POSITION: 16,
} as const

// ============================================================================
// PROCEDURAL UNIVERSE CONSTANTS
// New expanded universe with procedural generation
// ============================================================================

export const PROCEDURAL_UNIVERSE = {
  /** Minimum number of galaxies */
  MIN_GALAXIES: 80,
  /** Maximum number of galaxies */
  MAX_GALAXIES: 100,
  /** Minimum solar systems per galaxy */
  MIN_SYSTEMS_PER_GALAXY: 100,
  /** Maximum solar systems per galaxy */
  MAX_SYSTEMS_PER_GALAXY: 200,
  /** Minimum planets per system */
  MIN_PLANETS_PER_SYSTEM: 1,
  /** Maximum planets per system */
  MAX_PLANETS_PER_SYSTEM: 9,
  /** Maximum moons per planet */
  MAX_MOONS_PER_PLANET: 8,
  /** Minimum fields for a planet */
  MIN_PLANET_FIELDS: 8,
  /** Maximum fields for a planet */
  MAX_PLANET_FIELDS: 20,
  /** Minimum fields for a moon */
  MIN_MOON_FIELDS: 3,
  /** Maximum fields for a moon */
  MAX_MOON_FIELDS: 10,
  /** Expedition position (outside normal planet range) */
  EXPEDITION_POSITION: 16,
} as const

// ============================================================================
// STAR TYPE GAMEPLAY EFFECTS
// Quick reference for gameplay effects by star type
// ============================================================================

export const STAR_GAMEPLAY_EFFECTS = {
  yellow_dwarf: { description: 'Standard - No bonuses or penalties' },
  red_dwarf: { description: '-10% solar energy, +10% deuterium' },
  orange_dwarf: { description: '-5% solar energy' },
  white_dwarf: { description: '+20% crystal, +10% energy, minor fleet damage risk' },
  red_giant: { description: '+30% metal, -20% deuterium, minor fleet damage risk' },
  blue_giant: { description: '+50% energy, +30% deuterium, moderate fleet damage risk' },
  binary_yellow: { description: '+15% energy, minor fleet damage risk' },
  binary_red: { description: '-5% energy, +5% deuterium' },
  binary_mixed: { description: '+10% crystal, +10% deuterium, minor fleet damage risk' },
  neutron_star: { description: '+100% deuterium, -50% energy, high fleet damage risk' },
  black_hole: { description: 'Non-colonizable, +200% expedition bonus, extreme fleet loss risk' },
  white_giant: { description: '+40% crystal, +20% energy, minor fleet damage risk' },
} as const

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface BuildingDefinition {
  id: number
  name: string
  key: string
  baseCost: { metal: number; crystal: number; deuterium: number }
  priceFactor: number
  category: 'resources' | 'facilities' | 'moon'
}

export interface ShipDefinition {
  id: number
  name: string
  key: string
  cost: { metal: number; crystal: number; deuterium: number }
  structuralIntegrity: number
  shieldPower: number
  weaponPower: number
  speed: number
  cargoCapacity: number
  fuelConsumption: number
  driveType: 'combustion' | 'impulse' | 'hyperspace'
  category: 'military' | 'civil'
}

export interface DefenseDefinition {
  id: number
  name: string
  key: string
  cost: { metal: number; crystal: number; deuterium: number }
  structuralIntegrity: number
  shieldPower: number
  weaponPower: number
}

export interface ResearchDefinition {
  id: number
  name: string
  key: string
  baseCost: { metal: number; crystal: number; deuterium: number }
  priceFactor: number
}

// ============================================================================
// MISSION TYPES
// ============================================================================

export const MISSION_TYPES = {
  ATTACK: 1,
  ACS_ATTACK: 2,
  TRANSPORT: 3,
  DEPLOYMENT: 4,
  ACS_DEFEND: 5,
  ESPIONAGE: 6,
  COLONIZATION: 7,
  RECYCLE: 8,
  MOON_DESTRUCTION: 9,
  EXPEDITION: 15,
} as const

export type MissionTypeId = typeof MISSION_TYPES[keyof typeof MISSION_TYPES]
