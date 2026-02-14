// ============================================================================
// SCENE COMPONENTS BARREL EXPORT
// ============================================================================

// Base scene wrapper
export { BaseScene } from './BaseScene'
export type { BaseSceneProps } from './BaseScene'

// Scene transitions
export { SceneTransition } from './SceneTransition'
export type { SceneTransitionProps } from './SceneTransition'

// 3D Action panel
export { ActionPanel3D } from './ActionPanel3D'
export type { ActionPanel3DProps, UpgradeCost } from './ActionPanel3D'

// Orbital view scene
export { OrbitalViewScene } from './OrbitalViewScene'
export type { OrbitalViewSceneProps } from './OrbitalViewScene'

// Research lab scene
export { ResearchLabScene } from './ResearchLabScene'
export type { Technology, ResearchLabSceneProps } from './ResearchLabScene'

// Mines scene
export { MinesScene } from './MinesScene'
export type { MinesSceneProps, BuildingData, ResourcesData, EnergyBuildingData } from './MinesScene'

// Shipyard scene
export { ShipyardScene } from './ShipyardScene'
export type { ShipyardSceneProps } from './ShipyardScene'

// Defense scene
export { DefenseScene } from './DefenseScene'
export type { DefenseSceneProps } from './DefenseScene'

// Battle report viewer
export { BattleReportViewer } from './BattleReportViewer'
export type { BattleReportViewerProps } from './BattleReportViewer'

// Types and configurations
export {
  SCENE_CONFIGS,
  type SceneType,
  type EnvironmentType,
  type LightingType,
  type TransitionType,
  type SceneConfig,
  type ResourceCost,
  type ProductionRate,
} from './types'

// ============================================================================
// SCENE TYPE MAPPING
// ============================================================================

import type { SceneType, SceneConfig } from './types'
import { SCENE_CONFIGS } from './types'

/**
 * Mapping from SceneType to scene component paths
 * This can be used for dynamic imports or lazy loading
 */
export const SCENE_COMPONENT_MAP: Record<SceneType, string> = {
  overview: '@/components/game/3d/scenes/OrbitalViewScene',
  resources: '@/components/game/3d/scenes/MinesScene',
  facilities: '@/components/game/3d/scenes/FacilitiesScene',
  research: '@/components/game/3d/scenes/ResearchLabScene',
  shipyard: '@/components/game/3d/scenes/ShipyardScene',
  defense: '@/components/game/3d/scenes/DefenseScene',
  fleet: '@/components/game/3d/scenes/FleetScene',
  galaxy: '@/components/game/3d/scenes/GalaxyScene',
}

/**
 * Helper to get scene config by type
 */
export function getSceneConfig(sceneType: SceneType): SceneConfig {
  return SCENE_CONFIGS[sceneType]
}
