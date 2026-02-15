/**
 * Cinematic Battle Renderer
 *
 * Transforms battle events into an animatable timeline for visual playback.
 * Generates camera movements, visual effects, and dramatic pacing for
 * cinematic combat presentation.
 */

import type { AdvancedCombatUnit } from './advanced-unit'
import type { DamageTypes } from './damage-types'
import type { FormationType, FormationPosition } from './fleet-formations'
import type { VeterancyRank } from './veterancy-system'

// ============================================================================
// CINEMATIC TYPES
// ============================================================================

/**
 * Visual effect types for rendering
 */
export type VisualEffectType =
  // Weapon effects
  | 'laser_beam'
  | 'plasma_bolt'
  | 'missile_launch'
  | 'missile_impact'
  | 'railgun_shot'
  | 'ion_beam'
  | 'torpedo_trail'
  // Damage effects
  | 'shield_hit'
  | 'shield_break'
  | 'armor_spark'
  | 'hull_breach'
  | 'explosion_small'
  | 'explosion_medium'
  | 'explosion_large'
  | 'critical_hit'
  // Status effects
  | 'shield_recharge'
  | 'system_malfunction'
  | 'emp_pulse'
  | 'hack_effect'
  // Boarding effects
  | 'boarding_pod_launch'
  | 'boarding_breach'
  | 'boarding_combat'
  | 'ship_capture'
  // Movement effects
  | 'engine_flare'
  | 'warp_in'
  | 'warp_out'
  | 'evasive_maneuver'
  // Special effects
  | 'ability_activate'
  | 'buff_apply'
  | 'debuff_apply'
  | 'veterancy_rank_up'

/**
 * Camera shot types
 */
export type CameraShotType =
  | 'wide'           // Full battlefield view
  | 'medium'         // Fleet-level view
  | 'close_up'       // Single ship focus
  | 'tracking'       // Following projectile/ship
  | 'dramatic'       // Cinematic angle for important moments
  | 'cockpit'        // First-person view
  | 'orbital'        // Top-down strategic view
  | 'flyby'          // Sweeping camera movement

/**
 * Sound effect categories
 */
export type SoundCategory =
  | 'weapon_fire'
  | 'explosion'
  | 'shield'
  | 'engine'
  | 'alarm'
  | 'impact'
  | 'ambient'
  | 'music_sting'
  | 'voice'

// ============================================================================
// TIMELINE EVENT TYPES
// ============================================================================

/**
 * Base timeline event
 */
export interface CinematicEvent {
  /** Unique event ID */
  id: string
  /** Event type */
  type: CinematicEventType
  /** Start time in milliseconds */
  startTime: number
  /** Duration in milliseconds */
  duration: number
  /** Priority for event ordering (higher = more important) */
  priority: number
  /** Whether this event blocks other events */
  blocking: boolean
}

export type CinematicEventType =
  | 'battle_start'
  | 'round_start'
  | 'round_end'
  | 'attack'
  | 'damage'
  | 'destruction'
  | 'boarding'
  | 'ability'
  | 'formation_change'
  | 'retreat'
  | 'reinforcement'
  | 'battle_end'
  | 'camera_move'
  | 'effect'
  | 'sound'
  | 'text_display'

/**
 * Battle start event
 */
export interface BattleStartEvent extends CinematicEvent {
  type: 'battle_start'
  data: {
    attackerFleetSize: number
    defenderFleetSize: number
    attackerFormation?: FormationType
    defenderFormation?: FormationType
    location?: string
  }
}

/**
 * Round start/end events
 */
export interface RoundEvent extends CinematicEvent {
  type: 'round_start' | 'round_end'
  data: {
    roundNumber: number
    attackerRemaining: number
    defenderRemaining: number
  }
}

/**
 * Attack event - weapon firing
 */
export interface AttackEvent extends CinematicEvent {
  type: 'attack'
  data: {
    attackerId: string
    attackerName: string
    attackerClass: string
    attackerPosition: Position3D
    targetId: string
    targetName: string
    targetClass: string
    targetPosition: Position3D
    weaponType: WeaponVisualType
    damageType: keyof DamageTypes
    isCritical: boolean
    isRapidFire: boolean
  }
}

