/**
 * Behaviour Tree presets for NPC archetypes.
 * Conditions and actions read/write ECS components directly.
 */

import { BTStatus, BTNode, Selector, Sequence, Condition, Action, AlwaysSucceed } from './BehaviourTree'
import { Position, ShipMeta, Velocity, Health, InputIntent } from '../ecs/components'

const HOSTILE_RANGE = 80_000
const GUARD_HOME_RANGE = 30_000
const GUARD_ATTACK_RANGE = 40_000
const MINER_MINE_RANGE = 2_000
const APPROACH_SPEED = 150
const PATROL_SPEED = 80

// Per-entity home positions for guard NPCs
const homePositions = new Map<number, { x: number; y: number; z: number }>()

// Per-entity asteroid targets
const asteroidTargets = new Map<number, { x: number; y: number; z: number }>()

// --- Shared condition helpers ---

function isIdle(eid: number): boolean {
  return ShipMeta.state[eid] === 0
}

function isUnderAttack(eid: number): boolean {
  return ShipMeta.state[eid] === 5
}

function isHostileNearby(eid: number): boolean {
  const x = Position.x[eid]
  const y = Position.y[eid]
  const z = Position.z[eid]
  const MAX = 10_000
  for (let candidate = 0; candidate < MAX; candidate++) {
    if (candidate === eid) continue
    if (ShipMeta.isNpc[candidate] === 0 && ShipMeta.isDocked[candidate] === 0) {
      const dx = Position.x[candidate] - x
      const dy = Position.y[candidate] - y
      const dz = Position.z[candidate] - z
      if (dx * dx + dy * dy + dz * dz < HOSTILE_RANGE * HOSTILE_RANGE) {
        InputIntent.targetEid[eid] = candidate
        return true
      }
    }
  }
  return false
}

function isPlayerNearby(eid: number): boolean {
  return isHostileNearby(eid)
}

function hasTarget(eid: number): boolean {
  return InputIntent.targetEid[eid] >= 0
}

function targetAlive(eid: number): boolean {
  const target = InputIntent.targetEid[eid]
  if (target < 0) return false
  return Health.hp[target] > 0
}

function isFarFromHome(eid: number): boolean {
  const home = homePositions.get(eid)
  if (!home) return false
  const dx = Position.x[eid] - home.x
  const dy = Position.y[eid] - home.y
  const dz = Position.z[eid] - home.z
  return dx * dx + dy * dy + dz * dz > GUARD_HOME_RANGE * GUARD_HOME_RANGE
}

function isNearAsteroid(eid: number): boolean {
  const target = asteroidTargets.get(eid)
  if (!target) return false
  const dx = Position.x[eid] - target.x
  const dy = Position.y[eid] - target.y
  const dz = Position.z[eid] - target.z
  return dx * dx + dy * dy + dz * dz < MINER_MINE_RANGE * MINER_MINE_RANGE
}

function hasAsteroidTarget(eid: number): boolean {
  return asteroidTargets.has(eid)
}

// --- Shared action helpers ---

function attackTarget(eid: number): BTStatus {
  const target = InputIntent.targetEid[eid]
  if (target < 0 || Health.hp[target] <= 0) {
    InputIntent.targetEid[eid] = -1
    return BTStatus.FAILURE
  }
  InputIntent.moveToX[eid] = Position.x[target]
  InputIntent.moveToY[eid] = Position.y[target]
  InputIntent.moveToZ[eid] = Position.z[target]
  InputIntent.wantFire[eid] = 1
  ShipMeta.state[eid] = 6
  return BTStatus.RUNNING
}

function setRandomVelocity(eid: number): BTStatus {
  const angle = Math.random() * Math.PI * 2
  const pitch = (Math.random() - 0.5) * Math.PI
  Velocity.x[eid] = Math.cos(angle) * Math.cos(pitch) * PATROL_SPEED
  Velocity.y[eid] = Math.sin(pitch) * PATROL_SPEED
  Velocity.z[eid] = Math.sin(angle) * Math.cos(pitch) * PATROL_SPEED
  ShipMeta.state[eid] = 1
  return BTStatus.SUCCESS
}

function moveToHome(eid: number): BTStatus {
  const home = homePositions.get(eid)
  if (!home) return BTStatus.FAILURE
  InputIntent.moveToX[eid] = home.x
  InputIntent.moveToY[eid] = home.y
  InputIntent.moveToZ[eid] = home.z
  return BTStatus.RUNNING
}

