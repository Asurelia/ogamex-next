'use client'

import { useMemo, Suspense, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'

// Import 3D components
import { Planet3D, Sun3D, Starfield, OrbitRing } from '@/components/game/3d'
import type { PlanetType } from '@/components/game/3d'

// Import effects
import { SpaceEffects } from '@/lib/3d/effects'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Simplified planet data structure for the solar system view
 */
export interface SolarSystemPlanet {
  id: string
  name: string
  coordinates: {
    galaxy: number
    system: number
    position: number
  }
  type: PlanetType
  variant?: number
  isMoon?: boolean
}

/**
 * Database planet structure (from Supabase)
 * Accepts the full Planet type from database
 */
export interface DatabasePlanet {
  id: string
  name: string
  galaxy: number
  system: number
  position: number
  planet_type: 'planet' | 'moon'
  [key: string]: unknown // Allow additional properties
}

/**
 * Props for the SolarSystemView component
 * Accepts either SolarSystemPlanet[] or DatabasePlanet[]
 */
export interface SolarSystemViewProps {
  planets: SolarSystemPlanet[] | DatabasePlanet[]
  selectedPlanetId: string | null
  onPlanetSelect: (planetId: string) => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ORBIT_SPACING = 5
const BASE_ORBIT_RADIUS = 10
const PLANET_SIZE = 0.9
const SUN_SIZE = 3.5

// Valid planet types for fallback
const VALID_PLANET_TYPES: PlanetType[] = [
  'desert',
  'dry',
  'gas',
  'ice',
  'jungle',
  'normal',
  'water',
]

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate planet position on its orbit based on position index (1-15)
 * Uses golden angle distribution for natural-looking placement
 */
function calculateOrbitPosition(positionIndex: number) {
  const radius = BASE_ORBIT_RADIUS + positionIndex * ORBIT_SPACING
  // Golden angle for aesthetically pleasing distribution
  const angle = (positionIndex * 137.5) * (Math.PI / 180)

  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    radius,
  }
}

/**
 * Derive planet type and variant from planet ID when not explicitly provided
 * Ensures consistent visual appearance for the same planet
 */
function derivePlanetVisuals(
  planetId: string,
  providedType?: PlanetType,
  providedVariant?: number
): { type: PlanetType; variant: number } {
  // Use provided values if available
  if (providedType && VALID_PLANET_TYPES.includes(providedType)) {
    const variant = providedVariant
      ? Math.max(1, Math.min(10, providedVariant))
      : 1
    return { type: providedType, variant }
  }

  // Derive from planet ID hash for consistency
  const hash = planetId
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const type = VALID_PLANET_TYPES[hash % VALID_PLANET_TYPES.length]
  const variant = (hash % 10) + 1

  return { type, variant }
}

/**
 * Type guard to check if planet is in database format
 */
function isDatabasePlanet(planet: SolarSystemPlanet | DatabasePlanet): planet is DatabasePlanet {
  return 'galaxy' in planet && 'system' in planet && 'planet_type' in planet
}

/**
 * Normalize planet data to internal format
 * Handles both SolarSystemPlanet and DatabasePlanet formats
 */
function normalizePlanet(planet: SolarSystemPlanet | DatabasePlanet): SolarSystemPlanet {
  if (isDatabasePlanet(planet)) {
    // Convert database format to internal format
    const { type, variant } = derivePlanetVisuals(planet.id)
    return {
      id: planet.id,
      name: planet.name,
      coordinates: {
        galaxy: planet.galaxy,
        system: planet.system,
        position: planet.position,
      },
      type,
      variant,
      isMoon: planet.planet_type === 'moon',
    }
  }
  // Already in correct format
  return planet
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface PlanetOrbitProps {
  planet: SolarSystemPlanet
  isSelected: boolean
  onClick: () => void
}

/**
 * Individual planet with its orbit ring and label
 */
function PlanetOrbit({ planet, isSelected, onClick }: PlanetOrbitProps) {
  // Calculate position based on orbital index
  const position = useMemo(
    () => calculateOrbitPosition(planet.coordinates.position),
    [planet.coordinates.position]
  )

  // Get visual properties
  const { type, variant } = useMemo(
    () => derivePlanetVisuals(planet.id, planet.type, planet.variant),
    [planet.id, planet.type, planet.variant]
  )

  // Determine if this is a moon
  const isMoon = planet.isMoon ?? false

  // Size adjustment for moons
  const planetSize = isMoon ? PLANET_SIZE * 0.5 : PLANET_SIZE

  return (
    <group>
      {/* Orbit ring centered on sun */}
      <OrbitRing
        radius={position.radius}
        color={isSelected ? '#4488ff' : '#334466'}
        opacity={isSelected ? 0.6 : 0.25}
        thickness={0.04}
      />

      {/* Planet at calculated position */}
      <group position={[position.x, 0, position.z]}>
        <Planet3D
          type={type}
          variant={variant}
          size={planetSize}
          position={[0, 0, 0]}
          selected={isSelected}
          onClick={onClick}
          isMoon={isMoon}
          rotationSpeed={0.002}
        />

        {/* Planet label using Html from drei */}
        <Html
          position={[0, planetSize + 1, 0]}
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
                  ? 'bg-blue-600 text-white font-semibold border-2 border-blue-300 shadow-lg shadow-blue-500/40'
                  : 'bg-black/80 text-gray-200 border border-gray-600 hover:bg-black/90'
              }
            `}
          >
            <span className="font-medium">{planet.name}</span>
            {isMoon && (
              <span className="ml-1.5 text-gray-400 text-[10px]">(Moon)</span>
            )}
            <div className="text-[10px] text-gray-400 mt-0.5">
              [{planet.coordinates.galaxy}:{planet.coordinates.system}:
              {planet.coordinates.position}]
            </div>
          </div>
        </Html>
      </group>
    </group>
  )
}

/**
 * Loading fallback component
 */
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

/**
 * Main scene content - separated for Suspense boundary
 */
interface SceneContentProps {
  planets: (SolarSystemPlanet | DatabasePlanet)[]
  selectedPlanetId: string | null
  onPlanetSelect: (planetId: string) => void
}

function SceneContent({
  planets,
  selectedPlanetId,
  onPlanetSelect,
}: SceneContentProps) {
  // Normalize and sort planets by position for consistent rendering
  const sortedPlanets = useMemo(() => {
    const normalized = planets.map(normalizePlanet)
    return normalized.sort((a, b) => a.coordinates.position - b.coordinates.position)
  }, [planets])

  return (
    <>
      {/* Background starfield */}
      <Starfield
        count={6000}
        radius={250}
        depth={120}
        factor={4}
        saturation={0.5}
        speed={0.4}
        rotationSpeed={0.00008}
      />

      {/* Central sun */}
      <Sun3D
        position={[0, 0, 0]}
        size={SUN_SIZE}
        color="#ffaa00"
        intensity={2.5}
        pulseSpeed={1.8}
        pulseIntensity={0.025}
      />

      {/* Planets with orbits */}
      {sortedPlanets.map((planet) => (
        <PlanetOrbit
          key={planet.id}
          planet={planet}
          isSelected={selectedPlanetId === planet.id}
          onClick={() => onPlanetSelect(planet.id)}
        />
      ))}
    </>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * SolarSystemView - 3D visualization of a player's solar system
 *
 * Displays planets orbiting around a central sun with interactive selection,
 * labels, and post-processing effects for an immersive space experience.
 */
export function SolarSystemView({
  planets,
  selectedPlanetId,
  onPlanetSelect,
}: SolarSystemViewProps) {
  // Memoize the planet select handler
  const handlePlanetSelect = useCallback(
    (planetId: string) => {
      onPlanetSelect(planetId)
    },
    [onPlanetSelect]
  )

  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas
        camera={{
          position: [0, 30, 60],
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
        {/* Deep space background */}
        <color attach="background" args={['#010204']} />

        {/* Ambient light for base visibility */}
        <ambientLight intensity={0.06} />

        {/* Additional directional light for planet definition */}
        <directionalLight
          position={[15, 15, 15]}
          intensity={0.25}
          color="#ffffff"
        />

        {/* Main scene content with Suspense */}
        <Suspense fallback={<SceneLoader />}>
          <SceneContent
            planets={planets}
            selectedPlanetId={selectedPlanetId}
            onPlanetSelect={handlePlanetSelect}
          />
        </Suspense>

        {/* Camera controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          minDistance={15}
          maxDistance={180}
          maxPolarAngle={Math.PI * 0.85}
          minPolarAngle={Math.PI * 0.1}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.6}
          zoomSpeed={0.9}
          panSpeed={0.8}
        />

        {/* Post-processing effects */}
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

export default SolarSystemView
