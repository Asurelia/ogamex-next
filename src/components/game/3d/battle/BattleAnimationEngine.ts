/**
 * Battle Animation Engine
 *
 * Orchestrates 3D combat animations, synchronizing ship movements,
 * weapon fire, impacts, and visual effects throughout a battle simulation.
 *
 * Features:
 * - Timeline-based animation phases (Targeting, Firing, Impact, Resolution)
 * - Camera system with dynamic tracking and cinematic shots
 * - Object pooling for particle effects and projectiles
 * - LOD system for large-scale battles
 * - Event-driven callbacks for UI synchronization
 */

import { gsap } from 'gsap'
import * as THREE from 'three'
import type { BattleResult, CombatRound, CombatUnit, FleetComposition, DefenseComposition } from '../../../../lib/battle/types'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Reference to a ship in the 3D scene
 */
export interface ShipRef {
  id: string
  unitKey: string
  unitId: number
  mesh: THREE.Object3D
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: number
  side: 'attacker' | 'defender'
  isDestroyed: boolean
  currentHealth: number
  maxHealth: number
  currentShield: number
  maxShield: number
}

/**
 * Reference to the 3D battle scene
 */
export interface BattleSceneRef {
  scene: THREE.Scene
  camera: THREE.Camera
  renderer: THREE.WebGLRenderer
  attackerGroup: THREE.Group
  defenderGroup: THREE.Group
  effectsGroup: THREE.Group
  getShipRefs: () => Map<string, ShipRef>
  addEffect: (effect: THREE.Object3D) => void
  removeEffect: (effect: THREE.Object3D) => void
}

/**
 * Battle data input structure
 */
export interface BattleData {
  result: BattleResult
  attackerFleet: FleetComposition
  defenderFleet: FleetComposition
  defenderDefense: DefenseComposition
}

/**
 * Timeline event types
 */
export type TimelineEventType =
  | 'target_lock'
  | 'fire'
  | 'projectile_travel'
  | 'shield_impact'
  | 'hull_impact'
  | 'destroy'
  | 'explosion'
  | 'camera_move'
  | 'camera_shake'
  | 'effect_spawn'
  | 'effect_remove'
  | 'round_start'
  | 'round_end'
  | 'phase_change'

/**
 * Timeline event data
 */
export interface TimelineEventData {
  sourceId?: string
  targetId?: string
  position?: THREE.Vector3
  direction?: THREE.Vector3
  damage?: number
  side?: 'attacker' | 'defender'
  effectType?: string
  cameraTarget?: THREE.Vector3
  cameraPosition?: THREE.Vector3
  phase?: AnimationPhase
  roundNumber?: number
  intensity?: number
  duration?: number
}

/**
 * Timeline event structure
 */
export interface TimelineEvent {
  id: string
  time: number
  type: TimelineEventType
  data: TimelineEventData
  execute: () => void
  onComplete?: () => void
}

/**
 * Animation phase types
 */
export type AnimationPhase = 'idle' | 'targeting' | 'firing' | 'impact' | 'resolution' | 'transition'

/**
 * Phase timing configuration
 */
export interface PhaseTiming {
  targeting: number
  firing: number
  impact: number
  resolution: number
  transition: number
}

/**
 * Camera shot types for cinematic effects
 */
export type CameraShotType =
  | 'overview'
  | 'follow_projectile'
  | 'zoom_impact'
  | 'wide_explosion'
  | 'ship_closeup'
  | 'dramatic_angle'

/**
 * Camera configuration
 */
export interface CameraConfig {
  type: CameraShotType
  position: THREE.Vector3
  lookAt: THREE.Vector3
  fov?: number
  duration: number
  ease: string
}

/**
 * Effect pool item
 */
export interface PooledEffect {
  id: string
  type: string
  object: THREE.Object3D
  inUse: boolean
  createdAt: number
}

/**
 * Engine state
 */
export interface EngineState {
  isInitialized: boolean
  isPlaying: boolean
  isPaused: boolean
  currentRound: number
  totalRounds: number
  currentPhase: AnimationPhase
  progress: number
  speedMultiplier: number
  currentTime: number
  totalDuration: number
}

/**
 * Engine callbacks
 */
