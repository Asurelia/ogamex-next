/**
 * 3D Constants for OGameX
 * Defines planet types, ship models, and camera presets
 */

// Planet types available in the game
export const PLANET_TYPES = [
  'desert',
  'dry',
  'gas',
  'ice',
  'jungle',
  'normal',
  'water',
] as const

export type PlanetType = (typeof PLANET_TYPES)[number]

// Number of variants available per planet type
export const PLANET_VARIANTS = 10

// Planet size categories
export const PLANET_SIZES = {
  small: { scale: 0.6, atmosphereScale: 1.15 },
  medium: { scale: 1.0, atmosphereScale: 1.12 },
  big: { scale: 1.5, atmosphereScale: 1.10 },
} as const

export type PlanetSize = keyof typeof PLANET_SIZES

// Ship model configurations
export const SHIP_MODELS = {
  // Civil ships
  small_cargo: { scale: 0.3, color: '#88aacc', category: 'civil' },
  large_cargo: { scale: 0.5, color: '#6699bb', category: 'civil' },
  colony_ship: { scale: 0.8, color: '#55aa77', category: 'civil' },
  recycler: { scale: 0.6, color: '#99aa55', category: 'civil' },
  espionage_probe: { scale: 0.1, color: '#aaccff', category: 'civil' },
  solar_satellite: { scale: 0.2, color: '#ffcc44', category: 'civil' },
  pathfinder: { scale: 0.7, color: '#aaccee', category: 'civil' },

  // Combat ships
  light_fighter: { scale: 0.4, color: '#88ccff', category: 'combat' },
  heavy_fighter: { scale: 0.6, color: '#6699cc', category: 'combat' },
  cruiser: { scale: 1.0, color: '#4477aa', category: 'combat' },
  battleship: { scale: 1.5, color: '#335588', category: 'combat' },
  battlecruiser: { scale: 1.3, color: '#446699', category: 'combat' },
  bomber: { scale: 1.2, color: '#884444', category: 'combat' },
  destroyer: { scale: 2.0, color: '#553366', category: 'combat' },
  reaper: { scale: 1.8, color: '#445566', category: 'combat' },
  deathstar: { scale: 5.0, color: '#ff3333', category: 'combat' },
} as const

export type ShipType = keyof typeof SHIP_MODELS

// Defense structures
export const DEFENSE_MODELS = {
  rocket_launcher: { scale: 0.3, color: '#666666' },
  light_laser: { scale: 0.4, color: '#cc4444' },
  heavy_laser: { scale: 0.6, color: '#ff6666' },
  gauss_cannon: { scale: 0.8, color: '#4488cc' },
  ion_cannon: { scale: 0.7, color: '#44ccff' },
  plasma_turret: { scale: 1.0, color: '#ff44ff' },
  small_shield_dome: { scale: 2.0, color: '#44ff88' },
  large_shield_dome: { scale: 3.5, color: '#22cc66' },
} as const

export type DefenseType = keyof typeof DEFENSE_MODELS

// Camera presets for different views
export const CAMERA_PRESETS = {
  // Default orbit view around planet
  orbit: {
    position: [0, 20, 40] as [number, number, number],
    fov: 45,
    near: 0.1,
    far: 1000,
  },
  // Strategic top-down view
  strategic: {
    position: [0, 80, 0] as [number, number, number],
    fov: 60,
    near: 0.1,
    far: 2000,
  },
  // Close-up planet view
  closeup: {
    position: [0, 5, 10] as [number, number, number],
    fov: 35,
    near: 0.1,
    far: 500,
  },
  // Battle overview
  battle: {
    position: [0, 30, 60] as [number, number, number],
    fov: 50,
    near: 0.1,
    far: 1500,
  },
  // Galaxy map view
  galaxy: {
    position: [0, 200, 0] as [number, number, number],
    fov: 75,
    near: 1,
    far: 5000,
  },
} as const

export type CameraPreset = keyof typeof CAMERA_PRESETS

// Atmosphere colors per planet type
export const ATMOSPHERE_COLORS: Record<PlanetType, string> = {
  desert: '#ffaa44',
  dry: '#cc8844',
  gas: '#ff8866',
  ice: '#88ccff',
  jungle: '#44cc88',
  normal: '#6699cc',
  water: '#4488ff',
}

// Star/Sun configurations (legacy - use @/lib/galaxy/constants for new star types)
export const STAR_TYPES = {
  yellow: { color: '#ffff44', intensity: 1.5, scale: 8 },
  red_giant: { color: '#ff4422', intensity: 1.2, scale: 12 },
  blue_giant: { color: '#4488ff', intensity: 2.0, scale: 10 },
  white_dwarf: { color: '#ffffff', intensity: 1.8, scale: 3 },
  red_dwarf: { color: '#ff6644', intensity: 0.8, scale: 4 },
} as const

export type StarType = keyof typeof STAR_TYPES

// Extended star types for procedural generation
export const PROCEDURAL_STAR_VISUALS = {
  yellow_dwarf: { color: '#ffdd44', intensity: 1.5, scale: 3.5, glowColor: '#ffee88' },
  red_dwarf: { color: '#ff6644', intensity: 0.8, scale: 2.5, glowColor: '#ff8866' },
  orange_dwarf: { color: '#ffaa44', intensity: 1.0, scale: 3.0, glowColor: '#ffcc66' },
  white_dwarf: { color: '#ffffff', intensity: 1.8, scale: 1.5, glowColor: '#ccccff' },
  red_giant: { color: '#ff4422', intensity: 1.2, scale: 8.0, glowColor: '#ff6644' },
  blue_giant: { color: '#4488ff', intensity: 2.5, scale: 6.0, glowColor: '#66aaff' },
  binary_yellow: { color: '#ffee44', intensity: 2.0, scale: 3.0, glowColor: '#ffff88' },
  binary_red: { color: '#ff5533', intensity: 1.2, scale: 2.5, glowColor: '#ff7755' },
  binary_mixed: { color: '#ffaa77', intensity: 1.5, scale: 3.0, glowColor: '#ffcc99' },
  neutron_star: { color: '#88aaff', intensity: 3.0, scale: 1.0, glowColor: '#aaccff' },
  black_hole: { color: '#220033', intensity: 0.0, scale: 3.0, glowColor: '#440066' },
  white_giant: { color: '#eeeeff', intensity: 2.0, scale: 5.0, glowColor: '#ffffff' },
} as const

export type ProceduralStarType = keyof typeof PROCEDURAL_STAR_VISUALS

// Animation speeds
export const ANIMATION_SPEEDS = {
  planet_rotation: 0.001,
  ship_orbit: 0.005,
  star_pulse: 0.002,
  atmosphere_flow: 0.0005,
} as const

// Render quality presets
export const QUALITY_PRESETS = {
  low: {
    shadowMapSize: 512,
    antialias: false,
    pixelRatio: 1,
    maxLights: 2,
  },
  medium: {
    shadowMapSize: 1024,
    antialias: true,
    pixelRatio: 1.5,
    maxLights: 4,
  },
  high: {
    shadowMapSize: 2048,
    antialias: true,
    pixelRatio: 2,
    maxLights: 8,
  },
  ultra: {
    shadowMapSize: 4096,
    antialias: true,
    pixelRatio: window?.devicePixelRatio || 2,
    maxLights: 16,
  },
} as const

export type QualityPreset = keyof typeof QUALITY_PRESETS
