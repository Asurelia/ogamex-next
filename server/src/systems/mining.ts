/**
 * Mining System
 *
 * Handles ore extraction from asteroids.
 * Checks range, calculates yield, depletes asteroids.
 */

import { SystemState, ShipStateEnum } from '../schema/GameState'
import { MINING_RANGE, BASE_MINING_YIELD, MINING_CYCLE_TIME } from '../../../shared/types/game-constants'

type MiningCallback = (
  minerId: string,
  asteroidId: string,
  oreType: string,
  amount: number
) => void

/**
 * Update mining for all mining ships
 */
export function updateMining(
  state: SystemState,
  dt: number,
  onYield: MiningCallback
): void {
  state.ships.forEach((ship) => {
    if (ship.state !== ShipStateEnum.MINING || !ship.targetId) return
    if (ship.isDocked || ship.hp <= 0) return

    const asteroid = state.asteroids.get(ship.targetId)
    if (!asteroid || asteroid.volume <= 0) {
      // Asteroid depleted or not found
      ship.state = ShipStateEnum.IDLE
      ship.targetId = ''
      return
    }

    // Range check - use squared distance to avoid sqrt
    const dx = asteroid.x - ship.x
    const dy = asteroid.y - ship.y
    const dz = asteroid.z - ship.z
    const distSq = dx * dx + dy * dy + dz * dz

    if (distSq > MINING_RANGE * MINING_RANGE) {
      // Out of range - stop mining
      return
    }

    // Calculate yield per second
    const yieldPerSecond = BASE_MINING_YIELD / MINING_CYCLE_TIME
    const mined = yieldPerSecond * dt

    // Deduct from asteroid
    const actualMined = Math.min(mined, asteroid.volume)
    asteroid.volume -= actualMined

    if (actualMined > 0) {
      onYield(ship.id, asteroid.id, asteroid.oreType, actualMined)
    }

    // Remove depleted asteroids
    if (asteroid.volume <= 0) {
      state.asteroids.delete(asteroid.id)
    }
  })
}
