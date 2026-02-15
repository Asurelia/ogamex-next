/**
 * Boarding Combat System
 *
 * Implements ship capture mechanics through boarding actions:
 * - Approach phase: Getting close to target
 * - Breach phase: Penetrating hull defenses
 * - Combat phase: Crew vs crew fighting
 * - Resolution: Capture, sabotage, or repelled
 */

import type { AdvancedCombatUnit } from './advanced-unit'
import type { StatusEffect } from './damage-types'

// ============================================================================
// BOARDING TYPES
// ============================================================================

/**
 * Boarding action phases
 */
export type BoardingPhase =
  | 'approach'    // Getting close to target
  | 'breach'      // Penetrating defenses
  | 'combat'      // Crew fighting
  | 'resolution'  // Final outcome

/**
 * Boarding action outcome
 */
export type BoardingOutcome =
  | 'captured'           // Ship captured by boarders
  | 'sabotaged'          // Ship damaged/disabled
  | 'repelled'           // Boarding failed, boarders destroyed
  | 'mutual_destruction' // Both crews eliminated
  | 'retreated'          // Boarders retreated

/**
 * Crew combat unit
 */
export interface CrewUnit {
  /** Unit identifier */
  id: string
  /** Type of crew (marine, soldier, security, engineer) */
  type: CrewType
  /** Current health points */
  health: number
  /** Maximum health points */
  maxHealth: number
  /** Attack power */
  attack: number
  /** Defense value */
  defense: number
  /** Special abilities */
  abilities: CrewAbility[]
  /** Status effects */
  statusEffects: StatusEffect[]
  /** Whether unit is eliminated */
  eliminated: boolean
}

/**
 * Types of crew members
 */
export type CrewType =
  | 'marine'     // Assault specialists, high attack
  | 'soldier'    // Standard combat crew
  | 'security'   // Defense specialists
  | 'engineer'   // Can sabotage systems
  | 'officer'    // Provides bonuses to nearby units
  | 'elite'      // Special forces, all-around strong

/**
 * Crew special abilities
 */
export type CrewAbility =
  | 'breach_expert'     // Bonus during breach phase
  | 'close_combat'      // Bonus in melee
  | 'suppression'       // Reduces enemy effectiveness
  | 'medic'             // Heals nearby units
  | 'saboteur'          // Can disable ship systems
  | 'leader'            // Morale bonus to nearby units
  | 'heavy_armor'       // Damage reduction
  | 'stealth'           // Chance to avoid being targeted

/**
 * Boarding party configuration
 */
export interface BoardingParty {
  /** Boarding ship source */
  sourceUnitId: string
  /** Target ship */
  targetUnitId: string
  /** Crew members in party */
  crew: CrewUnit[]
  /** Total boarding power */
  boardingPower: number
  /** Equipment/tools for breach */
  breachEquipment: BreachEquipment[]
}

/**
 * Breach equipment types
 */
export interface BreachEquipment {
  type: 'plasma_cutter' | 'explosive_charge' | 'hacking_device' | 'teleporter'
  power: number
  uses: number
}

/**
 * Ship defense configuration
 */
export interface ShipDefenses {
  /** Anti-boarding turrets */
  pointDefense: number
  /** Hull reinforcement level */
  hullIntegrity: number
  /** Security crew */
  securityCrew: CrewUnit[]
  /** Total defense power */
  antiBoarding: number
  /** Active countermeasures */
  countermeasures: Countermeasure[]
}

/**
 * Countermeasure types
 */
export interface Countermeasure {
  type: 'gas_defense' | 'bulkhead_seal' | 'self_destruct' | 'emergency_vent'
  active: boolean
  power: number
}

// ============================================================================
// BOARDING EVENT TYPES
// ============================================================================

/**
 * Event during boarding action
 */
export interface BoardingEvent {
  timestamp: number
  phase: BoardingPhase
  type: BoardingEventType
  data: Record<string, unknown>
}

