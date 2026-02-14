/**
 * Game Configuration Module
 *
 * Provides cached access to game configuration data from Supabase.
 * Uses Next.js 16 `use cache` directive for optimal performance.
 *
 * Usage:
 * ```typescript
 * // In a server component or API route
 * import { getCachedGameConfig, getShipByKey } from '@/lib/game'
 *
 * // Get full config (single cached call)
 * const config = await getCachedGameConfig()
 * const ship = config.shipsByKey['light_fighter']
 *
 * // Or get specific data
 * const ship = await getShipByKey('light_fighter')
 * const rapidFire = await getRapidFireValue('cruiser', 'light_fighter')
 * ```
 *
 * Cache invalidation:
 * ```typescript
 * import { invalidateAllGameConfig, invalidateShipsConfig } from '@/lib/game'
 * await invalidateAllGameConfig() // Invalidate all
 * await invalidateShipsConfig()   // Invalidate only ships
 * ```
 */

// =============================================================================
// CACHED DATA FETCHERS (use cache)
// =============================================================================

export {
  // Full config (most efficient for multiple lookups)
  getCachedGameConfig,

  // Individual config types
  getCachedShips,
  getCachedBuildings,
  getCachedDefenses,
  getCachedResearch,
  getCachedRapidFire,

  // Helper functions
  getShipByKey,
  getDefenseByKey,
  getBuildingByKey,
  getResearchByKey,
  getRapidFireValue,
  getShipCargoCapacity,
  calculateFleetCargoCapacity,
  calculateShipPoints,
  calculateDefensePoints,
  getAllShipPoints,
  getAllDefensePoints,
} from './config-cache'

// =============================================================================
// CACHE INVALIDATION ACTIONS
// =============================================================================

export {
  invalidateAllGameConfig,
  invalidateShipsConfig,
  invalidateBuildingsConfig,
  invalidateDefensesConfig,
  invalidateResearchConfig,
  invalidateRapidFireConfig,
} from './config-actions'

// =============================================================================
// LEGACY EXPORTS (for backward compatibility during migration)
// =============================================================================

// Re-export the old GameConfigService for gradual migration
export {
  GameConfigService,
  gameConfig,
  initGameConfig,
  getGameConfig,
} from './GameConfigService'

// Type exports
export type {
  GameConfigCache,
  GameConfigKeyMaps,
  DBShipRow,
  DBBuildingRow,
  DBDefenseRow,
  DBResearchRow,
  DBRapidFireRow,
} from './types'

// Conversion helper exports
export {
  dbShipToDefinition,
  dbBuildingToDefinition,
  dbDefenseToDefinition,
  dbResearchToDefinition,
} from './types'
