/**
 * GalaxyMap3D Component - OPTIMIZED VERSION
 *
 * Elite Dangerous-style galaxy map with:
 * - GPU Instanced rendering (100x+ performance improvement)
 * - Zone-based loading (Active/Buffer/Hidden)
 * - Debounced camera updates
 * - Fog of War visualization
 * - Hyperlane mesh network
 * - Black hole at galactic center
 */

'use client'

import { OrbitControls, Stars, Text, Line } from '@react-three/drei'
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import * as THREE from 'three'
import {
  useGalaxyNavigation,
  useThrottledCameraUpdate,
  type UseGalaxyNavigationReturn,
} from '@/hooks/useGalaxyNavigation'
import type { SystemConnection, SystemDetails, SystemSummary, ZoomLevel } from '@/lib/galaxy/GalaxyMapController'
import { BlackHole3D } from './BlackHole3D'

// ============================================================================
// SHARED GEOMETRIES (created once, reused)
// ============================================================================

const SHARED_GEOMETRIES = {
  star: new THREE.SphereGeometry(1, 12, 12),
  glow: new THREE.SphereGeometry(1, 8, 8),
  ring: new THREE.RingGeometry(1, 1.2, 24),
  hitbox: new THREE.SphereGeometry(1, 6, 6),
}

// Prevent garbage collection
Object.values(SHARED_GEOMETRIES).forEach(g => g.computeBoundingSphere())

// ============================================================================
// TYPES
// ============================================================================

export interface GalaxyMap3DProps {
  galaxyIndex: number
  userId: string
  playerSystemId?: string | null
  onSystemSelect?: (system: SystemDetails) => void
  onSystemHover?: (system: SystemSummary | null) => void
  onZoomLevelChange?: (level: ZoomLevel) => void
  onEnterSystem?: (systemId: string) => void
  onStartExploration?: (systemId: string, missionType: string) => void
  onCameraChange?: (position: { x: number; y: number; z: number }) => void
  initialCameraPosition?: { x: number; y: number; z: number }
  touchTolerance?: number
  className?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STAR_COLORS: Record<string, THREE.Color> = {
  yellow_dwarf: new THREE.Color('#ffdd44'),
  red_dwarf: new THREE.Color('#ff6644'),
  orange_dwarf: new THREE.Color('#ffaa44'),
  white_dwarf: new THREE.Color('#ffffff'),
  red_giant: new THREE.Color('#ff4422'),
  blue_giant: new THREE.Color('#4488ff'),
  binary_yellow: new THREE.Color('#ffee44'),
  binary_red: new THREE.Color('#ff5533'),
  binary_mixed: new THREE.Color('#ffaa77'),
  neutron_star: new THREE.Color('#88aaff'),
  black_hole: new THREE.Color('#440066'),
  white_giant: new THREE.Color('#eeeeff'),
  unknown: new THREE.Color('#888888'),
}

const STAR_SIZES: Record<string, number> = {
  yellow_dwarf: 2.5,
  red_dwarf: 1.8,
  orange_dwarf: 2.2,
  white_dwarf: 1.2,
  red_giant: 4.0,
  blue_giant: 3.5,
  binary_yellow: 2.8,
  binary_red: 2.5,
  binary_mixed: 2.6,
  neutron_star: 1.0,
  black_hole: 3.0,
  white_giant: 3.8,
  unknown: 1.5,
}

const ZOOM_SCALES: Record<ZoomLevel, number> = {
  galaxy: 0.6,
  sector: 0.8,
  system: 1.0,
  body: 1.2,
}

// Detect touch device ONCE globally
const IS_TOUCH_DEVICE = typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0)

// ============================================================================
// INSTANCED STARS COMPONENT
// ============================================================================

interface InstancedStarsProps {
  systems: SystemSummary[]
  selectedId: string | null
  hoveredId: string | null
  playerSystemId: string | null
  zoomLevel: ZoomLevel
  onSelect: (systemId: string) => void
  onHover: (systemId: string | null) => void
}

