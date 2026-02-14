import { NextRequest, NextResponse } from 'next/server'
import { getHighscoreService } from '@/lib/highscore/HighscoreService'

/**
 * POST /api/v1/highscores/update
 * Update all highscores and rankings
 *
 * This endpoint should be called by a cron job every hour.
 * It recalculates all player scores, updates rankings, and saves daily history.
 *
 * Headers:
 * - Authorization: Bearer <CRON_SECRET> (required in production)
 *
 * The CRON_SECRET should be set in environment variables for security.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret in production
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('Authorization')
      const token = authHeader?.replace('Bearer ', '')

      if (token !== cronSecret) {
        return NextResponse.json(
          { error: 'Unauthorized. Invalid cron secret.' },
          { status: 401 }
        )
      }
    }

    const startTime = Date.now()
    const service = getHighscoreService()

    // Update all rankings
    const result = await service.updateAllRankings()

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: 'Highscores updated successfully',
      stats: {
        players_updated: result.playersUpdated,
        alliances_updated: result.alliancesUpdated,
        duration_ms: duration,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error updating highscores:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update highscores',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/highscores/update
 * Get the last update status
 */
export async function GET() {
  try {
    const service = getHighscoreService()

    // Get latest update time from player_scores
    const { data, error } = await (service as any).supabase
      .from('player_scores')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error) throw error

    return NextResponse.json({
      last_update: data?.updated_at || null,
      next_update_hint: 'Highscores are updated every hour by cron job',
    })
  } catch (error) {
    console.error('Error getting update status:', error)
    return NextResponse.json(
      { error: 'Failed to get update status' },
      { status: 500 }
    )
  }
}