export interface EngineCallbacks {
  onRoundStart?: (round: number) => void
  onRoundEnd?: (round: number) => void
  onBattleEnd?: (result: BattleResult) => void
  onShipDestroyed?: (ship: ShipRef, side: 'attacker' | 'defender') => void
  onPhaseChange?: (phase: AnimationPhase, round: number) => void
  onProgressUpdate?: (progress: number) => void
  onDamageDealt?: (sourceId: string, targetId: string, damage: number, shieldDamage: number) => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default phase timings in seconds
 */
const DEFAULT_PHASE_TIMING: PhaseTiming = {
  targeting: 0.5,
  firing: 1.0,
  impact: 0.5,
  resolution: 0.5,
  transition: 0.3,
}

/**
 * Effect pool configuration
 */
const EFFECT_POOL_CONFIG = {
  maxLaserEffects: 50,
  maxExplosionEffects: 20,
  maxShieldHitEffects: 30,
  maxDebrisEffects: 100,
  cleanupInterval: 5000, // ms
  effectLifetime: 3000, // ms
}

/**
 * LOD thresholds for battle size
 */
const LOD_THRESHOLDS = {
  small: 20, // < 20 units: full detail
  medium: 50, // 20-50 units: reduced particles
  large: 100, // 50-100 units: batch animations
  massive: 200, // > 100 units: simplified effects
}

/**
 * Camera animation presets
 */
const CAMERA_PRESETS: Record<CameraShotType, Partial<CameraConfig>> = {
  overview: {
    fov: 60,
    duration: 1.5,
    ease: 'power2.inOut',
  },
  follow_projectile: {
    fov: 45,
    duration: 0.8,
    ease: 'power1.out',
  },
  zoom_impact: {
    fov: 35,
    duration: 0.3,
    ease: 'power3.out',
  },
  wide_explosion: {
    fov: 70,
    duration: 0.5,
    ease: 'power2.out',
  },
  ship_closeup: {
    fov: 40,
    duration: 1.0,
    ease: 'power2.inOut',
  },
  dramatic_angle: {
    fov: 50,
    duration: 2.0,
    ease: 'power1.inOut',
  },
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique ID for timeline events
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Calculate LOD level based on unit count
 */
function calculateLODLevel(unitCount: number): 'full' | 'reduced' | 'batch' | 'simplified' {
  if (unitCount < LOD_THRESHOLDS.small) return 'full'
  if (unitCount < LOD_THRESHOLDS.medium) return 'reduced'
  if (unitCount < LOD_THRESHOLDS.large) return 'batch'
  return 'simplified'
}

/**
 * Calculate round duration based on unit count and phase timings
 */
function calculateRoundDuration(timing: PhaseTiming): number {
  return timing.targeting + timing.firing + timing.impact + timing.resolution + timing.transition
}

/**
 * Linear interpolation
 */
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ============================================================================
// EFFECT POOL CLASS
// ============================================================================

/**
 * Object pool for managing reusable visual effects
 */
class EffectPool {
  private pools: Map<string, PooledEffect[]> = new Map()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private effectsGroup: THREE.Group | null = null

  constructor() {
    this.pools.set('laser', [])
    this.pools.set('explosion', [])
    this.pools.set('shield_hit', [])
    this.pools.set('debris', [])
  }

  /**
   * Initialize pool with scene reference
   */
  initialize(effectsGroup: THREE.Group): void {
    this.effectsGroup = effectsGroup
    this.startCleanupTimer()
  }

  /**
   * Acquire an effect from the pool or create new
   */
  acquire(type: string, createFn: () => THREE.Object3D): PooledEffect {
    const pool = this.pools.get(type) || []

    // Find available pooled effect
    const available = pool.find(e => !e.inUse)
    if (available) {
      available.inUse = true
      available.createdAt = Date.now()
      available.object.visible = true
      return available
    }

    // Create new effect
    const object = createFn()
    const effect: PooledEffect = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      object,
      inUse: true,
      createdAt: Date.now(),
    }

    pool.push(effect)
    this.pools.set(type, pool)

    if (this.effectsGroup) {
      this.effectsGroup.add(object)
    }

    return effect
  }

  /**
   * Release an effect back to the pool
   */
  release(effect: PooledEffect): void {
    effect.inUse = false
    effect.object.visible = false
  }

  /**
   * Start automatic cleanup of expired effects
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) return

    this.cleanupTimer = setInterval(() => {
      const now = Date.now()

      this.pools.forEach((pool, type) => {
        // Find expired effects
        const maxEffects = this.getMaxEffects(type)
        const inUseCount = pool.filter(e => e.inUse).length

        // Clean up unused effects that exceed the limit
        if (pool.length > maxEffects) {
          const toRemove = pool
            .filter(e => !e.inUse && now - e.createdAt > EFFECT_POOL_CONFIG.effectLifetime)
            .slice(0, pool.length - maxEffects)

          toRemove.forEach(effect => {
            if (this.effectsGroup) {
              this.effectsGroup.remove(effect.object)
            }
            effect.object.traverse(child => {
              if ((child as THREE.Mesh).geometry) {
                (child as THREE.Mesh).geometry.dispose()
              }
              if ((child as THREE.Mesh).material) {
                const material = (child as THREE.Mesh).material
                if (Array.isArray(material)) {
                  material.forEach(m => m.dispose())
                } else {
                  material.dispose()
                }
              }
            })
          })

          this.pools.set(type, pool.filter(e => !toRemove.includes(e)))
        }
      })
    }, EFFECT_POOL_CONFIG.cleanupInterval)
  }

  /**
   * Get max effects for a type
   */
  private getMaxEffects(type: string): number {
    switch (type) {
      case 'laser': return EFFECT_POOL_CONFIG.maxLaserEffects
      case 'explosion': return EFFECT_POOL_CONFIG.maxExplosionEffects
      case 'shield_hit': return EFFECT_POOL_CONFIG.maxShieldHitEffects
      case 'debris': return EFFECT_POOL_CONFIG.maxDebrisEffects
      default: return 20
    }
  }

  /**
   * Dispose all pooled effects
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    this.pools.forEach(pool => {
      pool.forEach(effect => {
        if (this.effectsGroup) {
          this.effectsGroup.remove(effect.object)
        }
        effect.object.traverse(child => {
          if ((child as THREE.Mesh).geometry) {
            (child as THREE.Mesh).geometry.dispose()
          }
          if ((child as THREE.Mesh).material) {
            const material = (child as THREE.Mesh).material
            if (Array.isArray(material)) {
              material.forEach(m => m.dispose())
            } else {
              material.dispose()
            }
          }
        })
      })
    })

    this.pools.clear()
    this.effectsGroup = null
  }
}

// ============================================================================
// BATTLE ANIMATION ENGINE CLASS
// ============================================================================

/**
 * Main Battle Animation Engine
 *
 * Orchestrates the entire battle animation sequence including:
 * - Timeline management with GSAP
 * - Camera choreography
 * - Effect spawning and pooling
 * - Event dispatching
 */
export class BattleAnimationEngine {
  // Scene references
  private scene: BattleSceneRef | null = null
  private battleData: BattleData | null = null

  // Animation state
  private state: EngineState = {
    isInitialized: false,
    isPlaying: false,
    isPaused: false,
    currentRound: 0,
    totalRounds: 0,
    currentPhase: 'idle',
    progress: 0,
    speedMultiplier: 1.0,
    currentTime: 0,
    totalDuration: 0,
  }

  // Timeline management
  private masterTimeline: gsap.core.Timeline | null = null
  private roundTimelines: gsap.core.Timeline[] = []
  private timelineEvents: TimelineEvent[] = []

  // Phase timing
  private phaseTiming: PhaseTiming = { ...DEFAULT_PHASE_TIMING }

  // Effect pooling
  private effectPool: EffectPool = new EffectPool()

  // Camera management
  private cameraController: CameraController | null = null

  // Callbacks
  private callbacks: EngineCallbacks = {}

  // Ship tracking
  private shipRefs: Map<string, ShipRef> = new Map()
  private destroyedShips: Set<string> = new Set()

  // LOD management
  private lodLevel: 'full' | 'reduced' | 'batch' | 'simplified' = 'full'

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the engine with scene and battle data
   */
  initialize(scene: BattleSceneRef, battleData: BattleData): void {
    this.scene = scene
    this.battleData = battleData

    // Calculate total unit count for LOD
    const totalUnits = this.calculateTotalUnits()
    this.lodLevel = calculateLODLevel(totalUnits)

    // Initialize effect pool
    this.effectPool.initialize(scene.effectsGroup)

    // Initialize camera controller
    this.cameraController = new CameraController(scene.camera, scene.scene)

    // Get ship references from scene
    this.shipRefs = scene.getShipRefs()

    // Build timelines
    this.buildMasterTimeline()

    // Update state
    this.state.isInitialized = true
    this.state.totalRounds = battleData.result.rounds.length
    this.state.totalDuration = this.calculateTotalDuration()
  }

  /**
   * Calculate total units in battle
   */
  private calculateTotalUnits(): number {
    if (!this.battleData) return 0

    let count = 0
    const { attackerFleet, defenderFleet, defenderDefense } = this.battleData

    Object.values(attackerFleet).forEach(v => { count += v || 0 })
    Object.values(defenderFleet).forEach(v => { count += v || 0 })
    Object.values(defenderDefense).forEach(v => { count += v || 0 })

    return count
  }

  /**
   * Calculate total animation duration
   */
  private calculateTotalDuration(): number {
    const roundDuration = calculateRoundDuration(this.phaseTiming)
    return roundDuration * this.state.totalRounds
  }

  // ============================================================================
  // TIMELINE BUILDING
  // ============================================================================

  /**
   * Build the master timeline from battle data
   */
  private buildMasterTimeline(): void {
    if (!this.battleData || !this.scene) return

    // Clear existing timelines
    this.clearTimelines()

    // Create master timeline
    this.masterTimeline = gsap.timeline({
      paused: true,
      onUpdate: () => this.onTimelineUpdate(),
      onComplete: () => this.onBattleComplete(),
    })

    // Build timeline for each round
    this.battleData.result.rounds.forEach((round, index) => {
      const roundTimeline = this.buildRoundTimeline(round, index)
      this.roundTimelines.push(roundTimeline)
      this.masterTimeline!.add(roundTimeline, `round_${index}`)
    })

    // Add labels for seeking
    this.battleData.result.rounds.forEach((_, index) => {
      const roundStart = index * calculateRoundDuration(this.phaseTiming)
      this.masterTimeline!.addLabel(`round_${index}`, roundStart)
    })
  }

  /**
   * Build timeline for a single round
   */
  private buildRoundTimeline(round: CombatRound, roundIndex: number): gsap.core.Timeline {
    const timeline = gsap.timeline()
    const { targeting, firing, impact, resolution, transition } = this.phaseTiming

    let currentTime = 0

    // Round start event
    timeline.call(() => {
      this.onRoundStart(roundIndex + 1)
    }, [], currentTime)

    // === TARGETING PHASE ===
    timeline.call(() => {
      this.setPhase('targeting', roundIndex + 1)
    }, [], currentTime)

    this.addTargetingPhase(timeline, round, currentTime, targeting)
    currentTime += targeting

    // === FIRING PHASE ===
    timeline.call(() => {
      this.setPhase('firing', roundIndex + 1)
    }, [], currentTime)

    this.addFiringPhase(timeline, round, currentTime, firing)
    currentTime += firing

    // === IMPACT PHASE ===
    timeline.call(() => {
      this.setPhase('impact', roundIndex + 1)
    }, [], currentTime)

    this.addImpactPhase(timeline, round, currentTime, impact)
    currentTime += impact

    // === RESOLUTION PHASE ===
    timeline.call(() => {
      this.setPhase('resolution', roundIndex + 1)
    }, [], currentTime)

    this.addResolutionPhase(timeline, round, currentTime, resolution)
    currentTime += resolution

    // Round end event
    timeline.call(() => {
      this.onRoundEnd(roundIndex + 1)
    }, [], currentTime)

    // === TRANSITION ===
    if (roundIndex < this.state.totalRounds - 1) {
      timeline.call(() => {
        this.setPhase('transition', roundIndex + 1)
      }, [], currentTime)
      currentTime += transition
    }

    return timeline
  }

  /**
   * Add targeting phase animations
   */
  private addTargetingPhase(
    timeline: gsap.core.Timeline,
    round: CombatRound,
    startTime: number,
    duration: number
  ): void {
    // Camera: overview of both fleets
    timeline.call(() => {
      this.cameraController?.moveToOverview(duration * 0.8)
    }, [], startTime)

    // Targeting lines animation (staggered)
    const staggerDelay = duration / Math.max(round.attackerShots, 1)

    // For each attacker, show targeting line to random defender
    this.shipRefs.forEach((ship, id) => {
      if (ship.side === 'attacker' && !ship.isDestroyed) {
        const delay = startTime + Math.random() * duration * 0.8

        timeline.call(() => {
          this.showTargetingLine(ship)
        }, [], delay)

        timeline.call(() => {
          this.hideTargetingLine(ship)
        }, [], startTime + duration - 0.1)
      }
    })
  }

  /**
   * Add firing phase animations
   */
  private addFiringPhase(
    timeline: gsap.core.Timeline,
    round: CombatRound,
    startTime: number,
    duration: number
  ): void {
    // Determine batch size based on LOD
    const batchSize = this.lodLevel === 'full' ? 1 :
                      this.lodLevel === 'reduced' ? 3 :
                      this.lodLevel === 'batch' ? 8 : 20

    const attackerShips = Array.from(this.shipRefs.values())
      .filter(s => s.side === 'attacker' && !s.isDestroyed)
    const defenderShips = Array.from(this.shipRefs.values())
      .filter(s => s.side === 'defender' && !s.isDestroyed)

    if (attackerShips.length === 0 || defenderShips.length === 0) return

    // Calculate shots per time slot
    const timePerShot = duration / Math.max(Math.ceil(attackerShips.length / batchSize), 1)

    // Stagger firing animations
    let currentShotTime = startTime
    for (let i = 0; i < attackerShips.length; i += batchSize) {
      const batch = attackerShips.slice(i, i + batchSize)

      timeline.call(() => {
        batch.forEach(attacker => {
          const target = defenderShips[Math.floor(Math.random() * defenderShips.length)]
          this.fireWeapon(attacker, target)
        })
      }, [], currentShotTime)

      currentShotTime += timePerShot
    }

    // Camera: follow some projectiles in full detail mode
    if (this.lodLevel === 'full' && attackerShips.length > 0 && defenderShips.length > 0) {
      timeline.call(() => {
        const shooter = attackerShips[Math.floor(Math.random() * attackerShips.length)]
        const target = defenderShips[Math.floor(Math.random() * defenderShips.length)]
        this.cameraController?.followProjectile(
          shooter.position,
          target.position,
          duration * 0.6
        )
      }, [], startTime + duration * 0.2)
    }
  }

  /**
   * Add impact phase animations
   */
  private addImpactPhase(
    timeline: gsap.core.Timeline,
    round: CombatRound,
    startTime: number,
    duration: number
  ): void {
    // Calculate which ships get hit based on round damage
    const totalDamage = round.attackerDamage + round.defenderDamage

    // Show impacts on defender ships
    const defenderShips = Array.from(this.shipRefs.values())
      .filter(s => s.side === 'defender' && !s.isDestroyed)

    defenderShips.forEach((ship, index) => {
      const impactDelay = (index / defenderShips.length) * duration * 0.6

      timeline.call(() => {
        // Determine impact type based on shield status
        const hasShield = ship.currentShield > 0
        this.showImpact(ship, hasShield)
      }, [], startTime + impactDelay)
    })

    // Show impacts on attacker ships
    const attackerShips = Array.from(this.shipRefs.values())
      .filter(s => s.side === 'attacker' && !s.isDestroyed)

    attackerShips.forEach((ship, index) => {
      const impactDelay = (index / attackerShips.length) * duration * 0.6

      timeline.call(() => {
        const hasShield = ship.currentShield > 0
        this.showImpact(ship, hasShield)
      }, [], startTime + impactDelay + duration * 0.3)
    })

    // Camera shake on heavy damage
    if (totalDamage > 1000) {
      const intensity = clamp(totalDamage / 10000, 0.1, 0.5)
      timeline.call(() => {
        this.cameraController?.shake(intensity, duration * 0.3)
      }, [], startTime + duration * 0.2)
    }
  }

  /**
   * Add resolution phase animations
   */
  private addResolutionPhase(
    timeline: gsap.core.Timeline,
    round: CombatRound,
    startTime: number,
    duration: number
  ): void {
    // Identify destroyed ships this round
    const previousRound = this.battleData?.result.rounds[round.roundNumber - 2]

    // Calculate destroyed ships by comparing snapshots
    const destroyedAttackers = round.attackerUnitsLost
    const destroyedDefenders = round.defenderUnitsLost

    // Animate destruction for defender ships
    if (destroyedDefenders > 0) {
      const defenderShips = Array.from(this.shipRefs.values())
        .filter(s => s.side === 'defender' && !s.isDestroyed)
        .slice(0, destroyedDefenders)

      defenderShips.forEach((ship, index) => {
        const destroyDelay = (index / destroyedDefenders) * duration * 0.6

        timeline.call(() => {
          this.destroyShip(ship)
        }, [], startTime + destroyDelay)
      })

      // Camera: wide shot for explosions
      if (destroyedDefenders >= 3 && this.lodLevel !== 'simplified') {
        timeline.call(() => {
          this.cameraController?.wideExplosionShot(duration * 0.8)
        }, [], startTime)
      }
    }

    // Animate destruction for attacker ships
    if (destroyedAttackers > 0) {
      const attackerShips = Array.from(this.shipRefs.values())
        .filter(s => s.side === 'attacker' && !s.isDestroyed)
        .slice(0, destroyedAttackers)

      attackerShips.forEach((ship, index) => {
        const destroyDelay = (index / destroyedAttackers) * duration * 0.6 + duration * 0.3

        timeline.call(() => {
          this.destroyShip(ship)
        }, [], startTime + destroyDelay)
      })
    }
  }

  // ============================================================================
  // VISUAL EFFECTS
  // ============================================================================

  /**
   * Show targeting line from ship to potential target
   */
  private showTargetingLine(ship: ShipRef): void {
    if (!this.scene) return

    // Find a random target
    const targets = Array.from(this.shipRefs.values())
      .filter(s => s.side !== ship.side && !s.isDestroyed)

    if (targets.length === 0) return

    const target = targets[Math.floor(Math.random() * targets.length)]

    // Create or reuse targeting line
    const effect = this.effectPool.acquire('laser', () => this.createTargetingLine())

    const line = effect.object as THREE.Line
    const positions = (line.geometry as THREE.BufferGeometry).attributes.position

    positions.setXYZ(0, ship.position.x, ship.position.y, ship.position.z)
    positions.setXYZ(1, target.position.x, target.position.y, target.position.z)
    positions.needsUpdate = true

    // Animate line appearance
    const material = line.material as THREE.LineBasicMaterial
    material.opacity = 0

    gsap.to(material, {
      opacity: 0.3,
      duration: 0.2,
      ease: 'power2.out',
    })

    // Store for later cleanup
    ;(ship as any)._targetingLine = effect
  }

  /**
   * Hide targeting line
   */
  private hideTargetingLine(ship: ShipRef): void {
    const effect = (ship as any)._targetingLine as PooledEffect | undefined
    if (!effect) return

    const line = effect.object as THREE.Line
    const material = line.material as THREE.LineBasicMaterial

    gsap.to(material, {
      opacity: 0,
      duration: 0.1,
      onComplete: () => {
        this.effectPool.release(effect)
        delete (ship as any)._targetingLine
      },
    })
  }

  /**
   * Create targeting line geometry
   */
  private createTargetingLine(): THREE.Line {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(6) // 2 points * 3 coordinates
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    // Use LineDashedMaterial for dashed targeting lines
    const material = new THREE.LineDashedMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0,
      linewidth: 1,
      dashSize: 0.5,
      gapSize: 0.2,
    })

    const line = new THREE.Line(geometry, material)
    // Compute line distances for dashed material to work
    line.computeLineDistances()

    return line
  }

