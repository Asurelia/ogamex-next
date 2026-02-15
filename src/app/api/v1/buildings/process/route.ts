/**
 * POST /api/v1/buildings/process
 *
 * Process completed building constructions from the building queue.
 * This endpoint is designed to be called by:
 * - A cron job (e.g., every minute on Vercel)
 * - Manual trigger for testing
 *
 * Security:
 * - Requires a valid cron secret header
 * - In development, allows x-dev-mode header
 *
 * Process:
 * 1. Fetch all building queue entries where ends_at <= now
 * 2. For each completed building:
 *    - Update the planet's building level
 *    - Recalculate production rates and storage
 *    - Delete the queue entry
 * 3. Return stats about processed buildings
 *
 * Response:
 * - 200: Processing completed with stats
 * - 401: Unauthorized
 * - 500: Critical error
 */

import { NextRequest, NextResponse } from 'next/server'
import { BUILDINGS } from '@/game/constants'
import {
  calculateMetalProduction,
  calculateCrystalProduction,
  calculateDeuteriumProduction,
  calculateStorageCapacity,
  calculateSolarPlantEnergy,
  calculateFusionEnergy,
  calculateMineEnergyConsumption,
} from '@/game/formulas'
import { isServiceAuthorized, getServiceSupabase } from '@/lib/api/auth'

const UNIVERSE_SPEED = parseInt(process.env.UNIVERSE_SPEED || '1', 10)

// isServiceAuthorized and getServiceSupabase imported from @/lib/api/auth

interface QueueEntry {
  id: string
  planet_id: string
  building_id: number
  target_level: number
  ends_at: string
}

interface PlanetData {
  id: string
  user_id: string
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
  fields_used: number
  [key: string]: any
}

interface ProcessingStats {
  buildings_completed: number
  buildings_failed: number
  errors: Array<{ queue_id: string; error: string }>
}

/**
 * Calculate updated production and energy values after building upgrade
 */
function calculatePlanetProduction(
  planet: PlanetData,
  plasmaLevel: number,
  energyTechLevel: number
): {
  metal_per_hour: number
  crystal_per_hour: number
  deuterium_per_hour: number
  metal_max: number
  crystal_max: number
  deuterium_max: number
  energy_used: number
  energy_max: number
} {
  // Energy production
  const solarEnergy = calculateSolarPlantEnergy(planet.solar_plant)
  const fusionEnergy = calculateFusionEnergy(planet.fusion_plant, energyTechLevel)
  const solarSatelliteEnergy = planet.solar_satellite * Math.floor((planet.temp_max + 160) / 6)
  const energy_max = solarEnergy + fusionEnergy + solarSatelliteEnergy

  // Energy consumption
  const metalConsumption = calculateMineEnergyConsumption(planet.metal_mine, 'metal')
  const crystalConsumption = calculateMineEnergyConsumption(planet.crystal_mine, 'crystal')
  const deuteriumConsumption = calculateMineEnergyConsumption(planet.deuterium_synthesizer, 'deuterium')
  const energy_used = metalConsumption + crystalConsumption + deuteriumConsumption

  // Production ratio
  const ratio = energy_used > 0 ? Math.min(1, energy_max / energy_used) : 1
  const productionPercent = ratio * 100

  // Production rates
  const metal_per_hour = calculateMetalProduction(planet.metal_mine, UNIVERSE_SPEED, productionPercent, plasmaLevel)
  const crystal_per_hour = calculateCrystalProduction(planet.crystal_mine, UNIVERSE_SPEED, productionPercent, plasmaLevel)
  const deuterium_per_hour = calculateDeuteriumProduction(planet.deuterium_synthesizer, planet.temp_max, UNIVERSE_SPEED, productionPercent, plasmaLevel)

  // Storage capacities
  const metal_max = calculateStorageCapacity(planet.metal_storage)
  const crystal_max = calculateStorageCapacity(planet.crystal_storage)
  const deuterium_max = calculateStorageCapacity(planet.deuterium_tank)

  return {
    metal_per_hour,
    crystal_per_hour,
    deuterium_per_hour,
    metal_max,
    crystal_max,
    deuterium_max,
    energy_used,
    energy_max,
  }
}

