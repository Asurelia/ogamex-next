/**
 * Moon System Module
 *
 * Exports all moon-related types, constants, and services.
 */

// Types
export type {
  Moon,
  MoonCreationResult,
  FleetMovement,
  PhalanxScanResult,
  JumpGateTransferRequest,
  JumpGateTransferResult,
  JumpGateStatus,
  MoonDestructionResult,
  MoonDestructionChances,
  LunarBuildingKey,
} from './types'

export {
  LUNAR_BUILDING_KEYS,
  LUNAR_EXCLUSIVE_BUILDING_KEYS,
  PLANET_ONLY_BUILDINGS,
} from './types'

// Constants
export {
  MOON_CREATION,
  LUNAR_BASE,
  SENSOR_PHALANX,
  JUMP_GATE,
  LUNAR_BUILDINGS,
  MOON_DESTRUCTION,
  PHALANX,
  JUMP_GATE_CONFIG,
  calculateMoonDiameter,
  calculateMoonFields,
  calculateMoonChance,
  calculatePhalanxRange,
  isInPhalanxRange,
  calculateLunarBaseFieldsBonus,
  calculateTotalMoonFields,
} from './constants'

// Service
export { MoonService, createMoonService } from './MoonService'
