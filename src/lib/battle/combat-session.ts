/**
 * Combat Session Manager
 *
 * In-memory manager for real-time combat sessions.
 * Runs AdvancedBattleEngine round-by-round with delays,
 * accepts player abilities between rounds, and broadcasts
 * events to connected SSE clients.
 */

import { randomUUID } from 'crypto'
import type {
  BattleTimelineEvent,
  AdvancedBattleResult,
  AdvancedBattleOptions,
} from './AdvancedBattleEngine'
import { BattleEngine } from './BattleEngine'
import type { FleetComposition, DefenseComposition, TechLevels, BattleResult } from './types'
import type { Resources } from '@/types/game-core'
import {
  createAbilityManager,
  type PlayerAbilityManager,
  type AbilityId,
  type AbilityEffect,
} from './player-abilities'

// ============================================================================
// TYPES
// ============================================================================

export type CombatSessionStatus = 'waiting' | 'running' | 'paused' | 'finished' | 'aborted'

export interface CombatParticipant {
  id: string
  name: string
  fleet: FleetComposition
  defense?: DefenseComposition
  tech: TechLevels
  resources?: Resources // For looting
}

export interface CombatSessionConfig {
  roundDelayMs: number // Time between rounds (for player abilities)
  maxWaitForAbilityMs: number // Max time to wait for player ability input
  enableAbilities: boolean
}

const DEFAULT_CONFIG: CombatSessionConfig = {
  roundDelayMs: 3000, // 3 seconds between rounds
  maxWaitForAbilityMs: 10000, // 10 seconds max wait
  enableAbilities: true,
}

export interface CombatSessionState {
  id: string
  status: CombatSessionStatus
  currentRound: number
  maxRounds: number
  attacker: CombatParticipant
  defender: CombatParticipant
  config: CombatSessionConfig
  // Player ability managers
  attackerAbilities: PlayerAbilityManager | null
  defenderAbilities: PlayerAbilityManager | null
  // Timeline of events so far
  timeline: BattleTimelineEvent[]
  // Final result (when finished)
  result: AdvancedBattleResult | null
  // Timestamps
  startedAt: number
  finishedAt: number | null
}

// SSE Event types
export type SSEEventType =
  | 'session_created'
  | 'round_start'
  | 'round_event'
  | 'round_end'
  | 'ability_window'
  | 'ability_activated'
  | 'battle_end'
  | 'error'

export interface SSEEvent {
  type: SSEEventType
  sessionId: string
  timestamp: number
  data: unknown
}

type SSEListener = (event: SSEEvent) => void

// ============================================================================
// COMBAT SESSION
// ============================================================================

export class CombatSession {
  private state: CombatSessionState
  private listeners: Map<string, SSEListener> = new Map()
  private roundTimer: ReturnType<typeof setTimeout> | null = null
  private abilityWindowTimer: ReturnType<typeof setTimeout> | null = null
  private pendingAbilities: Map<string, AbilityId[]> = new Map() // participant id -> abilities to apply

