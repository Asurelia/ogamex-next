'use client'

/**
 * Battle Effects System for OGameX
 * Provides particle-based visual effects for combat sequences
 *
 * Effects included:
 * - LaserBeam: Animated laser between two points
 * - Explosion: Ship destruction effect
 * - ShieldImpact: Shield hit ripple effect
 * - DebrisField: Floating debris after battle
 * - EngineTrail: Ship engine exhaust particles
 * - MuzzleFlash: Weapon firing flash
 */

import { useRef, useMemo, useEffect, useState, useCallback, memo, RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line, Points, PointMaterial, Sphere } from '@react-three/drei'

// ============================================================================
// TYPES
// ============================================================================

export interface LaserBeamProps {
  start: [number, number, number]
  end: [number, number, number]
  color?: 'red' | 'green' | 'blue' | 'yellow' | string
  duration?: number
  onComplete?: () => void
}

export interface ExplosionProps {
  position: [number, number, number]
  size?: 'small' | 'medium' | 'large'
  onComplete?: () => void
}

export interface ShieldImpactProps {
  position: [number, number, number]
  normal: [number, number, number]
  color?: string
  onComplete?: () => void
}

export interface DebrisFieldProps {
  position: [number, number, number]
  radius: number
  density: number
  metalAmount: number
  crystalAmount: number
}

export interface EngineTrailProps {
  shipRef: RefObject<THREE.Group | null>
  color?: string
  length?: number
  intensity?: number
}

export interface MuzzleFlashProps {
  position: [number, number, number]
  direction?: [number, number, number]
  color?: string
  size?: number
  onComplete?: () => void
}

// ============================================================================
// COLOR MAPPINGS
// ============================================================================

const LASER_COLORS: Record<string, string> = {
  red: '#ff3333',
  green: '#33ff33',
  blue: '#3366ff',
  yellow: '#ffff33',
}

const SIZE_SCALES: Record<string, number> = {
  small: 1,
  medium: 2,
  large: 4,
}

// ============================================================================
// LASER BEAM EFFECT
// ============================================================================

export const LaserBeam = memo(function LaserBeam({
  start,
  end,
  color = 'red',
  duration = 0.3,
  onComplete,
}: LaserBeamProps) {
  const groupRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)
  const startTimeRef = useRef<number | null>(null)

  // Calculate beam geometry
  const { direction, length, midpoint, rotation } = useMemo(() => {
    const startVec = new THREE.Vector3(...start)
    const endVec = new THREE.Vector3(...end)
    const dir = new THREE.Vector3().subVectors(endVec, startVec)
    const len = dir.length()
    dir.normalize()

    const mid = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5)

    // Calculate rotation to point cylinder along beam direction
    const up = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir)
    const euler = new THREE.Euler().setFromQuaternion(quaternion)

    return {
      direction: dir,
      length: len,
      midpoint: [mid.x, mid.y, mid.z] as [number, number, number],
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
    }
  }, [start, end])

  // Resolve color
  const beamColor = useMemo(() => {
    return LASER_COLORS[color] || color
  }, [color])

  // Animation frame
  useFrame(({ clock }) => {
    if (!visible) return

    if (startTimeRef.current === null) {
      startTimeRef.current = clock.elapsedTime
    }

    const elapsed = clock.elapsedTime - startTimeRef.current
    const newProgress = Math.min(elapsed / duration, 1)
    setProgress(newProgress)

    // Pulsing glow effect
    if (glowRef.current) {
      const pulse = 0.8 + Math.sin(clock.elapsedTime * 30) * 0.2
      glowRef.current.scale.setScalar(pulse)
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = (1 - newProgress) * 0.5 * pulse
    }

    // Core beam intensity
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 1 - newProgress * 0.5
    }

    if (newProgress >= 1) {
      setVisible(false)
      onComplete?.()
    }
  })

  if (!visible) return null

  return (
    <group ref={groupRef} position={midpoint} rotation={rotation}>
      {/* Core beam */}
      <mesh ref={coreRef}>
        <cylinderGeometry args={[0.02, 0.02, length, 8]} />
        <meshBasicMaterial
          color={beamColor}
          transparent
          opacity={1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer glow */}
      <mesh ref={glowRef}>
        <cylinderGeometry args={[0.08, 0.08, length, 8]} />
        <meshBasicMaterial
          color={beamColor}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Start point flash */}
      <mesh position={[0, -length / 2, 0]}>
        <sphereGeometry args={[0.1 * (1 - progress), 8, 8]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.8 * (1 - progress)}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Impact point flash */}
      <mesh position={[0, length / 2, 0]}>
        <sphereGeometry args={[0.15 * (1 - progress * 0.5), 12, 12]} />
        <meshBasicMaterial
          color={beamColor}
          transparent
          opacity={0.9 * (1 - progress * 0.3)}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
})

