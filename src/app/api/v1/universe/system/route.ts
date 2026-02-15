/**
 * Solar System API Endpoint
 * GET /api/v1/universe/system?galaxy=X&system=Y - Get/generate a solar system
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GalaxyService } from '@/lib/galaxy'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const galaxyIndex = searchParams.get('galaxy')
    const systemIndex = searchParams.get('system')

    if (!galaxyIndex || !systemIndex) {
      return NextResponse.json(
        { error: 'Missing galaxy or system parameter' },
        { status: 400 }
      )
    }

    const galaxyNum = parseInt(galaxyIndex, 10)
    const systemNum = parseInt(systemIndex, 10)

    if (isNaN(galaxyNum) || isNaN(systemNum)) {
      return NextResponse.json(
        { error: 'Invalid galaxy or system parameter' },
        { status: 400 }
      )
    }

    // Validate ranges
    if (galaxyNum < 1 || galaxyNum > 100) {
      return NextResponse.json(
        { error: 'Galaxy must be between 1 and 100' },
        { status: 400 }
      )
    }

    if (systemNum < 1 || systemNum > 200) {
      return NextResponse.json(
        { error: 'System must be between 1 and 200' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const galaxyService = new GalaxyService(supabase)

    // Get or generate the system (lazy loading)
    const system = await galaxyService.getOrGenerateSystem(galaxyNum, systemNum)

    // Get celestial bodies
    const bodies = await galaxyService.getBodiesInSystem(system.id)

    // Get star effects
    const effects = await galaxyService.getStarEffects(system.id)

    // Get colonies in this system
    const { data: coloniesData } = await supabase
      .from('player_colonies')
      .select(`
        id,
        celestial_body_id,
        name,
        user_id,
        users!inner (
          username,
          alliances (
            tag
          )
        )
      `)
      .in('celestial_body_id', bodies.map(b => b.id))
      .eq('destroyed', false)

    const colonies = (coloniesData || []).map((colony: any) => ({
      bodyId: colony.celestial_body_id,
      colonyId: colony.id,
      userId: colony.user_id,
      username: colony.users.username,
      colonyName: colony.name,
      allianceTag: colony.users.alliances?.tag,
    }))

    return NextResponse.json({
      system,
      bodies,
      effects,
      colonies,
    })
  } catch (error) {
    console.error('[System API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch solar system' },
      { status: 500 }
    )
  }
}
