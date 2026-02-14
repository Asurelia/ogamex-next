'use client'

import { useRef, useState, useMemo } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { BaseScene } from './BaseScene'
import { ActionPanel3D } from './ActionPanel3D'

// ============================================================================
// TYPES
// ============================================================================

export interface BuildingData {
  level: number
  production: number
}

export interface EnergyBuildingData {
  level: number
  energy: number
  consumption?: number
}

export interface ResourcesData {
  metal: number
  crystal: number
  deuterium: number
  energy: number
}

export interface MinesSceneProps {
  buildings: {
    metalMine: BuildingData
    crystalMine: BuildingData
    deuteriumSynthesizer: BuildingData
    solarPlant: EnergyBuildingData
    fusionReactor: EnergyBuildingData & { consumption: number }
  }
  resources: ResourcesData
  onUpgrade: (buildingType: string) => void
  upgradeCosts: Record<string, { metal: number; crystal: number; deuterium: number; time: string }>
  currentlyBuilding?: { type: string; endsAt: Date }
  /** Callback to navigate back */
  onBack?: () => void
}

type BuildingType = 'metalMine' | 'crystalMine' | 'deuteriumSynthesizer' | 'solarPlant' | 'fusionReactor'

// ============================================================================
// CONSTANTS
// ============================================================================

const BUILDING_POSITIONS: Record<BuildingType, [number, number, number]> = {
  metalMine: [-12, 0, 8],
  crystalMine: [12, 0, 8],
  deuteriumSynthesizer: [0, 0, -12],
  solarPlant: [-14, 0, -8],
  fusionReactor: [14, 0, -8],
}

const BUILDING_INFO: Record<BuildingType, { name: string; description: string; productionUnit: string; isEnergy: boolean }> = {
  metalMine: {
    name: 'Metal Mine',
    description: 'Extracts metal ore from the planetary crust. The deeper the mine, the more metal extracted per hour.',
    productionUnit: '/h',
    isEnergy: false,
  },
  crystalMine: {
    name: 'Crystal Mine',
    description: 'Harvests crystalline formations from underground deposits. Essential for advanced technology.',
    productionUnit: '/h',
    isEnergy: false,
  },
  deuteriumSynthesizer: {
    name: 'Deuterium Synthesizer',
    description: 'Extracts heavy hydrogen from the atmosphere or ocean. Used for fuel and fusion reactors.',
    productionUnit: '/h',
    isEnergy: false,
  },
  solarPlant: {
    name: 'Solar Plant',
    description: 'Converts stellar radiation into electrical energy. Clean and reliable power source.',
    productionUnit: ' energy',
    isEnergy: true,
  },
  fusionReactor: {
    name: 'Fusion Reactor',
    description: 'Generates massive energy through nuclear fusion. Consumes deuterium but produces enormous power.',
    productionUnit: ' energy',
    isEnergy: true,
  },
}

// ============================================================================
// TERRAIN COMPONENT
// ============================================================================

function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null)

  // Create heightmap geometry
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(80, 80, 64, 64)
    const positions = geo.attributes.position

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      // Generate rocky terrain with noise
      const height =
        Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 +
        Math.sin(x * 0.3 + 1) * Math.cos(y * 0.2) * 0.3 +
        Math.sin(x * 0.5 + 2) * Math.cos(y * 0.4) * 0.2
      positions.setZ(i, height)
    }

    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <group>
      {/* Main terrain */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#3a3a3a"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Rocky accent patches */}
      {[[-20, -15], [25, 10], [-15, 20], [18, -18]].map(([x, z], i) => (
        <mesh
          key={i}
          position={[x, -0.3, z]}
          rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]}
          receiveShadow
        >
          <circleGeometry args={[4 + Math.random() * 3, 8]} />
          <meshStandardMaterial
            color="#4a3a30"
            roughness={1}
            metalness={0}
          />
        </mesh>
      ))}
    </group>
  )
}

// ============================================================================
// PARTICLE SYSTEM COMPONENTS
// ============================================================================

interface ParticlesProps {
  count: number
  color: string
  position: [number, number, number]
  spread?: number
  speed?: number
  size?: number
}

