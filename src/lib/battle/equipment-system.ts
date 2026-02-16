/**
 * Ship Equipment System
 *
 * Modular equipment that can be installed on ships to modify stats,
 * add special abilities, and provide tactical advantages in combat.
 *
 * Templates and slot configuration are in equipment-templates.ts
 */

import type { DamageTypes, ResistanceTypes, StatusEffectType } from './damage-types'
import type { AdvancedCombatUnit, UnitClass } from './advanced-unit'

// Import and re-export templates and config from dedicated module
import { DEFAULT_SLOT_CONFIG, EQUIPMENT_TEMPLATES, getTemplatesBySlot, getTemplatesByRarity, getTemplatesForClass, getTemplateKeys } from './equipment-templates'
export { DEFAULT_SLOT_CONFIG, EQUIPMENT_TEMPLATES, getTemplatesBySlot, getTemplatesByRarity, getTemplatesForClass, getTemplateKeys }

// ============================================================================
// EQUIPMENT TYPES
// ============================================================================

/**
 * Equipment slot types
 */
export type EquipmentSlot =
  | 'weapon'        // Primary weapon systems
  | 'secondary'     // Secondary/utility weapons
  | 'shield'        // Shield generators
  | 'armor'         // Armor plating
  | 'engine'        // Propulsion systems
  | 'computer'      // Targeting/hacking systems
  | 'special'       // Special equipment
  | 'consumable'    // One-time use items

/**
 * Equipment rarity tiers
 */
export type EquipmentRarity =
  | 'common'        // Basic equipment
  | 'uncommon'      // Improved versions
  | 'rare'          // Advanced technology
  | 'epic'          // Experimental tech
  | 'legendary'     // Unique/artifact equipment

/**
 * Equipment activation type
 */
export type ActivationType =
  | 'passive'       // Always active
  | 'active'        // Must be activated, has cooldown
  | 'triggered'     // Activates on certain conditions
  | 'consumable'    // Single use

// ============================================================================
// EQUIPMENT DEFINITION
// ============================================================================

/**
 * Stat modifiers from equipment
 */
export interface EquipmentStatModifiers {
  // Multiplicative bonuses (1.0 = no change)
  damageMultiplier?: number
  shieldMultiplier?: number
  armorMultiplier?: number
  hullMultiplier?: number
  speedMultiplier?: number

  // Additive bonuses
  accuracyBonus?: number
  evasionBonus?: number
  critChanceBonus?: number
  critDamageBonus?: number
  pointDefenseBonus?: number
  shieldRegenBonus?: number

  // Damage type bonuses
  damageTypeBonuses?: Partial<DamageTypes>

  // Resistance bonuses
  resistanceBonuses?: Partial<ResistanceTypes>

  // Crew bonuses
  crewCapacityBonus?: number
  crewCombatBonus?: number
  boardingPowerBonus?: number
  antiBoardingBonus?: number
}

/**
 * Active ability definition
 */
export interface EquipmentAbility {
  /** Ability identifier */
  id: string
  /** Display name */
  name: string
  /** Description */
  description: string
  /** Cooldown in combat rounds */
  cooldown: number
  /** Current cooldown remaining */
  currentCooldown: number
  /** Energy/resource cost */
  energyCost: number
  /** Duration in rounds (0 = instant) */
  duration: number
  /** Effect of the ability */
  effect: AbilityEffect
}

/**
 * Ability effect types
 */
export type AbilityEffect =
  | DamageAbilityEffect
  | BuffAbilityEffect
  | DebuffAbilityEffect
  | RepairAbilityEffect
  | SpecialAbilityEffect

export interface DamageAbilityEffect {
  type: 'damage'
  damage: Partial<DamageTypes>
  targetCount: number // Number of targets (0 = all enemies)
  areaEffect: boolean
  penetration: number // Ignores this % of resistance
}

export interface BuffAbilityEffect {
  type: 'buff'
  target: 'self' | 'ally' | 'all_allies'
  modifiers: Partial<EquipmentStatModifiers>
  duration: number
}