const InstancedStars = memo(function InstancedStars({
  systems,
  selectedId,
  hoveredId,
  playerSystemId,
  zoomLevel,
  onSelect,
  onHover,
}: InstancedStarsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const glowRef = useRef<THREE.InstancedMesh>(null)
  const tempObject = useMemo(() => new THREE.Object3D(), [])
  const tempColor = useMemo(() => new THREE.Color(), [])

  // Track animation state
  const animationRef = useRef({
    selectedIndex: -1,
    hoveredIndex: -1,
    playerIndex: -1,
  })

  // Build index maps for quick lookup
  const systemIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    systems.forEach((s, i) => map.set(s.id, i))
    return map
  }, [systems])

  // Update animation indices
  useEffect(() => {
    animationRef.current.selectedIndex = selectedId ? systemIndexMap.get(selectedId) ?? -1 : -1
    animationRef.current.hoveredIndex = hoveredId ? systemIndexMap.get(hoveredId) ?? -1 : -1
    animationRef.current.playerIndex = playerSystemId ? systemIndexMap.get(playerSystemId) ?? -1 : -1
  }, [selectedId, hoveredId, playerSystemId, systemIndexMap])

  // Update instance matrices and colors
  useEffect(() => {
    if (!meshRef.current || !glowRef.current || systems.length === 0) return

    const zoomScale = ZOOM_SCALES[zoomLevel]

    systems.forEach((system, i) => {
      const isPlayer = system.id === playerSystemId
      const baseSize = (STAR_SIZES[system.starType] || 1.5) * (isPlayer ? 1.8 : 1.0) * zoomScale

      // Position
      tempObject.position.set(system.positionX, system.positionY, system.positionZ)
      tempObject.scale.setScalar(baseSize)
      tempObject.updateMatrix()

      meshRef.current!.setMatrixAt(i, tempObject.matrix)
      glowRef.current!.setMatrixAt(i, tempObject.matrix)

      // Color with opacity based on discovery
      const color = STAR_COLORS[system.starType] || STAR_COLORS.unknown
      const opacity = isPlayer ? 1.0 :
        system.discoveryLevel === 'unknown' ? 0.4 :
        system.discoveryLevel === 'detected' ? 0.6 :
        system.discoveryLevel === 'scanned' ? 0.8 :
        system.discoveryLevel === 'explored' ? 0.95 : 1.0

      tempColor.copy(color).multiplyScalar(opacity)
      meshRef.current!.setColorAt(i, tempColor)

      // Glow is dimmer
      tempColor.copy(color).multiplyScalar(opacity * 0.3)
      glowRef.current!.setColorAt(i, tempColor)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    meshRef.current.instanceColor!.needsUpdate = true
    glowRef.current.instanceMatrix.needsUpdate = true
    glowRef.current.instanceColor!.needsUpdate = true
  }, [systems, playerSystemId, zoomLevel, tempObject, tempColor])

  // Animate only selected/hovered stars (not all!)
  useFrame((state) => {
    if (!meshRef.current || systems.length === 0) return

    const { selectedIndex, hoveredIndex, playerIndex } = animationRef.current
    const time = state.clock.elapsedTime
    const zoomScale = ZOOM_SCALES[zoomLevel]

    // Only animate specific stars
    const indicesToAnimate = new Set<number>()
    if (selectedIndex >= 0) indicesToAnimate.add(selectedIndex)
    if (hoveredIndex >= 0) indicesToAnimate.add(hoveredIndex)
    if (playerIndex >= 0) indicesToAnimate.add(playerIndex)

    indicesToAnimate.forEach(i => {
      const system = systems[i]
      if (!system) return

      const isSelected = i === selectedIndex
      const isHovered = i === hoveredIndex
      const isPlayer = i === playerIndex

      const pulse = isSelected ? 0.15 : isHovered ? 0.08 : isPlayer ? 0.05 : 0
      const pulseFactor = 1 + Math.sin(time * 3) * pulse
      const baseSize = (STAR_SIZES[system.starType] || 1.5) * (isPlayer ? 1.8 : 1.0) * zoomScale

      tempObject.position.set(system.positionX, system.positionY, system.positionZ)
      tempObject.scale.setScalar(baseSize * pulseFactor)
      tempObject.updateMatrix()

      meshRef.current!.setMatrixAt(i, tempObject.matrix)
    })

    if (indicesToAnimate.size > 0) {
      meshRef.current.instanceMatrix.needsUpdate = true
    }
  })

  // Raycaster click handler
  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (event.instanceId !== undefined && systems[event.instanceId]) {
      event.stopPropagation()
      onSelect(systems[event.instanceId].id)
    }
  }, [systems, onSelect])

  const handlePointerOver = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (event.instanceId !== undefined && systems[event.instanceId]) {
      onHover(systems[event.instanceId].id)
    }
  }, [systems, onHover])

  const handlePointerOut = useCallback(() => {
    onHover(null)
  }, [onHover])

  if (systems.length === 0) return null

  return (
    <>
      {/* Star cores - instanced */}
      <instancedMesh
        ref={meshRef}
        args={[SHARED_GEOMETRIES.star, undefined, systems.length]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        frustumCulled={true}
      >
        <meshBasicMaterial vertexColors transparent opacity={0.95} />
      </instancedMesh>

      {/* Glow effect - instanced */}
      <instancedMesh
        ref={glowRef}
        args={[SHARED_GEOMETRIES.glow, undefined, systems.length]}
        frustumCulled={true}
      >
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.3}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </instancedMesh>
    </>
  )
})

