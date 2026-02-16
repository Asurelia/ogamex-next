/**
 * Battle Animation Configuration
 *
 * Constants, presets, and utility functions for the Battle Animation Engine.
 * Extracted from BattleAnimationEngine.ts for maintainability.
 */

import type { PhaseTiming, CameraShotType, CameraConfig, LODLevel } from './battle-animation-types'

// ============================================================================
// PHASE TIMING CONSTANTS
// ============================================================================

/**
 * Default phase timings in seconds
 */
export const DEFAULT_PHASE_TIMING: PhaseTiming = {
  targeting: 0.5,
  firing: 1.0,
  impact: 0.5,
  resolution: 0.5,
  transition: 0.3,
}

// ============================================================================
// EFFECT POOL CONFIGURATION
// ============================================================================

/**
 * Effect pool configuration
 */
export const EFFECT_POOL_CONFIG = {
  maxLaserEffects: 50,
  maxExplosionEffects: 20,
  maxShieldHitEffects: 30,
  maxDebrisEffects: 100,
  cleanupInterval: 5000, // ms
  effectLifetime: 3000, // ms
} as const

// ============================================================================
// LOD THRESHOLDS
// ============================================================================

/**
 * LOD thresholds for battle size
 */
export const LOD_THRESHOLDS = {
  small: 20, // < 20 units: full detail
  medium: 50, // 20-50 units: reduced particles
  large: 100, // 50-100 units: batch animations
  massive: 200, // > 100 units: simplified effects
} as const

// ============================================================================
// CAMERA PRESETS
// ============================================================================

/**
 * Camera animation presets
 */
export const CAMERA_PRESETS: Record<CameraShotType, Partial<CameraConfig>> = {
  overview: {
    fov: 60,
    duration: 1.5,
    ease: 'power2.inOut',
  },
  follow_projectile: {
    fov: 45,
    duration: 0.8,
    ease: 'power1.out',
  },
  zoom_impact: {
    fov: 35,
    duration: 0.3,
    ease: 'power3.out',
  },
  wide_explosion: {
    fov: 70,
    duration: 0.5,
    ease: 'power2.out',
  },
  ship_closeup: {
    fov: 40,
    duration: 1.0,
    ease: 'power2.inOut',
  },
  dramatic_angle: {
    fov: 50,
    duration: 2.0,
    ease: 'power1.inOut',
  },
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique ID for timeline events
 */
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Calculate LOD level based on unit count
 */
export function calculateLODLevel(unitCount: number): LODLevel {
  if (unitCount < LOD_THRESHOLDS.small) return 'full'
  if (unitCount < LOD_THRESHOLDS.medium) return 'reduced'
  if (unitCount < LOD_THRESHOLDS.large) return 'batch'
  return 'simplified'
}

/**
 * Calculate round duration based on phase timings
 */
export function calculateRoundDuration(timing: PhaseTiming): number {
  return timing.targeting + timing.firing + timing.impact + timing.resolution + timing.transition
}

/**
 * Linear interpolation
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Get max effects for a pool type
 */
export function getMaxEffectsForType(type: string): number {
  switch (type) {
    case 'laser': return EFFECT_POOL_CONFIG.maxLaserEffects
    case 'explosion': return EFFECT_POOL_CONFIG.maxExplosionEffects
    case 'shield_hit': return EFFECT_POOL_CONFIG.maxShieldHitEffects
    case 'debris': return EFFECT_POOL_CONFIG.maxDebrisEffects
    default: return 20
  }
}