export interface DebuffAbilityEffect {
  type: 'debuff'
  target: 'enemy' | 'all_enemies'
  statusEffect: StatusEffectType
  duration: number
  strength: number
}

export interface RepairAbilityEffect {
  type: 'repair'
  target: 'self' | 'ally' | 'all_allies'
  repairAmount: number // Percentage of max
  repairType: 'shield' | 'armor' | 'hull' | 'all'
}

export interface SpecialAbilityEffect {
  type: 'special'
  effectId: string
  params: Record<string, unknown>
}

/**
 * Triggered effect condition
 */
export interface TriggerCondition {
  /** Trigger type */
  trigger:
    | 'on_hit'           // When this unit hits enemy
    | 'on_damage'        // When this unit takes damage
    | 'on_kill'          // When this unit destroys enemy
    | 'on_critical'      // When scoring critical hit
    | 'on_shield_break'  // When shields are depleted
    | 'on_low_hull'      // When hull drops below threshold
    | 'on_round_start'   // At the start of each round
    | 'on_round_end'     // At the end of each round
    | 'on_boarding'      // When initiating/defending boarding
  /** Threshold for trigger (e.g., 30 for "below 30% hull") */
  threshold?: number
  /** Chance to trigger (0-100) */
  chance: number
}

/**
 * Complete equipment definition
 */
export interface Equipment {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Description */
  description: string
  /** Equipment slot */
  slot: EquipmentSlot
  /** Rarity tier */
  rarity: EquipmentRarity
  /** Activation type */
  activationType: ActivationType

  /** Compatible unit classes */
  compatibleClasses: UnitClass[]

  /** Stat modifiers (always active for passive) */
  statModifiers: EquipmentStatModifiers

  /** Active abilities */
  abilities: EquipmentAbility[]

  /** Triggered effects */
  triggers: Array<{
    condition: TriggerCondition
    effect: AbilityEffect
  }>

  /** Installation requirements */
  requirements: EquipmentRequirements

  /** Cost to install */
  installCost: {
    metal: number
    crystal: number
    deuterium: number
  }

  /** Power consumption */
  powerConsumption: number

  /** Weight/mass */
  mass: number

  /** Number of uses remaining (for consumables) */
  usesRemaining?: number
}

/**
 * Installation requirements
 */
export interface EquipmentRequirements {
  /** Minimum tech levels */
  techLevels?: {
    weaponsTech?: number
    shieldTech?: number
    armorTech?: number
    computerTech?: number
    engineTech?: number
  }
  /** Minimum ship level/experience */
  minShipLevel?: number
  /** Required other equipment */
  requiredEquipment?: string[]
  /** Incompatible equipment */
  incompatibleEquipment?: string[]
}

// ============================================================================
// EQUIPPED UNIT
// ============================================================================

/**
 * Equipment installed on a unit
 */
export interface InstalledEquipment {
  equipment: Equipment
  slot: EquipmentSlot
  slotIndex: number
  active: boolean
}

/**
 * Unit with equipment
 */
export interface EquippedUnit {
  unit: AdvancedCombatUnit
  equipment: InstalledEquipment[]
  totalPowerConsumption: number
  maxPower: number
  slotConfig: Record<EquipmentSlot, number>
}

// ============================================================================
// EQUIPMENT FUNCTIONS
// ============================================================================

/**
 * Create equipment instance from template
 */
export function createEquipment(
  templateId: string,
  instanceId?: string
): Equipment | null {
  const template = EQUIPMENT_TEMPLATES[templateId]
  if (!template) return null

  return {
    id: instanceId ?? `${templateId}_${Date.now()}`,
    ...template,
    // Deep copy abilities to avoid shared state
    abilities: template.abilities.map(a => ({ ...a })),
    triggers: template.triggers.map(t => ({
      condition: { ...t.condition },
      effect: { ...t.effect } as AbilityEffect,
    })),
  }
}

/**
 * Check if equipment can be installed on unit
 */
