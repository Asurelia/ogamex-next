import { NextRequest, NextResponse } from 'next/server'
import { getHighscoreService } from '@/lib/highscore/HighscoreService'

interface RouteParams {
  params: Promise<{
    userId: string
  }>
}

/**
 * GET /api/v1/highscores/players/:userId
 * Get detailed score information for a specific player
 *
 * Query params:
 * - history: boolean (include score history, default: false)
 * - days: number (history days, default: 30)
 * - around: boolean (include players around same rank, default: false)
 * - range: number (rank range for 'around', default: 5)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)

    const includeHistory = searchParams.get('history') === 'true'
    const historyDays = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30', 10)))
    const includeAround = searchParams.get('around') === 'true'
    const aroundRange = Math.min(50, Math.max(1, parseInt(searchParams.get('range') || '5', 10)))

    const service = getHighscoreService()

    // Get player score
    const player = await service.getPlayerRank(userId)

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    const response: any = { player }

    // Include score history
    if (includeHistory) {
      response.history = await service.getScoreHistory('player', userId, historyDays)
    }

    // Include players around same rank
    if (includeAround) {
      response.neighbors = await service.getPlayersAroundRank(player.total_rank, 'total', aroundRange)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching player details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player details' },
      { status: 500 }
    )
  }
}
