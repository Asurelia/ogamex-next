/**
 * Advanced Battle Engine Tests
 *
 * Tests for the multi-damage type combat system.
 * These tests focus on the damage calculation logic without database dependencies.
 */

import { describe, it, expect } from 'vitest'
import {
  createDamageTypes,
  createResistanceTypes,
  applyResistances,
  getTotalDamage,
  scaleDamage,
  DAMAGE_EFFECTIVENESS,
  hasStatusEffect,
  tickStatusEffects,
  mergeDamage,
  EMPTY_DAMAGE,
  type StatusEffect,
} from '../damage-types'
import {
  createAdvancedCombatUnit,
  createDefenseLayers,
  canAttack,
  shouldExplode,
  regenerateUnitShields,
  applyDamageToUnit,
  tickUnitStatusEffects,
} from '../advanced-unit'
import type { AdvancedUnitBaseStats, AdvancedTechLevels } from '../advanced-unit'

// ============================================================================
// DAMAGE TYPES TESTS
// ============================================================================

describe('Damage Types', () => {
  describe('createDamageTypes', () => {
    it('should create damage types with defaults', () => {
      const damage = createDamageTypes({ ballistic: 100 })
      expect(damage.ballistic).toBe(100)
      expect(damage.ionic).toBe(0)
      expect(damage.explosive).toBe(0)
      expect(damage.hacking).toBe(0)
      expect(damage.boarding).toBe(0)
    })

    it('should create full damage types', () => {
      const damage = createDamageTypes({
        ballistic: 100,
        ionic: 50,
        explosive: 30,
        hacking: 10,
        boarding: 5,
      })
      expect(getTotalDamage(damage)).toBe(180) // ballistic + ionic + explosive
    })
  })

  describe('applyResistances', () => {
    it('should reduce damage by resistance percentage', () => {
      const damage = createDamageTypes({
        ballistic: 100,
        ionic: 100,
        explosive: 100,
      })
      const resistances = createResistanceTypes({
        ballistic_resistance: 20,
        ionic_resistance: 50,
        explosive_resistance: 10,
      })

      const result = applyResistances(damage, resistances)
      expect(result.ballistic).toBe(80) // 100 * (1 - 0.20)
      expect(result.ionic).toBe(50)     // 100 * (1 - 0.50)
      expect(result.explosive).toBe(90) // 100 * (1 - 0.10)
    })

    it('should not affect boarding damage', () => {
      const damage = createDamageTypes({ boarding: 100 })
      const resistances = createResistanceTypes({ anti_boarding: 50 })
      const result = applyResistances(damage, resistances)
      expect(result.boarding).toBe(100) // Boarding handled separately
    })
  })

  describe('scaleDamage', () => {
    it('should scale all damage types by multiplier', () => {
      const damage = createDamageTypes({
        ballistic: 100,
        ionic: 50,
        explosive: 25,
      })
      const scaled = scaleDamage(damage, 1.5)
      expect(scaled.ballistic).toBe(150)
      expect(scaled.ionic).toBe(75)
      expect(scaled.explosive).toBe(37) // floor(25 * 1.5)
    })
  })

  describe('DAMAGE_EFFECTIVENESS', () => {
    it('should have correct effectiveness values', () => {
      // Ballistic is effective against armor
      expect(DAMAGE_EFFECTIVENESS.ballistic.vsArmor).toBeGreaterThan(1)
      expect(DAMAGE_EFFECTIVENESS.ballistic.vsShield).toBeLessThan(1)

      // Ionic is effective against shields
      expect(DAMAGE_EFFECTIVENESS.ionic.vsShield).toBeGreaterThan(1)
      expect(DAMAGE_EFFECTIVENESS.ionic.vsArmor).toBeLessThan(1)

      // Explosive is effective against hull
      expect(DAMAGE_EFFECTIVENESS.explosive.vsHull).toBeGreaterThan(1)
      expect(DAMAGE_EFFECTIVENESS.explosive.vsShield).toBeLessThan(1)
    })
  })
})

// ============================================================================
// ADVANCED UNIT TESTS
// ============================================================================

