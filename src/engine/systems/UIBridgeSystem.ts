import type { GameEngine } from '../GameEngine'
import { Position, Health, ShipMeta, NetworkId } from '../ecs/components'
import { query } from 'bitecs'
import { useRTGameStore } from '@/stores/rtGameStore'
import type { ShipData } from '@/stores/rtGameStore'

const THROTTLE_TICKS = 6
let _tickCount = 0
let _knownEids: Set<number> = new Set()

const FACTION_NAMES: readonly string[] = [
  'amarr',
  'caldari',
  'gallente',
  'minmatar',
  'pirate',
  'npc',
]

export function uiBridgeSystem(engine: GameEngine, _dt: number): void {
  _tickCount++
  if (_tickCount < THROTTLE_TICKS) return
  _tickCount = 0

  const world = engine.getWorld()
  if (!world) return

  const ecs = engine.getECS()
  const store = useRTGameStore.getState()

  const entities = query(world, [Position, Health, ShipMeta, NetworkId])
  const seenEids = new Set<number>()

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]
    seenEids.add(eid)

    // Resolve sessionId from ECS reverse lookup
    const allSessions = ecs.getAllSessionIds()
    let sessionId = `eid_${eid}`
    for (const sid of allSessions) {
      if (ecs.getEntity(sid) === eid) {
        sessionId = sid
        break
      }
    }

    const factionIdx = ShipMeta.faction[eid]
    const factionName = FACTION_NAMES[factionIdx] ?? 'npc'

    const shipData: ShipData = {
      id: sessionId,
      ownerId: sessionId,
      ownerName: sessionId,
      shipTypeId: String(ShipMeta.shipTypeId[eid]),
      faction: factionName,
      x: Position.x[eid],
      y: Position.y[eid],
      z: Position.z[eid],
      vx: 0,
      vy: 0,
      vz: 0,
      rx: 0,
      ry: 0,
      rz: 0,
      speed: 0,
      maxSpeed: 0,
      state: ShipMeta.state[eid],
      targetId: '',
      hp: Health.hp[eid],
      hpMax: Health.hpMax[eid],
      shield: Health.shield[eid],
      shieldMax: Health.shieldMax[eid],
      armor: Health.armor[eid],
      armorMax: Health.armorMax[eid],
      capacitor: 0,
      capacitorMax: 0,
      isDocked: ShipMeta.isDocked[eid] === 1,
      isNpc: ShipMeta.isNpc[eid] === 1,
    }

    store.setShip(sessionId, shipData)
    _knownEids.add(eid)
  }

  // Remove ships that no longer exist in ECS
  for (const eid of _knownEids) {
    if (!seenEids.has(eid)) {
      const allSessions = ecs.getAllSessionIds()
      let sessionId = `eid_${eid}`
      for (const sid of allSessions) {
        if (ecs.getEntity(sid) === eid) {
          sessionId = sid
          break
        }
      }
      store.removeShip(sessionId)
      _knownEids.delete(eid)
    }
  }

  // Push debug metrics
  try {
    const { useEngineDebugStore } = require('@/engine/debug/EngineDebugStore')
    useEngineDebugStore.getState().updateMetrics({
      entityCount: entities.length,
      systemCount: engine.getSystemCount(),
      fps: 1 / (_dt || 1 / 60),
      frameTime: (_dt || 1 / 60) * 1000,
    })
  } catch {}
}