/**
 * Damage event - damage applied
 */
export interface DamageEvent extends CinematicEvent {
  type: 'damage'
  data: {
    targetId: string
    targetName: string
    targetPosition: Position3D
    damage: Partial<DamageTypes>
    totalDamage: number
    shieldDamage: number
    armorDamage: number
    hullDamage: number
    isCritical: boolean
    shieldBroken: boolean
    remainingHullPercent: number
  }
}

/**
 * Destruction event
 */
export interface DestructionEvent extends CinematicEvent {
  type: 'destruction'
  data: {
    unitId: string
    unitName: string
    unitClass: string
    position: Position3D
    killerName?: string
    explosionSize: 'small' | 'medium' | 'large' | 'massive'
    debrisGenerated: boolean
    veterancyRank?: VeterancyRank
  }
}

/**
 * Boarding event
 */
export interface BoardingEvent extends CinematicEvent {
  type: 'boarding'
  data: {
    phase: 'launch' | 'breach' | 'combat' | 'outcome'
    attackerShipId: string
    defenderShipId: string
    attackerPosition: Position3D
    defenderPosition: Position3D
    crewCount?: number
    outcome?: 'captured' | 'sabotaged' | 'repelled' | 'retreated'
  }
}

/**
 * Ability activation event
 */
export interface AbilityEvent extends CinematicEvent {
  type: 'ability'
  data: {
    unitId: string
    unitName: string
    unitPosition: Position3D
    abilityName: string
    abilityType: 'equipment' | 'veterancy' | 'formation'
    targetIds?: string[]
    effectRadius?: number
  }
}

/**
 * Formation change event
 */
export interface FormationChangeEvent extends CinematicEvent {
  type: 'formation_change'
  data: {
    side: 'attacker' | 'defender'
    oldFormation?: FormationType
    newFormation: FormationType
    unitPositions: Array<{ unitId: string; position: Position3D }>
  }
}

/**
 * Camera movement event
 */
export interface CameraMoveEvent extends CinematicEvent {
  type: 'camera_move'
  data: {
    shotType: CameraShotType
    position: Position3D
    lookAt: Position3D
    fov?: number
    easing: EasingType
  }
}

/**
 * Visual effect event
 */
export interface EffectEvent extends CinematicEvent {
  type: 'effect'
  data: {
    effectType: VisualEffectType
    position: Position3D
    targetPosition?: Position3D
    scale: number
    color?: string
    intensity: number
  }
}

/**
 * Sound event
 */
export interface SoundEvent extends CinematicEvent {
  type: 'sound'
  data: {
    category: SoundCategory
    soundId: string
    volume: number
    position?: Position3D
    spatial: boolean
  }
}

/**
 * Text display event (for UI)
 */
export interface TextDisplayEvent extends CinematicEvent {
  type: 'text_display'
  data: {
    text: string
    style: 'announcement' | 'damage_number' | 'status' | 'subtitle'
    position?: Position3D
    screenPosition?: { x: number; y: number }
    color?: string
    size: 'small' | 'medium' | 'large' | 'huge'
  }
}

/**
 * Battle end event
 */
export interface BattleEndEvent extends CinematicEvent {
  type: 'battle_end'
  data: {
    winner: 'attacker' | 'defender' | 'draw'
    attackerSurvivors: number
    defenderSurvivors: number
    totalRounds: number
    debrisField: { metal: number; crystal: number }
    moonChance: number
    moonCreated: boolean
  }
}

// All event types union
export type TimelineEvent =
  | BattleStartEvent
  | RoundEvent
  | AttackEvent
  | DamageEvent
  | DestructionEvent
  | BoardingEvent
  | AbilityEvent
  | FormationChangeEvent
  | CameraMoveEvent
  | EffectEvent
  | SoundEvent
  | TextDisplayEvent
  | BattleEndEvent

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * 3D position
 */
export interface Position3D {
  x: number
  y: number
  z: number
}

/**
 * Weapon visual type mapping
 */
export type WeaponVisualType =
  | 'laser'
  | 'plasma'
  | 'missile'
  | 'railgun'
  | 'ion'
  | 'torpedo'
  | 'pulse'

