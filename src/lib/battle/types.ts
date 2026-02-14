/**
 * Battle Engine Types
 *
 * Types for the OGame combat simulation system.
 * Based on classic OGame mechanics with rounds, rapid fire, and debris generation.
 */

import type { ShipCounts } from '../missions/types'

// ============================================================================
// UNIT TYPES
// ============================================================================

/**
 * Base combat stats for ships and defenses
 */
export interface UnitStats {
  /** Base attack power (weapon power) */
  attack: number
  /** Base shield points */
  shield: number
  /** Base hull points (structural integrity) */
  hull: number
}

/**
 * Unit cost for debris calculation
 */
export interface UnitCost {
  metal: number
  crystal: number
  deuterium: number
}

/**
 * A single combat unit (ship or defense) with effective stats
 */
export interface CombatUnit {
  /** Unique identifier for this unit instance */
  id: string
  /** Unit type key (e.g., 'light_fighter', 'rocket_launcher') */
  unitKey: string
  /** Unit ID from constants (e.g., 204 for light_fighter) */
  unitId: number
  /** Whether this is a ship or defense */
  type: 'ship' | 'defense'
  /** Effective attack power (with tech bonuses) */
  attack: number
  /** Maximum shield points (with tech bonuses) */
  maxShield: number
  /** Current shield points */
  currentShield: number
  /** Maximum hull points (with tech bonuses) */
  maxHull: number
  /** Current hull points */
  currentHull: number
  /** Whether this unit has been destroyed */
  destroyed: boolean
  /** Original cost for debris calculation */
  cost: UnitCost
}

/**
 * Collection of combat units for one side of battle
 */
export interface CombatFleet {
  /** User ID of the fleet owner */
  userId: string
  /** All combat units in the fleet */
  units: CombatUnit[]
  /** Weapons technology level */
  weaponsTech: number
  /** Shielding technology level */
  shieldTech: number
  /** Armor technology level */
  armorTech: number
}

// ============================================================================
// FLEET & DEFENSE COMPOSITION
// ============================================================================

/**
 * Ship composition for battle input
 */
export type FleetComposition = Partial<ShipCounts>

/**
 * Defense composition for battle input
 */
export interface DefenseComposition {
  rocket_launcher?: number
  light_laser?: number
  heavy_laser?: number
  gauss_cannon?: number
  ion_cannon?: number
  plasma_turret?: number
  small_shield_dome?: number
  large_shield_dome?: number
}

/**
 * All defense keys
 */
export const DEFENSE_KEYS: (keyof DefenseComposition)[] = [
  'rocket_launcher',
  'light_laser',
  'heavy_laser',
  'gauss_cannon',
  'ion_cannon',
  'plasma_turret',
  'small_shield_dome',
  'large_shield_dome',
]

// ============================================================================
// TECHNOLOGY LEVELS
// ============================================================================

/**
 * Combat-relevant technology levels
 */
export interface TechLevels {
  weaponsTech: number
  shieldTech: number
  armorTech: number
}

// ============================================================================
// COMBAT ROUND TYPES
// ============================================================================

/**
 * Snapshot of one side's units after a round
 */
export interface FleetSnapshot {
  /** Ships remaining (by key) */
  ships: Partial<ShipCounts>
  /** Defenses remaining (by key) */
  defense: Partial<DefenseComposition>
  /** Total attack power */
  totalAttack: number
  /** Total shield points */
  totalShield: number
  /** Total hull points */
  totalHull: number
  /** Number of units */
  unitCount: number
}

/**
 * State of the battle after each round
 */
export interface CombatRound {
  /** Round number (1-6) */
  roundNumber: number
  /** Attacker state after this round */
  attacker: FleetSnapshot
  /** Defender state after this round */
  defender: FleetSnapshot
  /** Attacker shots fired this round */
  attackerShots: number
  /** Defender shots fired this round */
  defenderShots: number
  /** Total damage dealt by attacker */
  attackerDamage: number
  /** Total damage dealt by defender */
  defenderDamage: number
  /** Units destroyed this round (attacker side) */
  attackerUnitsLost: number
  /** Units destroyed this round (defender side) */
  defenderUnitsLost: number
}

// ============================================================================
// LOSSES TRACKING
// ============================================================================

/**
 * Detailed loss tracking for ships
 */
export interface ShipLosses {
  ships: Partial<ShipCounts>
  metalValue: number
  crystalValue: number
  deuteriumValue: number
}

/**
 * Detailed loss tracking for defenses
 */
export interface DefenseLosses {
  defense: Partial<DefenseComposition>
  metalValue: number
  crystalValue: number
  deuteriumValue: number
}

// ============================================================================
// RESOURCES
// ============================================================================

/**
 * Resources type for debris and loot
 */
export interface Resources {
  metal: number
  crystal: number
  deuterium: number
}

// ============================================================================
// BATTLE RESULT
// ============================================================================

/**
 * Final battle result with all relevant information
 */
export interface BattleResult {
  /** Winner of the battle */
  winner: 'attacker' | 'defender' | 'draw'

  /** All combat rounds */
  rounds: CombatRound[]

  /** Attacker's remaining fleet */
  attackerRemaining: {
    ships: Partial<ShipCounts>
  }

  /** Defender's remaining units */
  defenderRemaining: {
    ships: Partial<ShipCounts>
    defense: Partial<DefenseComposition>
  }

  /** Attacker's losses */
  attackerLosses: ShipLosses

  /** Defender's losses (ships + defense) */
  defenderLosses: {
    ships: ShipLosses
    defense: DefenseLosses
    totalMetalValue: number
    totalCrystalValue: number
    totalDeuteriumValue: number
  }

  /** Debris field generated (30% of metal + crystal from ships only) */
  debris: {
    metal: number
    crystal: number
  }

  /** Resources looted (if attacker wins) */
  loot: Resources

  /** Moon creation chance (max 20%) */
  moonChance: number

  /** Whether a moon was created */
  moonCreated: boolean

  /** Battle duration in rounds */
  totalRounds: number
}

// ============================================================================
// RAPID FIRE TABLE
// ============================================================================

/**
 * Rapid fire entry: attacker -> target -> number of extra shots
 */
export type RapidFireTable = Record<string, Record<string, number>>

// ============================================================================
// BATTLE ENGINE OPTIONS
// ============================================================================

/**
 * Options for battle simulation
 */
export interface BattleOptions {
  /** Maximum number of rounds (default: 6) */
  maxRounds?: number
  /** Debris percentage (default: 0.3 = 30%) */
  debrisPercentage?: number
  /** Moon creation chance per 100k debris (default: 1) */
  moonChancePerDebris?: number
  /** Max moon chance (default: 20) */
  maxMoonChance?: number
  /** Custom random function for testing */
  randomFn?: () => number
}

/**
 * Default battle options
 */
export const DEFAULT_BATTLE_OPTIONS: Required<BattleOptions> = {
  maxRounds: 6,
  debrisPercentage: 0.3,
  moonChancePerDebris: 1, // 1% per 100k debris
  maxMoonChance: 20,
  randomFn: Math.random,
}
