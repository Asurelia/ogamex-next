/**
 * Galaxies API Endpoint
 * GET /api/v1/universe/galaxies - List all galaxies
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GalaxyService } from '@/lib/galaxy'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const galaxyService = new GalaxyService(supabase)

    const galaxies = await galaxyService.getAllGalaxies()

    // Optionally get colonization statistics
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('stats') === 'true'

    if (includeStats) {
      // Get colonized counts per galaxy
      const { data: colonyStats } = await supabase
        .from('player_colonies')
        .select(`
          celestial_body_id,
          celestial_bodies!inner (
            solar_systems!inner (
              galaxies!inner (
                galaxy_index
              )
            )
          )
        `)
        .eq('destroyed', false)

      const colonyCounts = new Map<number, number>()
      for (const colony of colonyStats || []) {
        const galaxyIndex = (colony as any).celestial_bodies.solar_systems.galaxies.galaxy_index
        colonyCounts.set(galaxyIndex, (colonyCounts.get(galaxyIndex) || 0) + 1)
      }

      return NextResponse.json({
        galaxies: galaxies.map(g => ({
          ...g,
          colonizedSystems: colonyCounts.get(g.galaxyIndex) || 0,
        })),
      })
    }

    return NextResponse.json({ galaxies })
  } catch (error) {
    console.error('[Galaxies API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch galaxies' },
      { status: 500 }
    )
  }
}
