'use client'

import { useRef, useMemo, useState, useCallback, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Sphere, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'

// Import 3D components
import { Planet3D, Starfield, ShipModel } from '@/components/game/3d'
import { SpaceEffects } from '@/lib/3d/effects'
import type { PlanetType } from '@/lib/3d/constants'
import { formatNumber, formatTimeRemaining } from '@/lib/utils/format'

// ============================================================================
// TYPES
// ============================================================================

export interface OrbitalViewSceneProps {
  planet: {
    id: string
    name: string
    type: PlanetType
    coordinates: { galaxy: number; system: number; position: number }
    diameter: number
    temperature: { min: number; max: number }
    fields: { used: number; total: number }
    hasMoon?: boolean
    moonName?: string
  }
  resources: {
    metal: number
    crystal: number
    deuterium: number
    energy: { current: number; max: number }
  }
  production: {
    metal: number
    crystal: number
    deuterium: number
  }
  fleets: Array<{
    id: string
    mission: string
    ships: number
    arrivalTime?: Date
    isHostile?: boolean
  }>
  constructions: Array<{
    type: 'building' | 'ship' | 'research' | 'defense'
    name: string
    endsAt: Date
  }>
  onNavigate: (scene: 'mines' | 'shipyard' | 'research' | 'defense' | 'fleet') => void
  onSelectMoon?: () => void
}

type NavigationZone = 'mines' | 'shipyard' | 'research' | 'defense' | 'fleet'

interface NavigationPortalProps {
  type: NavigationZone
  position: [number, number, number]
  angle: number
  onClick: () => void
  isHovered: boolean
  onHover: (hovered: boolean) => void
}

interface MoonOrbitProps {
  moonName: string
  planetSize: number
  onClick?: () => void
}

interface OrbitalStationProps {
  type: 'shipyard' | 'depot' | 'satellite'
  position: [number, number, number]
  scale?: number
}

interface FleetFormationProps {
  fleets: OrbitalViewSceneProps['fleets']
  planetSize: number
}

interface HUDPanelProps {
  resources: OrbitalViewSceneProps['resources']
  production: OrbitalViewSceneProps['production']
  constructions: OrbitalViewSceneProps['constructions']
  fleets: OrbitalViewSceneProps['fleets']
}

// ============================================================================
// CONSTANTS
// ============================================================================

const NAVIGATION_ZONES: Record<NavigationZone, { label: string; icon: string; color: string }> = {
  mines: { label: 'Surface', icon: 'M', color: '#ffaa44' },
  shipyard: { label: 'Chantier Naval', icon: 'S', color: '#4488ff' },
  research: { label: 'Laboratoire', icon: 'L', color: '#aa44ff' },
  defense: { label: 'Defenses', icon: 'D', color: '#ff4444' },
  fleet: { label: 'Flottes', icon: 'F', color: '#44ff88' },
}

const PLANET_BASE_SIZE = 3.5
const MOON_ORBIT_RADIUS = 8
const STATION_ORBIT_RADIUS = 5.5
const NAVIGATION_ORBIT_RADIUS = 7
const FLEET_ORBIT_RADIUS = 12

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Navigation Portal - Clickable zone around the planet for navigation
 */
function NavigationPortal({
  type,
  position,
  angle,
  onClick,
  isHovered,
  onHover,
}: NavigationPortalProps) {
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  const config = NAVIGATION_ZONES[type]

  // Animation
  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Gentle floating motion
      groupRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.5 + angle) * 0.1
    }
    if (ringRef.current) {
      // Rotate ring
      ringRef.current.rotation.z += 0.01
    }
    if (glowRef.current && isHovered) {
      // Pulse glow when hovered
      const pulse = 0.8 + Math.sin(clock.elapsedTime * 4) * 0.2
      glowRef.current.scale.setScalar(pulse)
    }
  })

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onHover(true)
    document.body.style.cursor = 'pointer'
  }, [onHover])

  const handlePointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onHover(false)
    document.body.style.cursor = 'auto'
  }, [onHover])

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onClick()
  }, [onClick])

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Main icon sphere */}
      <Sphere args={[0.4, 16, 16]}>
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={isHovered ? 0.8 : 0.3}
          metalness={0.5}
          roughness={0.3}
        />
      </Sphere>

      {/* Rotating ring around icon */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.65, 32]} />
        <meshBasicMaterial
          color={config.color}
          transparent
          opacity={isHovered ? 0.9 : 0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer glow effect when hovered */}
      {isHovered && (
        <Sphere ref={glowRef} args={[0.8, 16, 16]}>
          <meshBasicMaterial
            color={config.color}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </Sphere>
      )}

      {/* Label */}
      <Html
        position={[0, 0.9, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`
            px-3 py-1.5 rounded-lg text-xs whitespace-nowrap
            transition-all duration-200 select-none
            border backdrop-blur-sm
            ${isHovered
              ? 'bg-black/90 border-current shadow-lg scale-110'
              : 'bg-black/70 border-gray-600'
            }
          `}
          style={{
            color: config.color,
            borderColor: isHovered ? config.color : undefined,
            boxShadow: isHovered ? `0 0 20px ${config.color}40` : undefined,
          }}
        >
          <div className="font-bold text-center">{config.label}</div>
        </div>
      </Html>
    </group>
  )
}

