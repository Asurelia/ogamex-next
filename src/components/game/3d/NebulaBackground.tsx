'use client'

/**
 * Volumetric Nebula Background Component
 *
 * R3F component for immersive space nebula backgrounds.
 */

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { VolumetricNebula, type NebulaConfig } from '@/lib/3d/volumetric-nebula'

export interface NebulaBackgroundProps {
  /** Nebula preset or custom config */
  preset?: 'purple' | 'fire' | 'cyan' | 'emerald' | 'custom'
  /** Custom configuration (used when preset is 'custom') */
  config?: NebulaConfig
  /** Animation speed multiplier */
  animationSpeed?: number
  /** Density of the nebula clouds */
  density?: number
}

/**
 * Volumetric nebula background for space scenes
 *
 * @example
 * ```tsx
 * <Canvas>
 *   <NebulaBackground preset="purple" density={0.5} />
 *   {/* Rest of your scene *\/}
 * </Canvas>
 * ```
 */
export function NebulaBackground({
  preset = 'purple',
  config,
  animationSpeed = 1.0,
  density = 0.5,
}: NebulaBackgroundProps) {
  const nebula = useMemo(() => {
    const presets: Record<string, NebulaConfig> = {
      purple: {
        primaryColor: new THREE.Color(0x2a0060),
        secondaryColor: new THREE.Color(0x8a2be2),
        density: 0.4,
        steps: 20,
      },
      fire: {
        primaryColor: new THREE.Color(0xff4500),
        secondaryColor: new THREE.Color(0xffd700),
        density: 0.6,
        steps: 24,
      },
      cyan: {
        primaryColor: new THREE.Color(0x006080),
        secondaryColor: new THREE.Color(0x00ffff),
        density: 0.35,
        steps: 16,
      },
      emerald: {
        primaryColor: new THREE.Color(0x006400),
        secondaryColor: new THREE.Color(0x7fff00),
        density: 0.45,
        steps: 18,
      },
    }

    const finalConfig = preset === 'custom' && config
      ? config
      : { ...presets[preset], density, animationSpeed }

    return new VolumetricNebula(finalConfig)
  }, [preset, config, density, animationSpeed])

  const { camera } = useThree()

  useFrame((_, delta) => {
    nebula.update(delta, camera)
  })

  return <primitive object={nebula} />
}

export default NebulaBackground
