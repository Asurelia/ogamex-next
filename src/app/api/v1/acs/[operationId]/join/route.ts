/**
 * ACS Join Routes
 *
 * POST /api/v1/acs/[operationId]/join - Join an ACS operation
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'
import { createACSService } from '@/lib/acs'
import type { ShipCounts } from '@/lib/missions/types'
import { SHIPS } from '@/game/constants'

/**
 * POST /api/v1/acs/[operationId]/join
 * Join an ACS operation with fleet configuration
 *
 * Body: {
 *   ships: { ship_key: amount },
 *   resources?: { metal: number, crystal: number, deuterium: number },
 *   origin_planet_id: string
 * }
 */
async function joinOperation(request: NextRequest, user: AuthenticatedUser) {
  const supabase = getApiSupabase()
  const acsService = createACSService(supabase)

  // Extract operationId from URL
  const operationId = request.url.split('/acs/')[1]?.split('/')[0]

  if (!operationId) {
    return NextResponse.json(
      { success: false, error: 'Operation ID is required' },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()

    if (!body.ships || Object.keys(body.ships).length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one ship type is required' },
        { status: 400 }
      )
    }

    if (!body.origin_planet_id) {
      return NextResponse.json(
        { success: false, error: 'origin_planet_id is required' },
        { status: 400 }
      )
    }

    // Verify planet belongs to user
    const { data: planet } = await supabase
      .from('planets')
      .select('*')
      .eq('id', body.origin_planet_id)
      .eq('user_id', user.id)
      .single()

    if (!planet) {
      return NextResponse.json(
        { success: false, error: 'Origin planet not found or does not belong to you' },
        { status: 404 }
      )
    }

    // Validate ships
    const shipData: Partial<ShipCounts> = {}
    for (const [key, amount] of Object.entries(body.ships)) {
      if (typeof amount !== 'number' || amount <= 0) continue

      const ship = Object.values(SHIPS).find(s => s.key === key)
      if (!ship) {
        return NextResponse.json(
          { success: false, error: `Unknown ship type: ${key}` },
          { status: 400 }
        )
      }

      const available = (planet as unknown as Record<string, number>)[key] || 0
      if (amount > available) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient ${ship.name}. Have: ${available}, Requested: ${amount}`,
          },
          { status: 400 }
        )
      }

      shipData[key as keyof ShipCounts] = amount
    }

    // Validate resources if provided
    const resources = body.resources || { metal: 0, crystal: 0, deuterium: 0 }
    if (
      resources.metal > planet.metal ||
      resources.crystal > planet.crystal ||
      resources.deuterium > planet.deuterium
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient resources on planet',
          available: {
            metal: Math.floor(planet.metal),
            crystal: Math.floor(planet.crystal),
            deuterium: Math.floor(planet.deuterium),
          },
        },
        { status: 400 }
      )
    }

    // Join the operation
    const result = await acsService.joinACS(user.id, {
      operation_id: operationId,
      ships: shipData,
      resources,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // Reserve ships and resources on the planet
    const updateData: Record<string, number> = {}
    for (const [key, amount] of Object.entries(shipData)) {
      updateData[key] = (planet as unknown as Record<string, number>)[key] - (amount as number)
    }
    updateData.metal = planet.metal - resources.metal
    updateData.crystal = planet.crystal - resources.crystal
    updateData.deuterium = planet.deuterium - resources.deuterium

    await supabase
      .from('planets')
      .update(updateData)
      .eq('id', body.origin_planet_id)

    return NextResponse.json({
      success: true,
      message: 'Successfully joined ACS operation',
      participant: {
        id: result.participant!.id,
        ships: result.participant!.ships,
        resources: result.participant!.resources,
        status: result.participant!.status,
      },
    })
  } catch (error) {
    console.error('ACS join error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to join operation' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(joinOperation)
