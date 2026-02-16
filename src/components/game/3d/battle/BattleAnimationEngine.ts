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
 *
 * @module BattleAnimationEngine
 */

import { gsap } from 'gsap'
import * as THREE from 'three'
import type { CombatRound } from '../../../../lib/battle/types'

// Import from extracted modules
import type {
  AnimationPhase,
  BattleData,
  BattleSceneRef,
  EngineCallbacks,
  EngineState,
  LODLevel,
  PhaseTiming,
  PooledEffect,
  ShipRef,
  TimelineEvent,
} from './battle-animation-types'

import {
  calculateLODLevel,
  calculateRoundDuration,
  clamp,
  DEFAULT_PHASE_TIMING,
} from './battle-animation-config'

import { EffectPool } from './battle-effect-pool'
import { CameraController } from './battle-camera-controller'

// Re-export types for backward compatibility
export type {
  AnimationPhase,
  BattleAnimationControls,
  BattleData,
  BattleSceneRef,
  CameraConfig,
  CameraShotType,
  EngineCallbacks,
  EngineState,
  LODLevel,
  PhaseTiming,
  PooledEffect,
  ShipRef,
  TimelineEvent,
  TimelineEventData,
  TimelineEventType,
  UseBattleAnimationReturn,
} from './battle-animation-types'

// Re-export config for backward compatibility
export {
  CAMERA_PRESETS,
  calculateLODLevel,
  calculateRoundDuration,
  clamp,
  DEFAULT_PHASE_TIMING,
  EFFECT_POOL_CONFIG,
  generateEventId,
  lerp,
  LOD_THRESHOLDS,
} from './battle-animation-config'

// Re-export hook for backward compatibility
export { useBattleAnimation } from './useBattleAnimation'

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
  private lodLevel: LODLevel = 'full'

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

    // For each attacker, show targeting line to random defender
    this.shipRefs.forEach((ship) => {
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
    _round: CombatRound,
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
    ;(ship as ShipRef & { _targetingLine?: PooledEffect })._targetingLine = effect
  }

  /**
   * Hide targeting line
   */
  private hideTargetingLine(ship: ShipRef): void {
    const effect = (ship as ShipRef & { _targetingLine?: PooledEffect })._targetingLine
    if (!effect) return

    const line = effect.object as THREE.Line
    const material = line.material as THREE.LineBasicMaterial

    gsap.to(material, {
      opacity: 0,
      duration: 0.1,
      onComplete: () => {
        this.effectPool.release(effect)
        delete (ship as ShipRef & { _targetingLine?: PooledEffect })._targetingLine
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
  private spawnDebris(position: THREE.Vector3, _scale: number): void {
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
