import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'
import { createAllianceService, AllianceError } from '@/lib/alliance'
import type { CreateDiplomacyRequest, RespondToDiplomacyRequest, DiplomacyRelation } from '@/types/alliance'

interface RouteParams {
  params: Promise<{ allianceId: string }>
}

/**
 * GET /api/v1/alliances/[allianceId]/diplomacy
 * List diplomacy relations
 */
async function listDiplomacy(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    const diplomacy = await allianceService.listDiplomacy(allianceId)

    return NextResponse.json({
      diplomacy: diplomacy.map((d) => ({
        id: d.id,
        alliance_id: d.alliance_id,
        target_alliance_id: d.target_alliance_id,
        target_alliance_name: d.target_alliance_name,
        target_alliance_tag: d.target_alliance_tag,
        relation_type: d.relation_type,
        status: d.status,
        proposed_by: d.proposed_by,
        accepted_by: d.accepted_by,
        created_at: d.created_at,
        expires_at: d.expires_at,
      })),
    })
  } catch (error) {
    if (error instanceof AllianceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json({ error: 'Failed to list diplomacy' }, { status: 500 })
  }
}

/**
 * POST /api/v1/alliances/[allianceId]/diplomacy
 * Propose a diplomacy relation
 */
async function proposeDiplomacy(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    const body: CreateDiplomacyRequest = await request.json()

    if (!body.target_alliance_id || !body.relation_type) {
      return NextResponse.json(
        { error: 'target_alliance_id and relation_type are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      )
    }

    const validTypes: DiplomacyRelation[] = ['war', 'nap', 'ally', 'neutral']
    if (!validTypes.includes(body.relation_type)) {
      return NextResponse.json(
        { error: 'Invalid relation_type', code: 'INVALID_TYPE' },
        { status: 400 }
      )
    }

    const diplomacy = await allianceService.proposeDiplomacy(
      allianceId,
      user.id,
      body.target_alliance_id,
      body.relation_type
    )

    return NextResponse.json(
      {
        message: 'Diplomacy proposal sent',
        diplomacy: {
          id: diplomacy.id,
          alliance_id: diplomacy.alliance_id,
          target_alliance_id: diplomacy.target_alliance_id,
          relation_type: diplomacy.relation_type,
          status: diplomacy.status,
          created_at: diplomacy.created_at,
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
    return NextResponse.json({ error: 'Failed to propose diplomacy' }, { status: 500 })
  }
}

/**
 * PATCH /api/v1/alliances/[allianceId]/diplomacy
 * Respond to a diplomacy proposal (requires diplomacy_id in body)
 */
async function respondToDiplomacy(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    const body: RespondToDiplomacyRequest & { diplomacy_id: string } = await request.json()

    if (!body.diplomacy_id || !body.status) {
      return NextResponse.json(
        { error: 'diplomacy_id and status are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      )
    }

    if (!['active', 'rejected'].includes(body.status)) {
      return NextResponse.json(
        { error: 'status must be "active" or "rejected"', code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    await allianceService.respondToDiplomacy(body.diplomacy_id, user.id, body.status)

    return NextResponse.json({
      message: body.status === 'active' ? 'Diplomacy accepted' : 'Diplomacy rejected',
    })
  } catch (error) {
    if (error instanceof AllianceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json({ error: 'Failed to respond to diplomacy' }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/alliances/[allianceId]/diplomacy
 * Cancel/end a diplomacy relation (requires diplomacy_id in query)
 */
async function cancelDiplomacy(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    const { searchParams } = new URL(request.url)
    const diplomacyId = searchParams.get('diplomacy_id')

    if (!diplomacyId) {
      return NextResponse.json(
        { error: 'diplomacy_id is required', code: 'MISSING_FIELDS' },
        { status: 400 }
      )
    }

    await allianceService.cancelDiplomacy(diplomacyId, allianceId, user.id)

    return NextResponse.json({
      message: 'Diplomacy cancelled',
    })
  } catch (error) {
    if (error instanceof AllianceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json({ error: 'Failed to cancel diplomacy' }, { status: 500 })
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

export const GET = withParams(listDiplomacy)
export const POST = withParams(proposeDiplomacy)
export const PATCH = withParams(respondToDiplomacy)
export const DELETE = withParams(cancelDiplomacy)
