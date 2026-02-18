/**
 * POST /api/game/combat/finalize
 *
 * Finalize a combat session and persist results to Supabase.
 * Called when the battle stream ends or client disconnects.
 *
 * This endpoint:
 * 1. Retrieves the final battle result from session
 * 2. Saves summary to Supabase battle_reports table
 * 3. Updates planet fleet/defense counts
 * 4. Transfers looted resources
 * 5. Creates debris field if applicable
 * 6. Creates moon if conditions met
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCombatSessionManager } from '@/lib/battle/combat-session'
import { BattleService, type BattleResultSummary } from '@/lib/services/battle-service'
import { getLocalDb } from '@/lib/db/local-db'
import { randomUUID } from 'crypto'

interface FinalizeRequest {
  sessionId: string
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

    const body: FinalizeRequest = await request.json()

    if (!body.sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Get session
    const sessionManager = getCombatSessionManager()
    const session = sessionManager.getSession(body.sessionId)

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get session state
    const sessionState = session.getState()

    // Verify user is participant
    if (sessionState.attacker.id !== user.id && sessionState.defender.id !== user.id) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    // Session must be finished
    if (sessionState.status !== 'finished' && sessionState.status !== 'aborted') {
      return NextResponse.json(
        { error: 'Session not finished', status: sessionState.status },
        { status: 400 }
      )
    }

    // Get battle result from session
    const result = sessionState.result
    if (!result) {
      return NextResponse.json({ error: 'No battle result available' }, { status: 400 })
    }

    // Get planet info for coordinates
    const { data: targetPlanet } = await supabase
      .from('planets')
      .select('id, galaxy, system, position')
      .eq('user_id', sessionState.defender.id)
      .limit(1)
      .single()

    const coordinates = targetPlanet
      ? `${targetPlanet.galaxy}:${targetPlanet.system}:${targetPlanet.position}`
      : 'unknown'
    const planetId = targetPlanet?.id || sessionState.defender.id // Fallback to defender ID

    // Build summary for Supabase
    const summary: BattleResultSummary = {
      winner: result.winner,
      totalRounds: result.totalRounds,
      attackerLossesValue: calculateLossesValue(result.attackerLosses?.ships || {}),
      defenderLossesValue: calculateLossesValue({
        ...(result.defenderLosses?.ships || {}),
        ...(result.defenderLosses?.defense || {}),
      }),
      loot: result.loot || { metal: 0, crystal: 0, deuterium: 0 },
      debris: result.debris || { metal: 0, crystal: 0 },
      moonCreated: result.moonCreated || false,
    }

    // Save to Supabase
    const reportId = await BattleService.saveBattleResult(
      body.sessionId,
      sessionState.attacker.id,
      sessionState.defender.id,
      planetId,
      coordinates,
      summary
    )

    if (!reportId) {
      console.error('Failed to save battle report to Supabase')
      // Continue anyway - we'll still process the results
    }

    // Update local DB with full result
    try {
      const localDb = getLocalDb()
      localDb.updateCombatLogResult(
        body.sessionId,
        summary.winner,
        summary.totalRounds,
        result.timeline || [],
        {
          attackerValue: summary.attackerLossesValue,
          defenderValue: summary.defenderLossesValue,
          loot: summary.loot,
          debris: summary.debris,
          moonCreated: summary.moonCreated,
        }
      )
    } catch (e) {
      console.warn('Failed to update local combat log:', e)
    }

    // Apply battle outcomes to database
    await applyBattleOutcomes(supabase, sessionState, result, summary)

    // Remove session from manager (cleanup)
    // Session will auto-cleanup after timeout, but we can do it now
    // sessionManager.removeSession(body.sessionId) // Not exposed, relies on auto-cleanup

    return NextResponse.json({
      success: true,
      reportId,
      summary: {
        winner: summary.winner,
        rounds: summary.totalRounds,
        attackerLosses: summary.attackerLossesValue,
        defenderLosses: summary.defenderLossesValue,
        loot: summary.loot,
        debris: summary.debris,
        moonCreated: summary.moonCreated,
      },
    })
  } catch (error) {
    console.error('Combat finalize error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Calculate total resource value of losses
 */
