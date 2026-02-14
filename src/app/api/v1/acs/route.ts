/**
 * ACS API Routes
 *
 * GET /api/v1/acs - Get user's ACS operations
 * POST /api/v1/acs - Create new ACS operation
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'
import { createACSService } from '@/lib/acs'
import type { CreateACSOperationParams } from '@/types/acs'

/**
 * GET /api/v1/acs
 * Get all ACS operations for the authenticated user
 *
 * Query params:
 * - include_completed: boolean (default: false)
 */
async function getOperations(request: NextRequest, user: AuthenticatedUser) {
  const supabase = getApiSupabase()
  const acsService = createACSService(supabase)

  const { searchParams } = new URL(request.url)
  const includeCompleted = searchParams.get('include_completed') === 'true'

  const result = await acsService.getUserOperations(user.id, includeCompleted)

  return NextResponse.json({
    success: true,
    operations: result.operations.map(op => ({
      id: op.id,
      name: op.name,
      type: op.type,
      target: {
        planet_id: op.target_planet_id,
        coordinates: op.target_coordinates,
      },
      organizer_id: op.organizer_id,
      alliance_id: op.alliance_id,
      scheduled_arrival: op.scheduled_arrival.toISOString(),
      hold_time: op.hold_time,
      status: op.status,
      max_participants: op.max_participants,
      current_participants: op.participants.length,
      participants: op.participants.map(p => ({
        id: p.id,
        user_id: p.user_id,
        ships: p.ships,
        status: p.status,
        arrival_time: p.arrival_time?.toISOString() || null,
      })),
      created_at: op.created_at.toISOString(),
      updated_at: op.updated_at.toISOString(),
    })),
    total: result.operations.length,
  })
}

/**
 * POST /api/v1/acs
 * Create a new ACS operation
 *
 * Body: {
 *   name: string,
 *   type: 'attack' | 'defend',
 *   target: {
 *     galaxy: number,
 *     system: number,
 *     position: number,
 *     planet_id?: string
 *   },
 *   scheduled_arrival: string (ISO date),
 *   hold_time?: number (seconds, max 30),
 *   alliance_id?: string
 * }
 */
async function createOperation(request: NextRequest, user: AuthenticatedUser) {
  const supabase = getApiSupabase()
  const acsService = createACSService(supabase)

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.type || !body.target || !body.scheduled_arrival) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, type, target, scheduled_arrival' },
        { status: 400 }
      )
    }

    // Validate type
    if (!['attack', 'defend'].includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be "attack" or "defend"' },
        { status: 400 }
      )
    }

    // Validate target coordinates
    const { target } = body
    if (!target.galaxy || !target.system || !target.position) {
      return NextResponse.json(
        { success: false, error: 'Target must include galaxy, system, and position' },
        { status: 400 }
      )
    }

    // Validate hold time
    if (body.hold_time !== undefined && (body.hold_time < 0 || body.hold_time > 30)) {
      return NextResponse.json(
        { success: false, error: 'Hold time must be between 0 and 30 seconds' },
        { status: 400 }
      )
    }

    // Parse scheduled arrival
    const scheduledArrival = new Date(body.scheduled_arrival)
    if (isNaN(scheduledArrival.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid scheduled_arrival date' },
        { status: 400 }
      )
    }

    if (scheduledArrival <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'Scheduled arrival must be in the future' },
        { status: 400 }
      )
    }

    const params: CreateACSOperationParams = {
      name: body.name,
      type: body.type,
      target_galaxy: target.galaxy,
      target_system: target.system,
      target_position: target.position,
      target_planet_id: target.planet_id,
      scheduled_arrival: scheduledArrival,
      hold_time: body.hold_time,
      alliance_id: body.alliance_id,
    }

    const result = await acsService.createACSOperation(user.id, params)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'ACS operation created successfully',
      operation: {
        id: result.operation!.id,
        name: result.operation!.name,
        type: result.operation!.type,
        target: {
          planet_id: result.operation!.target_planet_id,
          coordinates: result.operation!.target_coordinates,
        },
        status: result.operation!.status,
        scheduled_arrival: result.operation!.scheduled_arrival.toISOString(),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Create ACS operation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create ACS operation' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getOperations)
export const POST = withAuth(createOperation)
