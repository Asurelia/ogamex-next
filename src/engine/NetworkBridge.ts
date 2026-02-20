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

    room.onMessage('mining_yield', (data: { oreType: string; amount: number; asteroidId: string }) => {
      const s = useRTGameStore.getState()
      s.addCargoItem({
        id: `ore_${data.oreType}_${Date.now()}`,
        name: data.oreType,
        quantity: data.amount,
        volume: data.amount * 0.1,
        category: 'ore',
      })
      s.addNotification({
        id: `mining_${Date.now()}`,
        type: 'success',
        title: 'Mining',
        message: `+${data.amount} ${data.oreType}`,
        timestamp: Date.now(),
      })
    })

    room.onMessage('docking', (data: { stationId: string; stationName: string; docked: boolean }) => {
      const s = useRTGameStore.getState()
      s.setDockingState(data.docked, data.stationId)
      s.addNotification({
        id: `dock_${Date.now()}`,
        type: 'info',
        title: data.docked ? 'Docked' : 'Undocked',
        message: data.docked ? `Docked at ${data.stationName}` : 'Undocked from station',
        timestamp: Date.now(),
      })
    })

    room.onMessage('system_transfer', (_data: { targetSystemId: string; targetSystemName: string }) => {
      this.disconnect()
      window.dispatchEvent(new CustomEvent('system_transfer', { detail: _data }))
    })

    room.onMessage('warp_start', (_data: unknown) => {
      useRTGameStore.getState().setWarpActive(true)
    })

    room.onMessage('warp_end', (_data: unknown) => {
      useRTGameStore.getState().setWarpActive(false)
    })

    room.onMessage('ship_destroyed', (data: { shipId: string; killerName?: string }) => {
      const s = useRTGameStore.getState()
      if (data.shipId === this.ownSessionId) {
        s.addNotification({
          id: `destroyed_${Date.now()}`,
          type: 'danger',
          title: 'Ship Destroyed',
          message: data.killerName ? `Destroyed by ${data.killerName}` : 'Your ship was destroyed',
          timestamp: Date.now(),
        })
      }
      window.dispatchEvent(new CustomEvent('ship_explosion', { detail: data }))
    })

    room.onMessage('fleet_update', (data: { command: string; formationType: string }) => {
      useRTGameStore.getState().setFleetFormation(data.formationType || 'line')
    })

    room.onMessage('target_locked', (data: { id: string; name: string; type: string; shieldPercent: number; armorPercent: number; hullPercent: number; distance: number }) => {
      const s = useRTGameStore.getState()
      if (!s.lockedTargets.find(t => t.id === data.id)) {
        s.setLockedTargets([...s.lockedTargets, data])
      }
    })

    room.onMessage('target_lost', (data: { id: string }) => {
      const s = useRTGameStore.getState()
      s.setLockedTargets(s.lockedTargets.filter(t => t.id !== data.id))
    })

    room.onMessage('skill_update', (data: { skills?: Array<{ id: string; name: string; category: string; level: number; maxLevel: number; currentSP: number; requiredSP: number; training: boolean }>; queue?: Array<{ skillId: string; skillName: string; targetLevel: number; remainingSeconds: number }> }) => {
      const s = useRTGameStore.getState()
      if (data.skills) s.setSkills(data.skills)
      if (data.queue) s.setSkillQueue(data.queue)
    })

    room.onMessage('fitting_update', (data: { fitting?: { shipName: string; shipType: string; highSlots: Array<{ id: string; name: string; type: 'high' | 'mid' | 'low'; active: boolean; icon: string }>; midSlots: Array<{ id: string; name: string; type: 'high' | 'mid' | 'low'; active: boolean; icon: string }>; lowSlots: Array<{ id: string; name: string; type: 'high' | 'mid' | 'low'; active: boolean; icon: string }>; dps: number; ehp: number; speed: number; capacitor: number; capacitorMax: number; cpuUsed: number; cpuMax: number; powergridUsed: number; powergridMax: number }; modules?: Array<{ id: string; name: string; type: 'high' | 'mid' | 'low'; active: boolean; icon: string }> }) => {
      const s = useRTGameStore.getState()
      if (data.fitting) s.setFitting(data.fitting)
      if (data.modules) s.setModules(data.modules)
    })

    room.onMessage('market_update', (data: { orders?: Array<{ id: string; itemName: string; price: number; quantity: number; type: 'buy' | 'sell'; owner: string; isOwn: boolean }>; wallet?: number }) => {
      const s = useRTGameStore.getState()
      if (data.orders) s.setMarketOrders(data.orders)
      if (data.wallet !== undefined) s.setWalletBalance(data.wallet)
    })

    room.onMessage('server_error', (data: { code: string; message: string }) => {
      console.error(`[Server] ${data.code}: ${data.message}`)
    })

    // Corporation updates
    room.onMessage('corp_update', (data: { corpData?: unknown; members?: unknown[]; applications?: unknown[]; walletBalances?: number[]; walletJournal?: unknown[] }) => {
      const s = useRTGameStore.getState()
      if (data.corpData) s.setCorpData(data.corpData as never)
      if (data.members) s.setCorpMembers(data.members as never[])
      if (data.applications) s.setCorpApplications(data.applications as never[])
      if (data.walletBalances) s.setCorpWalletBalances(data.walletBalances)
      if (data.walletJournal) s.setCorpWalletJournal(data.walletJournal as never[])
    })

    // Clone updates
    room.onMessage('clone_update', (data: { clones?: unknown[]; medicalCloneStationId?: string; implants?: unknown[]; implantSetBonuses?: unknown[] }) => {
      const s = useRTGameStore.getState()
      if (data.clones) s.setClones(data.clones as never[])
      if (data.medicalCloneStationId) s.setMedicalCloneStation(data.medicalCloneStationId)
      if (data.implants) s.setActiveImplants(data.implants as never[])
      if (data.implantSetBonuses) s.setImplantSetBonuses(data.implantSetBonuses as never[])
    })

    // Industry updates
    room.onMessage('industry_update', (data: { blueprints?: unknown[]; jobs?: unknown[] }) => {
      const s = useRTGameStore.getState()
      if (data.blueprints) s.setBlueprints(data.blueprints as never[])
      if (data.jobs) s.setIndustryJobs(data.jobs as never[])
    })

    // PI updates
    room.onMessage('pi_update', (data: { colonies?: unknown[]; buildings?: unknown[]; routes?: unknown[] }) => {
      const s = useRTGameStore.getState()
      if (data.colonies) s.setColonies(data.colonies as never[])
      if (data.buildings) s.setColonyBuildings(data.buildings as never[])
      if (data.routes) s.setColonyRoutes(data.routes as never[])
    })

    // Scanner updates
    room.onMessage('scan_update', (data: { results?: unknown[]; probeCount?: number }) => {
      const s = useRTGameStore.getState()
      if (data.results) s.setScanResults(data.results as never[])
      if (data.probeCount !== undefined) s.setScanProbeCount(data.probeCount)
    })

    // Contract updates
    room.onMessage('contract_update', (data: { browse?: unknown[]; mine?: unknown[] }) => {
      const s = useRTGameStore.getState()
      if (data.browse) s.setBrowseContracts(data.browse as never[])
      if (data.mine) s.setMyContracts(data.mine as never[])
    })

    // Sovereignty updates
    room.onMessage('sov_update', (data: { info?: unknown; structures?: unknown[] }) => {
      const s = useRTGameStore.getState()
      if (data.info) s.setSovereigntyInfo(data.info as never)
      if (data.structures) s.setSovStructures(data.structures as never[])
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
