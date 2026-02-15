import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'
import { GameConfigService } from '@/lib/game/GameConfigService'

// GET - Get cache status
export const GET = withAdminAuth(async (_request, { supabase: _supabase }) => {
  try {
    const service = GameConfigService.getInstance()

    return NextResponse.json({
      success: true,
      data: {
        initialized: service.isInitialized(),
        cacheAge: service.getCacheAge(),
        cacheAgeFormatted: formatAge(service.getCacheAge()),
      },
    })
  } catch (error) {
    console.error('[Admin Cache] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get cache status' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.CONFIG_VIEW)

// POST - Invalidate cache
export const POST = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const service = GameConfigService.getInstance()
    await service.forceRefresh()

    // Log action
    const meta = getRequestMetadata(request)
    await logAdminAction(supabase, user.id, 'invalidate_cache', {
      entityType: 'game_config_cache',
      metadata: {
        action: 'force_refresh',
      },
      ...meta,
    })

    return NextResponse.json({
      success: true,
      message: 'Cache invalidated successfully',
      data: {
        initialized: service.isInitialized(),
        cacheAge: service.getCacheAge(),
      },
    })
  } catch (error) {
    console.error('[Admin Cache] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to invalidate cache' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.CONFIG_UPDATE)

function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ago`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s ago`
  }
  return `${seconds}s ago`
}
