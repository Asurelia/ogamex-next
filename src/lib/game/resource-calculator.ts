/**
 * Real-time Resource Calculator
 *
 * Calculates accumulated resources since last update
 * and processes completed building queue items.
 */

import { SupabaseClient } from '@supabase/supabase-js'

interface PlanetData {
  id: string
  user_id: string
  metal: number
  crystal: number
  deuterium: number
  metal_per_hour: number
  crystal_per_hour: number
  deuterium_per_hour: number
  metal_max: number
  crystal_max: number
  deuterium_max: number
  metal_mine: number
  crystal_mine: number
  deuterium_synthesizer: number
  solar_plant: number
  fusion_plant: number
  metal_storage: number
  crystal_storage: number
  deuterium_tank: number
  solar_satellite: number
  temp_max: number
  energy_used: number
  energy_max: number
  last_resource_update: string
  [key: string]: any
}

interface BuildingQueueItem {
  id: string
  planet_id: string
  building_id: number
  target_level: number
  ends_at: string
}

interface UnitQueueItem {
  id: string
  planet_id: string
  unit_id: number
  unit_type: 'ship' | 'defense'
  amount: number
  amount_completed: number
  ends_at: string
}

interface ResearchQueueItem {
  id: string
  user_id: string
  research_id: number
  target_level: number
  ends_at: string
}

// Ship ID to column key mapping
const SHIP_KEYS: Record<number, string> = {
  1: 'light_fighter',
  2: 'heavy_fighter',
  3: 'cruiser',
  4: 'battleship',
  5: 'battlecruiser',
  6: 'bomber',
  7: 'destroyer',
  8: 'deathstar',
  9: 'small_cargo',
  10: 'large_cargo',
  11: 'colony_ship',
  12: 'recycler',
  13: 'espionage_probe',
  14: 'solar_satellite',
  15: 'crawler',
  16: 'reaper',
  17: 'pathfinder',
}

// Defense ID to column key mapping
const DEFENSE_KEYS: Record<number, string> = {
  1: 'rocket_launcher',
  2: 'light_laser',
  3: 'heavy_laser',
  4: 'gauss_cannon',
  5: 'ion_cannon',
  6: 'plasma_turret',
  7: 'small_shield_dome',
  8: 'large_shield_dome',
  9: 'anti_ballistic_missile',
  10: 'interplanetary_missile',
}

// Research ID to column key mapping
const RESEARCH_KEYS: Record<number, string> = {
  1: 'energy_technology',
  2: 'laser_technology',
  3: 'ion_technology',
  4: 'hyperspace_technology',
  5: 'plasma_technology',
  6: 'combustion_drive',
  7: 'impulse_drive',
  8: 'hyperspace_drive',
  9: 'espionage_technology',
  10: 'computer_technology',
  11: 'astrophysics',
  12: 'intergalactic_research_network',
  13: 'graviton_technology',
  14: 'weapons_technology',
  15: 'shielding_technology',
  16: 'armor_technology',
}

// Building ID to column key mapping
const BUILDING_KEYS: Record<number, string> = {
  1: 'metal_mine',
  2: 'crystal_mine',
  3: 'deuterium_synthesizer',
  4: 'solar_plant',
  5: 'fusion_plant',
  6: 'metal_storage',
  7: 'crystal_storage',
  8: 'deuterium_tank',
  9: 'robot_factory',
  10: 'nanite_factory',
  11: 'shipyard',
  12: 'research_lab',
  13: 'terraformer',
  14: 'alliance_depot',
  15: 'missile_silo',
  16: 'space_dock',
}

const UNIVERSE_SPEED = parseInt(process.env.UNIVERSE_SPEED || '1', 10)

// Star effect multipliers interface
export interface StarEffectMultipliers {
  metalMultiplier: number
  crystalMultiplier: number
  deuteriumMultiplier: number
  energyMultiplier: number
}

/**
 * Calculate production rate based on mine level and energy
 * @param starMultiplier - Optional multiplier from star effects (default 1.0)
 */
function calculateMineProduction(
  level: number,
  baseRate: number,
  energyRatio: number,
  starMultiplier: number = 1.0
): number {
  if (level === 0) return Math.floor(baseRate * starMultiplier) // Base production with star effect
  return Math.floor(
    (baseRate + baseRate * level * Math.pow(1.1, level) * energyRatio * UNIVERSE_SPEED) *
      starMultiplier
  )
}

