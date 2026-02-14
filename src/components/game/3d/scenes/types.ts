'use client'

/**
 * Scene Types for 3D Immersive Navigation
 * Defines the types of scenes available in the game
 */

// ============================================================================
// SCENE TYPE DEFINITIONS
// ============================================================================

/**
 * Available scene types corresponding to game categories
 */
export type SceneType =
  | 'overview'
  | 'resources'
  | 'facilities'
  | 'research'
  | 'shipyard'
  | 'defense'
  | 'fleet'
  | 'galaxy'

/**
 * Environment types for scene backgrounds
 */
export type EnvironmentType = 'space' | 'surface' | 'underground' | 'orbital'

/**
 * Lighting presets for scenes
 */
export type LightingType = 'day' | 'night' | 'industrial' | 'research' | 'warning'

/**
 * Transition types between scenes
 */
export type TransitionType = 'warp' | 'elevator' | 'teleport' | 'walk' | 'shuttle'

// ============================================================================
// SCENE CONFIGURATION
// ============================================================================

/**
 * Configuration for a scene type
 */
export interface SceneConfig {
  type: SceneType
  environment: EnvironmentType
  lighting: LightingType
  transition: TransitionType
  title: string
  description: string
  icon: string
  backgroundColor: string
  ambientColor: string
  fogColor: string
  fogDensity: number
}

/**
 * Scene configurations mapping
 */
export const SCENE_CONFIGS: Record<SceneType, SceneConfig> = {
  overview: {
    type: 'overview',
    environment: 'orbital',
    lighting: 'day',
    transition: 'shuttle',
    title: 'Colony Overview',
    description: 'Bird\'s eye view of your entire colony',
    icon: 'planet',
    backgroundColor: '#010206',
    ambientColor: '#1a2a4a',
    fogColor: '#020408',
    fogDensity: 0.01,
  },
  resources: {
    type: 'resources',
    environment: 'surface',
    lighting: 'industrial',
    transition: 'elevator',
    title: 'Resource District',
    description: 'Mining facilities and resource extraction',
    icon: 'mine',
    backgroundColor: '#0a0806',
    ambientColor: '#3a2a1a',
    fogColor: '#1a1008',
    fogDensity: 0.015,
  },
  facilities: {
    type: 'facilities',
    environment: 'surface',
    lighting: 'day',
    transition: 'walk',
    title: 'Industrial Complex',
    description: 'Production facilities and factories',
    icon: 'factory',
    backgroundColor: '#060608',
    ambientColor: '#2a2a3a',
    fogColor: '#0a0a10',
    fogDensity: 0.012,
  },
  research: {
    type: 'research',
    environment: 'underground',
    lighting: 'research',
    transition: 'elevator',
    title: 'Research Laboratory',
    description: 'Scientific research and development',
    icon: 'flask',
    backgroundColor: '#040610',
    ambientColor: '#1a1a4a',
    fogColor: '#020208',
    fogDensity: 0.02,
  },
  shipyard: {
    type: 'shipyard',
    environment: 'orbital',
    lighting: 'industrial',
    transition: 'shuttle',
    title: 'Orbital Shipyard',
    description: 'Ship construction and maintenance',
    icon: 'rocket',
    backgroundColor: '#020408',
    ambientColor: '#1a2a3a',
    fogColor: '#010204',
    fogDensity: 0.008,
  },
  defense: {
    type: 'defense',
    environment: 'surface',
    lighting: 'warning',
    transition: 'teleport',
    title: 'Defense Grid',
    description: 'Planetary defense installations',
    icon: 'shield',
    backgroundColor: '#080404',
    ambientColor: '#4a1a1a',
    fogColor: '#100404',
    fogDensity: 0.015,
  },
  fleet: {
    type: 'fleet',
    environment: 'orbital',
    lighting: 'night',
    transition: 'shuttle',
    title: 'Fleet Command',
    description: 'Fleet management and deployment',
    icon: 'ships',
    backgroundColor: '#020206',
    ambientColor: '#1a1a2a',
    fogColor: '#010104',
    fogDensity: 0.01,
  },
  galaxy: {
    type: 'galaxy',
    environment: 'space',
    lighting: 'night',
    transition: 'warp',
    title: 'Galaxy Map',
    description: 'Galactic navigation and exploration',
    icon: 'galaxy',
    backgroundColor: '#000004',
    ambientColor: '#0a0a2a',
    fogColor: '#000002',
    fogDensity: 0.005,
  },
}

// ============================================================================
// RESOURCE COST INTERFACE
// ============================================================================

/**
 * Resource cost structure used across the game
 */
export interface ResourceCost {
  metal: number
  crystal: number
  deuterium: number
  energy?: number
}

/**
 * Production rates per hour
 */
export interface ProductionRate {
  metal?: number
  crystal?: number
  deuterium?: number
  energy?: number
}
