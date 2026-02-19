/**
 * Real-Time Fleet Formation System
 *
 * Leader-follower model where fleet members maintain 3D offsets
 * from the fleet leader's position. Adapted from the turn-based
 * fleet-formations.ts for real-time continuous movement.
 *
 * Supported formations:
 *   line, arrow, sphere, wolf_pack, scattered
 */

import { ShipState } from '../schema/GameState'

// ============================================================================
// TYPES
// ============================================================================

export type RTFormationType = 'line' | 'arrow' | 'sphere' | 'wolf_pack' | 'scattered'

export interface FormationOffset {
  x: number
  y: number
  z: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Base spacing between formation members (meters) */
const BASE_SPACING = 2000

/** Speed at which followers move toward their formation position (lerp factor per second) */
const FORMATION_FOLLOW_SPEED = 2.0

/** Maximum distance before follower snaps to formation position */
const SNAP_DISTANCE = 50000

// ============================================================================
// FORMATION OFFSETS
// ============================================================================

/**
 * Calculate 3D formation offsets for a given formation type and member count.
 * Returns one offset per member (index 0 is the first follower, not the leader).
 */
export function getFormationOffsets(
  type: RTFormationType,
  memberCount: number
): FormationOffset[] {
  if (memberCount <= 0) return []

  switch (type) {
    case 'line':
      return getLineOffsets(memberCount)
    case 'arrow':
      return getArrowOffsets(memberCount)
    case 'sphere':
      return getSphereOffsets(memberCount)
    case 'wolf_pack':
      return getWolfPackOffsets(memberCount)
    case 'scattered':
      return getScatteredOffsets(memberCount)
    default:
      return getLineOffsets(memberCount)
  }
}

/**
 * Line formation: members trail behind the leader in a straight line.
 */
function getLineOffsets(count: number): FormationOffset[] {
  const offsets: FormationOffset[] = []
  for (let i = 0; i < count; i++) {
    offsets.push({
      x: 0,
      y: 0,
      z: -(i + 1) * BASE_SPACING,
    })
  }
  return offsets
}

/**
 * Arrow (wedge) formation: V-shape behind the leader.
 */
function getArrowOffsets(count: number): FormationOffset[] {
  const offsets: FormationOffset[] = []
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / 2) + 1
    const side = i % 2 === 0 ? 1 : -1
    offsets.push({
      x: side * row * BASE_SPACING,
      y: 0,
      z: -row * BASE_SPACING,
    })
  }
  return offsets
}

/**
 * Sphere (defensive) formation: members arranged in a sphere around the leader.
 * Uses spherical coordinate distribution for even spacing.
 */
function getSphereOffsets(count: number): FormationOffset[] {
  const offsets: FormationOffset[] = []
  const radius = BASE_SPACING * 1.5

  for (let i = 0; i < count; i++) {
    // Golden ratio sphere distribution
    const phi = Math.acos(1 - (2 * (i + 1)) / (count + 1))
    const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 1)

    offsets.push({
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.sin(theta),
    })
  }
  return offsets
}

/**
 * Wolf pack formation: small clusters of 3-4 ships in a loose diamond.
 */
function getWolfPackOffsets(count: number): FormationOffset[] {
  const offsets: FormationOffset[] = []
  const packSize = 3
  const packSpacing = BASE_SPACING * 4

  for (let i = 0; i < count; i++) {
    const packIndex = Math.floor(i / packSize)
    const posInPack = i % packSize

    // Pack offset from leader
    const packX = ((packIndex % 3) - 1) * packSpacing
    const packZ = -Math.floor(packIndex / 3) * packSpacing - packSpacing

    // Position within pack (triangle)
    let localX = 0
    let localZ = 0
    if (posInPack === 0) {
      localX = 0
      localZ = 0
    } else if (posInPack === 1) {
      localX = -BASE_SPACING * 0.5
      localZ = -BASE_SPACING * 0.75
    } else {
      localX = BASE_SPACING * 0.5
      localZ = -BASE_SPACING * 0.75
    }

    offsets.push({
      x: packX + localX,
      y: 0,
      z: packZ + localZ,
    })
  }
  return offsets
}

/**
 * Scattered formation: randomized positions within a large radius.
 * Uses deterministic offsets based on index for consistency.
 */
function getScatteredOffsets(count: number): FormationOffset[] {
  const offsets: FormationOffset[] = []
  const radius = BASE_SPACING * 5

  for (let i = 0; i < count; i++) {
    // Deterministic pseudo-random scatter using golden angle
    const angle = (i + 1) * 2.399963 // Golden angle in radians
    const r = radius * Math.sqrt((i + 1) / (count + 1))

    offsets.push({
      x: r * Math.cos(angle),
      y: (((i % 5) - 2) / 2) * BASE_SPACING * 0.3,
      z: r * Math.sin(angle),
    })
  }
  return offsets
}

// ============================================================================
// FORMATION POSITION UPDATES
// ============================================================================

/**
 * Move follower ships toward their calculated formation positions.
 *
 * Formation positions are computed as offsets from the leader's current position,
 * rotated by the leader's heading. Followers lerp toward these positions.
 *
 * @param leader   The fleet leader ship
 * @param members  Array of follower ships (does NOT include the leader)
 * @param offsets  Pre-calculated offsets from getFormationOffsets (same length as members)
 * @param dt       Delta time in seconds
 */
export function updateFormationPositions(
  leader: ShipState,
  members: ShipState[],
  offsets: FormationOffset[],
  dt: number
): void {
  // Leader heading on the XZ plane
  const heading = leader.ry

  const cosH = Math.cos(heading)
  const sinH = Math.sin(heading)

  const count = Math.min(members.length, offsets.length)

  for (let i = 0; i < count; i++) {
    const member = members[i]
    const offset = offsets[i]

    // Rotate offset by leader's heading
    const worldX = leader.x + offset.x * cosH + offset.z * sinH
    const worldY = leader.y + offset.y
    const worldZ = leader.z - offset.x * sinH + offset.z * cosH

    // Distance from member to target formation position
    const dx = worldX - member.x
    const dy = worldY - member.y
    const dz = worldZ - member.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (dist < 1) continue // Close enough

    if (dist > SNAP_DISTANCE) {
      // Too far away: snap to position
      member.x = worldX
      member.y = worldY
      member.z = worldZ
      member.vx = leader.vx
      member.vy = leader.vy
      member.vz = leader.vz
    } else {
      // Smooth interpolation toward formation position
      const t = Math.min(1, FORMATION_FOLLOW_SPEED * dt)
      member.x += dx * t
      member.y += dy * t
      member.z += dz * t

      // Set velocity to match leader's general direction plus formation correction
      member.vx = leader.vx + dx * t / dt * 0.1
      member.vy = leader.vy + dy * t / dt * 0.1
      member.vz = leader.vz + dz * t / dt * 0.1
    }

    // Face the same direction as the leader
    member.ry = heading
  }
}
