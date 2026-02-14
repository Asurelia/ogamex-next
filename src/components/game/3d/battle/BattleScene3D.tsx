'use client'

/**
 * BattleScene3D - Cinematic Space Battle Component
 *
 * A fully immersive 3D space battle scene featuring:
 * - Two opposing fleets in formation (attacker left, defender right)
 * - Round-by-round combat animations with weapon fire, impacts, and explosions
 * - Cinematic camera movements for dramatic effect
 * - Real-time battle statistics HUD
 * - Playback controls (play/pause, speed, skip)
 */

import { useState, useRef, useCallback, useEffect, useMemo, JSX, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, Stars, Trail, Text, Billboard, Line } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import { gsap } from 'gsap'

import { CombatEffects } from '@/lib/3d/effects'
import {
  useCameraAnimation,
  useCameraShake,
  useCinematicSequence,
  CAMERA_ANIMATIONS,
  type CinematicKeyframe,
} from '@/hooks/use3DAnimations'
import { SHIP_MODELS, type ShipType } from '@/lib/3d/constants'

// ============================================================================
// TYPES
// ============================================================================

export interface FleetComposition {
  playerId: string
  playerName: string
  ships: Array<{
    type: ShipType
    count: number
    shields: number
    armor: number
    weapons: number
  }>
}

export interface BattleEvent {
  type: 'fire' | 'hit' | 'shield_absorb' | 'destroy' | 'explode'
  source: { side: 'attacker' | 'defender'; shipIndex: number }
  target: { side: 'attacker' | 'defender'; shipIndex: number }
  damage?: number
  position?: [number, number, number]
}

export interface BattleRound {
  roundNumber: number
  events: BattleEvent[]
  attackerLosses: Record<string, number>
  defenderLosses: Record<string, number>
}

export interface BattleResult {
  winner: 'attacker' | 'defender' | 'draw'
  attackerSurvivors: Record<string, number>
  defenderSurvivors: Record<string, number>
  debris: { metal: number; crystal: number }
  loot?: { metal: number; crystal: number; deuterium: number }
}

export interface BattleSceneProps {
  attackerFleet: FleetComposition
  defenderFleet: FleetComposition
  battleRounds: BattleRound[]
  battleResult: BattleResult
  onBattleComplete?: () => void
  autoPlay?: boolean
  playbackSpeed?: number
}

// Internal battle state
interface BattleState {
  phase: 'intro' | 'combat' | 'outro' | 'complete'
  currentRound: number
  currentEventIndex: number
  isPaused: boolean
  playbackSpeed: number
  attackerShipsAlive: Map<number, boolean>
  defenderShipsAlive: Map<number, boolean>
}

