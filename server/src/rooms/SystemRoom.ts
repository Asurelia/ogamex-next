/**
 * SystemRoom - Main Colyseus Room
 *
 * One room per solar system. Manages all entities within that system.
 * Authoritative simulation at 20Hz with physics, combat, mining, NPC AI.
 */

import { Room, Client } from 'colyseus'
import { SystemState, ShipState, AsteroidState, StationState, ShipStateEnum } from '../schema/GameState'
import { validateSupabaseJWT, type DecodedToken } from '../auth/jwt-validator'
import { loadSolarSystem, loadSystemStations, loadShipForPlayer, saveShipState, batchSaveShips } from '../db/supabase'
import { logChat, logCombat } from '../db/sqlite'
import { CONFIG } from '../config'
import { updatePhysics } from '../systems/physics'
import { updateCombat } from '../systems/combat'
import { updateMining } from '../systems/mining'
import { updateNpcAI } from '../systems/npc-ai'
import { validateCrossSystemWarp, initiateCrossSystemWarp } from '../systems/warp'
import { SeededRandom } from '../../../src/lib/galaxy/prng'
import type { OreType } from '../../../shared/types/ship-types'

// ============================================================================
// TYPES
// ============================================================================

interface PlayerMeta {
  userId: string
  email?: string
  shipId: string
  dbShipId: string // UUID from Supabase
}

const ORE_TYPES: OreType[] = [
  'veldspar', 'scordite', 'pyroxeres', 'plagioclase', 'omber',
  'kernite', 'jaspet', 'hemorphite', 'hedbergite',
]

// ============================================================================
// SYSTEM ROOM
// ============================================================================

export class SystemRoom extends Room<SystemState> {
  private playerMeta = new Map<string, PlayerMeta>()
  private saveTimer: ReturnType<typeof setInterval> | null = null
  private npcTickCounter = 0
  private npcTickInterval: number

  constructor() {
    super()
    // NPC AI ticks at 2Hz instead of 20Hz
    this.npcTickInterval = CONFIG.TICK_RATE / CONFIG.NPC_AI_TICK_RATE
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  async onCreate(options: { systemId: string }) {
    const systemId = options.systemId
    if (!systemId) {
      throw new Error('systemId is required')
    }

    // Initialize state
    this.setState(new SystemState())

    // Load system from Supabase
    const system = await loadSolarSystem(systemId)
    this.state.systemId = system.id
    this.state.systemName = system.name
    this.state.securityLevel = parseFloat(system.security_level)
    this.state.starType = system.star_type

    // Load stations
    const stations = await loadSystemStations(systemId)
    for (const station of stations) {
      const s = new StationState()
      s.id = station.id
      s.name = station.name
      s.stationType = station.station_type
      s.x = station.position_x
      s.y = station.position_y
      s.z = station.position_z
      this.state.stations.set(station.id, s)
    }

    // Spawn asteroids from seed
    this.spawnAsteroids(system.asteroid_belt_seed || system.seed)

    // Set simulation frequency
    this.setSimulationInterval((dt) => this.update(dt), 1000 / CONFIG.TICK_RATE)

    // Periodic save to Supabase
    this.saveTimer = setInterval(() => this.persistAllShips(), CONFIG.SAVE_INTERVAL_MS)

    // Register all message handlers
    this.registerMessages()

    this.roomId = systemId
    console.log(`[Room] System "${system.name}" (${systemId}) created. Security: ${system.security_level}`)
  }

  async onAuth(client: Client, options: { token: string }): Promise<DecodedToken> {
    if (!options.token) {
      throw new Error('Authentication token required')
    }
    return validateSupabaseJWT(options.token)
  }

  async onJoin(client: Client, options: Record<string, unknown>, auth: DecodedToken) {
    const userId = auth.sub
    console.log(`[Room] Player ${userId} joining system ${this.state.systemName}`)

    try {
      // Load player's active ship from Supabase
      const shipData = await loadShipForPlayer(userId)
      const shipTypeData = shipData.rt_ship_types

      // Create ship state
      const ship = new ShipState()
      ship.id = client.sessionId
      ship.ownerId = userId
      ship.ownerName = auth.email?.split('@')[0] || 'Pilot'
      ship.shipTypeId = shipData.ship_type_id
      ship.faction = shipTypeData?.faction || 'caldari'

      // Position
      ship.x = shipData.position_x || 0
      ship.y = shipData.position_y || 0
      ship.z = shipData.position_z || 0

      // Stats from ship type
      ship.hpMax = shipTypeData?.base_hp || 500
      ship.hp = Math.min(shipData.current_hp, ship.hpMax)
      ship.shieldMax = shipTypeData?.base_shield || 500
      ship.shield = Math.min(shipData.current_shield, ship.shieldMax)
      ship.armorMax = shipTypeData?.base_armor || 500
      ship.armor = Math.min(shipData.current_armor, ship.armorMax)
      ship.maxSpeed = shipTypeData?.max_velocity || 300
      ship.capacitorMax = shipTypeData?.capacitor || 250
      ship.capacitor = ship.capacitorMax

      // State
      ship.isDocked = shipData.is_docked
      ship.state = shipData.is_docked ? ShipStateEnum.DOCKED : ShipStateEnum.IDLE
      ship.isNpc = false

      // Add to state
      this.state.ships.set(client.sessionId, ship)

      // Track player meta
      this.playerMeta.set(client.sessionId, {
        userId,
        email: auth.email,
        shipId: client.sessionId,
        dbShipId: shipData.id,
      })

      console.log(`[Room] Player ${userId} joined with ship ${shipData.ship_type_id}`)
    } catch (error) {
      console.error(`[Room] Failed to load ship for ${userId}:`, error)
      throw new Error('Failed to load player ship')
    }
  }

  async onLeave(client: Client, consented: boolean) {
    const meta = this.playerMeta.get(client.sessionId)
    if (!meta) return

    // Save ship state to Supabase
    const ship = this.state.ships.get(client.sessionId)
    if (ship) {
      try {
        await saveShipState(meta.dbShipId, {
          system_id: this.state.systemId,
          position_x: ship.x,
          position_y: ship.y,
          position_z: ship.z,
          current_hp: ship.hp,
          current_shield: ship.shield,
          current_armor: ship.armor,
          is_docked: ship.isDocked,
        })
      } catch (error) {
        console.error(`[Room] Failed to save ship for ${meta.userId}:`, error)
      }
    }

    // Remove from state
    this.state.ships.delete(client.sessionId)
    this.playerMeta.delete(client.sessionId)

    console.log(`[Room] Player ${meta.userId} left (consented: ${consented})`)
  }

  async onDispose() {
    // Clear save timer
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
    }

    // Persist all ships one last time
    await this.persistAllShips()
    console.log(`[Room] System "${this.state.systemName}" disposed`)
  }

