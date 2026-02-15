/**
 * Vault Withdraw API
 * POST: Withdraw an item from vault
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CartographyService } from '@/lib/exploration'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { inventoryItemId } = body as { inventoryItemId: string }

    if (!inventoryItemId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: inventoryItemId' },
        { status: 400 }
      )
    }

    const cartographyService = new CartographyService(supabase)
    const result = await cartographyService.withdrawFromVault(user.id, inventoryItemId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Vault Withdraw API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
