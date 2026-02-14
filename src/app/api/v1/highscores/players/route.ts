import { NextRequest, NextResponse } from 'next/server'
import { getHighscoreService } from '@/lib/highscore/HighscoreService'
import type { ScoreCategory } from '@/types/highscore'

/**
 * GET /api/v1/highscores/players
 * Get player rankings
 *
 * Query params:
 * - category: 'total' | 'economy' | 'research' | 'military' | 'defense' (default: 'total')
 * - search: string (search by username)
 * - alliance: string (filter by alliance ID)
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const category = (searchParams.get('category') || 'total') as ScoreCategory
    const search = searchParams.get('search')
    const allianceId = searchParams.get('alliance')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    const offset = (page - 1) * limit
    const service = getHighscoreService()

    // Validate category
    const validCategories: ScoreCategory[] = ['total', 'economy', 'research', 'military', 'defense']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Valid options: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    // Search by username
    if (search) {
      const players = await service.searchPlayers(search, category, limit)
      return NextResponse.json({
        category,
        data: players,
        pagination: {
          page: 1,
          limit,
          total: players.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      })
    }

    // Filter by alliance
    if (allianceId) {
      const players = await service.getPlayersByAlliance(allianceId, category, limit)
      return NextResponse.json({
        category,
        alliance_id: allianceId,
        data: players,
        pagination: {
          page: 1,
          limit,
          total: players.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      })
    }

    // Default: paginated list
    const result = await service.getTopPlayers(category, limit, offset)
    return NextResponse.json({
      category,
      ...result,
    })
  } catch (error) {
    console.error('Error fetching player highscores:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player highscores' },
      { status: 500 }
    )
  }
}
