'use client'

/**
 * TexturedPlanet3D Component
 *
 * React Three Fiber component for rendering planets with PBR textures.
 * Uses color map, normal map, and roughness map for realistic rendering.
 */

import { useRef, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'

export interface TexturedPlanet3DProps {
  /** Path to color/diffuse texture */
  colorMap?: string
  /** Path to normal map texture */
  normalMap?: string
  /** Path to roughness map texture */
  roughnessMap?: string
  /** Planet radius */
  radius?: number
  /** Position in 3D space */
  position?: [number, number, number]
  /** Normal map intensity (default 1.0) */
  normalScale?: number
  /** Roughness multiplier (default 1.0) */
  roughness?: number
  /** Metalness value (default 0.0) */
  metalness?: number
  /** Enable rotation animation */
  autoRotate?: boolean
  /** Rotation speed */
  rotationSpeed?: number
  /** Atmosphere color */
  atmosphereColor?: string
  /** Atmosphere opacity */
  atmosphereOpacity?: number
  /** Show atmosphere glow */
  hasAtmosphere?: boolean
  /** Is planet selected */
  selected?: boolean
  /** onClick handler */
  onClick?: () => void
  /** onPointerOver handler */
  onPointerOver?: () => void
  /** onPointerOut handler */
  onPointerOut?: () => void
}

// Fallback planet when textures are loading
function FallbackPlanet({ radius }: { radius: number }) {
  return (
    <Sphere args={[radius, 32, 32]}>
      <meshStandardMaterial color="#665544" roughness={0.8} metalness={0.1} />
    </Sphere>
  )
}

// Inner component that loads and applies textures
function TexturedSphere({
  colorMap,
  normalMap,
  roughnessMap,
  radius,
  normalScale,
  roughness,
  metalness,
  rotationSpeed,
  autoRotate,
}: {
  colorMap?: string
  normalMap?: string
  roughnessMap?: string
  radius: number
  normalScale: number
  roughness: number
  metalness: number
  rotationSpeed: number
  autoRotate: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Build texture paths array (only include defined textures)
  const texturePaths: string[] = []
  if (colorMap) texturePaths.push(colorMap)
  if (normalMap) texturePaths.push(normalMap)
  if (roughnessMap) texturePaths.push(roughnessMap)

  // Load textures conditionally
  const textures = useTexture(
    texturePaths.length > 0 ? texturePaths : ['/textures/planets/default_color.png']
  )

  // Map textures back to their types
  let colorTexture: THREE.Texture | undefined
  let normalTexture: THREE.Texture | undefined
  let roughnessTexture: THREE.Texture | undefined

  let textureIndex = 0
  const textureArray = Array.isArray(textures) ? textures : [textures]

  if (colorMap && textureArray[textureIndex]) {
    colorTexture = textureArray[textureIndex]
    textureIndex++
  }
  if (normalMap && textureArray[textureIndex]) {
    normalTexture = textureArray[textureIndex]
    textureIndex++
  }
  if (roughnessMap && textureArray[textureIndex]) {
    roughnessTexture = textureArray[textureIndex]
  }

  // Rotation animation
  useFrame((_, delta) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += delta * rotationSpeed
    }
  })

  return (
    <Sphere ref={meshRef} args={[radius, 64, 64]}>
      <meshStandardMaterial
        map={colorTexture}
        normalMap={normalTexture}
        normalScale={new THREE.Vector2(normalScale, normalScale)}
        roughnessMap={roughnessTexture}
        roughness={roughness}
        metalness={metalness}
      />
    </Sphere>
  )
}

export function TexturedPlanet3D({
  colorMap = '/textures/planets/planet_color.png',
  normalMap = '/textures/planets/planet_normal.png',
  roughnessMap = '/textures/planets/planet_roughness.png',
  radius = 1,
  position = [0, 0, 0],
  normalScale = 1.0,
  roughness = 1.0,
  metalness = 0.0,
  autoRotate = true,
  rotationSpeed = 0.1,
  atmosphereColor = '#88ccff',
  atmosphereOpacity = 0.15,
  hasAtmosphere = true,
  selected = false,
  onClick,
  onPointerOver,
  onPointerOut,
}: TexturedPlanet3DProps) {
  const selectionRingRef = useRef<THREE.Mesh>(null)

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

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    document.body.style.cursor = 'pointer'
    onPointerOver?.()
  }

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    document.body.style.cursor = 'auto'
    onPointerOut?.()
  }

  return (
    <group
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Planet sphere with PBR textures */}
      <Suspense fallback={<FallbackPlanet radius={radius} />}>
        <TexturedSphere
          colorMap={colorMap}
          normalMap={normalMap}
          roughnessMap={roughnessMap}
          radius={radius}
          normalScale={normalScale}
          roughness={roughness}
          metalness={metalness}
          rotationSpeed={rotationSpeed}
          autoRotate={autoRotate}
        />
      </Suspense>

      {/* Atmosphere glow effect */}
      {hasAtmosphere && (
        <Sphere args={[radius * 1.08, 32, 32]}>
          <meshBasicMaterial
            color={atmosphereColor}
            transparent
            opacity={atmosphereOpacity}
            side={THREE.BackSide}
          />
        </Sphere>
      )}

      {/* Selection ring with pulsing effect */}
      {selected && (
        <mesh ref={selectionRingRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 1.25, radius * 1.35, 64]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Secondary selection glow */}
      {selected && (
        <Sphere args={[radius * 1.2, 16, 16]}>
          <meshBasicMaterial color="#00ff88" transparent opacity={0.1} side={THREE.BackSide} />
        </Sphere>
      )}
    </group>
  )
}

export default TexturedPlanet3D
