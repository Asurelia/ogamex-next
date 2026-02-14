'use client'

import { useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ============================================================================
// TYPES
// ============================================================================

export type ShipType =
  | 'small_cargo'
  | 'large_cargo'
  | 'light_fighter'
  | 'heavy_fighter'
  | 'cruiser'
  | 'battleship'
  | 'bomber'
  | 'destroyer'
  | 'deathstar'
  | 'recycler'
  | 'espionage_probe'
  | 'solar_satellite'
  | 'colony_ship'
  | 'battlecruiser'
  | 'reaper'
  | 'pathfinder'

export interface ShipModelProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  damaged?: boolean
  shieldActive?: boolean
  shieldStrength?: number
  engineGlow?: boolean
  firing?: boolean
  selected?: boolean
  teamColor?: 'blue' | 'red' | 'green'
  onHit?: () => void
}

export interface ShipModelRef {
  takeDamage: () => void
  fireWeapon: () => void
  activateShield: () => void
  getPosition: () => THREE.Vector3
}

// Ship configuration data
interface ShipConfig {
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge'
  baseScale: number
  primaryColor: string
  secondaryColor: string
  engineColor: string
  enginePoints: [number, number, number][]
  cannonPoints: [number, number, number][]
}

const SHIP_CONFIGS: Record<ShipType, ShipConfig> = {
  small_cargo: {
    size: 'small',
    baseScale: 0.6,
    primaryColor: '#88aacc',
    secondaryColor: '#667799',
    engineColor: '#00ccff',
    enginePoints: [[0.25, 0, -0.5], [-0.25, 0, -0.5]],
    cannonPoints: [],
  },
  large_cargo: {
    size: 'medium',
    baseScale: 1.2,
    primaryColor: '#8899bb',
    secondaryColor: '#556677',
    engineColor: '#00ccff',
    enginePoints: [[0.4, 0, -1.0], [-0.4, 0, -1.0]],
    cannonPoints: [],
  },
  light_fighter: {
    size: 'tiny',
    baseScale: 0.4,
    primaryColor: '#ffffff',
    secondaryColor: '#aaddff',
    engineColor: '#00ffff',
    enginePoints: [[0, 0, -0.5]],
    cannonPoints: [[0.15, 0, 0.4], [-0.15, 0, 0.4]],
  },
  heavy_fighter: {
    size: 'small',
    baseScale: 0.6,
    primaryColor: '#555566',
    secondaryColor: '#cc4444',
    engineColor: '#ff4400',
    enginePoints: [[0.2, 0, -0.6], [-0.2, 0, -0.6]],
    cannonPoints: [[0.25, 0, 0.3], [-0.25, 0, 0.3]],
  },
  cruiser: {
    size: 'medium',
    baseScale: 1.0,
    primaryColor: '#556688',
    secondaryColor: '#334466',
    engineColor: '#3388ff',
    enginePoints: [[0.3, 0, -0.8], [-0.3, 0, -0.8], [0, -0.1, -0.8]],
    cannonPoints: [[0.3, 0.15, 0.4], [-0.3, 0.15, 0.4], [0, 0.2, 0.5]],
  },
  battleship: {
    size: 'large',
    baseScale: 1.5,
    primaryColor: '#222233',
    secondaryColor: '#aa3333',
    engineColor: '#ff3300',
    enginePoints: [[0.4, 0.1, -1.0], [-0.4, 0.1, -1.0], [0.2, -0.1, -1.0], [-0.2, -0.1, -1.0]],
    cannonPoints: [[0.35, 0.25, 0.5], [-0.35, 0.25, 0.5], [0.2, 0.3, 0.6], [-0.2, 0.3, 0.6]],
  },
  bomber: {
    size: 'medium',
    baseScale: 1.1,
    primaryColor: '#334422',
    secondaryColor: '#222222',
    engineColor: '#44ff44',
    enginePoints: [[0.35, 0, -0.7], [-0.35, 0, -0.7]],
    cannonPoints: [[0, -0.2, 0.3]],
  },
  destroyer: {
    size: 'large',
    baseScale: 1.4,
    primaryColor: '#aa2222',
    secondaryColor: '#222222',
    engineColor: '#ff0000',
    enginePoints: [[0.35, 0, -1.0], [-0.35, 0, -1.0], [0.15, -0.15, -1.0], [-0.15, -0.15, -1.0]],
    cannonPoints: [[0.4, 0.2, 0.6], [-0.4, 0.2, 0.6], [0, 0.3, 0.7]],
  },
  deathstar: {
    size: 'huge',
    baseScale: 3.0,
    primaryColor: '#555566',
    secondaryColor: '#333344',
    engineColor: '#ff00ff',
    enginePoints: [[0, 0, -1.5]],
    cannonPoints: [[0.6, 0.6, 0.6]],
  },
  recycler: {
    size: 'medium',
    baseScale: 0.9,
    primaryColor: '#aaaa44',
    secondaryColor: '#666644',
    engineColor: '#44ff44',
    enginePoints: [[0.3, 0, -0.5], [-0.3, 0, -0.5]],
    cannonPoints: [],
  },
  espionage_probe: {
    size: 'tiny',
    baseScale: 0.25,
    primaryColor: '#ccddff',
    secondaryColor: '#8899bb',
    engineColor: '#00ffff',
    enginePoints: [[0, 0, -0.2]],
    cannonPoints: [],
  },
  solar_satellite: {
    size: 'tiny',
    baseScale: 0.35,
    primaryColor: '#ffdd88',
    secondaryColor: '#4466cc',
    engineColor: '#ffff00',
    enginePoints: [],
    cannonPoints: [],
  },
  colony_ship: {
    size: 'medium',
    baseScale: 1.0,
    primaryColor: '#aabbcc',
    secondaryColor: '#88aa99',
    engineColor: '#00ffaa',
    enginePoints: [[0, -0.5, 0]],
    cannonPoints: [],
  },
  battlecruiser: {
    size: 'medium',
    baseScale: 1.2,
    primaryColor: '#5566aa',
    secondaryColor: '#334488',
    engineColor: '#ff4400',
    enginePoints: [[0.3, 0, -0.85], [-0.3, 0, -0.85]],
    cannonPoints: [[0.35, 0.1, 0.4], [-0.35, 0.1, 0.4]],
  },
  reaper: {
    size: 'large',
    baseScale: 1.4,
    primaryColor: '#445566',
    secondaryColor: '#223344',
    engineColor: '#cc00ff',
    enginePoints: [[0.25, 0, -0.9], [-0.25, 0, -0.9]],
    cannonPoints: [[0.1, 0.25, 0.6], [-0.1, 0.25, 0.6]],
  },
  pathfinder: {
    size: 'small',
    baseScale: 0.8,
    primaryColor: '#aaccee',
    secondaryColor: '#88bbdd',
    engineColor: '#00ffcc',
    enginePoints: [[0, 0, -0.5]],
    cannonPoints: [],
  },
}

