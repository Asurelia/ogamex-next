export { Planet3D } from './Planet3D'
export type { PlanetType } from './Planet3D'
export { Starfield } from './Starfield'
export { Sun3D } from './Sun3D'
export { OrbitRing } from './OrbitRing'

// Ship Models (from battle/)
export { ShipModel, getShipModel, getAllShipTypes, getShipConfig } from './battle/ShipModels'
export { SolarSystemView } from './SolarSystemView'
export type { SolarSystemPlanet, SolarSystemViewProps, DatabasePlanet } from './SolarSystemView'

// Scenes
export { OrbitalViewScene } from './scenes/OrbitalViewScene'
export type { OrbitalViewSceneProps } from './scenes/OrbitalViewScene'
export { ResearchLabScene } from './scenes/ResearchLabScene'
export type { Technology, ResearchLabSceneProps } from './scenes/ResearchLabScene'
export { ShipyardScene } from './scenes/ShipyardScene'

// Scene Manager
export { GameScene3DManager } from './GameScene3DManager'
export type { SceneType, GameScene3DManagerProps } from './GameScene3DManager'

// Battle Scene
export { BattleScene3D, BattleReportViewer } from './battle'
export type {
  BattleSceneProps,
  FleetComposition,
  BattleRound,
  BattleEvent,
  BattleResult,
} from './battle'

// Battle Effects
export {
  LaserBeam,
  Explosion,
  ShieldImpact,
  DebrisField,
  EngineTrail,
  MuzzleFlash,
  BattleEffectsManager,
  useBattleEffects,
} from './battle'
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
} from './battle'

// Battle Animation Engine
export {
  BattleAnimationEngine,
  useBattleAnimation,
  DEFAULT_PHASE_TIMING,
  EFFECT_POOL_CONFIG,
  LOD_THRESHOLDS,
  CAMERA_PRESETS,
  calculateLODLevel,
  calculateRoundDuration,
} from './battle'
export type {
  ShipRef,
  BattleSceneRef,
  BattleData,
  TimelineEvent,
  TimelineEventType,
  TimelineEventData,
  AnimationPhase,
  PhaseTiming,
  CameraShotType,
  CameraConfig,
  PooledEffect,
  EngineState,
  EngineCallbacks,
  BattleAnimationControls,
  UseBattleAnimationReturn,
} from './battle'
