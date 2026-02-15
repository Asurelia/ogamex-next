import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - List audit log entries with filters
export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('admin_id')
    const action = searchParams.get('action')
    const entityType = searchParams.get('entity_type')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact' })

    if (adminId) {
      query = query.eq('admin_id', adminId)
    }
    if (action) {
      query = query.eq('action', action)
    }
    if (entityType) {
      query = query.eq('entity_type', entityType)
    }
    if (fromDate) {
      query = query.gte('created_at', fromDate)
    }
    if (toDate) {
      query = query.lte('created_at', toDate)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        items: data,
        total: count || 0,
        limit,
        offset,
        has_more: (offset + limit) < (count || 0),
      },
    })
  } catch (error) {
    console.error('[Admin Audit] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit log' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.AUDIT_VIEW)
