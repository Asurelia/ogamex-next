'use client'

import { useRef, useMemo, useState, useCallback, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  OrbitControls,
  Html,
  Float,
  MeshDistortMaterial,
  Sphere,
  Ring,
  Text,
  Line,
} from '@react-three/drei'
import * as THREE from 'three'
import { SpaceEffects } from '@/lib/3d/effects'
import { Starfield } from '@/components/game/3d'
import { formatNumber } from '@/lib/utils/format'

// ============================================================================
// TYPES
// ============================================================================

export interface Technology {
  id: string
  name: string
  level: number
  maxLevel?: number
  category: 'basic' | 'propulsion' | 'combat' | 'advanced'
  cost: { metal: number; crystal: number; deuterium: number }
  researchTime: string
  bonus: string
  prerequisites: string[]
  prerequisitesMet: boolean
}

export interface ResearchLabSceneProps {
  technologies: Technology[]
  currentlyResearching?: { id: string; endsAt: Date; progress: number }
  resources: { metal: number; crystal: number; deuterium: number }
  onResearch: (techId: string) => void
  onCancelResearch?: () => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Research branch colors mapped to technology IDs/categories
const BRANCH_COLORS: Record<string, string> = {
  // Energy branch (yellow/orange)
  energy_technology: '#ffaa00',
  // Laser branch (red)
  laser_technology: '#ff4444',
  // Ion branch (blue)
  ion_technology: '#4488ff',
  // Hyperspace branch (violet)
  hyperspace_technology: '#aa44ff',
  hyperspace_drive: '#9933ee',
  // Plasma branch (green)
  plasma_technology: '#44ff88',
  // Espionage branch (cyan)
  espionage_technology: '#44ffff',
  // Computer/Informatique branch (white)
  computer_technology: '#ffffff',
  // Astrophysics branch (indigo)
  astrophysics: '#4444aa',
  intergalactic_research_network: '#5555bb',
  // Graviton branch (gold)
  graviton_technology: '#ffd700',
  // Weapons/Armament branch (dark red)
  weapons_technology: '#aa2222',
  // Shield branch (light blue)
  shielding_technology: '#88ccff',
  // Armor branch (gray)
  armor_technology: '#888888',
  // Propulsion
  combustion_drive: '#ff8844',
  impulse_drive: '#ff6622',
}

// Category colors as fallback
const CATEGORY_COLORS: Record<string, string> = {
  basic: '#ffaa00',
  propulsion: '#ff6644',
  combat: '#ff4444',
  advanced: '#aa44ff',
}

// Layout configuration for tech tree branches
const BRANCH_POSITIONS: Record<string, [number, number, number]> = {
  // Core technologies (center ring)
  energy_technology: [0, 2, 8],
  computer_technology: [6, 2, 5],
  espionage_technology: [-6, 2, 5],

  // Combat technologies (right side)
  laser_technology: [10, 1, 0],
  ion_technology: [12, 2, -4],
  plasma_technology: [10, 3, -8],
  weapons_technology: [8, 0, 4],
  shielding_technology: [6, 0, -2],
  armor_technology: [4, 0, 2],

  // Propulsion technologies (left side)
  combustion_drive: [-8, 1, 2],
  impulse_drive: [-10, 2, -2],
  hyperspace_drive: [-12, 3, -6],
  hyperspace_technology: [-10, 4, -10],

  // Advanced technologies (back ring)
  astrophysics: [0, 4, -10],
  intergalactic_research_network: [4, 5, -12],
  graviton_technology: [-4, 6, -12],
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTechColor(techId: string, category: string): string {
  return BRANCH_COLORS[techId] || CATEGORY_COLORS[category] || '#666666'
}

// formatNumber imported from @/lib/utils/format

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Circular laboratory room environment
 */
function LabEnvironment() {
  const wallsRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (wallsRef.current) {
      // Subtle ambient rotation
      wallsRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.05) * 0.02
    }
  })

  return (
    <group ref={wallsRef}>
      {/* Floor grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
        <circleGeometry args={[20, 64]} />
        <meshStandardMaterial
          color="#0a1525"
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Floor grid lines */}
      <gridHelper
        args={[40, 40, '#1a3050', '#0d1f35']}
        position={[0, -2.99, 0]}
      />

      {/* Circular wall segments with holographic screens */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const x = Math.cos(angle) * 18
        const z = Math.sin(angle) * 18

        return (
          <group key={i} position={[x, 2, z]} rotation={[0, -angle + Math.PI, 0]}>
            {/* Wall panel */}
            <mesh>
              <boxGeometry args={[8, 10, 0.3]} />
              <meshStandardMaterial
                color="#0a1830"
                metalness={0.9}
                roughness={0.3}
                emissive="#0066aa"
                emissiveIntensity={0.05}
              />
            </mesh>

            {/* Holographic screen effect */}
            <mesh position={[0, 0.5, 0.2]}>
              <planeGeometry args={[6, 6]} />
              <meshBasicMaterial
                color="#00aaff"
                transparent
                opacity={0.1 + Math.sin(i * 0.5) * 0.05}
              />
            </mesh>

            {/* Screen frame glow */}
            <mesh position={[0, 0.5, 0.18]}>
              <ringGeometry args={[2.8, 3, 32]} />
              <meshBasicMaterial
                color="#00ffff"
                transparent
                opacity={0.3}
              />
            </mesh>
          </group>
        )
      })}

      {/* Ceiling dome */}
      <mesh position={[0, 12, 0]}>
        <sphereGeometry args={[20, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#051020"
          metalness={0.7}
          roughness={0.4}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

/**
 * Central holographic console table
 */
function CentralConsole() {
  const consoleRef = useRef<THREE.Group>(null)
  const holoRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (holoRef.current) {
      holoRef.current.rotation.y = clock.elapsedTime * 0.3
      const scale = 1 + Math.sin(clock.elapsedTime * 2) * 0.05
      holoRef.current.scale.setScalar(scale)
    }
  })

  return (
    <group ref={consoleRef} position={[0, -2, 0]}>
      {/* Console base */}
      <mesh>
        <cylinderGeometry args={[3, 4, 1, 32]} />
        <meshStandardMaterial
          color="#1a2a40"
          metalness={0.9}
          roughness={0.2}
          emissive="#003366"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Console top surface */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[3.2, 3.2, 0.1, 32]} />
        <meshStandardMaterial
          color="#0088aa"
          metalness={0.5}
          roughness={0.3}
          emissive="#00ccff"
          emissiveIntensity={0.2}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Holographic projection */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
        <mesh ref={holoRef} position={[0, 3, 0]}>
          <icosahedronGeometry args={[1.5, 1]} />
          <MeshDistortMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={0.5}
            transparent
            opacity={0.4}
            distort={0.3}
            speed={2}
            wireframe
          />
        </mesh>
      </Float>

      {/* Inner glow ring */}
      <Ring args={[2, 2.5, 64]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.6, 0]}>
        <meshBasicMaterial color="#00ffff" transparent opacity={0.4} />
      </Ring>

      {/* Outer glow ring */}
      <Ring args={[3.5, 4, 64]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <meshBasicMaterial color="#0088ff" transparent opacity={0.2} />
      </Ring>
    </group>
  )
}

