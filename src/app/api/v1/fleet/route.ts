import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'
import {
  calculateDistance,
  calculateFleetDuration,
  calculateFuelConsumption,
  getSlowestShipSpeed,
  calculateCargoCapacity,
} from '@/game/formulas'
import { SHIPS } from '@/game/constants'

/**
 * GET /api/v1/fleet
 * Get all active fleet missions
 */
async function getFleets(request: NextRequest, user: AuthenticatedUser) {
  const supabase = getApiSupabase()

  const { data: missions } = await supabase
    .from('fleet_missions')
    .select('*')
    .eq('user_id', user.id)
    .eq('processed', false)
    .order('arrives_at', { ascending: true })

  return NextResponse.json({
    missions: missions?.map(m => ({
      id: m.id,
      mission_type: m.mission_type,
      origin: {
        planet_id: m.origin_planet_id,
        galaxy: m.origin_galaxy,
        system: m.origin_system,
        position: m.origin_position,
      },
      destination: {
        galaxy: m.destination_galaxy,
        system: m.destination_system,
        position: m.destination_position,
        type: m.destination_type,
      },
      ships: {
        light_fighter: m.light_fighter,
        heavy_fighter: m.heavy_fighter,
        cruiser: m.cruiser,
        battleship: m.battleship,
        battlecruiser: m.battlecruiser,
        bomber: m.bomber,
        destroyer: m.destroyer,
        deathstar: m.deathstar,
        small_cargo: m.small_cargo,
        large_cargo: m.large_cargo,
        colony_ship: m.colony_ship,
        recycler: m.recycler,
        espionage_probe: m.espionage_probe,
        reaper: m.reaper,
        pathfinder: m.pathfinder,
      },
      resources: {
        metal: m.metal,
        crystal: m.crystal,
        deuterium: m.deuterium,
      },
      departed_at: m.departed_at,
      arrives_at: m.arrives_at,
      returns_at: m.returns_at,
      returning: m.is_returning,
    })) || [],
  })
}

/**
 * POST /api/v1/fleet
 * Send a fleet mission
 *
 * Body: {
 *   origin_planet_id: string,
 *   destination: { galaxy: number, system: number, position: number, type: 'planet' | 'moon' },
 *   mission_type: MissionType,
 *   ships: { ship_key: amount },
 *   resources?: { metal: number, crystal: number, deuterium: number },
 *   speed_percent?: number
 * }
 */
