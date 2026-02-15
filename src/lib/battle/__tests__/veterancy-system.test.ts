/**
 * Veterancy System Tests
 */

import { describe, it, expect } from 'vitest'
import {
  RANK_THRESHOLDS,
  RANK_ORDER,
  RANK_BONUSES,
  EXPERIENCE_GAINS,
  VETERANCY_ABILITIES,
  DEFAULT_UNIT_EXPERIENCE,
  getRankFromXP,
  getXPForNextRank,
  calculateProgress,
  awardExperience,
  resetKillStreak,
  getAvailableAbilities,
  updateUnlockedAbilities,
  setActiveAbility,
  getRankBonuses,
  applyVeterancyToUnit,
  checkAbilityTrigger,
  getAbility,
  createUnitExperience,
  compareRanks,
  isAtLeastRank,
  formatXP,
  getRankDisplayInfo,
  calculateFleetExperience,
  type UnitExperience,
  type VeterancyRank,
} from '../veterancy-system'
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

const createTestUnit = (unitClass: string = 'cruiser') => {
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
  }
  return createAdvancedCombatUnit(baseStats, baseTech, 'player1')
}

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('RANK_THRESHOLDS', () => {
  it('should have increasing thresholds', () => {
    expect(RANK_THRESHOLDS.recruit).toBe(0)
    expect(RANK_THRESHOLDS.trained).toBeGreaterThan(RANK_THRESHOLDS.recruit)
    expect(RANK_THRESHOLDS.veteran).toBeGreaterThan(RANK_THRESHOLDS.trained)
    expect(RANK_THRESHOLDS.elite).toBeGreaterThan(RANK_THRESHOLDS.veteran)
    expect(RANK_THRESHOLDS.legendary).toBeGreaterThan(RANK_THRESHOLDS.elite)
  })
})

describe('RANK_BONUSES', () => {
  it('should have bonuses for all ranks', () => {
    for (const rank of RANK_ORDER) {
      expect(RANK_BONUSES[rank]).toBeDefined()
      expect(RANK_BONUSES[rank].damageMultiplier).toBeGreaterThanOrEqual(1)
    }
  })

  it('should have increasing bonuses for higher ranks', () => {
    expect(RANK_BONUSES.legendary.damageMultiplier).toBeGreaterThan(
      RANK_BONUSES.elite.damageMultiplier
    )
    expect(RANK_BONUSES.elite.damageMultiplier).toBeGreaterThan(
      RANK_BONUSES.veteran.damageMultiplier
    )
    expect(RANK_BONUSES.veteran.damageMultiplier).toBeGreaterThan(
      RANK_BONUSES.trained.damageMultiplier
    )
  })

  it('should have neutral bonuses for recruit', () => {
    expect(RANK_BONUSES.recruit.damageMultiplier).toBe(1.0)
    expect(RANK_BONUSES.recruit.defenseMultiplier).toBe(1.0)
    expect(RANK_BONUSES.recruit.accuracyBonus).toBe(0)
  })
})

describe('EXPERIENCE_GAINS', () => {
  it('should have positive XP for all actions', () => {
    for (const [action, xp] of Object.entries(EXPERIENCE_GAINS)) {
      expect(xp).toBeGreaterThan(0)
    }
  })

  it('should give more XP for important actions', () => {
    expect(EXPERIENCE_GAINS.boarding_success).toBeGreaterThan(EXPERIENCE_GAINS.kill)
    expect(EXPERIENCE_GAINS.kill).toBeGreaterThan(EXPERIENCE_GAINS.survive_battle)
  })
})