/**
 * Moon in orbit around the planet
 */
function MoonOrbit({ moonName, planetSize, onClick }: MoonOrbitProps) {
  const moonRef = useRef<THREE.Group>(null)
  const orbitAngleRef = useRef(0)
  const [isHovered, setIsHovered] = useState(false)

  useFrame((_, delta) => {
    orbitAngleRef.current += delta * 0.3
    if (moonRef.current) {
      const radius = planetSize + MOON_ORBIT_RADIUS
      moonRef.current.position.x = Math.cos(orbitAngleRef.current) * radius
      moonRef.current.position.z = Math.sin(orbitAngleRef.current) * radius
    }
  })

  const handlePointerOver = useCallback(() => {
    setIsHovered(true)
    document.body.style.cursor = 'pointer'
  }, [])

  const handlePointerOut = useCallback(() => {
    setIsHovered(false)
    document.body.style.cursor = 'auto'
  }, [])

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onClick?.()
  }, [onClick])

  return (
    <group>
      {/* Moon orbit ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[planetSize + MOON_ORBIT_RADIUS - 0.05, planetSize + MOON_ORBIT_RADIUS + 0.05, 64]} />
        <meshBasicMaterial color="#445566" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Moon */}
      <group
        ref={moonRef}
        position={[planetSize + MOON_ORBIT_RADIUS, 0, 0]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <Sphere args={[0.8, 32, 32]}>
          <meshStandardMaterial
            color="#888899"
            roughness={0.9}
            metalness={0.1}
            emissive={isHovered ? '#445566' : '#000000'}
            emissiveIntensity={0.3}
          />
        </Sphere>

        {/* Moon selection ring */}
        {isHovered && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.0, 1.15, 32]} />
            <meshBasicMaterial color="#66aaff" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* Moon label */}
        <Html
          position={[0, 1.3, 0]}
          center
          distanceFactor={15}
          style={{ pointerEvents: 'none' }}
        >
          <div className={`
            px-2 py-1 rounded text-xs whitespace-nowrap bg-black/80
            border transition-all duration-200
            ${isHovered ? 'border-blue-400 text-blue-300' : 'border-gray-600 text-gray-300'}
          `}>
            {moonName}
          </div>
        </Html>
      </group>
    </group>
  )
}

/**
 * Orbital station (shipyard, depot, satellites)
 */
