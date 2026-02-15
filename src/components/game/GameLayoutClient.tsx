'use client'

import { memo, useMemo, useCallback, useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useGameStore } from '@/stores/gameStore'
import { ResourceBar } from '@/components/game/ResourceBar'
import { PageTransition } from '@/components/game/PageTransition'
import type { PlanetType as VisualPlanetType } from '@/lib/3d/constants'
import type { Planet as DBPlanet } from '@/types/database'
import type { SceneType } from '@/components/game/3d/GameScene3DManager'

// ============================================================================
// DYNAMIC IMPORTS (SSR disabled for 3D components)
// ============================================================================

const Navigation3D = dynamic(
  () => import('@/components/game/Navigation3D').then(mod => mod.Navigation3D),
  { ssr: false }
)

const PlanetSidebar = dynamic(
  () => import('@/components/game/PlanetSidebar').then(mod => mod.PlanetSidebar),
  { ssr: false }
)

const GameSidebar = dynamic(
  () => import('@/components/game/GameSidebar').then(mod => mod.GameSidebar),
  { ssr: false }
)

const GameScene3DManager = dynamic(
  () => import('@/components/game/3d/GameScene3DManager').then(mod => mod.GameScene3DManager),
  { ssr: false }
)

const CockpitSidebar = dynamic(
  () => import('@/components/game/CockpitSidebar').then(mod => mod.CockpitSidebar),
  { ssr: false }
)

const CockpitFrame = dynamic(
  () => import('@/components/game/CockpitFrame').then(mod => mod.CockpitFrame),
  { ssr: false }
)

const DevOverlay = dynamic(
  () => import('@/components/dev/DevOverlay').then(mod => mod.DevOverlay),
  { ssr: false }
)

// ============================================================================
// TYPES
// ============================================================================

interface GameLayoutClientProps {
  children: React.ReactNode
}

// Planet type for the 3D sidebar
interface SidebarPlanet {
  id: string
  name: string
  coordinates: {
    galaxy: number
    system: number
    position: number
  }
  resources: {
    metal: number
    crystal: number
    deuterium: number
  }
  type: VisualPlanetType
  variant?: number
}

// Alert type for CockpitFrame
interface CockpitAlert {
  type: 'warning' | 'danger' | 'info' | 'success'
  message: string
}

// Construction type for CockpitFrame
interface CockpitConstruction {
  name: string
  progress: number
  endsAt: Date
}

