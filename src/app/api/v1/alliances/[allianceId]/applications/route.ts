import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'
import { createAllianceService, AllianceError } from '@/lib/alliance'
import type { ApplyToAllianceRequest } from '@/types/alliance'

interface RouteParams {
  params: Promise<{ allianceId: string }>
}

/**
 * GET /api/v1/alliances/[allianceId]/applications
 * List pending applications (officers+ only)
 */
async function listApplications(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    const applications = await allianceService.listApplications(allianceId, user.id)

    return NextResponse.json({
      applications: applications.map((app) => ({
        id: app.id,
        user_id: app.user_id,
        username: app.username,
        message: app.message,
        status: app.status,
        created_at: app.created_at,
      })),
      total: applications.length,
    })
  } catch (error) {
    if (error instanceof AllianceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json({ error: 'Failed to list applications' }, { status: 500 })
  }
}

/**
 * POST /api/v1/alliances/[allianceId]/applications
 * Apply to join alliance
 */
async function applyToAlliance(
  request: NextRequest,
  user: AuthenticatedUser,
  { params }: RouteParams
) {
  const { allianceId } = await params
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    let message: string | undefined

    try {
      const body: ApplyToAllianceRequest = await request.json()
      message = body.message
    } catch {
      // No body is fine
    }

    const application = await allianceService.applyToAlliance(allianceId, user.id, message)

    return NextResponse.json(
      {
        message: 'Application submitted successfully',
        application: {
          id: application.id,
          alliance_id: application.alliance_id,
          status: application.status,
          created_at: application.created_at,
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
    return NextResponse.json({ error: 'Failed to apply to alliance' }, { status: 500 })
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

export const GET = withParams(listApplications)
export const POST = withParams(applyToAlliance)
