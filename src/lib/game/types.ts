/**
 * Game Configuration Types
 * Types for database rows and cache structures
 */

import type { ShipDefinition, BuildingDefinition, DefenseDefinition, ResearchDefinition } from '@/game/constants'

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

/**
 * Ship row from game_ships table
 */
export interface DBShipRow {
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
  build_time_factor: number
  requirements: Record<string, number>
  rapid_fire: Record<string, number>
  enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * Building row from game_buildings table
 */
export interface DBBuildingRow {
  id: number
  key: string
  name: string
  category: 'resources' | 'facilities' | 'moon'
  base_cost_metal: number
  base_cost_crystal: number
  base_cost_deuterium: number
  price_factor: number
  production_formula: string | null
  energy_formula: string | null
  storage_formula: string | null
  requirements: Record<string, number>
  max_level: number | null
  enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * Defense row from game_defenses table
 */
export interface DBDefenseRow {
  id: number
  key: string
  name: string
  cost_metal: number
  cost_crystal: number
  cost_deuterium: number
  structural_integrity: number
  shield_power: number
  weapon_power: number
  build_time_factor: number
  requirements: Record<string, number>
  rapid_fire: Record<string, number>
  max_per_planet: number | null
  enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * Research row from game_research table
 */
export interface DBResearchRow {
  id: number
  key: string
  name: string
  category: string
  base_cost_metal: number
  base_cost_crystal: number
  base_cost_deuterium: number
  price_factor: number
  requirements: Record<string, number>
  max_level: number | null
  enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * Rapid fire row from game_rapid_fire table
 */
export interface DBRapidFireRow {
  id: number
  attacker_type: 'ship' | 'defense'
  attacker_key: string
  target_type: 'ship' | 'defense'
  target_key: string
  rapid_fire_value: number
  created_at: string
}

// ============================================================================
// CACHE TYPES
// ============================================================================

/**
 * Cache structure for game configuration
 */
export interface GameConfigCache {
  ships: Record<number, ShipDefinition>
  buildings: Record<number, BuildingDefinition>
  defenses: Record<number, DefenseDefinition>
  research: Record<number, ResearchDefinition>
  rapidFire: Map<string, Record<string, number>>
}

/**
 * Key maps for fast lookup by key string
 */
export interface GameConfigKeyMaps {
  shipsByKey: Map<string, ShipDefinition>
  buildingsByKey: Map<string, BuildingDefinition>
  defensesByKey: Map<string, DefenseDefinition>
  researchByKey: Map<string, ResearchDefinition>
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

/**
 * Convert DB ship row to ShipDefinition
 */
export function dbShipToDefinition(row: DBShipRow): ShipDefinition {
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

/**
 * Convert DB building row to BuildingDefinition
 */
export function dbBuildingToDefinition(row: DBBuildingRow): BuildingDefinition {
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

/**
 * Convert DB defense row to DefenseDefinition
 */
export function dbDefenseToDefinition(row: DBDefenseRow): DefenseDefinition {
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

/**
 * Convert DB research row to ResearchDefinition
 */
export function dbResearchToDefinition(row: DBResearchRow): ResearchDefinition {
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
