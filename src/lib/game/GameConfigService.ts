/**
 * GameConfigService
 *
 * Service for loading and caching game configuration from Supabase.
 * Works on both server and client side in Next.js.
 * Falls back to hardcoded constants if database is unavailable.
 */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseClient } from '@/lib/supabase/client'
import {
  SHIPS,
  BUILDINGS,
  DEFENSE,
  RESEARCH,
  type ShipDefinition,
  type BuildingDefinition,
  type DefenseDefinition,
  type ResearchDefinition,
} from '@/game/constants'

import type {
  GameConfigCache,
  GameConfigKeyMaps,
  DBShipRow,
  DBBuildingRow,
  DBDefenseRow,
  DBResearchRow,
  DBRapidFireRow,
} from './types'

import {
  dbShipToDefinition,
  dbBuildingToDefinition,
  dbDefenseToDefinition,
  dbResearchToDefinition,
} from './types'

// Default TTL: 1 hour in milliseconds
const DEFAULT_TTL = 60 * 60 * 1000

/**
 * Detect if we're running on the server or client
 */
function isServer(): boolean {
  return typeof window === 'undefined'
}

/**
 * GameConfigService Singleton
 *
 * Manages game configuration with:
 * - Memory cache with configurable TTL
 * - Automatic refresh when cache expires
 * - Fallback to hardcoded constants
 * - Server and client compatibility
 */
export class GameConfigService {
  private static instance: GameConfigService | null = null

  private cache: GameConfigCache
  private keyMaps: GameConfigKeyMaps
  private lastLoad: number = 0
  private ttl: number
  private isLoading: boolean = false
  private loadPromise: Promise<void> | null = null
  private initialized: boolean = false

  private constructor(ttl: number = DEFAULT_TTL) {
    this.ttl = ttl
    this.cache = this.createEmptyCache()
    this.keyMaps = this.createEmptyKeyMaps()
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): GameConfigService {
    if (!GameConfigService.instance) {
      GameConfigService.instance = new GameConfigService()
    }
    return GameConfigService.instance
  }

  /**
   * Reset the singleton (useful for testing)
   */
  static resetInstance(): void {
    GameConfigService.instance = null
  }

  /**
   * Set the cache TTL in milliseconds
   */
  setTTL(ttl: number): void {
    this.ttl = ttl
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    if (!this.initialized) return false
    return Date.now() - this.lastLoad < this.ttl
  }

  /**
   * Create empty cache structure
   */
  private createEmptyCache(): GameConfigCache {
    return {
      ships: {},
      buildings: {},
      defenses: {},
      research: {},
      rapidFire: new Map(),
    }
  }

  /**
   * Create empty key maps
   */
  private createEmptyKeyMaps(): GameConfigKeyMaps {
    return {
      shipsByKey: new Map(),
      buildingsByKey: new Map(),
      defensesByKey: new Map(),
      researchByKey: new Map(),
    }
  }

  /**
   * Load all configuration from database
   */
  async loadAll(): Promise<void> {
    // Prevent concurrent loads
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise
    }

    this.isLoading = true
    this.loadPromise = this.doLoad()

