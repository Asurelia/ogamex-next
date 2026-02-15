/**
 * Battle Engine Module
 *
 * OGame-style combat simulation system with database-driven configuration.
 *
 * Supports two battle engines:
 * - **BattleEngine**: Classic OGame mechanics (single damage type)
 * - **AdvancedBattleEngine**: Multi-damage types (ballistic, ionic, explosive, hacking, boarding)
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
 *
 * // ADVANCED BATTLE ENGINE (multi-damage types)
 * import { simulateAdvancedBattle, AdvancedBattleEngine } from '@/lib/battle'
 *
 * const advResult = await simulateAdvancedBattle(
 *   { cruiser: 50, battleship: 20 },
 *   { weaponsTech: 12, shieldTech: 10, armorTech: 11, ionicTech: 5, hackingTech: 3 },
 *   { heavy_fighter: 100 },
 *   { plasma_turret: 10, ion_cannon: 20 },
 *   { weaponsTech: 10, shieldTech: 10, armorTech: 10 },
 *   { metal: 2000000, crystal: 1000000, deuterium: 500000 }
 * )
 *
 * console.log(`Ballistic damage dealt: ${advResult.statistics.totalDamageDealt.ballistic}`)
 * console.log(`Ionic damage dealt: ${advResult.statistics.totalDamageDealt.ionic}`)
 * console.log(`Critical hits: ${advResult.statistics.criticalHits}`)
 * console.log(`Timeline events: ${advResult.timeline.length}`)
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

// ============================================================================
// ADVANCED BATTLE ENGINE (Multi-Damage Types)
// ============================================================================

// Advanced engine
export {
  AdvancedBattleEngine,
  simulateAdvancedBattle,
} from './AdvancedBattleEngine'
export type {
  AdvancedBattleOptions,
  AdvancedBattleResult,
  AdvancedRoundStats,
  BattleTimelineEvent,
} from './AdvancedBattleEngine'

// Damage types system
export {
  EMPTY_DAMAGE,
  EMPTY_RESISTANCES,
  DEFAULT_COMBAT_STATS,
  DAMAGE_TYPE_KEYS,
  RESISTANCE_TYPE_KEYS,
  DAMAGE_EFFECTIVENESS,
  createDamageTypes,
  createResistanceTypes,
  getTotalDamage,
  scaleDamage,
  applyResistances,
  hasStatusEffect,
  getStatusEffectStrength,
  tickStatusEffects,
  mergeDamage,
} from './damage-types'
export type {
  DamageTypes,
  ResistanceTypes,
  StatusEffect,
  StatusEffectType,
  HackableSystem,
  AdvancedCombatStats,
  AdvancedDamageResult,
  DamageEvent,
  DamageEventType,
} from './damage-types'

// Advanced unit system
export {
  createDefenseLayers,
  createAdvancedCombatUnit,
  canAttack,
  canBeTargeted,
  getTotalHP,
  getMaxHP,
  getHPPercent,
  shouldExplode,
  regenerateUnitShields,
  applyDamageToUnit,
  tickUnitStatusEffects,
  UNIT_CLASS_MAP,
  getUnitClass,
} from './advanced-unit'
export type {
  UnitCategory,
  UnitClass,
  DefenseLayers,
  AdvancedCombatUnit,
  AdvancedUnitBaseStats,
  AdvancedTechLevels,
} from './advanced-unit'

// Advanced damage calculator
export {
  calculateAdvancedDamage,
  simplifyDamageResult,
  convertLegacyDamage,
} from './damage-calculator'

// Advanced configuration
export {
  getAdvancedBattleConfig,
  initAdvancedBattleConfig,
  getAdvancedBattleConfigSync,
  clearAdvancedBattleConfigCache,
  getAdvancedShipStats,
  getAdvancedDefenseStats,
  getAdvancedShipKeys,
  getAdvancedDefenseKeys,
  getAdvancedRapidFire,
} from './advanced-config'
export type {
  AdvancedShipStats,
  AdvancedDefenseStats,
  AdvancedBattleConfig,
} from './advanced-config'

// ============================================================================
// BOARDING SYSTEM
// ============================================================================

export {
  BoardingEngine,
  createCrewUnit,
  createBoardingParty,
  createShipDefenses,
  CREW_BASE_STATS,
  BOARDING_CONSTANTS,
} from './boarding-system'
export type {
  BoardingPhase,
  BoardingOutcome,
  CrewUnit,
  CrewType,
  CrewAbility,
  BoardingParty,
  BreachEquipment,
  ShipDefenses,
  Countermeasure,
  BoardingEvent,
  BoardingEventType,
  BoardingResult,
  SabotageEffect,
  SabotageTarget,
} from './boarding-system'
