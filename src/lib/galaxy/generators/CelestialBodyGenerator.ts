/**
 * Celestial Body Generator
 * Generates planets, moons, and other celestial bodies
 */

import { SeededRandom, bodySeed, moonSeed } from '../prng'
import {
  BODY_LIMITS,
  ORBITAL_ZONES,
  MOON_CAPACITY_THRESHOLDS,
  DIAMETER_RANGES,
  POSITION_MULTIPLIERS,
  PLANET_VISUAL_TYPES,
  TEMPERATURE_RANGES,
  STAR_TYPES,
} from '../constants'
import type {
  CelestialBody,
  CelestialBodyType,
  PlanetVisualType,
  StarTypeId,
} from '../types'

export interface CelestialBodyGenerationResult {
  body: Omit<CelestialBody, 'id' | 'createdAt' | 'colonizedAt'>
  moons: Omit<CelestialBody, 'id' | 'createdAt' | 'colonizedAt'>[]
}

/**
 * Determine orbital zone for a position
 */
function getOrbitalZone(position: number): 'inner' | 'habitable' | 'outer' | 'far' {
  if (position <= ORBITAL_ZONES.INNER.end) return 'inner'
  if (position <= ORBITAL_ZONES.HABITABLE.end) return 'habitable'
  if (position <= ORBITAL_ZONES.OUTER.end) return 'outer'
  return 'far'
}

/**
 * Determine body type based on position
 */
function determineBodyType(
  rng: SeededRandom,
  position: number,
  starType: StarTypeId
): CelestialBodyType {
  const zone = getOrbitalZone(position)

  // Black hole systems: mostly debris and dwarf planets
  if (starType === 'black_hole') {
    if (position <= 3) return 'asteroid_field'
    return rng.nextBool(0.7) ? 'dwarf_planet' : 'asteroid_field'
  }

  switch (zone) {
    case 'inner':
      // Inner zone: rocky planets
      return 'rocky_planet'

    case 'habitable':
      // Habitable zone: rocky planets
      return 'rocky_planet'

    case 'outer':
      // Outer zone: gas or ice giants
      if (rng.nextBool(0.6)) {
        return 'gas_giant'
      }
      return 'ice_giant'

    case 'far':
      // Far zone: dwarf planets or ice giants
      if (rng.nextBool(0.7)) {
        return 'dwarf_planet'
      }
      return 'ice_giant'

    default:
      return 'rocky_planet'
  }
}

/**
 * Calculate diameter based on body type and position
 */
function calculateDiameter(
  rng: SeededRandom,
  bodyType: CelestialBodyType,
  position: number
): number {
  switch (bodyType) {
    case 'rocky_planet':
      if (position <= 3) {
        return rng.nextInt(DIAMETER_RANGES.rocky_inner.min, DIAMETER_RANGES.rocky_inner.max)
      }
      return rng.nextInt(DIAMETER_RANGES.rocky_habitable.min, DIAMETER_RANGES.rocky_habitable.max)

    case 'gas_giant':
      return rng.nextInt(DIAMETER_RANGES.gas_giant.min, DIAMETER_RANGES.gas_giant.max)

    case 'ice_giant':
      return rng.nextInt(DIAMETER_RANGES.ice_giant.min, DIAMETER_RANGES.ice_giant.max)

    case 'dwarf_planet':
      return rng.nextInt(DIAMETER_RANGES.dwarf_planet.min, DIAMETER_RANGES.dwarf_planet.max)

    case 'asteroid_field':
      return 0 // Not applicable

    case 'moon':
      return rng.nextInt(DIAMETER_RANGES.moon.min, DIAMETER_RANGES.moon.max)

    default:
      return 10000
  }
}

/**
 * Calculate max fields based on body type and diameter
 */
function calculateFields(
  bodyType: CelestialBodyType,
  diameter: number,
  rng: SeededRandom
): number {
  if (bodyType === 'gas_giant' || bodyType === 'asteroid_field') {
    return 0 // Not colonizable
  }

  if (bodyType === 'moon') {
    // Moon fields: 3-10 based on diameter
    const base = Math.floor(diameter / 1000) + 3
    return Math.min(
      BODY_LIMITS.MAX_MOON_FIELDS,
      Math.max(BODY_LIMITS.MIN_MOON_FIELDS, base + rng.nextInt(0, 2))
    )
  }

  // Planet fields based on diameter
  // ~8000km = 8 fields, ~20000km = 20 fields
  const base = Math.floor(diameter / 1000)
  const variation = rng.nextInt(-2, 2)

  return Math.min(
    BODY_LIMITS.MAX_PLANET_FIELDS,
    Math.max(BODY_LIMITS.MIN_PLANET_FIELDS, base + variation)
  )
}

