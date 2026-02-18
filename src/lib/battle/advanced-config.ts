/**
 * Advanced Battle Configuration
 *
 * Loads advanced combat stats from the database including:
 * - Multi-damage types (ballistic, ionic, explosive, hacking, boarding)
 * - Resistances
 * - Advanced stats (accuracy, evasion, crit, point defense, etc.)
 */

import { getCachedGameConfig } from '@/lib/game/config-cache'
import type { DamageTypes, ResistanceTypes, AdvancedCombatStats } from './damage-types'
import { EMPTY_DAMAGE, EMPTY_RESISTANCES, DEFAULT_COMBAT_STATS } from './damage-types'
import type { UnitClass } from './advanced-unit'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Advanced ship stats from database
 */
export interface AdvancedShipStats {
  // Base stats (from original config)
  id: number
  key: string
  name: string
  category: 'military' | 'civil'
  weaponPower: number
  shieldPower: number
  structuralIntegrity: number
  speed: number
  cargoCapacity: number
  fuelConsumption: number
  cost: {
    metal: number
    crystal: number
    deuterium: number
  }

  // Advanced damage types
  damage: DamageTypes

  // Resistances
  resistances: ResistanceTypes

  // Advanced combat stats
  combatStats: AdvancedCombatStats

  // Additional
  armorValue: number
  unitClass: UnitClass
  shieldRegenRate: number
  boardingPower: number
}

/**
 * Advanced defense stats from database
 */
export interface AdvancedDefenseStats {
  // Base stats
  id: number
  key: string
  name: string
  weaponPower: number
  shieldPower: number
  structuralIntegrity: number
  cost: {
    metal: number
    crystal: number
    deuterium: number
  }

  // Advanced damage types
  damage: DamageTypes

  // Resistances
  resistances: ResistanceTypes

  // Advanced combat stats
  combatStats: Omit<AdvancedCombatStats, 'crewCurrent' | 'crewMax' | 'evasion'>

  // Additional
  armorValue: number
}

/**
 * Complete advanced battle configuration
 */
export interface AdvancedBattleConfig {
  ships: Record<string, AdvancedShipStats>
  defenses: Record<string, AdvancedDefenseStats>
  rapidFire: Record<string, Record<string, number>>
}

// ============================================================================
// CACHED CONFIG
// ============================================================================

let cachedAdvancedConfig: AdvancedBattleConfig | null = null

/**
 * Load advanced battle configuration from database
 */