function RisingParticles({ count, color, position, spread = 1, speed = 0.5, size = 0.08 }: ParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null)

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread
      pos[i * 3 + 1] = Math.random() * 3
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread
      vel[i] = 0.5 + Math.random() * speed
    }

    return { positions: pos, velocities: vel }
  }, [count, spread, speed])

  useFrame((_, delta) => {
    if (!particlesRef.current) return

    const posAttr = particlesRef.current.geometry.attributes.position
    const posArray = posAttr.array as Float32Array

    for (let i = 0; i < count; i++) {
      posArray[i * 3 + 1] += velocities[i] * delta

      if (posArray[i * 3 + 1] > 4) {
        posArray[i * 3 + 1] = 0
        posArray[i * 3] = (Math.random() - 0.5) * spread
        posArray[i * 3 + 2] = (Math.random() - 0.5) * spread
      }
    }

    posAttr.needsUpdate = true
  })

  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

// ============================================================================
// BUILDING COMPONENTS
// ============================================================================

interface BuildingLabelProps {
  name: string
  level: number
  position: [number, number, number]
  isSelected: boolean
}

function BuildingLabel({ name, level, position, isSelected }: BuildingLabelProps) {
  return (
    <Html position={position} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
      <div
        className={`
          px-3 py-1.5 rounded-lg text-xs whitespace-nowrap select-none
          transition-all duration-200
          ${isSelected
            ? 'bg-cyan-500/90 text-white font-bold border-2 border-cyan-300 shadow-lg shadow-cyan-500/50'
            : 'bg-slate-900/85 text-slate-200 border border-slate-600'
          }
        `}
      >
        <div className="font-medium">{name}</div>
        <div className="text-center mt-0.5">
          <span className={`font-mono font-bold ${isSelected ? 'text-white' : 'text-cyan-400'}`}>
            Lv.{level}
          </span>
        </div>
      </div>
    </Html>
  )
}

// ============================================================================
// METAL MINE
// ============================================================================

interface MetalMineProps {
  level: number
  isSelected: boolean
  onClick: () => void
  position: [number, number, number]
}

function MetalMine({ level, isSelected, onClick, position }: MetalMineProps) {
  const conveyorRef = useRef<THREE.Group>(null)
  const wheelRef1 = useRef<THREE.Mesh>(null)
  const wheelRef2 = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    // Animate conveyor and wheels
    if (wheelRef1.current) wheelRef1.current.rotation.x += delta * 2
    if (wheelRef2.current) wheelRef2.current.rotation.x += delta * 2
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onClick()
  }

  const scale = 1 + level * 0.05

  return (
    <group position={position} scale={scale} onClick={handleClick}>
      {/* Main structure */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[3, 3, 2.5]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.7} metalness={0.5} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <coneGeometry args={[2, 1, 4]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.8} metalness={0.4} />
      </mesh>

      {/* Smokestack */}
      <mesh position={[1, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.4, 2.5]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.9} metalness={0.3} />
      </mesh>

      {/* Conveyor belt structure */}
      <group ref={conveyorRef} position={[-2.5, 0.5, 0]} rotation={[0, 0, -0.3]}>
        <mesh castShadow>
          <boxGeometry args={[3, 0.3, 1]} />
          <meshStandardMaterial color="#666666" roughness={0.8} metalness={0.6} />
        </mesh>
        {/* Conveyor wheels */}
        <mesh ref={wheelRef1} position={[-1.2, 0, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 1.1, 12]} />
          <meshStandardMaterial color="#333333" roughness={0.5} metalness={0.8} />
        </mesh>
        <mesh ref={wheelRef2} position={[1.2, 0, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 1.1, 12]} />
          <meshStandardMaterial color="#333333" roughness={0.5} metalness={0.8} />
        </mesh>
      </group>

      {/* Mining pit entrance */}
      <mesh position={[-1.5, 0.3, 0]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[1.5, 0.8, 1.5]} />
        <meshStandardMaterial color="#2a2a2a" roughness={1} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[3.5, 4, 32]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Smoke particles */}
      <RisingParticles count={20} color="#888888" position={[1, 3.5, 0]} spread={0.3} speed={0.8} />

      {/* Label */}
      <BuildingLabel name="Metal Mine" level={level} position={[0, 5, 0]} isSelected={isSelected} />
    </group>
  )
}

// ============================================================================
// CRYSTAL MINE
// ============================================================================

interface CrystalMineProps {
  level: number
  isSelected: boolean
  onClick: () => void
  position: [number, number, number]
}

