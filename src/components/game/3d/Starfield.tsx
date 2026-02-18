'use client'

/**
 * Simple Starfield Background Component
 *
 * Backward-compatible starfield using drei's Stars component.
 * For high-performance galaxy rendering, use StarField instead.
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'

export interface StarfieldProps {
  /** Number of stars (default: 5000) */
  count?: number
  /** Radius of the starfield sphere (default: 100) */
  radius?: number
  /** Depth of stars area (default: 50) */
  depth?: number
  /** Animation speed (default: 0.5) */
  speed?: number
  /** Rotation speed (default: 0.0001) */
  rotationSpeed?: number
  /** Star size factor (default: 4) */
  factor?: number
  /** Color saturation 0-1 (default: 0) */
  saturation?: number
  /** Enable faded edges (default: true) */
  fade?: boolean
}

/**
 * Simple starfield background using @react-three/drei Stars
 *
 * @example
 * ```tsx
 * <Canvas>
 *   <Starfield count={5000} radius={100} speed={0.5} />
 * </Canvas>
 * ```
 */
export function Starfield({
  count = 5000,
  radius = 100,
  depth = 50,
  speed = 0.5,
  rotationSpeed = 0.0001,
  factor = 4,
  saturation = 0,
  fade = true,
}: StarfieldProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current && rotationSpeed > 0) {
      groupRef.current.rotation.y += rotationSpeed * delta * 60
      groupRef.current.rotation.x += rotationSpeed * 0.5 * delta * 60
    }
  })

  return (
    <group ref={groupRef}>
      <Stars
        radius={radius}
        depth={depth}
        count={count}
        factor={factor}
        saturation={saturation}
        fade={fade}
        speed={speed}
      />
    </group>
  )
}

export default Starfield
