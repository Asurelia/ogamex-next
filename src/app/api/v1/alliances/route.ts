import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'
import { createAllianceService, AllianceError } from '@/lib/alliance'
import type { CreateAllianceRequest } from '@/types/alliance'

/**
 * GET /api/v1/alliances
 * List alliances with pagination and search
 */
async function listAlliances(request: NextRequest, user: AuthenticatedUser) {
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  const search = searchParams.get('search') || undefined

  try {
    const { alliances, total } = await allianceService.listAlliances(page, limit, search)

    return NextResponse.json({
      alliances: alliances.map((alliance) => ({
        id: alliance.id,
        tag: alliance.tag,
        name: alliance.name,
        logo_url: alliance.logo_url,
        description: alliance.description,
        external_text: alliance.external_text,
        member_count: alliance.member_count,
        total_points: alliance.total_points,
        created_at: alliance.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof AllianceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }
    return NextResponse.json({ error: 'Failed to list alliances' }, { status: 500 })
  }
}

/**
 * POST /api/v1/alliances
 * Create a new alliance
 */
async function createAlliance(request: NextRequest, user: AuthenticatedUser) {
  const supabase = getApiSupabase()
  const allianceService = createAllianceService(supabase)

  try {
    const body: CreateAllianceRequest = await request.json()

    // Validate required fields
    if (!body.tag || !body.name) {
      return NextResponse.json(
        { error: 'Tag and name are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      )
    }

    const alliance = await allianceService.createAlliance(user.id, body)

    return NextResponse.json(
      {
        message: 'Alliance created successfully',
        alliance: {
          id: alliance.id,
          tag: alliance.tag,
          name: alliance.name,
          description: alliance.description,
          founder_id: alliance.founder_id,
          leader_id: alliance.leader_id,
          member_count: alliance.member_count,
          total_points: alliance.total_points,
          created_at: alliance.created_at,
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
    console.error('Create alliance error:', error)
    return NextResponse.json({ error: 'Failed to create alliance' }, { status: 500 })
  }
}

export const GET = withAuth(listAlliances)
export const POST = withAuth(createAlliance)
