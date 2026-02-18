/**
 * GalaxyMap3D Component
 *
 * Elite Dangerous-style galaxy map with:
 * - Zone-based loading (Active/Buffer/Hidden)
 * - Debounced camera updates
 * - Fog of War visualization
 * - Zoom levels (Galaxy → Sector → System → Body)
 * - Hyperlane connections
 * - Star type-based colors and effects
 *
 * @example
 * ```tsx
 * <GalaxyMap3D
 *   galaxyIndex={1}
 *   userId={user.id}
 *   onSystemSelect={(system) => router.push(`/game/system/${system.id}`)}
 * />
 * ```
 */

'use client'

import { OrbitControls, Stars, Text, Line } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  useGalaxyNavigation,
  useThrottledCameraUpdate,
  type UseGalaxyNavigationReturn,
} from '@/hooks/useGalaxyNavigation'
import type { SystemDetails, SystemSummary, ZoomLevel } from '@/lib/galaxy/GalaxyMapController'

// ============================================================================
// TYPES
// ============================================================================

export interface GalaxyMap3DProps {
  galaxyIndex: number
  userId: string
  /** The solar system ID where the player's current planet is located */
  playerSystemId?: string | null
  onSystemSelect?: (system: SystemDetails) => void
  onSystemHover?: (system: SystemSummary | null) => void
  onZoomLevelChange?: (level: ZoomLevel) => void
  /** Callback when user wants to enter a system (navigate to system view) */
  onEnterSystem?: (systemId: string) => void
  /** Callback when user starts an exploration mission */
  onStartExploration?: (systemId: string, missionType: string) => void
  /** Callback when camera position changes (for deep linking) */
  onCameraChange?: (position: { x: number; y: number; z: number }) => void
  /** Initial camera position (for restoring from URL) */
  initialCameraPosition?: { x: number; y: number; z: number }
  /** Touch tolerance multiplier for mobile devices (default: 1.5) */
  touchTolerance?: number
  className?: string
}

interface StarNodeProps {
  system: SystemSummary
  isSelected: boolean
  isHovered: boolean
  isPlayerSystem: boolean
  zoomLevel: ZoomLevel
  onClick: () => void
  onPointerOver: () => void
  onPointerOut: () => void
  /** Touch tolerance multiplier for hitbox (default: 1.5) */
  touchTolerance?: number
}

interface HyperlaneProps {
  from: THREE.Vector3
  to: THREE.Vector3
  isExplored: boolean
  connectionType: 'standard' | 'wormhole' | 'unstable'
}

// ============================================================================
// STAR TYPE COLORS (matches database config)
// ============================================================================

const STAR_COLORS: Record<string, string> = {
  yellow_dwarf: '#ffdd44',
  red_dwarf: '#ff6644',
  orange_dwarf: '#ffaa44',
  white_dwarf: '#ffffff',
  red_giant: '#ff4422',
  blue_giant: '#4488ff',
  binary_yellow: '#ffee44',
  binary_red: '#ff5533',
  binary_mixed: '#ffaa77',
  neutron_star: '#88aaff',
  black_hole: '#220033',
  white_giant: '#eeeeff',
  unknown: '#888888',
}

const STAR_SIZES: Record<string, number> = {
  yellow_dwarf: 3.0,
  red_dwarf: 2.0,
  orange_dwarf: 2.5,
  white_dwarf: 1.5,
  red_giant: 5.0,
  blue_giant: 4.5,
  binary_yellow: 3.5,
  binary_red: 3.0,
  binary_mixed: 3.2,
  neutron_star: 1.2,
  black_hole: 2.0,
  white_giant: 4.8,
  unknown: 2.0,
}

// Player system multiplier
const PLAYER_SYSTEM_SCALE = 2.0

// ============================================================================
// STAR NODE COMPONENT
// ============================================================================