export type BoardingEventType =
  | 'approach_start'
  | 'approach_intercepted'
  | 'approach_success'
  | 'breach_attempt'
  | 'breach_success'
  | 'breach_failed'
  | 'combat_round'
  | 'crew_eliminated'
  | 'ability_used'
  | 'countermeasure_triggered'
  | 'system_sabotaged'
  | 'boarding_complete'
  | 'boarding_repelled'
  | 'ship_captured'
  | 'retreat'

// ============================================================================
// BOARDING RESULT
// ============================================================================

/**
 * Complete boarding action result
 */
export interface BoardingResult {
  /** Final outcome */
  outcome: BoardingOutcome
  /** All phases completed */
  phasesCompleted: BoardingPhase[]
  /** Events timeline */
  events: BoardingEvent[]

  /** Attacker casualties */
  attackerLosses: {
    crewLost: number
    crewRemaining: number
  }

  /** Defender casualties */
  defenderLosses: {
    crewLost: number
    crewRemaining: number
  }

  /** If sabotaged, what was damaged */
  sabotageEffects?: SabotageEffect[]

  /** Combat statistics */
  statistics: {
    totalRounds: number
    totalDamageDealt: number
    totalDamageTaken: number
    abilitiesUsed: number
    criticalHits: number
  }
}

/**
 * Sabotage effect on ship systems
 */
export interface SabotageEffect {
  system: SabotageTarget
  severity: 'minor' | 'moderate' | 'severe' | 'critical'
  duration: number
  effect: StatusEffect
}

export type SabotageTarget =
  | 'engines'
  | 'weapons'
  | 'shields'
  | 'life_support'
  | 'power_core'
  | 'communications'
  | 'navigation'

// ============================================================================
// CREW STATS BY TYPE
// ============================================================================

/**
 * Base stats for each crew type
 */
export const CREW_BASE_STATS: Record<CrewType, {
  health: number
  attack: number
  defense: number
  abilities: CrewAbility[]
}> = {
  marine: {
    health: 100,
    attack: 25,
    defense: 15,
    abilities: ['breach_expert', 'close_combat'],
  },
  soldier: {
    health: 80,
    attack: 20,
    defense: 20,
    abilities: [],
  },
  security: {
    health: 90,
    attack: 15,
    defense: 30,
    abilities: ['suppression'],
  },
  engineer: {
    health: 60,
    attack: 10,
    defense: 10,
    abilities: ['saboteur'],
  },
  officer: {
    health: 70,
    attack: 15,
    defense: 15,
    abilities: ['leader'],
  },
  elite: {
    health: 150,
    attack: 35,
    defense: 30,
    abilities: ['close_combat', 'heavy_armor', 'leader'],
  },
}

// ============================================================================
// BOARDING CONSTANTS
// ============================================================================

export const BOARDING_CONSTANTS = {
  /** Max rounds of crew combat */
  MAX_COMBAT_ROUNDS: 10,

  /** Base chance to intercept approaching boarders */
  BASE_INTERCEPT_CHANCE: 0.2,

  /** Base chance for successful breach */
  BASE_BREACH_CHANCE: 0.5,

  /** Damage multiplier for breach expert ability */
  BREACH_EXPERT_BONUS: 1.5,

  /** Damage multiplier for close combat ability */
  CLOSE_COMBAT_BONUS: 1.3,

  /** Defense multiplier for heavy armor ability */
  HEAVY_ARMOR_REDUCTION: 0.3,

  /** Morale bonus from leader ability */
  LEADER_BONUS: 0.15,

  /** Heal amount per round for medic ability */
  MEDIC_HEAL_AMOUNT: 15,

  /** Chance to avoid targeting with stealth */
  STEALTH_AVOID_CHANCE: 0.3,

  /** Critical hit chance in crew combat */
  CRIT_CHANCE: 0.1,

  /** Critical hit multiplier */
  CRIT_MULTIPLIER: 2.0,

  /** Capture threshold (defender crew % remaining) */
  CAPTURE_THRESHOLD: 0.1,

  /** Retreat threshold (attacker crew % remaining) */
  RETREAT_THRESHOLD: 0.2,
}

// ============================================================================
// BOARDING ENGINE
// ============================================================================

/**
 * Boarding combat engine
 */
export class BoardingEngine {
  private events: BoardingEvent[] = []
  private timestamp = 0
  private randomFn: () => number

