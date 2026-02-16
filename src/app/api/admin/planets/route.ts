/**
 * Admin Planet Management API
 * GET /api/admin/planets - List planets with filters
 * PATCH /api/admin/planets - Update planet
 * DELETE /api/admin/planets - Delete planet
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
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

// GET - List planets
export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
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
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// PATCH - Update planet
export const PATCH = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const body = await request.json()
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
    const metadata = getRequestMetadata(request)
    await logAdminAction(supabase, user.id, 'update', {
      entityType: 'planet',
      entityId: id,
      oldValue: existingPlanet,
      newValue: { ...existingPlanet, ...updates },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    })

    return NextResponse.json({
      success: true,
      message: 'Planet updated successfully',
    })
  } catch (error) {
    console.error('Admin planets PATCH error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// DELETE - Delete planet
export const DELETE = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const body = await request.json()
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

    // Check if it's the user's homeworld
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
    const metadata = getRequestMetadata(request)
    await logAdminAction(supabase, user.id, 'delete', {
      entityType: 'planet',
      entityId: id,
      oldValue: existingPlanet,
      newValue: { destroyed: true, admin_reason: reason },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    })

    return NextResponse.json({
      success: true,
      message: 'Planet deleted successfully',
    })
  } catch (error) {
    console.error('Admin planets DELETE error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
})
