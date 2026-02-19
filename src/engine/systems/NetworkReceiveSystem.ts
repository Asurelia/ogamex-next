import type { GameEngine } from '../GameEngine'
import { Position, Velocity, Rotation, Health, ShipMeta } from '../ecs/components'

export interface NetworkSnapshot {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  rx: number
  ry: number
  rz: number
  hp: number
  shield: number
  armor: number
  state: number
  faction: number
}

const _buffer: Map<string, NetworkSnapshot> = new Map()

export function pushNetworkSnapshot(sessionId: string, snapshot: NetworkSnapshot): void {
  _buffer.set(sessionId, snapshot)
}

export function networkReceiveSystem(engine: GameEngine, _dt: number): void {
  if (_buffer.size === 0) return

  const ecs = engine.getECS()

  for (const [sessionId, snap] of _buffer) {
    const eid = ecs.getEntity(sessionId)
    if (eid === undefined) continue

    Position.x[eid] = snap.x
    Position.y[eid] = snap.y
    Position.z[eid] = snap.z

    Velocity.x[eid] = snap.vx
    Velocity.y[eid] = snap.vy
    Velocity.z[eid] = snap.vz

    Rotation.x[eid] = snap.rx
    Rotation.y[eid] = snap.ry
    Rotation.z[eid] = snap.rz

    Health.hp[eid] = snap.hp
    Health.shield[eid] = snap.shield
    Health.armor[eid] = snap.armor

    ShipMeta.state[eid] = snap.state
    ShipMeta.faction[eid] = snap.faction
  }

  _buffer.clear()
}
