'use client'

import { useRef, useState, useMemo, useCallback, Suspense, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, Float, Stars, Trail } from '@react-three/drei'
import * as THREE from 'three'

import { Starfield } from '@/components/game/3d'
import { SpaceEffectsLight } from '@/lib/3d/effects'
import type { Battle, BattleRound } from '@/types/battle'
import type { FleetComposition, DefenseComposition } from '@/lib/battle/types'

// ============================================================================
// TYPES
// ============================================================================

export interface BattleReportViewerProps {
  battle: Battle
}

interface ShipUnit {
  id: string
  type: string
  side: 'attacker' | 'defender'
  position: THREE.Vector3
  targetPosition: THREE.Vector3
  destroyed: boolean
  destroyedAtRound?: number
}

// ============================================================================
// SHIP GEOMETRIES (Reused from ShipyardScene)
// ============================================================================

const SHIP_CONFIGS: Record<string, {
  scale: number
  color: string
  attackerColor: string
  defenderColor: string
}> = {
  small_cargo: { scale: 0.3, color: '#88aacc', attackerColor: '#ff8844', defenderColor: '#4488ff' },
  large_cargo: { scale: 0.5, color: '#8899bb', attackerColor: '#ff7733', defenderColor: '#3377ff' },
  light_fighter: { scale: 0.25, color: '#aabbff', attackerColor: '#ff6622', defenderColor: '#2266ff' },
  heavy_fighter: { scale: 0.35, color: '#99aaee', attackerColor: '#ff5511', defenderColor: '#1155ff' },
  cruiser: { scale: 0.5, color: '#7788cc', attackerColor: '#ff4400', defenderColor: '#0044ff' },
  battleship: { scale: 0.7, color: '#6677bb', attackerColor: '#ee3300', defenderColor: '#0033ee' },
  recycler: { scale: 0.4, color: '#99aa88', attackerColor: '#dd8844', defenderColor: '#4488dd' },
  espionage_probe: { scale: 0.15, color: '#ccddff', attackerColor: '#ffaa66', defenderColor: '#66aaff' },
  bomber: { scale: 0.55, color: '#888899', attackerColor: '#dd2200', defenderColor: '#0022dd' },
  destroyer: { scale: 0.65, color: '#556688', attackerColor: '#cc1100', defenderColor: '#0011cc' },
  deathstar: { scale: 1.5, color: '#444455', attackerColor: '#ff0000', defenderColor: '#0000ff' },
  colony_ship: { scale: 0.5, color: '#aabbcc', attackerColor: '#ff9955', defenderColor: '#5599ff' },
  battlecruiser: { scale: 0.6, color: '#5566aa', attackerColor: '#ee2211', defenderColor: '#1122ee' },
  reaper: { scale: 0.7, color: '#445566', attackerColor: '#bb1100', defenderColor: '#0011bb' },
  pathfinder: { scale: 0.4, color: '#aaccee', attackerColor: '#ffbb77', defenderColor: '#77bbff' },
  // Defenses
  rocket_launcher: { scale: 0.2, color: '#777788', attackerColor: '#ff4444', defenderColor: '#4444ff' },
  light_laser: { scale: 0.25, color: '#88ff88', attackerColor: '#ff5555', defenderColor: '#55ff55' },
  heavy_laser: { scale: 0.35, color: '#44ff44', attackerColor: '#ff3333', defenderColor: '#33ff33' },
  gauss_cannon: { scale: 0.5, color: '#aaaacc', attackerColor: '#ff2222', defenderColor: '#2222ff' },
  ion_cannon: { scale: 0.4, color: '#8888ff', attackerColor: '#ff1111', defenderColor: '#1111ff' },
  plasma_turret: { scale: 0.6, color: '#ff44ff', attackerColor: '#ff0088', defenderColor: '#8800ff' },
  small_shield_dome: { scale: 0.8, color: '#44aaff', attackerColor: '#ff8800', defenderColor: '#0088ff' },
  large_shield_dome: { scale: 1.2, color: '#2288ff', attackerColor: '#ffaa00', defenderColor: '#00aaff' },
}

