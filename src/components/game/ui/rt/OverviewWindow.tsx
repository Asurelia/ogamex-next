'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'
import type { ShipData, AsteroidData, StationData } from '@/stores/rtGameStore'
import { getFactionColor } from '@/data/faction-identities'

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'all' | 'ships' | 'npcs' | 'asteroids' | 'stations'
type SortColumn = 'name' | 'type' | 'distance' | 'velocity'
type SortDirection = 'asc' | 'desc'

interface OverviewEntity {
  id: string
  icon: string
  name: string
  type: string
  distance: number
  velocity: number
  color: string
  entityType: 'ship' | 'npc' | 'asteroid' | 'station'
  raw: ShipData | AsteroidData | StationData
}

// ============================================================================
// HELPERS
// ============================================================================

function getShipIcon(ship: ShipData): string {
  if (ship.isNpc) return '🔴'
  // Faction-colored icons
  switch (ship.faction) {
    case 'amarr': return '🟡'
    case 'caldari': return '🔵'
    case 'gallente': return '🟢'
    case 'minmatar': return '🟠'
    case 'pirate': return '🔴'
    default: return '⚪'
  }
}

function getEntityColor(entity: OverviewEntity): string {
  switch (entity.entityType) {
    case 'ship':
    case 'npc': {
      const ship = entity.raw as ShipData
      if (ship.faction === 'friendly') return 'text-green-400'
      if (ship.faction === 'hostile') return 'text-red-400'
      return 'text-yellow-400'
    }
    case 'asteroid':
      return 'text-cyan-300'
    case 'station':
      return 'text-white'
    default:
      return 'text-slate-300'
  }
}

function calcDistance(x: number, y: number, z: number, mx: number, my: number, mz: number): number {
  return Math.sqrt((x - mx) ** 2 + (y - my) ** 2 + (z - mz) ** 2)
}

function formatDistance(d: number): string {
  if (d < 1000) return `${d.toFixed(0)} m`
  if (d < 1_000_000) return `${(d / 1000).toFixed(1)} km`
  return `${(d / 1_000_000_000).toFixed(2)} AU`
}

// ============================================================================
// CONTEXT MENU
// ============================================================================

interface ContextMenuProps {
  x: number
  y: number
  entity: OverviewEntity
  onClose: () => void
}

