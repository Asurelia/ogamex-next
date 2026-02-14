/**
 * Game Configuration Cache
 *
 * Uses Next.js unstable_cache for optimal caching of game data.
 * Data is cached for 1 hour with tag-based invalidation support.
 *
 * Architecture:
 * - Each config type (ships, buildings, defenses, research) has its own cache tag
 * - Data is fetched from Supabase and cached
 * - revalidateTag() can be used to invalidate specific data types
 */

import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type {
  ShipDefinition,
  BuildingDefinition,
  DefenseDefinition,
  ResearchDefinition,
} from '@/game/constants'

// =============================================================================
// SUPABASE CLIENT FOR CONFIG (uses service role for server-side access)
// =============================================================================

function getConfigSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(url, key)
}

// =============================================================================
// DB ROW TYPES
// =============================================================================

interface DBShipRow {
  id: number
  key: string
  name: string
  category: 'military' | 'civil'
  cost_metal: number
  cost_crystal: number
  cost_deuterium: number
  structural_integrity: number
  shield_power: number
  weapon_power: number
  speed: number
  cargo_capacity: number
  fuel_consumption: number
  drive_type: 'combustion' | 'impulse' | 'hyperspace'
  rapid_fire: Record<string, number> | null
}

interface DBBuildingRow {
  id: number
  key: string
  name: string
  category: 'resources' | 'facilities' | 'moon'
  base_cost_metal: number
  base_cost_crystal: number
  base_cost_deuterium: number
  price_factor: number
}

interface DBDefenseRow {
  id: number
  key: string
  name: string
  cost_metal: number
  cost_crystal: number
  cost_deuterium: number
  structural_integrity: number
  shield_power: number
  weapon_power: number
  max_per_planet: number
  rapid_fire: Record<string, number> | null
}

interface DBResearchRow {
  id: number
  key: string
  name: string
  category: string
  base_cost_metal: number
  base_cost_crystal: number
  base_cost_deuterium: number
  price_factor: number
}

interface DBRapidFireRow {
  attacker_type: 'ship' | 'defense'
  attacker_key: string
  target_type: 'ship' | 'defense'
  target_key: string
  rapid_fire_value: number
}

// =============================================================================
// CONVERTERS
// =============================================================================

function dbShipToDefinition(row: DBShipRow): ShipDefinition {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    cost: {
      metal: row.cost_metal,
      crystal: row.cost_crystal,
      deuterium: row.cost_deuterium,
    },
    structuralIntegrity: row.structural_integrity,
    shieldPower: row.shield_power,
    weaponPower: row.weapon_power,
    speed: row.speed,
    cargoCapacity: row.cargo_capacity,
    fuelConsumption: row.fuel_consumption,
    driveType: row.drive_type,
    category: row.category,
  }
}

function dbBuildingToDefinition(row: DBBuildingRow): BuildingDefinition {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    baseCost: {
      metal: row.base_cost_metal,
      crystal: row.base_cost_crystal,
      deuterium: row.base_cost_deuterium,
    },
    priceFactor: Number(row.price_factor),
    category: row.category,
  }
}

function dbDefenseToDefinition(row: DBDefenseRow): DefenseDefinition {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    cost: {
      metal: row.cost_metal,
      crystal: row.cost_crystal,
      deuterium: row.cost_deuterium,
    },
    structuralIntegrity: row.structural_integrity,
    shieldPower: row.shield_power,
    weaponPower: row.weapon_power,
  }
}

function dbResearchToDefinition(row: DBResearchRow): ResearchDefinition {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    baseCost: {
      metal: row.base_cost_metal,
      crystal: row.base_cost_crystal,
      deuterium: row.base_cost_deuterium,
    },
    priceFactor: Number(row.price_factor),
  }
}

// =============================================================================
// INTERNAL FETCH FUNCTIONS
// =============================================================================

async function fetchShipsFromDB(): Promise<Record<number, ShipDefinition>> {
  const supabase = getConfigSupabase()
  const { data, error } = await supabase
    .from('game_ships')
    .select('*')
    .eq('enabled', true)
    .order('sort_order')

  if (error || !data || data.length === 0) {
    console.error('[GameConfig] Error fetching ships:', error)
    throw new Error('Failed to load ships configuration from database')
  }

  const result: Record<number, ShipDefinition> = {}
  for (const row of data as DBShipRow[]) {
    result[row.id] = dbShipToDefinition(row)
  }
  return result
}

async function fetchBuildingsFromDB(): Promise<Record<number, BuildingDefinition>> {
  const supabase = getConfigSupabase()
  const { data, error } = await supabase
    .from('game_buildings')
    .select('*')
    .eq('enabled', true)
    .order('sort_order')

  if (error || !data || data.length === 0) {
    console.error('[GameConfig] Error fetching buildings:', error)
    throw new Error('Failed to load buildings configuration from database')
  }

  const result: Record<number, BuildingDefinition> = {}
  for (const row of data as DBBuildingRow[]) {
    result[row.id] = dbBuildingToDefinition(row)
  }
  return result
}

