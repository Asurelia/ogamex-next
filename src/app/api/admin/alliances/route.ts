/**
 * Admin Alliance Management API
 * GET /api/admin/alliances - List alliances with filters
 * PATCH /api/admin/alliances - Update alliance
 * DELETE /api/admin/alliances - Delete alliance
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schemas
const allianceFilterSchema = z.object({
  min_members: z.coerce.number().int().min(0).optional(),
  max_members: z.coerce.number().int().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
})

const allianceUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3).max(32).optional(),
  tag: z.string().min(2).max(8).toUpperCase().optional(),
  description: z.string().max(2000).optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
  homepage: z.string().url().optional().nullable(),
  application_open: z.boolean().optional(),
})

const allianceDeleteSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(3).max(500),
})

const allianceMemberActionSchema = z.object({
  alliance_id: z.string().uuid(),
  user_id: z.string().uuid(),
  action: z.enum(['add', 'remove', 'set_rank']),
  rank: z.enum(['leader', 'co_leader', 'officer', 'veteran', 'member', 'applicant']).optional(),
  reason: z.string().min(3).max(500).optional(),
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

// GET - List alliances
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await checkAdminPermission(supabase)
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams)
    const filters = allianceFilterSchema.parse(searchParams)
    const offset = (filters.page - 1) * filters.limit

    // First get alliances with member counts
    let query = supabase
      .from('alliances')
      .select(`
        id,
        name,
        tag,
        description,
        logo_url,
        homepage,
        application_open,
        created_at,
        founder_id,
        users!alliances_founder_id_fkey(username)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + filters.limit - 1)

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,tag.ilike.%${filters.search}%`)
    }

    const { data: alliances, count, error } = await query

    if (error) throw error

    // Get member counts for each alliance
    const allianceIds = alliances?.map(a => a.id) || []
    const { data: memberCounts } = await supabase
      .from('users')
      .select('alliance_id')
      .in('alliance_id', allianceIds)

    // Count members per alliance
    const memberCountMap: Record<string, number> = {}
    memberCounts?.forEach(m => {
      if (m.alliance_id) {
        memberCountMap[m.alliance_id] = (memberCountMap[m.alliance_id] || 0) + 1
      }
    })

    // Add member count to alliances
    const alliancesWithCounts = alliances?.map(a => ({
      ...a,
      member_count: memberCountMap[a.id] || 0,
      founder_username: (a.users as { username?: string })?.username || null,
    }))

    // Filter by member count if specified
    let filteredAlliances = alliancesWithCounts || []
    if (filters.min_members !== undefined) {
      filteredAlliances = filteredAlliances.filter(a => a.member_count >= (filters.min_members || 0))
    }
    if (filters.max_members !== undefined) {
      filteredAlliances = filteredAlliances.filter(a => a.member_count <= (filters.max_members || 999999))
    }

    return NextResponse.json({
      success: true,
      data: {
        items: filteredAlliances,
        total: count || 0,
        page: filters.page,
        limit: filters.limit,
        has_more: (count || 0) > offset + filters.limit,
      },
    })
  } catch (error) {
    console.error('Admin alliances GET error:', error)
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

// PATCH - Update alliance
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await checkAdminPermission(supabase)
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await req.json()
    const { id, ...updates } = allianceUpdateSchema.parse(body)

    // Get current alliance data
    const { data: existingAlliance } = await supabase
      .from('alliances')
      .select('*')
      .eq('id', id)
      .single()

    if (!existingAlliance) {
      return NextResponse.json(
        { success: false, error: 'Alliance not found' },
        { status: 404 }
      )
    }

    // Check for tag uniqueness if changing tag
    if (updates.tag && updates.tag !== existingAlliance.tag) {
      const { data: existingTag } = await supabase
        .from('alliances')
        .select('id')
        .eq('tag', updates.tag)
        .neq('id', id)
        .single()

      if (existingTag) {
        return NextResponse.json(
          { success: false, error: 'Alliance tag already exists' },
          { status: 400 }
        )
      }
    }

    // Update alliance
    const { error } = await supabase
      .from('alliances')
      .update(updates)
      .eq('id', id)

    if (error) throw error

    // Log audit
    await logAudit(
      supabase,
      auth.user.id,
      'update',
      'alliance',
      id,
      existingAlliance,
      { ...existingAlliance, ...updates },
      req
    )

    return NextResponse.json({
      success: true,
      message: 'Alliance updated successfully',
    })
  } catch (error) {
    console.error('Admin alliances PATCH error:', error)
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

// DELETE - Delete alliance
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await checkAdminPermission(supabase)
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await req.json()
    const { id, reason } = allianceDeleteSchema.parse(body)

    // Get current alliance data
    const { data: existingAlliance } = await supabase
      .from('alliances')
      .select('*')
      .eq('id', id)
      .single()

    if (!existingAlliance) {
      return NextResponse.json(
        { success: false, error: 'Alliance not found' },
        { status: 404 }
      )
    }

    // Remove all members from alliance first
    const { error: memberError } = await supabase
      .from('users')
      .update({ alliance_id: null, alliance_rank: null })
      .eq('alliance_id', id)

    if (memberError) throw memberError

    // Delete alliance
    const { error } = await supabase
      .from('alliances')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Log audit
    await logAudit(
      supabase,
      auth.user.id,
      'delete',
      'alliance',
      id,
      existingAlliance,
      { deleted: true, admin_reason: reason },
      req
    )

    return NextResponse.json({
      success: true,
      message: 'Alliance deleted successfully',
    })
  } catch (error) {
    console.error('Admin alliances DELETE error:', error)
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

// POST - Member actions (add/remove/set_rank)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const auth = await checkAdminPermission(supabase)
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await req.json()
    const { alliance_id, user_id, action, rank, reason } = allianceMemberActionSchema.parse(body)

    // Verify alliance exists
    const { data: alliance } = await supabase
      .from('alliances')
      .select('id, name')
      .eq('id', alliance_id)
      .single()

    if (!alliance) {
      return NextResponse.json(
        { success: false, error: 'Alliance not found' },
        { status: 404 }
      )
    }

    // Verify user exists
    const { data: user } = await supabase
      .from('users')
      .select('id, username, alliance_id, alliance_rank')
      .eq('id', user_id)
      .single()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    let updateData: Record<string, string | null> = {}
    let auditAction = ''

    switch (action) {
      case 'add':
        if (user.alliance_id) {
          return NextResponse.json(
            { success: false, error: 'User is already in an alliance' },
            { status: 400 }
          )
        }
        updateData = { alliance_id, alliance_rank: rank || 'member' }
        auditAction = 'add_member'
        break

      case 'remove':
        if (user.alliance_id !== alliance_id) {
          return NextResponse.json(
            { success: false, error: 'User is not in this alliance' },
            { status: 400 }
          )
        }
        updateData = { alliance_id: null, alliance_rank: null }
        auditAction = 'remove_member'
        break

      case 'set_rank':
        if (user.alliance_id !== alliance_id) {
          return NextResponse.json(
            { success: false, error: 'User is not in this alliance' },
            { status: 400 }
          )
        }
        if (!rank) {
          return NextResponse.json(
            { success: false, error: 'Rank is required for set_rank action' },
            { status: 400 }
          )
        }
        updateData = { alliance_rank: rank }
        auditAction = 'change_rank'
        break
    }

    // Update user
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user_id)

    if (error) throw error

    // Log audit
    await logAudit(
      supabase,
      auth.user.id,
      auditAction,
      'alliance_member',
      user_id,
      { alliance_id: user.alliance_id, alliance_rank: user.alliance_rank },
      { alliance_id: updateData.alliance_id, alliance_rank: updateData.alliance_rank, reason },
      req
    )

    return NextResponse.json({
      success: true,
      message: `Member ${action} successful`,
    })
  } catch (error) {
    console.error('Admin alliances POST error:', error)
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
