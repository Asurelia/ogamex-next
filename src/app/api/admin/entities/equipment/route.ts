import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - List all equipment templates
export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const { data, error } = await supabase
      .from('game_equipment_templates')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Equipment] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch equipment templates' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_VIEW)

// POST - Create new equipment template
export const POST = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const body = await request.json()

    // Validate required fields
    const required = ['template_key', 'name', 'slot', 'rarity', 'activation_type']
    for (const field of required) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Check if template_key already exists
    const { data: existing } = await supabase
      .from('game_equipment_templates')
      .select('id')
      .eq('template_key', body.template_key)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Equipment template with this key already exists' },
        { status: 400 }
      )
    }

    // Insert equipment template
    const { data, error } = await supabase
      .from('game_equipment_templates')
      .insert({
        template_key: body.template_key,
        name: body.name,
        description: body.description || '',
        slot: body.slot,
        rarity: body.rarity,
        activation_type: body.activation_type,
        compatible_classes: body.compatible_classes || [],
        stat_modifiers: body.stat_modifiers || {},
        abilities: body.abilities || [],
        triggers: body.triggers || [],
        requirements: body.requirements || {},
        install_cost: body.install_cost || { metal: 0, crystal: 0, deuterium: 0 },
        power_consumption: body.power_consumption || 0,
        mass: body.mass || 0,
        uses_remaining: body.uses_remaining,
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
      entityType: 'equipment_template',
      entityId: data.id,
      newValue: data,
      ...meta,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Equipment] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create equipment template' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.ENTITIES_CREATE)
