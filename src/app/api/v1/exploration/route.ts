/**
 * Exploration API
 * GET: Get visible systems and discoveries
 * POST: Discover a new system
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ExplorationService } from '@/lib/exploration'

// GET /api/v1/exploration
// Query params:
//   - galaxy: number (optional) - filter by galaxy
//   - stats: boolean (optional) - include exploration stats
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const galaxyIndex = searchParams.get('galaxy')
      ? parseInt(searchParams.get('galaxy')!)
      : undefined
    const includeStats = searchParams.get('stats') === 'true'

    const explorationService = new ExplorationService(supabase)

    // Get visible systems
    const systems = await explorationService.getVisibleSystems(user.id, galaxyIndex)

    // Get stats if requested
    let stats = null
    if (includeStats) {
      stats = await explorationService.getExplorationStats(user.id)
    }

    return NextResponse.json({
      systems,
      stats,
      total: systems.length
    })
  } catch (error) {
    console.error('[Exploration API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/v1/exploration
// Body: {
//   galaxyIndex: number,
//   systemIndex: number,
//   discoveryLevel: 'detected' | 'scanned' | 'explored' | 'mapped',
//   discoveredVia: 'probe' | 'exploration_ship' | 'data_card' | 'technology' | 'event',
//   scanQuality?: number (0-100)
// }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      galaxyIndex,
      systemIndex,
      discoveryLevel,
      discoveredVia,
      scanQuality = 0
    } = body

    // Validation
    if (!galaxyIndex || !systemIndex || !discoveryLevel || !discoveredVia) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const validLevels = ['detected', 'scanned', 'explored', 'mapped']
    if (!validLevels.includes(discoveryLevel)) {
      return NextResponse.json(
        { error: 'Invalid discovery level' },
        { status: 400 }
      )
    }

    const validMethods = ['probe', 'exploration_ship', 'data_card', 'technology', 'event', 'starting']
    if (!validMethods.includes(discoveredVia)) {
      return NextResponse.json(
        { error: 'Invalid discovery method' },
        { status: 400 }
      )
    }

    const explorationService = new ExplorationService(supabase)

    const result = await explorationService.discoverSystem(
      user.id,
      galaxyIndex,
      systemIndex,
      discoveryLevel,
      discoveredVia,
      Math.min(100, Math.max(0, scanQuality))
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to discover system' },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Exploration API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
