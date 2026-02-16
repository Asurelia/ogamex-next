/**
 * Battle Animation Types
 *
 * TypeScript interfaces and types for the Battle Animation Engine.
 * Extracted from BattleAnimationEngine.ts for maintainability.
 */

import * as THREE from 'three'
import type { BattleResult, FleetComposition, DefenseComposition } from '../../../../lib/battle/types'

// ============================================================================
// SHIP AND SCENE REFERENCES
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

// ============================================================================
// TIMELINE TYPES
// ============================================================================

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
 * Animation phase types
 */
export type AnimationPhase = 'idle' | 'targeting' | 'firing' | 'impact' | 'resolution' | 'transition'

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

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

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

// ============================================================================
// EFFECT POOL TYPES
// ============================================================================

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

// ============================================================================
// ENGINE STATE TYPES
// ============================================================================

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
// HOOK TYPES
// ============================================================================

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
  engine: import('./BattleAnimationEngine').BattleAnimationEngine | null
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

// ============================================================================
// LOD TYPES
// ============================================================================

/**
 * Level of Detail for battle rendering
 */
export type LODLevel = 'full' | 'reduced' | 'batch' | 'simplified'
