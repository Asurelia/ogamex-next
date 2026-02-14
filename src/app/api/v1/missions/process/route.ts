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
import { createClient } from '@supabase/supabase-js'
import { createMissionProcessor } from '@/lib/missions'

// Service client with admin privileges
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

/**
 * Validate the request is authorized to process missions
 */
function isAuthorized(request: NextRequest): boolean {
  // Method 1: Cron secret header (for scheduled jobs)
  const cronSecret = request.headers.get('x-cron-secret')
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    return true
  }

  // Method 2: Service API key (for internal services)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (token === process.env.MISSION_PROCESSOR_API_KEY) {
      return true
    }
  }

  // Method 3: Supabase webhook signature (for database triggers)
  const webhookSecret = request.headers.get('x-supabase-webhook-secret')
  if (webhookSecret && webhookSecret === process.env.SUPABASE_WEBHOOK_SECRET) {
    return true
  }

  // In development, allow without auth for testing
  if (process.env.NODE_ENV === 'development') {
    const allowDevProcessing = request.headers.get('x-dev-mode') === 'true'
    if (allowDevProcessing) {
      return true
    }
  }

  return false
}

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
    if (!isAuthorized(request)) {
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

    const supabase = getServiceClient()
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

    // Log summary
    console.log(
      `[MissionProcessor] Processed ${result.processedCount} missions in ${duration}ms. ` +
        `Errors: ${result.errors.length}`
    )

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
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getServiceClient()
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
