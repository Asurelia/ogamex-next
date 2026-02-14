'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

interface OrbitRingProps {
  radius: number
  color?: string
  opacity?: number
  thickness?: number
  segments?: number
  dashed?: boolean
  dashSize?: number
  gapSize?: number
}

export function OrbitRing({
  radius,
  color = '#333366',
  opacity = 0.3,
  thickness = 0.05,
  segments = 128,
  dashed = false,
  dashSize = 0.5,
  gapSize = 0.25,
}: OrbitRingProps) {
  const lineGeometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius))
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [radius, segments])

  const lineObject = useMemo(() => {
    const material = new THREE.LineDashedMaterial({
      color,
      transparent: true,
      opacity,
      dashSize,
      gapSize,
    })
    const line = new THREE.Line(lineGeometry, material)
    line.computeLineDistances()
    return line
  }, [lineGeometry, color, opacity, dashSize, gapSize])

  if (dashed) {
    return <primitive object={lineObject} />
  }

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - thickness, radius + thickness, segments]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
