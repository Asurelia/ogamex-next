/**
 * Warp Sequence System
 *
 * Manages the full warp lifecycle:
 *   idle -> aligning -> spooling -> in_warp -> decelerating -> complete
 *
 * Handles both in-system warp (move to celestial) and cross-system
 * warp (transfer player to another SystemRoom).
 */

import { SystemState, ShipState, ShipStateEnum } from '../schema/GameState'
import { AU_IN_METERS, WARP_SPOOL_TIME } from '../../../shared/types/game-constants'

// ============================================================================
// TYPES
// ============================================================================

export type WarpPhase = 'aligning' | 'spooling' | 'in_warp' | 'decelerating' | 'complete'

export interface WarpSequence {
  shipId: string
  phase: WarpPhase
  targetPosition: { x: number; y: number; z: number }
  targetSystemId?: string
  startTime: number
  alignTime: number
  warpSpeed: number // AU/s
  /** Phase-local elapsed time tracker (seconds) */
  phaseElapsed: number
}

export type WarpTransferCallback = (shipId: string, targetSystemId: string) => void

// ============================================================================
// CONSTANTS
// ============================================================================

/** Arrival scatter radius (m) - land within 10km of target */
const ARRIVAL_RADIUS = 10000

/** Spool-up duration in seconds */
const SPOOL_DURATION = WARP_SPOOL_TIME

/** Minimum distance to initiate warp (m) - 150km */
const MIN_WARP_DISTANCE = 150000

// ============================================================================
// WARP SEQUENCE MANAGEMENT
// ============================================================================

/**
 * Initiate a warp sequence for a ship.
 * Returns null if warp cannot be initiated (too close, disrupted, etc.).
 */
export function initiateWarp(
  ship: ShipState,
  targetPosition: { x: number; y: number; z: number },
  alignTime: number,
  warpSpeed: number,
  targetSystemId?: string
): WarpSequence | null {
  // Check for warp disruption status
  // In a full implementation, this would check for 'engines_disabled' status effect
  if (ship.state === ShipStateEnum.DESTROYED || ship.isDocked) {
    return null
  }

  // For in-system warp, verify minimum distance
  if (!targetSystemId) {
    const dx = targetPosition.x - ship.x
    const dy = targetPosition.y - ship.y
    const dz = targetPosition.z - ship.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (dist < MIN_WARP_DISTANCE) {
      return null
    }
  }

  ship.state = ShipStateEnum.ALIGNING

  return {
    shipId: ship.id,
    phase: 'aligning',
    targetPosition,
    targetSystemId,
    startTime: Date.now(),
    alignTime,
    warpSpeed,
    phaseElapsed: 0,
  }
}

/**
 * Update all active warp sequences for the current tick.
 *
 * @param sequences  Map of shipId -> WarpSequence for all active warps
 * @param state      The current SystemState
 * @param dt         Delta time in seconds
 * @param onTransfer Optional callback when a ship warps to another system
 */
export function updateWarpSequences(
  sequences: Map<string, WarpSequence>,
  state: SystemState,
  dt: number,
  onTransfer?: WarpTransferCallback
): void {
  for (const [shipId, seq] of sequences) {
    const ship = state.ships.get(shipId)
    if (!ship || ship.hp <= 0) {
      sequences.delete(shipId)
      continue
    }

    // Check for warp disruption: if ship has been disrupted, cancel warp
    if (isWarpDisrupted(ship)) {
      cancelWarp(ship, seq, sequences)
      continue
    }

    seq.phaseElapsed += dt

    switch (seq.phase) {
      case 'aligning':
        updateAlignPhase(ship, seq, sequences)
        break

      case 'spooling':
        updateSpoolPhase(ship, seq, sequences)
        break

      case 'in_warp':
        updateInWarpPhase(ship, seq, state, dt, sequences, onTransfer)
        break

      case 'decelerating':
        // Instant deceleration for now
        completeWarp(ship, seq, sequences)
        break

      case 'complete':
        sequences.delete(shipId)
        break
    }
  }
}

// ============================================================================
// PHASE UPDATES
// ============================================================================

function updateAlignPhase(
  ship: ShipState,
  seq: WarpSequence,
  sequences: Map<string, WarpSequence>
): void {
  // Rotate ship toward target during align
  const dx = seq.targetPosition.x - ship.x
  const dy = seq.targetPosition.y - ship.y
  const dz = seq.targetPosition.z - ship.z

  ship.ry = Math.atan2(dx, dz)
  ship.rx = Math.atan2(-dy, Math.sqrt(dx * dx + dz * dz))

  // Align phase complete when alignTime has elapsed
  if (seq.phaseElapsed >= seq.alignTime) {
    seq.phase = 'spooling'
    seq.phaseElapsed = 0
    ship.state = ShipStateEnum.ALIGNING // Still visually aligning
  }
}

