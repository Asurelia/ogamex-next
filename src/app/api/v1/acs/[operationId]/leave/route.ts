/**
 * ACS Leave Routes
 *
 * POST /api/v1/acs/[operationId]/leave - Leave an ACS operation
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'
import { createACSService } from '@/lib/acs'

/**
 * POST /api/v1/acs/[operationId]/leave
 * Leave an ACS operation (returns ships and resources to origin)
 */
async function leaveOperation(request: NextRequest, user: AuthenticatedUser) {
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
    // Get participant data before leaving
    const { data: participant } = await supabase
      .from('acs_participants')
      .select('*')
      .eq('acs_operation_id', operationId)
      .eq('user_id', user.id)
      .single()

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'You are not a participant in this operation' },
        { status: 400 }
      )
    }

    // Get the origin planet from the fleet mission if exists
    let originPlanetId: string | null = null
    if (participant.fleet_mission_id) {
      const { data: mission } = await supabase
        .from('fleet_missions')
        .select('origin_planet_id')
        .eq('id', participant.fleet_mission_id)
        .single()
      originPlanetId = mission?.origin_planet_id || null
    }

    // If no mission yet, try to get from request body
    if (!originPlanetId) {
      try {
        const body = await request.json()
        originPlanetId = body.origin_planet_id
      } catch {
        // Body might be empty
      }
    }

    // Leave the operation
    const result = await acsService.leaveOperation(user.id, operationId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    if (originPlanetId && participant.ships) {
      const { data: planet } = await supabase
        .from('planets_compat')
        .select('*')
        .eq('id', originPlanetId)
        .eq('user_id', user.id)
        .single()

      if (planet) {
        const updateData: Record<string, number> = {}

        const ships = participant.ships as Record<string, number>
        for (const [key, amount] of Object.entries(ships)) {
          updateData[key] = ((planet as unknown as Record<string, number>)[key] || 0) + amount
        }

        updateData.metal = (planet.metal || 0) + (participant.metal || 0)
        updateData.crystal = (planet.crystal || 0) + (participant.crystal || 0)
        updateData.deuterium = (planet.deuterium || 0) + (participant.deuterium || 0)

        await supabase
          .from('player_colonies')
          .update(updateData)
          .eq('id', originPlanetId)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully left ACS operation. Ships and resources returned.',
    })
  } catch (error) {
    console.error('ACS leave error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to leave operation' },
      { status: 500 }
    )
  }
}

export const POST = withAuth(leaveOperation)
