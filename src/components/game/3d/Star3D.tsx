'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import * as THREE from 'three'
import type { StarTypeId } from '@/lib/galaxy/types'
import { STAR_TYPES } from '@/lib/galaxy/constants'

interface Star3DProps {
  starType: StarTypeId
  position?: [number, number, number]
  size?: number
  pulseSpeed?: number
  pulseIntensity?: number
}

/**
 * 3D Star component with type-specific visual effects
 */
export function Star3D({
  starType,
  position = [0, 0, 0],
  size = 3,
  pulseSpeed = 2,
  pulseIntensity = 0.02,
}: Star3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const coronaRef = useRef<THREE.Mesh>(null)

  const starConfig = STAR_TYPES[starType]

  // Calculate visual properties based on star type
  const visualConfig = useMemo(() => {
    const baseIntensity = Math.min(3, Math.max(0.5, Math.log10(starConfig.luminosity + 1) + 1))

    let actualSize = size
    let glowSize = 1.2
    let coronaSize = 1.5
    let hasCorona = true

    // Size adjustments based on star type
    if (starConfig.luminosity > 100) {
      actualSize *= 1.5 // Giants are larger
      glowSize = 1.3
      coronaSize = 1.8
    } else if (starConfig.luminosity < 0.1) {
      actualSize *= 0.6 // Dwarfs are smaller
      glowSize = 1.15
      hasCorona = false
    }

    // Binary stars: slight size increase
    if (starConfig.isBinary) {
      actualSize *= 1.1
    }

    return {
      color: starConfig.color,
      intensity: baseIntensity,
      size: actualSize,
      glowSize,
      coronaSize,
      hasCorona,
      isExotic: starConfig.isExotic,
    }
  }, [starConfig, size])

  // Animation
  useFrame(({ clock }) => {
    const time = clock.elapsedTime

    if (meshRef.current) {
      // Pulsing scale
      const pulse = 1 + Math.sin(time * pulseSpeed) * pulseIntensity
      meshRef.current.scale.setScalar(pulse)
    }

    if (glowRef.current) {
      // Slower glow pulse
      const glowPulse = 1 + Math.sin(time * pulseSpeed * 0.5) * pulseIntensity * 2
      glowRef.current.scale.setScalar(glowPulse)
    }

    if (coronaRef.current && visualConfig.hasCorona) {
      // Corona rotation
      coronaRef.current.rotation.z = time * 0.1
      const coronaPulse = 1 + Math.sin(time * pulseSpeed * 0.3) * pulseIntensity * 3
      coronaRef.current.scale.setScalar(coronaPulse)
    }
  })

  // Don't render visual for black holes (handled separately)
  if (starType === 'black_hole') {
    return null
  }

  return (
    <group position={position}>
      {/* Star core */}
      <Sphere ref={meshRef} args={[visualConfig.size, 32, 32]}>
        <meshBasicMaterial color={visualConfig.color} />
      </Sphere>

      {/* Inner glow */}
      <Sphere ref={glowRef} args={[visualConfig.size * visualConfig.glowSize, 32, 32]}>
        <meshBasicMaterial
          color={visualConfig.color}
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Corona effect for larger/hotter stars */}
      {visualConfig.hasCorona && (
        <Sphere ref={coronaRef} args={[visualConfig.size * visualConfig.coronaSize, 16, 16]}>
          <meshBasicMaterial
            color={visualConfig.color}
            transparent
            opacity={0.1}
            side={THREE.BackSide}
          />
        </Sphere>
      )}

      {/* Point light */}
      <pointLight
        color={visualConfig.color}
        intensity={visualConfig.intensity}
        distance={100}
        decay={2}
      />

      {/* Additional light for exotic stars */}
      {visualConfig.isExotic && (
        <pointLight
          color="#ffffff"
          intensity={visualConfig.intensity * 0.3}
          distance={50}
          decay={2}
        />
      )}
    </group>
  )
}

export default Star3D
