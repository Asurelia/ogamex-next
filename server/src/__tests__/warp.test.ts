/**
 * Warp System Tests
 *
 * Tests pure functions from the warp system:
 * - estimateWarpTime: travel time calculation
 * - initiateWarp: warp sequence creation with validation
 *
 * ShipState is mocked as a plain object with the required properties
 * since the Colyseus @type decorators are not needed for logic tests.
 */

import { estimateWarpTime, initiateWarp, WarpSequence } from '../systems/warp'
import { ShipState, ShipStateEnum } from '../schema/GameState'
import { AU_IN_METERS, WARP_SPOOL_TIME } from '../../../shared/types/game-constants'

// ============================================================================
// HELPERS
// ============================================================================

function makeShip(overrides: Partial<ShipState> = {}): ShipState {
  const ship = new ShipState()
  ship.id = 'ship-001'
  ship.ownerId = 'owner-001'
  ship.shipTypeId = 'caldari_frigate'
  ship.x = 0
  ship.y = 0
  ship.z = 0
  ship.vx = 0
  ship.vy = 0
  ship.vz = 0
  ship.speed = 0
  ship.maxSpeed = 300
  ship.state = ShipStateEnum.IDLE
  ship.hp = 500
  ship.hpMax = 500
  ship.shield = 500
  ship.shieldMax = 500
  ship.armor = 500
  ship.armorMax = 500
  ship.isDocked = false
  ship.isNpc = false
  ship.targetId = ''
  Object.assign(ship, overrides)
  return ship
}

// ============================================================================
// estimateWarpTime
// ============================================================================

describe('estimateWarpTime', () => {
  it('should return align + spool + travel time', () => {
    // 1 AU distance, 3 AU/s warp speed, 5s align
    const distMeters = AU_IN_METERS // 1 AU
    const alignTime = 5
    const warpSpeedAU = 3

    const result = estimateWarpTime(distMeters, alignTime, warpSpeedAU)
    const expectedTravel = distMeters / (warpSpeedAU * AU_IN_METERS) // 1/3 s
    const expected = alignTime + WARP_SPOOL_TIME + expectedTravel

    expect(result).toBeCloseTo(expected, 5)
  })

  it('should handle zero distance (already at target)', () => {
    const result = estimateWarpTime(0, 3, 5)
    // 0 travel time, so just align + spool
    expect(result).toBeCloseTo(3 + WARP_SPOOL_TIME, 5)
  })

  it('should scale linearly with distance', () => {
    const time1 = estimateWarpTime(AU_IN_METERS, 0, 1)
    const time2 = estimateWarpTime(2 * AU_IN_METERS, 0, 1)
    // time2 travel portion should be exactly 2x time1 travel portion
    const travel1 = time1 - WARP_SPOOL_TIME
    const travel2 = time2 - WARP_SPOOL_TIME
    expect(travel2).toBeCloseTo(2 * travel1, 5)
  })

  it('should halve travel time when warp speed doubles', () => {
    const time1 = estimateWarpTime(AU_IN_METERS, 0, 2)
    const time2 = estimateWarpTime(AU_IN_METERS, 0, 4)
    const travel1 = time1 - WARP_SPOOL_TIME
    const travel2 = time2 - WARP_SPOOL_TIME
    expect(travel2).toBeCloseTo(travel1 / 2, 5)
  })

  it('should include spool time constant (WARP_SPOOL_TIME = 3s)', () => {
    expect(WARP_SPOOL_TIME).toBe(3.0)
    const result = estimateWarpTime(0, 0, 1)
    expect(result).toBeCloseTo(WARP_SPOOL_TIME, 5)
  })
})

// ============================================================================
// initiateWarp
// ============================================================================

describe('initiateWarp', () => {
  it('should create a valid warp sequence for in-system warp', () => {
    const ship = makeShip()
    // Target is far away (> 150km minimum)
    const target = { x: 200000, y: 0, z: 0 }

    const seq = initiateWarp(ship, target, 5, 3)

    expect(seq).not.toBeNull()
    expect(seq!.shipId).toBe('ship-001')
    expect(seq!.phase).toBe('aligning')
    expect(seq!.targetPosition).toEqual(target)
    expect(seq!.alignTime).toBe(5)
    expect(seq!.warpSpeed).toBe(3)
    expect(seq!.targetSystemId).toBeUndefined()
    expect(seq!.phaseElapsed).toBe(0)
  })

  it('should set ship state to ALIGNING when warp starts', () => {
    const ship = makeShip()
    const target = { x: 200000, y: 0, z: 0 }

    initiateWarp(ship, target, 5, 3)

    expect(ship.state).toBe(ShipStateEnum.ALIGNING)
  })

  it('should reject warp if target is too close (< 150km)', () => {
    const ship = makeShip()
    // Only 100km away
    const target = { x: 100000, y: 0, z: 0 }

    const seq = initiateWarp(ship, target, 5, 3)

    expect(seq).toBeNull()
  })

  it('should reject warp if ship is destroyed', () => {
    const ship = makeShip({ state: ShipStateEnum.DESTROYED })
    const target = { x: 200000, y: 0, z: 0 }

    const seq = initiateWarp(ship, target, 5, 3)

    expect(seq).toBeNull()
  })

  it('should reject warp if ship is docked', () => {
    const ship = makeShip({ isDocked: true })
    const target = { x: 200000, y: 0, z: 0 }

    const seq = initiateWarp(ship, target, 5, 3)

    expect(seq).toBeNull()
  })

  it('should allow cross-system warp regardless of distance', () => {
    const ship = makeShip()
    // Target is close but it is a cross-system warp
    const target = { x: 0, y: 0, z: 0 }

    const seq = initiateWarp(ship, target, 5, 3, 'target-system-id')

    expect(seq).not.toBeNull()
    expect(seq!.targetSystemId).toBe('target-system-id')
  })

  it('should reject warp exactly at minimum distance boundary', () => {
    const ship = makeShip()
    // Exactly 150000m = MIN_WARP_DISTANCE, but the check is dist < 150000
    // so exactly 150000 should be allowed
    const target = { x: 150000, y: 0, z: 0 }

    const seq = initiateWarp(ship, target, 5, 3)

    // dist = 150000 which is NOT < 150000, so warp should be allowed
    expect(seq).not.toBeNull()
  })

  it('should reject warp just below minimum distance', () => {
    const ship = makeShip()
    const target = { x: 149999, y: 0, z: 0 }

    const seq = initiateWarp(ship, target, 5, 3)

    expect(seq).toBeNull()
  })

  it('should record a start time', () => {
    const ship = makeShip()
    const target = { x: 200000, y: 0, z: 0 }
    const before = Date.now()

    const seq = initiateWarp(ship, target, 5, 3)

    const after = Date.now()
    expect(seq!.startTime).toBeGreaterThanOrEqual(before)
    expect(seq!.startTime).toBeLessThanOrEqual(after)
  })
})
