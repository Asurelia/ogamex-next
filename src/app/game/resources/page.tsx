'use client'

/**
 * Resources Page - Production buildings (Mines, Storage, Energy)
 */

import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { GameConfigService } from '@/lib/game/GameConfigService'
import type { BuildingDefinition } from '@/lib/game/constants'
import { BuildingCard, BuildingQueue } from '@/components/game/ui/buildings'
import { BuildingService } from '@/lib/services/building-service'

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

export default function ResourcesPage() {
  const { currentPlanet, user } = useGameStore()
  const [buildings, setBuildings] = useState<BuildingDefinition[]>([])
  const [isQueueBusy, setIsQueueBusy] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Load buildings from config
  useEffect(() => {
    const config = GameConfigService.getInstance()
    const allBuildings = config.getBuildings()

    // Filter to resource buildings
    const resourceBuildings = RESOURCE_BUILDING_KEYS
      .map(key => config.getBuildingByKey(key))
      .filter((b): b is BuildingDefinition => b !== undefined)

    setBuildings(resourceBuildings)
  }, [])

  // Check if queue is busy
  useEffect(() => {
    async function checkQueue() {
      if (!currentPlanet) return
      // Check via BuildingService or direct query
      // For simplicity, we'll set it based on queue component
    }
    checkQueue()
  }, [currentPlanet, refreshKey])

  const handleUpgradeStart = useCallback(() => {
    setIsQueueBusy(true)
    setRefreshKey(k => k + 1)
  }, [])

  const handleQueueComplete = useCallback(() => {
    setIsQueueBusy(false)
    setRefreshKey(k => k + 1)
    // Process finished buildings
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
    <div className="h-full overflow-auto p-6 bg-gradient-to-b from-slate-900/50 to-slate-950/50">
      {/* Header with current resources */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-4">Resources & Production</h1>

        {/* Resource Display */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-1">
              <span>⛏️</span>
              <span className="text-slate-400 text-sm">Metal</span>
            </div>
            <div className="text-xl font-bold text-white font-mono">
              {formatNumber(currentPlanet.metal)}
            </div>
            <div className="text-xs text-green-400">
              +{formatNumber(currentPlanet.metal_per_hour || 0)}/h
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-1">
              <span>💎</span>
              <span className="text-slate-400 text-sm">Crystal</span>
            </div>
            <div className="text-xl font-bold text-white font-mono">
              {formatNumber(currentPlanet.crystal)}
            </div>
            <div className="text-xs text-green-400">
              +{formatNumber(currentPlanet.crystal_per_hour || 0)}/h
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-1">
              <span>🧪</span>
              <span className="text-slate-400 text-sm">Deuterium</span>
            </div>
            <div className="text-xl font-bold text-white font-mono">
              {formatNumber(currentPlanet.deuterium)}
            </div>
            <div className="text-xs text-green-400">
              +{formatNumber(currentPlanet.deuterium_per_hour || 0)}/h
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-1">
              <span>⚡</span>
              <span className="text-slate-400 text-sm">Energy</span>
            </div>
            <div className="text-xl font-bold text-white font-mono">
              {formatNumber((currentPlanet.energy_max || 0) - (currentPlanet.energy_used || 0))}
            </div>
            <div className={`text-xs ${((currentPlanet.energy_max || 0) - (currentPlanet.energy_used || 0)) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatNumber(currentPlanet.energy_used || 0)} / {formatNumber(currentPlanet.energy_max || 0)}
            </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
        <div className="text-center text-slate-400 py-12">
          <div className="text-4xl mb-4">🏗️</div>
          <p>No buildings configured. Check game_buildings table.</p>
        </div>
      )}
    </div>
  )
}
