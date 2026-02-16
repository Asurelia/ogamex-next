'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { SystemDetails, ZoomLevel } from '@/lib/galaxy/GalaxyMapController'

// ============================================================================
// DEEP LINKING HOOK
// ============================================================================

interface DeepLinkState {
  galaxy: number
  system: number
  viewMode: ViewMode
  camX?: number
  camY?: number
  camZ?: number
  zoom?: ZoomLevel
}

/**
 * Custom hook for URL-based state synchronization (deep linking)
 * Allows F5 to restore exact map position
 */
function useDeepLink(initialState: DeepLinkState) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const isInitialized = useRef(false)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Parse initial state from URL params
  const getStateFromUrl = useCallback((): Partial<DeepLinkState> => {
    const params: Partial<DeepLinkState> = {}

    const g = searchParams.get('g')
    if (g) params.galaxy = Math.max(1, Math.min(9, parseInt(g) || 1))

    const s = searchParams.get('s')
    if (s) params.system = Math.max(1, Math.min(499, parseInt(s) || 1))

    const v = searchParams.get('v')
    if (v === '2d' || v === '3d') params.viewMode = v

    const cx = searchParams.get('cx')
    if (cx) params.camX = parseFloat(cx)

    const cy = searchParams.get('cy')
    if (cy) params.camY = parseFloat(cy)

    const cz = searchParams.get('cz')
    if (cz) params.camZ = parseFloat(cz)

    const z = searchParams.get('z')
    if (z && ['galaxy', 'sector', 'system', 'body'].includes(z)) {
      params.zoom = z as ZoomLevel
    }

    return params
  }, [searchParams])

  // Update URL without page reload (debounced for camera updates)
  const updateUrl = useCallback((state: Partial<DeepLinkState>, immediate = false) => {
    // Clear pending update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    const update = () => {
      const params = new URLSearchParams()

      if (state.galaxy !== undefined) params.set('g', state.galaxy.toString())
      if (state.system !== undefined) params.set('s', state.system.toString())
      if (state.viewMode) params.set('v', state.viewMode)

      // Only include camera params in 3D mode
      if (state.viewMode === '3d') {
        if (state.camX !== undefined) params.set('cx', state.camX.toFixed(1))
        if (state.camY !== undefined) params.set('cy', state.camY.toFixed(1))
        if (state.camZ !== undefined) params.set('cz', state.camZ.toFixed(1))
        if (state.zoom) params.set('z', state.zoom)
      }

      const newUrl = `${pathname}?${params.toString()}`
      // Use replaceState to avoid history spam
      window.history.replaceState(null, '', newUrl)
    }

    if (immediate) {
      update()
    } else {
      // Debounce camera updates (500ms)
      updateTimeoutRef.current = setTimeout(update, 500)
    }
  }, [pathname])

  // Cleanup
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  return {
    getStateFromUrl,
    updateUrl,
    isInitialized,
  }
}

// Lazy load 3D component to avoid SSR issues
const GalaxyMap3D = dynamic(
  () => import('@/components/game/3d/GalaxyMap3D').then((mod) => mod.GalaxyMap3D),
  {
    ssr: false,
    loading: () => <Galaxy3DLoading />
  }
)

// Loading placeholder for 3D view
function Galaxy3DLoading() {
  return (
    <div className="w-full h-[600px] bg-gray-900/50 rounded-lg flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-cyan-400 font-mono text-sm">INITIALIZING 3D VIEW...</p>
      </div>
    </div>
  )
}

// WebGL detection
function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    return !!gl
  } catch {
    return false
  }
}

interface GalaxyPosition {
  position: number
  planet_id: string | null
  planet_name: string | null
  planet_type: string | null
  user_id: string | null
  username: string | null
  alliance_tag: string | null
  has_moon: boolean
  debris_metal: number
  debris_crystal: number
}

type ViewMode = '2d' | '3d'

