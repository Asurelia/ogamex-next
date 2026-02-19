'use client'

/**
 * Starmap3DWindow - 3D Universe Map
 *
 * Secondary R3F canvas showing the universe graph:
 * - Instanced spheres for system nodes, colored by security level
 * - Lines for stargate connections
 * - Route overlay highlighting the current route
 */

import { useMemo, useCallback, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'
import { getUniverseGraph } from '@/data/universe-graph'
import { getSecurityColor } from '@shared/types/game-constants'

// ============================================================================
// CONSTANTS
// ============================================================================

const NODE_RADIUS = 30
const CURRENT_NODE_RADIUS = 50
const SCALE = 0.1 // Universe coords to display coords

// ============================================================================
// SYSTEM NODES (instanced spheres)
// ============================================================================

function SystemNodes({ onSelectSystem }: { onSelectSystem: (id: string) => void }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const graph = useMemo(() => getUniverseGraph(), [])
  const systems = useMemo(() => graph.getAllSystems(), [graph])
  const { systemId: currentSystemId } = useRTGameStore()

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorArray = useMemo(() => new Float32Array(systems.length * 3), [systems])

  // Set up instance matrices and colors
  useMemo(() => {
    systems.forEach((sys, i) => {
      dummy.position.set(
        sys.position.x * SCALE,
        sys.position.y * SCALE,
        sys.position.z * SCALE
      )
      const scale = sys.id === currentSystemId ? CURRENT_NODE_RADIUS * SCALE : NODE_RADIUS * SCALE
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()

      if (meshRef.current) {
        meshRef.current.setMatrixAt(i, dummy.matrix)
      }

      const color = new THREE.Color(getSecurityColor(sys.securityLevel))
      colorArray[i * 3] = color.r
      colorArray[i * 3 + 1] = color.g
      colorArray[i * 3 + 2] = color.b
    })

    if (meshRef.current) {
      meshRef.current.instanceMatrix.needsUpdate = true
    }
  }, [systems, currentSystemId, dummy, colorArray])

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, systems.length]}
      onClick={(e) => {
        if (e.instanceId !== undefined) {
          const sys = systems[e.instanceId]
          if (sys) onSelectSystem(sys.id)
        }
      }}
    >
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial />
      <instancedBufferAttribute
        attach="geometry-attributes-color"
        args={[colorArray, 3]}
      />
    </instancedMesh>
  )
}

// ============================================================================
// GATE CONNECTIONS (lines)
// ============================================================================

function GateConnections() {
  const graph = useMemo(() => getUniverseGraph(), [])

  const lineGeometry = useMemo(() => {
    const points: number[] = []

    for (const conn of graph.connections) {
      const from = graph.getSystem(conn.from)
      const to = graph.getSystem(conn.to)
      if (!from || !to) continue

      points.push(
        from.position.x * SCALE, from.position.y * SCALE, from.position.z * SCALE,
        to.position.x * SCALE, to.position.y * SCALE, to.position.z * SCALE
      )
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return geometry
  }, [graph])

  return (
    <lineSegments geometry={lineGeometry}>
      <lineBasicMaterial color="#1a2a3a" opacity={0.4} transparent />
    </lineSegments>
  )
}

// ============================================================================
// ROUTE OVERLAY
// ============================================================================

function RouteOverlay({ route }: { route: string[] }) {
  const graph = useMemo(() => getUniverseGraph(), [])

  const lineGeometry = useMemo(() => {
    if (route.length < 2) return null

    const points: number[] = []
    for (let i = 0; i < route.length - 1; i++) {
      const from = graph.getSystem(route[i])
      const to = graph.getSystem(route[i + 1])
      if (!from || !to) continue

      points.push(
        from.position.x * SCALE, from.position.y * SCALE, from.position.z * SCALE,
        to.position.x * SCALE, to.position.y * SCALE, to.position.z * SCALE
      )
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return geometry
  }, [route, graph])

  if (!lineGeometry) return null

  return (
    <lineSegments geometry={lineGeometry}>
      <lineBasicMaterial color="#FFAA00" linewidth={2} opacity={0.9} transparent />
    </lineSegments>
  )
}

// ============================================================================
// STARMAP SCENE
// ============================================================================

function StarmapScene({ route, onSelectSystem }: { route: string[]; onSelectSystem: (id: string) => void }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <SystemNodes onSelectSystem={onSelectSystem} />
      <GateConnections />
      {route.length > 0 && <RouteOverlay route={route} />}
      <OrbitControls enablePan enableZoom enableRotate makeDefault />
    </>
  )
}

// ============================================================================
// STARMAP WINDOW
// ============================================================================

function StarmapContent() {
  const route = useRTGameStore(s => (s as any).route ?? []) as string[]

  const handleSelectSystem = useCallback((systemId: string) => {
    const store = useRTGameStore.getState() as any
    if (store.setRouteDestination) {
      store.setRouteDestination(systemId)
    }
  }, [])

  return (
    <div className="w-full h-full" style={{ minHeight: 300 }}>
      <Canvas
        camera={{ position: [0, 800, 0], fov: 50, near: 1, far: 10000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%', background: '#050810' }}
      >
        <StarmapScene route={route} onSelectSystem={handleSelectSystem} />
      </Canvas>
    </div>
  )
}

export function Starmap3DWindow() {
  return (
    <ManagedWindow
      id="rt-starmap"
      title="Starmap"
      icon="🗺️"
      defaultPosition={{ x: 200, y: 100 }}
      defaultSize={{ width: 600, height: 500 }}
      minWidth={400}
      minHeight={300}
    >
      <StarmapContent />
    </ManagedWindow>
  )
}
