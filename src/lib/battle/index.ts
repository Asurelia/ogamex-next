/**
 * Battle Engine Module
 *
 * OGame-style combat simulation system.
 *
 * @example
 * ```typescript
 * import { BattleEngine, simulateBattle } from '@/lib/battle'
 *
 * // Using the BattleEngine class
 * const engine = new BattleEngine(
 *   { weaponsTech: 10, shieldTech: 10, armorTech: 10 },
 *   { weaponsTech: 8, shieldTech: 8, armorTech: 8 }
 * )
 *
 * const result = engine.simulate(
 *   { light_fighter: 100, cruiser: 20 },
 *   { light_fighter: 50 },
 *   { rocket_launcher: 100, light_laser: 50 },
 *   { metal: 1000000, crystal: 500000, deuterium: 200000 }
 * )
 *
 * // Or using the convenience function
 * const result = simulateBattle(
 *   { light_fighter: 100 },
 *   { weaponsTech: 10, shieldTech: 10, armorTech: 10 },
 *   { light_fighter: 50 },
 *   { rocket_launcher: 100 },
 *   { weaponsTech: 8, shieldTech: 8, armorTech: 8 },
 *   { metal: 500000, crystal: 250000, deuterium: 100000 }
 * )
 *
 * console.log(`Winner: ${result.winner}`)
 * console.log(`Debris: ${result.debris.metal} metal, ${result.debris.crystal} crystal`)
 * console.log(`Moon chance: ${result.moonChance}%`)
 * ```
 */

// Main engine
export { BattleEngine, simulateBattle } from './BattleEngine'

// Types
export type {
  UnitStats,
  UnitCost,
  CombatUnit,
  CombatFleet,
  FleetComposition,
  DefenseComposition,
  TechLevels,
  FleetSnapshot,
  CombatRound,
  ShipLosses,
  DefenseLosses,
  Resources,
  BattleResult,
  RapidFireTable,
  BattleOptions,
} from './types'

export { DEFAULT_BATTLE_OPTIONS, DEFENSE_KEYS } from './types'

// Constants
export {
  SHIP_STATS,
  SHIP_IDS,
  SHIP_COSTS,
  DEFENSE_STATS,
  DEFENSE_IDS,
  DEFENSE_COSTS,
  RAPID_FIRE,
  COMBAT_CONSTANTS,
  COMBAT_SHIP_KEYS,
  COMBAT_DEFENSE_KEYS,
} from './constants'

// Utilities
export {
  calculateEffectiveStats,
  calculateDamage,
  rollExplosion,
  generateDebris,
  calculateLoot,
  calculateCargoCapacity,
  rollRapidFire,
  createCombatUnitsFromFleet,
  createCombatUnitsFromDefense,
  createFleetSnapshot,
  calculateShipLosses,
  calculateDefenseLosses,
  calculateMoonChance,
  rollMoonCreation,
  determineWinner,
  regenerateShields,
} from './utils'

export type { DamageResult } from './utils'
