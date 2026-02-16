import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - Get single building
export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const id = request.url.split('/').pop()

    const { data, error } = await supabase
      .from('game_buildings')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Building not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Buildings] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch building' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_VIEW)

// PUT - Update building
export const PUT = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const id = request.url.split('/').pop()
    const body = await request.json()

    // Get existing building for audit log
    const { data: existing } = await supabase
      .from('game_buildings')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Building not found' },
        { status: 404 }
      )
    }

    // Update building
    const { data, error } = await supabase
      .from('game_buildings')
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
      entityType: 'building',
      entityId: id,
      oldValue: existing,
      newValue: data,
      ...meta,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Buildings] PUT Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update building' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_UPDATE)

// DELETE - Delete building
export const DELETE = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const id = request.url.split('/').pop()

    // Get existing building for audit log
    const { data: existing } = await supabase
      .from('game_buildings')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Building not found' },
        { status: 404 }
      )
    }

    // Delete building
    const { error } = await supabase
      .from('game_buildings')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    // Log action
    const meta = getRequestMetadata(request)
    await logAdminAction(supabase, user.id, 'delete', {
      entityType: 'building',
      entityId: id,
      oldValue: existing,
      ...meta,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Buildings] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete building' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_DELETE)