async function fetchDefensesFromDB(): Promise<Record<number, DefenseDefinition>> {
  const supabase = getConfigSupabase()
  const { data, error } = await supabase
    .from('game_defenses')
    .select('*')
    .eq('enabled', true)
    .order('sort_order')

  if (error || !data || data.length === 0) {
    console.error('[GameConfig] Error fetching defenses:', error)
    throw new Error('Failed to load defenses configuration from database')
  }

  const result: Record<number, DefenseDefinition> = {}
  for (const row of data as DBDefenseRow[]) {
    result[row.id] = dbDefenseToDefinition(row)
  }
  return result
}

async function fetchResearchFromDB(): Promise<Record<number, ResearchDefinition>> {
  const supabase = getConfigSupabase()
  const { data, error } = await supabase
    .from('game_research')
    .select('*')
    .eq('enabled', true)
    .order('sort_order')

  if (error || !data || data.length === 0) {
    console.error('[GameConfig] Error fetching research:', error)
    throw new Error('Failed to load research configuration from database')
  }

  const result: Record<number, ResearchDefinition> = {}
  for (const row of data as DBResearchRow[]) {
    result[row.id] = dbResearchToDefinition(row)
  }
  return result
}

async function fetchRapidFireFromDB(): Promise<Record<string, Record<string, number>>> {
  const supabase = getConfigSupabase()
  const { data, error } = await supabase
    .from('game_rapid_fire')
    .select('*')

  if (error) {
    console.error('[GameConfig] Error fetching rapid fire:', error)
    throw new Error('Failed to load rapid fire configuration from database')
  }

  const result: Record<string, Record<string, number>> = {}
  for (const row of (data || []) as DBRapidFireRow[]) {
    if (!result[row.attacker_key]) {
      result[row.attacker_key] = {}
    }
    result[row.attacker_key][row.target_key] = row.rapid_fire_value
  }
  return result
}

async function fetchFullGameConfig() {
  const supabase = getConfigSupabase()

  // Parallel fetch all config
  const [shipsResult, buildingsResult, defensesResult, researchResult, rapidFireResult] =
    await Promise.all([
      supabase.from('game_ships').select('*').eq('enabled', true).order('sort_order'),
      supabase.from('game_buildings').select('*').eq('enabled', true).order('sort_order'),
      supabase.from('game_defenses').select('*').eq('enabled', true).order('sort_order'),
      supabase.from('game_research').select('*').eq('enabled', true).order('sort_order'),
      supabase.from('game_rapid_fire').select('*'),
    ])

  // Check for errors
  if (shipsResult.error || buildingsResult.error || defensesResult.error || researchResult.error) {
    console.error('[GameConfig] Error fetching config:', {
      ships: shipsResult.error,
      buildings: buildingsResult.error,
      defenses: defensesResult.error,
      research: researchResult.error,
    })
    throw new Error('Failed to load game configuration from database')
  }

  // Convert ships
  const ships: Record<number, ShipDefinition> = {}
  const shipsByKey: Record<string, ShipDefinition> = {}
  for (const row of (shipsResult.data || []) as DBShipRow[]) {
    const def = dbShipToDefinition(row)
    ships[row.id] = def
    shipsByKey[row.key] = def
  }

  // Convert buildings
  const buildings: Record<number, BuildingDefinition> = {}
  const buildingsByKey: Record<string, BuildingDefinition> = {}
  for (const row of (buildingsResult.data || []) as DBBuildingRow[]) {
    const def = dbBuildingToDefinition(row)
    buildings[row.id] = def
    buildingsByKey[row.key] = def
  }

  // Convert defenses
  const defenses: Record<number, DefenseDefinition> = {}
  const defensesByKey: Record<string, DefenseDefinition> = {}
  for (const row of (defensesResult.data || []) as DBDefenseRow[]) {
    const def = dbDefenseToDefinition(row)
    defenses[row.id] = def
    defensesByKey[row.key] = def
  }

  // Convert research
  const research: Record<number, ResearchDefinition> = {}
  const researchByKey: Record<string, ResearchDefinition> = {}
  for (const row of (researchResult.data || []) as DBResearchRow[]) {
    const def = dbResearchToDefinition(row)
    research[row.id] = def
    researchByKey[row.key] = def
  }

  // Convert rapid fire
  const rapidFire: Record<string, Record<string, number>> = {}
  for (const row of (rapidFireResult.data || []) as DBRapidFireRow[]) {
    if (!rapidFire[row.attacker_key]) {
      rapidFire[row.attacker_key] = {}
    }
    rapidFire[row.attacker_key][row.target_key] = row.rapid_fire_value
  }

  return {
    ships,
    shipsByKey,
    buildings,
    buildingsByKey,
    defenses,
    defensesByKey,
    research,
    researchByKey,
    rapidFire,
  }
}