  constructor(randomFn: () => number = Math.random) {
    this.randomFn = randomFn
  }

  /**
   * Execute a boarding action
   */
  execute(
    boardingParty: BoardingParty,
    shipDefenses: ShipDefenses,
    targetUnit: AdvancedCombatUnit
  ): BoardingResult {
    this.events = []
    this.timestamp = 0

    const phasesCompleted: BoardingPhase[] = []
    const statistics = {
      totalRounds: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      abilitiesUsed: 0,
      criticalHits: 0,
    }

    // Phase 1: Approach
    const approachResult = this.executeApproachPhase(boardingParty, shipDefenses)
    phasesCompleted.push('approach')

    if (!approachResult.success) {
      return this.createResult(
        'repelled',
        phasesCompleted,
        boardingParty,
        shipDefenses,
        statistics
      )
    }

    // Phase 2: Breach
    const breachResult = this.executeBreachPhase(boardingParty, shipDefenses, targetUnit)
    phasesCompleted.push('breach')

    if (!breachResult.success) {
      return this.createResult(
        'repelled',
        phasesCompleted,
        boardingParty,
        shipDefenses,
        statistics
      )
    }

    // Phase 3: Combat
    const combatResult = this.executeCombatPhase(
      boardingParty,
      shipDefenses,
      statistics
    )
    phasesCompleted.push('combat')

    // Phase 4: Resolution
    const outcome = this.resolveBoarding(
      boardingParty,
      shipDefenses,
      combatResult
    )
    phasesCompleted.push('resolution')

    // Handle sabotage if applicable
    let sabotageEffects: SabotageEffect[] | undefined
    if (outcome === 'sabotaged') {
      sabotageEffects = this.executeSabotage(boardingParty, targetUnit)
    }

    return this.createResult(
      outcome,
      phasesCompleted,
      boardingParty,
      shipDefenses,
      statistics,
      sabotageEffects
    )
  }

  /**
   * Approach phase - getting close to target
   */
  private executeApproachPhase(
    boardingParty: BoardingParty,
    defenses: ShipDefenses
  ): { success: boolean; casualties: number } {
    this.addEvent('approach', 'approach_start', {
      boardingPower: boardingParty.boardingPower,
      defenseLevel: defenses.pointDefense,
    })

    // Calculate intercept chance based on point defense
    const interceptChance = Math.min(
      0.8,
      BOARDING_CONSTANTS.BASE_INTERCEPT_CHANCE + (defenses.pointDefense / 200)
    )

    let casualties = 0

    // Each crew member must survive approach
    for (const crew of boardingParty.crew) {
      if (this.randomFn() < interceptChance) {
        // Intercepted - take damage
        const damage = Math.floor(defenses.pointDefense * 0.5 * this.randomFn())
        crew.health -= damage
        casualties += damage

        if (crew.health <= 0) {
          crew.eliminated = true
          this.addEvent('approach', 'crew_eliminated', {
            crewId: crew.id,
            crewType: crew.type,
          })
        }
      }
    }

    const survivingCrew = boardingParty.crew.filter(c => !c.eliminated)
    const success = survivingCrew.length > 0

    if (success) {
      this.addEvent('approach', 'approach_success', {
        survivingCrew: survivingCrew.length,
        casualties,
      })
    } else {
      this.addEvent('approach', 'approach_intercepted', {
        allCrewLost: true,
      })
    }

    return { success, casualties }
  }

