export { Planet3D } from './Planet3D'
export type { PlanetType } from './Planet3D'
export { TexturedPlanet3D } from './TexturedPlanet3D'
export type { TexturedPlanet3DProps } from './TexturedPlanet3D'
export { Starfield } from './Starfield'
export type { StarfieldProps } from './Starfield'
export { Sun3D } from './Sun3D'
export { OrbitRing } from './OrbitRing'

// Procedural Star Types
export { Star3D } from './Star3D'
export { BinaryStarSystem } from './BinaryStarSystem'
export { BlackHole3D } from './BlackHole3D'
export { NeutronStar3D } from './NeutronStar3D'
export { AsteroidBelt3D } from './AsteroidBelt3D'

// Ship Models (from battle/)
export { ShipModel, getShipModel, getAllShipTypes, getShipConfig } from './battle/ShipModels'
export { SolarSystemView } from './SolarSystemView'
export type { SolarSystemPlanet, SolarSystemViewProps, DatabasePlanet } from './SolarSystemView'

// Procedural Solar System View
export { ProceduralSolarSystemView } from './ProceduralSolarSystemView'
export type { ProceduralSolarSystemViewProps } from './ProceduralSolarSystemView'

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

// Advanced 3D Effects
export { NebulaBackground } from './NebulaBackground'
export type { NebulaBackgroundProps } from './NebulaBackground'

export { WarpTunnel, WarpFlashEffect } from './WarpTunnel'
export type { WarpTunnelProps, WarpTunnelRef, WarpFlashProps, WarpFlashRef } from './WarpTunnel'

// Galaxy Map
export { GalaxyMap3D } from './GalaxyMap3D'
export type { GalaxyMap3DProps } from './GalaxyMap3D'
export { GalaxyMap3DOptimized } from './GalaxyMap3DOptimized'