/**
 * Easing functions for animations
 */
export type EasingType =
  | 'linear'
  | 'ease_in'
  | 'ease_out'
  | 'ease_in_out'
  | 'elastic'
  | 'bounce'

// ============================================================================
// TIMELINE
// ============================================================================

/**
 * Complete battle timeline for playback
 */
export interface BattleTimeline {
  /** Total duration in milliseconds */
  totalDuration: number
  /** All events sorted by start time */
  events: TimelineEvent[]
  /** Metadata */
  metadata: TimelineMetadata
  /** Playback state */
  playback: PlaybackState
}

/**
 * Timeline metadata
 */
export interface TimelineMetadata {
  battleId: string
  createdAt: Date
  attackerName: string
  defenderName: string
  location?: string
  totalRounds: number
  winner: 'attacker' | 'defender' | 'draw'
}

/**
 * Playback state
 */
export interface PlaybackState {
  currentTime: number
  isPlaying: boolean
  playbackSpeed: number
  currentEventIndex: number
}

// ============================================================================
// RENDERER CONFIGURATION
// ============================================================================

/**
 * Renderer configuration
 */
export interface RendererConfig {
  /** Base duration for events in ms */
  baseDurations: {
    battleStart: number
    roundTransition: number
    attack: number
    damage: number
    destruction: number
    boarding: number
    ability: number
    formationChange: number
    battleEnd: number
  }
  /** Pacing multipliers */
  pacing: {
    normal: number
    fast: number
    dramatic: number
  }
  /** Visual quality settings */
  quality: 'low' | 'medium' | 'high' | 'ultra'
  /** Enable sound events */
  enableSound: boolean
  /** Enable camera movements */
  enableCameraMovements: boolean
  /** Maximum concurrent effects */
  maxConcurrentEffects: number
}

/**
 * Default renderer configuration
 */
export const DEFAULT_RENDERER_CONFIG: RendererConfig = {
  baseDurations: {
    battleStart: 3000,
    roundTransition: 1500,
    attack: 800,
    damage: 400,
    destruction: 2000,
    boarding: 4000,
    ability: 1200,
    formationChange: 2000,
    battleEnd: 5000,
  },
  pacing: {
    normal: 1.0,
    fast: 0.5,
    dramatic: 1.5,
  },
  quality: 'high',
  enableSound: true,
  enableCameraMovements: true,
  maxConcurrentEffects: 10,
}

// ============================================================================
// CINEMATIC RENDERER CLASS
// ============================================================================

/**
 * Generates cinematic timelines from battle data
 */
export class CinematicRenderer {
  private config: RendererConfig
  private eventIdCounter: number = 0
  private currentTime: number = 0

  constructor(config: Partial<RendererConfig> = {}) {
    this.config = { ...DEFAULT_RENDERER_CONFIG, ...config }
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    return `evt_${++this.eventIdCounter}_${Date.now()}`
  }

  /**
   * Calculate position for a unit based on formation
   */
  calculateUnitPosition(
    unitIndex: number,
    totalUnits: number,
    side: 'attacker' | 'defender',
    formationPosition: FormationPosition
  ): Position3D {
    const baseX = side === 'attacker' ? -500 : 500
    const spread = 50

    // Position based on formation position
    let zOffset = 0
    switch (formationPosition) {
      case 'vanguard':
        zOffset = side === 'attacker' ? 100 : -100
        break
      case 'center':
        zOffset = 0
        break
      case 'flanks':
        zOffset = (unitIndex % 2 === 0 ? 150 : -150)
        break
      case 'rear':
        zOffset = side === 'attacker' ? -100 : 100
        break
      case 'reserve':
        zOffset = side === 'attacker' ? -200 : 200
        break
    }

    // Distribute units within their position
    const yOffset = ((unitIndex % 10) - 5) * spread

    return {
      x: baseX + (Math.random() - 0.5) * 50,
      y: yOffset,
      z: zOffset + (Math.random() - 0.5) * 30,
    }
  }