  /**
   * Breach phase - penetrating hull
   */
  private executeBreachPhase(
    boardingParty: BoardingParty,
    defenses: ShipDefenses,
    targetUnit: AdvancedCombatUnit
  ): { success: boolean } {
    this.addEvent('breach', 'breach_attempt', {
      equipment: boardingParty.breachEquipment.map(e => e.type),
      hullIntegrity: defenses.hullIntegrity,
    })

    // Calculate breach power
    let breachPower = 0
    for (const equipment of boardingParty.breachEquipment) {
      if (equipment.uses > 0) {
        breachPower += equipment.power
        equipment.uses--
      }
    }

    // Add crew breach expert bonuses
    for (const crew of boardingParty.crew) {
      if (!crew.eliminated && crew.abilities.includes('breach_expert')) {
        breachPower *= BOARDING_CONSTANTS.BREACH_EXPERT_BONUS
      }
    }

    // Calculate breach chance
    const hullFactor = targetUnit.defense.hull.current / targetUnit.defense.hull.max
    const breachChance = Math.min(
      0.95,
      BOARDING_CONSTANTS.BASE_BREACH_CHANCE + (breachPower / 100) - (hullFactor * 0.3)
    )

    const success = this.randomFn() < breachChance

    if (success) {
      this.addEvent('breach', 'breach_success', {
        breachPower,
        breachChance,
      })
    } else {
      this.addEvent('breach', 'breach_failed', {
        breachPower,
        breachChance,
      })
    }

    return { success }
  }

  /**
   * Combat phase - crew vs crew fighting
   */
  private executeCombatPhase(
    boardingParty: BoardingParty,
    defenses: ShipDefenses,
    statistics: BoardingResult['statistics']
  ): { attackerWon: boolean; defenderEliminated: boolean } {
    let round = 0

    while (round < BOARDING_CONSTANTS.MAX_COMBAT_ROUNDS) {
      round++
      statistics.totalRounds++

      const attackerAlive = boardingParty.crew.filter(c => !c.eliminated)
      const defenderAlive = defenses.securityCrew.filter(c => !c.eliminated)

      // Check for combat end
      if (attackerAlive.length === 0 || defenderAlive.length === 0) {
        break
      }

      // Execute combat round
      const roundResult = this.executeCombatRound(
        attackerAlive,
        defenderAlive,
        round,
        statistics
      )

      this.addEvent('combat', 'combat_round', {
        round,
        attackerRemaining: attackerAlive.filter(c => !c.eliminated).length,
        defenderRemaining: defenderAlive.filter(c => !c.eliminated).length,
        damageDealt: roundResult.damageDealt,
        damageTaken: roundResult.damageTaken,
      })

      // Check retreat threshold
      const attackerRatio = attackerAlive.filter(c => !c.eliminated).length /
                           boardingParty.crew.length
      if (attackerRatio < BOARDING_CONSTANTS.RETREAT_THRESHOLD) {
        break
      }
    }

    const attackerRemaining = boardingParty.crew.filter(c => !c.eliminated).length
    const defenderRemaining = defenses.securityCrew.filter(c => !c.eliminated).length

    return {
      attackerWon: attackerRemaining > 0 && defenderRemaining === 0,
      defenderEliminated: defenderRemaining === 0,
    }
  }

  /**
   * Execute a single combat round
   */
  private executeCombatRound(
    attackers: CrewUnit[],
    defenders: CrewUnit[],
    round: number,
    statistics: BoardingResult['statistics']
  ): { damageDealt: number; damageTaken: number } {
    let damageDealt = 0
    let damageTaken = 0

    // Apply leader bonuses
    const attackerLeaderBonus = attackers.some(c => c.abilities.includes('leader'))
      ? BOARDING_CONSTANTS.LEADER_BONUS
      : 0
    const defenderLeaderBonus = defenders.some(c => c.abilities.includes('leader'))
      ? BOARDING_CONSTANTS.LEADER_BONUS
      : 0

    // Attackers attack
    for (const attacker of attackers) {
      if (attacker.eliminated) continue

      const aliveDefenders = defenders.filter(d => !d.eliminated)
      if (aliveDefenders.length === 0) break

      // Select target (stealth can avoid)
      let target = this.selectTarget(aliveDefenders)
      if (!target) continue

      // Calculate damage
      let damage = this.calculateCrewDamage(attacker, target, attackerLeaderBonus)

      // Check for crit
      if (this.randomFn() < BOARDING_CONSTANTS.CRIT_CHANCE) {
        damage = Math.floor(damage * BOARDING_CONSTANTS.CRIT_MULTIPLIER)
        statistics.criticalHits++
      }

      target.health -= damage
      damageDealt += damage
      statistics.totalDamageDealt += damage

      if (target.health <= 0) {
        target.eliminated = true
        this.addEvent('combat', 'crew_eliminated', {
          crewId: target.id,
          crewType: target.type,
          killedBy: attacker.id,
        })
      }
    }

    // Defenders attack
    for (const defender of defenders) {
      if (defender.eliminated) continue

      const aliveAttackers = attackers.filter(a => !a.eliminated)
      if (aliveAttackers.length === 0) break

      let target = this.selectTarget(aliveAttackers)
      if (!target) continue

      let damage = this.calculateCrewDamage(defender, target, defenderLeaderBonus)

      if (this.randomFn() < BOARDING_CONSTANTS.CRIT_CHANCE) {
        damage = Math.floor(damage * BOARDING_CONSTANTS.CRIT_MULTIPLIER)
        statistics.criticalHits++
      }

      target.health -= damage
      damageTaken += damage
      statistics.totalDamageTaken += damage

      if (target.health <= 0) {
        target.eliminated = true
        this.addEvent('combat', 'crew_eliminated', {
          crewId: target.id,
          crewType: target.type,
          killedBy: defender.id,
        })
      }
    }

    // Apply medic healing
    this.applyMedicHealing(attackers)
    this.applyMedicHealing(defenders)

    return { damageDealt, damageTaken }
  }

