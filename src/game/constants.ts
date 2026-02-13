/**
 * OGameX Game Constants
 * All formulas and constants extracted from the original OGameX
 */

// ============================================================================
// UNIVERSE CONSTANTS
// ============================================================================

export const UNIVERSE = {
  MIN_GALAXY: 1,
  MAX_GALAXY: 9,
  MIN_SYSTEM: 1,
  MAX_SYSTEM: 499,
  MIN_POSITION: 1,
  MAX_POSITION: 15,
  EXPEDITION_POSITION: 16,
} as const

// ============================================================================
// BUILDING DEFINITIONS
// ============================================================================

export interface BuildingDefinition {
  id: number
  name: string
  key: string
  baseCost: { metal: number; crystal: number; deuterium: number }
  priceFactor: number
  category: 'resources' | 'facilities' | 'moon'
}

export const BUILDINGS: Record<number, BuildingDefinition> = {
  1: {
    id: 1,
    name: 'Metal Mine',
    key: 'metal_mine',
    baseCost: { metal: 60, crystal: 15, deuterium: 0 },
    priceFactor: 1.5,
    category: 'resources',
  },
  2: {
    id: 2,
    name: 'Crystal Mine',
    key: 'crystal_mine',
    baseCost: { metal: 48, crystal: 24, deuterium: 0 },
    priceFactor: 1.6,
    category: 'resources',
  },
  3: {
    id: 3,
    name: 'Deuterium Synthesizer',
    key: 'deuterium_synthesizer',
    baseCost: { metal: 225, crystal: 75, deuterium: 0 },
    priceFactor: 1.5,
    category: 'resources',
  },
  4: {
    id: 4,
    name: 'Solar Plant',
    key: 'solar_plant',
    baseCost: { metal: 75, crystal: 30, deuterium: 0 },
    priceFactor: 1.5,
    category: 'resources',
  },
  12: {
    id: 12,
    name: 'Fusion Reactor',
    key: 'fusion_plant',
    baseCost: { metal: 900, crystal: 360, deuterium: 180 },
    priceFactor: 1.8,
    category: 'resources',
  },
  22: {
    id: 22,
    name: 'Metal Storage',
    key: 'metal_storage',
    baseCost: { metal: 1000, crystal: 0, deuterium: 0 },
    priceFactor: 2.0,
    category: 'resources',
  },
  23: {
    id: 23,
    name: 'Crystal Storage',
    key: 'crystal_storage',
    baseCost: { metal: 1000, crystal: 500, deuterium: 0 },
    priceFactor: 2.0,
    category: 'resources',
  },
  24: {
    id: 24,
    name: 'Deuterium Tank',
    key: 'deuterium_tank',
    baseCost: { metal: 1000, crystal: 1000, deuterium: 0 },
    priceFactor: 2.0,
    category: 'resources',
  },
  14: {
    id: 14,
    name: 'Robotics Factory',
    key: 'robot_factory',
    baseCost: { metal: 400, crystal: 120, deuterium: 200 },
    priceFactor: 2.0,
    category: 'facilities',
  },
  15: {
    id: 15,
    name: 'Nanite Factory',
    key: 'nanite_factory',
    baseCost: { metal: 1000000, crystal: 500000, deuterium: 100000 },
    priceFactor: 2.0,
    category: 'facilities',
  },
  21: {
    id: 21,
    name: 'Shipyard',
    key: 'shipyard',
    baseCost: { metal: 400, crystal: 200, deuterium: 100 },
    priceFactor: 2.0,
    category: 'facilities',
  },
  31: {
    id: 31,
    name: 'Research Lab',
    key: 'research_lab',
    baseCost: { metal: 200, crystal: 400, deuterium: 200 },
    priceFactor: 2.0,
    category: 'facilities',
  },
  33: {
    id: 33,
    name: 'Terraformer',
    key: 'terraformer',
    baseCost: { metal: 0, crystal: 50000, deuterium: 100000 },
    priceFactor: 2.0,
    category: 'facilities',
  },
  34: {
    id: 34,
    name: 'Alliance Depot',
    key: 'alliance_depot',
    baseCost: { metal: 20000, crystal: 40000, deuterium: 0 },
    priceFactor: 2.0,
    category: 'facilities',
  },
  44: {
    id: 44,
    name: 'Missile Silo',
    key: 'missile_silo',
    baseCost: { metal: 20000, crystal: 20000, deuterium: 1000 },
    priceFactor: 2.0,
    category: 'facilities',
  },
  36: {
    id: 36,
    name: 'Space Dock',
    key: 'space_dock',
    baseCost: { metal: 200, crystal: 0, deuterium: 50 },
    priceFactor: 2.0,
    category: 'facilities',
  },
  // Moon buildings
  41: {
    id: 41,
    name: 'Lunar Base',
    key: 'lunar_base',
    baseCost: { metal: 20000, crystal: 40000, deuterium: 20000 },
    priceFactor: 2.0,
    category: 'moon',
  },
  42: {
    id: 42,
    name: 'Sensor Phalanx',
    key: 'sensor_phalanx',
    baseCost: { metal: 20000, crystal: 40000, deuterium: 20000 },
    priceFactor: 2.0,
    category: 'moon',
  },
  43: {
    id: 43,
    name: 'Jump Gate',
    key: 'jump_gate',
    baseCost: { metal: 2000000, crystal: 4000000, deuterium: 2000000 },
    priceFactor: 2.0,
    category: 'moon',
  },
}

