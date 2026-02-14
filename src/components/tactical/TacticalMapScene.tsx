'use client'

import React, { useMemo, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useGameStore } from '@/stores/gameStore'
import { Planet } from '@/types/database'
import { Planet3D, Sun3D, Starfield, OrbitRing } from '@/components/game/3d'
import type { PlanetType } from '@/components/game/3d'

// --- Constants & Helpers ---
const ORBIT_SPACING = 4
const BASE_ORBIT_RADIUS = 8
const PLANET_SIZE = 0.8

// Valid planet types for textures
const VALID_PLANET_TYPES: PlanetType[] = ['desert', 'dry', 'gas', 'ice', 'jungle', 'normal', 'water']

// Helper to calculate position based on "position" index (1-15)
function getPlanetPosition(index: number) {
  const radius = BASE_ORBIT_RADIUS + (index * ORBIT_SPACING)
  // Use golden angle for natural distribution
  const fixedAngle = (index * 137.5) * (Math.PI / 180)
  return {
    x: Math.cos(fixedAngle) * radius,
    z: Math.sin(fixedAngle) * radius,
    radius
  }
}

// Parse planet image string to get type and variant
function parsePlanetImage(imageString: string | undefined | null): { type: PlanetType; variant: number } {
  if (!imageString) {
    return { type: 'normal', variant: 1 }
  }

  const parts = imageString.split('_')
  const typeCandidate = parts[0]?.toLowerCase() as PlanetType
  const variantCandidate = parseInt(parts[1] || '1', 10)

  const type = VALID_PLANET_TYPES.includes(typeCandidate) ? typeCandidate : 'normal'
  const variant = isNaN(variantCandidate) ? 1 : Math.max(1, Math.min(10, variantCandidate))

  return { type, variant }
}

// --- Components ---

interface PlanetWithOrbitProps {
  planet: Planet
  isSelected: boolean
  onClick: () => void
}

function PlanetWithOrbit({ planet, isSelected, onClick }: PlanetWithOrbitProps) {
  // Calculate position based on orbital index
  const pos = useMemo(() => getPlanetPosition(planet.position), [planet.position])

  // Parse planet image for type and variant
  const { type, variant } = useMemo(() => {
    // Try to get image info from planet data
    // Fallback: derive type from position/id for variety
    const hash = planet.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const derivedType = VALID_PLANET_TYPES[hash % VALID_PLANET_TYPES.length]
    const derivedVariant = (hash % 10) + 1

    return { type: derivedType, variant: derivedVariant }
  }, [planet.id])

  const isMoon = planet.planet_type === 'moon'

  return (
    <group>
      {/* Orbit ring at origin (centered on sun) */}
      <OrbitRing
        radius={pos.radius}
        color="#334466"
        opacity={isSelected ? 0.5 : 0.2}
        thickness={0.03}
      />

      {/* Planet at calculated position */}
      <group position={[pos.x, 0, pos.z]}>
        <Planet3D
          type={type}
          variant={variant}
          size={PLANET_SIZE}
          position={[0, 0, 0]}
          selected={isSelected}
          onClick={onClick}
          isMoon={isMoon}
        />

        {/* Planet Label */}
        <Html
          position={[0, PLANET_SIZE + 0.8, 0]}
          center
          distanceFactor={15}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-all select-none
              ${isSelected
                ? 'bg-ogame-accent text-black font-bold border-2 border-white shadow-lg shadow-ogame-accent/50'
                : 'bg-black/70 text-white border border-gray-500 hover:bg-black/90'
              }`
            }
          >
            {planet.name}
            {isMoon && <span className="ml-1 text-gray-400">(Moon)</span>}
          </div>
        </Html>
      </group>
    </group>
  )
}

// Loading fallback for 3D content
function SceneLoader() {
  return (
    <Html center>
      <div className="text-white text-sm animate-pulse">Loading...</div>
    </Html>
  )
}

// Main scene content (separated for Suspense)
function SceneContent() {
  const { planets, currentPlanet, selectPlanet } = useGameStore()

  return (
    <>
      {/* Enhanced background with more stars */}
      <Starfield
        count={8000}
        radius={300}
        depth={150}
        factor={5}
        saturation={0.6}
        speed={0.3}
        rotationSpeed={0.00005}
      />

      {/* Sun at center with bloom effect */}
      <Sun3D
        position={[0, 0, 0]}
        size={3}
        color="#ffaa00"
        intensity={3}
        pulseSpeed={1.5}
        pulseIntensity={0.03}
      />

      {/* Planets with orbits */}
      {planets.map(planet => (
        <PlanetWithOrbit
          key={planet.id}
          planet={planet}
          isSelected={currentPlanet?.id === planet.id}
          onClick={() => selectPlanet(planet.id)}
        />
      ))}
    </>
  )
}

// Postprocessing effects
function PostProcessingEffects() {
  return (
    <EffectComposer>
      {/* Bloom for sun glow and bright elements */}
      <Bloom
        luminanceThreshold={0.4}
        luminanceSmoothing={0.9}
        intensity={0.8}
        radius={0.8}
        mipmapBlur
      />

      {/* Subtle chromatic aberration for sci-fi look */}
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={[0.0003, 0.0003]}
        radialModulation={false}
        modulationOffset={0}
      />

      {/* Vignette for depth */}
      <Vignette
        offset={0.3}
        darkness={0.4}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}

export function TacticalMapScene() {
  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas
        camera={{ position: [0, 25, 50], fov: 45 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        {/* Deep space background color */}
        <color attach="background" args={['#020408']} />

        {/* Ambient lighting - very subtle for space */}
        <ambientLight intensity={0.08} />

        {/* Additional directional light for better planet visibility */}
        <directionalLight
          position={[10, 10, 10]}
          intensity={0.3}
          color="#ffffff"
        />

        {/* Main scene content with Suspense */}
        <Suspense fallback={<SceneLoader />}>
          <SceneContent />
        </Suspense>

        {/* Camera controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          minDistance={10}
          maxDistance={150}
          maxPolarAngle={Math.PI * 0.85}
          minPolarAngle={Math.PI * 0.1}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
        />

        {/* Postprocessing effects */}
        <PostProcessingEffects />
      </Canvas>
    </div>
  )
}
