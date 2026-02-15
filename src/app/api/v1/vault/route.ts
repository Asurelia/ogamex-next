/**
 * Vault API Routes
 * GET: Get vault info and contents
 */

import { NextResponse } from 'next/server'
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
    const vault = await cartographyService.getVault(user.id)

    if (!vault) {
      return NextResponse.json(
        { success: false, error: 'Vault not found' },
        { status: 404 }
      )
    }

    // Get vault contents
    const contents = await cartographyService.getInventory(user.id, { location: 'vault' })

    return NextResponse.json({
      success: true,
      data: {
        vault,
        contents
      }
    })
  } catch (error) {
    console.error('[Vault API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
