'use client'

import { useMemo, Suspense, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'

// Import 3D components
import { Planet3D, Starfield, OrbitRing } from '@/components/game/3d'
import { Star3D } from './Star3D'
import { BinaryStarSystem } from './BinaryStarSystem'
import { BlackHole3D } from './BlackHole3D'
import { NeutronStar3D } from './NeutronStar3D'
import type { PlanetType as VisualPlanetType } from '@/components/game/3d'

// Import galaxy types
import type {
  StarTypeId,
  CelestialBody,
  CelestialBodyWithMoons,
  SolarSystemWithStar,
} from '@/lib/galaxy/types'
import { STAR_TYPES } from '@/lib/galaxy/constants'

// Import effects
import { SpaceEffects } from '@/lib/3d/effects'

// ============================================================================
// TYPES
// ============================================================================

export interface ProceduralSolarSystemViewProps {
  system: SolarSystemWithStar
  bodies: CelestialBodyWithMoons[]
  selectedBodyId: string | null
  onBodySelect: (bodyId: string) => void
  colonies?: Array<{
    bodyId: string
    colonyId: string
    colonyName: string
    username: string
    allianceTag?: string
  }>
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ORBIT_SPACING = 6
const BASE_ORBIT_RADIUS = 12
const PLANET_SIZE = 0.9

// Map body visual types to component types
const VISUAL_TYPE_MAP: Record<string, VisualPlanetType> = {
  desert: 'desert',
  dry: 'dry',
  gas: 'gas',
  ice: 'ice',
  jungle: 'jungle',
  normal: 'normal',
  water: 'water',
}

// ============================================================================
// HELPERS
// ============================================================================

function calculateOrbitPosition(orbitalPosition: number) {
  const radius = BASE_ORBIT_RADIUS + orbitalPosition * ORBIT_SPACING
  const angle = (orbitalPosition * 137.5) * (Math.PI / 180)

  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    radius,
  }
}

function getSizeFromDiameter(diameter: number): number {
  // Normalize diameter to visual size
  if (diameter > 50000) return PLANET_SIZE * 1.8 // Gas giants
  if (diameter > 20000) return PLANET_SIZE * 1.4 // Large rocky
  if (diameter > 10000) return PLANET_SIZE * 1.1 // Medium
  if (diameter > 5000) return PLANET_SIZE * 0.9 // Small
  return PLANET_SIZE * 0.6 // Dwarf
}

// ============================================================================
// STAR RENDERER
// ============================================================================

interface StarRendererProps {
  system: SolarSystemWithStar
}

function StarRenderer({ system }: StarRendererProps) {
  const starType = system.starType
  const starConfig = STAR_TYPES[starType]

  // Black hole
  if (starType === 'black_hole') {
    return <BlackHole3D size={3} accretionDiskSize={10} />
  }

  // Neutron star
  if (starType === 'neutron_star') {
    return <NeutronStar3D size={2} rotationSpeed={5} />
  }

  // Binary systems
  if (starConfig.isBinary) {
    return (
      <BinaryStarSystem
        primaryStarType={starType}
        secondaryStarType={system.secondaryStarType}
        size={3}
        orbitRadius={4}
        orbitSpeed={0.3}
      />
    )
  }

  // Regular stars
  return <Star3D starType={starType} size={3.5} />
}

// ============================================================================
// CELESTIAL BODY RENDERER
// ============================================================================

interface BodyOrbitProps {
  body: CelestialBodyWithMoons
  isSelected: boolean
  onClick: () => void
  colony?: {
    colonyName: string
    username: string
    allianceTag?: string
  }
  isInHabitableZone: boolean
}

function BodyOrbit({ body, isSelected, onClick, colony, isInHabitableZone }: BodyOrbitProps) {
  const position = useMemo(
    () => calculateOrbitPosition(body.orbitalPosition),
    [body.orbitalPosition]
  )

  const visualType = VISUAL_TYPE_MAP[body.planetVisualType] || 'normal'
  const planetSize = getSizeFromDiameter(body.diameter)

  // Don't render non-colonizable gas giants as clickable
  const isGasGiant = body.bodyType === 'gas_giant'

  // Orbit ring color
  const orbitColor = useMemo(() => {
    if (isSelected) return '#4488ff'
    if (isInHabitableZone) return '#22aa44'
    if (!body.isColonizable) return '#664444'
    return '#334466'
  }, [isSelected, isInHabitableZone, body.isColonizable])

  return (
    <group>
      {/* Orbit ring */}
      <OrbitRing
        radius={position.radius}
        color={orbitColor}
        opacity={isSelected ? 0.6 : isInHabitableZone ? 0.4 : 0.2}
        thickness={0.04}
      />

      {/* Planet */}
      <group position={[position.x, 0, position.z]}>
        <Planet3D
          type={visualType}
          variant={body.planetVisualVariant}
          size={planetSize}
          position={[0, 0, 0]}
          selected={isSelected}
          onClick={isGasGiant ? undefined : onClick}
          isMoon={false}
          rotationSpeed={0.002}
        />

        {/* Rings for gas giants */}
        {body.hasRings && (
          <mesh rotation={[Math.PI / 2.5, 0, 0]}>
            <ringGeometry args={[planetSize * 1.3, planetSize * 2, 64]} />
            <meshBasicMaterial
              color={body.ringColor || '#ccaa88'}
              transparent
              opacity={0.6}
              side={2}
            />
          </mesh>
        )}

        {/* Moons */}
        {body.moons.map((moon, index) => (
          <MoonRenderer
            key={moon.id}
            moon={moon}
            parentSize={planetSize}
            moonIndex={index}
          />
        ))}

        {/* Label */}
        <Html
          position={[0, planetSize + 1.2, 0]}
          center
          distanceFactor={18}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`
              px-3 py-1.5 rounded-md text-xs whitespace-nowrap
              transition-all duration-200 select-none
              ${
                isSelected
                  ? 'bg-blue-600 text-white font-semibold border-2 border-blue-300 shadow-lg'
                  : colony
                  ? 'bg-green-900/80 text-green-100 border border-green-600'
                  : isGasGiant
                  ? 'bg-orange-900/60 text-orange-200 border border-orange-700'
                  : 'bg-black/80 text-gray-200 border border-gray-600'
              }
            `}
          >
            <span className="font-medium">
              {colony ? colony.colonyName : body.name}
            </span>
            {colony && (
              <div className="text-[10px] text-green-300 mt-0.5">
                {colony.username}
                {colony.allianceTag && ` [${colony.allianceTag}]`}
              </div>
            )}
            <div className="text-[10px] text-gray-400 mt-0.5">
              Pos {body.orbitalPosition}
              {isGasGiant && ' (Gas Giant)'}
              {body.moons.length > 0 && ` - ${body.moons.length} moon(s)`}
            </div>
          </div>
        </Html>
      </group>
    </group>
  )
}

