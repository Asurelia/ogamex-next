'use client'

/**
 * RouteWindow - Cross-system route display
 *
 * Shows the planned route with system names, security levels,
 * and remaining jumps. Allows clearing route or setting waypoints.
 */

import { useMemo, useCallback, memo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'
import { getUniverseGraph } from '@/data/universe-graph'
import { getSecurityColor } from '@shared/types/game-constants'
import { clearRoute, getCurrentRoute } from '@/engine/systems/NavigationSystem'
import { PHOTON_COLORS } from '../photon/photon-theme'

// ============================================================================
// ROUTE SYSTEM ENTRY
// ============================================================================

interface RouteEntryProps {
  systemId: string
  index: number
  isCurrent: boolean
  isDestination: boolean
}

const RouteEntry = memo(function RouteEntry({ systemId, index, isCurrent, isDestination }: RouteEntryProps) {
  const graph = useMemo(() => getUniverseGraph(), [])
  const system = useMemo(() => graph.getSystem(systemId), [graph, systemId])

  if (!system) return null

  const secColor = getSecurityColor(system.securityLevel)

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
        isCurrent
          ? 'bg-cyan-900/30 border-l-2 border-cyan-400'
          : 'hover:bg-slate-800/40'
      }`}
    >
      {/* Jump number */}
      <span className="w-5 text-right text-slate-500 font-mono">
        {isCurrent ? '>' : index}
      </span>

      {/* Security dot */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: secColor }}
      />

      {/* System name */}
      <span className={`flex-1 truncate ${isCurrent ? 'text-cyan-300 font-semibold' : 'text-slate-300'}`}>
        {system.name}
      </span>

      {/* Security level */}
      <span
        className="text-[10px] font-bold w-7 text-right"
        style={{ color: secColor }}
      >
        {system.securityLevel.toFixed(1)}
      </span>

      {/* Region/Faction */}
      <span className="text-[10px] text-slate-500 w-14 text-right truncate">
        {system.faction}
      </span>

      {/* Destination marker */}
      {isDestination && (
        <span className="text-amber-400 text-[10px]">DEST</span>
      )}
    </div>
  )
})

// ============================================================================
// ROUTE CONTENT
// ============================================================================

const RouteContent = memo(function RouteContent() {
  const currentSystemId = useRTGameStore(s => s.systemId)
  const route = getCurrentRoute()

  const handleClear = useCallback(() => {
    clearRoute()
  }, [])

  if (!route || !route.found || route.path.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 text-slate-500">
        <span className="text-2xl mb-2">🧭</span>
        <span className="text-xs">No route set</span>
        <span className="text-[10px] text-slate-600 mt-1">Open Starmap to set destination</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: PHOTON_COLORS.borderDefault }}>
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-semibold">{route.jumps} jump{route.jumps !== 1 ? 's' : ''}</span>
          <span className="text-slate-500">remaining</span>
        </div>
        <button
          onClick={handleClear}
          className="px-2 py-0.5 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
        >
          Clear Route
        </button>
      </div>

      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-1 text-slate-500 border-b" style={{ borderColor: PHOTON_COLORS.borderDefault }}>
        <span className="w-5 text-right">#</span>
        <span className="w-2" />
        <span className="flex-1">System</span>
        <span className="w-7 text-right">Sec</span>
        <span className="w-14 text-right">Faction</span>
        <span className="w-8" />
      </div>

      {/* Route list */}
      <div className="flex-1 overflow-y-auto">
        {route.path.map((systemId, index) => (
          <RouteEntry
            key={systemId}
            systemId={systemId}
            index={index}
            isCurrent={systemId === currentSystemId}
            isDestination={index === route.path.length - 1}
          />
        ))}
      </div>

      {/* Footer with route stats */}
      <div className="flex items-center justify-between px-3 py-1.5 text-[10px] text-slate-500 border-t" style={{ borderColor: PHOTON_COLORS.borderDefault }}>
        <span>Distance: {(route.totalDistance / 1000).toFixed(1)} kLY</span>
        <span>Route: shortest</span>
      </div>
    </div>
  )
})

// ============================================================================
// EXPORT
// ============================================================================

export function RouteWindow() {
  return (
    <ManagedWindow
      id="rt-route"
      title="Route"
      icon="🧭"
      defaultPosition={{ x: 60, y: 300 }}
      defaultSize={{ width: 360, height: 400 }}
      minWidth={280}
      minHeight={200}
    >
      <RouteContent />
    </ManagedWindow>
  )
}
