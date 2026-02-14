'use client'

import { ReactNode, Suspense, useMemo, useRef, useEffect } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Stars, Cloud } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'

import { Starfield } from '@/components/game/3d'
import { SpaceEffectsLight } from '@/lib/3d/effects'
import type { EnvironmentType, LightingType, SCENE_CONFIGS } from './types'

// ============================================================================
// TYPES
// ============================================================================

export interface BaseSceneProps {
  children: ReactNode
  /** Environment type for background and atmosphere */
  environment?: EnvironmentType
  /** Lighting preset */
  lighting?: LightingType
  /** Callback when back button is clicked */
  onBack?: () => void
  /** Show floating back button */
  showBackButton?: boolean
  /** Scene title displayed in header */
  title?: string
  /** Camera position [x, y, z] */
  cameraPosition?: [number, number, number]
  /** Camera field of view */
  cameraFov?: number
  /** Enable orbit controls */
  enableControls?: boolean
  /** Min zoom distance */
  minDistance?: number
  /** Max zoom distance */
  maxDistance?: number
  /** Enable post-processing effects */
  enableEffects?: boolean
  /** Show starfield background */
  showStarfield?: boolean
  /** Ambient light intensity override */
  ambientIntensity?: number
  /** Loading fallback text */
  loadingText?: string
  /** Background color override */
  backgroundColor?: string
  /** Show loading state */
  loading?: boolean
}

// ============================================================================
// ENVIRONMENT CONFIGURATIONS
// ============================================================================

interface EnvironmentConfig {
  backgroundColor: string
  fogColor: string
  fogNear: number
  fogFar: number
  ambientIntensity: number
  ambientColor: string
  groundColor?: string
  showStars?: boolean
  showClouds?: boolean
  showGround?: boolean
}

const ENVIRONMENT_CONFIGS: Record<EnvironmentType, EnvironmentConfig> = {
  space: {
    backgroundColor: '#000008',
    fogColor: '#000004',
    fogNear: 50,
    fogFar: 500,
    ambientIntensity: 0.05,
    ambientColor: '#1a1a3a',
    showStars: true,
    showClouds: false,
    showGround: false,
  },
  surface: {
    backgroundColor: '#0a0808',
    fogColor: '#1a1210',
    fogNear: 20,
    fogFar: 150,
    ambientIntensity: 0.15,
    ambientColor: '#3a2a1a',
    groundColor: '#1a1008',
    showStars: false,
    showClouds: true,
    showGround: true,
  },
  underground: {
    backgroundColor: '#040406',
    fogColor: '#080610',
    fogNear: 10,
    fogFar: 80,
    ambientIntensity: 0.08,
    ambientColor: '#1a1a2a',
    groundColor: '#0a0a10',
    showStars: false,
    showClouds: false,
    showGround: true,
  },
  orbital: {
    backgroundColor: '#010208',
    fogColor: '#020406',
    fogNear: 30,
    fogFar: 300,
    ambientIntensity: 0.1,
    ambientColor: '#1a2a4a',
    showStars: true,
    showClouds: false,
    showGround: false,
  },
}

// ============================================================================
// LIGHTING CONFIGURATIONS
// ============================================================================

interface LightingConfig {
  directionalIntensity: number
  directionalColor: string
  directionalPosition: [number, number, number]
  pointLights: Array<{
    position: [number, number, number]
    intensity: number
    color: string
    distance: number
  }>
}

