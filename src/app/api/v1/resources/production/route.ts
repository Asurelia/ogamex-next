/**
 * POST /api/v1/resources/production
 *
 * Recalculate and update resources for all planets.
 * This endpoint is designed to be called by:
 * - A cron job (e.g., every 5 minutes on Vercel)
 * - Manual trigger for testing
 *
 * Security:
 * - Requires a valid cron secret header
 * - In development, allows x-dev-mode header
 *
 * Process:
 * 1. Fetch all non-destroyed planets with their user's research
 * 2. Calculate time elapsed since last_resource_update
 * 3. Calculate production rates based on building levels and research
 * 4. Add resources (respecting storage limits)
 * 5. Update last_resource_update timestamp
 *
 * Response:
 * - 200: Processing completed with stats
 * - 401: Unauthorized
 * - 500: Critical error
 */

import { NextRequest, NextResponse } from 'next/server'
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

// Universe speed multiplier (can be configured via env)
const UNIVERSE_SPEED = parseInt(process.env.UNIVERSE_SPEED || '1', 10)

// isServiceAuthorized and getServiceSupabase imported from @/lib/api/auth

/**
 * Calculate energy balance for a planet
 */
function calculateEnergyBalance(planet: PlanetData, energyTechLevel: number): { produced: number; consumed: number; ratio: number } {
  // Energy production
  const solarEnergy = calculateSolarPlantEnergy(planet.solar_plant)
  const fusionEnergy = calculateFusionEnergy(planet.fusion_plant, energyTechLevel)

  // Solar satellites (each produces ~20-50 energy based on position, simplified)
  const solarSatelliteEnergy = planet.solar_satellite * Math.floor(
    (planet.temp_max + 160) / 6
  )

  const totalProduced = solarEnergy + fusionEnergy + solarSatelliteEnergy

  // Energy consumption
  const metalConsumption = calculateMineEnergyConsumption(planet.metal_mine, 'metal')
  const crystalConsumption = calculateMineEnergyConsumption(planet.crystal_mine, 'crystal')
  const deuteriumConsumption = calculateMineEnergyConsumption(planet.deuterium_synthesizer, 'deuterium')

  // Fusion reactor consumes deuterium (handled separately)
  const totalConsumed = metalConsumption + crystalConsumption + deuteriumConsumption

  // Production ratio (capped at 100%)
  const ratio = totalConsumed > 0
    ? Math.min(1, totalProduced / totalConsumed)
    : 1

  return { produced: totalProduced, consumed: totalConsumed, ratio }
}

interface PlanetData {
  id: string
  user_id: string
  metal: number
  crystal: number
  deuterium: number
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
  last_resource_update: string
  destroyed: boolean
}

interface UserResearch {
  user_id: string
  plasma_technology: number
  energy_technology: number
}

interface ProcessingStats {
  planets_processed: number
  planets_skipped: number
  total_metal_produced: number
  total_crystal_produced: number
  total_deuterium_produced: number
  errors: Array<{ planet_id: string; error: string }>
}

