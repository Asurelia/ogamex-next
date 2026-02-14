'use client'

import { useRef, useState, useMemo, useCallback, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Float } from '@react-three/drei'
import * as THREE from 'three'

import { Starfield } from '@/components/game/3d'
import { SpaceEffectsLight } from '@/lib/3d/effects'

// ============================================================================
// TYPES
// ============================================================================

interface ShipData {
  type: string
  name: string
  count: number
  cost: { metal: number; crystal: number; deuterium: number }
  buildTime: string
  attack: number
  shield: number
  cargo: number
}

interface BuildingProgress {
  type: string
  count: number
  endsAt: Date
  progress: number
}

export interface ShipyardSceneProps {
  ships: ShipData[]
  currentlyBuilding?: BuildingProgress
  resources: { metal: number; crystal: number; deuterium: number }
  onBuild: (shipType: string, count: number) => void
  onCancelBuild?: () => void
}

// ============================================================================
// SHIP TYPE GEOMETRY DEFINITIONS
// ============================================================================

// Ship geometries mapped by type key
const SHIP_CONFIGS: Record<string, {
  scale: number
  color: string
  engineColor: string
  description: string
}> = {
  small_cargo: { scale: 0.6, color: '#88aacc', engineColor: '#00ccff', description: 'Small transport vessel' },
  large_cargo: { scale: 1.2, color: '#8899bb', engineColor: '#00ccff', description: 'Large cargo freighter' },
  light_fighter: { scale: 0.5, color: '#aabbff', engineColor: '#ff6600', description: 'Fast attack fighter' },
  heavy_fighter: { scale: 0.7, color: '#99aaee', engineColor: '#ff4400', description: 'Armored interceptor' },
  cruiser: { scale: 1.0, color: '#7788cc', engineColor: '#ff3300', description: 'Medium warship' },
  battleship: { scale: 1.5, color: '#6677bb', engineColor: '#ff2200', description: 'Heavy battleship' },
  recycler: { scale: 0.9, color: '#99aa88', engineColor: '#44ff44', description: 'Debris collector' },
  espionage_probe: { scale: 0.3, color: '#ccddff', engineColor: '#00ffff', description: 'Stealth drone' },
  bomber: { scale: 1.1, color: '#888899', engineColor: '#ff0066', description: 'Strategic bomber' },
  destroyer: { scale: 1.3, color: '#556688', engineColor: '#ff0000', description: 'Fleet destroyer' },
  deathstar: { scale: 3.0, color: '#444455', engineColor: '#ff00ff', description: 'Ultimate weapon' },
  solar_satellite: { scale: 0.4, color: '#ffdd88', engineColor: '#ffff00', description: 'Energy collector' },
  colony_ship: { scale: 1.0, color: '#aabbcc', engineColor: '#00ffaa', description: 'Colonization vessel' },
  battlecruiser: { scale: 1.2, color: '#5566aa', engineColor: '#ff4400', description: 'Fast battlecruiser' },
  reaper: { scale: 1.4, color: '#445566', engineColor: '#cc00ff', description: 'Heavy assault ship' },
  pathfinder: { scale: 0.8, color: '#aaccee', engineColor: '#00ffcc', description: 'Exploration vessel' },
}

// ============================================================================
// SUB-COMPONENTS: SHIP GEOMETRIES
// ============================================================================

interface ShipGeometryProps {
  type: string
  incomplete?: boolean
  progress?: number
}

function SmallCargoGeometry() {
  return (
    <group>
      {/* Main body - rounded box */}
      <mesh>
        <boxGeometry args={[0.6, 0.4, 1.0]} />
        <meshStandardMaterial color="#88aacc" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Cockpit */}
      <mesh position={[0, 0.15, 0.35]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#aaddff" metalness={0.9} roughness={0.1} transparent opacity={0.8} />
      </mesh>
      {/* Engine pods */}
      <mesh position={[0.25, 0, -0.4]}>
        <cylinderGeometry args={[0.08, 0.12, 0.3, 8]} />
        <meshStandardMaterial color="#666688" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.25, 0, -0.4]}>
        <cylinderGeometry args={[0.08, 0.12, 0.3, 8]} />
        <meshStandardMaterial color="#666688" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

function LargeCargoGeometry() {
  return (
    <group>
      {/* Main cargo hold */}
      <mesh>
        <boxGeometry args={[1.0, 0.6, 1.8]} />
        <meshStandardMaterial color="#8899bb" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Bridge section */}
      <mesh position={[0, 0.35, 0.6]}>
        <boxGeometry args={[0.5, 0.3, 0.4]} />
        <meshStandardMaterial color="#99aacc" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Cargo bay details */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[0.9, 0.2, 1.6]} />
        <meshStandardMaterial color="#667799" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Large engines */}
      <mesh position={[0.35, 0, -0.9]}>
        <cylinderGeometry args={[0.15, 0.2, 0.4, 8]} />
        <meshStandardMaterial color="#555577" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.35, 0, -0.9]}>
        <cylinderGeometry args={[0.15, 0.2, 0.4, 8]} />
        <meshStandardMaterial color="#555577" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

function LightFighterGeometry() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Fuselage */}
      <mesh>
        <coneGeometry args={[0.15, 0.8, 4]} />
        <meshStandardMaterial color="#aabbff" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Wings */}
      <mesh position={[0, -0.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.6, 0.02, 0.3]} />
        <meshStandardMaterial color="#8899dd" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Cockpit */}
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#88ddff" metalness={0.9} roughness={0.1} transparent opacity={0.7} />
      </mesh>
    </group>
  )
}

