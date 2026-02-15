/**
 * Equipment System Tests
 */

import { describe, it, expect } from 'vitest'
import {
  EQUIPMENT_TEMPLATES,
  DEFAULT_SLOT_CONFIG,
  createEquipment,
  canInstallEquipment,
  installEquipment,
  uninstallEquipment,
  calculateEquipmentModifiers,
  applyEquipmentToUnit,
  processEquipmentTriggers,
  useAbility,
  tickAbilityCooldowns,
  createEquippedUnit,
  getAvailableAbilities,
  type Equipment,
  type InstalledEquipment,
  type EquippedUnit,
} from '../equipment-system'
import {
  createAdvancedCombatUnit,
  type AdvancedUnitBaseStats,
  type AdvancedTechLevels,
} from '../advanced-unit'

// ============================================================================
// TEST HELPERS
// ============================================================================

const baseTech: AdvancedTechLevels = {
  weaponsTech: 10,
  shieldTech: 10,
  armorTech: 10,
}

const createTestUnit = (
  unitClass: string = 'cruiser',
  overrides: Partial<AdvancedUnitBaseStats> = {}
) => {
  const baseStats: AdvancedUnitBaseStats = {
    unitKey: `test_${unitClass}`,
    unitId: 999,
    type: 'ship',
    category: 'military',
    unitClass: unitClass as any,
    shieldPower: 200,
    armorValue: 100,
    structuralIntegrity: 500,
    damage: { ballistic: 100, ionic: 50, explosive: 50, hacking: 0, boarding: 50 },
    weaponPower: 200,
    cost: { metal: 5000, crystal: 2500, deuterium: 500 },
    stats: {
      accuracy: 80,
      evasion: 10,
      critChance: 5,
      critMultiplier: 1.5,
      pointDefense: 20,
      crewCurrent: 50,
      crewMax: 50,
    },
    ...overrides,
  }
  return createAdvancedCombatUnit(baseStats, baseTech, 'player1')
}

// ============================================================================
// EQUIPMENT TEMPLATES TESTS
// ============================================================================

describe('EQUIPMENT_TEMPLATES', () => {
  it('should have all equipment types defined', () => {
    expect(EQUIPMENT_TEMPLATES.gauss_cannon).toBeDefined()
    expect(EQUIPMENT_TEMPLATES.ion_disruptor).toBeDefined()
    expect(EQUIPMENT_TEMPLATES.plasma_lance).toBeDefined()
    expect(EQUIPMENT_TEMPLATES.torpedo_launcher).toBeDefined()
    expect(EQUIPMENT_TEMPLATES.reinforced_shields).toBeDefined()
    expect(EQUIPMENT_TEMPLATES.adaptive_shields).toBeDefined()
    expect(EQUIPMENT_TEMPLATES.reactive_armor).toBeDefined()
    expect(EQUIPMENT_TEMPLATES.targeting_computer).toBeDefined()
    expect(EQUIPMENT_TEMPLATES.ecm_suite).toBeDefined()
    expect(EQUIPMENT_TEMPLATES.hacking_module).toBeDefined()
    expect(EQUIPMENT_TEMPLATES.boarding_bay).toBeDefined()
    expect(EQUIPMENT_TEMPLATES.repair_nanites).toBeDefined()
  })

  it('should have valid slot types', () => {
    const validSlots = ['weapon', 'secondary', 'shield', 'armor', 'engine', 'computer', 'special', 'consumable']
    for (const [key, template] of Object.entries(EQUIPMENT_TEMPLATES)) {
      expect(validSlots).toContain(template.slot)
    }
  })

  it('should have valid rarity types', () => {
    const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary']
    for (const [key, template] of Object.entries(EQUIPMENT_TEMPLATES)) {
      expect(validRarities).toContain(template.rarity)
    }
  })
})

// ============================================================================
// DEFAULT SLOT CONFIG TESTS
// ============================================================================

