/**
 * NPC AI System
 *
 * Behaviors: patrol, guard, pirate, miner.
 * Runs at 2Hz (not 20Hz) to save CPU.
 */

import { SystemState, ShipState, ShipStateEnum } from '../schema/GameState'

type NPCBehavior = 'patrol' | 'guard' | 'pirate' | 'miner'

/**
 * Update NPC AI decisions (called at NPC_AI_TICK_RATE)
 */
export function updateNpcAI(state: SystemState, dt: number): void {
  state.ships.forEach((ship) => {
    if (!ship.isNpc || ship.hp <= 0 || ship.isDocked) return

    const behavior = getNpcBehavior(ship)

    switch (behavior) {
      case 'patrol':
        updatePatrol(ship, state)
        break
      case 'guard':
        updateGuard(ship, state)
        break
      case 'pirate':
        updatePirate(ship, state)
        break
      case 'miner':
        updateMiner(ship, state)
        break
    }
  })
}

// ============================================================================
// BEHAVIOR IMPLEMENTATIONS
// ============================================================================

function updatePatrol(ship: ShipState, state: SystemState) {
  if (ship.state === ShipStateEnum.IDLE) {
    // Pick a random point to move to
    ship.vx = (Math.random() - 0.5) * ship.maxSpeed * 0.5
    ship.vy = (Math.random() - 0.5) * ship.maxSpeed * 0.1
    ship.vz = (Math.random() - 0.5) * ship.maxSpeed * 0.5
    ship.state = ShipStateEnum.APPROACHING
  }

  // Check for hostile players in range (50km)
  const threat = findNearestHostile(ship, state, 50000)
  if (threat && state.securityLevel < 0.5) {
    ship.targetId = threat.id
    ship.state = ShipStateEnum.ATTACKING
  }
}

function updateGuard(ship: ShipState, state: SystemState) {
  // Guard stays near a station and attacks hostiles
  const nearestStation = findNearestStation(ship, state)
  if (!nearestStation) return

  const dx = nearestStation.x - ship.x
  const dy = nearestStation.y - ship.y
  const dz = nearestStation.z - ship.z
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

  // Stay within 30km of station
  if (dist > 30000 && ship.state !== ShipStateEnum.ATTACKING) {
    ship.vx = (dx / dist) * ship.maxSpeed * 0.3
    ship.vy = (dy / dist) * ship.maxSpeed * 0.1
    ship.vz = (dz / dist) * ship.maxSpeed * 0.3
    ship.state = ShipStateEnum.APPROACHING
  }

  // Attack nearby hostiles
  const threat = findNearestHostile(ship, state, 40000)
  if (threat) {
    ship.targetId = threat.id
    ship.state = ShipStateEnum.ATTACKING
  } else if (ship.state === ShipStateEnum.ATTACKING) {
    ship.state = ShipStateEnum.IDLE
    ship.targetId = ''
  }
}

function updatePirate(ship: ShipState, state: SystemState) {
  // Pirates actively seek and attack player ships
  if (ship.state === ShipStateEnum.ATTACKING) {
    // Check if target is still alive
    const target = state.ships.get(ship.targetId)
    if (!target || target.hp <= 0) {
      ship.state = ShipStateEnum.IDLE
      ship.targetId = ''
    }
    return
  }

  // Find a player to attack
  const victim = findNearestPlayer(ship, state, 80000)
  if (victim) {
    ship.targetId = victim.id
    ship.state = ShipStateEnum.ATTACKING
  } else {
    // Patrol randomly
    if (ship.state === ShipStateEnum.IDLE) {
      ship.vx = (Math.random() - 0.5) * ship.maxSpeed * 0.4
      ship.vz = (Math.random() - 0.5) * ship.maxSpeed * 0.4
      ship.state = ShipStateEnum.APPROACHING
    }
  }
}

function updateMiner(ship: ShipState, state: SystemState) {
  if (ship.state === ShipStateEnum.MINING) return

  // Find nearest asteroid
  let nearestAsteroid: { id: string; x: number; y: number; z: number } | null = null
  let nearestDist = Infinity

  state.asteroids.forEach((ast) => {
    if (ast.volume <= 0) return
    const dx = ast.x - ship.x
    const dy = ast.y - ship.y
    const dz = ast.z - ship.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (dist < nearestDist) {
      nearestDist = dist
      nearestAsteroid = ast
    }
  })

  if (nearestAsteroid) {
    ship.targetId = nearestAsteroid.id
    if (nearestDist <= 10000) {
      ship.state = ShipStateEnum.MINING
    } else {
      ship.state = ShipStateEnum.APPROACHING
      const dx = nearestAsteroid.x - ship.x
      const dz = nearestAsteroid.z - ship.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      ship.vx = (dx / dist) * ship.maxSpeed * 0.5
      ship.vz = (dz / dist) * ship.maxSpeed * 0.5
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getNpcBehavior(ship: ShipState): NPCBehavior {
  // Determine behavior from ship type
  const typeId = ship.shipTypeId
  if (typeId.includes('pirate')) return 'pirate'
  if (typeId.includes('mining') || typeId.includes('industrial')) return 'miner'
  if (typeId.includes('navy') || typeId.includes('police')) return 'guard'
  return 'patrol'
}

function findNearestHostile(ship: ShipState, state: SystemState, range: number): ShipState | null {
  let nearest: ShipState | null = null
  let nearestDist = range

  state.ships.forEach((other) => {
    if (other.id === ship.id || other.isNpc || other.hp <= 0 || other.isDocked) return
    const dist = distance(ship, other)
    if (dist < nearestDist) {
      nearestDist = dist
      nearest = other
    }
  })

  return nearest
}

function findNearestPlayer(ship: ShipState, state: SystemState, range: number): ShipState | null {
  return findNearestHostile(ship, state, range) // Same logic for pirates
}

function findNearestStation(ship: ShipState, state: SystemState): { x: number; y: number; z: number } | null {
  let nearest: { x: number; y: number; z: number } | null = null
  let nearestDist = Infinity

  state.stations.forEach((station) => {
    const dist = distance(ship, station)
    if (dist < nearestDist) {
      nearestDist = dist
      nearest = station
    }
  })

  return nearest
}

function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}
