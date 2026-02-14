/**
 * Mission System Types
 * TypeScript types for fleet mission processing
 */

import type { MissionType, PlanetType, FleetMission, Planet, UserResearch } from '@/types/database'

// ============================================================================
// MISSION ENUMS & CONSTANTS
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
} as const

export type MissionTypeIdValue = typeof MissionTypeId[keyof typeof MissionTypeId]

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
}

// ============================================================================
// RESOURCE TYPES
// ============================================================================

export interface Resources {
  metal: number
  crystal: number
  deuterium: number
}

export const emptyResources = (): Resources => ({
  metal: 0,
  crystal: 0,
  deuterium: 0,
})

export const sumResources = (res: Resources): number =>
  res.metal + res.crystal + res.deuterium

export const hasResources = (res: Resources): boolean =>
  res.metal > 0 || res.crystal > 0 || res.deuterium > 0

// ============================================================================
// SHIP TYPES
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

export const getTotalShips = (ships: ShipCounts): number =>
  SHIP_KEYS.reduce((sum, key) => sum + ships[key], 0)

// ============================================================================
// COORDINATE TYPES
// ============================================================================

export interface Coordinates {
  galaxy: number
  system: number
  position: number
}

export const formatCoordinates = (coords: Coordinates): string =>
  `[${coords.galaxy}:${coords.system}:${coords.position}]`

// ============================================================================
// MISSION CONTEXT
// ============================================================================

/**
 * Context passed to mission handlers with all necessary data
 */
export interface MissionContext {
  mission: FleetMission
  originPlanet: Planet | null
  targetPlanet: Planet | null
  attackerResearch: UserResearch | null
  defenderResearch: UserResearch | null
}

// ============================================================================
// MISSION RESULT TYPES
// ============================================================================

/**
 * Result of processing a mission arrival
 */
export interface MissionArrivalResult {
  success: boolean
  shouldReturn: boolean
  returnResources: Resources
  returnShips: ShipCounts
  messages: MissionMessage[]
  updates: MissionUpdate[]
  error?: string
}

/**
 * Result of processing a mission return
 */
export interface MissionReturnResult {
  success: boolean
  messages: MissionMessage[]
  updates: MissionUpdate[]
  error?: string
}

/**
 * Generic mission processing result
 */
export interface MissionProcessResult {
  success: boolean
  processedCount: number
  errors: MissionError[]
}

/**
 * Mission error for logging/reporting
 */
export interface MissionError {
  missionId: string
  missionType: MissionType
  error: string
  timestamp: string
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export type MessageRecipient = 'origin' | 'target' | 'both'

export interface MissionMessage {
  recipient: MessageRecipient
  userId: string
  type: 'transport' | 'battle' | 'espionage' | 'expedition' | 'system'
  subject: string
  body: string
}

// ============================================================================
// UPDATE TYPES
// ============================================================================

export type UpdateTarget = 'origin_planet' | 'target_planet' | 'debris_field' | 'mission'

export interface MissionUpdate {
  target: UpdateTarget
  targetId: string
  data: Record<string, unknown>
}

// ============================================================================
// MISSION HANDLER INTERFACE
// ============================================================================

/**
 * Interface that all mission handlers must implement
 */
export interface IMissionHandler {
  /** Mission type this handler processes */
  readonly missionType: MissionType

  /** Whether this mission type has a return trip */
  readonly hasReturn: boolean

  /** Display name for the mission */
  readonly name: string

  /**
   * Process mission arrival at destination
   */
  processArrival(context: MissionContext): Promise<MissionArrivalResult>

  /**
   * Process mission return to origin
   */
  processReturn(context: MissionContext): Promise<MissionReturnResult>
}

// ============================================================================
// MISSION PROCESSOR OPTIONS
// ============================================================================

export interface MissionProcessorOptions {
  /** Maximum missions to process in one batch */
  batchSize?: number

  /** Whether to continue on errors */
  continueOnError?: boolean

  /** Custom timestamp for testing */
  currentTime?: Date
}

export const DEFAULT_PROCESSOR_OPTIONS: Required<MissionProcessorOptions> = {
  batchSize: 100,
  continueOnError: true,
  currentTime: new Date(),
}

// ============================================================================
// BATTLE TYPES (for AttackMission)
// ============================================================================

export interface BattleUnit {
  shipKey: keyof ShipCounts
  amount: number
  structuralIntegrity: number
  shieldPower: number
  weaponPower: number
}

export interface BattleFleet {
  userId: string
  units: BattleUnit[]
  weaponTech: number
  shieldTech: number
  armorTech: number
}

export interface BattleRound {
  roundNumber: number
  attackerShips: ShipCounts
  defenderShips: ShipCounts
  attackerLosses: ShipCounts
  defenderLosses: ShipCounts
}

export interface BattleResult {
  winner: 'attacker' | 'defender' | 'draw'
  rounds: BattleRound[]
  attackerLosses: Resources
  defenderLosses: Resources
  loot: Resources
  debris: Resources
  moonChance: number
  moonCreated: boolean
}

// ============================================================================
// ESPIONAGE TYPES
// ============================================================================

export interface EspionageResult {
  success: boolean
  counterEspionageChance: number
  probesDestroyed: number
  detailLevel: number
  resources?: Resources
  buildings?: Record<string, number>
  research?: Record<string, number>
  ships?: ShipCounts
  defense?: Record<string, number>
}

// ============================================================================
// EXPEDITION TYPES
// ============================================================================

export type ExpeditionOutcome =
  | 'nothing'
  | 'resources'
  | 'dark_matter'
  | 'ship'
  | 'pirate_attack'
  | 'alien_attack'
  | 'delay'
  | 'early_return'
  | 'black_hole'

export interface ExpeditionResult {
  outcome: ExpeditionOutcome
  resources?: Resources
  darkMatter?: number
  ships?: Partial<ShipCounts>
  shipsLost?: Partial<ShipCounts>
  timeModifier?: number
}