describe('DEFAULT_SLOT_CONFIG', () => {
  it('should have config for all unit classes', () => {
    expect(DEFAULT_SLOT_CONFIG.fighter).toBeDefined()
    expect(DEFAULT_SLOT_CONFIG.corvette).toBeDefined()
    expect(DEFAULT_SLOT_CONFIG.frigate).toBeDefined()
    expect(DEFAULT_SLOT_CONFIG.cruiser).toBeDefined()
    expect(DEFAULT_SLOT_CONFIG.battlecruiser).toBeDefined()
    expect(DEFAULT_SLOT_CONFIG.battleship).toBeDefined()
    expect(DEFAULT_SLOT_CONFIG.dreadnought).toBeDefined()
    expect(DEFAULT_SLOT_CONFIG.carrier).toBeDefined()
  })

  it('should have more slots for larger ships', () => {
    const fighterSlots = Object.values(DEFAULT_SLOT_CONFIG.fighter).reduce((a, b) => a + b, 0)
    const dreadnoughtSlots = Object.values(DEFAULT_SLOT_CONFIG.dreadnought).reduce((a, b) => a + b, 0)
    expect(dreadnoughtSlots).toBeGreaterThan(fighterSlots)
  })

  it('should not have engine slots for defense structures', () => {
    expect(DEFAULT_SLOT_CONFIG.platform.engine).toBe(0)
    expect(DEFAULT_SLOT_CONFIG.turret.engine).toBe(0)
  })
})

// ============================================================================
// CREATE EQUIPMENT TESTS
// ============================================================================

describe('createEquipment', () => {
  it('should create equipment from template', () => {
    const equipment = createEquipment('gauss_cannon')
    expect(equipment).not.toBeNull()
    expect(equipment!.name).toBe('Gauss Cannon')
    expect(equipment!.slot).toBe('weapon')
    expect(equipment!.rarity).toBe('common')
  })

  it('should use provided instance ID', () => {
    const equipment = createEquipment('gauss_cannon', 'my_custom_id')
    expect(equipment!.id).toBe('my_custom_id')
  })

  it('should return null for unknown template', () => {
    const equipment = createEquipment('unknown_template')
    expect(equipment).toBeNull()
  })

  it('should deep copy abilities to avoid shared state', () => {
    const eq1 = createEquipment('torpedo_launcher', 'eq1')
    const eq2 = createEquipment('torpedo_launcher', 'eq2')

    // Modify eq1's ability cooldown
    eq1!.abilities[0].currentCooldown = 3

    // eq2 should not be affected
    expect(eq2!.abilities[0].currentCooldown).toBe(0)
  })
})

// ============================================================================
// CAN INSTALL EQUIPMENT TESTS
// ============================================================================

describe('canInstallEquipment', () => {
  it('should allow compatible equipment', () => {
    const unit = createTestUnit('cruiser')
    const equipment = createEquipment('gauss_cannon')!
    const slotConfig = DEFAULT_SLOT_CONFIG.cruiser

    const result = canInstallEquipment(equipment, unit, [], slotConfig)
    expect(result.canInstall).toBe(true)
  })

  it('should reject incompatible unit class', () => {
    const unit = createTestUnit('fighter')
    const equipment = createEquipment('plasma_lance')! // Only for battleship/dreadnought

    const result = canInstallEquipment(equipment, unit, [], DEFAULT_SLOT_CONFIG.fighter)
    expect(result.canInstall).toBe(false)
    expect(result.reason).toContain('Not compatible')
  })

  it('should reject when slots are full', () => {
    const unit = createTestUnit('cruiser')
    const equipment = createEquipment('gauss_cannon')!
    const slotConfig = DEFAULT_SLOT_CONFIG.cruiser

    // Fill all weapon slots
    const existingEquipment: InstalledEquipment[] = []
    for (let i = 0; i < slotConfig.weapon; i++) {
      existingEquipment.push({
        equipment: createEquipment('gauss_cannon', `cannon_${i}`)!,
        slot: 'weapon',
        slotIndex: i,
        active: true,
      })
    }

    const result = canInstallEquipment(equipment, unit, existingEquipment, slotConfig)
    expect(result.canInstall).toBe(false)
    expect(result.reason).toContain('slots available')
  })
})

// ============================================================================
// INSTALL/UNINSTALL EQUIPMENT TESTS
// ============================================================================

