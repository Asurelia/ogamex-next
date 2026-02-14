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
// UNIVERSE CONSTANTS
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

// ============================================================================
// DEPRECATED EXPORTS
// These are kept for backward compatibility but should be migrated to use
// the cached functions from @/lib/game instead.
// ============================================================================

/**
 * @deprecated Use getCachedGameConfig() from @/lib/game instead
 * This empty object is kept for type compatibility during migration
 */
export const SHIPS: Record<number, ShipDefinition> = {}

/**
 * @deprecated Use getCachedGameConfig() from @/lib/game instead
 */
export const BUILDINGS: Record<number, BuildingDefinition> = {}

/**
 * @deprecated Use getCachedGameConfig() from @/lib/game instead
 */
export const DEFENSE: Record<number, DefenseDefinition> = {}

/**
 * @deprecated Use getCachedGameConfig() from @/lib/game instead
 */
export const RESEARCH: Record<number, ResearchDefinition> = {}

// ============================================================================
// DEPRECATED HELPER FUNCTIONS
// These are synchronous stubs that return empty values.
// Use the async versions from @/lib/game instead.
// ============================================================================

/**
 * @deprecated Use getShipByKey() from @/lib/game instead (async)
 */
export function getShipCargoCapacity(_shipKey: string): number {
  console.warn('[DEPRECATED] getShipCargoCapacity from @/game/constants is deprecated. Use @/lib/game instead.')
  return 0
}

/**
 * @deprecated Use getCachedGameConfig() from @/lib/game instead
 */
export function getAllShipCargoCapacities(): Record<string, number> {
  console.warn('[DEPRECATED] getAllShipCargoCapacities from @/game/constants is deprecated. Use @/lib/game instead.')
  return {}
}

/**
 * @deprecated Use calculateFleetCargoCapacity() from @/lib/game instead (async)
 */
export function calculateFleetCargoCapacity(_ships: Record<string, number>): number {
  console.warn('[DEPRECATED] calculateFleetCargoCapacity from @/game/constants is deprecated. Use @/lib/game instead.')
  return 0
}

/**
 * @deprecated Use getShipByKey() from @/lib/game instead (async)
 */
export function getShipCost(_shipKey: string): { metal: number; crystal: number; deuterium: number } {
  console.warn('[DEPRECATED] getShipCost from @/game/constants is deprecated. Use @/lib/game instead.')
  return { metal: 0, crystal: 0, deuterium: 0 }
}

/**
 * @deprecated Use getDefenseByKey() from @/lib/game instead (async)
 */
export function getDefenseCost(_defenseKey: string): { metal: number; crystal: number; deuterium: number } {
  console.warn('[DEPRECATED] getDefenseCost from @/game/constants is deprecated. Use @/lib/game instead.')
  return { metal: 0, crystal: 0, deuterium: 0 }
}

/**
 * @deprecated Use calculateShipPoints() from @/lib/game instead (async)
 */
export function calculateShipPoints(_shipKey: string): number {
  console.warn('[DEPRECATED] calculateShipPoints from @/game/constants is deprecated. Use @/lib/game instead.')
  return 0
}

/**
 * @deprecated Use calculateDefensePoints() from @/lib/game instead (async)
 */
export function calculateDefensePoints(_defenseKey: string): number {
  console.warn('[DEPRECATED] calculateDefensePoints from @/game/constants is deprecated. Use @/lib/game instead.')
  return 0
}

/**
 * @deprecated Use getAllShipPoints() from @/lib/game instead (async)
 */
export function getAllShipPoints(): Record<string, number> {
  console.warn('[DEPRECATED] getAllShipPoints from @/game/constants is deprecated. Use @/lib/game instead.')
  return {}
}

/**
 * @deprecated Use getAllDefensePoints() from @/lib/game instead (async)
 */
export function getAllDefensePoints(): Record<string, number> {
  console.warn('[DEPRECATED] getAllDefensePoints from @/game/constants is deprecated. Use @/lib/game instead.')
  return {}
}

/**
 * @deprecated Use getShipByKey() from @/lib/game instead (async)
 */
export function getShipByKey(_key: string): ShipDefinition | undefined {
  console.warn('[DEPRECATED] getShipByKey from @/game/constants is deprecated. Use @/lib/game instead.')
  return undefined
}

/**
 * @deprecated Use getDefenseByKey() from @/lib/game instead (async)
 */
export function getDefenseByKey(_key: string): DefenseDefinition | undefined {
  console.warn('[DEPRECATED] getDefenseByKey from @/game/constants is deprecated. Use @/lib/game instead.')
  return undefined
}
