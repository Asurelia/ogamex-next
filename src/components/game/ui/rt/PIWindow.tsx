'use client'

/**
 * Planetary Interaction Window
 *
 * 3 tabs: Colonies, Planet View, Build
 */

import { useState, useCallback, memo, useMemo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'

type PITab = 'colonies' | 'planet' | 'build'

const PI_TABS: { key: PITab; label: string }[] = [
  { key: 'colonies', label: 'Colonies' },
  { key: 'planet', label: 'Planet View' },
  { key: 'build', label: 'Build' },
]

const BUILDING_TYPES = [
  { type: 'extractor', name: 'Extractor', power: 2600, cpu: 400, icon: '⛏️' },
  { type: 'basic_processor', name: 'Basic Processor', power: 800, cpu: 200, icon: '🔄' },
  { type: 'advanced_processor', name: 'Advanced Processor', power: 700, cpu: 500, icon: '⚙️' },
  { type: 'hi_tech_processor', name: 'Hi-Tech Processor', power: 400, cpu: 1100, icon: '🔬' },
  { type: 'storage', name: 'Storage Facility', power: 700, cpu: 500, icon: '📦' },
  { type: 'launchpad', name: 'Launchpad', power: 700, cpu: 3600, icon: '🚀' },
]

const ColoniesTab = memo(function ColoniesTab() {
  const { colonies } = useRTGameStore()

  return (
    <div className="p-2 space-y-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{colonies.length} colonies</span>
        <button
          onClick={() => useRTGameStore.getState().piCreateColony()}
          className="px-2 py-0.5 bg-cyan-800 hover:bg-cyan-700 text-white text-[10px] rounded"
        >
          New Colony
        </button>
      </div>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {colonies.map((colony) => (
          <div key={colony.id} className="p-2 bg-slate-800/50 rounded border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-200">{colony.colonyName}</span>
              <span className="text-[10px] text-slate-500">CC Lv{colony.commandCenterLevel}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <div className="text-[10px] text-slate-400">Power</div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full"
                    style={{ width: `${Math.min(100, (colony.powerUsed / colony.powerCapacity) * 100)}%` }}
                  />
                </div>
                <div className="text-[9px] text-slate-500">{colony.powerUsed}/{colony.powerCapacity}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">CPU</div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{ width: `${Math.min(100, (colony.cpuUsed / colony.cpuCapacity) * 100)}%` }}
                  />
                </div>
                <div className="text-[9px] text-slate-500">{colony.cpuUsed}/{colony.cpuCapacity}</div>
              </div>
            </div>
          </div>
        ))}
        {colonies.length === 0 && (
          <div className="text-center text-slate-500 py-8 text-xs">
            No planetary colonies.<br />
            Scan a planet to begin.
          </div>
        )}
      </div>
    </div>
  )
})

const PlanetViewTab = memo(function PlanetViewTab() {
  const { selectedColony, colonyBuildings, colonyRoutes } = useRTGameStore()

  if (!selectedColony) {
    return (
      <div className="p-3 text-center text-slate-500 text-xs">
        Select a colony to view planet surface
      </div>
    )
  }

  return (
    <div className="p-2">
      <div className="text-xs text-slate-300 mb-2">{selectedColony.colonyName} - Planet Surface</div>
      {/* 2D Grid representation */}
      <div className="relative bg-slate-900 rounded border border-slate-700 h-[200px] overflow-hidden">
        {colonyBuildings.map((building) => (
          <div
            key={building.id}
            className="absolute w-8 h-8 flex items-center justify-center bg-slate-800 border border-slate-600 rounded text-sm cursor-pointer hover:border-cyan-500"
            style={{
              left: `${((building.positionX + 500) / 1000) * 100}%`,
              top: `${((building.positionY + 500) / 1000) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
            title={building.buildingType}
          >
            {BUILDING_TYPES.find(b => b.type === building.buildingType)?.icon || '🏗️'}
          </div>
        ))}
        {/* Route lines would be drawn here with SVG */}
        {colonyBuildings.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
            Place buildings on the planet surface
          </div>
        )}
      </div>
      <div className="mt-2 text-[10px] text-slate-400">
        Buildings: {colonyBuildings.length} | Routes: {colonyRoutes.length}
      </div>
    </div>
  )
})

const BuildTab = memo(function BuildTab() {
  return (
    <div className="p-2 space-y-1">
      <div className="text-xs text-slate-400 mb-1">Available Buildings</div>
      {BUILDING_TYPES.map((bt) => (
        <div key={bt.type} className="flex items-center justify-between p-2 bg-slate-800/50 rounded border border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">{bt.icon}</span>
            <div>
              <div className="text-xs text-slate-200">{bt.name}</div>
              <div className="text-[10px] text-slate-400">
                Power: {bt.power} | CPU: {bt.cpu}
              </div>
            </div>
          </div>
          <button
            onClick={() => useRTGameStore.getState().piPlaceBuilding(bt.type)}
            className="px-2 py-0.5 bg-cyan-800 hover:bg-cyan-700 text-white text-[10px] rounded"
          >
            Place
          </button>
        </div>
      ))}
    </div>
  )
})

const PIContent = memo(function PIContent() {
  const [activeTab, setActiveTab] = useState<PITab>('colonies')

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-700">
        {PI_TABS.map((tab) => (
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
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'colonies' && <ColoniesTab />}
        {activeTab === 'planet' && <PlanetViewTab />}
        {activeTab === 'build' && <BuildTab />}
      </div>
    </div>
  )
})

export function PIWindow() {
  return (
    <ManagedWindow
      id="rt-pi"
      title="Planetary Interaction"
      icon="🌍"
      defaultPosition={{ x: 250, y: 130 }}
      defaultSize={{ width: 420, height: 400 }}
      minWidth={350}
      minHeight={300}
    >
      <PIContent />
    </ManagedWindow>
  )
}
