/**
 * ACS Invitations List Routes
 *
 * GET /api/v1/acs/invitations - Get user's pending invitations
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'

/**
 * GET /api/v1/acs/invitations
 * Get all pending invitations for the authenticated user
 */
async function getInvitations(request: NextRequest, user: AuthenticatedUser) {
  const supabase = getApiSupabase()

  const { searchParams } = new URL(request.url)
  const includePast = searchParams.get('include_past') === 'true'

  let query = supabase
    .from('acs_invitations')
    .select(`
      *,
      acs_operations (
        id,
        name,
        type,
        target_galaxy,
        target_system,
        target_position,
        scheduled_arrival,
        status,
        organizer_id
      ),
      inviter:invited_by (
        id,
        username
      )
    `)
    .eq('invited_user_id', user.id)
    .order('created_at', { ascending: false })

  if (!includePast) {
    query = query.eq('status', 'pending')
  }

  const { data: invitations, error } = await query

  if (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    invitations: invitations.map((inv) => ({
      id: inv.id,
      acs_operation_id: inv.acs_operation_id,
      status: inv.status,
      message: inv.message,
      expires_at: inv.expires_at,
      created_at: inv.created_at,
      operation: inv.acs_operations ? {
        id: inv.acs_operations.id,
        name: inv.acs_operations.name,
        type: inv.acs_operations.type,
        target_coordinates: `[${inv.acs_operations.target_galaxy}:${inv.acs_operations.target_system}:${inv.acs_operations.target_position}]`,
        scheduled_arrival: inv.acs_operations.scheduled_arrival,
        status: inv.acs_operations.status,
      } : null,
      inviter: inv.inviter,
    })),
    total: invitations.length,
  })
}

export const GET = withAuth(getInvitations)
