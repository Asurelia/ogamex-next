/**
 * SpaceBackground - Starfield + nebula background
 *
 * Reuses existing star rendering patterns with optimized settings for RT game.
 */

'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

export function SpaceBackground() {
  // Static distant starfield using points
  const starPositions = useMemo(() => {
    const positions = new Float32Array(10000 * 3)
    const colors = new Float32Array(10000 * 3)

    for (let i = 0; i < 10000; i++) {
      // Spherical distribution
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 300000 + Math.random() * 200000

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      // Random warm/cool star colors
      const temp = Math.random()
      if (temp < 0.3) {
        colors[i * 3] = 0.8 + Math.random() * 0.2
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.2
        colors[i * 3 + 2] = 0.3 + Math.random() * 0.2
      } else if (temp < 0.6) {
        colors[i * 3] = 0.9 + Math.random() * 0.1
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1
        colors[i * 3 + 2] = 0.8 + Math.random() * 0.2
      } else {
        colors[i * 3] = 0.5 + Math.random() * 0.3
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.3
        colors[i * 3 + 2] = 0.9 + Math.random() * 0.1
      }
    }

    return { positions, colors }
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={10000}
          array={starPositions.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={10000}
          array={starPositions.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={80}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
