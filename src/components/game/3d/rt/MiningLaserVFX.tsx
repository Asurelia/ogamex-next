'use client'

/**
 * MiningLaserVFX - Renders teal mining beams from ships to asteroids.
 * Includes pulsing width/brightness and contact-point sparkle particles.
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRTGameStore } from '@/stores/rtGameStore'
import * as THREE from 'three'

// ============================================================================
// CONSTANTS
// ============================================================================

const SHIP_STATE_MINING = 6
const MAX_BEAMS = 20
const BEAM_COLOR = new THREE.Color('#2DD4BF')
const PULSE_PERIOD = 1.0 // seconds
const BASE_RADIUS = 6
const PULSE_AMPLITUDE = 4
const SPARK_COUNT = 12
const SPARK_SPREAD = 60
const SPARK_SIZE = 8

// ============================================================================
// TYPES
// ============================================================================

interface MiningBeam {
  shipId: string
  start: THREE.Vector3
  end: THREE.Vector3
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MiningLaserVFX() {
  const groupRef = useRef<THREE.Group>(null)
  const beamMeshesRef = useRef<THREE.Mesh[]>([])
  const beamMatsRef = useRef<THREE.MeshBasicMaterial[]>([])
  const sparkMeshesRef = useRef<THREE.Points[]>([])
  const sparkMatsRef = useRef<THREE.PointsMaterial[]>([])
  const timeRef = useRef(0)

  useFrame((_, delta) => {
    const { ships, asteroids } = useRTGameStore.getState()
    const group = groupRef.current
    if (!group) return

    timeRef.current += delta
    const pulseT = timeRef.current / PULSE_PERIOD
    const pulseFactor = 0.5 + 0.5 * Math.sin(pulseT * Math.PI * 2)

    // Collect active mining beams
    const beams: MiningBeam[] = []
    for (const [, ship] of ships) {
      if (beams.length >= MAX_BEAMS) break
      if (ship.state !== SHIP_STATE_MINING || !ship.targetId) continue

      const asteroid = asteroids.get(ship.targetId)
      if (!asteroid) continue

      beams.push({
        shipId: ship.id,
        start: new THREE.Vector3(ship.x, ship.y, ship.z),
        end: new THREE.Vector3(asteroid.x, asteroid.y, asteroid.z),
      })
    }

    // Remove excess beam meshes
    while (beamMeshesRef.current.length > beams.length) {
      const mesh = beamMeshesRef.current.pop()!
      const mat = beamMatsRef.current.pop()!
      mesh.geometry.dispose()
      mat.dispose()
      group.remove(mesh)

      const sparks = sparkMeshesRef.current.pop()!
      const sparkMat = sparkMatsRef.current.pop()!
      sparks.geometry.dispose()
      sparkMat.dispose()
      group.remove(sparks)
    }

    const currentRadius = BASE_RADIUS + PULSE_AMPLITUDE * pulseFactor
    const currentOpacity = 0.5 + 0.5 * pulseFactor

    for (let i = 0; i < beams.length; i++) {
      const beam = beams[i]
      const dir = beam.end.clone().sub(beam.start)
      if (dir.length() < 1) continue

      if (i < beamMeshesRef.current.length) {
        // Update existing beam
        const mesh = beamMeshesRef.current[i]
        const mat = beamMatsRef.current[i]
        mesh.geometry.dispose()
        const path = new THREE.LineCurve3(beam.start, beam.end)
        mesh.geometry = new THREE.TubeGeometry(path, 1, currentRadius, 6, false)
        mat.opacity = currentOpacity
      } else {
        // Create new beam
        const path = new THREE.LineCurve3(beam.start, beam.end)
        const geo = new THREE.TubeGeometry(path, 1, currentRadius, 6, false)
        const mat = new THREE.MeshBasicMaterial({
          color: BEAM_COLOR,
          transparent: true,
          opacity: currentOpacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
        const mesh = new THREE.Mesh(geo, mat)
        group.add(mesh)
        beamMeshesRef.current.push(mesh)
        beamMatsRef.current.push(mat)

        // Create sparkle points at contact
        const sparkPositions = new Float32Array(SPARK_COUNT * 3)
        const sparkGeo = new THREE.BufferGeometry()
        sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3))
        const sparkMat = new THREE.PointsMaterial({
          color: BEAM_COLOR,
          size: SPARK_SIZE,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
        const sparks = new THREE.Points(sparkGeo, sparkMat)
        group.add(sparks)
        sparkMeshesRef.current.push(sparks)
        sparkMatsRef.current.push(sparkMat)
      }

      // Update spark positions around asteroid contact point
      if (i < sparkMeshesRef.current.length) {
        const sparks = sparkMeshesRef.current[i]
        const sparkMat = sparkMatsRef.current[i]
        const posAttr = sparks.geometry.getAttribute('position') as THREE.BufferAttribute
        const arr = posAttr.array as Float32Array

        for (let j = 0; j < SPARK_COUNT; j++) {
          const angle = timeRef.current * 3 + j * (Math.PI * 2 / SPARK_COUNT)
          const r = SPARK_SPREAD * (0.3 + 0.7 * Math.abs(Math.sin(angle + timeRef.current * 5)))
          arr[j * 3] = beam.end.x + Math.cos(angle) * r
          arr[j * 3 + 1] = beam.end.y + Math.sin(angle * 0.7 + timeRef.current) * r * 0.5
          arr[j * 3 + 2] = beam.end.z + Math.sin(angle) * r
        }
        posAttr.needsUpdate = true
        sparkMat.opacity = 0.4 + 0.4 * pulseFactor
      }
    }
  })

  return <group ref={groupRef} />
}
