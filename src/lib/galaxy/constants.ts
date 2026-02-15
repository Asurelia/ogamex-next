/**
 * Procedural Galaxy System Constants
 * Configuration values for universe generation
 */

import type { StarTypeId, PlanetVisualType } from './types'

// ============================================================================
// UNIVERSE LIMITS
// ============================================================================

export const UNIVERSE_LIMITS = {
  /** Minimum number of galaxies in the universe */
  MIN_GALAXIES: 80,
  /** Maximum number of galaxies in the universe */
  MAX_GALAXIES: 100,
  /** Minimum solar systems per galaxy */
  MIN_SYSTEMS_PER_GALAXY: 100,
  /** Maximum solar systems per galaxy */
  MAX_SYSTEMS_PER_GALAXY: 200,
  /** Minimum planets per solar system */
  MIN_PLANETS_PER_SYSTEM: 1,
  /** Maximum planets per solar system */
  MAX_PLANETS_PER_SYSTEM: 9,
  /** Maximum orbital positions in a system */
  MAX_ORBITAL_POSITIONS: 15,
} as const

// ============================================================================
// CELESTIAL BODY LIMITS
// ============================================================================

export const BODY_LIMITS = {
  /** Minimum fields for a planet */
  MIN_PLANET_FIELDS: 8,
  /** Maximum fields for a planet */
  MAX_PLANET_FIELDS: 20,
  /** Minimum fields for a moon */
  MIN_MOON_FIELDS: 3,
  /** Maximum fields for a moon */
  MAX_MOON_FIELDS: 10,
  /** Maximum moons per planet */
  MAX_MOONS_PER_PLANET: 8,
} as const

// ============================================================================
// MOON CAPACITY BY DIAMETER
// ============================================================================

export const MOON_CAPACITY_THRESHOLDS = [
  { maxDiameter: 5000, capacity: 0 },
  { maxDiameter: 8000, capacity: 1 },
  { maxDiameter: 12000, capacity: 2 },
  { maxDiameter: 20000, capacity: 3 },
  { maxDiameter: 50000, capacity: 5 },
  { maxDiameter: 100000, capacity: 6 },
  { maxDiameter: Infinity, capacity: 8 },
] as const

// ============================================================================
// ORBITAL ZONE DEFINITIONS
// ============================================================================

export const ORBITAL_ZONES = {
  /** Inner zone: positions 1-3 (hot, rocky) */
  INNER: { start: 1, end: 3 },
  /** Habitable zone: positions 4-7 (temperate) */
  HABITABLE: { start: 4, end: 7 },
  /** Outer zone: positions 8-12 (cold, gas/ice giants) */
  OUTER: { start: 8, end: 12 },
  /** Far zone: positions 13-15 (dwarf planets) */
  FAR: { start: 13, end: 15 },
} as const

// ============================================================================
// STAR TYPE CONFIGURATIONS
// ============================================================================

export interface StarTypeConfig {
  id: StarTypeId
  name: string
  probability: number
  color: string
  temperatureKelvin: number
  luminosity: number
  isBinary: boolean
  isExotic: boolean
  colonizable: boolean
  metalMultiplier: number
  crystalMultiplier: number
  deuteriumMultiplier: number
  energyMultiplier: number
  expeditionBonus: number
  fleetDamageChance: number
  fleetLossChance: number
  description: string
}

