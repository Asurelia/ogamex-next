/**
 * AsteroidField - InstancedMesh for asteroids
 *
 * Renders asteroids from the rtGameStore with ore-type-based coloring.
 */

'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRTGameStore } from '@/stores/rtGameStore'
import { ORE_COLORS } from '@shared/types/ship-types'

const tempMatrix = new THREE.Matrix4()
const tempColor = new THREE.Color()

export function AsteroidField() {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const asteroids = useRTGameStore((s) => s.asteroids)
  const selectedTargetId = useRTGameStore((s) => s.selectedTargetId)

  const geometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(1, 1) // Low-poly rock look
  }, [])

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      roughness: 0.9,
      metalness: 0.3,
    })
  }, [])

  useFrame(() => {
    if (!meshRef.current) return

    let index = 0

    // Iterate map directly instead of creating a new Array each frame
    asteroids.forEach((asteroid) => {
      if (index >= meshRef.current!.count) return

      const scale = asteroid.radius
      tempMatrix.makeScale(scale, scale * 0.7, scale) // Slightly flattened
      tempMatrix.setPosition(asteroid.x, asteroid.y, asteroid.z)
      meshRef.current!.setMatrixAt(index, tempMatrix)

      // Color by ore type, highlight if selected
      const isSelected = asteroid.id === selectedTargetId
      const baseColor = ORE_COLORS[asteroid.oreType as keyof typeof ORE_COLORS] || '#888888'

      if (isSelected) {
        tempColor.set('#ffffff') // White highlight
      } else {
        tempColor.set(baseColor)
      }

      meshRef.current!.setColorAt(index, tempColor)
      index++
    })

    meshRef.current.count = index
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, 200]}
      frustumCulled={false}
    />
  )
}
