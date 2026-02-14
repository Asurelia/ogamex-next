'use client'

import { useRef, useState, useMemo, useCallback, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Float, Stars } from '@react-three/drei'
import * as THREE from 'three'

import { Starfield } from '@/components/game/3d'
import { SpaceEffectsLight } from '@/lib/3d/effects'

// ============================================================================
// TYPES
// ============================================================================

interface DefenseData {
  type: string
  name: string
  count: number
  cost: { metal: number; crystal: number; deuterium: number }
  buildTime: string
  attack: number
  shield: number
  hull: number
}

interface BuildingProgress {
  type: string
  count: number
  endsAt: Date
  progress: number
}

export interface DefenseSceneProps {
  defenses: DefenseData[]
  currentlyBuilding?: BuildingProgress
  resources: { metal: number; crystal: number; deuterium: number }
  onBuild: (defenseType: string, count: number) => void
  onCancelBuild?: () => void
}

// ============================================================================
// DEFENSE CONFIGURATIONS
// ============================================================================

const DEFENSE_CONFIGS: Record<string, {
  scale: number
  color: string
  glowColor: string
  description: string
  modelType: 'launcher' | 'laser' | 'cannon' | 'turret' | 'shield'
}> = {
  rocket_launcher: {
    scale: 0.6,
    color: '#778899',
    glowColor: '#ff4400',
    description: 'Basic missile defense',
    modelType: 'launcher',
  },
  light_laser: {
    scale: 0.5,
    color: '#44ff44',
    glowColor: '#00ff00',
    description: 'Light beam weapon',
    modelType: 'laser',
  },
  heavy_laser: {
    scale: 0.8,
    color: '#22cc22',
    glowColor: '#00ff44',
    description: 'Powerful laser turret',
    modelType: 'laser',
  },
  gauss_cannon: {
    scale: 1.0,
    color: '#8899aa',
    glowColor: '#88aaff',
    description: 'Electromagnetic accelerator',
    modelType: 'cannon',
  },
  ion_cannon: {
    scale: 0.9,
    color: '#6666ff',
    glowColor: '#8888ff',
    description: 'Ion beam weapon',
    modelType: 'cannon',
  },
  plasma_turret: {
    scale: 1.2,
    color: '#ff44ff',
    glowColor: '#ff00ff',
    description: 'Heavy plasma weapon',
    modelType: 'turret',
  },
  small_shield_dome: {
    scale: 2.0,
    color: '#4488ff',
    glowColor: '#00aaff',
    description: 'Planetary shield generator',
    modelType: 'shield',
  },
  large_shield_dome: {
    scale: 3.0,
    color: '#2266ff',
    glowColor: '#0088ff',
    description: 'Advanced shield matrix',
    modelType: 'shield',
  },
}

// ============================================================================
// DEFENSE GEOMETRY COMPONENTS
// ============================================================================

interface DefenseGeometryProps {
  type: string
  isActive?: boolean
}

function RocketLauncherGeometry({ isActive }: { isActive?: boolean }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (groupRef.current && isActive) {
      groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.2
    }
  })

  return (
    <group ref={groupRef}>
      {/* Base */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.6, 0.3, 12]} />
        <meshStandardMaterial color="#445566" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Turret body */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.6, 0.4, 0.5]} />
        <meshStandardMaterial color="#556677" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Missile tubes */}
      {[[-0.2, 0, 0], [0.2, 0, 0]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, 0.5, 0.2]} rotation={[Math.PI / 4, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
          <meshStandardMaterial color="#334455" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Missiles */}
      {isActive && (
        <>
          <mesh position={[-0.2, 0.6, 0.3]} rotation={[Math.PI / 4, 0, 0]}>
            <coneGeometry args={[0.05, 0.2, 6]} />
            <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0.2, 0.6, 0.3]} rotation={[Math.PI / 4, 0, 0]}>
            <coneGeometry args={[0.05, 0.2, 6]} />
            <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={0.5} />
          </mesh>
        </>
      )}
    </group>
  )
}

