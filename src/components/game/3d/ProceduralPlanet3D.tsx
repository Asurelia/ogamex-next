/**
 * ProceduralPlanet3D Component
 *
 * React Three Fiber component for rendering procedurally generated planets.
 * No textures required - 100% GPU shader-based generation.
 *
 * @example
 * ```tsx
 * <ProceduralPlanet3D
 *   type="water"
 *   seed={celestialBody.id}
 *   radius={1}
 *   hasAtmosphere
 *   cloudDensity={0.3}
 *   position={[0, 0, 0]}
 * />
 * ```
 */

'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
  createProceduralPlanet,
  mapLegacyType,
  ProceduralPlanet,
  type PlanetParams,
  type ProceduralPlanetType,
  seedFromId,
} from '@/lib/3d/procedural-planet'

export interface ProceduralPlanet3DProps {
  /** Planet type for visual style */
  type: ProceduralPlanetType | string
  /** Seed for deterministic generation (can be UUID) */
  seed: string | number
  /** Planet radius */
  radius?: number
  /** Position in 3D space */
  position?: [number, number, number]
  /** Rotation (Euler angles) */
  rotation?: [number, number, number]
  /** Enable atmospheric glow */
  hasAtmosphere?: boolean
  /** Custom atmosphere color */
  atmosphereColor?: string
  /** Cloud coverage (0-1) */
  cloudDensity?: number
  /** Enable ring system */
  ringSystem?: boolean
  /** Enable rotation animation */
  autoRotate?: boolean
  /** Rotation speed multiplier */
  rotationSpeed?: number
  /** onClick handler */
  onClick?: () => void
  /** onPointerOver handler */
  onPointerOver?: () => void
  /** onPointerOut handler */
  onPointerOut?: () => void
}

export function ProceduralPlanet3D({
  type,
  seed,
  radius = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  hasAtmosphere = false,
  atmosphereColor,
  cloudDensity = 0,
  ringSystem = false,
  autoRotate = true,
  rotationSpeed = 0.1,
  onClick,
  onPointerOver,
  onPointerOut,
}: ProceduralPlanet3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const planetRef = useRef<ProceduralPlanet | null>(null)

  // Convert seed to number if string (UUID)
  const numericSeed = useMemo(() => {
    if (typeof seed === 'number') return seed
    return seedFromId(seed)
  }, [seed])

  // Map legacy types
  const planetType = useMemo(() => {
    if (['rocky', 'desert', 'ice', 'water', 'jungle', 'gas_giant', 'lava'].includes(type)) {
      return type as ProceduralPlanetType
    }
    return mapLegacyType(type)
  }, [type])

  // Create planet params
  const params = useMemo<PlanetParams>(() => ({
    type: planetType,
    seed: numericSeed,
    radius,
    hasAtmosphere,
    atmosphereColor: atmosphereColor ? new THREE.Color(atmosphereColor) : undefined,
    cloudDensity,
    ringSystem,
  }), [planetType, numericSeed, radius, hasAtmosphere, atmosphereColor, cloudDensity, ringSystem])

  // Create procedural planet
  useMemo(() => {
    if (planetRef.current) {
      planetRef.current.dispose()
    }
    planetRef.current = createProceduralPlanet(params)

    if (groupRef.current) {
      // Clear existing children
      while (groupRef.current.children.length > 0) {
        groupRef.current.remove(groupRef.current.children[0])
      }
      groupRef.current.add(planetRef.current)
    }

    return () => {
      planetRef.current?.dispose()
    }
  }, [params])

  // Animation loop
  useFrame((_, delta) => {
    // Update shader time
    planetRef.current?.update(delta)

    // Auto rotation
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed
    }
  })

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    />
  )
}

// ============================================================================
// PRESETS FOR COMMON PLANET CONFIGURATIONS
// ============================================================================

export const PLANET_PRESETS = {
  earthLike: {
    type: 'water' as ProceduralPlanetType,
    hasAtmosphere: true,
    cloudDensity: 0.4,
  },
  mars: {
    type: 'desert' as ProceduralPlanetType,
    hasAtmosphere: true,
    atmosphereColor: '#ffccaa',
    cloudDensity: 0.1,
  },
  jupiter: {
    type: 'gas_giant' as ProceduralPlanetType,
    hasAtmosphere: false,
  },
  saturn: {
    type: 'gas_giant' as ProceduralPlanetType,
    hasAtmosphere: false,
    ringSystem: true,
  },
  europa: {
    type: 'ice' as ProceduralPlanetType,
    hasAtmosphere: false,
  },
  venus: {
    type: 'lava' as ProceduralPlanetType,
    hasAtmosphere: true,
    atmosphereColor: '#ffaa44',
    cloudDensity: 0.8,
  },
  moon: {
    type: 'rocky' as ProceduralPlanetType,
    hasAtmosphere: false,
  },
  jungle: {
    type: 'jungle' as ProceduralPlanetType,
    hasAtmosphere: true,
    cloudDensity: 0.2,
  },
} as const

/**
 * Preset-based planet component
 */
export function PresetPlanet({
  preset,
  seed,
  radius = 1,
  position,
  ...props
}: {
  preset: keyof typeof PLANET_PRESETS
  seed: string | number
  radius?: number
  position?: [number, number, number]
} & Partial<ProceduralPlanet3DProps>) {
  const presetConfig = PLANET_PRESETS[preset]

  return (
    <ProceduralPlanet3D
      {...presetConfig}
      seed={seed}
      radius={radius}
      position={position}
      {...props}
    />
  )
}

export default ProceduralPlanet3D
