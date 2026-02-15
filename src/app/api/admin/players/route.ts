import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - List players with filters
export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('users')
      .select(`
        id,
        username,
        email,
        created_at,
        last_activity,
        dark_matter,
        boost_energy,
        character_class,
        vacation_mode,
        alliance_id
      `, { count: 'exact' })

    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: users, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    // Get planet counts
    const userIds = users?.map((u) => u.id) || []
    const { data: planetCounts } = await supabase
      .from('planets')
      .select('user_id')
      .in('user_id', userIds)
      .eq('destroyed', false)

    const planetCountMap = planetCounts?.reduce((acc, p) => {
      acc[p.user_id] = (acc[p.user_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Get highscores
    const { data: scores } = await supabase
      .from('highscores')
      .select('user_id, total_points, rank')
      .in('user_id', userIds)

    const scoreMap = scores?.reduce((acc, s) => {
      acc[s.user_id] = { total_points: s.total_points, rank: s.rank }
      return acc
    }, {} as Record<string, { total_points: number; rank: number }>) || {}

    // Enrich users
    const enrichedUsers = users?.map((user) => ({
      ...user,
      planets_count: planetCountMap[user.id] || 0,
      total_points: scoreMap[user.id]?.total_points || 0,
      rank: scoreMap[user.id]?.rank || 0,
    }))

    return NextResponse.json({
      success: true,
      data: {
        items: enrichedUsers,
        total: count || 0,
        limit,
        offset,
        has_more: (offset + limit) < (count || 0),
      },
    })
  } catch (error) {
    console.error('[Admin Players] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch players' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.PLAYERS_VIEW)
