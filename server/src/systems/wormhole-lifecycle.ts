/**
 * Wormhole Lifecycle System
 *
 * Tick every 5 minutes: spawn/despawn wormhole connections,
 * manage mass, track stage progression, handle collapse.
 * All persistence via SQLite (persistence.ts).
 */

import {
  getExpiredWormholes, collapseWormhole, deleteCollapsedWormholes,
  getActiveWormholes, updateWhStage, getAllWormholeSystems,
  countWhConnectionsForSystem, createDynamicConnection, createWhConnection,
  deleteDynamicConnection, getWhByConnectionId, updateWhMass,
} from '../services/persistence'
import { loadAllSolarSystemIds } from '../db/supabase'

// ============================================================================
// WORMHOLE TYPES
// ============================================================================

interface WHTypeDefinition {
  id: string
  destinationClass: number | null
  massTotal: number
  massPerJump: number
  lifetimeHours: number
}

const WH_TYPES: WHTypeDefinition[] = [
  { id: 'C125', destinationClass: 1, massTotal: 500000000, massPerJump: 20000000, lifetimeHours: 16 },
  { id: 'C247', destinationClass: 3, massTotal: 2000000000, massPerJump: 300000000, lifetimeHours: 24 },
  { id: 'C391', destinationClass: null, massTotal: 1000000000, massPerJump: 100000000, lifetimeHours: 24 },
  { id: 'D382', destinationClass: 2, massTotal: 2000000000, massPerJump: 300000000, lifetimeHours: 24 },
  { id: 'H121', destinationClass: 1, massTotal: 500000000, massPerJump: 20000000, lifetimeHours: 16 },
  { id: 'K162', destinationClass: null, massTotal: 2000000000, massPerJump: 300000000, lifetimeHours: 24 },
  { id: 'N110', destinationClass: null, massTotal: 1000000000, massPerJump: 300000000, lifetimeHours: 24 },
  { id: 'O477', destinationClass: 4, massTotal: 2000000000, massPerJump: 300000000, lifetimeHours: 24 },
  { id: 'R943', destinationClass: 2, massTotal: 750000000, massPerJump: 300000000, lifetimeHours: 16 },
  { id: 'Z457', destinationClass: 5, massTotal: 2000000000, massPerJump: 300000000, lifetimeHours: 24 },
]

// ============================================================================
// EFFECTS
// ============================================================================

export interface WHEffect {
  name: string
  modifiers: Record<string, number>
}

export const WH_EFFECTS: Record<string, WHEffect> = {
  magnetar: { name: 'Magnetar', modifiers: { damage_bonus: 0.44, armor_resist: -0.22, shield_resist: -0.22 } },
  black_hole: { name: 'Black Hole', modifiers: { velocity_bonus: 0.44, inertia_penalty: 0.44, lock_range_penalty: -0.22 } },
  pulsar: { name: 'Pulsar', modifiers: { shield_hp_bonus: 0.44, armor_resist_penalty: -0.22, cap_recharge_penalty: -0.22 } },
  wolf_rayet: { name: 'Wolf-Rayet', modifiers: { small_weapon_damage: 0.44, armor_hp_bonus: 0.22, shield_resist_penalty: -0.22 } },
  cataclysmic_variable: { name: 'Cataclysmic Variable', modifiers: { cap_capacity_bonus: 0.44, cap_recharge_bonus: 0.44, armor_repair_penalty: -0.22, shield_boost_penalty: -0.22 } },
  red_giant: { name: 'Red Giant', modifiers: { smartbomb_damage: 0.44, heat_damage_bonus: 0.22, overload_bonus: 0.22 } },
}

// Cache of all solar system IDs for random destination selection
let _solarSystemIds: string[] | null = null

async function getSolarSystemIds(): Promise<string[]> {
  if (_solarSystemIds) return _solarSystemIds
  _solarSystemIds = await loadAllSolarSystemIds()
  return _solarSystemIds
}

// ============================================================================
// MAIN TICK (every 5 minutes)
// ============================================================================

export async function tickWormholeLifecycle(): Promise<void> {
  const nowTs = Math.floor(Date.now() / 1000)

  // 1. Expire old connections
  const expired = getExpiredWormholes(nowTs)
  if (expired.length > 0) {
    for (const wh of expired) {
      collapseWormhole(wh.id)
      if (wh.connection_id) {
        deleteDynamicConnection(wh.connection_id)
      }
    }
    deleteCollapsedWormholes()
  }

  // 2. Update stages based on mass
  const active = getActiveWormholes()
  for (const wh of active) {
    const massPercent = (wh.mass_remaining as number) / (wh.mass_total as number)
    let newStage = 'fresh'
    if (massPercent <= 0.1) newStage = 'critical'
    else if (massPercent <= 0.5) newStage = 'half_mass'

    const expiresAt = wh.expires_at as number
    const hoursLeft = Math.max(0, (expiresAt - nowTs) / 3600)

    if (newStage !== wh.stage || Math.abs(hoursLeft - (wh.time_remaining_hours as number)) > 0.1) {
      updateWhStage(wh.id as string, newStage, hoursLeft)
    }
  }

  // 3. Spawn new connections for WH systems that are below their static count
  const whSystems = getAllWormholeSystems()
  for (const whSys of whSystems) {
    if (!whSys.static_connection_type) continue

    const count = countWhConnectionsForSystem(whSys.system_id as string)
    if (count < 1) {
      await spawnWormholeConnection(whSys.system_id as string, whSys.static_connection_type as string)
    }
  }
}

async function spawnWormholeConnection(systemId: string, whType: string): Promise<void> {
  const typeInfo = WH_TYPES.find(t => t.id === whType) || WH_TYPES[5] // default to K162

  const systemIds = await getSolarSystemIds()
  const filtered = systemIds.filter(id => id !== systemId)
  if (filtered.length === 0) return

  const destSystem = filtered[Math.floor(Math.random() * filtered.length)]
  const expiresAt = Math.floor(Date.now() / 1000) + typeInfo.lifetimeHours * 3600

  // Create dynamic_connection in SQLite
  const connId = createDynamicConnection(systemId, destSystem, 'wormhole', false, expiresAt)

  // Create WH connection details
  createWhConnection(connId, whType, typeInfo.massTotal, typeInfo.massPerJump, typeInfo.lifetimeHours, expiresAt)
}

/**
 * Process a ship transiting through a wormhole (deduct mass).
 */
export function transitWormhole(connectionId: string, shipMass: number): { allowed: boolean; collapsed: boolean } {
  const wh = getWhByConnectionId(connectionId)
  if (!wh || wh.stage === 'collapsed') return { allowed: false, collapsed: true }
  if (shipMass > (wh.max_mass_per_jump as number)) return { allowed: false, collapsed: false }

  const newMass = (wh.mass_remaining as number) - shipMass
  const collapsed = newMass <= 0

  if (collapsed) {
    collapseWormhole(wh.id as string)
    deleteDynamicConnection(connectionId)
  } else {
    updateWhMass(wh.id as string, newMass)
  }

  return { allowed: true, collapsed }
}
