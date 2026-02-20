'use client'

/**
 * Starmap3DWindow - 3D Universe Map with R3F Canvas
 *
 * Shows all 100 solar systems as spheres colored by security level,
 * gate connections as lines, route overlay, pulsing current system ring,
 * hover labels, and click-to-set-destination.
 */

import { useMemo, useCallback, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'
import { getUniverseGraph, type SystemNode } from '@/data/universe-graph'
import { getSecurityColor } from '@shared/types/game-constants'

// ============================================================================
// CONSTANTS
// ============================================================================

const SCALE = 0.1
const NODE_SIZE = 2.5
const CURRENT_SIZE = 4

// ============================================================================
// SYSTEM SPHERE
// ============================================================================

function SystemSphere({
  system,
  isCurrent,
  isOnRoute,
  onHover,
  onUnhover,
  onClick,
}: {
  system: SystemNode
  isCurrent: boolean
  isOnRoute: boolean
  onHover: (sys: SystemNode) => void
  onUnhover: () => void
  onClick: (id: string) => void
}) {
  const color = useMemo(() => getSecurityColor(system.securityLevel), [system.securityLevel])
  const pos: [number, number, number] = useMemo(
    () => [system.position.x * SCALE, system.position.y * SCALE, system.position.z * SCALE],
    [system.position]
  )
  const size = isCurrent ? CURRENT_SIZE : NODE_SIZE
  const emissive = isOnRoute ? '#FFAA00' : undefined

  return (
    <mesh
      position={pos}
      onPointerOver={(e) => { e.stopPropagation(); onHover(system) }}
      onPointerOut={() => onUnhover()}
      onClick={(e) => { e.stopPropagation(); onClick(system.id) }}
    >
      <sphereGeometry args={[size, 12, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive ?? color}
        emissiveIntensity={isOnRoute ? 0.6 : 0.2}
      />
    </mesh>
  )
}

// ============================================================================
// PULSING RING for current system
// ============================================================================

function PulsingRing({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.3
    ref.current.scale.set(s, s, s)
  })

  return (
    <mesh ref={ref} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[CURRENT_SIZE + 1, CURRENT_SIZE + 2.5, 32]} />
      <meshBasicMaterial color="#60A5FA" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ============================================================================
// GATE CONNECTIONS
// ============================================================================

function GateLines({ systems }: { systems: SystemNode[] }) {
  const points = useMemo(() => {
    const segs: [THREE.Vector3, THREE.Vector3][] = []
    const seen = new Set<string>()

    for (const sys of systems) {
      for (const connId of sys.connections) {
        const key = [sys.id, connId].sort().join('-')
        if (seen.has(key)) continue
        seen.add(key)

        const other = systems.find((s) => s.id === connId)
        if (!other) continue

        segs.push([
          new THREE.Vector3(sys.position.x * SCALE, sys.position.y * SCALE, sys.position.z * SCALE),
          new THREE.Vector3(other.position.x * SCALE, other.position.y * SCALE, other.position.z * SCALE),
        ])
      }
    }
    return segs
  }, [systems])

  return (
    <>
      {points.map((pair, i) => (
        <Line key={i} points={pair} color="#1a2a3a" lineWidth={1} transparent opacity={0.35} />
      ))}
    </>
  )
}

// ============================================================================
// ROUTE LINES
// ============================================================================

function RouteLines({ route, systems }: { route: string[]; systems: SystemNode[] }) {
  const points = useMemo(() => {
    if (route.length < 2) return null
    const sysMap = new Map(systems.map((s) => [s.id, s]))
    const pts: THREE.Vector3[] = []

    for (const id of route) {
      const sys = sysMap.get(id)
      if (sys) {
        pts.push(new THREE.Vector3(sys.position.x * SCALE, sys.position.y * SCALE, sys.position.z * SCALE))
      }
    }
    return pts.length >= 2 ? pts : null
  }, [route, systems])

  if (!points) return null

  return <Line points={points} color="#FFAA00" lineWidth={2} transparent opacity={0.8} />
}

// ============================================================================
// HOVER LABEL
// ============================================================================

function HoverLabel({ system }: { system: SystemNode }) {
  const pos: [number, number, number] = [
    system.position.x * SCALE,
    system.position.y * SCALE + 6,
    system.position.z * SCALE,
  ]
  return (
    <Html position={pos} center style={{ pointerEvents: 'none' }}>
      <div className="px-2 py-1 rounded text-[10px] whitespace-nowrap border"
        style={{ background: '#0f1923', borderColor: '#1e293b', color: '#C8D8E8' }}>
        <span className="font-semibold">{system.name}</span>
        <span className="ml-1.5" style={{ color: getSecurityColor(system.securityLevel) }}>
          {system.securityLevel.toFixed(1)}
        </span>
      </div>
    </Html>
  )
}

// ============================================================================
// SCENE
// ============================================================================

function StarmapScene({
  hoveredSystem,
  onHover,
  onUnhover,
  onSelect,
}: {
  hoveredSystem: SystemNode | null
  onHover: (s: SystemNode) => void
  onUnhover: () => void
  onSelect: (id: string) => void
}) {
  const currentSystemId = useRTGameStore((s) => s.systemId)
  const route = useRTGameStore((s) => s.route)
  const routeSet = useMemo(() => new Set(route), [route])

  const graph = useMemo(() => getUniverseGraph(), [])
  const systems = useMemo(() => graph.getAllSystems(), [graph])

  const currentSystem = useMemo(
    () => systems.find((s) => s.id === currentSystemId),
    [systems, currentSystemId]
  )
  const currentPos: [number, number, number] | null = currentSystem
    ? [currentSystem.position.x * SCALE, currentSystem.position.y * SCALE, currentSystem.position.z * SCALE]
    : null

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 500, 0]} intensity={0.8} />

      {systems.map((sys) => (
        <SystemSphere
          key={sys.id}
          system={sys}
          isCurrent={sys.id === currentSystemId}
          isOnRoute={routeSet.has(sys.id)}
          onHover={onHover}
          onUnhover={onUnhover}
          onClick={onSelect}
        />
      ))}

      <GateLines systems={systems} />
      {route.length > 1 && <RouteLines route={route} systems={systems} />}
      {currentPos && <PulsingRing position={currentPos} />}
      {hoveredSystem && <HoverLabel system={hoveredSystem} />}

      <OrbitControls enablePan enableZoom enableRotate makeDefault />
    </>
  )
}

// ============================================================================
// WINDOW
// ============================================================================

function StarmapContent() {
  const [hovered, setHovered] = useState<SystemNode | null>(null)

  const handleSelect = useCallback((systemId: string) => {
    const store = useRTGameStore.getState()
    store.setRouteDestination(systemId)
  }, [])

  return (
    <div className="w-full h-full" style={{ minHeight: 300 }}>
      <Canvas
        camera={{ position: [0, 600, 400], fov: 50, near: 1, far: 10000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%', background: '#050810' }}
      >
        <StarmapScene
          hoveredSystem={hovered}
          onHover={setHovered}
          onUnhover={() => setHovered(null)}
          onSelect={handleSelect}
        />
      </Canvas>
    </div>
  )
}

export function Starmap3DWindow() {
  return (
    <ManagedWindow
      id="rt-starmap"
      title="Starmap"
      icon="starmap"
      defaultPosition={{ x: 200, y: 100 }}
      defaultSize={{ width: 600, height: 500 }}
      minWidth={400}
      minHeight={300}
    >
      <StarmapContent />
    </ManagedWindow>
  )
}