function LaserGeometry({ type, isActive }: { type: 'light' | 'heavy'; isActive?: boolean }) {
  const beamRef = useRef<THREE.Mesh>(null)
  const scale = type === 'heavy' ? 1.3 : 1

  useFrame(({ clock }) => {
    if (beamRef.current && isActive) {
      beamRef.current.scale.y = 0.8 + Math.sin(clock.elapsedTime * 10) * 0.2
    }
  })

  const color = type === 'heavy' ? '#22cc22' : '#44ff44'

  return (
    <group scale={scale}>
      {/* Base platform */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 0.2, 12]} />
        <meshStandardMaterial color="#334455" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Rotation mount */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.15, 8]} />
        <meshStandardMaterial color="#445566" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Laser emitter */}
      <group position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 6]}>
        <mesh>
          <cylinderGeometry args={[0.12, 0.08, 0.4, 8]} />
          <meshStandardMaterial color="#556677" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Lens */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.05, 12]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isActive ? 1 : 0.3}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Laser beam when active */}
        {isActive && (
          <mesh ref={beamRef} position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 2.5, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.8} />
          </mesh>
        )}
      </group>
    </group>
  )
}

function CannonGeometry({ type, isActive }: { type: 'gauss' | 'ion'; isActive?: boolean }) {
  const barrelRef = useRef<THREE.Group>(null)
  const color = type === 'ion' ? '#6666ff' : '#8899aa'
  const glowColor = type === 'ion' ? '#8888ff' : '#88aaff'

  useFrame(({ clock }) => {
    if (barrelRef.current && isActive) {
      barrelRef.current.rotation.x = Math.sin(clock.elapsedTime) * 0.1 - 0.3
    }
  })

  return (
    <group>
      {/* Heavy base */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 0.3, 1]} />
        <meshStandardMaterial color="#334455" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Support struts */}
      {[[-0.35, 0], [0.35, 0], [0, -0.35], [0, 0.35]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.25, z]}>
          <boxGeometry args={[0.1, 0.2, 0.1]} />
          <meshStandardMaterial color="#445566" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* Turret housing */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 0.3, 8]} />
        <meshStandardMaterial color="#556677" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Barrel assembly */}
      <group ref={barrelRef} position={[0, 0.5, 0]}>
        {/* Main barrel */}
        <mesh position={[0, 0.1, 0.5]} rotation={[-Math.PI / 6, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.15, 1.2, 8]} />
          <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Coils for gauss / glow for ion */}
        {type === 'gauss' ? (
          [...Array(4)].map((_, i) => (
            <mesh key={i} position={[0, 0.1, 0.3 + i * 0.2]} rotation={[-Math.PI / 6, 0, 0]}>
              <torusGeometry args={[0.13, 0.02, 8, 16]} />
              <meshStandardMaterial
                color="#4466aa"
                emissive="#2244aa"
                emissiveIntensity={isActive ? 0.5 : 0.1}
              />
            </mesh>
          ))
        ) : (
          <mesh position={[0, 0.1, 0.5]} rotation={[-Math.PI / 6, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 1.0, 8]} />
            <meshBasicMaterial
              color={glowColor}
              transparent
              opacity={isActive ? 0.4 : 0.1}
            />
          </mesh>
        )}

        {/* Muzzle glow */}
        {isActive && (
          <pointLight
            position={[0, 0.1, 1.0]}
            color={glowColor}
            intensity={2}
            distance={3}
            decay={2}
          />
        )}
      </group>
    </group>
  )
}

function PlasmaTurretGeometry({ isActive }: { isActive?: boolean }) {
  const plasmaRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (plasmaRef.current && isActive) {
      plasmaRef.current.rotation.y = clock.elapsedTime * 2
      plasmaRef.current.scale.setScalar(0.9 + Math.sin(clock.elapsedTime * 5) * 0.1)
    }
  })

  return (
    <group>
      {/* Heavy armored base */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.8, 0.9, 0.4, 8]} />
        <meshStandardMaterial color="#443355" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Rotating platform */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.6, 0.7, 0.2, 8]} />
        <meshStandardMaterial color="#554466" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Main turret body */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.8, 0.5, 0.6]} />
        <meshStandardMaterial color="#665577" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Twin plasma emitters */}
      {[[-0.25, 0], [0.25, 0]].map(([x], i) => (
        <group key={i} position={[x, 0.7, 0.35]}>
          <mesh rotation={[Math.PI / 4, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.15, 0.5, 8]} />
            <meshStandardMaterial color="#776688" metalness={0.8} roughness={0.2} />
          </mesh>

          {/* Plasma containment */}
          <mesh ref={i === 0 ? plasmaRef : undefined} position={[0, 0.3, 0.2]} rotation={[Math.PI / 4, 0, 0]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial
              color="#ff00ff"
              transparent
              opacity={isActive ? 0.9 : 0.3}
            />
          </mesh>
        </group>
      ))}

      {/* Energy glow */}
      {isActive && (
        <pointLight
          position={[0, 1.0, 0.5]}
          color="#ff00ff"
          intensity={3}
          distance={4}
          decay={2}
        />
      )}
    </group>
  )
}

