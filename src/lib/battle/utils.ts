/**
 * Battle Engine Utilities
 *
 * Helper functions for combat calculations including:
 * - Effective stats with technology bonuses
 * - Damage calculation with shield absorption
 * - Explosion probability
 * - Debris generation
 */

import type {
  UnitStats,
  TechLevels,
  CombatUnit,
  UnitCost,
  FleetComposition,
  DefenseComposition,
  Resources,
  FleetSnapshot,
  ShipLosses,
  DefenseLosses,
} from './types'
import {
  SHIP_STATS,
  DEFENSE_STATS,
  SHIP_COSTS,
  DEFENSE_COSTS,
  SHIP_IDS,
  DEFENSE_IDS,
  RAPID_FIRE,
  COMBAT_CONSTANTS,
} from './constants'
import type { ShipCounts } from '../missions/types'

// ============================================================================
// EFFECTIVE STATS CALCULATION
// ============================================================================

/**
 * Calculate effective combat stats with technology bonuses
 *
 * @param baseStats - Base unit stats (attack, shield, hull)
 * @param tech - Technology levels
 * @returns Effective stats with tech bonuses applied
 */
export function calculateEffectiveStats(
  baseStats: UnitStats,
  tech: TechLevels
): UnitStats {
  // Each tech level gives 10% bonus
  const weaponsMultiplier = 1 + tech.weaponsTech * 0.1
  const shieldMultiplier = 1 + tech.shieldTech * 0.1
  const armorMultiplier = 1 + tech.armorTech * 0.1

  return {
    attack: Math.floor(baseStats.attack * weaponsMultiplier),
    shield: Math.floor(baseStats.shield * shieldMultiplier),
    hull: Math.floor(baseStats.hull * armorMultiplier),
  }
}

// ============================================================================
// DAMAGE CALCULATION
// ============================================================================

/**
 * Result of damage calculation
 */
export interface DamageResult {
  /** Damage absorbed by shield */
  shieldDamage: number
  /** Damage to hull */
  hullDamage: number
  /** Whether the shot bounced (< 1% of shield) */
  bounced: boolean
}

/**
 * Calculate damage dealt to a defender
 *
 * OGame combat rules:
 * 1. If damage < 1% of shield, shot bounces (no damage)
 * 2. Shield absorbs damage up to its current value
 * 3. Remaining damage goes to hull
 *
 * @param attackerDamage - Attack power of the attacker
 * @param defenderShield - Current shield of defender
 * @returns Damage result
 */
export function calculateDamage(
  attackerDamage: number,
  defenderShield: number
): DamageResult {
  // Check if damage is too low to penetrate shield
  if (defenderShield > 0 && attackerDamage < defenderShield * COMBAT_CONSTANTS.MIN_DAMAGE_PERCENT) {
    return {
      shieldDamage: 0,
      hullDamage: 0,
      bounced: true,
    }
  }

  // Calculate shield damage and hull damage
  const shieldDamage = Math.min(attackerDamage, defenderShield)
  const hullDamage = Math.max(0, attackerDamage - defenderShield)

  return {
    shieldDamage,
    hullDamage,
    bounced: false,
  }
}

// ============================================================================
// EXPLOSION CHECK
// ============================================================================

/**
 * Roll for unit explosion when hull is below 70%
 *
 * OGame rules:
 * - When hull < 70% of max, unit has chance to explode
 * - Explosion chance = 1 - (currentHull / maxHull)
 * - Example: 30% hull remaining = 70% explosion chance
 *
 * @param currentHull - Current hull points
 * @param maxHull - Maximum hull points
 * @param randomFn - Random function (for testing)
 * @returns True if unit explodes
 */
export function rollExplosion(
  currentHull: number,
  maxHull: number,
  randomFn: () => number = Math.random
): boolean {
  const hullPercent = currentHull / maxHull

  // No explosion chance if hull >= 70%
  if (hullPercent >= COMBAT_CONSTANTS.EXPLOSION_THRESHOLD) {
    return false
  }

  // Explosion chance = 1 - (currentHull / maxHull)
  const explosionChance = 1 - hullPercent

  return randomFn() < explosionChance
}

// ============================================================================
// DEBRIS GENERATION
// ============================================================================

/**
 * Generate debris from destroyed ships
 *
 * OGame rules:
 * - 30% of metal and crystal from destroyed ships become debris
 * - Deuterium is never converted to debris
 * - Only ships generate debris (not defenses)
 *
 * @param destroyedShips - Map of destroyed ship keys to counts
 * @returns Debris resources (metal and crystal only)
 */
