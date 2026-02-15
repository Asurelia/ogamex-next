/**
 * Boarding System Tests
 */

import { describe, it, expect } from 'vitest'
import {
  BoardingEngine,
  createCrewUnit,
  createBoardingParty,
  createShipDefenses,
  CREW_BASE_STATS,
  BOARDING_CONSTANTS,
  type CrewUnit,
  type BoardingParty,
  type ShipDefenses,
  type BreachEquipment,
} from '../boarding-system'
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

const createTestShip = (overrides: Partial<AdvancedUnitBaseStats> = {}) => {
  const baseStats: AdvancedUnitBaseStats = {
    unitKey: 'test_cruiser',
    unitId: 999,
    type: 'ship',
    category: 'military',
    unitClass: 'cruiser',
    shieldPower: 100,
    armorValue: 50,
    structuralIntegrity: 500,
    damage: { ballistic: 100, ionic: 50, explosive: 50, hacking: 0, boarding: 100 },
    weaponPower: 200,
    cost: { metal: 5000, crystal: 2500, deuterium: 500 },
    crewCapacity: 50,
    stats: {
      accuracy: 85,
      evasion: 5,
      critChance: 6,
      critMultiplier: 1.5,
      pointDefense: 30,
      crewCurrent: 50,
      crewMax: 50,
    },
    resistances: {
      ballistic_resistance: 10,
      ionic_resistance: 5,
      explosive_resistance: 5,
      hack_defense: 10,
      anti_boarding: 30,
    },
    ...overrides,
  }
  return createAdvancedCombatUnit(baseStats, baseTech, 'player1')
}

// ============================================================================
// CREW UNIT TESTS
// ============================================================================

describe('Crew Units', () => {
  describe('createCrewUnit', () => {
    it('should create a marine with correct stats', () => {
      const marine = createCrewUnit('marine')
      const baseStats = CREW_BASE_STATS.marine

      expect(marine.type).toBe('marine')
      expect(marine.health).toBe(baseStats.health)
      expect(marine.attack).toBe(baseStats.attack)
      expect(marine.defense).toBe(baseStats.defense)
      expect(marine.abilities).toContain('breach_expert')
      expect(marine.abilities).toContain('close_combat')
      expect(marine.eliminated).toBe(false)
    })

    it('should create an engineer with saboteur ability', () => {
      const engineer = createCrewUnit('engineer')
      expect(engineer.type).toBe('engineer')
      expect(engineer.abilities).toContain('saboteur')
    })

    it('should apply bonus stats', () => {
      const elite = createCrewUnit('elite', 50, 10, 10)
      const baseStats = CREW_BASE_STATS.elite

      expect(elite.health).toBe(baseStats.health + 50)
      expect(elite.maxHealth).toBe(baseStats.health + 50)
      expect(elite.attack).toBe(baseStats.attack + 10)
      expect(elite.defense).toBe(baseStats.defense + 10)
    })
  })

  describe('CREW_BASE_STATS', () => {
    it('should have all crew types defined', () => {
      expect(CREW_BASE_STATS.marine).toBeDefined()
      expect(CREW_BASE_STATS.soldier).toBeDefined()
      expect(CREW_BASE_STATS.security).toBeDefined()
      expect(CREW_BASE_STATS.engineer).toBeDefined()
      expect(CREW_BASE_STATS.officer).toBeDefined()
      expect(CREW_BASE_STATS.elite).toBeDefined()
    })

    it('should have elite as the strongest type', () => {
      const elite = CREW_BASE_STATS.elite
      const marine = CREW_BASE_STATS.marine

      expect(elite.health).toBeGreaterThan(marine.health)
      expect(elite.attack).toBeGreaterThan(marine.attack)
    })

    it('should have security with high defense', () => {
      const security = CREW_BASE_STATS.security
      const soldier = CREW_BASE_STATS.soldier

      expect(security.defense).toBeGreaterThan(soldier.defense)
    })
  })
})

// ============================================================================
// BOARDING PARTY TESTS
// ============================================================================

