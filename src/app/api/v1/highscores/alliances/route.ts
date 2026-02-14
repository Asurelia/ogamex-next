import { NextRequest, NextResponse } from 'next/server'
import { getHighscoreService } from '@/lib/highscore/HighscoreService'

/**
 * GET /api/v1/highscores/alliances
 * Get alliance rankings
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    const offset = (page - 1) * limit
    const service = getHighscoreService()

    const result = await service.getTopAlliances(limit, offset)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching alliance highscores:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alliance highscores' },
      { status: 500 }
    )
  }
}
