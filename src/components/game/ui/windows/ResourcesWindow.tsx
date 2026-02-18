'use client'

/**
 * ResourcesWindow - Draggable window for Resources/Production page
 */

import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { GameConfigService } from '@/lib/game/GameConfigService'
import type { BuildingDefinition } from '@/lib/game/constants'
import { BuildingCard, BuildingQueue } from '@/components/game/ui/buildings'
import { BuildingService } from '@/lib/services/building-service'
import { ManagedWindow } from '../WindowManager'

// Resource building keys (mines, storage, energy)
const RESOURCE_BUILDING_KEYS = [
  'metal_mine',
  'crystal_mine',
  'deuterium_synthesizer',
  'solar_plant',
  'fusion_reactor',
  'metal_storage',
  'crystal_storage',
  'deuterium_tank',
]

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`
  return Math.floor(num).toLocaleString()
}

export function ResourcesWindowContent() {
  const { currentPlanet, user } = useGameStore()
  const [buildings, setBuildings] = useState<BuildingDefinition[]>([])
  const [isQueueBusy, setIsQueueBusy] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Load buildings from config
  useEffect(() => {
    const config = GameConfigService.getInstance()

    // Filter to resource buildings
    const resourceBuildings = RESOURCE_BUILDING_KEYS
      .map(key => config.getBuildingByKey(key))
      .filter((b): b is BuildingDefinition => b !== undefined)

    setBuildings(resourceBuildings)
  }, [])

  const handleUpgradeStart = useCallback(() => {
    setIsQueueBusy(true)
    setRefreshKey(k => k + 1)
  }, [])

  const handleQueueComplete = useCallback(() => {
    setIsQueueBusy(false)
    setRefreshKey(k => k + 1)
    if (currentPlanet) {
      BuildingService.processFinishedBuildings(currentPlanet.id)
    }
  }, [currentPlanet])

  // Get current level for a building
  const getBuildingLevel = (key: string): number => {
    if (!currentPlanet) return 0
    return (currentPlanet as unknown as Record<string, number>)[key] || 0
  }

  if (!currentPlanet || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Resource Display */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">Metal</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {formatNumber(currentPlanet.metal)}
          </div>
          <div className="text-xs text-green-400">
            +{formatNumber(currentPlanet.metal_per_hour || 0)}/h
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">Crystal</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {formatNumber(currentPlanet.crystal)}
          </div>
          <div className="text-xs text-green-400">
            +{formatNumber(currentPlanet.crystal_per_hour || 0)}/h
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">Deuterium</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {formatNumber(currentPlanet.deuterium)}
          </div>
          <div className="text-xs text-green-400">
            +{formatNumber(currentPlanet.deuterium_per_hour || 0)}/h
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">Energy</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {formatNumber((currentPlanet.energy_max || 0) - (currentPlanet.energy_used || 0))}
          </div>
          <div className={`text-xs ${((currentPlanet.energy_max || 0) - (currentPlanet.energy_used || 0)) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatNumber(currentPlanet.energy_used || 0)} / {formatNumber(currentPlanet.energy_max || 0)}
          </div>
        </div>
      </div>

      {/* Building Queue */}
      <BuildingQueue
        key={refreshKey}
        planetId={currentPlanet.id}
        onComplete={handleQueueComplete}
      />

      {/* Building Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {buildings.map(building => (
          <BuildingCard
            key={building.id}
            building={building}
            currentLevel={getBuildingLevel(building.key)}
            planetId={currentPlanet.id}
            onUpgradeStart={handleUpgradeStart}
            isQueueBusy={isQueueBusy}
          />
        ))}
      </div>

      {buildings.length === 0 && (
        <div className="text-center text-slate-400 py-8">
          <p>No buildings configured.</p>
        </div>
      )}
    </div>
  )
}

export function ResourcesWindow() {
  return (
    <ManagedWindow
      id="resources"
      title="Resources & Production"
      icon="M"
      defaultPosition={{ x: 80, y: 100 }}
      defaultSize={{ width: 600, height: 500 }}
      minWidth={400}
      minHeight={300}
      maxWidth={900}
      maxHeight={700}
    >
      <ResourcesWindowContent />
    </ManagedWindow>
  )
}