  constructor(
    attacker: CombatParticipant,
    defender: CombatParticipant,
    config: Partial<CombatSessionConfig> = {}
  ) {
    const fullConfig = { ...DEFAULT_CONFIG, ...config }

    this.state = {
      id: randomUUID(),
      status: 'waiting',
      currentRound: 0,
      maxRounds: 6,
      attacker,
      defender,
      config: fullConfig,
      attackerAbilities: fullConfig.enableAbilities ? createAbilityManager() : null,
      defenderAbilities: fullConfig.enableAbilities ? createAbilityManager() : null,
      timeline: [],
      result: null,
      startedAt: 0,
      finishedAt: null,
    }
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  get id(): string {
    return this.state.id
  }

  get status(): CombatSessionStatus {
    return this.state.status
  }

  get currentRound(): number {
    return this.state.currentRound
  }

  get timeline(): BattleTimelineEvent[] {
    return this.state.timeline
  }

  get result(): AdvancedBattleResult | null {
    return this.state.result
  }

  getState(): Readonly<CombatSessionState> {
    return this.state
  }

  getAvailableAbilities(participantId: string): string[] {
    const manager =
      participantId === this.state.attacker.id
        ? this.state.attackerAbilities
        : participantId === this.state.defender.id
          ? this.state.defenderAbilities
          : null

    if (!manager) return []
    return manager.getAvailable().map((a) => a.id)
  }

  // ==========================================================================
  // SSE LISTENER MANAGEMENT
  // ==========================================================================

  addListener(listenerId: string, callback: SSEListener): void {
    this.listeners.set(listenerId, callback)
  }

  removeListener(listenerId: string): void {
    this.listeners.delete(listenerId)
  }

  private broadcast(event: Omit<SSEEvent, 'sessionId' | 'timestamp'>): void {
    const fullEvent: SSEEvent = {
      ...event,
      sessionId: this.state.id,
      timestamp: Date.now(),
    }

    for (const listener of this.listeners.values()) {
      try {
        listener(fullEvent)
      } catch (e) {
        console.error('SSE listener error:', e)
      }
    }
  }

  // ==========================================================================
  // COMBAT FLOW
  // ==========================================================================

  /**
   * Start the combat session
   */
  async start(): Promise<void> {
    if (this.state.status !== 'waiting') {
      throw new Error(`Cannot start session in status: ${this.state.status}`)
    }

    this.state.status = 'running'
    this.state.startedAt = Date.now()

    this.broadcast({
      type: 'session_created',
      data: {
        attacker: { id: this.state.attacker.id, name: this.state.attacker.name },
        defender: { id: this.state.defender.id, name: this.state.defender.name },
        maxRounds: this.state.maxRounds,
        enableAbilities: this.state.config.enableAbilities,
      },
    })

    // Start first round
    this.scheduleNextRound()
  }

  /**
   * Activate an ability for a participant
   */
  activateAbility(participantId: string, abilityId: AbilityId): boolean {
    if (this.state.status !== 'paused') {
      return false // Can only activate during ability window
    }

    const manager =
      participantId === this.state.attacker.id
        ? this.state.attackerAbilities
        : participantId === this.state.defender.id
          ? this.state.defenderAbilities
          : null

    if (!manager) return false

    const effect = manager.activateAbility(abilityId, this.state.currentRound)
    if (!effect) return false

    // Track pending ability
    const pending = this.pendingAbilities.get(participantId) || []
    pending.push(abilityId)
    this.pendingAbilities.set(participantId, pending)

    this.broadcast({
      type: 'ability_activated',
      data: {
        participantId,
        abilityId,
        round: this.state.currentRound,
      },
    })

    return true
  }

  /**
   * Force abort the session
   */
  abort(): void {
    this.cleanup()
    this.state.status = 'aborted'
    this.state.finishedAt = Date.now()

    this.broadcast({
      type: 'error',
      data: { message: 'Combat session aborted' },
    })
  }

  // ==========================================================================
  // INTERNAL ROUND MANAGEMENT
  // ==========================================================================

  private scheduleNextRound(): void {
    this.roundTimer = setTimeout(() => {
      this.executeRound()
    }, 100) // Small delay to allow listeners to connect
  }

  private async executeRound(): Promise<void> {
    if (this.state.status !== 'running') return

    this.state.currentRound++

    // Broadcast round start
    this.broadcast({
      type: 'round_start',
      data: { round: this.state.currentRound },
    })

    // Simulate round (simplified - in real impl, use AdvancedBattleEngine step by step)
    const roundEvents = this.simulateRoundEvents()

    // Add events to timeline and broadcast each
    for (const event of roundEvents) {
      this.state.timeline.push(event)
      this.broadcast({
        type: 'round_event',
        data: event,
      })
      // Small stagger for visual effect
      await this.sleep(50)
    }

    // Broadcast round end
    this.broadcast({
      type: 'round_end',
      data: {
        round: this.state.currentRound,
        eventsCount: roundEvents.length,
      },
    })

    // Check for battle end conditions
    if (this.checkBattleEnd()) {
      await this.finishBattle()
      return
    }

    // Tick ability cooldowns
    this.state.attackerAbilities?.tick()
    this.state.defenderAbilities?.tick()

    // Check for retreat
    if (
      this.state.attackerAbilities?.shouldRetreat() ||
      this.state.defenderAbilities?.shouldRetreat()
    ) {
      await this.finishBattle('retreat')
      return
    }

    // Open ability window if enabled
    if (this.state.config.enableAbilities) {
      this.openAbilityWindow()
    } else {
      // Continue to next round after delay
      this.roundTimer = setTimeout(() => {
        this.executeRound()
      }, this.state.config.roundDelayMs)
    }
  }

  private openAbilityWindow(): void {
    this.state.status = 'paused'
    this.pendingAbilities.clear()

    this.broadcast({
      type: 'ability_window',
      data: {
        round: this.state.currentRound,
        windowDurationMs: this.state.config.maxWaitForAbilityMs,
        attackerAbilities: this.state.attackerAbilities?.getAvailable().map((a) => a.id) || [],
        defenderAbilities: this.state.defenderAbilities?.getAvailable().map((a) => a.id) || [],
      },
    })

    // Auto-continue after timeout
    this.abilityWindowTimer = setTimeout(() => {
      this.closeAbilityWindow()
    }, this.state.config.maxWaitForAbilityMs)
  }

  private closeAbilityWindow(): void {
    if (this.abilityWindowTimer) {
      clearTimeout(this.abilityWindowTimer)
      this.abilityWindowTimer = null
    }

    this.state.status = 'running'

    // Apply pending abilities effects would be done here in real implementation

    // Continue to next round
    this.roundTimer = setTimeout(() => {
      this.executeRound()
    }, this.state.config.roundDelayMs)
  }

  private simulateRoundEvents(): BattleTimelineEvent[] {
    // Simplified event generation - real implementation would use AdvancedBattleEngine
    const events: BattleTimelineEvent[] = []
    const round = this.state.currentRound

    // Apply active ability effects
    const attackerEffects = this.state.attackerAbilities?.getActiveEffects() || {}
    const defenderEffects = this.state.defenderAbilities?.getActiveEffects() || {}

    // Generate some example events
    events.push({
      timestamp: Date.now(),
      round,
      type: 'round_start',
      data: {
        attackerEffects,
        defenderEffects,
      },
    })

    // Simulate some attacks (simplified)
    const attackerUnits = Object.values(this.state.attacker.fleet).reduce((a, b) => a + (b || 0), 0)
    const defenderUnits =
      Object.values(this.state.defender.fleet).reduce((a, b) => a + (b || 0), 0) +
      Object.values(this.state.defender.defense || {}).reduce((a, b) => a + (b || 0), 0)

    const damageMultiplier = attackerEffects.damageMultiplier || 1

    events.push({
      timestamp: Date.now(),
      round,
      type: 'attack_phase',
      data: {
        attackerShots: attackerUnits,
        defenderShots: defenderUnits,
        attackerDamage: Math.floor(attackerUnits * 100 * damageMultiplier),
        defenderDamage: Math.floor(defenderUnits * 80),
      },
    })

    events.push({
      timestamp: Date.now(),
      round,
      type: 'round_end',
      data: {
        attackerRemaining: attackerUnits - Math.floor(Math.random() * 3),
        defenderRemaining: defenderUnits - Math.floor(Math.random() * 5),
      },
    })

    return events
  }

  private checkBattleEnd(): boolean {
    // Simplified - check if max rounds reached
    if (this.state.currentRound >= this.state.maxRounds) {
      return true
    }

    // Check if either side is destroyed (would need actual unit tracking)
    // For now, just use round limit
    return false
  }

  private async finishBattle(reason: 'normal' | 'retreat' = 'normal'): Promise<void> {
    this.cleanup()
    this.state.status = 'finished'
    this.state.finishedAt = Date.now()

    // Run the actual BattleEngine simulation
    const battleResult = await this.runBattleSimulation(reason)

    // Convert BattleResult to AdvancedBattleResult format
    this.state.result = this.convertToAdvancedResult(battleResult)

    this.broadcast({
      type: 'battle_end',
      data: {
        reason,
        winner: this.state.result.winner,
        totalRounds: this.state.result.totalRounds,
        result: this.state.result,
      },
    })
  }

  /**
   * Run the actual battle simulation using BattleEngine
   */
  private async runBattleSimulation(reason: 'normal' | 'retreat'): Promise<BattleResult> {
    // If retreat, defender wins automatically - attacker loses all ships
    if (reason === 'retreat') {
      // Calculate attacker loss values
      const attackerLossValues = this.calculateLossValues(this.state.attacker.fleet)

      // Cast to BattleResult format
      const result: BattleResult = {
        winner: 'defender',
        rounds: [],
        totalRounds: this.state.currentRound,
        attackerRemaining: { ships: {} }, // All ships lost
        defenderRemaining: {
          ships: this.state.defender.fleet,
          defense: this.state.defender.defense || {},
        },
        attackerLosses: {
          ships: { ...this.state.attacker.fleet },
          metalValue: attackerLossValues.metal,
          crystalValue: attackerLossValues.crystal,
          deuteriumValue: attackerLossValues.deuterium,
        },
        defenderLosses: {
          ships: { ships: {}, metalValue: 0, crystalValue: 0, deuteriumValue: 0 },
          defense: { defense: {}, metalValue: 0, crystalValue: 0, deuteriumValue: 0 },
          totalMetalValue: 0,
          totalCrystalValue: 0,
          totalDeuteriumValue: 0,
        },
        debris: { metal: 0, crystal: 0 },
        loot: { metal: 0, crystal: 0, deuterium: 0 },
        moonChance: 0,
        moonCreated: false,
      }
      return result
    }

    // Use tech levels directly (already in TechLevels format)
    const attackerTech: TechLevels = {
      weaponsTech: this.state.attacker.tech.weaponsTech || 0,
      shieldTech: this.state.attacker.tech.shieldTech || 0,
      armorTech: this.state.attacker.tech.armorTech || 0,
    }

    const defenderTech: TechLevels = {
      weaponsTech: this.state.defender.tech.weaponsTech || 0,
      shieldTech: this.state.defender.tech.shieldTech || 0,
      armorTech: this.state.defender.tech.armorTech || 0,
    }

    // Create battle engine using async factory method
    const engine = await BattleEngine.create(attackerTech, defenderTech)

    // Defender resources for loot calculation
    const defenderResources = this.state.defender.resources || {
      metal: 0,
      crystal: 0,
      deuterium: 0,
    }

    // Run battle simulation with proper signature:
    // simulate(attackerFleet, defenderFleet, defenderDefense, defenderResources)
    const result = engine.simulate(
      this.state.attacker.fleet,
      this.state.defender.fleet,
      this.state.defender.defense || {},
      defenderResources
    )

    return result
  }

  /**
   * Convert BattleResult to AdvancedBattleResult format
   */
  private convertToAdvancedResult(battleResult: BattleResult): AdvancedBattleResult {
    // Calculate total units from the ships object
    const attackerRemainingUnits = Object.values(battleResult.attackerRemaining.ships || {}).reduce(
      (sum, count) => sum + (count || 0),
      0
    )
    const defenderShipRemainingUnits = Object.values(
      battleResult.defenderRemaining.ships || {}
    ).reduce((sum, count) => sum + (count || 0), 0)
    const defenderDefenseRemainingUnits = Object.values(
      battleResult.defenderRemaining.defense || {}
    ).reduce((sum, count) => sum + (count || 0), 0)
    const defenderRemainingUnits = defenderShipRemainingUnits + defenderDefenseRemainingUnits

    const attackerLostUnits = Object.values(battleResult.attackerLosses.ships || {}).reduce(
      (sum, count) => sum + (count || 0),
      0
    )
    const defenderShipLostUnits = Object.values(
      battleResult.defenderLosses.ships?.ships || {}
    ).reduce((sum, count) => sum + (count || 0), 0)
    const defenderDefenseLostUnits = Object.values(
      battleResult.defenderLosses.defense?.defense || {}
    ).reduce((sum, count) => sum + (count || 0), 0)
    const defenderLostUnits = defenderShipLostUnits + defenderDefenseLostUnits

    // Convert CombatRound[] to AdvancedRoundStats[] format
    // Classic engine only has single damage type, map to ballistic
    const advancedRounds = battleResult.rounds.map((round) => ({
      roundNumber: round.roundNumber,
      attackerUnits: round.attacker.unitCount,
      defenderUnits: round.defender.unitCount,
      attackerShots: round.attackerShots,
      defenderShots: round.defenderShots,
      attackerDamage: {
        ballistic: round.attackerDamage,
        ionic: 0,
        explosive: 0,
        hacking: 0,
        boarding: 0,
      },
      defenderDamage: {
        ballistic: round.defenderDamage,
        ionic: 0,
        explosive: 0,
        hacking: 0,
        boarding: 0,
      },
      attackerCriticalHits: 0, // Classic engine doesn't have crits
      defenderCriticalHits: 0,
      attackerUnitsLost: round.attackerUnitsLost,
      defenderUnitsLost: round.defenderUnitsLost,
      statusEffectsApplied: 0, // Classic engine doesn't have status effects
      hackingAttempts: 0, // Classic engine doesn't have hacking
    }))

    return {
      winner: battleResult.winner,
      rounds: advancedRounds,
      totalRounds: battleResult.totalRounds,
      attackerRemaining: {
        ships: battleResult.attackerRemaining.ships,
        totalUnits: attackerRemainingUnits,
      },
      defenderRemaining: {
        ships: battleResult.defenderRemaining.ships,
        defense: battleResult.defenderRemaining.defense,
        totalUnits: defenderRemainingUnits,
      },
      attackerLosses: {
        ships: battleResult.attackerLosses.ships,
        totalUnits: attackerLostUnits,
        metalValue: battleResult.attackerLosses.metalValue,
        crystalValue: battleResult.attackerLosses.crystalValue,
        deuteriumValue: battleResult.attackerLosses.deuteriumValue,
      },
      defenderLosses: {
        ships: battleResult.defenderLosses.ships?.ships || {},
        defense: battleResult.defenderLosses.defense?.defense || {},
        totalUnits: defenderLostUnits,
        metalValue: battleResult.defenderLosses.totalMetalValue,
        crystalValue: battleResult.defenderLosses.totalCrystalValue,
        deuteriumValue: battleResult.defenderLosses.totalDeuteriumValue,
      },
      debris: battleResult.debris,
      loot: battleResult.loot,
      moonChance: battleResult.moonChance,
      moonCreated: battleResult.moonCreated,
      statistics: {
        totalDamageDealt: { ballistic: 0, ionic: 0, explosive: 0, hacking: 0, boarding: 0 },
        totalDamageTaken: { ballistic: 0, ionic: 0, explosive: 0, hacking: 0, boarding: 0 },
        criticalHits: 0,
        hackingAttempts: 0,
        hackingSuccesses: 0,
        statusEffectsApplied: 0,
      },
      timeline: this.state.timeline,
    }
  }

  /**
   * Calculate resource values of a fleet's losses
   */
  private calculateLossValues(fleet: Record<string, number>): {
    metal: number
    crystal: number
    deuterium: number
  } {
    return {
      metal: this.calculateLossValue(fleet, 'metal'),
      crystal: this.calculateLossValue(fleet, 'crystal'),
      deuterium: this.calculateLossValue(fleet, 'deuterium'),
    }
  }

  /**
   * Calculate resource value of losses
   */
  private calculateLossValue(
    losses: Record<string, number>,
    resourceType: 'metal' | 'crystal' | 'deuterium'
  ): number {
    const unitCosts: Record<string, { metal: number; crystal: number; deuterium: number }> = {
      light_fighter: { metal: 3000, crystal: 1000, deuterium: 0 },
      heavy_fighter: { metal: 6000, crystal: 4000, deuterium: 0 },
      cruiser: { metal: 20000, crystal: 7000, deuterium: 2000 },
      battleship: { metal: 45000, crystal: 15000, deuterium: 0 },
      battlecruiser: { metal: 30000, crystal: 40000, deuterium: 15000 },
      bomber: { metal: 50000, crystal: 25000, deuterium: 15000 },
      destroyer: { metal: 60000, crystal: 50000, deuterium: 15000 },
      deathstar: { metal: 5000000, crystal: 4000000, deuterium: 1000000 },
      small_cargo: { metal: 2000, crystal: 2000, deuterium: 0 },
      large_cargo: { metal: 6000, crystal: 6000, deuterium: 0 },
      colony_ship: { metal: 10000, crystal: 20000, deuterium: 10000 },
      recycler: { metal: 10000, crystal: 6000, deuterium: 2000 },
      espionage_probe: { metal: 0, crystal: 1000, deuterium: 0 },
      solar_satellite: { metal: 0, crystal: 2000, deuterium: 500 },
      rocket_launcher: { metal: 2000, crystal: 0, deuterium: 0 },
      light_laser: { metal: 1500, crystal: 500, deuterium: 0 },
      heavy_laser: { metal: 6000, crystal: 2000, deuterium: 0 },
      gauss_cannon: { metal: 20000, crystal: 15000, deuterium: 2000 },
      ion_cannon: { metal: 5000, crystal: 3000, deuterium: 0 },
      plasma_turret: { metal: 50000, crystal: 50000, deuterium: 30000 },
      small_shield_dome: { metal: 10000, crystal: 10000, deuterium: 0 },
      large_shield_dome: { metal: 50000, crystal: 50000, deuterium: 0 },
    }

    let total = 0
    for (const [unit, count] of Object.entries(losses)) {
      const costs = unitCosts[unit]
      if (costs) {
        total += costs[resourceType] * count
      }
    }
    return total
  }

  private cleanup(): void {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer)
      this.roundTimer = null
    }
    if (this.abilityWindowTimer) {
      clearTimeout(this.abilityWindowTimer)
      this.abilityWindowTimer = null
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// ============================================================================
// SESSION MANAGER (Singleton)
// ============================================================================

class CombatSessionManager {
  private static instance: CombatSessionManager | null = null
  private sessions: Map<string, CombatSession> = new Map()
  private maxConcurrentSessions = 100

  private constructor() {}

  static getInstance(): CombatSessionManager {
    if (!CombatSessionManager.instance) {
      CombatSessionManager.instance = new CombatSessionManager()
    }
    return CombatSessionManager.instance
  }

  /**
   * Create a new combat session
   */
  createSession(
    attacker: CombatParticipant,
    defender: CombatParticipant,
    config?: Partial<CombatSessionConfig>
  ): CombatSession {
    // Cleanup old finished sessions
    this.cleanupFinished()

    if (this.sessions.size >= this.maxConcurrentSessions) {
      throw new Error('Maximum concurrent combat sessions reached')
    }

    const session = new CombatSession(attacker, defender, config)
    this.sessions.set(session.id, session)
    return session
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): CombatSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Remove a session
   */
  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.abort()
      this.sessions.delete(sessionId)
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): CombatSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.status === 'running' || s.status === 'paused'
    )
  }

  /**
   * Cleanup finished sessions older than 5 minutes
   */
  private cleanupFinished(): void {
    const cutoff = Date.now() - 5 * 60 * 1000
    for (const [id, session] of this.sessions) {
      const state = session.getState()
      if (state.status === 'finished' && state.finishedAt && state.finishedAt < cutoff) {
        this.sessions.delete(id)
      }
    }
  }

  /**
   * Get session count
   */
  getSessionCount(): { active: number; total: number } {
    let active = 0
    for (const session of this.sessions.values()) {
      if (session.status === 'running' || session.status === 'paused') {
        active++
      }
    }
    return { active, total: this.sessions.size }
  }
}

// Export singleton getter
export function getCombatSessionManager(): CombatSessionManager {
  return CombatSessionManager.getInstance()
}

export { CombatSessionManager }