function calculateLossesValue(losses: Record<string, number>): number {
  // Unit costs (metal + crystal + deuterium)
  const unitCosts: Record<string, number> = {
    light_fighter: 3000 + 1000,
    heavy_fighter: 6000 + 4000,
    cruiser: 20000 + 7000 + 2000,
    battleship: 45000 + 15000,
    battlecruiser: 30000 + 40000 + 15000,
    bomber: 50000 + 25000 + 15000,
    destroyer: 60000 + 50000 + 15000,
    deathstar: 5000000 + 4000000 + 1000000,
    small_cargo: 2000 + 2000,
    large_cargo: 6000 + 6000,
    colony_ship: 10000 + 20000 + 10000,
    recycler: 10000 + 6000 + 2000,
    espionage_probe: 1000,
    solar_satellite: 2000 + 500,
    // Defenses
    rocket_launcher: 2000,
    light_laser: 1500 + 500,
    heavy_laser: 6000 + 2000,
    gauss_cannon: 20000 + 15000 + 2000,
    ion_cannon: 5000 + 3000,
    plasma_turret: 50000 + 50000 + 30000,
    small_shield_dome: 10000 + 10000,
    large_shield_dome: 50000 + 50000,
  }

  let total = 0
  for (const [unitType, count] of Object.entries(losses)) {
    const cost = unitCosts[unitType] || 0
    total += cost * count
  }
  return total
}

/**
 * Apply battle outcomes to database:
 * - Update fleet counts
 * - Transfer resources (loot)
 * - Create debris field
 * - Create moon if applicable
 */
