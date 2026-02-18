/**
 * POST /api/game/combat/ability
 *
 * Activate a player ability during combat.
 * Can only be called during the "ability window" between rounds.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCombatSessionManager } from '@/lib/battle/combat-session'
import type { AbilityId } from '@/lib/battle/player-abilities'

interface ActivateAbilityRequest {
  sessionId: string
  abilityId: AbilityId
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ActivateAbilityRequest = await request.json()

    if (!body.sessionId || !body.abilityId) {
      return NextResponse.json({ error: 'Missing sessionId or abilityId' }, { status: 400 })
    }

    // Get session
    const sessionManager = getCombatSessionManager()
    const session = sessionManager.getSession(body.sessionId)

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify user is participant
    const state = session.getState()
    if (state.attacker.id !== user.id && state.defender.id !== user.id) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    // Check session status
    if (state.status !== 'paused') {
      return NextResponse.json(
        { error: 'Cannot activate ability - not in ability window' },
        { status: 400 }
      )
    }

    // Try to activate
    const success = session.activateAbility(user.id, body.abilityId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to activate ability - may be on cooldown or unavailable' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      abilityId: body.abilityId,
      availableAbilities: session.getAvailableAbilities(user.id),
    })
  } catch (error) {
    console.error('Ability activation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/game/combat/ability
 *
 * Get available abilities for the current user in a session.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = request.nextUrl.searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    // Get session
    const sessionManager = getCombatSessionManager()
    const session = sessionManager.getSession(sessionId)

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify user is participant
    const state = session.getState()
    if (state.attacker.id !== user.id && state.defender.id !== user.id) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    // Get ability states
    const isAttacker = state.attacker.id === user.id
    const abilityManager = isAttacker ? state.attackerAbilities : state.defenderAbilities

    return NextResponse.json({
      sessionId,
      status: state.status,
      currentRound: state.currentRound,
      canActivate: state.status === 'paused',
      abilities: abilityManager?.abilities || [],
      availableAbilities: session.getAvailableAbilities(user.id),
    })
  } catch (error) {
    console.error('Get abilities error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