// ============================================================================
// EXPLOSION EFFECT
// ============================================================================

interface ExplosionParticle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  size: number
  life: number
  maxLife: number
  color: THREE.Color
  type: 'fire' | 'smoke' | 'debris' | 'spark'
}

export const Explosion = memo(function Explosion({
  position,
  size = 'medium',
  onComplete,
}: ExplosionProps) {
  const groupRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<ExplosionParticle[]>([])
  const meshRefs = useRef<THREE.Mesh[]>([])
  const [phase, setPhase] = useState<'flash' | 'expand' | 'fade' | 'done'>('flash')
  const startTimeRef = useRef<number | null>(null)
  const [flashOpacity, setFlashOpacity] = useState(1)
  const [sphereScale, setSphereScale] = useState(0)

  const scale = SIZE_SCALES[size] || SIZE_SCALES.medium
  const totalDuration = 1.5 + scale * 0.3

  // Initialize particles
  useMemo(() => {
    const particles: ExplosionParticle[] = []
    const particleCount = 50 + scale * 30

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 2 + Math.random() * 4 * scale

      const direction = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      )

      const type = i < particleCount * 0.3
        ? 'fire'
        : i < particleCount * 0.5
          ? 'smoke'
          : i < particleCount * 0.8
            ? 'debris'
            : 'spark'

      const colors: Record<string, THREE.Color> = {
        fire: new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 1, 0.5 + Math.random() * 0.3),
        smoke: new THREE.Color(0.2 + Math.random() * 0.1, 0.2 + Math.random() * 0.1, 0.2 + Math.random() * 0.1),
        debris: new THREE.Color(0.4, 0.35, 0.3),
        spark: new THREE.Color(1, 0.9, 0.3),
      }

      particles.push({
        position: new THREE.Vector3(0, 0, 0),
        velocity: direction.multiplyScalar(speed),
        size: type === 'spark' ? 0.05 : (0.1 + Math.random() * 0.2) * scale,
        life: 1,
        maxLife: 0.5 + Math.random() * 1.0,
        color: colors[type],
        type,
      })
    }

    particlesRef.current = particles
  }, [scale])

  useFrame(({ clock }, delta) => {
    if (phase === 'done') return

    if (startTimeRef.current === null) {
      startTimeRef.current = clock.elapsedTime
    }

    const elapsed = clock.elapsedTime - startTimeRef.current

    // Flash phase (0 - 0.1s)
    if (elapsed < 0.1) {
      setPhase('flash')
      setFlashOpacity(1 - elapsed / 0.1)
      setSphereScale(elapsed / 0.1 * 0.5)
    }
    // Expand phase (0.1 - 0.5s)
    else if (elapsed < 0.5) {
      setPhase('expand')
      setFlashOpacity(0)
      const expandProgress = (elapsed - 0.1) / 0.4
      setSphereScale(0.5 + expandProgress * 0.5)
    }
    // Fade phase
    else if (elapsed < totalDuration) {
      setPhase('fade')
      const fadeProgress = (elapsed - 0.5) / (totalDuration - 0.5)
      setSphereScale(1 - fadeProgress * 0.3)
    }
    else {
      setPhase('done')
      onComplete?.()
      return
    }

    // Update particles
    particlesRef.current.forEach((particle, index) => {
      if (particle.life <= 0) return

      // Apply velocity
      particle.position.add(particle.velocity.clone().multiplyScalar(delta))

      // Apply drag
      particle.velocity.multiplyScalar(0.98)

      // Apply gravity for debris
      if (particle.type === 'debris') {
        particle.velocity.y -= delta * 2
      }

      // Decrease life
      particle.life -= delta / particle.maxLife

      // Update mesh if exists
      const mesh = meshRefs.current[index]
      if (mesh) {
        mesh.position.copy(particle.position)
        mesh.scale.setScalar(particle.size * Math.max(0, particle.life))

        const mat = mesh.material as THREE.MeshBasicMaterial
        mat.opacity = Math.max(0, particle.life * (particle.type === 'spark' ? 1 : 0.8))
      }
    })
  })

  if (phase === 'done') return null

  return (
    <group ref={groupRef} position={position}>
      {/* Initial flash */}
      {phase === 'flash' && (
        <mesh>
          <sphereGeometry args={[scale * 0.5, 16, 16]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={flashOpacity}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Fire sphere */}
      <mesh scale={sphereScale * scale}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={phase === 'fade' ? 0.3 : 0.6}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Core glow */}
      <mesh scale={sphereScale * scale * 0.6}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#ffff00"
          transparent
          opacity={phase === 'fade' ? 0.2 : 0.8}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Particles */}
      {particlesRef.current.map((particle, index) => (
        <mesh
          key={index}
          ref={(el) => { if (el) meshRefs.current[index] = el }}
          position={particle.position}
        >
          {particle.type === 'spark' ? (
            <boxGeometry args={[0.1, 0.1, 0.3]} />
          ) : (
            <sphereGeometry args={[particle.size, 6, 6]} />
          )}
          <meshBasicMaterial
            color={particle.color}
            transparent
            opacity={0.8}
            blending={particle.type === 'smoke' ? THREE.NormalBlending : THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* Shockwave ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={sphereScale * scale * 2}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial
          color="#ff8800"
          transparent
          opacity={phase === 'fade' ? 0.1 : 0.4}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
})

// ============================================================================
// SHIELD IMPACT EFFECT
// ============================================================================

export const ShieldImpact = memo(function ShieldImpact({
  position,
  normal,
  color = '#00ffff',
  onComplete,
}: ShieldImpactProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)
  const startTimeRef = useRef<number | null>(null)
  const duration = 0.6

  // Calculate rotation to face the normal direction
  const rotation = useMemo(() => {
    const normalVec = new THREE.Vector3(...normal).normalize()
    const up = new THREE.Vector3(0, 0, 1)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normalVec)
    const euler = new THREE.Euler().setFromQuaternion(quaternion)
    return [euler.x, euler.y, euler.z] as [number, number, number]
  }, [normal])

  // Hexagonal pattern positions
  const hexPositions = useMemo(() => {
    const positions: [number, number, number][] = []
    const rings = 3
    const hexSize = 0.3

    for (let ring = 0; ring <= rings; ring++) {
      if (ring === 0) {
        positions.push([0, 0, 0])
      } else {
        for (let i = 0; i < 6 * ring; i++) {
          const angle = (i / (6 * ring)) * Math.PI * 2
          const x = Math.cos(angle) * ring * hexSize * 1.5
          const y = Math.sin(angle) * ring * hexSize * 1.5
          positions.push([x, y, 0])
        }
      }
    }
    return positions
  }, [])

  useFrame(({ clock }) => {
    if (!visible) return

    if (startTimeRef.current === null) {
      startTimeRef.current = clock.elapsedTime
    }

    const elapsed = clock.elapsedTime - startTimeRef.current
    const newProgress = Math.min(elapsed / duration, 1)
    setProgress(newProgress)

    if (newProgress >= 1) {
      setVisible(false)
      onComplete?.()
    }
  })

  if (!visible) return null

  const rippleScale = 1 + progress * 2
  const opacity = 1 - progress

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Central flash */}
      <mesh>
        <circleGeometry args={[0.3 * (1 + progress), 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={opacity * 0.8}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Ripple rings */}
      {[0, 0.15, 0.3].map((delay, i) => {
        const ringProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
        if (ringProgress <= 0) return null
        return (
          <mesh key={i} scale={1 + ringProgress * 3}>
            <ringGeometry args={[0.9, 1, 32]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={(1 - ringProgress) * 0.5}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}

      {/* Hexagonal pattern */}
      {hexPositions.map((pos, i) => {
        const hexDelay = (Math.sqrt(pos[0] ** 2 + pos[1] ** 2) / 2) * 0.3
        const hexProgress = Math.max(0, Math.min(1, (progress - hexDelay) / 0.3))
        if (hexProgress <= 0) return null

        return (
          <mesh key={i} position={pos} scale={rippleScale * 0.5}>
            <circleGeometry args={[0.12 * (1 - hexProgress * 0.5), 6]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={(1 - hexProgress) * 0.6}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}

      {/* Energy sparks */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const dist = progress * 2
        const sparkProgress = Math.max(0, 1 - progress * 1.5)

        return (
          <mesh
            key={`spark-${i}`}
            position={[Math.cos(angle) * dist, Math.sin(angle) * dist, 0.1]}
          >
            <sphereGeometry args={[0.05 * sparkProgress, 4, 4]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={sparkProgress}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )
      })}
    </group>
  )
})

// ============================================================================
// DEBRIS FIELD EFFECT
// ============================================================================

interface DebrisParticle {
  position: THREE.Vector3
  rotation: THREE.Euler
  rotationSpeed: THREE.Vector3
  scale: number
  type: 'metal' | 'crystal'
}

export const DebrisField = memo(function DebrisField({
  position,
  radius,
  density,
  metalAmount,
  crystalAmount,
}: DebrisFieldProps) {
  const groupRef = useRef<THREE.Group>(null)
  const debrisRefs = useRef<(THREE.Mesh | null)[]>([])

  // Generate debris particles
  const particles = useMemo(() => {
    const result: DebrisParticle[] = []
    const totalPieces = Math.floor(density)

    const metalPieces = Math.floor((metalAmount / (metalAmount + crystalAmount)) * totalPieces)
    const crystalPieces = totalPieces - metalPieces

    // Metal debris
    for (let i = 0; i < metalPieces; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.random() * radius

      result.push({
        position: new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        ),
        rotation: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        scale: 0.1 + Math.random() * 0.3,
        type: 'metal',
      })
    }

    // Crystal debris
    for (let i = 0; i < crystalPieces; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.random() * radius

      result.push({
        position: new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        ),
        rotation: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        ),
        scale: 0.08 + Math.random() * 0.2,
        type: 'crystal',
      })
    }

    return result
  }, [radius, density, metalAmount, crystalAmount])

  // Animate debris rotation
  useFrame((_, delta) => {
    particles.forEach((particle, index) => {
      const mesh = debrisRefs.current[index]
      if (mesh) {
        mesh.rotation.x += particle.rotationSpeed.x * delta
        mesh.rotation.y += particle.rotationSpeed.y * delta
        mesh.rotation.z += particle.rotationSpeed.z * delta
      }
    })
  })

  return (
    <group ref={groupRef} position={position}>
      {particles.map((particle, index) => (
        <mesh
          key={index}
          ref={(el) => { debrisRefs.current[index] = el }}
          position={particle.position}
          rotation={particle.rotation}
          scale={particle.scale}
        >
          {particle.type === 'metal' ? (
            <boxGeometry args={[1, 0.5, 0.3]} />
          ) : (
            <octahedronGeometry args={[0.5]} />
          )}
          <meshStandardMaterial
            color={particle.type === 'metal' ? '#666677' : '#44ccff'}
            metalness={particle.type === 'metal' ? 0.9 : 0.3}
            roughness={particle.type === 'metal' ? 0.3 : 0.1}
            emissive={particle.type === 'crystal' ? '#0066ff' : '#000000'}
            emissiveIntensity={particle.type === 'crystal' ? 0.3 : 0}
          />
        </mesh>
      ))}

      {/* Ambient particles / dust */}
      <Points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array(
                Array.from({ length: Math.floor(density * 3) }).flatMap(() => {
                  const theta = Math.random() * Math.PI * 2
                  const phi = Math.acos(2 * Math.random() - 1)
                  const r = Math.random() * radius * 1.2
                  return [
                    r * Math.sin(phi) * Math.cos(theta),
                    r * Math.sin(phi) * Math.sin(theta),
                    r * Math.cos(phi),
                  ]
                })
              ),
              3,
            ]}
          />
        </bufferGeometry>
        <PointMaterial
          size={0.05}
          color="#888899"
          transparent
          opacity={0.5}
          sizeAttenuation
        />
      </Points>
    </group>
  )
})

// ============================================================================
// ENGINE TRAIL EFFECT
// ============================================================================

interface TrailParticle {
  position: THREE.Vector3
  life: number
  size: number
}

export const EngineTrail = memo(function EngineTrail({
  shipRef,
  color = '#00aaff',
  length = 20,
  intensity = 1,
}: EngineTrailProps) {
  const particlesRef = useRef<TrailParticle[]>([])
  const pointsRef = useRef<THREE.Points>(null)
  const positionsRef = useRef<Float32Array>(new Float32Array(length * 3 * 3))
  const sizesRef = useRef<Float32Array>(new Float32Array(length * 3))
  const lastPositionRef = useRef<THREE.Vector3 | null>(null)

  // Initialize positions array
  useEffect(() => {
    particlesRef.current = Array.from({ length: length * 3 }, () => ({
      position: new THREE.Vector3(0, 0, 0),
      life: 0,
      size: 0,
    }))
  }, [length])

  useFrame((_, delta) => {
    if (!shipRef.current) return

    // Get ship world position
    const worldPosition = new THREE.Vector3()
    shipRef.current.getWorldPosition(worldPosition)

    // Emit new particles if ship has moved
    if (lastPositionRef.current) {
      const distance = worldPosition.distanceTo(lastPositionRef.current)
      if (distance > 0.1) {
        // Add new particle
        const newParticle: TrailParticle = {
          position: worldPosition.clone(),
          life: 1,
          size: 0.15 * intensity,
        }

        // Shift particles
        particlesRef.current.pop()
        particlesRef.current.unshift(newParticle)
      }
    }

    lastPositionRef.current = worldPosition.clone()

    // Update particles
    particlesRef.current.forEach((particle, index) => {
      particle.life -= delta * 0.8
      particle.size *= 0.98

      const i3 = index * 3
      positionsRef.current[i3] = particle.position.x
      positionsRef.current[i3 + 1] = particle.position.y
      positionsRef.current[i3 + 2] = particle.position.z
      sizesRef.current[index] = Math.max(0, particle.size * particle.life)
    })

    // Update geometry
    if (pointsRef.current) {
      const geometry = pointsRef.current.geometry as THREE.BufferGeometry
      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
      const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute

      if (posAttr) {
        posAttr.array = positionsRef.current
        posAttr.needsUpdate = true
      }
      if (sizeAttr) {
        sizeAttr.array = sizesRef.current
        sizeAttr.needsUpdate = true
      }
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positionsRef.current, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizesRef.current, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.2}
        transparent
        opacity={0.8 * intensity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
})

// ============================================================================
// MUZZLE FLASH EFFECT
// ============================================================================

export const MuzzleFlash = memo(function MuzzleFlash({
  position,
  direction = [0, 0, 1],
  color = '#ffff00',
  size = 0.5,
  onComplete,
}: MuzzleFlashProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)
  const startTimeRef = useRef<number | null>(null)
  const duration = 0.1

  // Calculate rotation to face direction
  const rotation = useMemo(() => {
    const dir = new THREE.Vector3(...direction).normalize()
    const up = new THREE.Vector3(0, 0, 1)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir)
    const euler = new THREE.Euler().setFromQuaternion(quaternion)
    return [euler.x, euler.y, euler.z] as [number, number, number]
  }, [direction])

  // Spark positions
  const sparks = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5
      const dist = 0.3 + Math.random() * 0.3
      return {
        angle,
        dist,
        speed: 2 + Math.random() * 2,
        size: 0.02 + Math.random() * 0.03,
      }
    })
  }, [])

  useFrame(({ clock }) => {
    if (!visible) return

    if (startTimeRef.current === null) {
      startTimeRef.current = clock.elapsedTime
    }

    const elapsed = clock.elapsedTime - startTimeRef.current
    const newProgress = Math.min(elapsed / duration, 1)
    setProgress(newProgress)

    if (newProgress >= 1) {
      setVisible(false)
      onComplete?.()
    }
  })

  if (!visible) return null

  const flashOpacity = 1 - progress
  const flashScale = 1 + progress * 0.5

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Central flash */}
      <mesh scale={flashScale * size}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={flashOpacity * 0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Colored core */}
      <mesh scale={flashScale * size * 0.7}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={flashOpacity * 0.8}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Flash cone */}
      <mesh position={[0, 0, size * 0.3]} scale={[size, size, size * 0.5]}>
        <coneGeometry args={[0.3, 0.8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={flashOpacity * 0.6}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Sparks */}
      {sparks.map((spark, i) => {
        const sparkDist = spark.dist + progress * spark.speed * size
        const sparkOpacity = Math.max(0, 1 - progress * 1.5)

        return (
          <mesh
            key={i}
            position={[
              Math.cos(spark.angle) * sparkDist,
              Math.sin(spark.angle) * sparkDist,
              progress * 0.5,
            ]}
          >
            <sphereGeometry args={[spark.size * (1 - progress * 0.5), 4, 4]} />
            <meshBasicMaterial
              color="#ffff88"
              transparent
              opacity={sparkOpacity}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )
      })}
    </group>
  )
})

