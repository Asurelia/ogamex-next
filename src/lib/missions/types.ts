/**
 * Mission System Types
 * TypeScript types for fleet mission processing
 * 
 * Core types (Resources, ShipCounts, Coordinates) are re-exported from
 * the centralized @/types/game-core module.
 */

import type { MissionType, PlanetType, FleetMission, Planet, UserResearch } from '@/types/database'

// Re-export core types from centralized source for backward compatibility
export {
  type Resources,
  emptyResources,
  sumResources,
  hasResources,
  type ShipCounts,
  SHIP_KEYS,
  emptyShipCounts,
  getTotalShips,
  type DefenseCounts,
  DEFENSE_KEYS,
  emptyDefenseCounts,
  type Coordinates,
  formatCoordinates,
  formatCoordinatesObj,
  MissionTypeId,
  MissionTypeMap,
  type MissionTypeIdValue,
} from '@/types/game-core'

import { MissionTypeId, type MissionTypeIdValue } from '@/types/game-core'
import type { Resources, ShipCounts, Coordinates } from '@/types/game-core'

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
