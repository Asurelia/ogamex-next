/**
 * useGalaxyNavigation Hook
 *
 * React hook for galaxy map navigation with:
 * - Automatic debouncing (no API spam)
 * - Zone-based loading (Active/Buffer)
 * - Camera state synchronization
 * - Fog of War integration
 *
 * @example
 * ```tsx
 * const {
 *   systems,
 *   selectedSystem,
 *   zoomLevel,
 *   isLoading,
 *   updateCamera,
 *   selectSystem,
 *   navigateToSystem,
 * } = useGalaxyNavigation({ galaxyIndex: 1, userId: 'xxx' })
 *
 * // In Three.js camera change callback
 * useFrame(({ camera }) => {
 *   updateCamera(camera.position, controls.target, camera.zoom)
 * })
 * ```
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  GalaxyMapController,
  type CameraState,
  type LoadingState,
  type MapControllerCallbacks,
  type SystemConnection,
  type SystemDetails,
  type SystemSummary,
  type ZoomLevel,
} from '@/lib/galaxy/GalaxyMapController'

// Re-export for convenience
export type { SystemConnection }

// ============================================================================
// TYPES
// ============================================================================

export interface UseGalaxyNavigationOptions {
  /** Current galaxy index (1-9) */
  galaxyIndex: number
  /** Current user ID */
  userId: string
  /** Auto-initialize on mount */
  autoInit?: boolean
  /** Callbacks */
  onSystemsLoaded?: (systems: SystemSummary[], zone: 'active' | 'buffer') => void
  onSystemSelected?: (system: SystemDetails | null) => void
  onZoomLevelChanged?: (level: ZoomLevel) => void
  onError?: (error: Error) => void
}

export interface UseGalaxyNavigationReturn {
  // State
  systems: SystemSummary[]
  activeSystems: SystemSummary[]
  bufferSystems: SystemSummary[]
  connections: SystemConnection[]
  selectedSystem: SystemDetails | null
  hoveredSystem: SystemSummary | null
  zoomLevel: ZoomLevel
  cameraState: CameraState
  loadingState: LoadingState
  isLoading: boolean
  isInitialized: boolean

  // Actions
  initialize: () => Promise<void>
  updateCamera: (
    position: { x: number; y: number; z: number },
    target: { x: number; y: number; z: number },
    zoom: number
  ) => void
  selectSystem: (systemId: string | null) => Promise<void>
  hoverSystem: (systemId: string | null) => void
  navigateToSystem: (systemIndex: number) => Promise<void>
  changeGalaxy: (galaxyIndex: number) => Promise<void>
  refresh: () => Promise<void>

