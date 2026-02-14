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

/**
 * Calculate production rate based on mine level and energy
 */
function calculateMineProduction(level: number, baseRate: number, energyRatio: number): number {
  if (level === 0) return baseRate // Base production only
  return Math.floor(baseRate + baseRate * level * Math.pow(1.1, level) * energyRatio * UNIVERSE_SPEED)
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
 */
function calculateSolarEnergy(level: number): number {
  if (level === 0) return 0
  return Math.floor(20 * level * Math.pow(1.1, level))
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
