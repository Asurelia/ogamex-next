/**
 * Client-Side Prediction & Interpolation
 *
 * Own ship: predict at 60fps, correct with server state using lerp.
 * Other ships: dead reckoning + interpolation buffer.
 */

import { PREDICTION_LERP_FACTOR, INTERPOLATION_BUFFER_SIZE } from '@shared/types/game-constants'

// ============================================================================
// TYPES
// ============================================================================

interface Vec3 {
  x: number
  y: number
  z: number
}

interface Snapshot {
  position: Vec3
  velocity: Vec3
  rotation: Vec3
  timestamp: number
}

// ============================================================================
// INTERPOLATION BUFFER
// ============================================================================

export class InterpolationBuffer {
  private snapshots: Snapshot[] = []
  private maxSnapshots: number

  constructor(maxSnapshots: number = INTERPOLATION_BUFFER_SIZE) {
    this.maxSnapshots = maxSnapshots
  }

  /**
   * Add a new server snapshot
   */
  push(snapshot: Snapshot): void {
    this.snapshots.push(snapshot)
    if (this.snapshots.length > this.maxSnapshots + 1) {
      this.snapshots.shift()
    }
  }

  /**
   * Get interpolated position at the given time.
   * Interpolates between the two nearest snapshots.
   */
  getInterpolated(time: number): Snapshot | null {
    if (this.snapshots.length < 2) {
      return this.snapshots[0] || null
    }

    // Find the two snapshots to interpolate between
    const renderTime = time - (1000 / 20) // One tick behind for smooth interpolation

    let from = this.snapshots[0]
    let to = this.snapshots[1]

    for (let i = 0; i < this.snapshots.length - 1; i++) {
      if (this.snapshots[i + 1].timestamp >= renderTime) {
        from = this.snapshots[i]
        to = this.snapshots[i + 1]
        break
      }
    }

    // Calculate interpolation factor
    const duration = to.timestamp - from.timestamp
    const t = duration > 0 ? Math.min(1, (renderTime - from.timestamp) / duration) : 0

    return {
      position: lerpVec3(from.position, to.position, t),
      velocity: lerpVec3(from.velocity, to.velocity, t),
      rotation: lerpVec3(from.rotation, to.rotation, t),
      timestamp: renderTime,
    }
  }

  get length(): number {
    return this.snapshots.length
  }
}

// ============================================================================
// OWN SHIP PREDICTION
// ============================================================================

export class ShipPredictor {
  private serverPosition: Vec3 = { x: 0, y: 0, z: 0 }
  private serverVelocity: Vec3 = { x: 0, y: 0, z: 0 }
  private predictedPosition: Vec3 = { x: 0, y: 0, z: 0 }
  private lerpFactor: number

  constructor(lerpFactor: number = PREDICTION_LERP_FACTOR) {
    this.lerpFactor = lerpFactor
  }

  /**
   * Update with new server state
   */
  updateServerState(position: Vec3, velocity: Vec3): void {
    this.serverPosition = { ...position }
    this.serverVelocity = { ...velocity }
  }

  /**
   * Predict position for the current frame
   */
  predict(dt: number): Vec3 {
    // Dead reckoning from server state
    const predicted: Vec3 = {
      x: this.serverPosition.x + this.serverVelocity.x * dt,
      y: this.serverPosition.y + this.serverVelocity.y * dt,
      z: this.serverPosition.z + this.serverVelocity.z * dt,
    }

    // Lerp toward server-predicted position
    this.predictedPosition = lerpVec3(this.predictedPosition, predicted, this.lerpFactor)

    return this.predictedPosition
  }

  /**
   * Force set position (for teleport/warp)
   */
  forcePosition(position: Vec3): void {
    this.predictedPosition = { ...position }
    this.serverPosition = { ...position }
  }

  get position(): Vec3 {
    return this.predictedPosition
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