// Radar point type for CockpitFrame
interface RadarPoint {
  x: number
  y: number
  type: 'friendly' | 'hostile' | 'neutral'
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a visual planet type based on position
 * This creates a consistent visual type based on the planet's coordinates
 */
function getVisualPlanetType(galaxy: number, system: number, position: number): VisualPlanetType {
  // Use position and coordinates to generate a consistent type
  // Position 1-3: closer to sun - desert/dry
  // Position 4-6: habitable zone - normal/jungle/water
  // Position 7-9: cold zone - ice
  // Position 10-15: outer - gas/ice

  if (position <= 3) {
    return position === 1 ? 'desert' : position === 2 ? 'dry' : 'desert'
  } else if (position <= 6) {
    const types: VisualPlanetType[] = ['normal', 'jungle', 'water']
    return types[(galaxy + system + position) % 3]
  } else if (position <= 9) {
    return position === 9 ? 'ice' : 'normal'
  } else {
    return position % 2 === 0 ? 'gas' : 'ice'
  }
}

/**
 * Convert database planets to sidebar format
 */
function convertPlanetsForSidebar(planets: DBPlanet[]): SidebarPlanet[] {
  return planets.map(planet => ({
    id: planet.id,
    name: planet.name,
    coordinates: {
      galaxy: planet.galaxy,
      system: planet.system,
      position: planet.position,
    },
    resources: {
      metal: planet.metal ?? 0,
      crystal: planet.crystal ?? 0,
      deuterium: planet.deuterium ?? 0,
    },
    type: getVisualPlanetType(planet.galaxy, planet.system, planet.position),
    variant: ((planet.position - 1) % 10) + 1,
  }))
}

// ============================================================================
// SIDEBAR CONTROLLER (Legacy - for non-3D mode)
// ============================================================================

const SidebarController = memo(function SidebarController() {
  const { planets, currentPlanet, selectPlanet, isSidebarOpen } = useGameStore()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Convert planets to sidebar format
  const sidebarPlanets = useMemo(
    () => convertPlanetsForSidebar(planets),
    [planets]
  )

  const handlePlanetSelect = useCallback((planetId: string) => {
    selectPlanet(planetId)
  }, [selectPlanet])

  // Toggle sidebar collapse on screen resize
  useEffect(() => {
    const handleResize = () => {
      setIsCollapsed(window.innerWidth < 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!isSidebarOpen) return null

  return (
    <PlanetSidebar
      planets={sidebarPlanets}
      selectedPlanetId={currentPlanet?.id || null}
      onPlanetSelect={handlePlanetSelect}
      collapsed={isCollapsed}
    />
  )
})

// ============================================================================
// 3D SIDEBAR CONTROLLER (New - for 3D mode)
// ============================================================================

interface GameSidebarControllerProps {
  currentScene: SceneType
  onSceneChange: (scene: SceneType) => void
}

const GameSidebarController = memo(function GameSidebarController({
  currentScene,
  onSceneChange,
}: GameSidebarControllerProps) {
  const { selectPlanet, isSidebarOpen } = useGameStore()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handlePlanetSelect = useCallback((planetId: string) => {
    selectPlanet(planetId)
    // When selecting a planet, go to orbital view
    onSceneChange('orbital')
  }, [selectPlanet, onSceneChange])

  // Toggle sidebar collapse on screen resize
  useEffect(() => {
    const handleResize = () => {
      setIsCollapsed(window.innerWidth < 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!isSidebarOpen) return null

  return (
    <GameSidebar
      currentScene={currentScene}
      onSceneChange={onSceneChange}
      onPlanetSelect={handlePlanetSelect}
      collapsed={isCollapsed}
    />
  )
})

// ============================================================================
// NAVIGATION CONTROLLER
// ============================================================================

const NavigationController = memo(function NavigationController() {
  const [isNavigating, setIsNavigating] = useState(false)
  const pathname = usePathname()

  // Track navigation state for transition effects
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  const handleNavigate = useCallback((href: string) => {
    if (href !== pathname) {
      setIsNavigating(true)
    }
  }, [pathname])

  return <Navigation3D onNavigate={handleNavigate} />
})

// ============================================================================
// BACKGROUND STARFIELD
// ============================================================================

const BackgroundStarfield = memo(function BackgroundStarfield() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950" />

      {/* Static stars layer */}
      <div className="absolute inset-0">
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Nebula effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-blue-500/15 rounded-full blur-2xl" />
      </div>
    </div>
  )
})

// ============================================================================
// 3D CONTENT AREA WITH COCKPIT FRAME
// ============================================================================

interface Scene3DContentProps {
  currentScene: SceneType
  onSceneChange: (scene: SceneType) => void
  onZoneClick: (zone: SceneType) => void
  children: React.ReactNode
}

const Scene3DContent = memo(function Scene3DContent({
  currentScene,
  onSceneChange,
  onZoneClick,
  children,
}: Scene3DContentProps) {
  const {
    currentPlanet,
    planets,
    isSidebarOpen,
    selectPlanet,
    buildingQueue,
    researchQueue,
    fleetMissions,
    setVisualizationMode,
  } = useGameStore()
  const router = useRouter()
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Handle responsive sidebar collapse
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024
      setIsCollapsed(isMobile && !isMobileDrawerOpen)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isMobileDrawerOpen])

  // Map scene to route for hybrid navigation
  const handleSceneChange = useCallback((scene: SceneType) => {
    onSceneChange(scene)
  }, [onSceneChange])

  // Handle planet selection
  const handlePlanetSelect = useCallback((planetId: string) => {
    selectPlanet(planetId)
    onSceneChange('orbital')
  }, [selectPlanet, onSceneChange])

  // Handle quick navigation from CockpitFrame
  const handleQuickNav = useCallback((destination: string) => {
    const navMap: Record<string, SceneType> = {
      overview: 'orbital',
      resources: 'mines',
      fleet: 'fleet',
      research: 'research',
      shipyard: 'shipyard',
      galaxy: 'galaxy',
      defense: 'defense',
    }
    const scene = navMap[destination]
    if (scene) {
      onSceneChange(scene)
    }
  }, [onSceneChange])

  // Handle toggle to 2D mode from CockpitFrame settings
  const handleToggle2D = useCallback(() => {
    setVisualizationMode('2d')
  }, [setVisualizationMode])

  // Build alerts from game state
  const alerts = useMemo((): CockpitAlert[] => {
    const result: CockpitAlert[] = []

    // Check for incoming attacks
    const incomingAttacks = fleetMissions.filter(
      m => m.mission_type === 'attack' && !m.is_returning
    )
    if (incomingAttacks.length > 0) {
      result.push({
        type: 'danger',
        message: `${incomingAttacks.length} incoming attack${incomingAttacks.length > 1 ? 's' : ''}!`,
      })
    }

    // Check for active fleets
    const activeFleets = fleetMissions.filter(m => !m.processed)
    if (activeFleets.length > 0 && incomingAttacks.length === 0) {
      result.push({
        type: 'info',
        message: `${activeFleets.length} fleet${activeFleets.length > 1 ? 's' : ''} in transit`,
      })
    }

    return result
  }, [fleetMissions])

  // Build radar data from fleet missions
  const radarData = useMemo((): RadarPoint[] => {
    return fleetMissions.slice(0, 10).map((mission, index) => ({
      x: Math.cos((index / 10) * Math.PI * 2) * 0.5 + (Math.random() - 0.5) * 0.3,
      y: Math.sin((index / 10) * Math.PI * 2) * 0.5 + (Math.random() - 0.5) * 0.3,
      type: mission.mission_type === 'attack'
        ? 'hostile' as const
        : mission.is_returning
          ? 'friendly' as const
          : 'neutral' as const,
    }))
  }, [fleetMissions])

  // Build current construction from queues
  const currentConstruction = useMemo((): CockpitConstruction | undefined => {
    // Check building queue for current planet
    const buildingItem = buildingQueue.find(
      q => q.planet_id === currentPlanet?.id
    )
    if (buildingItem) {
      const endsAt = new Date(buildingItem.ends_at)
      const startedAt = new Date(buildingItem.started_at)
      const now = new Date()
      const totalDuration = endsAt.getTime() - startedAt.getTime()
      const elapsed = now.getTime() - startedAt.getTime()
      const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)

      return {
        name: `Building Lv.${buildingItem.target_level}`,
        progress,
        endsAt,
      }
    }

    // Check research queue
    const researchItem = researchQueue.find(
      q => q.planet_id === currentPlanet?.id
    )
    if (researchItem) {
      const endsAt = new Date(researchItem.ends_at)
      const startedAt = new Date(researchItem.started_at)
      const now = new Date()
      const totalDuration = endsAt.getTime() - startedAt.getTime()
      const elapsed = now.getTime() - startedAt.getTime()
      const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100)

      return {
        name: `Research Lv.${researchItem.target_level}`,
        progress,
        endsAt,
      }
    }

    return undefined
  }, [buildingQueue, researchQueue, currentPlanet])

  // Build resources for CockpitSidebar
  const resources = useMemo(() => ({
    metal: currentPlanet?.metal ?? 0,
    crystal: currentPlanet?.crystal ?? 0,
    deuterium: currentPlanet?.deuterium ?? 0,
    energy: {
      current: (currentPlanet?.energy_max ?? 0) - (currentPlanet?.energy_used ?? 0),
      max: currentPlanet?.energy_max ?? 0,
    },
  }), [currentPlanet])

  // Build constructions list for CockpitSidebar
  const constructionsList = useMemo(() => {
    const list: Array<{ name: string; endsAt: Date }> = []

    buildingQueue.forEach((item) => {
      list.push({
        name: `Building Lv.${item.target_level}`,
        endsAt: new Date(item.ends_at),
      })
    })

    researchQueue.forEach((item) => {
      list.push({
        name: `Research Lv.${item.target_level}`,
        endsAt: new Date(item.ends_at),
      })
    })

    return list
  }, [buildingQueue, researchQueue])

  // Build alerts for CockpitSidebar (different format)
  const sidebarAlerts = useMemo(() => {
    const result: Array<{
      type: 'attack' | 'construction' | 'fleet' | 'message'
      text: string
      time: Date
    }> = []

    fleetMissions.forEach((mission) => {
      if (mission.mission_type === 'attack' && !mission.is_returning) {
        result.push({
          type: 'attack',
          text: 'Incoming attack!',
          time: new Date(mission.arrives_at),
        })
      } else if (!mission.processed) {
        result.push({
          type: 'fleet',
          text: `Fleet ${mission.mission_type}`,
          time: new Date(mission.arrives_at),
        })
      }
    })

    return result
  }, [fleetMissions])

  return (
    <div className="flex flex-1 overflow-hidden relative z-10 h-full">
      {/* CockpitSidebar - Left panel */}
      {isSidebarOpen && (
        <CockpitSidebar
          planets={planets}
          currentPlanetId={currentPlanet?.id ?? null}
          onSelectPlanet={handlePlanetSelect}
          currentScene={currentScene}
          onNavigateScene={handleSceneChange}
          resources={resources}
          alerts={sidebarAlerts}
          constructions={constructionsList}
        />
      )}

      {/* Main content area with CockpitFrame */}
      <div
        className={`
          flex-1 relative
          transition-all duration-300 ease-out
          ${isSidebarOpen ? '' : 'w-full'}
        `}
      >
        <CockpitFrame
          planetName={currentPlanet?.name}
          coordinates={currentPlanet ? {
            galaxy: currentPlanet.galaxy,
            system: currentPlanet.system,
            position: currentPlanet.position,
          } : undefined}
          alerts={alerts}
          radarData={radarData}
          currentConstruction={currentConstruction}
          onQuickNav={handleQuickNav}
          viewMode="3D"
        >
          {/* 3D Scene content */}
          {currentPlanet ? (
            <GameScene3DManager
              initialScene={currentScene}
              planetId={currentPlanet.id}
              onSceneChange={handleSceneChange}
              onZoneClick={onZoneClick}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-950">
              <div className="text-white/50 text-center">
                <p className="text-lg">No planet selected</p>
                <p className="text-sm mt-2">Select a planet from the sidebar</p>
              </div>
            </div>
          )}
        </CockpitFrame>

        {/* Overlay for page content when needed */}
        {children && (
          <div className="absolute inset-0 pointer-events-none z-20">
            <div className="pointer-events-auto">
              {children}
            </div>
          </div>
        )}
      </div>

      {/* Mobile drawer toggle button */}
      <button
        className="lg:hidden fixed bottom-20 left-4 z-50 w-12 h-12 rounded-full bg-cyan-900/80 backdrop-blur-sm border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20"
        onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMobileDrawerOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
    </div>
  )
})

// ============================================================================
// MAIN GAME LAYOUT CLIENT
// ============================================================================

export const GameLayoutClient = memo(function GameLayoutClient({
  children,
}: GameLayoutClientProps) {
  const { isSidebarOpen, visualizationMode } = useGameStore()
  const pathname = usePathname()

  // State for 3D scene management
  const [currentScene, setCurrentScene] = useState<SceneType>('orbital')

  // Determine initial scene based on pathname
  useEffect(() => {
    const pathToScene: Record<string, SceneType> = {
      '/game': 'orbital',
      '/game/overview': 'orbital',
      '/game/resources': 'mines',
      '/game/shipyard': 'shipyard',
      '/game/research': 'research',
      '/game/defense': 'defense',
      '/game/fleet': 'fleet',
      '/game/galaxy': 'galaxy',
    }
    const scene = pathToScene[pathname]
    if (scene) {
      setCurrentScene(scene)
    }
  }, [pathname])

  const handleSceneChange = useCallback((scene: SceneType) => {
    setCurrentScene(scene)
  }, [])

  const handleZoneClick = useCallback((zone: SceneType) => {
    setCurrentScene(zone)
  }, [])

  // Use 3D mode when visualization mode is '3d'
  const use3DMode = visualizationMode === '3d'

  return (
    <div className="min-h-screen h-screen flex flex-col relative overflow-hidden">
      {/* Background - only show in 2D mode, 3D has its own background */}
      {!use3DMode && <BackgroundStarfield />}

      {/* Navigation */}
      <div className="relative z-40 flex-shrink-0">
        <NavigationController />
        <ResourceBar />
      </div>

      {/* Main content area */}
      {use3DMode ? (
        /* 3D Mode: Full 3D scene with sidebar */
        <Scene3DContent
          currentScene={currentScene}
          onSceneChange={handleSceneChange}
          onZoneClick={handleZoneClick}
        >
          {/* Pass children as overlay content if needed */}
          {null}
        </Scene3DContent>
      ) : (
        /* 2D Mode: Traditional layout with sidebar and page content */
        <div className="flex flex-1 overflow-hidden relative z-10">
          {/* Planet Sidebar (Legacy) */}
          <SidebarController />

          {/* Page content with transitions */}
          <main
            className={`
              flex-1 overflow-y-auto
              transition-all duration-300 ease-out
              ${isSidebarOpen ? '' : 'w-full'}
            `}
          >
            <PageTransition type="fade" duration={0.2} className="p-4 md:p-6">
              {children}
            </PageTransition>
          </main>
        </div>
      )}

      {/* Developer Overlay (only visible for admins) */}
      <DevOverlay />

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
})

export default GameLayoutClient