function CrystalMine({ level, isSelected, onClick, position }: CrystalMineProps) {
  const crystalsRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (crystalsRef.current) {
      crystalsRef.current.children.forEach((crystal, i) => {
        const mesh = crystal as THREE.Mesh
        const emissive = (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity
        const pulse = 0.5 + Math.sin(clock.elapsedTime * 2 + i * 0.5) * 0.3
        ;(mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse
      })
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onClick()
  }

  const scale = 1 + level * 0.05

  return (
    <group position={position} scale={scale} onClick={handleClick}>
      {/* Cavern entrance */}
      <mesh position={[0, 1, 0]} castShadow>
        <sphereGeometry args={[2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2a3540" roughness={0.9} metalness={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Rock formation around entrance */}
      <mesh position={[-1.5, 0.8, 0.8]} rotation={[0.2, 0.3, 0.1]} castShadow>
        <dodecahedronGeometry args={[0.8]} />
        <meshStandardMaterial color="#3a4550" roughness={1} />
      </mesh>
      <mesh position={[1.8, 0.6, 0.5]} rotation={[-0.1, 0.5, 0.2]} castShadow>
        <dodecahedronGeometry args={[0.6]} />
        <meshStandardMaterial color="#3a4550" roughness={1} />
      </mesh>

      {/* Crystal formations */}
      <group ref={crystalsRef}>
        {/* Main crystal cluster */}
        <mesh position={[0, 1.5, -0.5]} rotation={[0.2, 0.3, 0.1]} castShadow>
          <coneGeometry args={[0.3, 1.5, 6]} />
          <meshStandardMaterial
            color="#44ddff"
            emissive="#00aaff"
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.8}
            transparent
            opacity={0.9}
          />
        </mesh>
        <mesh position={[0.4, 1.2, -0.3]} rotation={[-0.3, 0.5, -0.1]} castShadow>
          <coneGeometry args={[0.2, 1, 6]} />
          <meshStandardMaterial
            color="#66eeff"
            emissive="#00ccff"
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.8}
            transparent
            opacity={0.85}
          />
        </mesh>
        <mesh position={[-0.5, 1.3, -0.2]} rotation={[0.4, -0.2, 0.15]} castShadow>
          <coneGeometry args={[0.25, 1.2, 6]} />
          <meshStandardMaterial
            color="#88ffff"
            emissive="#00ddff"
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.8}
            transparent
            opacity={0.88}
          />
        </mesh>
        {/* Side crystals */}
        <mesh position={[1.2, 0.8, 0]} rotation={[0.5, 0.8, 0.3]} castShadow>
          <coneGeometry args={[0.15, 0.8, 6]} />
          <meshStandardMaterial
            color="#55ddff"
            emissive="#00bbff"
            emissiveIntensity={0.4}
            roughness={0.3}
            metalness={0.7}
            transparent
            opacity={0.8}
          />
        </mesh>
        <mesh position={[-1.3, 0.7, 0.2]} rotation={[-0.4, -0.6, -0.2]} castShadow>
          <coneGeometry args={[0.18, 0.9, 6]} />
          <meshStandardMaterial
            color="#66eeff"
            emissive="#00ccff"
            emissiveIntensity={0.4}
            roughness={0.3}
            metalness={0.7}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>

      {/* Mining equipment */}
      <mesh position={[2, 0.4, 0]} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color="#555566" roughness={0.6} metalness={0.7} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[3, 3.5, 32]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Crystal glow point light */}
      <pointLight position={[0, 2, 0]} color="#00ccff" intensity={0.8} distance={6} />

      {/* Label */}
      <BuildingLabel name="Crystal Mine" level={level} position={[0, 4.5, 0]} isSelected={isSelected} />
    </group>
  )
}

// ============================================================================
// DEUTERIUM SYNTHESIZER
// ============================================================================

interface DeuteriumSynthesizerProps {
  level: number
  isSelected: boolean
  onClick: () => void
  position: [number, number, number]
}

