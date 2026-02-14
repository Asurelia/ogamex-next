/**
 * Mission System - Main exports
 *
 * This module provides the fleet mission processing system for OGameX.
 *
 * Usage:
 * ```typescript
 * import { createMissionProcessor } from '@/lib/missions'
 *
 * const processor = createMissionProcessor(supabaseClient)
 * const result = await processor.processPendingMissions()
 * ```
 */

// Main processor
export { MissionProcessor, createMissionProcessor } from './MissionProcessor'

// Base class for creating new handlers
export { BaseMission } from './BaseMission'

// Types
export type {
  // Core types
  Resources,
  ShipCounts,
  Coordinates,
  MissionContext,

  // Result types
  MissionArrivalResult,
  MissionReturnResult,
  MissionProcessResult,
  MissionError,

  // Message types
  MissionMessage,
  MessageRecipient,

  // Update types
  MissionUpdate,
  UpdateTarget,

  // Handler interface
  IMissionHandler,

  // Options
  MissionProcessorOptions,

  // Battle types (for future BattleEngine)
  BattleUnit,
  BattleFleet,
  BattleRound,
  BattleResult,

  // Other types
  EspionageResult,
  ExpeditionResult,
  ExpeditionOutcome,
} from './types'

// Helper functions
export {
  emptyResources,
  emptyShipCounts,
  sumResources,
  hasResources,
  getTotalShips,
  formatCoordinates,
  SHIP_KEYS,
  MissionTypeId,
  MissionTypeMap,
} from './types'

// Mission handlers (for direct use if needed)
export { TransportMission } from './handlers/TransportMission'
export { DeploymentMission } from './handlers/DeploymentMission'
export { AttackMission } from './handlers/AttackMission'
export { ColonizationMission } from './handlers/ColonizationMission'
export { EspionageMission } from './handlers/EspionageMission'
export { RecycleMission } from './handlers/RecycleMission'
export { ExpeditionMission } from './handlers/ExpeditionMission'
export { MoonDestructionMission } from './handlers/MoonDestructionMission'
