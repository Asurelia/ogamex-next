import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - List all formations
export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const { data, error } = await supabase
      .from('game_formations')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Formations] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch formations' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_VIEW)

// POST - Create new formation
export const POST = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const body = await request.json()

    // Validate required fields
    const required = ['formation_key', 'name']
    for (const field of required) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Check if formation_key already exists
    const { data: existing } = await supabase
      .from('game_formations')
      .select('id')
      .eq('formation_key', body.formation_key)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Formation with this key already exists' },
        { status: 400 }
      )
    }

    // Insert formation
    const { data, error } = await supabase
      .from('game_formations')
      .insert({
        formation_key: body.formation_key,
        name: body.name,
        description: body.description || '',
        positions: body.positions || [],
        global_bonuses: body.global_bonuses || {},
        requirements: body.requirements || {},
        composition_modifiers: body.composition_modifiers || [],
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
      entityType: 'formation',
      entityId: data.id,
      newValue: data,
      ...meta,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Formations] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create formation' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_CREATE)
