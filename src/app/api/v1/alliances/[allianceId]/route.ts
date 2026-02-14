import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'
import { createAllianceService, AllianceError } from '@/lib/alliance'
import type { UpdateAllianceRequest } from '@/types/alliance'

interface RouteParams {
  params: Promise<{ allianceId: string }>
}

/**
 * GET /api/v1/alliances/[allianceId]
 * Get alliance details
 */
async function getAlliance(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    const alliance = await allianceService.getAlliance(allianceId)
    if (!alliance) {
      return NextResponse.json(
        { error: 'Alliance not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Get members
    const members = await allianceService.listMembers(allianceId)

    // Get diplomacy
    const diplomacy = await allianceService.listDiplomacy(allianceId)

    // Check if user is a member for internal text
    const userMembership = await allianceService.getMember(allianceId, user.id)

    return NextResponse.json({
      alliance: {
        id: alliance.id,
        tag: alliance.tag,
        name: alliance.name,
        logo_url: alliance.logo_url,
        description: alliance.description,
        external_text: alliance.external_text,
        internal_text: userMembership ? alliance.internal_text : null,
        founder_id: alliance.founder_id,
        leader_id: alliance.leader_id,
        member_count: alliance.member_count,
        total_points: alliance.total_points,
        created_at: alliance.created_at,
      },
      members: members.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        username: m.username,
        rank: m.rank,
        points: m.points,
        planets_count: m.planets_count,
        joined_at: m.joined_at,
      })),
      diplomacy: diplomacy.map((d) => ({
        id: d.id,
        target_alliance_id: d.target_alliance_id,
        target_alliance_name: d.target_alliance_name,
        target_alliance_tag: d.target_alliance_tag,
        relation_type: d.relation_type,
        status: d.status,
        created_at: d.created_at,
      })),
      user_membership: userMembership
        ? {
            rank: userMembership.rank,
            joined_at: userMembership.joined_at,
          }
        : null,
    })
  } catch (error) {
    if (error instanceof AllianceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json({ error: 'Failed to get alliance' }, { status: 500 })
  }
}

/**
 * PATCH /api/v1/alliances/[allianceId]
 * Update alliance details
 */
async function updateAlliance(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    const body: UpdateAllianceRequest = await request.json()

    const alliance = await allianceService.updateAlliance(allianceId, user.id, body)

    return NextResponse.json({
      message: 'Alliance updated successfully',
      alliance: {
        id: alliance.id,
        tag: alliance.tag,
        name: alliance.name,
        description: alliance.description,
        internal_text: alliance.internal_text,
        external_text: alliance.external_text,
        logo_url: alliance.logo_url,
        updated_at: alliance.updated_at,
      },
    })
  } catch (error) {
    if (error instanceof AllianceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json({ error: 'Failed to update alliance' }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/alliances/[allianceId]
 * Delete alliance (founder only)
 */
async function deleteAlliance(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    await allianceService.deleteAlliance(allianceId, user.id)

    return NextResponse.json({
      message: 'Alliance deleted successfully',
    })
  } catch (error) {
    if (error instanceof AllianceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json({ error: 'Failed to delete alliance' }, { status: 500 })
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

export const GET = withParams(getAlliance)
export const PATCH = withParams(updateAlliance)
export const DELETE = withParams(deleteAlliance)