export function generateDebris(
  destroyedShips: Partial<ShipCounts>
): { metal: number; crystal: number } {
  let totalMetal = 0
  let totalCrystal = 0

  for (const [shipKey, count] of Object.entries(destroyedShips)) {
    if (count && count > 0) {
      const cost = SHIP_COSTS[shipKey]
      if (cost) {
        totalMetal += cost.metal * count
        totalCrystal += cost.crystal * count
      }
    }
  }

  return {
    metal: Math.floor(totalMetal * COMBAT_CONSTANTS.DEBRIS_PERCENTAGE),
    crystal: Math.floor(totalCrystal * COMBAT_CONSTANTS.DEBRIS_PERCENTAGE),
  }
}

// ============================================================================
// LOOT CALCULATION
// ============================================================================

/**
 * Calculate loot from defender's resources
 *
 * OGame rules:
 * - Attacker can loot up to 50% of defender's resources
 * - Limited by cargo capacity of remaining fleet
 * - Resources are taken proportionally if cargo is limited
 *
 * @param availableResources - Defender's resources
 * @param cargoCapacity - Attacker's remaining cargo capacity
 * @returns Looted resources
 */
export function calculateLoot(
  availableResources: Resources,
  cargoCapacity: number
): Resources {
  // Can loot up to 50% of each resource
  const maxLoot = {
    metal: Math.floor(availableResources.metal * 0.5),
    crystal: Math.floor(availableResources.crystal * 0.5),
    deuterium: Math.floor(availableResources.deuterium * 0.5),
  }

  const totalAvailable = maxLoot.metal + maxLoot.crystal + maxLoot.deuterium

  // If cargo can hold everything, take it all
  if (totalAvailable <= cargoCapacity) {
    return maxLoot
  }

  // Otherwise, distribute proportionally
  const ratio = cargoCapacity / totalAvailable
  return {
    metal: Math.floor(maxLoot.metal * ratio),
    crystal: Math.floor(maxLoot.crystal * ratio),
    deuterium: Math.floor(maxLoot.deuterium * ratio),
  }
}

// ============================================================================
// CARGO CAPACITY
// ============================================================================

/**
 * Cargo capacity per ship type
 */
const CARGO_CAPACITY: Record<string, number> = {
  light_fighter: 50,
  heavy_fighter: 100,
  cruiser: 800,
  battleship: 1500,
  battlecruiser: 750,
  bomber: 500,
  destroyer: 2000,
  deathstar: 1000000,
  small_cargo: 5000,
  large_cargo: 25000,
  colony_ship: 7500,
  recycler: 20000,
  espionage_probe: 0,
  solar_satellite: 0,
  reaper: 10000,
  pathfinder: 10000,
}

/**
 * Calculate total cargo capacity of a fleet
 *
 * @param ships - Ship counts
 * @returns Total cargo capacity
 */
export function calculateCargoCapacity(ships: Partial<ShipCounts>): number {
  let total = 0
  for (const [shipKey, count] of Object.entries(ships)) {
    if (count && count > 0) {
      total += (CARGO_CAPACITY[shipKey] || 0) * count
    }
  }
  return total
}

// ============================================================================
// RAPID FIRE
// ============================================================================

/**
 * Check rapid fire and return number of additional shots
 *
 * @param attackerKey - Key of the attacking unit
 * @param defenderKey - Key of the defending unit
 * @param randomFn - Random function (for testing)
 * @returns Number of additional shots (0 if no rapid fire)
 */
export function rollRapidFire(
  attackerKey: string,
  defenderKey: string,
  randomFn: () => number = Math.random
): number {
  const rapidFireValue = RAPID_FIRE[attackerKey]?.[defenderKey]

  if (!rapidFireValue || rapidFireValue <= 1) {
    return 0
  }

  // Probability of each additional shot = (rapidFire - 1) / rapidFire
  const continueChance = (rapidFireValue - 1) / rapidFireValue
  let additionalShots = 0

  while (randomFn() < continueChance) {
    additionalShots++
    // Safety limit to prevent infinite loops
    if (additionalShots >= 1000) break
  }

  return additionalShots
}

// ============================================================================
// COMBAT UNIT CREATION
// ============================================================================

let unitIdCounter = 0

/**
 * Create combat units from a fleet composition
 *
 * @param fleet - Fleet composition
 * @param tech - Technology levels
 * @param userId - Owner user ID
 * @returns Array of combat units
 */