export const STAR_TYPES: Record<StarTypeId, StarTypeConfig> = {
  yellow_dwarf: {
    id: 'yellow_dwarf',
    name: 'Yellow Dwarf (G-type)',
    probability: 0.25,
    color: '#ffdd44',
    temperatureKelvin: 5800,
    luminosity: 1.0,
    isBinary: false,
    isExotic: false,
    colonizable: true,
    metalMultiplier: 1.0,
    crystalMultiplier: 1.0,
    deuteriumMultiplier: 1.0,
    energyMultiplier: 1.0,
    expeditionBonus: 1.0,
    fleetDamageChance: 0.0,
    fleetLossChance: 0.0,
    description: 'A stable main-sequence star similar to our Sun',
  },
  red_dwarf: {
    id: 'red_dwarf',
    name: 'Red Dwarf (M-type)',
    probability: 0.25,
    color: '#ff6644',
    temperatureKelvin: 3500,
    luminosity: 0.4,
    isBinary: false,
    isExotic: false,
    colonizable: true,
    metalMultiplier: 0.9,
    crystalMultiplier: 0.9,
    deuteriumMultiplier: 1.1,
    energyMultiplier: 0.9,
    expeditionBonus: 1.0,
    fleetDamageChance: 0.0,
    fleetLossChance: 0.0,
    description: 'The most common star type with reduced energy output',
  },
  orange_dwarf: {
    id: 'orange_dwarf',
    name: 'Orange Dwarf (K-type)',
    probability: 0.10,
    color: '#ffaa44',
    temperatureKelvin: 4800,
    luminosity: 0.6,
    isBinary: false,
    isExotic: false,
    colonizable: true,
    metalMultiplier: 1.0,
    crystalMultiplier: 1.0,
    deuteriumMultiplier: 1.0,
    energyMultiplier: 0.95,
    expeditionBonus: 1.0,
    fleetDamageChance: 0.0,
    fleetLossChance: 0.0,
    description: 'A stable star slightly cooler than the Sun',
  },
  white_dwarf: {
    id: 'white_dwarf',
    name: 'White Dwarf',
    probability: 0.05,
    color: '#ffffff',
    temperatureKelvin: 15000,
    luminosity: 0.01,
    isBinary: false,
    isExotic: false,
    colonizable: true,
    metalMultiplier: 0.8,
    crystalMultiplier: 1.2,
    deuteriumMultiplier: 0.9,
    energyMultiplier: 1.1,
    expeditionBonus: 1.2,
    fleetDamageChance: 0.01,
    fleetLossChance: 0.0,
    description: 'A stellar remnant with unusual radiation patterns',
  },
  red_giant: {
    id: 'red_giant',
    name: 'Red Giant',
    probability: 0.03,
    color: '#ff4422',
    temperatureKelvin: 4000,
    luminosity: 100.0,
    isBinary: false,
    isExotic: false,
    colonizable: true,
    metalMultiplier: 1.3,
    crystalMultiplier: 0.9,
    deuteriumMultiplier: 0.8,
    energyMultiplier: 0.8,
    expeditionBonus: 1.1,
    fleetDamageChance: 0.02,
    fleetLossChance: 0.0,
    description: 'An evolved star with expanded outer layers',
  },
  blue_giant: {
    id: 'blue_giant',
    name: 'Blue Giant (O/B-type)',
    probability: 0.02,
    color: '#4488ff',
    temperatureKelvin: 25000,
    luminosity: 10000.0,
    isBinary: false,
    isExotic: false,
    colonizable: true,
    metalMultiplier: 0.9,
    crystalMultiplier: 0.9,
    deuteriumMultiplier: 1.3,
    energyMultiplier: 1.5,
    expeditionBonus: 1.3,
    fleetDamageChance: 0.05,
    fleetLossChance: 0.0,
    description: 'A massive hot star with intense radiation',
  },
  binary_yellow: {
    id: 'binary_yellow',
    name: 'Binary Yellow',
    probability: 0.08,
    color: '#ffee44',
    temperatureKelvin: 5800,
    luminosity: 2.0,
    isBinary: true,
    isExotic: false,
    colonizable: true,
    metalMultiplier: 1.0,
    crystalMultiplier: 1.0,
    deuteriumMultiplier: 1.0,
    energyMultiplier: 1.15,
    expeditionBonus: 1.1,
    fleetDamageChance: 0.01,
    fleetLossChance: 0.0,
    description: 'Two yellow stars in gravitational dance',
  },
  binary_red: {
    id: 'binary_red',
    name: 'Binary Red',
    probability: 0.07,
    color: '#ff5533',
    temperatureKelvin: 3500,
    luminosity: 0.8,
    isBinary: true,
    isExotic: false,
    colonizable: true,
    metalMultiplier: 0.95,
    crystalMultiplier: 0.95,
    deuteriumMultiplier: 1.05,
    energyMultiplier: 0.95,
    expeditionBonus: 1.05,
    fleetDamageChance: 0.01,
    fleetLossChance: 0.0,
    description: 'Two red dwarfs orbiting each other',
  },
  binary_mixed: {
    id: 'binary_mixed',
    name: 'Binary Mixed',
    probability: 0.05,
    color: '#ffaa77',
    temperatureKelvin: 4500,
    luminosity: 1.5,
    isBinary: true,
    isExotic: false,
    colonizable: true,
    metalMultiplier: 1.0,
    crystalMultiplier: 1.1,
    deuteriumMultiplier: 1.1,
    energyMultiplier: 1.05,
    expeditionBonus: 1.15,
    fleetDamageChance: 0.02,
    fleetLossChance: 0.0,
    description: 'A pair of different star types',
  },
  neutron_star: {
    id: 'neutron_star',
    name: 'Neutron Star',
    probability: 0.05,
    color: '#88aaff',
    temperatureKelvin: 1000000,
    luminosity: 0.001,
    isBinary: false,
    isExotic: true,
    colonizable: true,
    metalMultiplier: 0.7,
    crystalMultiplier: 0.8,
    deuteriumMultiplier: 2.0,
    energyMultiplier: 0.5,
    expeditionBonus: 1.5,
    fleetDamageChance: 0.05,
    fleetLossChance: 0.01,
    description: 'An ultra-dense stellar remnant with extreme conditions',
  },
  black_hole: {
    id: 'black_hole',
    name: 'Black Hole',
    probability: 0.03,
    color: '#220033',
    temperatureKelvin: 0,
    luminosity: 0.0,
    isBinary: false,
    isExotic: true,
    colonizable: false,
    metalMultiplier: 0.0,
    crystalMultiplier: 0.0,
    deuteriumMultiplier: 0.0,
    energyMultiplier: 0.0,
    expeditionBonus: 3.0,
    fleetDamageChance: 0.10,
    fleetLossChance: 0.10,
    description: 'A gravitational singularity - extremely dangerous',
  },
  white_giant: {
    id: 'white_giant',
    name: 'White Giant',
    probability: 0.02,
    color: '#eeeeff',
    temperatureKelvin: 10000,
    luminosity: 1000.0,
    isBinary: false,
    isExotic: false,
    colonizable: true,
    metalMultiplier: 0.9,
    crystalMultiplier: 1.4,
    deuteriumMultiplier: 0.9,
    energyMultiplier: 1.2,
    expeditionBonus: 1.2,
    fleetDamageChance: 0.02,
    fleetLossChance: 0.0,
    description: 'A luminous evolved star rich in heavy elements',
  },
}

