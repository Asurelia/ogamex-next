/**
 * Vault Upgrade API
 * POST: Upgrade vault capacity
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CartographyService } from '@/lib/exploration'

export async function POST() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const cartographyService = new CartographyService(supabase)
    const result = await cartographyService.upgradeVault(user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        newLevel: result.newLevel,
        newMaxSlots: result.newMaxSlots,
        nextUpgradeCost: result.nextUpgradeCost
      }
    })
  } catch (error) {
    console.error('[Vault Upgrade API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