describe('installEquipment', () => {
  it('should install equipment on unit', () => {
    const unit = createTestUnit('cruiser')
    const equippedUnit = createEquippedUnit(unit)
    const equipment = createEquipment('gauss_cannon')!

    const success = installEquipment(equippedUnit, equipment)

    expect(success).toBe(true)
    expect(equippedUnit.equipment.length).toBe(1)
    expect(equippedUnit.equipment[0].equipment.id).toBe(equipment.id)
    expect(equippedUnit.totalPowerConsumption).toBe(equipment.powerConsumption)
  })

  it('should not install incompatible equipment', () => {
    const unit = createTestUnit('fighter')
    const equippedUnit = createEquippedUnit(unit)
    const equipment = createEquipment('plasma_lance')!

    const success = installEquipment(equippedUnit, equipment)

    expect(success).toBe(false)
    expect(equippedUnit.equipment.length).toBe(0)
  })
})

describe('uninstallEquipment', () => {
  it('should remove equipment from unit', () => {
    const unit = createTestUnit('cruiser')
    const equippedUnit = createEquippedUnit(unit)
    const equipment = createEquipment('gauss_cannon')!

    installEquipment(equippedUnit, equipment)
    expect(equippedUnit.equipment.length).toBe(1)

    const removed = uninstallEquipment(equippedUnit, equipment.id)

    expect(removed).not.toBeNull()
    expect(removed!.id).toBe(equipment.id)
    expect(equippedUnit.equipment.length).toBe(0)
    expect(equippedUnit.totalPowerConsumption).toBe(0)
  })

  it('should return null for unknown equipment', () => {
    const unit = createTestUnit('cruiser')
    const equippedUnit = createEquippedUnit(unit)

    const removed = uninstallEquipment(equippedUnit, 'unknown_id')
    expect(removed).toBeNull()
  })
})

// ============================================================================
// CALCULATE EQUIPMENT MODIFIERS TESTS
// ============================================================================

describe('calculateEquipmentModifiers', () => {
  it('should combine multiplicative modifiers', () => {
    const equipment: InstalledEquipment[] = [
      {
        equipment: createEquipment('reinforced_shields')!,
        slot: 'shield',
        slotIndex: 0,
        active: true,
      },
      {
        equipment: {
          ...createEquipment('reinforced_shields')!,
          id: 'shields_2',
        },
        slot: 'shield',
        slotIndex: 1,
        active: true,
      },
    ]

    const mods = calculateEquipmentModifiers(equipment)

    // 1.2 * 1.2 = 1.44
    expect(mods.shieldMultiplier).toBeCloseTo(1.44, 2)
  })

  it('should combine additive modifiers', () => {
    const equipment: InstalledEquipment[] = [
      {
        equipment: createEquipment('targeting_computer')!,
        slot: 'computer',
        slotIndex: 0,
        active: true,
      },
      {
        equipment: createEquipment('ecm_suite')!,
        slot: 'computer',
        slotIndex: 1,
        active: true,
      },
    ]

    const mods = calculateEquipmentModifiers(equipment)

    // targeting_computer: +10 accuracy, +5 crit
    // ecm_suite: +15 evasion
    expect(mods.accuracyBonus).toBe(10)
    expect(mods.critChanceBonus).toBe(5)
    expect(mods.evasionBonus).toBe(15)
  })

  it('should ignore inactive equipment', () => {
    const equipment: InstalledEquipment[] = [
      {
        equipment: createEquipment('targeting_computer')!,
        slot: 'computer',
        slotIndex: 0,
        active: false,
      },
    ]

    const mods = calculateEquipmentModifiers(equipment)

    expect(mods.accuracyBonus).toBe(0)
  })

  it('should combine damage type bonuses', () => {
    const equipment: InstalledEquipment[] = [
      {
        equipment: createEquipment('gauss_cannon')!,
        slot: 'weapon',
        slotIndex: 0,
        active: true,
      },
      {
        equipment: createEquipment('ion_disruptor')!,
        slot: 'weapon',
        slotIndex: 1,
        active: true,
      },
    ]

    const mods = calculateEquipmentModifiers(equipment)

    // gauss_cannon: +50 ballistic
    // ion_disruptor: +80 ionic
    expect(mods.damageTypeBonuses!.ballistic).toBe(50)
    expect(mods.damageTypeBonuses!.ionic).toBe(80)
  })
})