  // Utilities
  getSystemById: (id: string) => SystemSummary | undefined
  getSystemByIndex: (index: number) => SystemSummary | undefined
  isSystemInActiveZone: (id: string) => boolean
  isSystemExplored: (id: string) => boolean
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useGalaxyNavigation(
  options: UseGalaxyNavigationOptions
): UseGalaxyNavigationReturn {
  const {
    galaxyIndex,
    userId,
    autoInit = true,
    onSystemsLoaded,
    onSystemSelected,
    onZoomLevelChanged,
    onError,
  } = options

  // Controller ref (singleton per hook instance)
  const controllerRef = useRef<GalaxyMapController | null>(null)

  // State
  const [activeSystems, setActiveSystems] = useState<SystemSummary[]>([])
  const [bufferSystems, setBufferSystems] = useState<SystemSummary[]>([])
  const [connections, setConnections] = useState<SystemConnection[]>([])
  const [selectedSystem, setSelectedSystem] = useState<SystemDetails | null>(null)
  const [hoveredSystem, setHoveredSystem] = useState<SystemSummary | null>(null)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('galaxy')
  const [cameraState, setCameraState] = useState<CameraState>({
    position: { x: 0, y: 100, z: 0 },
    target: { x: 0, y: 0, z: 0 },
    zoom: 200,
    zoomLevel: 'galaxy',
  })
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    loadingZone: null,
    progress: 0,
    lastLoadTime: 0,
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Stable callback refs to avoid recreating controller
  const callbackRefs = useRef({
    onSystemsLoaded,
    onSystemSelected,
    onZoomLevelChanged,
    onError,
  })

  // Update refs when callbacks change
  useEffect(() => {
    callbackRefs.current = {
      onSystemsLoaded,
      onSystemSelected,
      onZoomLevelChanged,
      onError,
    }
  }, [onSystemsLoaded, onSystemSelected, onZoomLevelChanged, onError])

  // Create callbacks object with stable refs - ONLY ONCE
  const callbacks = useMemo<MapControllerCallbacks>(() => ({
    onSystemsLoaded: (systems, zone) => {
      if (zone === 'active') {
        setActiveSystems(systems)
      } else {
        setBufferSystems(systems)
      }
      callbackRefs.current.onSystemsLoaded?.(systems, zone)
    },
    onSystemSelected: (system) => {
      setSelectedSystem(system)
      callbackRefs.current.onSystemSelected?.(system)
    },
    onSystemHovered: (system) => {
      setHoveredSystem(system)
    },
    onZoomLevelChanged: (level) => {
      setZoomLevel(level)
      callbackRefs.current.onZoomLevelChanged?.(level)
    },
    onLoadingStateChanged: (state) => {
      setLoadingState(state)
    },
    onConnectionsLoaded: (conns) => {
      setConnections(conns)
    },
    onError: (error) => {
      console.error('[GalaxyNavigation] Error:', error)
      callbackRefs.current.onError?.(error)
    },
  }), []) // Empty deps - callbacks are stable via refs

  // Initialize controller ONCE
  useEffect(() => {
    // Create new controller with callbacks
    controllerRef.current = new GalaxyMapController(callbacks)

    return () => {
      controllerRef.current?.dispose()
      controllerRef.current = null
    }
  }, []) // Empty deps - controller is singleton

  // Initialize on mount if autoInit
  useEffect(() => {
    if (autoInit && userId && controllerRef.current && !isInitialized) {
      controllerRef.current.initialize(userId, galaxyIndex).then(() => {
        setIsInitialized(true)
      })
    }
  }, [autoInit, userId, galaxyIndex, isInitialized])

  // Handle galaxy change
  useEffect(() => {
    if (isInitialized && controllerRef.current) {
      controllerRef.current.changeGalaxy(galaxyIndex)
    }
  }, [galaxyIndex, isInitialized])

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const initialize = useCallback(async () => {
    if (controllerRef.current && userId) {
      await controllerRef.current.initialize(userId, galaxyIndex)
      setIsInitialized(true)
    }
  }, [userId, galaxyIndex])

  const updateCamera = useCallback((
    position: { x: number; y: number; z: number },
    target: { x: number; y: number; z: number },
    zoom: number
  ) => {
    if (controllerRef.current) {
      controllerRef.current.updateCamera(position, target, zoom)
      setCameraState({
        position,
        target,
        zoom,
        zoomLevel: controllerRef.current.getZoomLevel(),
      })
    }
  }, [])

  const selectSystem = useCallback(async (systemId: string | null) => {
    if (controllerRef.current) {
      await controllerRef.current.selectSystem(systemId)
    }
  }, [])

  const hoverSystem = useCallback((systemId: string | null) => {
    if (controllerRef.current) {
      controllerRef.current.hoverSystem(systemId)
    }
  }, [])

  const navigateToSystem = useCallback(async (systemIndex: number) => {
    if (controllerRef.current) {
      await controllerRef.current.navigateToSystem(systemIndex)
    }
  }, [])

  const changeGalaxy = useCallback(async (newGalaxyIndex: number) => {
    if (controllerRef.current) {
      await controllerRef.current.changeGalaxy(newGalaxyIndex)
    }
  }, [])

  const refresh = useCallback(async () => {
    if (controllerRef.current && userId) {
      await controllerRef.current.initialize(userId, galaxyIndex)
    }
  }, [userId, galaxyIndex])

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const getSystemById = useCallback((id: string): SystemSummary | undefined => {
    return activeSystems.find(s => s.id === id) ||
           bufferSystems.find(s => s.id === id)
  }, [activeSystems, bufferSystems])

  const getSystemByIndex = useCallback((index: number): SystemSummary | undefined => {
    return activeSystems.find(s => s.systemIndex === index) ||
           bufferSystems.find(s => s.systemIndex === index)
  }, [activeSystems, bufferSystems])

  const isSystemInActiveZone = useCallback((id: string): boolean => {
    return activeSystems.some(s => s.id === id)
  }, [activeSystems])

  const isSystemExplored = useCallback((id: string): boolean => {
    const system = getSystemById(id)
    return system?.isExplored ?? false
  }, [getSystemById])

  // Combine all systems
  const systems = useMemo(() => {
    return [...activeSystems, ...bufferSystems]
  }, [activeSystems, bufferSystems])

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    systems,
    activeSystems,
    bufferSystems,
    connections,
    selectedSystem,
    hoveredSystem,
    zoomLevel,
    cameraState,
    loadingState,
    isLoading: loadingState.isLoading,
    isInitialized,

    // Actions
    initialize,
    updateCamera,
    selectSystem,
    hoverSystem,
    navigateToSystem,
    changeGalaxy,
    refresh,

    // Utilities
    getSystemById,
    getSystemByIndex,
    isSystemInActiveZone,
    isSystemExplored,
  }
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Hook to throttle camera updates for performance
 */
export function useThrottledCameraUpdate(
  updateCamera: UseGalaxyNavigationReturn['updateCamera'],
  throttleMs: number = 16 // ~60fps
) {
  const lastUpdateRef = useRef<number>(0)
  const pendingUpdateRef = useRef<{
    position: { x: number; y: number; z: number }
    target: { x: number; y: number; z: number }
    zoom: number
  } | null>(null)
  const rafIdRef = useRef<number | null>(null)

  const throttledUpdate = useCallback((
    position: { x: number; y: number; z: number },
    target: { x: number; y: number; z: number },
    zoom: number
  ) => {
    const now = performance.now()

    if (now - lastUpdateRef.current >= throttleMs) {
      // Enough time has passed, update immediately
      updateCamera(position, target, zoom)
      lastUpdateRef.current = now
      pendingUpdateRef.current = null
    } else {
      // Store pending update
      pendingUpdateRef.current = { position, target, zoom }

      // Schedule update if not already scheduled
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (pendingUpdateRef.current) {
            const { position: p, target: t, zoom: z } = pendingUpdateRef.current
            updateCamera(p, t, z)
            lastUpdateRef.current = performance.now()
            pendingUpdateRef.current = null
          }
          rafIdRef.current = null
        })
      }
    }
  }, [updateCamera, throttleMs])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  return throttledUpdate
}

/**
 * Hook to detect zoom level changes
 */
export function useZoomLevelTransition(
  currentLevel: ZoomLevel,
  onTransition?: (from: ZoomLevel, to: ZoomLevel) => void
) {
  const previousLevelRef = useRef<ZoomLevel>(currentLevel)

  useEffect(() => {
    if (previousLevelRef.current !== currentLevel) {
      onTransition?.(previousLevelRef.current, currentLevel)
      previousLevelRef.current = currentLevel
    }
  }, [currentLevel, onTransition])

  return {
    previousLevel: previousLevelRef.current,
    isZoomingIn: getZoomLevelOrder(currentLevel) > getZoomLevelOrder(previousLevelRef.current),
    isZoomingOut: getZoomLevelOrder(currentLevel) < getZoomLevelOrder(previousLevelRef.current),
  }
}

function getZoomLevelOrder(level: ZoomLevel): number {
  const order: Record<ZoomLevel, number> = {
    galaxy: 0,
    sector: 1,
    system: 2,
    body: 3,
  }
  return order[level]
}

export default useGalaxyNavigation