// ============================================================================
// BATTLE EFFECTS MANAGER
// ============================================================================

export interface BattleEffect {
  id: string
  type: 'laser' | 'explosion' | 'shield' | 'muzzle'
  props: LaserBeamProps | ExplosionProps | ShieldImpactProps | MuzzleFlashProps
}

export interface BattleEffectsManagerProps {
  effects: BattleEffect[]
  onEffectComplete?: (id: string) => void
}

export const BattleEffectsManager = memo(function BattleEffectsManager({
  effects,
  onEffectComplete,
}: BattleEffectsManagerProps) {
  const handleComplete = useCallback(
    (id: string) => {
      onEffectComplete?.(id)
    },
    [onEffectComplete]
  )

  return (
    <group>
      {effects.map((effect) => {
        switch (effect.type) {
          case 'laser':
            return (
              <LaserBeam
                key={effect.id}
                {...(effect.props as LaserBeamProps)}
                onComplete={() => handleComplete(effect.id)}
              />
            )
          case 'explosion':
            return (
              <Explosion
                key={effect.id}
                {...(effect.props as ExplosionProps)}
                onComplete={() => handleComplete(effect.id)}
              />
            )
          case 'shield':
            return (
              <ShieldImpact
                key={effect.id}
                {...(effect.props as ShieldImpactProps)}
                onComplete={() => handleComplete(effect.id)}
              />
            )
          case 'muzzle':
            return (
              <MuzzleFlash
                key={effect.id}
                {...(effect.props as MuzzleFlashProps)}
                onComplete={() => handleComplete(effect.id)}
              />
            )
          default:
            return null
        }
      })}
    </group>
  )
})

