import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'

/**
 * GET /api/v1/galaxy?galaxy=1&system=1
 * Get galaxy view for a specific system
 */
async function getGalaxyView(request: NextRequest, user: AuthenticatedUser) {
  const supabase = getApiSupabase()

  const { searchParams } = new URL(request.url)
  const galaxy = parseInt(searchParams.get('galaxy') || '1')
  const system = parseInt(searchParams.get('system') || '1')

  if (galaxy < 1 || galaxy > 9 || system < 1 || system > 499) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  // Get planets in this system
  const { data: planets } = await supabase
    .from('planets')
    .select(`
      id,
      name,
      position,
      planet_type,
      user_id,
      users!inner(username, alliance_id)
    `)
    .eq('galaxy', galaxy)
    .eq('system', system)
    .eq('destroyed', false)

  // Get debris fields
  const { data: debris } = await supabase
    .from('debris_fields')
    .select('position, metal, crystal')
    .eq('galaxy', galaxy)
    .eq('system', system)

  // Build response
  const positions = []
  for (let pos = 1; pos <= 15; pos++) {
    const planet = planets?.find(p => p.position === pos)
    const debrisField = debris?.find(d => d.position === pos)

    positions.push({
      position: pos,
      planet: planet ? {
        id: planet.id,
        name: planet.name,
        type: planet.planet_type,
        player: {
          id: planet.user_id,
          username: (planet.users as any)?.username,
          is_self: planet.user_id === user.id,
        },
      } : null,
      moon: null, // TODO: Implement moons
      debris: (debrisField?.metal || 0) + (debrisField?.crystal || 0) > 0 ? {
        metal: debrisField?.metal || 0,
        crystal: debrisField?.crystal || 0,
      } : null,
    })
  }

  return NextResponse.json({
    coordinates: { galaxy, system },
    positions,
  })
}

export const GET = withAuth(getGalaxyView)