// ============================================================================
// SHIP DEFINITIONS
// ============================================================================

export interface ShipDefinition {
  id: number
  name: string
  key: string
  cost: { metal: number; crystal: number; deuterium: number }
  structuralIntegrity: number
  shieldPower: number
  weaponPower: number
  speed: number
  cargoCapacity: number
  fuelConsumption: number
  driveType: 'combustion' | 'impulse' | 'hyperspace'
  category: 'military' | 'civil'
}

export const SHIPS: Record<number, ShipDefinition> = {
  204: {
    id: 204,
    name: 'Light Fighter',
    key: 'light_fighter',
    cost: { metal: 3000, crystal: 1000, deuterium: 0 },
    structuralIntegrity: 4000,
    shieldPower: 10,
    weaponPower: 50,
    speed: 12500,
    cargoCapacity: 50,
    fuelConsumption: 20,
    driveType: 'combustion',
    category: 'military',
  },
  205: {
    id: 205,
    name: 'Heavy Fighter',
    key: 'heavy_fighter',
    cost: { metal: 6000, crystal: 4000, deuterium: 0 },
    structuralIntegrity: 10000,
    shieldPower: 25,
    weaponPower: 150,
    speed: 10000,
    cargoCapacity: 100,
    fuelConsumption: 75,
    driveType: 'impulse',
    category: 'military',
  },
  206: {
    id: 206,
    name: 'Cruiser',
    key: 'cruiser',
    cost: { metal: 20000, crystal: 7000, deuterium: 2000 },
    structuralIntegrity: 27000,
    shieldPower: 50,
    weaponPower: 400,
    speed: 15000,
    cargoCapacity: 800,
    fuelConsumption: 300,
    driveType: 'impulse',
    category: 'military',
  },
  207: {
    id: 207,
    name: 'Battleship',
    key: 'battleship',
    cost: { metal: 45000, crystal: 15000, deuterium: 0 },
    structuralIntegrity: 60000,
    shieldPower: 200,
    weaponPower: 1000,
    speed: 10000,
    cargoCapacity: 1500,
    fuelConsumption: 500,
    driveType: 'hyperspace',
    category: 'military',
  },
  215: {
    id: 215,
    name: 'Battlecruiser',
    key: 'battlecruiser',
    cost: { metal: 30000, crystal: 40000, deuterium: 15000 },
    structuralIntegrity: 70000,
    shieldPower: 400,
    weaponPower: 700,
    speed: 10000,
    cargoCapacity: 750,
    fuelConsumption: 250,
    driveType: 'hyperspace',
    category: 'military',
  },
  211: {
    id: 211,
    name: 'Bomber',
    key: 'bomber',
    cost: { metal: 50000, crystal: 25000, deuterium: 15000 },
    structuralIntegrity: 75000,
    shieldPower: 500,
    weaponPower: 1000,
    speed: 4000,
    cargoCapacity: 500,
    fuelConsumption: 700,
    driveType: 'hyperspace',
    category: 'military',
  },
  213: {
    id: 213,
    name: 'Destroyer',
    key: 'destroyer',
    cost: { metal: 60000, crystal: 50000, deuterium: 15000 },
    structuralIntegrity: 110000,
    shieldPower: 500,
    weaponPower: 2000,
    speed: 5000,
    cargoCapacity: 2000,
    fuelConsumption: 1000,
    driveType: 'hyperspace',
    category: 'military',
  },
  214: {
    id: 214,
    name: 'Deathstar',
    key: 'deathstar',
    cost: { metal: 5000000, crystal: 4000000, deuterium: 1000000 },
    structuralIntegrity: 9000000,
    shieldPower: 50000,
    weaponPower: 200000,
    speed: 100,
    cargoCapacity: 1000000,
    fuelConsumption: 1,
    driveType: 'hyperspace',
    category: 'military',
  },
  218: {
    id: 218,
    name: 'Reaper',
    key: 'reaper',
    cost: { metal: 85000, crystal: 55000, deuterium: 20000 },
    structuralIntegrity: 140000,
    shieldPower: 700,
    weaponPower: 2800,
    speed: 7000,
    cargoCapacity: 10000,
    fuelConsumption: 1100,
    driveType: 'hyperspace',
    category: 'military',
  },
  // Civil ships
  202: {
    id: 202,
    name: 'Small Cargo',
    key: 'small_cargo',
    cost: { metal: 2000, crystal: 2000, deuterium: 0 },
    structuralIntegrity: 4000,
    shieldPower: 10,
    weaponPower: 5,
    speed: 5000,
    cargoCapacity: 5000,
    fuelConsumption: 10,
    driveType: 'combustion',
    category: 'civil',
  },
  203: {
    id: 203,
    name: 'Large Cargo',
    key: 'large_cargo',
    cost: { metal: 6000, crystal: 6000, deuterium: 0 },
    structuralIntegrity: 12000,
    shieldPower: 25,
    weaponPower: 5,
    speed: 7500,
    cargoCapacity: 25000,
    fuelConsumption: 50,
    driveType: 'combustion',
    category: 'civil',
  },
  208: {
    id: 208,
    name: 'Colony Ship',
    key: 'colony_ship',
    cost: { metal: 10000, crystal: 20000, deuterium: 10000 },
    structuralIntegrity: 30000,
    shieldPower: 100,
    weaponPower: 50,
    speed: 2500,
    cargoCapacity: 7500,
    fuelConsumption: 1000,
    driveType: 'impulse',
    category: 'civil',
  },
  209: {
    id: 209,
    name: 'Recycler',
    key: 'recycler',
    cost: { metal: 10000, crystal: 6000, deuterium: 2000 },
    structuralIntegrity: 16000,
    shieldPower: 10,
    weaponPower: 1,
    speed: 2000,
    cargoCapacity: 20000,
    fuelConsumption: 300,
    driveType: 'combustion',
    category: 'civil',
  },
  210: {
    id: 210,
    name: 'Espionage Probe',
    key: 'espionage_probe',
    cost: { metal: 0, crystal: 1000, deuterium: 0 },
    structuralIntegrity: 1000,
    shieldPower: 0,
    weaponPower: 0,
    speed: 100000000,
    cargoCapacity: 0,
    fuelConsumption: 1,
    driveType: 'combustion',
    category: 'civil',
  },
  212: {
    id: 212,
    name: 'Solar Satellite',
    key: 'solar_satellite',
    cost: { metal: 0, crystal: 2000, deuterium: 500 },
    structuralIntegrity: 2000,
    shieldPower: 1,
    weaponPower: 0,
    speed: 0,
    cargoCapacity: 0,
    fuelConsumption: 0,
    driveType: 'combustion',
    category: 'civil',
  },
  219: {
    id: 219,
    name: 'Pathfinder',
    key: 'pathfinder',
    cost: { metal: 8000, crystal: 15000, deuterium: 8000 },
    structuralIntegrity: 23000,
    shieldPower: 100,
    weaponPower: 200,
    speed: 12000,
    cargoCapacity: 10000,
    fuelConsumption: 300,
    driveType: 'hyperspace',
    category: 'civil',
  },
}