/**
 * POST /api/v1/resources/production
 *
 * Process resource production for all planets.
 *
 * Query params:
 * - batch_size: Maximum planets to process per batch (default: 100, max: 500)
 * - dry_run: If "true", only return what would be processed without executing
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Authorization check
    if (!isServiceAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse options from query params
    const { searchParams } = new URL(request.url)
    const batchSize = Math.min(
      parseInt(searchParams.get('batch_size') || '100', 10),
      500
    )
    const dryRun = searchParams.get('dry_run') === 'true'

    const supabase = getServiceSupabase()
    const now = new Date()

    const { data: planets, error: planetsError } = await supabase
      .from('planets_compat')
      .select(`
        id,
        user_id,
        metal,
        crystal,
        deuterium,
        metal_mine,
        crystal_mine,
        deuterium_synthesizer,
        solar_plant,
        fusion_plant,
        metal_storage,
        crystal_storage,
        deuterium_tank,
        solar_satellite,
        temp_max,
        last_resource_update,
        destroyed
      `)
      .eq('destroyed', false)
      .order('last_resource_update', { ascending: true })
      .limit(batchSize)

    if (planetsError) {
      throw new Error(`Failed to fetch planets: ${planetsError.message}`)
    }

    if (!planets || planets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No planets to process',
        stats: {
          planets_processed: 0,
          duration_ms: Date.now() - startTime,
        },
      })
    }

    // Get unique user IDs for research lookup
    const userIds = [...new Set(planets.map(p => p.user_id))]

    // Fetch research levels for all users
    const { data: researchData } = await supabase
      .from('user_research')
      .select('user_id, plasma_technology, energy_technology')
      .in('user_id', userIds)

    // Create a map for quick lookup
    const researchMap = new Map<string, UserResearch>()
    researchData?.forEach(r => researchMap.set(r.user_id, r))

    // Dry run - just return stats
    if (dryRun) {
      const stats: ProcessingStats = {
        planets_processed: planets.length,
        planets_skipped: 0,
        total_metal_produced: 0,
        total_crystal_produced: 0,
        total_deuterium_produced: 0,
        errors: [],
      }

      for (const planet of planets as PlanetData[]) {
        const research = researchMap.get(planet.user_id)
        const plasmaLevel = research?.plasma_technology || 0
        const energyTechLevel = research?.energy_technology || 0

        const lastUpdate = new Date(planet.last_resource_update)
        const elapsedHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

        if (elapsedHours <= 0) {
          stats.planets_skipped++
          continue
        }

        // Calculate energy ratio
        const energy = calculateEnergyBalance(planet, energyTechLevel)
        const productionPercent = energy.ratio * 100

        // Calculate production
        const metalPerHour = calculateMetalProduction(planet.metal_mine, UNIVERSE_SPEED, productionPercent, plasmaLevel)
        const crystalPerHour = calculateCrystalProduction(planet.crystal_mine, UNIVERSE_SPEED, productionPercent, plasmaLevel)
        const deuteriumPerHour = calculateDeuteriumProduction(planet.deuterium_synthesizer, planet.temp_max, UNIVERSE_SPEED, productionPercent, plasmaLevel)

        stats.total_metal_produced += metalPerHour * elapsedHours
        stats.total_crystal_produced += crystalPerHour * elapsedHours
        stats.total_deuterium_produced += deuteriumPerHour * elapsedHours
      }

      return NextResponse.json({
        dry_run: true,
        stats: {
          ...stats,
          duration_ms: Date.now() - startTime,
        },
      })
    }

    // Process each planet
    const stats: ProcessingStats = {
      planets_processed: 0,
      planets_skipped: 0,
      total_metal_produced: 0,
      total_crystal_produced: 0,
      total_deuterium_produced: 0,
      errors: [],
    }

    const updates: Array<{
      id: string
      metal: number
      crystal: number
      deuterium: number
      metal_per_hour: number
      crystal_per_hour: number
      deuterium_per_hour: number
      energy_used: number
      energy_max: number
      last_resource_update: string
    }> = []

    for (const planet of planets as PlanetData[]) {
      try {
        const research = researchMap.get(planet.user_id)
        const plasmaLevel = research?.plasma_technology || 0
        const energyTechLevel = research?.energy_technology || 0

        // Calculate time elapsed
        const lastUpdate = new Date(planet.last_resource_update)
        const elapsedHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

        // Skip if no time has passed
        if (elapsedHours <= 0) {
          stats.planets_skipped++
          continue
        }

        // Calculate storage capacities
        const metalMax = calculateStorageCapacity(planet.metal_storage)
        const crystalMax = calculateStorageCapacity(planet.crystal_storage)
        const deuteriumMax = calculateStorageCapacity(planet.deuterium_tank)

        // Calculate energy balance
        const energy = calculateEnergyBalance(planet, energyTechLevel)
        const productionPercent = energy.ratio * 100

        // Calculate hourly production rates
        const metalPerHour = calculateMetalProduction(planet.metal_mine, UNIVERSE_SPEED, productionPercent, plasmaLevel)
        const crystalPerHour = calculateCrystalProduction(planet.crystal_mine, UNIVERSE_SPEED, productionPercent, plasmaLevel)
        const deuteriumPerHour = calculateDeuteriumProduction(planet.deuterium_synthesizer, planet.temp_max, UNIVERSE_SPEED, productionPercent, plasmaLevel)

        // Calculate production for elapsed time
        const metalProduced = metalPerHour * elapsedHours
        const crystalProduced = crystalPerHour * elapsedHours
        const deuteriumProduced = deuteriumPerHour * elapsedHours

        // Fusion reactor deuterium consumption (if running)
        let fusionDeuteriumConsumption = 0
        if (planet.fusion_plant > 0) {
          // Fusion reactor consumes 10 * level * 1.1^level deuterium per hour
          fusionDeuteriumConsumption = 10 * planet.fusion_plant * Math.pow(1.1, planet.fusion_plant) * elapsedHours * UNIVERSE_SPEED
        }

        // Calculate new resource amounts (capped at storage)
        const newMetal = Math.min(metalMax, planet.metal + metalProduced)
        const newCrystal = Math.min(crystalMax, planet.crystal + crystalProduced)
        const newDeuterium = Math.min(
          deuteriumMax,
          Math.max(0, planet.deuterium + deuteriumProduced - fusionDeuteriumConsumption)
        )

        // Track stats
        stats.total_metal_produced += metalProduced
        stats.total_crystal_produced += crystalProduced
        stats.total_deuterium_produced += deuteriumProduced - fusionDeuteriumConsumption
        stats.planets_processed++

        // Queue update
        updates.push({
          id: planet.id,
          metal: newMetal,
          crystal: newCrystal,
          deuterium: newDeuterium,
          metal_per_hour: metalPerHour,
          crystal_per_hour: crystalPerHour,
          deuterium_per_hour: deuteriumPerHour,
          energy_used: energy.consumed,
          energy_max: energy.produced,
          last_resource_update: now.toISOString(),
        })
      } catch (error) {
        stats.errors.push({
          planet_id: planet.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Batch update all planets
    if (updates.length > 0) {
      // Supabase doesn't support bulk upsert easily, so we use individual updates
      // For better performance, this could be optimized with a stored procedure
      const updatePromises = updates.map(update =>
        supabase
          .from('player_colonies')
          .update({
            metal: update.metal,
            crystal: update.crystal,
            deuterium: update.deuterium,
            metal_per_hour: update.metal_per_hour,
            crystal_per_hour: update.crystal_per_hour,
            deuterium_per_hour: update.deuterium_per_hour,
            energy_used: update.energy_used,
            energy_max: update.energy_max,
            last_resource_update: update.last_resource_update,
            updated_at: now.toISOString(),
          })
          .eq('id', update.id)
      )

      await Promise.all(updatePromises)
    }

    const duration = Date.now() - startTime

    // Log summary only if there were planets processed with significant production
    const totalProduced = stats.total_metal_produced + stats.total_crystal_produced + stats.total_deuterium_produced
    if (stats.planets_processed > 0 && totalProduced > 0) {
      console.log(
        `[ResourceProduction] Processed ${stats.planets_processed} planets in ${duration}ms. ` +
          `Metal: +${Math.floor(stats.total_metal_produced)}, ` +
          `Crystal: +${Math.floor(stats.total_crystal_produced)}, ` +
          `Deuterium: +${Math.floor(stats.total_deuterium_produced)}`
      )
    }

    return NextResponse.json({
      success: true,
      stats: {
        planets_processed: stats.planets_processed,
        planets_skipped: stats.planets_skipped,
        total_metal_produced: Math.floor(stats.total_metal_produced),
        total_crystal_produced: Math.floor(stats.total_crystal_produced),
        total_deuterium_produced: Math.floor(stats.total_deuterium_produced),
        errors_count: stats.errors.length,
        duration_ms: duration,
      },
      errors: stats.errors.length > 0 ? stats.errors : undefined,
    })
  } catch (error) {
    console.error('[ResourceProduction] Critical error:', error)

    return NextResponse.json(
      {
        error: 'Resource production processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/resources/production
 *
 * Get status and statistics about resource production.
 * Useful for monitoring and debugging.
 */
