/**
 * IntentExecutorSystem - reads InputIntent and applies results to ECS components.
 * Runs after AISystem and InputSystem each frame.
 */

import type { GameEngine } from '../GameEngine'
import { Position, Velocity, ShipMeta, InputIntent } from '../ecs/components'
import { query } from 'bitecs'

const MOVE_SPEED = 200
const ARRIVAL_THRESHOLD_SQ = 5_000 * 5_000

const enum ShipState {
  IDLE = 0,
  MOVING = 1,
  WARPING = 2,
  ATTACKING = 6,
  DOCKED = 7,
}

function applyMoveTo(eid: number): void {
  const tx = InputIntent.moveToX[eid]
  const ty = InputIntent.moveToY[eid]
  const tz = InputIntent.moveToZ[eid]

  if (tx === 0 && ty === 0 && tz === 0) return

  const dx = tx - Position.x[eid]
  const dy = ty - Position.y[eid]
  const dz = tz - Position.z[eid]
  const distSq = dx * dx + dy * dy + dz * dz

  if (distSq < ARRIVAL_THRESHOLD_SQ) {
    Velocity.x[eid] = 0
    Velocity.y[eid] = 0
    Velocity.z[eid] = 0
    InputIntent.moveToX[eid] = 0
    InputIntent.moveToY[eid] = 0
    InputIntent.moveToZ[eid] = 0
    if (ShipMeta.state[eid] === ShipState.MOVING) {
      ShipMeta.state[eid] = ShipState.IDLE
    }
    return
  }

  const dist = Math.sqrt(distSq)
  Velocity.x[eid] = (dx / dist) * MOVE_SPEED
  Velocity.y[eid] = (dy / dist) * MOVE_SPEED
  Velocity.z[eid] = (dz / dist) * MOVE_SPEED

  if (ShipMeta.state[eid] === ShipState.IDLE) {
    ShipMeta.state[eid] = ShipState.MOVING
  }
}

function clearIntentFlags(eid: number): void {
  InputIntent.moveToX[eid] = 0
  InputIntent.moveToY[eid] = 0
  InputIntent.moveToZ[eid] = 0
  InputIntent.wantFire[eid] = 0
  InputIntent.wantWarp[eid] = 0
  InputIntent.wantDock[eid] = 0
}

export function intentExecutorSystem(engine: GameEngine, _dt: number): void {
  const world = engine.getWorld()
  if (!world) return

  const entities = query(world, [ShipMeta, InputIntent])

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]

    const hasMove = InputIntent.moveToX[eid] !== 0 ||
                    InputIntent.moveToY[eid] !== 0 ||
                    InputIntent.moveToZ[eid] !== 0

    if (hasMove) {
      applyMoveTo(eid)
    }

    if (InputIntent.wantFire[eid] === 1) {
      ShipMeta.state[eid] = ShipState.ATTACKING
    }

    if (InputIntent.wantWarp[eid] === 1) {
      ShipMeta.state[eid] = ShipState.WARPING
      Velocity.x[eid] = 0
      Velocity.y[eid] = 0
      Velocity.z[eid] = 0
    }

    if (InputIntent.wantDock[eid] === 1) {
      ShipMeta.state[eid] = ShipState.DOCKED
      ShipMeta.isDocked[eid] = 1
      Velocity.x[eid] = 0
      Velocity.y[eid] = 0
      Velocity.z[eid] = 0
    }

    clearIntentFlags(eid)
  }
}