export function createCombatUnitsFromFleet(
  fleet: FleetComposition,
  tech: TechLevels,
  userId: string
): CombatUnit[] {
  const units: CombatUnit[] = []

  for (const [shipKey, count] of Object.entries(fleet)) {
    if (!count || count <= 0) continue

    const baseStats = SHIP_STATS[shipKey]
    if (!baseStats) continue

    const effectiveStats = calculateEffectiveStats(baseStats, tech)
    const cost = SHIP_COSTS[shipKey] || { metal: 0, crystal: 0, deuterium: 0 }
    const unitId = SHIP_IDS[shipKey] || 0

    for (let i = 0; i < count; i++) {
      units.push({
        id: `ship_${unitIdCounter++}`,
        unitKey: shipKey,
        unitId,
        type: 'ship',
        attack: effectiveStats.attack,
        maxShield: effectiveStats.shield,
        currentShield: effectiveStats.shield,
        maxHull: effectiveStats.hull,
        currentHull: effectiveStats.hull,
        destroyed: false,
        cost,
      })
    }
  }

  return units
}

/**
 * Create combat units from defense composition
 *
 * @param defense - Defense composition
 * @param tech - Technology levels
 * @param userId - Owner user ID
 * @returns Array of combat units
 */
export function createCombatUnitsFromDefense(
  defense: DefenseComposition,
  tech: TechLevels,
  userId: string
): CombatUnit[] {
  const units: CombatUnit[] = []

  for (const [defenseKey, count] of Object.entries(defense)) {
    if (!count || count <= 0) continue

    const baseStats = DEFENSE_STATS[defenseKey]
    if (!baseStats) continue

    const effectiveStats = calculateEffectiveStats(baseStats, tech)
    const cost = DEFENSE_COSTS[defenseKey] || { metal: 0, crystal: 0, deuterium: 0 }
    const unitId = DEFENSE_IDS[defenseKey] || 0

    for (let i = 0; i < count; i++) {
      units.push({
        id: `def_${unitIdCounter++}`,
        unitKey: defenseKey,
        unitId,
        type: 'defense',
        attack: effectiveStats.attack,
        maxShield: effectiveStats.shield,
        currentShield: effectiveStats.shield,
        maxHull: effectiveStats.hull,
        currentHull: effectiveStats.hull,
        destroyed: false,
        cost,
      })
    }
  }

  return units
}

// ============================================================================
// FLEET SNAPSHOT
// ============================================================================

/**
 * Create a snapshot of the current fleet state
 *
 * @param units - Array of combat units
 * @returns Fleet snapshot
 */
export function createFleetSnapshot(units: CombatUnit[]): FleetSnapshot {
  const ships: Partial<ShipCounts> = {}
  const defense: Partial<DefenseComposition> = {}
  let totalAttack = 0
  let totalShield = 0
  let totalHull = 0
  let unitCount = 0

  for (const unit of units) {
    if (unit.destroyed) continue

    unitCount++
    totalAttack += unit.attack
    totalShield += unit.currentShield
    totalHull += unit.currentHull

    if (unit.type === 'ship') {
      const key = unit.unitKey as keyof ShipCounts
      ships[key] = (ships[key] || 0) + 1
    } else {
      const key = unit.unitKey as keyof DefenseComposition
      defense[key] = (defense[key] || 0) + 1
    }
  }

  return {
    ships,
    defense,
    totalAttack,
    totalShield,
    totalHull,
    unitCount,
  }
}

// ============================================================================
// LOSS CALCULATION
// ============================================================================

/**
 * Calculate ship losses from combat units
 *
 * @param initialUnits - Units at start of battle
 * @param remainingUnits - Units after battle
 * @returns Ship losses
 */
export function calculateShipLosses(
  initialUnits: CombatUnit[],
  remainingUnits: CombatUnit[]
): ShipLosses {
  const initialCounts: Record<string, number> = {}
  const remainingCounts: Record<string, number> = {}

  for (const unit of initialUnits) {
    if (unit.type !== 'ship') continue
    initialCounts[unit.unitKey] = (initialCounts[unit.unitKey] || 0) + 1
  }

  for (const unit of remainingUnits) {
    if (unit.type !== 'ship' || unit.destroyed) continue
    remainingCounts[unit.unitKey] = (remainingCounts[unit.unitKey] || 0) + 1
  }

  const losses: Partial<ShipCounts> = {}
  let metalValue = 0
  let crystalValue = 0
  let deuteriumValue = 0

  for (const [key, initialCount] of Object.entries(initialCounts)) {
    const remaining = remainingCounts[key] || 0
    const lost = initialCount - remaining
    if (lost > 0) {
      losses[key as keyof ShipCounts] = lost
      const cost = SHIP_COSTS[key]
      if (cost) {
        metalValue += cost.metal * lost
        crystalValue += cost.crystal * lost
        deuteriumValue += cost.deuterium * lost
      }
    }
  }

  return {
    ships: losses,
    metalValue,
    crystalValue,
    deuteriumValue,
  }
}