async function sendFleet(request: NextRequest, user: AuthenticatedUser) {
  const supabase = getApiSupabase()

  try {
    const body = await request.json()
    const {
      origin_planet_id,
      destination,
      mission_type,
      ships,
      resources = { metal: 0, crystal: 0, deuterium: 0 },
      speed_percent = 100,
    } = body

    // Validate input
    if (!origin_planet_id || !destination || !mission_type || !ships) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get origin planet
    const { data: planet, error: planetError } = await supabase
      .from('planets')
      .select('*')
      .eq('id', origin_planet_id)
      .eq('user_id', user.id)
      .single()

    if (planetError || !planet) {
      return NextResponse.json({ error: 'Origin planet not found' }, { status: 404 })
    }

    // Get research for drive bonuses
    const { data: research } = await supabase
      .from('user_research')
      .select('combustion_drive, impulse_drive, hyperspace_drive, hyperspace_technology')
      .eq('user_id', user.id)
      .single()

    // Validate ships
    const shipArray: Array<{ shipId: number; amount: number }> = []
    const shipData: Record<string, number> = {}

    for (const [key, amount] of Object.entries(ships)) {
      if (typeof amount !== 'number' || amount <= 0) continue

      const ship = Object.values(SHIPS).find(s => s.key === key)
      if (!ship) {
        return NextResponse.json({ error: `Unknown ship type: ${key}` }, { status: 400 })
      }

      const available = (planet as unknown as Record<string, number>)[key] || 0
      if (amount > available) {
        return NextResponse.json({
          error: `Insufficient ${ship.name}. Have: ${available}, Requested: ${amount}`,
        }, { status: 400 })
      }

      shipArray.push({ shipId: ship.id, amount })
      shipData[key] = amount
    }

    if (shipArray.length === 0) {
      return NextResponse.json({ error: 'No ships selected' }, { status: 400 })
    }

    // Calculate distance and duration
    const distance = calculateDistance(
      planet.galaxy, planet.system, planet.position,
      destination.galaxy, destination.system, destination.position
    )

    const slowestSpeed = getSlowestShipSpeed(
      shipArray,
      research?.combustion_drive || 0,
      research?.impulse_drive || 0,
      research?.hyperspace_drive || 0
    )

    const duration = calculateFleetDuration(distance, slowestSpeed, speed_percent)

    // Calculate fuel consumption
    const fuelConsumption = calculateFuelConsumption(shipArray, distance, duration, speed_percent)

    // Calculate cargo capacity
    const cargoCapacity = calculateCargoCapacity(shipArray, research?.hyperspace_technology || 0)

    // Check cargo
    const totalResources = resources.metal + resources.crystal + resources.deuterium + fuelConsumption
    if (totalResources > cargoCapacity) {
      return NextResponse.json({
        error: 'Cargo capacity exceeded',
        cargo_capacity: cargoCapacity,
        required: totalResources,
      }, { status: 400 })
    }

    // Check resources on planet
    const requiredDeuterium = resources.deuterium + fuelConsumption
    if (
      planet.metal < resources.metal ||
      planet.crystal < resources.crystal ||
      planet.deuterium < requiredDeuterium
    ) {
      return NextResponse.json({
        error: 'Insufficient resources',
        required: {
          metal: resources.metal,
          crystal: resources.crystal,
          deuterium: requiredDeuterium,
        },
        available: {
          metal: Math.floor(planet.metal),
          crystal: Math.floor(planet.crystal),
          deuterium: Math.floor(planet.deuterium),
        },
      }, { status: 400 })
    }

    // Deduct resources and ships
    const updateData: Record<string, number> = {
      metal: planet.metal - resources.metal,
      crystal: planet.crystal - resources.crystal,
      deuterium: planet.deuterium - requiredDeuterium,
    }

    for (const [key, amount] of Object.entries(shipData)) {
      updateData[key] = (planet as unknown as Record<string, number>)[key] - amount
    }

    const { error: updateError } = await supabase
      .from('planets')
      .update(updateData)
      .eq('id', origin_planet_id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to deduct resources' }, { status: 500 })
    }

    // Create fleet mission
    const now = new Date()
    const arrivesAt = new Date(now.getTime() + duration * 1000)
    const returnsAt = new Date(arrivesAt.getTime() + duration * 1000)

    const missionData = {
      user_id: user.id,
      origin_planet_id,
      origin_galaxy: planet.galaxy,
      origin_system: planet.system,
      origin_position: planet.position,
      destination_galaxy: destination.galaxy,
      destination_system: destination.system,
      destination_position: destination.position,
      destination_type: destination.type || 'planet',
      mission_type,
      light_fighter: shipData.light_fighter || 0,
      heavy_fighter: shipData.heavy_fighter || 0,
      cruiser: shipData.cruiser || 0,
      battleship: shipData.battleship || 0,
      battlecruiser: shipData.battlecruiser || 0,
      bomber: shipData.bomber || 0,
      destroyer: shipData.destroyer || 0,
      deathstar: shipData.deathstar || 0,
      small_cargo: shipData.small_cargo || 0,
      large_cargo: shipData.large_cargo || 0,
      colony_ship: shipData.colony_ship || 0,
      recycler: shipData.recycler || 0,
      espionage_probe: shipData.espionage_probe || 0,
      reaper: shipData.reaper || 0,
      pathfinder: shipData.pathfinder || 0,
      metal: resources.metal,
      crystal: resources.crystal,
      deuterium: resources.deuterium,
      departed_at: now.toISOString(),
      arrives_at: arrivesAt.toISOString(),
      returns_at: returnsAt.toISOString(),
      returning: false,
      processed: false,
      cancelled: false,
    }

    const { data: mission, error: missionError } = await supabase
      .from('fleet_missions')
      .insert(missionData)
      .select()
      .single()

    if (missionError) {
      return NextResponse.json({ error: 'Failed to create mission' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Fleet dispatched on ${mission_type} mission`,
      mission: {
        id: mission.id,
        mission_type: mission.mission_type,
        destination: `[${destination.galaxy}:${destination.system}:${destination.position}]`,
        arrives_at: arrivesAt.toISOString(),
        duration_seconds: duration,
        fuel_consumption: fuelConsumption,
      },
    })
  } catch (error) {
    console.error('Fleet error:', error)
    return NextResponse.json({ error: 'Failed to send fleet' }, { status: 500 })
  }
}

export const GET = withAuth(getFleets)
export const POST = withAuth(sendFleet)
