/**
 * Advanced Battle Engine
 *
 * Combat simulation engine with multi-damage types, status effects,
 * and cinematic event tracking for replay/animation.
 */

import type {
  DamageTypes,
  StatusEffect,
  AdvancedDamageResult,
  DamageEvent,
} from './damage-types'
import { tickStatusEffects, getTotalDamage, EMPTY_DAMAGE } from './damage-types'
import type {
  AdvancedCombatUnit,
  AdvancedTechLevels,
  AdvancedUnitBaseStats,
  UnitClass,
} from './advanced-unit'
import {
  createAdvancedCombatUnit,
  canAttack,
  canBeTargeted,
  regenerateUnitShields,
  tickUnitStatusEffects,
  shouldExplode,
  getUnitClass,
} from './advanced-unit'
import { calculateAdvancedDamage } from './damage-calculator'
import {
  initAdvancedBattleConfig,
  getAdvancedShipStats,
  getAdvancedDefenseStats,
  getAdvancedRapidFire,
} from './advanced-config'
import type { FleetComposition, DefenseComposition, Resources, TechLevels } from './types'
import type { ShipCounts } from '../missions/types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Battle options
 */
export interface AdvancedBattleOptions {
  maxRounds: number
  debrisPercentage: number
  moonChancePerDebris: number
  maxMoonChance: number
  randomFn: () => number
  /** Enable detailed event tracking for cinematic replay */
  trackEvents: boolean
  /** Enable advanced damage system (multi-type) */
  useAdvancedDamage: boolean
}

const DEFAULT_ADVANCED_OPTIONS: AdvancedBattleOptions = {
  maxRounds: 6,
  debrisPercentage: 0.3,
  moonChancePerDebris: 1,
  maxMoonChance: 20,
  randomFn: Math.random,
  trackEvents: true,
  useAdvancedDamage: true,
}

/**
 * Battle event for cinematic replay
 */
export interface BattleTimelineEvent {
  timestamp: number
  round: number
  type: string
  sourceId?: string
  sourceKey?: string
  targetId?: string
  targetKey?: string
  data: Record<string, unknown>
}

/**
 * Round statistics
 */
export interface AdvancedRoundStats {
  roundNumber: number
  attackerUnits: number
  defenderUnits: number
  attackerShots: number
  defenderShots: number
  attackerDamage: DamageTypes
  defenderDamage: DamageTypes
  attackerCriticalHits: number
  defenderCriticalHits: number
  attackerUnitsLost: number
  defenderUnitsLost: number
  statusEffectsApplied: number
  hackingAttempts: number
}

/**
 * Complete battle result with advanced statistics
 */
export interface AdvancedBattleResult {
  winner: 'attacker' | 'defender' | 'draw'
  rounds: AdvancedRoundStats[]
  totalRounds: number

  // Remaining units
  attackerRemaining: {
    ships: Partial<ShipCounts>
    totalUnits: number
  }
  defenderRemaining: {
    ships: Partial<ShipCounts>
    defense: Partial<DefenseComposition>
    totalUnits: number
  }

  // Losses
  attackerLosses: {
    ships: Partial<ShipCounts>
    totalUnits: number
    metalValue: number
    crystalValue: number
    deuteriumValue: number
  }
  defenderLosses: {
    ships: Partial<ShipCounts>
    defense: Partial<DefenseComposition>
    totalUnits: number
    metalValue: number
    crystalValue: number
    deuteriumValue: number
  }

  // Battle spoils
  debris: { metal: number; crystal: number }
  loot: Resources
  moonChance: number
  moonCreated: boolean

  // Advanced statistics
  statistics: {
    totalDamageDealt: DamageTypes
    totalDamageTaken: DamageTypes
    criticalHits: number
    hackingAttempts: number
    hackingSuccesses: number
    statusEffectsApplied: number
  }

  // Timeline for cinematic replay
  timeline: BattleTimelineEvent[]
}

// ============================================================================
// ADVANCED BATTLE ENGINE
// ============================================================================

export class AdvancedBattleEngine {
  private attackerTech: AdvancedTechLevels
  private defenderTech: AdvancedTechLevels
  private options: AdvancedBattleOptions
  private timeline: BattleTimelineEvent[] = []
  private currentTimestamp = 0

  private constructor(
    attackerTech: AdvancedTechLevels,
    defenderTech: AdvancedTechLevels,
    options: Partial<AdvancedBattleOptions> = {}
  ) {
    this.attackerTech = attackerTech
    this.defenderTech = defenderTech
    this.options = { ...DEFAULT_ADVANCED_OPTIONS, ...options }
  }

