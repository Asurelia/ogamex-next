/**
 * AISystem - runs NPC behaviour trees at ~2Hz.
 * All AI is client-side, no cloud API calls.
 */

import type { GameEngine } from '../GameEngine'
import { ShipMeta, InputIntent } from '../ecs/components'
import { query } from 'bitecs'
import type { BTNode } from '../ai/BehaviourTree'
import { createPatrolBT, createGuardBT, createPirateBT, createMinerBT } from '../ai/bt-presets'

// Ship type IDs mapped to AI archetypes
const enum ShipType {
  PATROL = 1,
  GUARD = 2,
  PIRATE = 3,
  MINER = 4,
}

// Cache: entity ID -> behaviour tree instance
const btCache = new Map<number, BTNode>()

// Tick throttle: run AI at ~2Hz (every 500ms)
const AI_TICK_INTERVAL = 500
let timeSinceLastTick = 0

function getBTForEntity(eid: number): BTNode {
  let bt = btCache.get(eid)
  if (!bt) {
    const shipTypeId = ShipMeta.shipTypeId[eid]
    switch (shipTypeId) {
      case ShipType.GUARD:
        bt = createGuardBT(0, 0, 0)
        break
      case ShipType.PIRATE:
        bt = createPirateBT()
        break
      case ShipType.MINER:
        bt = createMinerBT()
        break
      case ShipType.PATROL:
      default:
        bt = createPatrolBT()
        break
    }
    btCache.set(eid, bt)
  }
  return bt
}

function resetInputIntent(eid: number): void {
  InputIntent.moveToX[eid] = 0
  InputIntent.moveToY[eid] = 0
  InputIntent.moveToZ[eid] = 0
  InputIntent.wantFire[eid] = 0
  InputIntent.wantWarp[eid] = 0
  InputIntent.wantDock[eid] = 0
}

export function aiSystem(engine: GameEngine, dt: number): void {
  timeSinceLastTick += dt * 1000

  if (timeSinceLastTick < AI_TICK_INTERVAL) {
    return
  }
  timeSinceLastTick = 0

  const world = engine.getWorld()
  if (!world) return

  const entities = query(world, [ShipMeta, InputIntent])

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]

    if (ShipMeta.isNpc[eid] !== 1) continue
    if (ShipMeta.isDocked[eid] === 1) continue

    resetInputIntent(eid)

    const bt = getBTForEntity(eid)
    bt.tick(eid)
  }
}

export function removeAIEntity(eid: number): void {
  btCache.delete(eid)
}

export function clearAICache(): void {
  btCache.clear()
}
