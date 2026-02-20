'use client'

/**
 * EngineTrailVFX - Renders engine trails behind moving ships.
 * Uses Points geometry with additive blending for a glowing exhaust effect.
 * Trail length scales with ship speed relative to maxSpeed.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRTGameStore } from '@/stores/rtGameStore'
import * as THREE from 'three'

// ============================================================================
// CONSTANTS
// ============================================================================

const SPEED_THRESHOLD = 10
const MAX_TRAILS = 50
const TRAIL_POINTS = 8
const TRAIL_BASE_LENGTH = 80
const TRAIL_MAX_LENGTH = 400
const POINT_SIZE = 18

const FACTION_TINTS: Record<string, THREE.Color> = {
  caldari: new THREE.Color('#93C5FD'),
  amarr: new THREE.Color('#FDE68A'),
  minmatar: new THREE.Color('#FCA5A5'),
  gallente: new THREE.Color('#6EE7B7'),
}
const DEFAULT_TINT = new THREE.Color('#93C5FD')

// ============================================================================
// TYPES
// ============================================================================

interface TrailData {
  shipId: string
  position: THREE.Vector3
  velocity: THREE.Vector3
  speed: number
  maxSpeed: number
  color: THREE.Color
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EngineTrailVFX() {
  const groupRef = useRef<THREE.Group>(null)
  const trailsRef = useRef<Map<string, THREE.Points>>(new Map())
  const matsRef = useRef<Map<string, THREE.PointsMaterial>>(new Map())

  const tmpVec = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const ships = useRTGameStore.getState().ships
    const group = groupRef.current
    if (!group) return

    // Collect trails for moving ships
    const activeTrails: TrailData[] = []
    for (const [, ship] of ships) {
      if (activeTrails.length >= MAX_TRAILS) break
      if (ship.speed < SPEED_THRESHOLD || ship.isDocked) continue

      const vel = tmpVec.set(ship.vx, ship.vy, ship.vz)
      if (vel.lengthSq() < 1) {
        // Fallback: infer direction from speed as forward along Z
        vel.set(0, 0, -ship.speed)
      }

      activeTrails.push({
        shipId: ship.id,
        position: new THREE.Vector3(ship.x, ship.y, ship.z),
        velocity: vel.clone().normalize(),
        speed: ship.speed,
        maxSpeed: ship.maxSpeed || ship.speed,
        color: (FACTION_TINTS[ship.faction] || DEFAULT_TINT).clone(),
      })
    }

    // Track which trails are still active
    const activeIds = new Set(activeTrails.map((t) => t.shipId))

    // Remove trails for ships that are no longer moving
    for (const [id, points] of trailsRef.current) {
      if (!activeIds.has(id)) {
        group.remove(points)
        points.geometry.dispose()
        matsRef.current.get(id)?.dispose()
        matsRef.current.delete(id)
        trailsRef.current.delete(id)
      }
    }

    // Update or create trails
    for (const trail of activeTrails) {
      const speedRatio = Math.min(trail.speed / trail.maxSpeed, 1)
      const trailLength = TRAIL_BASE_LENGTH + (TRAIL_MAX_LENGTH - TRAIL_BASE_LENGTH) * speedRatio

      let points = trailsRef.current.get(trail.shipId)
      let mat = matsRef.current.get(trail.shipId)

      if (!points) {
        // Create new trail
        const positions = new Float32Array(TRAIL_POINTS * 3)
        const colors = new Float32Array(TRAIL_POINTS * 3)
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

        mat = new THREE.PointsMaterial({
          size: POINT_SIZE,
          transparent: true,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          sizeAttenuation: true,
        })
        points = new THREE.Points(geo, mat)
        points.frustumCulled = false
        group.add(points)
        trailsRef.current.set(trail.shipId, points)
        matsRef.current.set(trail.shipId, mat)
      }

      // Update point positions along trail behind ship
      const posAttr = points.geometry.getAttribute('position') as THREE.BufferAttribute
      const colAttr = points.geometry.getAttribute('color') as THREE.BufferAttribute
      const posArr = posAttr.array as Float32Array
      const colArr = colAttr.array as Float32Array

      // Direction opposite to velocity (trail goes behind ship)
      const trailDir = trail.velocity.clone().negate()

      for (let j = 0; j < TRAIL_POINTS; j++) {
        const t = j / (TRAIL_POINTS - 1) // 0 at ship, 1 at tail
        const dist = t * trailLength
        const alpha = 1 - t // bright at ship, transparent at tail

        posArr[j * 3] = trail.position.x + trailDir.x * dist
        posArr[j * 3 + 1] = trail.position.y + trailDir.y * dist
        posArr[j * 3 + 2] = trail.position.z + trailDir.z * dist

        // Color fades along trail
        colArr[j * 3] = trail.color.r * alpha
        colArr[j * 3 + 1] = trail.color.g * alpha
        colArr[j * 3 + 2] = trail.color.b * alpha
      }

      posAttr.needsUpdate = true
      colAttr.needsUpdate = true

      // Scale point size with speed
      if (mat) {
        mat.size = POINT_SIZE * (0.6 + 0.4 * speedRatio)
      }
    }
  })

  return <group ref={groupRef} />
}
