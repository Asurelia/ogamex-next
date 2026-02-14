import { NextRequest, NextResponse } from 'next/server'
import { getHighscoreService } from '@/lib/highscore/HighscoreService'

/**
 * GET /api/v1/highscores/history
 * Get score history for a player or alliance (for graphs)
 *
 * Query params:
 * - type: 'player' | 'alliance' (required)
 * - id: string (entity ID, required)
 * - days: number (default: 30, max: 365)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const entityType = searchParams.get('type') as 'player' | 'alliance'
    const entityId = searchParams.get('id')
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30', 10)))

    // Validate required params
    if (!entityType || !['player', 'alliance'].includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid or missing type parameter. Must be "player" or "alliance".' },
        { status: 400 }
      )
    }

    if (!entityId) {
      return NextResponse.json(
        { error: 'Missing id parameter.' },
        { status: 400 }
      )
    }

    const service = getHighscoreService()
    const history = await service.getScoreHistory(entityType, entityId, days)

    return NextResponse.json({
      entity_type: entityType,
      entity_id: entityId,
      days,
      history,
    })
  } catch (error) {
    console.error('Error fetching score history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch score history' },
      { status: 500 }
    )
  }
}
