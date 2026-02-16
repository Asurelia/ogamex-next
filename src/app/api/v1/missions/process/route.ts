/**
 * POST /api/v1/missions/process
 *
 * Process pending fleet missions.
 * This endpoint is designed to be called by:
 * - A cron job (e.g., every minute)
 * - A Supabase webhook/trigger
 * - Manual trigger for testing
 *
 * Security:
 * - Requires a valid service API key OR internal cron secret
 * - Rate limited to prevent abuse
 *
 * Response:
 * - 200: Processing completed (even if some missions failed)
 * - 401: Unauthorized
 * - 500: Critical error
 */

import { NextRequest, NextResponse } from 'next/server'
import { createMissionProcessor } from '@/lib/missions'
import { isServiceAuthorized, getServiceSupabase } from '@/lib/api/auth'

// isServiceAuthorized and getServiceSupabase imported from @/lib/api/auth

/**
 * POST /api/v1/missions/process
 *
 * Process all pending fleet missions that have arrived.
 *
 * Query params:
 * - batch_size: Maximum missions to process (default: 100, max: 500)
 * - dry_run: If "true", only return what would be processed without executing
 */
export async function POST(request: NextRequest) {
  try {
    // Authorization check
    if (!isServiceAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse options from query params
    const { searchParams } = new URL(request.url)
    const batchSize = Math.min(
      parseInt(searchParams.get('batch_size') || '100', 10),
      500
    )
    const dryRun = searchParams.get('dry_run') === 'true'

    const supabase = getServiceSupabase()
    const processor = createMissionProcessor(supabase, {
      batchSize,
      continueOnError: true,
      currentTime: new Date(),
    })

    // Dry run mode - just return stats
    if (dryRun) {
      const stats = await processor.getPendingMissionStats()
      return NextResponse.json({
        dry_run: true,
        pending_missions: stats,
        registered_handlers: processor.getRegisteredMissionTypes(),
      })
    }

    // Process missions
    const startTime = Date.now()
    const result = await processor.processPendingMissions()
    const duration = Date.now() - startTime

    // Log summary only if there were missions processed or errors
    if (result.processedCount > 0 || result.errors.length > 0) {
      console.log(
        `[MissionProcessor] Processed ${result.processedCount} missions in ${duration}ms. ` +
          `Errors: ${result.errors.length}`
      )
    }

    // Return result
    return NextResponse.json({
      success: result.success,
      processed_count: result.processedCount,
      duration_ms: duration,
      errors: result.errors.map(e => ({
        mission_id: e.missionId,
        mission_type: e.missionType,
        error: e.error,
        timestamp: e.timestamp,
      })),
    })
  } catch (error) {
    console.error('[MissionProcessor] Critical error:', error)

    return NextResponse.json(
      {
        error: 'Mission processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/missions/process
 *
 * Get status and statistics about pending missions.
 * Useful for monitoring and debugging.
 */
export async function GET(request: NextRequest) {
  try {
    // Authorization check
    if (!isServiceAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getServiceSupabase()
    const processor = createMissionProcessor(supabase)

    // Get pending mission stats
    const stats = await processor.getPendingMissionStats()

    // Get recent mission activity
    const { data: recentMissions } = await supabase
      .from('fleet_missions')
      .select('id, mission_type, arrives_at, processed, is_returning')
      .order('arrives_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      pending: stats,
      registered_handlers: processor.getRegisteredMissionTypes(),
      recent_missions: recentMissions || [],
      server_time: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[MissionProcessor] Status error:', error)

    return NextResponse.json(
      {
        error: 'Failed to get status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