// ============================================================================
// DEFENSE DEFINITIONS
// ============================================================================

export interface DefenseDefinition {
  id: number
  name: string
  key: string
  cost: { metal: number; crystal: number; deuterium: number }
  structuralIntegrity: number
  shieldPower: number
  weaponPower: number
}

export const DEFENSE: Record<number, DefenseDefinition> = {
  401: {
    id: 401,
    name: 'Rocket Launcher',
    key: 'rocket_launcher',
    cost: { metal: 2000, crystal: 0, deuterium: 0 },
    structuralIntegrity: 2000,
    shieldPower: 20,
    weaponPower: 80,
  },
  402: {
    id: 402,
    name: 'Light Laser',
    key: 'light_laser',
    cost: { metal: 1500, crystal: 500, deuterium: 0 },
    structuralIntegrity: 2000,
    shieldPower: 25,
    weaponPower: 100,
  },
  403: {
    id: 403,
    name: 'Heavy Laser',
    key: 'heavy_laser',
    cost: { metal: 6000, crystal: 2000, deuterium: 0 },
    structuralIntegrity: 8000,
    shieldPower: 100,
    weaponPower: 250,
  },
  404: {
    id: 404,
    name: 'Gauss Cannon',
    key: 'gauss_cannon',
    cost: { metal: 20000, crystal: 15000, deuterium: 2000 },
    structuralIntegrity: 35000,
    shieldPower: 200,
    weaponPower: 1100,
  },
  405: {
    id: 405,
    name: 'Ion Cannon',
    key: 'ion_cannon',
    cost: { metal: 2000, crystal: 6000, deuterium: 0 },
    structuralIntegrity: 8000,
    shieldPower: 500,
    weaponPower: 150,
  },
  406: {
    id: 406,
    name: 'Plasma Turret',
    key: 'plasma_turret',
    cost: { metal: 50000, crystal: 50000, deuterium: 30000 },
    structuralIntegrity: 100000,
    shieldPower: 300,
    weaponPower: 3000,
  },
  407: {
    id: 407,
    name: 'Small Shield Dome',
    key: 'small_shield_dome',
    cost: { metal: 10000, crystal: 10000, deuterium: 0 },
    structuralIntegrity: 20000,
    shieldPower: 2000,
    weaponPower: 1,
  },
  408: {
    id: 408,
    name: 'Large Shield Dome',
    key: 'large_shield_dome',
    cost: { metal: 50000, crystal: 50000, deuterium: 0 },
    structuralIntegrity: 100000,
    shieldPower: 10000,
    weaponPower: 1,
  },
  502: {
    id: 502,
    name: 'Anti-Ballistic Missile',
    key: 'anti_ballistic_missile',
    cost: { metal: 8000, crystal: 2000, deuterium: 0 },
    structuralIntegrity: 8000,
    shieldPower: 1,
    weaponPower: 1,
  },
  503: {
    id: 503,
    name: 'Interplanetary Missile',
    key: 'interplanetary_missile',
    cost: { metal: 12500, crystal: 2500, deuterium: 10000 },
    structuralIntegrity: 15000,
    shieldPower: 1,
    weaponPower: 12000,
  },
}