// Team color mappings
const TEAM_COLORS = {
  blue: { primary: '#3366ff', secondary: '#224488', accent: '#00ccff' },
  red: { primary: '#ff3333', secondary: '#882222', accent: '#ff6600' },
  green: { primary: '#33ff66', secondary: '#228844', accent: '#00ff88' },
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface EngineGlowProps {
  position: [number, number, number]
  color: string
  intensity: number
  active: boolean
}

function EngineGlow({ position, color, intensity, active }: EngineGlowProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const trailRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!active) return

    const pulse = 0.8 + Math.sin(clock.elapsedTime * 8) * 0.2

    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = intensity * pulse
    }

    if (trailRef.current) {
      const mat = trailRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = intensity * pulse * 0.5
      trailRef.current.scale.y = 0.8 + Math.sin(clock.elapsedTime * 12) * 0.3
    }
  })

  if (!active) return null

  return (
    <group position={position}>
      {/* Engine core glow */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={intensity}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Engine trail */}
      <mesh ref={trailRef} position={[0, 0, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.06, 0.3, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={intensity * 0.5}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Point light for glow effect */}
      <pointLight
        color={color}
        intensity={intensity * 2}
        distance={1}
        decay={2}
      />
    </group>
  )
}

interface ShieldMeshProps {
  radius: number
  strength: number
  active: boolean
  teamColor: string
}

function ShieldMesh({ radius, strength, active, teamColor }: ShieldMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const hitFlashRef = useRef(0)

  useFrame(({ clock }) => {
    if (!meshRef.current || !active) return

    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    const baseOpacity = strength * 0.3
    const pulse = Math.sin(clock.elapsedTime * 2) * 0.1
    const hitFlash = hitFlashRef.current > 0 ? hitFlashRef.current * 0.5 : 0

    mat.opacity = baseOpacity + pulse + hitFlash

    // Decay hit flash
    if (hitFlashRef.current > 0) {
      hitFlashRef.current -= 0.05
    }

    // Rotate shield pattern
    meshRef.current.rotation.y = clock.elapsedTime * 0.3
    meshRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.5) * 0.1
  })

  if (!active) return null

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[radius, 1]} />
      <meshBasicMaterial
        color={teamColor}
        transparent
        opacity={strength * 0.3}
        wireframe
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

interface DamageEffectsProps {
  damaged: boolean
  size: number
}

