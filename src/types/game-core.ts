/**
 * OGameX Game Core Types
 * 
 * SINGLE SOURCE OF TRUTH for all shared game types.
 * Every module should import from here instead of defining its own copies.
 * 
 * This file consolidates types previously scattered across:
 * - src/lib/missions/types.ts (Resources, ShipCounts, Coordinates)
 * - src/lib/battle/types.ts (Resources duplicate)
 * - src/lib/game/missions/mission-types.ts (all duplicated)
 * - src/types/battle.ts (Coordinates duplicate)
 * - src/components/game/PlanetSidebar.tsx (PlanetCoordinates duplicate)
 * - src/components/game/3d/battle/BattleScene3D.tsx (BattleResult duplicate)
 */

// ============================================================================
// RESOURCES
// ============================================================================

export interface Resources {
  metal: number
  crystal: number
  deuterium: number
}

/** Create a fresh empty Resources object */
export const emptyResources = (): Resources => ({
  metal: 0,
  crystal: 0,
  deuterium: 0,
})

/** Also available as a constant for spread patterns: { ...RESOURCES_EMPTY } */
export const RESOURCES_EMPTY: Readonly<Resources> = Object.freeze({
  metal: 0,
  crystal: 0,
  deuterium: 0,
})

export const sumResources = (res: Resources): number =>
  res.metal + res.crystal + res.deuterium

export const hasResources = (res: Resources): boolean =>
  res.metal > 0 || res.crystal > 0 || res.deuterium > 0

export const addResources = (a: Resources, b: Resources): Resources => ({
  metal: a.metal + b.metal,
  crystal: a.crystal + b.crystal,
  deuterium: a.deuterium + b.deuterium,
})

export const subtractResources = (a: Resources, b: Resources): Resources => ({
  metal: Math.max(0, a.metal - b.metal),
  crystal: Math.max(0, a.crystal - b.crystal),
  deuterium: Math.max(0, a.deuterium - b.deuterium),
})

export const scaleResources = (res: Resources, factor: number): Resources => ({
  metal: Math.floor(res.metal * factor),
  crystal: Math.floor(res.crystal * factor),
  deuterium: Math.floor(res.deuterium * factor),
})

// ============================================================================
// COORDINATES
// ============================================================================

export interface Coordinates {
  galaxy: number
  system: number
  position: number
}

export const formatCoordinates = (
  galaxy: number,
  system: number,
  position: number
): string => `[${galaxy}:${system}:${position}]`

export const formatCoordinatesObj = (coords: Coordinates): string =>
  formatCoordinates(coords.galaxy, coords.system, coords.position)

// ============================================================================
// SHIPS
// ============================================================================

export interface ShipCounts {
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
  reaper: number
  pathfinder: number
}

export const SHIP_KEYS: (keyof ShipCounts)[] = [
  'light_fighter',
  'heavy_fighter',
  'cruiser',
  'battleship',
  'battlecruiser',
  'bomber',
  'destroyer',
  'deathstar',
  'small_cargo',
  'large_cargo',
  'colony_ship',
  'recycler',
  'espionage_probe',
  'reaper',
  'pathfinder',
]

/** Create a fresh empty ShipCounts object */
export const emptyShipCounts = (): ShipCounts => ({
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
  reaper: 0,
  pathfinder: 0,
})

/** Also available as a constant for spread patterns: { ...SHIP_COUNTS_EMPTY } */
export const SHIP_COUNTS_EMPTY: Readonly<ShipCounts> = Object.freeze({
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
  reaper: 0,
  pathfinder: 0,
})

export const getTotalShips = (ships: ShipCounts): number =>
  SHIP_KEYS.reduce((sum, key) => sum + ships[key], 0)

// ============================================================================
// DEFENSES
// ============================================================================

export interface DefenseCounts {
  rocket_launcher: number
  light_laser: number
  heavy_laser: number
  gauss_cannon: number
  ion_cannon: number
  plasma_turret: number
  small_shield_dome: number
  large_shield_dome: number
}

export const DEFENSE_KEYS: (keyof DefenseCounts)[] = [
  'rocket_launcher',
  'light_laser',
  'heavy_laser',
  'gauss_cannon',
  'ion_cannon',
  'plasma_turret',
  'small_shield_dome',
  'large_shield_dome',
]

export const emptyDefenseCounts = (): DefenseCounts => ({
  rocket_launcher: 0,
  light_laser: 0,
  heavy_laser: 0,
  gauss_cannon: 0,
  ion_cannon: 0,
  plasma_turret: 0,
  small_shield_dome: 0,
  large_shield_dome: 0,
})

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format a snake_case key to a human-readable name
 * @example formatKeyName('light_fighter') => 'Light Fighter'
 */
export function formatKeyName(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Ship display names lookup
 */
export const SHIP_DISPLAY_NAMES: Record<keyof ShipCounts, string> = {
  light_fighter: 'Light Fighter',
  heavy_fighter: 'Heavy Fighter',
  cruiser: 'Cruiser',
  battleship: 'Battleship',
  battlecruiser: 'Battlecruiser',
  bomber: 'Bomber',
  destroyer: 'Destroyer',
  deathstar: 'Deathstar',
  small_cargo: 'Small Cargo',
  large_cargo: 'Large Cargo',
  colony_ship: 'Colony Ship',
  recycler: 'Recycler',
  espionage_probe: 'Espionage Probe',
  reaper: 'Reaper',
  pathfinder: 'Pathfinder',
}

// ============================================================================
// MISSION TYPE IDS
// ============================================================================

export const MissionTypeId = {
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
  // Exploration missions (Sprint 2)
  EXPLORATION_SCAN: 20,
  EXPLORATION_DEEP: 21,
  EXPLORATION_MAP: 22,
  DEPLOY_SATELLITE: 23,
} as const

export type MissionTypeIdValue = typeof MissionTypeId[keyof typeof MissionTypeId]

import type { MissionType } from '@/types/database'

export const MissionTypeMap: Record<MissionType, MissionTypeIdValue> = {
  attack: MissionTypeId.ATTACK,
  acs_attack: MissionTypeId.ACS_ATTACK,
  transport: MissionTypeId.TRANSPORT,
  deployment: MissionTypeId.DEPLOYMENT,
  acs_defend: MissionTypeId.ACS_DEFEND,
  espionage: MissionTypeId.ESPIONAGE,
  colonization: MissionTypeId.COLONIZATION,
  recycle: MissionTypeId.RECYCLE,
  moon_destruction: MissionTypeId.MOON_DESTRUCTION,
  expedition: MissionTypeId.EXPEDITION,
  // Exploration missions
  exploration_quick_scan: MissionTypeId.EXPLORATION_SCAN,
  exploration_deep_scan: MissionTypeId.EXPLORATION_DEEP,
  exploration_cartography: MissionTypeId.EXPLORATION_MAP,
  exploration_satellite_deploy: MissionTypeId.DEPLOY_SATELLITE,
}

// ============================================================================
// ESPIONAGE INFO LEVELS
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
