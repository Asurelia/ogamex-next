/**
 * Battle Engine
 *
 * Main combat simulation engine implementing classic OGame battle mechanics.
 *
 * Combat Flow:
 * 1. Initialize both fleets with effective stats
 * 2. Execute combat rounds (max 6)
 *    a. Each unit selects a random target
 *    b. Calculate damage with shield absorption
 *    c. Apply rapid fire for additional shots
 *    d. Check for unit explosion (hull < 70%)
 *    e. Regenerate shields
 * 3. Determine winner
 * 4. Calculate debris, loot, and moon chance
 */

import type {
  TechLevels,
  FleetComposition,
  DefenseComposition,
  BattleResult,
  CombatUnit,
  CombatRound,
  BattleOptions,
  Resources,
} from './types'
import { DEFAULT_BATTLE_OPTIONS } from './types'
import {
  createCombatUnitsFromFleet,
  createCombatUnitsFromDefense,
  createFleetSnapshot,
  calculateDamage,
  rollExplosion,
  rollRapidFire,
  regenerateShields,
  determineWinner,
  calculateShipLosses,
  calculateDefenseLosses,
  generateDebris,
  calculateLoot,
  calculateCargoCapacity,
  calculateMoonChance,
  rollMoonCreation,
} from './utils'
import type { ShipCounts } from '../missions/types'

/**
 * OGame Battle Engine
 *
 * Simulates space battles between fleets using classic OGame mechanics.
 */
export class BattleEngine {
  private attackerTech: TechLevels
  private defenderTech: TechLevels
  private options: Required<BattleOptions>

  /**
   * Create a new BattleEngine instance
   *
   * @param attackerTech - Attacker's combat technology levels
   * @param defenderTech - Defender's combat technology levels
   * @param options - Battle options
   */
  constructor(
    attackerTech: TechLevels,
    defenderTech: TechLevels,
    options: BattleOptions = {}
  ) {
    this.attackerTech = attackerTech
    this.defenderTech = defenderTech
    this.options = { ...DEFAULT_BATTLE_OPTIONS, ...options }
  }