  // ==========================================================================
  // MESSAGE HANDLERS
  // ==========================================================================

  onMessage(type: string, handler: (client: Client, message: unknown) => void): void
  onMessage(client: Client, type: string, message: unknown): void
  onMessage(...args: unknown[]): void {
    // This is overridden by the message registration in onCreate
  }

  // Register all message handlers (called implicitly via Colyseus)
  registerMessages() {
    this.onMessage('navigate', (client, msg: { x: number; y: number; z: number }) => {
      const ship = this.state.ships.get(client.sessionId)
      if (!ship || ship.isDocked || ship.state === ShipStateEnum.WARPING) return

      ship.targetId = ''
      ship.state = ShipStateEnum.APPROACHING
      // Store destination in velocity direction (physics system will handle approach)
      const dx = msg.x - ship.x
      const dy = msg.y - ship.y
      const dz = msg.z - ship.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist > 0) {
        ship.vx = (dx / dist) * ship.maxSpeed
        ship.vy = (dy / dist) * ship.maxSpeed
        ship.vz = (dz / dist) * ship.maxSpeed
      }
    })

    this.onMessage('warp', (client, msg: { targetEntityId?: string; x?: number; y?: number; z?: number }) => {
      const ship = this.state.ships.get(client.sessionId)
      if (!ship || ship.isDocked) return

      ship.state = ShipStateEnum.ALIGNING
      if (msg.targetEntityId) {
        ship.targetId = msg.targetEntityId
      }
    })

    this.onMessage('orbit', (client, msg: { targetId: string; range: number }) => {
      const ship = this.state.ships.get(client.sessionId)
      if (!ship || ship.isDocked) return

      ship.targetId = msg.targetId
      ship.state = ShipStateEnum.ORBITING
    })

    this.onMessage('attack', (client, msg: { targetId: string }) => {
      const ship = this.state.ships.get(client.sessionId)
      if (!ship || ship.isDocked) return

      ship.targetId = msg.targetId
      ship.state = ShipStateEnum.ATTACKING
    })

