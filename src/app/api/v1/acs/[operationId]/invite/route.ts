/**
 * ACS Invitation Routes
 *
 * POST /api/v1/acs/[operationId]/invite - Invite a user to join
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'
import { createACSService } from '@/lib/acs'

/**
 * POST /api/v1/acs/[operationId]/invite
 * Invite a user to join an ACS operation
 *
 * Body: {
 *   user_id: string,
 *   message?: string
 * }
 */
async function inviteUser(request: NextRequest, user: AuthenticatedUser) {
  const supabase = getApiSupabase()
  const acsService = createACSService(supabase)

  // Extract operationId from URL
  const operationId = request.url.split('/acs/')[1]?.split('/')[0]

  if (!operationId) {
    return NextResponse.json(
      { success: false, error: 'Operation ID is required' },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()

    if (!body.user_id) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Verify the target user exists
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', body.user_id)
      .single()

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Cannot invite yourself
    if (body.user_id === user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot invite yourself' },
        { status: 400 }
      )
    }

    const result = await acsService.inviteToACS(user.id, {
      operation_id: operationId,
      user_id: body.user_id,
      message: body.message,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // Send notification message to the invited user
    await supabase.from('messages').insert({
      user_id: body.user_id,
      sender_id: user.id,
      type: 'alliance',
      subject: 'ACS Operation Invitation',
      body: `You have been invited to join an ACS operation by ${user.username}.${
        body.message ? `\n\nMessage: ${body.message}` : ''
      }\n\nOperation ID: ${operationId}`,
      read: false,
      deleted: false,
    })

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${targetUser.username}`,
      invitation: {
        id: result.invitation!.id,
        invited_user: {
          id: targetUser.id,
          username: targetUser.username,
        },
        status: result.invitation!.status,
        expires_at: result.invitation!.expires_at.toISOString(),
      },
    })
  } catch (error) {
    console.error('ACS invite error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(inviteUser)