const LIGHTING_CONFIGS: Record<LightingType, LightingConfig> = {
  day: {
    directionalIntensity: 1.2,
    directionalColor: '#fff8e0',
    directionalPosition: [30, 50, 20],
    pointLights: [
      { position: [-20, 10, -10], intensity: 0.3, color: '#8080ff', distance: 50 },
    ],
  },
  night: {
    directionalIntensity: 0.3,
    directionalColor: '#4060ff',
    directionalPosition: [20, 30, 15],
    pointLights: [
      { position: [0, 15, 0], intensity: 0.5, color: '#2040ff', distance: 40 },
      { position: [15, 5, 15], intensity: 0.3, color: '#4080ff', distance: 30 },
    ],
  },
  industrial: {
    directionalIntensity: 0.6,
    directionalColor: '#ffa060',
    directionalPosition: [25, 40, 10],
    pointLights: [
      { position: [10, 8, 10], intensity: 0.8, color: '#ff6030', distance: 25 },
      { position: [-10, 5, -10], intensity: 0.6, color: '#ff8040', distance: 20 },
      { position: [0, 3, 15], intensity: 0.4, color: '#ffaa50', distance: 15 },
    ],
  },
  research: {
    directionalIntensity: 0.4,
    directionalColor: '#60a0ff',
    directionalPosition: [15, 35, 15],
    pointLights: [
      { position: [0, 10, 0], intensity: 0.7, color: '#4080ff', distance: 30 },
      { position: [8, 5, 8], intensity: 0.5, color: '#60c0ff', distance: 20 },
      { position: [-8, 5, -8], intensity: 0.5, color: '#8060ff', distance: 20 },
    ],
  },
  warning: {
    directionalIntensity: 0.5,
    directionalColor: '#ff4040',
    directionalPosition: [20, 30, 10],
    pointLights: [
      { position: [0, 8, 0], intensity: 0.8, color: '#ff2020', distance: 30 },
      { position: [12, 4, 12], intensity: 0.5, color: '#ff6040', distance: 20 },
      { position: [-12, 4, -12], intensity: 0.5, color: '#ff4020', distance: 20 },
    ],
  },
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SceneLoaderProps {
  text: string
}

function SceneLoader({ text }: SceneLoaderProps) {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-cyan-400/30 rounded-full" />
          <div className="absolute inset-0 w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <span className="text-cyan-300 text-sm font-medium tracking-wide">{text}</span>
      </div>
    </Html>
  )
}

/**
 * Scene fog effect component
 */
function SceneFog({ config }: { config: EnvironmentConfig }) {
  const { scene } = useThree()

  useEffect(() => {
    scene.fog = new THREE.Fog(config.fogColor, config.fogNear, config.fogFar)
    return () => {
      scene.fog = null
    }
  }, [scene, config])

  return null
}

/**
 * Ground plane for surface/underground environments
 */
function GroundPlane({ color }: { color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial
        color={color}
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  )
}

/**
 * Animated stars background using drei Stars
 */
function AnimatedStars() {
  const starsRef = useRef<THREE.Points>(null)

  useFrame(({ clock }) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = clock.getElapsedTime() * 0.01
      starsRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.005) * 0.02
    }
  })

  return (
    <Stars
      ref={starsRef}
      radius={150}
      depth={80}
      count={4000}
      factor={4}
      saturation={0.5}
      fade
      speed={0.5}
    />
  )
}

/**
 * Scene lighting based on configuration
 */
