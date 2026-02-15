/**
 * Star Effects Module
 * Handles gameplay effects based on star type
 */

import { STAR_TYPES } from './constants'
import type { StarTypeId, StarEffects } from './types'

// ============================================================================
// DANGER LEVELS
// ============================================================================

export type DangerLevel = 'safe' | 'moderate' | 'dangerous' | 'extreme'

export function getDangerLevel(starType: StarTypeId): DangerLevel {
  const star = STAR_TYPES[starType]

  if (star.fleetLossChance >= 0.05) {
    return 'extreme'
  }
  if (star.fleetDamageChance >= 0.03) {
    return 'dangerous'
  }
  if (star.fleetDamageChance > 0 || star.fleetLossChance > 0) {
    return 'moderate'
  }
  return 'safe'
}

export function getDangerColor(level: DangerLevel): string {
  switch (level) {
    case 'safe':
      return '#22c55e' // green
    case 'moderate':
      return '#eab308' // yellow
    case 'dangerous':
      return '#f97316' // orange
    case 'extreme':
      return '#ef4444' // red
  }
}

// ============================================================================
// RESOURCE PRODUCTION
// ============================================================================

export interface ProductionModifiers {
  metalMultiplier: number
  crystalMultiplier: number
  deuteriumMultiplier: number
  energyMultiplier: number
}

/**
 * Get production modifiers for a star type
 */
export function getProductionModifiers(starType: StarTypeId): ProductionModifiers {
  const star = STAR_TYPES[starType]
  return {
    metalMultiplier: star.metalMultiplier,
    crystalMultiplier: star.crystalMultiplier,
    deuteriumMultiplier: star.deuteriumMultiplier,
    energyMultiplier: star.energyMultiplier,
  }
}

/**
 * Apply star effects to base production rates
 */
export function applyProductionModifiers(
  baseRates: { metal: number; crystal: number; deuterium: number; energy: number },
  modifiers: ProductionModifiers
): { metal: number; crystal: number; deuterium: number; energy: number } {
  return {
    metal: Math.floor(baseRates.metal * modifiers.metalMultiplier),
    crystal: Math.floor(baseRates.crystal * modifiers.crystalMultiplier),
    deuterium: Math.floor(baseRates.deuterium * modifiers.deuteriumMultiplier),
    energy: Math.floor(baseRates.energy * modifiers.energyMultiplier),
  }
}

// ============================================================================
// FLEET EFFECTS
// ============================================================================

export interface FleetRiskResult {
  damaged: boolean
  damagePercent: number
  lost: boolean
}

/**
 * Calculate fleet risk when entering or passing through a system
 * @param starType - The type of star in the system
 * @param rng - Random number generator (or Math.random)
 */
export function calculateFleetRisk(
  starType: StarTypeId,
  random: () => number = Math.random
): FleetRiskResult {
  const star = STAR_TYPES[starType]

  const lost = random() < star.fleetLossChance
  const damaged = !lost && random() < star.fleetDamageChance

  return {
    lost,
    damaged,
    damagePercent: damaged ? Math.floor(random() * 20) + 5 : 0, // 5-25% damage
  }
}

/**
 * Get expedition bonus multiplier for a star type
 */
export function getExpeditionBonus(starType: StarTypeId): number {
  return STAR_TYPES[starType].expeditionBonus
}

// ============================================================================
// STAR INFO
// ============================================================================

export interface StarInfo {
  id: StarTypeId
  name: string
  color: string
  isBinary: boolean
  isExotic: boolean
  colonizable: boolean
  dangerLevel: DangerLevel
  description: string
  effects: {
    metal: string
    crystal: string
    deuterium: string
    energy: string
    expedition: string
    fleetRisk: string
  }
}

/**
 * Get human-readable info about a star type
 */
export function getStarInfo(starType: StarTypeId): StarInfo {
  const star = STAR_TYPES[starType]

  const formatMultiplier = (value: number): string => {
    if (value === 1.0) return 'Normal'
    if (value === 0) return 'None'
    const percent = Math.round((value - 1) * 100)
    return percent > 0 ? `+${percent}%` : `${percent}%`
  }

  const formatRisk = (): string => {
    if (star.fleetLossChance > 0) {
      return `${Math.round(star.fleetLossChance * 100)}% loss, ${Math.round(star.fleetDamageChance * 100)}% damage`
    }
    if (star.fleetDamageChance > 0) {
      return `${Math.round(star.fleetDamageChance * 100)}% damage chance`
    }
    return 'None'
  }

  return {
    id: star.id,
    name: star.name,
    color: star.color,
    isBinary: star.isBinary,
    isExotic: star.isExotic,
    colonizable: star.colonizable,
    dangerLevel: getDangerLevel(starType),
    description: star.description,
    effects: {
      metal: formatMultiplier(star.metalMultiplier),
      crystal: formatMultiplier(star.crystalMultiplier),
      deuterium: formatMultiplier(star.deuteriumMultiplier),
      energy: formatMultiplier(star.energyMultiplier),
      expedition: formatMultiplier(star.expeditionBonus),
      fleetRisk: formatRisk(),
    },
  }
}

// ============================================================================
// STAR EFFECTS CONVERSION
// ============================================================================

/**
 * Convert StarEffects from database format to usable format
 */
export function parseStarEffects(effects: StarEffects): {
  production: ProductionModifiers
  expedition: number
  risk: { damage: number; loss: number }
  flags: { colonizable: boolean; radiation: boolean; gravity: boolean }
} {
  return {
    production: {
      metalMultiplier: effects.metalMultiplier,
      crystalMultiplier: effects.crystalMultiplier,
      deuteriumMultiplier: effects.deuteriumMultiplier,
      energyMultiplier: effects.energyMultiplier,
    },
    expedition: effects.expeditionBonus,
    risk: {
      damage: effects.fleetDamageChance,
      loss: effects.fleetLossChance,
    },
    flags: {
      colonizable: effects.isColonizable,
      radiation: effects.hasRadiationHazard,
      gravity: effects.hasGravitationalAnomaly,
    },
  }
}

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Get icon name for a star type (for use with icon libraries)
 */
export function getStarIcon(starType: StarTypeId): string {
  const star = STAR_TYPES[starType]

  if (star.id === 'black_hole') return 'circle-off'
  if (star.id === 'neutron_star') return 'atom'
  if (star.isBinary) return 'stars'
  if (star.isExotic) return 'sparkles'
  if (star.luminosity > 100) return 'sun-dim'

  return 'sun'
}

/**
 * Get CSS class name for star glow effect
 */
export function getStarGlowClass(starType: StarTypeId): string {
  const star = STAR_TYPES[starType]

  if (star.id === 'black_hole') return 'glow-purple'
  if (star.id === 'neutron_star') return 'glow-blue'
  if (star.color.startsWith('#ff4') || star.color.startsWith('#ff5')) return 'glow-red'
  if (star.color.startsWith('#44') || star.color.startsWith('#88a')) return 'glow-blue'

  return 'glow-yellow'
}

export default {
  getDangerLevel,
  getDangerColor,
  getProductionModifiers,
  applyProductionModifiers,
  calculateFleetRisk,
  getExpeditionBonus,
  getStarInfo,
  parseStarEffects,
  getStarIcon,
  getStarGlowClass,
}
