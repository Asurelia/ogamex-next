/**
 * Admin Fleet Management API
 * GET /api/admin/fleets - List fleets with filters
 * POST /api/admin/fleets - Create fleet (admin spawning)
 * DELETE /api/admin/fleets - Bulk delete fleets
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schemas
const fleetFilterSchema = z.object({
  user_id: z.string().uuid().optional(),
  mission_type: z.string().optional(),
  status: z.enum(['active', 'returning', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
})

const fleetDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
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

  // Check specific permission
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

// GET - List fleets
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await checkAdminPermission(supabase)
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    // Parse query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams)
    const filters = fleetFilterSchema.parse(searchParams)
    const offset = (filters.page - 1) * filters.limit

    // Build query
    let query = supabase
      .from('fleet_missions')
      .select(`
        id,
        user_id,
        origin_planet_id,
        target_galaxy,
        target_system,
        target_position,
        mission_type,
        ships,
        cargo_metal,
        cargo_crystal,
        cargo_deuterium,
        departure_time,
        arrival_time,
        returning,
        cancelled,
        created_at,
        users!inner(username),
        planets!fleet_missions_origin_planet_id_fkey(name, galaxy, system, position)
      `, { count: 'exact' })
      .order('arrival_time', { ascending: true })
      .range(offset, offset + filters.limit - 1)

    // Apply filters
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }
    if (filters.mission_type) {
      query = query.eq('mission_type', filters.mission_type)
    }
    if (filters.status === 'active') {
      query = query.eq('returning', false).eq('cancelled', false)
    } else if (filters.status === 'returning') {
      query = query.eq('returning', true).eq('cancelled', false)
    }
    if (filters.search) {
      query = query.or(`mission_type.ilike.%${filters.search}%`)
    }

    const { data: fleets, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: {
        items: fleets || [],
        total: count || 0,
        page: filters.page,
        limit: filters.limit,
        has_more: (count || 0) > offset + filters.limit,
      },
    })
  } catch (error) {
    console.error('Admin fleets GET error:', error)
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

// DELETE - Bulk delete/cancel fleets
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await checkAdminPermission(supabase)
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await req.json()
    const { ids, reason } = fleetDeleteSchema.parse(body)

    // Get current fleet data for audit
    const { data: existingFleets } = await supabase
      .from('fleet_missions')
      .select('*')
      .in('id', ids)

    // Cancel/delete fleets
    const { error } = await supabase
      .from('fleet_missions')
      .update({ cancelled: true })
      .in('id', ids)

    if (error) throw error

    // Log each deletion
    for (const fleet of existingFleets || []) {
      await logAudit(
        supabase,
        auth.user.id,
        'delete',
        'fleet_mission',
        fleet.id,
        fleet,
        { cancelled: true, admin_reason: reason },
        req
      )
    }

    return NextResponse.json({
      success: true,
      data: { deleted: ids.length },
      message: `${ids.length} fleet(s) cancelled`,
    })
  } catch (error) {
    console.error('Admin fleets DELETE error:', error)
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
