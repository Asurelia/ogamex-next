/**
 * GalaxyMapController - The Brain
 *
 * Centralized controller for galaxy map navigation with:
 * - Debounced viewport loading (prevents API spam)
 * - Zone-based loading (Active/Buffer/Hidden)
 * - Camera state management
 * - Fog of War integration
 *
 * Inspired by Elite Dangerous galaxy map architecture.
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// TYPES
// ============================================================================

export interface GalaxyCoordinates {
  galaxyIndex: number
  x: number
  y: number
  z: number
}

export interface ViewportBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export interface SystemSummary {
  id: string
  systemIndex: number
  starType: string
  positionX: number
  positionY: number
  positionZ: number
  discoveryLevel: DiscoveryLevel
  isExplored: boolean
  hasColonies: boolean
  connectionCount: number
}

export interface SystemDetails extends SystemSummary {
  starEffects: StarEffects | null
  bodies: CelestialBodySummary[]
  connections: ConnectionSummary[]
}

export interface CelestialBodySummary {
  id: string
  name: string
  bodyType: string
  orbitalPosition: number
  isColonizable: boolean
  hasColony: boolean
  visualType: string
  diameter: number
}

export interface ConnectionSummary {
  targetSystemId: string
  targetSystemIndex: number
  connectionType: 'standard' | 'wormhole' | 'unstable'
  distance: number
  isStable: boolean
}

export interface StarEffects {
  metalMultiplier: number
  crystalMultiplier: number
  deuteriumMultiplier: number
  energyMultiplier: number
}

export type DiscoveryLevel = 'unknown' | 'detected' | 'scanned' | 'explored' | 'mapped'

export type ZoomLevel = 'galaxy' | 'sector' | 'system' | 'body'

export interface CameraState {
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
  zoom: number
  zoomLevel: ZoomLevel
}

export interface LoadingState {
  isLoading: boolean
  loadingZone: 'active' | 'buffer' | null
  progress: number
  lastLoadTime: number
}

export interface MapControllerState {
  galaxyIndex: number
  camera: CameraState
  viewport: ViewportBounds
  loading: LoadingState
  activeSystems: Map<string, SystemSummary>
  bufferSystems: Map<string, SystemSummary>
  selectedSystem: SystemDetails | null
  hoveredSystem: SystemSummary | null
}

export interface MapControllerCallbacks {
  onSystemsLoaded?: (systems: SystemSummary[], zone: 'active' | 'buffer') => void
  onSystemSelected?: (system: SystemDetails | null) => void
  onSystemHovered?: (system: SystemSummary | null) => void
  onZoomLevelChanged?: (level: ZoomLevel) => void
  onLoadingStateChanged?: (state: LoadingState) => void
  onError?: (error: Error) => void
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const MAP_CONFIG = {
  // Debounce delays (ms)
  DEBOUNCE_CAMERA_MOVE: 300,      // Wait 300ms after camera stops moving
  DEBOUNCE_ZOOM: 150,              // Faster response for zoom
  DEBOUNCE_SYSTEM_SELECT: 50,      // Near-instant for selection

  // Zone radii (in game units)
  ACTIVE_ZONE_RADIUS: 50,          // Fully loaded systems
  BUFFER_ZONE_RADIUS: 100,         // Metadata only
  PRELOAD_THRESHOLD: 0.7,          // Start loading buffer when 70% to edge

  // Loading limits
  MAX_ACTIVE_SYSTEMS: 100,         // Max systems in active zone
  MAX_BUFFER_SYSTEMS: 200,         // Max systems in buffer
  BATCH_SIZE: 50,                  // Systems per RPC call

  // Zoom thresholds
  ZOOM_GALAXY_THRESHOLD: 500,      // > 500 units = galaxy view
  ZOOM_SECTOR_THRESHOLD: 100,      // 100-500 = sector view
  ZOOM_SYSTEM_THRESHOLD: 20,       // 20-100 = system view
  ZOOM_BODY_THRESHOLD: 5,          // < 20 = body view

  // Cache
  CACHE_TTL_MS: 60000,             // 1 minute cache
  STALE_WHILE_REVALIDATE: true,
} as const

// ============================================================================
// DEBOUNCE UTILITY
// ============================================================================

type DebouncedFunction<T extends (...args: unknown[]) => unknown> = {
  (...args: Parameters<T>): void
  cancel: () => void
  flush: () => void
}

function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  const debouncedFn = (...args: Parameters<T>) => {
    lastArgs = args

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
      lastArgs = null
    }, delay)
  }

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
      lastArgs = null
    }
  }

  debouncedFn.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId)
      fn(...lastArgs)
      timeoutId = null
      lastArgs = null
    }
  }

  return debouncedFn
}

// ============================================================================
// GALAXY MAP CONTROLLER CLASS
// ============================================================================

export class GalaxyMapController {
  private supabase: SupabaseClient
  private state: MapControllerState
  private callbacks: MapControllerCallbacks
  private userId: string | null = null

  // Debounced methods
  private debouncedLoadViewport: DebouncedFunction<() => Promise<void>>
  private debouncedLoadBuffer: DebouncedFunction<() => Promise<void>>

  // Request tracking
  private pendingRequests: Map<string, AbortController> = new Map()
  private lastViewportHash: string = ''

  constructor(callbacks: MapControllerCallbacks = {}) {
    this.supabase = createClient()
    this.callbacks = callbacks

    // Initialize state
    this.state = {
      galaxyIndex: 1,
      camera: {
        position: { x: 0, y: 100, z: 0 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 200,
        zoomLevel: 'galaxy',
      },
      viewport: {
        minX: -MAP_CONFIG.ACTIVE_ZONE_RADIUS,
        maxX: MAP_CONFIG.ACTIVE_ZONE_RADIUS,
        minY: -MAP_CONFIG.ACTIVE_ZONE_RADIUS,
        maxY: MAP_CONFIG.ACTIVE_ZONE_RADIUS,
        minZ: -MAP_CONFIG.ACTIVE_ZONE_RADIUS,
        maxZ: MAP_CONFIG.ACTIVE_ZONE_RADIUS,
      },
      loading: {
        isLoading: false,
        loadingZone: null,
        progress: 0,
        lastLoadTime: 0,
      },
      activeSystems: new Map(),
      bufferSystems: new Map(),
      selectedSystem: null,
      hoveredSystem: null,
    }

    // Create debounced loaders
    this.debouncedLoadViewport = debounce(
      () => this.loadActiveZone(),
      MAP_CONFIG.DEBOUNCE_CAMERA_MOVE
    )

    this.debouncedLoadBuffer = debounce(
      () => this.loadBufferZone(),
      MAP_CONFIG.DEBOUNCE_CAMERA_MOVE * 2
    )
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize controller with user context
   */
  async initialize(userId: string, galaxyIndex: number = 1): Promise<void> {
    this.userId = userId
    this.state.galaxyIndex = galaxyIndex

    // Load initial viewport
    await this.loadActiveZone()
    this.loadBufferZone() // Non-blocking
  }

  /**
   * Dispose controller and cancel pending requests
   */
  dispose(): void {
    this.debouncedLoadViewport.cancel()
    this.debouncedLoadBuffer.cancel()

    // Cancel all pending requests
    this.pendingRequests.forEach(controller => controller.abort())
    this.pendingRequests.clear()

    // Clear caches
    this.state.activeSystems.clear()
    this.state.bufferSystems.clear()
  }

  // ============================================================================
  // CAMERA CONTROL
  // ============================================================================

  /**
   * Update camera position (called by 3D component)
   * This is the main entry point for camera movement
   */
  updateCamera(
    position: { x: number; y: number; z: number },
    target: { x: number; y: number; z: number },
    zoom: number
  ): void {
    const previousZoomLevel = this.state.camera.zoomLevel

    // Update camera state
    this.state.camera.position = position
    this.state.camera.target = target
    this.state.camera.zoom = zoom
    this.state.camera.zoomLevel = this.calculateZoomLevel(zoom)

    // Update viewport bounds based on camera
    this.updateViewportBounds()

    // Check if viewport changed significantly
    const viewportHash = this.getViewportHash()
    if (viewportHash !== this.lastViewportHash) {
      this.lastViewportHash = viewportHash

      // Trigger debounced load
      this.debouncedLoadViewport()

      // Also trigger buffer load if approaching edge
      if (this.isNearViewportEdge()) {
        this.debouncedLoadBuffer()
      }
    }

    // Notify zoom level change
    if (this.state.camera.zoomLevel !== previousZoomLevel) {
      this.callbacks.onZoomLevelChanged?.(this.state.camera.zoomLevel)
    }
  }

  /**
   * Calculate zoom level from camera distance
   */
  private calculateZoomLevel(zoom: number): ZoomLevel {
    if (zoom > MAP_CONFIG.ZOOM_GALAXY_THRESHOLD) return 'galaxy'
    if (zoom > MAP_CONFIG.ZOOM_SECTOR_THRESHOLD) return 'sector'
    if (zoom > MAP_CONFIG.ZOOM_SYSTEM_THRESHOLD) return 'system'
    return 'body'
  }

  /**
   * Update viewport bounds based on camera
   */
  private updateViewportBounds(): void {
    const { target } = this.state.camera
    const radius = MAP_CONFIG.ACTIVE_ZONE_RADIUS

    this.state.viewport = {
      minX: target.x - radius,
      maxX: target.x + radius,
      minY: target.y - radius,
      maxY: target.y + radius,
      minZ: target.z - radius,
      maxZ: target.z + radius,
    }
  }

  /**
   * Generate hash for viewport comparison
   */
  private getViewportHash(): string {
    const { minX, maxX, minY, maxY } = this.state.viewport
    // Round to reduce sensitivity
    return `${Math.round(minX/10)}_${Math.round(maxX/10)}_${Math.round(minY/10)}_${Math.round(maxY/10)}`
  }

  /**
   * Check if camera is near viewport edge (triggers buffer load)
   */
  private isNearViewportEdge(): boolean {
    const { target } = this.state.camera
    const { minX, maxX, minY, maxY } = this.state.viewport
    const threshold = MAP_CONFIG.ACTIVE_ZONE_RADIUS * MAP_CONFIG.PRELOAD_THRESHOLD

    return (
      target.x - minX < threshold ||
      maxX - target.x < threshold ||
      target.y - minY < threshold ||
      maxY - target.y < threshold
    )
  }

  // ============================================================================
  // ZONE LOADING
  // ============================================================================

  /**
   * Load systems in active zone (debounced)
   */
  private async loadActiveZone(): Promise<void> {
    if (!this.userId) return

    const requestId = `active_${Date.now()}`

    try {
      // Cancel any pending active zone request
      this.cancelRequest('active')

      // Create abort controller
      const abortController = new AbortController()
      this.pendingRequests.set('active', abortController)

      // Update loading state
      this.setLoadingState(true, 'active', 0)

      const { target } = this.state.camera

      // Call RPC function
      const { data, error } = await this.supabase.rpc('get_systems_in_viewport', {
        p_galaxy_id: await this.getGalaxyId(),
        p_center_x: target.x,
        p_center_y: target.y,
        p_radius: MAP_CONFIG.ACTIVE_ZONE_RADIUS,
        p_limit: MAP_CONFIG.MAX_ACTIVE_SYSTEMS,
      })

      // Check if aborted
      if (abortController.signal.aborted) return

      if (error) throw error

      // Transform and cache results
      const systems = this.transformSystems(data || [])

      // Clear old active systems
      this.state.activeSystems.clear()

      // Add new systems
      systems.forEach(system => {
        this.state.activeSystems.set(system.id, system)
        // Remove from buffer if present
        this.state.bufferSystems.delete(system.id)
      })

      // Update loading state
      this.setLoadingState(false, null, 100)

      // Notify callback
      this.callbacks.onSystemsLoaded?.(systems, 'active')

    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        this.callbacks.onError?.(error as Error)
        this.setLoadingState(false, null, 0)
      }
    } finally {
      this.pendingRequests.delete('active')
    }
  }

  /**
   * Load systems in buffer zone (debounced, lower priority)
   */
  private async loadBufferZone(): Promise<void> {
    if (!this.userId) return

    try {
      // Cancel any pending buffer request
      this.cancelRequest('buffer')

      const abortController = new AbortController()
      this.pendingRequests.set('buffer', abortController)

      this.setLoadingState(true, 'buffer', 0)

      const { target } = this.state.camera

      const { data, error } = await this.supabase.rpc('get_systems_in_viewport', {
        p_galaxy_id: await this.getGalaxyId(),
        p_center_x: target.x,
        p_center_y: target.y,
        p_radius: MAP_CONFIG.BUFFER_ZONE_RADIUS,
        p_limit: MAP_CONFIG.MAX_BUFFER_SYSTEMS,
      })

      if (abortController.signal.aborted) return
      if (error) throw error

      const systems = this.transformSystems(data || [])

      // Only add systems not in active zone
      systems.forEach(system => {
        if (!this.state.activeSystems.has(system.id)) {
          this.state.bufferSystems.set(system.id, system)
        }
      })

      // Evict old buffer systems if over limit
      this.evictBufferSystems()

      this.setLoadingState(false, null, 100)
      this.callbacks.onSystemsLoaded?.(systems, 'buffer')

    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        this.callbacks.onError?.(error as Error)
      }
    } finally {
      this.pendingRequests.delete('buffer')
    }
  }

  /**
   * Cancel a pending request
   */
  private cancelRequest(type: string): void {
    const controller = this.pendingRequests.get(type)
    if (controller) {
      controller.abort()
      this.pendingRequests.delete(type)
    }
  }

  /**
   * Evict oldest buffer systems when over limit
   */
  private evictBufferSystems(): void {
    const maxBuffer = MAP_CONFIG.MAX_BUFFER_SYSTEMS - MAP_CONFIG.MAX_ACTIVE_SYSTEMS

    if (this.state.bufferSystems.size > maxBuffer) {
      const toEvict = this.state.bufferSystems.size - maxBuffer
      const keys = Array.from(this.state.bufferSystems.keys())

      for (let i = 0; i < toEvict; i++) {
        this.state.bufferSystems.delete(keys[i])
      }
    }
  }

  // ============================================================================
  // SYSTEM SELECTION
  // ============================================================================

  /**
   * Select a system (shows details)
   */
  async selectSystem(systemId: string | null): Promise<void> {
    if (!systemId) {
      this.state.selectedSystem = null
      this.callbacks.onSystemSelected?.(null)
      return
    }

    try {
      // Check if in cache first
      const cached = this.state.activeSystems.get(systemId) ||
                     this.state.bufferSystems.get(systemId)

      if (cached && this.state.selectedSystem?.id === systemId) {
        return // Already selected
      }

      // Load full details
      const details = await this.loadSystemDetails(systemId)
      this.state.selectedSystem = details

      this.callbacks.onSystemSelected?.(details)

    } catch (error) {
      this.callbacks.onError?.(error as Error)
    }
  }

  /**
   * Load full system details (bodies, connections, effects)
   */
  private async loadSystemDetails(systemId: string): Promise<SystemDetails> {
    // Get basic info from cache
    const cached = this.state.activeSystems.get(systemId) ||
                   this.state.bufferSystems.get(systemId)

    // Load bodies
    const { data: bodiesData } = await this.supabase
      .from('celestial_bodies')
      .select('*')
      .eq('solar_system_id', systemId)
      .order('orbital_position')

    // Load connections
    const { data: connectionsData } = await this.supabase.rpc(
      'get_connected_systems_batch',
      { p_system_id: systemId, p_user_id: this.userId }
    )

    // Load star effects
    const { data: effectsData } = await this.supabase
      .from('star_effects')
      .select('*')
      .eq('solar_system_id', systemId)
      .single()

    const bodies: CelestialBodySummary[] = (bodiesData || []).map(b => ({
      id: b.id,
      name: b.name || `Position ${b.orbital_position}`,
      bodyType: b.body_type,
      orbitalPosition: b.orbital_position,
      isColonizable: b.is_colonizable,
      hasColony: !!b.colonized_at,
      visualType: b.visual_type || 'rocky',
      diameter: b.diameter || 10000,
    }))

    const connections: ConnectionSummary[] = (connectionsData || []).map((c: Record<string, unknown>) => ({
      targetSystemId: c.connected_system_id as string,
      targetSystemIndex: c.connected_system_index as number,
      connectionType: (c.connection_type as string) || 'standard',
      distance: c.distance as number || 0,
      isStable: c.is_stable as boolean ?? true,
    }))

    return {
      ...(cached || {
        id: systemId,
        systemIndex: 0,
        starType: 'unknown',
        positionX: 0,
        positionY: 0,
        positionZ: 0,
        discoveryLevel: 'unknown' as DiscoveryLevel,
        isExplored: false,
        hasColonies: false,
        connectionCount: 0,
      }),
      starEffects: effectsData ? {
        metalMultiplier: effectsData.metal_multiplier,
        crystalMultiplier: effectsData.crystal_multiplier,
        deuteriumMultiplier: effectsData.deuterium_multiplier,
        energyMultiplier: effectsData.energy_multiplier,
      } : null,
      bodies,
      connections,
    }
  }

  /**
   * Hover over a system
   */
  hoverSystem(systemId: string | null): void {
    if (!systemId) {
      this.state.hoveredSystem = null
      this.callbacks.onSystemHovered?.(null)
      return
    }

    const system = this.state.activeSystems.get(systemId) ||
                   this.state.bufferSystems.get(systemId) ||
                   null

    this.state.hoveredSystem = system
    this.callbacks.onSystemHovered?.(system)
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  /**
   * Navigate to a specific system
   */
  async navigateToSystem(systemIndex: number): Promise<void> {
    // Find system in cache or load
    let system: SystemSummary | null = null

    for (const s of this.state.activeSystems.values()) {
      if (s.systemIndex === systemIndex) {
        system = s
        break
      }
    }

    if (!system) {
      // Load the system
      const { data } = await this.supabase
        .from('solar_systems')
        .select('id, system_index, star_type, position_x, position_y, position_z')
        .eq('galaxy_id', await this.getGalaxyId())
        .eq('system_index', systemIndex)
        .single()

      if (data) {
        system = this.transformSystem(data)
      }
    }

    if (system) {
      // Move camera to system
      this.updateCamera(
        { x: system.positionX, y: 50, z: system.positionZ + 30 },
        { x: system.positionX, y: 0, z: system.positionZ },
        MAP_CONFIG.ZOOM_SYSTEM_THRESHOLD - 10 // Zoom into system view
      )

      // Select the system
      await this.selectSystem(system.id)
    }
  }

  /**
   * Change galaxy
   */
  async changeGalaxy(galaxyIndex: number): Promise<void> {
    if (galaxyIndex === this.state.galaxyIndex) return

    // Clear all caches
    this.state.activeSystems.clear()
    this.state.bufferSystems.clear()
    this.state.selectedSystem = null

    // Update state
    this.state.galaxyIndex = galaxyIndex

    // Reset camera to center
    this.updateCamera(
      { x: 0, y: 100, z: 0 },
      { x: 0, y: 0, z: 0 },
      200
    )

    // Force immediate load
    this.debouncedLoadViewport.cancel()
    await this.loadActiveZone()
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Get galaxy UUID from index
   */
  private async getGalaxyId(): Promise<string> {
    const { data } = await this.supabase
      .from('galaxies')
      .select('id')
      .eq('galaxy_index', this.state.galaxyIndex)
      .single()

    return data?.id || ''
  }

  /**
   * Transform RPC result to SystemSummary
   */
  private transformSystems(data: Record<string, unknown>[]): SystemSummary[] {
    return data.map(d => this.transformSystem(d))
  }

  private transformSystem(d: Record<string, unknown>): SystemSummary {
    return {
      id: d.id as string,
      systemIndex: d.system_index as number,
      starType: d.star_type as string || 'yellow_dwarf',
      positionX: d.position_x as number || 0,
      positionY: d.position_y as number || 0,
      positionZ: d.position_z as number || 0,
      discoveryLevel: (d.discovery_level as DiscoveryLevel) || 'unknown',
      isExplored: ['explored', 'mapped'].includes(d.discovery_level as string || ''),
      hasColonies: false, // Would need additional query
      connectionCount: d.connection_count as number || 0,
    }
  }

  /**
   * Update loading state and notify
   */
  private setLoadingState(
    isLoading: boolean,
    zone: 'active' | 'buffer' | null,
    progress: number
  ): void {
    this.state.loading = {
      isLoading,
      loadingZone: zone,
      progress,
      lastLoadTime: isLoading ? this.state.loading.lastLoadTime : Date.now(),
    }

    this.callbacks.onLoadingStateChanged?.(this.state.loading)
  }

  // ============================================================================
  // PUBLIC GETTERS
  // ============================================================================

  getState(): Readonly<MapControllerState> {
    return this.state
  }

  getActiveSystems(): SystemSummary[] {
    return Array.from(this.state.activeSystems.values())
  }

  getBufferSystems(): SystemSummary[] {
    return Array.from(this.state.bufferSystems.values())
  }

  getAllVisibleSystems(): SystemSummary[] {
    return [
      ...this.getActiveSystems(),
      ...this.getBufferSystems(),
    ]
  }

  getSelectedSystem(): SystemDetails | null {
    return this.state.selectedSystem
  }

  getCameraState(): Readonly<CameraState> {
    return this.state.camera
  }

  getZoomLevel(): ZoomLevel {
    return this.state.camera.zoomLevel
  }

  isLoading(): boolean {
    return this.state.loading.isLoading
  }
}

// ============================================================================
// SINGLETON INSTANCE (optional)
// ============================================================================

let controllerInstance: GalaxyMapController | null = null

export function getGalaxyMapController(
  callbacks?: MapControllerCallbacks
): GalaxyMapController {
  if (!controllerInstance) {
    controllerInstance = new GalaxyMapController(callbacks)
  }
  return controllerInstance
}

export function disposeGalaxyMapController(): void {
  if (controllerInstance) {
    controllerInstance.dispose()
    controllerInstance = null
  }
}
