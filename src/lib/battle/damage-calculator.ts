/**
 * Advanced Damage Calculator
 *
 * Calculates damage considering:
 * - Multiple damage types
 * - Resistances
 * - Accuracy/Evasion
 * - Critical hits
 * - Point defense interception
 * - Status effects
 */

import type {
  DamageTypes,
  StatusEffect,
  AdvancedDamageResult,
  DamageEvent,
  StatusEffectType,
  HackableSystem,
} from './damage-types'
import {
  EMPTY_DAMAGE,
  DAMAGE_EFFECTIVENESS,
  applyResistances,
  getTotalDamage,
  hasStatusEffect,
  getStatusEffectStrength,
} from './damage-types'
import type { AdvancedCombatUnit } from './advanced-unit'
import { canAttack, applyDamageToUnit } from './advanced-unit'

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum hit chance (can't go below this) */
const MIN_HIT_CHANCE = 0.1

/** Minimum damage to penetrate shields (1% of shield) */
const MIN_SHIELD_PENETRATION = 0.01

/** Ionic damage threshold to trigger shield disruption */
const IONIC_DISRUPTION_THRESHOLD = 0.3

/** Hacking power threshold for system hack attempts */
const HACK_ATTEMPT_THRESHOLD = 50

/** Hull percentage threshold for hull breach */
const HULL_BREACH_THRESHOLD = 0.5

// ============================================================================
// MAIN DAMAGE CALCULATION
// ============================================================================

/**
 * Calculate advanced damage from attacker to defender
 */
export function calculateAdvancedDamage(
  attacker: AdvancedCombatUnit,
  defender: AdvancedCombatUnit,
  randomFn: () => number = Math.random
): AdvancedDamageResult {
  const events: DamageEvent[] = []
  const effects: StatusEffect[] = []

  // Check if attacker can attack
  if (!canAttack(attacker)) {
    return createMissResult()
  }

  // === POINT DEFENSE CHECK ===
  // Point defense can intercept small/fast units
  if (defender.stats.pointDefense > 0 && isInterceptable(attacker)) {
    const interceptChance = calculateInterceptChance(
      defender.stats.pointDefense,
      attacker.stats.evasion
    )
    if (randomFn() < interceptChance) {
      events.push({
        type: 'point_defense_intercept',
        data: { interceptedUnit: attacker.unitKey },
      })
      return {
        hit: false,
        critical: false,
        intercepted: true,
        rawDamage: { ...EMPTY_DAMAGE },
        finalDamage: { ...EMPTY_DAMAGE },
        appliedDamage: { shield: 0, armor: 0, hull: 0, crew: 0 },
        effects: [],
        events,
      }
    }
  }

  // === HIT CALCULATION ===
  const hitChance = calculateHitChance(attacker, defender)
  if (randomFn() > hitChance) {
    return createMissResult()
  }

  // === CRITICAL HIT CHECK ===
  const isCritical = randomFn() < attacker.stats.critChance / 100
  const critMultiplier = isCritical ? attacker.stats.critMultiplier : 1

  if (isCritical) {
    events.push({
      type: 'critical_hit',
      data: { multiplier: critMultiplier },
    })
  }

  // === RAW DAMAGE CALCULATION ===
  const rawDamage = calculateRawDamage(attacker, critMultiplier)

  // === APPLY RESISTANCES ===
  const finalDamage = applyResistances(rawDamage, defender.resistances)

  // === APPLY DAMAGE TO DEFENSE LAYERS ===
  const { shieldDamage, armorDamage, hullDamage, layerEvents } =
    calculateLayeredDamage(finalDamage, defender, events)

  events.push(...layerEvents)

  // Apply the damage
  const appliedDamage = applyDamageToUnit(
    defender,
    shieldDamage,
    armorDamage,
    hullDamage
  )

  // === STATUS EFFECTS ===

  // Ionic damage can disrupt shields
  if (finalDamage.ionic > 0) {
    const ionicEffect = checkIonicDisruption(
      finalDamage.ionic,
      defender,
      attacker.id
    )
    if (ionicEffect) {
      effects.push(ionicEffect)
    }
  }

  // Hacking attempts
  if (finalDamage.hacking >= HACK_ATTEMPT_THRESHOLD) {
    const hackResult = attemptHack(
      finalDamage.hacking,
      defender,
      attacker.id,
      randomFn
    )
    effects.push(...hackResult.effects)
    events.push(...hackResult.events)
  }

  // Hull breach check
  if (
    defender.defense.hull.current > 0 &&
    defender.defense.hull.current / defender.defense.hull.max < HULL_BREACH_THRESHOLD
  ) {
    const existingBreach = hasStatusEffect(defender.statusEffects, 'hull_breach')
    if (!existingBreach) {
      effects.push({
        type: 'hull_breach',
        duration: 3,
        strength: 0.2, // 20% increased damage taken
        sourceId: attacker.id,
      })
      events.push({
        type: 'hull_breach',
        data: { hullPercent: defender.defense.hull.current / defender.defense.hull.max },
      })
    }
  }

  // Crew casualties from hull damage
  let crewDamage = 0
  if (appliedDamage.hull > 0 && defender.crew.current > 0) {
    crewDamage = calculateCrewCasualties(
      appliedDamage.hull,
      defender.defense.hull.max,
      defender.crew.current,
      randomFn
    )
    if (crewDamage > 0) {
      defender.crew.current = Math.max(0, defender.crew.current - crewDamage)
      events.push({
        type: 'crew_casualties',
        data: { casualties: crewDamage, remaining: defender.crew.current },
      })
    }
  }

  // Apply new status effects to defender
  defender.statusEffects.push(...effects)

  return {
    hit: true,
    critical: isCritical,
    intercepted: false,
    rawDamage,
    finalDamage,
    appliedDamage: {
      shield: appliedDamage.shield,
      armor: appliedDamage.armor,
      hull: appliedDamage.hull,
      crew: crewDamage,
    },
    effects,
    events,
  }
}

// ============================================================================
// HIT CALCULATION
// ============================================================================

/**
 * Calculate hit chance based on accuracy and evasion
 */
function calculateHitChance(
  attacker: AdvancedCombatUnit,
  defender: AdvancedCombatUnit
): number {
  let accuracy = attacker.stats.accuracy
  let evasion = defender.stats.evasion

  // Apply status effect modifiers
  if (hasStatusEffect(attacker.statusEffects, 'ionized')) {
    accuracy *= 1 - getStatusEffectStrength(attacker.statusEffects, 'ionized')
  }

  // Base formula: (accuracy - evasion + 50) / 100
  const hitChance = (accuracy - evasion + 50) / 100

  return Math.max(MIN_HIT_CHANCE, Math.min(1, hitChance))
}

// ============================================================================
// RAW DAMAGE CALCULATION
// ============================================================================

/**
 * Calculate raw damage output from attacker
 */
function calculateRawDamage(
  attacker: AdvancedCombatUnit,
  critMultiplier: number
): DamageTypes {
  let damage = { ...attacker.damage }

  // Apply crit multiplier to direct damage types
  damage.ballistic = Math.floor(damage.ballistic * critMultiplier)
  damage.ionic = Math.floor(damage.ionic * critMultiplier)
  damage.explosive = Math.floor(damage.explosive * critMultiplier)
  // Hacking and boarding are not affected by crits

  // Apply status effect modifiers
  if (hasStatusEffect(attacker.statusEffects, 'ionized')) {
    const reduction = getStatusEffectStrength(attacker.statusEffects, 'ionized')
    damage.ballistic = Math.floor(damage.ballistic * (1 - reduction))
    damage.ionic = Math.floor(damage.ionic * (1 - reduction))
    damage.explosive = Math.floor(damage.explosive * (1 - reduction))
  }

  return damage
}

// ============================================================================
// LAYERED DAMAGE CALCULATION
// ============================================================================

interface LayeredDamageResult {
  shieldDamage: number
  armorDamage: number
  hullDamage: number
  layerEvents: DamageEvent[]
}

/**
 * Calculate how damage is distributed across defense layers
 */
function calculateLayeredDamage(
  damage: DamageTypes,
  defender: AdvancedCombatUnit,
  existingEvents: DamageEvent[]
): LayeredDamageResult {
  const events: DamageEvent[] = []

  // Calculate effective damage against each layer
  const vsShield =
    damage.ballistic * DAMAGE_EFFECTIVENESS.ballistic.vsShield +
    damage.ionic * DAMAGE_EFFECTIVENESS.ionic.vsShield +
    damage.explosive * DAMAGE_EFFECTIVENESS.explosive.vsShield

  const vsArmor =
    damage.ballistic * DAMAGE_EFFECTIVENESS.ballistic.vsArmor +
    damage.ionic * DAMAGE_EFFECTIVENESS.ionic.vsArmor +
    damage.explosive * DAMAGE_EFFECTIVENESS.explosive.vsArmor

  const vsHull =
    damage.ballistic * DAMAGE_EFFECTIVENESS.ballistic.vsHull +
    damage.ionic * DAMAGE_EFFECTIVENESS.ionic.vsHull +
    damage.explosive * DAMAGE_EFFECTIVENESS.explosive.vsHull

  // Check shield penetration
  const totalDamage = getTotalDamage(damage)
  const shieldCurrent = defender.defense.shield.current

  if (shieldCurrent > 0 && totalDamage < shieldCurrent * MIN_SHIELD_PENETRATION) {
    // Damage bounces off shields
    return {
      shieldDamage: 0,
      armorDamage: 0,
      hullDamage: 0,
      layerEvents: events,
    }
  }

  // Calculate damage flow through layers
  let shieldDamage = Math.min(shieldCurrent, vsShield)
  let remainingDamage = vsShield - shieldDamage

  // Check for shield break
  if (shieldCurrent > 0 && defender.defense.shield.current - shieldDamage <= 0) {
    events.push({
      type: 'shield_break',
      data: { shieldDamage },
    })
  }

  // Armor absorbs remaining shield overflow + direct armor damage
  const armorCurrent = defender.defense.armor.current
  let armorDamage = Math.min(armorCurrent, vsArmor + remainingDamage * 0.5)
  remainingDamage = Math.max(0, vsArmor + remainingDamage * 0.5 - armorCurrent)

  // Check for armor break
  if (armorCurrent > 0 && defender.defense.armor.current - armorDamage <= 0) {
    events.push({
      type: 'armor_break',
      data: { armorDamage },
    })
  }

  // Hull takes remaining damage
  const hullDamage = vsHull + remainingDamage

  // Apply hull breach modifier if present
  let finalHullDamage = hullDamage
  if (hasStatusEffect(defender.statusEffects, 'hull_breach')) {
    const breachStrength = getStatusEffectStrength(
      defender.statusEffects,
      'hull_breach'
    )
    finalHullDamage = Math.floor(hullDamage * (1 + breachStrength))
  }

  return {
    shieldDamage: Math.floor(shieldDamage),
    armorDamage: Math.floor(armorDamage),
    hullDamage: Math.floor(finalHullDamage),
    layerEvents: events,
  }
}

// ============================================================================
// IONIC DISRUPTION
// ============================================================================

/**
 * Check if ionic damage causes shield disruption
 */
function checkIonicDisruption(
  ionicDamage: number,
  defender: AdvancedCombatUnit,
  sourceId: string
): StatusEffect | null {
  if (defender.defense.shield.max === 0) return null

  const ionicRatio = ionicDamage / defender.defense.shield.max

  if (ionicRatio >= IONIC_DISRUPTION_THRESHOLD) {
    return {
      type: 'shield_disruption',
      duration: 1,
      strength: Math.min(0.5, ionicRatio), // Up to 50% shield regen reduction
      sourceId,
    }
  }

  return null
}

// ============================================================================
// HACKING
// ============================================================================

interface HackResult {
  effects: StatusEffect[]
  events: DamageEvent[]
}

/**
 * Attempt to hack enemy systems
 */
function attemptHack(
  hackPower: number,
  defender: AdvancedCombatUnit,
  sourceId: string,
  randomFn: () => number
): HackResult {
  const effects: StatusEffect[] = []
  const events: DamageEvent[] = []

  // Calculate hack success chance
  const hackDefense = defender.resistances.hack_defense
  const successChance = Math.max(0.1, (hackPower - hackDefense) / 100)

  if (randomFn() < successChance) {
    // Hack succeeded - select random system
    const targetSystem = selectRandomSystem(randomFn)
    const effect = createHackEffect(targetSystem, hackPower, sourceId)

    effects.push(effect)
    events.push({
      type: 'hack_success',
      data: { targetSystem, hackPower },
    })

    // Severe hacks can disable the unit
    if (hackPower > 100 && targetSystem === 'power_core') {
      defender.disabled = true
    }
  } else {
    events.push({
      type: 'hack_failed',
      data: { hackPower, hackDefense },
    })
  }

  return { effects, events }
}

/**
 * Select a random hackable system
 */
function selectRandomSystem(randomFn: () => number): HackableSystem {
  const systems: HackableSystem[] = [
    'weapons',
    'shields',
    'engines',
    'sensors',
    'communications',
  ]
  const index = Math.floor(randomFn() * systems.length)
  return systems[index]
}

/**
 * Create a status effect for a hacked system
 */
function createHackEffect(
  system: HackableSystem,
  hackPower: number,
  sourceId: string
): StatusEffect {
  const duration = Math.min(3, Math.floor(hackPower / 50))
  const strength = Math.min(1, hackPower / 100)

  const typeMap: Record<HackableSystem, StatusEffectType> = {
    weapons: 'weapons_disabled',
    shields: 'shield_disruption',
    engines: 'engines_disabled',
    sensors: 'ionized',
    communications: 'system_hacked',
    life_support: 'crew_panic',
    power_core: 'emp_stunned',
  }

  return {
    type: typeMap[system],
    duration,
    strength,
    sourceId,
    targetSystem: system,
  }
}

// ============================================================================
// POINT DEFENSE
// ============================================================================

/**
 * Check if unit can be intercepted by point defense
 */
function isInterceptable(unit: AdvancedCombatUnit): boolean {
  // Fighters and missiles can be intercepted
  return (
    unit.unitClass === 'fighter' ||
    unit.unitClass === 'missile' ||
    unit.unitKey === 'espionage_probe'
  )
}

/**
 * Calculate point defense intercept chance
 */
function calculateInterceptChance(
  pointDefense: number,
  targetEvasion: number
): number {
  // Base intercept chance from point defense value
  const baseChance = pointDefense / 100

  // Reduced by target evasion
  const adjustedChance = baseChance * (1 - targetEvasion / 200)

  return Math.max(0, Math.min(0.8, adjustedChance))
}

// ============================================================================
// CREW CASUALTIES
// ============================================================================

/**
 * Calculate crew casualties from hull damage
 */
function calculateCrewCasualties(
  hullDamage: number,
  maxHull: number,
  currentCrew: number,
  randomFn: () => number
): number {
  // Crew casualties proportional to hull damage
  const damageRatio = hullDamage / maxHull
  const baseCasualties = Math.floor(currentCrew * damageRatio * 0.5)

  // Add some randomness
  const variance = Math.floor(randomFn() * baseCasualties * 0.2)
  const casualties = baseCasualties + variance - Math.floor(baseCasualties * 0.1)

  return Math.max(0, Math.min(currentCrew, casualties))
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Create a miss result
 */
function createMissResult(): AdvancedDamageResult {
  return {
    hit: false,
    critical: false,
    intercepted: false,
    rawDamage: { ...EMPTY_DAMAGE },
    finalDamage: { ...EMPTY_DAMAGE },
    appliedDamage: { shield: 0, armor: 0, hull: 0, crew: 0 },
    effects: [],
    events: [],
  }
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Convert legacy damage result to simple values for backward compatibility
 */
export function simplifyDamageResult(result: AdvancedDamageResult): {
  shieldDamage: number
  hullDamage: number
  bounced: boolean
} {
  return {
    shieldDamage: result.appliedDamage.shield,
    hullDamage: result.appliedDamage.armor + result.appliedDamage.hull,
    bounced: !result.hit,
  }
}

/**
 * Calculate simple damage (legacy compatibility)
 * Converts total weapon power to damage types based on unit class
 */
export function convertLegacyDamage(
  weaponPower: number,
  unitClass: string
): DamageTypes {
  // Default damage distribution based on unit type
  const distributions: Record<string, { b: number; i: number; e: number }> = {
    fighter: { b: 0.8, i: 0.1, e: 0.1 },
    corvette: { b: 0.7, i: 0.2, e: 0.1 },
    frigate: { b: 0.6, i: 0.2, e: 0.2 },
    cruiser: { b: 0.5, i: 0.3, e: 0.2 },
    battleship: { b: 0.4, i: 0.3, e: 0.3 },
    carrier: { b: 0.3, i: 0.4, e: 0.3 },
    dreadnought: { b: 0.3, i: 0.3, e: 0.4 },
    defense: { b: 0.5, i: 0.3, e: 0.2 },
    missile: { b: 0.1, i: 0.0, e: 0.9 },
    transport: { b: 1.0, i: 0.0, e: 0.0 },
    utility: { b: 1.0, i: 0.0, e: 0.0 },
  }

  const dist = distributions[unitClass] ?? distributions.fighter

  return {
    ballistic: Math.floor(weaponPower * dist.b),
    ionic: Math.floor(weaponPower * dist.i),
    explosive: Math.floor(weaponPower * dist.e),
    hacking: 0,
    boarding: 0,
  }
}
