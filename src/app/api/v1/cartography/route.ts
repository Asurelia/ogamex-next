/**
 * Cartography API Routes
 * GET: List user's data cards
 * POST: Start creating a data card
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CartographyService } from '@/lib/exploration'
import type { CardType } from '@/lib/exploration'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const cartographyService = new CartographyService(supabase)
    const inventory = await cartographyService.getInventory(user.id, { itemType: 'data_card' })

    return NextResponse.json({
      success: true,
      data: {
        cards: inventory
      }
    })
  } catch (error) {
    console.error('[Cartography API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { discoveryId, cardType } = body as { discoveryId: string; cardType: CardType }

    if (!discoveryId || !cardType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: discoveryId, cardType' },
        { status: 400 }
      )
    }

    const cartographyService = new CartographyService(supabase)
    const result = await cartographyService.createDataCard(user.id, discoveryId, cardType)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        queueItem: result.queueItem,
        estimatedCompletion: result.estimatedCompletion
      }
    })
  } catch (error) {
    console.error('[Cartography API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