/**
 * Individual technology node
 */
interface TechNodeProps {
  tech: Technology
  position: [number, number, number]
  isResearching: boolean
  researchProgress?: number
  onSelect: () => void
  isSelected: boolean
}

function TechNode({
  tech,
  position,
  isResearching,
  researchProgress = 0,
  onSelect,
  isSelected
}: TechNodeProps) {
  const nodeRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const particlesRef = useRef<THREE.Points>(null)

  const color = getTechColor(tech.id, tech.category)
  const isDisabled = !tech.prerequisitesMet
  const displayColor = isDisabled ? '#333333' : color

  // Particle system for researching state
  const particles = useMemo(() => {
    const count = 50
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const r = 1.5 + Math.random() * 0.5
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    return positions
  }, [])

  useFrame(({ clock }) => {
    if (nodeRef.current) {
      // Floating animation
      nodeRef.current.position.y = position[1] + Math.sin(clock.elapsedTime + position[0]) * 0.15

      // Selection pulse
      if (isSelected) {
        const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.1
        nodeRef.current.scale.setScalar(pulse)
      } else {
        nodeRef.current.scale.setScalar(1)
      }
    }

    if (glowRef.current) {
      // Glow intensity animation
      const intensity = isResearching
        ? 0.8 + Math.sin(clock.elapsedTime * 5) * 0.2
        : isSelected ? 0.6 : 0.3
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = intensity
    }

    if (particlesRef.current && isResearching) {
      // Particle rotation for researching effect
      particlesRef.current.rotation.y = clock.elapsedTime * 0.5
      particlesRef.current.rotation.x = clock.elapsedTime * 0.3
    }
  })

  const handleClick = () => {
    if (!isDisabled) {
      onSelect()
    }
  }

  const handlePointerOver = () => {
    if (!isDisabled) {
      document.body.style.cursor = 'pointer'
    }
  }

  const handlePointerOut = () => {
    document.body.style.cursor = 'auto'
  }

  // Determine geometry based on category
  const NodeGeometry = useMemo(() => {
    switch (tech.category) {
      case 'propulsion':
        return <octahedronGeometry args={[0.6, 0]} />
      case 'combat':
        return <tetrahedronGeometry args={[0.7, 0]} />
      case 'advanced':
        return <dodecahedronGeometry args={[0.55, 0]} />
      default:
        return <icosahedronGeometry args={[0.5, 0]} />
    }
  }, [tech.category])

  return (
    <group
      ref={nodeRef}
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Main node */}
      <mesh>
        {NodeGeometry}
        <meshStandardMaterial
          color={displayColor}
          metalness={0.7}
          roughness={0.2}
          emissive={displayColor}
          emissiveIntensity={isResearching ? 0.8 : isSelected ? 0.5 : 0.2}
        />
      </mesh>

      {/* Outer glow */}
      <Sphere ref={glowRef} args={[0.9, 16, 16]}>
        <meshBasicMaterial
          color={displayColor}
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Selection ring */}
      {isSelected && (
        <Ring args={[0.8, 1, 32]} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </Ring>
      )}

      {/* Research progress ring */}
      {isResearching && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1, 1.2, 32, 1, 0, researchProgress * Math.PI * 2]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.9} />
        </mesh>
      )}

      {/* Researching particles */}
      {isResearching && (
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[particles, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            color={displayColor}
            size={0.08}
            transparent
            opacity={0.8}
            sizeAttenuation
          />
        </points>
      )}

      {/* Level indicator */}
      <Html
        position={[0, -1, 0]}
        center
        distanceFactor={15}
        style={{ pointerEvents: 'none' }}
      >
        <div className={`
          px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap
          ${isDisabled
            ? 'bg-gray-800/80 text-gray-500'
            : 'bg-black/80 text-white border border-gray-600'
          }
        `}>
          <span className="text-xs opacity-70">Lv.</span>
          <span className="ml-0.5">{tech.level}</span>
          {tech.maxLevel && <span className="opacity-50">/{tech.maxLevel}</span>}
        </div>
      </Html>

      {/* Tech name (on hover/select) */}
      {isSelected && (
        <Html
          position={[0, 1.5, 0]}
          center
          distanceFactor={12}
          style={{ pointerEvents: 'none' }}
        >
          <div className="px-3 py-1.5 rounded-lg bg-black/90 border border-cyan-500/50 text-center">
            <div className="text-cyan-400 font-semibold text-sm">{tech.name}</div>
            {isResearching && (
              <div className="text-green-400 text-xs mt-1">
                En recherche... {Math.round(researchProgress * 100)}%
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * Connection lines between related technologies
 */
interface TechConnectionsProps {
  technologies: Technology[]
}

function TechConnections({ technologies }: TechConnectionsProps) {
  const connections = useMemo(() => {
    const lines: { from: [number, number, number]; to: [number, number, number]; color: string }[] = []

    technologies.forEach(tech => {
      const fromPos = BRANCH_POSITIONS[tech.id]
      if (!fromPos) return

      tech.prerequisites.forEach(prereqId => {
        const toPos = BRANCH_POSITIONS[prereqId]
        if (!toPos) return

        const prereqTech = technologies.find(t => t.id === prereqId)
        const isActive = prereqTech?.prerequisitesMet && tech.prerequisitesMet

        lines.push({
          from: fromPos,
          to: toPos,
          color: isActive ? getTechColor(tech.id, tech.category) : '#333333'
        })
      })
    })

    return lines
  }, [technologies])

  return (
    <group>
      {connections.map((conn, i) => (
        <Line
          key={i}
          points={[conn.from, conn.to]}
          color={conn.color}
          lineWidth={2}
          transparent
          opacity={0.6}
        />
      ))}
    </group>
  )
}

/**
 * Energy particles flowing between nodes
 */
function EnergyParticles({ technologies }: { technologies: Technology[] }) {
  const particlesRef = useRef<THREE.Points>(null)

  const { positions, colors, velocities } = useMemo(() => {
    const count = 200
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const velocities: THREE.Vector3[] = []

    const activeTechs = technologies.filter(t => t.prerequisitesMet)

    for (let i = 0; i < count; i++) {
      // Random position near a tech node
      const tech = activeTechs[Math.floor(Math.random() * activeTechs.length)]
      const pos = BRANCH_POSITIONS[tech?.id] || [0, 0, 0]

      positions[i * 3] = pos[0] + (Math.random() - 0.5) * 4
      positions[i * 3 + 1] = pos[1] + (Math.random() - 0.5) * 4
      positions[i * 3 + 2] = pos[2] + (Math.random() - 0.5) * 4

      const color = new THREE.Color(getTechColor(tech?.id || '', tech?.category || 'basic'))
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      ))
    }

    return { positions, colors, velocities }
  }, [technologies])

  useFrame(() => {
    if (particlesRef.current) {
      const posAttr = particlesRef.current.geometry.getAttribute('position')

      for (let i = 0; i < velocities.length; i++) {
        posAttr.array[i * 3] += velocities[i].x
        posAttr.array[i * 3 + 1] += velocities[i].y
        posAttr.array[i * 3 + 2] += velocities[i].z

        // Reset particles that drift too far
        const dist = Math.sqrt(
          posAttr.array[i * 3] ** 2 +
          posAttr.array[i * 3 + 1] ** 2 +
          posAttr.array[i * 3 + 2] ** 2
        )
        if (dist > 25) {
          posAttr.array[i * 3] = (Math.random() - 0.5) * 10
          posAttr.array[i * 3 + 1] = Math.random() * 5
          posAttr.array[i * 3 + 2] = (Math.random() - 0.5) * 10
        }
      }

      posAttr.needsUpdate = true
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        transparent
        opacity={0.6}
        vertexColors
        sizeAttenuation
      />
    </points>
  )
}

/**
 * Detailed info panel for selected technology
 */
interface TechDetailPanelProps {
  tech: Technology
  resources: { metal: number; crystal: number; deuterium: number }
  isResearching: boolean
  researchProgress?: number
  canAfford: boolean
  onResearch: () => void
  onCancel?: () => void
  onClose: () => void
}

function TechDetailPanel({
  tech,
  resources,
  isResearching,
  researchProgress = 0,
  canAfford,
  onResearch,
  onCancel,
  onClose
}: TechDetailPanelProps) {
  const color = getTechColor(tech.id, tech.category)

  return (
    <div
      className="absolute right-4 top-4 w-80 bg-black/90 backdrop-blur-md rounded-lg border overflow-hidden"
      style={{ borderColor: color + '60' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: color + '40', background: color + '15' }}
      >
        <div>
          <h3 className="font-bold text-lg" style={{ color }}>{tech.name}</h3>
          <div className="text-sm text-gray-400">
            Niveau {tech.level} {tech.maxLevel && `/ ${tech.maxLevel}`}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors"
        >
          X
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Bonus description */}
        <div>
          <div className="text-xs text-gray-500 uppercase mb-1">Bonus</div>
          <div className="text-sm text-gray-300">{tech.bonus}</div>
        </div>

        {/* Cost */}
        <div>
          <div className="text-xs text-gray-500 uppercase mb-2">Cout niveau {tech.level + 1}</div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className={tech.cost.metal <= resources.metal ? 'text-yellow-400' : 'text-red-400'}>
              <div className="text-xs text-gray-500">Metal</div>
              {formatNumber(tech.cost.metal)}
            </div>
            <div className={tech.cost.crystal <= resources.crystal ? 'text-cyan-400' : 'text-red-400'}>
              <div className="text-xs text-gray-500">Cristal</div>
              {formatNumber(tech.cost.crystal)}
            </div>
            <div className={tech.cost.deuterium <= resources.deuterium ? 'text-green-400' : 'text-red-400'}>
              <div className="text-xs text-gray-500">Deuterium</div>
              {formatNumber(tech.cost.deuterium)}
            </div>
          </div>
        </div>

        {/* Research time */}
        <div>
          <div className="text-xs text-gray-500 uppercase mb-1">Temps de recherche</div>
          <div className="text-sm text-gray-300">{tech.researchTime}</div>
        </div>

        {/* Prerequisites */}
        {tech.prerequisites.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 uppercase mb-1">Prerequis</div>
            <div className="text-sm">
              {tech.prerequisitesMet ? (
                <span className="text-green-400">Tous les prerequis sont remplis</span>
              ) : (
                <span className="text-red-400">Prerequis manquants</span>
              )}
            </div>
          </div>
        )}

        {/* Research progress */}
        {isResearching && (
          <div>
            <div className="text-xs text-gray-500 uppercase mb-2">Progression</div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${researchProgress * 100}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}88)`
                }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1 text-right">
              {Math.round(researchProgress * 100)}%
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="pt-2">
          {isResearching ? (
            <button
              onClick={onCancel}
              className="w-full py-2 px-4 rounded font-semibold text-sm bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              Annuler la recherche
            </button>
          ) : (
            <button
              onClick={onResearch}
              disabled={!canAfford || !tech.prerequisitesMet}
              className={`
                w-full py-2 px-4 rounded font-semibold text-sm transition-colors
                ${canAfford && tech.prerequisitesMet
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {!tech.prerequisitesMet
                ? 'Prerequis non remplis'
                : !canAfford
                  ? 'Ressources insuffisantes'
                  : 'Lancer la recherche'
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Main scene content component
 */
interface SceneContentProps {
  technologies: Technology[]
  currentlyResearching?: { id: string; endsAt: Date; progress: number }
  selectedTechId: string | null
  onSelectTech: (id: string | null) => void
}

function SceneContent({
  technologies,
  currentlyResearching,
  selectedTechId,
  onSelectTech
}: SceneContentProps) {
  return (
    <>
      {/* Background starfield */}
      <Starfield
        count={3000}
        radius={150}
        depth={80}
        factor={3}
        saturation={0.3}
        speed={0.2}
        rotationSpeed={0.00005}
      />

      {/* Ambient lighting */}
      <ambientLight intensity={0.15} />

      {/* Main directional light */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.5}
        color="#88ccff"
      />

      {/* Point lights for tech branches */}
      <pointLight position={[10, 5, 0]} intensity={0.4} color="#ff4444" distance={15} />
      <pointLight position={[-10, 5, 0]} intensity={0.4} color="#ff6644" distance={15} />
      <pointLight position={[0, 5, -10]} intensity={0.4} color="#aa44ff" distance={15} />
      <pointLight position={[0, 5, 10]} intensity={0.4} color="#ffaa00" distance={15} />

      {/* Laboratory environment */}
      <LabEnvironment />

      {/* Central console */}
      <CentralConsole />

      {/* Technology connections */}
      <TechConnections technologies={technologies} />

      {/* Energy particles */}
      <EnergyParticles technologies={technologies} />

      {/* Technology nodes */}
      {technologies.map(tech => {
        const position = BRANCH_POSITIONS[tech.id]
        if (!position) return null

        const isResearching = currentlyResearching?.id === tech.id

        return (
          <TechNode
            key={tech.id}
            tech={tech}
            position={position}
            isResearching={isResearching}
            researchProgress={isResearching ? currentlyResearching?.progress : 0}
            isSelected={selectedTechId === tech.id}
            onSelect={() => onSelectTech(selectedTechId === tech.id ? null : tech.id)}
          />
        )
      })}
    </>
  )
}

/**
 * Loading fallback
 */
function SceneLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-cyan-400 text-sm font-medium">Chargement du laboratoire...</span>
      </div>
    </Html>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ResearchLabScene - 3D visualization of the research laboratory
 *
 * A futuristic high-tech environment where players can visualize
 * and launch their research projects on a 3D tech tree.
 */
export function ResearchLabScene({
  technologies,
  currentlyResearching,
  resources,
  onResearch,
  onCancelResearch
}: ResearchLabSceneProps) {
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null)

  const selectedTech = useMemo(
    () => technologies.find(t => t.id === selectedTechId),
    [technologies, selectedTechId]
  )

  const canAffordSelected = useMemo(() => {
    if (!selectedTech) return false
    return (
      resources.metal >= selectedTech.cost.metal &&
      resources.crystal >= selectedTech.cost.crystal &&
      resources.deuterium >= selectedTech.cost.deuterium
    )
  }, [selectedTech, resources])

  const handleResearch = useCallback(() => {
    if (selectedTechId) {
      onResearch(selectedTechId)
    }
  }, [selectedTechId, onResearch])

  const handleSelectTech = useCallback((id: string | null) => {
    setSelectedTechId(id)
  }, [])

  const isResearchingSelected = currentlyResearching?.id === selectedTechId

  return (
    <div className="w-full h-full relative bg-black">
      <Canvas
        camera={{
          position: [0, 15, 25],
          fov: 50,
          near: 0.1,
          far: 500
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
        dpr={[1, 2]}
      >
        {/* Deep space background */}
        <color attach="background" args={['#020408']} />

        {/* Scene content with Suspense */}
        <Suspense fallback={<SceneLoader />}>
          <SceneContent
            technologies={technologies}
            currentlyResearching={currentlyResearching}
            selectedTechId={selectedTechId}
            onSelectTech={handleSelectTech}
          />
        </Suspense>

        {/* Camera controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          minDistance={10}
          maxDistance={60}
          maxPolarAngle={Math.PI * 0.75}
          minPolarAngle={Math.PI * 0.15}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          panSpeed={0.6}
        />

        {/* Post-processing effects */}
        <SpaceEffects
          bloomIntensity={0.7}
          bloomThreshold={0.4}
          chromaticAberrationOffset={0.0003}
          vignetteDarkness={0.5}
        />
      </Canvas>

      {/* Tech detail panel overlay */}
      {selectedTech && (
        <TechDetailPanel
          tech={selectedTech}
          resources={resources}
          isResearching={isResearchingSelected}
          researchProgress={isResearchingSelected ? currentlyResearching?.progress : 0}
          canAfford={canAffordSelected}
          onResearch={handleResearch}
          onCancel={onCancelResearch}
          onClose={() => setSelectedTechId(null)}
        />
      )}

      {/* Research in progress indicator */}
      {currentlyResearching && (
        <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md rounded-lg px-4 py-3 border border-green-500/30">
          <div className="text-xs text-green-400 uppercase mb-1">Recherche en cours</div>
          <div className="text-white font-semibold">
            {technologies.find(t => t.id === currentlyResearching.id)?.name}
          </div>
          <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden w-48">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full transition-all duration-300"
              style={{ width: `${currentlyResearching.progress * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {Math.round(currentlyResearching.progress * 100)}% complete
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="text-gray-400 mb-2 font-medium">Branches de recherche</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#ffaa00' }} />
            <span className="text-gray-300">Energie</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#ff4444' }} />
            <span className="text-gray-300">Laser</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#4488ff' }} />
            <span className="text-gray-300">Ion</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#aa44ff' }} />
            <span className="text-gray-300">Hyperespace</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#44ff88' }} />
            <span className="text-gray-300">Plasma</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#ffd700' }} />
            <span className="text-gray-300">Graviton</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResearchLabScene
