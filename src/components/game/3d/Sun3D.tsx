'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import * as THREE from 'three'

interface Sun3DProps {
  position?: [number, number, number]
  size?: number
  color?: string
  intensity?: number
  pulseSpeed?: number
  pulseIntensity?: number
}

export function Sun3D({
  position = [0, 0, 0],
  size = 3,
  color = '#ffaa00',
  intensity = 2,
  pulseSpeed = 2,
  pulseIntensity = 0.02,
}: Sun3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  // Pulsing animation for sun
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * pulseSpeed) * pulseIntensity
      meshRef.current.scale.setScalar(scale)
    }
    if (glowRef.current) {
      const glowScale = 1 + Math.sin(clock.elapsedTime * pulseSpeed * 0.5) * pulseIntensity * 2
      glowRef.current.scale.setScalar(glowScale)
    }
  })

  return (
    <group position={position}>
      {/* Sun core */}
      <Sphere ref={meshRef} args={[size, 32, 32]}>
        <meshBasicMaterial color={color} />
      </Sphere>

      {/* Sun glow effect */}
      <Sphere ref={glowRef} args={[size * 1.2, 32, 32]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Point light for illumination */}
      <pointLight color={color} intensity={intensity} distance={100} decay={2} />
    </group>
  )
}