// ============================================================================
// APPLY EQUIPMENT TO UNIT TESTS
// ============================================================================

describe('applyEquipmentToUnit', () => {
  it('should apply stat modifiers to unit', () => {
    const unit = createTestUnit('cruiser')
    const originalAccuracy = unit.stats.accuracy
    const originalShield = unit.defense.shield.max

    const equipment: InstalledEquipment[] = [
      {
        equipment: createEquipment('targeting_computer')!,
        slot: 'computer',
        slotIndex: 0,
        active: true,
      },
      {
        equipment: createEquipment('reinforced_shields')!,
        slot: 'shield',
        slotIndex: 0,
        active: true,
      },
    ]

    applyEquipmentToUnit(unit, equipment)

    expect(unit.stats.accuracy).toBe(originalAccuracy + 10)
    expect(unit.defense.shield.max).toBe(Math.floor(originalShield * 1.2))
  })

  it('should apply damage type bonuses', () => {
    const unit = createTestUnit('cruiser')
    const originalBallistic = unit.damage.ballistic

    const equipment: InstalledEquipment[] = [
      {
        equipment: createEquipment('gauss_cannon')!,
        slot: 'weapon',
        slotIndex: 0,
        active: true,
      },
    ]

    applyEquipmentToUnit(unit, equipment)

    expect(unit.damage.ballistic).toBe(originalBallistic + 50)
  })

  it('should apply resistance bonuses', () => {
    const unit = createTestUnit('cruiser')
    const originalBallisticRes = unit.resistances.ballistic_resistance

    const equipment: InstalledEquipment[] = [
      {
        equipment: createEquipment('reactive_armor')!,
        slot: 'armor',
        slotIndex: 0,
        active: true,
      },
    ]

    applyEquipmentToUnit(unit, equipment)

    // reactive_armor: +15 ballistic_resistance
    expect(unit.resistances.ballistic_resistance).toBe(originalBallisticRes + 15)
  })
})

// ============================================================================
// PROCESS EQUIPMENT TRIGGERS TESTS
// ============================================================================

describe('processEquipmentTriggers', () => {
  it('should process on_hit triggers', () => {
    const unit = createTestUnit('cruiser')
    const equipment: InstalledEquipment[] = [
      {
        equipment: createEquipment('ion_disruptor')!,
        slot: 'weapon',
        slotIndex: 0,
        active: true,
      },
    ]

    // Use deterministic random that always triggers (chance < 20)
    const effects = processEquipmentTriggers(equipment, 'on_hit', {
      unit,
      random: () => 0.1, // 10% < 20% chance
    })

    expect(effects.length).toBe(1)
    expect(effects[0].type).toBe('debuff')
  })

  it('should not trigger if chance fails', () => {
    const unit = createTestUnit('cruiser')
    const equipment: InstalledEquipment[] = [
      {
        equipment: createEquipment('ion_disruptor')!,
        slot: 'weapon',
        slotIndex: 0,
        active: true,
      },
    ]

    // Use deterministic random that never triggers (chance > 20)
    const effects = processEquipmentTriggers(equipment, 'on_hit', {
      unit,
      random: () => 0.5, // 50% > 20% chance
    })

    expect(effects.length).toBe(0)
  })

  it('should ignore inactive equipment', () => {
    const unit = createTestUnit('cruiser')
    const equipment: InstalledEquipment[] = [
      {
        equipment: createEquipment('ion_disruptor')!,
        slot: 'weapon',
        slotIndex: 0,
        active: false,
      },
    ]

    const effects = processEquipmentTriggers(equipment, 'on_hit', {
      unit,
      random: () => 0.1,
    })

    expect(effects.length).toBe(0)
  })
})

// ============================================================================
// ABILITY TESTS
// ============================================================================

