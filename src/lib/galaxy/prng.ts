/**
 * Seeded Pseudo-Random Number Generator
 * Provides deterministic random generation for procedural content
 *
 * Uses Mulberry32 algorithm - fast and high-quality 32-bit PRNG
 */

export class SeededRandom {
  private state: number

  /**
   * Create a new seeded random generator
   * @param seed - Initial seed value (will be converted to 32-bit integer)
   */
  constructor(seed: number) {
    this.state = seed >>> 0 // Ensure unsigned 32-bit
  }

  /**
   * Get the current seed state
   */
  getSeed(): number {
    return this.state
  }

  /**
   * Set a new seed
   */
  setSeed(seed: number): void {
    this.state = seed >>> 0
  }

  /**
   * Generate next random number using Mulberry32 algorithm
   * @returns Random float in range [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /**
   * Generate random integer in range [min, max] (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /**
   * Generate random float in range [min, max)
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min
  }

  /**
   * Generate random boolean with given probability of true
   * @param probability - Chance of returning true (default 0.5)
   */
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability
  }

  /**
   * Pick a random element from an array
   */
  pick<T>(items: T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty array')
    }
    return items[this.nextInt(0, items.length - 1)]
  }

  /**
   * Pick a random element using weighted probabilities
   * @param items - Array of objects with weight property
   * @returns The selected item
   */
  weightedPick<T extends { weight: number }>(items: T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty array')
    }

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
    let random = this.next() * totalWeight

    for (const item of items) {
      random -= item.weight
      if (random <= 0) {
        return item
      }
    }

    return items[items.length - 1]
  }

  /**
   * Pick from weighted map (id -> weight)
   */
  weightedPickFromMap<K extends string>(weights: Record<K, number>): K {
    const entries = Object.entries(weights) as [K, number][]
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0)
    let random = this.next() * totalWeight

    for (const [key, weight] of entries) {
      random -= weight
      if (random <= 0) {
        return key
      }
    }

    return entries[entries.length - 1][0]
  }

  /**
   * Shuffle array in place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i)
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  /**
   * Sample n unique elements from array
   */
  sample<T>(array: T[], n: number): T[] {
    const copy = [...array]
    this.shuffle(copy)
    return copy.slice(0, Math.min(n, copy.length))
  }

  /**
   * Generate Gaussian (normal) distributed random number
   * Uses Box-Muller transform
   * @param mean - Mean of distribution (default 0)
   * @param stdDev - Standard deviation (default 1)
   */
  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.next()
    const u2 = this.next()
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
    return z0 * stdDev + mean
  }

  /**
   * Derive a new seed from current state with an offset
   * Useful for hierarchical seeding (galaxy -> system -> planet)
   */
  deriveSeed(offset: number): number {
    // XOR with offset multiplied by large prime
    return (this.state ^ (offset * 2654435761)) >>> 0
  }

  /**
   * Create a child generator with derived seed
   */
  deriveChild(offset: number): SeededRandom {
    return new SeededRandom(this.deriveSeed(offset))
  }
}

// ============================================================================
// SEED HIERARCHY UTILITIES
// ============================================================================

/**
 * Generate seed for a galaxy from master seed
 */
export function galaxySeed(masterSeed: number, galaxyIndex: number): number {
  return (masterSeed ^ (galaxyIndex * 1000000)) >>> 0
}

/**
 * Generate seed for a solar system from galaxy seed
 */
export function systemSeed(galaxySeedValue: number, systemIndex: number): number {
  return (galaxySeedValue ^ (systemIndex * 1000)) >>> 0
}

/**
 * Generate seed for a celestial body from system seed
 */
export function bodySeed(systemSeedValue: number, orbitalPosition: number): number {
  return (systemSeedValue ^ (orbitalPosition * 10)) >>> 0
}

/**
 * Generate seed for a moon from parent body seed
 */
export function moonSeed(parentSeedValue: number, moonIndex: number): number {
  return (parentSeedValue ^ (moonIndex * 100)) >>> 0
}

// ============================================================================
// HASH UTILITIES
// ============================================================================

/**
 * Simple string hash function (djb2)
 */
export function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0
  }
  return hash
}

/**
 * Combine multiple seeds into one
 */
export function combinedSeed(...seeds: number[]): number {
  let result = 0
  for (const seed of seeds) {
    result = (result ^ seed) >>> 0
    result = Math.imul(result, 0x5bd1e995) >>> 0
    result ^= result >>> 15
  }
  return result
}

export default SeededRandom
