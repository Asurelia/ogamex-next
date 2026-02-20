'use client'

/**
 * WeaponFireVFX - Renders laser beams between attacking ships and their targets.
 * Uses TubeGeometry for beam thickness with faction-colored pulsing opacity.
 */

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRTGameStore } from '@/stores/rtGameStore'
import * as THREE from 'three'

// ============================================================================
// CONSTANTS
// ============================================================================

const SHIP_STATE_ATTACKING = 5
const MAX_BEAMS = 20
const PULSE_SPEED = 6 // radians per second
const BEAM_RADIUS = 8
const BEAM_SEGMENTS = 6

const FACTION_COLORS: Record<string, string> = {
  caldari: '#60A5FA',
  amarr: '#FCD34D',
  minmatar: '#EF4444',
  gallente: '#34D399',
}
const DEFAULT_COLOR = '#60A5FA'

// ============================================================================
// TYPES
// ============================================================================

interface BeamData {
  attackerId: string
  targetId: string
  start: THREE.Vector3
  end: THREE.Vector3
  color: THREE.Color
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WeaponFireVFX() {
  const groupRef = useRef<THREE.Group>(null)
  const meshesRef = useRef<THREE.Mesh[]>([])
  const materialsRef = useRef<THREE.MeshBasicMaterial[]>([])
  const timeRef = useRef(0)
  const { camera } = useThree()

  const frustum = useMemo(() => new THREE.Frustum(), [])
  const projMatrix = useMemo(() => new THREE.Matrix4(), [])
  const tmpVec = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const ships = useRTGameStore.getState().ships
    const group = groupRef.current
    if (!group) return

    timeRef.current += delta

    // Build frustum from camera
    projMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(projMatrix)

    // Collect active beams
    const beams: BeamData[] = []
    for (const [, ship] of ships) {
      if (beams.length >= MAX_BEAMS) break
      if (ship.state !== SHIP_STATE_ATTACKING || !ship.targetId) continue

      const target = ships.get(ship.targetId)
      if (!target) continue

      const start = new THREE.Vector3(ship.x, ship.y, ship.z)
      const end = new THREE.Vector3(target.x, target.y, target.z)

      // Frustum cull: check if either endpoint is visible
      if (!frustum.containsPoint(start) && !frustum.containsPoint(end)) continue

      const hex = FACTION_COLORS[ship.faction] || DEFAULT_COLOR
      beams.push({
        attackerId: ship.id,
        targetId: ship.targetId,
        start,
        end,
        color: new THREE.Color(hex),
      })
    }

    // Remove excess meshes
    while (meshesRef.current.length > beams.length) {
      const mesh = meshesRef.current.pop()!
      const mat = materialsRef.current.pop()!
      mesh.geometry.dispose()
      mat.dispose()
      group.remove(mesh)
    }

    // Update or create meshes
    for (let i = 0; i < beams.length; i++) {
      const beam = beams[i]
      const dir = tmpVec.copy(beam.end).sub(beam.start)
      const length = dir.length()
      if (length < 1) continue

      // Per-beam phase offset from attackerId hash
      const phase = (beam.attackerId.charCodeAt(0) || 0) * 0.7

      // Pulsing opacity: 0.3 to 1.0
      const pulse = 0.65 + 0.35 * Math.sin(timeRef.current * PULSE_SPEED + phase)

      if (i < meshesRef.current.length) {
        // Reuse existing mesh - rebuild geometry
        const mesh = meshesRef.current[i]
        const mat = materialsRef.current[i]

        mesh.geometry.dispose()
        const path = new THREE.LineCurve3(beam.start, beam.end)
        mesh.geometry = new THREE.TubeGeometry(path, 1, BEAM_RADIUS, BEAM_SEGMENTS, false)

        mat.color.copy(beam.color)
        mat.opacity = pulse
      } else {
        // Create new mesh
        const path = new THREE.LineCurve3(beam.start, beam.end)
        const geo = new THREE.TubeGeometry(path, 1, BEAM_RADIUS, BEAM_SEGMENTS, false)
        const mat = new THREE.MeshBasicMaterial({
          color: beam.color,
          transparent: true,
          opacity: pulse,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
        const mesh = new THREE.Mesh(geo, mat)
        group.add(mesh)
        meshesRef.current.push(mesh)
        materialsRef.current.push(mat)
      }
    }
  })

  return <group ref={groupRef} />
}
