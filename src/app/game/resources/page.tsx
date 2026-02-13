'use client'

import { useGameStore } from '@/stores/gameStore'
import { BuildingCard } from '@/components/game/BuildingCard'
import { BUILDINGS } from '@/game/constants'

// Resource buildings IDs
const RESOURCE_BUILDING_IDS = [1, 2, 3, 4, 5, 6, 7, 8] // Metal Mine, Crystal Mine, Deut Synth, Solar, Fusion, Storages

export default function ResourcesPage() {
  const { currentPlanet } = useGameStore()

  if (!currentPlanet) {
    return <div className="text-ogame-text-muted">Loading...</div>
  }

  const resourceBuildings = RESOURCE_BUILDING_IDS
    .map(id => BUILDINGS[id])
    .filter(Boolean)

  // Get building levels from planet
  const getBuildingLevel = (key: string): number => {
    return (currentPlanet as unknown as Record<string, number>)[key] || 0
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ogame-text-header">Resources</h1>
        <div className="text-ogame-text-muted">
          Manage your resource production
        </div>
      </div>

      {/* Production summary */}
      <div className="ogame-panel">
        <div className="ogame-panel-header">Production Summary</div>
        <div className="ogame-panel-content">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <img src="/img/objects/buildings/metal_mine_micro.jpg" alt="Metal Mine" className="w-10 h-10 mx-auto mb-1 rounded" />
              <div className="text-ogame-text-header font-semibold">Metal Mine</div>
              <div className="text-ogame-accent">Level {currentPlanet.metal_mine}</div>
            </div>
            <div className="text-center">
              <img src="/img/objects/buildings/crystal_mine_micro.jpg" alt="Crystal Mine" className="w-10 h-10 mx-auto mb-1 rounded" />
              <div className="text-ogame-text-header font-semibold">Crystal Mine</div>
              <div className="text-ogame-accent">Level {currentPlanet.crystal_mine}</div>
            </div>
            <div className="text-center">
              <img src="/img/objects/buildings/deuterium_synthesizer_micro.jpg" alt="Deuterium Synthesizer" className="w-10 h-10 mx-auto mb-1 rounded" />
              <div className="text-ogame-text-header font-semibold">Deut. Synth</div>
              <div className="text-ogame-accent">Level {currentPlanet.deuterium_synthesizer}</div>
            </div>
            <div className="text-center">
              <img src="/img/objects/buildings/solar_plant_micro.jpg" alt="Solar Plant" className="w-10 h-10 mx-auto mb-1 rounded" />
              <div className="text-ogame-text-header font-semibold">Energy</div>
              <div className={currentPlanet.energy_max - currentPlanet.energy_used >= 0 ? 'text-ogame-positive' : 'text-ogame-negative'}>
                {currentPlanet.energy_max - currentPlanet.energy_used} / {currentPlanet.energy_max}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Building cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {resourceBuildings.map((building) => (
          <BuildingCard
            key={building.id}
            building={building}
            currentLevel={getBuildingLevel(building.key)}
            robotFactoryLevel={currentPlanet.robot_factory}
            naniteFactoryLevel={currentPlanet.nanite_factory}
          />
        ))}
      </div>
    </div>
  )
}
