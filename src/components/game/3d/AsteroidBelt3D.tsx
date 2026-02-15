'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface AsteroidBelt3DProps {
  position?: [number, number, number]
  innerRadius?: number
  outerRadius?: number
  asteroidCount?: number
  rotationSpeed?: number
  color?: string
}

/**
 * Asteroid Belt 3D visualization using instanced rendering
 */
export function AsteroidBelt3D({
  position = [0, 0, 0],
  innerRadius = 15,
  outerRadius = 20,
  asteroidCount = 500,
  rotationSpeed = 0.01,
  color = '#888888',
}: AsteroidBelt3DProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Generate asteroid transforms
  const { matrices, rotations, orbitSpeeds } = useMemo(() => {
    const matrices: THREE.Matrix4[] = []
    const rotations: THREE.Euler[] = []
    const orbitSpeeds: number[] = []

    const tempMatrix = new THREE.Matrix4()
    const tempPosition = new THREE.Vector3()
    const tempQuaternion = new THREE.Quaternion()
    const tempScale = new THREE.Vector3()

    for (let i = 0; i < asteroidCount; i++) {
      // Random position in belt
      const angle = Math.random() * Math.PI * 2
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius)
      const height = (Math.random() - 0.5) * 2 // Slight vertical distribution

      tempPosition.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      )

      // Random rotation
      const rotation = new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      )
      tempQuaternion.setFromEuler(rotation)
      rotations.push(rotation.clone())

      // Random scale (asteroids vary in size)
      const scale = 0.1 + Math.random() * 0.3
      tempScale.set(scale, scale * (0.5 + Math.random() * 0.5), scale)

      tempMatrix.compose(tempPosition, tempQuaternion, tempScale)
      matrices.push(tempMatrix.clone())

      // Orbit speed (outer asteroids move slower - Kepler's law)
      orbitSpeeds.push(rotationSpeed / Math.sqrt(radius / innerRadius))
    }

    return { matrices, rotations, orbitSpeeds }
  }, [asteroidCount, innerRadius, outerRadius, rotationSpeed])

  // Set initial transforms
  useMemo(() => {
    if (meshRef.current) {
      matrices.forEach((matrix, i) => {
        meshRef.current!.setMatrixAt(i, matrix)
      })
      meshRef.current.instanceMatrix.needsUpdate = true
    }
  }, [matrices])

  // Animation
  useFrame(({ clock }) => {
    if (!meshRef.current) return

    const time = clock.elapsedTime
    const tempMatrix = new THREE.Matrix4()
    const tempPosition = new THREE.Vector3()
    const tempQuaternion = new THREE.Quaternion()
    const tempScale = new THREE.Vector3()

    for (let i = 0; i < asteroidCount; i++) {
      meshRef.current.getMatrixAt(i, tempMatrix)
      tempMatrix.decompose(tempPosition, tempQuaternion, tempScale)

      // Get current angle and radius
      const radius = Math.sqrt(tempPosition.x ** 2 + tempPosition.z ** 2)
      const currentAngle = Math.atan2(tempPosition.z, tempPosition.x)

      // Apply orbital motion
      const newAngle = currentAngle + orbitSpeeds[i]
      tempPosition.x = Math.cos(newAngle) * radius
      tempPosition.z = Math.sin(newAngle) * radius

      // Self-rotation
      const rotation = rotations[i]
      rotation.x += 0.001 * (i % 3 + 1)
      rotation.y += 0.002 * (i % 2 + 1)
      tempQuaternion.setFromEuler(rotation)

      tempMatrix.compose(tempPosition, tempQuaternion, tempScale)
      meshRef.current.setMatrixAt(i, tempMatrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  // Create irregular asteroid geometry
  const asteroidGeometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 0)

    // Distort vertices for irregular shape
    const positions = geo.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const z = positions.getZ(i)

      const noise = 0.7 + Math.random() * 0.6
      positions.setXYZ(i, x * noise, y * noise, z * noise)
    }

    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <group position={position}>
      <instancedMesh
        ref={meshRef}
        args={[asteroidGeometry, undefined, asteroidCount]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color={color}
          roughness={0.9}
          metalness={0.1}
        />
      </instancedMesh>

      {/* Subtle dust ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[innerRadius, outerRadius, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

export default AsteroidBelt3D