/**
 * Calculate moon capacity based on diameter
 */
function calculateMoonCapacity(bodyType: CelestialBodyType, diameter: number): number {
  if (bodyType === 'moon' || bodyType === 'asteroid_field') {
    return 0
  }

  for (const threshold of MOON_CAPACITY_THRESHOLDS) {
    if (diameter < threshold.maxDiameter) {
      return threshold.capacity
    }
  }

  return BODY_LIMITS.MAX_MOONS_PER_PLANET
}

/**
 * Calculate temperature based on position
 */
function calculateTemperature(
  rng: SeededRandom,
  position: number,
  starType: StarTypeId
): { min: number; max: number } {
  const star = STAR_TYPES[starType]

  // Base temperature decreases with position
  let baseTemp =
    TEMPERATURE_RANGES.BASE_TEMP -
    position * TEMPERATURE_RANGES.TEMP_DECREASE_PER_POSITION

  // Adjust for star luminosity
  if (star.luminosity > 10) {
    baseTemp += 50 // Hotter around bright stars
  } else if (star.luminosity < 0.5) {
    baseTemp -= 30 // Cooler around dim stars
  }

  // Black hole: extreme cold
  if (starType === 'black_hole') {
    baseTemp = -200
  }

  const variation = rng.nextInt(10, TEMPERATURE_RANGES.TEMP_VARIATION)
  const min = baseTemp - variation
  const max = baseTemp + Math.floor(variation / 2)

  return { min, max }
}

/**
 * Determine visual type based on body type and temperature
 */
function determineVisualType(
  rng: SeededRandom,
  bodyType: CelestialBodyType,
  tempMax: number
): PlanetVisualType {
  if (bodyType === 'gas_giant') {
    return 'gas'
  }

  if (bodyType === 'ice_giant' || tempMax < -100) {
    return 'ice'
  }

  if (tempMax > 100) {
    return rng.nextBool() ? 'desert' : 'dry'
  }

  if (tempMax < 0) {
    return rng.nextBool(0.7) ? 'ice' : 'normal'
  }

  // Temperate: variety of types
  const tempTypes: PlanetVisualType[] = ['jungle', 'normal', 'water', 'dry']
  return rng.pick(tempTypes)
}

/**
 * Calculate resource multipliers based on position
 */
function calculateResourceMultipliers(position: number): {
  metal: number
  crystal: number
  deuterium: number
} {
  const zone = getOrbitalZone(position)
  return POSITION_MULTIPLIERS[zone]
}

/**
 * Generate a moon for a planet
 */
function generateMoon(
  parentSeed: number,
  parentDiameter: number,
  parentPosition: number,
  moonIndex: number,
  solarSystemId: string,
  starType: StarTypeId
): Omit<CelestialBody, 'id' | 'createdAt' | 'colonizedAt'> {
  const seed = moonSeed(parentSeed, moonIndex)
  const rng = new SeededRandom(seed)

  // Moon diameter: smaller than parent
  const maxMoonDiameter = Math.min(3500, Math.floor(parentDiameter / 5))
  const diameter = rng.nextInt(DIAMETER_RANGES.moon.min, maxMoonDiameter)

  const fields = calculateFields('moon', diameter, rng)
  const temp = calculateTemperature(rng, parentPosition, starType)
  const visualType = determineVisualType(rng, 'moon', temp.max)

  return {
    solarSystemId,
    parentBodyId: '', // Will be set when parent is created
    bodyType: 'moon',
    orbitalPosition: moonIndex,
    name: `Moon ${moonIndex}`,
    diameter,
    fieldsMax: fields,
    moonCapacity: 0,
    temperatureMin: temp.min - 10, // Moons are slightly colder
    temperatureMax: temp.max - 5,
    atmosphereType: 'none',
    seed,
    planetVisualType: visualType,
    planetVisualVariant: rng.nextInt(1, 10),
    hasRings: false,
    ringColor: undefined,
    metalMultiplier: 0.8, // Moons have reduced resources
    crystalMultiplier: 0.8,
    deuteriumMultiplier: 0.9,
    isColonizable: STAR_TYPES[starType].colonizable,
  }
}