  /**
   * Get weapon visual type from damage type
   */
  getWeaponVisualType(damageType: keyof DamageTypes): WeaponVisualType {
    switch (damageType) {
      case 'ballistic':
        return 'railgun'
      case 'ionic':
        return 'ion'
      case 'explosive':
        return 'missile'
      case 'hacking':
        return 'pulse'
      case 'boarding':
        return 'torpedo'
      default:
        return 'laser'
    }
  }

  /**
   * Get explosion size based on unit class
   */
  getExplosionSize(unitClass: string): 'small' | 'medium' | 'large' | 'massive' {
    switch (unitClass) {
      case 'fighter':
      case 'corvette':
        return 'small'
      case 'frigate':
      case 'cruiser':
        return 'medium'
      case 'battlecruiser':
      case 'battleship':
        return 'large'
      case 'dreadnought':
      case 'carrier':
        return 'massive'
      default:
        return 'medium'
    }
  }

  /**
   * Create battle start events
   */
  createBattleStartEvents(
    attackerFleetSize: number,
    defenderFleetSize: number,
    attackerFormation?: FormationType,
    defenderFormation?: FormationType,
    location?: string
  ): TimelineEvent[] {
    const events: TimelineEvent[] = []
    const duration = this.config.baseDurations.battleStart

    // Main battle start event
    events.push({
      id: this.generateEventId(),
      type: 'battle_start',
      startTime: this.currentTime,
      duration,
      priority: 100,
      blocking: true,
      data: {
        attackerFleetSize,
        defenderFleetSize,
        attackerFormation,
        defenderFormation,
        location,
      },
    } as BattleStartEvent)

    // Camera - wide establishing shot
    if (this.config.enableCameraMovements) {
      events.push({
        id: this.generateEventId(),
        type: 'camera_move',
        startTime: this.currentTime,
        duration: duration * 0.8,
        priority: 90,
        blocking: false,
        data: {
          shotType: 'wide',
          position: { x: 0, y: 500, z: -1000 },
          lookAt: { x: 0, y: 0, z: 0 },
          fov: 60,
          easing: 'ease_out',
        },
      } as CameraMoveEvent)
    }

    // Warp in effects
    events.push({
      id: this.generateEventId(),
      type: 'effect',
      startTime: this.currentTime + 500,
      duration: 1500,
      priority: 80,
      blocking: false,
      data: {
        effectType: 'warp_in',
        position: { x: -500, y: 0, z: 0 },
        scale: 2.0,
        intensity: 1.0,
      },
    } as EffectEvent)

    events.push({
      id: this.generateEventId(),
      type: 'effect',
      startTime: this.currentTime + 800,
      duration: 1500,
      priority: 80,
      blocking: false,
      data: {
        effectType: 'warp_in',
        position: { x: 500, y: 0, z: 0 },
        scale: 2.0,
        intensity: 1.0,
      },
    } as EffectEvent)

    // Battle announcement text
    events.push({
      id: this.generateEventId(),
      type: 'text_display',
      startTime: this.currentTime + 1000,
      duration: 2000,
      priority: 95,
      blocking: false,
      data: {
        text: 'BATTLE ENGAGED',
        style: 'announcement',
        screenPosition: { x: 0.5, y: 0.3 },
        size: 'huge',
      },
    } as TextDisplayEvent)

    // Sound
    if (this.config.enableSound) {
      events.push({
        id: this.generateEventId(),
        type: 'sound',
        startTime: this.currentTime,
        duration: 3000,
        priority: 70,
        blocking: false,
        data: {
          category: 'music_sting',
          soundId: 'battle_start',
          volume: 0.8,
          spatial: false,
        },
      } as SoundEvent)
    }

    this.currentTime += duration

    return events
  }

