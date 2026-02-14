import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'
import { createAllianceService, AllianceError } from '@/lib/alliance'
import type { SendCircularRequest } from '@/types/alliance'

interface RouteParams {
  params: Promise<{ allianceId: string }>
}

/**
 * GET /api/v1/alliances/[allianceId]/circulars
 * List circular messages (members only)
 */
async function listCirculars(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

  try {
    const circulars = await allianceService.listCirculars(allianceId, user.id, limit)

    return NextResponse.json({
      circulars: circulars.map((c) => ({
        id: c.id,
        subject: c.subject,
        body: c.body,
        sender_id: c.sender_id,
        sender_username: c.sender_username,
        created_at: c.created_at,
      })),
    })
  } catch (error) {
    if (error instanceof AllianceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json({ error: 'Failed to list circulars' }, { status: 500 })
  }
}

/**
 * POST /api/v1/alliances/[allianceId]/circulars
 * Send a circular message (officers+ only)
 */
async function sendCircular(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    const body: SendCircularRequest = await request.json()

    if (!body.subject || !body.body) {
      return NextResponse.json(
        { error: 'subject and body are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      )
    }

    const circular = await allianceService.sendCircular(
      allianceId,
      user.id,
      body.subject,
      body.body
    )

    return NextResponse.json(
      {
        message: 'Circular sent successfully',
        circular: {
          id: circular.id,
          subject: circular.subject,
          created_at: circular.created_at,
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
    return NextResponse.json({ error: 'Failed to send circular' }, { status: 500 })
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

export const GET = withParams(listCirculars)
export const POST = withParams(sendCircular)