describe('useAbility', () => {
  it('should use ability and set cooldown', () => {
    const equipment = createEquipment('torpedo_launcher')!
    const ability = equipment.abilities[0]
    expect(ability.currentCooldown).toBe(0)

    const effect = useAbility(equipment, 'salvo')

    expect(effect).not.toBeNull()
    expect(effect!.type).toBe('damage')
    expect(ability.currentCooldown).toBe(3)
  })

  it('should not use ability on cooldown', () => {
    const equipment = createEquipment('torpedo_launcher')!
    equipment.abilities[0].currentCooldown = 2

    const effect = useAbility(equipment, 'salvo')

    expect(effect).toBeNull()
  })

  it('should consume uses for consumables', () => {
    const equipment = createEquipment('repair_nanites')!
    expect(equipment.usesRemaining).toBe(1)

    useAbility(equipment, 'emergency_repair')

    expect(equipment.usesRemaining).toBe(0)
  })

  it('should return null for unknown ability', () => {
    const equipment = createEquipment('torpedo_launcher')!

    const effect = useAbility(equipment, 'unknown_ability')

    expect(effect).toBeNull()
  })
})

describe('tickAbilityCooldowns', () => {
  it('should reduce cooldowns by 1', () => {
    const equipment: InstalledEquipment[] = [
      {
        equipment: createEquipment('torpedo_launcher')!,
        slot: 'secondary',
        slotIndex: 0,
        active: true,
      },
    ]

    // Set initial cooldown
    equipment[0].equipment.abilities[0].currentCooldown = 3

    tickAbilityCooldowns(equipment)

    expect(equipment[0].equipment.abilities[0].currentCooldown).toBe(2)
  })

  it('should not go below 0', () => {
    const equipment: InstalledEquipment[] = [
      {
        equipment: createEquipment('torpedo_launcher')!,
        slot: 'secondary',
        slotIndex: 0,
        active: true,
      },
    ]

    equipment[0].equipment.abilities[0].currentCooldown = 0

    tickAbilityCooldowns(equipment)

    expect(equipment[0].equipment.abilities[0].currentCooldown).toBe(0)
  })
})

// ============================================================================
// EQUIPPED UNIT TESTS
// ============================================================================

describe('createEquippedUnit', () => {
  it('should create equipped unit wrapper', () => {
    const unit = createTestUnit('cruiser')
    const equippedUnit = createEquippedUnit(unit, 150)

    expect(equippedUnit.unit).toBe(unit)
    expect(equippedUnit.equipment).toEqual([])
    expect(equippedUnit.totalPowerConsumption).toBe(0)
    expect(equippedUnit.maxPower).toBe(150)
    expect(equippedUnit.slotConfig).toEqual(DEFAULT_SLOT_CONFIG.cruiser)
  })

  it('should use default max power', () => {
    const unit = createTestUnit('cruiser')
    const equippedUnit = createEquippedUnit(unit)

    expect(equippedUnit.maxPower).toBe(100)
  })
})

describe('getAvailableAbilities', () => {
  it('should return ready abilities', () => {
    const unit = createTestUnit('cruiser')
    const equippedUnit = createEquippedUnit(unit)

    installEquipment(equippedUnit, createEquipment('torpedo_launcher')!)
    installEquipment(equippedUnit, createEquipment('ecm_suite')!)

    const abilities = getAvailableAbilities(equippedUnit)

    expect(abilities.length).toBe(2) // salvo + jam
  })

  it('should exclude abilities on cooldown', () => {
    const unit = createTestUnit('cruiser')
    const equippedUnit = createEquippedUnit(unit)

    const launcher = createEquipment('torpedo_launcher')!
    launcher.abilities[0].currentCooldown = 2
    installEquipment(equippedUnit, launcher)

    const abilities = getAvailableAbilities(equippedUnit)

    expect(abilities.length).toBe(0)
  })

  it('should exclude consumed consumables', () => {
    const unit = createTestUnit('cruiser')
    const equippedUnit = createEquippedUnit(unit)

    const nanites = createEquipment('repair_nanites')!
    nanites.usesRemaining = 0
    installEquipment(equippedUnit, nanites)

    const abilities = getAvailableAbilities(equippedUnit)

    expect(abilities.length).toBe(0)
  })

  it('should exclude inactive equipment', () => {
    const unit = createTestUnit('cruiser')
    const equippedUnit = createEquippedUnit(unit)

    installEquipment(equippedUnit, createEquipment('torpedo_launcher')!)
    equippedUnit.equipment[0].active = false

    const abilities = getAvailableAbilities(equippedUnit)

    expect(abilities.length).toBe(0)
  })
})