  /**
   * Select target for attack
   */
  private selectTarget(targets: CrewUnit[]): CrewUnit | null {
    const validTargets = targets.filter(t => {
      if (t.eliminated) return false
      // Stealth can avoid targeting
      if (t.abilities.includes('stealth')) {
        return this.randomFn() > BOARDING_CONSTANTS.STEALTH_AVOID_CHANCE
      }
      return true
    })

    if (validTargets.length === 0) return null

    return validTargets[Math.floor(this.randomFn() * validTargets.length)]
  }

  /**
   * Calculate crew combat damage
   */
  private calculateCrewDamage(
    attacker: CrewUnit,
    defender: CrewUnit,
    leaderBonus: number
  ): number {
    let attack = attacker.attack * (1 + leaderBonus)

    // Close combat bonus
    if (attacker.abilities.includes('close_combat')) {
      attack *= BOARDING_CONSTANTS.CLOSE_COMBAT_BONUS
    }

    // Suppression reduces effectiveness
    if (defender.abilities.includes('suppression')) {
      attack *= 0.8
    }

    let defense = defender.defense

    // Heavy armor reduces damage
    if (defender.abilities.includes('heavy_armor')) {
      defense *= (1 + BOARDING_CONSTANTS.HEAVY_ARMOR_REDUCTION)
    }

    // Final damage calculation
    const damage = Math.max(1, Math.floor(attack - (defense * 0.5)))
    return damage
  }

  /**
   * Apply medic healing
   */
  private applyMedicHealing(crew: CrewUnit[]): void {
    const medics = crew.filter(c => !c.eliminated && c.abilities.includes('medic'))

    for (const medic of medics) {
      // Heal a random wounded ally
      const wounded = crew.filter(c =>
        !c.eliminated &&
        c.health < c.maxHealth &&
        c.id !== medic.id
      )

      if (wounded.length > 0) {
        const target = wounded[Math.floor(this.randomFn() * wounded.length)]
        target.health = Math.min(
          target.maxHealth,
          target.health + BOARDING_CONSTANTS.MEDIC_HEAL_AMOUNT
        )
      }
    }
  }