function DamageEffects({ damaged, size }: DamageEffectsProps) {
  const smokeRef = useRef<THREE.Points>(null)
  const sparkRef = useRef<THREE.Points>(null)

  const { smokePositions, sparkPositions } = useMemo(() => {
    const smokeCount = 30
    const sparkCount = 20

    const smokePositions = new Float32Array(smokeCount * 3)
    const sparkPositions = new Float32Array(sparkCount * 3)

    for (let i = 0; i < smokeCount; i++) {
      smokePositions[i * 3] = (Math.random() - 0.5) * size
      smokePositions[i * 3 + 1] = (Math.random() - 0.5) * size
      smokePositions[i * 3 + 2] = (Math.random() - 0.5) * size
    }

    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = (Math.random() - 0.5) * size * 0.5
      sparkPositions[i * 3 + 1] = (Math.random() - 0.5) * size * 0.5
      sparkPositions[i * 3 + 2] = (Math.random() - 0.5) * size * 0.5
    }

    return { smokePositions, sparkPositions }
  }, [size])

  useFrame(({ clock }) => {
    if (!damaged) return

    if (smokeRef.current) {
      const positions = smokeRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += 0.02 // Rise up

        // Reset particles that go too high
        if (positions[i * 3 + 1] > size) {
          positions[i * 3] = (Math.random() - 0.5) * size
          positions[i * 3 + 1] = (Math.random() - 0.5) * size * 0.3
          positions[i * 3 + 2] = (Math.random() - 0.5) * size
        }
      }
      smokeRef.current.geometry.attributes.position.needsUpdate = true
    }

    if (sparkRef.current) {
      const positions = sparkRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < positions.length / 3; i++) {
        // Random spark movement
        positions[i * 3] += (Math.random() - 0.5) * 0.02
        positions[i * 3 + 1] += (Math.random() - 0.5) * 0.02
        positions[i * 3 + 2] += (Math.random() - 0.5) * 0.02

        // Reset sparks randomly
        if (Math.random() < 0.02) {
          positions[i * 3] = (Math.random() - 0.5) * size * 0.5
          positions[i * 3 + 1] = (Math.random() - 0.5) * size * 0.5
          positions[i * 3 + 2] = (Math.random() - 0.5) * size * 0.5
        }
      }
      sparkRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  if (!damaged) return null

  return (
    <group>
      {/* Smoke particles */}
      <points ref={smokeRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[smokePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.1}
          color="#333333"
          transparent
          opacity={0.6}
        />
      </points>

      {/* Electric sparks */}
      <points ref={sparkRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[sparkPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#ffaa00"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

interface WeaponFireProps {
  position: [number, number, number]
  color: string
  firing: boolean
}

function WeaponFire({ position, color, firing }: WeaponFireProps) {
  const laserRef = useRef<THREE.Mesh>(null)
  const flashRef = useRef<THREE.Mesh>(null)
  const firePhase = useRef(0)

  useFrame(({ clock }) => {
    if (!firing) {
      firePhase.current = 0
      return
    }

    // Pulse fire effect
    const t = clock.elapsedTime * 10
    const shouldFire = Math.sin(t) > 0.8

    if (laserRef.current && flashRef.current) {
      if (shouldFire && firePhase.current < 1) {
        firePhase.current = 1
      }

      if (firePhase.current > 0) {
        const mat = laserRef.current.material as THREE.MeshBasicMaterial
        mat.opacity = firePhase.current

        const flashMat = flashRef.current.material as THREE.MeshBasicMaterial
        flashMat.opacity = firePhase.current * 0.8

        laserRef.current.scale.z = firePhase.current * 2

        firePhase.current -= 0.15
      }
    }
  })

  if (!firing) return null

  return (
    <group position={position}>
      {/* Muzzle flash */}
      <mesh ref={flashRef}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Laser beam */}
      <mesh ref={laserRef} position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

interface SelectionRingProps {
  radius: number
  color: string
}

function SelectionRing({ radius, color }: SelectionRingProps) {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = clock.elapsedTime * 0.5
      const scale = 1 + Math.sin(clock.elapsedTime * 3) * 0.05
      ringRef.current.scale.set(scale, scale, 1)
    }
  })

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <ringGeometry args={[radius, radius * 1.15, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// ============================================================================
// SHIP GEOMETRY COMPONENTS
// ============================================================================

interface BaseShipProps extends ShipModelProps {
  config: ShipConfig
}

// Small Cargo
function SmallCargoGeometry({ config, teamColor, damaged }: BaseShipProps) {
  const colors = teamColor ? TEAM_COLORS[teamColor] : null
  const primary = colors?.primary || config.primaryColor
  const secondary = colors?.secondary || config.secondaryColor

  return (
    <group>
      {/* Main body - rounded box */}
      <mesh>
        <boxGeometry args={[0.5, 0.35, 0.9]} />
        <meshStandardMaterial
          color={damaged ? '#666666' : primary}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Cockpit dome */}
      <mesh position={[0, 0.15, 0.3]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color="#aaddff"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Engine pods */}
      <mesh position={[0.2, 0, -0.4]}>
        <cylinderGeometry args={[0.07, 0.1, 0.25, 8]} />
        <meshStandardMaterial color={secondary} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.2, 0, -0.4]}>
        <cylinderGeometry args={[0.07, 0.1, 0.25, 8]} />
        <meshStandardMaterial color={secondary} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Cargo bay lines */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.48, 0.02, 0.6]} />
        <meshStandardMaterial color={secondary} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}

// Large Cargo
function LargeCargoGeometry({ config, teamColor, damaged }: BaseShipProps) {
  const colors = teamColor ? TEAM_COLORS[teamColor] : null
  const primary = colors?.primary || config.primaryColor
  const secondary = colors?.secondary || config.secondaryColor

  return (
    <group>
      {/* Main cargo hold */}
      <mesh>
        <boxGeometry args={[0.9, 0.55, 1.6]} />
        <meshStandardMaterial
          color={damaged ? '#555555' : primary}
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>

      {/* Bridge section */}
      <mesh position={[0, 0.32, 0.55]}>
        <boxGeometry args={[0.45, 0.25, 0.35]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Container segments */}
      {[-0.35, 0, 0.35].map((z, i) => (
        <mesh key={i} position={[0, -0.1, z]}>
          <boxGeometry args={[0.85, 0.15, 0.25]} />
          <meshStandardMaterial color={secondary} metalness={0.5} roughness={0.5} />
        </mesh>
      ))}

      {/* Large engines */}
      <mesh position={[0.35, 0, -0.85]}>
        <cylinderGeometry args={[0.12, 0.18, 0.35, 8]} />
        <meshStandardMaterial color="#555566" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.35, 0, -0.85]}>
        <cylinderGeometry args={[0.12, 0.18, 0.35, 8]} />
        <meshStandardMaterial color="#555566" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

// Light Fighter
function LightFighterGeometry({ config, teamColor, damaged }: BaseShipProps) {
  const colors = teamColor ? TEAM_COLORS[teamColor] : null
  const primary = colors?.primary || config.primaryColor
  const secondary = colors?.secondary || config.secondaryColor

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Fuselage - sleek cone */}
      <mesh>
        <coneGeometry args={[0.12, 0.7, 4]} />
        <meshStandardMaterial
          color={damaged ? '#888888' : primary}
          metalness={0.85}
          roughness={0.15}
        />
      </mesh>

      {/* Delta wings */}
      <mesh position={[0, -0.15, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.55, 0.015, 0.25]} />
        <meshStandardMaterial color={secondary} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Cockpit canopy */}
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial
          color={colors?.accent || '#88ddff'}
          metalness={0.95}
          roughness={0.05}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Wing tip weapons */}
      <mesh position={[0.25, -0.15, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.15, 6]} />
        <meshStandardMaterial color="#444444" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.25, -0.15, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.15, 6]} />
        <meshStandardMaterial color="#444444" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  )
}