/**
 * Calculate defense losses from combat units
 *
 * @param initialUnits - Units at start of battle
 * @param remainingUnits - Units after battle
 * @returns Defense losses
 */
export function calculateDefenseLosses(
  initialUnits: CombatUnit[],
  remainingUnits: CombatUnit[]
): DefenseLosses {
  const initialCounts: Record<string, number> = {}
  const remainingCounts: Record<string, number> = {}

  for (const unit of initialUnits) {
    if (unit.type !== 'defense') continue
    initialCounts[unit.unitKey] = (initialCounts[unit.unitKey] || 0) + 1
  }

  for (const unit of remainingUnits) {
    if (unit.type !== 'defense' || unit.destroyed) continue
    remainingCounts[unit.unitKey] = (remainingCounts[unit.unitKey] || 0) + 1
  }

  const losses: Partial<DefenseComposition> = {}
  let metalValue = 0
  let crystalValue = 0
  let deuteriumValue = 0

  for (const [key, initialCount] of Object.entries(initialCounts)) {
    const remaining = remainingCounts[key] || 0
    const lost = initialCount - remaining
    if (lost > 0) {
      losses[key as keyof DefenseComposition] = lost
      const cost = DEFENSE_COSTS[key]
      if (cost) {
        metalValue += cost.metal * lost
        crystalValue += cost.crystal * lost
        deuteriumValue += cost.deuterium * lost
      }
    }
  }

  return {
    defense: losses,
    metalValue,
    crystalValue,
    deuteriumValue,
  }
}

// ============================================================================
// MOON CHANCE
// ============================================================================

/**
 * Calculate moon creation chance based on debris
 *
 * OGame rules:
 * - 1% chance per 100,000 debris (metal + crystal)
 * - Maximum 20% chance
 *
 * @param debris - Debris field
 * @returns Moon chance (0-20)
 */
export function calculateMoonChance(debris: { metal: number; crystal: number }): number {
  const totalDebris = debris.metal + debris.crystal
  const chance = Math.floor(totalDebris / 100000) * COMBAT_CONSTANTS.MOON_CHANCE_PER_100K
  return Math.min(chance, COMBAT_CONSTANTS.MAX_MOON_CHANCE)
}

/**
 * Roll for moon creation
 *
 * @param moonChance - Chance percentage (0-20)
 * @param randomFn - Random function (for testing)
 * @returns True if moon is created
 */
export function rollMoonCreation(
  moonChance: number,
  randomFn: () => number = Math.random
): boolean {
  if (moonChance <= 0) return false
  return randomFn() * 100 < moonChance
}

// ============================================================================
// WINNER DETERMINATION
// ============================================================================

/**
 * Determine the winner of the battle
 *
 * @param attackerUnits - Attacker's remaining units
 * @param defenderUnits - Defender's remaining units
 * @returns Winner of the battle
 */
export function determineWinner(
  attackerUnits: CombatUnit[],
  defenderUnits: CombatUnit[]
): 'attacker' | 'defender' | 'draw' {
  const attackerAlive = attackerUnits.filter(u => !u.destroyed).length
  const defenderAlive = defenderUnits.filter(u => !u.destroyed).length

  if (attackerAlive > 0 && defenderAlive === 0) {
    return 'attacker'
  }
  if (defenderAlive > 0 && attackerAlive === 0) {
    return 'defender'
  }
  return 'draw'
}

// ============================================================================
// SHIELD REGENERATION
// ============================================================================

/**
 * Regenerate shields for all units between rounds
 *
 * OGame rules:
 * - Shields regenerate to full between rounds
 * - Hull does not regenerate
 *
 * @param units - Array of combat units
 */
export function regenerateShields(units: CombatUnit[]): void {
  for (const unit of units) {
    if (!unit.destroyed) {
      unit.currentShield = unit.maxShield
    }
  }
}
