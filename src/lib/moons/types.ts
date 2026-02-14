/**
 * Moon System Types
 *
 * Types for the moon system including lunar buildings, phalanx scans,
 * and jump gate transfers.
 */

import type { ShipCounts } from '../missions/types'

// ============================================================================
// MOON INTERFACE
// ============================================================================

/**
 * Moon entity - stored in planets table with planet_type='moon'
 * Moons have no production, only storage and special buildings.
 */
export interface Moon {
  id: string
  planet_id: string  // Reference to the parent planet at same coordinates
  user_id: string
  name: string

  // Location (same as parent planet)
  galaxy: number
  system: number
  position: number

  // Physical properties
  diameter: number
  fields: number
  fields_used: number

  // Lunar-exclusive buildings
  lunar_base: number
  sensor_phalanx: number
  jump_gate: number

  // Storage buildings (can be built on moon)
  metal_storage: number
  crystal_storage: number
  deuterium_tank: number

  // Resources (no production, only storage)
  metal: number
  crystal: number
  deuterium: number

  // Ships stationed on moon
  ships: Partial<ShipCounts>

  // Jump gate cooldown
  jump_gate_cooldown: string | null

  // Timestamps
  created_at: string
  updated_at: string
}

// ============================================================================
// MOON CREATION RESULT
// ============================================================================

/**
 * Result of a moon creation attempt
 */
export interface MoonCreationResult {
  success: boolean
  moonCreated: boolean
  moonId?: string
  diameter?: number
  fields?: number
  chance: number
  error?: string
}

// ============================================================================
// PHALANX SCAN TYPES
// ============================================================================

/**
 * Fleet movement detected by phalanx scan
 */
export interface FleetMovement {
  missionId: string
  missionType: string

  // Origin
  originGalaxy: number
  originSystem: number
  originPosition: number
  originPlanetType: 'planet' | 'moon'

  // Destination
  destinationGalaxy: number
  destinationSystem: number
  destinationPosition: number
  destinationPlanetType: 'planet' | 'moon' | 'debris'

  // Ships
  ships: Partial<ShipCounts>

  // Timing
  departedAt: string
  arrivesAt: string
  returnsAt: string | null
  isReturning: boolean
}

/**
 * Result of a phalanx scan
 */
export interface PhalanxScanResult {
  success: boolean
  targetPlanetId: string
  targetCoordinates: string
  fleets: FleetMovement[]
  deuteriumCost: number
  error?: string
}

// ============================================================================
// JUMP GATE TYPES
// ============================================================================

/**
 * Jump gate transfer request
 */
export interface JumpGateTransferRequest {
  sourceMoonId: string
  targetMoonId: string
  ships: Partial<ShipCounts>
}

/**
 * Jump gate transfer result
 */
export interface JumpGateTransferResult {
  success: boolean
  sourceMoonId: string
  targetMoonId: string
  ships: Partial<ShipCounts>
  cooldownUntil: string
  error?: string
}

/**
 * Jump gate status
 */
export interface JumpGateStatus {
  moonId: string
  hasJumpGate: boolean
  level: number
  isOnCooldown: boolean
  cooldownUntil: string | null
  cooldownRemainingSeconds: number
}

// ============================================================================
// MOON DESTRUCTION TYPES
// ============================================================================

/**
 * Result of a moon destruction attempt (RIP attack)
 */
export interface MoonDestructionResult {
  success: boolean
  moonDestroyed: boolean
  ripsDestroyed: number
  ripsRemaining: number
  moonDestroyChance: number
  ripDestroyChance: number
  fleetSurvived: boolean
  error?: string
}

/**
 * Moon destruction chances calculation
 */
export interface MoonDestructionChances {
  moonDestroyChance: number
  ripDestroyChance: number
}

// ============================================================================
// LUNAR BUILDING TYPES
// ============================================================================

/**
 * Lunar building keys
 */
export type LunarBuildingKey =
  | 'lunar_base'
  | 'sensor_phalanx'
  | 'jump_gate'
  | 'metal_storage'
  | 'crystal_storage'
  | 'deuterium_tank'
  | 'robot_factory'
  | 'shipyard'

/**
 * All lunar building keys
 */
export const LUNAR_BUILDING_KEYS: LunarBuildingKey[] = [
  'lunar_base',
  'sensor_phalanx',
  'jump_gate',
  'metal_storage',
  'crystal_storage',
  'deuterium_tank',
  'robot_factory',
  'shipyard',
]

/**
 * Lunar-exclusive building keys (only available on moons)
 */
export const LUNAR_EXCLUSIVE_BUILDING_KEYS: LunarBuildingKey[] = [
  'lunar_base',
  'sensor_phalanx',
  'jump_gate',
]

/**
 * Buildings NOT available on moons
 */
export const PLANET_ONLY_BUILDINGS = [
  'metal_mine',
  'crystal_mine',
  'deuterium_synthesizer',
  'solar_plant',
  'fusion_plant',
  'research_lab',
  'terraformer',
  'alliance_depot',
  'missile_silo',
  'space_dock',
  'nanite_factory',
] as const
