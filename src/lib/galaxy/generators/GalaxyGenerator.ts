/**
 * Galaxy Generator
 * Generates galaxy metadata from universe seed
 */

import { SeededRandom, galaxySeed } from '../prng'
import {
  UNIVERSE_LIMITS,
  GALAXY_TYPE_PROBABILITIES,
  GALAXY_NAMES,
} from '../constants'
import type { Galaxy, GalaxyType } from '../types'

export interface GalaxyGenerationResult {
  galaxy: Omit<Galaxy, 'id' | 'createdAt'>
  systemSeeds: number[]
}

/**
 * Generate galaxy type based on weighted probabilities
 */
function generateGalaxyType(rng: SeededRandom): GalaxyType {
  const roll = rng.next()
  let cumulative = 0

  for (const [type, prob] of Object.entries(GALAXY_TYPE_PROBABILITIES)) {
    cumulative += prob
    if (roll < cumulative) {
      return type as GalaxyType
    }
  }

  return 'spiral'
}

/**
 * Generate a galaxy name based on index
 */
function generateGalaxyName(galaxyIndex: number): string {
  const baseName = GALAXY_NAMES[galaxyIndex % GALAXY_NAMES.length]
  const suffix = Math.floor(galaxyIndex / GALAXY_NAMES.length)

  if (suffix === 0) {
    return baseName
  }

  // Roman numeral suffixes for repeated names
  const numerals = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  return `${baseName} ${numerals[Math.min(suffix - 1, numerals.length - 1)]}`
}

/**
 * Generate galaxy spatial position
 */
function generateGalaxyPosition(rng: SeededRandom, galaxyIndex: number): {
  centerX: number
  centerY: number
  centerZ: number
  rotationAngle: number
} {
  // Distribute galaxies in a 3D grid-like pattern with some randomization
  const gridSize = Math.ceil(Math.cbrt(UNIVERSE_LIMITS.MAX_GALAXIES))
  const baseX = (galaxyIndex % gridSize) * 1000
  const baseY = (Math.floor(galaxyIndex / gridSize) % gridSize) * 1000
  const baseZ = Math.floor(galaxyIndex / (gridSize * gridSize)) * 1000

  return {
    centerX: baseX + rng.nextFloat(-200, 200),
    centerY: baseY + rng.nextFloat(-100, 100),
    centerZ: baseZ + rng.nextFloat(-150, 150),
    rotationAngle: rng.nextFloat(0, 360),
  }
}

/**
 * Generate a single galaxy
 */
export function generateGalaxy(
  masterSeed: number,
  galaxyIndex: number
): GalaxyGenerationResult {
  // Derive galaxy seed
  const seed = galaxySeed(masterSeed, galaxyIndex)
  const rng = new SeededRandom(seed)

  // Generate galaxy type
  const galaxyType = generateGalaxyType(rng)

  // Generate system count (100-200)
  const systemCount = rng.nextInt(
    UNIVERSE_LIMITS.MIN_SYSTEMS_PER_GALAXY,
    UNIVERSE_LIMITS.MAX_SYSTEMS_PER_GALAXY
  )

  // Generate name
  const name = generateGalaxyName(galaxyIndex - 1)

  // Generate position
  const position = generateGalaxyPosition(rng, galaxyIndex)

  // Generate seeds for all systems (for deterministic lazy loading)
  const systemSeeds: number[] = []
  for (let i = 1; i <= systemCount; i++) {
    systemSeeds.push(rng.deriveSeed(i * 1000))
  }

  return {
    galaxy: {
      galaxyIndex,
      name,
      seed,
      galaxyType,
      systemCount,
      ...position,
    },
    systemSeeds,
  }
}

/**
 * Generate all galaxies for a universe
 */
export function generateAllGalaxies(
  masterSeed: number,
  galaxyCount?: number
): GalaxyGenerationResult[] {
  const rng = new SeededRandom(masterSeed)

  // Determine galaxy count if not specified
  const count =
    galaxyCount ??
    rng.nextInt(UNIVERSE_LIMITS.MIN_GALAXIES, UNIVERSE_LIMITS.MAX_GALAXIES)

  const results: GalaxyGenerationResult[] = []

  for (let i = 1; i <= count; i++) {
    results.push(generateGalaxy(masterSeed, i))
  }

  return results
}

/**
 * Get statistics about galaxy distribution
 */
export function getGalaxyDistributionStats(galaxies: GalaxyGenerationResult[]): {
  totalGalaxies: number
  totalSystems: number
  avgSystemsPerGalaxy: number
  typeDistribution: Record<GalaxyType, number>
} {
  const typeDistribution: Record<GalaxyType, number> = {
    spiral: 0,
    barred_spiral: 0,
    elliptical: 0,
    irregular: 0,
  }

  let totalSystems = 0

  for (const result of galaxies) {
    typeDistribution[result.galaxy.galaxyType]++
    totalSystems += result.galaxy.systemCount
  }

  return {
    totalGalaxies: galaxies.length,
    totalSystems,
    avgSystemsPerGalaxy: totalSystems / galaxies.length,
    typeDistribution,
  }
}

export default {
  generateGalaxy,
  generateAllGalaxies,
  getGalaxyDistributionStats,
}
