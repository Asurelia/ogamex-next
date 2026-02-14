/**
 * Battle Engine Constants
 *
 * Combat mechanic constants only.
 * For unit stats, costs, and rapid fire data, use battle-config.ts
 * which loads from the database.
 *
 * @see battle-config.ts for ship/defense stats and rapid fire
 */

import type { UnitStats, UnitCost, RapidFireTable } from './types'

// ============================================================================
// COMBAT CONSTANTS (game mechanics, not data)
// ============================================================================

/**
 * Combat mechanic constants
 */
export const COMBAT_CONSTANTS = {
  /** Maximum number of combat rounds */
  MAX_ROUNDS: 6,

  /** Minimum damage percentage to penetrate shields (1%) */
  MIN_DAMAGE_PERCENT: 0.01,

  /** Hull damage threshold for explosion chance (70%) */
  EXPLOSION_THRESHOLD: 0.7,

  /** Debris percentage from destroyed ships (30%) */
  DEBRIS_PERCENTAGE: 0.3,

  /** Moon chance per 100k debris (1%) */
  MOON_CHANCE_PER_100K: 1,

  /** Maximum moon chance (20%) */
  MAX_MOON_CHANCE: 20,

  /** Defense rebuild chance (70% chance to survive) */
  DEFENSE_REBUILD_CHANCE: 0.7,
}

// ============================================================================
// DEPRECATED EXPORTS
// These are kept for backward compatibility during migration.
// Use getBattleConfig() from battle-config.ts instead.
// ============================================================================

/**
 * @deprecated Use getBattleConfig() from battle-config.ts instead
 */
export const SHIP_STATS: Record<string, UnitStats> = {}

/**
 * @deprecated Use getBattleConfig() from battle-config.ts instead
 */
export const DEFENSE_STATS: Record<string, UnitStats> = {}

/**
 * @deprecated Use getBattleConfig() from battle-config.ts instead
 */
export const SHIP_IDS: Record<string, number> = {}

/**
 * @deprecated Use getBattleConfig() from battle-config.ts instead
 */
export const DEFENSE_IDS: Record<string, number> = {}

/**
 * @deprecated Use getBattleConfig() from battle-config.ts instead
 */
export const SHIP_COSTS: Record<string, UnitCost> = {}

/**
 * @deprecated Use getBattleConfig() from battle-config.ts instead
 */
export const DEFENSE_COSTS: Record<string, UnitCost> = {}

/**
 * @deprecated Use getBattleConfig() from battle-config.ts instead
 */
export const RAPID_FIRE: RapidFireTable = {}

/**
 * @deprecated Use getCombatShipKeys() from battle-config.ts instead
 */
export const COMBAT_SHIP_KEYS: string[] = []

/**
 * @deprecated Use getCombatDefenseKeys() from battle-config.ts instead
 */
export const COMBAT_DEFENSE_KEYS: string[] = []
