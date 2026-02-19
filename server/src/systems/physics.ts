/**
 * Physics System
 *
 * Handles ship movement: thrust, align, warp, orbit, approach.
 * Runs at 20Hz server tick rate.
 */

import { SystemState, ShipState, ShipStateEnum } from '../schema/GameState'
import { APPROACH_THRESHOLD, DEFAULT_ORBIT_RANGE, WARP_SPOOL_TIME } from '../../../shared/types/game-constants'

/**
 * Update physics for all ships in the system
 */
export function updatePhysics(state: SystemState, dt: number): void {
  state.ships.forEach((ship) => {
    if (ship.isDocked || ship.state === ShipStateEnum.DESTROYED) return

    switch (ship.state) {
      case ShipStateEnum.IDLE:
        decelerateShip(ship, dt)
        break

      case ShipStateEnum.APPROACHING:
        updateApproach(ship, state, dt)
        break

      case ShipStateEnum.ORBITING:
        updateOrbit(ship, state, dt)
        break

      case ShipStateEnum.ALIGNING:
        updateAlign(ship, state, dt)
        break

      case ShipStateEnum.WARPING:
        updateWarp(ship, state, dt)
        break

      case ShipStateEnum.ATTACKING:
        // Maintain orbit/approach while attacking
        if (ship.targetId) {
          updateApproach(ship, state, dt)
        }
        break

      case ShipStateEnum.MINING:
        // Stay near asteroid
        if (ship.targetId) {
          updateApproachStop(ship, state, dt, 5000) // Stop within 5km
        }
        break
    }

    // Apply velocity to position
    ship.x += ship.vx * dt
    ship.y += ship.vy * dt
    ship.z += ship.vz * dt

    // Update speed scalar
    ship.speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy + ship.vz * ship.vz)
  })
}

// ============================================================================
// MOVEMENT HELPERS
// ============================================================================

function decelerateShip(ship: ShipState, dt: number) {
  const decelRate = 0.95 // Friction factor per tick
  ship.vx *= decelRate
  ship.vy *= decelRate
  ship.vz *= decelRate

  // Stop if very slow
  if (Math.abs(ship.vx) < 0.1 && Math.abs(ship.vy) < 0.1 && Math.abs(ship.vz) < 0.1) {
    ship.vx = 0
    ship.vy = 0
    ship.vz = 0
    ship.speed = 0
  }
}

function updateApproach(ship: ShipState, state: SystemState, dt: number) {
  const target = findEntity(state, ship.targetId)
  if (!target) {
    ship.state = ShipStateEnum.IDLE
    ship.targetId = ''
    return
  }

  const dx = target.x - ship.x
  const dy = target.y - ship.y
  const dz = target.z - ship.z
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

  if (dist <= APPROACH_THRESHOLD) {
    ship.state = ShipStateEnum.IDLE
    decelerateShip(ship, dt)
    return
  }

  // Accelerate toward target
  const accel = ship.maxSpeed * 2 // Reach max speed in ~0.5s
  const targetVx = (dx / dist) * ship.maxSpeed
  const targetVy = (dy / dist) * ship.maxSpeed
  const targetVz = (dz / dist) * ship.maxSpeed

  ship.vx += (targetVx - ship.vx) * Math.min(1, accel * dt / ship.maxSpeed)
  ship.vy += (targetVy - ship.vy) * Math.min(1, accel * dt / ship.maxSpeed)
  ship.vz += (targetVz - ship.vz) * Math.min(1, accel * dt / ship.maxSpeed)

  // Update rotation to face target
  ship.ry = Math.atan2(dx, dz)
  ship.rx = Math.atan2(-dy, Math.sqrt(dx * dx + dz * dz))
}

