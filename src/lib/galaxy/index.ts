/**
 * Procedural Galaxy System
 * Main export file for the galaxy generation module
 */

// Types
export * from './types'

// Constants
export * from './constants'

// PRNG utilities
export {
  SeededRandom,
  galaxySeed,
  systemSeed,
  bodySeed,
  moonSeed,
  hashString,
  combinedSeed,
} from './prng'

// Generators
export * from './generators'

// Star effects
export {
  getDangerLevel,
  getDangerColor,
  getProductionModifiers,
  applyProductionModifiers,
  calculateFleetRisk,
  getExpeditionBonus,
  getStarInfo,
  parseStarEffects,
  getStarIcon,
  getStarGlowClass,
} from './star-effects'
export type { DangerLevel, ProductionModifiers, FleetRiskResult, StarInfo } from './star-effects'

// Service
export { GalaxyService } from './GalaxyService'
export { default as GalaxyServiceDefault } from './GalaxyService'

// Map Controller
export {
  GalaxyMapController,
  getGalaxyMapController,
  disposeGalaxyMapController,
  MAP_CONFIG,
} from './GalaxyMapController'
export type {
  GalaxyCoordinates,
  ViewportBounds,
  SystemSummary,
  SystemDetails,
  CelestialBodySummary,
  ConnectionSummary,
  StarEffects,
  DiscoveryLevel,
  ZoomLevel,
  CameraState,
  LoadingState,
  MapControllerState,
  MapControllerCallbacks,
} from './GalaxyMapController'
