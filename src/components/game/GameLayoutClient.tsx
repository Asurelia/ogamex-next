'use client'

import { memo, useMemo, useCallback, useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useGameStore } from '@/stores/gameStore'
import { ResourceBar } from '@/components/game/ResourceBar'
import type { SceneType } from '@/components/game/3d/GameScene3DManager'

// ============================================================================
// DYNAMIC IMPORTS (SSR disabled for 3D components)
// ============================================================================

const Navigation3D = dynamic(
  () => import('@/components/game/Navigation3D').then(mod => mod.Navigation3D),
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
  children?: React.ReactNode // Kept for Next.js layout compatibility, but not rendered
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
// 3D CONTENT AREA WITH COCKPIT FRAME
// ============================================================================

interface Scene3DContentProps {
  currentScene: SceneType
  onSceneChange: (scene: SceneType) => void
  onZoneClick: (zone: SceneType) => void
}

const Scene3DContent = memo(function Scene3DContent({
  currentScene,
  onSceneChange,
  onZoneClick,
}: Scene3DContentProps) {
  const {
    currentPlanet,
    planets,
    isSidebarOpen,
    selectPlanet,
    buildingQueue,
    researchQueue,
    fleetMissions,
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

  // Build resources for CockpitSidebar with full data
  const resources = useMemo(() => ({
    metal: currentPlanet?.metal ?? 0,
    crystal: currentPlanet?.crystal ?? 0,
    deuterium: currentPlanet?.deuterium ?? 0,
    metalMax: currentPlanet?.metal_max ?? 0,
    crystalMax: currentPlanet?.crystal_max ?? 0,
    deuteriumMax: currentPlanet?.deuterium_max ?? 0,
    metalPerHour: currentPlanet?.metal_per_hour ?? 0,
    crystalPerHour: currentPlanet?.crystal_per_hour ?? 0,
    deuteriumPerHour: currentPlanet?.deuterium_per_hour ?? 0,
    energy: {
      current: (currentPlanet?.energy_max ?? 0) - (currentPlanet?.energy_used ?? 0),
      max: currentPlanet?.energy_max ?? 0,
      used: currentPlanet?.energy_used ?? 0,
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
  const { isSidebarOpen } = useGameStore()
  const pathname = usePathname()

  // State for 3D scene management
  const [currentScene, setCurrentScene] = useState<SceneType>('orbital')

  // Determine initial scene based on pathname
  useEffect(() => {
    const pathToScene: Record<string, SceneType> = {
      '/game': 'orbital',
      '/game/overview': 'orbital',
      '/game/dashboard': 'orbital',
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

  return (
    <div className="min-h-screen h-screen flex flex-col relative overflow-hidden">
      {/* Navigation */}
      <div className="relative z-40 flex-shrink-0">
        <NavigationController />
        <ResourceBar />
      </div>

      {/* Main content area - Always 3D mode with CockpitSidebar */}
      <Scene3DContent
        currentScene={currentScene}
        onSceneChange={handleSceneChange}
        onZoneClick={handleZoneClick}
      />

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
