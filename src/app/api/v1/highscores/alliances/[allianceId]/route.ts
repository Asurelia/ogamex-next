import { NextRequest, NextResponse } from 'next/server'
import { getHighscoreService } from '@/lib/highscore/HighscoreService'
import { getApiSupabase } from '@/lib/api/auth'
import type { ScoreCategory } from '@/types/highscore'

interface RouteParams {
  params: Promise<{
    allianceId: string
  }>
}

/**
 * GET /api/v1/highscores/alliances/:allianceId
 * Get detailed score information for a specific alliance
 *
 * Query params:
 * - members: boolean (include member list, default: true)
 * - category: 'total' | 'economy' | 'research' | 'military' | 'defense' (for member sorting)
 * - history: boolean (include score history, default: false)
 * - days: number (history days, default: 30)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { allianceId } = await params
    const { searchParams } = new URL(request.url)

    const includeMembers = searchParams.get('members') !== 'false'
    const category = (searchParams.get('category') || 'total') as ScoreCategory
    const includeHistory = searchParams.get('history') === 'true'
    const historyDays = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30', 10)))

    const supabase = getApiSupabase()
    const service = getHighscoreService()

    // Get alliance info
    const { data: alliance, error: allianceError } = await supabase
      .from('alliances')
      .select('id, name, tag, description, logo_url, founder_id, created_at')
      .eq('id', allianceId)
      .single()

    if (allianceError || !alliance) {
      return NextResponse.json(
        { error: 'Alliance not found' },
        { status: 404 }
      )
    }

    // Get alliance score
    const { data: score } = await supabase
      .from('alliance_scores')
      .select('*')
      .eq('alliance_id', allianceId)
      .single()

    const response: any = {
      alliance: {
        id: alliance.id,
        name: alliance.name,
        tag: alliance.tag,
        description: alliance.description,
        logo_url: alliance.logo_url,
        created_at: alliance.created_at,
      },
      score: score ? {
        total_points: score.total_points,
        average_points: score.average_points,
        member_count: score.member_count,
        total_rank: score.total_rank,
        rank_change: score.rank_change,
        updated_at: score.updated_at,
      } : null,
    }

    // Include member list
    if (includeMembers) {
      response.members = await service.getPlayersByAlliance(allianceId, category, 100)
    }

    // Include score history
    if (includeHistory) {
      response.history = await service.getScoreHistory('alliance', allianceId, historyDays)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching alliance details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alliance details' },
      { status: 500 }
    )
  }
}
