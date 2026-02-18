/**
 * POST /api/game/combat/start
 *
 * Start a new real-time combat session.
 * Returns a session ID that clients use to connect to SSE stream.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getCombatSessionManager,
  type CombatParticipant,
  type CombatSessionConfig,
} from '@/lib/battle/combat-session'
import { getLocalDb } from '@/lib/db/local-db'
import { randomUUID } from 'crypto'

interface StartCombatRequest {
  // Attacker fleet
  attackerFleet: Record<string, number>
  attackerTech: { weaponsTech: number; shieldTech: number; armorTech: number }

  // Target info
  targetPlanetId?: string
  targetCoords?: { galaxy: number; system: number; position: number }

  // Optional config overrides
  config?: Partial<CombatSessionConfig>
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

    const body: StartCombatRequest = await request.json()

    // Validate request
    if (!body.attackerFleet || Object.keys(body.attackerFleet).length === 0) {
      return NextResponse.json({ error: 'No fleet provided' }, { status: 400 })
    }

    if (!body.targetPlanetId && !body.targetCoords) {
      return NextResponse.json({ error: 'No target specified' }, { status: 400 })
    }

    // Get attacker profile
    const { data: attackerProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    // Resolve target planet and defender
    let defenderData: {
      userId: string
      username: string
      fleet: Record<string, number>
      defense: Record<string, number>
      tech: { weaponsTech: number; shieldTech: number; armorTech: number }
      resources: { metal: number; crystal: number; deuterium: number; energy: number }
    }

    if (body.targetPlanetId) {
      const { data: planet } = await supabase
        .from('planets')
        .select(
          `
          user_id,
          metal, crystal, deuterium, energy,
          light_fighter, heavy_fighter, cruiser, battleship,
          battlecruiser, bomber, destroyer, deathstar,
          small_cargo, large_cargo, colony_ship, recycler,
          espionage_probe, solar_satellite,
          rocket_launcher, light_laser, heavy_laser,
          gauss_cannon, ion_cannon, plasma_turret,
          small_shield_dome, large_shield_dome
        `
        )
        .eq('id', body.targetPlanetId)
        .single()

      if (!planet) {
        return NextResponse.json({ error: 'Target planet not found' }, { status: 404 })
      }

      // Get defender profile
      const { data: defenderProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', planet.user_id)
        .single()

      // Get defender tech
      const { data: defenderResearch } = await supabase
        .from('user_research')
        .select('weapons_tech, shielding_tech, armor_tech')
        .eq('user_id', planet.user_id)
        .single()

      defenderData = {
        userId: planet.user_id,
        username: defenderProfile?.username || 'Unknown',
        fleet: {
          light_fighter: planet.light_fighter || 0,
          heavy_fighter: planet.heavy_fighter || 0,
          cruiser: planet.cruiser || 0,
          battleship: planet.battleship || 0,
          battlecruiser: planet.battlecruiser || 0,
          bomber: planet.bomber || 0,
          destroyer: planet.destroyer || 0,
          deathstar: planet.deathstar || 0,
          small_cargo: planet.small_cargo || 0,
          large_cargo: planet.large_cargo || 0,
          colony_ship: planet.colony_ship || 0,
          recycler: planet.recycler || 0,
          espionage_probe: planet.espionage_probe || 0,
          solar_satellite: planet.solar_satellite || 0,
        },
        defense: {
          rocket_launcher: planet.rocket_launcher || 0,
          light_laser: planet.light_laser || 0,
          heavy_laser: planet.heavy_laser || 0,
          gauss_cannon: planet.gauss_cannon || 0,
          ion_cannon: planet.ion_cannon || 0,
          plasma_turret: planet.plasma_turret || 0,
          small_shield_dome: planet.small_shield_dome || 0,
          large_shield_dome: planet.large_shield_dome || 0,
        },
        tech: {
          weaponsTech: defenderResearch?.weapons_tech || 0,
          shieldTech: defenderResearch?.shielding_tech || 0,
          armorTech: defenderResearch?.armor_tech || 0,
        },
        resources: {
          metal: planet.metal || 0,
          crystal: planet.crystal || 0,
          deuterium: planet.deuterium || 0,
          energy: planet.energy || 0,
        },
      }
    } else if (body.targetCoords) {
      // Resolve planet from coordinates
      const { galaxy, system, position } = body.targetCoords

      const { data: planet } = await supabase
        .from('planets')
        .select(
          `
          id, user_id,
          metal, crystal, deuterium, energy,
          light_fighter, heavy_fighter, cruiser, battleship,
          battlecruiser, bomber, destroyer, deathstar,
          small_cargo, large_cargo, colony_ship, recycler,
          espionage_probe, solar_satellite,
          rocket_launcher, light_laser, heavy_laser,
          gauss_cannon, ion_cannon, plasma_turret,
          small_shield_dome, large_shield_dome
        `
        )
        .eq('galaxy', galaxy)
        .eq('system', system)
        .eq('position', position)
        .eq('planet_type', 'planet')
        .single()

      if (!planet) {
        // No planet at coordinates - attacker wins by default (empty space)
        return NextResponse.json({
          sessionId: null,
          status: 'instant_win',
          message: 'No planet at target coordinates',
          result: {
            winner: 'attacker',
            totalRounds: 0,
            loot: { metal: 0, crystal: 0, deuterium: 0 },
            debris: { metal: 0, crystal: 0 },
            moonCreated: false,
          },
        })
      }

      // Prevent self-attack
      if (planet.user_id === user.id) {
        return NextResponse.json({ error: 'Cannot attack your own planet' }, { status: 400 })
      }

      // Get defender profile
      const { data: defenderProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', planet.user_id)
        .single()

      // Get defender tech
      const { data: defenderResearch } = await supabase
        .from('user_research')
        .select('weapons_tech, shielding_tech, armor_tech')
        .eq('user_id', planet.user_id)
        .single()

      defenderData = {
        userId: planet.user_id,
        username: defenderProfile?.username || 'Unknown',
        fleet: {
          light_fighter: planet.light_fighter || 0,
          heavy_fighter: planet.heavy_fighter || 0,
          cruiser: planet.cruiser || 0,
          battleship: planet.battleship || 0,
          battlecruiser: planet.battlecruiser || 0,
          bomber: planet.bomber || 0,
          destroyer: planet.destroyer || 0,
          deathstar: planet.deathstar || 0,
          small_cargo: planet.small_cargo || 0,
          large_cargo: planet.large_cargo || 0,
          colony_ship: planet.colony_ship || 0,
          recycler: planet.recycler || 0,
          espionage_probe: planet.espionage_probe || 0,
          solar_satellite: planet.solar_satellite || 0,
        },
        defense: {
          rocket_launcher: planet.rocket_launcher || 0,
          light_laser: planet.light_laser || 0,
          heavy_laser: planet.heavy_laser || 0,
          gauss_cannon: planet.gauss_cannon || 0,
          ion_cannon: planet.ion_cannon || 0,
          plasma_turret: planet.plasma_turret || 0,
          small_shield_dome: planet.small_shield_dome || 0,
          large_shield_dome: planet.large_shield_dome || 0,
        },
        tech: {
          weaponsTech: defenderResearch?.weapons_tech || 0,
          shieldTech: defenderResearch?.shielding_tech || 0,
          armorTech: defenderResearch?.armor_tech || 0,
        },
        resources: {
          metal: planet.metal || 0,
          crystal: planet.crystal || 0,
          deuterium: planet.deuterium || 0,
          energy: planet.energy || 0,
        },
      }
    } else {
      return NextResponse.json({ error: 'No target specified' }, { status: 400 })
    }

    // Create combat participants
    const attacker: CombatParticipant = {
      id: user.id,
      name: attackerProfile?.username || 'Unknown',
      fleet: body.attackerFleet,
      tech: body.attackerTech,
    }

    const defender: CombatParticipant = {
      id: defenderData.userId,
      name: defenderData.username,
      fleet: defenderData.fleet,
      defense: defenderData.defense,
      tech: defenderData.tech,
      resources: defenderData.resources,
    }

    // Create session
    const sessionManager = getCombatSessionManager()
    const session = sessionManager.createSession(attacker, defender, body.config)

    // Log combat start to local DB
    try {
      const localDb = getLocalDb()
      localDb.createCombatLog({
        id: randomUUID(),
        battle_id: session.id,
        attacker_id: user.id,
        defender_id: defenderData.userId,
        started_at: new Date().toISOString(),
        total_rounds: 0,
        attacker_losses_value: 0,
        defender_losses_value: 0,
        loot_metal: 0,
        loot_crystal: 0,
        loot_deuterium: 0,
        debris_metal: 0,
        debris_crystal: 0,
        moon_created: 0,
      })
    } catch (e) {
      console.error('Failed to log combat to local DB:', e)
      // Non-fatal, continue
    }

    // Start the session
    await session.start()

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      streamUrl: `/api/game/combat/stream?sessionId=${session.id}`,
      attacker: { id: attacker.id, name: attacker.name },
      defender: { id: defender.id, name: defender.name },
    })
  } catch (error) {
    console.error('Combat start error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