function StarNode({
  system,
  isSelected,
  isHovered,
  isPlayerSystem,
  zoomLevel,
  onClick,
  onPointerOver,
  onPointerOut,
  touchTolerance = 1.5,
}: StarNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const hitboxRef = useRef<THREE.Mesh>(null)

  const color = STAR_COLORS[system.starType] || STAR_COLORS.unknown
  // Player system is bigger
  const baseSize = (STAR_SIZES[system.starType] || 1.0) * (isPlayerSystem ? PLAYER_SYSTEM_SCALE : 1.0)

  // Detect touch device
  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }, [])

  // Scale based on zoom level
  const scale = useMemo(() => {
    switch (zoomLevel) {
      case 'galaxy': return 0.5
      case 'sector': return 0.8
      case 'system': return 1.2
      case 'body': return 1.5
      default: return 1.0
    }
  }, [zoomLevel])

  // Fog of war opacity - player system always fully visible
  const opacity = useMemo(() => {
    if (isPlayerSystem) return 1.0
    switch (system.discoveryLevel) {
      case 'unknown': return 0.5
      case 'detected': return 0.7
      case 'scanned': return 0.85
      case 'explored': return 0.95
      case 'mapped': return 1.0
      default: return 0.6
    }
  }, [system.discoveryLevel, isPlayerSystem])

  // Animation
  useFrame((state) => {
    if (meshRef.current) {
      // Pulse effect for selected/hovered
      const pulse = isSelected ? 0.2 : isHovered ? 0.1 : 0
      const pulseFactor = 1 + Math.sin(state.clock.elapsedTime * 3) * pulse
      meshRef.current.scale.setScalar(baseSize * scale * pulseFactor)
    }

    if (glowRef.current) {
      // Glow rotation
      glowRef.current.rotation.z = state.clock.elapsedTime * 0.5
    }
  })

  // Show label only when zoomed in enough
  const showLabel = zoomLevel === 'system' || zoomLevel === 'body' || isHovered || isSelected

  // Hitbox size for touch devices (larger invisible sphere)
  const hitboxSize = isTouchDevice ? baseSize * scale * touchTolerance * 2 : baseSize * scale

  return (
    <group
      position={[system.positionX, system.positionY, system.positionZ]}
    >
      {/* Invisible hitbox for touch (larger clickable area) */}
      <mesh
        ref={hitboxRef}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[hitboxSize, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Star core */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[baseSize * scale, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Glow effect */}
      <mesh ref={glowRef} scale={1.5}>
        <sphereGeometry args={[baseSize * scale, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 0.3}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseSize * scale * 1.8, baseSize * scale * 2.0, 32]} />
          <meshBasicMaterial
            color="#00ffff"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Hover ring */}
      {isHovered && !isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseSize * scale * 1.5, baseSize * scale * 1.7, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* System label */}
      {showLabel && (
        <Text
          position={[0, baseSize * scale + 1.5, 0]}
          fontSize={0.8}
          color={system.isExplored ? '#ffffff' : '#888888'}
          anchorX="center"
          anchorY="bottom"
        >
          {system.isExplored ? `System ${system.systemIndex}` : '???'}
        </Text>
      )}

      {/* Unknown system marker */}
      {system.discoveryLevel === 'unknown' && !isPlayerSystem && (
        <Text
          position={[0, baseSize * scale + 0.5, 0]}
          fontSize={0.5}
          color="#666666"
          anchorX="center"
          anchorY="bottom"
        >
          ?
        </Text>
      )}

      {/* Player system marker - always visible */}
      {isPlayerSystem && (
        <>
          {/* Pulsing outer ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[baseSize * scale * 2.2, baseSize * scale * 2.5, 32]} />
            <meshBasicMaterial
              color="#00ff88"
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* HOME label */}
          <Text
            position={[0, baseSize * scale + 3, 0]}
            fontSize={1.5}
            color="#00ff88"
            anchorX="center"
            anchorY="bottom"
            fontWeight="bold"
          >
            HOME
          </Text>
        </>
      )}
    </group>
  )
}

// ============================================================================
// HYPERLANE COMPONENT
// ============================================================================

function Hyperlane({ from, to, isExplored, connectionType }: HyperlaneProps) {
  const color = useMemo(() => {
    if (!isExplored) return '#446688'

    switch (connectionType) {
      case 'wormhole': return '#ff00ff'
      case 'unstable': return '#ff8800'
      default: return '#00aaff'
    }
  }, [isExplored, connectionType])

  const opacity = isExplored ? 0.8 : 0.4
  const lineWidth = connectionType === 'wormhole' ? 3 : 2

  return (
    <Line
      points={[from, to]}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      dashed={connectionType === 'unstable'}
      dashSize={1}
      dashOffset={0}
      gapSize={0.5}
    />
  )
}

