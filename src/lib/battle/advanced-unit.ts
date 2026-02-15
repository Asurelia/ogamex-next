/**
 * Advanced Combat Unit System
 *
 * Extended unit system with multi-layer defenses and advanced stats.
 */

import type {
  DamageTypes,
  ResistanceTypes,
  StatusEffect,
  AdvancedCombatStats,
} from './damage-types'
import {
  EMPTY_DAMAGE,
  EMPTY_RESISTANCES,
  DEFAULT_COMBAT_STATS,
} from './damage-types'

// ============================================================================
// UNIT TYPES
// ============================================================================

/**
 * Unit category
 */
export type UnitCategory = 'military' | 'civil' | 'special'

/**
 * Unit class (more specific than type)
 */
export type UnitClass =
  | 'fighter'        // Small, fast combat ships
  | 'corvette'       // Light combat ships
  | 'frigate'        // Medium combat ships
  | 'cruiser'        // Heavy combat ships
  | 'battlecruiser'  // Battle cruisers
  | 'battleship'     // Capital ships
  | 'carrier'        // Fighter carriers
  | 'dreadnought'    // Super-heavy capital ships
  | 'transport'      // Cargo ships
  | 'utility'        // Support/utility ships
  | 'defense'        // Planetary defenses
  | 'missile'        // Missile platforms
  | 'platform'       // Defense platforms
  | 'turret'         // Defense turrets

// ============================================================================
// DEFENSE LAYERS
// ============================================================================

/**
 * Multi-layer defense system
 */
export interface DefenseLayers {
  /** Energy shields - regenerate between rounds */
  shield: {
    current: number
    max: number
    regenRate: number  // % regenerated per round
  }
  /** Physical armor - does not regenerate */
  armor: {
    current: number
    max: number
  }
  /** Structural hull - main HP pool */
  hull: {
    current: number
    max: number
  }
}

/**
 * Create default defense layers
 */
export function createDefenseLayers(
  shield: number,
  armor: number,
  hull: number,
  shieldRegenRate = 100 // 100% regen by default (classic OGame)
): DefenseLayers {
  return {
    shield: { current: shield, max: shield, regenRate: shieldRegenRate },
    armor: { current: armor, max: armor },
    hull: { current: hull, max: hull },
  }
}

// ============================================================================
// ADVANCED COMBAT UNIT
// ============================================================================

/**
 * Advanced combat unit with full stats
 */
export interface AdvancedCombatUnit {
  /** Unique instance ID */
  id: string
  /** Unit type key (e.g., 'light_fighter') */
  unitKey: string
  /** Unit numeric ID from database */
  unitId: number
  /** Unit type */
  type: 'ship' | 'defense'
  /** Unit category */
  category: UnitCategory
  /** Unit class */
  unitClass: UnitClass
  /** Owner identifier */
  ownerId: string

  // === DEFENSE LAYERS ===
  /** Multi-layer defense system */
  defense: DefenseLayers

  // === DAMAGE OUTPUT ===
  /** Damage by type */
  damage: DamageTypes
  /** Base weapon power (legacy compatibility) */
  weaponPower: number

  // === RESISTANCES ===
  /** Resistance to each damage type */
  resistances: ResistanceTypes

  // === COMBAT STATS ===
  /** Advanced combat statistics */
  stats: AdvancedCombatStats

  // === CREW ===
  /** Crew for boarding mechanics */
  crew: {
    current: number
    max: number
    combatStrength: number  // Per-crew combat effectiveness
  }

  // === STATUS ===
  /** Whether unit is destroyed */
  destroyed: boolean
  /** Whether unit is disabled (but not destroyed) */
  disabled: boolean
  /** Active status effects */
  statusEffects: StatusEffect[]

  // === COST (for debris calculation) ===
  cost: {
    metal: number
    crystal: number
    deuterium: number
  }

  // === RAPID FIRE (legacy compatibility) ===
  rapidFire: Record<string, number>
}

// ============================================================================
// UNIT CREATION
// ============================================================================

/**
 * Base stats for creating an advanced combat unit
 */
export interface AdvancedUnitBaseStats {
  unitKey: string
  unitId: number
  type: 'ship' | 'defense'
  category: UnitCategory
  unitClass: UnitClass

  // Defense
  shieldPower: number
  armorValue: number
  structuralIntegrity: number
  shieldRegenRate?: number

  // Offense
  damage: Partial<DamageTypes>
  weaponPower: number  // Legacy total weapon power