function SceneLighting({ config }: { config: LightingConfig }) {
  return (
    <>
      <directionalLight
        position={config.directionalPosition}
        intensity={config.directionalIntensity}
        color={config.directionalColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      {config.pointLights.map((light, index) => (
        <pointLight
          key={index}
          position={light.position}
          intensity={light.intensity}
          color={light.color}
          distance={light.distance}
          decay={2}
        />
      ))}
    </>
  )
}

/**
 * Floating back button component
 */
interface BackButtonProps {
  onClick: () => void
  title?: string
}

function BackButton({ onClick, title }: BackButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="absolute top-4 left-4 z-50"
    >
      <button
        onClick={onClick}
        className="
          group flex items-center gap-3 px-4 py-2.5
          bg-black/60 backdrop-blur-md
          border border-cyan-500/30 rounded-lg
          hover:bg-cyan-900/30 hover:border-cyan-400/50
          transition-all duration-300
          shadow-lg shadow-cyan-900/20
        "
      >
        {/* Back arrow icon */}
        <svg
          className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>

        {/* Title */}
        {title && (
          <span className="text-cyan-200 text-sm font-medium group-hover:text-cyan-100 transition-colors">
            Back to {title}
          </span>
        )}
      </button>
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * BaseScene - Reusable 3D scene wrapper for OGameX immersive views
 *
 * Provides a consistent setup for all 3D scenes including:
 * - Configurable environment backgrounds (space, surface, underground, orbital)
 * - Dynamic lighting presets (day, night, industrial, research, warning)
 * - Camera and controls setup with limits
 * - Starfield background
 * - Post-processing effects
 * - Floating back button for navigation
 * - Loading states with Suspense
 */
export function BaseScene({
  children,
  environment = 'space',
  lighting = 'day',
  onBack,
  showBackButton = true,
  title,
  cameraPosition = [0, 20, 40],
  cameraFov = 50,
  enableControls = true,
  minDistance = 10,
  maxDistance = 100,
  enableEffects = true,
  showStarfield,
  ambientIntensity,
  loadingText = 'Loading scene...',
  backgroundColor,
  loading = false,
}: BaseSceneProps) {
  // Get environment and lighting configurations
  const envConfig = useMemo(
    () => ENVIRONMENT_CONFIGS[environment],
    [environment]
  )
  const lightConfig = useMemo(
    () => LIGHTING_CONFIGS[lighting],
    [lighting]
  )

  // Determine final values (props override config)
  const finalBackgroundColor = backgroundColor ?? envConfig.backgroundColor
  const finalAmbientIntensity = ambientIntensity ?? envConfig.ambientIntensity
  const finalShowStarfield = showStarfield ?? envConfig.showStars

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{
          position: cameraPosition,
          fov: cameraFov,
          near: 0.1,
          far: 2000,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        dpr={[1, 2]}
        shadows
      >
        {/* Background color */}
        <color attach="background" args={[finalBackgroundColor]} />

        {/* Fog effect */}
        <SceneFog config={envConfig} />

        {/* Ambient lighting */}
        <ambientLight
          intensity={finalAmbientIntensity}
          color={envConfig.ambientColor}
        />

        {/* Dynamic lighting */}
        <SceneLighting config={lightConfig} />

        {/* Stars background (drei Stars or custom Starfield) */}
        {finalShowStarfield && envConfig.showStars && <AnimatedStars />}
        {finalShowStarfield && !envConfig.showStars && (
          <Starfield
            count={4000}
            radius={300}
            depth={150}
            factor={3}
            saturation={0.4}
            speed={0.3}
            rotationSpeed={0.00005}
          />
        )}

        {/* Ground plane */}
        {envConfig.showGround && envConfig.groundColor && (
          <GroundPlane color={envConfig.groundColor} />
        )}

        {/* Atmospheric clouds for surface environments */}
        {envConfig.showClouds && (
          <Cloud
            position={[0, 30, 0]}
            speed={0.2}
            opacity={0.3}
            segments={40}
          />
        )}

        {/* Main scene content with Suspense */}
        <Suspense fallback={<SceneLoader text={loadingText} />}>
          {loading ? <SceneLoader text={loadingText} /> : children}
        </Suspense>

        {/* Camera controls */}
        {enableControls && (
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={minDistance}
            maxDistance={maxDistance}
            maxPolarAngle={Math.PI * 0.85}
            minPolarAngle={Math.PI * 0.1}
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
            panSpeed={0.6}
            minAzimuthAngle={-Math.PI}
            maxAzimuthAngle={Math.PI}
          />
        )}

        {/* Post-processing effects */}
        {enableEffects && (
          <SpaceEffectsLight
            bloomIntensity={0.5}
            bloomThreshold={0.6}
          />
        )}
      </Canvas>

      {/* Floating UI elements */}
      <AnimatePresence>
        {showBackButton && onBack && (
          <BackButton onClick={onBack} title={title} />
        )}
      </AnimatePresence>

      {/* Scene title overlay */}
      {title && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 z-40"
        >
          <div className="
            px-4 py-2 bg-black/60 backdrop-blur-md
            border border-white/10 rounded-lg
          ">
            <h2 className="text-white/90 text-lg font-semibold tracking-wide">
              {title}
            </h2>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default BaseScene
