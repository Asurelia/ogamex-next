/**
 * Solar System Generator
 * Generates solar systems with star types and basic configuration
 */

import { SeededRandom, systemSeed } from '../prng'
import { STAR_TYPES, UNIVERSE_LIMITS, ORBITAL_ZONES } from '../constants'
import type { SolarSystem, StarTypeId, StarType } from '../types'

export interface SolarSystemGenerationResult {
  system: Omit<SolarSystem, 'id' | 'createdAt' | 'generatedAt'>
  starConfig: StarType
  secondaryStarConfig?: StarType
}

/**
 * Select star type using weighted probabilities
 */
function selectStarType(rng: SeededRandom, excludeBinary: boolean = false): StarTypeId {
  // Build weighted list
  const candidates = Object.values(STAR_TYPES).filter(
    (star) => !excludeBinary || !star.isBinary
  )

  const totalWeight = candidates.reduce((sum, star) => sum + star.probability, 0)
  let roll = rng.next() * totalWeight

  for (const star of candidates) {
    roll -= star.probability
    if (roll <= 0) {
      return star.id
    }
  }

  return 'yellow_dwarf'
}

/**
 * Determine if system should be binary
 */
function shouldBeBinary(rng: SeededRandom): boolean {
  return rng.next() < 0.20 // 20% chance of binary
}

/**
 * Calculate planet count based on star type
 */
function calculatePlanetCount(rng: SeededRandom, starType: StarTypeId): number {
  const star = STAR_TYPES[starType]

  // Black holes have fewer planets
  if (starType === 'black_hole') {
    return rng.nextInt(1, 3)
  }

  // Exotic stars may have fewer planets
  if (star.isExotic) {
    return rng.nextInt(2, 6)
  }

  // Binary systems tend to have moderate planet counts
  if (star.isBinary) {
    return rng.nextInt(3, 7)
  }

  // Normal stars: weighted towards middle values
  const base = rng.nextInt(
    UNIVERSE_LIMITS.MIN_PLANETS_PER_SYSTEM,
    UNIVERSE_LIMITS.MAX_PLANETS_PER_SYSTEM
  )

  // Boost towards middle values
  if (base < 3 && rng.nextBool()) {
    return base + rng.nextInt(1, 3)
  }

  return base
}

/**
 * Calculate habitable zone based on star type
 */
function calculateHabitableZone(
  starType: StarTypeId
): { inner: number; outer: number } {
  const star = STAR_TYPES[starType]

  // Black holes: no habitable zone
  if (starType === 'black_hole') {
    return { inner: 0, outer: 0 }
  }

  // Base habitable zone positions
  let inner: number = ORBITAL_ZONES.HABITABLE.start
  let outer: number = ORBITAL_ZONES.HABITABLE.end

  // Adjust based on luminosity
  if (star.luminosity < 0.5) {
    // Dim stars: habitable zone is closer
    inner = Math.max(1, inner - 2)
    outer = Math.max(inner + 2, outer - 2)
  } else if (star.luminosity > 10) {
    // Bright stars: habitable zone is farther
    inner = Math.min(8, inner + 1)
    outer = Math.min(12, outer + 2)
  }

  return { inner, outer }
}

/**
 * Calculate system position in galaxy space
 */
function calculateSystemPosition(
  rng: SeededRandom,
  systemIndex: number
): { x: number; y: number; z: number } {
  // Spiral distribution
  const angle = (systemIndex * 137.5) * (Math.PI / 180) // Golden angle
  const radius = Math.sqrt(systemIndex) * 10

  return {
    x: Math.cos(angle) * radius + rng.nextFloat(-5, 5),
    y: rng.nextFloat(-10, 10),
    z: Math.sin(angle) * radius + rng.nextFloat(-5, 5),
  }
}

/**
 * Generate a single solar system
 */