// Heavy Fighter
function HeavyFighterGeometry({ config, teamColor, damaged }: BaseShipProps) {
  const colors = teamColor ? TEAM_COLORS[teamColor] : null
  const primary = colors?.primary || config.primaryColor
  const secondary = colors?.secondary || config.secondaryColor

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Main body - heavier cone */}
      <mesh>
        <coneGeometry args={[0.18, 0.9, 6]} />
        <meshStandardMaterial
          color={damaged ? '#444444' : primary}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Armored side panels */}
      <mesh position={[0.14, -0.18, 0]}>
        <boxGeometry args={[0.08, 0.35, 0.22]} />
        <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[-0.14, -0.18, 0]}>
        <boxGeometry args={[0.08, 0.35, 0.22]} />
        <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
      </mesh>

      {/* Double cockpit */}
      <mesh position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color="#aaddff"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Heavy weapon pods */}
      <mesh position={[0.22, -0.1, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.28, 6]} />
        <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.22, -0.1, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.28, 6]} />
        <meshStandardMaterial color="#333333" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Engine nacelles */}
      <mesh position={[0.12, -0.4, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.2, 8]} />
        <meshStandardMaterial color="#555566" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.12, -0.4, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.2, 8]} />
        <meshStandardMaterial color="#555566" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

// Cruiser
function CruiserGeometry({ config, teamColor, damaged }: BaseShipProps) {
  const colors = teamColor ? TEAM_COLORS[teamColor] : null
  const primary = colors?.primary || config.primaryColor
  const secondary = colors?.secondary || config.secondaryColor

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Main hull */}
      <mesh>
        <coneGeometry args={[0.22, 1.3, 8]} />
        <meshStandardMaterial
          color={damaged ? '#444455' : primary}
          metalness={0.75}
          roughness={0.25}
        />
      </mesh>

      {/* Command bridge */}
      <mesh position={[0, 0.45, 0.12]}>
        <boxGeometry args={[0.18, 0.18, 0.22]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Side weapon nacelles */}
      <mesh position={[0.28, -0.15, 0]}>
        <boxGeometry args={[0.12, 0.45, 0.1]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.28, -0.15, 0]}>
        <boxGeometry args={[0.12, 0.45, 0.1]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Turrets */}
      <mesh position={[0.12, 0.2, 0.14]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#445566" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[-0.12, 0.2, 0.14]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#445566" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.35, 0.18]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#445566" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* Triple engines */}
      {[-0.15, 0, 0.15].map((x, i) => (
        <mesh key={i} position={[x, -0.6, 0]}>
          <cylinderGeometry args={[0.05, 0.07, 0.2, 8]} />
          <meshStandardMaterial color="#555566" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

// Battleship
function BattleshipGeometry({ config, teamColor, damaged }: BaseShipProps) {
  const colors = teamColor ? TEAM_COLORS[teamColor] : null
  const primary = colors?.primary || config.primaryColor
  const secondary = colors?.secondary || config.secondaryColor

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Massive main hull */}
      <mesh>
        <coneGeometry args={[0.32, 1.7, 8]} />
        <meshStandardMaterial
          color={damaged ? '#333333' : primary}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Superstructure */}
      <mesh position={[0, 0.35, 0.18]}>
        <boxGeometry args={[0.32, 0.38, 0.32]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Command tower */}
      <mesh position={[0, 0.55, 0.24]}>
        <boxGeometry args={[0.14, 0.18, 0.18]} />
        <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
      </mesh>

      {/* Heavy weapon batteries */}
      <mesh position={[0.22, 0.28, 0.24]}>
        <cylinderGeometry args={[0.05, 0.07, 0.18, 6]} />
        <meshStandardMaterial color="#333344" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[-0.22, 0.28, 0.24]}>
        <cylinderGeometry args={[0.05, 0.07, 0.18, 6]} />
        <meshStandardMaterial color="#333344" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[0.15, 0.5, 0.28]}>
        <cylinderGeometry args={[0.04, 0.05, 0.15, 6]} />
        <meshStandardMaterial color="#333344" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[-0.15, 0.5, 0.28]}>
        <cylinderGeometry args={[0.04, 0.05, 0.15, 6]} />
        <meshStandardMaterial color="#333344" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* Engine block */}
      <mesh position={[0, -0.75, 0]}>
        <boxGeometry args={[0.45, 0.28, 0.32]} />
        <meshStandardMaterial color="#444455" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Quad engines */}
      {[[0.15, 0.1], [-0.15, 0.1], [0.15, -0.1], [-0.15, -0.1]].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.9, z]}>
          <cylinderGeometry args={[0.06, 0.08, 0.25, 8]} />
          <meshStandardMaterial color="#555566" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