// =============================================================================
// CACHED DATA FETCHERS (using unstable_cache)
// =============================================================================

/**
 * Get all ships from database (cached for 1 hour)
 */
export const getCachedShips = unstable_cache(
  fetchShipsFromDB,
  ['game-ships'],
  { revalidate: 3600, tags: ['game-config', 'ships'] }
)

/**
 * Get all buildings from database (cached for 1 hour)
 */
export const getCachedBuildings = unstable_cache(
  fetchBuildingsFromDB,
  ['game-buildings'],
  { revalidate: 3600, tags: ['game-config', 'buildings'] }
)

/**
 * Get all defenses from database (cached for 1 hour)
 */
export const getCachedDefenses = unstable_cache(
  fetchDefensesFromDB,
  ['game-defenses'],
  { revalidate: 3600, tags: ['game-config', 'defenses'] }
)

/**
 * Get all research from database (cached for 1 hour)
 */
export const getCachedResearch = unstable_cache(
  fetchResearchFromDB,
  ['game-research'],
  { revalidate: 3600, tags: ['game-config', 'research'] }
)

/**
 * Get rapid fire table from database (cached for 1 hour)
 */
export const getCachedRapidFire = unstable_cache(
  fetchRapidFireFromDB,
  ['game-rapid-fire'],
  { revalidate: 3600, tags: ['game-config', 'rapid-fire'] }
)

/**
 * Get all game configuration at once (single cached call)
 * More efficient when you need multiple config types
 */
export const getCachedGameConfig = unstable_cache(
  fetchFullGameConfig,
  ['game-config-full'],
  { revalidate: 3600, tags: ['game-config'] }
)

// =============================================================================
// HELPER FUNCTIONS (use cached data)
// =============================================================================

/**
 * Get ship by key (uses full config cache)
 */
export async function getShipByKey(key: string): Promise<ShipDefinition | undefined> {
  const config = await getCachedGameConfig()
  return config.shipsByKey[key]
}

/**
 * Get defense by key (uses full config cache)
 */
export async function getDefenseByKey(key: string): Promise<DefenseDefinition | undefined> {
  const config = await getCachedGameConfig()
  return config.defensesByKey[key]
}

/**
 * Get building by key (uses full config cache)
 */
export async function getBuildingByKey(key: string): Promise<BuildingDefinition | undefined> {
  const config = await getCachedGameConfig()
  return config.buildingsByKey[key]
}

/**
 * Get research by key (uses full config cache)
 */
export async function getResearchByKey(key: string): Promise<ResearchDefinition | undefined> {
  const config = await getCachedGameConfig()
  return config.researchByKey[key]
}

/**
 * Get rapid fire value for attacker against target
 */
export async function getRapidFireValue(attackerKey: string, targetKey: string): Promise<number> {
  const config = await getCachedGameConfig()
  return config.rapidFire[attackerKey]?.[targetKey] || 0
}

/**
 * Calculate ship cargo capacity
 */
export async function getShipCargoCapacity(key: string): Promise<number> {
  const ship = await getShipByKey(key)
  return ship?.cargoCapacity ?? 0
}

/**
 * Calculate fleet cargo capacity
 */
export async function calculateFleetCargoCapacity(ships: Record<string, number>): Promise<number> {
  const config = await getCachedGameConfig()
  let total = 0
  for (const [shipKey, count] of Object.entries(ships)) {
    const ship = config.shipsByKey[shipKey]
    if (ship) {
      total += ship.cargoCapacity * count
    }
  }
  return total
}

/**
 * Calculate ship points (cost / 1000)
 */
export async function calculateShipPoints(key: string): Promise<number> {
  const ship = await getShipByKey(key)
  if (!ship) return 0
  return (ship.cost.metal + ship.cost.crystal + ship.cost.deuterium) / 1000
}

/**
 * Calculate defense points (cost / 1000)
 */
export async function calculateDefensePoints(key: string): Promise<number> {
  const defense = await getDefenseByKey(key)
  if (!defense) return 0
  return (defense.cost.metal + defense.cost.crystal + defense.cost.deuterium) / 1000
}

/**
 * Get all ship points as a Record
 */
export async function getAllShipPoints(): Promise<Record<string, number>> {
  const config = await getCachedGameConfig()
  const points: Record<string, number> = {}
  for (const [key, ship] of Object.entries(config.shipsByKey)) {
    points[key] = (ship.cost.metal + ship.cost.crystal + ship.cost.deuterium) / 1000
  }
  return points
}

/**
 * Get all defense points as a Record
 */
export async function getAllDefensePoints(): Promise<Record<string, number>> {
  const config = await getCachedGameConfig()
  const points: Record<string, number> = {}
  for (const [key, defense] of Object.entries(config.defensesByKey)) {
    points[key] = (defense.cost.metal + defense.cost.crystal + defense.cost.deuterium) / 1000
  }
  return points
}