describe('Advanced Combat Unit', () => {
  const baseTech: AdvancedTechLevels = {
    weaponsTech: 10,
    shieldTech: 10,
    armorTech: 10,
    ionicTech: 5,
    hackingTech: 3,
    boardingTech: 0,
  }

  const createTestUnit = (overrides: Partial<AdvancedUnitBaseStats> = {}) => {
    const baseStats: AdvancedUnitBaseStats = {
      unitKey: 'test_ship',
      unitId: 999,
      type: 'ship',
      category: 'military',
      unitClass: 'cruiser',
      shieldPower: 100,
      armorValue: 50,
      structuralIntegrity: 200,
      damage: { ballistic: 50, ionic: 30, explosive: 20, hacking: 0, boarding: 0 },
      weaponPower: 100,
      cost: { metal: 1000, crystal: 500, deuterium: 100 },
      ...overrides,
    }
    return createAdvancedCombatUnit(baseStats, baseTech, 'player1')
  }

  describe('createAdvancedCombatUnit', () => {
    it('should apply tech bonuses to stats', () => {
      const unit = createTestUnit()

      // Weapons tech: +10% per level = +100% at level 10
      expect(unit.damage.ballistic).toBe(100) // 50 * 2.0
      expect(unit.damage.explosive).toBe(40)  // 20 * 2.0

      // Ionic tech: +10% per level = +50% at level 5
      expect(unit.damage.ionic).toBe(45) // 30 * 1.5

      // Shield tech: +100%
      expect(unit.defense.shield.max).toBe(200) // 100 * 2.0

      // Armor tech: +100%
      expect(unit.defense.armor.max).toBe(100) // 50 * 2.0
      expect(unit.defense.hull.max).toBe(400)  // 200 * 2.0
    })

    it('should initialize defense layers correctly', () => {
      const unit = createTestUnit()
      expect(unit.defense.shield.current).toBe(unit.defense.shield.max)
      expect(unit.defense.armor.current).toBe(unit.defense.armor.max)
      expect(unit.defense.hull.current).toBe(unit.defense.hull.max)
    })

    it('should set initial status', () => {
      const unit = createTestUnit()
      expect(unit.destroyed).toBe(false)
      expect(unit.disabled).toBe(false)
      expect(unit.statusEffects).toHaveLength(0)
    })
  })

  describe('canAttack', () => {
    it('should return true for healthy unit', () => {
      const unit = createTestUnit()
      expect(canAttack(unit)).toBe(true)
    })

    it('should return false for destroyed unit', () => {
      const unit = createTestUnit()
      unit.destroyed = true
      expect(canAttack(unit)).toBe(false)
    })

    it('should return false for disabled unit', () => {
      const unit = createTestUnit()
      unit.disabled = true
      expect(canAttack(unit)).toBe(false)
    })

    it('should return false with weapons_disabled status', () => {
      const unit = createTestUnit()
      unit.statusEffects.push({
        type: 'weapons_disabled',
        duration: 1,
        strength: 1,
      })
      expect(canAttack(unit)).toBe(false)
    })
  })

  describe('shouldExplode', () => {
    it('should not explode at high hull', () => {
      const unit = createTestUnit()
      unit.defense.hull.current = unit.defense.hull.max * 0.8 // 80% hull

      // With deterministic random (always 0.5), should not explode
      const result = shouldExplode(unit, 0.7, () => 0.5)
      expect(result).toBe(false)
    })

    it('should potentially explode at low hull', () => {
      const unit = createTestUnit()
      unit.defense.hull.current = unit.defense.hull.max * 0.3 // 30% hull

      // Explosion chance = 1 - 0.3 = 70%
      // With random 0.5, should explode (0.5 < 0.7)
      const result = shouldExplode(unit, 0.7, () => 0.5)
      expect(result).toBe(true)
    })
  })

  describe('regenerateUnitShields', () => {
    it('should regenerate shields to max', () => {
      const unit = createTestUnit()
      unit.defense.shield.current = 50
      unit.defense.shield.regenRate = 100 // 100% regen

      regenerateUnitShields(unit)
      expect(unit.defense.shield.current).toBe(unit.defense.shield.max)
    })

    it('should not regenerate for destroyed units', () => {
      const unit = createTestUnit()
      unit.defense.shield.current = 50
      unit.destroyed = true

      regenerateUnitShields(unit)
      expect(unit.defense.shield.current).toBe(50)
    })
  })

  describe('applyDamageToUnit', () => {
    it('should apply damage through layers', () => {
      const unit = createTestUnit()
      const initialShield = unit.defense.shield.current
      const initialArmor = unit.defense.armor.current
      const initialHull = unit.defense.hull.current

      const applied = applyDamageToUnit(unit, 50, 30, 20)

      expect(applied.shield).toBe(50)
      expect(unit.defense.shield.current).toBe(initialShield - 50)
    })

    it('should destroy unit when hull reaches 0', () => {
      const unit = createTestUnit()
      unit.defense.shield.current = 0
      unit.defense.armor.current = 0
      unit.defense.hull.current = 50

      applyDamageToUnit(unit, 0, 0, 100)
      expect(unit.destroyed).toBe(true)
    })
  })
})

