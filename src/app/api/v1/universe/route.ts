/**
 * Universe API Endpoint
 * GET /api/v1/universe - Get universe configuration and statistics
 * POST /api/v1/universe/init - Initialize universe (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GalaxyService } from '@/lib/galaxy'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const galaxyService = new GalaxyService(supabase)

    // Get universe config
    const config = await galaxyService.getUniverseConfig()

    if (!config) {
      return NextResponse.json(
        { error: 'Universe not initialized' },
        { status: 404 }
      )
    }

    // Get statistics
    const galaxies = await galaxyService.getAllGalaxies()

    // Count total systems and estimated planets
    const totalSystems = galaxies.reduce((sum, g) => sum + g.systemCount, 0)
    const avgPlanetsPerSystem = 5 // Estimate
    const estimatedPlanets = totalSystems * avgPlanetsPerSystem

    // Get colony count
    const { count: colonyCount } = await supabase
      .from('player_colonies')
      .select('*', { count: 'exact', head: true })
      .eq('destroyed', false)

    // Get unique player count
    const { count: playerCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      config: {
        id: config.id,
        name: config.name,
        masterSeed: config.masterSeed,
        galaxyCount: config.galaxyCount,
        universeSpeed: config.universeSpeed,
        fleetSpeed: config.fleetSpeed,
        resourceMultiplier: config.resourceMultiplier,
        createdAt: config.createdAt,
      },
      statistics: {
        totalGalaxies: galaxies.length,
        totalSystems,
        estimatedPlanets,
        totalColonies: colonyCount || 0,
        totalPlayers: playerCount || 0,
      },
    })
  } catch (error) {
    console.error('[Universe API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch universe data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if universe already exists
    const { data: existingConfig } = await supabase
      .from('universe_config')
      .select('id')
      .limit(1)
      .single()

    if (existingConfig) {
      return NextResponse.json(
        { error: 'Universe already initialized' },
        { status: 400 }
      )
    }

    // Parse request body for optional seed
    const body = await request.json().catch(() => ({}))
    const seed = body.seed ? Number(body.seed) : undefined

    // Initialize universe
    const galaxyService = new GalaxyService(supabase)
    const universeId = await galaxyService.initializeUniverse(seed)

    return NextResponse.json({
      success: true,
      universeId,
      message: 'Universe initialized successfully',
    })
  } catch (error) {
    console.error('[Universe API] Init error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize universe' },
      { status: 500 }
    )
  }
}
