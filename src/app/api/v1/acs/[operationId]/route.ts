/**
 * ACS Operation Routes
 *
 * GET /api/v1/acs/[operationId] - Get operation details
 * PATCH /api/v1/acs/[operationId] - Update operation (organizer only)
 * DELETE /api/v1/acs/[operationId] - Cancel operation (organizer only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'
import { createACSService } from '@/lib/acs'

interface RouteParams {
  params: Promise<{ operationId: string }>
}

/**
 * GET /api/v1/acs/[operationId]
 * Get operation details with participants
 */
async function getOperation(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { operationId } = await params
  const supabase = getApiSupabase()
  const acsService = createACSService(supabase)

  const result = await acsService.getOperation(operationId)

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 404 }
    )
  }

  const op = result.operation!

  // Check if user has access (organizer, participant, or invitee)
  const isOrganizer = op.organizer_id === user.id
  const isParticipant = op.participants.some(p => p.user_id === user.id)

  if (!isOrganizer && !isParticipant) {
    // Check if user has a pending invitation
    const { data: invitation } = await supabase
      .from('acs_invitations')
      .select('id')
      .eq('acs_operation_id', operationId)
      .eq('invited_user_id', user.id)
      .single()

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this operation' },
        { status: 403 }
      )
    }
  }

  // Get usernames for participants
  const userIds = [op.organizer_id, ...op.participants.map(p => p.user_id)]
  const { data: users } = await supabase
    .from('users')
    .select('id, username')
    .in('id', userIds)

  const userMap = new Map(users?.map(u => [u.id, u.username]) || [])

  return NextResponse.json({
    success: true,
    operation: {
      id: op.id,
      name: op.name,
      type: op.type,
      target: {
        planet_id: op.target_planet_id,
        coordinates: op.target_coordinates,
      },
      organizer: {
        id: op.organizer_id,
        username: userMap.get(op.organizer_id) || 'Unknown',
      },
      alliance_id: op.alliance_id,
      scheduled_arrival: op.scheduled_arrival.toISOString(),
      hold_time: op.hold_time,
      status: op.status,
      max_participants: op.max_participants,
      participants: op.participants.map(p => ({
        id: p.id,
        user: {
          id: p.user_id,
          username: userMap.get(p.user_id) || 'Unknown',
        },
        ships: p.ships,
        resources: p.resources,
        status: p.status,
        arrival_time: p.arrival_time?.toISOString() || null,
        ships_lost: p.ships_lost,
        loot_share: p.loot_share,
      })),
      is_organizer: isOrganizer,
      is_participant: isParticipant,
      created_at: op.created_at.toISOString(),
      updated_at: op.updated_at.toISOString(),
    },
  })
}

/**
 * PATCH /api/v1/acs/[operationId]
 * Update operation details (organizer only)
 *
 * Body: {
 *   name?: string,
 *   scheduled_arrival?: string,
 *   hold_time?: number
 * }
 */
async function updateOperation(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { operationId } = await params
  const supabase = getApiSupabase()

  try {
    // Check if user is organizer
    const { data: operation } = await supabase
      .from('acs_operations')
      .select('organizer_id, status')
      .eq('id', operationId)
      .single()

    if (!operation) {
      return NextResponse.json(
        { success: false, error: 'Operation not found' },
        { status: 404 }
      )
    }

    if (operation.organizer_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Only the organizer can update the operation' },
        { status: 403 }
      )
    }

    if (operation.status !== 'forming') {
      return NextResponse.json(
        { success: false, error: 'Cannot update operation that is not in forming status' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) {
      updateData.name = body.name
    }

    if (body.scheduled_arrival !== undefined) {
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
      updateData.scheduled_arrival = scheduledArrival.toISOString()
    }

    if (body.hold_time !== undefined) {
      if (body.hold_time < 0 || body.hold_time > 30) {
        return NextResponse.json(
          { success: false, error: 'Hold time must be between 0 and 30 seconds' },
          { status: 400 }
        )
      }
      updateData.hold_time = body.hold_time
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    updateData.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('acs_operations')
      .update(updateData)
      .eq('id', operationId)

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Operation updated successfully',
    })
  } catch (error) {
    console.error('Update ACS operation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update operation' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/acs/[operationId]
 * Cancel operation (organizer only)
 */
async function cancelOperation(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { operationId } = await params
  const supabase = getApiSupabase()
  const acsService = createACSService(supabase)

  const result = await acsService.cancelOperation(user.id, operationId)

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Operation cancelled successfully',
  })
}

// Wrapper functions to pass params
const getHandler = withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
  const operationId = request.url.split('/acs/')[1]?.split('/')[0]?.split('?')[0]
  return getOperation(request, user, { params: Promise.resolve({ operationId }) })
})

const patchHandler = withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
  const operationId = request.url.split('/acs/')[1]?.split('/')[0]?.split('?')[0]
  return updateOperation(request, user, { params: Promise.resolve({ operationId }) })
})

const deleteHandler = withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
  const operationId = request.url.split('/acs/')[1]?.split('/')[0]?.split('?')[0]
  return cancelOperation(request, user, { params: Promise.resolve({ operationId }) })
})

export const GET = getHandler
export const PATCH = patchHandler
export const DELETE = deleteHandler