  /**
   * Create round transition events
   */
  createRoundEvents(
    roundNumber: number,
    attackerRemaining: number,
    defenderRemaining: number,
    isStart: boolean
  ): TimelineEvent[] {
    const events: TimelineEvent[] = []
    const duration = this.config.baseDurations.roundTransition

    events.push({
      id: this.generateEventId(),
      type: isStart ? 'round_start' : 'round_end',
      startTime: this.currentTime,
      duration,
      priority: 90,
      blocking: true,
      data: {
        roundNumber,
        attackerRemaining,
        defenderRemaining,
      },
    } as RoundEvent)

    if (isStart) {
      // Round announcement
      events.push({
        id: this.generateEventId(),
        type: 'text_display',
        startTime: this.currentTime,
        duration: 1000,
        priority: 85,
        blocking: false,
        data: {
          text: `ROUND ${roundNumber}`,
          style: 'announcement',
          screenPosition: { x: 0.5, y: 0.2 },
          size: 'large',
        },
      } as TextDisplayEvent)

      // Camera pull back
      if (this.config.enableCameraMovements) {
        events.push({
          id: this.generateEventId(),
          type: 'camera_move',
          startTime: this.currentTime,
          duration,
          priority: 80,
          blocking: false,
          data: {
            shotType: 'orbital',
            position: { x: 0, y: 800, z: -200 },
            lookAt: { x: 0, y: 0, z: 0 },
            easing: 'ease_in_out',
          },
        } as CameraMoveEvent)
      }
    }

    this.currentTime += duration

    return events
  }

  /**
   * Create attack events
   */
  createAttackEvent(
    attacker: {
      id: string
      name: string
      class: string
      position: Position3D
    },
    target: {
      id: string
      name: string
      class: string
      position: Position3D
    },
    damageType: keyof DamageTypes,
    isCritical: boolean,
    isRapidFire: boolean = false
  ): TimelineEvent[] {
    const events: TimelineEvent[] = []
    const baseDuration = this.config.baseDurations.attack
    const duration = isCritical
      ? baseDuration * this.config.pacing.dramatic
      : baseDuration * this.config.pacing.normal

    // Main attack event
    events.push({
      id: this.generateEventId(),
      type: 'attack',
      startTime: this.currentTime,
      duration,
      priority: 70,
      blocking: false,
      data: {
        attackerId: attacker.id,
        attackerName: attacker.name,
        attackerClass: attacker.class,
        attackerPosition: attacker.position,
        targetId: target.id,
        targetName: target.name,
        targetClass: target.class,
        targetPosition: target.position,
        weaponType: this.getWeaponVisualType(damageType),
        damageType,
        isCritical,
        isRapidFire,
      },
    } as AttackEvent)

    // Weapon fire effect
    const effectType = this.getWeaponEffectType(damageType)
    events.push({
      id: this.generateEventId(),
      type: 'effect',
      startTime: this.currentTime,
      duration: duration * 0.8,
      priority: 65,
      blocking: false,
      data: {
        effectType,
        position: attacker.position,
        targetPosition: target.position,
        scale: isCritical ? 1.5 : 1.0,
        intensity: isCritical ? 1.5 : 1.0,
      },
    } as EffectEvent)

    // Camera for critical hits
    if (isCritical && this.config.enableCameraMovements) {
      events.push({
        id: this.generateEventId(),
        type: 'camera_move',
        startTime: this.currentTime,
        duration: duration * 0.7,
        priority: 75,
        blocking: false,
        data: {
          shotType: 'dramatic',
          position: {
            x: (attacker.position.x + target.position.x) / 2,
            y: 100,
            z: (attacker.position.z + target.position.z) / 2 - 150,
          },
          lookAt: target.position,
          easing: 'ease_out',
        },
      } as CameraMoveEvent)
    }

    // Sound
    if (this.config.enableSound) {
      events.push({
        id: this.generateEventId(),
        type: 'sound',
        startTime: this.currentTime,
        duration: duration * 0.5,
        priority: 60,
        blocking: false,
        data: {
          category: 'weapon_fire',
          soundId: `${damageType}_fire`,
          volume: isCritical ? 1.0 : 0.7,
          position: attacker.position,
          spatial: true,
        },
      } as SoundEvent)
    }

    this.currentTime += duration * 0.3 // Overlap attacks

    return events
  }

  /**
   * Get visual effect type for weapon
   */
  private getWeaponEffectType(damageType: keyof DamageTypes): VisualEffectType {
    switch (damageType) {
      case 'ballistic':
        return 'railgun_shot'
      case 'ionic':
        return 'ion_beam'
      case 'explosive':
        return 'missile_launch'
      case 'hacking':
        return 'hack_effect'
      case 'boarding':
        return 'boarding_pod_launch'
      default:
        return 'laser_beam'
    }
  }

