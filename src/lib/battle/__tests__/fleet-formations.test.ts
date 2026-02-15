/**
 * Fleet Formations Tests
 */

import { describe, it, expect } from 'vitest'
import {
  FORMATIONS,
  DEFAULT_FORMATION_BONUSES,
  applyFormation,
  suggestFormation,
  applyFormationBonusesToUnit,
  type FormationType,
} from '../fleet-formations'
import {
  createAdvancedCombatUnit,
  type AdvancedUnitBaseStats,
  type AdvancedTechLevels,
} from '../advanced-unit'

// ============================================================================
// TEST HELPERS
// ============================================================================

const baseTech: AdvancedTechLevels = {
  weaponsTech: 5,
  shieldTech: 5,
  armorTech: 5,
}

const createTestUnit = (
  unitClass: string,
  key: string,
  overrides: Partial<AdvancedUnitBaseStats> = {}
) => {
  const baseStats: AdvancedUnitBaseStats = {
    unitKey: key,
    unitId: 999,
    type: 'ship',
    category: 'military',
    unitClass: unitClass as any,
    shieldPower: 100,
    armorValue: 50,
    structuralIntegrity: 200,
    damage: { ballistic: 100, ionic: 50, explosive: 50, hacking: 0, boarding: 0 },
    weaponPower: 200,
    cost: { metal: 1000, crystal: 500, deuterium: 100 },
    stats: {
      accuracy: 80,
      evasion: 10,
      critChance: 5,
      critMultiplier: 1.5,
      pointDefense: 20,
      crewCurrent: 25,
      crewMax: 25,
    },
    ...overrides,
  }
  return createAdvancedCombatUnit(baseStats, baseTech, 'player1')
}

const createFleet = (composition: Record<string, number>) => {
  const units = []
  for (const [key, count] of Object.entries(composition)) {
    const [unitClass, unitKey] = key.split(':')
    for (let i = 0; i < count; i++) {
      units.push(createTestUnit(unitClass, unitKey || unitClass))
    }
  }
  return units
}

// ============================================================================
// FORMATIONS DEFINITION TESTS
// ============================================================================

describe('FORMATIONS', () => {
  it('should have all formation types defined', () => {
    const expectedTypes: FormationType[] = [
      'line',
      'arrow',
      'defensive_sphere',
      'carrier_escort',
      'pincer',
      'echelon',
      'wolf_pack',
      'siege',
      'ambush',
      'scattered',
    ]

    for (const type of expectedTypes) {
      expect(FORMATIONS[type]).toBeDefined()
      expect(FORMATIONS[type].type).toBe(type)
      expect(FORMATIONS[type].name).toBeDefined()
      expect(FORMATIONS[type].description).toBeDefined()
    }
  })

  it('should have valid position percentages totaling 100', () => {
    for (const [type, formation] of Object.entries(FORMATIONS)) {
      const totalPercent = formation.positions.reduce(
        (sum, pos) => sum + pos.fleetPercentage,
        0
      )
      expect(totalPercent).toBeCloseTo(100, 0)
    }
  })

  it('should have valid requirements', () => {
    for (const [type, formation] of Object.entries(FORMATIONS)) {
      expect(formation.requirements.minShips).toBeGreaterThan(0)
      expect(formation.requirements.maxShips).toBeGreaterThanOrEqual(0)
    }
  })
})

// ============================================================================
// DEFAULT BONUSES TESTS
// ============================================================================

describe('DEFAULT_FORMATION_BONUSES', () => {
  it('should have neutral multipliers', () => {
    expect(DEFAULT_FORMATION_BONUSES.attackMultiplier).toBe(1.0)
    expect(DEFAULT_FORMATION_BONUSES.defenseMultiplier).toBe(1.0)
    expect(DEFAULT_FORMATION_BONUSES.speedMultiplier).toBe(1.0)
  })

  it('should have zero additive bonuses', () => {
    expect(DEFAULT_FORMATION_BONUSES.accuracyBonus).toBe(0)
    expect(DEFAULT_FORMATION_BONUSES.evasionBonus).toBe(0)
    expect(DEFAULT_FORMATION_BONUSES.critBonus).toBe(0)
    expect(DEFAULT_FORMATION_BONUSES.shieldBonus).toBe(0)
    expect(DEFAULT_FORMATION_BONUSES.coordinationBonus).toBe(0)
  })
})

// ============================================================================
// APPLY FORMATION TESTS
// ============================================================================

