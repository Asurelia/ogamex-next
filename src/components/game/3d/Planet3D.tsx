'use client'

import { useRef, useMemo, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { ATMOSPHERE_COLORS, type PlanetType } from '@/lib/3d/constants'

export type { PlanetType } from '@/lib/3d/constants'

interface Planet3DProps {
  type: PlanetType
  variant?: number
  size?: number
  position?: [number, number, number]
  rotationSpeed?: number
  onClick?: () => void
  selected?: boolean
  atmosphereColor?: string
  atmosphereOpacity?: number
  isMoon?: boolean
}

// Fallback planet without texture (uses procedural material)
function FallbackPlanet({
  size,
  type,
  rotationSpeed,
}: {
  size: number
  type: PlanetType
  rotationSpeed: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed
    }
  })

  // Use atmosphere color as fallback surface color
  const color = useMemo(() => ATMOSPHERE_COLORS[type], [type])

  return (
    <Sphere ref={meshRef} args={[size, 32, 32]}>
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.1} />
    </Sphere>
  )
}

// Textured planet component
function TexturedPlanet({
  type,
  variant,
  size,
  rotationSpeed,
}: {
  type: PlanetType
  variant: number
  size: number
  rotationSpeed: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Clamp variant between 1 and 10
  const safeVariant = Math.max(1, Math.min(10, variant))

  // Load planet texture (use .png extension)
  const texture = useTexture(`/img/planets/medium/${type}_${safeVariant}.png`)

  // Rotation animation
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed
    }
  })

  return (
    <Sphere ref={meshRef} args={[size, 64, 64]}>
      <meshStandardMaterial map={texture} roughness={0.7} metalness={0.1} />
    </Sphere>
  )
}

export function Planet3D({
  type,
  variant = 1,
  size = 1,
  position = [0, 0, 0],
  rotationSpeed = 0.002,
  onClick,
  selected = false,
  atmosphereColor,
  atmosphereOpacity = 0.15,
  isMoon = false,
}: Planet3DProps) {
  const selectionRingRef = useRef<THREE.Mesh>(null)

  // Use type-based atmosphere color if not provided
  const finalAtmosphereColor = atmosphereColor || ATMOSPHERE_COLORS[type]

  // Moon size adjustment
  const finalSize = isMoon ? size * 0.4 : size

  // Selection ring pulsing animation
  useFrame(({ clock }) => {
    if (selectionRingRef.current && selected) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.05
      selectionRingRef.current.scale.setScalar(pulse)
    }
  })

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onClick?.()
  }

  const handlePointerOver = () => {
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto'
  }

  return (
    <group
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Planet sphere with texture (or fallback) */}
      <Suspense fallback={<FallbackPlanet size={finalSize} type={type} rotationSpeed={rotationSpeed} />}>
        <TexturedPlanet type={type} variant={variant} size={finalSize} rotationSpeed={rotationSpeed} />
      </Suspense>

      {/* Atmosphere glow effect */}
      {!isMoon && (
        <Sphere args={[finalSize * 1.12, 32, 32]}>
          <meshBasicMaterial
            color={finalAtmosphereColor}
            transparent
            opacity={atmosphereOpacity}
            side={THREE.BackSide}
          />
        </Sphere>
      )}

      {/* Selection ring with pulsing effect */}
      {selected && (
        <mesh ref={selectionRingRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[finalSize * 1.25, finalSize * 1.35, 64]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Secondary selection glow */}
      {selected && (
        <Sphere args={[finalSize * 1.2, 16, 16]}>
          <meshBasicMaterial color="#00ff88" transparent opacity={0.1} side={THREE.BackSide} />
        </Sphere>
      )}
    </group>
  )
}