    this.onMessage('stop_attack', (client) => {
      const ship = this.state.ships.get(client.sessionId)
      if (!ship) return
      if (ship.state === ShipStateEnum.ATTACKING) {
        ship.state = ShipStateEnum.IDLE
        ship.targetId = ''
      }
    })

    this.onMessage('mine', (client, msg: { asteroidId: string }) => {
      const ship = this.state.ships.get(client.sessionId)
      if (!ship || ship.isDocked) return

      ship.targetId = msg.asteroidId
      ship.state = ShipStateEnum.MINING
    })

    this.onMessage('stop_mine', (client) => {
      const ship = this.state.ships.get(client.sessionId)
      if (!ship) return
      if (ship.state === ShipStateEnum.MINING) {
        ship.state = ShipStateEnum.IDLE
        ship.targetId = ''
      }
    })

    this.onMessage('dock', (client, msg: { stationId: string }) => {
      const ship = this.state.ships.get(client.sessionId)
      if (!ship || ship.isDocked) return

      const station = this.state.stations.get(msg.stationId)
      if (!station) return

      // Check distance to station (must be within 2500m)
      const dx = station.x - ship.x
      const dy = station.y - ship.y
      const dz = station.z - ship.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (dist <= 2500) {
        ship.isDocked = true
        ship.state = ShipStateEnum.DOCKED
        ship.speed = 0
        ship.vx = 0
        ship.vy = 0
        ship.vz = 0
        this.broadcast('docking', { shipId: ship.id, stationId: station.id, action: 'docked' })
      } else {
        // Approach station first
        ship.targetId = msg.stationId
        ship.state = ShipStateEnum.APPROACHING
      }
    })

    this.onMessage('undock', (client) => {
      const ship = this.state.ships.get(client.sessionId)
      if (!ship || !ship.isDocked) return

      ship.isDocked = false
      ship.state = ShipStateEnum.IDLE
      // Offset position slightly from station
      ship.x += (Math.random() - 0.5) * 1000
      ship.y += (Math.random() - 0.5) * 1000
      this.broadcast('docking', { shipId: ship.id, stationId: '', action: 'undocked' })
    })

    this.onMessage('stop', (client) => {
      const ship = this.state.ships.get(client.sessionId)
      if (!ship) return
      ship.state = ShipStateEnum.IDLE
      ship.targetId = ''
      ship.vx = 0
      ship.vy = 0
      ship.vz = 0
    })

    this.onMessage('chat', (client, msg: { channel: string; content: string }) => {
      const meta = this.playerMeta.get(client.sessionId)
      if (!meta || !msg.content) return

      const chatMsg = {
        type: 'system_chat',
        channel: msg.channel || 'local',
        senderId: meta.userId,
        senderName: meta.email?.split('@')[0] || 'Pilot',
        content: msg.content.slice(0, 500), // Limit message length
        timestamp: Date.now(),
      }

      // Broadcast to all in system
      this.broadcast('system_chat', chatMsg)

      // Log to SQLite
      logChat(this.state.systemId, chatMsg.channel, chatMsg.senderId, chatMsg.senderName, chatMsg.content)
    })

    this.onMessage('warp_cross_system', async (client, msg: { targetSystemId: string }) => {
      const ship = this.state.ships.get(client.sessionId)
      if (!ship) return

      const error = validateCrossSystemWarp(ship, this.state.systemId, msg.targetSystemId)
      if (error) {
        client.send('server_error', { code: 'WARP_DENIED', message: error })
        return
      }

      const { targetSystemName } = initiateCrossSystemWarp(ship, msg.targetSystemId)

      // Save ship to new system in Supabase before transfer
      const meta = this.playerMeta.get(client.sessionId)
      if (meta) {
        try {
          await saveShipState(meta.dbShipId, {
            system_id: msg.targetSystemId,
            position_x: 0,
            position_y: 0,
            position_z: 0,
            current_hp: ship.hp,
            current_shield: ship.shield,
            current_armor: ship.armor,
            is_docked: false,
          })
        } catch (err) {
          console.error(`[Room] Failed to save ship for cross-system warp:`, err)
        }
      }

      // Notify all clients that the ship is warping out
      this.broadcast('warp_start', {
        shipId: ship.id,
        destinationSystemId: msg.targetSystemId,
      })

      // Tell this client to switch rooms
      client.send('system_transfer', {
        targetSystemId: msg.targetSystemId,
        targetSystemName,
      })

      console.log(`[Room] Ship ${client.sessionId} warping to ${targetSystemName} (${msg.targetSystemId})`)
    })

