/**
 * Procedural Generators Index
 * Re-exports all generator modules
 */

export {
  generateGalaxy,
  generateAllGalaxies,
  getGalaxyDistributionStats,
} from './GalaxyGenerator'
export type { GalaxyGenerationResult } from './GalaxyGenerator'

export {
  generateSolarSystem,
  generateStarEffects,
  getSystemSummary,
} from './SolarSystemGenerator'
export type { SolarSystemGenerationResult } from './SolarSystemGenerator'

export {
  generateCelestialBody,
  generateSystemBodies,
  calculateEffectiveMultipliers,
} from './CelestialBodyGenerator'
export type { CelestialBodyGenerationResult } from './CelestialBodyGenerator'
