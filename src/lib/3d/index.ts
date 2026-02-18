/**
 * OGameX 3D Utilities
 * Centralized exports for 3D rendering components and utilities
 */

// Constants and types
export {
  PLANET_TYPES,
  PLANET_VARIANTS,
  PLANET_SIZES,
  SHIP_MODELS,
  DEFENSE_MODELS,
  CAMERA_PRESETS,
  ATMOSPHERE_COLORS,
  STAR_TYPES,
  ANIMATION_SPEEDS,
  QUALITY_PRESETS,
  type PlanetType,
  type PlanetSize,
  type ShipType,
  type DefenseType,
  type CameraPreset,
  type StarType,
  type QualityPreset,
} from './constants'

// Texture management
export {
  getPlanetTexturePath,
  getMoonViewTexturePath,
  usePlanetTexture,
  useMoonViewTexture,
  getRandomPlanetVariant,
  getRandomPlanetType,
  preloadPlanetTextures,
  preloadMoonViewTextures,
  getCachedTexture,
  clearTextureCache,
  getTextureCacheSize,
  usePreloadTextures,
  createNoiseTexture,
} from './textures'

// Materials
export {
  createPlanetMaterial,
  usePlanetMaterial,
  createAtmosphereMaterial,
  useAtmosphereMaterial,
  createShipMaterial,
  useShipMaterial,
  createHologramMaterial,
  useHologramMaterial,
  createSunMaterial,
  useSunMaterial,
  createShieldMaterial,
  createEngineTrailMaterial,
  createLaserMaterial,
  updateMaterialTime,
  type PlanetMaterialOptions,
  type ShipMaterialOptions,
  type HologramMaterialOptions,
  type SunMaterialOptions,
} from './materials'

// Post-processing effects
export {
  SpaceEffects,
  SpaceEffectsLight,
  CombatEffects,
  CinematicEffects,
  MinimalEffects,
  GalaxyEffects,
  HyperspaceEffects,
  EFFECT_PRESETS,
  type EffectPreset,
  type SpaceEffectsProps,
  type CombatEffectsProps,
  type CinematicEffectsProps,
} from './effects'

// Procedural Planet Generation
export {
  ProceduralPlanet,
  createProceduralPlanet,
  mapLegacyType,
  seedFromId,
  multiSeedFromId,
  seedToInt,
  type ProceduralPlanetType,
  type PlanetParams,
  type PlanetColors,
} from './procedural-planet'

// Particle Effects (three.quarks VFX)
export {
  getParticleBatchRenderer,
  updateParticles,
  disposeParticles,
  createExplosionEffect,
  createImpactEffect,
  createLaserTrail,
  createEngineExhaust,
  removeEngineExhaust,
  createShieldImpact,
  createWarpEffect as createWarpParticles,
  createDebrisField,
  createCustomEffect,
  type CustomEffectParams,
} from './particle-effects'

// Volumetric Nebula Background
export {
  VolumetricNebula,
  createVolumetricNebula,
  createPurpleNebula,
  createFireNebula,
  createCyanNebula,
  createEmeraldNebula,
  type NebulaConfig,
} from './volumetric-nebula'

// Warp/Hyperspace Effects
export {
  WarpEffect,
  WarpFlash,
  createWarpEffect,
  createWarpFlash,
  type WarpConfig,
} from './warp-effect'

// Instanced Stars (High-Performance Galaxy Rendering)
export {
  InstancedStars,
  createInstancedStars,
  getStarColor,
  getRandomStarType,
  type Star,
  type StarType as InstancedStarType,
  type InstancedStarsConfig,
} from './instanced-stars'
