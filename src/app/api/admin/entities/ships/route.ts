import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - List all ships
export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const { data, error } = await supabase
      .from('game_ships')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Ships] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ships' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_VIEW)

// POST - Create new ship
export const POST = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const body = await request.json()

    // Validate required fields
    const required = ['key', 'name', 'category', 'cost_metal', 'cost_crystal', 'cost_deuterium']
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
      .from('game_ships')
      .select('id')
      .eq('key', body.key)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Ship with this key already exists' },
        { status: 400 }
      )
    }

    // Insert ship
    const { data, error } = await supabase
      .from('game_ships')
      .insert({
        key: body.key,
        name: body.name,
        category: body.category,
        cost_metal: body.cost_metal,
        cost_crystal: body.cost_crystal,
        cost_deuterium: body.cost_deuterium,
        structural_integrity: body.structural_integrity || 4000,
        shield_power: body.shield_power || 10,
        weapon_power: body.weapon_power || 50,
        speed: body.speed || 12500,
        cargo_capacity: body.cargo_capacity || 50,
        fuel_consumption: body.fuel_consumption || 20,
        drive_type: body.drive_type || 'combustion',
        build_time_factor: body.build_time_factor || 1,
        requirements: body.requirements || {},
        rapid_fire: body.rapid_fire || {},
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
      entityType: 'ship',
      entityId: data.id.toString(),
      newValue: data,
      ...meta,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Ships] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create ship' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_CREATE)