export default function GalaxyPage() {
  const { currentPlanet, user } = useGameStore()
  const [galaxy, setGalaxy] = useState(currentPlanet?.galaxy || 1)
  const [system, setSystem] = useState(currentPlanet?.system || 1)
  const [positions, setPositions] = useState<GalaxyPosition[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('2d')
  const [webglSupported, setWebglSupported] = useState(true)
  const [cameraState, setCameraState] = useState<{ x: number; y: number; z: number } | null>(null)
  const [currentZoom, setCurrentZoom] = useState<ZoomLevel>('galaxy')
  const abortControllerRef = useRef<AbortController | null>(null)

  const t = useTranslations('galaxy')
  const tCommon = useTranslations('common')

  // Deep linking hook
  const { getStateFromUrl, updateUrl, isInitialized } = useDeepLink({
    galaxy,
    system,
    viewMode,
  })

  // Initialize state from URL on mount
  useEffect(() => {
    if (!isInitialized.current) {
      const urlState = getStateFromUrl()

      if (urlState.galaxy !== undefined) setGalaxy(urlState.galaxy)
      if (urlState.system !== undefined) setSystem(urlState.system)
      if (urlState.viewMode) setViewMode(urlState.viewMode)
      if (urlState.camX !== undefined && urlState.camY !== undefined && urlState.camZ !== undefined) {
        setCameraState({ x: urlState.camX, y: urlState.camY, z: urlState.camZ })
      }
      if (urlState.zoom) setCurrentZoom(urlState.zoom)

      isInitialized.current = true
    }
  }, [getStateFromUrl, isInitialized])

  // Sync state to URL when it changes
  useEffect(() => {
    if (isInitialized.current) {
      updateUrl({
        galaxy,
        system,
        viewMode,
        camX: cameraState?.x,
        camY: cameraState?.y,
        camZ: cameraState?.z,
        zoom: currentZoom,
      }, viewMode === '2d') // Immediate for 2D, debounced for 3D camera
    }
  }, [galaxy, system, viewMode, cameraState, currentZoom, updateUrl])

  // Check WebGL support on mount
  useEffect(() => {
    setWebglSupported(checkWebGLSupport())
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // Load galaxy view with abort support
  const loadGalaxyView = useCallback(async () => {
    // Abort previous request
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()

      // Get planets in this system
      const { data: planets, error: planetsError } = await supabase
        .from('planets_compat')
        .select(`
          id,
          name,
          position,
          planet_type,
          user_id,
          users!inner(username, alliances(tag))
        `)
        .eq('galaxy', galaxy)
        .eq('system', system)
        .eq('destroyed', false)

      if (planetsError) throw planetsError

      // Get debris fields
      const { data: debris, error: debrisError } = await supabase
        .from('debris_fields')
        .select('position, metal, crystal')
        .eq('galaxy', galaxy)
        .eq('system', system)

      if (debrisError) throw debrisError

      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) return

      // Build position array (1-15)
      const positionData: GalaxyPosition[] = []
      for (let pos = 1; pos <= 15; pos++) {
        const planet = planets?.find((p) => p.position === pos)
        const debrisField = debris?.find((d) => d.position === pos)

        positionData.push({
          position: pos,
          planet_id: planet?.id || null,
          planet_name: planet?.name || null,
          planet_type: planet?.planet_type || null,
          user_id: planet?.user_id || null,
          username: (planet?.users as { username?: string })?.username || null,
          alliance_tag: (planet?.users as { alliances?: { tag?: string } })?.alliances?.tag || null,
          has_moon: false, // TODO: Check for moons
          debris_metal: debrisField?.metal || 0,
          debris_crystal: debrisField?.crystal || 0,
        })
      }

      setPositions(positionData)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to load galaxy view:', err)
        setError(t('loadError') || 'Failed to load galaxy view')
      }
    } finally {
      setLoading(false)
    }
  }, [galaxy, system, t])

  // Load on mount and when galaxy/system changes (only in 2D mode)
  useEffect(() => {
    if (viewMode === '2d') {
      loadGalaxyView()
    }
  }, [galaxy, system, viewMode, loadGalaxyView])

  const navigateSystem = (delta: number) => {
    let newSystem = system + delta
    let newGalaxy = galaxy

    if (newSystem < 1) {
      newSystem = 499
      newGalaxy = galaxy - 1
      if (newGalaxy < 1) newGalaxy = 9
    } else if (newSystem > 499) {
      newSystem = 1
      newGalaxy = galaxy + 1
      if (newGalaxy > 9) newGalaxy = 1
    }

    setSystem(newSystem)
    setGalaxy(newGalaxy)
  }

  // Handle 3D system selection
  const handleSystemSelect = useCallback((systemDetails: SystemDetails) => {
    // Navigate to selected system in 2D view
    if (systemDetails.systemIndex) {
      setSystem(systemDetails.systemIndex)
    }
  }, [])

  // Toggle view mode
  const toggleViewMode = () => {
    if (!webglSupported && viewMode === '2d') {
      // Show warning but don't switch
      setError(t('webglNotSupported') || 'WebGL is not supported in your browser. 3D view is unavailable.')
      return
    }
    setViewMode(viewMode === '2d' ? '3d' : '2d')
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* Page header with view toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ogame-text-header">{t('title')}</h1>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <span className="text-ogame-text-muted text-sm">{t('viewMode') || 'View'}:</span>
          <div className="flex rounded-lg overflow-hidden border border-ogame-border">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === '2d'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-ogame-dark text-ogame-text-muted hover:bg-ogame-darker'
              }`}
              aria-pressed={viewMode === '2d'}
            >
              2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              disabled={!webglSupported}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === '3d'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-ogame-dark text-ogame-text-muted hover:bg-ogame-darker'
              } ${!webglSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-pressed={viewMode === '3d'}
              title={!webglSupported ? 'WebGL not supported' : '3D Galaxy Map'}
            >
              3D
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="ogame-panel border-red-500/50 bg-red-900/20">
          <div className="ogame-panel-content flex items-center gap-3">
            <span className="text-red-400 text-xl">!</span>
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
              aria-label="Dismiss error"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Navigation (only in 2D mode) */}
      {viewMode === '2d' && (
        <div className="ogame-panel">
          <div className="ogame-panel-content">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label htmlFor="galaxy-input" className="text-ogame-text-muted">
                  {t('galaxy')}:
                </label>
                <button
                  onClick={() => setGalaxy(Math.max(1, galaxy - 1))}
                  className="ogame-button px-2 py-1"
                  aria-label="Previous galaxy"
                >
                  &lt;
                </button>
                <input
                  id="galaxy-input"
                  type="number"
                  min="1"
                  max="9"
                  value={galaxy}
                  onChange={(e) => setGalaxy(Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))}
                  className="ogame-input w-16 text-center"
                />
                <button
                  onClick={() => setGalaxy(Math.min(9, galaxy + 1))}
                  className="ogame-button px-2 py-1"
                  aria-label="Next galaxy"
                >
                  &gt;
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="system-input" className="text-ogame-text-muted">
                  {t('system')}:
                </label>
                <button
                  onClick={() => navigateSystem(-1)}
                  className="ogame-button px-2 py-1"
                  aria-label="Previous system"
                >
                  &lt;
                </button>
                <input
                  id="system-input"
                  type="number"
                  min="1"
                  max="499"
                  value={system}
                  onChange={(e) => setSystem(Math.max(1, Math.min(499, parseInt(e.target.value) || 1)))}
                  className="ogame-input w-20 text-center"
                />
                <button
                  onClick={() => navigateSystem(1)}
                  className="ogame-button px-2 py-1"
                  aria-label="Next system"
                >
                  &gt;
                </button>
              </div>

              <button
                onClick={loadGalaxyView}
                className="ogame-button-primary"
                disabled={loading}
              >
                {loading ? tCommon('loading') : t('view')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D View */}
      {viewMode === '3d' && user?.id && (
        <div className="ogame-panel">
          <div className="ogame-panel-header flex items-center justify-between">
            <span>{t('galaxyMap3D') || '3D Galaxy Map'}</span>
            <span className="text-sm text-ogame-text-muted font-normal">
              {t('galaxy')} {galaxy}
            </span>
          </div>
          <div className="h-[600px] relative">
            <Suspense fallback={<Galaxy3DLoading />}>
              <GalaxyMap3D
                galaxyIndex={galaxy}
                userId={user.id}
                onSystemSelect={handleSystemSelect}
                onZoomLevelChange={(level) => {
                  setCurrentZoom(level)
                }}
                onCameraChange={(pos) => {
                  setCameraState(pos)
                }}
                initialCameraPosition={cameraState || undefined}
                touchTolerance={2.0} // Extra tolerance for mobile
                className="w-full h-full"
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* 3D View - No user (show login prompt) */}
      {viewMode === '3d' && !user?.id && (
        <div className="ogame-panel">
          <div className="ogame-panel-content">
            <div className="text-center py-12">
              <p className="text-ogame-text-muted">{t('loginRequired') || 'Please log in to view the 3D galaxy map'}</p>
            </div>
          </div>
        </div>
      )}

      {/* 2D Galaxy table */}
      {viewMode === '2d' && (
        <div className="ogame-panel">
          <div className="ogame-panel-header">
            {t('solarSystem')} [{galaxy}:{system}]
          </div>
          <div className="ogame-panel-content p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : positions.length === 0 ? (
              <div className="text-center py-12 text-ogame-text-muted">
                {t('noData') || 'No data available'}
              </div>
            ) : (
              <table className="ogame-table">
                <thead>
                  <tr>
                    <th className="w-12 text-center">{t('pos')}</th>
                    <th>{t('planet')}</th>
                    <th>{t('player')}</th>
                    <th>{t('alliance')}</th>
                    <th className="w-16 text-center">{t('moon')}</th>
                    <th className="w-24 text-center">{t('debris')}</th>
                    <th className="w-24 text-center">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos) => (
                    <tr key={pos.position} className={pos.planet_id ? '' : 'opacity-50'}>
                      <td className="text-center font-mono">{pos.position}</td>
                      <td>
                        {pos.planet_id ? (
                          <span className="text-ogame-text-header">{pos.planet_name}</span>
                        ) : (
                          <span className="text-ogame-text-muted">{t('empty')}</span>
                        )}
                      </td>
                      <td>
                        {pos.username ? (
                          <span className={pos.user_id === currentPlanet?.user_id ? 'text-ogame-positive' : 'ogame-link'}>
                            {pos.username}
                          </span>
                        ) : (
                          <span className="text-ogame-text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {pos.alliance_tag ? (
                          <span className="ogame-badge ogame-badge-info">{pos.alliance_tag}</span>
                        ) : (
                          <span className="text-ogame-text-muted">-</span>
                        )}
                      </td>
                      <td className="text-center">
                        {pos.has_moon ? (
                          <img src="/img/moons/small/1.gif" alt="Moon" className="w-4 h-4 mx-auto" />
                        ) : '-'}
                      </td>
                      <td className="text-center">
                        {(pos.debris_metal > 0 || pos.debris_crystal > 0) ? (
                          <img
                            src="/img/fleet/8.gif"
                            alt="Debris"
                            title={`M: ${pos.debris_metal.toLocaleString()} C: ${pos.debris_crystal.toLocaleString()}`}
                            className="w-4 h-4 mx-auto cursor-help"
                          />
                        ) : '-'}
                      </td>
                      <td className="text-center">
                        {pos.planet_id && pos.user_id !== currentPlanet?.user_id && (
                          <div className="flex justify-center gap-1">
                            <button
                              className="text-xs ogame-button px-2 py-0.5"
                              title={t('spy') || 'Spy'}
                              aria-label={`Spy on ${pos.planet_name}`}
                            >
                              <img src="/img/fleet/6.gif" alt="" className="w-3 h-3 inline" aria-hidden="true" />
                            </button>
                            <button
                              className="text-xs ogame-button px-2 py-0.5"
                              title={t('attack') || 'Attack'}
                              aria-label={`Attack ${pos.planet_name}`}
                            >
                              <img src="/img/fleet/1.gif" alt="" className="w-3 h-3 inline" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
