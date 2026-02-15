import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { BoostType } from '@/types/database'

interface ActivateBoostRequest {
  boost_type: BoostType
  multiplier: number
  duration_minutes: number
  energy_cost: number
  planet_id?: string // Optional: if null, applies to all planets
}

// GET - Fetch active boosts for current user
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active boosts (not expired)
    const now = new Date().toISOString()
    const { data: boosts, error } = await supabase
      .from('active_boosts')
      .select('*')
      .eq('user_id', user.id)
      .gt('ends_at', now)
      .order('ends_at', { ascending: true })

    if (error) {
      console.error('[Boosts API] Error fetching boosts:', error)
      return NextResponse.json({ error: 'Failed to fetch boosts' }, { status: 500 })
    }

    return NextResponse.json({ boosts: boosts || [] })
  } catch (error) {
    console.error('[Boosts API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Activate a new boost
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ActivateBoostRequest = await request.json()
    const { boost_type, multiplier, duration_minutes, energy_cost, planet_id } = body

    // Validate boost type
    const validTypes: BoostType[] = ['production', 'construction', 'research', 'expedition', 'attack']
    if (!validTypes.includes(boost_type)) {
      return NextResponse.json({ error: 'Invalid boost type' }, { status: 400 })
    }

    // Validate other parameters
    if (multiplier < 1 || multiplier > 3) {
      return NextResponse.json({ error: 'Invalid multiplier' }, { status: 400 })
    }
    if (duration_minutes < 1 || duration_minutes > 1440) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
    }
    if (energy_cost < 1 || energy_cost > 100) {
      return NextResponse.json({ error: 'Invalid energy cost' }, { status: 400 })
    }

    // Get user data to check boost energy
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('boost_energy, boost_energy_max, boost_energy_regen_rate, last_boost_energy_update')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Calculate current boost energy (with regeneration)
    const now = new Date()
    const lastUpdate = new Date(userData.last_boost_energy_update)
    const hoursElapsed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
    const regenRate = userData.boost_energy_regen_rate || 8.33
    const regenerated = hoursElapsed * regenRate
    const currentEnergy = Math.min(
      userData.boost_energy_max,
      userData.boost_energy + regenerated
    )

    // Check if user has enough energy
    if (currentEnergy < energy_cost) {
      return NextResponse.json({
        error: 'Not enough boost energy',
        current: Math.floor(currentEnergy),
        required: energy_cost,
      }, { status: 400 })
    }

    // Check if boost of this type is already active
    const { data: existingBoost } = await supabase
      .from('active_boosts')
      .select('id')
      .eq('user_id', user.id)
      .eq('boost_type', boost_type)
      .gt('ends_at', now.toISOString())
      .maybeSingle()

    if (existingBoost) {
      return NextResponse.json({
        error: 'Boost already active',
        boost_type,
      }, { status: 400 })
    }

    // Calculate new energy after deduction
    const newEnergy = currentEnergy - energy_cost

    // Calculate end time
    const endsAt = new Date(now.getTime() + duration_minutes * 60 * 1000)

    // Start transaction: update user energy and create boost
    const { error: updateError } = await supabase
      .from('users')
      .update({
        boost_energy: newEnergy,
        last_boost_energy_update: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[Boosts API] Error updating user energy:', updateError)
      return NextResponse.json({ error: 'Failed to deduct energy' }, { status: 500 })
    }

    // Create the boost
    const { data: boost, error: boostError } = await supabase
      .from('active_boosts')
      .insert({
        user_id: user.id,
        boost_type,
        multiplier,
        energy_cost,
        started_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        planet_id: planet_id || null,
      })
      .select()
      .single()

    if (boostError) {
      console.error('[Boosts API] Error creating boost:', boostError)
      // Try to refund energy
      await supabase
        .from('users')
        .update({
          boost_energy: currentEnergy,
          last_boost_energy_update: lastUpdate.toISOString(),
        })
        .eq('id', user.id)

      return NextResponse.json({ error: 'Failed to create boost' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      boost,
      remaining_energy: Math.floor(newEnergy),
    })
  } catch (error) {
    console.error('[Boosts API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Cancel/remove an active boost (optional, for future use)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const boostId = searchParams.get('id')

    if (!boostId) {
      return NextResponse.json({ error: 'Boost ID required' }, { status: 400 })
    }

    // Delete the boost (only if it belongs to the user)
    const { error } = await supabase
      .from('active_boosts')
      .delete()
      .eq('id', boostId)
      .eq('user_id', user.id)

    if (error) {
      console.error('[Boosts API] Error deleting boost:', error)
      return NextResponse.json({ error: 'Failed to delete boost' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Boosts API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