  /**
   * Simulate a complete battle
   *
   * @param attackerFleet - Attacker's fleet composition
   * @param defenderFleet - Defender's fleet composition
   * @param defenderDefense - Defender's defense composition
   * @param defenderResources - Defender's resources (for loot calculation)
   * @returns Complete battle result
   */
  simulate(
    attackerFleet: FleetComposition,
    defenderFleet: FleetComposition,
    defenderDefense: DefenseComposition,
    defenderResources: Resources = { metal: 0, crystal: 0, deuterium: 0 }
  ): BattleResult {
    // Create combat units
    const attackerUnits = createCombatUnitsFromFleet(
      attackerFleet,
      this.attackerTech,
      'attacker'
    )
    const defenderShipUnits = createCombatUnitsFromFleet(
      defenderFleet,
      this.defenderTech,
      'defender'
    )
    const defenderDefenseUnits = createCombatUnitsFromDefense(
      defenderDefense,
      this.defenderTech,
      'defender'
    )
    const defenderUnits = [...defenderShipUnits, ...defenderDefenseUnits]

    // Store initial state for loss calculation
    const initialAttackerUnits = [...attackerUnits]
    const initialDefenderUnits = [...defenderUnits]

    // Execute combat rounds
    const rounds: CombatRound[] = []
    let roundNumber = 0

    while (roundNumber < this.options.maxRounds) {
      roundNumber++

      // Check if battle should continue
      const attackerAlive = attackerUnits.filter(u => !u.destroyed)
      const defenderAlive = defenderUnits.filter(u => !u.destroyed)

      if (attackerAlive.length === 0 || defenderAlive.length === 0) {
        break
      }

      // Execute round
      const round = this.executeRound(
        roundNumber,
        attackerUnits,
        defenderUnits
      )
      rounds.push(round)

      // Regenerate shields for next round
      regenerateShields(attackerUnits)
      regenerateShields(defenderUnits)
    }

    // Determine winner
    const winner = determineWinner(attackerUnits, defenderUnits)

    // Calculate remaining units
    const attackerRemaining = this.getRemainingShips(attackerUnits)
    const defenderRemainingShips = this.getRemainingShips(defenderUnits)
    const defenderRemainingDefense = this.getRemainingDefense(defenderUnits)

    // Calculate losses
    const attackerLosses = calculateShipLosses(initialAttackerUnits, attackerUnits)

    const defenderShipLosses = calculateShipLosses(
      initialDefenderUnits.filter(u => u.type === 'ship'),
      defenderUnits.filter(u => u.type === 'ship')
    )
    const defenderDefenseLosses = calculateDefenseLosses(
      initialDefenderUnits.filter(u => u.type === 'defense'),
      defenderUnits.filter(u => u.type === 'defense')
    )

    // Generate debris (only from ships, not defense)
    const allDestroyedShips: Partial<ShipCounts> = {}
    for (const [key, count] of Object.entries(attackerLosses.ships)) {
      if (count) {
        allDestroyedShips[key as keyof ShipCounts] =
          (allDestroyedShips[key as keyof ShipCounts] || 0) + count
      }
    }
    for (const [key, count] of Object.entries(defenderShipLosses.ships)) {
      if (count) {
        allDestroyedShips[key as keyof ShipCounts] =
          (allDestroyedShips[key as keyof ShipCounts] || 0) + count
      }
    }
    const debris = generateDebris(allDestroyedShips)

    // Calculate loot (only if attacker wins)
    let loot: Resources = { metal: 0, crystal: 0, deuterium: 0 }
    if (winner === 'attacker') {
      const cargoCapacity = calculateCargoCapacity(attackerRemaining)
      loot = calculateLoot(defenderResources, cargoCapacity)
    }

    // Calculate moon chance
    const moonChance = calculateMoonChance(debris)
    const moonCreated = rollMoonCreation(moonChance, this.options.randomFn)

    return {
      winner,
      rounds,
      attackerRemaining: {
        ships: attackerRemaining,
      },
      defenderRemaining: {
        ships: defenderRemainingShips,
        defense: defenderRemainingDefense,
      },
      attackerLosses,
      defenderLosses: {
        ships: defenderShipLosses,
        defense: defenderDefenseLosses,
        totalMetalValue: defenderShipLosses.metalValue + defenderDefenseLosses.metalValue,
        totalCrystalValue: defenderShipLosses.crystalValue + defenderDefenseLosses.crystalValue,
        totalDeuteriumValue: defenderShipLosses.deuteriumValue + defenderDefenseLosses.deuteriumValue,
      },
      debris,
      loot,
      moonChance,
      moonCreated,
      totalRounds: rounds.length,
    }
  }

  /**
   * Execute a single combat round
   *
   * @param roundNumber - Current round number
   * @param attackerUnits - Attacker's combat units
   * @param defenderUnits - Defender's combat units
   * @returns Combat round result
   */
  private executeRound(
    roundNumber: number,
    attackerUnits: CombatUnit[],
    defenderUnits: CombatUnit[]
  ): CombatRound {
    const initialAttackerSnapshot = createFleetSnapshot(attackerUnits)
    const initialDefenderSnapshot = createFleetSnapshot(defenderUnits)

    let attackerShots = 0
    let defenderShots = 0
    let attackerDamage = 0
    let defenderDamage = 0

    // Attacker fires
    const attackerAlive = attackerUnits.filter(u => !u.destroyed)
    const defenderAlive = () => defenderUnits.filter(u => !u.destroyed)

    for (const attacker of attackerAlive) {
      const targets = defenderAlive()
      if (targets.length === 0) break

      const { shots, damage } = this.fireUnit(attacker, targets)
      attackerShots += shots
      attackerDamage += damage
    }

    // Defender fires
    const defenderAliveUnits = defenderUnits.filter(u => !u.destroyed)
    const attackerAliveAfter = () => attackerUnits.filter(u => !u.destroyed)

    for (const defender of defenderAliveUnits) {
      const targets = attackerAliveAfter()
      if (targets.length === 0) break

      const { shots, damage } = this.fireUnit(defender, targets)
      defenderShots += shots
      defenderDamage += damage
    }

    // Calculate units lost this round
    const finalAttackerSnapshot = createFleetSnapshot(attackerUnits)
    const finalDefenderSnapshot = createFleetSnapshot(defenderUnits)

    const attackerUnitsLost = initialAttackerSnapshot.unitCount - finalAttackerSnapshot.unitCount
    const defenderUnitsLost = initialDefenderSnapshot.unitCount - finalDefenderSnapshot.unitCount

    return {
      roundNumber,
      attacker: finalAttackerSnapshot,
      defender: finalDefenderSnapshot,
      attackerShots,
      defenderShots,
      attackerDamage,
      defenderDamage,
      attackerUnitsLost,
      defenderUnitsLost,
    }
  }