function HeavyFighterGeometry() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Main body */}
      <mesh>
        <coneGeometry args={[0.2, 1.0, 6]} />
        <meshStandardMaterial color="#99aaee" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Side armor */}
      <mesh position={[0.15, -0.2, 0]}>
        <boxGeometry args={[0.1, 0.4, 0.25]} />
        <meshStandardMaterial color="#8899cc" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.15, -0.2, 0]}>
        <boxGeometry args={[0.1, 0.4, 0.25]} />
        <meshStandardMaterial color="#8899cc" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Cockpit */}
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#aaddff" metalness={0.9} roughness={0.1} transparent opacity={0.7} />
      </mesh>
      {/* Weapon pods */}
      <mesh position={[0.25, -0.1, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 6]} />
        <meshStandardMaterial color="#666688" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.25, -0.1, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 6]} />
        <meshStandardMaterial color="#666688" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  )
}

function CruiserGeometry() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Main hull */}
      <mesh>
        <coneGeometry args={[0.25, 1.4, 8]} />
        <meshStandardMaterial color="#7788cc" metalness={0.75} roughness={0.25} />
      </mesh>
      {/* Bridge */}
      <mesh position={[0, 0.5, 0.1]}>
        <boxGeometry args={[0.2, 0.2, 0.25]} />
        <meshStandardMaterial color="#8899dd" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Side wings/nacelles */}
      <mesh position={[0.3, -0.2, 0]}>
        <boxGeometry args={[0.15, 0.5, 0.12]} />
        <meshStandardMaterial color="#6677bb" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.3, -0.2, 0]}>
        <boxGeometry args={[0.15, 0.5, 0.12]} />
        <meshStandardMaterial color="#6677bb" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Weapon turrets */}
      <mesh position={[0.15, 0.2, 0.15]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#555577" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.15, 0.2, 0.15]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#555577" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

function BattleshipGeometry() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Main hull */}
      <mesh>
        <coneGeometry args={[0.35, 1.8, 8]} />
        <meshStandardMaterial color="#6677bb" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Superstructure */}
      <mesh position={[0, 0.4, 0.18]}>
        <boxGeometry args={[0.35, 0.4, 0.35]} />
        <meshStandardMaterial color="#7788cc" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Command tower */}
      <mesh position={[0, 0.6, 0.25]}>
        <boxGeometry args={[0.15, 0.2, 0.2]} />
        <meshStandardMaterial color="#8899dd" metalness={0.75} roughness={0.25} />
      </mesh>
      {/* Heavy weapon batteries */}
      <mesh position={[0.25, 0.3, 0.25]}>
        <cylinderGeometry args={[0.06, 0.08, 0.2, 6]} />
        <meshStandardMaterial color="#444466" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[-0.25, 0.3, 0.25]}>
        <cylinderGeometry args={[0.06, 0.08, 0.2, 6]} />
        <meshStandardMaterial color="#444466" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Engine block */}
      <mesh position={[0, -0.8, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.35]} />
        <meshStandardMaterial color="#555588" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

function RecyclerGeometry() {
  return (
    <group>
      {/* Main body */}
      <mesh>
        <cylinderGeometry args={[0.4, 0.35, 0.8, 12]} />
        <meshStandardMaterial color="#99aa88" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Collection arms */}
      <mesh position={[0.5, 0, 0.2]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.4, 0.08, 0.08]} />
        <meshStandardMaterial color="#778866" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-0.5, 0, 0.2]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.4, 0.08, 0.08]} />
        <meshStandardMaterial color="#778866" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Collection claws */}
      <mesh position={[0.7, -0.1, 0.2]}>
        <coneGeometry args={[0.08, 0.15, 4]} />
        <meshStandardMaterial color="#667755" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.7, -0.1, 0.2]}>
        <coneGeometry args={[0.08, 0.15, 4]} />
        <meshStandardMaterial color="#667755" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Storage container */}
      <mesh position={[0, 0.1, -0.3]}>
        <boxGeometry args={[0.5, 0.35, 0.4]} />
        <meshStandardMaterial color="#889977" metalness={0.4} roughness={0.6} />
      </mesh>
    </group>
  )
}

function EspionageProbeGeometry() {
  return (
    <group>
      {/* Core */}
      <mesh>
        <octahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial color="#ccddff" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Antenna array */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.15, 4]} />
        <meshStandardMaterial color="#aabbcc" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Sensor dish */}
      <mesh position={[0, 0.25, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.05, 0.03, 12]} />
        <meshStandardMaterial color="#88aacc" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Solar wings */}
      <mesh position={[0.12, 0, 0]}>
        <boxGeometry args={[0.08, 0.02, 0.15]} />
        <meshStandardMaterial color="#4466aa" metalness={0.3} roughness={0.2} />
      </mesh>
      <mesh position={[-0.12, 0, 0]}>
        <boxGeometry args={[0.08, 0.02, 0.15]} />
        <meshStandardMaterial color="#4466aa" metalness={0.3} roughness={0.2} />
      </mesh>
    </group>
  )
}

function BomberGeometry() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Main body - delta wing */}
      <mesh>
        <coneGeometry args={[0.4, 1.2, 3]} />
        <meshStandardMaterial color="#888899" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Cockpit */}
      <mesh position={[0, 0.45, 0.08]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#aabbcc" metalness={0.9} roughness={0.1} transparent opacity={0.6} />
      </mesh>
      {/* Bomb bay */}
      <mesh position={[0, -0.15, -0.1]}>
        <boxGeometry args={[0.3, 0.4, 0.15]} />
        <meshStandardMaterial color="#666677" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Engine pods */}
      <mesh position={[0.25, -0.5, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.3, 6]} />
        <meshStandardMaterial color="#555566" metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[-0.25, -0.5, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.3, 6]} />
        <meshStandardMaterial color="#555566" metalness={0.75} roughness={0.25} />
      </mesh>
    </group>
  )
}

