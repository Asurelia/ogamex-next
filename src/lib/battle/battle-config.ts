/**
 * Battle Configuration Module
 *
 * Provides combat stats from the database via cached game config.
 * This module bridges the game config cache with the battle engine.
 */

import { getCachedGameConfig } from '@/lib/game'
import type { UnitStats, UnitCost, RapidFireTable } from './types'

// ============================================================================
// CACHED BATTLE CONFIG
// ============================================================================

/**
 * Battle configuration loaded from database
 */
export interface BattleConfig {
  /** Combat stats for ships (attack, shield, hull) */
  shipStats: Record<string, UnitStats>
  /** Combat stats for defenses (attack, shield, hull) */
  defenseStats: Record<string, UnitStats>
  /** Ship costs for debris calculation */
  shipCosts: Record<string, UnitCost>
  /** Defense costs for loss calculation */
  defenseCosts: Record<string, UnitCost>
  /** Ship IDs by key */
  shipIds: Record<string, number>
  /** Defense IDs by key */
  defenseIds: Record<string, number>
  /** Rapid fire table (attacker -> target -> value) */
  rapidFire: RapidFireTable
  /** Cargo capacity per ship type */
  cargoCapacity: Record<string, number>
}

/**
 * Load battle configuration from cached game config
 *
 * This function uses the Next.js cached game config,
 * which is cached for 1 hour with tag-based invalidation.
 *
 * @returns Battle configuration with all combat stats
 */
export async function getBattleConfig(): Promise<BattleConfig> {
  const config = await getCachedGameConfig()

  // Build ship stats
  const shipStats: Record<string, UnitStats> = {}
  const shipCosts: Record<string, UnitCost> = {}
  const shipIds: Record<string, number> = {}
  const cargoCapacity: Record<string, number> = {}

  for (const [key, ship] of Object.entries(config.shipsByKey)) {
    shipStats[key] = {
      attack: ship.weaponPower,
      shield: ship.shieldPower,
      hull: ship.structuralIntegrity,
    }
    shipCosts[key] = {
      metal: ship.cost.metal,
      crystal: ship.cost.crystal,
      deuterium: ship.cost.deuterium,
    }
    shipIds[key] = ship.id
    cargoCapacity[key] = ship.cargoCapacity
  }

  // Build defense stats
  const defenseStats: Record<string, UnitStats> = {}
  const defenseCosts: Record<string, UnitCost> = {}
  const defenseIds: Record<string, number> = {}

  for (const [key, defense] of Object.entries(config.defensesByKey)) {
    defenseStats[key] = {
      attack: defense.weaponPower,
      shield: defense.shieldPower,
      hull: defense.structuralIntegrity,
    }
    defenseCosts[key] = {
      metal: defense.cost.metal,
      crystal: defense.cost.crystal,
      deuterium: defense.cost.deuterium,
    }
    defenseIds[key] = defense.id
  }

  return {
    shipStats,
    defenseStats,
    shipCosts,
    defenseCosts,
    shipIds,
    defenseIds,
    rapidFire: config.rapidFire,
    cargoCapacity,
  }
}

// ============================================================================
// SYNCHRONOUS ACCESS (requires pre-loading)
// ============================================================================

let cachedBattleConfig: BattleConfig | null = null

/**
 * Initialize battle config (call once at battle start)
 *
 * This pre-loads the battle configuration so that synchronous
 * access is possible during combat simulation.
 *
 * @returns The loaded battle config
 */
export async function initBattleConfig(): Promise<BattleConfig> {
  cachedBattleConfig = await getBattleConfig()
  return cachedBattleConfig
}

/**
 * Get the pre-loaded battle config
 *
 * @throws Error if config not initialized
 * @returns The cached battle config
 */
export function getBattleConfigSync(): BattleConfig {
  if (!cachedBattleConfig) {
    throw new Error(
      'Battle config not initialized. Call initBattleConfig() before starting battle simulation.'
    )
  }
  return cachedBattleConfig
}

/**
 * Clear the cached battle config
 * Useful for testing or when config needs to be reloaded
 */
export function clearBattleConfigCache(): void {
  cachedBattleConfig = null
}

// ============================================================================
// HELPER FUNCTIONS (use pre-loaded config)
// ============================================================================

/**
 * Get ship stats by key
 */
export function getShipStats(key: string): UnitStats | undefined {
  return getBattleConfigSync().shipStats[key]
}

/**
 * Get defense stats by key
 */
export function getDefenseStats(key: string): UnitStats | undefined {
  return getBattleConfigSync().defenseStats[key]
}

/**
 * Get ship cost by key
 */
export function getShipCost(key: string): UnitCost {
  return getBattleConfigSync().shipCosts[key] || { metal: 0, crystal: 0, deuterium: 0 }
}

/**
 * Get defense cost by key
 */
export function getDefenseCost(key: string): UnitCost {
  return getBattleConfigSync().defenseCosts[key] || { metal: 0, crystal: 0, deuterium: 0 }
}

/**
 * Get ship ID by key
 */
export function getShipId(key: string): number {
  return getBattleConfigSync().shipIds[key] || 0
}

/**
 * Get defense ID by key
 */
export function getDefenseId(key: string): number {
  return getBattleConfigSync().defenseIds[key] || 0
}

/**
 * Get rapid fire value for attacker against target
 */
export function getRapidFire(attackerKey: string, targetKey: string): number {
  return getBattleConfigSync().rapidFire[attackerKey]?.[targetKey] || 0
}

/**
 * Get cargo capacity for a ship type
 */
export function getShipCargoCapacity(key: string): number {
  return getBattleConfigSync().cargoCapacity[key] || 0
}

/**
 * Get all ship keys that can participate in combat
 */
export function getCombatShipKeys(): string[] {
  return Object.keys(getBattleConfigSync().shipStats)
}

/**
 * Get all defense keys that can participate in combat
 */
export function getCombatDefenseKeys(): string[] {
  return Object.keys(getBattleConfigSync().defenseStats)
}
