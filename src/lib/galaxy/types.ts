/**
 * Procedural Galaxy System Types
 * Defines all types for the universe, galaxies, solar systems, and celestial bodies
 */

// ============================================================================
// ENUMS
// ============================================================================

export type GalaxyType = 'spiral' | 'elliptical' | 'irregular' | 'barred_spiral'

export type StarTypeId =
  | 'yellow_dwarf'
  | 'red_dwarf'
  | 'orange_dwarf'
  | 'white_dwarf'
  | 'red_giant'
  | 'blue_giant'
  | 'binary_yellow'
  | 'binary_red'
  | 'binary_mixed'
  | 'neutron_star'
  | 'black_hole'
  | 'white_giant'

export type CelestialBodyType =
  | 'rocky_planet'
  | 'gas_giant'
  | 'ice_giant'
  | 'dwarf_planet'
  | 'moon'
  | 'asteroid_field'

export type PlanetVisualType =
  | 'desert'
  | 'dry'
  | 'gas'
  | 'ice'
  | 'jungle'
  | 'normal'
  | 'water'

// ============================================================================
// UNIVERSE CONFIG
// ============================================================================

export interface UniverseConfig {
  id: string
  masterSeed: number
  name: string
  galaxyCount: number
  systemsPerGalaxyMin: number
  systemsPerGalaxyMax: number
  universeSpeed: number
  fleetSpeed: number
  resourceMultiplier: number
  createdAt: string
  updatedAt: string
}

// ============================================================================
// STAR TYPES
// ============================================================================

export interface StarType {
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

// ============================================================================
// GALAXY
// ============================================================================

export interface Galaxy {
  id: string
  galaxyIndex: number
  name: string
  seed: number
  galaxyType: GalaxyType
  systemCount: number
  centerX: number
  centerY: number
  centerZ: number
  rotationAngle: number
  createdAt: string
}

export interface GalaxySummary {
  id: string
  galaxyIndex: number
  name: string
  galaxyType: GalaxyType
  systemCount: number
  colonizedSystems?: number
  totalPlayers?: number
}

// ============================================================================
// SOLAR SYSTEM
// ============================================================================

export interface SolarSystem {
  id: string
  galaxyId: string
  systemIndex: number
  seed: number
  starType: StarTypeId
  secondaryStarType?: StarTypeId
  planetCount: number
  habitableZoneInner: number
  habitableZoneOuter: number
  positionX: number
  positionY: number
  positionZ: number
  isGenerated: boolean
  generatedAt?: string
  createdAt: string
}

export interface SolarSystemWithStar extends SolarSystem {
  star: StarType
  secondaryStar?: StarType
}

export interface SolarSystemSummary {
  id: string
  systemIndex: number
  starType: StarTypeId
  starColor: string
  planetCount: number
  colonizedPlanets: number
  hasExoticStar: boolean
}

// ============================================================================
// CELESTIAL BODY
// ============================================================================

export interface CelestialBody {
  id: string
  solarSystemId: string
  parentBodyId?: string
  bodyType: CelestialBodyType
  orbitalPosition: number
  name: string
  diameter: number
  fieldsMax: number
  moonCapacity: number
  temperatureMin: number
  temperatureMax: number
  atmosphereType: string
  seed: number
  planetVisualType: PlanetVisualType
  planetVisualVariant: number
  hasRings: boolean
  ringColor?: string
  metalMultiplier: number
  crystalMultiplier: number
  deuteriumMultiplier: number
  isColonizable: boolean
  colonizedAt?: string
  createdAt: string
}

export interface CelestialBodyWithMoons extends CelestialBody {
  moons: CelestialBody[]
}

export interface CelestialBodySummary {
  id: string
  orbitalPosition: number
  name: string
  bodyType: CelestialBodyType
  diameter: number
  fieldsMax: number
  isColonizable: boolean
  isColonized: boolean
  ownerId?: string
  ownerName?: string
  moonCount: number
}

// ============================================================================
// STAR EFFECTS
// ============================================================================

export interface StarEffects {
  id: string
  solarSystemId: string
  metalMultiplier: number
  crystalMultiplier: number
  deuteriumMultiplier: number
  energyMultiplier: number
  expeditionBonus: number
  fleetDamageChance: number
  fleetLossChance: number
  isColonizable: boolean
  hasRadiationHazard: boolean
  hasGravitationalAnomaly: boolean
  createdAt: string
}

// ============================================================================
// PLAYER COLONY
// ============================================================================

export interface PlayerColony {
  id: string
  userId: string
  celestialBodyId: string
  name: string
  isHomeworld: boolean