  // Resistances
  resistances?: Partial<ResistanceTypes>

  // Combat stats
  stats?: Partial<AdvancedCombatStats>

  // Crew
  crewCapacity?: number
  crewCombatStrength?: number

  // Cost
  cost: {
    metal: number
    crystal: number
    deuterium: number
  }

  // Rapid fire
  rapidFire?: Record<string, number>
}

/**
 * Technology levels for stat bonuses
 */
export interface AdvancedTechLevels {
  weaponsTech: number
  shieldTech: number
  armorTech: number
  // New tech types
  ionicTech?: number
  hackingTech?: number
  boardingTech?: number
}

let advancedUnitIdCounter = 0

/**
 * Create an advanced combat unit from base stats
 */
export function createAdvancedCombatUnit(
  baseStats: AdvancedUnitBaseStats,
  tech: AdvancedTechLevels,
  ownerId: string
): AdvancedCombatUnit {
  // Apply tech bonuses
  const weaponsMultiplier = 1 + tech.weaponsTech * 0.1
  const shieldMultiplier = 1 + tech.shieldTech * 0.1
  const armorMultiplier = 1 + tech.armorTech * 0.1
  const ionicMultiplier = 1 + (tech.ionicTech ?? 0) * 0.1
  const hackingMultiplier = 1 + (tech.hackingTech ?? 0) * 0.1

  // Calculate effective damage
  const baseDamage = { ...EMPTY_DAMAGE, ...baseStats.damage }
  const effectiveDamage: DamageTypes = {
    ballistic: Math.floor(baseDamage.ballistic * weaponsMultiplier),
    ionic: Math.floor(baseDamage.ionic * ionicMultiplier),
    explosive: Math.floor(baseDamage.explosive * weaponsMultiplier),
    hacking: Math.floor(baseDamage.hacking * hackingMultiplier),
    boarding: baseDamage.boarding,
  }

  // Calculate effective defenses
  const effectiveShield = Math.floor(baseStats.shieldPower * shieldMultiplier)
  const effectiveArmor = Math.floor(baseStats.armorValue * armorMultiplier)
  const effectiveHull = Math.floor(baseStats.structuralIntegrity * armorMultiplier)

  return {
    id: `adv_${baseStats.type}_${advancedUnitIdCounter++}`,
    unitKey: baseStats.unitKey,
    unitId: baseStats.unitId,
    type: baseStats.type,
    category: baseStats.category,
    unitClass: baseStats.unitClass,
    ownerId,

    defense: createDefenseLayers(
      effectiveShield,
      effectiveArmor,
      effectiveHull,
      baseStats.shieldRegenRate ?? 100
    ),

    damage: effectiveDamage,
    weaponPower: Math.floor(baseStats.weaponPower * weaponsMultiplier),

    resistances: { ...EMPTY_RESISTANCES, ...baseStats.resistances },

    stats: { ...DEFAULT_COMBAT_STATS, ...baseStats.stats },

    crew: {
      current: baseStats.crewCapacity ?? 0,
      max: baseStats.crewCapacity ?? 0,
      combatStrength: baseStats.crewCombatStrength ?? 1,
    },

    destroyed: false,
    disabled: false,
    statusEffects: [],

    cost: baseStats.cost,
    rapidFire: baseStats.rapidFire ?? {},
  }
}

// ============================================================================
// UNIT STATE HELPERS
// ============================================================================

/**
 * Check if unit can attack
 */
export function canAttack(unit: AdvancedCombatUnit): boolean {
  if (unit.destroyed || unit.disabled) return false

  // Check for disabling status effects
  const hasWeaponsDisabled = unit.statusEffects.some(
    e => e.type === 'weapons_disabled' && e.duration > 0
  )
  const hasEmpStunned = unit.statusEffects.some(
    e => e.type === 'emp_stunned' && e.duration > 0
  )

  return !hasWeaponsDisabled && !hasEmpStunned
}

/**
 * Check if unit can be targeted
 */
export function canBeTargeted(unit: AdvancedCombatUnit): boolean {
  return !unit.destroyed
}

/**
 * Get total remaining HP (all layers)
 */
export function getTotalHP(unit: AdvancedCombatUnit): number {
  return (
    unit.defense.shield.current +
    unit.defense.armor.current +
    unit.defense.hull.current
  )
}

/**
 * Get total max HP (all layers)
 */
export function getMaxHP(unit: AdvancedCombatUnit): number {
  return (
    unit.defense.shield.max +
    unit.defense.armor.max +
    unit.defense.hull.max
  )
}