export function canInstallEquipment(
  equipment: Equipment,
  unit: AdvancedCombatUnit,
  currentEquipment: InstalledEquipment[],
  slotConfig: Record<EquipmentSlot, number>
): { canInstall: boolean; reason?: string } {
  // Check class compatibility
  if (!equipment.compatibleClasses.includes(unit.unitClass)) {
    return { canInstall: false, reason: `Not compatible with ${unit.unitClass}` }
  }

  // Check slot availability
  const slotsUsed = currentEquipment.filter(e => e.slot === equipment.slot).length
  const slotsAvailable = slotConfig[equipment.slot] ?? 0
  if (slotsUsed >= slotsAvailable) {
    return { canInstall: false, reason: `No ${equipment.slot} slots available` }
  }

  // Check incompatible equipment
  if (equipment.requirements.incompatibleEquipment) {
    for (const incompatId of equipment.requirements.incompatibleEquipment) {
      if (currentEquipment.some(e => e.equipment.id.startsWith(incompatId))) {
        return { canInstall: false, reason: `Incompatible with ${incompatId}` }
      }
    }
  }

  // Check required equipment
  if (equipment.requirements.requiredEquipment) {
    for (const requiredId of equipment.requirements.requiredEquipment) {
      if (!currentEquipment.some(e => e.equipment.id.startsWith(requiredId))) {
        return { canInstall: false, reason: `Requires ${requiredId}` }
      }
    }
  }

  return { canInstall: true }
}

/**
 * Install equipment on unit
 */
export function installEquipment(
  equippedUnit: EquippedUnit,
  equipment: Equipment
): boolean {
  const check = canInstallEquipment(
    equipment,
    equippedUnit.unit,
    equippedUnit.equipment,
    equippedUnit.slotConfig
  )

  if (!check.canInstall) return false

  // Find next available slot index
  const slotsUsed = equippedUnit.equipment.filter(e => e.slot === equipment.slot)
  const slotIndex = slotsUsed.length

  equippedUnit.equipment.push({
    equipment,
    slot: equipment.slot,
    slotIndex,
    active: true,
  })

  equippedUnit.totalPowerConsumption += equipment.powerConsumption

  return true
}

/**
 * Uninstall equipment from unit
 */
export function uninstallEquipment(
  equippedUnit: EquippedUnit,
  equipmentId: string
): Equipment | null {
  const index = equippedUnit.equipment.findIndex(e => e.equipment.id === equipmentId)
  if (index === -1) return null

  const [removed] = equippedUnit.equipment.splice(index, 1)
  equippedUnit.totalPowerConsumption -= removed.equipment.powerConsumption

  return removed.equipment
}

/**
 * Calculate total stat modifiers from all equipment
 */