function updateApproachStop(ship: ShipState, state: SystemState, dt: number, stopRange: number) {
  const target = findEntity(state, ship.targetId)
  if (!target) {
    ship.state = ShipStateEnum.IDLE
    ship.targetId = ''
    return
  }

  const dx = target.x - ship.x
  const dy = target.y - ship.y
  const dz = target.z - ship.z
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

  if (dist <= stopRange) {
    decelerateShip(ship, dt)
    return
  }

  // Move toward target
  const speed = ship.maxSpeed
  ship.vx = (dx / dist) * speed
  ship.vy = (dy / dist) * speed
  ship.vz = (dz / dist) * speed

  ship.ry = Math.atan2(dx, dz)
}

function updateOrbit(ship: ShipState, state: SystemState, dt: number) {
  const target = findEntity(state, ship.targetId)
  if (!target) {
    ship.state = ShipStateEnum.IDLE
    ship.targetId = ''
    return
  }

  const dx = target.x - ship.x
  const dy = target.y - ship.y
  const dz = target.z - ship.z
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
  const orbitRange = DEFAULT_ORBIT_RANGE

  if (dist > orbitRange * 2) {
    // Too far, approach first
    const speed = ship.maxSpeed
    ship.vx = (dx / dist) * speed
    ship.vy = (dy / dist) * speed
    ship.vz = (dz / dist) * speed
  } else {
    // Orbit: tangential velocity
    const nx = dx / dist
    const nz = dz / dist
    const tangentX = -nz
    const tangentZ = nx

    // Radial correction to maintain orbit distance
    const radialFactor = (dist - orbitRange) / orbitRange * 0.5
    const speed = ship.maxSpeed * 0.8

    ship.vx = (tangentX + nx * radialFactor) * speed
    ship.vy = -dy * 0.1 // Slowly level out
    ship.vz = (tangentZ + nz * radialFactor) * speed
  }

  ship.ry = Math.atan2(ship.vx, ship.vz)
}

function updateAlign(ship: ShipState, state: SystemState, dt: number) {
  // Align is the first phase of warp - ship rotates toward destination
  // After alignTime seconds, transition to WARPING
  const target = findEntity(state, ship.targetId)
  if (!target) {
    ship.state = ShipStateEnum.IDLE
    return
  }

  // Simple align: point toward target, then warp
  const dx = target.x - ship.x
  const dy = target.y - ship.y
  const dz = target.z - ship.z

  ship.ry = Math.atan2(dx, dz)
  ship.rx = Math.atan2(-dy, Math.sqrt(dx * dx + dz * dz))

  // After spool time, warp
  // Use a simple counter - in production you'd track align start time
  ship.state = ShipStateEnum.WARPING
}

function updateWarp(ship: ShipState, state: SystemState, dt: number) {
  const target = findEntity(state, ship.targetId)
  if (!target) {
    ship.state = ShipStateEnum.IDLE
    return
  }

  const dx = target.x - ship.x
  const dy = target.y - ship.y
  const dz = target.z - ship.z
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

  // Warp speed: instant jump to near destination
  const warpSpeed = 100000 // Very fast - 100km/s in warp
  const maxMove = warpSpeed * dt

  if (dist <= maxMove || dist <= 10000) {
    // Arrived at warp destination (within 10km)
    ship.x = target.x + (Math.random() - 0.5) * 5000
    ship.y = target.y + (Math.random() - 0.5) * 2000
    ship.z = target.z + (Math.random() - 0.5) * 5000
    ship.vx = 0
    ship.vy = 0
    ship.vz = 0
    ship.state = ShipStateEnum.IDLE
    ship.targetId = ''
  } else {
    // In warp
    ship.vx = (dx / dist) * warpSpeed
    ship.vy = (dy / dist) * warpSpeed
    ship.vz = (dz / dist) * warpSpeed
  }
}

// ============================================================================
// ENTITY LOOKUP
// ============================================================================

interface EntityPosition {
  x: number
  y: number
  z: number
}

function findEntity(state: SystemState, entityId: string): EntityPosition | null {
  if (!entityId) return null

  // Check ships
  const ship = state.ships.get(entityId)
  if (ship) return ship

  // Check asteroids
  const asteroid = state.asteroids.get(entityId)
  if (asteroid) return asteroid

  // Check stations
  const station = state.stations.get(entityId)
  if (station) return station

  return null
}
