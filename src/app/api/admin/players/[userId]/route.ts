import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - Get player details
export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const userId = request.url.split('/').pop()

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get planets
    const { data: planets } = await supabase
      .from('planets')
      .select('*')
      .eq('user_id', userId)
      .eq('destroyed', false)
      .order('created_at', { ascending: true })

    // Get research
    const { data: research } = await supabase
      .from('user_research')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Get active boosts
    const { data: boosts } = await supabase
      .from('user_active_boosts')
      .select('*')
      .eq('user_id', userId)
      .gt('ends_at', new Date().toISOString())

    // Get fleet missions
    const { data: fleets } = await supabase
      .from('fleet_missions')
      .select('id, mission_type, arrives_at, returning, processed')
      .eq('user_id', userId)
      .eq('processed', false)

    // Get highscore
    const { data: highscore } = await supabase
      .from('highscores')
      .select('total_points, rank')
      .eq('user_id', userId)
      .single()

    // Get alliance
    let alliance = null
    if (user.alliance_id) {
      const { data: allianceData } = await supabase
        .from('alliances')
        .select('id, name, tag')
        .eq('id', user.alliance_id)
        .single()
      alliance = allianceData
    }

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        alliance_name: alliance?.name,
        alliance_tag: alliance?.tag,
        planets_count: planets?.length || 0,
        total_points: highscore?.total_points || 0,
        rank: highscore?.rank || 0,
        planets: planets?.map((p) => ({
          id: p.id,
          name: p.name,
          galaxy: p.galaxy,
          system: p.system,
          position: p.position,
          planet_type: p.planet_type,
          metal: p.metal,
          crystal: p.crystal,
          deuterium: p.deuterium,
          fields_used: p.fields_used,
          fields_max: p.fields_max,
        })),
        research: research || {},
        active_boosts: boosts || [],
        fleet_missions: fleets || [],
      },
    })
  } catch (error) {
    console.error('[Admin Players] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch player' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.PLAYERS_VIEW)
