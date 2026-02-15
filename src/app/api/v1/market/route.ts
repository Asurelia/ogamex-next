/**
 * Market API Routes
 * GET: List market listings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CartographyService } from '@/lib/exploration'
import type { ListMarketRequest, CardRarity, PriceType } from '@/lib/exploration'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const options: ListMarketRequest = {
      itemType: searchParams.get('itemType') as any || undefined,
      rarity: searchParams.get('rarity') as CardRarity || undefined,
      priceType: searchParams.get('priceType') as PriceType || undefined,
      maxPriceMetal: searchParams.get('maxPriceMetal')
        ? Number(searchParams.get('maxPriceMetal'))
        : undefined,
      sortBy: searchParams.get('sortBy') as any || undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 20
    }

    const cartographyService = new CartographyService(supabase)
    const { listings, total } = await cartographyService.getMarketListings(options)

    return NextResponse.json({
      success: true,
      data: {
        listings,
        total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(total / (options.limit || 20))
      }
    })
  } catch (error) {
    console.error('[Market API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