  /**
   * Fire a unit at available targets with rapid fire
   *
   * @param attacker - Attacking unit
   * @param defenders - Available defender units
   * @returns Number of shots fired and total damage dealt
   */
  private fireUnit(
    attacker: CombatUnit,
    defenders: CombatUnit[]
  ): { shots: number; damage: number } {
    if (attacker.destroyed || defenders.length === 0) {
      return { shots: 0, damage: 0 }
    }

    let shots = 0
    let totalDamage = 0
    let continueRapidFire = true

    while (continueRapidFire && !attacker.destroyed) {
      // Select random target
      const aliveDefenders = defenders.filter(d => !d.destroyed)
      if (aliveDefenders.length === 0) break

      const targetIndex = Math.floor(this.options.randomFn() * aliveDefenders.length)
      const target = aliveDefenders[targetIndex]

      // Calculate and apply damage
      const damageResult = calculateDamage(attacker.attack, target.currentShield)
      shots++

      if (!damageResult.bounced) {
        // Apply shield damage
        target.currentShield = Math.max(0, target.currentShield - damageResult.shieldDamage)

        // Apply hull damage
        target.currentHull = Math.max(0, target.currentHull - damageResult.hullDamage)
        totalDamage += damageResult.shieldDamage + damageResult.hullDamage

        // Check for destruction or explosion
        if (target.currentHull <= 0) {
          target.destroyed = true
        } else if (rollExplosion(target.currentHull, target.maxHull, this.options.randomFn)) {
          target.destroyed = true
        }
      }

      // Check for rapid fire
      const additionalShots = rollRapidFire(
        attacker.unitKey,
        target.unitKey,
        this.options.randomFn
      )

      continueRapidFire = additionalShots > 0
    }

    return { shots, damage: totalDamage }
  }

  /**
   * Get remaining ships from combat units
   *
   * @param units - Combat units
   * @returns Ship counts
   */
  private getRemainingShips(units: CombatUnit[]): Partial<ShipCounts> {
    const ships: Partial<ShipCounts> = {}

    for (const unit of units) {
      if (unit.destroyed || unit.type !== 'ship') continue
      const key = unit.unitKey as keyof ShipCounts
      ships[key] = (ships[key] || 0) + 1
    }

    return ships
  }

  /**
   * Get remaining defense from combat units
   *
   * @param units - Combat units
   * @returns Defense counts
   */
  private getRemainingDefense(units: CombatUnit[]): Partial<DefenseComposition> {
    const defense: Partial<DefenseComposition> = {}

    for (const unit of units) {
      if (unit.destroyed || unit.type !== 'defense') continue
      const key = unit.unitKey as keyof DefenseComposition
      defense[key] = (defense[key] || 0) + 1
    }

    return defense
  }
}

/**
 * Quick battle simulation function
 *
 * Convenience function for simulating a battle without creating an engine instance.
 *
 * @param attackerFleet - Attacker's fleet composition
 * @param attackerTech - Attacker's technology levels
 * @param defenderFleet - Defender's fleet composition
 * @param defenderDefense - Defender's defense composition
 * @param defenderTech - Defender's technology levels
 * @param defenderResources - Defender's resources for loot
 * @param options - Battle options
 * @returns Battle result
 */
export function simulateBattle(
  attackerFleet: FleetComposition,
  attackerTech: TechLevels,
  defenderFleet: FleetComposition,
  defenderDefense: DefenseComposition,
  defenderTech: TechLevels,
  defenderResources: Resources = { metal: 0, crystal: 0, deuterium: 0 },
  options: BattleOptions = {}
): BattleResult {
  const engine = new BattleEngine(attackerTech, defenderTech, options)
  return engine.simulate(attackerFleet, defenderFleet, defenderDefense, defenderResources)
}