// Ship instance for 3D rendering
interface ShipInstance {
  id: number
  type: ShipType
  side: 'attacker' | 'defender'
  position: THREE.Vector3
  rotation: THREE.Euler
  health: number
  maxHealth: number
  shield: number
  maxShield: number
  isAlive: boolean
  isHit: boolean
  isFiring: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BATTLE_AREA = {
  width: 100,
  height: 60,
  depth: 80,
  attackerX: -40,
  defenderX: 40,
  separationZ: 15,
}

const TIMING = {
  introLength: 3000,
  roundDelay: 1500,
  eventDelay: 200,
  outroLength: 4000,
  explosionDuration: 800,
}

const SHIP_SCALES: Record<string, number> = {
  light_fighter: 0.4,
  heavy_fighter: 0.6,
  cruiser: 1.0,
  battleship: 1.5,
  battlecruiser: 1.3,
  bomber: 1.2,
  destroyer: 2.0,
  deathstar: 5.0,
  small_cargo: 0.3,
  large_cargo: 0.5,
  colony_ship: 0.8,
  recycler: 0.6,
  espionage_probe: 0.1,
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateFormationPositions(
  ships: FleetComposition['ships'],
  side: 'attacker' | 'defender'
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = []
  const baseX = side === 'attacker' ? BATTLE_AREA.attackerX : BATTLE_AREA.defenderX
  const direction = side === 'attacker' ? 1 : -1

  let totalShips = 0
  ships.forEach((ship) => {
    totalShips += ship.count
  })

  // Create formation grid
  const rows = Math.ceil(Math.sqrt(totalShips))
  const cols = Math.ceil(totalShips / rows)
  const spacing = 8

  let shipIndex = 0
  ships.forEach((shipGroup) => {
    for (let i = 0; i < shipGroup.count; i++) {
      const row = Math.floor(shipIndex / cols)
      const col = shipIndex % cols

      const x = baseX + (col - cols / 2) * spacing * 0.5 * direction
      const y = (row - rows / 2) * spacing * 0.6
      const z = (col % 2 === 0 ? 1 : -1) * ((row % 3) * spacing * 0.3)

      positions.push(new THREE.Vector3(x, y, z))
      shipIndex++
    }
  })

  return positions
}

function createShipInstances(
  fleet: FleetComposition,
  side: 'attacker' | 'defender'
): ShipInstance[] {
  const positions = generateFormationPositions(fleet.ships, side)
  const instances: ShipInstance[] = []
  const facingAngle = side === 'attacker' ? Math.PI / 2 : -Math.PI / 2

  let positionIndex = 0
  fleet.ships.forEach((shipGroup) => {
    for (let i = 0; i < shipGroup.count; i++) {
      instances.push({
        id: instances.length,
        type: shipGroup.type,
        side,
        position: positions[positionIndex] || new THREE.Vector3(),
        rotation: new THREE.Euler(0, facingAngle, 0),
        health: shipGroup.armor,
        maxHealth: shipGroup.armor,
        shield: shipGroup.shields,
        maxShield: shipGroup.shields,
        isAlive: true,
        isHit: false,
        isFiring: false,
      })
      positionIndex++
    }
  })

  return instances
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Individual battle ship with animations
 */
interface BattleShipProps {
  instance: ShipInstance
  onDestroy?: () => void
}

function BattleShip({ instance, onDestroy }: BattleShipProps): JSX.Element | null {
  const meshRef = useRef<THREE.Group>(null)
  const engineRef = useRef<THREE.Mesh>(null)
  const [hitFlash, setHitFlash] = useState(false)
  const [exploding, setExploding] = useState(false)
  const [visible, setVisible] = useState(true)

  const shipConfig = SHIP_MODELS[instance.type] || SHIP_MODELS.light_fighter
  const scale = SHIP_SCALES[instance.type] || 0.5

  // Handle hit animation
  useEffect(() => {
    if (instance.isHit) {
      setHitFlash(true)
      const timer = setTimeout(() => setHitFlash(false), 150)
      return () => clearTimeout(timer)
    }
  }, [instance.isHit])

  // Handle destruction
  useEffect(() => {
    if (!instance.isAlive && !exploding) {
      setExploding(true)
      const timer = setTimeout(() => {
        setVisible(false)
        onDestroy?.()
      }, TIMING.explosionDuration)
      return () => clearTimeout(timer)
    }
  }, [instance.isAlive, exploding, onDestroy])

  // Hover and engine animation
  useFrame(({ clock }) => {
    if (!meshRef.current || !visible) return

    // Slight hover motion
    meshRef.current.position.y =
      instance.position.y + Math.sin(clock.elapsedTime * 2 + instance.id) * 0.1

    // Engine glow pulse
    if (engineRef.current) {
      const material = engineRef.current.material as THREE.MeshBasicMaterial
      material.opacity = 0.6 + Math.sin(clock.elapsedTime * 5) * 0.2
    }
  })

  if (!visible) return null

  const shipColor = hitFlash ? '#ffffff' : exploding ? '#ff4400' : shipConfig.color
  const emissionIntensity = hitFlash ? 1 : exploding ? 2 : 0

  return (
    <group
      ref={meshRef}
      position={instance.position}
      rotation={instance.rotation}
      scale={scale}
    >
      {/* Ship body */}
      <mesh castShadow>
        <coneGeometry args={[0.3, 1, 6]} />
        <meshStandardMaterial
          color={shipColor}
          metalness={0.8}
          roughness={0.2}
          emissive={hitFlash || exploding ? shipColor : '#000000'}
          emissiveIntensity={emissionIntensity}
        />
      </mesh>

      {/* Ship wings */}
      <mesh position={[0.4, 0, 0.2]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.5, 0.05, 0.3]} />
        <meshStandardMaterial
          color={shipColor}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[-0.4, 0, 0.2]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.5, 0.05, 0.3]} />
        <meshStandardMaterial
          color={shipColor}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Engine glow */}
      <mesh ref={engineRef} position={[0, -0.6, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial
          color={instance.side === 'attacker' ? '#00aaff' : '#ff4400'}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Engine trail */}
      {!exploding && (
        <mesh position={[0, -0.9, 0]}>
          <coneGeometry args={[0.08, 0.5, 8]} />
          <meshBasicMaterial
            color={instance.side === 'attacker' ? '#0066ff' : '#ff2200'}
            transparent
            opacity={0.5}
          />
        </mesh>
      )}

      {/* Shield indicator */}
      {instance.shield > 0 && !exploding && (
        <mesh>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshBasicMaterial
            color="#44aaff"
            transparent
            opacity={0.1 + (instance.shield / instance.maxShield) * 0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Explosion effect */}
      {exploding && (
        <>
          <pointLight color="#ff4400" intensity={3} distance={5} decay={2} />
          <mesh>
            <sphereGeometry args={[1.2, 16, 16]} />
            <meshBasicMaterial
              color="#ff6600"
              transparent
              opacity={0.6}
            />
          </mesh>
          <mesh scale={1.5}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial
              color="#ffaa00"
              transparent
              opacity={0.3}
            />
          </mesh>
        </>
      )}
    </group>
  )
}

/**
 * Fleet group containing multiple ships
 */
interface BattleFleetProps {
  instances: ShipInstance[]
  side: 'attacker' | 'defender'
  onShipDestroy?: (shipId: number) => void
}

function BattleFleet({ instances, side, onShipDestroy }: BattleFleetProps): JSX.Element {
  return (
    <group name={`fleet-${side}`}>
      {instances.map((instance) => (
        <BattleShip
          key={`${side}-${instance.id}`}
          instance={instance}
          onDestroy={() => onShipDestroy?.(instance.id)}
        />
      ))}
    </group>
  )
}

/**
 * Laser beam effect for weapon fire
 */
interface LaserBeamProps {
  start: THREE.Vector3
  end: THREE.Vector3
  color?: string
  onComplete?: () => void
}

function LaserBeam({ start, end, color = '#ff0000', onComplete }: LaserBeamProps): JSX.Element | null {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onComplete?.()
    }, 200)
    return () => clearTimeout(timer)
  }, [onComplete])

  if (!visible) return null

  const points: Array<[number, number, number]> = [
    [start.x, start.y, start.z],
    [end.x, end.y, end.z],
  ]

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      transparent
      opacity={0.8}
    />
  )
}

