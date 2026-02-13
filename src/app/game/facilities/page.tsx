'use client'

import { useGameStore } from '@/stores/gameStore'
import { BuildingCard } from '@/components/game/BuildingCard'
import { BUILDINGS } from '@/game/constants'

// Facility buildings IDs
const FACILITY_BUILDING_IDS = [9, 10, 11, 12, 13, 14, 15, 16] // Robot, Nanite, Shipyard, Lab, Terraformer, Alliance Depot, Silo, Space Dock

export default function FacilitiesPage() {
  const { currentPlanet } = useGameStore()

  if (!currentPlanet) {
    return <div className="text-ogame-text-muted">Loading...</div>
  }

  const facilityBuildings = FACILITY_BUILDING_IDS
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
        <h1 className="text-2xl font-bold text-ogame-text-header">Facilities</h1>
        <div className="text-ogame-text-muted">
          Build infrastructure for your colony
        </div>
      </div>

      {/* Facility overview */}
      <div className="ogame-panel">
        <div className="ogame-panel-header">Key Facilities</div>
        <div className="ogame-panel-content">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-1">🤖</div>
              <div className="text-ogame-text-header font-semibold">Robot Factory</div>
              <div className="text-ogame-accent">Level {currentPlanet.robot_factory}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🔬</div>
              <div className="text-ogame-text-header font-semibold">Nanite Factory</div>
              <div className="text-ogame-accent">Level {currentPlanet.nanite_factory}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🚀</div>
              <div className="text-ogame-text-header font-semibold">Shipyard</div>
              <div className="text-ogame-accent">Level {currentPlanet.shipyard}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🔭</div>
              <div className="text-ogame-text-header font-semibold">Research Lab</div>
              <div className="text-ogame-accent">Level {currentPlanet.research_lab}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Building cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {facilityBuildings.map((building) => (
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
