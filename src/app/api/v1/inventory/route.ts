/**
 * Inventory API Routes
 * GET: List all inventory items
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CartographyService } from '@/lib/exploration'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const itemType = searchParams.get('itemType') || undefined
    const location = searchParams.get('location') || undefined

    const cartographyService = new CartographyService(supabase)
    const inventory = await cartographyService.getInventory(user.id, {
      itemType,
      location
    })

    return NextResponse.json({
      success: true,
      data: {
        items: inventory,
        count: inventory.length
      }
    })
  } catch (error) {
    console.error('[Inventory API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
