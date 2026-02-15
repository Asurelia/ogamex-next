import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'
import type { OverviewAnalytics } from '@/types/admin'

export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Get active users (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: activeUsers24h } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('last_activity', oneDayAgo)

    // Get active users (last 7d)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: activeUsers7d } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('last_activity', sevenDaysAgo)

    // Get new users (last 24h)
    const { count: newUsers24h } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', oneDayAgo)

    // Get total planets
    const { count: totalPlanets } = await supabase
      .from('planets')
      .select('*', { count: 'exact', head: true })
      .eq('destroyed', false)

    // Get fleets in motion
    const { count: fleetsInMotion } = await supabase
      .from('fleet_missions')
      .select('*', { count: 'exact', head: true })
      .eq('processed', false)
      .eq('cancelled', false)

    // Get battles in last 24h
    const { count: battles24h } = await supabase
      .from('battle_reports')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', oneDayAgo)

    // Get economy totals
    const { data: economyData } = await supabase
      .from('planets')
      .select('metal, crystal, deuterium')
      .eq('destroyed', false)

    const economy = economyData?.reduce(
      (acc, planet) => ({
        total_metal: acc.total_metal + (planet.metal || 0),
        total_crystal: acc.total_crystal + (planet.crystal || 0),
        total_deuterium: acc.total_deuterium + (planet.deuterium || 0),
      }),
      { total_metal: 0, total_crystal: 0, total_deuterium: 0 }
    ) || { total_metal: 0, total_crystal: 0, total_deuterium: 0 }

    // Get dark matter total
    const { data: dmData } = await supabase
      .from('users')
      .select('dark_matter')

    const totalDarkMatter = dmData?.reduce((acc, user) => acc + (user.dark_matter || 0), 0) || 0

    const analytics: OverviewAnalytics = {
      total_users: totalUsers || 0,
      active_users_24h: activeUsers24h || 0,
      active_users_7d: activeUsers7d || 0,
      new_users_24h: newUsers24h || 0,
      total_planets: totalPlanets || 0,
      total_fleets_in_motion: fleetsInMotion || 0,
      total_battles_24h: battles24h || 0,
      economy: {
        ...economy,
        total_dark_matter: totalDarkMatter,
      },
    }

    return NextResponse.json({ success: true, data: analytics })
  } catch (error) {
    console.error('[Admin Analytics] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load analytics' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ANALYTICS_VIEW)