  /**
   * Create and initialize the engine
   */
  static async create(
    attackerTech: AdvancedTechLevels | TechLevels,
    defenderTech: AdvancedTechLevels | TechLevels,
    options: Partial<AdvancedBattleOptions> = {}
  ): Promise<AdvancedBattleEngine> {
    await initAdvancedBattleConfig()

    // Convert legacy tech levels if needed
    const advAttackerTech = this.convertTechLevels(attackerTech)
    const advDefenderTech = this.convertTechLevels(defenderTech)

    return new AdvancedBattleEngine(advAttackerTech, advDefenderTech, options)
  }

  /**
   * Convert legacy tech levels to advanced
   */
  private static convertTechLevels(tech: AdvancedTechLevels | TechLevels): AdvancedTechLevels {
    return {
      weaponsTech: tech.weaponsTech,
      shieldTech: tech.shieldTech,
      armorTech: tech.armorTech,
      ionicTech: (tech as AdvancedTechLevels).ionicTech ?? 0,
      hackingTech: (tech as AdvancedTechLevels).hackingTech ?? 0,
      boardingTech: (tech as AdvancedTechLevels).boardingTech ?? 0,
    }
  }

  /**
   * Simulate a complete battle
   */
  simulate(
    attackerFleet: FleetComposition,
    defenderFleet: FleetComposition,
    defenderDefense: DefenseComposition,
    defenderResources: Resources = { metal: 0, crystal: 0, deuterium: 0 }
  ): AdvancedBattleResult {
    this.timeline = []
    this.currentTimestamp = 0

    // Create combat units
    const attackerUnits = this.createUnitsFromFleet(attackerFleet, this.attackerTech, 'attacker')
    const defenderShipUnits = this.createUnitsFromFleet(defenderFleet, this.defenderTech, 'defender')
    const defenderDefenseUnits = this.createUnitsFromDefense(defenderDefense, this.defenderTech, 'defender')
    const defenderUnits = [...defenderShipUnits, ...defenderDefenseUnits]

    // Store initial counts for loss calculation
    const initialAttackerCounts = this.countUnits(attackerUnits)
    const initialDefenderCounts = this.countUnits(defenderUnits)

    // Track statistics
    const stats = {
      totalDamageDealt: { ...EMPTY_DAMAGE },
      totalDamageTaken: { ...EMPTY_DAMAGE },
      criticalHits: 0,
      hackingAttempts: 0,
      hackingSuccesses: 0,
      statusEffectsApplied: 0,
    }

    // Execute combat rounds
    const rounds: AdvancedRoundStats[] = []
    let roundNumber = 0

    this.addTimelineEvent(0, 'battle_start', {
      attackerUnits: attackerUnits.length,
      defenderUnits: defenderUnits.length,
    })

    while (roundNumber < this.options.maxRounds) {
      roundNumber++

      const attackerAlive = attackerUnits.filter(u => !u.destroyed)
      const defenderAlive = defenderUnits.filter(u => !u.destroyed)

      if (attackerAlive.length === 0 || defenderAlive.length === 0) {
        break
      }

      const roundStats = this.executeRound(
        roundNumber,
        attackerUnits,
        defenderUnits,
        stats
      )
      rounds.push(roundStats)

      // Regenerate shields and tick status effects
      this.endRound(attackerUnits, defenderUnits)
    }

    // Determine winner
    const winner = this.determineWinner(attackerUnits, defenderUnits)

    this.addTimelineEvent(roundNumber, 'battle_end', { winner })

    // Calculate remaining and losses
    const attackerRemaining = this.getRemainingShips(attackerUnits)
    const defenderRemainingShips = this.getRemainingShips(defenderUnits)
    const defenderRemainingDefense = this.getRemainingDefense(defenderUnits)

    const attackerLosses = this.calculateLosses(initialAttackerCounts, attackerUnits, 'ship')
    const defenderShipLosses = this.calculateLosses(
      initialDefenderCounts,
      defenderUnits.filter(u => u.type === 'ship'),
      'ship'
    )
    const defenderDefenseLosses = this.calculateLosses(
      initialDefenderCounts,
      defenderUnits.filter(u => u.type === 'defense'),
      'defense'
    )

    // Generate debris
    const debris = this.generateDebris(attackerLosses.ships, defenderShipLosses.ships)

    // Calculate loot
    let loot: Resources = { metal: 0, crystal: 0, deuterium: 0 }
    if (winner === 'attacker') {
      const cargoCapacity = this.calculateCargoCapacity(attackerRemaining)
      loot = this.calculateLoot(defenderResources, cargoCapacity)
    }

    // Moon chance
    const moonChance = this.calculateMoonChance(debris)
    const moonCreated = this.options.randomFn() * 100 < moonChance

    return {
      winner,
      rounds,
      totalRounds: rounds.length,

      attackerRemaining: {
        ships: attackerRemaining,
        totalUnits: attackerUnits.filter(u => !u.destroyed).length,
      },
      defenderRemaining: {
        ships: defenderRemainingShips,
        defense: defenderRemainingDefense,
        totalUnits: defenderUnits.filter(u => !u.destroyed).length,
      },

      attackerLosses: {
        ships: attackerLosses.ships as Partial<ShipCounts>,
        totalUnits: attackerLosses.count,
        metalValue: attackerLosses.metalValue,
        crystalValue: attackerLosses.crystalValue,
        deuteriumValue: attackerLosses.deuteriumValue,
      },
      defenderLosses: {
        ships: defenderShipLosses.ships as Partial<ShipCounts>,
        defense: defenderDefenseLosses.ships as Partial<DefenseComposition>,
        totalUnits: defenderShipLosses.count + defenderDefenseLosses.count,
        metalValue: defenderShipLosses.metalValue + defenderDefenseLosses.metalValue,
        crystalValue: defenderShipLosses.crystalValue + defenderDefenseLosses.crystalValue,
        deuteriumValue: defenderShipLosses.deuteriumValue + defenderDefenseLosses.deuteriumValue,
      },

      debris,
      loot,
      moonChance,
      moonCreated,

      statistics: stats,
      timeline: this.timeline,
    }
  }