// Bomber
function BomberGeometry({ config, teamColor, damaged }: BaseShipProps) {
  const colors = teamColor ? TEAM_COLORS[teamColor] : null
  const primary = colors?.primary || config.primaryColor
  const secondary = colors?.secondary || config.secondaryColor

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Delta wing body */}
      <mesh>
        <coneGeometry args={[0.38, 1.1, 3]} />
        <meshStandardMaterial
          color={damaged ? '#333322' : primary}
          metalness={0.65}
          roughness={0.35}
        />
      </mesh>

      {/* Cockpit */}
      <mesh position={[0, 0.42, 0.08]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial
          color="#aabbcc"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Bomb bay */}
      <mesh position={[0, -0.12, -0.08]}>
        <boxGeometry args={[0.28, 0.38, 0.14]} />
        <meshStandardMaterial color={secondary} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Bomb bay doors */}
      <mesh position={[0.12, -0.12, -0.15]}>
        <boxGeometry args={[0.02, 0.36, 0.02]} />
        <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.12, -0.12, -0.15]}>
        <boxGeometry args={[0.02, 0.36, 0.02]} />
        <meshStandardMaterial color="#222222" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Engine pods */}
      <mesh position={[0.24, -0.45, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.28, 6]} />
        <meshStandardMaterial color="#444433" metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[-0.24, -0.45, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.28, 6]} />
        <meshStandardMaterial color="#444433" metalness={0.75} roughness={0.25} />
      </mesh>
    </group>
  )
}

// Destroyer
function DestroyerGeometry({ config, teamColor, damaged }: BaseShipProps) {
  const colors = teamColor ? TEAM_COLORS[teamColor] : null
  const primary = colors?.primary || config.primaryColor
  const secondary = colors?.secondary || config.secondaryColor

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Aggressive wedge hull */}
      <mesh>
        <coneGeometry args={[0.28, 1.5, 6]} />
        <meshStandardMaterial
          color={damaged ? '#551111' : primary}
          metalness={0.75}
          roughness={0.25}
        />
      </mesh>

      {/* Command section */}
      <mesh position={[0, 0.5, 0.15]}>
        <boxGeometry args={[0.22, 0.22, 0.28]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Main forward turret */}
      <mesh position={[0, 0.68, 0.2]}>
        <cylinderGeometry args={[0.08, 0.1, 0.15, 8]} />
        <meshStandardMaterial color="#333333" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* Heavy side weapons */}
      <mesh position={[0.22, 0.25, 0.12]}>
        <boxGeometry args={[0.08, 0.55, 0.14]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.22, 0.25, 0.12]}>
        <boxGeometry args={[0.08, 0.55, 0.14]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Side turrets */}
      <mesh position={[0.26, 0.35, 0.18]}>
        <cylinderGeometry args={[0.04, 0.05, 0.12, 6]} />
        <meshStandardMaterial color="#333333" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[-0.26, 0.35, 0.18]}>
        <cylinderGeometry args={[0.04, 0.05, 0.12, 6]} />
        <meshStandardMaterial color="#333333" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* Quad engines */}
      {[[0.12, 0.08], [-0.12, 0.08], [0.12, -0.08], [-0.12, -0.08]].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.72, z]}>
          <cylinderGeometry args={[0.055, 0.075, 0.22, 8]} />
          <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

// Deathstar
function DeathstarGeometry({ config, teamColor, damaged }: BaseShipProps) {
  const colors = teamColor ? TEAM_COLORS[teamColor] : null
  const primary = colors?.primary || config.primaryColor
  const secondary = colors?.secondary || config.secondaryColor

  return (
    <group>
      {/* Main sphere */}
      <mesh>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshStandardMaterial
          color={damaged ? '#444444' : primary}
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>

      {/* Equatorial trench */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.4, 0.04, 8, 64]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Super laser crater */}
      <mesh position={[0.75, 0.75, 0.75]}>
        <sphereGeometry args={[0.38, 24, 24, 0, Math.PI]} />
        <meshStandardMaterial color={secondary} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Focus lens */}
      <mesh position={[0.85, 0.85, 0.85]}>
        <cylinderGeometry args={[0.14, 0.14, 0.08, 16]} />
        <meshStandardMaterial
          color={colors?.accent || '#ff00ff'}
          metalness={0.9}
          roughness={0.1}
          emissive={colors?.accent || '#660066'}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Surface details - docking bays */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const x = Math.cos(angle) * 1.22
        const z = Math.sin(angle) * 1.22
        return (
          <mesh key={i} position={[x, 0, z]}>
            <boxGeometry args={[0.18, 0.08, 0.18]} />
            <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
          </mesh>
        )
      })}

      {/* Polar structures */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 0.25, 12]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -1.3, 0]}>
        <cylinderGeometry args={[0.3, 0.2, 0.25, 12]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

// Recycler
function RecyclerGeometry({ config, teamColor, damaged }: BaseShipProps) {
  const colors = teamColor ? TEAM_COLORS[teamColor] : null
  const primary = colors?.primary || config.primaryColor
  const secondary = colors?.secondary || config.secondaryColor

  return (
    <group>
      {/* Main cylindrical body */}
      <mesh>
        <cylinderGeometry args={[0.38, 0.32, 0.75, 12]} />
        <meshStandardMaterial
          color={damaged ? '#666644' : primary}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>

      {/* Collection arms */}
      <mesh position={[0.48, 0, 0.18]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.38, 0.07, 0.07]} />
        <meshStandardMaterial color={secondary} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-0.48, 0, 0.18]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.38, 0.07, 0.07]} />
        <meshStandardMaterial color={secondary} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Collection claws */}
      <mesh position={[0.65, -0.08, 0.18]}>
        <coneGeometry args={[0.07, 0.14, 4]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.65, -0.08, 0.18]}>
        <coneGeometry args={[0.07, 0.14, 4]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Storage container */}
      <mesh position={[0, 0.08, -0.28]}>
        <boxGeometry args={[0.48, 0.32, 0.38]} />
        <meshStandardMaterial color={secondary} metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Cockpit */}
      <mesh position={[0, 0.25, 0.25]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial
          color="#aabbcc"
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Engines */}
      <mesh position={[0.25, 0, -0.42]}>
        <cylinderGeometry args={[0.08, 0.1, 0.18, 8]} />
        <meshStandardMaterial color="#555544" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.25, 0, -0.42]}>
        <cylinderGeometry args={[0.08, 0.1, 0.18, 8]} />
        <meshStandardMaterial color="#555544" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