function DestroyerGeometry() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Main hull - aggressive wedge */}
      <mesh>
        <coneGeometry args={[0.3, 1.6, 6]} />
        <meshStandardMaterial color="#556688" metalness={0.75} roughness={0.25} />
      </mesh>
      {/* Command section */}
      <mesh position={[0, 0.55, 0.15]}>
        <boxGeometry args={[0.25, 0.25, 0.3]} />
        <meshStandardMaterial color="#667799" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Heavy turrets */}
      <mesh position={[0, 0.3, 0.2]}>
        <cylinderGeometry args={[0.08, 0.1, 0.15, 8]} />
        <meshStandardMaterial color="#445566" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.75, 0.1]}>
        <cylinderGeometry args={[0.06, 0.08, 0.12, 8]} />
        <meshStandardMaterial color="#445566" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Side weapon arrays */}
      <mesh position={[0.25, 0, 0.1]}>
        <boxGeometry args={[0.08, 0.6, 0.15]} />
        <meshStandardMaterial color="#556677" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.25, 0, 0.1]}>
        <boxGeometry args={[0.08, 0.6, 0.15]} />
        <meshStandardMaterial color="#556677" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

function DeathstarGeometry() {
  return (
    <group>
      {/* Main sphere */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial color="#444455" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Equatorial trench */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.05, 8, 64]} />
        <meshStandardMaterial color="#333344" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Super laser dish */}
      <mesh position={[0.8, 0.8, 0.8]}>
        <sphereGeometry args={[0.4, 24, 24, 0, Math.PI]} />
        <meshStandardMaterial color="#222233" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Focus lens */}
      <mesh position={[0.9, 0.9, 0.9]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
        <meshStandardMaterial color="#ff00ff" metalness={0.9} roughness={0.1} emissive="#660066" emissiveIntensity={0.5} />
      </mesh>
      {/* Surface details */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const x = Math.cos(angle) * 1.3
        const z = Math.sin(angle) * 1.3
        return (
          <mesh key={i} position={[x, 0, z]}>
            <boxGeometry args={[0.2, 0.1, 0.2]} />
            <meshStandardMaterial color="#555566" metalness={0.7} roughness={0.3} />
          </mesh>
        )
      })}
    </group>
  )
}

function SolarSatelliteGeometry() {
  return (
    <group>
      {/* Central body */}
      <mesh>
        <cylinderGeometry args={[0.08, 0.08, 0.2, 8]} />
        <meshStandardMaterial color="#aabbcc" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Solar panels */}
      <mesh position={[0.25, 0, 0]}>
        <boxGeometry args={[0.3, 0.02, 0.4]} />
        <meshStandardMaterial color="#4466cc" metalness={0.3} roughness={0.2} emissive="#223366" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[-0.25, 0, 0]}>
        <boxGeometry args={[0.3, 0.02, 0.4]} />
        <meshStandardMaterial color="#4466cc" metalness={0.3} roughness={0.2} emissive="#223366" emissiveIntensity={0.2} />
      </mesh>
      {/* Panel grid lines */}
      <mesh position={[0.25, 0.015, 0]}>
        <boxGeometry args={[0.28, 0.005, 0.38]} />
        <meshStandardMaterial color="#2244aa" metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[-0.25, 0.015, 0]}>
        <boxGeometry args={[0.28, 0.005, 0.38]} />
        <meshStandardMaterial color="#2244aa" metalness={0.4} roughness={0.3} />
      </mesh>
    </group>
  )
}

function ColonyShipGeometry() {
  return (
    <group>
      {/* Main habitat ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.15, 8, 24]} />
        <meshStandardMaterial color="#aabbcc" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Central hub */}
      <mesh>
        <cylinderGeometry args={[0.15, 0.15, 0.8, 12]} />
        <meshStandardMaterial color="#99aabb" metalness={0.65} roughness={0.35} />
      </mesh>
      {/* Landing/colony pods */}
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.2, 0.3, 8]} />
        <meshStandardMaterial color="#88aa99" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Engine section */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.2, 0.15, 0.3, 8]} />
        <meshStandardMaterial color="#778899" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

function BattlecruiserGeometry() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Streamlined hull */}
      <mesh>
        <coneGeometry args={[0.28, 1.5, 6]} />
        <meshStandardMaterial color="#5566aa" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Command bridge */}
      <mesh position={[0, 0.5, 0.12]}>
        <boxGeometry args={[0.18, 0.2, 0.2]} />
        <meshStandardMaterial color="#6677bb" metalness={0.75} roughness={0.25} />
      </mesh>
      {/* Wing pylons */}
      <mesh position={[0.3, -0.1, 0]}>
        <boxGeometry args={[0.2, 0.6, 0.08]} />
        <meshStandardMaterial color="#4455aa" metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[-0.3, -0.1, 0]}>
        <boxGeometry args={[0.2, 0.6, 0.08]} />
        <meshStandardMaterial color="#4455aa" metalness={0.75} roughness={0.25} />
      </mesh>
      {/* Weapon pods on wings */}
      <mesh position={[0.4, -0.2, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.2, 6]} />
        <meshStandardMaterial color="#334488" metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[-0.4, -0.2, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.2, 6]} />
        <meshStandardMaterial color="#334488" metalness={0.85} roughness={0.15} />
      </mesh>
    </group>
  )
}