describe('VETERANCY_ABILITIES', () => {
  it('should have abilities for different ranks', () => {
    const ranksWithAbilities = new Set(VETERANCY_ABILITIES.map(a => a.requiredRank))
    expect(ranksWithAbilities.size).toBeGreaterThan(1)
  })

  it('should have eligible classes for each ability', () => {
    for (const ability of VETERANCY_ABILITIES) {
      expect(ability.eligibleClasses.length).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// RANK FUNCTIONS TESTS
// ============================================================================

describe('getRankFromXP', () => {
  it('should return recruit for 0 XP', () => {
    expect(getRankFromXP(0)).toBe('recruit')
  })

  it('should return trained at threshold', () => {
    expect(getRankFromXP(RANK_THRESHOLDS.trained)).toBe('trained')
  })

  it('should return veteran between thresholds', () => {
    expect(getRankFromXP(RANK_THRESHOLDS.veteran + 100)).toBe('veteran')
  })

  it('should return legendary at max', () => {
    expect(getRankFromXP(RANK_THRESHOLDS.legendary)).toBe('legendary')
    expect(getRankFromXP(RANK_THRESHOLDS.legendary + 10000)).toBe('legendary')
  })
})

describe('getXPForNextRank', () => {
  it('should return next rank threshold', () => {
    expect(getXPForNextRank('recruit')).toBe(RANK_THRESHOLDS.trained)
    expect(getXPForNextRank('trained')).toBe(RANK_THRESHOLDS.veteran)
  })

  it('should return null for legendary', () => {
    expect(getXPForNextRank('legendary')).toBeNull()
  })
})

describe('calculateProgress', () => {
  it('should return 0 at rank start', () => {
    expect(calculateProgress(0)).toBe(0)
    expect(calculateProgress(RANK_THRESHOLDS.trained)).toBe(0)
  })

  it('should return 100 at legendary', () => {
    expect(calculateProgress(RANK_THRESHOLDS.legendary)).toBe(100)
  })

  it('should return midpoint progress', () => {
    const midpoint = (RANK_THRESHOLDS.trained + RANK_THRESHOLDS.veteran) / 2
    const progress = calculateProgress(midpoint)
    expect(progress).toBeGreaterThan(40)
    expect(progress).toBeLessThan(60)
  })
})

// ============================================================================
// EXPERIENCE FUNCTIONS TESTS
// ============================================================================

describe('awardExperience', () => {
  it('should award XP for damage dealt', () => {
    const exp = createUnitExperience()
    const result = awardExperience(exp, 'damage_dealt', 500)

    expect(result.xpGained).toBe(5) // 500/100 * 1
    expect(exp.stats.totalDamageDealt).toBe(500)
    expect(exp.totalXP).toBe(5)
  })

  it('should award XP for kills and track streak', () => {
    const exp = createUnitExperience()
    awardExperience(exp, 'kill', 3)

    expect(exp.stats.totalKills).toBe(3)
    expect(exp.currentKillStreak).toBe(3)
    expect(exp.highestKillStreak).toBe(3)
  })

  it('should detect rank up', () => {
    const exp = createUnitExperience()
    exp.totalXP = RANK_THRESHOLDS.trained - 10

    const result = awardExperience(exp, 'survive_battle', 1)

    expect(result.rankUp).toBe(true)
    expect(result.newRank).toBe('trained')
    expect(exp.rank).toBe('trained')
  })

  it('should not rank up if threshold not reached', () => {
    const exp = createUnitExperience()

    const result = awardExperience(exp, 'survive_battle', 1)

    expect(result.rankUp).toBe(false)
    expect(result.newRank).toBeUndefined()
  })

  it('should track highest kill streak', () => {
    const exp = createUnitExperience()

    awardExperience(exp, 'kill', 5)
    expect(exp.highestKillStreak).toBe(5)

    resetKillStreak(exp)
    expect(exp.currentKillStreak).toBe(0)

    awardExperience(exp, 'kill', 3)
    expect(exp.highestKillStreak).toBe(5) // Still 5
  })
})

describe('resetKillStreak', () => {
  it('should reset current streak to 0', () => {
    const exp = createUnitExperience()
    awardExperience(exp, 'kill', 5)
    expect(exp.currentKillStreak).toBe(5)

    resetKillStreak(exp)
    expect(exp.currentKillStreak).toBe(0)
    expect(exp.highestKillStreak).toBe(5) // Highest preserved
  })
})

// ============================================================================
// ABILITIES TESTS
// ============================================================================

describe('getAvailableAbilities', () => {
  it('should return no abilities for recruit', () => {
    const abilities = getAvailableAbilities('cruiser', 'recruit')
    expect(abilities.length).toBe(0)
  })

  it('should return abilities for higher ranks', () => {
    const abilities = getAvailableAbilities('cruiser', 'veteran')
    expect(abilities.length).toBeGreaterThan(0)
  })

  it('should filter by unit class', () => {
    const cruiserAbilities = getAvailableAbilities('cruiser', 'legendary')
    const fighterAbilities = getAvailableAbilities('fighter', 'legendary')

    // Leadership is only for battleship/dreadnought/carrier
    expect(cruiserAbilities.some(a => a.type === 'leadership')).toBe(false)
    expect(fighterAbilities.some(a => a.type === 'leadership')).toBe(false)

    const battleshipAbilities = getAvailableAbilities('battleship', 'legendary')
    expect(battleshipAbilities.some(a => a.type === 'leadership')).toBe(true)
  })
})

describe('updateUnlockedAbilities', () => {
  it('should unlock abilities on rank up', () => {
    const exp = createUnitExperience()
    exp.rank = 'trained'

    const newAbilities = updateUnlockedAbilities(exp, 'cruiser')

    expect(newAbilities.length).toBeGreaterThan(0)
    expect(exp.unlockedAbilities).toContain('steady_aim')
  })

  it('should not re-unlock already unlocked abilities', () => {
    const exp = createUnitExperience()
    exp.rank = 'veteran'
    exp.unlockedAbilities = ['steady_aim']

    const newAbilities = updateUnlockedAbilities(exp, 'cruiser')

    // steady_aim should not be in newAbilities
    expect(newAbilities).not.toContain('steady_aim')
    // But should still be in unlockedAbilities
    expect(exp.unlockedAbilities).toContain('steady_aim')
  })
})

describe('setActiveAbility', () => {
  it('should set active ability if unlocked', () => {
    const exp = createUnitExperience()
    exp.unlockedAbilities = ['steady_aim', 'battle_hardened']

    const success = setActiveAbility(exp, 'steady_aim')

    expect(success).toBe(true)
    expect(exp.activeAbility).toBe('steady_aim')
  })

  it('should fail if ability not unlocked', () => {
    const exp = createUnitExperience()
    exp.unlockedAbilities = ['steady_aim']

    const success = setActiveAbility(exp, 'tactical_genius')

    expect(success).toBe(false)
    expect(exp.activeAbility).toBeUndefined()
  })

  it('should allow clearing active ability', () => {
    const exp = createUnitExperience()
    exp.unlockedAbilities = ['steady_aim']
    exp.activeAbility = 'steady_aim'

    const success = setActiveAbility(exp, undefined)

    expect(success).toBe(true)
    expect(exp.activeAbility).toBeUndefined()
  })
})

// ============================================================================
// APPLY VETERANCY TESTS
// ============================================================================

describe('applyVeterancyToUnit', () => {
  it('should not modify recruit unit', () => {
    const unit = createTestUnit()
    const originalDamage = unit.damage.ballistic
    const originalShield = unit.defense.shield.max

    const exp = createUnitExperience()
    applyVeterancyToUnit(unit, exp)

    expect(unit.damage.ballistic).toBe(originalDamage)
    expect(unit.defense.shield.max).toBe(originalShield)
  })

  it('should apply bonuses for veteran', () => {
    const unit = createTestUnit()
    const originalDamage = unit.damage.ballistic
    const originalAccuracy = unit.stats.accuracy

    const exp = createUnitExperience(RANK_THRESHOLDS.veteran)
    applyVeterancyToUnit(unit, exp)

    const bonuses = RANK_BONUSES.veteran
    expect(unit.damage.ballistic).toBe(Math.floor(originalDamage * bonuses.damageMultiplier))
    expect(unit.stats.accuracy).toBe(originalAccuracy + bonuses.accuracyBonus)
  })

  it('should apply significant bonuses for legendary', () => {
    const unit = createTestUnit()
    const originalDamage = unit.damage.ballistic

    const exp = createUnitExperience(RANK_THRESHOLDS.legendary)
    applyVeterancyToUnit(unit, exp)

    // Legendary has 1.30 damage multiplier
    expect(unit.damage.ballistic).toBe(Math.floor(originalDamage * 1.30))
  })
})

// ============================================================================
// ABILITY TRIGGER TESTS
// ============================================================================

describe('checkAbilityTrigger', () => {
  it('should trigger steady_aim on first shot', () => {
    const ability = getAbility('steady_aim')!
    const exp = createUnitExperience()
    const unit = createTestUnit()

    const result = checkAbilityTrigger(ability, exp, unit, { isFirstShot: true })

    expect(result.triggers).toBe(true)
    expect(result.bonus).toBe(20)
  })

  it('should not trigger steady_aim on subsequent shots', () => {
    const ability = getAbility('steady_aim')!
    const exp = createUnitExperience()
    const unit = createTestUnit()

    const result = checkAbilityTrigger(ability, exp, unit, { isFirstShot: false })

    expect(result.triggers).toBe(false)
  })

  it('should trigger adrenaline_surge at low hull', () => {
    const ability = getAbility('adrenaline_surge')!
    const exp = createUnitExperience()
    const unit = createTestUnit()

    const result = checkAbilityTrigger(ability, exp, unit, { hullPercent: 25 })

    expect(result.triggers).toBe(true)
    expect(result.bonus).toBe(30)
  })

  it('should trigger kill_streak with kills', () => {
    const ability = getAbility('kill_streak')!
    const exp = createUnitExperience()
    const unit = createTestUnit()

    const result = checkAbilityTrigger(ability, exp, unit, { killsThisBattle: 3 })

    expect(result.triggers).toBe(true)
    expect(result.bonus).toBe(30) // 3 * 10
  })

  it('should cap kill_streak bonus', () => {
    const ability = getAbility('kill_streak')!
    const exp = createUnitExperience()
    const unit = createTestUnit()

    const result = checkAbilityTrigger(ability, exp, unit, { killsThisBattle: 10 })

    expect(result.triggers).toBe(true)
    expect(result.bonus).toBe(50) // Max 50
  })
})

// ============================================================================
// UTILITY FUNCTIONS TESTS
// ============================================================================

describe('createUnitExperience', () => {
  it('should create with default values', () => {
    const exp = createUnitExperience()

    expect(exp.totalXP).toBe(0)
    expect(exp.rank).toBe('recruit')
    expect(exp.unlockedAbilities).toEqual([])
    expect(exp.stats.totalKills).toBe(0)
  })

  it('should create with initial XP', () => {
    const exp = createUnitExperience(600)

    expect(exp.totalXP).toBe(600)
    expect(exp.rank).toBe('veteran')
    expect(exp.progressToNextRank).toBeGreaterThan(0)
  })
})

describe('compareRanks', () => {
  it('should return 0 for same rank', () => {
    expect(compareRanks('veteran', 'veteran')).toBe(0)
  })

  it('should return positive for higher rank', () => {
    expect(compareRanks('elite', 'trained')).toBeGreaterThan(0)
  })

  it('should return negative for lower rank', () => {
    expect(compareRanks('trained', 'legendary')).toBeLessThan(0)
  })
})

describe('isAtLeastRank', () => {
  it('should return true if current rank meets requirement', () => {
    expect(isAtLeastRank('veteran', 'trained')).toBe(true)
    expect(isAtLeastRank('veteran', 'veteran')).toBe(true)
    expect(isAtLeastRank('legendary', 'recruit')).toBe(true)
  })

  it('should return false if current rank below requirement', () => {
    expect(isAtLeastRank('trained', 'veteran')).toBe(false)
    expect(isAtLeastRank('recruit', 'elite')).toBe(false)
  })
})

describe('formatXP', () => {
  it('should format with thousands separator', () => {
    // Locale-aware formatting - just check it's formatted
    const formatted1000 = formatXP(1000)
    const formatted12345 = formatXP(12345)

    // Should have some separator (comma, space, or narrow no-break space)
    expect(formatted1000.length).toBeGreaterThan(4) // "1000" + separator
    expect(formatted12345.length).toBeGreaterThan(5) // "12345" + separator

    // Should contain the digits
    expect(formatted1000.replace(/\D/g, '')).toBe('1000')
    expect(formatted12345.replace(/\D/g, '')).toBe('12345')
  })
})

describe('getRankDisplayInfo', () => {
  it('should return display info for each rank', () => {
    for (const rank of RANK_ORDER) {
      const info = getRankDisplayInfo(rank)
      expect(info.name).toBeDefined()
      expect(info.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(info.icon).toBeDefined()
    }
  })

  it('should have unique colors', () => {
    const colors = RANK_ORDER.map(r => getRankDisplayInfo(r).color)
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBe(RANK_ORDER.length)
  })
})

describe('calculateFleetExperience', () => {
  it('should handle empty fleet', () => {
    const result = calculateFleetExperience([])

    expect(result.totalXP).toBe(0)
    expect(result.averageRank).toBe('recruit')
    expect(result.highestRank).toBe('recruit')
  })

  it('should calculate fleet statistics', () => {
    const units = [
      { experience: createUnitExperience(0) },        // recruit
      { experience: createUnitExperience(200) },      // trained
      { experience: createUnitExperience(600) },      // veteran
    ]

    const result = calculateFleetExperience(units)

    expect(result.totalXP).toBe(800)
    expect(result.highestRank).toBe('veteran')
    expect(result.rankDistribution.recruit).toBe(1)
    expect(result.rankDistribution.trained).toBe(1)
    expect(result.rankDistribution.veteran).toBe(1)
  })
})