function DeuteriumSynthesizer({ level, isSelected, onClick, position }: DeuteriumSynthesizerProps) {
  const tankRef = useRef<THREE.Mesh>(null)
  const bubbleRef = useRef<THREE.Points>(null)

  useFrame(({ clock }) => {
    // Subtle tank wobble
    if (tankRef.current) {
      tankRef.current.position.y = 1.5 + Math.sin(clock.elapsedTime * 2) * 0.02
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onClick()
  }

  const scale = 1 + level * 0.05

  return (
    <group position={position} scale={scale} onClick={handleClick}>
      {/* Main tank */}
      <mesh ref={tankRef} position={[0, 1.5, 0]} castShadow>
        <capsuleGeometry args={[1, 2, 8, 16]} />
        <meshStandardMaterial
          color="#225544"
          roughness={0.3}
          metalness={0.7}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Inner glow effect */}
      <mesh position={[0, 1.5, 0]}>
        <capsuleGeometry args={[0.9, 1.8, 8, 16]} />
        <meshBasicMaterial color="#44ff88" transparent opacity={0.3} />
      </mesh>

      {/* Support structure */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[1.3, 1.5, 0.5, 8]} />
        <meshStandardMaterial color="#445566" roughness={0.7} metalness={0.5} />
      </mesh>

      {/* Pipes */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
        <mesh
          key={i}
          position={[Math.cos(angle) * 1.2, 1, Math.sin(angle) * 1.2]}
          rotation={[0, 0, Math.PI / 4]}
          castShadow
        >
          <cylinderGeometry args={[0.1, 0.1, 1.5, 8]} />
          <meshStandardMaterial color="#556677" roughness={0.5} metalness={0.6} />
        </mesh>
      ))}

      {/* Top valve */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.4, 0.4, 8]} />
        <meshStandardMaterial color="#667788" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Secondary smaller tanks */}
      <mesh position={[-1.8, 1, 0]} castShadow>
        <capsuleGeometry args={[0.4, 0.8, 6, 12]} />
        <meshStandardMaterial color="#336655" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[1.8, 1, 0]} castShadow>
        <capsuleGeometry args={[0.4, 0.8, 6, 12]} />
        <meshStandardMaterial color="#336655" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[3.5, 4, 32]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Steam/vapor particles */}
      <RisingParticles count={30} color="#88ffaa" position={[0, 3.5, 0]} spread={0.5} speed={0.6} size={0.06} />

      {/* Glow light */}
      <pointLight position={[0, 1.5, 0]} color="#44ff88" intensity={0.6} distance={5} />

      {/* Label */}
      <BuildingLabel name="Deuterium Synth." level={level} position={[0, 5.5, 0]} isSelected={isSelected} />
    </group>
  )
}

// ============================================================================
// SOLAR PLANT
// ============================================================================

interface SolarPlantProps {
  level: number
  isSelected: boolean
  onClick: () => void
  position: [number, number, number]
}

function SolarPlant({ level, isSelected, onClick, position }: SolarPlantProps) {
  const panelsRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    // Slow panel tracking (following sun)
    if (panelsRef.current) {
      panelsRef.current.rotation.x = -0.3 + Math.sin(clock.elapsedTime * 0.1) * 0.1
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onClick()
  }

  const scale = 1 + level * 0.04

  // Generate panel grid based on level
  const panelCount = Math.min(3 + Math.floor(level / 3), 6)

  return (
    <group position={position} scale={scale} onClick={handleClick}>
      {/* Base structure */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[2, 0.6, 2]} />
        <meshStandardMaterial color="#556677" roughness={0.6} metalness={0.5} />
      </mesh>

      {/* Panel array */}
      <group ref={panelsRef} position={[0, 2, 0]}>
        {Array.from({ length: panelCount }).map((_, i) => {
          const row = Math.floor(i / 3)
          const col = i % 3
          const offsetX = (col - 1) * 2.2
          const offsetZ = (row - 0.5) * 2
          return (
            <group key={i} position={[offsetX, row * 0.5, offsetZ]}>
              {/* Panel frame */}
              <mesh castShadow>
                <boxGeometry args={[2, 0.1, 1.5]} />
                <meshStandardMaterial color="#333344" roughness={0.4} metalness={0.7} />
              </mesh>
              {/* Solar cells */}
              <mesh position={[0, 0.06, 0]}>
                <boxGeometry args={[1.9, 0.02, 1.4]} />
                <meshStandardMaterial
                  color="#112244"
                  roughness={0.1}
                  metalness={0.9}
                  emissive="#0044aa"
                  emissiveIntensity={0.3}
                />
              </mesh>
              {/* Reflective surface */}
              <mesh position={[0, 0.08, 0]}>
                <boxGeometry args={[1.85, 0.01, 1.35]} />
                <meshBasicMaterial color="#4488ff" transparent opacity={0.2} />
              </mesh>
            </group>
          )
        })}

        {/* Support struts */}
        <mesh position={[0, -1, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.2, 2, 8]} />
          <meshStandardMaterial color="#445566" roughness={0.5} metalness={0.6} />
        </mesh>
      </group>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[4, 4.5, 32]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Energy glow */}
      <pointLight position={[0, 3, 0]} color="#4488ff" intensity={0.4} distance={6} />

      {/* Label */}
      <BuildingLabel name="Solar Plant" level={level} position={[0, 5, 0]} isSelected={isSelected} />
    </group>
  )
}

