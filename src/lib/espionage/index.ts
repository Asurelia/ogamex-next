/**
 * Espionage System - Main Exports
 *
 * This module provides the espionage system for OGameX.
 * Handles spy probes, intelligence gathering, and counter-espionage.
 *
 * Usage:
 * ```typescript
 * import { InfoLevel, EspionageReport, PROBE_STATS } from '@/lib/espionage'
 * ```
 */

// Types
export {
  InfoLevel,
  type EspionageReport,
  type CounterEspionageResult,
  type EspionageCalcParams,
  type TargetResources,
  type TargetFleet,
  type TargetDefense,
  type TargetBuildings,
  type TargetResearch,
} from './types'

// Constants
export {
  PROBE_STATS,
  INFO_LEVEL_THRESHOLDS,
  COUNTER_ESPIONAGE_BASE_FACTOR,
  PROBE_INFO_BONUS,
} from './types'
