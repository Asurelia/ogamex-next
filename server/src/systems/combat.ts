/**
 * Combat System
 *
 * Real-time combat adapted from AdvancedBattleEngine.
 * Per-tick DPS with layered damage (shield → armor → hull).
 * Range checks for weapons.
 */

import { SystemState, ShipState, ShipStateEnum } from '../schema/GameState'
import { DAMAGE_EFFECTIVENESS } from '../../../src/lib/battle/damage-types'

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

/** Damage type distribution by faction */
const FACTION_DAMAGE: Record<string, { ballistic: number; ionic: number; explosive: number }> = {
  amarr: { ballistic: 0.1, ionic: 0.7, explosive: 0.2 },
  caldari: { ballistic: 0.2, ionic: 0.3, explosive: 0.5 },
  gallente: { ballistic: 0.3, ionic: 0.4, explosive: 0.3 },
  minmatar: { ballistic: 0.6, ionic: 0.1, explosive: 0.3 },
  pirate: { ballistic: 0.4, ionic: 0.2, explosive: 0.4 },
  npc: { ballistic: 0.34, ionic: 0.33, explosive: 0.33 },
}

/**
 * Update combat for all attacking ships
 */
export function updateCombat(
  state: SystemState,
  dt: number,
  onDamage: CombatCallback
): void {
  state.ships.forEach((ship) => {
    if (ship.state !== ShipStateEnum.ATTACKING || !ship.targetId) return
    if (ship.isDocked || ship.hp <= 0) return

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
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (dist > MAX_WEAPON_RANGE) return // Out of range

    // Calculate DPS for this tick
    const dps = getShipDPS(ship)
    const damageThisTick = dps * dt

    if (damageThisTick <= 0) return

    // Get damage distribution
    const faction = ship.faction || 'npc'
    const dist_profile = FACTION_DAMAGE[faction] || FACTION_DAMAGE.npc

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

  // Shield regeneration for all non-destroyed ships
  state.ships.forEach((ship) => {
    if (ship.hp <= 0 || ship.isDocked) return

    // Shield regens at ~2% per second
    const shieldRegen = ship.shieldMax * 0.02 * dt
    ship.shield = Math.min(ship.shieldMax, ship.shield + shieldRegen)

    // Capacitor regens at ~1% per second
    const capRegen = ship.capacitorMax * 0.01 * dt
    ship.capacitor = Math.min(ship.capacitorMax, ship.capacitor + capRegen)
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