// ============================================================================
// FUSION REACTOR
// ============================================================================

interface FusionReactorProps {
  level: number
  isSelected: boolean
  onClick: () => void
  position: [number, number, number]
}

function FusionReactor({ level, isSelected, onClick, position }: FusionReactorProps) {
  const plasmaRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    // Plasma core pulsing
    if (plasmaRef.current) {
      const scale = 0.9 + Math.sin(clock.elapsedTime * 3) * 0.1
      plasmaRef.current.scale.setScalar(scale)
      ;(plasmaRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.6 + Math.sin(clock.elapsedTime * 5) * 0.2
    }
    // Ring rotation
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.02
      ringRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.5) * 0.1
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onClick()
  }

  const scale = 1 + level * 0.06

  return (
    <group position={position} scale={scale} onClick={handleClick}>
      {/* Main dome */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#334455"
          roughness={0.3}
          metalness={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Base ring */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[2.2, 2.5, 0.6, 16]} />
        <meshStandardMaterial color="#445566" roughness={0.5} metalness={0.7} />
      </mesh>

      {/* Plasma core */}
      <mesh ref={plasmaRef} position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color="#ff44ff"
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Inner glow sphere */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color="#ff88ff" transparent opacity={0.2} />
      </mesh>

      {/* Rotating energy ring */}
      <mesh ref={ringRef} position={[0, 1.2, 0]}>
        <torusGeometry args={[1.5, 0.05, 8, 32]} />
        <meshBasicMaterial color="#ff66ff" transparent opacity={0.8} />
      </mesh>

      {/* Support pillars */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
        <mesh
          key={i}
          position={[Math.cos(angle) * 1.8, 0.8, Math.sin(angle) * 1.8]}
          castShadow
        >
          <cylinderGeometry args={[0.15, 0.2, 1.6, 6]} />
          <meshStandardMaterial color="#556677" roughness={0.5} metalness={0.6} />
        </mesh>
      ))}

      {/* Cooling vents */}
      <mesh position={[2.3, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 8]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.8} metalness={0.4} />
      </mesh>
      <mesh position={[-2.3, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 8]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.8} metalness={0.4} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[3.5, 4, 32]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Energy particles */}
      <RisingParticles count={40} color="#ff88ff" position={[0, 2, 0]} spread={1.5} speed={1} size={0.05} />

      {/* Core light */}
      <pointLight position={[0, 1.2, 0]} color="#ff44ff" intensity={1.5} distance={8} />

      {/* Label */}
      <BuildingLabel name="Fusion Reactor" level={level} position={[0, 5, 0]} isSelected={isSelected} />
    </group>
  )
}

// ============================================================================
// MAIN SCENE
// ============================================================================