  /**
   * Resolve final boarding outcome
   */
  private resolveBoarding(
    boardingParty: BoardingParty,
    defenses: ShipDefenses,
    combatResult: { attackerWon: boolean; defenderEliminated: boolean }
  ): BoardingOutcome {
    const attackerRemaining = boardingParty.crew.filter(c => !c.eliminated).length
    const defenderRemaining = defenses.securityCrew.filter(c => !c.eliminated).length

    // Both eliminated
    if (attackerRemaining === 0 && defenderRemaining === 0) {
      this.addEvent('resolution', 'boarding_complete', { outcome: 'mutual_destruction' })
      return 'mutual_destruction'
    }

    // Attacker eliminated
    if (attackerRemaining === 0) {
      this.addEvent('resolution', 'boarding_repelled', {})
      return 'repelled'
    }

    // Check if attacker retreated
    const attackerRatio = attackerRemaining / boardingParty.crew.length
    if (attackerRatio < BOARDING_CONSTANTS.RETREAT_THRESHOLD) {
      this.addEvent('resolution', 'retreat', { remaining: attackerRemaining })
      return 'retreated'
    }

    // Defender eliminated or critically low
    const defenderRatio = defenderRemaining / defenses.securityCrew.length
    if (defenderRatio <= BOARDING_CONSTANTS.CAPTURE_THRESHOLD || combatResult.defenderEliminated) {
      // Check if engineers can sabotage instead of capture
      const hasEngineer = boardingParty.crew.some(
        c => !c.eliminated && c.type === 'engineer'
      )

      if (hasEngineer && defenderRemaining > 0) {
        this.addEvent('resolution', 'boarding_complete', { outcome: 'sabotaged' })
        return 'sabotaged'
      }

      this.addEvent('resolution', 'ship_captured', {})
      return 'captured'
    }

    // Default to sabotage if can't capture
    const hasEngineer = boardingParty.crew.some(
      c => !c.eliminated && c.type === 'engineer'
    )
    if (hasEngineer) {
      this.addEvent('resolution', 'boarding_complete', { outcome: 'sabotaged' })
      return 'sabotaged'
    }

    this.addEvent('resolution', 'retreat', { remaining: attackerRemaining })
    return 'retreated'
  }

  /**
   * Execute sabotage on target ship
   */
  private executeSabotage(
    boardingParty: BoardingParty,
    targetUnit: AdvancedCombatUnit
  ): SabotageEffect[] {
    const effects: SabotageEffect[] = []
    const engineers = boardingParty.crew.filter(
      c => !c.eliminated && c.type === 'engineer'
    )

    const targets: SabotageTarget[] = [
      'engines', 'weapons', 'shields', 'life_support', 'power_core'
    ]

    for (const engineer of engineers) {
      // Each engineer can sabotage one system
      const target = targets[Math.floor(this.randomFn() * targets.length)]
      const severity = this.rollSabotage()

      const effect: SabotageEffect = {
        system: target,
        severity,
        duration: this.getSabotageDuration(severity),
        effect: this.createSabotageEffect(target, severity),
      }

      effects.push(effect)
      targetUnit.statusEffects.push(effect.effect)

      this.addEvent('resolution', 'system_sabotaged', {
        system: target,
        severity,
        engineerId: engineer.id,
      })
    }

    return effects
  }

  /**
   * Roll for sabotage severity
   */
  private rollSabotage(): 'minor' | 'moderate' | 'severe' | 'critical' {
    const roll = this.randomFn()
    if (roll < 0.4) return 'minor'
    if (roll < 0.7) return 'moderate'
    if (roll < 0.9) return 'severe'
    return 'critical'
  }

  /**
   * Get duration based on severity
   */
  private getSabotageDuration(severity: string): number {
    switch (severity) {
      case 'minor': return 1
      case 'moderate': return 2
      case 'severe': return 3
      case 'critical': return 5
      default: return 1
    }
  }

  /**
   * Create status effect for sabotage
   */
  private createSabotageEffect(
    target: SabotageTarget,
    severity: string
  ): StatusEffect {
    const strengthMap = {
      minor: 0.2,
      moderate: 0.4,
      severe: 0.6,
      critical: 0.8,
    }
    const strength = strengthMap[severity as keyof typeof strengthMap] ?? 0.2

    const effectTypeMap: Record<SabotageTarget, StatusEffect['type']> = {
      engines: 'engines_disabled',
      weapons: 'weapons_disabled',
      shields: 'shield_disruption',
      life_support: 'crew_panic',
      power_core: 'emp_stunned',
      communications: 'system_hacked',
      navigation: 'ionized',
    }

    return {
      type: effectTypeMap[target],
      duration: this.getSabotageDuration(severity),
      strength,
      targetSystem: target as any,
    }
  }

  /**
   * Add event to timeline
   */
  private addEvent(
    phase: BoardingPhase,
    type: BoardingEventType,
    data: Record<string, unknown>
  ): void {
    this.events.push({
      timestamp: this.timestamp++,
      phase,
      type,
      data,
    })
  }

