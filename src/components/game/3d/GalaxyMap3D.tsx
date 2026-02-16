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
  onSystemSelect?: (system: SystemDetails) => void
  onSystemHover?: (system: SystemSummary | null) => void
  onZoomLevelChange?: (level: ZoomLevel) => void
  className?: string
}

interface StarNodeProps {
  system: SystemSummary
  isSelected: boolean
  isHovered: boolean
  zoomLevel: ZoomLevel
  onClick: () => void
  onPointerOver: () => void
  onPointerOut: () => void
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
  yellow_dwarf: 1.0,
  red_dwarf: 0.6,
  orange_dwarf: 0.8,
  white_dwarf: 0.4,
  red_giant: 2.5,
  blue_giant: 2.0,
  binary_yellow: 1.2,
  binary_red: 1.0,
  binary_mixed: 1.1,
  neutron_star: 0.3,
  black_hole: 0.5,
  white_giant: 2.2,
  unknown: 0.5,
}

// ============================================================================
// STAR NODE COMPONENT
// ============================================================================

function StarNode({
  system,
  isSelected,
  isHovered,
  zoomLevel,
  onClick,
  onPointerOver,
  onPointerOut,
}: StarNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  const color = STAR_COLORS[system.starType] || STAR_COLORS.unknown
  const baseSize = STAR_SIZES[system.starType] || 1.0

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

  // Fog of war opacity
  const opacity = useMemo(() => {
    switch (system.discoveryLevel) {
      case 'unknown': return 0.2
      case 'detected': return 0.5
      case 'scanned': return 0.7
      case 'explored': return 0.9
      case 'mapped': return 1.0
      default: return 0.3
    }
  }, [system.discoveryLevel])

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

  return (
    <group
      position={[system.positionX, system.positionY, system.positionZ]}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
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
      {system.discoveryLevel === 'unknown' && (
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
    </group>
  )
}

// ============================================================================
// HYPERLANE COMPONENT
// ============================================================================

function Hyperlane({ from, to, isExplored, connectionType }: HyperlaneProps) {
  const color = useMemo(() => {
    if (!isExplored) return '#333333'

    switch (connectionType) {
      case 'wormhole': return '#ff00ff'
      case 'unstable': return '#ff8800'
      default: return '#4488ff'
    }
  }, [isExplored, connectionType])

  const opacity = isExplored ? 0.6 : 0.2
  const lineWidth = connectionType === 'wormhole' ? 2 : 1

  return (
    <Line
      points={[from, to]}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      dashed={connectionType === 'unstable'}
      dashSize={0.5}
      dashOffset={0}
      gapSize={0.3}
    />
  )
}

// ============================================================================
// CAMERA CONTROLLER
// ============================================================================

interface CameraControllerProps {
  navigation: UseGalaxyNavigationReturn
}

function CameraController({ navigation }: CameraControllerProps) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  // Throttled camera update
  const throttledUpdate = useThrottledCameraUpdate(navigation.updateCamera, 32) // ~30fps

  // Sync camera changes to navigation controller
  useFrame(() => {
    if (controlsRef.current) {
      const target = controlsRef.current.target as THREE.Vector3
      throttledUpdate(
        { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        { x: target.x, y: target.y, z: target.z },
        camera.position.distanceTo(target)
      )
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
// INFO PANEL (HUD overlay)
// ============================================================================

interface InfoPanelProps {
  selectedSystem: SystemDetails | null
  hoveredSystem: SystemSummary | null
  zoomLevel: ZoomLevel
  isLoading: boolean
  systemCount: number
}

function InfoPanel({
  selectedSystem,
  hoveredSystem,
  zoomLevel,
  isLoading,
  systemCount,
}: InfoPanelProps) {
  const displaySystem = selectedSystem || hoveredSystem

  return (
    <div className="absolute top-4 left-4 space-y-2 pointer-events-none">
      {/* Zoom Level */}
      <div className="bg-black/70 px-3 py-1 rounded text-cyan-400 text-sm font-mono">
        ZOOM: {zoomLevel.toUpperCase()}
      </div>

      {/* System Count */}
      <div className="bg-black/70 px-3 py-1 rounded text-gray-400 text-sm font-mono">
        SYSTEMS: {systemCount} {isLoading && '⟳'}
      </div>

      {/* Selected/Hovered System Info */}
      {displaySystem && (
        <div className="bg-black/80 p-3 rounded border border-cyan-500/30 min-w-[200px]">
          <div className="text-cyan-400 font-bold mb-2">
            {displaySystem.isExplored
              ? `SYSTEM ${displaySystem.systemIndex}`
              : 'UNKNOWN SYSTEM'
            }
          </div>

          {displaySystem.isExplored ? (
            <>
              <div className="text-gray-300 text-sm space-y-1">
                <div>Star: <span className="text-yellow-400">{displaySystem.starType.replace('_', ' ')}</span></div>
                <div>Status: <span className="text-green-400">{displaySystem.discoveryLevel}</span></div>
                {'bodies' in displaySystem && (
                  <div>Bodies: <span className="text-blue-400">{displaySystem.bodies.length}</span></div>
                )}
                {'connections' in displaySystem && (
                  <div>Connections: <span className="text-purple-400">{displaySystem.connections.length}</span></div>
                )}
              </div>
            </>
          ) : (
            <div className="text-gray-500 text-sm italic">
              Explore to reveal system data
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN SCENE CONTENT
// ============================================================================

interface SceneContentProps {
  navigation: UseGalaxyNavigationReturn
  onSystemSelect?: (system: SystemDetails) => void
}

function SceneContent({ navigation, onSystemSelect }: SceneContentProps) {
  const {
    systems,
    selectedSystem,
    hoveredSystem,
    zoomLevel,
    selectSystem,
    hoverSystem,
  } = navigation

  // Build hyperlane connections from selected system
  const hyperlanes = useMemo(() => {
    if (!selectedSystem || !selectedSystem.connections) return []

    return selectedSystem.connections.map(conn => {
      const targetSystem = systems.find(s => s.id === conn.targetSystemId)
      if (!targetSystem) return null

      return {
        from: new THREE.Vector3(selectedSystem.positionX, selectedSystem.positionY, selectedSystem.positionZ),
        to: new THREE.Vector3(targetSystem.positionX, targetSystem.positionY, targetSystem.positionZ),
        isExplored: targetSystem.isExplored,
        connectionType: conn.connectionType,
      }
    }).filter(Boolean) as HyperlaneProps[]
  }, [selectedSystem, systems])

  const handleSystemClick = useCallback(async (systemId: string) => {
    await selectSystem(systemId)
    if (onSystemSelect && selectedSystem) {
      // Wait for selection to complete
      setTimeout(() => {
        const system = navigation.getSelectedSystem()
        if (system) onSystemSelect(system)
      }, 100)
    }
  }, [selectSystem, onSystemSelect, selectedSystem, navigation])

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
          zoomLevel={zoomLevel}
          onClick={() => handleSystemClick(system.id)}
          onPointerOver={() => hoverSystem(system.id)}
          onPointerOut={() => hoverSystem(null)}
        />
      ))}

      {/* Camera controller */}
      <CameraController navigation={navigation} />

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
  onSystemSelect,
  onSystemHover,
  onZoomLevelChange,
  className = '',
}: GalaxyMap3DProps) {
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

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        camera={{
          position: [0, 100, 100],
          fov: 60,
          near: 0.1,
          far: 2000,
        }}
        gl={{
          antialias: true,
          alpha: false,
        }}
      >
        <color attach="background" args={['#000008']} />

        <Suspense fallback={null}>
          <SceneContent
            navigation={navigation}
            onSystemSelect={onSystemSelect}
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
