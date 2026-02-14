'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import type { Points } from 'three'

interface StarfieldProps {
  count?: number
  radius?: number
  depth?: number
  factor?: number
  saturation?: number
  speed?: number
  rotationSpeed?: number
}

export function Starfield({
  count = 5000,
  radius = 200,
  depth = 100,
  factor = 4,
  saturation = 0.5,
  speed = 0.5,
  rotationSpeed = 0.0001,
}: StarfieldProps) {
  const starsRef = useRef<Points>(null)

  // Slow rotation animation for immersive effect
  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += rotationSpeed
    }
  })

  return (
    <Stars
      ref={starsRef}
      radius={radius}
      depth={depth}
      count={count}
      factor={factor}
      saturation={saturation}
      fade
      speed={speed}
    />
  )
}
