import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - Get single research
export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const id = request.url.split('/').pop()

    const { data, error } = await supabase
      .from('game_research')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Research not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Research] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch research' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_VIEW)

// PUT - Update research
export const PUT = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const id = request.url.split('/').pop()
    const body = await request.json()

    // Get existing research for audit log
    const { data: existing } = await supabase
      .from('game_research')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Research not found' },
        { status: 404 }
      )
    }

    // Update research
    const { data, error } = await supabase
      .from('game_research')
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
      entityType: 'research',
      entityId: id,
      oldValue: existing,
      newValue: data,
      ...meta,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Research] PUT Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update research' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_UPDATE)

// DELETE - Delete research
export const DELETE = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const id = request.url.split('/').pop()

    // Get existing research for audit log
    const { data: existing } = await supabase
      .from('game_research')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Research not found' },
        { status: 404 }
      )
    }

    // Delete research
    const { error } = await supabase
      .from('game_research')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    // Log action
    const meta = getRequestMetadata(request)
    await logAdminAction(supabase, user.id, 'delete', {
      entityType: 'research',
      entityId: id,
      oldValue: existing,
      ...meta,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Research] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete research' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_DELETE)