function ShieldDomeGeometry({ type, isActive }: { type: 'small' | 'large'; isActive?: boolean }) {
  const shieldRef = useRef<THREE.Mesh>(null)
  const scale = type === 'large' ? 1.5 : 1
  const color = type === 'large' ? '#2266ff' : '#4488ff'

  useFrame(({ clock }) => {
    if (shieldRef.current) {
      shieldRef.current.rotation.y = clock.elapsedTime * 0.2
      if (isActive) {
        const pulse = 0.95 + Math.sin(clock.elapsedTime * 2) * 0.05
        shieldRef.current.scale.setScalar(pulse)
      }
    }
  })

  return (
    <group scale={scale}>
      {/* Generator base */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.7, 0.3, 12]} />
        <meshStandardMaterial color="#334455" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Central pillar */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.7, 8]} />
        <meshStandardMaterial color="#445566" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Energy emitter */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? 1 : 0.3}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Shield dome effect */}
      <mesh ref={shieldRef} position={[0, 1.5, 0]}>
        <sphereGeometry args={[2.5, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isActive ? 0.15 : 0.05}
          wireframe={!isActive}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Energy rings */}
      {isActive && (
        <>
          <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.5, 0.02, 8, 64]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
          </mesh>
          <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.0, 0.02, 8, 64]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} />
          </mesh>
        </>
      )}

      {/* Central glow */}
      {isActive && (
        <pointLight
          position={[0, 1.0, 0]}
          color={color}
          intensity={2}
          distance={5}
          decay={2}
        />
      )}
    </group>
  )
}

function DefenseGeometry({ type, isActive = false }: DefenseGeometryProps) {
  const config = DEFENSE_CONFIGS[type]
  if (!config) return null

  switch (config.modelType) {
    case 'launcher':
      return <RocketLauncherGeometry isActive={isActive} />
    case 'laser':
      return <LaserGeometry type={type === 'heavy_laser' ? 'heavy' : 'light'} isActive={isActive} />
    case 'cannon':
      return <CannonGeometry type={type === 'ion_cannon' ? 'ion' : 'gauss'} isActive={isActive} />
    case 'turret':
      return <PlasmaTurretGeometry isActive={isActive} />
    case 'shield':
      return <ShieldDomeGeometry type={type === 'large_shield_dome' ? 'large' : 'small'} isActive={isActive} />
    default:
      return null
  }
}

// ============================================================================
// DEFENSE PLATFORM
// ============================================================================

interface DefensePlatformProps {
  defense: DefenseData
  position: [number, number, number]
  onSelect: () => void
  selected: boolean
  isBuilding: boolean
}

function DefensePlatform({ defense, position, onSelect, selected, isBuilding }: DefensePlatformProps) {
  const config = DEFENSE_CONFIGS[defense.type] || { scale: 1 }

  return (
    <group position={position}>
      {/* Platform */}
      <mesh onClick={onSelect}>
        <cylinderGeometry args={[1.5, 1.5, 0.1, 16]} />
        <meshStandardMaterial
          color={selected ? '#224466' : '#1a1a2e'}
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>

      {/* Defense model */}
      <group position={[0, 0.2, 0]} scale={config.scale}>
        <DefenseGeometry type={defense.type} isActive={isBuilding || selected} />
      </group>

      {/* Count indicator */}
      {defense.count > 0 && (
        <Html position={[1.2, 0.5, 0]} center>
          <div className="bg-blue-600/80 text-white text-xs px-2 py-0.5 rounded-full font-bold">
            x{defense.count}
          </div>
        </Html>
      )}

      {/* Selection ring */}
      {selected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.6, 1.8, 32]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

// ============================================================================
// PLANETARY SURFACE
// ============================================================================

function PlanetarySurface() {
  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Grid */}
      <gridHelper args={[80, 40, '#2a2a4e', '#1a1a3e']} position={[0, -0.48, 0]} />

      {/* Defense perimeter */}
      <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[25, 26, 64]} />
        <meshBasicMaterial color="#ff4444" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Inner zone */}
      <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[15, 15.5, 64]} />
        <meshBasicMaterial color="#44ff44" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ============================================================================
