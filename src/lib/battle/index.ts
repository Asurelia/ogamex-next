/**
 * Battle Engine Module
 *
 * OGame-style combat simulation system with database-driven configuration.
 *
 * @example
 * ```typescript
 * import { simulateBattleAsync, BattleEngine } from '@/lib/battle'
 *
 * // Recommended: Use async simulation (automatically loads config)
 * const result = await simulateBattleAsync(
 *   { light_fighter: 100, cruiser: 20 },
 *   { weaponsTech: 10, shieldTech: 10, armorTech: 10 },
 *   { light_fighter: 50 },
 *   { rocket_launcher: 100, light_laser: 50 },
 *   { weaponsTech: 8, shieldTech: 8, armorTech: 8 },
 *   { metal: 1000000, crystal: 500000, deuterium: 200000 }
 * )
 *
 * // Or use BattleEngine.create() for multiple simulations
 * const engine = await BattleEngine.create(
 *   { weaponsTech: 10, shieldTech: 10, armorTech: 10 },
 *   { weaponsTech: 8, shieldTech: 8, armorTech: 8 }
 * )
 * const result = engine.simulate(attackerFleet, defenderFleet, defenderDefense, defenderResources)
 *
 * console.log(`Winner: ${result.winner}`)
 * console.log(`Debris: ${result.debris.metal} metal, ${result.debris.crystal} crystal`)
 * console.log(`Moon chance: ${result.moonChance}%`)
 * ```
 */

// Main engine
export {
  BattleEngine,
  simulateBattleAsync,
  simulateBattle,
  initBattleConfig,
  clearBattleConfigCache,
} from './BattleEngine'
export { ACSBattleEngine, createACSBattleEngine } from './ACSBattleEngine'
export type {
  ACSParticipantFleet,
  ACSDefender,
  ACSParticipantResult,
  ACSBattleEngineResult,
} from './ACSBattleEngine'

// Battle configuration (database-driven)
export {
  getBattleConfig,
  getBattleConfigSync,
  getShipStats,
  getDefenseStats,
  getShipCost,
  getDefenseCost,
  getShipId,
  getDefenseId,
  getRapidFire,
  getShipCargoCapacity,
  getCombatShipKeys,
  getCombatDefenseKeys,
} from './battle-config'
export type { BattleConfig } from './battle-config'

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

// Constants (combat mechanics only - data is in battle-config)
export { COMBAT_CONSTANTS } from './constants'

// Deprecated constants (empty, for backward compatibility)
export {
  SHIP_STATS,
  SHIP_IDS,
  SHIP_COSTS,
  DEFENSE_STATS,
  DEFENSE_IDS,
  DEFENSE_COSTS,
  RAPID_FIRE,
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
