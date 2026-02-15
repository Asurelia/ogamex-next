'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import * as THREE from 'three'

interface NeutronStar3DProps {
  position?: [number, number, number]
  size?: number
  rotationSpeed?: number
  beamIntensity?: number
}

/**
 * Neutron Star (Pulsar) 3D visualization
 * Features rapid rotation and radiation beams
 */
export function NeutronStar3D({
  position = [0, 0, 0],
  size = 2,
  rotationSpeed = 3,
  beamIntensity = 1,
}: NeutronStar3DProps) {
  const coreRef = useRef<THREE.Mesh>(null)
  const magnetosphereRef = useRef<THREE.Mesh>(null)
  const beam1Ref = useRef<THREE.Group>(null)
  const beam2Ref = useRef<THREE.Group>(null)

  // Pulsation effect
  const pulseRef = useRef(0)

  // Animation
  useFrame(({ clock }) => {
    const time = clock.elapsedTime

    // Core pulsation
    pulseRef.current = (Math.sin(time * rotationSpeed * 10) + 1) / 2

    if (coreRef.current) {
      const scale = 1 + pulseRef.current * 0.05
      coreRef.current.scale.setScalar(scale)
    }

    // Magnetosphere rotation
    if (magnetosphereRef.current) {
      magnetosphereRef.current.rotation.y = time * rotationSpeed
      magnetosphereRef.current.rotation.x = Math.PI / 6 // Tilted axis
    }

    // Beam rotation
    if (beam1Ref.current) {
      beam1Ref.current.rotation.y = time * rotationSpeed
      // Beam intensity pulsation
      const beam = beam1Ref.current.children[0] as THREE.Mesh
      if (beam && beam.material) {
        const mat = beam.material as THREE.MeshBasicMaterial
        mat.opacity = 0.3 + pulseRef.current * 0.4 * beamIntensity
      }
    }

    if (beam2Ref.current) {
      beam2Ref.current.rotation.y = time * rotationSpeed + Math.PI
    }
  })

  // Create beam geometry (cone shape)
  const beamGeometry = useMemo(() => {
    const geometry = new THREE.ConeGeometry(size * 0.5, size * 20, 16, 1, true)
    return geometry
  }, [size])

  return (
    <group position={position}>
      {/* Neutron star core (very small, very hot) */}
      <Sphere ref={coreRef} args={[size, 32, 32]}>
        <meshBasicMaterial color="#aaccff" />
      </Sphere>

      {/* Hot surface layer */}
      <Sphere args={[size * 1.05, 32, 32]}>
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.5}
        />
      </Sphere>

      {/* Magnetosphere */}
      <group ref={magnetosphereRef}>
        {/* Magnetic field lines (toroidal shape) */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 3, size * 0.5, 16, 64]} />
          <meshBasicMaterial
            color="#4466ff"
            transparent
            opacity={0.15}
            wireframe
          />
        </mesh>

        {/* Inner magnetosphere */}
        <Sphere args={[size * 2, 16, 16]}>
          <meshBasicMaterial
            color="#6688ff"
            transparent
            opacity={0.1}
            wireframe
          />
        </Sphere>
      </group>

      {/* Radiation Beam 1 */}
      <group ref={beam1Ref} rotation={[0, 0, Math.PI / 6]}>
        <mesh
          position={[0, size * 10, 0]}
          geometry={beamGeometry}
        >
          <meshBasicMaterial
            color="#88aaff"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Beam glow */}
        <pointLight
          position={[0, size * 15, 0]}
          color="#88aaff"
          intensity={beamIntensity}
          distance={40}
          decay={2}
        />
      </group>

      {/* Radiation Beam 2 (opposite) */}
      <group ref={beam2Ref} rotation={[Math.PI, 0, Math.PI / 6]}>
        <mesh
          position={[0, size * 10, 0]}
          geometry={beamGeometry}
        >
          <meshBasicMaterial
            color="#88aaff"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>

        <pointLight
          position={[0, size * 15, 0]}
          color="#88aaff"
          intensity={beamIntensity}
          distance={40}
          decay={2}
        />
      </group>

      {/* Core light */}
      <pointLight
        color="#aaccff"
        intensity={2}
        distance={80}
        decay={2}
      />

      {/* Radiation particles (subtle) */}
      <mesh>
        <sphereGeometry args={[size * 5, 8, 8]} />
        <meshBasicMaterial
          color="#4466ff"
          transparent
          opacity={0.05}
          wireframe
        />
      </mesh>
    </group>
  )
}

export default NeutronStar3D
