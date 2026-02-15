import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - List all research
export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const { data, error } = await supabase
      .from('game_research')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      throw error
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

// POST - Create new research
export const POST = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const body = await request.json()

    // Validate required fields
    const required = ['key', 'name', 'category', 'base_cost_metal', 'base_cost_crystal', 'base_cost_deuterium', 'price_factor']
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
      .from('game_research')
      .select('id')
      .eq('key', body.key)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Research with this key already exists' },
        { status: 400 }
      )
    }

    // Insert research
    const { data, error } = await supabase
      .from('game_research')
      .insert({
        key: body.key,
        name: body.name,
        category: body.category,
        base_cost_metal: body.base_cost_metal,
        base_cost_crystal: body.base_cost_crystal,
        base_cost_deuterium: body.base_cost_deuterium,
        price_factor: body.price_factor,
        requirements: body.requirements || {},
        max_level: body.max_level || null,
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
      entityType: 'research',
      entityId: data.id.toString(),
      newValue: data,
      ...meta,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Research] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create research' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_CREATE)