/**
 * Generate a single celestial body with its moons
 */
export function generateCelestialBody(
  systemSeed: number,
  orbitalPosition: number,
  solarSystemId: string,
  starType: StarTypeId,
  habitableZoneInner: number,
  habitableZoneOuter: number
): CelestialBodyGenerationResult {
  const seed = bodySeed(systemSeed, orbitalPosition)
  const rng = new SeededRandom(seed)

  // Determine body type
  const bodyType = determineBodyType(rng, orbitalPosition, starType)

  // Calculate physical properties
  const diameter = calculateDiameter(rng, bodyType, orbitalPosition)
  const fields = calculateFields(bodyType, diameter, rng)
  const moonCapacity = calculateMoonCapacity(bodyType, diameter)
  const temp = calculateTemperature(rng, orbitalPosition, starType)

  // Visual properties
  const visualType = determineVisualType(rng, bodyType, temp.max)
  const hasRings = bodyType === 'gas_giant' && rng.nextBool(0.3)
  const ringColor = hasRings
    ? `hsl(${rng.nextInt(0, 360)}, 30%, 60%)`
    : undefined

  // Resource multipliers
  const multipliers = calculateResourceMultipliers(orbitalPosition)

  // Colonizability
  const isColonizable =
    bodyType !== 'gas_giant' &&
    bodyType !== 'asteroid_field' &&
    STAR_TYPES[starType].colonizable

  // Generate body
  const body: Omit<CelestialBody, 'id' | 'createdAt' | 'colonizedAt'> = {
    solarSystemId,
    parentBodyId: undefined,
    bodyType,
    orbitalPosition,
    name: `Planet ${orbitalPosition}`,
    diameter,
    fieldsMax: fields,
    moonCapacity,
    temperatureMin: temp.min,
    temperatureMax: temp.max,
    atmosphereType: bodyType === 'gas_giant' ? 'thick' : rng.nextBool(0.7) ? 'thin' : 'none',
    seed,
    planetVisualType: visualType,
    planetVisualVariant: rng.nextInt(1, 10),
    hasRings,
    ringColor,
    metalMultiplier: multipliers.metal,
    crystalMultiplier: multipliers.crystal,
    deuteriumMultiplier: multipliers.deuterium,
    isColonizable,
  }

  // Generate moons
  const moons: Omit<CelestialBody, 'id' | 'createdAt' | 'colonizedAt'>[] = []

  if (moonCapacity > 0 && bodyType !== 'asteroid_field') {
    // Random number of moons up to capacity
    const moonCount = rng.nextInt(0, moonCapacity)

    for (let i = 1; i <= moonCount; i++) {
      moons.push(
        generateMoon(seed, diameter, orbitalPosition, i, solarSystemId, starType)
      )
    }
  }

  return { body, moons }
}

/**
 * Generate all celestial bodies for a solar system
 */
export function generateSystemBodies(
  systemSeed: number,
  solarSystemId: string,
  starType: StarTypeId,
  planetCount: number,
  habitableZoneInner: number,
  habitableZoneOuter: number
): CelestialBodyGenerationResult[] {
  const results: CelestialBodyGenerationResult[] = []

  for (let position = 1; position <= planetCount; position++) {
    results.push(
      generateCelestialBody(
        systemSeed,
        position,
        solarSystemId,
        starType,
        habitableZoneInner,
        habitableZoneOuter
      )
    )
  }

  return results
}

/**
 * Calculate effective resource rates for a body considering all multipliers
 */
export function calculateEffectiveMultipliers(
  body: Pick<CelestialBody, 'metalMultiplier' | 'crystalMultiplier' | 'deuteriumMultiplier'>,
  starEffects: {
    metalMultiplier: number
    crystalMultiplier: number
    deuteriumMultiplier: number
  }
): { metal: number; crystal: number; deuterium: number } {
  return {
    metal: body.metalMultiplier * starEffects.metalMultiplier,
    crystal: body.crystalMultiplier * starEffects.crystalMultiplier,
    deuterium: body.deuteriumMultiplier * starEffects.deuteriumMultiplier,
  }
}

export default {
  generateCelestialBody,
  generateSystemBodies,
  calculateEffectiveMultipliers,
}