function OrbitalStation({ type, position, scale = 1 }: OrbitalStationProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005
      meshRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.5) * 0.1
    }
  })

  const getStationConfig = () => {
    switch (type) {
      case 'shipyard':
        return { color: '#4488ff', emissive: '#224488', size: 0.5 }
      case 'depot':
        return { color: '#ff8844', emissive: '#884422', size: 0.4 }
      case 'satellite':
        return { color: '#ffdd44', emissive: '#886622', size: 0.15 }
      default:
        return { color: '#888888', emissive: '#444444', size: 0.3 }
    }
  }

  const config = getStationConfig()

  if (type === 'satellite') {
    // Solar satellite - simple panels
    return (
      <group position={position} scale={scale}>
        {/* Central body */}
        <mesh ref={meshRef}>
          <boxGeometry args={[config.size, config.size, config.size]} />
          <meshStandardMaterial
            color={config.color}
            emissive={config.emissive}
            emissiveIntensity={0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        {/* Solar panels */}
        <mesh position={[config.size * 1.5, 0, 0]}>
          <boxGeometry args={[config.size * 2, config.size * 0.1, config.size * 0.8]} />
          <meshStandardMaterial color="#334466" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[-config.size * 1.5, 0, 0]}>
          <boxGeometry args={[config.size * 2, config.size * 0.1, config.size * 0.8]} />
          <meshStandardMaterial color="#334466" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
    )
  }

  // Shipyard or depot - more complex structure
  return (
    <group position={position} scale={scale}>
      {/* Main structure */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[config.size, 0]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.emissive}
          emissiveIntensity={0.4}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      {/* Docking rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[config.size * 1.3, 0.05, 8, 32]} />
        <meshStandardMaterial color="#666677" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Lights */}
      <pointLight color={config.color} intensity={0.5} distance={3} />
    </group>
  )
}

/**
 * Fleet formation near the planet
 */
function FleetFormation({ fleets, planetSize }: FleetFormationProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Slow orbit around the planet
      groupRef.current.rotation.y = clock.elapsedTime * 0.1
    }
  })

  // Group fleets by hostility
  const friendlyFleets = fleets.filter(f => !f.isHostile)
  const hostileFleets = fleets.filter(f => f.isHostile)

  const renderFleetGroup = (
    fleetList: typeof fleets,
    baseAngle: number,
    isHostile: boolean
  ) => {
    return fleetList.map((fleet, index) => {
      const angle = baseAngle + (index * Math.PI * 0.15)
      const radius = planetSize + FLEET_ORBIT_RADIUS + (index * 0.5)
      const position: [number, number, number] = [
        Math.cos(angle) * radius,
        Math.sin(index * 0.5) * 0.5,
        Math.sin(angle) * radius,
      ]

      return (
        <group key={fleet.id} position={position}>
          {/* Fleet ships */}
          {Array.from({ length: Math.min(fleet.ships, 5) }).map((_, shipIndex) => (
            <ShipModel
              key={shipIndex}
              type="light_fighter"
              position={[shipIndex * 0.5 - 1, 0, 0]}
              scale={0.3}
              teamColor={isHostile ? 'red' : 'blue'}
              engineGlow
            />
          ))}

          {/* Fleet label */}
          <Html
            position={[0, 1, 0]}
            center
            distanceFactor={15}
            style={{ pointerEvents: 'none' }}
          >
            <div className={`
              px-2 py-1 rounded text-[10px] whitespace-nowrap
              border backdrop-blur-sm
              ${isHostile
                ? 'bg-red-900/80 border-red-500 text-red-300'
                : 'bg-blue-900/80 border-blue-500 text-blue-300'
              }
            `}>
              <div className="font-bold">{fleet.mission}</div>
              <div className="text-gray-400">{fleet.ships} vaisseaux</div>
              {fleet.arrivalTime && (
                <div className="text-yellow-400">
                  {formatTimeRemaining(fleet.arrivalTime)}
                </div>
              )}
            </div>
          </Html>
        </group>
      )
    })
  }

  return (
    <group ref={groupRef}>
      {renderFleetGroup(friendlyFleets, 0, false)}
      {renderFleetGroup(hostileFleets, Math.PI, true)}
    </group>
  )
}

