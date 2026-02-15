'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Star3D } from './Star3D'
import type { StarTypeId } from '@/lib/galaxy/types'
import { STAR_TYPES } from '@/lib/galaxy/constants'

interface BinaryStarSystemProps {
  primaryStarType: StarTypeId
  secondaryStarType?: StarTypeId
  position?: [number, number, number]
  size?: number
  orbitSpeed?: number
  orbitRadius?: number
}

/**
 * Binary star system with two stars orbiting each other
 */
export function BinaryStarSystem({
  primaryStarType,
  secondaryStarType,
  position = [0, 0, 0],
  size = 3,
  orbitSpeed = 0.5,
  orbitRadius = 5,
}: BinaryStarSystemProps) {
  const star1Ref = useRef<THREE.Group>(null)
  const star2Ref = useRef<THREE.Group>(null)

  const primaryConfig = STAR_TYPES[primaryStarType]
  const isBinaryType = primaryConfig.isBinary

  // If not binary type and no secondary specified, just render single star
  if (!isBinaryType && !secondaryStarType) {
    return (
      <group position={position}>
        <Star3D starType={primaryStarType} size={size} />
      </group>
    )
  }

  // Determine secondary star type
  let actualSecondary: StarTypeId = secondaryStarType || 'yellow_dwarf'

  // For binary type stars, derive component stars
  if (isBinaryType && !secondaryStarType) {
    switch (primaryStarType) {
      case 'binary_yellow':
        actualSecondary = 'yellow_dwarf'
        break
      case 'binary_red':
        actualSecondary = 'red_dwarf'
        break
      case 'binary_mixed':
        actualSecondary = 'orange_dwarf'
        break
      default:
        actualSecondary = 'yellow_dwarf'
    }
  }

  // Size ratio based on luminosity
  const primaryLuminosity = primaryConfig.luminosity
  const secondaryLuminosity = STAR_TYPES[actualSecondary].luminosity
  const sizeRatio = Math.min(1, Math.sqrt(secondaryLuminosity / Math.max(0.01, primaryLuminosity)))

  // Animation: stars orbit around common center of mass
  useFrame(({ clock }) => {
    const time = clock.elapsedTime * orbitSpeed

    // Barycentric orbit (heavier star moves less)
    const massRatio = sizeRatio
    const r1 = orbitRadius * massRatio / (1 + massRatio)
    const r2 = orbitRadius / (1 + massRatio)

    if (star1Ref.current) {
      star1Ref.current.position.x = Math.cos(time) * r1
      star1Ref.current.position.z = Math.sin(time) * r1
    }

    if (star2Ref.current) {
      star2Ref.current.position.x = -Math.cos(time) * r2
      star2Ref.current.position.z = -Math.sin(time) * r2
    }
  })

  // For binary type, render the component stars differently
  const primaryRenderType = isBinaryType
    ? (primaryStarType === 'binary_yellow'
        ? 'yellow_dwarf'
        : primaryStarType === 'binary_red'
        ? 'red_dwarf'
        : 'orange_dwarf')
    : primaryStarType

  return (
    <group position={position}>
      {/* Primary star */}
      <group ref={star1Ref}>
        <Star3D
          starType={primaryRenderType as StarTypeId}
          size={size}
          pulseSpeed={1.8}
        />
      </group>

      {/* Secondary star */}
      <group ref={star2Ref}>
        <Star3D
          starType={actualSecondary}
          size={size * Math.max(0.5, sizeRatio)}
          pulseSpeed={2.2}
        />
      </group>

      {/* Connection line (gravitational visualization) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[orbitRadius * 0.95, orbitRadius * 1.05, 64]} />
        <meshBasicMaterial
          color={primaryConfig.color}
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

export default BinaryStarSystem