// ============================================================================
// CAMERA CONTROLLER
// ============================================================================

interface CameraControllerProps {
  navigation: UseGalaxyNavigationReturn
  onCameraChange?: (position: { x: number; y: number; z: number }) => void
  initialCameraPosition?: { x: number; y: number; z: number }
}

function CameraController({ navigation, onCameraChange, initialCameraPosition }: CameraControllerProps) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const lastReportedPos = useRef<{ x: number; y: number; z: number } | null>(null)
  const isInitialized = useRef(false)

  // Set initial camera position on mount
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

  // Throttled camera update
  const throttledUpdate = useThrottledCameraUpdate(navigation.updateCamera, 32) // ~30fps

  // Sync camera changes to navigation controller and report position
  useFrame(() => {
    if (controlsRef.current) {
      const target = controlsRef.current.target as THREE.Vector3
      throttledUpdate(
        { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        { x: target.x, y: target.y, z: target.z },
        camera.position.distanceTo(target)
      )

      // Report camera position changes (debounced via threshold)
      if (onCameraChange) {
        const pos = { x: camera.position.x, y: camera.position.y, z: camera.position.z }
        const last = lastReportedPos.current

        // Only report if moved more than 1 unit
        if (!last ||
            Math.abs(pos.x - last.x) > 1 ||
            Math.abs(pos.y - last.y) > 1 ||
            Math.abs(pos.z - last.z) > 1) {
          lastReportedPos.current = pos
          onCameraChange(pos)
        }
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate
      minDistance={5}
      maxDistance={1000}
      panSpeed={1.5}
      rotateSpeed={0.5}
      zoomSpeed={1.2}
      // Smooth damping
      enableDamping
      dampingFactor={0.05}
    />
  )
}

// ============================================================================
// GRID HELPER (Elite Dangerous style)
// ============================================================================

function GalaxyGrid({ size = 500, divisions = 50, zoomLevel }: {
  size?: number
  divisions?: number
  zoomLevel: ZoomLevel
}) {
  const opacity = useMemo(() => {
    switch (zoomLevel) {
      case 'galaxy': return 0.1
      case 'sector': return 0.2
      case 'system': return 0.3
      case 'body': return 0.4
      default: return 0.15
    }
  }, [zoomLevel])

  return (
    <gridHelper
      args={[size, divisions, '#4488ff', '#224488']}
      position={[0, -10, 0]}
      rotation={[0, 0, 0]}
      material-transparent
      material-opacity={opacity}
    />
  )
}

// ============================================================================
// STAR TYPE DISPLAY NAMES
// ============================================================================

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

const DISCOVERY_LEVEL_COLORS: Record<string, string> = {
  unknown: 'text-gray-500',
  detected: 'text-yellow-500',
  scanned: 'text-blue-400',
  explored: 'text-green-400',
  mapped: 'text-purple-400',
}

// ============================================================================
// INFO PANEL (HUD overlay)
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

function InfoPanel({
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
  const displaySystem = selectedSystem || hoveredSystem
  const isSelected = selectedSystem !== null

  // Count colonized bodies
  const colonizedCount = selectedSystem?.bodies?.filter(b => b.hasColony).length ?? 0
  const totalBodies = selectedSystem?.bodies?.length ?? 0
  const colonizableBodies = selectedSystem?.bodies?.filter(b => b.isColonizable).length ?? 0

  return (
    <>
      {/* Top-left: Zoom and system count */}
      <div className="absolute top-4 left-4 space-y-2 pointer-events-none">
        <div className="bg-black/70 px-3 py-1 rounded text-cyan-400 text-sm font-mono">
          ZOOM: {zoomLevel.toUpperCase()}
        </div>
        <div className="bg-black/70 px-3 py-1 rounded text-gray-400 text-sm font-mono">
          SYSTEMS: {systemCount} {isLoading && '⟳'}
        </div>
      </div>

      {/* Right side: System details panel */}
      {isSelected && selectedSystem && (
        <div className="absolute top-4 right-4 w-80 pointer-events-auto">
          <div className="bg-black/90 backdrop-blur-sm rounded-lg border border-cyan-500/40 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-900/50 to-transparent px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-cyan-400 font-bold text-lg">
                  {selectedSystem.isExplored
                    ? `System ${selectedSystem.systemIndex}`
                    : 'Unknown System'
                  }
                </h3>
                {isPlayerSystem && (
                  <span className="text-xs text-green-400 font-mono">YOUR SYSTEM</span>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Star info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: STAR_COLORS[selectedSystem.starType] || '#888' }}
                  />
                  <span className="text-white font-medium">
                    {STAR_TYPE_NAMES[selectedSystem.starType] || selectedSystem.starType}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Discovery Level</span>
                  <span className={DISCOVERY_LEVEL_COLORS[selectedSystem.discoveryLevel] || 'text-gray-500'}>
                    {selectedSystem.discoveryLevel.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-cyan-500/20" />

              {/* Bodies info */}
              {selectedSystem.isExplored && (
                <div className="space-y-2">
                  <h4 className="text-cyan-400 text-sm font-semibold">CELESTIAL BODIES</h4>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-800/50 rounded p-2">
                      <div className="text-gray-400 text-xs">Total</div>
                      <div className="text-white font-bold">{totalBodies}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded p-2">
                      <div className="text-gray-400 text-xs">Colonizable</div>
                      <div className="text-blue-400 font-bold">{colonizableBodies}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded p-2">
                      <div className="text-gray-400 text-xs">Colonized</div>
                      <div className="text-green-400 font-bold">{colonizedCount}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded p-2">
                      <div className="text-gray-400 text-xs">Free</div>
                      <div className="text-yellow-400 font-bold">{colonizableBodies - colonizedCount}</div>
                    </div>
                  </div>

                  {/* Body list */}
                  {selectedSystem.bodies && selectedSystem.bodies.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {selectedSystem.bodies.map((body, idx) => (
                        <div
                          key={body.id}
                          className={`text-xs flex items-center justify-between px-2 py-1 rounded ${
                            body.hasColony ? 'bg-green-900/30' : body.isColonizable ? 'bg-blue-900/20' : 'bg-slate-800/30'
                          }`}
                        >
                          <span className="text-gray-300">
                            {idx + 1}. {body.name || body.bodyType}
                          </span>
                          {body.hasColony && <span className="text-green-400">●</span>}
                          {!body.hasColony && body.isColonizable && <span className="text-blue-400">○</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Connections */}
              {selectedSystem.connections && selectedSystem.connections.length > 0 && (
                <>
                  <div className="border-t border-cyan-500/20" />
                  <div className="space-y-2">
                    <h4 className="text-cyan-400 text-sm font-semibold">CONNECTIONS</h4>
                    <div className="text-sm text-gray-300">
                      {selectedSystem.connections.length} linked system{selectedSystem.connections.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </>
              )}

              {/* Divider */}
              <div className="border-t border-cyan-500/20" />

              {/* Actions - Different based on discovery level */}
              <div className="space-y-2">
                <h4 className="text-cyan-400 text-sm font-semibold">ACTIONS</h4>

                {/* EXPLORED SYSTEM: Can enter and view */}
                {selectedSystem.isExplored && (
                  <>
                    {/* Enter System Button - Main action */}
                    <button
                      onClick={() => onEnterSystem?.(selectedSystem.id)}
                      className="w-full bg-gradient-to-r from-cyan-600/50 to-blue-600/50 hover:from-cyan-500/60 hover:to-blue-500/60
                        border border-cyan-400/60 rounded-lg px-4 py-3
                        text-cyan-100 text-sm font-bold transition-all
                        flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/20"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      ENTER SYSTEM
                    </button>

                    {/* Secondary actions */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Map System (if not mapped) */}
                      {selectedSystem.discoveryLevel !== 'mapped' && (
                        <button
                          onClick={() => onExplore?.(selectedSystem.id, 'cartography')}
                          className="bg-amber-600/30 hover:bg-amber-600/50
                            border border-amber-500/50 rounded px-3 py-2
                            text-amber-300 text-xs font-medium transition-all
                            flex flex-col items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                          Map System
                        </button>
                      )}

                      {/* Deploy Satellite */}
                      <button
                        onClick={() => onExplore?.(selectedSystem.id, 'satellite_deploy')}
                        className="bg-green-600/30 hover:bg-green-600/50
                          border border-green-500/50 rounded px-3 py-2
                          text-green-300 text-xs font-medium transition-all
                          flex flex-col items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                        Satellite
                      </button>

                      {/* Send Fleet */}
                      {!isPlayerSystem && (
                        <button
                          onClick={() => onExplore?.(selectedSystem.id, 'send_fleet')}
                          className="bg-cyan-600/30 hover:bg-cyan-600/50
                            border border-cyan-500/50 rounded px-3 py-2
                            text-cyan-300 text-xs font-medium transition-all
                            flex flex-col items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Send Fleet
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* UNKNOWN/DETECTED/SCANNED SYSTEM: Exploration options */}
                {!selectedSystem.isExplored && (
                  <>
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-3 mb-3">
                      <div className="flex items-center gap-2 text-yellow-400 text-sm mb-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        System Not Explored
                      </div>
                      <p className="text-yellow-300/70 text-xs">
                        Send probes to explore this system and reveal its contents.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Quick Scan */}
                      <button
                        onClick={() => onExplore?.(selectedSystem.id, 'quick_scan')}
                        className="bg-blue-600/30 hover:bg-blue-600/50
                          border border-blue-500/50 rounded px-3 py-2
                          text-blue-300 text-xs font-medium transition-all
                          flex flex-col items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>Quick Scan</span>
                        <span className="text-[10px] text-blue-400/60">1 hour</span>
                      </button>

                      {/* Deep Scan */}
                      <button
                        onClick={() => onExplore?.(selectedSystem.id, 'deep_scan')}
                        disabled={selectedSystem.discoveryLevel === 'unknown'}
                        className="bg-purple-600/30 hover:bg-purple-600/50 disabled:bg-gray-700/30 disabled:cursor-not-allowed
                          border border-purple-500/50 disabled:border-gray-600/30 rounded px-3 py-2
                          text-purple-300 disabled:text-gray-500 text-xs font-medium transition-all
                          flex flex-col items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>Deep Scan</span>
                        <span className="text-[10px] text-purple-400/60">4 hours</span>
                      </button>
                    </div>

                    {/* Full Exploration button */}
                    <button
                      onClick={() => onExplore?.(selectedSystem.id, 'full_exploration')}
                      disabled={selectedSystem.discoveryLevel === 'unknown'}
                      className="w-full bg-gradient-to-r from-green-600/40 to-emerald-600/40
                        hover:from-green-500/50 hover:to-emerald-500/50
                        disabled:from-gray-700/30 disabled:to-gray-700/30 disabled:cursor-not-allowed
                        border border-green-500/50 disabled:border-gray-600/30 rounded-lg px-4 py-3
                        text-green-300 disabled:text-gray-500 text-sm font-bold transition-all
                        flex items-center justify-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      FULL EXPLORATION
                      <span className="text-xs text-green-400/60">(8h)</span>
                    </button>

                    <p className="text-gray-500 text-[10px] text-center">
                      Explore to unlock system view and colonization
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hover tooltip (when not selected) */}
      {!isSelected && hoveredSystem && (
        <div className="absolute top-4 right-4 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-sm rounded border border-cyan-500/30 p-3 min-w-[180px]">
            <div className="text-cyan-400 font-bold text-sm mb-1">
              {hoveredSystem.isExplored
                ? `System ${hoveredSystem.systemIndex}`
                : 'Unknown System'
              }
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              {hoveredSystem.isExplored && (
                <>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: STAR_COLORS[hoveredSystem.starType] || '#888' }}
                    />
                    {STAR_TYPE_NAMES[hoveredSystem.starType] || hoveredSystem.starType}
                  </div>
                  <div className={DISCOVERY_LEVEL_COLORS[hoveredSystem.discoveryLevel]}>
                    {hoveredSystem.discoveryLevel.toUpperCase()}
                  </div>
                </>
              )}
              {!hoveredSystem.isExplored && (
                <div className="text-gray-500 italic">Click to explore</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================================
// MAIN SCENE CONTENT
// ============================================================================

interface SceneContentProps {
  navigation: UseGalaxyNavigationReturn
  playerSystemId: string | null
  onSystemSelect?: (system: SystemDetails) => void
  onCameraChange?: (position: { x: number; y: number; z: number }) => void
  initialCameraPosition?: { x: number; y: number; z: number }
  touchTolerance?: number
}

function SceneContent({ navigation, playerSystemId, onSystemSelect, onCameraChange, initialCameraPosition, touchTolerance = 1.5 }: SceneContentProps) {
  const {
    systems,
    selectedSystem,
    hoveredSystem,
    zoomLevel,
    selectSystem,
    hoverSystem,
  } = navigation

  // Debug logging
  useEffect(() => {
    if (systems.length > 0) {
      console.log('[GalaxyMap3D] Systems loaded:', systems.length)
      console.log('[GalaxyMap3D] Player system ID:', playerSystemId)
      const explored = systems.filter(s => s.isExplored)
      console.log('[GalaxyMap3D] Explored systems:', explored.length, explored.map(s => ({ id: s.id, index: s.systemIndex, level: s.discoveryLevel })))
      const playerSys = systems.find(s => s.id === playerSystemId)
      if (playerSys) {
        console.log('[GalaxyMap3D] Player system found:', playerSys)
      } else {
        console.log('[GalaxyMap3D] Player system NOT found in loaded systems')
      }
    }
  }, [systems, playerSystemId])

  // Find player's system
  const playerSystem = useMemo(() => {
    if (!playerSystemId) return null
    return systems.find(s => s.id === playerSystemId) || null
  }, [systems, playerSystemId])

  // Build hyperlane connections - show all connections between visible systems
  // Plus highlight connections from player's system
  const hyperlanes = useMemo(() => {
    const lanes: HyperlaneProps[] = []

    // If we have a selected system with connections, show those
    if (selectedSystem?.connections) {
      selectedSystem.connections.forEach(conn => {
        const targetSystem = systems.find(s => s.id === conn.targetSystemId)
        if (targetSystem) {
          lanes.push({
            from: new THREE.Vector3(selectedSystem.positionX, selectedSystem.positionY, selectedSystem.positionZ),
            to: new THREE.Vector3(targetSystem.positionX, targetSystem.positionY, targetSystem.positionZ),
            isExplored: targetSystem.isExplored,
            connectionType: conn.connectionType,
          })
        }
      })
    }

    // Always show connections from player's system if available
    // For now, draw lines to nearest systems (since we don't have pre-computed connections)
    if (playerSystem && systems.length > 1) {
      // Find closest systems to player (simulated connections)
      const otherSystems = systems.filter(s => s.id !== playerSystem.id)
      const sortedByDistance = otherSystems
        .map(s => ({
          system: s,
          distance: Math.sqrt(
            Math.pow(s.positionX - playerSystem.positionX, 2) +
            Math.pow(s.positionY - playerSystem.positionY, 2) +
            Math.pow(s.positionZ - playerSystem.positionZ, 2)
          )
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3) // Connect to 3 nearest systems

      sortedByDistance.forEach(({ system }) => {
        // Check if this connection already exists
        const exists = lanes.some(l =>
          (l.from.x === playerSystem.positionX && l.to.x === system.positionX) ||
          (l.to.x === playerSystem.positionX && l.from.x === system.positionX)
        )
        if (!exists) {
          lanes.push({
            from: new THREE.Vector3(playerSystem.positionX, playerSystem.positionY, playerSystem.positionZ),
            to: new THREE.Vector3(system.positionX, system.positionY, system.positionZ),
            isExplored: true, // Player can see their own connections
            connectionType: 'standard',
          })
        }
      })
    }

    return lanes
  }, [selectedSystem, systems, playerSystem])

  const handleSystemClick = useCallback(async (systemId: string) => {
    await selectSystem(systemId)
    if (onSystemSelect && selectedSystem) {
      // Wait for selection to complete
      setTimeout(() => {
        if (selectedSystem) onSystemSelect(selectedSystem)
      }, 100)
    }
  }, [selectSystem, onSystemSelect, selectedSystem])

  return (
    <>
      {/* Background stars */}
      <Stars
        radius={500}
        depth={100}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      {/* Galaxy grid */}
      <GalaxyGrid zoomLevel={zoomLevel} />

      {/* Hyperlanes */}
      {hyperlanes.map((lane, index) => (
        <Hyperlane key={`lane-${index}`} {...lane} />
      ))}

      {/* Star systems */}
      {systems.map(system => (
        <StarNode
          key={system.id}
          system={system}
          isSelected={selectedSystem?.id === system.id}
          isHovered={hoveredSystem?.id === system.id}
          isPlayerSystem={system.id === playerSystemId}
          zoomLevel={zoomLevel}
          onClick={() => handleSystemClick(system.id)}
          onPointerOver={() => hoverSystem(system.id)}
          onPointerOut={() => hoverSystem(null)}
          touchTolerance={touchTolerance}
        />
      ))}

      {/* Camera controller */}
      <CameraController
        navigation={navigation}
        onCameraChange={onCameraChange}
        initialCameraPosition={initialCameraPosition}
      />

      {/* Ambient light */}
      <ambientLight intensity={0.3} />
    </>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GalaxyMap3D({
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
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null)
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Navigation hook
  const navigation = useGalaxyNavigation({
    galaxyIndex,
    userId,
    autoInit: true,
    onSystemSelected: (system) => {
      if (system && onSystemSelect) {
        onSystemSelect(system)
      }
    },
    onZoomLevelChanged: onZoomLevelChange,
  })

  // Pass hover events
  useEffect(() => {
    if (onSystemHover) {
      onSystemHover(navigation.hoveredSystem)
    }
  }, [navigation.hoveredSystem, onSystemHover])

  // Debounced resize handler (150ms debounce)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleResize = () => {
      // Clear pending resize
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }

      // Debounce resize updates
      resizeTimeoutRef.current = setTimeout(() => {
        const rect = container.getBoundingClientRect()
        setCanvasSize({ width: rect.width, height: rect.height })
      }, 150)
    }

    // Initial size
    handleResize()

    // Observe resize
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [])

  // Default camera position
  const defaultCameraPosition = initialCameraPosition || { x: 0, y: 100, z: 100 }

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <Canvas
        camera={{
          position: [defaultCameraPosition.x, defaultCameraPosition.y, defaultCameraPosition.z],
          fov: 60,
          near: 0.1,
          far: 2000,
        }}
        gl={{
          antialias: true,
          alpha: false,
        }}
        // Pass raycaster params for touch tolerance
        raycaster={{
          params: {
            Points: { threshold: touchTolerance },
            Line: { threshold: touchTolerance * 0.5 },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        }}
        // Use debounced size if available
        style={canvasSize ? { width: canvasSize.width, height: canvasSize.height } : undefined}
      >
        <color attach="background" args={['#000008']} />

        <Suspense fallback={null}>
          <SceneContent
            navigation={navigation}
            playerSystemId={playerSystemId}
            onSystemSelect={onSystemSelect}
            onCameraChange={onCameraChange}
            initialCameraPosition={initialCameraPosition}
            touchTolerance={touchTolerance}
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
        onExplore={(systemId, missionType) => {
          if (onStartExploration) {
            onStartExploration(systemId, missionType)
          } else {
            console.log(`Launch ${missionType} mission to system ${systemId}`)
          }
        }}
        onEnterSystem={(systemId) => {
          if (onEnterSystem) {
            onEnterSystem(systemId)
          } else {
            console.log(`Enter system ${systemId}`)
          }
        }}
        onClose={() => navigation.selectSystem(null)}
      />

      {/* Loading indicator */}
      {navigation.isLoading && (
        <div className="absolute bottom-4 right-4 bg-black/70 px-3 py-2 rounded flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-400 text-sm font-mono">
            LOADING {navigation.loadingState.loadingZone?.toUpperCase()}...
          </span>
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 text-gray-500 text-xs font-mono space-y-1">
        <div>SCROLL: Zoom</div>
        <div>DRAG: Pan</div>
        <div>RIGHT-DRAG: Rotate</div>
        <div>CLICK: Select System</div>
      </div>
    </div>
  )
}

export default GalaxyMap3D
