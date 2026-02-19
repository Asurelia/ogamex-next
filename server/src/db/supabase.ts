/**
 * Supabase Admin Client
 *
 * Uses service_role key to bypass RLS for server-side operations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { CONFIG } from '../config'
// Ship types are now loaded from static constants instead of Supabase.
// Use getShipTypeOrDefault from @shared/data/ship-type-lookup for all ship type lookups.
import { getShipTypeOrDefault } from '@shared/data/ship-type-lookup'

let supabaseAdmin: SupabaseClient | null = null

/**
 * Get or create the Supabase admin client (service_role, bypasses RLS).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }
  return supabaseAdmin
}

// ============================================================================
// SHIP OPERATIONS
// ============================================================================

/** Default starter system (Jita) */
const STARTER_SYSTEM_ID = '7127c86d-a096-4b4e-8de1-755a22bb168a'

/** Default starter ship type */
const STARTER_SHIP_TYPE = 'caldari_frigate'

export async function loadShipForPlayer(userId: string) {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('rt_ships')
    .select('*')
    .eq('owner_id', userId)
    .eq('is_active', true)
    .single()

  if (data) {
    const shipType = getShipTypeOrDefault(data.ship_type_id ?? '')
    return { ...data, rt_ship_types: shipType }
  }

  // No active ship found - create a starter ship
  if (error && error.code !== 'PGRST116') {
    // PGRST116 = "no rows returned" - expected for new players
    throw new Error(`Failed to load ship: ${error.message}`)
  }

  console.log(`[DB] Creating starter ship for new player ${userId}`)
  const starterType = getShipTypeOrDefault(STARTER_SHIP_TYPE)

  const { data: newShip, error: createError } = await db
    .from('rt_ships')
    .insert({
      owner_id: userId,
      ship_type_id: STARTER_SHIP_TYPE,
      system_id: STARTER_SYSTEM_ID,
      position_x: (Math.random() - 0.5) * 10000,
      position_y: (Math.random() - 0.5) * 2000,
      position_z: (Math.random() - 0.5) * 10000,
      current_hp: starterType.baseHp,
      current_shield: starterType.baseShield,
      current_armor: starterType.baseArmor,
      is_active: true,
      is_docked: false,
    })
    .select('*')
    .single()

  if (createError) throw new Error(`Failed to create starter ship: ${createError.message}`)

  return { ...newShip, rt_ship_types: starterType }
}

export async function saveShipState(shipId: string, state: {
  system_id: string
  position_x: number
  position_y: number
  position_z: number
  current_hp: number
  current_shield: number
  current_armor: number
  is_docked: boolean
  fitting?: unknown[]
  cargo?: unknown[]
}) {
  const db = getSupabaseAdmin()
  const { error } = await db
    .from('rt_ships')
    .update({ ...state, updated_at: new Date().toISOString() })
    .eq('id', shipId)

  if (error) throw new Error(`Failed to save ship: ${error.message}`)
}

export async function batchSaveShips(ships: Array<{
  id: string
  system_id: string
  position_x: number
  position_y: number
  position_z: number
  current_hp: number
  current_shield: number
  current_armor: number
  is_docked: boolean
}>) {
  const db = getSupabaseAdmin()
  const now = new Date().toISOString()

  // Supabase upsert for batch save
  const { error } = await db
    .from('rt_ships')
    .upsert(
      ships.map(s => ({ ...s, updated_at: now })),
      { onConflict: 'id' }
    )

  if (error) throw new Error(`Failed to batch save ships: ${error.message}`)
}

// ============================================================================
// SYSTEM OPERATIONS
// ============================================================================

export async function loadSolarSystem(systemId: string) {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('rt_solar_systems')
    .select('*')
    .eq('id', systemId)
    .single()

  if (error) throw new Error(`Failed to load system: ${error.message}`)
  return data
}

export async function loadSystemStations(systemId: string) {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('rt_stations')
    .select('*')
    .eq('system_id', systemId)

  if (error) throw new Error(`Failed to load stations: ${error.message}`)
  return data ?? []
}

export async function loadShipsInSystem(systemId: string) {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('rt_ships')
    .select('*')
    .eq('system_id', systemId)
    .eq('is_docked', false)

  if (error) throw new Error(`Failed to load ships in system: ${error.message}`)
  // Ship type definitions are resolved from static constants, not from the database join.
  return (data ?? []).map(ship => ({
    ...ship,
    rt_ship_types: getShipTypeOrDefault(ship.ship_type_id ?? ''),
  }))
}