    try {
      await this.loadPromise
    } finally {
      this.isLoading = false
      this.loadPromise = null
    }
  }

  /**
   * Internal load implementation
   */
  private async doLoad(): Promise<void> {
    try {
      // Get appropriate Supabase client
      const supabase = isServer()
        ? await createServerClient()
        : getSupabaseClient()

      // Load all data in parallel
      const [shipsResult, buildingsResult, defensesResult, researchResult, rapidFireResult] =
        await Promise.all([
          supabase.from('game_ships').select('*').eq('enabled', true),
          supabase.from('game_buildings').select('*').eq('enabled', true),
          supabase.from('game_defenses').select('*').eq('enabled', true),
          supabase.from('game_research').select('*').eq('enabled', true),
          supabase.from('game_rapid_fire').select('*'),
        ])

      // Check if we got valid data from at least one table
      const hasShips = shipsResult.data && shipsResult.data.length > 0
      const hasBuildings = buildingsResult.data && buildingsResult.data.length > 0
      const hasDefenses = defensesResult.data && defensesResult.data.length > 0
      const hasResearch = researchResult.data && researchResult.data.length > 0

      // If no data from DB, fallback to constants
      if (!hasShips && !hasBuildings && !hasDefenses && !hasResearch) {
        console.warn('[GameConfigService] No data in database, using hardcoded constants')
        this.loadFromConstants()
        return
      }

      // Create new cache
      const newCache = this.createEmptyCache()
      const newKeyMaps = this.createEmptyKeyMaps()

      // Process ships
      if (hasShips) {
        for (const row of shipsResult.data as DBShipRow[]) {
          const def = dbShipToDefinition(row)
          newCache.ships[row.id] = def
          newKeyMaps.shipsByKey.set(row.key, def)
        }
      } else {
        // Fallback for ships
        for (const id of Object.keys(SHIPS)) {
          const ship = SHIPS[Number(id) as keyof typeof SHIPS]
          newCache.ships[Number(id)] = ship
          newKeyMaps.shipsByKey.set(ship.key, ship)
        }
      }

      // Process buildings
      if (hasBuildings) {
        for (const row of buildingsResult.data as DBBuildingRow[]) {
          const def = dbBuildingToDefinition(row)
          newCache.buildings[row.id] = def
          newKeyMaps.buildingsByKey.set(row.key, def)
        }
      } else {
        // Fallback for buildings
        for (const id of Object.keys(BUILDINGS)) {
          const building = BUILDINGS[Number(id) as keyof typeof BUILDINGS]
          newCache.buildings[Number(id)] = building
          newKeyMaps.buildingsByKey.set(building.key, building)
        }
      }

      // Process defenses
      if (hasDefenses) {
        for (const row of defensesResult.data as DBDefenseRow[]) {
          const def = dbDefenseToDefinition(row)
          newCache.defenses[row.id] = def
          newKeyMaps.defensesByKey.set(row.key, def)
        }
      } else {
        // Fallback for defenses
        for (const id of Object.keys(DEFENSE)) {
          const defense = DEFENSE[Number(id) as keyof typeof DEFENSE]
          newCache.defenses[Number(id)] = defense
          newKeyMaps.defensesByKey.set(defense.key, defense)
        }
      }

      // Process research
      if (hasResearch) {
        for (const row of researchResult.data as DBResearchRow[]) {
          const def = dbResearchToDefinition(row)
          newCache.research[row.id] = def
          newKeyMaps.researchByKey.set(row.key, def)
        }
      } else {
        // Fallback for research
        for (const id of Object.keys(RESEARCH)) {
          const research = RESEARCH[Number(id) as keyof typeof RESEARCH]
          newCache.research[Number(id)] = research
          newKeyMaps.researchByKey.set(research.key, research)
        }
      }

      // Process rapid fire
      if (rapidFireResult.data && rapidFireResult.data.length > 0) {
        for (const row of rapidFireResult.data as DBRapidFireRow[]) {
          const key = `${row.attacker_type}:${row.attacker_key}`
          if (!newCache.rapidFire.has(key)) {
            newCache.rapidFire.set(key, {})
          }
          const targetKey = `${row.target_type}:${row.target_key}`
          newCache.rapidFire.get(key)![targetKey] = row.rapid_fire_value
        }
      }

      // Update cache
      this.cache = newCache
      this.keyMaps = newKeyMaps
      this.lastLoad = Date.now()
      this.initialized = true

      console.log('[GameConfigService] Configuration loaded from database')

    } catch (error) {
      console.error('[GameConfigService] Error loading from database:', error)

      // Fallback to constants on error
      if (!this.initialized) {
        this.loadFromConstants()
      }
    }
  }

  /**
   * Load configuration from hardcoded constants
   */
  private loadFromConstants(): void {
    const newCache = this.createEmptyCache()
    const newKeyMaps = this.createEmptyKeyMaps()

    // Ships
    for (const id of Object.keys(SHIPS)) {
      const ship = SHIPS[Number(id) as keyof typeof SHIPS]
      newCache.ships[Number(id)] = ship
      newKeyMaps.shipsByKey.set(ship.key, ship)
    }

    // Buildings
    for (const id of Object.keys(BUILDINGS)) {
      const building = BUILDINGS[Number(id) as keyof typeof BUILDINGS]
      newCache.buildings[Number(id)] = building
      newKeyMaps.buildingsByKey.set(building.key, building)
    }

    // Defenses
    for (const id of Object.keys(DEFENSE)) {
      const defense = DEFENSE[Number(id) as keyof typeof DEFENSE]
      newCache.defenses[Number(id)] = defense
      newKeyMaps.defensesByKey.set(defense.key, defense)
    }

    // Research
    for (const id of Object.keys(RESEARCH)) {
      const research = RESEARCH[Number(id) as keyof typeof RESEARCH]
      newCache.research[Number(id)] = research
      newKeyMaps.researchByKey.set(research.key, research)
    }

    this.cache = newCache
    this.keyMaps = newKeyMaps
    this.lastLoad = Date.now()
    this.initialized = true

    console.log('[GameConfigService] Configuration loaded from constants (fallback)')
  }

  /**
   * Refresh cache if TTL has expired
   */
  async refreshIfNeeded(): Promise<void> {
    if (!this.isCacheValid()) {
      await this.loadAll()
    }
  }

  /**
   * Force refresh the cache
   */
  async forceRefresh(): Promise<void> {
    this.lastLoad = 0
    this.initialized = false
    await this.loadAll()
  }

  /**
   * Invalidate cache without reloading
   * Next access will trigger a fresh load
   */
  invalidateCache(): void {
    this.lastLoad = 0
    this.initialized = false
    console.log('[GameConfigService] Cache invalidated')
  }

  // ==========================================================================
  // SHIPS
  // ==========================================================================

  /**
   * Get all ships
   */
  getShips(): Record<number, ShipDefinition> {
    if (!this.initialized) {
      this.loadFromConstants()
    }
    return this.cache.ships
  }

  /**
   * Get ship by key string
   */
  getShipByKey(key: string): ShipDefinition | undefined {
    if (!this.initialized) {
      this.loadFromConstants()
    }
    return this.keyMaps.shipsByKey.get(key)
  }

  /**
   * Get ship by numeric ID
   */
  getShipById(id: number): ShipDefinition | undefined {
    if (!this.initialized) {
      this.loadFromConstants()
    }
    return this.cache.ships[id]
  }

  // ==========================================================================
  // BUILDINGS
  // ==========================================================================

  /**
   * Get all buildings
   */
  getBuildings(): Record<number, BuildingDefinition> {
    if (!this.initialized) {
      this.loadFromConstants()
    }
    return this.cache.buildings
  }

  /**
   * Get building by key string
   */
  getBuildingByKey(key: string): BuildingDefinition | undefined {
    if (!this.initialized) {
      this.loadFromConstants()
    }
    return this.keyMaps.buildingsByKey.get(key)
  }

  /**
   * Get building by numeric ID
   */
  getBuildingById(id: number): BuildingDefinition | undefined {
    if (!this.initialized) {
      this.loadFromConstants()
    }
    return this.cache.buildings[id]
  }

  // ==========================================================================
  // DEFENSES
  // ==========================================================================

  /**
   * Get all defenses
   */
  getDefenses(): Record<number, DefenseDefinition> {
    if (!this.initialized) {
      this.loadFromConstants()
    }
    return this.cache.defenses
  }

  /**
   * Get defense by key string
   */
  getDefenseByKey(key: string): DefenseDefinition | undefined {
    if (!this.initialized) {
      this.loadFromConstants()
    }
    return this.keyMaps.defensesByKey.get(key)
  }

  /**
   * Get defense by numeric ID
   */
  getDefenseById(id: number): DefenseDefinition | undefined {
    if (!this.initialized) {
      this.loadFromConstants()
    }
    return this.cache.defenses[id]
  }

  // ==========================================================================
  // RESEARCH
  // ==========================================================================

  /**
   * Get all research
   */
  getResearch(): Record<number, ResearchDefinition> {
    if (!this.initialized) {
      this.loadFromConstants()
    }
    return this.cache.research
  }

  /**
   * Get research by key string
   */
  getResearchByKey(key: string): ResearchDefinition | undefined {
    if (!this.initialized) {
      this.loadFromConstants()
    }
    return this.keyMaps.researchByKey.get(key)
  }

  /**
   * Get research by numeric ID
   */
  getResearchById(id: number): ResearchDefinition | undefined {
    if (!this.initialized) {
      this.loadFromConstants()
    }
    return this.cache.research[id]
  }

  // ==========================================================================
  // RAPID FIRE
  // ==========================================================================

  /**
   * Get rapid fire values for an attacker
   * @param attackerType - 'ship' or 'defense'
   * @param attackerKey - The key of the attacker (e.g., 'light_fighter')
   * @returns Record of target keys to rapid fire values
   */
  getRapidFire(attackerType: 'ship' | 'defense', attackerKey: string): Record<string, number> {
    if (!this.initialized) {
      this.loadFromConstants()
    }
    const key = `${attackerType}:${attackerKey}`
    return this.cache.rapidFire.get(key) || {}
  }

  /**
   * Get rapid fire value for a specific attacker/target combination
   */
  getRapidFireValue(
    attackerType: 'ship' | 'defense',
    attackerKey: string,
    targetType: 'ship' | 'defense',
    targetKey: string
  ): number {
    const rapidFire = this.getRapidFire(attackerType, attackerKey)
    const targetFullKey = `${targetType}:${targetKey}`
    return rapidFire[targetFullKey] || 0
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Calculate points for a ship (cost / 1000)
   */
  calculateShipPoints(key: string): number {
    const ship = this.getShipByKey(key)
    if (!ship) return 0
    return (ship.cost.metal + ship.cost.crystal + ship.cost.deuterium) / 1000
  }

  /**
   * Calculate points for a defense unit (cost / 1000)
   */
  calculateDefensePoints(key: string): number {
    const defense = this.getDefenseByKey(key)
    if (!defense) return 0
    return (defense.cost.metal + defense.cost.crystal + defense.cost.deuterium) / 1000
  }

  /**
   * Get cargo capacity for a ship
   */
  getShipCargoCapacity(key: string): number {
    const ship = this.getShipByKey(key)
    return ship?.cargoCapacity ?? 0
  }

  /**
   * Calculate total cargo capacity for a fleet
   * @param ships - Record of ship_key to count
   */
  calculateFleetCargoCapacity(ships: Record<string, number>): number {
    let total = 0
    for (const [shipKey, count] of Object.entries(ships)) {
      total += this.getShipCargoCapacity(shipKey) * count
    }
    return total
  }

  /**
   * Get ship cost
   */
  getShipCost(key: string): { metal: number; crystal: number; deuterium: number } {
    const ship = this.getShipByKey(key)
    return ship?.cost ?? { metal: 0, crystal: 0, deuterium: 0 }
  }

  /**
   * Get defense cost
   */
  getDefenseCost(key: string): { metal: number; crystal: number; deuterium: number } {
    const defense = this.getDefenseByKey(key)
    return defense?.cost ?? { metal: 0, crystal: 0, deuterium: 0 }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get cache age in milliseconds
   */
  getCacheAge(): number {
    return Date.now() - this.lastLoad
  }
}

// ==========================================================================
// EXPORTS
// ==========================================================================

/**
 * Singleton instance for direct usage
 */
export const gameConfig = GameConfigService.getInstance()

/**
 * Initialize game configuration
 * Call this at app startup to preload data
 */
export async function initGameConfig(): Promise<void> {
  const service = GameConfigService.getInstance()
  await service.loadAll()
}

/**
 * Get game config with auto-refresh
 * Use this in components/pages to ensure fresh data
 */
export async function getGameConfig(): Promise<GameConfigService> {
  const service = GameConfigService.getInstance()
  await service.refreshIfNeeded()
  return service
}