  /**
   * Fire weapon from attacker to target
   */
  private fireWeapon(attacker: ShipRef, target: ShipRef): void {
    if (!this.scene) return

    // Create projectile
    const effect = this.effectPool.acquire('laser', () => this.createProjectile())
    const projectile = effect.object

    // Position at attacker
    projectile.position.copy(attacker.position)

    // Calculate direction
    const direction = new THREE.Vector3()
      .subVectors(target.position, attacker.position)
      .normalize()

    // Rotate to face direction
    projectile.lookAt(target.position)

    // Show muzzle flash
    this.showMuzzleFlash(attacker)

    // Animate projectile travel
    const distance = attacker.position.distanceTo(target.position)
    const travelTime = Math.min(distance / 50, 0.5) // Max 0.5s travel time

    gsap.to(projectile.position, {
      x: target.position.x,
      y: target.position.y,
      z: target.position.z,
      duration: travelTime,
      ease: 'none',
      onComplete: () => {
        this.effectPool.release(effect)
      },
    })

    // Dispatch damage event
    if (this.callbacks.onDamageDealt) {
      const damage = attacker.currentHealth * 0.1 // Simplified damage calculation
      this.callbacks.onDamageDealt(attacker.id, target.id, damage, target.currentShield > 0 ? damage * 0.5 : 0)
    }
  }