/**
 * Explosion particle effect
 */
interface ExplosionProps {
  position: THREE.Vector3
  scale?: number
  onComplete?: () => void
}

function Explosion({ position, scale = 1, onComplete }: ExplosionProps): JSX.Element | null {
  const [visible, setVisible] = useState(true)
  const meshRef = useRef<THREE.Mesh>(null)
  const [explosionScale, setExplosionScale] = useState(0.1)

  useEffect(() => {
    // Animate explosion scale
    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = elapsed / TIMING.explosionDuration

      if (progress >= 1) {
        setVisible(false)
        onComplete?.()
        return
      }

      // Expand then fade
      const scaleProgress = Math.sin(progress * Math.PI)
      setExplosionScale(0.1 + scaleProgress * scale * 2)

      requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [scale, onComplete])

  if (!visible) return null

  return (
    <group position={position}>
      <pointLight color="#ff6600" intensity={5} distance={10} decay={2} />
      <mesh ref={meshRef} scale={explosionScale}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ff4400" transparent opacity={0.8} />
      </mesh>
      <mesh scale={explosionScale * 1.5}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.4} />
      </mesh>
      <mesh scale={explosionScale * 2}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#ff2200" transparent opacity={0.2} />
      </mesh>
    </group>
  )
}

/**
 * Impact effect when a laser hits a target
 */
interface ImpactProps {
  position: THREE.Vector3
  isShieldHit?: boolean
  onComplete?: () => void
}