  /**
   * Create damage events
   */
  createDamageEvent(
    target: {
      id: string
      name: string
      position: Position3D
    },
    damage: Partial<DamageTypes>,
    totalDamage: number,
    shieldDamage: number,
    armorDamage: number,
    hullDamage: number,
    isCritical: boolean,
    shieldBroken: boolean,
    remainingHullPercent: number
  ): TimelineEvent[] {
    const events: TimelineEvent[] = []
    const duration = this.config.baseDurations.damage

    // Main damage event
    events.push({
      id: this.generateEventId(),
      type: 'damage',
      startTime: this.currentTime,
      duration,
      priority: 65,
      blocking: false,
      data: {
        targetId: target.id,
        targetName: target.name,
        targetPosition: target.position,
        damage,
        totalDamage,
        shieldDamage,
        armorDamage,
        hullDamage,
        isCritical,
        shieldBroken,
        remainingHullPercent,
      },
    } as DamageEvent)

    // Impact effects
    if (shieldDamage > 0) {
      events.push({
        id: this.generateEventId(),
        type: 'effect',
        startTime: this.currentTime,
        duration: 300,
        priority: 60,
        blocking: false,
        data: {
          effectType: shieldBroken ? 'shield_break' : 'shield_hit',
          position: target.position,
          scale: Math.min(shieldDamage / 100, 2.0),
          color: '#00ffff',
          intensity: shieldBroken ? 2.0 : 1.0,
        },
      } as EffectEvent)
    }

    if (armorDamage > 0) {
      events.push({
        id: this.generateEventId(),
        type: 'effect',
        startTime: this.currentTime + 100,
        duration: 250,
        priority: 60,
        blocking: false,
        data: {
          effectType: 'armor_spark',
          position: target.position,
          scale: Math.min(armorDamage / 50, 1.5),
          color: '#ffaa00',
          intensity: 1.0,
        },
      } as EffectEvent)
    }

    if (hullDamage > 0) {
      events.push({
        id: this.generateEventId(),
        type: 'effect',
        startTime: this.currentTime + 150,
        duration: 400,
        priority: 60,
        blocking: false,
        data: {
          effectType: 'hull_breach',
          position: target.position,
          scale: Math.min(hullDamage / 100, 2.0),
          color: '#ff4400',
          intensity: 1.2,
        },
      } as EffectEvent)
    }

    // Critical hit effect
    if (isCritical) {
      events.push({
        id: this.generateEventId(),
        type: 'effect',
        startTime: this.currentTime,
        duration: 500,
        priority: 70,
        blocking: false,
        data: {
          effectType: 'critical_hit',
          position: target.position,
          scale: 1.5,
          color: '#ff0000',
          intensity: 2.0,
        },
      } as EffectEvent)

      events.push({
        id: this.generateEventId(),
        type: 'text_display',
        startTime: this.currentTime,
        duration: 800,
        priority: 68,
        blocking: false,
        data: {
          text: 'CRITICAL!',
          style: 'damage_number',
          position: target.position,
          color: '#ff0000',
          size: 'large',
        },
      } as TextDisplayEvent)
    }

    // Damage number
    events.push({
      id: this.generateEventId(),
      type: 'text_display',
      startTime: this.currentTime + 50,
      duration: 600,
      priority: 55,
      blocking: false,
      data: {
        text: `-${totalDamage}`,
        style: 'damage_number',
        position: target.position,
        color: isCritical ? '#ff0000' : '#ffff00',
        size: isCritical ? 'large' : 'medium',
      },
    } as TextDisplayEvent)

    // Sound
    if (this.config.enableSound) {
      events.push({
        id: this.generateEventId(),
        type: 'sound',
        startTime: this.currentTime,
        duration: 300,
        priority: 55,
        blocking: false,
        data: {
          category: 'impact',
          soundId: shieldBroken ? 'shield_break' : 'impact_hit',
          volume: Math.min(totalDamage / 200, 1.0),
          position: target.position,
          spatial: true,
        },
      } as SoundEvent)
    }

    this.currentTime += duration * 0.5

    return events
  }