// ============================================================================
// MOON RENDERER
// ============================================================================

interface MoonRendererProps {
  moon: CelestialBody
  parentSize: number
  moonIndex: number
}

function MoonRenderer({ moon, parentSize, moonIndex }: MoonRendererProps) {
  const moonSize = getSizeFromDiameter(moon.diameter) * 0.4
  const orbitRadius = parentSize * 1.5 + moonIndex * 0.5
  const angle = (moonIndex * 90 + 45) * (Math.PI / 180)

  const visualType = VISUAL_TYPE_MAP[moon.planetVisualType] || 'normal'

  return (
    <group position={[Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius]}>
      <Planet3D
        type={visualType}
        variant={moon.planetVisualVariant}
        size={moonSize}
        position={[0, 0, 0]}
        isMoon={true}
        rotationSpeed={0.003}
      />
    </group>
  )
}

// ============================================================================
// HABITABLE ZONE INDICATOR
// ============================================================================

interface HabitableZoneProps {
  innerRadius: number
  outerRadius: number
}

function HabitableZone({ innerRadius, outerRadius }: HabitableZoneProps) {
  const innerOrbit = BASE_ORBIT_RADIUS + innerRadius * ORBIT_SPACING - ORBIT_SPACING / 2
  const outerOrbit = BASE_ORBIT_RADIUS + outerRadius * ORBIT_SPACING + ORBIT_SPACING / 2

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <ringGeometry args={[innerOrbit, outerOrbit, 64]} />
      <meshBasicMaterial
        color="#22aa44"
        transparent
        opacity={0.05}
        side={2}
      />
    </mesh>
  )
}

