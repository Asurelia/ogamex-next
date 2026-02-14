/**
 * Server Actions for Game Configuration Cache Invalidation
 *
 * Use these actions to invalidate the game config cache when data changes.
 */

'use server'

import { revalidateTag } from 'next/cache'

/**
 * Invalidate all game configuration cache
 */
export async function invalidateAllGameConfig() {
  // In Next.js 16, revalidateTag requires a second argument for the cacheLife profile
  // Using { expire: 0 } for immediate invalidation
  revalidateTag('game-config', { expire: 0 })
  console.log('[GameConfig] All game configuration cache invalidated')
}

/**
 * Invalidate ships configuration cache
 */
export async function invalidateShipsConfig() {
  revalidateTag('ships', { expire: 0 })
  console.log('[GameConfig] Ships configuration cache invalidated')
}

/**
 * Invalidate buildings configuration cache
 */
export async function invalidateBuildingsConfig() {
  revalidateTag('buildings', { expire: 0 })
  console.log('[GameConfig] Buildings configuration cache invalidated')
}

/**
 * Invalidate defenses configuration cache
 */
export async function invalidateDefensesConfig() {
  revalidateTag('defenses', { expire: 0 })
  console.log('[GameConfig] Defenses configuration cache invalidated')
}

/**
 * Invalidate research configuration cache
 */
export async function invalidateResearchConfig() {
  revalidateTag('research', { expire: 0 })
  console.log('[GameConfig] Research configuration cache invalidated')
}

/**
 * Invalidate rapid fire configuration cache
 */
export async function invalidateRapidFireConfig() {
  revalidateTag('rapid-fire', { expire: 0 })
  console.log('[GameConfig] Rapid fire configuration cache invalidated')
}
