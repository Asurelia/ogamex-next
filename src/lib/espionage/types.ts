/**
 * Espionage System Types
 *
 * Re-exports from centralized types and adds espionage-specific constants.
 */

// Re-export InfoLevel from centralized types
export { InfoLevel } from '@/types/game-core'
import type { Resources, ShipCounts, DefenseCounts } from '@/types/game-core'

// Building and Research levels for espionage reports
export type BuildingLevels = Record<string, number>
export type ResearchLevels = Record<string, number>

// ============================================================================
// ESPIONAGE CONSTANTS
// ============================================================================

/**
 * Tech difference thresholds for revealing information
 */
export const INFO_LEVEL_THRESHOLDS = {
  RESOURCES: 0,   // Always visible
  FLEET: 1,       // +1 tech difference
  DEFENSE: 3,     // +3 tech difference
  BUILDINGS: 5,   // +5 tech difference
  RESEARCH: 7,    // +7 tech difference
} as const

/**
 * Base factor for counter-espionage chance calculation
 * Chance = (defTech - attTech) * probeCount * COUNTER_ESPIONAGE_BASE_FACTOR
 */
export const COUNTER_ESPIONAGE_BASE_FACTOR = 0.02

/**
 * Bonus info per additional probe sent
 */
export const PROBE_INFO_BONUS = 0.5

// ============================================================================
// ESPIONAGE REPORT TYPES
// ============================================================================

/**
 * Result of espionage counter-measures
 */
export interface CounterEspionageResult {
  /** Whether probes were detected */
  detected: boolean
  /** Number of probes destroyed by counter-espionage */
  probesDestroyed: number
  /** Detection chance that was rolled */
  detectionChance: number
}

/**
 * Full espionage report structure
 */
export interface EspionageReport {
  /** Target planet ID */
  targetPlanetId: string
  /** Target player ID */
  targetPlayerId: string
  /** Target player name */
  targetPlayerName: string
  /** Target coordinates */
  coordinates: {
    galaxy: number
    system: number
    position: number
  }
  /** Timestamp of the report */
  timestamp: string

  /** Resources on the planet (always visible) */
  resources: Resources

  /** Fleet stationed on the planet (if tech >= FLEET threshold) */
  fleet?: ShipCounts

  /** Defense structures (if tech >= DEFENSE threshold) */
  defense?: DefenseCounts

  /** Building levels (if tech >= BUILDINGS threshold) */
  buildings?: BuildingLevels

  /** Research levels (if tech >= RESEARCH threshold) */
  research?: ResearchLevels

  /** Counter-espionage result */
  counterEspionage: CounterEspionageResult

  /** Maximum info level achieved */
  infoLevel: number

  /** Number of probes that survived */
  survivingProbes: number
}

/**
 * Espionage mission parameters
 */
export interface EspionageMissionParams {
  /** Number of espionage probes to send */
  probeCount: number
  /** Attacker's espionage technology level */
  attackerEspionageTech: number
  /** Defender's espionage technology level */
  defenderEspionageTech: number
}