function ReaperGeometry() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Menacing main hull */}
      <mesh>
        <coneGeometry args={[0.35, 1.7, 4]} />
        <meshStandardMaterial color="#445566" metalness={0.75} roughness={0.25} />
      </mesh>
      {/* Armored plating */}
      <mesh position={[0, 0.3, 0.2]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.08]} />
        <meshStandardMaterial color="#334455" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Heavy weapons array */}
      <mesh position={[0, 0.6, 0.15]}>
        <boxGeometry args={[0.3, 0.15, 0.25]} />
        <meshStandardMaterial color="#556677" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Twin barrel turret */}
      <mesh position={[0.08, 0.7, 0.2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.2, 6]} />
        <meshStandardMaterial color="#223344" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.08, 0.7, 0.2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.2, 6]} />
        <meshStandardMaterial color="#223344" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Massive engines */}
      <mesh position={[0.2, -0.75, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.3, 8]} />
        <meshStandardMaterial color="#334455" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.2, -0.75, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.3, 8]} />
        <meshStandardMaterial color="#334455" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

function PathfinderGeometry() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Sleek hull */}
      <mesh>
        <coneGeometry args={[0.22, 1.0, 8]} />
        <meshStandardMaterial color="#aaccee" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Sensor dome */}
      <mesh position={[0, 0.4, 0.12]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#88ddff" metalness={0.9} roughness={0.1} transparent opacity={0.8} />
      </mesh>
      {/* Scanning arrays */}
      <mesh position={[0.2, 0.1, 0.08]}>
        <boxGeometry args={[0.1, 0.3, 0.05]} />
        <meshStandardMaterial color="#99bbdd" metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[-0.2, 0.1, 0.08]}>
        <boxGeometry args={[0.1, 0.3, 0.05]} />
        <meshStandardMaterial color="#99bbdd" metalness={0.75} roughness={0.25} />
      </mesh>
      {/* Engine glow area */}
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.1, 0.08, 0.15, 8]} />
        <meshStandardMaterial color="#88aabb" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

// Generic fallback geometry
function GenericShipGeometry() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <coneGeometry args={[0.25, 1.0, 6]} />
        <meshStandardMaterial color="#8899aa" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

// Main ship geometry selector
function ShipGeometry({ type }: ShipGeometryProps) {
  switch (type) {
    case 'small_cargo': return <SmallCargoGeometry />
    case 'large_cargo': return <LargeCargoGeometry />
    case 'light_fighter': return <LightFighterGeometry />
    case 'heavy_fighter': return <HeavyFighterGeometry />
    case 'cruiser': return <CruiserGeometry />
    case 'battleship': return <BattleshipGeometry />
    case 'recycler': return <RecyclerGeometry />
    case 'espionage_probe': return <EspionageProbeGeometry />
    case 'bomber': return <BomberGeometry />
    case 'destroyer': return <DestroyerGeometry />
    case 'deathstar': return <DeathstarGeometry />
    case 'solar_satellite': return <SolarSatelliteGeometry />
    case 'colony_ship': return <ColonyShipGeometry />
    case 'battlecruiser': return <BattlecruiserGeometry />
    case 'reaper': return <ReaperGeometry />
    case 'pathfinder': return <PathfinderGeometry />
    default: return <GenericShipGeometry />
  }
}

// ============================================================================
// WELDING PARTICLES
// ============================================================================

interface WeldingParticlesProps {
  position: [number, number, number]
  active: boolean
}

function WeldingParticles({ position, active }: WeldingParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null)
  const particleCount = 50

  const { positions, velocities, colors } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.2
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.2
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2

      velocities[i * 3] = (Math.random() - 0.5) * 0.05
      velocities[i * 3 + 1] = Math.random() * 0.05
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05

      // Orange/yellow spark colors
      colors[i * 3] = 1
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.5
      colors[i * 3 + 2] = Math.random() * 0.3
    }

    return { positions, velocities, colors }
  }, [])

  useFrame(() => {
    if (!particlesRef.current || !active) return

    const posArray = particlesRef.current.geometry.attributes.position.array as Float32Array

    for (let i = 0; i < particleCount; i++) {
      posArray[i * 3] += velocities[i * 3]
      posArray[i * 3 + 1] += velocities[i * 3 + 1]
      posArray[i * 3 + 2] += velocities[i * 3 + 2]

      // Reset particles that go too far
      const dist = Math.sqrt(
        posArray[i * 3] ** 2 +
        posArray[i * 3 + 1] ** 2 +
        posArray[i * 3 + 2] ** 2
      )
      if (dist > 0.5) {
        posArray[i * 3] = (Math.random() - 0.5) * 0.1
        posArray[i * 3 + 1] = (Math.random() - 0.5) * 0.1
        posArray[i * 3 + 2] = (Math.random() - 0.5) * 0.1
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true
  })

  if (!active) return null

  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// ============================================================================
// ROBOTIC ARM
// ============================================================================

interface RoboticArmProps {
  position: [number, number, number]
  rotation?: [number, number, number]
  active: boolean
  armIndex: number
}

function RoboticArm({ position, rotation = [0, 0, 0], active, armIndex }: RoboticArmProps) {
  const armRef = useRef<THREE.Group>(null)
  const jointRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!armRef.current || !active) return

    const t = clock.elapsedTime + armIndex * Math.PI * 0.5
    const swing = Math.sin(t * 2) * 0.3

    if (jointRef.current) {
      jointRef.current.rotation.z = swing
    }
  })

  return (
    <group ref={armRef} position={position} rotation={rotation}>
      {/* Base mount */}
      <mesh>
        <cylinderGeometry args={[0.15, 0.2, 0.2, 8]} />
        <meshStandardMaterial color="#555566" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* First segment */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.1, 0.6, 0.1]} />
        <meshStandardMaterial color="#667788" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Joint */}
      <group ref={jointRef} position={[0, 0.7, 0]}>
        <mesh>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color="#445566" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Second segment */}
        <mesh position={[0.25, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[0.08, 0.4, 0.08]} />
          <meshStandardMaterial color="#778899" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Tool head */}
        <mesh position={[0.4, -0.1, 0]}>
          <coneGeometry args={[0.05, 0.15, 6]} />
          <meshStandardMaterial color="#88aacc" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Welding effect */}
        {active && (
          <>
            <pointLight
              position={[0.4, -0.15, 0]}
              color="#ffaa00"
              intensity={2}
              distance={1}
              decay={2}
            />
            <WeldingParticles position={[0.4, -0.15, 0]} active={active} />
          </>
        )}
      </group>
    </group>
  )
}