  /**
   * Create projectile mesh
   */
  private createProjectile(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 8)
    geometry.rotateX(Math.PI / 2)

    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.9,
    })

    const mesh = new THREE.Mesh(geometry, material)

    // Add glow effect
    const glowGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2.2, 8)
    glowGeometry.rotateX(Math.PI / 2)

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
    })

    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    mesh.add(glow)

    return mesh
  }

  /**
   * Show muzzle flash at ship position
   */
  private showMuzzleFlash(ship: ShipRef): void {
    // Create flash light
    const flash = new THREE.PointLight(0x00ffff, 2, 5)
    flash.position.copy(ship.position)

    this.scene?.effectsGroup.add(flash)

    // Animate flash
    gsap.to(flash, {
      intensity: 0,
      duration: 0.15,
      ease: 'power2.out',
      onComplete: () => {
        this.scene?.effectsGroup.remove(flash)
        flash.dispose()
      },
    })
  }

  /**
   * Show impact effect on ship
   */
  private showImpact(ship: ShipRef, hasShield: boolean): void {
    if (!this.scene) return

    const effectType = hasShield ? 'shield_hit' : 'explosion'
    const effect = this.effectPool.acquire(effectType, () =>
      hasShield ? this.createShieldImpact() : this.createHullImpact()
    )

    effect.object.position.copy(ship.position)
    effect.object.visible = true

    // Animate impact
    const duration = hasShield ? 0.3 : 0.5

    if (hasShield) {
      // Shield ripple effect
      gsap.fromTo(effect.object.scale, {
        x: 0.5, y: 0.5, z: 0.5
      }, {
        x: 1.5, y: 1.5, z: 1.5,
        duration,
        ease: 'power2.out',
        onComplete: () => {
          this.effectPool.release(effect)
        },
      })

      // Shield flash
      const material = (effect.object.children[0] as THREE.Mesh)?.material as THREE.MeshBasicMaterial
      if (material) {
        gsap.fromTo(material, {
          opacity: 0.8
        }, {
          opacity: 0,
          duration,
          ease: 'power2.out',
        })
      }

      // Reduce shield
      ship.currentShield = Math.max(0, ship.currentShield - ship.maxShield * 0.1)
    } else {
      // Hull impact sparks
      gsap.fromTo(effect.object.scale, {
        x: 0.1, y: 0.1, z: 0.1
      }, {
        x: 1, y: 1, z: 1,
        duration: duration * 0.5,
        ease: 'power2.out',
      })

      gsap.to(effect.object.scale, {
        x: 0.01, y: 0.01, z: 0.01,
        duration: duration * 0.5,
        delay: duration * 0.5,
        ease: 'power2.in',
        onComplete: () => {
          this.effectPool.release(effect)
        },
      })

      // Reduce hull
      ship.currentHealth = Math.max(0, ship.currentHealth - ship.maxHealth * 0.15)
    }
  }

  /**
   * Create shield impact effect
   */
  private createShieldImpact(): THREE.Group {
    const group = new THREE.Group()

    // Shield sphere
    const geometry = new THREE.SphereGeometry(1, 16, 16)
    const material = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      wireframe: true,
    })

    const shield = new THREE.Mesh(geometry, material)
    group.add(shield)

    // Impact point glow
    const glowGeometry = new THREE.SphereGeometry(0.3, 8, 8)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.8,
    })

    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.position.set(0, 0, 1)
    group.add(glow)

    return group
  }

  /**
   * Create hull impact effect
   */
  private createHullImpact(): THREE.Group {
    const group = new THREE.Group()

    // Explosion sphere
    const geometry = new THREE.SphereGeometry(0.5, 8, 8)
    const material = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.9,
    })

    const explosion = new THREE.Mesh(geometry, material)
    group.add(explosion)

    // Sparks (simple point representation)
    const sparkCount = this.lodLevel === 'full' ? 8 : 4
    for (let i = 0; i < sparkCount; i++) {
      const sparkGeometry = new THREE.SphereGeometry(0.05, 4, 4)
      const sparkMaterial = new THREE.MeshBasicMaterial({
        color: 0xffcc00,
        transparent: true,
        opacity: 0.9,
      })

      const spark = new THREE.Mesh(sparkGeometry, sparkMaterial)
      const angle = (i / sparkCount) * Math.PI * 2
      spark.position.set(
        Math.cos(angle) * 0.3,
        Math.sin(angle) * 0.3,
        0
      )
      group.add(spark)
    }

    return group
  }

  /**
   * Destroy a ship with explosion effect
   */
  private destroyShip(ship: ShipRef): void {
    if (!this.scene || ship.isDestroyed) return

    ship.isDestroyed = true
    this.destroyedShips.add(ship.id)

    // Create explosion effect
    const effect = this.effectPool.acquire('explosion', () => this.createExplosion())
    effect.object.position.copy(ship.position)
    effect.object.visible = true

    // Animate explosion
    const duration = this.lodLevel === 'full' ? 0.8 : 0.5

    gsap.fromTo(effect.object.scale, {
      x: 0.1, y: 0.1, z: 0.1
    }, {
      x: 3, y: 3, z: 3,
      duration: duration * 0.4,
      ease: 'power2.out',
    })

    // Flash
    const light = new THREE.PointLight(0xff6600, 5, 20)
    light.position.copy(ship.position)
    this.scene.effectsGroup.add(light)

    gsap.to(light, {
      intensity: 0,
      duration: duration * 0.6,
      ease: 'power2.out',
      onComplete: () => {
        this.scene?.effectsGroup.remove(light)
        light.dispose()
      },
    })

    // Fade out explosion
    const materials = (effect.object as THREE.Group).children.map(
      c => (c as THREE.Mesh).material as THREE.MeshBasicMaterial
    )

    gsap.to(materials, {
      opacity: 0,
      duration: duration * 0.6,
      delay: duration * 0.4,
      ease: 'power2.in',
      onComplete: () => {
        this.effectPool.release(effect)
      },
    })

    // Hide ship mesh
    gsap.to(ship.mesh, {
      visible: false,
      duration: 0,
      delay: duration * 0.2,
    })

    // Spawn debris
    if (this.lodLevel === 'full' || this.lodLevel === 'reduced') {
      this.spawnDebris(ship.position, ship.scale)
    }

    // Camera shake
    this.cameraController?.shake(0.2, 0.3)

    // Callback
    if (this.callbacks.onShipDestroyed) {
      this.callbacks.onShipDestroyed(ship, ship.side)
    }
  }

  /**
   * Create explosion effect
   */
  private createExplosion(): THREE.Group {
    const group = new THREE.Group()

    // Core explosion
    const coreGeometry = new THREE.SphereGeometry(1, 16, 16)
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 1,
    })
    const core = new THREE.Mesh(coreGeometry, coreMaterial)
    group.add(core)

    // Outer fireball
    const outerGeometry = new THREE.SphereGeometry(1.5, 16, 16)
    const outerMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.7,
    })
    const outer = new THREE.Mesh(outerGeometry, outerMaterial)
    group.add(outer)

    // Smoke shell
    const smokeGeometry = new THREE.SphereGeometry(2, 12, 12)
    const smokeMaterial = new THREE.MeshBasicMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.4,
    })
    const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial)
    group.add(smoke)

    return group
  }

  /**
   * Spawn debris particles
   */
  private spawnDebris(position: THREE.Vector3, scale: number): void {
    if (!this.scene) return

    const debrisCount = this.lodLevel === 'full' ? 8 : 4

    for (let i = 0; i < debrisCount; i++) {
      const effect = this.effectPool.acquire('debris', () => this.createDebris())
      effect.object.position.copy(position)
      effect.object.visible = true

      // Random velocity
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      )

      const rotation = new THREE.Vector3(
        Math.random() * 5,
        Math.random() * 5,
        Math.random() * 5
      )

      // Animate debris
      const duration = 1.5 + Math.random()

      gsap.to(effect.object.position, {
        x: position.x + velocity.x * duration,
        y: position.y + velocity.y * duration,
        z: position.z + velocity.z * duration,
        duration,
        ease: 'power1.out',
      })

      gsap.to(effect.object.rotation, {
        x: rotation.x,
        y: rotation.y,
        z: rotation.z,
        duration,
        ease: 'none',
      })

      const material = (effect.object as THREE.Mesh).material as THREE.MeshBasicMaterial
      gsap.to(material, {
        opacity: 0,
        duration: duration * 0.3,
        delay: duration * 0.7,
        ease: 'power2.in',
        onComplete: () => {
          this.effectPool.release(effect)
        },
      })
    }
  }

  /**
   * Create debris piece
   */
  private createDebris(): THREE.Mesh {
    const geometry = new THREE.TetrahedronGeometry(0.2)
    const material = new THREE.MeshBasicMaterial({
      color: 0x666666,
      transparent: true,
      opacity: 0.8,
    })

    return new THREE.Mesh(geometry, material)
  }

  // ============================================================================
  // PLAYBACK CONTROL
  // ============================================================================

  /**
   * Start playing the battle animation
   */
  play(): void {
    if (!this.state.isInitialized || !this.masterTimeline) return

    if (this.state.isPaused) {
      this.masterTimeline.resume()
      this.state.isPaused = false
    } else {
      this.masterTimeline.play()
    }

    this.state.isPlaying = true
  }

  /**
   * Pause the animation
   */
  pause(): void {
    if (!this.masterTimeline) return

    this.masterTimeline.pause()
    this.state.isPlaying = false
    this.state.isPaused = true
  }

  /**
   * Stop and reset the animation
   */
  stop(): void {
    if (!this.masterTimeline) return

    this.masterTimeline.pause()
    this.masterTimeline.seek(0)

    this.state.isPlaying = false
    this.state.isPaused = false
    this.state.currentRound = 0
    this.state.progress = 0
    this.state.currentPhase = 'idle'
    this.state.currentTime = 0

    // Reset all ships
    this.resetShips()
  }

  /**
   * Set playback speed multiplier
   */
  setSpeed(multiplier: number): void {
    this.state.speedMultiplier = clamp(multiplier, 0.25, 4.0)

    if (this.masterTimeline) {
      this.masterTimeline.timeScale(this.state.speedMultiplier)
    }
  }

  /**
   * Seek to a specific round
   */
  seekToRound(roundNumber: number): void {
    if (!this.masterTimeline) return

    const targetRound = clamp(roundNumber, 1, this.state.totalRounds)
    const roundLabel = `round_${targetRound - 1}`

    this.masterTimeline.seek(roundLabel)
    this.state.currentRound = targetRound
  }

  /**
   * Reset all ships to initial state
   */
  private resetShips(): void {
    this.shipRefs.forEach(ship => {
      ship.isDestroyed = false
      ship.currentHealth = ship.maxHealth
      ship.currentShield = ship.maxShield
      ship.mesh.visible = true
    })

    this.destroyedShips.clear()
  }

  // ============================================================================
  // STATE GETTERS
  // ============================================================================

  /**
   * Get current round number (1-indexed)
   */
  getCurrentRound(): number {
    return this.state.currentRound
  }

  /**
   * Get total number of rounds
   */
  getTotalRounds(): number {
    return this.state.totalRounds
  }

  /**
   * Check if animation is playing
   */
  isPlaying(): boolean {
    return this.state.isPlaying
  }

  /**
   * Get progress (0-1)
   */
  getProgress(): number {
    return this.state.progress
  }

  /**
   * Get current animation phase
   */
  getCurrentPhase(): AnimationPhase {
    return this.state.currentPhase
  }

  /**
   * Get full engine state
   */
  getState(): Readonly<EngineState> {
    return { ...this.state }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Set callback handlers
   */
  setCallbacks(callbacks: EngineCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  /**
   * Handle timeline update
   */
  private onTimelineUpdate(): void {
    if (!this.masterTimeline) return

    const progress = this.masterTimeline.progress()
    this.state.progress = progress
    this.state.currentTime = this.masterTimeline.time()

    if (this.callbacks.onProgressUpdate) {
      this.callbacks.onProgressUpdate(progress)
    }
  }

  /**
   * Handle round start
   */
  private onRoundStart(round: number): void {
    this.state.currentRound = round

    if (this.callbacks.onRoundStart) {
      this.callbacks.onRoundStart(round)
    }
  }

  /**
   * Handle round end
   */
  private onRoundEnd(round: number): void {
    if (this.callbacks.onRoundEnd) {
      this.callbacks.onRoundEnd(round)
    }
  }

  /**
   * Handle phase change
   */
  private setPhase(phase: AnimationPhase, round: number): void {
    this.state.currentPhase = phase

    if (this.callbacks.onPhaseChange) {
      this.callbacks.onPhaseChange(phase, round)
    }
  }

  /**
   * Handle battle complete
   */
  private onBattleComplete(): void {
    this.state.isPlaying = false
    this.state.currentPhase = 'idle'

    if (this.callbacks.onBattleEnd && this.battleData) {
      this.callbacks.onBattleEnd(this.battleData.result)
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Clear all timelines
   */
  private clearTimelines(): void {
    if (this.masterTimeline) {
      this.masterTimeline.kill()
      this.masterTimeline = null
    }

    this.roundTimelines.forEach(tl => tl.kill())
    this.roundTimelines = []
    this.timelineEvents = []
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clearTimelines()
    this.effectPool.dispose()
    this.cameraController?.dispose()

    this.scene = null
    this.battleData = null
    this.shipRefs.clear()
    this.destroyedShips.clear()

    this.state = {
      isInitialized: false,
      isPlaying: false,
      isPaused: false,
      currentRound: 0,
      totalRounds: 0,
      currentPhase: 'idle',
      progress: 0,
      speedMultiplier: 1.0,
      currentTime: 0,
      totalDuration: 0,
    }
  }
}

// ============================================================================
// CAMERA CONTROLLER CLASS
// ============================================================================

/**
 * Camera controller for cinematic battle shots
 */
class CameraController {
  private camera: THREE.Camera
  private scene: THREE.Scene
  private originalPosition: THREE.Vector3
  private originalQuaternion: THREE.Quaternion
  private currentTween: gsap.core.Tween | null = null
  private shakeOffset: THREE.Vector3 = new THREE.Vector3()
  private isShaking: boolean = false

  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.camera = camera
    this.scene = scene
    this.originalPosition = camera.position.clone()
    this.originalQuaternion = camera.quaternion.clone()
  }

  /**
   * Move camera to overview position
   */
  moveToOverview(duration: number): void {
    this.killCurrentTween()

    // Calculate center of battle
    const center = new THREE.Vector3(0, 0, 0)
    const distance = 50

    const position = new THREE.Vector3(
      center.x + distance * 0.7,
      center.y + distance * 0.5,
      center.z + distance * 0.7
    )

    this.animateTo(position, center, duration, 'power2.inOut')
  }

  /**
   * Follow a projectile from source to target
   */
  followProjectile(source: THREE.Vector3, target: THREE.Vector3, duration: number): void {
    this.killCurrentTween()

    // Position camera to the side of the projectile path
    const midpoint = new THREE.Vector3().addVectors(source, target).multiplyScalar(0.5)
    const direction = new THREE.Vector3().subVectors(target, source).normalize()

    // Calculate perpendicular offset
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize()
    const offset = 10

    const position = new THREE.Vector3()
      .copy(midpoint)
      .add(perpendicular.multiplyScalar(offset))
      .add(new THREE.Vector3(0, 5, 0))

    this.animateTo(position, midpoint, duration, 'power1.out')
  }

  /**
   * Wide shot for multiple explosions
   */
  wideExplosionShot(duration: number): void {
    this.killCurrentTween()

    const position = new THREE.Vector3(0, 80, 80)
    const lookAt = new THREE.Vector3(0, 0, 0)

    this.animateTo(position, lookAt, duration, 'power2.out')
  }

  /**
   * Apply camera shake
   */
  shake(intensity: number, duration: number): void {
    if (this.isShaking) return

    this.isShaking = true
    const startTime = performance.now()
    const originalPos = this.camera.position.clone()

    const shakeLoop = () => {
      const elapsed = (performance.now() - startTime) / 1000
      if (elapsed >= duration) {
        this.camera.position.copy(originalPos)
        this.isShaking = false
        return
      }

      const decay = 1 - elapsed / duration
      const currentIntensity = intensity * decay

      this.shakeOffset.set(
        (Math.random() - 0.5) * currentIntensity * 2,
        (Math.random() - 0.5) * currentIntensity * 2,
        (Math.random() - 0.5) * currentIntensity * 2
      )

      this.camera.position.copy(originalPos).add(this.shakeOffset)

      requestAnimationFrame(shakeLoop)
    }

    requestAnimationFrame(shakeLoop)
  }

  /**
   * Animate camera to position
   */
  private animateTo(
    position: THREE.Vector3,
    lookAt: THREE.Vector3,
    duration: number,
    ease: string
  ): void {
    // Calculate target quaternion
    const tempCamera = this.camera.clone()
    tempCamera.position.copy(position)
    tempCamera.lookAt(lookAt)
    const targetQuaternion = tempCamera.quaternion.clone()

    const startPos = this.camera.position.clone()
    const startQuat = this.camera.quaternion.clone()

    const progress = { value: 0 }

    this.currentTween = gsap.to(progress, {
      value: 1,
      duration,
      ease,
      onUpdate: () => {
        this.camera.position.lerpVectors(startPos, position, progress.value)
        this.camera.quaternion.slerpQuaternions(startQuat, targetQuaternion, progress.value)
      },
    })
  }

  /**
   * Kill current camera animation
   */
  private killCurrentTween(): void {
    if (this.currentTween) {
      this.currentTween.kill()
      this.currentTween = null
    }
  }

  /**
   * Dispose camera controller
   */
  dispose(): void {
    this.killCurrentTween()
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Battle animation controls interface
 */
export interface BattleAnimationControls {
  play: () => void
  pause: () => void
  stop: () => void
  setSpeed: (speed: number) => void
  seekTo: (round: number) => void
}

/**
 * Battle animation hook return type
 */
export interface UseBattleAnimationReturn {
  engine: BattleAnimationEngine | null
  currentRound: number
  totalRounds: number
  isPlaying: boolean
  isPaused: boolean
  progress: number
  currentPhase: AnimationPhase
  speedMultiplier: number
  controls: BattleAnimationControls
  initialize: (scene: BattleSceneRef, battleData: BattleData) => void
  setCallbacks: (callbacks: EngineCallbacks) => void
}

/**
 * React hook for using the Battle Animation Engine
 *
 * @example
 * ```tsx
 * const {
 *   engine,
 *   currentRound,
 *   isPlaying,
 *   progress,
 *   controls,
 *   initialize,
 *   setCallbacks
 * } = useBattleAnimation()
 *
 * // Initialize when scene and data are ready
 * useEffect(() => {
 *   if (sceneRef && battleData) {
 *     initialize(sceneRef, battleData)
 *   }
 * }, [sceneRef, battleData])
 *
 * // Set callbacks
 * setCallbacks({
 *   onRoundStart: (round) => console.log(`Round ${round} started`),
 *   onShipDestroyed: (ship, side) => console.log(`${side} ship destroyed`)
 * })
 *
 * // Use controls
 * <button onClick={controls.play}>Play</button>
 * <button onClick={controls.pause}>Pause</button>
 * <input
 *   type="range"
 *   value={progress * 100}
 *   onChange={(e) => controls.seekTo(Math.ceil(e.target.value / 100 * totalRounds))}
 * />
 * ```
 */
export function useBattleAnimation(): UseBattleAnimationReturn {
  const engineRef = useRef<BattleAnimationEngine | null>(null)

  // State
  const [currentRound, setCurrentRound] = useState(0)
  const [totalRounds, setTotalRounds] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentPhase, setCurrentPhase] = useState<AnimationPhase>('idle')
  const [speedMultiplier, setSpeedMultiplier] = useState(1)

  // Create engine on mount
  useEffect(() => {
    engineRef.current = new BattleAnimationEngine()

    return () => {
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [])

  // Initialize engine
  const initialize = useCallback((scene: BattleSceneRef, battleData: BattleData) => {
    if (!engineRef.current) return

    engineRef.current.initialize(scene, battleData)

    const state = engineRef.current.getState()
    setTotalRounds(state.totalRounds)
    setCurrentRound(state.currentRound)
    setProgress(state.progress)
    setCurrentPhase(state.currentPhase)

    // Set up state sync callbacks
    engineRef.current.setCallbacks({
      onRoundStart: (round) => setCurrentRound(round),
      onProgressUpdate: (p) => setProgress(p),
      onPhaseChange: (phase) => setCurrentPhase(phase),
      onBattleEnd: () => {
        setIsPlaying(false)
        setIsPaused(false)
      },
    })
  }, [])

  // Set callbacks
  const setCallbacks = useCallback((callbacks: EngineCallbacks) => {
    if (!engineRef.current) return

    // Merge with state sync callbacks
    const existingCallbacks = {
      onRoundStart: (round: number) => {
        setCurrentRound(round)
        callbacks.onRoundStart?.(round)
      },
      onProgressUpdate: (p: number) => {
        setProgress(p)
        callbacks.onProgressUpdate?.(p)
      },
      onPhaseChange: (phase: AnimationPhase, round: number) => {
        setCurrentPhase(phase)
        callbacks.onPhaseChange?.(phase, round)
      },
      onBattleEnd: (result: BattleResult) => {
        setIsPlaying(false)
        setIsPaused(false)
        callbacks.onBattleEnd?.(result)
      },
      onRoundEnd: callbacks.onRoundEnd,
      onShipDestroyed: callbacks.onShipDestroyed,
      onDamageDealt: callbacks.onDamageDealt,
    }

    engineRef.current.setCallbacks(existingCallbacks)
  }, [])

  // Controls
  const controls: BattleAnimationControls = {
    play: useCallback(() => {
      engineRef.current?.play()
      setIsPlaying(true)
      setIsPaused(false)
    }, []),

    pause: useCallback(() => {
      engineRef.current?.pause()
      setIsPlaying(false)
      setIsPaused(true)
    }, []),

    stop: useCallback(() => {
      engineRef.current?.stop()
      setIsPlaying(false)
      setIsPaused(false)
      setCurrentRound(0)
      setProgress(0)
      setCurrentPhase('idle')
    }, []),

    setSpeed: useCallback((speed: number) => {
      engineRef.current?.setSpeed(speed)
      setSpeedMultiplier(speed)
    }, []),

    seekTo: useCallback((round: number) => {
      engineRef.current?.seekToRound(round)
      setCurrentRound(round)
    }, []),
  }

  return {
    engine: engineRef.current,
    currentRound,
    totalRounds,
    isPlaying,
    isPaused,
    progress,
    currentPhase,
    speedMultiplier,
    controls,
    initialize,
    setCallbacks,
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DEFAULT_PHASE_TIMING,
  EFFECT_POOL_CONFIG,
  LOD_THRESHOLDS,
  CAMERA_PRESETS,
  calculateLODLevel,
  calculateRoundDuration,
}