describe('applyFormation', () => {
  it('should apply line formation to a mixed fleet', () => {
    const fleet = createFleet({
      'cruiser:cruiser': 10,
      'battleship:battleship': 5,
      'frigate:frigate': 5,
    })

    const result = applyFormation(fleet, 'line')

    expect(result.formation.type).toBe('line')
    expect(result.units.length).toBe(fleet.length)
    expect(result.effectiveness).toBeGreaterThan(0)
  })

  it('should throw error if requirements not met', () => {
    const smallFleet = createFleet({
      'fighter:fighter': 3,
    })

    expect(() => applyFormation(smallFleet, 'line')).toThrow()
  })

  it('should assign units to correct positions', () => {
    const fleet = createFleet({
      'battleship:battleship': 10,
      'cruiser:cruiser': 10,
      'frigate:frigate': 10,
    })

    const result = applyFormation(fleet, 'line')

    const vanguardUnits = result.units.filter(u => u.position === 'vanguard')
    const centerUnits = result.units.filter(u => u.position === 'center')
    const rearUnits = result.units.filter(u => u.position === 'rear')

    // Should have units in all positions
    expect(vanguardUnits.length).toBeGreaterThan(0)
    expect(centerUnits.length).toBeGreaterThan(0)
    expect(rearUnits.length).toBeGreaterThan(0)
  })

  it('should calculate global bonuses correctly', () => {
    const fleet = createFleet({
      'cruiser:cruiser': 20,
      'battleship:battleship': 10,
    })

    const result = applyFormation(fleet, 'arrow')

    // Arrow formation has attack bonus
    expect(result.totalBonuses.attackMultiplier).toBeGreaterThan(1)
    // Arrow formation has defense penalty
    expect(result.totalBonuses.defenseMultiplier).toBeLessThan(1)
  })

  it('should apply composition modifiers', () => {
    // Create fleet with many cruisers for pincer bonus
    const fleet = createFleet({
      'cruiser:cruiser': 30,
      'battleship:battleship': 10,
      'fighter:fighter': 10,
    })

    const result = applyFormation(fleet, 'pincer')

    // Should have cruiser pincer bonus applied
    expect(result.compositionBonusesApplied.some(
      b => b.includes('Cruiser')
    )).toBe(true)
  })
})

// ============================================================================
// SUGGEST FORMATION TESTS
// ============================================================================

describe('suggestFormation', () => {
  it('should suggest formations for a fleet', () => {
    const fleet = createFleet({
      'cruiser:cruiser': 15,
      'battleship:battleship': 10,
      'frigate:frigate': 5,
    })

    const suggestions = suggestFormation(fleet)

    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions[0].effectiveness).toBeGreaterThan(0)
  })

  it('should sort suggestions by effectiveness', () => {
    const fleet = createFleet({
      'fighter:fighter': 40,
      'corvette:corvette': 10,
    })

    const suggestions = suggestFormation(fleet)

    // Should be sorted descending
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1].effectiveness).toBeGreaterThanOrEqual(
        suggestions[i].effectiveness
      )
    }
  })

  it('should prefer wolf_pack for small fighter fleets', () => {
    const fleet = createFleet({
      'fighter:fighter': 20,
    })

    const suggestions = suggestFormation(fleet)
    const wolfPackSuggestion = suggestions.find(s => s.formation === 'wolf_pack')

    expect(wolfPackSuggestion).toBeDefined()
    expect(wolfPackSuggestion!.effectiveness).toBeGreaterThan(0.5)
  })
})

// ============================================================================
// APPLY BONUSES TO UNIT TESTS
// ============================================================================

