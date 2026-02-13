import { NextRequest, NextResponse } from 'next/server'
import { withAuth, getApiSupabase, type AuthenticatedUser } from '@/lib/api/auth'

/**
 * GET /api/v1/planets
 * Get all planets for the authenticated player
 */
async function getPlanets(request: NextRequest, user: AuthenticatedUser) {
  const supabase = getApiSupabase()

  const { data: planets, error } = await supabase
    .from('planets')
    .select('*')
    .eq('user_id', user.id)
    .eq('destroyed', false)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch planets' }, { status: 500 })
  }

  return NextResponse.json({
    planets: planets.map(planet => ({
      id: planet.id,
      name: planet.name,
      coordinates: {
        galaxy: planet.galaxy,
        system: planet.system,
        position: planet.position,
      },
      type: planet.planet_type,
      diameter: planet.diameter,
      fields: {
        used: planet.fields_used,
        max: planet.fields_max,
      },
      temperature: {
        min: planet.temp_min,
        max: planet.temp_max,
      },
      resources: {
        metal: Math.floor(planet.metal),
        crystal: Math.floor(planet.crystal),
        deuterium: Math.floor(planet.deuterium),
        energy: planet.energy_max - planet.energy_used,
      },
      production: {
        metal_per_hour: planet.metal_per_hour,
        crystal_per_hour: planet.crystal_per_hour,
        deuterium_per_hour: planet.deuterium_per_hour,
      },
      storage: {
        metal_max: planet.metal_max,
        crystal_max: planet.crystal_max,
        deuterium_max: planet.deuterium_max,
      },
      buildings: {
        metal_mine: planet.metal_mine,
        crystal_mine: planet.crystal_mine,
        deuterium_synthesizer: planet.deuterium_synthesizer,
        solar_plant: planet.solar_plant,
        fusion_plant: planet.fusion_plant,
        metal_storage: planet.metal_storage,
        crystal_storage: planet.crystal_storage,
        deuterium_tank: planet.deuterium_tank,
        robot_factory: planet.robot_factory,
        nanite_factory: planet.nanite_factory,
        shipyard: planet.shipyard,
        research_lab: planet.research_lab,
        terraformer: planet.terraformer,
        alliance_depot: planet.alliance_depot,
        missile_silo: planet.missile_silo,
        space_dock: planet.space_dock,
      },
      ships: {
        light_fighter: planet.light_fighter,
        heavy_fighter: planet.heavy_fighter,
        cruiser: planet.cruiser,
        battleship: planet.battleship,
        battlecruiser: planet.battlecruiser,
        bomber: planet.bomber,
        destroyer: planet.destroyer,
        deathstar: planet.deathstar,
        small_cargo: planet.small_cargo,
        large_cargo: planet.large_cargo,
        colony_ship: planet.colony_ship,
        recycler: planet.recycler,
        espionage_probe: planet.espionage_probe,
        solar_satellite: planet.solar_satellite,
        crawler: planet.crawler,
        reaper: planet.reaper,
        pathfinder: planet.pathfinder,
      },
      defense: {
        rocket_launcher: planet.rocket_launcher,
        light_laser: planet.light_laser,
        heavy_laser: planet.heavy_laser,
        gauss_cannon: planet.gauss_cannon,
        ion_cannon: planet.ion_cannon,
        plasma_turret: planet.plasma_turret,
        small_shield_dome: planet.small_shield_dome,
        large_shield_dome: planet.large_shield_dome,
        anti_ballistic_missile: planet.anti_ballistic_missile,
        interplanetary_missile: planet.interplanetary_missile,
      },
    })),
  })
}

export const GET = withAuth(getPlanets)
