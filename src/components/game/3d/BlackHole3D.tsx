'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Ring } from '@react-three/drei'
import * as THREE from 'three'

interface BlackHole3DProps {
  position?: [number, number, number]
  size?: number
  accretionDiskSize?: number
  rotationSpeed?: number
}

/**
 * Black Hole 3D visualization with accretion disk and gravitational lensing effect
 */
export function BlackHole3D({
  position = [0, 0, 0],
  size = 3,
  accretionDiskSize = 8,
  rotationSpeed = 0.5,
}: BlackHole3DProps) {
  const eventHorizonRef = useRef<THREE.Mesh>(null)
  const accretionDiskRef = useRef<THREE.Mesh>(null)
  const outerGlowRef = useRef<THREE.Mesh>(null)
  const innerRingRef = useRef<THREE.Mesh>(null)

  // Create gradient texture for accretion disk
  const accretionTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 64

    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 512, 0)

    // Hot inner edge to cooler outer
    gradient.addColorStop(0, '#ff6600')
    gradient.addColorStop(0.2, '#ffaa00')
    gradient.addColorStop(0.4, '#ff4400')
    gradient.addColorStop(0.6, '#cc2200')
    gradient.addColorStop(0.8, '#880044')
    gradient.addColorStop(1, '#220022')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 64)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.repeat.set(4, 1)

    return texture
  }, [])

  // Animation
  useFrame(({ clock }) => {
    const time = clock.elapsedTime

    // Accretion disk rotation
    if (accretionDiskRef.current) {
      accretionDiskRef.current.rotation.z = time * rotationSpeed
      // Wobble effect
      accretionDiskRef.current.rotation.x = Math.PI / 2 + Math.sin(time * 0.2) * 0.05
    }

    // Inner ring faster rotation
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = time * rotationSpeed * 2
    }

    // Outer glow pulse
    if (outerGlowRef.current) {
      const pulse = 1 + Math.sin(time * 2) * 0.1
      outerGlowRef.current.scale.setScalar(pulse)
    }

    // Texture animation
    if (accretionTexture) {
      accretionTexture.offset.x = time * 0.1
    }
  })

  return (
    <group position={position}>
      {/* Event Horizon (pure black sphere) */}
      <Sphere ref={eventHorizonRef} args={[size, 32, 32]}>
        <meshBasicMaterial color="#000000" />
      </Sphere>

      {/* Photon sphere (slightly larger, dim glow) */}
      <Sphere args={[size * 1.1, 32, 32]}>
        <meshBasicMaterial
          color="#220033"
          transparent
          opacity={0.8}
        />
      </Sphere>

      {/* Gravitational lensing effect (distorted ring) */}
      <Sphere ref={outerGlowRef} args={[size * 1.5, 32, 32]}>
        <meshBasicMaterial
          color="#330044"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Accretion Disk */}
      <mesh ref={accretionDiskRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 1.2, accretionDiskSize, 128, 8]} />
        <meshBasicMaterial
          map={accretionTexture}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner hot ring */}
      <mesh ref={innerRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 1.05, size * 1.2, 64]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer edge glow */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[accretionDiskSize, accretionDiskSize * 1.1, 64]} />
        <meshBasicMaterial
          color="#440022"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Jets (optional - polar outflows) */}
      <group>
        {/* Top jet */}
        <mesh position={[0, size * 3, 0]}>
          <coneGeometry args={[size * 0.3, size * 4, 16]} />
          <meshBasicMaterial
            color="#6644ff"
            transparent
            opacity={0.3}
          />
        </mesh>

        {/* Bottom jet */}
        <mesh position={[0, -size * 3, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[size * 0.3, size * 4, 16]} />
          <meshBasicMaterial
            color="#6644ff"
            transparent
            opacity={0.3}
          />
        </mesh>
      </group>

      {/* Minimal ambient light (black holes don't emit light directly) */}
      <pointLight
        color="#ff4400"
        intensity={0.3}
        distance={50}
        decay={2}
      />
    </group>
  )
}

export default BlackHole3D