describe('applyFormationBonusesToUnit', () => {
  it('should apply attack multiplier', () => {
    const unit = createTestUnit('cruiser', 'cruiser')
    const originalBallistic = unit.damage.ballistic

    const formationUnit = {
      unit,
      position: 'vanguard' as const,
      role: 'assault' as const,
      bonuses: { ...DEFAULT_FORMATION_BONUSES },
    }

    const totalBonuses = {
      ...DEFAULT_FORMATION_BONUSES,
      attackMultiplier: 1.2,
    }

    applyFormationBonusesToUnit(unit, formationUnit, totalBonuses)

    expect(unit.damage.ballistic).toBe(Math.floor(originalBallistic * 1.2))
  })

  it('should apply defense multiplier to shields and armor', () => {
    const unit = createTestUnit('battleship', 'battleship')
    const originalShield = unit.defense.shield.max
    const originalArmor = unit.defense.armor.max

    const formationUnit = {
      unit,
      position: 'center' as const,
      role: 'defense' as const,
      bonuses: { ...DEFAULT_FORMATION_BONUSES },
    }

    const totalBonuses = {
      ...DEFAULT_FORMATION_BONUSES,
      defenseMultiplier: 1.15,
    }

    applyFormationBonusesToUnit(unit, formationUnit, totalBonuses)

    expect(unit.defense.shield.max).toBe(Math.floor(originalShield * 1.15))
    expect(unit.defense.armor.max).toBe(Math.floor(originalArmor * 1.15))
  })

  it('should apply stat bonuses', () => {
    const unit = createTestUnit('fighter', 'fighter')
    const originalAccuracy = unit.stats.accuracy
    const originalEvasion = unit.stats.evasion
    const originalCrit = unit.stats.critChance

    const formationUnit = {
      unit,
      position: 'flanks' as const,
      role: 'interception' as const,
      bonuses: { ...DEFAULT_FORMATION_BONUSES },
    }

    const totalBonuses = {
      ...DEFAULT_FORMATION_BONUSES,
      accuracyBonus: 5,
      evasionBonus: 10,
      critBonus: 3,
    }

    applyFormationBonusesToUnit(unit, formationUnit, totalBonuses)

    expect(unit.stats.accuracy).toBe(originalAccuracy + 5)
    expect(unit.stats.evasion).toBe(originalEvasion + 10)
    expect(unit.stats.critChance).toBe(originalCrit + 3)
  })

  it('should apply shield bonus', () => {
    const unit = createTestUnit('battleship', 'battleship')
    const originalShield = unit.defense.shield.max

    const formationUnit = {
      unit,
      position: 'vanguard' as const,
      role: 'defense' as const,
      bonuses: { ...DEFAULT_FORMATION_BONUSES },
    }

    const totalBonuses = {
      ...DEFAULT_FORMATION_BONUSES,
      shieldBonus: 0.2, // 20% shield bonus
    }

    applyFormationBonusesToUnit(unit, formationUnit, totalBonuses)

    const expectedIncrease = Math.floor(originalShield * 0.2)
    expect(unit.defense.shield.max).toBe(originalShield + expectedIncrease)
  })
})

// ============================================================================
// SPECIFIC FORMATION TESTS
// ============================================================================

describe('Specific Formations', () => {
  describe('Arrow Formation', () => {
    it('should provide attack boost and defense penalty', () => {
      const arrow = FORMATIONS.arrow
      expect(arrow.globalBonuses.attackMultiplier).toBeGreaterThan(1)
      expect(arrow.globalBonuses.defenseMultiplier).toBeLessThan(1)
    })
  })

  describe('Defensive Sphere', () => {
    it('should provide defense boost and attack penalty', () => {
      const sphere = FORMATIONS.defensive_sphere
      expect(sphere.globalBonuses.defenseMultiplier).toBeGreaterThan(1)
      expect(sphere.globalBonuses.attackMultiplier).toBeLessThan(1)
    })
  })

  describe('Wolf Pack', () => {
    it('should have ship count limits', () => {
      const wolfPack = FORMATIONS.wolf_pack
      expect(wolfPack.requirements.maxShips).toBeGreaterThan(0)
      expect(wolfPack.requirements.maxShips).toBeLessThanOrEqual(50)
    })

    it('should provide high evasion and speed', () => {
      const wolfPack = FORMATIONS.wolf_pack
      expect(wolfPack.globalBonuses.evasionBonus).toBeGreaterThan(10)
      expect(wolfPack.globalBonuses.speedMultiplier).toBeGreaterThan(1)
    })
  })

  describe('Siege Formation', () => {
    it('should require capital ships', () => {
      const siege = FORMATIONS.siege
      expect(siege.requirements.minCapitalShipPercent).toBeGreaterThan(0)
    })

    it('should have explosive damage bonus', () => {
      const siege = FORMATIONS.siege
      expect(siege.globalBonuses.damageTypeBonuses?.explosive).toBeGreaterThan(0)
    })
  })

  describe('Ambush Formation', () => {
    it('should have high crit bonus for first strike', () => {
      const ambush = FORMATIONS.ambush
      expect(ambush.globalBonuses.critBonus).toBeGreaterThan(10)
    })
  })
})