  // Resources
  metal: number
  metalPerHour: number
  metalMax: number
  crystal: number
  crystalPerHour: number
  crystalMax: number
  deuterium: number
  deuteriumPerHour: number
  deuteriumMax: number
  energyUsed: number
  energyMax: number

  // Building levels
  fieldsUsed: number
  metalMine: number
  crystalMine: number
  deuteriumSynthesizer: number
  solarPlant: number
  fusionPlant: number
  metalStorage: number
  crystalStorage: number
  deuteriumTank: number
  robotFactory: number
  naniteFactory: number
  shipyard: number
  researchLab: number
  terraformer: number
  allianceDepot: number
  missileSilo: number
  spaceDock: number
  lunarBase: number
  sensorPhalanx: number
  jumpGate: number
  jumpGateCooldown?: string

  // Ships
  lightFighter: number
  heavyFighter: number
  cruiser: number
  battleship: number
  battlecruiser: number
  bomber: number
  destroyer: number
  deathstar: number
  smallCargo: number
  largeCargo: number
  colonyShip: number
  recycler: number
  espionageProbe: number
  solarSatellite: number
  crawler: number
  reaper: number
  pathfinder: number

  // Defense
  rocketLauncher: number
  lightLaser: number
  heavyLaser: number
  gaussCannon: number
  ionCannon: number
  plasmaTurret: number
  smallShieldDome: number
  largeShieldDome: number
  antiBallisticMissile: number
  interplanetaryMissile: number

  // Timestamps
  lastResourceUpdate: string
  destroyed: boolean
  createdAt: string
  updatedAt: string
}

export interface ColonyWithBody extends PlayerColony {
  celestialBody: CelestialBody
  solarSystem: SolarSystem
  galaxy: Galaxy
  starEffects: StarEffects
}

// ============================================================================
// GALAXY VIEW (for displaying in UI)
// ============================================================================

export interface GalaxyViewEntry {
  galaxy: number
  system: number
  position: number
  celestialBodyId: string
  colonyId?: string
  planetName: string
  planetType: string
  userId?: string
  username?: string
  allianceTag?: string
  fieldsMax: number
  fieldsUsed: number
  diameter: number
  temperatureMin: number
  temperatureMax: number
  starType: StarTypeId
  secondaryStarType?: StarTypeId
  starColor: string
  isColonizable: boolean
  hasMoon: boolean
  debrisMetal: number
  debrisCrystal: number
}

// ============================================================================
// COORDINATES
// ============================================================================

export interface GalacticCoordinates {
  galaxy: number
  system: number
  position: number
}

export interface FullCoordinates extends GalacticCoordinates {
  galaxyId: string
  solarSystemId: string
  celestialBodyId: string
}

// ============================================================================
// GENERATION PARAMETERS
// ============================================================================

export interface PlanetGenerationParams {
  position: number
  systemSeed: number
  starType: StarTypeId
  habitableZoneInner: number
  habitableZoneOuter: number
}

export interface MoonGenerationParams {
  parentDiameter: number
  parentSeed: number
  moonIndex: number
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface UniverseResponse {
  config: UniverseConfig
  galaxyCount: number
  totalSystems: number
  totalColonies: number
}

export interface GalaxyResponse {
  galaxy: Galaxy
  systems: SolarSystemSummary[]
  statistics: {
    totalPlanets: number
    colonizedPlanets: number
    uniquePlayers: number
  }
}

export interface SolarSystemResponse {
  system: SolarSystemWithStar
  bodies: CelestialBodyWithMoons[]
  effects: StarEffects
  colonies: Array<{
    bodyId: string
    colonyId: string
    userId: string
    username: string
    colonyName: string
    allianceTag?: string
  }>
}