// ============================================================================
// CONSTRUCTION PLATFORM
// ============================================================================

interface ConstructionPlatformProps {
  position: [number, number, number]
  shipType?: string
  progress: number
  isActive: boolean
  onSelect?: () => void
  selected?: boolean
}

function ConstructionPlatform({
  position,
  shipType,
  progress,
  isActive,
  onSelect,
  selected = false,
}: ConstructionPlatformProps) {
  const platformRef = useRef<THREE.Group>(null)
  const shipConfig = shipType ? SHIP_CONFIGS[shipType] : null
  const scale = shipConfig?.scale || 1

  // Blinking lights
  const [lightsOn, setLightsOn] = useState(true)

  useFrame(({ clock }) => {
    if (isActive) {
      setLightsOn(Math.sin(clock.elapsedTime * 4) > 0)
    }
  })

  const handleClick = () => {
    if (onSelect) onSelect()
  }

  return (
    <group ref={platformRef} position={position}>
      {/* Platform base - industrial grating */}
      <mesh onClick={handleClick}>
        <boxGeometry args={[4, 0.1, 3]} />
        <meshStandardMaterial color="#333344" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Rails */}
      <mesh position={[-1.8, 0.1, 0]}>
        <boxGeometry args={[0.1, 0.15, 3]} />
        <meshStandardMaterial color="#556677" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[1.8, 0.1, 0]}>
        <boxGeometry args={[0.1, 0.15, 3]} />
        <meshStandardMaterial color="#556677" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Support pillars */}
      {[[-1.5, -1.2], [-1.5, 1.2], [1.5, -1.2], [1.5, 1.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.8, z]}>
          <cylinderGeometry args={[0.08, 0.08, 1.5, 8]} />
          <meshStandardMaterial color="#445566" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* Overhead gantry */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[4, 0.15, 0.2]} />
        <meshStandardMaterial color="#445566" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[3, 0.15, 0.2]} />
        <meshStandardMaterial color="#445566" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Warning lights */}
      {isActive && (
        <>
          <mesh position={[-1.8, 1.6, -1.4]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color={lightsOn ? '#ffaa00' : '#332200'} />
          </mesh>
          <mesh position={[1.8, 1.6, -1.4]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color={lightsOn ? '#ffaa00' : '#332200'} />
          </mesh>
          <mesh position={[-1.8, 1.6, 1.4]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color={lightsOn ? '#ff4400' : '#331100'} />
          </mesh>
          <mesh position={[1.8, 1.6, 1.4]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color={lightsOn ? '#ff4400' : '#331100'} />
          </mesh>
        </>
      )}

      {/* Robotic arms */}
      <RoboticArm position={[-1.5, 0.2, -1]} rotation={[0, Math.PI / 4, 0]} active={isActive} armIndex={0} />
      <RoboticArm position={[1.5, 0.2, -1]} rotation={[0, -Math.PI / 4, 0]} active={isActive} armIndex={1} />
      <RoboticArm position={[-1.5, 0.2, 1]} rotation={[0, Math.PI * 0.75, 0]} active={isActive} armIndex={2} />
      <RoboticArm position={[1.5, 0.2, 1]} rotation={[0, -Math.PI * 0.75, 0]} active={isActive} armIndex={3} />

      {/* Ship being constructed */}
      {shipType && (
        <group position={[0, 0.8, 0]} scale={scale}>
          <ShipGeometry type={shipType} />
          {/* Construction overlay - wireframe effect for incomplete */}
          {progress < 1 && (
            <mesh>
              <boxGeometry args={[2, 1.5, 2]} />
              <meshBasicMaterial
                color="#00aaff"
                wireframe
                transparent
                opacity={0.3}
              />
            </mesh>
          )}
        </group>
      )}

      {/* Progress bar hologram */}
      {isActive && (
        <group position={[0, 2.2, 0]}>
          {/* Background bar */}
          <mesh>
            <boxGeometry args={[2, 0.15, 0.02]} />
            <meshBasicMaterial color="#223344" transparent opacity={0.5} />
          </mesh>
          {/* Progress fill */}
          <mesh position={[(progress - 1) * 1, 0, 0.01]}>
            <boxGeometry args={[2 * progress, 0.12, 0.02]} />
            <meshBasicMaterial color="#00ff88" transparent opacity={0.8} />
          </mesh>
          {/* Percentage text */}
          <Html position={[0, 0.2, 0]} center>
            <div className="text-xs text-green-400 font-mono whitespace-nowrap">
              {Math.round(progress * 100)}%
            </div>
          </Html>
        </group>
      )}

      {/* Selection indicator */}
      {selected && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.2, 2.4, 32]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

// ============================================================================
// HANGAR STRUCTURE
// ============================================================================

function HangarStructure() {
  return (
    <group>
      {/* Main dome structure */}
      <mesh position={[0, 8, 0]}>
        <sphereGeometry args={[25, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.8}
          roughness={0.3}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Dome frame ribs */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        return (
          <group key={i} rotation={[0, angle, 0]}>
            <mesh position={[0, 8, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[25, 0.15, 8, 32, Math.PI / 2]} />
              <meshStandardMaterial color="#334455" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        )
      })}

      {/* Floor */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[28, 64]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Floor grid pattern */}
      <mesh position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5, 25, 64, 8]} />
        <meshBasicMaterial color="#223344" transparent opacity={0.3} />
      </mesh>

      {/* Space opening at front */}
      <mesh position={[0, 4, -24]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 8]} />
        <meshBasicMaterial color="#000011" />
      </mesh>

      {/* Ambient bay lights */}
      {[...Array(6)].map((_, i) => {
        const angle = ((i / 6) * Math.PI * 2) + Math.PI / 6
        const x = Math.cos(angle) * 20
        const z = Math.sin(angle) * 20
        return (
          <pointLight
            key={i}
            position={[x, 6, z]}
            color="#4488cc"
            intensity={0.5}
            distance={15}
            decay={2}
          />
        )
      })}

      {/* Main bay lighting */}
      <pointLight position={[0, 15, 0]} color="#ffffff" intensity={0.8} distance={30} decay={2} />
    </group>
  )
}

