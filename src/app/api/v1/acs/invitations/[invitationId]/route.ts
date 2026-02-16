/**
 * ACS Invitation Management Routes
 *
 * GET /api/v1/acs/invitations/[invitationId] - Get invitation details
 * DELETE /api/v1/acs/invitations/[invitationId] - Decline invitation
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'

/**
 * GET /api/v1/acs/invitations/[invitationId]
 * Get invitation details
 */
async function getInvitation(request: NextRequest, user: AuthenticatedUser) {
  const supabase = getApiSupabase()

  // Extract invitationId from URL
  const invitationId = request.url.split('/invitations/')[1]?.split('/')[0]?.split('?')[0]

  if (!invitationId) {
    return NextResponse.json(
      { success: false, error: 'Invitation ID is required' },
      { status: 400 }
    )
  }

  const { data: invitation, error } = await supabase
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
        status
      ),
      inviter:invited_by (
        id,
        username
      )
    `)
    .eq('id', invitationId)
    .eq('invited_user_id', user.id)
    .single()

  if (error || !invitation) {
    return NextResponse.json(
      { success: false, error: 'Invitation not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    invitation: {
      id: invitation.id,
      status: invitation.status,
      message: invitation.message,
      expires_at: invitation.expires_at,
      created_at: invitation.created_at,
      operation: invitation.acs_operations,
      inviter: invitation.inviter,
    },
  })
}

/**
 * DELETE /api/v1/acs/invitations/[invitationId]
 * Decline an invitation
 */
async function declineInvitation(request: NextRequest, user: AuthenticatedUser) {
  const supabase = getApiSupabase()

  // Extract invitationId from URL
  const invitationId = request.url.split('/invitations/')[1]?.split('/')[0]?.split('?')[0]

  if (!invitationId) {
    return NextResponse.json(
      { success: false, error: 'Invitation ID is required' },
      { status: 400 }
    )
  }

  // Check if invitation exists and belongs to user
  const { data: invitation, error: fetchError } = await supabase
    .from('acs_invitations')
    .select('id, status, invited_user_id, acs_operation_id')
    .eq('id', invitationId)
    .single()

  if (fetchError || !invitation) {
    return NextResponse.json(
      { success: false, error: 'Invitation not found' },
      { status: 404 }
    )
  }

  if (invitation.invited_user_id !== user.id) {
    return NextResponse.json(
      { success: false, error: 'You can only decline your own invitations' },
      { status: 403 }
    )
  }

  if (invitation.status !== 'pending') {
    return NextResponse.json(
      { success: false, error: 'Invitation is no longer pending' },
      { status: 400 }
    )
  }

  // Update invitation status to declined
  const { error: updateError } = await supabase
    .from('acs_invitations')
    .update({
      status: 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('id', invitationId)

  if (updateError) {
    return NextResponse.json(
      { success: false, error: 'Failed to decline invitation' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Invitation declined',
  })
}

export const GET = withAuth(getInvitation)
export const DELETE = withAuth(declineInvitation)
