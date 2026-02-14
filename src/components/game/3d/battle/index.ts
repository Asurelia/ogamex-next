/**
 * Battle 3D Components
 *
 * Components for 3D battle visualization and replay.
 * Includes cinematic battle scene with animated fleets,
 * weapon fire effects, and dramatic camera movements.
 */

// Battle Report Viewer (from scenes/)
export { BattleReportViewer } from '../scenes/BattleReportViewer'

// Main Battle Scene
export { BattleScene3D } from './BattleScene3D'
export type {
  BattleSceneProps,
  FleetComposition,
  BattleRound,
  BattleEvent,
  BattleResult,
} from './BattleScene3D'

// Ship Models - Individual components
export {
  SmallCargo,
  LargeCargo,
  LightFighter,
  HeavyFighter,
  Cruiser,
  Battleship,
  Bomber,
  Destroyer,
  Deathstar,
  Recycler,
  EspionageProbe,
  SolarSatellite,
  ColonyShip,
  Battlecruiser,
  Reaper,
  Pathfinder,
  ShipModel,
  getShipModel,
  getShipConfig,
  getAllShipTypes,
} from './ShipModels'

// Ship Models - Type exports
export type {
  ShipType,
  ShipModelProps,
  ShipModelRef,
} from './ShipModels'

// Battle Effects - Particle Systems
export {
  LaserBeam,
  Explosion,
  ShieldImpact,
  DebrisField,
  EngineTrail,
  MuzzleFlash,
  BattleEffectsManager,
  useBattleEffects,
} from './BattleEffects'

// Battle Effects - Type exports
export type {
  LaserBeamProps,
  ExplosionProps,
  ShieldImpactProps,
  DebrisFieldProps,
  EngineTrailProps,
  MuzzleFlashProps,
  BattleEffect,
  BattleEffectsManagerProps,
  UseBattleEffectsReturn,
} from './BattleEffects'

// Battle Animation Engine
export {
  // Main Engine Class
  BattleAnimationEngine,

  // React Hook
  useBattleAnimation,

  // Constants
  DEFAULT_PHASE_TIMING,
  EFFECT_POOL_CONFIG,
  LOD_THRESHOLDS,
  CAMERA_PRESETS,

  // Utility Functions
  calculateLODLevel,
  calculateRoundDuration,
} from './BattleAnimationEngine'

export type {
  // Scene References
  ShipRef,
  BattleSceneRef,
  BattleData,

  // Timeline Types
  TimelineEvent,
  TimelineEventType,
  TimelineEventData,

  // Animation Types
  AnimationPhase,
  PhaseTiming,
  CameraShotType,
  CameraConfig,

  // Effect Pooling
  PooledEffect,

  // Engine State & Callbacks
  EngineState,
  EngineCallbacks,

  // Hook Types
  BattleAnimationControls,
  UseBattleAnimationReturn,
} from './BattleAnimationEngine'