/**
 * HUD Panel - Floating information display
 */
function HUDPanel({ resources, production, constructions, fleets }: HUDPanelProps) {
  const hostileFleets = fleets.filter(f => f.isHostile)
  const friendlyFleets = fleets.filter(f => !f.isHostile && f.arrivalTime)

  return (
    <Html
      position={[-12, 6, 0]}
      distanceFactor={20}
      style={{ pointerEvents: 'none' }}
    >
      <div className="
        w-64 p-4 rounded-xl backdrop-blur-md
        bg-gradient-to-br from-black/80 to-gray-900/80
        border border-cyan-500/30 shadow-2xl
        text-white font-mono
      ">
        {/* Resources Section */}
        <div className="mb-4">
          <h3 className="text-xs text-cyan-400 uppercase tracking-wider mb-2 border-b border-cyan-500/20 pb-1">
            Ressources
          </h3>
          <div className="space-y-1.5">
            <ResourceLine
              label="Metal"
              value={resources.metal}
              production={production.metal}
              color="#aabbcc"
            />
            <ResourceLine
              label="Cristal"
              value={resources.crystal}
              production={production.crystal}
              color="#66aaff"
            />
            <ResourceLine
              label="Deuterium"
              value={resources.deuterium}
              production={production.deuterium}
              color="#44ddaa"
            />
          </div>
        </div>

        {/* Energy Section */}
        <div className="mb-4">
          <h3 className="text-xs text-cyan-400 uppercase tracking-wider mb-2 border-b border-cyan-500/20 pb-1">
            Energie
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-yellow-400 text-sm">
              {formatNumber(resources.energy.current)} / {formatNumber(resources.energy.max)}
            </span>
            <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  resources.energy.current >= 0 ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.abs(resources.energy.current / resources.energy.max) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Constructions Section */}
        {constructions.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs text-cyan-400 uppercase tracking-wider mb-2 border-b border-cyan-500/20 pb-1">
              En construction
            </h3>
            <div className="space-y-1">
              {constructions.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">{c.name}</span>
                  <span className="text-yellow-400">{formatTimeRemaining(c.endsAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fleet Alerts */}
        {hostileFleets.length > 0 && (
          <div className="mb-4 p-2 rounded-lg bg-red-900/40 border border-red-500/50">
            <h3 className="text-xs text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span className="animate-pulse">!</span> Flottes hostiles
            </h3>
            {hostileFleets.map((fleet) => (
              <div key={fleet.id} className="text-xs text-red-300">
                {fleet.ships} vaisseaux - {formatTimeRemaining(fleet.arrivalTime!)}
              </div>
            ))}
          </div>
        )}

        {/* Friendly incoming fleets */}
        {friendlyFleets.length > 0 && (
          <div className="p-2 rounded-lg bg-blue-900/30 border border-blue-500/30">
            <h3 className="text-xs text-blue-400 uppercase tracking-wider mb-1">
              Flottes en approche
            </h3>
            {friendlyFleets.map((fleet) => (
              <div key={fleet.id} className="text-xs text-blue-300">
                {fleet.mission}: {fleet.ships} vaisseaux
              </div>
            ))}
          </div>
        )}
      </div>
    </Html>
  )
}

/**
 * Resource line component for HUD
 */
function ResourceLine({
  label,
  value,
  production,
  color,
}: {
  label: string
  value: number
  production: number
  color: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-xs">{label}</span>
      <div className="text-right">
        <span className="text-sm" style={{ color }}>{formatNumber(value)}</span>
        <span className="text-xs text-green-400 ml-2">+{formatNumber(production)}/h</span>
      </div>
    </div>
  )
}

/**
 * Solar satellites cluster
 */
function SatelliteCluster({ planetSize, count }: { planetSize: number; count: number }) {
  const satellites = useMemo(() => {
    return Array.from({ length: Math.min(count, 20) }).map((_, i) => {
      const angle = (i / Math.min(count, 20)) * Math.PI * 2
      const radius = planetSize + STATION_ORBIT_RADIUS + 1.5
      const height = (Math.random() - 0.5) * 1.5
      return {
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius,
        ] as [number, number, number],
        scale: 0.5 + Math.random() * 0.3,
      }
    })
  }, [planetSize, count])

  return (
    <group>
      {satellites.map((sat, i) => (
        <OrbitalStation
          key={i}
          type="satellite"
          position={sat.position}
          scale={sat.scale}
        />
      ))}
    </group>
  )
}

// ============================================================================
// HELPERS (formatNumber and formatTimeRemaining imported from @/lib/utils/format)
// ============================================================================

// ============================================================================
// SCENE CONTENT
// ============================================================================

interface SceneContentProps {
  planet: OrbitalViewSceneProps['planet']
  resources: OrbitalViewSceneProps['resources']
  production: OrbitalViewSceneProps['production']
  fleets: OrbitalViewSceneProps['fleets']
  constructions: OrbitalViewSceneProps['constructions']
  onNavigate: OrbitalViewSceneProps['onNavigate']
  onSelectMoon?: OrbitalViewSceneProps['onSelectMoon']
}

function SceneContent({
  planet,
  resources,
  production,
  fleets,
  constructions,
  onNavigate,
  onSelectMoon,
}: SceneContentProps) {
  const [hoveredZone, setHoveredZone] = useState<NavigationZone | null>(null)

  // Calculate navigation portal positions around the planet
  const navigationPositions = useMemo(() => {
    const zones: NavigationZone[] = ['mines', 'shipyard', 'research', 'defense', 'fleet']
    const radius = PLANET_BASE_SIZE + NAVIGATION_ORBIT_RADIUS

    return zones.map((zone, index) => {
      const angle = (index / zones.length) * Math.PI * 2 - Math.PI / 2
      return {
        type: zone,
        position: [
          Math.cos(angle) * radius,
          0.5 + Math.sin(index * 1.2) * 0.3,
          Math.sin(angle) * radius,
        ] as [number, number, number],
        angle,
      }
    })
  }, [])

  // Calculate planet variant based on ID
  const planetVariant = useMemo(() => {
    const hash = planet.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return (hash % 10) + 1
  }, [planet.id])

  // Check if has solar satellites (based on energy)
  const solarSatelliteCount = Math.floor(resources.energy.max / 50)

  return (
    <>
      {/* Background starfield */}
      <Starfield
        count={5000}
        radius={200}
        depth={100}
        factor={3}
        saturation={0.4}
        speed={0.2}
        rotationSpeed={0.00005}
      />

      {/* Ambient lighting */}
      <ambientLight intensity={0.1} />
      <directionalLight position={[10, 10, 5]} intensity={0.6} color="#ffffff" />
      <pointLight position={[-20, 10, -10]} intensity={0.3} color="#ffcc88" />

      {/* Central planet with PBR textures (auto-loaded based on type) */}
      <Planet3D
        type={planet.type}
        variant={planetVariant}
        size={PLANET_BASE_SIZE}
        position={[0, 0, 0]}
        rotationSpeed={0.001}
        selected={false}
        atmosphereOpacity={0.18}
        normalScale={1.5}
      />

      {/* Planet info label */}
      <Html
        position={[0, PLANET_BASE_SIZE + 1.5, 0]}
        center
        distanceFactor={15}
        style={{ pointerEvents: 'none' }}
      >
        <div className="
          px-4 py-2 rounded-lg backdrop-blur-md
          bg-black/80 border border-cyan-500/40
          text-center
        ">
          <div className="text-white font-bold text-lg">{planet.name}</div>
          <div className="text-cyan-400 text-xs">
            [{planet.coordinates.galaxy}:{planet.coordinates.system}:{planet.coordinates.position}]
          </div>
          <div className="text-gray-400 text-xs mt-1">
            {planet.diameter.toLocaleString()} km | {planet.temperature.min}C to {planet.temperature.max}C
          </div>
          <div className="text-gray-500 text-xs">
            Champs: {planet.fields.used}/{planet.fields.total}
          </div>
        </div>
      </Html>

      {/* Moon (if present) */}
      {planet.hasMoon && planet.moonName && (
        <MoonOrbit
          moonName={planet.moonName}
          planetSize={PLANET_BASE_SIZE}
          onClick={onSelectMoon}
        />
      )}

      {/* Orbital stations */}
      <OrbitalStation
        type="shipyard"
        position={[PLANET_BASE_SIZE + STATION_ORBIT_RADIUS, 1, 0]}
        scale={0.8}
      />
      <OrbitalStation
        type="depot"
        position={[-PLANET_BASE_SIZE - STATION_ORBIT_RADIUS, 0.5, 2]}
        scale={0.6}
      />

      {/* Solar satellites */}
      {solarSatelliteCount > 0 && (
        <SatelliteCluster planetSize={PLANET_BASE_SIZE} count={solarSatelliteCount} />
      )}

      {/* Fleet formations */}
      {fleets.length > 0 && (
        <FleetFormation fleets={fleets} planetSize={PLANET_BASE_SIZE} />
      )}

      {/* Navigation portals */}
      {navigationPositions.map((nav) => (
        <NavigationPortal
          key={nav.type}
          type={nav.type}
          position={nav.position}
          angle={nav.angle}
          onClick={() => onNavigate(nav.type)}
          isHovered={hoveredZone === nav.type}
          onHover={(hovered) => setHoveredZone(hovered ? nav.type : null)}
        />
      ))}

      {/* HUD Panel */}
      <HUDPanel
        resources={resources}
        production={production}
        constructions={constructions}
        fleets={fleets}
      />
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
        <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-cyan-400 text-sm font-mono">Chargement de la vue orbitale...</span>
      </div>
    </Html>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * OrbitalViewScene - 3D orbital view of a selected planet
 *
 * Displays the planet from orbit with all relevant information:
 * - Planet with atmosphere
 * - Moon in orbit (if present)
 * - Orbital stations (shipyard, depot, satellites)
 * - Stationary fleets and incoming fleets
 * - Navigation portals to different game areas
 * - HUD with resources, production, and alerts
 */
export function OrbitalViewScene({
  planet,
  resources,
  production,
  fleets,
  constructions,
  onNavigate,
  onSelectMoon,
}: OrbitalViewSceneProps) {
  const handleNavigate = useCallback((scene: NavigationZone) => {
    onNavigate(scene)
  }, [onNavigate])

  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas
        camera={{
          position: [0, 8, 18],
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
      >
        {/* Deep space background */}
        <color attach="background" args={['#020408']} />

        {/* Main scene content */}
        <Suspense fallback={<SceneLoader />}>
          <SceneContent
            planet={planet}
            resources={resources}
            production={production}
            fleets={fleets}
            constructions={constructions}
            onNavigate={handleNavigate}
            onSelectMoon={onSelectMoon}
          />
        </Suspense>

        {/* Camera controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          minDistance={8}
          maxDistance={50}
          maxPolarAngle={Math.PI * 0.8}
          minPolarAngle={Math.PI * 0.15}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          panSpeed={0.6}
          target={[0, 0, 0]}
        />

        {/* Post-processing effects */}
        <SpaceEffects
          bloomIntensity={0.5}
          bloomThreshold={0.6}
          chromaticAberrationOffset={0.0003}
          vignetteDarkness={0.5}
        />
      </Canvas>
    </div>
  )
}

export default OrbitalViewScene
