'use client'

import { useMemo, memo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'
import type { ShipData, AsteroidData, StationData } from '@/stores/rtGameStore'

// ============================================================================
// HELPERS
// ============================================================================

function calcDistance(
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2 + (z1 - z2) ** 2)
}

function formatDistance(d: number): string {
  if (d < 1000) return `${d.toFixed(0)} m`
  if (d < 1_000_000) return `${(d / 1000).toFixed(1)} km`
  return `${(d / 1_000_000_000).toFixed(2)} AU`
}

function hpPercent(current: number, max: number): number {
  return max > 0 ? (current / max) * 100 : 0
}

// ============================================================================
// HP BAR
// ============================================================================

function HPBar({ label, percent, color }: { label: string; percent: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300">{percent.toFixed(0)}%</span>
      </div>
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

// ============================================================================
// SELECTED ITEM CONTENT
// ============================================================================

const SelectedItemContent = memo(function SelectedItemContent() {
  const {
    selectedTargetId, ships, asteroids, stations, myShipId,
    approach, orbit, warpTo, setSelectedTarget, attack, mine, dock, lockTarget,
  } = useRTGameStore()

  const myShip = ships.get(myShipId)

  const target = useMemo(() => {
    if (!selectedTargetId) return null

    const ship = ships.get(selectedTargetId)
    if (ship) {
      return {
        kind: 'ship' as const,
        name: ship.ownerName || ship.id.slice(0, 8),
        type: ship.shipTypeId,
        entity: ship,
        x: ship.x, y: ship.y, z: ship.z,
      }
    }

    const ast = asteroids.get(selectedTargetId)
    if (ast) {
      return {
        kind: 'asteroid' as const,
        name: `${ast.oreType} Asteroid`,
        type: ast.oreType,
        entity: ast,
        x: ast.x, y: ast.y, z: ast.z,
      }
    }

    const st = stations.get(selectedTargetId)
    if (st) {
      return {
        kind: 'station' as const,
        name: st.name,
        type: st.stationType,
        entity: st,
        x: st.x, y: st.y, z: st.z,
      }
    }

    return null
  }, [selectedTargetId, ships, asteroids, stations])

  if (!target) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-xs">
        No target selected
      </div>
    )
  }

  const mx = myShip?.x ?? 0
  const my2 = myShip?.y ?? 0
  const mz = myShip?.z ?? 0
  const distance = calcDistance(target.x, target.y, target.z, mx, my2, mz)

  const isShip = target.kind === 'ship'
  const isAsteroid = target.kind === 'asteroid'
  const isStation = target.kind === 'station'
  const ship = isShip ? target.entity as ShipData : null

  return (
    <div className="flex flex-col h-full text-xs p-3 space-y-3">
      {/* Target info */}
      <div className="border-b border-slate-700 pb-2">
        <div className="text-sm font-semibold text-slate-200">{target.name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-slate-400 uppercase">{target.type}</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300">{formatDistance(distance)}</span>
        </div>
      </div>

      {/* Health bars for ships */}
      {ship && (
        <div className="space-y-1.5">
          <HPBar label="Shield" percent={hpPercent(ship.shield, ship.shieldMax)} color="bg-blue-500" />
          <HPBar label="Armor" percent={hpPercent(ship.armor, ship.armorMax)} color="bg-orange-500" />
          <HPBar label="Hull" percent={hpPercent(ship.hp, ship.hpMax)} color="bg-red-500" />
        </div>
      )}

      {/* Asteroid info */}
      {isAsteroid && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Ore Type</span>
            <span className="text-cyan-300">{(target.entity as AsteroidData).oreType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Volume</span>
            <span className="text-slate-200">
              {(target.entity as AsteroidData).volume.toLocaleString()} / {(target.entity as AsteroidData).maxVolume.toLocaleString()} m3
            </span>
          </div>
        </div>
      )}

      {/* Station info */}
      {isStation && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Type</span>
            <span className="text-slate-200">{(target.entity as StationData).stationType}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-700">
        <button
          onClick={() => approach(selectedTargetId!)}
          className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
        >
          Approach
        </button>
        <button
          onClick={() => orbit(selectedTargetId!, 5000)}
          className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
        >
          Orbit 5km
        </button>
        <button
          onClick={() => warpTo(selectedTargetId!)}
          className="px-2.5 py-1.5 bg-cyan-700/50 hover:bg-cyan-600/50 text-cyan-300 rounded transition-colors"
        >
          Warp To
        </button>
        <button
          onClick={() => lockTarget(selectedTargetId!)}
          className="px-2.5 py-1.5 bg-yellow-700/50 hover:bg-yellow-600/50 text-yellow-300 rounded transition-colors"
        >
          Lock
        </button>
        {isShip && (
          <button
            onClick={() => attack(selectedTargetId!)}
            className="px-2.5 py-1.5 bg-red-700/50 hover:bg-red-600/50 text-red-300 rounded transition-colors"
          >
            Attack
          </button>
        )}
        {isAsteroid && (
          <button
            onClick={() => mine(selectedTargetId!)}
            className="px-2.5 py-1.5 bg-cyan-700/50 hover:bg-cyan-600/50 text-cyan-300 rounded transition-colors"
          >
            Mine
          </button>
        )}
        {isStation && (
          <button
            onClick={() => dock(selectedTargetId!)}
            className="px-2.5 py-1.5 bg-green-700/50 hover:bg-green-600/50 text-green-300 rounded transition-colors"
          >
            Dock
          </button>
        )}
      </div>
    </div>
  )
})

// ============================================================================
// EXPORT
// ============================================================================

export function SelectedItemWindow() {
  return (
    <ManagedWindow
      id="rt-selecteditem"
      title="Selected Item"
      icon="🎯"
      defaultPosition={{ x: 10, y: 200 }}
      defaultSize={{ width: 280, height: 320 }}
      minWidth={240}
      minHeight={200}
    >
      <SelectedItemContent />
    </ManagedWindow>
  )
}