async function applyBattleOutcomes(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  sessionState: { attacker: { id: string }; defender: { id: string } },
  result: {
    attackerLosses?: { ships?: Record<string, number> }
    defenderLosses?: { ships?: Record<string, number>; defense?: Record<string, number> }
    loot?: { metal: number; crystal: number; deuterium: number }
    debris?: { metal: number; crystal: number }
    moonCreated?: boolean
  },
  summary: BattleResultSummary
) {
  // Combine defender losses (ships + defense)
  const defenderAllLosses: Record<string, number> = {
    ...(result.defenderLosses?.ships || {}),
    ...(result.defenderLosses?.defense || {}),
  }

  // 1. Update defender's planet (remove destroyed ships/defenses)
  if (Object.keys(defenderAllLosses).length > 0) {
    // Get defender's main planet
    const { data: defenderPlanet } = await supabase
      .from('planets')
      .select('id')
      .eq('user_id', sessionState.defender.id)
      .eq('is_homeworld', true)
      .single()

    if (defenderPlanet) {
      // Build decrement object
      const decrements: Record<string, number> = {}
      for (const [unit, count] of Object.entries(defenderAllLosses)) {
        if (count > 0) {
          decrements[unit] = count
        }
      }

      // Update planet - decrement destroyed units
      // Note: Supabase doesn't have atomic decrement, so we need to fetch and update
      const { data: currentPlanet } = await supabase
        .from('planets')
        .select('*')
        .eq('id', defenderPlanet.id)
        .single()

      if (currentPlanet) {
        const updates: Record<string, number> = {}
        for (const [unit, lossCount] of Object.entries(decrements)) {
          const current = (currentPlanet as Record<string, unknown>)[unit] as number || 0
          updates[unit] = Math.max(0, current - lossCount)
        }

        // Also deduct looted resources
        if (result.loot) {
          updates.metal = Math.max(0, (currentPlanet.metal || 0) - result.loot.metal)
          updates.crystal = Math.max(0, (currentPlanet.crystal || 0) - result.loot.crystal)
          updates.deuterium = Math.max(0, (currentPlanet.deuterium || 0) - result.loot.deuterium)
        }

        await supabase.from('planets').update(updates).eq('id', defenderPlanet.id)
      }
    }
  }

  // 2. Update attacker's planet (add looted resources, remove destroyed ships)
  const attackerShipLosses = result.attackerLosses?.ships || {}
  if (result.loot || Object.keys(attackerShipLosses).length > 0) {
    const { data: attackerPlanet } = await supabase
      .from('planets')
      .select('*')
      .eq('user_id', sessionState.attacker.id)
      .eq('is_homeworld', true)
      .single()

    if (attackerPlanet) {
      const updates: Record<string, number> = {}

      // Add looted resources
      if (result.loot) {
        updates.metal = (attackerPlanet.metal || 0) + result.loot.metal
        updates.crystal = (attackerPlanet.crystal || 0) + result.loot.crystal
        updates.deuterium = (attackerPlanet.deuterium || 0) + result.loot.deuterium
      }

      // Remove destroyed attacker ships
      for (const [unit, lossCount] of Object.entries(attackerShipLosses)) {
        if (lossCount > 0) {
          const current = (attackerPlanet as Record<string, unknown>)[unit] as number || 0
          updates[unit] = Math.max(0, current - lossCount)
        }
      }

      await supabase.from('planets').update(updates).eq('id', attackerPlanet.id)
    }
  }

  // 3. Create debris field if there's debris
  if (result.debris && (result.debris.metal > 0 || result.debris.crystal > 0)) {
    const { data: defenderPlanet } = await supabase
      .from('planets')
      .select('galaxy, system, position')
      .eq('user_id', sessionState.defender.id)
      .eq('is_homeworld', true)
      .single()

    if (defenderPlanet) {
      // Check if debris field already exists at this location
      const { data: existingDebris } = await supabase
        .from('debris_fields')
        .select('id, metal, crystal')
        .eq('galaxy', defenderPlanet.galaxy)
        .eq('system', defenderPlanet.system)
        .eq('position', defenderPlanet.position)
        .single()

      if (existingDebris) {
        // Add to existing debris field
        await supabase
          .from('debris_fields')
          .update({
            metal: existingDebris.metal + result.debris.metal,
            crystal: existingDebris.crystal + result.debris.crystal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingDebris.id)
      } else {
        // Create new debris field
        await supabase.from('debris_fields').insert({
          id: randomUUID(),
          galaxy: defenderPlanet.galaxy,
          system: defenderPlanet.system,
          position: defenderPlanet.position,
          metal: result.debris.metal,
          crystal: result.debris.crystal,
        })
      }
    }
  }

  // 4. Create moon if conditions met
  if (summary.moonCreated) {
    const { data: defenderPlanet } = await supabase
      .from('planets')
      .select('galaxy, system, position, name')
      .eq('user_id', sessionState.defender.id)
      .eq('is_homeworld', true)
      .single()

    if (defenderPlanet) {
      // Check if moon already exists at this position
      const { data: existingMoon } = await supabase
        .from('planets')
        .select('id')
        .eq('galaxy', defenderPlanet.galaxy)
        .eq('system', defenderPlanet.system)
        .eq('position', defenderPlanet.position)
        .eq('planet_type', 'moon')
        .single()

      if (!existingMoon) {
        // Create moon for the defender (winner of debris = moon creation)
        // Moon size based on debris (simplified: 20% chance from battle = ~4000km)
        const moonSize = Math.floor(Math.random() * 4000) + 4000 // 4000-8000 km
        const moonFields = Math.floor(moonSize / 1000) + 1 // 5-9 fields

        await supabase.from('planets').insert({
          id: randomUUID(),
          user_id: sessionState.defender.id,
          name: `${defenderPlanet.name} Moon`,
          galaxy: defenderPlanet.galaxy,
          system: defenderPlanet.system,
          position: defenderPlanet.position,
          planet_type: 'moon',
          diameter: moonSize,
          fields_max: moonFields,
          fields_used: 0,
          temperature_min: -40,
          temperature_max: 0,
          is_homeworld: false,
          metal: 0,
          crystal: 0,
          deuterium: 0,
          energy: 0,
        })

        console.log(
          `Moon created at ${defenderPlanet.galaxy}:${defenderPlanet.system}:${defenderPlanet.position}`
        )
      }
    }
  }
}