/**
 * POST /api/v1/buildings/process
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    if (!isServiceAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const batchSize = Math.min(parseInt(searchParams.get('batch_size') || '50', 10), 200)
    const dryRun = searchParams.get('dry_run') === 'true'

    const supabase = getServiceSupabase()
    const now = new Date()

    // Fetch completed building queue entries
    const { data: queueEntries, error: queueError } = await supabase
      .from('building_queue')
      .select('id, planet_id, building_id, target_level, ends_at')
      .lte('ends_at', now.toISOString())
      .order('ends_at', { ascending: true })
      .limit(batchSize)

    if (queueError) {
      throw new Error(`Failed to fetch queue: ${queueError.message}`)
    }

    if (!queueEntries || queueEntries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No buildings to process',
        stats: {
          buildings_completed: 0,
          duration_ms: Date.now() - startTime,
        },
      })
    }

    if (dryRun) {
      return NextResponse.json({
        dry_run: true,
        pending_buildings: queueEntries.length,
        queue: queueEntries.map(q => ({
          id: q.id,
          building: BUILDINGS[q.building_id]?.name || `Unknown (${q.building_id})`,
          target_level: q.target_level,
          ends_at: q.ends_at,
        })),
      })
    }

    // Get unique planet IDs
    const planetIds = [...new Set(queueEntries.map(q => q.planet_id))]

    const { data: planets, error: planetsError } = await supabase
      .from('planets_compat')
      .select('*')
      .in('id', planetIds)

    if (planetsError) {
      throw new Error(`Failed to fetch planets: ${planetsError.message}`)
    }

    const planetMap = new Map(planets?.map(p => [p.id, p]) || [])

    // Get user IDs for research lookup
    const userIds = [...new Set(planets?.map(p => p.user_id) || [])]

    // Fetch research data
    const { data: researchData } = await supabase
      .from('user_research')
      .select('user_id, plasma_technology, energy_technology')
      .in('user_id', userIds)

    const researchMap = new Map(researchData?.map(r => [r.user_id, r]) || [])

    const stats: ProcessingStats = {
      buildings_completed: 0,
      buildings_failed: 0,
      errors: [],
    }

    // Process each completed building
    for (const entry of queueEntries as QueueEntry[]) {
      try {
        const planet = planetMap.get(entry.planet_id) as PlanetData | undefined
        if (!planet) {
          throw new Error('Planet not found')
        }

        const building = BUILDINGS[entry.building_id]
        if (!building) {
          throw new Error(`Unknown building ID: ${entry.building_id}`)
        }

        const research = researchMap.get(planet.user_id)
        const plasmaLevel = research?.plasma_technology || 0
        const energyTechLevel = research?.energy_technology || 0

        // Update building level on planet
        const buildingKey = building.key
        const updatedPlanet = { ...planet }
        updatedPlanet[buildingKey] = entry.target_level
        updatedPlanet.fields_used = planet.fields_used + 1

        // Recalculate production
        const production = calculatePlanetProduction(updatedPlanet, plasmaLevel, energyTechLevel)

        const { error: updateError } = await supabase
          .from('player_colonies')
          .update({
            [buildingKey]: entry.target_level,
            fields_used: updatedPlanet.fields_used,
            ...production,
            updated_at: now.toISOString(),
          })
          .eq('id', entry.planet_id)

        if (updateError) {
          throw new Error(`Failed to update planet: ${updateError.message}`)
        }

        // Delete queue entry
        const { error: deleteError } = await supabase
          .from('building_queue')
          .delete()
          .eq('id', entry.id)

        if (deleteError) {
          throw new Error(`Failed to delete queue entry: ${deleteError.message}`)
        }

        // Update local planet map for subsequent buildings on same planet
        planetMap.set(entry.planet_id, {
          ...planet,
          [buildingKey]: entry.target_level,
          fields_used: updatedPlanet.fields_used,
        })

        stats.buildings_completed++
      } catch (error) {
        stats.buildings_failed++
        stats.errors.push({
          queue_id: entry.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const duration = Date.now() - startTime

    console.log(
      `[BuildingProcessor] Completed ${stats.buildings_completed} buildings in ${duration}ms. ` +
        `Errors: ${stats.buildings_failed}`
    )

    return NextResponse.json({
      success: true,
      stats: {
        buildings_completed: stats.buildings_completed,
        buildings_failed: stats.buildings_failed,
        errors_count: stats.errors.length,
        duration_ms: duration,
      },
      errors: stats.errors.length > 0 ? stats.errors : undefined,
    })
  } catch (error) {
    console.error('[BuildingProcessor] Critical error:', error)

    return NextResponse.json(
      {
        error: 'Building processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/buildings/process
 *
 * Get status and statistics about building queue.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isServiceAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceSupabase()
    const now = new Date()

    // Get pending buildings
    const { data: pending } = await supabase
      .from('building_queue')
      .select('id, planet_id, building_id, target_level, ends_at')
      .order('ends_at', { ascending: true })
      .limit(20)

    // Get completed count
    const { count: completedCount } = await supabase
      .from('building_queue')
      .select('id', { count: 'exact', head: true })
      .lte('ends_at', now.toISOString())

    // Get total count
    const { count: totalCount } = await supabase
      .from('building_queue')
      .select('id', { count: 'exact', head: true })

    return NextResponse.json({
      total_in_queue: totalCount,
      ready_to_complete: completedCount,
      pending_buildings: pending?.map(q => ({
        id: q.id,
        building: BUILDINGS[q.building_id]?.name || `Unknown (${q.building_id})`,
        target_level: q.target_level,
        ends_at: q.ends_at,
        minutes_remaining: Math.max(0, Math.ceil(
          (new Date(q.ends_at).getTime() - now.getTime()) / (1000 * 60)
        )),
      })),
      server_time: now.toISOString(),
    })
  } catch (error) {
    console.error('[BuildingProcessor] Status error:', error)

    return NextResponse.json(
      {
        error: 'Failed to get status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