// ============================================================================
// HOOK: USE BATTLE EFFECTS
// ============================================================================

export interface UseBattleEffectsReturn {
  effects: BattleEffect[]
  fireLaser: (props: Omit<LaserBeamProps, 'onComplete'>) => string
  triggerExplosion: (props: Omit<ExplosionProps, 'onComplete'>) => string
  triggerShieldImpact: (props: Omit<ShieldImpactProps, 'onComplete'>) => string
  triggerMuzzleFlash: (props: Omit<MuzzleFlashProps, 'onComplete'>) => string
  clearEffect: (id: string) => void
  clearAllEffects: () => void
}

export function useBattleEffects(): UseBattleEffectsReturn {
  const [effects, setEffects] = useState<BattleEffect[]>([])
  const idCounterRef = useRef(0)

  const generateId = useCallback(() => {
    idCounterRef.current += 1
    return `effect-${idCounterRef.current}-${Date.now()}`
  }, [])

  const clearEffect = useCallback((id: string) => {
    setEffects((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const clearAllEffects = useCallback(() => {
    setEffects([])
  }, [])

  const fireLaser = useCallback(
    (props: Omit<LaserBeamProps, 'onComplete'>) => {
      const id = generateId()
      setEffects((prev) => [
        ...prev,
        {
          id,
          type: 'laser',
          props: { ...props, onComplete: () => clearEffect(id) },
        },
      ])
      return id
    },
    [generateId, clearEffect]
  )

  const triggerExplosion = useCallback(
    (props: Omit<ExplosionProps, 'onComplete'>) => {
      const id = generateId()
      setEffects((prev) => [
        ...prev,
        {
          id,
          type: 'explosion',
          props: { ...props, onComplete: () => clearEffect(id) },
        },
      ])
      return id
    },
    [generateId, clearEffect]
  )

  const triggerShieldImpact = useCallback(
    (props: Omit<ShieldImpactProps, 'onComplete'>) => {
      const id = generateId()
      setEffects((prev) => [
        ...prev,
        {
          id,
          type: 'shield',
          props: { ...props, onComplete: () => clearEffect(id) },
        },
      ])
      return id
    },
    [generateId, clearEffect]
  )

  const triggerMuzzleFlash = useCallback(
    (props: Omit<MuzzleFlashProps, 'onComplete'>) => {
      const id = generateId()
      setEffects((prev) => [
        ...prev,
        {
          id,
          type: 'muzzle',
          props: { ...props, onComplete: () => clearEffect(id) },
        },
      ])
      return id
    },
    [generateId, clearEffect]
  )

  return {
    effects,
    fireLaser,
    triggerExplosion,
    triggerShieldImpact,
    triggerMuzzleFlash,
    clearEffect,
    clearAllEffects,
  }
}
