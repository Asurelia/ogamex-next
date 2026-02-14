import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'
import { createAllianceService, AllianceError } from '@/lib/alliance'
import type { ProcessApplicationRequest } from '@/types/alliance'

interface RouteParams {
  params: Promise<{ allianceId: string; appId: string }>
}

/**
 * PATCH /api/v1/alliances/[allianceId]/applications/[appId]
 * Process application (accept/reject)
 */
async function processApplication(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId, appId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    const body: ProcessApplicationRequest = await request.json()

    if (!body.status || !['accepted', 'rejected'].includes(body.status)) {
      return NextResponse.json(
        { error: 'status must be "accepted" or "rejected"', code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    await allianceService.processApplication(allianceId, appId, user.id, body.status)

    return NextResponse.json({
      message: `Application ${body.status} successfully`,
    })
  } catch (error) {
    if (error instanceof AllianceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json({ error: 'Failed to process application' }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/alliances/[allianceId]/applications/[appId]
 * Cancel application (applicant only)
 */
async function cancelApplication(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId, appId } = await params
  const supabase = getApiSupabase()

  try {
    // Check if user owns this application
    const { data: app, error: appError } = await supabase
      .from('alliance_applications')
      .select('user_id')
      .eq('id', appId)
      .eq('alliance_id', allianceId)
      .single()

    if (appError || !app) {
      return NextResponse.json(
        { error: 'Application not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (app.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only cancel your own applications', code: 'PERMISSION_DENIED' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('alliance_applications')
      .delete()
      .eq('id', appId)

    if (error) {
      throw new Error('Failed to cancel application')
    }

    return NextResponse.json({
      message: 'Application cancelled successfully',
    })
  } catch (error) {
    if (error instanceof AllianceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json({ error: 'Failed to cancel application' }, { status: 500 })
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

export const PATCH = withParams(processApplication)
export const DELETE = withParams(cancelApplication)