// ============================================================================
// SCENE CONTENT
// ============================================================================

interface SceneContentProps {
  system: SolarSystemWithStar
  bodies: CelestialBodyWithMoons[]
  selectedBodyId: string | null
  onBodySelect: (bodyId: string) => void
  colonies?: ProceduralSolarSystemViewProps['colonies']
}

function SceneContent({
  system,
  bodies,
  selectedBodyId,
  onBodySelect,
  colonies = [],
}: SceneContentProps) {
  const colonyMap = useMemo(() => {
    const map = new Map<string, (typeof colonies)[0]>()
    for (const colony of colonies) {
      map.set(colony.bodyId, colony)
    }
    return map
  }, [colonies])

  return (
    <>
      {/* Starfield */}
      <Starfield
        count={6000}
        radius={250}
        depth={120}
        factor={4}
        saturation={0.5}
        speed={0.4}
        rotationSpeed={0.00008}
      />

      {/* Central star(s) */}
      <StarRenderer system={system} />

      {/* Habitable zone indicator */}
      {system.habitableZoneInner > 0 && system.habitableZoneOuter > 0 && (
        <HabitableZone
          innerRadius={system.habitableZoneInner}
          outerRadius={system.habitableZoneOuter}
        />
      )}

      {/* Celestial bodies */}
      {bodies.map((body) => {
        const colony = colonyMap.get(body.id)
        const isInHabitableZone =
          body.orbitalPosition >= system.habitableZoneInner &&
          body.orbitalPosition <= system.habitableZoneOuter

        return (
          <BodyOrbit
            key={body.id}
            body={body}
            isSelected={selectedBodyId === body.id}
            onClick={() => onBodySelect(body.id)}
            colony={colony}
            isInHabitableZone={isInHabitableZone}
          />
        )
      })}
    </>
  )
}

// ============================================================================
// LOADING FALLBACK
// ============================================================================

function SceneLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-white text-sm">Loading solar system...</span>
      </div>
    </Html>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProceduralSolarSystemView({
  system,
  bodies,
  selectedBodyId,
  onBodySelect,
  colonies,
}: ProceduralSolarSystemViewProps) {
  const handleBodySelect = useCallback(
    (bodyId: string) => {
      onBodySelect(bodyId)
    },
    [onBodySelect]
  )

  // Sort bodies by orbital position
  const sortedBodies = useMemo(
    () => [...bodies].sort((a, b) => a.orbitalPosition - b.orbitalPosition),
    [bodies]
  )

  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas
        camera={{
          position: [0, 35, 70],
          fov: 45,
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
        <color attach="background" args={['#010204']} />

        <ambientLight intensity={0.06} />
        <directionalLight position={[15, 15, 15]} intensity={0.25} color="#ffffff" />

        <Suspense fallback={<SceneLoader />}>
          <SceneContent
            system={system}
            bodies={sortedBodies}
            selectedBodyId={selectedBodyId}
            onBodySelect={handleBodySelect}
            colonies={colonies}
          />
        </Suspense>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          minDistance={15}
          maxDistance={200}
          maxPolarAngle={Math.PI * 0.85}
          minPolarAngle={Math.PI * 0.1}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.6}
          zoomSpeed={0.9}
          panSpeed={0.8}
        />

        <SpaceEffects
          bloomIntensity={0.6}
          bloomThreshold={0.5}
          chromaticAberrationOffset={0.0004}
          vignetteDarkness={0.45}
        />
      </Canvas>
    </div>
  )
}

export default ProceduralSolarSystemView