  /**
   * Create final result
   */
  private createResult(
    outcome: BoardingOutcome,
    phasesCompleted: BoardingPhase[],
    boardingParty: BoardingParty,
    defenses: ShipDefenses,
    statistics: BoardingResult['statistics'],
    sabotageEffects?: SabotageEffect[]
  ): BoardingResult {
    const attackerLost = boardingParty.crew.filter(c => c.eliminated).length
    const defenderLost = defenses.securityCrew.filter(c => c.eliminated).length

    return {
      outcome,
      phasesCompleted,
      events: this.events,
      attackerLosses: {
        crewLost: attackerLost,
        crewRemaining: boardingParty.crew.length - attackerLost,
      },
      defenderLosses: {
        crewLost: defenderLost,
        crewRemaining: defenses.securityCrew.length - defenderLost,
      },
      sabotageEffects,
      statistics,
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

let crewIdCounter = 0

/**
 * Create a crew unit
 */
export function createCrewUnit(
  type: CrewType,
  bonusHealth = 0,
  bonusAttack = 0,
  bonusDefense = 0
): CrewUnit {
  const baseStats = CREW_BASE_STATS[type]
  return {
    id: `crew_${crewIdCounter++}`,
    type,
    health: baseStats.health + bonusHealth,
    maxHealth: baseStats.health + bonusHealth,
    attack: baseStats.attack + bonusAttack,
    defense: baseStats.defense + bonusDefense,
    abilities: [...baseStats.abilities],
    statusEffects: [],
    eliminated: false,
  }
}

/**
 * Create a boarding party from a ship
 */
export function createBoardingParty(
  sourceUnit: AdvancedCombatUnit,
  targetUnitId: string,
  crewDistribution: Partial<Record<CrewType, number>> = {}
): BoardingParty {
  const crew: CrewUnit[] = []

  // Default distribution if not specified
  const distribution: Record<CrewType, number> = {
    marine: crewDistribution.marine ?? Math.floor(sourceUnit.crew.current * 0.4),
    soldier: crewDistribution.soldier ?? Math.floor(sourceUnit.crew.current * 0.3),
    security: crewDistribution.security ?? 0,
    engineer: crewDistribution.engineer ?? Math.floor(sourceUnit.crew.current * 0.1),
    officer: crewDistribution.officer ?? Math.floor(sourceUnit.crew.current * 0.1),
    elite: crewDistribution.elite ?? Math.floor(sourceUnit.crew.current * 0.1),
  }

  for (const [type, count] of Object.entries(distribution)) {
    for (let i = 0; i < count; i++) {
      crew.push(createCrewUnit(type as CrewType))
    }
  }

  return {
    sourceUnitId: sourceUnit.id,
    targetUnitId,
    crew,
    boardingPower: sourceUnit.damage.boarding,
    breachEquipment: [
      { type: 'plasma_cutter', power: 50, uses: 2 },
      { type: 'explosive_charge', power: 80, uses: 1 },
    ],
  }
}

/**
 * Create ship defenses
 */
export function createShipDefenses(
  targetUnit: AdvancedCombatUnit,
  securityCrewCount?: number
): ShipDefenses {
  const crewCount = securityCrewCount ?? Math.floor(targetUnit.crew.current * 0.5)
  const securityCrew: CrewUnit[] = []

  // Security crew composition
  for (let i = 0; i < crewCount; i++) {
    const roll = Math.random()
    if (roll < 0.5) {
      securityCrew.push(createCrewUnit('soldier'))
    } else if (roll < 0.8) {
      securityCrew.push(createCrewUnit('security'))
    } else {
      securityCrew.push(createCrewUnit('officer'))
    }
  }

  return {
    pointDefense: targetUnit.stats.pointDefense,
    hullIntegrity: targetUnit.defense.hull.current / targetUnit.defense.hull.max,
    securityCrew,
    antiBoarding: targetUnit.resistances.anti_boarding,
    countermeasures: [
      { type: 'bulkhead_seal', active: true, power: 20 },
    ],
  }
}