// Espionage Probe
function EspionageProbeGeometry({ config, damaged }: BaseShipProps) {
  return (
    <group>
      {/* Core octahedron */}
      <mesh>
        <octahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial
          color={damaged ? '#888899' : config.primaryColor}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Antenna */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.14, 4]} />
        <meshStandardMaterial color={config.secondaryColor} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Sensor dish */}
      <mesh position={[0, 0.23, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.04, 0.025, 12]} />
        <meshStandardMaterial color={config.secondaryColor} metalness={0.85} roughness={0.15} />
      </mesh>

      {/* Solar wings */}
      <mesh position={[0.1, 0, 0]}>
        <boxGeometry args={[0.07, 0.015, 0.12]} />
        <meshStandardMaterial
          color="#4466aa"
          metalness={0.3}
          roughness={0.2}
          emissive="#223366"
          emissiveIntensity={0.2}
        />
      </mesh>
      <mesh position={[-0.1, 0, 0]}>
        <boxGeometry args={[0.07, 0.015, 0.12]} />
        <meshStandardMaterial
          color="#4466aa"
          metalness={0.3}
          roughness={0.2}
          emissive="#223366"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  )
}

// Solar Satellite
function SolarSatelliteGeometry({ config, damaged }: BaseShipProps) {
  return (
    <group>
      {/* Central body */}
      <mesh>
        <cylinderGeometry args={[0.06, 0.06, 0.18, 8]} />
        <meshStandardMaterial
          color={damaged ? '#888877' : config.primaryColor}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Solar panels */}
      <mesh position={[0.22, 0, 0]}>
        <boxGeometry args={[0.28, 0.015, 0.38]} />
        <meshStandardMaterial
          color={config.secondaryColor}
          metalness={0.3}
          roughness={0.2}
          emissive="#223366"
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[-0.22, 0, 0]}>
        <boxGeometry args={[0.28, 0.015, 0.38]} />
        <meshStandardMaterial
          color={config.secondaryColor}
          metalness={0.3}
          roughness={0.2}
          emissive="#223366"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Panel grid lines */}
      {[0.22, -0.22].map((x, idx) => (
        <group key={idx}>
          <mesh position={[x, 0.012, 0]}>
            <boxGeometry args={[0.26, 0.004, 0.36]} />
            <meshStandardMaterial color="#2244aa" metalness={0.4} roughness={0.3} />
          </mesh>
          {[-0.12, 0, 0.12].map((z, i) => (
            <mesh key={i} position={[x, 0.01, z]}>
              <boxGeometry args={[0.26, 0.003, 0.003]} />
              <meshStandardMaterial color="#2244aa" metalness={0.4} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

// Colony Ship
function ColonyShipGeometry({ config, teamColor, damaged }: BaseShipProps) {
  const colors = teamColor ? TEAM_COLORS[teamColor] : null
  const primary = colors?.primary || config.primaryColor
  const secondary = colors?.secondary || config.secondaryColor

  return (
    <group>
      {/* Habitat ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.14, 8, 24]} />
        <meshStandardMaterial
          color={damaged ? '#888899' : primary}
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>

      {/* Central hub */}
      <mesh>
        <cylinderGeometry args={[0.14, 0.14, 0.75, 12]} />
        <meshStandardMaterial color={secondary} metalness={0.65} roughness={0.35} />
      </mesh>

      {/* Colony/landing pod */}
      <mesh position={[0, 0.48, 0]}>
        <coneGeometry args={[0.18, 0.28, 8]} />
        <meshStandardMaterial color={secondary} metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Spokes connecting ring */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
        <mesh key={i} position={[Math.cos(angle) * 0.19, 0, Math.sin(angle) * 0.19]} rotation={[0, -angle, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.22, 6]} />
          <meshStandardMaterial color="#667788" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* Engine section */}
      <mesh position={[0, -0.48, 0]}>
        <cylinderGeometry args={[0.18, 0.14, 0.28, 8]} />
        <meshStandardMaterial color="#667788" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

// Battlecruiser
function BattlecruiserGeometry({ config, teamColor, damaged }: BaseShipProps) {
  const colors = teamColor ? TEAM_COLORS[teamColor] : null
  const primary = colors?.primary || config.primaryColor
  const secondary = colors?.secondary || config.secondaryColor

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Streamlined hull */}
      <mesh>
        <coneGeometry args={[0.26, 1.4, 6]} />
        <meshStandardMaterial
          color={damaged ? '#444466' : primary}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Command bridge */}
      <mesh position={[0, 0.48, 0.11]}>
        <boxGeometry args={[0.16, 0.18, 0.18]} />
        <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
      </mesh>

      {/* Wing pylons */}
      <mesh position={[0.28, -0.08, 0]}>
        <boxGeometry args={[0.18, 0.55, 0.07]} />
        <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[-0.28, -0.08, 0]}>
        <boxGeometry args={[0.18, 0.55, 0.07]} />
        <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
      </mesh>

      {/* Wing weapons */}
      <mesh position={[0.38, -0.18, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.18, 6]} />
        <meshStandardMaterial color="#334466" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[-0.38, -0.18, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.18, 6]} />
        <meshStandardMaterial color="#334466" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* Twin engines */}
      <mesh position={[0.15, -0.65, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.22, 8]} />
        <meshStandardMaterial color="#445566" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.15, -0.65, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.22, 8]} />
        <meshStandardMaterial color="#445566" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

// Reaper
function ReaperGeometry({ config, teamColor, damaged }: BaseShipProps) {
  const colors = teamColor ? TEAM_COLORS[teamColor] : null
  const primary = colors?.primary || config.primaryColor
  const secondary = colors?.secondary || config.secondaryColor

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Menacing angular hull */}
      <mesh>
        <coneGeometry args={[0.32, 1.6, 4]} />
        <meshStandardMaterial
          color={damaged ? '#333344' : primary}
          metalness={0.75}
          roughness={0.25}
        />
      </mesh>

      {/* Armored plating */}
      <mesh position={[0, 0.28, 0.18]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.48, 0.48, 0.07]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Heavy weapons array */}
      <mesh position={[0, 0.55, 0.14]}>
        <boxGeometry args={[0.28, 0.14, 0.22]} />
        <meshStandardMaterial color={secondary} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Twin barrel turret */}
      <mesh position={[0.07, 0.65, 0.18]}>
        <cylinderGeometry args={[0.025, 0.025, 0.18, 6]} />
        <meshStandardMaterial color="#223333" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.07, 0.65, 0.18]}>
        <cylinderGeometry args={[0.025, 0.025, 0.18, 6]} />
        <meshStandardMaterial color="#223333" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Massive engines */}
      <mesh position={[0.18, -0.72, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.28, 8]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.18, -0.72, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.28, 8]} />
        <meshStandardMaterial color={secondary} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