  /**
   * Execute a single combat round
   */
  private executeRound(
    roundNumber: number,
    attackerUnits: AdvancedCombatUnit[],
    defenderUnits: AdvancedCombatUnit[],
    stats: AdvancedBattleResult['statistics']
  ): AdvancedRoundStats {
    this.addTimelineEvent(roundNumber, 'round_start', { roundNumber })

    const roundStats: AdvancedRoundStats = {
      roundNumber,
      attackerUnits: attackerUnits.filter(u => !u.destroyed).length,
      defenderUnits: defenderUnits.filter(u => !u.destroyed).length,
      attackerShots: 0,
      defenderShots: 0,
      attackerDamage: { ...EMPTY_DAMAGE },
      defenderDamage: { ...EMPTY_DAMAGE },
      attackerCriticalHits: 0,
      defenderCriticalHits: 0,
      attackerUnitsLost: 0,
      defenderUnitsLost: 0,
      statusEffectsApplied: 0,
      hackingAttempts: 0,
    }

    const initialDefenderCount = defenderUnits.filter(u => !u.destroyed).length
    const initialAttackerCount = attackerUnits.filter(u => !u.destroyed).length

    // Attacker fires
    for (const attacker of attackerUnits) {
      if (attacker.destroyed) continue

      const aliveDefenders = () => defenderUnits.filter(u => !u.destroyed)
      if (aliveDefenders().length === 0) break

      const { shots, damage, crits, effectsApplied, hackAttempts } = this.fireUnit(
        attacker,
        aliveDefenders,
        roundNumber
      )

      roundStats.attackerShots += shots
      roundStats.attackerDamage = this.mergeDamage(roundStats.attackerDamage, damage)
      roundStats.attackerCriticalHits += crits
      roundStats.statusEffectsApplied += effectsApplied
      roundStats.hackingAttempts += hackAttempts

      stats.criticalHits += crits
      stats.statusEffectsApplied += effectsApplied
      stats.hackingAttempts += hackAttempts
    }

    // Defender fires
    for (const defender of defenderUnits) {
      if (defender.destroyed) continue

      const aliveAttackers = () => attackerUnits.filter(u => !u.destroyed)
      if (aliveAttackers().length === 0) break

      const { shots, damage, crits, effectsApplied, hackAttempts } = this.fireUnit(
        defender,
        aliveAttackers,
        roundNumber
      )

      roundStats.defenderShots += shots
      roundStats.defenderDamage = this.mergeDamage(roundStats.defenderDamage, damage)
      roundStats.defenderCriticalHits += crits
      roundStats.statusEffectsApplied += effectsApplied
      roundStats.hackingAttempts += hackAttempts

      stats.criticalHits += crits
      stats.statusEffectsApplied += effectsApplied
      stats.hackingAttempts += hackAttempts
    }

    // Update total damage stats
    stats.totalDamageDealt = this.mergeDamage(stats.totalDamageDealt, roundStats.attackerDamage)
    stats.totalDamageTaken = this.mergeDamage(stats.totalDamageTaken, roundStats.defenderDamage)

    // Calculate units lost this round
    roundStats.defenderUnitsLost = initialDefenderCount - defenderUnits.filter(u => !u.destroyed).length
    roundStats.attackerUnitsLost = initialAttackerCount - attackerUnits.filter(u => !u.destroyed).length

    this.addTimelineEvent(roundNumber, 'round_end', {
      attackerUnitsRemaining: attackerUnits.filter(u => !u.destroyed).length,
      defenderUnitsRemaining: defenderUnits.filter(u => !u.destroyed).length,
    })

    return roundStats
  }