// ============================================================================
// COMBAT SHIP COMPONENT
// ============================================================================

interface CombatShipProps {
  unit: ShipUnit
  currentRound: number
  isPlaying: boolean
}

function CombatShip({ unit, currentRound, isPlaying }: CombatShipProps) {
  const meshRef = useRef<THREE.Group>(null)
  const config = SHIP_CONFIGS[unit.type] || { scale: 0.3, attackerColor: '#ff8844', defenderColor: '#4488ff' }
  const color = unit.side === 'attacker' ? config.attackerColor : config.defenderColor

  const isDestroyed = unit.destroyed && (unit.destroyedAtRound || 0) <= currentRound

  useFrame(({ clock }) => {
    if (!meshRef.current || isDestroyed) return

    // Slight hovering animation
    meshRef.current.position.y = unit.position.y + Math.sin(clock.elapsedTime * 2 + unit.position.x) * 0.1

    // Combat movement
    if (isPlaying) {
      const t = Math.sin(clock.elapsedTime * 3) * 0.2
      meshRef.current.position.x = unit.position.x + t * (unit.side === 'attacker' ? 1 : -1)
    }
  })

  if (isDestroyed) {
    return null
  }

  return (
    <group ref={meshRef} position={unit.position}>
      {/* Main ship body */}
      <mesh rotation={[Math.PI / 2, 0, unit.side === 'attacker' ? 0 : Math.PI]}>
        <coneGeometry args={[config.scale * 0.5, config.scale * 1.5, 6]} />
        <meshStandardMaterial
          color={color}
          metalness={0.7}
          roughness={0.3}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Engine glow */}
      <mesh position={[unit.side === 'attacker' ? -config.scale * 0.8 : config.scale * 0.8, 0, 0]}>
        <sphereGeometry args={[config.scale * 0.2, 8, 8]} />
        <meshBasicMaterial
          color={unit.side === 'attacker' ? '#ff4400' : '#0044ff'}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Shield effect when active */}
      <mesh scale={1.3}>
        <sphereGeometry args={[config.scale * 0.8, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.1}
          wireframe
        />
      </mesh>
    </group>
  )
}

// ============================================================================
// DEFENSE UNIT COMPONENT
// ============================================================================

interface DefenseUnitProps {
  type: string
  position: THREE.Vector3
  destroyed: boolean
  destroyedAtRound?: number
  currentRound: number
}

function DefenseUnit({ type, position, destroyed, destroyedAtRound, currentRound }: DefenseUnitProps) {
  const meshRef = useRef<THREE.Group>(null)
  const config = SHIP_CONFIGS[type] || { scale: 0.3, defenderColor: '#4488ff' }

  const isDestroyed = destroyed && (destroyedAtRound || 0) <= currentRound

  if (isDestroyed) {
    return null
  }

  return (
    <group ref={meshRef} position={position}>
      {/* Defense structure */}
      <mesh>
        <cylinderGeometry args={[config.scale * 0.4, config.scale * 0.6, config.scale * 0.8, 8]} />
        <meshStandardMaterial
          color={config.defenderColor}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Weapon barrel */}
      <mesh position={[0, config.scale * 0.5, 0]} rotation={[Math.PI / 4, 0, 0]}>
        <cylinderGeometry args={[config.scale * 0.1, config.scale * 0.1, config.scale * 0.6, 6]} />
        <meshStandardMaterial color="#666677" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Base platform */}
      <mesh position={[0, -config.scale * 0.5, 0]}>
        <cylinderGeometry args={[config.scale * 0.7, config.scale * 0.7, config.scale * 0.2, 12]} />
        <meshStandardMaterial color="#333344" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}

// ============================================================================
// LASER BEAM EFFECT
// ============================================================================

interface LaserBeamProps {
  from: THREE.Vector3
  to: THREE.Vector3
  color: string
  active: boolean
}

