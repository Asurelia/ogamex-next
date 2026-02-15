import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - List all boost types
export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const { data, error } = await supabase
      .from('game_boost_types')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Boosts] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch boost types' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.CONFIG_VIEW)

// POST - Create new boost type
export const POST = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const body = await request.json()

    // Validate required fields
    const required = ['key', 'name', 'icon', 'multiplier', 'duration_minutes', 'energy_cost']
    for (const field of required) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Check if key already exists
    const { data: existing } = await supabase
      .from('game_boost_types')
      .select('id')
      .eq('key', body.key)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Boost type with this key already exists' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('game_boost_types')
      .insert({
        key: body.key,
        name: body.name,
        description: body.description || null,
        icon: body.icon,
        color: body.color || '#00ffcc',
        glow_color: body.glow_color || 'rgba(0, 255, 204, 0.5)',
        multiplier: body.multiplier,
        duration_minutes: body.duration_minutes,
        energy_cost: body.energy_cost,
        scope: body.scope || 'global',
        stackable: body.stackable || false,
        max_stacks: body.max_stacks || 1,
        cooldown_minutes: body.cooldown_minutes || 0,
        enabled: body.enabled ?? true,
        sort_order: body.sort_order || 0,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Log action
    const meta = getRequestMetadata(request)
    await logAdminAction(supabase, user.id, 'create', {
      entityType: 'boost_type',
      entityId: data.id,
      newValue: data,
      ...meta,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Boosts] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create boost type' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.CONFIG_UPDATE)

// PUT - Update boost type
export const PUT = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      )
    }

    // Get existing
    const { data: existing } = await supabase
      .from('game_boost_types')
      .select('*')
      .eq('id', body.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Boost type not found' },
        { status: 404 }
      )
    }

    const { id, ...updateData } = body

    const { data, error } = await supabase
      .from('game_boost_types')
      .update({
        ...updateData,
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
      entityType: 'boost_type',
      entityId: id,
      oldValue: existing,
      newValue: data,
      ...meta,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Boosts] PUT Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update boost type' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.CONFIG_UPDATE)

// DELETE - Delete boost type
export const DELETE = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      )
    }

    // Get existing
    const { data: existing } = await supabase
      .from('game_boost_types')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Boost type not found' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('game_boost_types')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    // Log action
    const meta = getRequestMetadata(request)
    await logAdminAction(supabase, user.id, 'delete', {
      entityType: 'boost_type',
      entityId: id,
      oldValue: existing,
      ...meta,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Boosts] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete boost type' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.CONFIG_UPDATE)