/**
 * Get HP percentage
 */
export function getHPPercent(unit: AdvancedCombatUnit): number {
  const max = getMaxHP(unit)
  if (max === 0) return 0
  return (getTotalHP(unit) / max) * 100
}

/**
 * Check if unit should explode (hull below threshold)
 */
export function shouldExplode(
  unit: AdvancedCombatUnit,
  threshold = 0.7,
  randomFn: () => number = Math.random
): boolean {
  if (unit.defense.hull.current <= 0) return true

  const hullPercent = unit.defense.hull.current / unit.defense.hull.max
  if (hullPercent >= threshold) return false

  // Explosion chance = 1 - hullPercent
  const explosionChance = 1 - hullPercent
  return randomFn() < explosionChance
}

/**
 * Regenerate shields between rounds
 */
export function regenerateUnitShields(unit: AdvancedCombatUnit): void {
  if (unit.destroyed) return

  const regenAmount = Math.floor(
    unit.defense.shield.max * (unit.defense.shield.regenRate / 100)
  )
  unit.defense.shield.current = Math.min(
    unit.defense.shield.max,
    unit.defense.shield.current + regenAmount
  )
}

/**
 * Apply damage to unit's defense layers
 * Returns actual damage dealt to each layer
 */
export function applyDamageToUnit(
  unit: AdvancedCombatUnit,
  shieldDamage: number,
  armorDamage: number,
  hullDamage: number
): { shield: number; armor: number; hull: number } {
  // Apply to shields first
  const actualShieldDamage = Math.min(unit.defense.shield.current, shieldDamage)
  unit.defense.shield.current -= actualShieldDamage
  let remainingFromShield = shieldDamage - actualShieldDamage

  // Shield overflow goes to armor
  const totalArmorDamage = armorDamage + remainingFromShield
  const actualArmorDamage = Math.min(unit.defense.armor.current, totalArmorDamage)
  unit.defense.armor.current -= actualArmorDamage
  let remainingFromArmor = totalArmorDamage - actualArmorDamage

  // Armor overflow goes to hull
  const totalHullDamage = hullDamage + remainingFromArmor
  const actualHullDamage = Math.min(unit.defense.hull.current, totalHullDamage)
  unit.defense.hull.current -= actualHullDamage

  // Check for destruction
  if (unit.defense.hull.current <= 0) {
    unit.destroyed = true
  }

  return {
    shield: actualShieldDamage,
    armor: actualArmorDamage,
    hull: actualHullDamage,
  }
}

/**
 * Tick unit status effects (reduce duration, remove expired)
 */
export function tickUnitStatusEffects(unit: AdvancedCombatUnit): void {
  unit.statusEffects = unit.statusEffects
    .map(e => ({ ...e, duration: e.duration - 1 }))
    .filter(e => e.duration > 0)

  // Check if disabled effects expired
  if (unit.disabled) {
    const stillDisabled = unit.statusEffects.some(
      e =>
        (e.type === 'emp_stunned' || e.type === 'system_hacked') &&
        e.duration > 0
    )
    if (!stillDisabled) {
      unit.disabled = false
    }
  }
}

// ============================================================================
// UNIT CLASS MAPPINGS
// ============================================================================

/**
 * Map unit keys to their classes
 */
export const UNIT_CLASS_MAP: Record<string, UnitClass> = {
  // Fighters
  light_fighter: 'fighter',
  heavy_fighter: 'fighter',

  // Combat ships
  cruiser: 'cruiser',
  battleship: 'battleship',
  battlecruiser: 'cruiser',
  bomber: 'frigate',
  destroyer: 'battleship',
  deathstar: 'dreadnought',
  reaper: 'battleship',
  pathfinder: 'corvette',

  // Utility
  small_cargo: 'transport',
  large_cargo: 'transport',
  colony_ship: 'utility',
  recycler: 'utility',
  espionage_probe: 'utility',
  solar_satellite: 'utility',
  crawler: 'utility',

  // Defenses
  rocket_launcher: 'defense',
  light_laser: 'defense',
  heavy_laser: 'defense',
  gauss_cannon: 'defense',
  ion_cannon: 'defense',
  plasma_turret: 'defense',
  small_shield_dome: 'defense',
  large_shield_dome: 'defense',
}

/**
 * Get unit class from unit key
 */
export function getUnitClass(unitKey: string): UnitClass {
  return UNIT_CLASS_MAP[unitKey] ?? 'utility'
}