export function generateSolarSystem(
  galaxySeedValue: number,
  systemIndex: number
): SolarSystemGenerationResult {
  const seed = systemSeed(galaxySeedValue, systemIndex)
  const rng = new SeededRandom(seed)

  // Determine star type
  let starType: StarTypeId
  let secondaryStarType: StarTypeId | undefined

  if (shouldBeBinary(rng)) {
    // Binary system
    starType = selectStarType(rng, false)

    // Check if selected type is binary
    if (!STAR_TYPES[starType].isBinary) {
      // Use one of the binary types
      const binaryTypes: StarTypeId[] = ['binary_yellow', 'binary_red', 'binary_mixed']
      starType = rng.pick(binaryTypes)
    }

    // Secondary star (for visual purposes)
    secondaryStarType = selectStarType(rng, true)
  } else {
    starType = selectStarType(rng, true)
  }

  const starConfig = STAR_TYPES[starType]
  const secondaryStarConfig = secondaryStarType
    ? STAR_TYPES[secondaryStarType]
    : undefined

  // Calculate planet count
  const planetCount = calculatePlanetCount(rng, starType)

  // Calculate habitable zone
  const habitableZone = calculateHabitableZone(starType)

  // Calculate position
  const position = calculateSystemPosition(rng, systemIndex)

  return {
    system: {
      galaxyId: '', // Will be set when inserting to DB
      systemIndex,
      seed,
      starType,
      secondaryStarType,
      planetCount,
      habitableZoneInner: habitableZone.inner,
      habitableZoneOuter: habitableZone.outer,
      positionX: position.x,
      positionY: position.y,
      positionZ: position.z,
      isGenerated: false,
    },
    starConfig,
    secondaryStarConfig,
  }
}

/**
 * Generate star effects for a system
 */
export function generateStarEffects(
  starConfig: StarType,
  secondaryStarConfig?: StarType
): {
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
} {
  let metal = starConfig.metalMultiplier
  let crystal = starConfig.crystalMultiplier
  let deuterium = starConfig.deuteriumMultiplier
  let energy = starConfig.energyMultiplier
  let expedition = starConfig.expeditionBonus
  let damage = starConfig.fleetDamageChance
  let loss = starConfig.fleetLossChance

  // Combine effects if binary
  if (secondaryStarConfig) {
    metal = (metal + secondaryStarConfig.metalMultiplier) / 2
    crystal = (crystal + secondaryStarConfig.crystalMultiplier) / 2
    deuterium = (deuterium + secondaryStarConfig.deuteriumMultiplier) / 2
    energy = (energy + secondaryStarConfig.energyMultiplier) / 2
    expedition = Math.max(expedition, secondaryStarConfig.expeditionBonus)
    damage = Math.max(damage, secondaryStarConfig.fleetDamageChance)
    loss = Math.max(loss, secondaryStarConfig.fleetLossChance)
  }

  return {
    metalMultiplier: metal,
    crystalMultiplier: crystal,
    deuteriumMultiplier: deuterium,
    energyMultiplier: energy,
    expeditionBonus: expedition,
    fleetDamageChance: damage,
    fleetLossChance: loss,
    isColonizable: starConfig.colonizable,
    hasRadiationHazard: starConfig.isExotic && starConfig.id === 'neutron_star',
    hasGravitationalAnomaly: starConfig.id === 'black_hole',
  }
}

/**
 * Get summary info about a generated system
 */
export function getSystemSummary(result: SolarSystemGenerationResult): {
  starName: string
  isBinary: boolean
  isExotic: boolean
  planetCount: number
  habitablePositions: number[]
  dangerLevel: 'safe' | 'moderate' | 'dangerous' | 'extreme'
} {
  const { system, starConfig } = result

  // Calculate habitable positions
  const habitablePositions: number[] = []
  for (let i = system.habitableZoneInner; i <= system.habitableZoneOuter; i++) {
    if (i <= system.planetCount) {
      habitablePositions.push(i)
    }
  }

  // Calculate danger level
  let dangerLevel: 'safe' | 'moderate' | 'dangerous' | 'extreme' = 'safe'
  if (starConfig.fleetLossChance > 0.05) {
    dangerLevel = 'extreme'
  } else if (starConfig.fleetDamageChance > 0.03) {
    dangerLevel = 'dangerous'
  } else if (starConfig.fleetDamageChance > 0) {
    dangerLevel = 'moderate'
  }

  return {
    starName: starConfig.name,
    isBinary: starConfig.isBinary,
    isExotic: starConfig.isExotic,
    planetCount: system.planetCount,
    habitablePositions,
    dangerLevel,
  }
}

export default {
  generateSolarSystem,
  generateStarEffects,
  getSystemSummary,
}