  /**
   * Fire a unit at targets with rapid fire
   */
  private fireUnit(
    attacker: AdvancedCombatUnit,
    getTargets: () => AdvancedCombatUnit[],
    roundNumber: number
  ): {
    shots: number
    damage: DamageTypes
    crits: number
    effectsApplied: number
    hackAttempts: number
  } {
    if (!canAttack(attacker)) {
      return { shots: 0, damage: { ...EMPTY_DAMAGE }, crits: 0, effectsApplied: 0, hackAttempts: 0 }
    }

    let shots = 0
    let totalDamage: DamageTypes = { ...EMPTY_DAMAGE }
    let crits = 0
    let effectsApplied = 0
    let hackAttempts = 0
    let continueRapidFire = true

    while (continueRapidFire) {
      const targets = getTargets()
      if (targets.length === 0) break

      // Select random target
      const targetIndex = Math.floor(this.options.randomFn() * targets.length)
      const target = targets[targetIndex]

      // Calculate and apply damage
      const result = calculateAdvancedDamage(attacker, target, this.options.randomFn)
      shots++

      if (result.hit) {
        totalDamage = this.mergeDamage(totalDamage, result.finalDamage)

        if (result.critical) {
          crits++
        }

        effectsApplied += result.effects.length

        // Count hacking attempts
        for (const event of result.events) {
          if (event.type === 'hack_success' || event.type === 'hack_failed') {
            hackAttempts++
          }
        }

        // Add timeline events
        if (this.options.trackEvents) {
          this.addTimelineEvent(roundNumber, 'attack', {
            hit: true,
            critical: result.critical,
            damage: result.finalDamage,
            appliedDamage: result.appliedDamage,
          }, attacker, target)

          for (const event of result.events) {
            this.addTimelineEvent(roundNumber, event.type, event.data, attacker, target)
          }
        }

        // Check for destruction/explosion
        if (target.destroyed || shouldExplode(target, 0.7, this.options.randomFn)) {
          target.destroyed = true

          if (this.options.trackEvents) {
            this.addTimelineEvent(roundNumber, 'unit_destroyed', {
              unitKey: target.unitKey,
            }, attacker, target)
          }
        }
      }

      // Check rapid fire
      const rapidFireValue = getAdvancedRapidFire(attacker.unitKey, target.unitKey)
      if (rapidFireValue > 1) {
        const continueChance = (rapidFireValue - 1) / rapidFireValue
        continueRapidFire = this.options.randomFn() < continueChance
      } else {
        continueRapidFire = false
      }

      // Safety limit
      if (shots >= 1000) break
    }

    return { shots, damage: totalDamage, crits, effectsApplied, hackAttempts }
  }

  /**
   * End round - regenerate shields, tick effects
   */
  private endRound(
    attackerUnits: AdvancedCombatUnit[],
    defenderUnits: AdvancedCombatUnit[]
  ): void {
    for (const unit of [...attackerUnits, ...defenderUnits]) {
      if (!unit.destroyed) {
        regenerateUnitShields(unit)
        tickUnitStatusEffects(unit)
      }
    }
  }

