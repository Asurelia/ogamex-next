'use client'

import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { BuildingCard } from '@/components/game/BuildingCard'
import { BUILDINGS } from '@/game/constants'

// Facility buildings IDs
const FACILITY_BUILDING_IDS = [9, 10, 11, 12, 13, 14, 15, 16] // Robot, Nanite, Shipyard, Lab, Terraformer, Alliance Depot, Silo, Space Dock

export default function FacilitiesPage() {
  const { currentPlanet } = useGameStore()
  const t = useTranslations('facilities')
  const tBuildings = useTranslations('buildings')
  const tCommon = useTranslations('common')

  if (!currentPlanet) {
    return <div className="text-ogame-text-muted">{tCommon('loading')}</div>
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
        <h1 className="text-2xl font-bold text-ogame-text-header">{t('title')}</h1>
        <div className="text-ogame-text-muted">
          {t('subtitle')}
        </div>
      </div>

      {/* Facility overview */}
      <div className="ogame-panel">
        <div className="ogame-panel-header">{t('keyFacilities')}</div>
        <div className="ogame-panel-content">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <img src="/img/objects/buildings/robot_factory_micro.jpg" alt={tBuildings('robotFactory')} className="w-10 h-10 mx-auto mb-1 rounded" />
              <div className="text-ogame-text-header font-semibold">{tBuildings('robotFactory')}</div>
              <div className="text-ogame-accent">{tCommon('level')} {currentPlanet.robot_factory}</div>
            </div>
            <div className="text-center">
              <img src="/img/objects/buildings/nanite_factory_micro.jpg" alt={tBuildings('naniteFactory')} className="w-10 h-10 mx-auto mb-1 rounded" />
              <div className="text-ogame-text-header font-semibold">{tBuildings('naniteFactory')}</div>
              <div className="text-ogame-accent">{tCommon('level')} {currentPlanet.nanite_factory}</div>
            </div>
            <div className="text-center">
              <img src="/img/objects/buildings/shipyard_micro.jpg" alt={tBuildings('shipyard')} className="w-10 h-10 mx-auto mb-1 rounded" />
              <div className="text-ogame-text-header font-semibold">{tBuildings('shipyard')}</div>
              <div className="text-ogame-accent">{tCommon('level')} {currentPlanet.shipyard}</div>
            </div>
            <div className="text-center">
              <img src="/img/objects/buildings/research_lab_micro.jpg" alt={tBuildings('researchLab')} className="w-10 h-10 mx-auto mb-1 rounded" />
              <div className="text-ogame-text-header font-semibold">{tBuildings('researchLab')}</div>
              <div className="text-ogame-accent">{tCommon('level')} {currentPlanet.research_lab}</div>
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
