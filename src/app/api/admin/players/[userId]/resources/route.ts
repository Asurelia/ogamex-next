import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, logAdminAction, getRequestMetadata } from '@/lib/admin/middleware'
import { ADMIN_PERMISSIONS } from '@/types/admin'

// POST - Inject or remove resources
export const POST = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const url = new URL(request.url)
    const userId = url.pathname.split('/').slice(-2)[0]
    const body = await request.json()

    const {
      planet_id,
      metal = 0,
      crystal = 0,
      deuterium = 0,
      dark_matter = 0,
      boost_energy = 0,
      reason,
    } = body

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'Reason is required' },
        { status: 400 }
      )
    }

    const meta = getRequestMetadata(request)
    const results: Array<{ type: string; success: boolean; error?: string }> = []

    // Update planet resources
    if (planet_id && (metal !== 0 || crystal !== 0 || deuterium !== 0)) {
      const { data: planet } = await supabase
        .from('planets')
        .select('metal, crystal, deuterium')
        .eq('id', planet_id)
        .eq('user_id', userId)
        .single()

      if (planet) {
        const { error } = await supabase
          .from('planets')
          .update({
            metal: Math.max(0, planet.metal + metal),
            crystal: Math.max(0, planet.crystal + crystal),
            deuterium: Math.max(0, planet.deuterium + deuterium),
            updated_at: new Date().toISOString(),
          })
          .eq('id', planet_id)

        if (error) {
          results.push({ type: 'planet_resources', success: false, error: error.message })
        } else {
          results.push({ type: 'planet_resources', success: true })

          await logAdminAction(supabase, user.id, 'inject_resources', {
            entityType: 'planet',
            entityId: planet_id,
            oldValue: planet,
            newValue: {
              metal: planet.metal + metal,
              crystal: planet.crystal + crystal,
              deuterium: planet.deuterium + deuterium,
            },
            metadata: { reason, target_user_id: userId },
            ...meta,
          })
        }
      } else {
        results.push({ type: 'planet_resources', success: false, error: 'Planet not found' })
      }
    }

    // Update user currencies
    if (dark_matter !== 0 || boost_energy !== 0) {
      const { data: userData } = await supabase
        .from('users')
        .select('dark_matter, boost_energy')
        .eq('id', userId)
        .single()

      if (userData) {
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        }

        if (dark_matter !== 0) {
          updates.dark_matter = Math.max(0, userData.dark_matter + dark_matter)
        }
        if (boost_energy !== 0) {
          updates.boost_energy = Math.max(0, (userData.boost_energy || 0) + boost_energy)
        }

        const { error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', userId)

        if (error) {
          results.push({ type: 'user_currencies', success: false, error: error.message })
        } else {
          results.push({ type: 'user_currencies', success: true })

          await logAdminAction(supabase, user.id, 'inject_resources', {
            entityType: 'user',
            entityId: userId,
            oldValue: { dark_matter: userData.dark_matter, boost_energy: userData.boost_energy },
            newValue: updates,
            metadata: { reason },
            ...meta,
          })
        }
      }
    }

    const allSuccess = results.every((r) => r.success)

    return NextResponse.json({
      success: allSuccess,
      data: results,
      message: allSuccess
        ? 'Resources updated successfully'
        : 'Some updates failed',
    })
  } catch (error) {
    console.error('[Admin Resources] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update resources' },
      { status: 500 }
    )
  }
}, ADMIN_PERMISSIONS.PLAYERS_RESOURCES)