function LaserBeam({ from, to, color, active }: LaserBeamProps) {
  const lineRef = useRef<THREE.Line>(null)

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to])
    return geometry
  }, [from, to])

  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color,
      linewidth: 2,
      transparent: true,
      opacity: 0.8
    })
  }, [color])

  if (!active) return null

  return (
    <primitive
      ref={lineRef}
      object={new THREE.Line(lineGeometry, lineMaterial)}
    />
  )
}

// ============================================================================
// EXPLOSION EFFECT
// ============================================================================

interface ExplosionProps {
  position: THREE.Vector3
  active: boolean
  onComplete: () => void
}

function Explosion({ position, active, onComplete }: ExplosionProps) {
  const [scale, setScale] = useState(0.1)
  const [opacity, setOpacity] = useState(1)

  useFrame((_, delta) => {
    if (!active) return

    setScale(s => Math.min(s + delta * 5, 2))
    setOpacity(o => Math.max(o - delta * 2, 0))

    if (opacity <= 0) {
      onComplete()
    }
  })

  if (!active || opacity <= 0) return null

  return (
    <group position={position}>
      <mesh scale={scale}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={opacity}
        />
      </mesh>
      <mesh scale={scale * 0.7}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color="#ffff00"
          transparent
          opacity={opacity * 0.8}
        />
      </mesh>
    </group>
  )
}

// ============================================================================
// BATTLE FIELD
// ============================================================================

interface BattleFieldProps {
  battle: Battle
  currentRound: number
  isPlaying: boolean
}