export async function getAdvancedBattleConfig(): Promise<AdvancedBattleConfig> {
  const gameConfig = await getCachedGameConfig()

  const ships: Record<string, AdvancedShipStats> = {}
  const defenses: Record<string, AdvancedDefenseStats> = {}

  // Process ships
  for (const [key, ship] of Object.entries(gameConfig.shipsByKey)) {
    const rawShip = ship as any // Cast to access new columns

    ships[key] = {
      id: ship.id,
      key: ship.key,
      name: ship.name,
      category: ship.category,
      weaponPower: ship.weaponPower,
      shieldPower: ship.shieldPower,
      structuralIntegrity: ship.structuralIntegrity,
      speed: ship.speed,
      cargoCapacity: ship.cargoCapacity,
      fuelConsumption: ship.fuelConsumption,
      cost: ship.cost,

      // Advanced damage - use new columns or fallback to legacy
      damage: {
        ballistic: rawShip.damage_ballistic ?? Math.floor(ship.weaponPower * 0.6),
        ionic: rawShip.damage_ionic ?? Math.floor(ship.weaponPower * 0.2),
        explosive: rawShip.damage_explosive ?? Math.floor(ship.weaponPower * 0.2),
        hacking: rawShip.damage_hacking ?? 0,
        boarding: rawShip.boarding_power ?? 0,
      },

      // Resistances
      resistances: {
        ballistic_resistance: rawShip.resist_ballistic ?? 0,
        ionic_resistance: rawShip.resist_ionic ?? 0,
        explosive_resistance: rawShip.resist_explosive ?? 0,
        hack_defense: rawShip.hack_defense ?? 0,
        anti_boarding: rawShip.anti_boarding ?? 0,
      },

      // Combat stats
      combatStats: {
        accuracy: rawShip.accuracy ?? 80,
        evasion: rawShip.evasion ?? 0,
        critChance: rawShip.crit_chance ?? 5,
        critMultiplier: rawShip.crit_multiplier ?? 1.5,
        pointDefense: rawShip.point_defense ?? 0,
        crewCurrent: rawShip.crew_capacity ?? 0,
        crewMax: rawShip.crew_capacity ?? 0,
      },

      armorValue: rawShip.armor_value ?? Math.floor(ship.structuralIntegrity * 0.2),
      unitClass: (rawShip.unit_class as UnitClass) ?? 'fighter',
      shieldRegenRate: rawShip.shield_regen_rate ?? 100,
      boardingPower: rawShip.boarding_power ?? 0,
    }
  }

  // Process defenses
  for (const [key, defense] of Object.entries(gameConfig.defensesByKey)) {
    const rawDefense = defense as any

    defenses[key] = {
      id: defense.id,
      key: defense.key,
      name: defense.name,
      weaponPower: defense.weaponPower,
      shieldPower: defense.shieldPower,
      structuralIntegrity: defense.structuralIntegrity,
      cost: defense.cost,

      // Advanced damage
      damage: {
        ballistic: rawDefense.damage_ballistic ?? Math.floor(defense.weaponPower * 0.5),
        ionic: rawDefense.damage_ionic ?? Math.floor(defense.weaponPower * 0.3),
        explosive: rawDefense.damage_explosive ?? Math.floor(defense.weaponPower * 0.2),
        hacking: rawDefense.damage_hacking ?? 0,
        boarding: 0, // Defenses don't board
      },

      // Resistances
      resistances: {
        ballistic_resistance: rawDefense.resist_ballistic ?? 0,
        ionic_resistance: rawDefense.resist_ionic ?? 0,
        explosive_resistance: rawDefense.resist_explosive ?? 0,
        hack_defense: rawDefense.hack_defense ?? 0,
        anti_boarding: rawDefense.anti_boarding ?? 0,
      },

      // Combat stats (no crew/evasion for defenses)
      combatStats: {
        accuracy: rawDefense.accuracy ?? 85,
        critChance: rawDefense.crit_chance ?? 5,
        critMultiplier: rawDefense.crit_multiplier ?? 1.5,
        pointDefense: rawDefense.point_defense ?? 0,
      },

      armorValue: rawDefense.armor_value ?? Math.floor(defense.structuralIntegrity * 0.3),
    }
  }

  return {
    ships,
    defenses,
    rapidFire: gameConfig.rapidFire,
  }
}

/**
 * Initialize advanced config (pre-load for sync access)
 */
export async function initAdvancedBattleConfig(): Promise<AdvancedBattleConfig> {
  cachedAdvancedConfig = await getAdvancedBattleConfig()
  return cachedAdvancedConfig
}

/**
 * Get pre-loaded advanced config (sync)
 */
export function getAdvancedBattleConfigSync(): AdvancedBattleConfig {
  if (!cachedAdvancedConfig) {
    throw new Error(
      'Advanced battle config not initialized. Call initAdvancedBattleConfig() first.'
    )
  }
  return cachedAdvancedConfig
}

/**
 * Clear cached config
 */
export function clearAdvancedBattleConfigCache(): void {
  cachedAdvancedConfig = null
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get advanced ship stats by key
 */
export function getAdvancedShipStats(key: string): AdvancedShipStats | undefined {
  return getAdvancedBattleConfigSync().ships[key]
}

/**
 * Get advanced defense stats by key
 */
export function getAdvancedDefenseStats(key: string): AdvancedDefenseStats | undefined {
  return getAdvancedBattleConfigSync().defenses[key]
}

/**
 * Get all ship keys
 */
export function getAdvancedShipKeys(): string[] {
  return Object.keys(getAdvancedBattleConfigSync().ships)
}

/**
 * Get all defense keys
 */
export function getAdvancedDefenseKeys(): string[] {
  return Object.keys(getAdvancedBattleConfigSync().defenses)
}

/**
 * Get rapid fire value
 */
export function getAdvancedRapidFire(attackerKey: string, targetKey: string): number {
  return getAdvancedBattleConfigSync().rapidFire[attackerKey]?.[targetKey] ?? 0
}