  /**
   * Create combat units from fleet composition
   */
  private createUnitsFromFleet(
    fleet: FleetComposition,
    tech: AdvancedTechLevels,
    ownerId: string
  ): AdvancedCombatUnit[] {
    const units: AdvancedCombatUnit[] = []

    for (const [shipKey, count] of Object.entries(fleet)) {
      if (!count || count <= 0) continue

      const stats = getAdvancedShipStats(shipKey)
      if (!stats) continue

      const baseStats: AdvancedUnitBaseStats = {
        unitKey: stats.key,
        unitId: stats.id,
        type: 'ship',
        category: stats.category,
        unitClass: stats.unitClass,
        shieldPower: stats.shieldPower,
        armorValue: stats.armorValue,
        structuralIntegrity: stats.structuralIntegrity,
        shieldRegenRate: stats.shieldRegenRate,
        damage: stats.damage,
        weaponPower: stats.weaponPower,
        resistances: stats.resistances,
        stats: stats.combatStats,
        crewCapacity: stats.combatStats.crewMax,
        cost: stats.cost,
      }

      for (let i = 0; i < count; i++) {
        units.push(createAdvancedCombatUnit(baseStats, tech, ownerId))
      }
    }

    return units
  }

  /**
   * Create combat units from defense composition
   */
  private createUnitsFromDefense(
    defense: DefenseComposition,
    tech: AdvancedTechLevels,
    ownerId: string
  ): AdvancedCombatUnit[] {
    const units: AdvancedCombatUnit[] = []

    for (const [defenseKey, count] of Object.entries(defense)) {
      if (!count || count <= 0) continue

      const stats = getAdvancedDefenseStats(defenseKey)
      if (!stats) continue

      const baseStats: AdvancedUnitBaseStats = {
        unitKey: stats.key,
        unitId: stats.id,
        type: 'defense',
        category: 'military',
        unitClass: 'defense',
        shieldPower: stats.shieldPower,
        armorValue: stats.armorValue,
        structuralIntegrity: stats.structuralIntegrity,
        damage: stats.damage,
        weaponPower: stats.weaponPower,
        resistances: stats.resistances,
        stats: {
          ...stats.combatStats,
          evasion: 0,
          crewCurrent: 0,
          crewMax: 0,
        },
        cost: stats.cost,
      }

      for (let i = 0; i < count; i++) {
        units.push(createAdvancedCombatUnit(baseStats, tech, ownerId))
      }
    }

    return units
  }

  /**
   * Add event to timeline
   */
  private addTimelineEvent(
    round: number,
    type: string,
    data: Record<string, unknown>,
    source?: AdvancedCombatUnit,
    target?: AdvancedCombatUnit
  ): void {
    if (!this.options.trackEvents) return

    this.timeline.push({
      timestamp: this.currentTimestamp++,
      round,
      type,
      sourceId: source?.id,
      sourceKey: source?.unitKey,
      targetId: target?.id,
      targetKey: target?.unitKey,
      data,
    })
  }

  /**
   * Merge two damage objects
   */
  private mergeDamage(a: DamageTypes, b: DamageTypes): DamageTypes {
    return {
      ballistic: a.ballistic + b.ballistic,
      ionic: a.ionic + b.ionic,
      explosive: a.explosive + b.explosive,
      hacking: a.hacking + b.hacking,
      boarding: a.boarding + b.boarding,
    }
  }

  /**
   * Count units by key
   */
  private countUnits(units: AdvancedCombatUnit[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const unit of units) {
      counts[unit.unitKey] = (counts[unit.unitKey] || 0) + 1
    }
    return counts
  }

  /**
   * Determine battle winner
   */
  private determineWinner(
    attackerUnits: AdvancedCombatUnit[],
    defenderUnits: AdvancedCombatUnit[]
  ): 'attacker' | 'defender' | 'draw' {
    const attackerAlive = attackerUnits.filter(u => !u.destroyed).length
    const defenderAlive = defenderUnits.filter(u => !u.destroyed).length

    if (attackerAlive > 0 && defenderAlive === 0) return 'attacker'
    if (defenderAlive > 0 && attackerAlive === 0) return 'defender'
    return 'draw'
  }

  /**
   * Get remaining ships
   */
  private getRemainingShips(units: AdvancedCombatUnit[]): Partial<ShipCounts> {
    const ships: Partial<ShipCounts> = {}
    for (const unit of units) {
      if (unit.destroyed || unit.type !== 'ship') continue
      const key = unit.unitKey as keyof ShipCounts
      ships[key] = (ships[key] || 0) + 1
    }
    return ships
  }

  /**
   * Get remaining defense
   */
  private getRemainingDefense(units: AdvancedCombatUnit[]): Partial<DefenseComposition> {
    const defense: Partial<DefenseComposition> = {}
    for (const unit of units) {
      if (unit.destroyed || unit.type !== 'defense') continue
      const key = unit.unitKey as keyof DefenseComposition
      defense[key] = (defense[key] || 0) + 1
    }
    return defense
  }