// ============================================================================
// HYPERLANE MESH (optimized with single Line for all)
// ============================================================================

interface HyperlanesMeshProps {
  systems: SystemSummary[]
  connections: SystemConnection[]
  playerSystemId: string | null
}

const HyperlanesMesh = memo(function HyperlanesMesh({
  systems,
  connections,
  playerSystemId,
}: HyperlanesMeshProps) {
  // Build system position lookup
  const positionMap = useMemo(() => {
    const map = new Map<string, THREE.Vector3>()
    systems.forEach(s => {
      map.set(s.id, new THREE.Vector3(s.positionX, s.positionY, s.positionZ))
    })
    return map
  }, [systems])

  // Generate all line points in one array for efficiency
  const { points, colors } = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const cols: THREE.Color[] = []

    const exploredColor = new THREE.Color('#00aaff')
    const unknownColor = new THREE.Color('#334466')
    const playerColor = new THREE.Color('#00ff88')

    connections.forEach(conn => {
      const fromPos = positionMap.get(conn.fromId)
      const toPos = positionMap.get(conn.toId)
      if (!fromPos || !toPos) return

      const isPlayerConnection = conn.fromId === playerSystemId || conn.toId === playerSystemId
      const fromSystem = systems.find(s => s.id === conn.fromId)
      const toSystem = systems.find(s => s.id === conn.toId)
      const isExplored = fromSystem?.isExplored && toSystem?.isExplored

      const color = isPlayerConnection ? playerColor : isExplored ? exploredColor : unknownColor

      pts.push(fromPos.clone(), toPos.clone())
      cols.push(color.clone(), color.clone())
    })

    return { points: pts, colors: cols }
  }, [systems, connections, positionMap, playerSystemId])

  if (points.length === 0) return null

  return (
    <lineSegments frustumCulled={true}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(points.flatMap(p => [p.x, p.y, p.z])), 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[new Float32Array(colors.flatMap(c => [c.r, c.g, c.b])), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.6} linewidth={1} />
    </lineSegments>
  )
})

// ============================================================================
// GALACTIC CENTER (Advanced Black Hole with Shaders)
// ============================================================================

interface GalacticCenterProps {
  position: [number, number, number]
  isVisible: boolean
  zoomLevel: ZoomLevel
}

const GalacticCenter = memo(function GalacticCenter({ position, isVisible, zoomLevel }: GalacticCenterProps) {
  if (!isVisible) return null

  // Scale and detail based on zoom level
  const scale = zoomLevel === 'galaxy' ? 1.0 : zoomLevel === 'sector' ? 1.5 : 2.0
  const useSimpleMode = zoomLevel === 'galaxy' // Use simple mode at galaxy level for performance
  const glowIntensity = zoomLevel === 'galaxy' ? 0.6 : 1.0

  return (
    <group position={position}>
      {/* Advanced Black Hole with Accretion Disk */}
      <BlackHole3D
        position={[0, 0, 0]}
        size={8 * scale}
        accretionDiskSize={25 * scale}
        rotationSpeed={0.3}
        showJets={zoomLevel !== 'galaxy'} // Hide jets at galaxy level
        simpleMode={useSimpleMode}
        glowIntensity={glowIntensity}
        discColors={['#fffaf0', '#ffcc44', '#ff6600', '#ff0044', '#880066']}
      />

      {/* Label */}
      <Text
        position={[0, 35 * scale, 0]}
        fontSize={3 * scale}
        color="#ff6600"
        anchorX="center"
        anchorY="bottom"
      >
        SAGITTARIUS A*
      </Text>
      <Text
        position={[0, 30 * scale, 0]}
        fontSize={1.5 * scale}
        color="#ff884488"
        anchorX="center"
        anchorY="bottom"
      >
        GALACTIC CENTER
      </Text>
    </group>
  )
})

