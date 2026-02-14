import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'
import { createAllianceService, AllianceError } from '@/lib/alliance'
import type { InviteToAllianceRequest, UpdateMemberRankRequest, AllianceRank } from '@/types/alliance'

interface RouteParams {
  params: Promise<{ allianceId: string }>
}

/**
 * GET /api/v1/alliances/[allianceId]/members
 * List alliance members
 */
async function listMembers(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    const members = await allianceService.listMembers(allianceId)

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        username: m.username,
        rank: m.rank,
        points: m.points,
        planets_count: m.planets_count,
        joined_at: m.joined_at,
      })),
      total: members.length,
    })
  } catch (error) {
    if (error instanceof AllianceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json({ error: 'Failed to list members' }, { status: 500 })
  }
}

/**
 * POST /api/v1/alliances/[allianceId]/members
 * Invite a user to the alliance
 */
async function inviteMember(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    const body: InviteToAllianceRequest = await request.json()

    if (!body.user_id) {
      return NextResponse.json(
        { error: 'user_id is required', code: 'MISSING_FIELDS' },
        { status: 400 }
      )
    }

    const invitation = await allianceService.inviteToAlliance(
      allianceId,
      user.id,
      body.user_id,
      body.message
    )

    return NextResponse.json(
      {
        message: 'Invitation sent successfully',
        invitation: {
          id: invitation.id,
          invited_user_id: invitation.invited_user_id,
          expires_at: invitation.expires_at,
          created_at: invitation.created_at,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof AllianceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json({ error: 'Failed to invite member' }, { status: 500 })
  }
}

/**
 * PATCH /api/v1/alliances/[allianceId]/members
 * Update member rank (requires user_id and rank in body)
 */
async function updateMemberRank(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    const body: UpdateMemberRankRequest & { user_id: string } = await request.json()

    if (!body.user_id || !body.rank) {
      return NextResponse.json(
        { error: 'user_id and rank are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      )
    }

    const validRanks: AllianceRank[] = ['founder', 'leader', 'officer', 'veteran', 'member', 'newbie']
    if (!validRanks.includes(body.rank)) {
      return NextResponse.json(
        { error: 'Invalid rank', code: 'INVALID_RANK' },
        { status: 400 }
      )
    }

    await allianceService.updateMemberRank(allianceId, user.id, body.user_id, body.rank)

    return NextResponse.json({
      message: 'Member rank updated successfully',
    })
  } catch (error) {
    if (error instanceof AllianceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json({ error: 'Failed to update member rank' }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/alliances/[allianceId]/members
 * Kick a member or leave alliance (requires user_id in query or body)
 */
async function removeMember(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    const { searchParams } = new URL(request.url)
    let targetUserId = searchParams.get('user_id')

    // If no user_id in query, try body
    if (!targetUserId) {
      try {
        const body = await request.json()
        targetUserId = body.user_id
      } catch {
        // No body, default to self (leave)
      }
    }

    // If still no user_id, treat as leave
    if (!targetUserId) {
      await allianceService.leaveAlliance(allianceId, user.id)
      return NextResponse.json({
        message: 'You have left the alliance',
      })
    }

    // If user_id is self, leave
    if (targetUserId === user.id) {
      await allianceService.leaveAlliance(allianceId, user.id)
      return NextResponse.json({
        message: 'You have left the alliance',
      })
    }

    // Otherwise, kick member
    await allianceService.kickMember(allianceId, user.id, targetUserId)

    return NextResponse.json({
      message: 'Member kicked successfully',
    })
  } catch (error) {
    if (error instanceof AllianceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}

// Wrapper to pass params to handlers
function withParams(
  handler: (
    request: NextRequest,
    user: AuthenticatedUser,
    context: RouteParams
  ) => Promise<NextResponse>
) {
  return (request: NextRequest, context: RouteParams) => {
    return withAuth((req, user) => handler(req, user, context))(request)
  }
}

export const GET = withParams(listMembers)
export const POST = withParams(inviteMember)
export const PATCH = withParams(updateMemberRank)
export const DELETE = withParams(removeMember)