  /**
   * Calculate losses
   */
  private calculateLosses(
    initialCounts: Record<string, number>,
    remainingUnits: AdvancedCombatUnit[],
    unitType: 'ship' | 'defense'
  ): {
    ships: Record<string, number>
    count: number
    metalValue: number
    crystalValue: number
    deuteriumValue: number
  } {
    const remainingCounts: Record<string, number> = {}
    for (const unit of remainingUnits) {
      if (unit.destroyed || unit.type !== unitType) continue
      remainingCounts[unit.unitKey] = (remainingCounts[unit.unitKey] || 0) + 1
    }

    const losses: Record<string, number> = {}
    let metalValue = 0
    let crystalValue = 0
    let deuteriumValue = 0
    let count = 0

    for (const [key, initialCount] of Object.entries(initialCounts)) {
      const remaining = remainingCounts[key] || 0
      const lost = initialCount - remaining

      if (lost > 0) {
        losses[key] = lost
        count += lost

        const stats = unitType === 'ship'
          ? getAdvancedShipStats(key)
          : getAdvancedDefenseStats(key)

        if (stats) {
          metalValue += stats.cost.metal * lost
          crystalValue += stats.cost.crystal * lost
          deuteriumValue += stats.cost.deuterium * lost
        }
      }
    }

    return { ships: losses, count, metalValue, crystalValue, deuteriumValue }
  }

  /**
   * Generate debris from destroyed ships
   */
  private generateDebris(
    attackerLosses: Record<string, number>,
    defenderLosses: Record<string, number>
  ): { metal: number; crystal: number } {
    let totalMetal = 0
    let totalCrystal = 0

    for (const [key, count] of Object.entries({ ...attackerLosses, ...defenderLosses })) {
      const stats = getAdvancedShipStats(key)
      if (stats) {
        totalMetal += stats.cost.metal * count
        totalCrystal += stats.cost.crystal * count
      }
    }

    return {
      metal: Math.floor(totalMetal * this.options.debrisPercentage),
      crystal: Math.floor(totalCrystal * this.options.debrisPercentage),
    }
  }

  /**
   * Calculate cargo capacity
   */
  private calculateCargoCapacity(ships: Partial<ShipCounts>): number {
    let total = 0
    for (const [key, count] of Object.entries(ships)) {
      if (count) {
        const stats = getAdvancedShipStats(key)
        if (stats) {
          total += stats.cargoCapacity * count
        }
      }
    }
    return total
  }

  /**
   * Calculate loot
   */
  private calculateLoot(resources: Resources, cargoCapacity: number): Resources {
    const maxLoot = {
      metal: Math.floor(resources.metal * 0.5),
      crystal: Math.floor(resources.crystal * 0.5),
      deuterium: Math.floor(resources.deuterium * 0.5),
    }

    const totalAvailable = maxLoot.metal + maxLoot.crystal + maxLoot.deuterium

    if (totalAvailable <= cargoCapacity) {
      return maxLoot
    }

    const ratio = cargoCapacity / totalAvailable
    return {
      metal: Math.floor(maxLoot.metal * ratio),
      crystal: Math.floor(maxLoot.crystal * ratio),
      deuterium: Math.floor(maxLoot.deuterium * ratio),
    }
  }

  /**
   * Calculate moon chance
   */
  private calculateMoonChance(debris: { metal: number; crystal: number }): number {
    const totalDebris = debris.metal + debris.crystal
    const chance = Math.floor(totalDebris / 100000) * this.options.moonChancePerDebris
    return Math.min(chance, this.options.maxMoonChance)
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Simulate a battle with the advanced engine
 */
export async function simulateAdvancedBattle(
  attackerFleet: FleetComposition,
  attackerTech: AdvancedTechLevels | TechLevels,
  defenderFleet: FleetComposition,
  defenderDefense: DefenseComposition,
  defenderTech: AdvancedTechLevels | TechLevels,
  defenderResources: Resources = { metal: 0, crystal: 0, deuterium: 0 },
  options: Partial<AdvancedBattleOptions> = {}
): Promise<AdvancedBattleResult> {
  const engine = await AdvancedBattleEngine.create(attackerTech, defenderTech, options)
  return engine.simulate(attackerFleet, defenderFleet, defenderDefense, defenderResources)
}