function ContextMenu({ x, y, entity, onClose }: ContextMenuProps) {
  const { approach, orbit, warpTo, setSelectedTarget, attack, mine, dock } = useRTGameStore()

  const actions = useMemo(() => {
    const base = [
      { label: 'Lock Target', action: () => setSelectedTarget(entity.id) },
    ]

    if (entity.entityType === 'ship' || entity.entityType === 'npc') {
      base.push(
        { label: 'Approach', action: () => approach(entity.id) },
        { label: 'Orbit', action: () => orbit(entity.id) },
        { label: 'Warp To', action: () => warpTo(entity.id) },
        { label: 'Attack', action: () => attack(entity.id) },
      )
    } else if (entity.entityType === 'asteroid') {
      base.push(
        { label: 'Approach', action: () => approach(entity.id) },
        { label: 'Warp To', action: () => warpTo(entity.id) },
        { label: 'Mine', action: () => mine(entity.id) },
      )
    } else if (entity.entityType === 'station') {
      base.push(
        { label: 'Approach', action: () => approach(entity.id) },
        { label: 'Warp To', action: () => warpTo(entity.id) },
        { label: 'Dock', action: () => dock(entity.id) },
      )
    }

    return base
  }, [entity, approach, orbit, warpTo, setSelectedTarget, attack, mine, dock])

  return (
    <>
      <div className="fixed inset-0 z-[9999]" onClick={onClose} />
      <div
        className="fixed z-[10000] bg-slate-800 border border-cyan-700/50 rounded shadow-xl py-1 min-w-[160px]"
        style={{ left: x, top: y }}
      >
        <div className="px-3 py-1 text-xs text-cyan-400 border-b border-slate-700 mb-1">
          {entity.name}
        </div>
        {actions.map((a) => (
          <button
            key={a.label}
            className="w-full text-left px-3 py-1.5 text-sm text-slate-200 hover:bg-cyan-700/30 hover:text-white transition-colors"
            onClick={() => {
              a.action()
              onClose()
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </>
  )
}

// ============================================================================
// TABS
// ============================================================================

const TABS: { key: TabType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ships', label: 'Ships' },
  { key: 'npcs', label: 'NPCs' },
  { key: 'asteroids', label: 'Asteroids' },
  { key: 'stations', label: 'Stations' },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const OverviewContent = memo(function OverviewContent() {
  const { ships, asteroids, stations, myShipId, setSelectedTarget, selectedTargetId } = useRTGameStore()
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [sortCol, setSortCol] = useState<SortColumn>('distance')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entity: OverviewEntity } | null>(null)

  const myShip = ships.get(myShipId)
  const mx = myShip?.x ?? 0
  const my = myShip?.y ?? 0
  const mz = myShip?.z ?? 0

  const entities = useMemo(() => {
    const list: OverviewEntity[] = []

    ships.forEach((ship) => {
      if (ship.id === myShipId) return
      const e: OverviewEntity = {
        id: ship.id,
        icon: getShipIcon(ship),
        name: ship.ownerName || ship.id.slice(0, 8),
        type: ship.shipTypeId,
        distance: calcDistance(ship.x, ship.y, ship.z, mx, my, mz),
        velocity: ship.speed,
        color: '',
        entityType: ship.isNpc ? 'npc' : 'ship',
        raw: ship,
      }
      e.color = getEntityColor(e)
      list.push(e)
    })

    asteroids.forEach((ast) => {
      const e: OverviewEntity = {
        id: ast.id,
        icon: '💎',
        name: `${ast.oreType} Asteroid`,
        type: ast.oreType,
        distance: calcDistance(ast.x, ast.y, ast.z, mx, my, mz),
        velocity: 0,
        color: 'text-cyan-300',
        entityType: 'asteroid',
        raw: ast,
      }
      list.push(e)
    })

    stations.forEach((st) => {
      const e: OverviewEntity = {
        id: st.id,
        icon: '🏛️',
        name: st.name,
        type: st.stationType,
        distance: calcDistance(st.x, st.y, st.z, mx, my, mz),
        velocity: 0,
        color: 'text-white',
        entityType: 'station',
        raw: st,
      }
      list.push(e)
    })

    return list
  }, [ships, asteroids, stations, myShipId, mx, my, mz])

  const filtered = useMemo(() => {
    if (activeTab === 'all') return entities
    return entities.filter((e) => {
      if (activeTab === 'ships') return e.entityType === 'ship'
      if (activeTab === 'npcs') return e.entityType === 'npc'
      if (activeTab === 'asteroids') return e.entityType === 'asteroid'
      if (activeTab === 'stations') return e.entityType === 'station'
      return true
    })
  }, [entities, activeTab])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      let cmp = 0
      switch (sortCol) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'type': cmp = a.type.localeCompare(b.type); break
        case 'distance': cmp = a.distance - b.distance; break
        case 'velocity': cmp = a.velocity - b.velocity; break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [filtered, sortCol, sortDir])

  const handleSort = useCallback((col: SortColumn) => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return col
      }
      setSortDir('asc')
      return col
    })
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, entity: OverviewEntity) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, entity })
  }, [])

  const sortArrow = (col: SortColumn) => {
    if (sortCol !== col) return ''
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[24px_1fr_80px_80px_60px] gap-1 px-2 py-1 bg-slate-800/50 border-b border-slate-700 text-slate-400">
        <span />
        <button className="text-left hover:text-cyan-400" onClick={() => handleSort('name')}>
          Name{sortArrow('name')}
        </button>
        <button className="text-left hover:text-cyan-400" onClick={() => handleSort('type')}>
          Type{sortArrow('type')}
        </button>
        <button className="text-right hover:text-cyan-400" onClick={() => handleSort('distance')}>
          Dist{sortArrow('distance')}
        </button>
        <button className="text-right hover:text-cyan-400" onClick={() => handleSort('velocity')}>
          Vel{sortArrow('velocity')}
        </button>
      </div>

      {/* Entity list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <div className="text-center text-slate-500 py-4">No entities in range</div>
        )}
        {sorted.map((entity) => (
          <div
            key={entity.id}
            className={`grid grid-cols-[24px_1fr_80px_80px_60px] gap-1 px-2 py-1 cursor-pointer transition-colors hover:bg-cyan-900/20 ${
              selectedTargetId === entity.id ? 'bg-cyan-900/40 border-l-2 border-cyan-400' : ''
            }`}
            onClick={() => setSelectedTarget(entity.id)}
            onContextMenu={(e) => handleContextMenu(e, entity)}
          >
            <span className="text-center">{entity.icon}</span>
            <span className={`truncate ${entity.color}`}>{entity.name}</span>
            <span className="text-slate-400 truncate">{entity.type}</span>
            <span className="text-right text-slate-300">{formatDistance(entity.distance)}</span>
            <span className="text-right text-slate-300">{entity.velocity.toFixed(0)}</span>
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          entity={contextMenu.entity}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
})

// ============================================================================
// EXPORT
// ============================================================================

export function OverviewWindow() {
  return (
    <ManagedWindow
      id="rt-overview"
      title="Overview"
      icon="📡"
      defaultPosition={{ x: 800, y: 60 }}
      defaultSize={{ width: 440, height: 400 }}
      minWidth={340}
      minHeight={200}
    >
      <OverviewContent />
    </ManagedWindow>
  )
}
