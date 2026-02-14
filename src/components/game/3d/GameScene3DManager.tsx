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

      {/* Scene title in 3D space */}
      <Html position={[0, 8, 0]} center>
        <div className="flex flex-col items-center gap-2">
          <div className="text-5xl">{config.icon}</div>
          <h2 className="text-2xl font-bold text-white">{config.title}</h2>
          <p className="text-cyan-400/80 text-sm">{planetName}</p>
          <p className="text-white/50 text-xs mt-4">Scene content coming soon...</p>
        </div>
      </Html>

      {/* Ambient lighting */}
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 20, 20]} intensity={0.5} />
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

  // Get current planet from store
  const { currentPlanet, planets, preferences3D } = useGameStore()

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

      {/* Scene info badge */}
      <div className="absolute top-4 left-4 z-20">
        <motion.div
          className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          key={currentScene}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentConfig.icon}</span>
            <span className="text-white font-medium">{currentConfig.title}</span>
          </div>
        </motion.div>
      </div>

      {/* Main Canvas */}
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
    </div>
  )
})

export default GameScene3DManager