function Impact({ position, isShieldHit = false, onComplete }: ImpactProps): JSX.Element | null {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onComplete?.()
    }, 300)
    return () => clearTimeout(timer)
  }, [onComplete])

  if (!visible) return null

  const color = isShieldHit ? '#44aaff' : '#ff4400'

  return (
    <group position={position}>
      <pointLight color={color} intensity={3} distance={5} decay={2} />
      <mesh>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

/**
 * Battle HUD overlay showing real-time statistics
 */
interface BattleHUDProps {
  attackerFleet: FleetComposition
  defenderFleet: FleetComposition
  battleState: BattleState
  attackerShipsRemaining: number
  defenderShipsRemaining: number
  currentRound: number
  totalRounds: number
}

function BattleHUD({
  attackerFleet,
  defenderFleet,
  battleState,
  attackerShipsRemaining,
  defenderShipsRemaining,
  currentRound,
  totalRounds,
}: BattleHUDProps): JSX.Element {
  const attackerTotal = attackerFleet.ships.reduce((sum, s) => sum + s.count, 0)
  const defenderTotal = defenderFleet.ships.reduce((sum, s) => sum + s.count, 0)

  const attackerHealthPercent = (attackerShipsRemaining / attackerTotal) * 100
  const defenderHealthPercent = (defenderShipsRemaining / defenderTotal) * 100

  return (
    <div className="absolute inset-x-0 top-0 z-40 pointer-events-none">
      {/* Top bar with fleet stats */}
      <div className="flex justify-between items-start p-4">
        {/* Attacker stats */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-cyan-900/80 to-transparent backdrop-blur-sm rounded-r-lg p-4 border-l-4 border-cyan-500"
        >
          <div className="text-cyan-300 text-sm font-medium mb-1">ATTACKER</div>
          <div className="text-white text-lg font-bold">{attackerFleet.playerName}</div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-cyan-200">{attackerShipsRemaining} / {attackerTotal}</span>
            </div>
            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300"
                initial={{ width: '100%' }}
                animate={{ width: `${attackerHealthPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Round indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center"
        >
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-6 py-3 border border-white/20">
            {battleState.phase === 'intro' && (
              <div className="text-yellow-400 font-bold text-lg animate-pulse">
                BATTLE COMMENCING
              </div>
            )}
            {battleState.phase === 'combat' && (
              <>
                <div className="text-gray-400 text-xs">ROUND</div>
                <div className="text-white text-2xl font-bold">{currentRound} / {totalRounds}</div>
              </>
            )}
            {battleState.phase === 'outro' && (
              <div className="text-green-400 font-bold text-lg">
                BATTLE COMPLETE
              </div>
            )}
          </div>
        </motion.div>

        {/* Defender stats */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-l from-red-900/80 to-transparent backdrop-blur-sm rounded-l-lg p-4 border-r-4 border-red-500 text-right"
        >
          <div className="text-red-300 text-sm font-medium mb-1">DEFENDER</div>
          <div className="text-white text-lg font-bold">{defenderFleet.playerName}</div>
          <div className="flex items-center justify-end gap-3 mt-2">
            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-l from-red-500 to-red-300 ml-auto"
                initial={{ width: '100%' }}
                animate={{ width: `${defenderHealthPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-200">{defenderShipsRemaining} / {defenderTotal}</span>
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/**
 * Battle controls for playback
 */
interface BattleControlsProps {
  isPaused: boolean
  playbackSpeed: number
  phase: BattleState['phase']
  onPlayPause: () => void
  onSpeedChange: (speed: number) => void
  onSkip: () => void
}

function BattleControls({
  isPaused,
  playbackSpeed,
  phase,
  onPlayPause,
  onSpeedChange,
  onSkip,
}: BattleControlsProps): JSX.Element {
  const speeds = [0.5, 1, 2, 4]

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-4 bg-black/70 backdrop-blur-md rounded-full px-6 py-3 border border-white/20">
        {/* Play/Pause button */}
        <button
          onClick={onPlayPause}
          disabled={phase === 'complete'}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200
            ${phase === 'complete'
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-500 hover:scale-105'
            }
          `}
        >
          {isPaused ? (
            <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.5 4a1 1 0 00-1 1v10a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1h-2zm7 0a1 1 0 00-1 1v10a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1h-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Speed selector */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Speed:</span>
          <div className="flex gap-1">
            {speeds.map((speed) => (
              <button
                key={speed}
                onClick={() => onSpeedChange(speed)}
                className={`
                  px-3 py-1 rounded text-sm font-medium transition-all
                  ${playbackSpeed === speed
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }
                `}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Skip button */}
        <button
          onClick={onSkip}
          disabled={phase === 'complete'}
          className={`
            px-4 py-2 rounded-full text-sm font-medium transition-all
            ${phase === 'complete'
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gray-700 text-white hover:bg-gray-600'
            }
          `}
        >
          Skip to End
        </button>
      </div>
    </motion.div>
  )
}

/**
 * Battle result overlay
 */
interface BattleResultOverlayProps {
  result: BattleResult
  attackerName: string
  defenderName: string
  onClose?: () => void
}

function BattleResultOverlay({
  result,
  attackerName,
  defenderName,
  onClose,
}: BattleResultOverlayProps): JSX.Element {
  const winnerName = result.winner === 'attacker' ? attackerName :
                     result.winner === 'defender' ? defenderName : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl p-8 max-w-lg w-full mx-4 border border-white/20 shadow-2xl"
      >
        {/* Victory/Defeat header */}
        <div className="text-center mb-6">
          {result.winner === 'draw' ? (
            <div className="text-yellow-400 text-3xl font-bold mb-2">DRAW</div>
          ) : (
            <>
              <div className={`text-3xl font-bold mb-2 ${
                result.winner === 'attacker' ? 'text-cyan-400' : 'text-red-400'
              }`}>
                VICTORY
              </div>
              <div className="text-white text-xl">{winnerName}</div>
            </>
          )}
        </div>

        {/* Debris field */}
        <div className="bg-black/40 rounded-lg p-4 mb-4">
          <div className="text-gray-400 text-sm mb-2">DEBRIS FIELD</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-gray-300">Metal:</span>
              <span className="text-white font-medium">{result.debris.metal.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400" />
              <span className="text-gray-300">Crystal:</span>
              <span className="text-white font-medium">{result.debris.crystal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Loot (if attacker won) */}
        {result.loot && (
          <div className="bg-gradient-to-r from-yellow-900/40 to-yellow-800/20 rounded-lg p-4 mb-4 border border-yellow-600/30">
            <div className="text-yellow-400 text-sm mb-2">RESOURCES CAPTURED</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-gray-400 text-xs">Metal</div>
                <div className="text-white font-medium">{result.loot.metal.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs">Crystal</div>
                <div className="text-white font-medium">{result.loot.crystal.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs">Deuterium</div>
                <div className="text-white font-medium">{result.loot.deuterium.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Survivors */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-cyan-900/20 rounded-lg p-3 border border-cyan-600/30">
            <div className="text-cyan-400 text-sm mb-2">{attackerName}</div>
            <div className="text-white">
              {Object.entries(result.attackerSurvivors).filter(([, count]) => count > 0).length > 0
                ? Object.entries(result.attackerSurvivors)
                    .filter(([, count]) => count > 0)
                    .map(([type, count]) => (
                      <div key={type} className="text-sm text-gray-300">
                        {type}: {count}
                      </div>
                    ))
                : <span className="text-gray-500">No survivors</span>
              }
            </div>
          </div>
          <div className="bg-red-900/20 rounded-lg p-3 border border-red-600/30">
            <div className="text-red-400 text-sm mb-2">{defenderName}</div>
            <div className="text-white">
              {Object.entries(result.defenderSurvivors).filter(([, count]) => count > 0).length > 0
                ? Object.entries(result.defenderSurvivors)
                    .filter(([, count]) => count > 0)
                    .map(([type, count]) => (
                      <div key={type} className="text-sm text-gray-300">
                        {type}: {count}
                      </div>
                    ))
                : <span className="text-gray-500">No survivors</span>
              }
            </div>
          </div>
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 rounded-lg text-white font-medium transition-all"
          >
            Close Battle Report
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// CAMERA CONTROLLER
// ============================================================================

interface CameraControllerProps {
  phase: BattleState['phase']
  currentRound: number
  attackerCenter: THREE.Vector3
  defenderCenter: THREE.Vector3
}

function CameraController({
  phase,
  currentRound,
  attackerCenter,
  defenderCenter,
}: CameraControllerProps): null {
  const { camera } = useThree()
  const { animateTo, isAnimating } = useCameraAnimation()
  const { shake } = useCameraShake()
  const { playSequence } = useCinematicSequence()
  const lastPhaseRef = useRef<string>('')
  const lastRoundRef = useRef<number>(0)

  // Battle center point
  const battleCenter = useMemo(() => {
    return new THREE.Vector3(
      (attackerCenter.x + defenderCenter.x) / 2,
      0,
      0
    )
  }, [attackerCenter, defenderCenter])

  // Intro camera sequence
  useEffect(() => {
    if (phase === 'intro' && lastPhaseRef.current !== 'intro') {
      lastPhaseRef.current = 'intro'

      const keyframes: CinematicKeyframe[] = [
        {
          position: [0, 80, 120],
          lookAt: battleCenter.toArray() as [number, number, number],
          duration: 2,
          ease: 'power2.inOut',
        },
        {
          position: [0, 30, 80],
          lookAt: battleCenter.toArray() as [number, number, number],
          duration: 1,
          ease: 'power2.out',
        },
      ]

      playSequence(keyframes)
    }
  }, [phase, battleCenter, playSequence])

  // Combat camera movements
  useEffect(() => {
    if (phase === 'combat' && currentRound !== lastRoundRef.current) {
      lastRoundRef.current = currentRound

      // Alternate camera positions during combat
      const positions: Array<[number, number, number]> = [
        [0, 25, 70],
        [40, 20, 50],
        [-40, 20, 50],
        [0, 40, 40],
        [30, 15, 60],
      ]

      const posIndex = currentRound % positions.length
      const targetPos = positions[posIndex]

      animateTo(
        {
          position: targetPos,
          lookAt: battleCenter.toArray() as [number, number, number],
        },
        {
          duration: 1.5,
          ease: 'power2.inOut',
        }
      )

      // Add camera shake for combat intensity
      shake({ intensity: 0.1, duration: 0.3, decay: true })
    }
  }, [phase, currentRound, battleCenter, animateTo, shake])

  // Outro camera sequence
  useEffect(() => {
    if (phase === 'outro' && lastPhaseRef.current !== 'outro') {
      lastPhaseRef.current = 'outro'

      const keyframes: CinematicKeyframe[] = [
        {
          position: [0, 50, 100],
          lookAt: battleCenter.toArray() as [number, number, number],
          duration: 2,
          ease: 'power2.inOut',
        },
        {
          position: [0, 60, 80],
          lookAt: battleCenter.toArray() as [number, number, number],
          duration: 2,
          ease: 'power1.out',
        },
      ]

      playSequence(keyframes)
    }
  }, [phase, battleCenter, playSequence])

  return null
}

// ============================================================================
// BATTLE SCENE CONTENT
// ============================================================================

interface BattleSceneContentProps {
  attackerFleet: FleetComposition
  defenderFleet: FleetComposition
  battleRounds: BattleRound[]
  battleResult: BattleResult
  battleState: BattleState
  onShipDestroyed: (side: 'attacker' | 'defender', shipId: number) => void
  activeEffects: Array<{
    id: string
    type: 'laser' | 'explosion' | 'impact'
    start?: THREE.Vector3
    end?: THREE.Vector3
    position?: THREE.Vector3
    color?: string
    isShieldHit?: boolean
  }>
  onEffectComplete: (id: string) => void
}

function BattleSceneContent({
  attackerFleet,
  defenderFleet,
  battleState,
  onShipDestroyed,
  activeEffects,
  onEffectComplete,
}: BattleSceneContentProps): JSX.Element {
  // Create ship instances
  const attackerInstances = useMemo(
    () => createShipInstances(attackerFleet, 'attacker'),
    [attackerFleet]
  )

  const defenderInstances = useMemo(
    () => createShipInstances(defenderFleet, 'defender'),
    [defenderFleet]
  )

  // Update ship alive status based on battle state
  const processedAttackerInstances = useMemo(() => {
    return attackerInstances.map((instance) => ({
      ...instance,
      isAlive: battleState.attackerShipsAlive.get(instance.id) ?? true,
    }))
  }, [attackerInstances, battleState.attackerShipsAlive])

  const processedDefenderInstances = useMemo(() => {
    return defenderInstances.map((instance) => ({
      ...instance,
      isAlive: battleState.defenderShipsAlive.get(instance.id) ?? true,
    }))
  }, [defenderInstances, battleState.defenderShipsAlive])

  // Calculate fleet centers for camera
  const attackerCenter = useMemo(() => {
    const sum = attackerInstances.reduce(
      (acc, inst) => acc.add(inst.position),
      new THREE.Vector3()
    )
    return sum.divideScalar(attackerInstances.length || 1)
  }, [attackerInstances])

  const defenderCenter = useMemo(() => {
    const sum = defenderInstances.reduce(
      (acc, inst) => acc.add(inst.position),
      new THREE.Vector3()
    )
    return sum.divideScalar(defenderInstances.length || 1)
  }, [defenderInstances])

  return (
    <>
      {/* Camera controller */}
      <CameraController
        phase={battleState.phase}
        currentRound={battleState.currentRound}
        attackerCenter={attackerCenter}
        defenderCenter={defenderCenter}
      />

      {/* Ambient and directional lighting */}
      <ambientLight intensity={0.1} color="#1a1a3a" />
      <directionalLight
        position={[50, 100, 50]}
        intensity={0.5}
        color="#ffffff"
        castShadow
      />
      <pointLight position={[0, 50, 0]} intensity={0.3} color="#4488ff" />

      {/* Starfield background */}
      <Stars
        radius={300}
        depth={100}
        count={5000}
        factor={4}
        saturation={0.5}
        fade
        speed={0.5}
      />

      {/* Attacker fleet */}
      <BattleFleet
        instances={processedAttackerInstances}
        side="attacker"
        onShipDestroy={(id) => onShipDestroyed('attacker', id)}
      />

      {/* Defender fleet */}
      <BattleFleet
        instances={processedDefenderInstances}
        side="defender"
        onShipDestroy={(id) => onShipDestroyed('defender', id)}
      />

      {/* Active visual effects */}
      {activeEffects.map((effect) => {
        switch (effect.type) {
          case 'laser':
            return effect.start && effect.end ? (
              <LaserBeam
                key={effect.id}
                start={effect.start}
                end={effect.end}
                color={effect.color}
                onComplete={() => onEffectComplete(effect.id)}
              />
            ) : null
          case 'explosion':
            return effect.position ? (
              <Explosion
                key={effect.id}
                position={effect.position}
                scale={1.5}
                onComplete={() => onEffectComplete(effect.id)}
              />
            ) : null
          case 'impact':
            return effect.position ? (
              <Impact
                key={effect.id}
                position={effect.position}
                isShieldHit={effect.isShieldHit}
                onComplete={() => onEffectComplete(effect.id)}
              />
            ) : null
          default:
            return null
        }
      })}

      {/* Battle zone markers */}
      <group>
        {/* Center line */}
        <Line
          points={[
            [0, -30, -50],
            [0, -30, 50],
          ]}
          color="#333366"
          lineWidth={1}
          transparent
          opacity={0.5}
        />

        {/* Attacker zone glow */}
        <mesh position={[BATTLE_AREA.attackerX, -30, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[60, 80]} />
          <meshBasicMaterial color="#001133" transparent opacity={0.1} />
        </mesh>

        {/* Defender zone glow */}
        <mesh position={[BATTLE_AREA.defenderX, -30, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[60, 80]} />
          <meshBasicMaterial color="#330011" transparent opacity={0.1} />
        </mesh>
      </group>

      {/* Post-processing effects */}
      <CombatEffects intensity={battleState.phase === 'combat' ? 1.0 : 0.5} />
    </>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * BattleScene3D - Main battle scene component
 *
 * Renders a cinematic 3D space battle with:
 * - Two opposing fleets in formation
 * - Animated weapon fire and explosions
 * - Cinematic camera movements
 * - Real-time HUD with battle statistics
 * - Playback controls
 */
export function BattleScene3D({
  attackerFleet,
  defenderFleet,
  battleRounds,
  battleResult,
  onBattleComplete,
  autoPlay = true,
  playbackSpeed: initialSpeed = 1,
}: BattleSceneProps): JSX.Element {
  // Battle state
  const [battleState, setBattleState] = useState<BattleState>(() => {
    const attackerShipsAlive = new Map<number, boolean>()
    const defenderShipsAlive = new Map<number, boolean>()

    let idx = 0
    attackerFleet.ships.forEach((ship) => {
      for (let i = 0; i < ship.count; i++) {
        attackerShipsAlive.set(idx++, true)
      }
    })

    idx = 0
    defenderFleet.ships.forEach((ship) => {
      for (let i = 0; i < ship.count; i++) {
        defenderShipsAlive.set(idx++, true)
      }
    })

    return {
      phase: 'intro',
      currentRound: 0,
      currentEventIndex: 0,
      isPaused: !autoPlay,
      playbackSpeed: initialSpeed,
      attackerShipsAlive,
      defenderShipsAlive,
    }
  })

  // Visual effects state
  const [activeEffects, setActiveEffects] = useState<Array<{
    id: string
    type: 'laser' | 'explosion' | 'impact'
    start?: THREE.Vector3
    end?: THREE.Vector3
    position?: THREE.Vector3
    color?: string
    isShieldHit?: boolean
  }>>([])

  const [showResult, setShowResult] = useState(false)

  // Computed values
  const attackerShipsRemaining = useMemo(() => {
    return Array.from(battleState.attackerShipsAlive.values()).filter(Boolean).length
  }, [battleState.attackerShipsAlive])

  const defenderShipsRemaining = useMemo(() => {
    return Array.from(battleState.defenderShipsAlive.values()).filter(Boolean).length
  }, [battleState.defenderShipsAlive])

  // Effect handlers
  const addEffect = useCallback((effect: typeof activeEffects[0]) => {
    setActiveEffects((prev) => [...prev, effect])
  }, [])

  const removeEffect = useCallback((id: string) => {
    setActiveEffects((prev) => prev.filter((e) => e.id !== id))
  }, [])

  // Ship destruction handler
  const handleShipDestroyed = useCallback(
    (side: 'attacker' | 'defender', shipId: number) => {
      setBattleState((prev) => {
        const newState = { ...prev }
        if (side === 'attacker') {
          const newMap = new Map(prev.attackerShipsAlive)
          newMap.set(shipId, false)
          newState.attackerShipsAlive = newMap
        } else {
          const newMap = new Map(prev.defenderShipsAlive)
          newMap.set(shipId, false)
          newState.defenderShipsAlive = newMap
        }
        return newState
      })
    },
    []
  )

  // Battle progression logic
  useEffect(() => {
    if (battleState.isPaused) return

    const progressBattle = () => {
      setBattleState((prev) => {
        // Intro phase
        if (prev.phase === 'intro') {
          return { ...prev, phase: 'combat', currentRound: 1 }
        }

        // Combat phase
        if (prev.phase === 'combat') {
          const currentRound = battleRounds[prev.currentRound - 1]

          if (!currentRound) {
            // All rounds complete
            return { ...prev, phase: 'outro' }
          }

          // Process losses for this round
          if (prev.currentEventIndex === 0) {
            const newAttackerAlive = new Map(prev.attackerShipsAlive)
            const newDefenderAlive = new Map(prev.defenderShipsAlive)

            // Mark ships as destroyed based on round losses
            let attackerLossCount = 0
            Object.values(currentRound.attackerLosses).forEach((count) => {
              attackerLossCount += count
            })

            let defenderLossCount = 0
            Object.values(currentRound.defenderLosses).forEach((count) => {
              defenderLossCount += count
            })

            // Randomly select ships to destroy
            const aliveAttackers = Array.from(newAttackerAlive.entries())
              .filter(([, alive]) => alive)
              .map(([id]) => id)

            const aliveDefenders = Array.from(newDefenderAlive.entries())
              .filter(([, alive]) => alive)
              .map(([id]) => id)

            for (let i = 0; i < Math.min(attackerLossCount, aliveAttackers.length); i++) {
              const randomIdx = Math.floor(Math.random() * aliveAttackers.length)
              const shipId = aliveAttackers.splice(randomIdx, 1)[0]
              newAttackerAlive.set(shipId, false)

              // Add explosion effect
              addEffect({
                id: `explosion-a-${prev.currentRound}-${i}`,
                type: 'explosion',
                position: new THREE.Vector3(
                  BATTLE_AREA.attackerX + Math.random() * 20 - 10,
                  Math.random() * 20 - 10,
                  Math.random() * 20 - 10
                ),
              })
            }

            for (let i = 0; i < Math.min(defenderLossCount, aliveDefenders.length); i++) {
              const randomIdx = Math.floor(Math.random() * aliveDefenders.length)
              const shipId = aliveDefenders.splice(randomIdx, 1)[0]
              newDefenderAlive.set(shipId, false)

              // Add explosion effect
              addEffect({
                id: `explosion-d-${prev.currentRound}-${i}`,
                type: 'explosion',
                position: new THREE.Vector3(
                  BATTLE_AREA.defenderX + Math.random() * 20 - 10,
                  Math.random() * 20 - 10,
                  Math.random() * 20 - 10
                ),
              })
            }

            // Add laser effects
            for (let i = 0; i < 5; i++) {
              addEffect({
                id: `laser-${prev.currentRound}-${i}`,
                type: 'laser',
                start: new THREE.Vector3(
                  BATTLE_AREA.attackerX + 10,
                  Math.random() * 10 - 5,
                  Math.random() * 10 - 5
                ),
                end: new THREE.Vector3(
                  BATTLE_AREA.defenderX - 10,
                  Math.random() * 10 - 5,
                  Math.random() * 10 - 5
                ),
                color: '#00aaff',
              })

              addEffect({
                id: `laser-d-${prev.currentRound}-${i}`,
                type: 'laser',
                start: new THREE.Vector3(
                  BATTLE_AREA.defenderX - 10,
                  Math.random() * 10 - 5,
                  Math.random() * 10 - 5
                ),
                end: new THREE.Vector3(
                  BATTLE_AREA.attackerX + 10,
                  Math.random() * 10 - 5,
                  Math.random() * 10 - 5
                ),
                color: '#ff4400',
              })
            }

            return {
              ...prev,
              attackerShipsAlive: newAttackerAlive,
              defenderShipsAlive: newDefenderAlive,
              currentEventIndex: 1,
            }
          }

          // Move to next round
          if (prev.currentRound < battleRounds.length) {
            return {
              ...prev,
              currentRound: prev.currentRound + 1,
              currentEventIndex: 0,
            }
          }

          return { ...prev, phase: 'outro' }
        }

        // Outro phase
        if (prev.phase === 'outro') {
          return { ...prev, phase: 'complete' }
        }

        return prev
      })
    }

    // Calculate delay based on phase and speed
    let delay = TIMING.roundDelay / battleState.playbackSpeed

    if (battleState.phase === 'intro') {
      delay = TIMING.introLength / battleState.playbackSpeed
    } else if (battleState.phase === 'outro') {
      delay = TIMING.outroLength / battleState.playbackSpeed
    }

    const timer = setTimeout(progressBattle, delay)
    return () => clearTimeout(timer)
  }, [battleState, battleRounds, addEffect])

  // Handle battle complete
  useEffect(() => {
    if (battleState.phase === 'complete') {
      setShowResult(true)
      onBattleComplete?.()
    }
  }, [battleState.phase, onBattleComplete])

  // Control handlers
  const handlePlayPause = useCallback(() => {
    setBattleState((prev) => ({ ...prev, isPaused: !prev.isPaused }))
  }, [])

  const handleSpeedChange = useCallback((speed: number) => {
    setBattleState((prev) => ({ ...prev, playbackSpeed: speed }))
  }, [])

  const handleSkip = useCallback(() => {
    setBattleState((prev) => ({
      ...prev,
      phase: 'complete',
      isPaused: true,
    }))
    setShowResult(true)
    onBattleComplete?.()
  }, [onBattleComplete])

  const handleCloseResult = useCallback(() => {
    setShowResult(false)
  }, [])

  return (
    <div className="relative w-full h-full bg-black">
      {/* 3D Canvas */}
      <Canvas
        camera={{
          position: [0, 50, 100],
          fov: 50,
          near: 0.1,
          far: 2000,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        shadows
      >
        <color attach="background" args={['#000008']} />

        <Suspense fallback={null}>
          <BattleSceneContent
            attackerFleet={attackerFleet}
            defenderFleet={defenderFleet}
            battleRounds={battleRounds}
            battleResult={battleResult}
            battleState={battleState}
            onShipDestroyed={handleShipDestroyed}
            activeEffects={activeEffects}
            onEffectComplete={removeEffect}
          />
        </Suspense>
      </Canvas>

      {/* HUD Overlay */}
      <BattleHUD
        attackerFleet={attackerFleet}
        defenderFleet={defenderFleet}
        battleState={battleState}
        attackerShipsRemaining={attackerShipsRemaining}
        defenderShipsRemaining={defenderShipsRemaining}
        currentRound={battleState.currentRound}
        totalRounds={battleRounds.length}
      />

      {/* Playback Controls */}
      <BattleControls
        isPaused={battleState.isPaused}
        playbackSpeed={battleState.playbackSpeed}
        phase={battleState.phase}
        onPlayPause={handlePlayPause}
        onSpeedChange={handleSpeedChange}
        onSkip={handleSkip}
      />

      {/* Battle Result Overlay */}
      <AnimatePresence>
        {showResult && (
          <BattleResultOverlay
            result={battleResult}
            attackerName={attackerFleet.playerName}
            defenderName={defenderFleet.playerName}
            onClose={handleCloseResult}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default BattleScene3D
