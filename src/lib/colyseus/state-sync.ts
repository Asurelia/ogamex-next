/**
 * State Sync Bridge
 *
 * Bridges Colyseus room.state → Zustand rtGameStore.
 * Listens for onAdd/onChange/onRemove events on the schema.
 */

import type { Room } from 'colyseus.js'
import { useRTGameStore } from '@/stores/rtGameStore'
import type { ShipData, AsteroidData, StationData } from '@/stores/rtGameStore'

/**
 * Set up state synchronization from a Colyseus room to the Zustand store.
 * Call this after joining a room.
 */
export function setupStateSync(room: Room): () => void {
  const store = useRTGameStore.getState()

  // Sync system info
  room.state.listen('systemId', (value: string) => {
    useRTGameStore.getState().setSystemInfo(
      value,
      room.state.systemName,
      room.state.securityLevel
    )
  })

  room.state.listen('systemName', (value: string) => {
    useRTGameStore.getState().setSystemInfo(
      room.state.systemId,
      value,
      room.state.securityLevel
    )
  })

  // Sync ships
  room.state.ships.onAdd((ship: any, key: string) => {
    const data = schemaToShipData(ship)
    useRTGameStore.getState().setShip(key, data)

    // Listen for changes on this ship
    ship.onChange(() => {
      useRTGameStore.getState().setShip(key, schemaToShipData(ship))
    })
  })

  room.state.ships.onRemove((_ship: any, key: string) => {
    useRTGameStore.getState().removeShip(key)
  })

  // Sync asteroids
  room.state.asteroids.onAdd((asteroid: any, key: string) => {
    useRTGameStore.getState().setAsteroid(key, schemaToAsteroidData(asteroid))

    asteroid.onChange(() => {
      useRTGameStore.getState().setAsteroid(key, schemaToAsteroidData(asteroid))
    })
  })

  room.state.asteroids.onRemove((_asteroid: any, key: string) => {
    useRTGameStore.getState().removeAsteroid(key)
  })

  // Sync stations
  room.state.stations.onAdd((station: any, key: string) => {
    useRTGameStore.getState().setStation(key, schemaToStationData(station))
  })

  room.state.stations.onRemove((_station: any, key: string) => {
    useRTGameStore.getState().removeStation(key)
  })

  // Listen for server messages
  room.onMessage('system_chat', (msg) => {
    useRTGameStore.getState().addChatMessage(msg)
  })

  room.onMessage('damage', (msg) => {
    useRTGameStore.getState().addDamageEvent({
      ...msg,
      timestamp: Date.now(),
    })
  })

  room.onMessage('mining_yield', (msg) => {
    // Could add to a notification queue
    console.log(`[Mining] ${msg.oreType}: +${msg.amount.toFixed(1)} m3`)
  })

  room.onMessage('docking', (msg) => {
    console.log(`[Docking] Ship ${msg.shipId} ${msg.action}`)
  })

  // Cleanup function
  return () => {
    // Room cleanup is handled by Colyseus client
  }
}

// ============================================================================
// SCHEMA → DATA CONVERTERS
// ============================================================================

function schemaToShipData(ship: any): ShipData {
  return {
    id: ship.id,
    ownerId: ship.ownerId,
    ownerName: ship.ownerName,
    shipTypeId: ship.shipTypeId,
    faction: ship.faction,
    x: ship.x,
    y: ship.y,
    z: ship.z,
    vx: ship.vx,
    vy: ship.vy,
    vz: ship.vz,
    rx: ship.rx,
    ry: ship.ry,
    rz: ship.rz,
    speed: ship.speed,
    maxSpeed: ship.maxSpeed,
    state: ship.state,
    targetId: ship.targetId,
    hp: ship.hp,
    hpMax: ship.hpMax,
    shield: ship.shield,
    shieldMax: ship.shieldMax,
    armor: ship.armor,
    armorMax: ship.armorMax,
    capacitor: ship.capacitor,
    capacitorMax: ship.capacitorMax,
    isDocked: ship.isDocked,
    isNpc: ship.isNpc,
  }
}

function schemaToAsteroidData(asteroid: any): AsteroidData {
  return {
    id: asteroid.id,
    x: asteroid.x,
    y: asteroid.y,
    z: asteroid.z,
    oreType: asteroid.oreType,
    volume: asteroid.volume,
    maxVolume: asteroid.maxVolume,
    radius: asteroid.radius,
  }
}

function schemaToStationData(station: any): StationData {
  return {
    id: station.id,
    name: station.name,
    stationType: station.stationType,
    x: station.x,
    y: station.y,
    z: station.z,
  }
}