function selectTarget(eid: number): BTStatus {
  return isHostileNearby(eid) ? BTStatus.SUCCESS : BTStatus.FAILURE
}

function flee(eid: number): BTStatus {
  Velocity.x[eid] = -Velocity.x[eid] * 2
  Velocity.y[eid] = -Velocity.y[eid] * 2
  Velocity.z[eid] = -Velocity.z[eid] * 2
  InputIntent.wantWarp[eid] = 1
  ShipMeta.state[eid] = 2
  return BTStatus.RUNNING
}

function mineAsteroid(eid: number): BTStatus {
  ShipMeta.state[eid] = 4
  return BTStatus.RUNNING
}

function approachAsteroid(eid: number): BTStatus {
  const target = asteroidTargets.get(eid)
  if (!target) return BTStatus.FAILURE
  const dx = target.x - Position.x[eid]
  const dy = target.y - Position.y[eid]
  const dz = target.z - Position.z[eid]
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (dist > 0) {
    Velocity.x[eid] = (dx / dist) * APPROACH_SPEED
    Velocity.y[eid] = (dy / dist) * APPROACH_SPEED
    Velocity.z[eid] = (dz / dist) * APPROACH_SPEED
  }
  ShipMeta.state[eid] = 1
  return BTStatus.RUNNING
}

function findAsteroid(eid: number): BTStatus {
  const spread = 50_000
  asteroidTargets.set(eid, {
    x: (Math.random() - 0.5) * spread,
    y: (Math.random() - 0.5) * spread * 0.1,
    z: (Math.random() - 0.5) * spread,
  })
  return BTStatus.SUCCESS
}

function idleAction(eid: number): BTStatus {
  ShipMeta.state[eid] = 0
  Velocity.x[eid] = 0
  Velocity.y[eid] = 0
  Velocity.z[eid] = 0
  return BTStatus.SUCCESS
}

// --- BT Factories ---

export function createPatrolBT(): BTNode {
  return new Selector(
    new Sequence(
      new Condition(isHostileNearby),
      new Action(attackTarget)
    ),
    new Sequence(
      new Condition(isIdle),
      new Action(setRandomVelocity)
    ),
    new AlwaysSucceed(new Action(setRandomVelocity))
  )
}

export function createGuardBT(homeX = 0, homeY = 0, homeZ = 0): BTNode {
  return {
    tick(eid: number): BTStatus {
      if (!homePositions.has(eid)) {
        homePositions.set(eid, { x: homeX, y: homeY, z: homeZ })
      }
      return new Selector(
        new Sequence(
          new Condition((e) => {
            const x = Position.x[e]
            const y = Position.y[e]
            const z = Position.z[e]
            for (let c = 0; c < 10_000; c++) {
              if (c === e || ShipMeta.isNpc[c] !== 0 || ShipMeta.isDocked[c] !== 0) continue
              const dx = Position.x[c] - x
              const dy = Position.y[c] - y
              const dz = Position.z[c] - z
              if (dx * dx + dy * dy + dz * dz < GUARD_ATTACK_RANGE * GUARD_ATTACK_RANGE) {
                InputIntent.targetEid[e] = c
                return true
              }
            }
            return false
          }),
          new Action(attackTarget)
        ),
        new Sequence(
          new Condition(isFarFromHome),
          new Action(moveToHome)
        ),
        new Action(idleAction)
      ).tick(eid)
    }
  }
}

export function createPirateBT(): BTNode {
  return new Selector(
    new Sequence(
      new Condition(hasTarget),
      new Condition(targetAlive),
      new Action(attackTarget)
    ),
    new Sequence(
      new Condition(isPlayerNearby),
      new Action(selectTarget),
      new Action(attackTarget)
    ),
    new Action(setRandomVelocity)
  )
}

export function createMinerBT(): BTNode {
  return new Selector(
    new Sequence(
      new Condition(isUnderAttack),
      new Action(flee)
    ),
    new Sequence(
      new Condition(isNearAsteroid),
      new Action(mineAsteroid)
    ),
    new Sequence(
      new Condition(hasAsteroidTarget),
      new Action(approachAsteroid)
    ),
    new Sequence(
      new Action(findAsteroid),
      new Action(approachAsteroid)
    )
  )
}
