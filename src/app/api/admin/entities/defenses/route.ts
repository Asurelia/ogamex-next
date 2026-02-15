import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - List all defenses
export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const { data, error } = await supabase
      .from('game_defenses')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Defenses] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch defenses' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_VIEW)

// POST - Create new defense
export const POST = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const body = await request.json()

    // Validate required fields
    const required = ['key', 'name', 'cost_metal', 'cost_crystal', 'cost_deuterium']
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
      .from('game_defenses')
      .select('id')
      .eq('key', body.key)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Defense with this key already exists' },
        { status: 400 }
      )
    }

    // Insert defense
    const { data, error } = await supabase
      .from('game_defenses')
      .insert({
        key: body.key,
        name: body.name,
        cost_metal: body.cost_metal,
        cost_crystal: body.cost_crystal,
        cost_deuterium: body.cost_deuterium,
        structural_integrity: body.structural_integrity || 2000,
        shield_power: body.shield_power || 20,
        weapon_power: body.weapon_power || 80,
        build_time_factor: body.build_time_factor || 1,
        requirements: body.requirements || {},
        rapid_fire: body.rapid_fire || {},
        max_per_planet: body.max_per_planet || null,
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
      entityType: 'defense',
      entityId: data.id.toString(),
      newValue: data,
      ...meta,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Defenses] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create defense' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_CREATE)
