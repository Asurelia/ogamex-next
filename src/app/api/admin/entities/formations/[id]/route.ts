import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - Get single formation
export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const id = request.url.split('/').pop()

    const { data, error } = await supabase
      .from('game_formations')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Formation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Formations] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch formation' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_VIEW)

// PUT - Update formation
export const PUT = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const id = request.url.split('/').pop()
    const body = await request.json()

    // Get existing formation for audit log
    const { data: existing } = await supabase
      .from('game_formations')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Formation not found' },
        { status: 404 }
      )
    }

    // Update formation
    const { data, error } = await supabase
      .from('game_formations')
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
      entityType: 'formation',
      entityId: id,
      oldValue: existing,
      newValue: data,
      ...meta,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Formations] PUT Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update formation' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_UPDATE)

// DELETE - Delete formation
export const DELETE = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const id = request.url.split('/').pop()

    // Get existing formation for audit log
    const { data: existing } = await supabase
      .from('game_formations')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Formation not found' },
        { status: 404 }
      )
    }

    // Delete formation
    const { error } = await supabase
      .from('game_formations')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    // Log action
    const meta = getRequestMetadata(request)
    await logAdminAction(supabase, user.id, 'delete', {
      entityType: 'formation',
      entityId: id,
      oldValue: existing,
      ...meta,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Formations] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete formation' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_DELETE)
