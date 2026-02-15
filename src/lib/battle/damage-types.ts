/**
 * Advanced Damage Types System
 *
 * Implements a multi-damage type combat system with:
 * - 5 damage types: ballistic, ionic, explosive, hacking, boarding
 * - Corresponding resistance types
 * - Status effects from damage
 * - Advanced damage calculation
 */

// ============================================================================
// DAMAGE TYPES
// ============================================================================

/**
 * All damage types in the combat system
 */
export interface DamageTypes {
  /** Kinetic damage (cannons, missiles, projectiles) - effective vs armor */
  ballistic: number
  /** Ionic damage (disables shields and systems) - effective vs shields */
  ionic: number
  /** Explosive damage (AoE, anti-structure) - effective vs hull */
  explosive: number
  /** Cyber attack (system disruption, control hijacking) */
  hacking: number
  /** Boarding power (crew-based capture attempts) */
  boarding: number
}

/**
 * Empty damage types template
 */
export const EMPTY_DAMAGE: DamageTypes = {
  ballistic: 0,
  ionic: 0,
  explosive: 0,
  hacking: 0,
  boarding: 0,
}

/**
 * All damage type keys
 */
export const DAMAGE_TYPE_KEYS: (keyof DamageTypes)[] = [
  'ballistic',
  'ionic',
  'explosive',
  'hacking',
  'boarding',
]

// ============================================================================
// RESISTANCE TYPES
// ============================================================================

/**
 * Resistance types corresponding to each damage type
 */
export interface ResistanceTypes {
  /** % reduction against ballistic damage */
  ballistic_resistance: number
  /** % reduction against ionic damage */
  ionic_resistance: number
  /** % reduction against explosive damage */
  explosive_resistance: number
  /** % resistance to hacking attempts */
  hack_defense: number
  /** Anti-boarding defense strength */
  anti_boarding: number
}

/**
 * Empty resistance types template
 */
export const EMPTY_RESISTANCES: ResistanceTypes = {
  ballistic_resistance: 0,
  ionic_resistance: 0,
  explosive_resistance: 0,
  hack_defense: 0,
  anti_boarding: 0,
}

/**
 * All resistance type keys
 */
export const RESISTANCE_TYPE_KEYS: (keyof ResistanceTypes)[] = [
  'ballistic_resistance',
  'ionic_resistance',
  'explosive_resistance',
  'hack_defense',
  'anti_boarding',
]

// ============================================================================
// STATUS EFFECTS
// ============================================================================

/**
 * Status effect types that can be applied during combat
 */
export type StatusEffectType =
  | 'shield_disruption'      // Shields disabled/reduced
  | 'system_hacked'          // Systems compromised
  | 'weapons_disabled'       // Cannot attack
  | 'engines_disabled'       // Cannot move/retreat
  | 'ionized'                // Reduced accuracy and damage
  | 'on_fire'                // DoT damage
  | 'hull_breach'            // Increased damage taken
  | 'crew_panic'             // Reduced effectiveness
  | 'boarded'                // Under boarding attack
  | 'emp_stunned'            // All systems temporarily offline
  | 'sensors_jammed'         // Sensors jammed, reduced accuracy
  | 'nanite_repair'          // Nanite self-repair active
  | 'shield_overcharge'      // Shield overcharged
  | 'phased'                 // Phased out of reality

/**
 * Status effect applied to a unit
 */
export interface StatusEffect {
  /** Type of effect */
  type: StatusEffectType
  /** Remaining duration in rounds */
  duration: number
  /** Effect strength (0-1 for percentage effects) */
  strength: number
  /** Source unit that applied this effect */
  sourceId?: string
  /** Specific system targeted (for hacking) */
  targetSystem?: HackableSystem
}

/**
 * Systems that can be hacked
 */
export type HackableSystem =
  | 'weapons'
  | 'shields'
  | 'engines'
  | 'sensors'
  | 'communications'
  | 'life_support'
  | 'power_core'

// ============================================================================
// COMBAT STATS
// ============================================================================

/**
 * Extended combat statistics for advanced units
 */
export interface AdvancedCombatStats {
  // === ACCURACY & EVASION ===
  /** Base accuracy percentage (0-100) */
  accuracy: number
  /** Evasion chance percentage (0-100) */
  evasion: number

  // === CRITICAL HITS ===
  /** Critical hit chance percentage (0-100) */
  critChance: number
  /** Critical damage multiplier */
  critMultiplier: number

  // === DEFENSE SYSTEMS ===
  /** Point defense value (intercepts missiles/fighters) */
  pointDefense: number

  // === CREW ===
  /** Current crew count */
  crewCurrent: number
  /** Maximum crew capacity */
  crewMax: number
}

/**
 * Default combat stats
 */
export const DEFAULT_COMBAT_STATS: AdvancedCombatStats = {
  accuracy: 80,
  evasion: 0,
  critChance: 5,
  critMultiplier: 1.5,
  pointDefense: 0,
  crewCurrent: 0,
  crewMax: 0,
}

