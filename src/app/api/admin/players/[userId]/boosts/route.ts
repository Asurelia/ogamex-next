import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - Get active boosts
export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const url = new URL(request.url)
    const userId = url.pathname.split('/').slice(-2)[0]

    const { data, error } = await supabase
      .from('user_active_boosts')
      .select('*')
      .eq('user_id', userId)
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Boosts] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch boosts' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.PLAYERS_VIEW)

// POST - Grant boost to player
export const POST = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const url = new URL(request.url)
    const userId = url.pathname.split('/').slice(-2)[0]
    const body = await request.json()

    const {
      boost_type,
      multiplier = 1.5,
      duration_minutes = 60,
      planet_id,
      reason,
    } = body

    if (!boost_type) {
      return NextResponse.json(
        { success: false, error: 'Boost type is required' },
        { status: 400 }
      )
    }

    const now = new Date()
    const endsAt = new Date(now.getTime() + duration_minutes * 60 * 1000)

    const { data, error } = await supabase
      .from('user_active_boosts')
      .insert({
        user_id: userId,
        boost_type,
        multiplier,
        planet_id: planet_id || null,
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Log action
    const meta = getRequestMetadata(request)
    await logAdminAction(supabase, user.id, 'grant_boost', {
      entityType: 'boost',
      entityId: data.id,
      newValue: data,
      metadata: { reason, target_user_id: userId },
      ...meta,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Boosts] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to grant boost' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.PLAYERS_BOOSTS)

// DELETE - Revoke boost
export const DELETE = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const url = new URL(request.url)
    const userId = url.pathname.split('/').slice(-2)[0]
    const { searchParams } = url
    const boostId = searchParams.get('boost_id')

    if (!boostId) {
      return NextResponse.json(
        { success: false, error: 'Boost ID is required' },
        { status: 400 }
      )
    }

    // Get existing boost
    const { data: existing } = await supabase
      .from('user_active_boosts')
      .select('*')
      .eq('id', boostId)
      .eq('user_id', userId)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Boost not found' },
        { status: 404 }
      )
    }

    // Delete boost
    const { error } = await supabase
      .from('user_active_boosts')
      .delete()
      .eq('id', boostId)

    if (error) {
      throw error
    }

    // Log action
    const meta = getRequestMetadata(request)
    await logAdminAction(supabase, user.id, 'revoke_boost', {
      entityType: 'boost',
      entityId: boostId,
      oldValue: existing,
      metadata: { target_user_id: userId },
      ...meta,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Boosts] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to revoke boost' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.PLAYERS_BOOSTS)