// Pathfinder
function PathfinderGeometry({ config, teamColor, damaged }: BaseShipProps) {
  const colors = teamColor ? TEAM_COLORS[teamColor] : null
  const primary = colors?.primary || config.primaryColor
  const secondary = colors?.secondary || config.secondaryColor

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Sleek hull */}
      <mesh>
        <coneGeometry args={[0.2, 0.95, 8]} />
        <meshStandardMaterial
          color={damaged ? '#778899' : primary}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Large sensor dome */}
      <mesh position={[0, 0.38, 0.11]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial
          color={colors?.accent || '#88ddff'}
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Scanning arrays */}
      <mesh position={[0.18, 0.08, 0.07]}>
        <boxGeometry args={[0.09, 0.28, 0.04]} />
        <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[-0.18, 0.08, 0.07]}>
        <boxGeometry args={[0.09, 0.28, 0.04]} />
        <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
      </mesh>

      {/* Communication dishes */}
      <mesh position={[0.12, 0.25, 0.12]} rotation={[Math.PI / 4, 0, 0]}>
        <coneGeometry args={[0.04, 0.02, 12]} />
        <meshStandardMaterial color={secondary} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.12, 0.25, 0.12]} rotation={[Math.PI / 4, 0, 0]}>
        <coneGeometry args={[0.04, 0.02, 12]} />
        <meshStandardMaterial color={secondary} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Engine */}
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.08, 0.06, 0.14, 8]} />
        <meshStandardMaterial color="#778899" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

// ============================================================================
// SHIP MODEL WRAPPER WITH EFFECTS
// ============================================================================

interface ShipModelWrapperProps extends ShipModelProps {
  type: ShipType
}

const ShipModelWrapper = forwardRef<ShipModelRef, ShipModelWrapperProps>(({
  type,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  damaged = false,
  shieldActive = false,
  shieldStrength = 1,
  engineGlow = true,
  firing = false,
  selected = false,
  teamColor,
  onHit,
}, ref) => {
  const groupRef = useRef<THREE.Group>(null)
  const config = SHIP_CONFIGS[type]
  const teamColors = teamColor ? TEAM_COLORS[teamColor] : null
  const finalScale = scale * config.baseScale

  // Determine shield radius based on ship size
  const shieldRadius = useMemo(() => {
    switch (config.size) {
      case 'tiny': return 0.4
      case 'small': return 0.6
      case 'medium': return 1.0
      case 'large': return 1.4
      case 'huge': return 2.0
      default: return 0.8
    }
  }, [config.size])

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    takeDamage: () => {
      onHit?.()
    },
    fireWeapon: () => {
      // Trigger firing animation
    },
    activateShield: () => {
      // Trigger shield activation
    },
    getPosition: () => {
      if (groupRef.current) {
        return groupRef.current.position.clone()
      }
      return new THREE.Vector3(...position)
    },
  }), [onHit, position])

  // Ship geometry selector
  const ShipGeometry = useMemo(() => {
    const baseProps: BaseShipProps = { config, teamColor, damaged }

    switch (type) {
      case 'small_cargo': return <SmallCargoGeometry {...baseProps} />
      case 'large_cargo': return <LargeCargoGeometry {...baseProps} />
      case 'light_fighter': return <LightFighterGeometry {...baseProps} />
      case 'heavy_fighter': return <HeavyFighterGeometry {...baseProps} />
      case 'cruiser': return <CruiserGeometry {...baseProps} />
      case 'battleship': return <BattleshipGeometry {...baseProps} />
      case 'bomber': return <BomberGeometry {...baseProps} />
      case 'destroyer': return <DestroyerGeometry {...baseProps} />
      case 'deathstar': return <DeathstarGeometry {...baseProps} />
      case 'recycler': return <RecyclerGeometry {...baseProps} />
      case 'espionage_probe': return <EspionageProbeGeometry {...baseProps} />
      case 'solar_satellite': return <SolarSatelliteGeometry {...baseProps} />
      case 'colony_ship': return <ColonyShipGeometry {...baseProps} />
      case 'battlecruiser': return <BattlecruiserGeometry {...baseProps} />
      case 'reaper': return <ReaperGeometry {...baseProps} />
      case 'pathfinder': return <PathfinderGeometry {...baseProps} />
      default: return <SmallCargoGeometry {...baseProps} />
    }
  }, [type, config, teamColor, damaged])

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={finalScale}
    >
      {/* Ship geometry */}
      {ShipGeometry}

      {/* Engine effects */}
      {config.enginePoints.map((point, i) => (
        <EngineGlow
          key={`engine-${i}`}
          position={point}
          color={teamColors?.accent || config.engineColor}
          intensity={0.8}
          active={engineGlow}
        />
      ))}

      {/* Weapon fire effects */}
      {config.cannonPoints.map((point, i) => (
        <WeaponFire
          key={`cannon-${i}`}
          position={point}
          color={teamColors?.accent || '#ff3300'}
          firing={firing}
        />
      ))}

      {/* Shield effect */}
      <ShieldMesh
        radius={shieldRadius}
        strength={shieldStrength}
        active={shieldActive}
        teamColor={teamColors?.accent || '#00aaff'}
      />

      {/* Damage effects */}
      <DamageEffects
        damaged={damaged}
        size={shieldRadius}
      />

      {/* Selection indicator */}
      {selected && (
        <SelectionRing
          radius={shieldRadius * 1.2}
          color={teamColors?.accent || '#00ff88'}
        />
      )}
    </group>
  )
})

ShipModelWrapper.displayName = 'ShipModelWrapper'

// ============================================================================
// EXPORTED SHIP COMPONENTS
// ============================================================================

export const SmallCargo = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="small_cargo" {...props} />
))
SmallCargo.displayName = 'SmallCargo'

export const LargeCargo = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="large_cargo" {...props} />
))
LargeCargo.displayName = 'LargeCargo'

export const LightFighter = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="light_fighter" {...props} />
))
LightFighter.displayName = 'LightFighter'

export const HeavyFighter = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="heavy_fighter" {...props} />
))
HeavyFighter.displayName = 'HeavyFighter'

export const Cruiser = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="cruiser" {...props} />
))
Cruiser.displayName = 'Cruiser'

export const Battleship = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="battleship" {...props} />
))
Battleship.displayName = 'Battleship'

export const Bomber = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="bomber" {...props} />
))
Bomber.displayName = 'Bomber'

export const Destroyer = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="destroyer" {...props} />
))
Destroyer.displayName = 'Destroyer'

export const Deathstar = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="deathstar" {...props} />
))
Deathstar.displayName = 'Deathstar'

export const Recycler = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="recycler" {...props} />
))
Recycler.displayName = 'Recycler'

export const EspionageProbe = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="espionage_probe" {...props} />
))
EspionageProbe.displayName = 'EspionageProbe'

export const SolarSatellite = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="solar_satellite" {...props} />
))
SolarSatellite.displayName = 'SolarSatellite'

export const ColonyShip = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="colony_ship" {...props} />
))
ColonyShip.displayName = 'ColonyShip'

export const Battlecruiser = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="battlecruiser" {...props} />
))
Battlecruiser.displayName = 'Battlecruiser'

export const Reaper = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="reaper" {...props} />
))
Reaper.displayName = 'Reaper'

export const Pathfinder = forwardRef<ShipModelRef, ShipModelProps>((props, ref) => (
  <ShipModelWrapper ref={ref} type="pathfinder" {...props} />
))
Pathfinder.displayName = 'Pathfinder'

// ============================================================================
// HELPER FUNCTION TO GET SHIP MODEL
// ============================================================================

/**
 * Returns the appropriate ship component for a given ship type
 * Usage: const ShipComponent = getShipModel('light_fighter')
 */
export function getShipModel(type: ShipType): React.ForwardRefExoticComponent<
  ShipModelProps & React.RefAttributes<ShipModelRef>
> {
  const components: Record<ShipType, React.ForwardRefExoticComponent<
    ShipModelProps & React.RefAttributes<ShipModelRef>
  >> = {
    small_cargo: SmallCargo,
    large_cargo: LargeCargo,
    light_fighter: LightFighter,
    heavy_fighter: HeavyFighter,
    cruiser: Cruiser,
    battleship: Battleship,
    bomber: Bomber,
    destroyer: Destroyer,
    deathstar: Deathstar,
    recycler: Recycler,
    espionage_probe: EspionageProbe,
    solar_satellite: SolarSatellite,
    colony_ship: ColonyShip,
    battlecruiser: Battlecruiser,
    reaper: Reaper,
    pathfinder: Pathfinder,
  }

  return components[type] || SmallCargo
}

/**
 * Generic ship component that accepts type as a prop
 */
export const ShipModel = forwardRef<ShipModelRef, ShipModelProps & { type: ShipType }>((props, ref) => {
  const { type, ...rest } = props
  return <ShipModelWrapper ref={ref} type={type} {...rest} />
})

ShipModel.displayName = 'ShipModel'

/**
 * Get ship configuration data
 */
export function getShipConfig(type: ShipType): ShipConfig {
  return SHIP_CONFIGS[type]
}

/**
 * Get all ship types
 */
export function getAllShipTypes(): ShipType[] {
  return Object.keys(SHIP_CONFIGS) as ShipType[]
}

export default ShipModel
