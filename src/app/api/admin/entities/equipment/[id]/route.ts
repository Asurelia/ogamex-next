import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - Get single equipment template
export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const id = request.url.split('/').pop()

    const { data, error } = await supabase
      .from('game_equipment_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Equipment template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Equipment] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch equipment template' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_VIEW)

// PUT - Update equipment template
export const PUT = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const id = request.url.split('/').pop()
    const body = await request.json()

    // Get existing template for audit log
    const { data: existing } = await supabase
      .from('game_equipment_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Equipment template not found' },
        { status: 404 }
      )
    }

    // Update template
    const { data, error } = await supabase
      .from('game_equipment_templates')
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
      entityType: 'equipment_template',
      entityId: id,
      oldValue: existing,
      newValue: data,
      ...meta,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Equipment] PUT Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update equipment template' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_UPDATE)

// DELETE - Delete equipment template
export const DELETE = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const id = request.url.split('/').pop()

    // Get existing template for audit log
    const { data: existing } = await supabase
      .from('game_equipment_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Equipment template not found' },
        { status: 404 }
      )
    }

    // Delete template
    const { error } = await supabase
      .from('game_equipment_templates')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    // Log action
    const meta = getRequestMetadata(request)
    await logAdminAction(supabase, user.id, 'delete', {
      entityType: 'equipment_template',
      entityId: id,
      oldValue: existing,
      ...meta,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Equipment] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete equipment template' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_DELETE)