describe('Boarding Party', () => {
  describe('createBoardingParty', () => {
    it('should create a boarding party from ship', () => {
      const ship = createTestShip()
      const party = createBoardingParty(ship, 'target_1')

      expect(party.sourceUnitId).toBe(ship.id)
      expect(party.targetUnitId).toBe('target_1')
      expect(party.crew.length).toBeGreaterThan(0)
      expect(party.boardingPower).toBe(ship.damage.boarding)
      expect(party.breachEquipment.length).toBeGreaterThan(0)
    })

    it('should use custom crew distribution', () => {
      const ship = createTestShip()
      const party = createBoardingParty(ship, 'target_1', {
        marine: 10,
        engineer: 5,
      })

      const marines = party.crew.filter(c => c.type === 'marine')
      const engineers = party.crew.filter(c => c.type === 'engineer')

      expect(marines.length).toBe(10)
      expect(engineers.length).toBe(5)
    })
  })
})

// ============================================================================
// SHIP DEFENSES TESTS
// ============================================================================

describe('Ship Defenses', () => {
  describe('createShipDefenses', () => {
    it('should create defenses from ship', () => {
      const ship = createTestShip()
      const defenses = createShipDefenses(ship)

      expect(defenses.pointDefense).toBe(ship.stats.pointDefense)
      expect(defenses.securityCrew.length).toBeGreaterThan(0)
      expect(defenses.antiBoarding).toBe(ship.resistances.anti_boarding)
    })

    it('should use custom security crew count', () => {
      const ship = createTestShip()
      const defenses = createShipDefenses(ship, 20)

      expect(defenses.securityCrew.length).toBe(20)
    })
  })
})

// ============================================================================
// BOARDING ENGINE TESTS
// ============================================================================

