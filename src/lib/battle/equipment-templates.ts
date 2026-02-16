/**
 * Equipment Templates and Slot Configuration
 *
 * This module contains all predefined equipment templates and
 * slot configurations by unit class. Extracted from equipment-system.ts
 * to reduce file size and improve maintainability.
 */

import type { UnitClass } from './advanced-unit'
import type {
  Equipment,
  EquipmentSlot,
  EquipmentAbility,
  AbilityEffect,
  TriggerCondition,
} from './equipment-system'

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
    weapon: 4,
    secondary: 2,
    shield: 2,
    armor: 3,
    engine: 1,
    computer: 2,
    special: 2,
    consumable: 3,
  },
  dreadnought: {
    weapon: 5,
    secondary: 3,
    shield: 3,
    armor: 3,
    engine: 1,
    computer: 2,
    special: 3,
    consumable: 3,
  },
  carrier: {
    weapon: 2,
    secondary: 2,
    shield: 2,
    armor: 2,
    engine: 1,
    computer: 2,
    special: 4,
    consumable: 2,
  },
  transport: {
    weapon: 0,
    secondary: 1,
    shield: 2,
    armor: 2,
    engine: 2,
    computer: 1,
    special: 1,
    consumable: 2,
  },
  utility: {
    weapon: 0,
    secondary: 1,
    shield: 1,
    armor: 1,
    engine: 2,
    computer: 2,
    special: 1,
    consumable: 0,
  },
  // Defense structures
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
// PREDEFINED EQUIPMENT TEMPLATES
// ============================================================================

/**
 * Common equipment templates
 * These can be instantiated using createEquipment() from equipment-system.ts
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
        } as AbilityEffect,
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
        } as AbilityEffect,
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
        } as AbilityEffect,
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
        } as AbilityEffect,
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
        } as AbilityEffect,
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
        } as AbilityEffect,
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
        } as AbilityEffect,
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
        } as AbilityEffect,
      },
    ],
    triggers: [],
    requirements: { techLevels: { computerTech: 12 } },
    installCost: { metal: 8000, crystal: 15000, deuterium: 2000 },
    powerConsumption: 18,
    mass: 30,
  },

  fire_control: {
    name: 'Integrated Fire Control',
    description: 'Coordinates all weapon systems for maximum efficiency.',
    slot: 'computer',
    rarity: 'rare',
    activationType: 'passive',
    compatibleClasses: ['battleship', 'dreadnought'],
    statModifiers: {
      damageMultiplier: 1.15,
      accuracyBonus: 15,
      critDamageBonus: 0.25,
    },
    abilities: [],
    triggers: [],
    requirements: { techLevels: { computerTech: 14 } },
    installCost: { metal: 12000, crystal: 18000, deuterium: 3000 },
    powerConsumption: 20,
    mass: 40,
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
        } as AbilityEffect,
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
        } as AbilityEffect,
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
        } as AbilityEffect,
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
// TEMPLATE UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all equipment templates of a specific slot type
 */
export function getTemplatesBySlot(slot: EquipmentSlot): Record<string, Omit<Equipment, 'id'>> {
  const result: Record<string, Omit<Equipment, 'id'>> = {}
  for (const [key, template] of Object.entries(EQUIPMENT_TEMPLATES)) {
    if (template.slot === slot) {
      result[key] = template
    }
  }
  return result
}

/**
 * Get all equipment templates of a specific rarity
 */
export function getTemplatesByRarity(rarity: Equipment['rarity']): Record<string, Omit<Equipment, 'id'>> {
  const result: Record<string, Omit<Equipment, 'id'>> = {}
  for (const [key, template] of Object.entries(EQUIPMENT_TEMPLATES)) {
    if (template.rarity === rarity) {
      result[key] = template
    }
  }
  return result
}

/**
 * Get all equipment templates compatible with a specific unit class
 */
export function getTemplatesForClass(unitClass: UnitClass): Record<string, Omit<Equipment, 'id'>> {
  const result: Record<string, Omit<Equipment, 'id'>> = {}
  for (const [key, template] of Object.entries(EQUIPMENT_TEMPLATES)) {
    if (template.compatibleClasses.includes(unitClass)) {
      result[key] = template
    }
  }
  return result
}

/**
 * Get template keys (IDs) for all equipment
 */
export function getTemplateKeys(): string[] {
  return Object.keys(EQUIPMENT_TEMPLATES)
}
