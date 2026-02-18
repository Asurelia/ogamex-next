'use client'

/**
 * GameWindows - Container for all game windows
 *
 * Renders all registered game windows and handles route-based window opening
 */

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useWindowManager, WindowManagerProvider } from './WindowManager'
import {
  ResourcesWindow,
  ShipyardWindow,
  ResearchWindow,
  DefenseWindow,
  FleetWindow,
} from './windows'

// Mapping of routes to window IDs
const ROUTE_WINDOWS: Record<string, string> = {
  '/game/resources': 'resources',
  '/game/shipyard': 'shipyard',
  '/game/research': 'research',
  '/game/defense': 'defense',
  '/game/fleet': 'fleet',
}

function GameWindowsContent() {
  const pathname = usePathname()
  const { openWindow, closeWindow, openWindows } = useWindowManager()

  // Open window based on current route
  useEffect(() => {
    const windowId = ROUTE_WINDOWS[pathname]
    if (windowId && !openWindows.includes(windowId)) {
      openWindow(windowId)
    }
  }, [pathname, openWindow, openWindows])

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div className="pointer-events-auto">
        <ResourcesWindow />
        <ShipyardWindow />
        <ResearchWindow />
        <DefenseWindow />
        <FleetWindow />
      </div>
    </div>
  )
}

export function GameWindows() {
  return (
    <WindowManagerProvider>
      <GameWindowsContent />
    </WindowManagerProvider>
  )
}

export default GameWindows