  /**
   * Create destruction events
   */
  createDestructionEvent(
    unit: {
      id: string
      name: string
      class: string
      position: Position3D
    },
    killerName?: string,
    veterancyRank?: VeterancyRank
  ): TimelineEvent[] {
    const events: TimelineEvent[] = []
    const explosionSize = this.getExplosionSize(unit.class)
    const duration = this.config.baseDurations.destruction *
      (explosionSize === 'massive' ? 1.5 : explosionSize === 'large' ? 1.2 : 1.0)

    // Main destruction event
    events.push({
      id: this.generateEventId(),
      type: 'destruction',
      startTime: this.currentTime,
      duration,
      priority: 85,
      blocking: false,
      data: {
        unitId: unit.id,
        unitName: unit.name,
        unitClass: unit.class,
        position: unit.position,
        killerName,
        explosionSize,
        debrisGenerated: true,
        veterancyRank,
      },
    } as DestructionEvent)

    // Explosion effect
    const explosionEffectType: VisualEffectType =
      explosionSize === 'massive' || explosionSize === 'large'
        ? 'explosion_large'
        : explosionSize === 'medium'
        ? 'explosion_medium'
        : 'explosion_small'

    events.push({
      id: this.generateEventId(),
      type: 'effect',
      startTime: this.currentTime,
      duration: duration * 0.8,
      priority: 80,
      blocking: false,
      data: {
        effectType: explosionEffectType,
        position: unit.position,
        scale: explosionSize === 'massive' ? 3.0 : explosionSize === 'large' ? 2.0 : 1.0,
        color: '#ff6600',
        intensity: 2.0,
      },
    } as EffectEvent)

    // Camera for large explosions
    if ((explosionSize === 'large' || explosionSize === 'massive') &&
        this.config.enableCameraMovements) {
      events.push({
        id: this.generateEventId(),
        type: 'camera_move',
        startTime: this.currentTime,
        duration: duration * 0.6,
        priority: 82,
        blocking: false,
        data: {
          shotType: 'dramatic',
          position: {
            x: unit.position.x + 100,
            y: unit.position.y + 50,
            z: unit.position.z - 100,
          },
          lookAt: unit.position,
          easing: 'ease_out',
        },
      } as CameraMoveEvent)
    }

    // Destruction text
    events.push({
      id: this.generateEventId(),
      type: 'text_display',
      startTime: this.currentTime + 200,
      duration: 1500,
      priority: 75,
      blocking: false,
      data: {
        text: `${unit.name} DESTROYED`,
        style: 'status',
        position: unit.position,
        color: '#ff4400',
        size: 'medium',
      },
    } as TextDisplayEvent)

    // Sound
    if (this.config.enableSound) {
      events.push({
        id: this.generateEventId(),
        type: 'sound',
        startTime: this.currentTime,
        duration: duration,
        priority: 78,
        blocking: false,
        data: {
          category: 'explosion',
          soundId: `explosion_${explosionSize}`,
          volume: 1.0,
          position: unit.position,
          spatial: true,
        },
      } as SoundEvent)
    }

    this.currentTime += duration * 0.7

    return events
  }