    // ------------------------------------------------------------------
    // Fleet command - broadcast to fleet members
    // ------------------------------------------------------------------
    this.onMessage('fleet_command', (client, msg: { command: string; targetId?: string; formationType?: string }) => {
      const ship = this.state.ships.get(client.sessionId)
      if (!ship || ship.isDocked) return

      // For now, just broadcast the command to all fleet members
      // Full fleet system needs fleet groups tracked in memory
      this.broadcast('fleet_update', {
        leaderId: client.sessionId,
        command: msg.command,
        formationType: msg.formationType || 'line',
      })
    })

    // ------------------------------------------------------------------
    // Train skill - acknowledge and defer to skill-ticker
    // ------------------------------------------------------------------
    this.onMessage('train_skill', async (client, msg: { skillId: string }) => {
      const meta = this.playerMeta.get(client.sessionId)
      if (!meta) return

      // Acknowledge to client - actual training handled by skill-ticker on interval
      client.send('skill_update', {
        action: 'training_started',
        skillId: msg.skillId,
        characterId: meta.userId,
      })
    })

    // ------------------------------------------------------------------
    // Toggle module - activate/deactivate ship modules
    // ------------------------------------------------------------------
    this.onMessage('toggle_module', (client, msg: { moduleId: string }) => {
      const ship = this.state.ships.get(client.sessionId)
      if (!ship || ship.isDocked) return

      // Module activation consumes capacitor
      const capCost = 10 // Base cap cost per module activation
      if (ship.capacitor < capCost) {
        client.send('server_error', { code: 'NO_CAPACITOR', message: 'Insufficient capacitor' })
        return
      }

      ship.capacitor -= capCost

      client.send('fitting_update', {
        action: 'module_toggled',
        moduleId: msg.moduleId,
        capacitor: ship.capacitor,
      })
    })

    // ------------------------------------------------------------------
    // Market order - place buy/sell orders while docked
    // ------------------------------------------------------------------
    this.onMessage('market_order', async (client, msg: { itemName: string; price: number; quantity: number; type: 'buy' | 'sell' }) => {
      const ship = this.state.ships.get(client.sessionId)
      if (!ship || !ship.isDocked) {
        client.send('server_error', { code: 'NOT_DOCKED', message: 'Must be docked to place market orders' })
        return
      }

      const meta = this.playerMeta.get(client.sessionId)
      if (!meta) return

      // For now, acknowledge - full market uses economy.ts matchOrders()
      client.send('market_update', {
        action: 'order_placed',
        itemName: msg.itemName,
        price: msg.price,
        quantity: msg.quantity,
        type: msg.type,
      })
    })

    // ------------------------------------------------------------------
    // Lock target - validate target and send lock confirmation
    // ------------------------------------------------------------------
    this.onMessage('lock_target', (client, msg: { targetId: string }) => {
      const ship = this.state.ships.get(client.sessionId)
      if (!ship || ship.isDocked) return

      // Verify target exists
      const targetShip = this.state.ships.get(msg.targetId)
      const targetAsteroid = this.state.asteroids.get(msg.targetId)
      const targetStation = this.state.stations.get(msg.targetId)

      if (!targetShip && !targetAsteroid && !targetStation) {
        client.send('server_error', { code: 'INVALID_TARGET', message: 'Target not found' })
        return
      }

      // Send lock confirmation
      let targetName = 'Unknown'
      let targetType = 'unknown'
      let targetShield = 100, targetArmor = 100, targetHull = 100
      let targetX = 0, targetY = 0, targetZ = 0

      if (targetShip) {
        targetName = targetShip.ownerName || targetShip.id.slice(0, 8)
        targetType = targetShip.shipTypeId
        targetShield = targetShip.shieldMax > 0 ? (targetShip.shield / targetShip.shieldMax) * 100 : 100
        targetArmor = targetShip.armorMax > 0 ? (targetShip.armor / targetShip.armorMax) * 100 : 100
        targetHull = targetShip.hpMax > 0 ? (targetShip.hp / targetShip.hpMax) * 100 : 100
        targetX = targetShip.x; targetY = targetShip.y; targetZ = targetShip.z
      } else if (targetAsteroid) {
        targetName = `${targetAsteroid.oreType} Asteroid`
        targetType = 'asteroid'
        targetX = targetAsteroid.x; targetY = targetAsteroid.y; targetZ = targetAsteroid.z
      } else if (targetStation) {
        targetName = targetStation.name
        targetType = 'station'
        targetX = targetStation.x; targetY = targetStation.y; targetZ = targetStation.z
      }

      // Calculate distance
      const dx = targetX - ship.x
      const dy = targetY - ship.y
      const dz = targetZ - ship.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

      client.send('target_locked', {
        id: msg.targetId,
        name: targetName,
        type: targetType,
        shieldPercent: targetShield,
        armorPercent: targetArmor,
        hullPercent: targetHull,
        distance,
      })
    })

