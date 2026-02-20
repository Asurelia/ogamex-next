/**
 * ClientECS - bitecs 0.4.x world wrapper
 *
 * Manages the ECS world, entity lifecycle, and session→entity mapping.
 */

import {
  createWorld,
  addEntity,
  removeEntity,
  addComponent,
  addComponents,
  hasComponent,
} from 'bitecs'
import {
  Position,
  Velocity,
  Rotation,
  Health,
  ShipMeta,
  NetworkId,
  RenderRef,
  InputIntent,
} from './components'

interface ShipSpawnOptions {
  sessionId: string
  shipTypeId: number
  faction: number
  x?: number
  y?: number
  z?: number
  hp?: number
  hpMax?: number
  shield?: number
  shieldMax?: number
  armor?: number
  armorMax?: number
  isNpc?: boolean
}

export class ClientECS {
  private world: ReturnType<typeof createWorld> | null = null
  private sessionToEid: Map<string, number> = new Map()
  private eidToSession: Map<number, string> = new Map()
  private sessionIndexCounter: number = 0
  private sessionIndexToId: Map<number, string> = new Map()

  createWorld() {
    this.world = createWorld()
    this.sessionToEid.clear()
    this.eidToSession.clear()
    this.sessionIndexCounter = 0
    this.sessionIndexToId.clear()
    return this.world
  }

  getWorld() {
    if (!this.world) {
      throw new Error('ClientECS: world not initialized. Call createWorld() first.')
    }
    return this.world
  }

  addShipEntity(options: ShipSpawnOptions): number {
    const world = this.getWorld()

    if (this.sessionToEid.has(options.sessionId)) {
      return this.sessionToEid.get(options.sessionId)!
    }

    const eid = addEntity(world)
    const sessionIndex = ++this.sessionIndexCounter

    addComponents(world, eid, Position, Velocity, Rotation, Health, ShipMeta, NetworkId, RenderRef)

    Position.x[eid] = options.x ?? 0
    Position.y[eid] = options.y ?? 0
    Position.z[eid] = options.z ?? 0

    Velocity.x[eid] = 0
    Velocity.y[eid] = 0
    Velocity.z[eid] = 0

    Rotation.x[eid] = 0
    Rotation.y[eid] = 0
    Rotation.z[eid] = 0

    Health.hp[eid] = options.hp ?? options.hpMax ?? 100
    Health.hpMax[eid] = options.hpMax ?? 100
    Health.shield[eid] = options.shield ?? options.shieldMax ?? 0
    Health.shieldMax[eid] = options.shieldMax ?? 0
    Health.armor[eid] = options.armor ?? options.armorMax ?? 0
    Health.armorMax[eid] = options.armorMax ?? 0

    ShipMeta.shipTypeId[eid] = options.shipTypeId
    ShipMeta.faction[eid] = options.faction
    ShipMeta.state[eid] = 0
    ShipMeta.isNpc[eid] = options.isNpc ? 1 : 0
    ShipMeta.isDocked[eid] = 0

    if (options.isNpc) {
      addComponent(world, eid, InputIntent)
      InputIntent.targetEid[eid] = -1
    }

    NetworkId.sessionIndex[eid] = sessionIndex

    RenderRef.meshIndex[eid] = -1
    RenderRef.lodLevel[eid] = 0

    this.sessionToEid.set(options.sessionId, eid)
    this.eidToSession.set(eid, options.sessionId)
    this.sessionIndexToId.set(sessionIndex, options.sessionId)

    return eid
  }

  removeEntity(sessionId: string): boolean {
    const world = this.getWorld()
    const eid = this.sessionToEid.get(sessionId)
    if (eid === undefined) return false

    const sessionIndex = NetworkId.sessionIndex[eid]
    removeEntity(world, eid)
    this.sessionToEid.delete(sessionId)
    this.eidToSession.delete(eid)
    this.sessionIndexToId.delete(sessionIndex)
    return true
  }

  getEntity(sessionId: string): number | undefined {
    return this.sessionToEid.get(sessionId)
  }

  /** O(1) reverse lookup: get sessionId from entity id */
  getSessionId(eid: number): string | undefined {
    return this.eidToSession.get(eid)
  }

  updateComponent<T extends Record<string, ArrayLike<number>>>(
    eid: number,
    component: T,
    values: Partial<{ [K in keyof T]: number }>
  ): void {
    for (const key in values) {
      if (key in component) {
        (component[key] as unknown as number[])[eid] = values[key] as number
      }
    }
  }

  getAllSessionIds(): string[] {
    return Array.from(this.sessionToEid.keys())
  }

  getEntityCount(): number {
    return this.sessionToEid.size
  }

  destroy(): void {
    this.sessionToEid.clear()
    this.eidToSession.clear()
    this.sessionIndexToId.clear()
    this.sessionIndexCounter = 0
    this.world = null
  }
}
