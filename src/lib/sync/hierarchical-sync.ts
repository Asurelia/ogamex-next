/**
 * Hierarchical Synchronization Module
 *
 * Provides batch operations and hierarchical data aggregation utilities.
 * Uses optimized RPC functions for atomic database operations.
 *
 * Hierarchy: Building → Planet → System → Galaxy → User
 */

import { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// TYPES
// ============================================================================

export interface PlanetResourceUpdate {
  planet_id: string
  metal: number
  crystal: number
  deuterium: number
  last_resource_update?: string
}

export interface BatchUpdateResult {
  processed: number
  errors: Array<{ planet_id: string; error: string }>
}

export interface BuildingCompletionResult {
  completed: number
  updates: Record<string, number>
  deleted_ids: string[]
  fields_added?: number
}

export interface UnitCompletionResult {
  completed: number
  updates: Record<string, number>
  deleted_ids: string[]
}

export interface UserStats {
  total_metal: number
  total_crystal: number
  total_deuterium: number
  total_planets: number
  total_fields_used: number
  total_fields_max: number
  total_metal_production: number
  total_crystal_production: number
  total_deuterium_production: number
}

export interface SystemOverview {
  system_id: string
  system_index: number
  star_type: string
  galaxy_id: string
  planets: Array<{
    id: string
    name: string
    orbital_position: number
    body_type: string
    owner_id: string | null
    owner_name: string | null
    is_owned_by_user: boolean
  }>
  total_colonies: number
  user_has_colony: boolean
}

export interface GalaxyOverview {
  galaxy_id: string
  galaxy_index: number
  name: string
  total_systems: number
  colonized_systems: number
  user_systems: number
  user_planets: number
  discovery_info: {
    discovered_systems: number
    mapped_systems: number
    explored_systems: number
  }
}

export interface HierarchySyncResult {
  planet_id: string
  user_id: string
  system_id: string
  galaxy_id: string
  planet_stats: {
    metal: number
    crystal: number
    deuterium: number
    metal_per_hour: number
    crystal_per_hour: number
    deuterium_per_hour: number
  }
  user_totals: UserStats
  synced_at: string
}

// ============================================================================
// HIERARCHICAL SYNC SERVICE
// ============================================================================

export class HierarchicalSyncService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Batch update multiple planets' resources in a single atomic transaction
   * Much more efficient than individual updates
   */
  async batchUpdatePlanetResources(
    updates: PlanetResourceUpdate[]
  ): Promise<BatchUpdateResult> {
    const { data, error } = await this.supabase.rpc('batch_update_planet_resources', {
      p_updates: updates
    })

    if (error) {
      throw new Error(`Batch update failed: ${error.message}`)
    }

    return data as BatchUpdateResult
  }

  /**
   * Process all completed buildings for a planet atomically
   * Returns updates to apply to planet state
   */
  async completeBuildings(planetId: string): Promise<BuildingCompletionResult> {
    const { data, error } = await this.supabase.rpc('batch_complete_buildings', {
      p_planet_id: planetId
    })

    if (error) {
      throw new Error(`Building completion failed: ${error.message}`)
    }

    return data as BuildingCompletionResult
  }

  /**
   * Process all completed units for a planet atomically
   * Returns unit counts to add to planet
   */
  async completeUnits(planetId: string): Promise<UnitCompletionResult> {
    const { data, error } = await this.supabase.rpc('batch_complete_units', {
      p_planet_id: planetId
    })

    if (error) {
      throw new Error(`Unit completion failed: ${error.message}`)
    }

    return data as UnitCompletionResult
  }

  /**
   * Get aggregated statistics for a user across all planets
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const { data, error } = await this.supabase.rpc('aggregate_user_stats', {
      p_user_id: userId
    })

    if (error) {
      throw new Error(`User stats aggregation failed: ${error.message}`)
    }

    return data as UserStats
  }

  /**
   * Get overview of a solar system with planet ownership info
   */
  async getSystemOverview(
    systemId: string,
    userId?: string
  ): Promise<SystemOverview | null> {
    const { data, error } = await this.supabase.rpc('get_system_overview', {
      p_system_id: systemId,
      p_user_id: userId || null
    })

    if (error) {
      throw new Error(`System overview failed: ${error.message}`)
    }

    return data as SystemOverview | null
  }

  /**
   * Get overview of a galaxy with aggregated stats
   */
  async getGalaxyOverview(
    galaxyId: string,
    userId?: string
  ): Promise<GalaxyOverview | null> {
    const { data, error } = await this.supabase.rpc('get_galaxy_overview', {
      p_galaxy_id: galaxyId,
      p_user_id: userId || null
    })

    if (error) {
      throw new Error(`Galaxy overview failed: ${error.message}`)
    }

    return data as GalaxyOverview | null
  }

  /**
   * Perform full hierarchical sync from planet to user level
   * Returns current state at all hierarchy levels
   */
  async syncPlanetHierarchy(planetId: string): Promise<HierarchySyncResult> {
    const { data, error } = await this.supabase.rpc('sync_planet_hierarchy', {
      p_planet_id: planetId
    })

    if (error) {
      throw new Error(`Hierarchy sync failed: ${error.message}`)
    }

    if (data.error) {
      throw new Error(data.error)
    }

    return data as HierarchySyncResult
  }

  /**
   * Process multiple planets' building and unit queues efficiently
   * Groups operations by planet and uses batch RPC calls
   */
  async processQueuesBatch(planetIds: string[]): Promise<{
    buildings: Map<string, BuildingCompletionResult>
    units: Map<string, UnitCompletionResult>
  }> {
    const buildings = new Map<string, BuildingCompletionResult>()
    const units = new Map<string, UnitCompletionResult>()

    // Process in parallel for all planets
    await Promise.all(
      planetIds.map(async (planetId) => {
        const [buildingResult, unitResult] = await Promise.all([
          this.completeBuildings(planetId),
          this.completeUnits(planetId)
        ])

        if (buildingResult.completed > 0) {
          buildings.set(planetId, buildingResult)
        }
        if (unitResult.completed > 0) {
          units.set(planetId, unitResult)
        }
      })
    )

    return { buildings, units }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a HierarchicalSyncService instance
 */
export function createSyncService(supabase: SupabaseClient): HierarchicalSyncService {
  return new HierarchicalSyncService(supabase)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Group resource updates by user for efficient processing
 */
export function groupUpdatesByUser(
  updates: Array<PlanetResourceUpdate & { user_id: string }>
): Map<string, PlanetResourceUpdate[]> {
  const grouped = new Map<string, PlanetResourceUpdate[]>()

  for (const update of updates) {
    const { user_id, ...planetUpdate } = update
    if (!grouped.has(user_id)) {
      grouped.set(user_id, [])
    }
    grouped.get(user_id)!.push(planetUpdate)
  }

  return grouped
}

/**
 * Calculate total resources from multiple planets
 */
export function aggregateResources(
  planets: Array<{ metal: number; crystal: number; deuterium: number }>
): { metal: number; crystal: number; deuterium: number } {
  return planets.reduce(
    (acc, planet) => ({
      metal: acc.metal + planet.metal,
      crystal: acc.crystal + planet.crystal,
      deuterium: acc.deuterium + planet.deuterium
    }),
    { metal: 0, crystal: 0, deuterium: 0 }
  )
}
