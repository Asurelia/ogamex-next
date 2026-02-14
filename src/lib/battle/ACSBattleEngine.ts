/**
 * ACS Battle Engine
 *
 * Extended battle engine for Alliance Combat System battles with multiple
 * attacking and/or defending fleets.
 *
 * Key Differences from Regular Battle:
 * - Supports multiple attackers (up to 5)
 * - Supports multiple defenders (up to 5)
 * - Averages technology levels across participants
 * - Tracks individual losses per participant
 * - Distributes loot based on cargo capacity
 *
 * @example
 * ```typescript
 * import { createACSBattleEngine } from '@/lib/battle'
 *
 * const engine = await createACSBattleEngine()
 * const result = await engine.simulateACSAttack(attackers, defender)
 * ```
 */

import type {
  TechLevels,
  FleetComposition,
  DefenseComposition,
  BattleResult,
  Resources,
} from './types'
import { BattleEngine } from './BattleEngine'
import { initBattleConfig, getShipCargoCapacity } from './battle-config'
import type { ShipCounts } from '../missions/types'

// ============================================================================
// ACS TYPES
// ============================================================================

/**
 * A participant in an ACS battle
 */
export interface ACSParticipantFleet {
  userId: string
  fleet: FleetComposition
  techLevels: TechLevels
}

/**
 * A defender in an ACS battle (can have defense structures)
 */
export interface ACSDefender {
  userId: string
  fleet: FleetComposition
  defense: DefenseComposition
  techLevels: TechLevels
  resources: Resources
}

/**
 * Individual participant's battle result
 */
export interface ACSParticipantResult {
  userId: string
  shipsRemaining: Partial<ShipCounts>
  shipsLost: Partial<ShipCounts>
  lootShare: Resources
  metalLossValue: number
  crystalLossValue: number
  deuteriumLossValue: number
}

/**
 * ACS Battle Result with per-participant breakdown
 */
export interface ACSBattleEngineResult extends Omit<BattleResult, 'attackerRemaining' | 'attackerLosses'> {
  // Replace single attacker with multiple
  attackerResults: ACSParticipantResult[]
  defenderResults: ACSParticipantResult[]
  // Combined totals
  totalAttackerRemaining: FleetComposition
  totalAttackerLosses: FleetComposition
}

// ============================================================================
// ACS BATTLE ENGINE
// ============================================================================

/**
 * ACS Battle Engine for multi-fleet battles
 *
 * Use createACSBattleEngine() factory function for proper initialization.
 */
export class ACSBattleEngine {
  private maxRounds: number
  private randomFn: () => number

  /**
   * Private constructor - use createACSBattleEngine() instead
   */
  private constructor(options: { maxRounds?: number; randomFn?: () => number } = {}) {
    this.maxRounds = options.maxRounds ?? 6
    this.randomFn = options.randomFn ?? Math.random
  }

  /**
   * Create and initialize an ACS Battle Engine
   */
  static async create(
    options: { maxRounds?: number; randomFn?: () => number } = {}
  ): Promise<ACSBattleEngine> {
    // Initialize battle config (loads from database)
    await initBattleConfig()
    return new ACSBattleEngine(options)
  }

  /**
   * Simulate an ACS battle with multiple attackers
   */
  async simulateACSAttack(
    attackers: ACSParticipantFleet[],
    defender: ACSDefender
  ): Promise<ACSBattleEngineResult> {
    // Merge all attacking fleets
    const mergedAttackerFleet = this.mergeFleets(attackers.map(a => a.fleet))

    // Average attacker tech levels
    const avgAttackerTech = this.averageTechLevels(attackers.map(a => a.techLevels))

    // Run the standard battle with merged fleet
    const engine = await BattleEngine.create(avgAttackerTech, defender.techLevels, {
      maxRounds: this.maxRounds,
      randomFn: this.randomFn,
    })

    const result = engine.simulate(
      mergedAttackerFleet,
      defender.fleet,
      defender.defense,
      defender.resources
    )

    // Distribute losses among attackers
    const attackerResults = this.distributeAttackerResults(
      attackers,
      result.attackerLosses.ships,
      result.loot
    )

    // Create defender results
    const defenderResults: ACSParticipantResult[] = [{
      userId: defender.userId,
      shipsRemaining: result.defenderRemaining.ships,
      shipsLost: result.defenderLosses.ships.ships,
      lootShare: { metal: 0, crystal: 0, deuterium: 0 }, // Defender doesn't get loot
      metalLossValue: result.defenderLosses.ships.metalValue + result.defenderLosses.defense.metalValue,
      crystalLossValue: result.defenderLosses.ships.crystalValue + result.defenderLosses.defense.crystalValue,
      deuteriumLossValue: result.defenderLosses.ships.deuteriumValue + result.defenderLosses.defense.deuteriumValue,
    }]

    return {
      winner: result.winner,
      rounds: result.rounds,
      attackerResults,
      defenderResults,
      totalAttackerRemaining: result.attackerRemaining.ships as FleetComposition,
      totalAttackerLosses: result.attackerLosses.ships as FleetComposition,
      defenderRemaining: result.defenderRemaining,
      defenderLosses: result.defenderLosses,
      debris: result.debris,
      loot: result.loot,
      moonChance: result.moonChance,
      moonCreated: result.moonCreated,
      totalRounds: result.totalRounds,
    }
  }