// ============================================================================
// DAMAGE CALCULATION RESULT
// ============================================================================

/**
 * Result of an advanced damage calculation
 */
export interface AdvancedDamageResult {
  /** Whether the attack hit */
  hit: boolean
  /** Whether it was a critical hit */
  critical: boolean
  /** Whether the attack was intercepted by point defense */
  intercepted: boolean
  /** Raw damage by type before resistances */
  rawDamage: DamageTypes
  /** Final damage by type after resistances */
  finalDamage: DamageTypes
  /** Damage applied to each layer */
  appliedDamage: {
    shield: number
    armor: number
    hull: number
    crew: number
  }
  /** Status effects applied */
  effects: StatusEffect[]
  /** Special events (hacking success, boarding initiated, etc.) */
  events: DamageEvent[]
}

/**
 * Events that can occur during damage calculation
 */
export interface DamageEvent {
  type: DamageEventType
  data: Record<string, unknown>
}

export type DamageEventType =
  | 'critical_hit'
  | 'shield_break'
  | 'armor_break'
  | 'hull_breach'
  | 'system_disabled'
  | 'hack_success'
  | 'hack_failed'
  | 'boarding_initiated'
  | 'crew_casualties'
  | 'point_defense_intercept'

// ============================================================================
// DAMAGE TYPE EFFECTIVENESS
// ============================================================================

/**
 * Damage type effectiveness multipliers against different defenses
 */
export const DAMAGE_EFFECTIVENESS = {
  ballistic: {
    vsShield: 0.8,   // Less effective against shields
    vsArmor: 1.2,    // More effective against armor
    vsHull: 1.0,     // Normal against hull
  },
  ionic: {
    vsShield: 1.5,   // Very effective against shields
    vsArmor: 0.5,    // Weak against armor
    vsHull: 0.7,     // Weak against hull
  },
  explosive: {
    vsShield: 0.7,   // Weak against shields
    vsArmor: 0.9,    // Slightly weak against armor
    vsHull: 1.4,     // Very effective against hull
  },
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create damage types from partial input
 */
export function createDamageTypes(partial: Partial<DamageTypes>): DamageTypes {
  return { ...EMPTY_DAMAGE, ...partial }
}

/**
 * Create resistance types from partial input
 */
export function createResistanceTypes(partial: Partial<ResistanceTypes>): ResistanceTypes {
  return { ...EMPTY_RESISTANCES, ...partial }
}

/**
 * Calculate total damage value (sum of all types except boarding)
 */
export function getTotalDamage(damage: DamageTypes): number {
  return damage.ballistic + damage.ionic + damage.explosive
}

/**
 * Scale damage by a multiplier
 */
export function scaleDamage(damage: DamageTypes, multiplier: number): DamageTypes {
  return {
    ballistic: Math.floor(damage.ballistic * multiplier),
    ionic: Math.floor(damage.ionic * multiplier),
    explosive: Math.floor(damage.explosive * multiplier),
    hacking: Math.floor(damage.hacking * multiplier),
    boarding: Math.floor(damage.boarding * multiplier),
  }
}

/**
 * Apply resistances to damage
 */
export function applyResistances(
  damage: DamageTypes,
  resistances: ResistanceTypes
): DamageTypes {
  return {
    ballistic: Math.floor(damage.ballistic * (1 - resistances.ballistic_resistance / 100)),
    ionic: Math.floor(damage.ionic * (1 - resistances.ionic_resistance / 100)),
    explosive: Math.floor(damage.explosive * (1 - resistances.explosive_resistance / 100)),
    hacking: Math.floor(damage.hacking * (1 - resistances.hack_defense / 100)),
    boarding: damage.boarding, // Boarding is handled separately
  }
}

/**
 * Check if unit has any active status effect of given type
 */
export function hasStatusEffect(
  effects: StatusEffect[],
  type: StatusEffectType
): boolean {
  return effects.some(e => e.type === type && e.duration > 0)
}

/**
 * Get the strength of a status effect (0 if not present)
 */
export function getStatusEffectStrength(
  effects: StatusEffect[],
  type: StatusEffectType
): number {
  const effect = effects.find(e => e.type === type && e.duration > 0)
  return effect?.strength ?? 0
}

/**
 * Reduce duration of all status effects by 1 round
 */
export function tickStatusEffects(effects: StatusEffect[]): StatusEffect[] {
  return effects
    .map(e => ({ ...e, duration: e.duration - 1 }))
    .filter(e => e.duration > 0)
}

/**
 * Merge damage from multiple sources
 */
export function mergeDamage(...damages: DamageTypes[]): DamageTypes {
  return damages.reduce(
    (acc, d) => ({
      ballistic: acc.ballistic + d.ballistic,
      ionic: acc.ionic + d.ionic,
      explosive: acc.explosive + d.explosive,
      hacking: acc.hacking + d.hacking,
      boarding: acc.boarding + d.boarding,
    }),
    { ...EMPTY_DAMAGE }
  )
}
