/**
 * Market Listings API
 * POST: Create a new listing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CartographyService } from '@/lib/exploration'
import type { CreateListingRequest } from '@/lib/exploration'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as CreateListingRequest

    // Validate required fields
    if (!body.inventoryItemId || !body.priceType || body.durationHours === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: inventoryItemId, priceType, durationHours' },
        { status: 400 }
      )
    }

    // Validate duration
    if (body.durationHours < 1 || body.durationHours > 168) { // 1 hour to 7 days
      return NextResponse.json(
        { success: false, error: 'Duration must be between 1 and 168 hours' },
        { status: 400 }
      )
    }

    const cartographyService = new CartographyService(supabase)
    const result = await cartographyService.createListing(user.id, body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        listing: result.listing
      }
    })
  } catch (error) {
    console.error('[Market Listings API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