export async function GET(request: NextRequest) {
  try {
    // Authorization check
    if (!isServiceAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getServiceSupabase()

    const { data: planets, error } = await supabase
      .from('planets_compat')
      .select('id, last_resource_update, metal, crystal, deuterium')
      .eq('destroyed', false)
      .order('last_resource_update', { ascending: true })
      .limit(10)

    if (error) {
      throw new Error(`Failed to fetch planets: ${error.message}`)
    }

    // Calculate stats
    const now = new Date()
    const stats = planets?.map(p => ({
      id: p.id,
      last_update: p.last_resource_update,
      minutes_since_update: Math.floor(
        (now.getTime() - new Date(p.last_resource_update).getTime()) / (1000 * 60)
      ),
      resources: {
        metal: Math.floor(p.metal),
        crystal: Math.floor(p.crystal),
        deuterium: Math.floor(p.deuterium),
      },
    }))

    const { count } = await supabase
      .from('planets_compat')
      .select('id', { count: 'exact', head: true })
      .eq('destroyed', false)

    return NextResponse.json({
      total_planets: count,
      universe_speed: UNIVERSE_SPEED,
      oldest_updates: stats,
      server_time: now.toISOString(),
    })
  } catch (error) {
    console.error('[ResourceProduction] Status error:', error)

    return NextResponse.json(
      {
        error: 'Failed to get status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
