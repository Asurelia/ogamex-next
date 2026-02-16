/**
 * Admin Planet Management API
 * GET /api/admin/planets - List planets with filters
 * PATCH /api/admin/planets - Update planet
 * DELETE /api/admin/planets - Delete planet
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schemas
const planetFilterSchema = z.object({
  user_id: z.string().uuid().optional(),
  galaxy: z.coerce.number().int().min(1).max(9).optional(),
  system: z.coerce.number().int().min(1).max(499).optional(),
  planet_type: z.enum(['planet', 'moon']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
})

const planetUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(32).optional(),
  metal: z.number().min(0).optional(),
  crystal: z.number().min(0).optional(),
  deuterium: z.number().min(0).optional(),
  fields_max: z.number().int().min(1).max(500).optional(),
})

const planetDeleteSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(3).max(500),
})

// Check admin permission helper
async function checkAdminPermission(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  const { data: adminRole } = await supabase
    .from('admin_roles')
    .select('role, permissions')
    .eq('user_id', user.id)
    .eq('active', true)
    .single()

  if (!adminRole) return { error: 'Admin access required', status: 403 }

  const hasPermission =
    adminRole.role === 'super_admin' ||
    adminRole.role === 'game_master' ||
    adminRole.permissions?.includes('players:modify')

  if (!hasPermission) return { error: 'Insufficient permissions', status: 403 }

  return { user, adminRole }
}

// Log audit entry helper
async function logAudit(
  supabase: ReturnType<typeof createClient>,
  adminId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
  req: NextRequest
) {
  await supabase.from('audit_log').insert({
    admin_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_value: oldValue,
    new_value: newValue,
    ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    user_agent: req.headers.get('user-agent'),
  })
}

// GET - List planets
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await checkAdminPermission(supabase)
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams)
    const filters = planetFilterSchema.parse(searchParams)
    const offset = (filters.page - 1) * filters.limit

    let query = supabase
      .from('planets_compat')
      .select(`
        id,
        user_id,
        name,
        galaxy,
        system,
        position,
        planet_type,
        metal,
        crystal,
        deuterium,
        fields_used,
        fields_max,
        temperature_min,
        temperature_max,
        diameter,
        destroyed,
        created_at,
        users!inner(username)
      `, { count: 'exact' })
      .eq('destroyed', false)
      .order('galaxy', { ascending: true })
      .order('system', { ascending: true })
      .order('position', { ascending: true })
      .range(offset, offset + filters.limit - 1)

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }
    if (filters.galaxy) {
      query = query.eq('galaxy', filters.galaxy)
    }
    if (filters.system) {
      query = query.eq('system', filters.system)
    }
    if (filters.planet_type) {
      query = query.eq('planet_type', filters.planet_type)
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%`)
    }

    const { data: planets, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: {
        items: planets || [],
        total: count || 0,
        page: filters.page,
        limit: filters.limit,
        has_more: (count || 0) > offset + filters.limit,
      },
    })
  } catch (error) {
    console.error('Admin planets GET error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update planet
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await checkAdminPermission(supabase)
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await req.json()
    const { id, ...updates } = planetUpdateSchema.parse(body)

    // Get current planet data
    const { data: existingPlanet } = await supabase
      .from('planets_compat')
      .select('*')
      .eq('id', id)
      .single()

    if (!existingPlanet) {
      return NextResponse.json(
        { success: false, error: 'Planet not found' },
        { status: 404 }
      )
    }

    // Update planet
    const { error } = await supabase
      .from('planets')
      .update(updates)
      .eq('id', id)

    if (error) throw error

    // Log audit
    await logAudit(
      supabase,
      auth.user.id,
      'update',
      'planet',
      id,
      existingPlanet,
      { ...existingPlanet, ...updates },
      req
    )

    return NextResponse.json({
      success: true,
      message: 'Planet updated successfully',
    })
  } catch (error) {
    console.error('Admin planets PATCH error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete planet
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await checkAdminPermission(supabase)
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await req.json()
    const { id, reason } = planetDeleteSchema.parse(body)

    // Get current planet data
    const { data: existingPlanet } = await supabase
      .from('planets_compat')
      .select('*')
      .eq('id', id)
      .single()

    if (!existingPlanet) {
      return NextResponse.json(
        { success: false, error: 'Planet not found' },
        { status: 404 }
      )
    }

    // Check if it's the user's homeworld (position 1 of first planet)
    const { data: userPlanets } = await supabase
      .from('planets')
      .select('id')
      .eq('user_id', existingPlanet.user_id)
      .eq('destroyed', false)
      .order('created_at', { ascending: true })
      .limit(1)

    if (userPlanets?.[0]?.id === id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete homeworld planet' },
        { status: 400 }
      )
    }

    // Soft delete
    const { error } = await supabase
      .from('planets')
      .update({ destroyed: true })
      .eq('id', id)

    if (error) throw error

    // Log audit
    await logAudit(
      supabase,
      auth.user.id,
      'delete',
      'planet',
      id,
      existingPlanet,
      { destroyed: true, admin_reason: reason },
      req
    )

    return NextResponse.json({
      success: true,
      message: 'Planet deleted successfully',
    })
  } catch (error) {
    console.error('Admin planets DELETE error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
