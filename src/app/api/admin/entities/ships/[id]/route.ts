import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - Get single ship
export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const id = request.url.split('/').pop()

    const { data, error } = await supabase
      .from('game_ships')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Ship not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Ships] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ship' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_VIEW)

// PUT - Update ship
export const PUT = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const id = request.url.split('/').pop()
    const body = await request.json()

    // Get existing ship for audit log
    const { data: existing } = await supabase
      .from('game_ships')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Ship not found' },
        { status: 404 }
      )
    }

    // Update ship
    const { data, error } = await supabase
      .from('game_ships')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Log action
    const meta = getRequestMetadata(request)
    await logAdminAction(supabase, user.id, 'update', {
      entityType: 'ship',
      entityId: id,
      oldValue: existing,
      newValue: data,
      ...meta,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Ships] PUT Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update ship' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_UPDATE)

// DELETE - Delete ship
export const DELETE = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const id = request.url.split('/').pop()

    // Get existing ship for audit log
    const { data: existing } = await supabase
      .from('game_ships')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Ship not found' },
        { status: 404 }
      )
    }

    // Delete ship
    const { error } = await supabase
      .from('game_ships')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    // Log action
    const meta = getRequestMetadata(request)
    await logAdminAction(supabase, user.id, 'delete', {
      entityType: 'ship',
      entityId: id,
      oldValue: existing,
      ...meta,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Ships] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete ship' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_DELETE)
