/**
 * Supabase Edge Function: process-missions
 *
 * This function processes pending fleet missions.
 * It can be triggered by:
 * - Supabase pg_cron extension (recommended)
 * - HTTP request (for manual triggers or external cron)
 * - Database webhook (on fleet_missions insert)
 *
 * Setup with pg_cron:
 * ```sql
 * SELECT cron.schedule(
 *   'process-fleet-missions',
 *   '* * * * *',  -- Every minute
 *   $$
 *   SELECT net.http_post(
 *     url := 'https://<project-ref>.supabase.co/functions/v1/process-missions',
 *     headers := jsonb_build_object(
 *       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
 *       'Content-Type', 'application/json'
 *     ),
 *     body := '{}'::jsonb
 *   )
 *   $$
 * );
 * ```
 */

// @ts-ignore - Deno import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore - Deno import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MissionProcessResult {
  success: boolean
  processedCount: number
  errors: Array<{
    missionId: string
    missionType: string
    error: string
  }>
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Process pending missions
    const result = await processMissions(supabase)

    return new Response(
      JSON.stringify({
        success: result.success,
        processed_count: result.processedCount,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Mission processing error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

/**
 * Process all pending missions
 * This is a simplified version - for full logic, use the Next.js API endpoint
 */
async function processMissions(supabase: ReturnType<typeof createClient>): Promise<MissionProcessResult> {
  const errors: MissionProcessResult['errors'] = []
  let processedCount = 0

  const now = new Date().toISOString()

  // Fetch pending missions
  const { data: missions, error: fetchError } = await supabase
    .from('fleet_missions')
    .select('*')
    .eq('processed', false)
    .eq('cancelled', false)
    .lte('arrives_at', now)
    .order('arrives_at', { ascending: true })
    .limit(100)

  if (fetchError) {
    throw new Error(`Failed to fetch missions: ${fetchError.message}`)
  }

  if (!missions || missions.length === 0) {
    return { success: true, processedCount: 0, errors: [] }
  }

  // Process each mission
  for (const mission of missions) {
    try {
      await processSingleMission(supabase, mission)
      processedCount++
    } catch (error) {
      errors.push({
        missionId: mission.id,
        missionType: mission.mission_type,
        error: error instanceof Error ? error.message : String(error),
      })
      console.error(`Mission ${mission.id} error:`, error)
    }
  }

  return {
    success: errors.length === 0,
    processedCount,
    errors,
  }
}

/**
 * Process a single mission
 * Simplified implementation - handles basic cases
 */
async function processSingleMission(
  supabase: ReturnType<typeof createClient>,
  mission: Record<string, unknown>
): Promise<void> {
  const missionType = mission.mission_type as string
  const isReturning = mission.is_returning as boolean

  // Get origin planet
  const { data: originPlanet } = await supabase
    .from('planets')
    .select('*')
    .eq('id', mission.origin_planet_id)
    .single()

  // Get target planet
  const { data: targetPlanet } = await supabase
    .from('planets')
    .select('*')
    .eq('galaxy', mission.destination_galaxy)
    .eq('system', mission.destination_system)
    .eq('position', mission.destination_position)
    .eq('planet_type', mission.destination_type)
    .single()

  // Process based on mission type
  if (isReturning) {
    await processReturnMission(supabase, mission, originPlanet)
  } else {
    switch (missionType) {
      case 'transport':
        await processTransportArrival(supabase, mission, targetPlanet)
        break
      case 'deployment':
        await processDeploymentArrival(supabase, mission, targetPlanet)
        break
      case 'attack':
        // Attack requires full battle engine - skip in edge function
        // Mark as pending for Next.js API to handle
        console.log(`Attack mission ${mission.id} requires Next.js API processing`)
        return
      default:
        console.log(`Mission type ${missionType} not implemented in edge function`)
        return
    }
  }

  // Mark mission as processed
  await supabase
    .from('fleet_missions')
    .update({ processed: true })
    .eq('id', mission.id)
}

/**
 * Process transport arrival
 */
async function processTransportArrival(
  supabase: ReturnType<typeof createClient>,
  mission: Record<string, unknown>,
  targetPlanet: Record<string, unknown> | null
): Promise<void> {
  if (!targetPlanet) {
    throw new Error('Target planet not found')
  }

  // Add resources to target planet
  await supabase
    .from('planets')
    .update({
      metal: (targetPlanet.metal as number) + (mission.metal as number || 0),
      crystal: (targetPlanet.crystal as number) + (mission.crystal as number || 0),
      deuterium: (targetPlanet.deuterium as number) + (mission.deuterium as number || 0),
    })
    .eq('id', targetPlanet.id)

  // Create return mission
  const arrivalTime = new Date(mission.arrives_at as string)
  const departedTime = new Date(mission.departed_at as string)
  const duration = arrivalTime.getTime() - departedTime.getTime()
  const returnArrival = new Date(Date.now() + duration)

  await supabase.from('fleet_missions').insert({
    user_id: mission.user_id,
    origin_planet_id: mission.origin_planet_id,
    origin_galaxy: mission.destination_galaxy,
    origin_system: mission.destination_system,
    origin_position: mission.destination_position,
    destination_galaxy: mission.origin_galaxy,
    destination_system: mission.origin_system,
    destination_position: mission.origin_position,
    destination_type: 'planet',
    mission_type: 'transport',
    // Ships return, no resources
    light_fighter: mission.light_fighter,
    heavy_fighter: mission.heavy_fighter,
    cruiser: mission.cruiser,
    battleship: mission.battleship,
    battlecruiser: mission.battlecruiser,
    bomber: mission.bomber,
    destroyer: mission.destroyer,
    deathstar: mission.deathstar,
    small_cargo: mission.small_cargo,
    large_cargo: mission.large_cargo,
    colony_ship: mission.colony_ship,
    recycler: mission.recycler,
    espionage_probe: mission.espionage_probe,
    reaper: mission.reaper,
    pathfinder: mission.pathfinder,
    metal: 0,
    crystal: 0,
    deuterium: 0,
    departed_at: new Date().toISOString(),
    arrives_at: returnArrival.toISOString(),
    is_returning: true,
    processed: false,
    cancelled: false,
  })
}

/**
 * Process deployment arrival
 */
async function processDeploymentArrival(
  supabase: ReturnType<typeof createClient>,
  mission: Record<string, unknown>,
  targetPlanet: Record<string, unknown> | null
): Promise<void> {
  if (!targetPlanet) {
    throw new Error('Target planet not found')
  }

  const shipKeys = [
    'light_fighter', 'heavy_fighter', 'cruiser', 'battleship', 'battlecruiser',
    'bomber', 'destroyer', 'deathstar', 'small_cargo', 'large_cargo',
    'colony_ship', 'recycler', 'espionage_probe', 'reaper', 'pathfinder'
  ]

  // Build update object with resources and ships
  const updateData: Record<string, number> = {
    metal: (targetPlanet.metal as number) + (mission.metal as number || 0),
    crystal: (targetPlanet.crystal as number) + (mission.crystal as number || 0),
    deuterium: (targetPlanet.deuterium as number) + (mission.deuterium as number || 0),
  }

  for (const key of shipKeys) {
    const missionShips = (mission[key] as number) || 0
    const planetShips = (targetPlanet[key] as number) || 0
    updateData[key] = planetShips + missionShips
  }

  await supabase
    .from('planets')
    .update(updateData)
    .eq('id', targetPlanet.id)

  // No return mission for deployment
}

/**
 * Process return mission
 */
async function processReturnMission(
  supabase: ReturnType<typeof createClient>,
  mission: Record<string, unknown>,
  originPlanet: Record<string, unknown> | null
): Promise<void> {
  // For return missions, the destination is the original origin
  const { data: planet } = await supabase
    .from('planets')
    .select('*')
    .eq('id', mission.origin_planet_id)
    .single()

  if (!planet) {
    throw new Error('Return destination planet not found')
  }

  const shipKeys = [
    'light_fighter', 'heavy_fighter', 'cruiser', 'battleship', 'battlecruiser',
    'bomber', 'destroyer', 'deathstar', 'small_cargo', 'large_cargo',
    'colony_ship', 'recycler', 'espionage_probe', 'reaper', 'pathfinder'
  ]

  // Build update with ships and resources
  const updateData: Record<string, number> = {
    metal: (planet.metal as number) + (mission.metal as number || 0),
    crystal: (planet.crystal as number) + (mission.crystal as number || 0),
    deuterium: (planet.deuterium as number) + (mission.deuterium as number || 0),
  }

  for (const key of shipKeys) {
    const missionShips = (mission[key] as number) || 0
    const planetShips = (planet[key] as number) || 0
    updateData[key] = planetShips + missionShips
  }

  await supabase
    .from('planets')
    .update(updateData)
    .eq('id', planet.id)
}