// ============================================================================
// PLANET VISUAL TYPE MAPPING
// ============================================================================

export const PLANET_VISUAL_TYPES: PlanetVisualType[] = [
  'desert',
  'dry',
  'gas',
  'ice',
  'jungle',
  'normal',
  'water',
]

// ============================================================================
// TEMPERATURE RANGES BY POSITION
// ============================================================================

export const TEMPERATURE_RANGES = {
  /** Base temperature at position 1 */
  BASE_TEMP: 200,
  /** Temperature decrease per position */
  TEMP_DECREASE_PER_POSITION: 25,
  /** Temperature variation range */
  TEMP_VARIATION: 40,
} as const

// ============================================================================
// DIAMETER RANGES BY BODY TYPE
// ============================================================================

export const DIAMETER_RANGES = {
  rocky_inner: { min: 4000, max: 12000 },
  rocky_habitable: { min: 8000, max: 20000 },
  gas_giant: { min: 50000, max: 150000 },
  ice_giant: { min: 20000, max: 60000 },
  dwarf_planet: { min: 1000, max: 5000 },
  moon: { min: 500, max: 3500 },
} as const

// ============================================================================
// RESOURCE MULTIPLIERS BY POSITION
// ============================================================================

export const POSITION_MULTIPLIERS = {
  inner: {
    metal: 1.2,
    crystal: 0.9,
    deuterium: 0.5,
  },
  habitable: {
    metal: 1.0,
    crystal: 1.0,
    deuterium: 1.0,
  },
  outer: {
    metal: 0.8,
    crystal: 1.0,
    deuterium: 1.5,
  },
  far: {
    metal: 0.6,
    crystal: 0.8,
    deuterium: 1.8,
  },
} as const

// ============================================================================
// GALAXY TYPE PROBABILITIES
// ============================================================================

export const GALAXY_TYPE_PROBABILITIES = {
  spiral: 0.50,
  barred_spiral: 0.25,
  elliptical: 0.15,
  irregular: 0.10,
} as const

// ============================================================================
// GALAXY NAMES POOL
// ============================================================================

export const GALAXY_NAMES = [
  'Andromeda', 'Pegasus', 'Orion', 'Centaurus', 'Draco',
  'Phoenix', 'Sculptor', 'Fornax', 'Cetus', 'Eridanus',
  'Hydra', 'Virgo', 'Corvus', 'Crater', 'Vela',
  'Carina', 'Puppis', 'Pyxis', 'Antlia', 'Columba',
  'Caelum', 'Horologium', 'Reticulum', 'Pictor', 'Dorado',
  'Volans', 'Mensa', 'Chamaeleon', 'Musca', 'Crux',
  'Circinus', 'Norma', 'Lupus', 'Ara', 'Corona',
  'Serpens', 'Ophiuchus', 'Scutum', 'Sagittarius', 'Capricornus',
  'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini',
  'Cancer', 'Leo', 'Libra', 'Scorpius', 'Aquila',
  'Cygnus', 'Lyra', 'Delphinus', 'Equuleus', 'Sagitta',
  'Vulpecula', 'Lacerta', 'Cassiopeia', 'Cepheus', 'Perseus',
  'Auriga', 'Lynx', 'Ursa Minor', 'Ursa Major', 'Canes',
  'Bootes', 'Hercules', 'Triangulum', 'Canis Major', 'Canis Minor',
  'Monoceros', 'Lepus', 'Grus', 'Tucana', 'Pavo',
  'Indus', 'Microscopium', 'Telescopium', 'Octans', 'Apus',
  'Aether', 'Nebula Prime', 'Void Walker', 'Star Forge', 'Dark Matter',
  'Quantum', 'Singularity', 'Event Horizon', 'Cosmic Web', 'Stellar',
]