  /**
   * Create battle end events
   */
  createBattleEndEvents(
    winner: 'attacker' | 'defender' | 'draw',
    attackerSurvivors: number,
    defenderSurvivors: number,
    totalRounds: number,
    debris: { metal: number; crystal: number },
    moonChance: number,
    moonCreated: boolean
  ): TimelineEvent[] {
    const events: TimelineEvent[] = []
    const duration = this.config.baseDurations.battleEnd

    // Main battle end event
    events.push({
      id: this.generateEventId(),
      type: 'battle_end',
      startTime: this.currentTime,
      duration,
      priority: 100,
      blocking: true,
      data: {
        winner,
        attackerSurvivors,
        defenderSurvivors,
        totalRounds,
        debrisField: debris,
        moonChance,
        moonCreated,
      },
    } as BattleEndEvent)

    // Winner announcement
    const winnerText = winner === 'draw' ? 'BATTLE DRAW' :
      winner === 'attacker' ? 'ATTACKER VICTORY' : 'DEFENDER VICTORY'

    events.push({
      id: this.generateEventId(),
      type: 'text_display',
      startTime: this.currentTime + 500,
      duration: 3000,
      priority: 95,
      blocking: false,
      data: {
        text: winnerText,
        style: 'announcement',
        screenPosition: { x: 0.5, y: 0.3 },
        color: winner === 'draw' ? '#ffffff' : winner === 'attacker' ? '#00ff00' : '#ff6600',
        size: 'huge',
      },
    } as TextDisplayEvent)

    // Camera pull back
    if (this.config.enableCameraMovements) {
      events.push({
        id: this.generateEventId(),
        type: 'camera_move',
        startTime: this.currentTime,
        duration: duration * 0.6,
        priority: 90,
        blocking: false,
        data: {
          shotType: 'wide',
          position: { x: 0, y: 1000, z: -500 },
          lookAt: { x: 0, y: 0, z: 0 },
          fov: 70,
          easing: 'ease_in_out',
        },
      } as CameraMoveEvent)
    }

    // Victory/defeat music
    if (this.config.enableSound) {
      events.push({
        id: this.generateEventId(),
        type: 'sound',
        startTime: this.currentTime,
        duration,
        priority: 85,
        blocking: false,
        data: {
          category: 'music_sting',
          soundId: winner === 'draw' ? 'battle_draw' : 'battle_victory',
          volume: 0.9,
          spatial: false,
        },
      } as SoundEvent)
    }

    this.currentTime += duration

    return events
  }

  /**
   * Create a complete timeline from battle data
   */
  createTimeline(
    metadata: Omit<TimelineMetadata, 'createdAt'>,
    events: TimelineEvent[]
  ): BattleTimeline {
    // Sort events by start time, then priority
    const sortedEvents = [...events].sort((a, b) => {
      if (a.startTime !== b.startTime) return a.startTime - b.startTime
      return b.priority - a.priority
    })

    return {
      totalDuration: this.currentTime,
      events: sortedEvents,
      metadata: {
        ...metadata,
        createdAt: new Date(),
      },
      playback: {
        currentTime: 0,
        isPlaying: false,
        playbackSpeed: 1.0,
        currentEventIndex: 0,
      },
    }
  }

  /**
   * Reset renderer state
   */
  reset(): void {
    this.currentTime = 0
    this.eventIdCounter = 0
  }

  /**
   * Get events at a specific time
   */
  static getEventsAtTime(timeline: BattleTimeline, time: number): TimelineEvent[] {
    return timeline.events.filter(
      event => time >= event.startTime && time < event.startTime + event.duration
    )
  }

  /**
   * Get next event after time
   */
  static getNextEvent(timeline: BattleTimeline, time: number): TimelineEvent | null {
    for (const event of timeline.events) {
      if (event.startTime > time) return event
    }
    return null
  }

  /**
   * Seek to time
   */
  static seekTo(timeline: BattleTimeline, time: number): void {
    timeline.playback.currentTime = Math.max(0, Math.min(time, timeline.totalDuration))

    // Find current event index
    let index = 0
    for (let i = 0; i < timeline.events.length; i++) {
      if (timeline.events[i].startTime <= time) {
        index = i
      } else {
        break
      }
    }
    timeline.playback.currentEventIndex = index
  }
}

/**
 * Helper to create a simple timeline from battle result
 */
export function createBattleTimeline(
  battleId: string,
  attackerName: string,
  defenderName: string,
  config?: Partial<RendererConfig>
): { renderer: CinematicRenderer; addEvent: (event: TimelineEvent) => void; build: () => BattleTimeline } {
  const renderer = new CinematicRenderer(config)
  const events: TimelineEvent[] = []

  return {
    renderer,
    addEvent: (event: TimelineEvent) => events.push(event),
    build: () => renderer.createTimeline(
      {
        battleId,
        attackerName,
        defenderName,
        totalRounds: 0,
        winner: 'draw',
      },
      events
    ),
  }
}
