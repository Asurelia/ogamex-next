/**
 * Combat System
 *
 * Real-time combat adapted from AdvancedBattleEngine.
 * Per-tick DPS with layered damage (shield → armor → hull).
 * Range checks for weapons.
 */

import { SystemState, ShipState, ShipStateEnum } from '../schema/GameState'
import { getFactionDamageProfile } from '../../../src/data/faction-identities'

/**
 * Damage effectiveness multipliers per damage type vs defense layer.
 * Ballistic: effective vs armor/hull, weak vs shields
 * Ionic: effective vs shields, weak vs armor
 * Explosive: weak vs shields, effective vs armor
 */
const DAMAGE_EFFECTIVENESS = {
  ballistic: { vsShield: 0.8, vsArmor: 1.0, vsHull: 1.0 },
  ionic:     { vsShield: 1.2, vsArmor: 0.6, vsHull: 0.8 },
  explosive: { vsShield: 0.6, vsArmor: 1.2, vsHull: 1.0 },
} as const

type CombatCallback = (
  attackerId: string,
  targetId: string,
  shieldDamage: number,
  armorDamage: number,
  hullDamage: number,
  damageType: string,
  isCritical: boolean,
  isKill: boolean
) => void

/** Maximum weapon range in meters */
const MAX_WEAPON_RANGE = 50000 // 50km

/** Base DPS by ship class */
const BASE_DPS: Record<string, number> = {
  shuttle: 0,
  capsule: 0,
  frigate: 50,
  destroyer: 80,
  cruiser: 150,
  battlecruiser: 250,
  battleship: 400,
  industrial: 10,
  mining_barge: 5,
}

/**
 * Update combat for all attacking ships
 */
export function updateCombat(
  state: SystemState,
  dt: number,
  onDamage: CombatCallback
): void {
  // Single pass: combat + shield/capacitor regeneration (avoids iterating all ships twice)
  state.ships.forEach((ship) => {
    // Skip destroyed and docked ships entirely
    if (ship.hp <= 0 || ship.isDocked) return

    // --- Shield + Capacitor regeneration (for ALL alive undocked ships) ---
    if (ship.shield < ship.shieldMax) {
      ship.shield = Math.min(ship.shieldMax, ship.shield + ship.shieldMax * 0.02 * dt)
    }
    if (ship.capacitor < ship.capacitorMax) {
      ship.capacitor = Math.min(ship.capacitorMax, ship.capacitor + ship.capacitorMax * 0.01 * dt)
    }

    // --- Combat (only for attacking ships) ---
    if (ship.state !== ShipStateEnum.ATTACKING || !ship.targetId) return

    const target = state.ships.get(ship.targetId)
    if (!target || target.hp <= 0 || target.isDocked) {
      ship.state = ShipStateEnum.IDLE
      ship.targetId = ''
      return
    }

    // Range check
    const dx = target.x - ship.x
    const dy = target.y - ship.y
    const dz = target.z - ship.z
    const distSq = dx * dx + dy * dy + dz * dz

    // Use squared distance to avoid sqrt when possible
    if (distSq > MAX_WEAPON_RANGE * MAX_WEAPON_RANGE) return // Out of range

    // Calculate DPS for this tick
    const dps = getShipDPS(ship)
    const damageThisTick = dps * dt

    if (damageThisTick <= 0) return

    // Get damage distribution from faction identities
    const faction = ship.faction || 'npc'
    const dist_profile = getFactionDamageProfile(faction)

    const ballisticDmg = damageThisTick * dist_profile.ballistic
    const ionicDmg = damageThisTick * dist_profile.ionic
    const explosiveDmg = damageThisTick * dist_profile.explosive

    // Critical hit check (5% base chance)
    const isCritical = Math.random() < 0.05
    const critMultiplier = isCritical ? 1.5 : 1.0

    // Apply layered damage
    const result = applyLayeredDamage(
      target,
      ballisticDmg * critMultiplier,
      ionicDmg * critMultiplier,
      explosiveDmg * critMultiplier
    )

    // Check for kill
    const isKill = target.hp <= 0
    if (isKill) {
      target.state = ShipStateEnum.DESTROYED
      target.speed = 0
      target.vx = 0
      target.vy = 0
      target.vz = 0
    }

    // Notify
    const primaryType = dist_profile.ballistic >= dist_profile.ionic && dist_profile.ballistic >= dist_profile.explosive
      ? 'ballistic'
      : dist_profile.ionic >= dist_profile.explosive
        ? 'ionic'
        : 'explosive'

    onDamage(
      ship.id,
      target.id,
      result.shieldDamage,
      result.armorDamage,
      result.hullDamage,
      primaryType,
      isCritical,
      isKill
    )
  })
}

// ============================================================================
// DAMAGE APPLICATION
// ============================================================================

interface DamageResult {
  shieldDamage: number
  armorDamage: number
  hullDamage: number
}

function applyLayeredDamage(
  target: ShipState,
  ballistic: number,
  ionic: number,
  explosive: number
): DamageResult {
  let shieldDamage = 0
  let armorDamage = 0
  let hullDamage = 0

  // Calculate effective damage against each layer
  const vsShield =
    ballistic * DAMAGE_EFFECTIVENESS.ballistic.vsShield +
    ionic * DAMAGE_EFFECTIVENESS.ionic.vsShield +
    explosive * DAMAGE_EFFECTIVENESS.explosive.vsShield

  const vsArmor =
    ballistic * DAMAGE_EFFECTIVENESS.ballistic.vsArmor +
    ionic * DAMAGE_EFFECTIVENESS.ionic.vsArmor +
    explosive * DAMAGE_EFFECTIVENESS.explosive.vsArmor

  const vsHull =
    ballistic * DAMAGE_EFFECTIVENESS.ballistic.vsHull +
    ionic * DAMAGE_EFFECTIVENESS.ionic.vsHull +
    explosive * DAMAGE_EFFECTIVENESS.explosive.vsHull

  // Shield absorbs first
  if (target.shield > 0) {
    shieldDamage = Math.min(target.shield, vsShield)
    target.shield -= shieldDamage
  }

  // Remaining shield damage overflows to armor at 50% efficiency
  const shieldOverflow = Math.max(0, vsShield - shieldDamage) * 0.5

  // Armor absorbs next
  const totalArmorDmg = vsArmor + shieldOverflow
  if (target.armor > 0) {
    armorDamage = Math.min(target.armor, totalArmorDmg)
    target.armor -= armorDamage
  }

  // Remaining armor damage overflows to hull
  const armorOverflow = Math.max(0, totalArmorDmg - armorDamage)

  // Hull takes direct hull damage + overflow
  hullDamage = vsHull + armorOverflow
  target.hp = Math.max(0, target.hp - hullDamage)

  return {
    shieldDamage: Math.round(shieldDamage),
    armorDamage: Math.round(armorDamage),
    hullDamage: Math.round(hullDamage),
  }
}

function getShipDPS(ship: ShipState): number {
  // Determine base DPS from ship type (simplified)
  const shipClass = getShipClass(ship.shipTypeId)
  return BASE_DPS[shipClass] || 50
}

function getShipClass(shipTypeId: string): string {
  // Extract class from type ID (e.g., 'caldari_frigate' → 'frigate')
  const parts = shipTypeId.split('_')
  return parts[parts.length - 1] || 'frigate'
}