function BattleField({ battle, currentRound, isPlaying }: BattleFieldProps) {
  // Generate unit positions
  const { attackerUnits, defenderUnits, defenseUnits } = useMemo(() => {
    const attackerUnits: ShipUnit[] = []
    const defenderUnits: ShipUnit[] = []
    const defenseUnits: { type: string; position: THREE.Vector3; destroyed: boolean; destroyedAtRound?: number }[] = []

    // Create attacker ships
    let attackerIndex = 0
    for (const [shipType, count] of Object.entries(battle.attacker.fleet)) {
      if (!count || count <= 0) continue

      for (let i = 0; i < Math.min(count, 20); i++) { // Limit for performance
        const row = Math.floor(attackerIndex / 5)
        const col = attackerIndex % 5

        attackerUnits.push({
          id: `attacker-${shipType}-${i}`,
          type: shipType,
          side: 'attacker',
          position: new THREE.Vector3(-15 - col * 2, row * 1.5 - 3, (Math.random() - 0.5) * 10),
          targetPosition: new THREE.Vector3(0, 0, 0),
          destroyed: (battle.attacker.losses[shipType] || 0) > i,
          destroyedAtRound: battle.attacker.losses[shipType] > i ? Math.ceil(Math.random() * battle.result.totalRounds) : undefined,
        })
        attackerIndex++
      }
    }

    // Create defender ships
    let defenderIndex = 0
    for (const [shipType, count] of Object.entries(battle.defender.fleet)) {
      if (!count || count <= 0) continue

      for (let i = 0; i < Math.min(count, 20); i++) {
        const row = Math.floor(defenderIndex / 5)
        const col = defenderIndex % 5

        defenderUnits.push({
          id: `defender-${shipType}-${i}`,
          type: shipType,
          side: 'defender',
          position: new THREE.Vector3(15 + col * 2, row * 1.5 - 3, (Math.random() - 0.5) * 10),
          targetPosition: new THREE.Vector3(0, 0, 0),
          destroyed: (battle.defender.losses[shipType] || 0) > i,
          destroyedAtRound: battle.defender.losses[shipType] > i ? Math.ceil(Math.random() * battle.result.totalRounds) : undefined,
        })
        defenderIndex++
      }
    }

    // Create defense units
    if (battle.defender.defense) {
      let defenseIndex = 0
      for (const [defType, count] of Object.entries(battle.defender.defense)) {
        if (!count || count <= 0) continue

        for (let i = 0; i < Math.min(count, 10); i++) {
          const angle = (defenseIndex / 15) * Math.PI * 2
          const radius = 20 + Math.floor(defenseIndex / 15) * 3

          defenseUnits.push({
            type: defType,
            position: new THREE.Vector3(
              Math.cos(angle) * radius + 15,
              -5,
              Math.sin(angle) * radius
            ),
            destroyed: (battle.defender.defenseLosses?.[defType] || 0) > i,
            destroyedAtRound: battle.defender.defenseLosses?.[defType] && battle.defender.defenseLosses[defType] > i
              ? Math.ceil(Math.random() * battle.result.totalRounds)
              : undefined,
          })
          defenseIndex++
        }
      }
    }

    return { attackerUnits, defenderUnits, defenseUnits }
  }, [battle])

  return (
    <group>
      {/* Battle arena floor */}
      <mesh position={[0, -8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 60]} />
        <meshStandardMaterial
          color="#0a0a1a"
          metalness={0.3}
          roughness={0.7}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Grid lines */}
      <gridHelper args={[100, 50, '#1a1a3a', '#0a0a2a']} position={[0, -7.9, 0]} />

      {/* Attacker ships */}
      {attackerUnits.map(unit => (
        <CombatShip
          key={unit.id}
          unit={unit}
          currentRound={currentRound}
          isPlaying={isPlaying}
        />
      ))}

      {/* Defender ships */}
      {defenderUnits.map(unit => (
        <CombatShip
          key={unit.id}
          unit={unit}
          currentRound={currentRound}
          isPlaying={isPlaying}
        />
      ))}

      {/* Defense units */}
      {defenseUnits.map((def, i) => (
        <DefenseUnit
          key={`defense-${def.type}-${i}`}
          {...def}
          currentRound={currentRound}
        />
      ))}

      {/* Planet (defender's position) */}
      <mesh position={[25, 0, 0]}>
        <sphereGeometry args={[8, 32, 32]} />
        <meshStandardMaterial
          color="#334455"
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>

      {/* Planet atmosphere */}
      <mesh position={[25, 0, 0]}>
        <sphereGeometry args={[8.5, 32, 32]} />
        <meshBasicMaterial
          color="#4488ff"
          transparent
          opacity={0.1}
        />
      </mesh>

      {/* Side indicators */}
      <Html position={[-20, 8, 0]} center>
        <div className="text-orange-400 font-bold text-lg bg-black/60 px-4 py-2 rounded-lg border border-orange-500/30">
          ATTACKER
        </div>
      </Html>

      <Html position={[20, 8, 0]} center>
        <div className="text-blue-400 font-bold text-lg bg-black/60 px-4 py-2 rounded-lg border border-blue-500/30">
          DEFENDER
        </div>
      </Html>
    </group>
  )
}

// ============================================================================
// ROUND INFO PANEL
// ============================================================================

interface RoundInfoPanelProps {
  battle: Battle
  currentRound: number
  onRoundChange: (round: number) => void
  isPlaying: boolean
  onPlayPause: () => void
}