function MinesSceneContent({
  buildings,
  resources,
  onUpgrade,
  upgradeCosts,
  currentlyBuilding,
}: MinesSceneProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null)

  const handleBuildingClick = (type: BuildingType) => {
    setSelectedBuilding(type === selectedBuilding ? null : type)
  }

  const handleClosePanel = () => {
    setSelectedBuilding(null)
  }

  const handleUpgrade = () => {
    if (selectedBuilding) {
      onUpgrade(selectedBuilding)
    }
  }

  const getProductionPerHour = (type: BuildingType) => {
    switch (type) {
      case 'metalMine':
        return { metal: buildings.metalMine.production }
      case 'crystalMine':
        return { crystal: buildings.crystalMine.production }
      case 'deuteriumSynthesizer':
        return { deuterium: buildings.deuteriumSynthesizer.production }
      case 'solarPlant':
        return { energy: buildings.solarPlant.energy }
      case 'fusionReactor':
        return { energy: buildings.fusionReactor.energy }
    }
  }

  const getBuildingLevel = (type: BuildingType): number => {
    switch (type) {
      case 'metalMine':
        return buildings.metalMine.level
      case 'crystalMine':
        return buildings.crystalMine.level
      case 'deuteriumSynthesizer':
        return buildings.deuteriumSynthesizer.level
      case 'solarPlant':
        return buildings.solarPlant.level
      case 'fusionReactor':
        return buildings.fusionReactor.level
    }
  }

  const canAffordUpgrade = (type: BuildingType): boolean => {
    const cost = upgradeCosts[type]
    if (!cost) return false
    return (
      resources.metal >= cost.metal &&
      resources.crystal >= cost.crystal &&
      resources.deuterium >= cost.deuterium
    )
  }

  const getCost = (type: BuildingType) => {
    const cost = upgradeCosts[type] || { metal: 0, crystal: 0, deuterium: 0, time: '0s' }
    return {
      metal: cost.metal,
      crystal: cost.crystal,
      deuterium: cost.deuterium,
    }
  }

  const getBuildTime = (type: BuildingType): string => {
    return upgradeCosts[type]?.time || '0s'
  }

  return (
    <>
      {/* Terrain */}
      <Terrain />

      {/* Metal Mine */}
      <MetalMine
        level={buildings.metalMine.level}
        isSelected={selectedBuilding === 'metalMine'}
        onClick={() => handleBuildingClick('metalMine')}
        position={BUILDING_POSITIONS.metalMine}
      />

      {/* Crystal Mine */}
      <CrystalMine
        level={buildings.crystalMine.level}
        isSelected={selectedBuilding === 'crystalMine'}
        onClick={() => handleBuildingClick('crystalMine')}
        position={BUILDING_POSITIONS.crystalMine}
      />

      {/* Deuterium Synthesizer */}
      <DeuteriumSynthesizer
        level={buildings.deuteriumSynthesizer.level}
        isSelected={selectedBuilding === 'deuteriumSynthesizer'}
        onClick={() => handleBuildingClick('deuteriumSynthesizer')}
        position={BUILDING_POSITIONS.deuteriumSynthesizer}
      />

      {/* Solar Plant */}
      <SolarPlant
        level={buildings.solarPlant.level}
        isSelected={selectedBuilding === 'solarPlant'}
        onClick={() => handleBuildingClick('solarPlant')}
        position={BUILDING_POSITIONS.solarPlant}
      />

      {/* Fusion Reactor */}
      <FusionReactor
        level={buildings.fusionReactor.level}
        isSelected={selectedBuilding === 'fusionReactor'}
        onClick={() => handleBuildingClick('fusionReactor')}
        position={BUILDING_POSITIONS.fusionReactor}
      />

      {/* Action Panel */}
      {selectedBuilding && (
        <group position={BUILDING_POSITIONS[selectedBuilding]}>
          <ActionPanel3D
            isOpen={true}
            onClose={handleClosePanel}
            title={BUILDING_INFO[selectedBuilding].name}
            level={getBuildingLevel(selectedBuilding)}
            cost={getCost(selectedBuilding)}
            productionPerHour={getProductionPerHour(selectedBuilding)}
            buildTime={getBuildTime(selectedBuilding)}
            canAfford={canAffordUpgrade(selectedBuilding)}
            isEnergyProducer={BUILDING_INFO[selectedBuilding].isEnergy}
            energyConsumption={selectedBuilding === 'fusionReactor' ? buildings.fusionReactor.consumption : undefined}
            description={BUILDING_INFO[selectedBuilding].description}
            onUpgrade={handleUpgrade}
            isBuilding={currentlyBuilding?.type === selectedBuilding}
            buildingEndsAt={currentlyBuilding?.type === selectedBuilding ? currentlyBuilding.endsAt : undefined}
            position={[0, 6, 0]}
          />
        </group>
      )}
    </>
  )
}

/**
 * MinesScene - 3D immersive view of mining installations
 *
 * Displays all resource production buildings in a 3D environment with:
 * - Interactive buildings with click selection
 * - Level indicators floating above each structure
 * - Animated effects (particles, rotations, glows)
 * - Action panel for upgrades when a building is selected
 * - Sci-fi low-poly aesthetic
 */
export function MinesScene({ onBack, ...props }: MinesSceneProps) {
  return (
    <BaseScene
      environment="surface"
      lighting="industrial"
      title="Resource District"
      onBack={onBack}
      showBackButton={!!onBack}
      cameraPosition={[0, 25, 35]}
      cameraFov={55}
      minDistance={15}
      maxDistance={80}
      loadingText="Loading mines..."
    >
      <MinesSceneContent {...props} />
    </BaseScene>
  )
}

export default MinesScene