// ============================================================================
// SELECTION INDICATORS (only for selected/hovered)
// ============================================================================

interface SelectionIndicatorProps {
  system: SystemSummary | null
  type: 'selected' | 'hovered' | 'player'
  zoomLevel: ZoomLevel
}

const SelectionIndicator = memo(function SelectionIndicator({
  system,
  type,
  zoomLevel,
}: SelectionIndicatorProps) {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * (type === 'selected' ? 1 : 0.5)
    }
  })

  if (!system) return null

  const zoomScale = ZOOM_SCALES[zoomLevel]
  const baseSize = (STAR_SIZES[system.starType] || 1.5) * zoomScale
  const ringSize = baseSize * (type === 'selected' ? 2.5 : type === 'player' ? 3 : 2)

  const color = type === 'selected' ? '#00ffff' : type === 'player' ? '#00ff88' : '#ffffff'
  const opacity = type === 'selected' ? 0.9 : type === 'player' ? 0.7 : 0.5

  return (
    <group position={[system.positionX, system.positionY, system.positionZ]}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringSize * 0.9, ringSize, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Labels */}
      {type === 'player' && (
        <Text
          position={[0, baseSize + 4, 0]}
          fontSize={2}
          color="#00ff88"
          anchorX="center"
          fontWeight="bold"
        >
          HOME
        </Text>
      )}

      {(type === 'selected' || type === 'hovered') && (
        <Text
          position={[0, baseSize + 2, 0]}
          fontSize={1.5}
          color={system.isExplored ? '#ffffff' : '#888888'}
          anchorX="center"
        >
          {system.isExplored ? `System ${system.systemIndex}` : '???'}
        </Text>
      )}
    </group>
  )
})

// ============================================================================
// CAMERA CONTROLLER (optimized)
// ============================================================================

interface CameraControllerProps {
  navigation: UseGalaxyNavigationReturn
  onCameraChange?: (position: { x: number; y: number; z: number }) => void
  initialCameraPosition?: { x: number; y: number; z: number }
}

// Reusable objects to avoid allocation
const _cameraPos = { x: 0, y: 0, z: 0 }
const _targetPos = { x: 0, y: 0, z: 0 }