function RoundInfoPanel({ battle, currentRound, onRoundChange, isPlaying, onPlayPause }: RoundInfoPanelProps) {
  const round = battle.rounds[currentRound - 1]

  if (!round) return null

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-72">
      <div className="bg-black/80 border border-cyan-500/30 rounded-lg overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 px-4 py-3 border-b border-cyan-500/20">
          <div className="flex items-center justify-between">
            <h3 className="text-cyan-300 font-bold">Round {currentRound}</h3>
            <span className="text-gray-400 text-sm">of {battle.result.totalRounds}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 space-y-3">
          {/* Attacker stats */}
          <div className="space-y-1">
            <div className="text-orange-400 text-sm font-semibold">Attacker</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-orange-900/30 rounded px-2 py-1">
                <span className="text-gray-400">Units:</span>{' '}
                <span className="text-orange-300">{round.attackerSnapshot.unitCount}</span>
              </div>
              <div className="bg-orange-900/30 rounded px-2 py-1">
                <span className="text-gray-400">Lost:</span>{' '}
                <span className="text-red-300">{round.attackerUnitsLost}</span>
              </div>
              <div className="bg-orange-900/30 rounded px-2 py-1">
                <span className="text-gray-400">Shots:</span>{' '}
                <span className="text-orange-300">{round.attackerShots}</span>
              </div>
              <div className="bg-orange-900/30 rounded px-2 py-1">
                <span className="text-gray-400">Damage:</span>{' '}
                <span className="text-yellow-300">{round.attackerDamage.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Defender stats */}
          <div className="space-y-1">
            <div className="text-blue-400 text-sm font-semibold">Defender</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-blue-900/30 rounded px-2 py-1">
                <span className="text-gray-400">Units:</span>{' '}
                <span className="text-blue-300">{round.defenderSnapshot.unitCount}</span>
              </div>
              <div className="bg-blue-900/30 rounded px-2 py-1">
                <span className="text-gray-400">Lost:</span>{' '}
                <span className="text-red-300">{round.defenderUnitsLost}</span>
              </div>
              <div className="bg-blue-900/30 rounded px-2 py-1">
                <span className="text-gray-400">Shots:</span>{' '}
                <span className="text-blue-300">{round.defenderShots}</span>
              </div>
              <div className="bg-blue-900/30 rounded px-2 py-1">
                <span className="text-gray-400">Damage:</span>{' '}
                <span className="text-yellow-300">{round.defenderDamage.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Round navigation */}
        <div className="px-4 pb-4 space-y-2">
          {/* Progress bar */}
          <div className="flex gap-1">
            {Array.from({ length: battle.result.totalRounds }, (_, i) => (
              <button
                key={i}
                onClick={() => onRoundChange(i + 1)}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  i + 1 === currentRound
                    ? 'bg-cyan-400'
                    : i + 1 < currentRound
                    ? 'bg-cyan-600'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => onRoundChange(Math.max(1, currentRound - 1))}
              disabled={currentRound <= 1}
              className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={onPlayPause}
              className="p-3 bg-cyan-600 hover:bg-cyan-500 rounded-full"
            >
              {isPlaying ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => onRoundChange(Math.min(battle.result.totalRounds, currentRound + 1))}
              disabled={currentRound >= battle.result.totalRounds}
              className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SCENE CONTENT
// ============================================================================

interface SceneContentProps {
  battle: Battle
  currentRound: number
  isPlaying: boolean
}

function SceneContent({ battle, currentRound, isPlaying }: SceneContentProps) {
  return (
    <>
      {/* Background */}
      <Starfield count={5000} radius={300} depth={150} speed={0.1} rotationSpeed={0.00002} />
      <Stars radius={200} depth={100} count={3000} factor={4} saturation={0} fade speed={0.5} />

      {/* Battle field */}
      <BattleField battle={battle} currentRound={currentRound} isPlaying={isPlaying} />

      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[30, 30, 20]} intensity={0.6} color="#ffffff" />
      <pointLight position={[-20, 10, 0]} color="#ff6644" intensity={0.4} distance={50} />
      <pointLight position={[20, 10, 0]} color="#4466ff" intensity={0.4} distance={50} />
      <pointLight position={[25, 5, 0]} color="#aabbff" intensity={0.3} distance={30} />
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
        <div className="w-12 h-12 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-cyan-300 text-sm">Reconstructing Battle...</span>
      </div>
    </Html>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BattleReportViewer({ battle }: BattleReportViewerProps) {
  const [currentRound, setCurrentRound] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-play rounds
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentRound(r => {
          if (r >= battle.result.totalRounds) {
            setIsPlaying(false)
            return r
          }
          return r + 1
        })
      }, 2000)
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [isPlaying, battle.result.totalRounds])

  const handlePlayPause = useCallback(() => {
    if (currentRound >= battle.result.totalRounds) {
      setCurrentRound(1)
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, currentRound, battle.result.totalRounds])

  const handleRoundChange = useCallback((round: number) => {
    setCurrentRound(round)
    setIsPlaying(false)
  }, [])

  return (
    <div className="w-full h-full relative bg-black">
      <Canvas
        camera={{
          position: [0, 15, 40],
          fov: 60,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#020208']} />
        <fog attach="fog" args={['#020208', 50, 200]} />

        <Suspense fallback={<SceneLoader />}>
          <SceneContent
            battle={battle}
            currentRound={currentRound}
            isPlaying={isPlaying}
          />
        </Suspense>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          minDistance={15}
          maxDistance={100}
          maxPolarAngle={Math.PI * 0.75}
          minPolarAngle={Math.PI * 0.15}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          target={[0, 0, 0]}
        />

        <SpaceEffectsLight bloomIntensity={0.6} bloomThreshold={0.5} />
      </Canvas>

      {/* Round info panel */}
      <RoundInfoPanel
        battle={battle}
        currentRound={currentRound}
        onRoundChange={handleRoundChange}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
      />

      {/* Result summary panel */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-64">
        <div className="bg-black/80 border border-gray-700/50 rounded-lg p-4 space-y-3">
          <h4 className="text-gray-300 font-semibold border-b border-gray-700 pb-2">Battle Summary</h4>

          {/* Winner */}
          <div className={`text-center py-2 rounded ${
            battle.result.winner === 'attacker'
              ? 'bg-orange-900/30 text-orange-300'
              : battle.result.winner === 'defender'
              ? 'bg-blue-900/30 text-blue-300'
              : 'bg-yellow-900/30 text-yellow-300'
          }`}>
            <span className="font-bold">
              {battle.result.winner === 'attacker' ? 'Attacker Wins' :
               battle.result.winner === 'defender' ? 'Defender Wins' : 'Draw'}
            </span>
          </div>

          {/* Losses */}
          <div className="space-y-2 text-xs">
            <div>
              <div className="text-orange-400 mb-1">Attacker Losses</div>
              <div className="text-gray-400">
                {Object.entries(battle.attacker.losses)
                  .filter(([, v]) => v > 0)
                  .slice(0, 3)
                  .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                  .join(', ') || 'None'}
                {Object.keys(battle.attacker.losses).filter(k => battle.attacker.losses[k] > 0).length > 3 && '...'}
              </div>
            </div>

            <div>
              <div className="text-blue-400 mb-1">Defender Losses</div>
              <div className="text-gray-400">
                {Object.entries(battle.defender.losses)
                  .filter(([, v]) => v > 0)
                  .slice(0, 3)
                  .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                  .join(', ') || 'None'}
                {Object.keys(battle.defender.losses).filter(k => battle.defender.losses[k] > 0).length > 3 && '...'}
              </div>
            </div>
          </div>

          {/* Debris */}
          <div className="pt-2 border-t border-gray-700">
            <div className="text-gray-500 text-xs mb-1">Debris Field</div>
            <div className="flex gap-3 text-xs">
              <span className="text-gray-300">{battle.debris.metal.toLocaleString()} M</span>
              <span className="text-cyan-300">{battle.debris.crystal.toLocaleString()} C</span>
            </div>
          </div>

          {/* Loot */}
          {battle.loot && (battle.loot.metal > 0 || battle.loot.crystal > 0 || battle.loot.deuterium > 0) && (
            <div className="pt-2 border-t border-gray-700">
              <div className="text-gray-500 text-xs mb-1">Loot Captured</div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <span className="text-gray-300">{battle.loot.metal.toLocaleString()} M</span>
                <span className="text-cyan-300">{battle.loot.crystal.toLocaleString()} C</span>
                <span className="text-green-300">{battle.loot.deuterium.toLocaleString()} D</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 text-gray-500 text-xs">
        Drag to rotate | Scroll to zoom | Use controls to navigate rounds
      </div>
    </div>
  )
}

export default BattleReportViewer