    // ------------------------------------------------------------------
    // Unlock target - release target lock
    // ------------------------------------------------------------------
    this.onMessage('unlock_target', (client, msg: { targetId: string }) => {
      client.send('target_lost', { id: msg.targetId })
    })
  }

  // ==========================================================================
  // SIMULATION LOOP
  // ==========================================================================

  update(dt: number) {
    const deltaSeconds = dt / 1000
    this.state.tick++

    // Physics (every tick - 20Hz)
    updatePhysics(this.state, deltaSeconds)

    // Combat (every tick - 20Hz)
    updateCombat(this.state, deltaSeconds, (attackerId, targetId, shield, armor, hull, type, isCrit, isKill) => {
      this.broadcast('damage', { attackerId, targetId, shieldDamage: shield, armorDamage: armor, hullDamage: hull, damageType: type, isCritical: isCrit })
      logCombat(this.state.systemId, attackerId, targetId, shield, armor, hull, type, isCrit, isKill)
      if (isKill) {
        this.broadcast('ship_destroyed', { shipId: targetId, killerId: attackerId, position: { x: 0, y: 0, z: 0 } })
      }
    })

    // Mining (every tick - 20Hz)
    updateMining(this.state, deltaSeconds, (minerId, asteroidId, oreType, amount) => {
      // Find the client for this miner and send them the yield
      for (const [sessionId, meta] of this.playerMeta) {
        if (this.state.ships.get(sessionId)?.id === minerId) {
          const client = this.clients.find(c => c.sessionId === sessionId)
          client?.send('mining_yield', { asteroidId, oreType, amount })
          break
        }
      }
    })

    // NPC AI (at NPC_AI_TICK_RATE Hz)
    this.npcTickCounter++
    if (this.npcTickCounter >= this.npcTickInterval) {
      this.npcTickCounter = 0
      updateNpcAI(this.state, deltaSeconds * this.npcTickInterval)
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private spawnAsteroids(seed: number) {
    const rng = new SeededRandom(seed)
    const count = rng.nextInt(30, CONFIG.MAX_ASTEROIDS_PER_SYSTEM)
    const secLevel = this.state.securityLevel

    for (let i = 0; i < count; i++) {
      const asteroid = new AsteroidState()
      asteroid.id = `ast_${i}`

      // Position in a belt-like formation
      const angle = rng.nextFloat(0, Math.PI * 2)
      const beltRadius = rng.nextFloat(30000, 80000) // 30-80km from center
      const height = rng.nextFloat(-5000, 5000)

      asteroid.x = Math.cos(angle) * beltRadius
      asteroid.y = height
      asteroid.z = Math.sin(angle) * beltRadius

      // Ore type based on security level
      const oreIndex = Math.min(
        Math.floor(rng.next() * (ORE_TYPES.length * (1 - secLevel * 0.5))),
        ORE_TYPES.length - 1
      )
      asteroid.oreType = ORE_TYPES[oreIndex]

      // Volume
      asteroid.maxVolume = rng.nextFloat(500, 5000)
      asteroid.volume = asteroid.maxVolume
      asteroid.radius = rng.nextFloat(20, 100)

      this.state.asteroids.set(asteroid.id, asteroid)
    }
  }

  private async persistAllShips() {
    const shipsToSave: Array<{
      id: string
      system_id: string
      position_x: number
      position_y: number
      position_z: number
      current_hp: number
      current_shield: number
      current_armor: number
      is_docked: boolean
    }> = []

    for (const [sessionId, meta] of this.playerMeta) {
      const ship = this.state.ships.get(sessionId)
      if (!ship) continue

      shipsToSave.push({
        id: meta.dbShipId,
        system_id: this.state.systemId,
        position_x: ship.x,
        position_y: ship.y,
        position_z: ship.z,
        current_hp: ship.hp,
        current_shield: ship.shield,
        current_armor: ship.armor,
        is_docked: ship.isDocked,
      })
    }

    if (shipsToSave.length > 0) {
      try {
        await batchSaveShips(shipsToSave)
      } catch (error) {
        console.error('[Room] Failed to batch save ships:', error)
      }
    }
  }
}