function updateSpoolPhase(
  ship: ShipState,
  seq: WarpSequence,
  sequences: Map<string, WarpSequence>
): void {
  if (seq.phaseElapsed >= SPOOL_DURATION) {
    // Cross-system warp: set WARPING_OUT and signal transfer
    if (seq.targetSystemId) {
      seq.phase = 'in_warp'
      seq.phaseElapsed = 0
      ship.state = ShipStateEnum.WARPING_OUT
    } else {
      seq.phase = 'in_warp'
      seq.phaseElapsed = 0
      ship.state = ShipStateEnum.WARPING
    }
  }
}

function updateInWarpPhase(
  ship: ShipState,
  seq: WarpSequence,
  state: SystemState,
  dt: number,
  sequences: Map<string, WarpSequence>,
  onTransfer?: WarpTransferCallback
): void {
  // Cross-system warp: transfer to another system room
  if (seq.targetSystemId) {
    if (onTransfer) {
      onTransfer(ship.id, seq.targetSystemId)
    }
    sequences.delete(ship.id)
    return
  }

  // In-system warp: move at warp speed toward target
  const dx = seq.targetPosition.x - ship.x
  const dy = seq.targetPosition.y - ship.y
  const dz = seq.targetPosition.z - ship.z
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

  // Warp speed in m/s
  const warpSpeedMs = seq.warpSpeed * AU_IN_METERS

  // Distance to travel this tick
  const moveDistance = warpSpeedMs * dt

  if (dist <= ARRIVAL_RADIUS || dist <= moveDistance) {
    // Arrived: snap to target with scatter
    seq.phase = 'decelerating'
    seq.phaseElapsed = 0
  } else {
    // In warp: set velocity toward target
    const nx = dx / dist
    const ny = dy / dist
    const nz = dz / dist

    ship.vx = nx * warpSpeedMs
    ship.vy = ny * warpSpeedMs
    ship.vz = nz * warpSpeedMs

    // Position update is handled by the physics system via velocity
    ship.ry = Math.atan2(dx, dz)
  }
}

// ============================================================================
// WARP COMPLETION / CANCELLATION
// ============================================================================

function completeWarp(
  ship: ShipState,
  seq: WarpSequence,
  sequences: Map<string, WarpSequence>
): void {
  // Place ship near target with small random offset
  const scatter = ARRIVAL_RADIUS * 0.5
  ship.x = seq.targetPosition.x + (Math.random() - 0.5) * scatter
  ship.y = seq.targetPosition.y + (Math.random() - 0.5) * scatter * 0.4
  ship.z = seq.targetPosition.z + (Math.random() - 0.5) * scatter

  // Zero out velocity
  ship.vx = 0
  ship.vy = 0
  ship.vz = 0
  ship.speed = 0

  ship.state = ShipStateEnum.IDLE
  ship.targetId = ''

  seq.phase = 'complete'
  sequences.delete(ship.id)
}

function cancelWarp(
  ship: ShipState,
  seq: WarpSequence,
  sequences: Map<string, WarpSequence>
): void {
  // Drop out of warp at current position
  ship.vx = 0
  ship.vy = 0
  ship.vz = 0
  ship.speed = 0
  ship.state = ShipStateEnum.IDLE

  sequences.delete(ship.id)
}

/**
 * Check if a ship is warp-disrupted.
 * Currently checks the simplified 'engines_disabled' concept.
 * In a full implementation this would check for warp disruptor/scrambler effects.
 */
function isWarpDisrupted(_ship: ShipState): boolean {
  // Placeholder: the ship schema does not yet have a status effects array.
  // When status effects are added, check for 'engines_disabled' or
  // 'warp_disrupted' effects here.
  return false
}

/**
 * Calculate warp travel time in seconds for a given distance and warp speed.
 * Useful for UI display and route planning.
 */
export function estimateWarpTime(
  distanceMeters: number,
  alignTimeSeconds: number,
  warpSpeedAU: number
): number {
  const warpSpeedMs = warpSpeedAU * AU_IN_METERS
  const travelTime = distanceMeters / warpSpeedMs
  return alignTimeSeconds + SPOOL_DURATION + travelTime
}