  /**
   * Simulate an ACS defense battle with multiple defenders
   */
  async simulateACSDefense(
    attacker: ACSParticipantFleet,
    defenders: Array<{
      userId: string
      fleet: FleetComposition
      techLevels: TechLevels
    }>,
    planetOwner: ACSDefender
  ): Promise<ACSBattleEngineResult> {
    // Merge all defending fleets with planet owner's fleet
    const allDefenders = [
      { userId: planetOwner.userId, fleet: planetOwner.fleet, techLevels: planetOwner.techLevels },
      ...defenders,
    ]
    const mergedDefenderFleet = this.mergeFleets(allDefenders.map(d => d.fleet))

    // Average defender tech levels
    const avgDefenderTech = this.averageTechLevels(allDefenders.map(d => d.techLevels))

    // Run the standard battle
    const engine = await BattleEngine.create(attacker.techLevels, avgDefenderTech, {
      maxRounds: this.maxRounds,
      randomFn: this.randomFn,
    })

    const result = engine.simulate(
      attacker.fleet,
      mergedDefenderFleet,
      planetOwner.defense,
      planetOwner.resources
    )

    // Create attacker results
    const attackerResults: ACSParticipantResult[] = [{
      userId: attacker.userId,
      shipsRemaining: result.attackerRemaining.ships,
      shipsLost: result.attackerLosses.ships,
      lootShare: result.loot,
      metalLossValue: result.attackerLosses.metalValue,
      crystalLossValue: result.attackerLosses.crystalValue,
      deuteriumLossValue: result.attackerLosses.deuteriumValue,
    }]

    // Distribute losses among defenders
    const defenderResults = this.distributeDefenderResults(
      allDefenders,
      result.defenderLosses.ships.ships,
      planetOwner.userId
    )

    return {
      winner: result.winner,
      rounds: result.rounds,
      attackerResults,
      defenderResults,
      totalAttackerRemaining: result.attackerRemaining.ships as FleetComposition,
      totalAttackerLosses: result.attackerLosses.ships as FleetComposition,
      defenderRemaining: result.defenderRemaining,
      defenderLosses: result.defenderLosses,
      debris: result.debris,
      loot: result.loot,
      moonChance: result.moonChance,
      moonCreated: result.moonCreated,
      totalRounds: result.totalRounds,
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Merge multiple fleets into one
   */
  private mergeFleets(fleets: FleetComposition[]): FleetComposition {
    const merged: FleetComposition = {}

    for (const fleet of fleets) {
      for (const [ship, count] of Object.entries(fleet)) {
        if (count && count > 0) {
          merged[ship as keyof FleetComposition] =
            (merged[ship as keyof FleetComposition] || 0) + count
        }
      }
    }

    return merged
  }

  /**
   * Average technology levels across multiple participants
   */
  private averageTechLevels(techLevels: TechLevels[]): TechLevels {
    if (techLevels.length === 0) {
      return { weaponsTech: 0, shieldTech: 0, armorTech: 0 }
    }

    const totals = techLevels.reduce(
      (acc, tech) => ({
        weapons: acc.weapons + tech.weaponsTech,
        shields: acc.shields + tech.shieldTech,
        armor: acc.armor + tech.armorTech,
      }),
      { weapons: 0, shields: 0, armor: 0 }
    )

    return {
      weaponsTech: Math.round(totals.weapons / techLevels.length),
      shieldTech: Math.round(totals.shields / techLevels.length),
      armorTech: Math.round(totals.armor / techLevels.length),
    }
  }

  /**
   * Distribute losses and loot among attackers based on their fleet contribution
   */
  private distributeAttackerResults(
    attackers: ACSParticipantFleet[],
    totalLosses: Partial<ShipCounts>,
    totalLoot: Resources
  ): ACSParticipantResult[] {
    const results: ACSParticipantResult[] = []

    // Calculate total ships per type for each attacker
    const attackerShipCounts = attackers.map(a => {
      let total = 0
      for (const count of Object.values(a.fleet)) {
        total += count || 0
      }
      return total
    })

    const totalShips = attackerShipCounts.reduce((sum, c) => sum + c, 0)

    // Calculate cargo capacity for loot distribution
    const cargoCapacities = attackers.map(a => this.calculateCargoCapacity(a.fleet))
    const totalCargo = cargoCapacities.reduce((sum, c) => sum + c, 0)

    for (let i = 0; i < attackers.length; i++) {
      const attacker = attackers[i]
      const proportion = totalShips > 0 ? attackerShipCounts[i] / totalShips : 0
      const cargoProportion = totalCargo > 0 ? cargoCapacities[i] / totalCargo : 0

      // Distribute losses proportionally
      const shipsLost: Partial<ShipCounts> = {}
      for (const [ship, lostCount] of Object.entries(totalLosses)) {
        if (lostCount && lostCount > 0) {
          const attackerHad = attacker.fleet[ship as keyof FleetComposition] || 0
          // Cap losses at what they actually had
          shipsLost[ship as keyof ShipCounts] = Math.min(
            Math.ceil(lostCount * proportion),
            attackerHad
          )
        }
      }

      // Calculate remaining ships
      const shipsRemaining: Partial<ShipCounts> = {}
      for (const [ship, count] of Object.entries(attacker.fleet)) {
        if (count && count > 0) {
          const lost = shipsLost[ship as keyof ShipCounts] || 0
          const remaining = count - lost
          if (remaining > 0) {
            shipsRemaining[ship as keyof ShipCounts] = remaining
          }
        }
      }

      // Distribute loot based on cargo capacity
      const lootShare: Resources = {
        metal: Math.floor(totalLoot.metal * cargoProportion),
        crystal: Math.floor(totalLoot.crystal * cargoProportion),
        deuterium: Math.floor(totalLoot.deuterium * cargoProportion),
      }

      results.push({
        userId: attacker.userId,
        shipsRemaining,
        shipsLost,
        lootShare,
        metalLossValue: 0, // Would need ship costs to calculate
        crystalLossValue: 0,
        deuteriumLossValue: 0,
      })
    }

    return results
  }

  /**
   * Distribute losses among defenders
   */
  private distributeDefenderResults(
    defenders: Array<{ userId: string; fleet: FleetComposition; techLevels: TechLevels }>,
    totalLosses: Partial<ShipCounts>,
    planetOwnerId: string
  ): ACSParticipantResult[] {
    const results: ACSParticipantResult[] = []

    // Calculate total ships per type for each defender
    const defenderShipCounts = defenders.map(d => {
      let total = 0
      for (const count of Object.values(d.fleet)) {
        total += count || 0
      }
      return total
    })

    const totalShips = defenderShipCounts.reduce((sum, c) => sum + c, 0)

    for (let i = 0; i < defenders.length; i++) {
      const defender = defenders[i]
      const proportion = totalShips > 0 ? defenderShipCounts[i] / totalShips : 0

      // Distribute losses proportionally
      const shipsLost: Partial<ShipCounts> = {}
      for (const [ship, lostCount] of Object.entries(totalLosses)) {
        if (lostCount && lostCount > 0) {
          const defenderHad = defender.fleet[ship as keyof FleetComposition] || 0
          shipsLost[ship as keyof ShipCounts] = Math.min(
            Math.ceil(lostCount * proportion),
            defenderHad
          )
        }
      }

      // Calculate remaining ships
      const shipsRemaining: Partial<ShipCounts> = {}
      for (const [ship, count] of Object.entries(defender.fleet)) {
        if (count && count > 0) {
          const lost = shipsLost[ship as keyof ShipCounts] || 0
          const remaining = count - lost
          if (remaining > 0) {
            shipsRemaining[ship as keyof ShipCounts] = remaining
          }
        }
      }

      results.push({
        userId: defender.userId,
        shipsRemaining,
        shipsLost,
        lootShare: { metal: 0, crystal: 0, deuterium: 0 }, // Defenders don't get loot
        metalLossValue: 0,
        crystalLossValue: 0,
        deuteriumLossValue: 0,
      })
    }

    return results
  }

  /**
   * Calculate cargo capacity for a fleet (uses database config)
   */
  private calculateCargoCapacity(fleet: FleetComposition): number {
    let total = 0
    for (const [ship, count] of Object.entries(fleet)) {
      if (count && count > 0) {
        total += getShipCargoCapacity(ship) * count
      }
    }
    return total
  }
}

/**
 * Factory function for creating ACS Battle Engine
 *
 * This async factory ensures battle config is loaded before use.
 */
export async function createACSBattleEngine(
  options?: { maxRounds?: number; randomFn?: () => number }
): Promise<ACSBattleEngine> {
  return ACSBattleEngine.create(options)
}
