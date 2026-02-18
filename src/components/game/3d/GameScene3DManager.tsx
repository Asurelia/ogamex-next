'use client'

import { memo, useState, useCallback, useMemo, Suspense, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'

// Import 3D components
import { Starfield, Sun3D, Planet3D, OrbitRing } from '@/components/game/3d'
import type { PlanetType } from '@/components/game/3d'

// Import Fleet UI components
import { FleetMissionsPanel, FleetDispatch } from '@/components/game/ui/fleet'

// Import Exploration UI components
import { ExplorationPanel, ExplorationMissionsList } from '@/components/game/ui/exploration'
import type { ExplorationMission } from '@/components/game/ui/exploration'
import type { VisibleSystem } from '@/lib/exploration/types'

// Dynamic import for GalaxyMap3D (optimized version with instancing)
const GalaxyMap3D = dynamic(
  () => import('@/components/game/3d/GalaxyMap3DOptimized').then(mod => mod.GalaxyMap3DOptimized),
  { ssr: false }
)

// Import effects
import {
  SpaceEffects,
  SpaceEffectsLight,
  GalaxyEffects,
  CombatEffects,
  MinimalEffects,
} from '@/lib/3d/effects'

// ============================================================================
// TYPES
// ============================================================================

export type SceneType =
  | 'orbital'
  | 'mines'
  | 'shipyard'
  | 'research'
  | 'defense'
  | 'fleet'
  | 'galaxy'

export interface GameScene3DManagerProps {
  initialScene?: SceneType
  planetId: string
  onSceneChange?: (scene: SceneType) => void
  onZoneClick?: (zone: SceneType) => void
}

interface SceneConfig {
  title: string
  icon: string
  effects: 'space' | 'spaceLight' | 'galaxy' | 'combat' | 'minimal'
  cameraPosition: [number, number, number]
  cameraFov: number
}

// ============================================================================
// SCENE CONFIGURATIONS
// ============================================================================

const sceneConfigs: Record<SceneType, SceneConfig> = {
  orbital: {
    title: 'Orbital View',
    icon: '🏠',
    effects: 'space',
    cameraPosition: [0, 30, 60],
    cameraFov: 45,
  },
  mines: {
    title: 'Mines & Energy',
    icon: '⛏️',
    effects: 'spaceLight',
    cameraPosition: [0, 20, 40],
    cameraFov: 50,
  },
  shipyard: {
    title: 'Shipyard',
    icon: '🚀',
    effects: 'space',
    cameraPosition: [15, 25, 50],
    cameraFov: 45,
  },
  research: {
    title: 'Research Lab',
    icon: '🔬',
    effects: 'spaceLight',
    cameraPosition: [-15, 20, 45],
    cameraFov: 50,
  },
  defense: {
    title: 'Defenses',
    icon: '🛡️',
    effects: 'combat',
    cameraPosition: [0, 35, 55],
    cameraFov: 40,
  },
  fleet: {
    title: 'Fleet Command',
    icon: '🚢',
    effects: 'space',
    cameraPosition: [0, 50, 80],
    cameraFov: 50,
  },
  galaxy: {
    title: 'Galaxy Map',
    icon: '🌌',
    effects: 'galaxy',
    cameraPosition: [0, 100, 150],
    cameraFov: 60,
  },
}

// ============================================================================
// SCENE TRANSITION COMPONENT
// ============================================================================

interface SceneTransitionProps {
  isActive: boolean
  type: 'warp' | 'zoom' | 'fade'
  onComplete?: () => void
}

const SceneTransition = memo(function SceneTransition({
  isActive,
  type,
  onComplete,
}: SceneTransitionProps) {
  useEffect(() => {
    if (isActive && onComplete) {
      const timer = setTimeout(onComplete, type === 'warp' ? 600 : 400)
      return () => clearTimeout(timer)
    }
  }, [isActive, type, onComplete])

  if (!isActive) return null

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-50 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {type === 'warp' && (
          <>
            {/* Radial star streaks */}
            <div className="absolute inset-0 flex items-center justify-center">
              {Array.from({ length: 50 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
                  style={{
                    width: '200%',
                    height: 2,
                    transformOrigin: 'center',
                    transform: `rotate(${i * 7.2}deg)`,
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{
                    scaleX: [0, 1, 1.5],
                    opacity: [0, 0.8, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.008,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>
            {/* Flash */}
            <motion.div
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{ duration: 0.4, delay: 0.15 }}
            />
          </>
        )}

        {type === 'zoom' && (
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.9) 100%)',
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          />
        )}

        {type === 'fade' && (
          <motion.div
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
})

// ============================================================================
// LOADING COMPONENT
// ============================================================================

function SceneLoader({ sceneName }: { sceneName: string }) {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {/* Outer ring */}
          <motion.div
            className="w-12 h-12 rounded-full border-2 border-cyan-500/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
          {/* Inner ring */}
          <motion.div
            className="absolute inset-1 rounded-full border-2 border-cyan-500/60 border-t-cyan-500"
            animate={{ rotate: -360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
          {/* Center dot */}
          <motion.div
            className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-cyan-500"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </div>
        <span className="text-white/80 text-sm font-medium">{sceneName}</span>
      </div>
    </Html>
  )
}

// ============================================================================
// ORBITAL SCENE CONTENT
// ============================================================================

interface OrbitalSceneProps {
  planet: {
    id: string
    name: string
    type: PlanetType
    variant: number
    position: number
  }
  onZoneClick?: (zone: SceneType) => void
}

const OrbitalSceneContent = memo(function OrbitalSceneContent({
  planet,
  onZoneClick,
}: OrbitalSceneProps) {
  const [hoveredZone, setHoveredZone] = useState<SceneType | null>(null)

  // Zone definitions around the planet
  const zones = useMemo(
    () => [
      { type: 'mines' as SceneType, angle: -30, label: 'Mines', distance: 6 },
      { type: 'shipyard' as SceneType, angle: 30, label: 'Shipyard', distance: 6 },
      { type: 'research' as SceneType, angle: 90, label: 'Research', distance: 5 },
      { type: 'defense' as SceneType, angle: 150, label: 'Defense', distance: 6 },
      { type: 'fleet' as SceneType, angle: 210, label: 'Fleet', distance: 5 },
    ],
    []
  )

  return (
    <>
      {/* Starfield background */}
      <Starfield
        count={5000}
        radius={200}
        depth={100}
        factor={4}
        saturation={0.5}
        speed={0.3}
        rotationSpeed={0.00005}
      />

      {/* Sun in the distance */}
      <Sun3D
        position={[-80, 30, -100]}
        size={8}
        color="#ffaa00"
        intensity={1.5}
        pulseSpeed={2}
        pulseIntensity={0.02}
      />

      {/* Main planet */}
      <group position={[0, 0, 0]}>
        <Planet3D
          type={planet.type}
          variant={planet.variant}
          size={4}
          position={[0, 0, 0]}
          rotationSpeed={0.001}
        />

        {/* Planet label */}
        <Html position={[0, 6, 0]} center distanceFactor={15}>
          <div className="px-4 py-2 bg-black/80 backdrop-blur-md rounded-lg border border-cyan-500/30">
            <span className="text-cyan-400 font-bold">{planet.name}</span>
          </div>
        </Html>

        {/* Interactive zones */}
        {zones.map((zone) => {
          const rad = (zone.angle * Math.PI) / 180
          const x = Math.cos(rad) * zone.distance
          const z = Math.sin(rad) * zone.distance
          const isHovered = hoveredZone === zone.type

          return (
            <group key={zone.type} position={[x, 0, z]}>
              {/* Zone marker */}
              <mesh
                onPointerEnter={() => setHoveredZone(zone.type)}
                onPointerLeave={() => setHoveredZone(null)}
                onClick={() => onZoneClick?.(zone.type)}
              >
                <sphereGeometry args={[0.8, 16, 16]} />
                <meshStandardMaterial
                  color={isHovered ? '#00ffff' : '#0088aa'}
                  emissive={isHovered ? '#00ffff' : '#004466'}
                  emissiveIntensity={isHovered ? 0.8 : 0.3}
                  transparent
                  opacity={isHovered ? 0.9 : 0.6}
                />
              </mesh>

              {/* Pulsing ring around zone */}
              <OrbitRing
                radius={1.2}
                color={isHovered ? '#00ffff' : '#0066aa'}
                opacity={isHovered ? 0.8 : 0.3}
                thickness={0.03}
              />

              {/* Zone label */}
              <Html position={[0, 1.5, 0]} center distanceFactor={12}>
                <motion.div
                  className={`
                    px-3 py-1.5 rounded-md text-xs whitespace-nowrap cursor-pointer
                    transition-all duration-200 select-none
                    ${
                      isHovered
                        ? 'bg-cyan-600/90 text-white font-semibold border border-cyan-300 shadow-lg shadow-cyan-500/40'
                        : 'bg-black/70 text-gray-300 border border-gray-600 hover:bg-black/80'
                    }
                  `}
                  animate={{
                    scale: isHovered ? 1.1 : 1,
                    y: isHovered ? -5 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {sceneConfigs[zone.type].icon} {zone.label}
                </motion.div>
              </Html>
            </group>
          )
        })}
      </group>

      {/* Ambient lighting */}
      <ambientLight intensity={0.1} />
      <directionalLight position={[-80, 30, -100]} intensity={0.6} color="#ffddaa" />
      <pointLight position={[0, 10, 10]} intensity={0.3} color="#0088ff" />
    </>
  )
})

// ============================================================================
// GENERIC PLACEHOLDER SCENE
// ============================================================================

interface PlaceholderSceneProps {
  sceneType: SceneType
  planetName: string
}

const PlaceholderSceneContent = memo(function PlaceholderSceneContent({
  sceneType,
  planetName,
}: PlaceholderSceneProps) {
  const config = sceneConfigs[sceneType]

  return (
    <>
      {/* Starfield */}
      <Starfield
        count={3000}
        radius={150}
        depth={80}
        factor={3}
        saturation={0.4}
        speed={0.2}
      />

      {/* Ambient lighting */}
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 20, 20]} intensity={0.5} />
    </>
  )
})

// ============================================================================
// FLEET SCENE CONTENT (3D portion)
// ============================================================================

interface FleetScene3DProps {
  planetName: string
}

const FleetScene3DContent = memo(function FleetScene3DContent({
  planetName,
}: FleetScene3DProps) {
  return (
    <>
      {/* Starfield background */}
      <Starfield
        count={4000}
        radius={180}
        depth={100}
        factor={4}
        saturation={0.5}
        speed={0.15}
      />

      {/* Distant sun */}
      <Sun3D
        position={[-100, 20, -150]}
        size={6}
        color="#ffaa00"
        intensity={1.2}
        pulseSpeed={2}
        pulseIntensity={0.02}
      />

      {/* Fleet staging area - simple visualization */}
      <group position={[0, 0, 0]}>
        {/* Holographic grid floor effect */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
          <planeGeometry args={[100, 100, 20, 20]} />
          <meshBasicMaterial
            color="#004466"
            wireframe
            transparent
            opacity={0.15}
          />
        </mesh>

        {/* Fleet command marker */}
        <mesh position={[0, 0, 0]}>
          <torusGeometry args={[8, 0.15, 8, 64]} />
          <meshStandardMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={0.5}
            transparent
            opacity={0.6}
          />
        </mesh>

        {/* Secondary ring */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[12, 0.1, 8, 64]} />
          <meshStandardMaterial
            color="#0088aa"
            emissive="#006688"
            emissiveIntensity={0.3}
            transparent
            opacity={0.4}
          />
        </mesh>

        {/* Center beacon */}
        <mesh position={[0, 5, 0]}>
          <octahedronGeometry args={[1.5]} />
          <meshStandardMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={1}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Label */}
        <Html position={[0, 12, 0]} center distanceFactor={15}>
          <div className="px-4 py-2 bg-black/80 backdrop-blur-md rounded-lg border border-cyan-500/30">
            <span className="text-cyan-400 font-bold uppercase tracking-wider">
              Fleet Command
            </span>
            <div className="text-xs text-gray-400 mt-1">{planetName}</div>
          </div>
        </Html>
      </group>

      {/* Lighting */}
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 20, 20]} intensity={0.4} color="#0088ff" />
      <pointLight position={[-10, 5, 10]} intensity={0.3} color="#00ffff" />
    </>
  )
})

// ============================================================================
// EFFECTS SELECTOR
// ============================================================================

function EffectsForScene({ effectType }: { effectType: SceneConfig['effects'] }) {
  switch (effectType) {
    case 'space':
      return (
        <SpaceEffects
          bloomIntensity={0.5}
          bloomThreshold={0.6}
          chromaticAberrationOffset={0.0004}
          vignetteDarkness={0.4}
        />
      )
    case 'spaceLight':
      return <SpaceEffectsLight bloomIntensity={0.4} bloomThreshold={0.7} />
    case 'galaxy':
      return <GalaxyEffects />
    case 'combat':
      return <CombatEffects intensity={0.7} />
    case 'minimal':
    default:
      return <MinimalEffects />
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const GameScene3DManager = memo(function GameScene3DManager({
  initialScene = 'orbital',
  planetId,
  onSceneChange,
  onZoneClick,
}: GameScene3DManagerProps) {
  const [currentScene, setCurrentScene] = useState<SceneType>(initialScene)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionType, setTransitionType] = useState<'warp' | 'zoom' | 'fade'>('fade')
  const [showFleetDispatch, setShowFleetDispatch] = useState(false)

  // Exploration state
  const [selectedExplorationSystem, setSelectedExplorationSystem] = useState<VisibleSystem | null>(null)
  const [showExplorationPanel, setShowExplorationPanel] = useState(false)
  const [explorationMissions, setExplorationMissions] = useState<ExplorationMission[]>([])

  // Get current planet from store
  const { currentPlanet, planets, preferences3D, user } = useGameStore()

  // Find the planet data
  const planet = useMemo(() => {
    const p = planets.find((p) => p.id === planetId) || currentPlanet
    if (!p) return null

    // Derive visual type from position
    const getVisualType = (pos: number): PlanetType => {
      if (pos <= 3) return pos === 1 ? 'desert' : 'dry'
      if (pos <= 6) return ['normal', 'jungle', 'water'][pos % 3] as PlanetType
      if (pos <= 9) return pos === 9 ? 'ice' : 'normal'
      return pos % 2 === 0 ? 'gas' : 'ice'
    }

    return {
      id: p.id,
      name: p.name,
      type: getVisualType(p.position),
      variant: ((p.position - 1) % 10) + 1,
      position: p.position,
    }
  }, [planetId, planets, currentPlanet])

  const currentConfig = sceneConfigs[currentScene]

  // Handle scene change with transition
  const handleSceneChange = useCallback(
    (newScene: SceneType) => {
      if (newScene === currentScene || isTransitioning) return

      // Determine transition type
      let type: 'warp' | 'zoom' | 'fade' = 'fade'
      if (newScene === 'galaxy' || currentScene === 'galaxy') {
        type = 'warp'
      } else if (newScene === 'orbital' || currentScene === 'orbital') {
        type = 'zoom'
      }

      setTransitionType(type)
      setIsTransitioning(true)

      setTimeout(
        () => {
          setCurrentScene(newScene)
          onSceneChange?.(newScene)
        },
        type === 'warp' ? 300 : 200
      )
    },
    [currentScene, isTransitioning, onSceneChange]
  )

  // Handle zone click from orbital view
  const handleZoneClick = useCallback(
    (zone: SceneType) => {
      onZoneClick?.(zone)
      handleSceneChange(zone)
    },
    [handleSceneChange, onZoneClick]
  )

  // Complete transition
  const handleTransitionComplete = useCallback(() => {
    setIsTransitioning(false)
  }, [])

  // Handle exploration system selection from Galaxy Map
  const handleStartExploration = useCallback((system: VisibleSystem) => {
    setSelectedExplorationSystem(system)
    setShowExplorationPanel(true)
  }, [])

  // Handle exploration mission launched (called by ExplorationPanel)
  const handleExplorationMissionLaunched = useCallback(() => {
    setShowExplorationPanel(false)
    setSelectedExplorationSystem(null)
  }, [])

  // Handle cancel exploration mission
  const handleCancelExplorationMission = useCallback(async (missionId: string) => {
    // Remove from local state - actual cancellation happens via MissionService
    setExplorationMissions(prev => prev.filter(m => m.id !== missionId))
  }, [])

  // Handle complete exploration mission
  const handleCompleteExplorationMission = useCallback(async (missionId: string) => {
    // Mark as completed in local state - actual completion happens via MissionService
    setExplorationMissions(prev =>
      prev.map(m => m.id === missionId ? { ...m, status: 'completed' as const } : m)
    )
  }, [])

  // Expose scene change method
  useEffect(() => {
    // This allows parent components to trigger scene changes
    // via prop updates to initialScene
    if (initialScene !== currentScene && !isTransitioning) {
      handleSceneChange(initialScene)
    }
  }, [initialScene, currentScene, isTransitioning, handleSceneChange])

  if (!planet) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950">
        <div className="text-white/50">No planet selected</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative bg-slate-950">
      {/* Scene transition overlay */}
      <SceneTransition
        isActive={isTransitioning}
        type={transitionType}
        onComplete={handleTransitionComplete}
      />

      {/* Galaxy Map - separate Canvas */}
      {currentScene === 'galaxy' && user && currentPlanet && (
        <GalaxyMap3D
          galaxyIndex={currentPlanet.galaxy}
          userId={user.id}
          playerSystemId={currentPlanet.solar_system_id || null}
          onEnterSystem={(systemId) => {
            // Navigate to system view with specific system
            console.log('Enter system:', systemId)
            onSceneChange?.('orbital')
          }}
          onSystemSelect={(system) => {
            // When a system is selected, prepare for exploration
            // Map discovery level to visibility (unknown -> detected)
            const discoveryLevel = system.discoveryLevel === 'unknown' ? null : system.discoveryLevel as 'detected' | 'scanned' | 'explored' | 'mapped' | null
            const visibility = discoveryLevel || 'detected'

            const visibleSystem: VisibleSystem = {
              systemId: system.id,
              galaxyId: '', // Will be filled from context
              galaxyIndex: currentPlanet.galaxy,
              systemIndex: system.systemIndex,
              visibility,
              discoveryLevel,
              scanQuality: 0,
              starType: system.starType,
              secondaryStarType: null,
              planetCount: system.bodies?.length || null,
              habitableZoneInner: null,
              habitableZoneOuter: null,
              connections: system.connections?.map(c => ({
                targetSystemId: c.targetSystemId,
                targetGalaxyIndex: currentPlanet.galaxy,
                targetSystemIndex: c.targetSystemIndex,
                connectionType: 'hyperlane' as const,
                isVisible: true,
              })) || [],
              colonies: null,
              isFirstDiscoverer: false,
              discoveredAt: null,
            }
            setSelectedExplorationSystem(visibleSystem)
          }}
          onStartExploration={(systemId, missionType) => {
            // Open exploration panel when explore action is triggered
            if (selectedExplorationSystem) {
              setShowExplorationPanel(true)
            }
          }}
          className="w-full h-full"
        />
      )}

      {/* Main Canvas for other scenes */}
      {currentScene !== 'galaxy' && (
        <Canvas
          camera={{
            position: currentConfig.cameraPosition,
            fov: currentConfig.cameraFov,
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
          {/* Background color */}
          <color attach="background" args={['#010204']} />

          {/* Scene content with Suspense */}
          <Suspense fallback={<SceneLoader sceneName={currentConfig.title} />}>
            <AnimatePresence mode="wait">
              {currentScene === 'orbital' ? (
                <OrbitalSceneContent planet={planet} onZoneClick={handleZoneClick} />
              ) : currentScene === 'fleet' ? (
                <FleetScene3DContent planetName={planet.name} />
              ) : (
                <PlaceholderSceneContent
                  sceneType={currentScene}
                  planetName={planet.name}
                />
              )}
            </AnimatePresence>
          </Suspense>

          {/* Camera controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            minDistance={10}
            maxDistance={200}
            maxPolarAngle={Math.PI * 0.85}
            minPolarAngle={Math.PI * 0.1}
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
          />

          {/* Post-processing effects */}
          {preferences3D.postprocessingEnabled && (
            <EffectsForScene effectType={currentConfig.effects} />
          )}
        </Canvas>
      )}

      {/* Fleet UI Overlay - Shows when in fleet scene */}
      {currentScene === 'fleet' && user && currentPlanet && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Fleet Missions Panel - Right side */}
          <div className="absolute right-0 top-0 bottom-0 w-96 pointer-events-auto bg-gradient-to-l from-black/80 to-transparent">
            <FleetMissionsPanel
              userId={user.id}
              onSelectMission={(mission) => {
                console.log('Selected mission:', mission)
              }}
              className="h-full"
            />
          </div>

          {/* New Mission Button - Bottom center */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
            <button
              onClick={() => setShowFleetDispatch(true)}
              className="px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold uppercase tracking-wider rounded-lg border border-teal-400/50 shadow-lg shadow-teal-500/30 transition-all duration-200 hover:shadow-teal-500/50 hover:scale-105"
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">🚀</span>
                Dispatch Fleet
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Fleet Dispatch Modal */}
      {showFleetDispatch && user && currentPlanet && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <FleetDispatch
            origin={{
              galaxy: currentPlanet.galaxy,
              system: currentPlanet.system,
              position: currentPlanet.position,
            }}
            availableShips={{
              light_fighter: currentPlanet.light_fighter || 0,
              heavy_fighter: currentPlanet.heavy_fighter || 0,
              cruiser: currentPlanet.cruiser || 0,
              battleship: currentPlanet.battleship || 0,
              battlecruiser: currentPlanet.battlecruiser || 0,
              bomber: currentPlanet.bomber || 0,
              destroyer: currentPlanet.destroyer || 0,
              deathstar: currentPlanet.deathstar || 0,
              small_cargo: currentPlanet.small_cargo || 0,
              large_cargo: currentPlanet.large_cargo || 0,
              colony_ship: currentPlanet.colony_ship || 0,
              recycler: currentPlanet.recycler || 0,
              espionage_probe: currentPlanet.espionage_probe || 0,
              pathfinder: currentPlanet.pathfinder || 0,
              reaper: currentPlanet.reaper || 0,
            }}
            userId={user.id}
            onClose={() => setShowFleetDispatch(false)}
          />
        </div>
      )}

      {/* Exploration UI Overlay - Shows when in galaxy scene */}
      {currentScene === 'galaxy' && user && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Fleet Missions Panel - Right side (includes exploration missions) */}
          {user && (
            <div className="absolute right-0 top-0 bottom-0 w-80 pointer-events-auto bg-gradient-to-l from-black/80 to-transparent">
              <FleetMissionsPanel userId={user.id} />
            </div>
          )}

          {/* Selected System Info - Bottom left */}
          {selectedExplorationSystem && !showExplorationPanel && (
            <div className="absolute bottom-8 left-8 pointer-events-auto">
              <div className="bg-gray-900/90 backdrop-blur-sm border border-cyan-700/50 rounded-lg p-4 max-w-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-cyan-400 font-semibold">
                    System [{selectedExplorationSystem.galaxyIndex}:{selectedExplorationSystem.systemIndex}]
                  </h4>
                  <button
                    onClick={() => setSelectedExplorationSystem(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Star Type:</span>
                    <span className="text-white">{selectedExplorationSystem.starType || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Discovery:</span>
                    <span className={`capitalize ${
                      selectedExplorationSystem.discoveryLevel === 'mapped' ? 'text-purple-400' :
                      selectedExplorationSystem.discoveryLevel === 'explored' ? 'text-green-400' :
                      selectedExplorationSystem.discoveryLevel === 'scanned' ? 'text-blue-400' :
                      selectedExplorationSystem.discoveryLevel === 'detected' ? 'text-yellow-400' :
                      'text-gray-500'
                    }`}>
                      {selectedExplorationSystem.discoveryLevel || 'Unknown'}
                    </span>
                  </div>
                  {selectedExplorationSystem.planetCount !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Planets:</span>
                      <span className="text-white">{selectedExplorationSystem.planetCount}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowExplorationPanel(true)}
                  className="w-full mt-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold rounded-lg transition-all"
                >
                  🔍 Start Exploration
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Exploration Panel Modal */}
      {showExplorationPanel && user && selectedExplorationSystem && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <ExplorationPanel
            userId={user.id}
            selectedSystem={selectedExplorationSystem}
            onClose={() => {
              setShowExplorationPanel(false)
            }}
            onMissionLaunched={handleExplorationMissionLaunched}
            className="max-w-lg w-full mx-4"
          />
        </div>
      )}
    </div>
  )
})

export default GameScene3DManager