// ============================================================================
// COMPLETED SHIPS DISPLAY
// ============================================================================

interface CompletedShipsDisplayProps {
  ships: ShipData[]
  onSelect: (type: string) => void
  selectedType: string | null
}

function CompletedShipsDisplay({ ships, onSelect, selectedType }: CompletedShipsDisplayProps) {
  const shipsWithCount = ships.filter(s => s.count > 0)

  return (
    <group position={[15, 0, 0]}>
      {/* Section label */}
      <Html position={[0, 4, 0]} center>
        <div className="text-sm text-blue-300 font-semibold bg-black/60 px-3 py-1 rounded">
          Completed Fleet
        </div>
      </Html>

      {/* Display racks */}
      {shipsWithCount.slice(0, 6).map((ship, i) => {
        const row = Math.floor(i / 2)
        const col = i % 2
        const x = col * 4 - 2
        const z = row * 4 - 4
        const config = SHIP_CONFIGS[ship.type]
        const scale = (config?.scale || 1) * 0.6
        const isSelected = selectedType === ship.type

        return (
          <group key={ship.type} position={[x, 0.5, z]}>
            {/* Display platform */}
            <mesh onClick={() => onSelect(ship.type)}>
              <cylinderGeometry args={[1.2, 1.2, 0.1, 16]} />
              <meshStandardMaterial
                color={isSelected ? '#224466' : '#1a1a2e'}
                metalness={0.7}
                roughness={0.3}
              />
            </mesh>

            {/* Ship model */}
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
              <group scale={scale} position={[0, 0.8, 0]}>
                <ShipGeometry type={ship.type} />
              </group>
            </Float>

            {/* Count badge */}
            <Html position={[0.8, 0.3, 0.8]} center>
              <div className="bg-blue-600/80 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                x{ship.count}
              </div>
            </Html>

            {/* Selection ring */}
            {isSelected && (
              <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.3, 1.5, 32]} />
                <meshBasicMaterial color="#00ff88" transparent opacity={0.6} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

// ============================================================================
// HOLOGRAPHIC TERMINAL
// ============================================================================

interface HolographicTerminalProps {
  ship: ShipData | null
  resources: { metal: number; crystal: number; deuterium: number }
  quantity: number
  onQuantityChange: (qty: number) => void
  onBuild: () => void
  canAfford: boolean
}

function HolographicTerminal({
  ship,
  resources,
  quantity,
  onQuantityChange,
  onBuild,
  canAfford,
}: HolographicTerminalProps) {
  if (!ship) {
    return (
      <group position={[-15, 0, 5]}>
        <Html center>
          <div className="w-64 bg-black/80 border border-blue-500/30 rounded-lg p-4 text-center">
            <p className="text-blue-300 text-sm">Select a ship type to view details</p>
          </div>
        </Html>
      </group>
    )
  }

  const config = SHIP_CONFIGS[ship.type]
  const totalCost = {
    metal: ship.cost.metal * quantity,
    crystal: ship.cost.crystal * quantity,
    deuterium: ship.cost.deuterium * quantity,
  }

  return (
    <group position={[-15, 2, 5]}>
      {/* Terminal base */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.8, 1, 0.3, 16]} />
        <meshStandardMaterial color="#223344" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Holographic display */}
      <Html center>
        <div className="w-72 bg-gradient-to-b from-blue-900/90 to-black/90 border border-cyan-400/40 rounded-lg p-4 backdrop-blur-sm shadow-lg shadow-cyan-500/20">
          {/* Header */}
          <div className="border-b border-cyan-500/30 pb-2 mb-3">
            <h3 className="text-cyan-300 font-bold text-lg">{ship.name}</h3>
            <p className="text-cyan-500/70 text-xs">{config?.description || 'Combat vessel'}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
            <div className="bg-black/40 rounded p-2 text-center">
              <div className="text-red-400 font-bold">{ship.attack}</div>
              <div className="text-gray-500">Attack</div>
            </div>
            <div className="bg-black/40 rounded p-2 text-center">
              <div className="text-blue-400 font-bold">{ship.shield}</div>
              <div className="text-gray-500">Shield</div>
            </div>
            <div className="bg-black/40 rounded p-2 text-center">
              <div className="text-yellow-400 font-bold">{ship.cargo}</div>
              <div className="text-gray-500">Cargo</div>
            </div>
          </div>

          {/* Cost */}
          <div className="bg-black/40 rounded p-2 mb-3">
            <div className="text-xs text-gray-400 mb-1">Total Cost (x{quantity})</div>
            <div className="flex justify-between text-xs">
              <span className={totalCost.metal <= resources.metal ? 'text-gray-300' : 'text-red-400'}>
                M: {totalCost.metal.toLocaleString()}
              </span>
              <span className={totalCost.crystal <= resources.crystal ? 'text-cyan-300' : 'text-red-400'}>
                C: {totalCost.crystal.toLocaleString()}
              </span>
              <span className={totalCost.deuterium <= resources.deuterium ? 'text-green-300' : 'text-red-400'}>
                D: {totalCost.deuterium.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Build time */}
          <div className="text-xs text-gray-400 mb-3 text-center">
            Build time: <span className="text-cyan-300">{ship.buildTime}</span>
          </div>

          {/* Quantity selector */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              className="w-8 h-8 bg-blue-600/50 hover:bg-blue-500/60 rounded text-white font-bold"
            >
              -
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 bg-black/60 border border-cyan-500/30 rounded px-2 py-1 text-center text-white text-sm"
              min={1}
            />
            <button
              onClick={() => onQuantityChange(quantity + 1)}
              className="w-8 h-8 bg-blue-600/50 hover:bg-blue-500/60 rounded text-white font-bold"
            >
              +
            </button>
          </div>

          {/* Quick quantity buttons */}
          <div className="flex gap-1 mb-3">
            {[1, 5, 10, 50, 100].map((n) => (
              <button
                key={n}
                onClick={() => onQuantityChange(n)}
                className="flex-1 text-xs bg-gray-700/50 hover:bg-gray-600/60 rounded py-1 text-gray-300"
              >
                {n}
              </button>
            ))}
          </div>

          {/* Build button */}
          <button
            onClick={onBuild}
            disabled={!canAfford}
            className={`w-full py-2 rounded font-bold text-sm transition-all ${
              canAfford
                ? 'bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white shadow-lg shadow-green-500/30'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {canAfford ? 'Start Construction' : 'Insufficient Resources'}
          </button>
        </div>
      </Html>
    </group>
  )
}

// ============================================================================
// SHIP INSPECTION VIEW
// ============================================================================

interface ShipInspectionProps {
  type: string
  name: string
}

function ShipInspection({ type, name }: ShipInspectionProps) {
  const groupRef = useRef<THREE.Group>(null)
  const config = SHIP_CONFIGS[type]
  const scale = (config?.scale || 1) * 1.5

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.3
    }
  })

  return (
    <group position={[-15, 3, -5]}>
      {/* Inspection platform */}
      <mesh position={[0, -1, 0]}>
        <cylinderGeometry args={[2.5, 2.5, 0.1, 32]} />
        <meshStandardMaterial color="#223344" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Rotating ring */}
      <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.4, 64]} />
        <meshBasicMaterial color="#00aaff" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Ship model */}
      <group ref={groupRef} scale={scale}>
        <ShipGeometry type={type} />
      </group>

      {/* Ship name label */}
      <Html position={[0, 3, 0]} center>
        <div className="text-cyan-300 font-bold text-lg bg-black/60 px-4 py-1 rounded-full">
          {name}
        </div>
      </Html>

      {/* Holographic scan lines */}
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[0, -0.5 + i * 0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1 + i * 0.4, 0.15 + i * 0.4, 32]} />
          <meshBasicMaterial color="#00aaff" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

// ============================================================================
// SHIP SELECTOR CAROUSEL
// ============================================================================

interface ShipSelectorProps {
  ships: ShipData[]
  selectedType: string | null
  onSelect: (type: string) => void
}

function ShipSelector({ ships, selectedType, onSelect }: ShipSelectorProps) {
  return (
    <group position={[0, 0, 12]}>
      {/* Section label */}
      <Html position={[0, 3, 0]} center>
        <div className="text-sm text-blue-300 font-semibold bg-black/60 px-3 py-1 rounded">
          Available Ship Types
        </div>
      </Html>

      {/* Ship icons in a row */}
      {ships.slice(0, 12).map((ship, i) => {
        const x = (i - 5.5) * 2.5
        const config = SHIP_CONFIGS[ship.type]
        const scale = (config?.scale || 1) * 0.4
        const isSelected = selectedType === ship.type

        return (
          <group key={ship.type} position={[x, 1, 0]}>
            {/* Selection platform */}
            <mesh onClick={() => onSelect(ship.type)}>
              <cylinderGeometry args={[0.8, 0.8, 0.1, 16]} />
              <meshStandardMaterial
                color={isSelected ? '#336688' : '#1a1a2e'}
                metalness={0.7}
                roughness={0.3}
                emissive={isSelected ? '#224466' : '#000000'}
                emissiveIntensity={0.5}
              />
            </mesh>

            {/* Ship model */}
            <Float speed={3} rotationIntensity={0.1} floatIntensity={0.2}>
              <group scale={scale} position={[0, 0.6, 0]}>
                <ShipGeometry type={ship.type} />
              </group>
            </Float>

            {/* Name label */}
            <Html position={[0, -0.3, 0]} center>
              <div className={`text-[10px] whitespace-nowrap ${isSelected ? 'text-cyan-300' : 'text-gray-400'}`}>
                {ship.name}
              </div>
            </Html>

            {/* Selection indicator */}
            {isSelected && (
              <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.9, 1.0, 32]} />
                <meshBasicMaterial color="#00ff88" transparent opacity={0.6} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

// ============================================================================
// MAIN SCENE CONTENT
// ============================================================================

interface SceneContentProps {
  ships: ShipData[]
  currentlyBuilding?: BuildingProgress
  resources: { metal: number; crystal: number; deuterium: number }
  onBuild: (shipType: string, count: number) => void
  onCancelBuild?: () => void
}

function SceneContent({
  ships,
  currentlyBuilding,
  resources,
  onBuild,
  onCancelBuild,
}: SceneContentProps) {
  const [selectedShipType, setSelectedShipType] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  const selectedShip = useMemo(
    () => ships.find(s => s.type === selectedShipType) || null,
    [ships, selectedShipType]
  )

  const handleSelectShip = useCallback((type: string) => {
    setSelectedShipType(type)
    setQuantity(1)
  }, [])

  const canAfford = useMemo(() => {
    if (!selectedShip) return false
    const totalCost = {
      metal: selectedShip.cost.metal * quantity,
      crystal: selectedShip.cost.crystal * quantity,
      deuterium: selectedShip.cost.deuterium * quantity,
    }
    return (
      resources.metal >= totalCost.metal &&
      resources.crystal >= totalCost.crystal &&
      resources.deuterium >= totalCost.deuterium
    )
  }, [selectedShip, quantity, resources])

  const handleBuild = useCallback(() => {
    if (selectedShipType && canAfford) {
      onBuild(selectedShipType, quantity)
    }
  }, [selectedShipType, quantity, canAfford, onBuild])

  return (
    <>
      {/* Background */}
      <Starfield count={4000} radius={200} depth={100} speed={0.2} rotationSpeed={0.00005} />

      {/* Hangar structure */}
      <HangarStructure />

      {/* Main construction platform */}
      <ConstructionPlatform
        position={[0, 0, 0]}
        shipType={currentlyBuilding?.type}
        progress={currentlyBuilding?.progress || 0}
        isActive={!!currentlyBuilding}
        selected={false}
      />

      {/* Secondary construction bays */}
      <ConstructionPlatform
        position={[-8, 0, -5]}
        shipType={undefined}
        progress={0}
        isActive={false}
        selected={false}
      />
      <ConstructionPlatform
        position={[8, 0, -5]}
        shipType={undefined}
        progress={0}
        isActive={false}
        selected={false}
      />

      {/* Ship selector carousel */}
      <ShipSelector
        ships={ships}
        selectedType={selectedShipType}
        onSelect={handleSelectShip}
      />

      {/* Completed ships display */}
      <CompletedShipsDisplay
        ships={ships}
        onSelect={handleSelectShip}
        selectedType={selectedShipType}
      />

      {/* Ship inspection view */}
      {selectedShip && (
        <ShipInspection type={selectedShip.type} name={selectedShip.name} />
      )}

      {/* Holographic terminal */}
      <HolographicTerminal
        ship={selectedShip}
        resources={resources}
        quantity={quantity}
        onQuantityChange={setQuantity}
        onBuild={handleBuild}
        canAfford={canAfford}
      />

      {/* Current build status panel */}
      {currentlyBuilding && (
        <group position={[0, 4, -8]}>
          <Html center>
            <div className="bg-black/80 border border-orange-500/50 rounded-lg p-3 w-64">
              <div className="text-orange-400 font-bold text-sm mb-2">
                Under Construction
              </div>
              <div className="text-white text-sm mb-1">
                {ships.find(s => s.type === currentlyBuilding.type)?.name || currentlyBuilding.type}
                {' '}x{currentlyBuilding.count}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                <div
                  className="bg-gradient-to-r from-orange-500 to-yellow-400 h-2 rounded-full transition-all"
                  style={{ width: `${currentlyBuilding.progress * 100}%` }}
                />
              </div>
              <div className="text-gray-400 text-xs">
                {Math.round(currentlyBuilding.progress * 100)}% complete
              </div>
              {onCancelBuild && (
                <button
                  onClick={onCancelBuild}
                  className="mt-2 w-full py-1 bg-red-600/50 hover:bg-red-500/60 rounded text-white text-xs"
                >
                  Cancel Build
                </button>
              )}
            </div>
          </Html>
        </group>
      )}

      {/* Ambient lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[10, 20, 10]} intensity={0.4} color="#ffffff" />
      <pointLight position={[0, 10, 0]} color="#4488ff" intensity={0.6} distance={25} decay={2} />
    </>
  )
}

// ============================================================================
// LOADING FALLBACK
// ============================================================================

function SceneLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-cyan-300 text-sm">Loading Shipyard...</span>
      </div>
    </Html>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ShipyardScene({
  ships,
  currentlyBuilding,
  resources,
  onBuild,
  onCancelBuild,
}: ShipyardSceneProps) {
  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas
        camera={{
          position: [0, 8, 25],
          fov: 50,
          near: 0.1,
          far: 500,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        {/* Deep space background */}
        <color attach="background" args={['#050510']} />

        {/* Fog for depth */}
        <fog attach="fog" args={['#050510', 30, 150]} />

        <Suspense fallback={<SceneLoader />}>
          <SceneContent
            ships={ships}
            currentlyBuilding={currentlyBuilding}
            resources={resources}
            onBuild={onBuild}
            onCancelBuild={onCancelBuild}
          />
        </Suspense>

        {/* Camera controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          minDistance={10}
          maxDistance={60}
          maxPolarAngle={Math.PI * 0.6}
          minPolarAngle={Math.PI * 0.2}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          panSpeed={0.6}
          target={[0, 2, 0]}
        />

        {/* Post-processing */}
        <SpaceEffectsLight bloomIntensity={0.5} bloomThreshold={0.6} />
      </Canvas>
    </div>
  )
}

export default ShipyardScene
