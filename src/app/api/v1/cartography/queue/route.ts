/**
 * Card Creation Queue API Routes
 * GET: List cards being created
 * POST: Complete a card creation (when timer finishes)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CartographyService } from '@/lib/exploration'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const cartographyService = new CartographyService(supabase)
    const queue = await cartographyService.getCardCreationQueue(user.id)

    return NextResponse.json({
      success: true,
      data: {
        queue
      }
    })
  } catch (error) {
    console.error('[Cartography Queue API] Error:', error)
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
    const { queueItemId } = body as { queueItemId: string }

    if (!queueItemId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: queueItemId' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: queueItem } = await supabase
      .from('card_creation_queue')
      .select('user_id')
      .eq('id', queueItemId)
      .single()

    if (!queueItem || queueItem.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Queue item not found' },
        { status: 404 }
      )
    }

    const cartographyService = new CartographyService(supabase)
    const result = await cartographyService.completeCardCreation(queueItemId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        card: result.card
      }
    })
  } catch (error) {
    console.error('[Cartography Queue API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
