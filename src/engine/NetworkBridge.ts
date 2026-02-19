import type { Room } from 'colyseus.js'
import { getEngine } from './GameEngine'
import { pushNetworkSnapshot } from './systems/NetworkReceiveSystem'
import { setOwnShipEid, feedInterpolation, feedOwnShipState } from './systems/ClientPredictionSystem'
import { useRTGameStore } from '@/stores/rtGameStore'
import type { ShipData, AsteroidData, StationData } from '@/stores/rtGameStore'

class NetworkBridge {
  private room: Room | null = null
  private ownSessionId: string = ''

  connect(room: Room, ownSessionId: string): void {
    this.room = room
    this.ownSessionId = ownSessionId

    const store = useRTGameStore.getState()
    const engine = getEngine()

    // System info listeners
    room.state.listen('systemId', (value: string) => {
      const s = useRTGameStore.getState()
      s.setSystemInfo(value, s.systemName, s.securityLevel)
    })

    room.state.listen('systemName', (value: string) => {
      const s = useRTGameStore.getState()
      s.setSystemInfo(s.systemId, value, s.securityLevel)
    })

    // Ships
    room.state.ships.onAdd((ship: ShipData & { shipTypeId: string; faction: string }, key: string) => {
      const factionIndex = this._factionToIndex(ship.faction)
      const shipTypeIndex = parseInt(ship.shipTypeId, 10) || 0

      const eid = engine.getECS().addShipEntity({
        sessionId: key,
        shipTypeId: shipTypeIndex,
        faction: factionIndex,
        x: ship.x,
        y: ship.y,
        z: ship.z,
        hp: ship.hp,
        hpMax: ship.hpMax,
        shield: ship.shield,
        shieldMax: ship.shieldMax,
        armor: ship.armor,
        armorMax: ship.armorMax,
        isNpc: ship.isNpc,
      })

      pushNetworkSnapshot(key, {
        x: ship.x, y: ship.y, z: ship.z,
        vx: ship.vx, vy: ship.vy, vz: ship.vz,
        rx: ship.rx, ry: ship.ry, rz: ship.rz,
        hp: ship.hp, shield: ship.shield, armor: ship.armor,
        state: ship.state, faction: factionIndex,
      })

      if (key === ownSessionId) {
        setOwnShipEid(eid)
        feedOwnShipState(
          { x: ship.x, y: ship.y, z: ship.z },
          { x: ship.vx, y: ship.vy, z: ship.vz }
        )
        useRTGameStore.getState().setMyShipId(key)
      }

      useRTGameStore.getState().setShip(key, ship as unknown as ShipData)
    })

    room.state.ships.onChange((ship: ShipData & { shipTypeId: string; faction: string }, key: string) => {
      const factionIndex = this._factionToIndex(ship.faction)

      pushNetworkSnapshot(key, {
        x: ship.x, y: ship.y, z: ship.z,
        vx: ship.vx, vy: ship.vy, vz: ship.vz,
        rx: ship.rx, ry: ship.ry, rz: ship.rz,
        hp: ship.hp, shield: ship.shield, armor: ship.armor,
        state: ship.state, faction: factionIndex,
      })

      const eid = engine.getECS().getEntity(key)
      if (eid !== undefined) {
        feedInterpolation(eid, {
          position: { x: ship.x, y: ship.y, z: ship.z },
          velocity: { x: ship.vx, y: ship.vy, z: ship.vz },
          rotation: { x: ship.rx, y: ship.ry, z: ship.rz },
          timestamp: Date.now(),
        })

        if (key === ownSessionId) {
          feedOwnShipState(
            { x: ship.x, y: ship.y, z: ship.z },
            { x: ship.vx, y: ship.vy, z: ship.vz }
          )
        }
      }

      useRTGameStore.getState().setShip(key, ship as unknown as ShipData)
    })

    room.state.ships.onRemove((_ship: unknown, key: string) => {
      engine.getECS().removeEntity(key)
      useRTGameStore.getState().removeShip(key)
    })

    // Asteroids (store only, no ECS)
    room.state.asteroids.onAdd((asteroid: AsteroidData, key: string) => {
      useRTGameStore.getState().setAsteroid(key, asteroid)
    })

    room.state.asteroids.onChange((asteroid: AsteroidData, key: string) => {
      useRTGameStore.getState().setAsteroid(key, asteroid)
    })

    room.state.asteroids.onRemove((_asteroid: unknown, key: string) => {
      useRTGameStore.getState().removeAsteroid(key)
    })

    // Stations (store only, no ECS)
    room.state.stations.onAdd((station: StationData, key: string) => {
      useRTGameStore.getState().setStation(key, station)
    })

    room.state.stations.onChange((station: StationData, key: string) => {
      useRTGameStore.getState().setStation(key, station)
    })

    room.state.stations.onRemove((_station: unknown, key: string) => {
      useRTGameStore.getState().removeStation(key)
    })

    // Server messages
    room.onMessage('system_chat', (data: { channel: string; senderId: string; senderName: string; content: string; timestamp: number }) => {
      useRTGameStore.getState().addChatMessage(data)
    })

    room.onMessage('damage', (data: { attackerId: string; targetId: string; shieldDamage: number; armorDamage: number; hullDamage: number; damageType: string; isCritical: boolean; timestamp: number }) => {
      useRTGameStore.getState().addDamageEvent(data)
    })

    room.onMessage('mining_yield', (_data: unknown) => {
      // Future: update cargo/ore
    })

    room.onMessage('docking', (_data: unknown) => {
      // Future: trigger docking UI
    })

    room.onMessage('system_transfer', (_data: { systemId: string }) => {
      this.disconnect()
      window.dispatchEvent(new CustomEvent('system_transfer', { detail: _data }))
    })

    store.setConnected(true)
  }

  disconnect(): void {
    if (this.room) {
      this.room.leave()
      this.room = null
    }

    const engine = getEngine()
    engine.getECS().destroy()

    useRTGameStore.getState().setConnected(false)
    useRTGameStore.getState().reset()

    this.ownSessionId = ''
  }

  sendMessage(type: string, data?: unknown): void {
    if (this.room) {
      this.room.send(type, data)
    }
  }

  private _factionToIndex(faction: string): number {
    const map: Record<string, number> = {
      amarr: 0,
      caldari: 1,
      gallente: 2,
      minmatar: 3,
      pirate: 4,
      npc: 5,
    }
    return map[faction?.toLowerCase()] ?? 5
  }
}

export const networkBridge = new NetworkBridge()

export function connectNetworkBridge(room: Room, ownSessionId: string): void {
  networkBridge.connect(room, ownSessionId)
}

export function disconnectNetworkBridge(): void {
  networkBridge.disconnect()
}

export function sendNetworkMessage(type: string, data?: unknown): void {
  networkBridge.sendMessage(type, data)
}