/**
 * Calculate energy consumption for a mine
 */
function calculateMineEnergyConsumption(level: number): number {
  if (level === 0) return 0
  return Math.ceil(10 * level * Math.pow(1.1, level))
}

/**
 * Calculate solar plant energy production
 * @param energyMultiplier - Optional multiplier from star effects (default 1.0)
 */
function calculateSolarEnergy(level: number, energyMultiplier: number = 1.0): number {
  if (level === 0) return 0
  return Math.floor(20 * level * Math.pow(1.1, level) * energyMultiplier)
}

/**
 * Calculate storage capacity
 */
function calculateStorageCapacity(level: number): number {
  return 5000 * Math.floor(2.5 * Math.pow(Math.E, 20 * level / 33))
}

/**
 * Update planet resources in real-time
 * This should be called when fetching planet data
 */
export async function updatePlanetResources(
  supabase: SupabaseClient,
  planet: PlanetData,
  processBuildings: boolean = true
): Promise<PlanetData> {
  const now = new Date()
  const lastUpdate = new Date(planet.last_resource_update)
  const hoursElapsed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

  // Skip if less than 1 second has passed
  if (hoursElapsed < 0.0003) {
    return planet
  }

  let updatedPlanet = { ...planet }

  // Process completed buildings first
  if (processBuildings) {
    const { data: completedBuildings } = await supabase
      .from('building_queue')
      .select('*')
      .eq('planet_id', planet.id)
      .lte('ends_at', now.toISOString())
      .order('ends_at', { ascending: true })

    if (completedBuildings && completedBuildings.length > 0) {
      for (const building of completedBuildings as BuildingQueueItem[]) {
        const buildingKey = BUILDING_KEYS[building.building_id]
        if (buildingKey) {
          updatedPlanet[buildingKey] = building.target_level
          updatedPlanet.fields_used = (updatedPlanet.fields_used || 0) + 1
        }

        // Delete the completed queue entry
        await supabase
          .from('building_queue')
          .delete()
          .eq('id', building.id)
      }
    }

    // Process completed units (ships and defenses)
    const { data: completedUnits } = await supabase
      .from('unit_queue')
      .select('*')
      .eq('planet_id', planet.id)
      .lte('ends_at', now.toISOString())
      .order('ends_at', { ascending: true })

    if (completedUnits && completedUnits.length > 0) {
      for (const unit of completedUnits as UnitQueueItem[]) {
        const unitKey = unit.unit_type === 'ship'
          ? SHIP_KEYS[unit.unit_id]
          : DEFENSE_KEYS[unit.unit_id]

        if (unitKey) {
          const currentAmount = updatedPlanet[unitKey] || 0
          const amountToAdd = unit.amount - (unit.amount_completed || 0)
          updatedPlanet[unitKey] = currentAmount + amountToAdd
        }

        // Delete the completed queue entry
        await supabase
          .from('unit_queue')
          .delete()
          .eq('id', unit.id)
      }
    }
  }

  // Recalculate energy balance
  const metalConsumption = calculateMineEnergyConsumption(updatedPlanet.metal_mine)
  const crystalConsumption = calculateMineEnergyConsumption(updatedPlanet.crystal_mine)
  const deuteriumConsumption = calculateMineEnergyConsumption(updatedPlanet.deuterium_synthesizer)
  const totalEnergyUsed = metalConsumption + crystalConsumption + deuteriumConsumption

  const solarEnergy = calculateSolarEnergy(updatedPlanet.solar_plant)
  const satelliteEnergy = (updatedPlanet.solar_satellite || 0) * Math.floor((updatedPlanet.temp_max + 160) / 6)
  const totalEnergyMax = solarEnergy + satelliteEnergy

  // Energy ratio (production efficiency)
  const energyRatio = totalEnergyUsed > 0 ? Math.min(1, totalEnergyMax / totalEnergyUsed) : 1

  // Calculate production rates
  const metalPerHour = calculateMineProduction(updatedPlanet.metal_mine, 30, energyRatio)
  const crystalPerHour = calculateMineProduction(updatedPlanet.crystal_mine, 20, energyRatio)
  const deuteriumPerHour = updatedPlanet.deuterium_synthesizer > 0
    ? Math.floor(10 * updatedPlanet.deuterium_synthesizer * Math.pow(1.1, updatedPlanet.deuterium_synthesizer) * (1.36 - 0.004 * updatedPlanet.temp_max) * energyRatio * UNIVERSE_SPEED)
    : 0

  // Calculate storage capacities
  const metalMax = calculateStorageCapacity(updatedPlanet.metal_storage)
  const crystalMax = calculateStorageCapacity(updatedPlanet.crystal_storage)
  const deuteriumMax = calculateStorageCapacity(updatedPlanet.deuterium_tank)

  // Calculate accumulated resources
  const metalProduced = metalPerHour * hoursElapsed
  const crystalProduced = crystalPerHour * hoursElapsed
  const deuteriumProduced = deuteriumPerHour * hoursElapsed

  // Apply resources (capped at storage)
  const newMetal = Math.min(metalMax, updatedPlanet.metal + metalProduced)
  const newCrystal = Math.min(crystalMax, updatedPlanet.crystal + crystalProduced)
  const newDeuterium = Math.min(deuteriumMax, updatedPlanet.deuterium + deuteriumProduced)

  // Update planet in database
  const { error } = await supabase
    .from('planets')
    .update({
      metal: newMetal,
      crystal: newCrystal,
      deuterium: newDeuterium,
      metal_per_hour: metalPerHour,
      crystal_per_hour: crystalPerHour,
      deuterium_per_hour: deuteriumPerHour,
      metal_max: metalMax,
      crystal_max: crystalMax,
      deuterium_max: deuteriumMax,
      energy_used: totalEnergyUsed,
      energy_max: totalEnergyMax,
      last_resource_update: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', planet.id)

  if (error) {
    console.error('[ResourceCalculator] Failed to update planet:', error)
    return planet // Return original if update fails
  }

  return {
    ...updatedPlanet,
    metal: newMetal,
    crystal: newCrystal,
    deuterium: newDeuterium,
    metal_per_hour: metalPerHour,
    crystal_per_hour: crystalPerHour,
    deuterium_per_hour: deuteriumPerHour,
    metal_max: metalMax,
    crystal_max: crystalMax,
    deuterium_max: deuteriumMax,
    energy_used: totalEnergyUsed,
    energy_max: totalEnergyMax,
    last_resource_update: now.toISOString(),
  }
}

/**
 * Get real-time resource values without updating database
 * Useful for displaying current resources client-side
 */
export function calculateCurrentResources(planet: PlanetData): {
  metal: number
  crystal: number
  deuterium: number
} {
  const now = new Date()
  const lastUpdate = new Date(planet.last_resource_update)
  const hoursElapsed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

  const metalProduced = planet.metal_per_hour * hoursElapsed
  const crystalProduced = planet.crystal_per_hour * hoursElapsed
  const deuteriumProduced = planet.deuterium_per_hour * hoursElapsed

  return {
    metal: Math.min(planet.metal_max, Math.floor(planet.metal + metalProduced)),
    crystal: Math.min(planet.crystal_max, Math.floor(planet.crystal + crystalProduced)),
    deuterium: Math.min(planet.deuterium_max, Math.floor(planet.deuterium + deuteriumProduced)),
  }
}

/**
 * Process completed research queue items
 * Should be called when fetching user research data
 */
export async function processResearchQueue(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const now = new Date()

  // Get completed research
  const { data: completedResearch } = await supabase
    .from('research_queue')
    .select('*')
    .eq('user_id', userId)
    .lte('ends_at', now.toISOString())
    .order('ends_at', { ascending: true })

  if (!completedResearch || completedResearch.length === 0) {
    return
  }

  // Get current research levels
  const { data: userResearch } = await supabase
    .from('user_research')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!userResearch) {
    return
  }

  const updates: Record<string, number> = {}

  for (const research of completedResearch as ResearchQueueItem[]) {
    const researchKey = RESEARCH_KEYS[research.research_id]
    if (researchKey) {
      updates[researchKey] = research.target_level
    }

    // Delete the completed queue entry
    await supabase
      .from('research_queue')
      .delete()
      .eq('id', research.id)
  }

  // Update user research levels
  if (Object.keys(updates).length > 0) {
    await supabase
      .from('user_research')
      .update({
        ...updates,
        updated_at: now.toISOString(),
      })
      .eq('user_id', userId)
  }
}