export function calculateEquipmentModifiers(
  equipment: InstalledEquipment[]
): EquipmentStatModifiers {
  const total: EquipmentStatModifiers = {
    damageMultiplier: 1,
    shieldMultiplier: 1,
    armorMultiplier: 1,
    hullMultiplier: 1,
    speedMultiplier: 1,
    accuracyBonus: 0,
    evasionBonus: 0,
    critChanceBonus: 0,
    critDamageBonus: 0,
    pointDefenseBonus: 0,
    shieldRegenBonus: 0,
    damageTypeBonuses: {},
    resistanceBonuses: {},
    crewCapacityBonus: 0,
    crewCombatBonus: 0,
    boardingPowerBonus: 0,
    antiBoardingBonus: 0,
  }

  for (const installed of equipment) {
    if (!installed.active) continue

    const mods = installed.equipment.statModifiers

    // Multiplicative bonuses
    if (mods.damageMultiplier) total.damageMultiplier! *= mods.damageMultiplier
    if (mods.shieldMultiplier) total.shieldMultiplier! *= mods.shieldMultiplier
    if (mods.armorMultiplier) total.armorMultiplier! *= mods.armorMultiplier
    if (mods.hullMultiplier) total.hullMultiplier! *= mods.hullMultiplier
    if (mods.speedMultiplier) total.speedMultiplier! *= mods.speedMultiplier

    // Additive bonuses
    if (mods.accuracyBonus) total.accuracyBonus! += mods.accuracyBonus
    if (mods.evasionBonus) total.evasionBonus! += mods.evasionBonus
    if (mods.critChanceBonus) total.critChanceBonus! += mods.critChanceBonus
    if (mods.critDamageBonus) total.critDamageBonus! += mods.critDamageBonus
    if (mods.pointDefenseBonus) total.pointDefenseBonus! += mods.pointDefenseBonus
    if (mods.shieldRegenBonus) total.shieldRegenBonus! += mods.shieldRegenBonus
    if (mods.crewCapacityBonus) total.crewCapacityBonus! += mods.crewCapacityBonus
    if (mods.crewCombatBonus) total.crewCombatBonus! += mods.crewCombatBonus
    if (mods.boardingPowerBonus) total.boardingPowerBonus! += mods.boardingPowerBonus
    if (mods.antiBoardingBonus) total.antiBoardingBonus! += mods.antiBoardingBonus

    // Damage type bonuses
    if (mods.damageTypeBonuses) {
      for (const [type, value] of Object.entries(mods.damageTypeBonuses)) {
        const key = type as keyof DamageTypes
        total.damageTypeBonuses![key] = (total.damageTypeBonuses![key] ?? 0) + (value ?? 0)
      }
    }

    // Resistance bonuses
    if (mods.resistanceBonuses) {
      for (const [type, value] of Object.entries(mods.resistanceBonuses)) {
        const key = type as keyof ResistanceTypes
        total.resistanceBonuses![key] = (total.resistanceBonuses![key] ?? 0) + (value ?? 0)
      }
    }
  }

  return total
}

/**
 * Apply equipment modifiers to a unit
 */
export function applyEquipmentToUnit(
  unit: AdvancedCombatUnit,
  equipment: InstalledEquipment[]
): void {
  const mods = calculateEquipmentModifiers(equipment)

  // Apply multiplicative modifiers
  unit.defense.shield.max = Math.floor(unit.defense.shield.max * (mods.shieldMultiplier ?? 1))
  unit.defense.shield.current = Math.floor(unit.defense.shield.current * (mods.shieldMultiplier ?? 1))
  unit.defense.armor.max = Math.floor(unit.defense.armor.max * (mods.armorMultiplier ?? 1))
  unit.defense.armor.current = Math.floor(unit.defense.armor.current * (mods.armorMultiplier ?? 1))
  unit.defense.hull.max = Math.floor(unit.defense.hull.max * (mods.hullMultiplier ?? 1))
  unit.defense.hull.current = Math.floor(unit.defense.hull.current * (mods.hullMultiplier ?? 1))

  // Apply damage multiplier
  unit.damage.ballistic = Math.floor(unit.damage.ballistic * (mods.damageMultiplier ?? 1))
  unit.damage.ionic = Math.floor(unit.damage.ionic * (mods.damageMultiplier ?? 1))
  unit.damage.explosive = Math.floor(unit.damage.explosive * (mods.damageMultiplier ?? 1))

  // Apply additive modifiers
  unit.stats.accuracy += mods.accuracyBonus ?? 0
  unit.stats.evasion += mods.evasionBonus ?? 0
  unit.stats.critChance += mods.critChanceBonus ?? 0
  unit.stats.critMultiplier += mods.critDamageBonus ?? 0
  unit.stats.pointDefense += mods.pointDefenseBonus ?? 0
  unit.defense.shield.regenRate += mods.shieldRegenBonus ?? 0

  // Apply damage type bonuses
  if (mods.damageTypeBonuses) {
    unit.damage.ballistic += mods.damageTypeBonuses.ballistic ?? 0
    unit.damage.ionic += mods.damageTypeBonuses.ionic ?? 0
    unit.damage.explosive += mods.damageTypeBonuses.explosive ?? 0
    unit.damage.hacking += mods.damageTypeBonuses.hacking ?? 0
    unit.damage.boarding += mods.damageTypeBonuses.boarding ?? 0
  }

  // Apply resistance bonuses
  if (mods.resistanceBonuses) {
    unit.resistances.ballistic_resistance += mods.resistanceBonuses.ballistic_resistance ?? 0
    unit.resistances.ionic_resistance += mods.resistanceBonuses.ionic_resistance ?? 0
    unit.resistances.explosive_resistance += mods.resistanceBonuses.explosive_resistance ?? 0
    unit.resistances.hack_defense += mods.resistanceBonuses.hack_defense ?? 0
    unit.resistances.anti_boarding += mods.resistanceBonuses.anti_boarding ?? 0
  }

  // Apply crew bonuses
  unit.crew.max += mods.crewCapacityBonus ?? 0
  unit.crew.combatStrength += mods.crewCombatBonus ?? 0
  unit.damage.boarding += mods.boardingPowerBonus ?? 0
  unit.resistances.anti_boarding += mods.antiBoardingBonus ?? 0
}