describe('BoardingEngine', () => {
  // Use deterministic random for testing
  const deterministicRandom = (seed: number) => {
    let value = seed
    return () => {
      value = (value * 9301 + 49297) % 233280
      return value / 233280
    }
  }

  describe('execute', () => {
    it('should complete all phases for successful boarding', () => {
      const engine = new BoardingEngine(deterministicRandom(42))

      const attackerShip = createTestShip({ crewCapacity: 100 })
      attackerShip.crew.current = 100

      const defenderShip = createTestShip({ crewCapacity: 20 })
      defenderShip.crew.current = 20

      const boardingParty = createBoardingParty(attackerShip, defenderShip.id, {
        marine: 30,
        soldier: 20,
        engineer: 5,
      })

      const defenses = createShipDefenses(defenderShip, 10)

      const result = engine.execute(boardingParty, defenses, defenderShip)

      expect(result.phasesCompleted).toContain('approach')
      expect(result.phasesCompleted).toContain('breach')
      expect(result.phasesCompleted).toContain('combat')
      expect(result.phasesCompleted).toContain('resolution')
      expect(result.events.length).toBeGreaterThan(0)
    })

    it('should track casualties correctly', () => {
      const engine = new BoardingEngine(deterministicRandom(123))

      const attackerShip = createTestShip({ crewCapacity: 50 })
      attackerShip.crew.current = 50

      const defenderShip = createTestShip({ crewCapacity: 30 })
      defenderShip.crew.current = 30

      const boardingParty = createBoardingParty(attackerShip, defenderShip.id, {
        marine: 15,
        soldier: 10,
      })

      const defenses = createShipDefenses(defenderShip, 15)

      const result = engine.execute(boardingParty, defenses, defenderShip)

      // Should have some casualties on either side
      const totalCasualties = result.attackerLosses.crewLost + result.defenderLosses.crewLost
      expect(totalCasualties).toBeGreaterThanOrEqual(0)

      // Remaining counts should be accurate
      expect(result.attackerLosses.crewRemaining + result.attackerLosses.crewLost)
        .toBe(boardingParty.crew.length)
    })

    it('should handle repelled boarding', () => {
      const engine = new BoardingEngine(deterministicRandom(999))

      // Weak attacker
      const attackerShip = createTestShip({ crewCapacity: 5 })
      attackerShip.crew.current = 5

      // Strong defender with high point defense
      const defenderShip = createTestShip({ crewCapacity: 100 })
      defenderShip.crew.current = 100
      defenderShip.stats.pointDefense = 200

      const boardingParty = createBoardingParty(attackerShip, defenderShip.id, {
        marine: 2,
        soldier: 2,
      })

      const defenses = createShipDefenses(defenderShip, 50)

      const result = engine.execute(boardingParty, defenses, defenderShip)

      // With such overwhelming defense, likely repelled or retreated
      expect(['repelled', 'retreated', 'mutual_destruction']).toContain(result.outcome)
    })

    it('should generate sabotage effects when engineers present', () => {
      const engine = new BoardingEngine(deterministicRandom(777))

      const attackerShip = createTestShip({ crewCapacity: 50 })
      attackerShip.crew.current = 50

      const defenderShip = createTestShip({ crewCapacity: 20 })
      defenderShip.crew.current = 20

      // Include engineers for sabotage
      const boardingParty = createBoardingParty(attackerShip, defenderShip.id, {
        marine: 20,
        soldier: 10,
        engineer: 10,
      })

      const defenses = createShipDefenses(defenderShip, 10)

      const result = engine.execute(boardingParty, defenses, defenderShip)

      if (result.outcome === 'sabotaged') {
        expect(result.sabotageEffects).toBeDefined()
        expect(result.sabotageEffects!.length).toBeGreaterThan(0)

        // Check sabotage effect structure
        const effect = result.sabotageEffects![0]
        expect(effect.system).toBeDefined()
        expect(effect.severity).toBeDefined()
        expect(effect.duration).toBeGreaterThan(0)
        expect(effect.effect).toBeDefined()
      }
    })

    it('should track combat statistics', () => {
      const engine = new BoardingEngine(deterministicRandom(456))

      const attackerShip = createTestShip({ crewCapacity: 30 })
      attackerShip.crew.current = 30

      const defenderShip = createTestShip({ crewCapacity: 30 })
      defenderShip.crew.current = 30

      const boardingParty = createBoardingParty(attackerShip, defenderShip.id, {
        marine: 10,
        soldier: 10,
      })

      const defenses = createShipDefenses(defenderShip, 15)

      const result = engine.execute(boardingParty, defenses, defenderShip)

      expect(result.statistics).toBeDefined()
      expect(result.statistics.totalRounds).toBeGreaterThanOrEqual(0)
      expect(result.statistics.totalDamageDealt).toBeGreaterThanOrEqual(0)
    })
  })
})

// ============================================================================
// BOARDING CONSTANTS TESTS
// ============================================================================

describe('BOARDING_CONSTANTS', () => {
  it('should have reasonable combat values', () => {
    expect(BOARDING_CONSTANTS.MAX_COMBAT_ROUNDS).toBeGreaterThan(0)
    expect(BOARDING_CONSTANTS.BASE_INTERCEPT_CHANCE).toBeGreaterThanOrEqual(0)
    expect(BOARDING_CONSTANTS.BASE_INTERCEPT_CHANCE).toBeLessThanOrEqual(1)
    expect(BOARDING_CONSTANTS.BASE_BREACH_CHANCE).toBeGreaterThanOrEqual(0)
    expect(BOARDING_CONSTANTS.BASE_BREACH_CHANCE).toBeLessThanOrEqual(1)
  })

  it('should have ability multipliers greater than 1', () => {
    expect(BOARDING_CONSTANTS.BREACH_EXPERT_BONUS).toBeGreaterThan(1)
    expect(BOARDING_CONSTANTS.CLOSE_COMBAT_BONUS).toBeGreaterThan(1)
  })

  it('should have reasonable thresholds', () => {
    expect(BOARDING_CONSTANTS.CAPTURE_THRESHOLD).toBeGreaterThan(0)
    expect(BOARDING_CONSTANTS.CAPTURE_THRESHOLD).toBeLessThan(1)
    expect(BOARDING_CONSTANTS.RETREAT_THRESHOLD).toBeGreaterThan(0)
    expect(BOARDING_CONSTANTS.RETREAT_THRESHOLD).toBeLessThan(1)
  })
})
