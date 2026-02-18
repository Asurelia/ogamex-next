'use client'

/**
 * BlackHole3D Component
 *
 * Advanced black hole visualization with:
 * - GPU-accelerated accretion disk with procedural noise
 * - Gravitational lensing distortion effect
 * - Animated hot gas flow
 * - Optional relativistic jets
 *
 * Shader techniques based on black-hole-main asset
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import * as THREE from 'three'
import {
  accretionDiskVertexShader,
  accretionDiskFragmentShader,
} from '@/lib/3d/black-hole-shader'

// ============================================================================
// TYPES
// ============================================================================

export interface BlackHole3DProps {
  /** Position in 3D space */
  position?: [number, number, number]
  /** Event horizon size */
  size?: number
  /** Outer edge of accretion disk */
  accretionDiskSize?: number
  /** Rotation speed multiplier */
  rotationSpeed?: number
  /** Enable relativistic jets */
  showJets?: boolean
  /** Accretion disk color gradient (inner to outer) */
  discColors?: string[]
  /** Enable simple mode (no shaders, better compatibility) */
  simpleMode?: boolean
  /** Intensity of the glow */
  glowIntensity?: number
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Black Hole 3D visualization with accretion disk and gravitational lensing effect
 */
export function BlackHole3D({
  position = [0, 0, 0],
  size = 3,
  accretionDiskSize = 8,
  rotationSpeed = 0.5,
  showJets = true,
  discColors = ['#fffbf9', '#ffbc68', '#ff5600', '#ff0053', '#cc00ff'],
  simpleMode = false,
  glowIntensity = 1.0,
}: BlackHole3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const accretionDiskRef = useRef<THREE.Mesh>(null)
  const outerGlowRef = useRef<THREE.Mesh>(null)
  const innerRingRef = useRef<THREE.Mesh>(null)
  const shaderMaterialRef = useRef<THREE.ShaderMaterial | null>(null)

  // Create gradient texture for accretion disk
  const gradientTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 128

    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)

    discColors.forEach((color, i) => {
      gradient.addColorStop(i / (discColors.length - 1), color)
    })

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const texture = new THREE.CanvasTexture(canvas)
    return texture
  }, [discColors])

  // Create noise texture for shader
  const noisesTexture = useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    const imageData = ctx.createImageData(size, size)
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = Math.random() * 255
      imageData.data[i + 1] = Math.random() * 255
      imageData.data[i + 2] = Math.random() * 255
      imageData.data[i + 3] = Math.random() * 255
    }
    ctx.putImageData(imageData, 0, 0)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }, [])

  // Create shader material
  const shaderMaterial = useMemo(() => {
    if (simpleMode) return null

    const material = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: accretionDiskVertexShader,
      fragmentShader: accretionDiskFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uGradientTexture: { value: gradientTexture },
        uNoisesTexture: { value: noisesTexture },
      },
    })
    shaderMaterialRef.current = material
    return material
  }, [simpleMode, gradientTexture, noisesTexture])

  // Simple mode texture animation
  const simpleTexture = useMemo(() => {
    if (!simpleMode) return null

    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 64

    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 512, 0)

    discColors.forEach((color, i) => {
      gradient.addColorStop(i / (discColors.length - 1), color)
    })

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 64)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.repeat.set(4, 1)

    return texture
  }, [simpleMode, discColors])

  // Animation
  useFrame(({ clock }) => {
    const time = clock.elapsedTime

    // Update shader time uniform
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uTime.value = time
    }

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
      const pulse = 1 + Math.sin(time * 2) * 0.1 * glowIntensity
      outerGlowRef.current.scale.setScalar(pulse)
    }

    // Simple mode texture animation
    if (simpleTexture) {
      simpleTexture.offset.x = time * 0.1
    }
  })

  // Cleanup
  useEffect(() => {
    return () => {
      gradientTexture.dispose()
      noisesTexture.dispose()
      simpleTexture?.dispose()
      shaderMaterial?.dispose()
    }
  }, [gradientTexture, noisesTexture, simpleTexture, shaderMaterial])

  return (
    <group ref={groupRef} position={position}>
      {/* Event Horizon (pure black sphere) */}
      <Sphere args={[size, 32, 32]}>
        <meshBasicMaterial color="#000000" />
      </Sphere>

      {/* Photon sphere (slightly larger, dim glow) */}
      <Sphere args={[size * 1.1, 32, 32]}>
        <meshBasicMaterial
          color="#220033"
          transparent
          opacity={0.8 * glowIntensity}
        />
      </Sphere>

      {/* Gravitational lensing effect (distorted ring) */}
      <Sphere ref={outerGlowRef} args={[size * 1.5, 32, 32]}>
        <meshBasicMaterial
          color="#330044"
          transparent
          opacity={0.3 * glowIntensity}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Accretion Disk - Shader or Simple mode */}
      {simpleMode ? (
        // Simple mode: Basic ring with animated texture
        <mesh ref={accretionDiskRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.2, accretionDiskSize, 128, 8]} />
          <meshBasicMaterial
            map={simpleTexture}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : (
        // Advanced mode: Shader-based cylinder for better lighting
        <mesh ref={accretionDiskRef} material={shaderMaterial!}>
          <cylinderGeometry args={[size * 1.2, accretionDiskSize, 0, 64, 8, true]} />
        </mesh>
      )}

      {/* Inner hot ring */}
      <mesh ref={innerRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 1.05, size * 1.2, 64]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={0.7 * glowIntensity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer edge glow */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[accretionDiskSize, accretionDiskSize * 1.1, 64]} />
        <meshBasicMaterial
          color="#440022"
          transparent
          opacity={0.3 * glowIntensity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Jets (optional - polar outflows) */}
      {showJets && (
        <group>
          {/* Top jet */}
          <mesh position={[0, size * 3, 0]}>
            <coneGeometry args={[size * 0.3, size * 4, 16]} />
            <meshBasicMaterial
              color="#6644ff"
              transparent
              opacity={0.3 * glowIntensity}
            />
          </mesh>

          {/* Bottom jet */}
          <mesh position={[0, -size * 3, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[size * 0.3, size * 4, 16]} />
            <meshBasicMaterial
              color="#6644ff"
              transparent
              opacity={0.3 * glowIntensity}
            />
          </mesh>
        </group>
      )}

      {/* Minimal ambient light (black holes don't emit light directly) */}
      <pointLight
        color="#ff4400"
        intensity={0.3 * glowIntensity}
        distance={50}
        decay={2}
      />
    </group>
  )
}

export default BlackHole3D