// ============================================================================
// RESEARCH DEFINITIONS
// ============================================================================

export interface ResearchDefinition {
  id: number
  name: string
  key: string
  baseCost: { metal: number; crystal: number; deuterium: number }
  priceFactor: number
}

export const RESEARCH: Record<number, ResearchDefinition> = {
  113: {
    id: 113,
    name: 'Energy Technology',
    key: 'energy_technology',
    baseCost: { metal: 0, crystal: 800, deuterium: 400 },
    priceFactor: 2.0,
  },
  120: {
    id: 120,
    name: 'Laser Technology',
    key: 'laser_technology',
    baseCost: { metal: 200, crystal: 100, deuterium: 0 },
    priceFactor: 2.0,
  },
  121: {
    id: 121,
    name: 'Ion Technology',
    key: 'ion_technology',
    baseCost: { metal: 1000, crystal: 300, deuterium: 100 },
    priceFactor: 2.0,
  },
  114: {
    id: 114,
    name: 'Hyperspace Technology',
    key: 'hyperspace_technology',
    baseCost: { metal: 0, crystal: 4000, deuterium: 2000 },
    priceFactor: 2.0,
  },
  122: {
    id: 122,
    name: 'Plasma Technology',
    key: 'plasma_technology',
    baseCost: { metal: 2000, crystal: 4000, deuterium: 1000 },
    priceFactor: 2.0,
  },
  115: {
    id: 115,
    name: 'Combustion Drive',
    key: 'combustion_drive',
    baseCost: { metal: 400, crystal: 0, deuterium: 600 },
    priceFactor: 2.0,
  },
  117: {
    id: 117,
    name: 'Impulse Drive',
    key: 'impulse_drive',
    baseCost: { metal: 2000, crystal: 4000, deuterium: 600 },
    priceFactor: 2.0,
  },
  118: {
    id: 118,
    name: 'Hyperspace Drive',
    key: 'hyperspace_drive',
    baseCost: { metal: 10000, crystal: 20000, deuterium: 6000 },
    priceFactor: 2.0,
  },
  106: {
    id: 106,
    name: 'Espionage Technology',
    key: 'espionage_technology',
    baseCost: { metal: 200, crystal: 1000, deuterium: 200 },
    priceFactor: 2.0,
  },
  108: {
    id: 108,
    name: 'Computer Technology',
    key: 'computer_technology',
    baseCost: { metal: 0, crystal: 400, deuterium: 600 },
    priceFactor: 2.0,
  },
  124: {
    id: 124,
    name: 'Astrophysics',
    key: 'astrophysics',
    baseCost: { metal: 4000, crystal: 8000, deuterium: 4000 },
    priceFactor: 1.75,
  },
  123: {
    id: 123,
    name: 'Intergalactic Research Network',
    key: 'intergalactic_research_network',
    baseCost: { metal: 240000, crystal: 400000, deuterium: 160000 },
    priceFactor: 2.0,
  },
  199: {
    id: 199,
    name: 'Graviton Technology',
    key: 'graviton_technology',
    baseCost: { metal: 0, crystal: 0, deuterium: 0 }, // Special: requires 300000 energy
    priceFactor: 3.0,
  },
  109: {
    id: 109,
    name: 'Weapons Technology',
    key: 'weapons_technology',
    baseCost: { metal: 800, crystal: 200, deuterium: 0 },
    priceFactor: 2.0,
  },
  110: {
    id: 110,
    name: 'Shielding Technology',
    key: 'shielding_technology',
    baseCost: { metal: 200, crystal: 600, deuterium: 0 },
    priceFactor: 2.0,
  },
  111: {
    id: 111,
    name: 'Armor Technology',
    key: 'armor_technology',
    baseCost: { metal: 1000, crystal: 0, deuterium: 0 },
    priceFactor: 2.0,
  },
}

// ============================================================================
// MISSION TYPES
// ============================================================================

export const MISSION_TYPES = {
  ATTACK: 1,
  ACS_ATTACK: 2,
  TRANSPORT: 3,
  DEPLOYMENT: 4,
  ACS_DEFEND: 5,
  ESPIONAGE: 6,
  COLONIZATION: 7,
  RECYCLE: 8,
  MOON_DESTRUCTION: 9,
  EXPEDITION: 15,
} as const

export type MissionTypeId = typeof MISSION_TYPES[keyof typeof MISSION_TYPES]