// ============================================================================
// DEFENSE LAYERS TESTS
// ============================================================================

describe('Defense Layers', () => {
  describe('createDefenseLayers', () => {
    it('should create layers with correct values', () => {
      const layers = createDefenseLayers(100, 50, 200, 100)

      expect(layers.shield.max).toBe(100)
      expect(layers.shield.current).toBe(100)
      expect(layers.shield.regenRate).toBe(100)

      expect(layers.armor.max).toBe(50)
      expect(layers.armor.current).toBe(50)

      expect(layers.hull.max).toBe(200)
      expect(layers.hull.current).toBe(200)
    })
  })
})

// ============================================================================
// STATUS EFFECTS TESTS
// ============================================================================

describe('Status Effects', () => {
  describe('hasStatusEffect', () => {
    it('should return true if effect exists with duration > 0', () => {
      const effects: StatusEffect[] = [
        { type: 'shield_disruption', duration: 2, strength: 0.5 },
      ]
      expect(hasStatusEffect(effects, 'shield_disruption')).toBe(true)
    })

    it('should return false if effect does not exist', () => {
      const effects: StatusEffect[] = []
      expect(hasStatusEffect(effects, 'shield_disruption')).toBe(false)
    })

    it('should return false if effect has duration 0', () => {
      const effects: StatusEffect[] = [
        { type: 'shield_disruption', duration: 0, strength: 0.5 },
      ]
      expect(hasStatusEffect(effects, 'shield_disruption')).toBe(false)
    })
  })

  describe('tickStatusEffects', () => {
    it('should reduce duration by 1', () => {
      const effects: StatusEffect[] = [
        { type: 'shield_disruption', duration: 2, strength: 0.5 },
      ]
      const ticked = tickStatusEffects(effects)
      expect(ticked[0].duration).toBe(1)
    })

    it('should remove effects with duration 0 after tick', () => {
      const effects: StatusEffect[] = [
        { type: 'shield_disruption', duration: 1, strength: 0.5 },
      ]
      const ticked = tickStatusEffects(effects)
      expect(ticked).toHaveLength(0)
    })
  })

  describe('mergeDamage', () => {
    it('should combine damage from multiple sources', () => {
      const damage1 = createDamageTypes({ ballistic: 100, ionic: 50 })
      const damage2 = createDamageTypes({ ballistic: 50, explosive: 75 })
      const merged = mergeDamage(damage1, damage2)

      expect(merged.ballistic).toBe(150)
      expect(merged.ionic).toBe(50)
      expect(merged.explosive).toBe(75)
    })
  })
})

// ============================================================================
// UNIT STATUS EFFECTS TESTS
// ============================================================================

describe('Unit Status Effects', () => {
  const baseTech: AdvancedTechLevels = {
    weaponsTech: 0,
    shieldTech: 0,
    armorTech: 0,
  }

  const createTestUnit = () => {
    const baseStats: AdvancedUnitBaseStats = {
      unitKey: 'test_ship',
      unitId: 999,
      type: 'ship',
      category: 'military',
      unitClass: 'cruiser',
      shieldPower: 100,
      armorValue: 50,
      structuralIntegrity: 200,
      damage: { ballistic: 50, ionic: 30, explosive: 20, hacking: 0, boarding: 0 },
      weaponPower: 100,
      cost: { metal: 1000, crystal: 500, deuterium: 100 },
    }
    return createAdvancedCombatUnit(baseStats, baseTech, 'player1')
  }

  describe('tickUnitStatusEffects', () => {
    it('should tick all status effects on unit', () => {
      const unit = createTestUnit()
      unit.statusEffects.push(
        { type: 'shield_disruption', duration: 2, strength: 0.5 },
        { type: 'ionized', duration: 1, strength: 0.3 }
      )

      tickUnitStatusEffects(unit)

      expect(unit.statusEffects).toHaveLength(1)
      expect(unit.statusEffects[0].type).toBe('shield_disruption')
      expect(unit.statusEffects[0].duration).toBe(1)
    })

    it('should re-enable disabled unit when effects expire', () => {
      const unit = createTestUnit()
      unit.disabled = true
      unit.statusEffects.push(
        { type: 'emp_stunned', duration: 1, strength: 1 }
      )

      tickUnitStatusEffects(unit)

      expect(unit.disabled).toBe(false)
      expect(unit.statusEffects).toHaveLength(0)
    })
  })
})