// BUILD PANEL
// ============================================================================

interface BuildPanelProps {
  defense: DefenseData | null
  resources: { metal: number; crystal: number; deuterium: number }
  quantity: number
  onQuantityChange: (qty: number) => void
  onBuild: () => void
  canAfford: boolean
}

function BuildPanel({
  defense,
  resources,
  quantity,
  onQuantityChange,
  onBuild,
  canAfford,
}: BuildPanelProps) {
  if (!defense) {
    return (
      <div className="absolute right-4 top-1/2 -translate-y-1/2 w-72 bg-black/80 border border-red-500/30 rounded-lg p-4 text-center">
        <p className="text-red-300 text-sm">Select a defense type to build</p>
      </div>
    )
  }

  const config = DEFENSE_CONFIGS[defense.type]
  const totalCost = {
    metal: defense.cost.metal * quantity,
    crystal: defense.cost.crystal * quantity,
    deuterium: defense.cost.deuterium * quantity,
  }

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-80 bg-gradient-to-b from-red-900/80 to-black/90 border border-red-500/40 rounded-lg p-4 backdrop-blur-sm shadow-lg shadow-red-500/20">
      {/* Header */}
      <div className="border-b border-red-500/30 pb-2 mb-3">
        <h3 className="text-red-300 font-bold text-lg">{defense.name}</h3>
        <p className="text-red-500/70 text-xs">{config?.description || 'Defensive structure'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="bg-black/40 rounded p-2 text-center">
          <div className="text-red-400 font-bold">{defense.attack}</div>
          <div className="text-gray-500">Attack</div>
        </div>
        <div className="bg-black/40 rounded p-2 text-center">
          <div className="text-blue-400 font-bold">{defense.shield}</div>
          <div className="text-gray-500">Shield</div>
        </div>
        <div className="bg-black/40 rounded p-2 text-center">
          <div className="text-gray-300 font-bold">{defense.hull}</div>
          <div className="text-gray-500">Hull</div>
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
        Build time: <span className="text-red-300">{defense.buildTime}</span>
      </div>

      {/* Quantity selector */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
          className="w-8 h-8 bg-red-600/50 hover:bg-red-500/60 rounded text-white font-bold"
        >
          -
        </button>
        <input
          type="number"
          value={quantity}
          onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
          className="flex-1 bg-black/60 border border-red-500/30 rounded px-2 py-1 text-center text-white text-sm"
          min={1}
        />
        <button
          onClick={() => onQuantityChange(quantity + 1)}
          className="w-8 h-8 bg-red-600/50 hover:bg-red-500/60 rounded text-white font-bold"
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
            ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-lg shadow-red-500/30'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        {canAfford ? 'Build Defense' : 'Insufficient Resources'}
      </button>
    </div>
  )
}

// ============================================================================
// SCENE CONTENT
// ============================================================================

interface SceneContentProps {
  defenses: DefenseData[]
  currentlyBuilding?: BuildingProgress
  resources: { metal: number; crystal: number; deuterium: number }
  onBuild: (defenseType: string, count: number) => void
}

function SceneContent({ defenses, currentlyBuilding, resources, onBuild }: SceneContentProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  const selectedDefense = useMemo(
    () => defenses.find(d => d.type === selectedType) || null,
    [defenses, selectedType]
  )

  const canAfford = useMemo(() => {
    if (!selectedDefense) return false
    const totalCost = {
      metal: selectedDefense.cost.metal * quantity,
      crystal: selectedDefense.cost.crystal * quantity,
      deuterium: selectedDefense.cost.deuterium * quantity,
    }
    return (
      resources.metal >= totalCost.metal &&
      resources.crystal >= totalCost.crystal &&
      resources.deuterium >= totalCost.deuterium
    )
  }, [selectedDefense, quantity, resources])

  const handleBuild = useCallback(() => {
    if (selectedType && canAfford) {
      onBuild(selectedType, quantity)
    }
  }, [selectedType, quantity, canAfford, onBuild])

  // Arrange defenses in a circle
  const defensePositions = useMemo(() => {
    return defenses.map((d, i) => {
      const angle = (i / defenses.length) * Math.PI * 2 - Math.PI / 2
      const radius = 12
      return {
        defense: d,
        position: [
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius,
        ] as [number, number, number],
      }
    })
  }, [defenses])

  return (
    <>
      {/* Background */}
      <Starfield count={3000} radius={200} depth={100} speed={0.1} rotationSpeed={0.00003} />
      <Stars radius={150} depth={80} count={2000} factor={4} saturation={0} fade speed={0.3} />

      {/* Planet surface */}
      <PlanetarySurface />

      {/* Defense platforms */}
      {defensePositions.map(({ defense, position }) => (
        <DefensePlatform
          key={defense.type}
          defense={defense}
          position={position}
          onSelect={() => {
            setSelectedType(defense.type)
            setQuantity(1)
          }}
          selected={selectedType === defense.type}
          isBuilding={currentlyBuilding?.type === defense.type}
        />
      ))}

      {/* Central command structure */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[2, 2.5, 1, 12]} />
          <meshStandardMaterial color="#2a2a4e" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#3a3a5e" metalness={0.7} roughness={0.3} />
        </mesh>

        <Html position={[0, 2.5, 0]} center>
          <div className="text-sm text-red-300 font-semibold bg-black/60 px-3 py-1 rounded whitespace-nowrap">
            Defense Command
          </div>
        </Html>
      </group>

      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[20, 30, 10]} intensity={0.5} color="#ffffff" />
      <pointLight position={[0, 10, 0]} color="#ff4444" intensity={0.3} distance={30} />
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
        <div className="w-10 h-10 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-red-300 text-sm">Loading Defense Grid...</span>
      </div>
    </Html>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DefenseScene({
  defenses,
  currentlyBuilding,
  resources,
  onBuild,
  onCancelBuild,
}: DefenseSceneProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)

  const selectedDefense = useMemo(
    () => defenses.find(d => d.type === selectedType) || null,
    [defenses, selectedType]
  )

  const canAfford = useMemo(() => {
    if (!selectedDefense) return false
    const totalCost = {
      metal: selectedDefense.cost.metal * quantity,
      crystal: selectedDefense.cost.crystal * quantity,
      deuterium: selectedDefense.cost.deuterium * quantity,
    }
    return (
      resources.metal >= totalCost.metal &&
      resources.crystal >= totalCost.crystal &&
      resources.deuterium >= totalCost.deuterium
    )
  }, [selectedDefense, quantity, resources])

  const handleBuild = useCallback(() => {
    if (selectedType && canAfford) {
      onBuild(selectedType, quantity)
    }
  }, [selectedType, quantity, canAfford, onBuild])

  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas
        camera={{
          position: [0, 20, 30],
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
        onPointerMissed={() => setSelectedType(null)}
      >
        <color attach="background" args={['#0a0410']} />
        <fog attach="fog" args={['#0a0410', 40, 120]} />

        <Suspense fallback={<SceneLoader />}>
          <SceneContent
            defenses={defenses}
            currentlyBuilding={currentlyBuilding}
            resources={resources}
            onBuild={onBuild}
          />
        </Suspense>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          minDistance={15}
          maxDistance={60}
          maxPolarAngle={Math.PI * 0.6}
          minPolarAngle={Math.PI * 0.15}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          target={[0, 0, 0]}
        />

        <SpaceEffectsLight bloomIntensity={0.5} bloomThreshold={0.6} />
      </Canvas>

      {/* Build panel overlay */}
      <BuildPanel
        defense={selectedDefense}
        resources={resources}
        quantity={quantity}
        onQuantityChange={setQuantity}
        onBuild={handleBuild}
        canAfford={canAfford}
      />

      {/* Current build status */}
      {currentlyBuilding && (
        <div className="absolute left-4 bottom-4 bg-black/80 border border-orange-500/50 rounded-lg p-3 w-64">
          <div className="text-orange-400 font-bold text-sm mb-2">Under Construction</div>
          <div className="text-white text-sm mb-1">
            {defenses.find(d => d.type === currentlyBuilding.type)?.name || currentlyBuilding.type}
            {' '}x{currentlyBuilding.count}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
            <div
              className="bg-gradient-to-r from-orange-500 to-red-400 h-2 rounded-full transition-all"
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
      )}
    </div>
  )
}

export default DefenseScene
