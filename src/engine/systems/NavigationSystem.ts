/**
 * NavigationSystem
 *
 * Manages cross-system route planning using A* on the universe graph.
 * Tracks current route, next jump, and remaining jumps.
 * Integrates with the Zustand store for UI display.
 */

import type { GameEngine } from '../GameEngine'
import { useRTGameStore } from '@/stores/rtGameStore'
import { getUniverseGraph } from '@/data/universe-graph'
import { findRoute, type RouteResult, type RoutePreference } from '@/data/universe-pathfinder'

// ============================================================================
// STATE
// ============================================================================

let _currentRoute: RouteResult | null = null
let _destinationSystemId: string = ''
let _routePreference: RoutePreference = 'shortest'
let _tickCounter = 0
const UPDATE_INTERVAL = 30 // Update UI every 30 ticks (~0.5s at 60Hz)

// ============================================================================
// SYSTEM
// ============================================================================

export function navigationSystem(engine: GameEngine, dt: number): void {
  _tickCounter++
  if (_tickCounter < UPDATE_INTERVAL) return
  _tickCounter = 0

  // Sync route state to store for UI
  const store = useRTGameStore.getState()
  const currentPath = _currentRoute?.path ?? []
  if (JSON.stringify(store.route) !== JSON.stringify(currentPath)) {
    store.setRoute(currentPath)
  }
}

// ============================================================================
// ROUTE PLANNING
// ============================================================================

/**
 * Plan a route from the current system to a destination.
 */
export function planRoute(destinationSystemId: string, preference?: RoutePreference): RouteResult {
  const store = useRTGameStore.getState()
  const currentSystemId = store.systemId

  if (!currentSystemId || !destinationSystemId) {
    _currentRoute = null
    _destinationSystemId = ''
    syncRouteToStore()
    return { path: [], jumps: 0, totalDistance: 0, systems: [], found: false }
  }

  if (preference) _routePreference = preference

  const graph = getUniverseGraph()
  _currentRoute = findRoute(graph, currentSystemId, destinationSystemId, _routePreference)
  _destinationSystemId = destinationSystemId

  syncRouteToStore()
  return _currentRoute
}

/**
 * Clear the current route.
 */
export function clearRoute(): void {
  _currentRoute = null
  _destinationSystemId = ''
  syncRouteToStore()
}

/**
 * Advance the route after completing a jump.
 * Removes the first system (the one we just left) from the route.
 */
export function advanceRoute(): void {
  if (!_currentRoute || _currentRoute.path.length <= 1) {
    clearRoute()
    return
  }

  _currentRoute = {
    ..._currentRoute,
    path: _currentRoute.path.slice(1),
    jumps: _currentRoute.jumps - 1,
    systems: _currentRoute.systems.slice(1),
  }

  syncRouteToStore()
}

/**
 * Get the next system to jump to (first hop in route after current).
 */
export function getNextJump(): string | null {
  if (!_currentRoute || _currentRoute.path.length < 2) return null
  return _currentRoute.path[1]
}

/**
 * Get the current route.
 */
export function getCurrentRoute(): RouteResult | null {
  return _currentRoute
}

/**
 * Get remaining jumps count.
 */
export function getRemainingJumps(): number {
  return _currentRoute ? Math.max(0, _currentRoute.jumps) : 0
}

/**
 * Get destination system name.
 */
export function getDestinationName(): string {
  if (!_destinationSystemId) return ''
  const graph = getUniverseGraph()
  return graph.getSystem(_destinationSystemId)?.name ?? _destinationSystemId
}

// ============================================================================
// HELPERS
// ============================================================================

function syncRouteToStore(): void {
  const store = useRTGameStore.getState()
  store.setRoute(_currentRoute?.path ?? [])
  store.setRouteDestination(_destinationSystemId ? getDestinationName() : '')
}
