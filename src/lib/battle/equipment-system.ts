/**
 * Ship Equipment System
 *
 * Modular equipment that can be installed on ships to modify stats,
 * add special abilities, and provide tactical advantages in combat.
 */

import type { DamageTypes, ResistanceTypes, StatusEffectType } from './damage-types'
import type { AdvancedCombatUnit, UnitClass } from './advanced-unit'

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
// EQUIPMENT SLOTS CONFIGURATION
// ============================================================================

/**
 * Default slot configuration by unit class
 */
export const DEFAULT_SLOT_CONFIG: Record<UnitClass, Record<EquipmentSlot, number>> = {
  fighter: {
    weapon: 1,
    secondary: 0,
    shield: 1,
    armor: 1,
    engine: 1,
    computer: 0,
    special: 0,
    consumable: 1,
  },
  corvette: {
    weapon: 1,
    secondary: 1,
    shield: 1,
    armor: 1,
    engine: 1,
    computer: 1,
    special: 0,
    consumable: 1,
  },
  frigate: {
    weapon: 2,
    secondary: 1,
    shield: 1,
    armor: 1,
    engine: 1,
    computer: 1,
    special: 1,
    consumable: 2,
  },
  cruiser: {
    weapon: 2,
    secondary: 2,
    shield: 2,
    armor: 2,
    engine: 1,
    computer: 1,
    special: 1,
    consumable: 2,
  },
  battlecruiser: {
    weapon: 3,
    secondary: 2,
    shield: 2,
    armor: 2,
    engine: 1,
    computer: 2,
    special: 1,
    consumable: 2,
  },
  battleship: {
    weapon: 3,
    secondary: 2,
    shield: 2,
    armor: 3,
    engine: 1,
    computer: 2,
    special: 2,
    consumable: 3,
  },
  dreadnought: {
    weapon: 4,
    secondary: 3,
    shield: 3,
    armor: 3,
    engine: 2,
    computer: 2,
    special: 2,
    consumable: 3,
  },
  carrier: {
    weapon: 2,
    secondary: 2,
    shield: 2,
    armor: 2,
    engine: 1,
    computer: 3,
    special: 3,
    consumable: 3,
  },
  transport: {
    weapon: 1,
    secondary: 1,
    shield: 1,
    armor: 2,
    engine: 2,
    computer: 1,
    special: 1,
    consumable: 2,
  },
  utility: {
    weapon: 1,
    secondary: 1,
    shield: 1,
    armor: 1,
    engine: 1,
    computer: 2,
    special: 2,
    consumable: 2,
  },
  // Defense structures have fixed slots
  platform: {
    weapon: 2,
    secondary: 1,
    shield: 2,
    armor: 2,
    engine: 0,
    computer: 1,
    special: 1,
    consumable: 1,
  },
  turret: {
    weapon: 1,
    secondary: 0,
    shield: 1,
    armor: 1,
    engine: 0,
    computer: 1,
    special: 0,
    consumable: 0,
  },
  defense: {
    weapon: 2,
    secondary: 1,
    shield: 2,
    armor: 3,
    engine: 0,
    computer: 1,
    special: 1,
    consumable: 0,
  },
  missile: {
    weapon: 3,
    secondary: 0,
    shield: 1,
    armor: 1,
    engine: 0,
    computer: 2,
    special: 1,
    consumable: 0,
  },
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
// PREDEFINED EQUIPMENT
// ============================================================================

/**
 * Common equipment templates
 */
export const EQUIPMENT_TEMPLATES: Record<string, Omit<Equipment, 'id'>> = {
  // ========== WEAPONS ==========
  gauss_cannon: {
    name: 'Gauss Cannon',
    description: 'Electromagnetic railgun with high armor penetration.',
    slot: 'weapon',
    rarity: 'common',
    activationType: 'passive',
    compatibleClasses: ['frigate', 'cruiser', 'battlecruiser', 'battleship', 'dreadnought'],
    statModifiers: {
      damageTypeBonuses: { ballistic: 50 },
      accuracyBonus: 5,
    },
    abilities: [],
    triggers: [],
    requirements: {},
    installCost: { metal: 5000, crystal: 2000, deuterium: 500 },
    powerConsumption: 10,
    mass: 100,
  },

  ion_disruptor: {
    name: 'Ion Disruptor',
    description: 'Specialized weapon that disrupts enemy shields and systems.',
    slot: 'weapon',
    rarity: 'uncommon',
    activationType: 'passive',
    compatibleClasses: ['cruiser', 'battlecruiser', 'battleship', 'dreadnought'],
    statModifiers: {
      damageTypeBonuses: { ionic: 80 },
    },
    abilities: [],
    triggers: [
      {
        condition: { trigger: 'on_hit', chance: 20 },
        effect: {
          type: 'debuff',
          target: 'enemy',
          statusEffect: 'shield_disruption',
          duration: 2,
          strength: 50,
        },
      },
    ],
    requirements: { techLevels: { weaponsTech: 8 } },
    installCost: { metal: 8000, crystal: 6000, deuterium: 1000 },
    powerConsumption: 15,
    mass: 80,
  },

  plasma_lance: {
    name: 'Plasma Lance',
    description: 'High-energy plasma weapon with devastating critical damage.',
    slot: 'weapon',
    rarity: 'rare',
    activationType: 'passive',
    compatibleClasses: ['battleship', 'dreadnought'],
    statModifiers: {
      damageTypeBonuses: { explosive: 100, ballistic: 50 },
      critChanceBonus: 10,
      critDamageBonus: 0.5,
    },
    abilities: [],
    triggers: [],
    requirements: { techLevels: { weaponsTech: 12 } },
    installCost: { metal: 15000, crystal: 10000, deuterium: 3000 },
    powerConsumption: 25,
    mass: 150,
  },

  torpedo_launcher: {
    name: 'Torpedo Launcher',
    description: 'Launches guided torpedoes with high explosive damage.',
    slot: 'secondary',
    rarity: 'common',
    activationType: 'passive',
    compatibleClasses: ['corvette', 'frigate', 'cruiser', 'battlecruiser', 'battleship', 'dreadnought'],
    statModifiers: {
      damageTypeBonuses: { explosive: 75 },
    },
    abilities: [
      {
        id: 'salvo',
        name: 'Torpedo Salvo',
        description: 'Fire a concentrated salvo at a single target.',
        cooldown: 3,
        currentCooldown: 0,
        energyCost: 20,
        duration: 0,
        effect: {
          type: 'damage',
          damage: { explosive: 200 },
          targetCount: 1,
          areaEffect: false,
          penetration: 20,
        },
      },
    ],
    triggers: [],
    requirements: {},
    installCost: { metal: 4000, crystal: 2000, deuterium: 1000 },
    powerConsumption: 8,
    mass: 60,
  },

  // ========== SHIELDS ==========
  reinforced_shields: {
    name: 'Reinforced Shield Generator',
    description: 'Enhanced shield generator with improved capacity.',
    slot: 'shield',
    rarity: 'common',
    activationType: 'passive',
    compatibleClasses: ['fighter', 'corvette', 'frigate', 'cruiser', 'battlecruiser', 'battleship', 'dreadnought', 'carrier', 'transport', 'utility'],
    statModifiers: {
      shieldMultiplier: 1.2,
      shieldRegenBonus: 5,
    },
    abilities: [],
    triggers: [],
    requirements: {},
    installCost: { metal: 3000, crystal: 4000, deuterium: 500 },
    powerConsumption: 10,
    mass: 50,
  },

  adaptive_shields: {
    name: 'Adaptive Shield Matrix',
    description: 'Shields that adapt to incoming damage types.',
    slot: 'shield',
    rarity: 'rare',
    activationType: 'passive',
    compatibleClasses: ['cruiser', 'battlecruiser', 'battleship', 'dreadnought', 'carrier'],
    statModifiers: {
      shieldMultiplier: 1.15,
      resistanceBonuses: {
        ballistic_resistance: 10,
        ionic_resistance: 10,
        explosive_resistance: 10,
      },
    },
    abilities: [],
    triggers: [
      {
        condition: { trigger: 'on_damage', chance: 100 },
        effect: {
          type: 'buff',
          target: 'self',
          modifiers: {
            resistanceBonuses: {
              ballistic_resistance: 5,
              ionic_resistance: 5,
              explosive_resistance: 5,
            },
          },
          duration: 1,
        },
      },
    ],
    requirements: { techLevels: { shieldTech: 10 } },
    installCost: { metal: 10000, crystal: 15000, deuterium: 2000 },
    powerConsumption: 20,
    mass: 80,
  },

  emergency_shields: {
    name: 'Emergency Shield Booster',
    description: 'Activatable shield boost for critical moments.',
    slot: 'shield',
    rarity: 'uncommon',
    activationType: 'active',
    compatibleClasses: ['cruiser', 'battlecruiser', 'battleship', 'dreadnought', 'carrier'],
    statModifiers: {
      shieldMultiplier: 1.1,
    },
    abilities: [
      {
        id: 'emergency_boost',
        name: 'Emergency Shield Boost',
        description: 'Instantly restore 50% shields and increase regen.',
        cooldown: 5,
        currentCooldown: 0,
        energyCost: 30,
        duration: 2,
        effect: {
          type: 'repair',
          target: 'self',
          repairAmount: 50,
          repairType: 'shield',
        },
      },
    ],
    triggers: [],
    requirements: { techLevels: { shieldTech: 6 } },
    installCost: { metal: 6000, crystal: 8000, deuterium: 1500 },
    powerConsumption: 15,
    mass: 60,
  },

  // ========== ARMOR ==========
  reactive_armor: {
    name: 'Reactive Armor Plating',
    description: 'Armor that detonates outward to deflect incoming projectiles.',
    slot: 'armor',
    rarity: 'uncommon',
    activationType: 'passive',
    compatibleClasses: ['frigate', 'cruiser', 'battlecruiser', 'battleship', 'dreadnought', 'carrier', 'transport'],
    statModifiers: {
      armorMultiplier: 1.25,
      resistanceBonuses: {
        ballistic_resistance: 15,
        explosive_resistance: 10,
      },
    },
    abilities: [],
    triggers: [],
    requirements: { techLevels: { armorTech: 8 } },
    installCost: { metal: 8000, crystal: 3000, deuterium: 500 },
    powerConsumption: 5,
    mass: 150,
  },

  nanobot_hull: {
    name: 'Nanobot Hull Repair System',
    description: 'Self-repairing hull using nanobots.',
    slot: 'armor',
    rarity: 'rare',
    activationType: 'triggered',
    compatibleClasses: ['cruiser', 'battlecruiser', 'battleship', 'dreadnought', 'carrier'],
    statModifiers: {
      hullMultiplier: 1.1,
    },
    abilities: [],
    triggers: [
      {
        condition: { trigger: 'on_round_end', chance: 100 },
        effect: {
          type: 'repair',
          target: 'self',
          repairAmount: 5,
          repairType: 'hull',
        },
      },
    ],
    requirements: { techLevels: { armorTech: 12 } },
    installCost: { metal: 12000, crystal: 8000, deuterium: 3000 },
    powerConsumption: 12,
    mass: 40,
  },

  // ========== ENGINES ==========
  afterburner: {
    name: 'Combat Afterburner',
    description: 'Emergency speed boost for evasion.',
    slot: 'engine',
    rarity: 'common',
    activationType: 'active',
    compatibleClasses: ['fighter', 'corvette', 'frigate', 'cruiser', 'battlecruiser'],
    statModifiers: {
      speedMultiplier: 1.1,
      evasionBonus: 5,
    },
    abilities: [
      {
        id: 'afterburn',
        name: 'Afterburn',
        description: 'Massively increase evasion for 2 rounds.',
        cooldown: 4,
        currentCooldown: 0,
        energyCost: 15,
        duration: 2,
        effect: {
          type: 'buff',
          target: 'self',
          modifiers: {
            evasionBonus: 30,
            speedMultiplier: 1.5,
          },
          duration: 2,
        },
      },
    ],
    triggers: [],
    requirements: {},
    installCost: { metal: 3000, crystal: 2000, deuterium: 2000 },
    powerConsumption: 8,
    mass: 30,
  },

  // ========== COMPUTER SYSTEMS ==========
  targeting_computer: {
    name: 'Advanced Targeting Computer',
    description: 'Improves weapon accuracy and critical hit chance.',
    slot: 'computer',
    rarity: 'common',
    activationType: 'passive',
    compatibleClasses: ['corvette', 'frigate', 'cruiser', 'battlecruiser', 'battleship', 'dreadnought', 'carrier'],
    statModifiers: {
      accuracyBonus: 10,
      critChanceBonus: 5,
    },
    abilities: [],
    triggers: [],
    requirements: {},
    installCost: { metal: 2000, crystal: 5000, deuterium: 500 },
    powerConsumption: 8,
    mass: 20,
  },

  ecm_suite: {
    name: 'ECM Suite',
    description: 'Electronic countermeasures that disrupt enemy targeting.',
    slot: 'computer',
    rarity: 'uncommon',
    activationType: 'passive',
    compatibleClasses: ['frigate', 'cruiser', 'battlecruiser', 'battleship', 'dreadnought', 'carrier', 'utility'],
    statModifiers: {
      evasionBonus: 15,
      resistanceBonuses: {
        hack_defense: 20,
      },
    },
    abilities: [
      {
        id: 'jam',
        name: 'Jamming Pulse',
        description: 'Reduce enemy accuracy for 2 rounds.',
        cooldown: 4,
        currentCooldown: 0,
        energyCost: 25,
        duration: 2,
        effect: {
          type: 'debuff',
          target: 'all_enemies',
          statusEffect: 'sensors_jammed',
          duration: 2,
          strength: 20,
        },
      },
    ],
    triggers: [],
    requirements: { techLevels: { computerTech: 8 } },
    installCost: { metal: 5000, crystal: 8000, deuterium: 1000 },
    powerConsumption: 12,
    mass: 25,
  },

  hacking_module: {
    name: 'Offensive Hacking Module',
    description: 'Enables cyber attacks against enemy systems.',
    slot: 'computer',
    rarity: 'rare',
    activationType: 'passive',
    compatibleClasses: ['frigate', 'cruiser', 'battlecruiser', 'carrier', 'utility'],
    statModifiers: {
      damageTypeBonuses: { hacking: 100 },
    },
    abilities: [
      {
        id: 'system_breach',
        name: 'System Breach',
        description: 'Attempt to disable an enemy ship\'s weapons.',
        cooldown: 5,
        currentCooldown: 0,
        energyCost: 40,
        duration: 0,
        effect: {
          type: 'debuff',
          target: 'enemy',
          statusEffect: 'weapons_disabled',
          duration: 2,
          strength: 100,
        },
      },
    ],
    triggers: [],
    requirements: { techLevels: { computerTech: 12 } },
    installCost: { metal: 8000, crystal: 15000, deuterium: 2000 },
    powerConsumption: 18,
    mass: 30,
  },

  // ========== SPECIAL ==========
  boarding_bay: {
    name: 'Assault Boarding Bay',
    description: 'Facility for launching boarding parties.',
    slot: 'special',
    rarity: 'uncommon',
    activationType: 'passive',
    compatibleClasses: ['cruiser', 'battlecruiser', 'battleship', 'dreadnought', 'carrier'],
    statModifiers: {
      boardingPowerBonus: 50,
      crewCapacityBonus: 20,
    },
    abilities: [],
    triggers: [],
    requirements: {},
    installCost: { metal: 10000, crystal: 5000, deuterium: 2000 },
    powerConsumption: 15,
    mass: 200,
  },

  point_defense_array: {
    name: 'Point Defense Array',
    description: 'Automated defense systems against missiles and fighters.',
    slot: 'special',
    rarity: 'common',
    activationType: 'passive',
    compatibleClasses: ['frigate', 'cruiser', 'battlecruiser', 'battleship', 'dreadnought', 'carrier'],
    statModifiers: {
      pointDefenseBonus: 30,
    },
    abilities: [],
    triggers: [],
    requirements: {},
    installCost: { metal: 4000, crystal: 3000, deuterium: 500 },
    powerConsumption: 10,
    mass: 50,
  },

  command_bridge: {
    name: 'Enhanced Command Bridge',
    description: 'Improved command and control for fleet coordination.',
    slot: 'special',
    rarity: 'rare',
    activationType: 'passive',
    compatibleClasses: ['battleship', 'dreadnought', 'carrier'],
    statModifiers: {
      accuracyBonus: 5,
      crewCombatBonus: 20,
    },
    abilities: [
      {
        id: 'rally',
        name: 'Rally Fleet',
        description: 'Boost nearby allies\' combat effectiveness.',
        cooldown: 6,
        currentCooldown: 0,
        energyCost: 50,
        duration: 3,
        effect: {
          type: 'buff',
          target: 'all_allies',
          modifiers: {
            damageMultiplier: 1.1,
            accuracyBonus: 10,
            critChanceBonus: 5,
          },
          duration: 3,
        },
      },
    ],
    triggers: [],
    requirements: { techLevels: { computerTech: 10 } },
    installCost: { metal: 15000, crystal: 20000, deuterium: 5000 },
    powerConsumption: 25,
    mass: 100,
  },

  // ========== CONSUMABLES ==========
  repair_nanites: {
    name: 'Emergency Repair Nanites',
    description: 'One-time use emergency repair system.',
    slot: 'consumable',
    rarity: 'common',
    activationType: 'consumable',
    compatibleClasses: ['fighter', 'corvette', 'frigate', 'cruiser', 'battlecruiser', 'battleship', 'dreadnought', 'carrier', 'transport', 'utility'],
    statModifiers: {},
    abilities: [
      {
        id: 'emergency_repair',
        name: 'Emergency Repair',
        description: 'Instantly repair 30% of all damage.',
        cooldown: 0,
        currentCooldown: 0,
        energyCost: 0,
        duration: 0,
        effect: {
          type: 'repair',
          target: 'self',
          repairAmount: 30,
          repairType: 'all',
        },
      },
    ],
    triggers: [],
    requirements: {},
    installCost: { metal: 1000, crystal: 2000, deuterium: 500 },
    powerConsumption: 0,
    mass: 5,
    usesRemaining: 1,
  },

  overcharge_cell: {
    name: 'Weapon Overcharge Cell',
    description: 'One-time massive damage boost.',
    slot: 'consumable',
    rarity: 'uncommon',
    activationType: 'consumable',
    compatibleClasses: ['fighter', 'corvette', 'frigate', 'cruiser', 'battlecruiser', 'battleship', 'dreadnought'],
    statModifiers: {},
    abilities: [
      {
        id: 'overcharge',
        name: 'Weapon Overcharge',
        description: 'Double weapon damage for 1 round.',
        cooldown: 0,
        currentCooldown: 0,
        energyCost: 0,
        duration: 1,
        effect: {
          type: 'buff',
          target: 'self',
          modifiers: {
            damageMultiplier: 2.0,
            critChanceBonus: 20,
          },
          duration: 1,
        },
      },
    ],
    triggers: [],
    requirements: {},
    installCost: { metal: 2000, crystal: 3000, deuterium: 1000 },
    powerConsumption: 0,
    mass: 10,
    usesRemaining: 1,
  },
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