function CameraController({ navigation, onCameraChange, initialCameraPosition }: CameraControllerProps) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const lastReportedPos = useRef<{ x: number; y: number; z: number } | null>(null)
  const isInitialized = useRef(false)

  useEffect(() => {
    if (initialCameraPosition && !isInitialized.current) {
      camera.position.set(
        initialCameraPosition.x,
        initialCameraPosition.y,
        initialCameraPosition.z
      )
      isInitialized.current = true
    }
  }, [initialCameraPosition, camera])

  const throttledUpdate = useThrottledCameraUpdate(navigation.updateCamera, 50) // 20fps for camera updates

  useFrame(() => {
    if (!controlsRef.current) return

    const target = controlsRef.current.target as THREE.Vector3

    // Reuse objects instead of creating new ones
    _cameraPos.x = camera.position.x
    _cameraPos.y = camera.position.y
    _cameraPos.z = camera.position.z
    _targetPos.x = target.x
    _targetPos.y = target.y
    _targetPos.z = target.z

    throttledUpdate(_cameraPos, _targetPos, camera.position.distanceTo(target))

    // Report position changes (debounced)
    if (onCameraChange) {
      const last = lastReportedPos.current
      if (!last ||
          Math.abs(_cameraPos.x - last.x) > 5 ||
          Math.abs(_cameraPos.y - last.y) > 5 ||
          Math.abs(_cameraPos.z - last.z) > 5) {
        lastReportedPos.current = { ..._cameraPos }
        onCameraChange({ ..._cameraPos })
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate
      minDistance={10}
      maxDistance={800}
      panSpeed={1.5}
      rotateSpeed={0.5}
      zoomSpeed={1.0}
      enableDamping
      dampingFactor={0.08}
    />
  )
}

// ============================================================================
// GALAXY GRID (simplified)
// ============================================================================

function GalaxyGrid({ zoomLevel }: { zoomLevel: ZoomLevel }) {
  const opacity = zoomLevel === 'galaxy' ? 0.08 : zoomLevel === 'sector' ? 0.15 : 0.2

  return (
    <gridHelper
      args={[600, 30, '#4488ff', '#223366']}
      position={[0, -20, 0]}
      material-transparent
      material-opacity={opacity}
    />
  )
}

// ============================================================================
// INFO PANEL (unchanged, just memoized)
// ============================================================================

interface InfoPanelProps {
  selectedSystem: SystemDetails | null
  hoveredSystem: SystemSummary | null
  zoomLevel: ZoomLevel
  isLoading: boolean
  systemCount: number
  isPlayerSystem: boolean
  onExplore?: (systemId: string, missionType: string) => void
  onEnterSystem?: (systemId: string) => void
  onClose?: () => void
}

const STAR_TYPE_NAMES: Record<string, string> = {
  yellow_dwarf: 'Yellow Dwarf',
  red_dwarf: 'Red Dwarf',
  orange_dwarf: 'Orange Dwarf',
  white_dwarf: 'White Dwarf',
  red_giant: 'Red Giant',
  blue_giant: 'Blue Giant',
  binary_yellow: 'Binary (Yellow)',
  binary_red: 'Binary (Red)',
  binary_mixed: 'Binary (Mixed)',
  neutron_star: 'Neutron Star',
  black_hole: 'Black Hole',
  white_giant: 'White Giant',
  unknown: 'Unknown',
}

const DISCOVERY_COLORS: Record<string, string> = {
  unknown: 'text-gray-500',
  detected: 'text-yellow-500',
  scanned: 'text-blue-400',
  explored: 'text-green-400',
  mapped: 'text-purple-400',
}

const InfoPanel = memo(function InfoPanel({
  selectedSystem,
  hoveredSystem,
  zoomLevel,
  isLoading,
  systemCount,
  isPlayerSystem,
  onExplore,
  onEnterSystem,
  onClose,
}: InfoPanelProps) {
  const colonizedCount = selectedSystem?.bodies?.filter(b => b.hasColony).length ?? 0
  const totalBodies = selectedSystem?.bodies?.length ?? 0
  const colonizableBodies = selectedSystem?.bodies?.filter(b => b.isColonizable).length ?? 0

  return (
    <>
      {/* Top-left HUD */}
      <div className="absolute top-4 left-4 space-y-2 pointer-events-none">
        <div className="bg-black/80 px-3 py-1 rounded text-cyan-400 text-sm font-mono">
          ZOOM: {zoomLevel.toUpperCase()}
        </div>
        <div className="bg-black/80 px-3 py-1 rounded text-gray-400 text-sm font-mono">
          SYSTEMS: {systemCount} {isLoading && '⟳'}
        </div>
      </div>

      {/* System details panel */}
      {selectedSystem && (
        <div className="absolute top-4 right-4 w-80 pointer-events-auto">
          <div className="bg-black/90 backdrop-blur-sm rounded-lg border border-cyan-500/40 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-900/50 to-transparent px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-cyan-400 font-bold text-lg">
                  {selectedSystem.isExplored ? `System ${selectedSystem.systemIndex}` : 'Unknown System'}
                </h3>
                {isPlayerSystem && <span className="text-xs text-green-400 font-mono">YOUR SYSTEM</span>}
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Star info */}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{
                  backgroundColor: STAR_COLORS[selectedSystem.starType]?.getStyle() || '#888'
                }} />
                <span className="text-white">{STAR_TYPE_NAMES[selectedSystem.starType] || 'Unknown'}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Discovery</span>
                <span className={DISCOVERY_COLORS[selectedSystem.discoveryLevel] || 'text-gray-500'}>
                  {selectedSystem.discoveryLevel.toUpperCase()}
                </span>
              </div>

              {/* Bodies info for explored systems */}
              {selectedSystem.isExplored && (
                <>
                  <div className="border-t border-cyan-500/20 pt-3">
                    <div className="text-cyan-400 text-sm font-semibold mb-2">CELESTIAL BODIES</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-800/50 rounded p-2">
                        <div className="text-gray-400">Total</div>
                        <div className="text-white font-bold">{totalBodies}</div>
                      </div>
                      <div className="bg-slate-800/50 rounded p-2">
                        <div className="text-gray-400">Colonizable</div>
                        <div className="text-blue-400 font-bold">{colonizableBodies}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onEnterSystem?.(selectedSystem.id)}
                    className="w-full bg-cyan-600/50 hover:bg-cyan-500/60 border border-cyan-400/60
                      rounded-lg px-4 py-2 text-cyan-100 text-sm font-bold flex items-center justify-center gap-2"
                  >
                    ENTER SYSTEM
                  </button>
                </>
              )}

              {/* Exploration options for unknown systems */}
              {!selectedSystem.isExplored && (
                <div className="space-y-2">
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-2 text-xs">
                    <span className="text-yellow-400">System requires exploration</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onExplore?.(selectedSystem.id, 'quick_scan')}
                      className="bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50
                        rounded px-2 py-1 text-blue-300 text-xs"
                    >
                      Quick Scan (1h)
                    </button>
                    <button
                      onClick={() => onExplore?.(selectedSystem.id, 'deep_scan')}
                      className="bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50
                        rounded px-2 py-1 text-purple-300 text-xs"
                    >
                      Deep Scan (4h)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {!selectedSystem && hoveredSystem && (
        <div className="absolute top-4 right-4 pointer-events-none">
          <div className="bg-black/80 rounded border border-cyan-500/30 p-3 min-w-[160px]">
            <div className="text-cyan-400 font-bold text-sm">
              {hoveredSystem.isExplored ? `System ${hoveredSystem.systemIndex}` : '???'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {hoveredSystem.isExplored && STAR_TYPE_NAMES[hoveredSystem.starType]}
            </div>
          </div>
        </div>
      )}
    </>
  )
})

// ============================================================================
// SCENE CONTENT
// ============================================================================

interface SceneContentProps {
  navigation: UseGalaxyNavigationReturn
  playerSystemId: string | null
  connections: SystemConnection[]
  galacticCenterPos: [number, number, number]
  onCameraChange?: (position: { x: number; y: number; z: number }) => void
  initialCameraPosition?: { x: number; y: number; z: number }
}

function SceneContent({
  navigation,
  playerSystemId,
  connections,
  galacticCenterPos,
  onCameraChange,
  initialCameraPosition,
}: SceneContentProps) {
  const {
    systems,
    selectedSystem,
    hoveredSystem,
    zoomLevel,
    selectSystem,
    hoverSystem,
  } = navigation

  // Find special systems for indicators
  const playerSystem = useMemo(() =>
    systems.find(s => s.id === playerSystemId) || null
  , [systems, playerSystemId])

  const hoveredSummary = useMemo(() =>
    hoveredSystem ? systems.find(s => s.id === hoveredSystem.id) || hoveredSystem : null
  , [hoveredSystem, systems])

  const selectedSummary = useMemo(() =>
    selectedSystem ? systems.find(s => s.id === selectedSystem.id) || null : null
  , [selectedSystem, systems])

  return (
    <>
      {/* Background stars */}
      <Stars
        radius={400}
        depth={80}
        count={3000}
        factor={3}
        saturation={0}
        fade
        speed={0.3}
      />

      {/* Grid */}
      <GalaxyGrid zoomLevel={zoomLevel} />

      {/* Galactic center */}
      <GalacticCenter position={galacticCenterPos} isVisible={true} zoomLevel={zoomLevel} />

      {/* Hyperlane connections */}
      <HyperlanesMesh
        systems={systems}
        connections={connections}
        playerSystemId={playerSystemId}
      />

      {/* All stars (instanced) */}
      <InstancedStars
        systems={systems}
        selectedId={selectedSystem?.id || null}
        hoveredId={hoveredSystem?.id || null}
        playerSystemId={playerSystemId}
        zoomLevel={zoomLevel}
        onSelect={(id) => selectSystem(id)}
        onHover={(id) => hoverSystem(id)}
      />

      {/* Selection indicators (only 3 max) */}
      <SelectionIndicator system={playerSystem} type="player" zoomLevel={zoomLevel} />
      <SelectionIndicator system={selectedSummary} type="selected" zoomLevel={zoomLevel} />
      {!selectedSummary && <SelectionIndicator system={hoveredSummary} type="hovered" zoomLevel={zoomLevel} />}

      {/* Camera controller */}
      <CameraController
        navigation={navigation}
        onCameraChange={onCameraChange}
        initialCameraPosition={initialCameraPosition}
      />

      {/* Ambient light */}
      <ambientLight intensity={0.4} />
    </>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GalaxyMap3DOptimized({
  galaxyIndex,
  userId,
  playerSystemId = null,
  onSystemSelect,
  onSystemHover,
  onZoomLevelChange,
  onEnterSystem,
  onStartExploration,
  onCameraChange,
  initialCameraPosition,
  touchTolerance = 1.5,
  className = '',
}: GalaxyMap3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Navigation hook (stabilized)
  const navigation = useGalaxyNavigation({
    galaxyIndex,
    userId,
    autoInit: true,
    onSystemSelected: onSystemSelect ? (system) => { if (system) onSystemSelect(system) } : undefined,
    onZoomLevelChanged: onZoomLevelChange,
  })

  // Use connections from database, or generate fallback mock connections
  const connections = useMemo(() => {
    // Use real connections from database if available
    if (navigation.connections.length > 0) {
      return navigation.connections
    }

    // Fallback: Generate simple connections between nearby systems if not loaded yet
    const conns: SystemConnection[] = []
    const systems = navigation.systems

    systems.forEach((system, i) => {
      // Connect to 1-3 nearest systems
      const others = systems
        .filter((_, j) => j !== i)
        .map(other => ({
          other,
          dist: Math.hypot(
            other.positionX - system.positionX,
            other.positionY - system.positionY,
            other.positionZ - system.positionZ
          )
        }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, Math.floor(Math.random() * 3) + 1)

      others.forEach(({ other, dist }) => {
        // Avoid duplicates
        const exists = conns.some(c =>
          (c.fromId === system.id && c.toId === other.id) ||
          (c.fromId === other.id && c.toId === system.id)
        )
        if (!exists) {
          conns.push({
            fromId: system.id,
            toId: other.id,
            connectionType: 'hyperlane',
            distance: Math.round(dist)
          })
        }
      })
    })

    return conns
  }, [navigation.systems, navigation.connections])

  // Galactic center position
  const galacticCenterPos: [number, number, number] = [0, 0, 0]

  // Default camera position
  const defaultCameraPosition = initialCameraPosition || { x: 0, y: 120, z: 120 }

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <Canvas
        camera={{
          position: [defaultCameraPosition.x, defaultCameraPosition.y, defaultCameraPosition.z],
          fov: 55,
          near: 1,
          far: 2000,
        }}
        gl={{
          antialias: false, // Disable for performance
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        dpr={[1, 1.5]} // Limit pixel ratio
        frameloop="demand" // Only render when needed
        performance={{ min: 0.5 }}
      >
        <color attach="background" args={['#020408']} />

        <Suspense fallback={null}>
          <SceneContent
            navigation={navigation}
            playerSystemId={playerSystemId}
            connections={connections}
            galacticCenterPos={galacticCenterPos}
            onCameraChange={onCameraChange}
            initialCameraPosition={initialCameraPosition}
          />
        </Suspense>
      </Canvas>

      {/* HUD Overlay */}
      <InfoPanel
        selectedSystem={navigation.selectedSystem}
        hoveredSystem={navigation.hoveredSystem}
        zoomLevel={navigation.zoomLevel}
        isLoading={navigation.isLoading}
        systemCount={navigation.systems.length}
        isPlayerSystem={navigation.selectedSystem?.id === playerSystemId}
        onExplore={onStartExploration}
        onEnterSystem={onEnterSystem}
        onClose={() => navigation.selectSystem(null)}
      />

      {/* Loading indicator */}
      {navigation.isLoading && (
        <div className="absolute bottom-4 right-4 bg-black/70 px-3 py-2 rounded flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-400 text-sm font-mono">LOADING...</span>
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 text-gray-600 text-xs font-mono space-y-0.5">
        <div>SCROLL: Zoom</div>
        <div>DRAG: Pan</div>
        <div>R-DRAG: Rotate</div>
      </div>
    </div>
  )
}

export default GalaxyMap3DOptimized
