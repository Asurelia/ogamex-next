/**
 * Supabase Admin Client — Bootstrap Only
 *
 * Used exclusively for:
 *   1. Auth JWT validation (via jwt-validator.ts)
 *   2. Loading static solar system / station data at room creation
 *   3. One-time bootstrap of skill definitions, implant types, etc.
 *
 * All gameplay state persistence goes through persistence.ts → SQLite.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { CONFIG } from '../config'

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
// STATIC BOOTSTRAP DATA (read once from Supabase at startup)
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

/**
 * Load all skill definitions from Supabase (one-time at boot).
 */
export async function loadSkillDefinitions(): Promise<Array<Record<string, unknown>>> {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('rt_skill_definitions')
    .select('id, name, training_multiplier, primary_attribute, secondary_attribute, description')

  if (error) {
    console.error('[Bootstrap] Failed to load skill definitions:', error.message)
    return []
  }
  return data ?? []
}

/**
 * Load all implant types from Supabase (one-time at boot).
 */
export async function loadImplantTypes(): Promise<Array<Record<string, unknown>>> {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('rt_implant_types')
    .select('id, name, slot, attribute_bonus_type, attribute_bonus_value, description')

  if (error) {
    console.error('[Bootstrap] Failed to load implant types:', error.message)
    return []
  }
  return data ?? []
}

/**
 * Load wormhole system definitions from Supabase (one-time at boot).
 */
export async function loadWormholeSystems(): Promise<Array<Record<string, unknown>>> {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('rt_wormhole_systems')
    .select('system_id, wh_class, wh_effect, static_connection_type')

  if (error) {
    console.error('[Bootstrap] Failed to load wormhole systems:', error.message)
    return []
  }
  return data ?? []
}

/**
 * Load planet resources from Supabase (one-time at boot).
 */
export async function loadPlanetResources(): Promise<Array<Record<string, unknown>>> {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('rt_planet_resources')
    .select('id, system_id, resource_type, abundance')

  if (error) {
    console.error('[Bootstrap] Failed to load planet resources:', error.message)
    return []
  }
  return data ?? []
}

/**
 * Load all solar systems (for wormhole destination selection).
 */
export async function loadAllSolarSystemIds(): Promise<string[]> {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('rt_solar_systems')
    .select('id')

  if (error) {
    console.error('[Bootstrap] Failed to load solar system IDs:', error.message)
    return []
  }
  return (data ?? []).map(r => r.id)
}
