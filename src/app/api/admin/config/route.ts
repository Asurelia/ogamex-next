import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// GET - List all config entries
export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let query = supabase.from('game_config').select('*')

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query.order('category').order('key')

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Config] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch config' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.CONFIG_VIEW)

// POST - Bulk update config entries
export const POST = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const body = await request.json()
    const updates: Array<{ key: string; value: unknown }> = body.updates

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      )
    }

    const results = []
    const meta = getRequestMetadata(request)

    for (const update of updates) {
      // Get existing value
      const { data: existing } = await supabase
        .from('game_config')
        .select('*')
        .eq('key', update.key)
        .single()

      if (!existing) {
        results.push({ key: update.key, success: false, error: 'Key not found' })
        continue
      }

      // Update value
      const { error } = await supabase
        .from('game_config')
        .update({
          value: update.value,
          updated_at: new Date().toISOString(),
        })
        .eq('key', update.key)

      if (error) {
        results.push({ key: update.key, success: false, error: error.message })
      } else {
        results.push({ key: update.key, success: true })

        // Log action
        await logAdminAction(supabase, user.id, 'config_update', {
          entityType: 'game_config',
          entityId: update.key,
          oldValue: { value: existing.value },
          newValue: { value: update.value },
          ...meta,
        })
      }
    }

    const allSuccess = results.every((r) => r.success)

    return NextResponse.json({
      success: allSuccess,
      data: results,
      message: allSuccess
        ? 'All configs updated successfully'
        : 'Some configs failed to update',
    })
  } catch (error) {
    console.error('[Admin Config] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update config' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.CONFIG_UPDATE)