/**
 * Process equipment triggers for a specific event
 */
export function processEquipmentTriggers(
  equipment: InstalledEquipment[],
  triggerType: TriggerCondition['trigger'],
  context: {
    unit: AdvancedCombatUnit
    target?: AdvancedCombatUnit
    damage?: number
    random?: () => number
  }
): AbilityEffect[] {
  const random = context.random ?? Math.random
  const effects: AbilityEffect[] = []

  for (const installed of equipment) {
    if (!installed.active) continue

    for (const trigger of installed.equipment.triggers) {
      if (trigger.condition.trigger !== triggerType) continue

      // Check threshold conditions
      if (trigger.condition.threshold !== undefined) {
        if (triggerType === 'on_low_hull') {
          const hullPercent = (context.unit.defense.hull.current / context.unit.defense.hull.max) * 100
          if (hullPercent >= trigger.condition.threshold) continue
        }
      }

      // Check chance
      if (random() * 100 > trigger.condition.chance) continue

      effects.push(trigger.effect)
    }
  }

  return effects
}

/**
 * Use an active ability
 */
export function useAbility(
  equipment: Equipment,
  abilityId: string
): AbilityEffect | null {
  const ability = equipment.abilities.find(a => a.id === abilityId)
  if (!ability) return null
  if (ability.currentCooldown > 0) return null

  // Set cooldown
  ability.currentCooldown = ability.cooldown

  // Consume use for consumables
  if (equipment.activationType === 'consumable') {
    if (equipment.usesRemaining !== undefined) {
      equipment.usesRemaining--
    }
  }

  return ability.effect
}

/**
 * Tick ability cooldowns
 */
export function tickAbilityCooldowns(equipment: InstalledEquipment[]): void {
  for (const installed of equipment) {
    for (const ability of installed.equipment.abilities) {
      if (ability.currentCooldown > 0) {
        ability.currentCooldown--
      }
    }
  }
}

/**
 * Create equipped unit wrapper
 */
export function createEquippedUnit(
  unit: AdvancedCombatUnit,
  maxPower: number = 100
): EquippedUnit {
  return {
    unit,
    equipment: [],
    totalPowerConsumption: 0,
    maxPower,
    slotConfig: DEFAULT_SLOT_CONFIG[unit.unitClass] ?? DEFAULT_SLOT_CONFIG.utility,
  }
}

/**
 * Get all available abilities from equipped items
 */
export function getAvailableAbilities(
  equippedUnit: EquippedUnit
): Array<{ equipment: Equipment; ability: EquipmentAbility }> {
  const abilities: Array<{ equipment: Equipment; ability: EquipmentAbility }> = []

  for (const installed of equippedUnit.equipment) {
    if (!installed.active) continue

    for (const ability of installed.equipment.abilities) {
      if (ability.currentCooldown === 0) {
        // Check consumable uses
        if (
          installed.equipment.activationType === 'consumable' &&
          (installed.equipment.usesRemaining ?? 0) <= 0
        ) {
          continue
        }

        abilities.push({
          equipment: installed.equipment,
          ability,
        })
      }
    }
  }

  return abilities
}
