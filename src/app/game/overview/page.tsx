'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { useGameStore } from '@/stores/gameStore'
import { formatNumber, formatDuration } from '@/game/formulas'
import { BUILDINGS } from '@/game/constants'
import type { SolarSystemPlanet } from '@/components/game/3d/SolarSystemView'
import type { Planet } from '@/types/database'

// Import dynamique du composant 3D (desactive le SSR pour Three.js)
const SolarSystemView = dynamic(
  () => import('@/components/game/3d/SolarSystemView'),
  { ssr: false, loading: () => <SolarSystemViewLoader /> }
)

// Composant de chargement pour la vue 3D
function SolarSystemViewLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <div className="text-ogame-text-muted animate-pulse">
        Loading 3D View...
      </div>
    </div>
  )
}

// Icone Cube pour le mode 3D
function CubeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

// Icone Grid pour le mode 2D
function GridIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

// Types valides pour les planetes 3D
type PlanetVisualType = 'desert' | 'dry' | 'gas' | 'ice' | 'jungle' | 'normal' | 'water'

const VALID_PLANET_TYPES: PlanetVisualType[] = ['desert', 'dry', 'gas', 'ice', 'jungle', 'normal', 'water']

/**
 * Transforme un tableau de Planet (database) en SolarSystemPlanet (3D view)
 */
function transformPlanetsFor3D(planets: Planet[]): SolarSystemPlanet[] {
  return planets.map((planet) => {
    // Derive le type visuel a partir du planet_type de la base
    const visualType = VALID_PLANET_TYPES.includes(planet.planet_type as PlanetVisualType)
      ? (planet.planet_type as PlanetVisualType)
      : 'normal'

    return {
      id: planet.id,
      name: planet.name,
      coordinates: {
        galaxy: planet.galaxy,
        system: planet.system,
        position: planet.position,
      },
      type: visualType,
      variant: ((planet.position - 1) % 10) + 1,
      isMoon: planet.planet_type === 'moon',
    }
  })
}

function getPlanetImage(planetType: string = 'normal', position: number = 1): string {
  const types = ['desert', 'dry', 'gas', 'ice', 'jungle', 'normal', 'water']
  const type = types.includes(planetType) ? planetType : 'normal'
  const variant = ((position - 1) % 10) + 1
  return `/img/planets/medium/${type}_${variant}.png`
}

export default function OverviewPage() {
  const {
    currentPlanet,
    buildingQueue,
    researchQueue,
    fleetMissions,
    planets,
    visualizationMode,
    setVisualizationMode,
    selectPlanet
  } = useGameStore()
  const t = useTranslations('overview')
  const tRes = useTranslations('resources')
  const tFleet = useTranslations('fleet')
  const tCommon = useTranslations('common')
  const tPlanet = useTranslations('planet')

  // Toggle entre les modes de visualisation
  const toggleVisualizationMode = () => {
    setVisualizationMode(visualizationMode === '3d' ? '2d' : '3d')
  }

  // Gestion de la selection de planete dans la vue 3D
  const handlePlanetSelect = (planetId: string) => {
    selectPlanet(planetId)
  }

  // Transforme les planetes pour la vue 3D (memoize pour eviter les re-calculs)
  const solarSystemPlanets = useMemo(
    () => transformPlanetsFor3D(planets),
    [planets]
  )

  if (!currentPlanet) {
    return <div className="text-ogame-text-muted">{tCommon('loading')}</div>
  }

  // Mode 3D : Vue systeme solaire en plein ecran
  if (visualizationMode === '3d') {
    return (
      <div className="relative w-full h-[calc(100vh-120px)] min-h-[600px]">
        {/* Vue 3D du systeme solaire */}
        <SolarSystemView
          planets={solarSystemPlanets}
          selectedPlanetId={currentPlanet.id}
          onPlanetSelect={handlePlanetSelect}
        />

        {/* Bouton flottant pour revenir en mode 2D */}
        <button
          onClick={toggleVisualizationMode}
          className="absolute bottom-6 right-6 z-10 flex items-center gap-2 px-4 py-3
                     bg-ogame-dark/90 border border-ogame-border rounded-lg
                     text-ogame-text-header hover:bg-ogame-accent/20
                     hover:border-ogame-accent transition-all duration-200
                     shadow-lg backdrop-blur-sm"
          title={t('switchTo2D') || 'Switch to 2D view'}
        >
          <GridIcon className="w-5 h-5" />
          <span className="text-sm font-medium">2D</span>
        </button>

        {/* Info planete selectionnee (overlay) */}
        <div className="absolute top-4 left-4 z-10 bg-ogame-dark/90 border border-ogame-border
                        rounded-lg p-4 backdrop-blur-sm max-w-xs">
          <h2 className="text-lg font-bold text-ogame-text-header mb-2">
            {currentPlanet.name}
          </h2>
          <div className="text-sm text-ogame-text-muted space-y-1">
            <p>[{currentPlanet.galaxy}:{currentPlanet.system}:{currentPlanet.position}]</p>
            <p>{t('fields')}: {currentPlanet.fields_used}/{currentPlanet.fields_max}</p>
          </div>
        </div>
      </div>
    )
  }

  // Mode 2D : Vue classique
  return (
    <div className="relative">
      {/* Bouton flottant pour passer en mode 3D */}
      <button
        onClick={toggleVisualizationMode}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3
                   bg-ogame-dark/90 border border-ogame-border rounded-lg
                   text-ogame-text-header hover:bg-ogame-accent/20
                   hover:border-ogame-accent transition-all duration-200
                   shadow-lg backdrop-blur-sm"
        title={t('switchTo3D') || 'Switch to 3D view'}
      >
        <CubeIcon className="w-5 h-5" />
        <span className="text-sm font-medium">3D</span>
      </button>

      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ogame-text-header">{t('title')}</h1>
          <div className="text-ogame-text-muted">
            {currentPlanet.name} [{currentPlanet.galaxy}:{currentPlanet.system}:{currentPlanet.position}]
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Planet Info */}
        <div className="ogame-panel">
          <div className="ogame-panel-header">{t('planetInfo')}</div>
          <div className="ogame-panel-content">
            <div className="flex gap-6">
              {/* Planet image */}
              <div className="w-32 h-32 rounded-lg overflow-hidden">
                <img
                  src={getPlanetImage(currentPlanet.planet_type, currentPlanet.position)}
                  alt={currentPlanet.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Planet details */}
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <span className="text-ogame-text-muted">{t('diameter')}:</span>
                  <span>{formatNumber(currentPlanet.diameter)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ogame-text-muted">{t('temperature')}:</span>
                  <span>{currentPlanet.temp_min}°C - {currentPlanet.temp_max}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ogame-text-muted">{t('fields')}:</span>
                  <span>
                    {currentPlanet.fields_used} / {currentPlanet.fields_max}
                    <span className="text-ogame-text-muted ml-1">
                      ({currentPlanet.fields_max - currentPlanet.fields_used} {t('free')})
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ogame-text-muted">{t('coordinates')}:</span>
                  <span>[{currentPlanet.galaxy}:{currentPlanet.system}:{currentPlanet.position}]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ogame-text-muted">{t('type')}:</span>
                  <span className="capitalize">{tPlanet(`types.${currentPlanet.planet_type}`)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resources Production */}
        <div className="ogame-panel">
          <div className="ogame-panel-header">{t('resourceProduction')}</div>
          <div className="ogame-panel-content">
            <table className="ogame-table">
              <thead>
                <tr>
                  <th>{tRes('production')}</th>
                  <th className="text-right">{tRes('perHour')}</th>
                  <th className="text-right">{t('perDay')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="resource-metal">{tRes('metal')}</td>
                  <td className="text-right">{formatNumber(currentPlanet.metal_per_hour)}</td>
                  <td className="text-right">{formatNumber(currentPlanet.metal_per_hour * 24)}</td>
                </tr>
                <tr>
                  <td className="resource-crystal">{tRes('crystal')}</td>
                  <td className="text-right">{formatNumber(currentPlanet.crystal_per_hour)}</td>
                  <td className="text-right">{formatNumber(currentPlanet.crystal_per_hour * 24)}</td>
                </tr>
                <tr>
                  <td className="resource-deuterium">{tRes('deuterium')}</td>
                  <td className="text-right">{formatNumber(currentPlanet.deuterium_per_hour)}</td>
                  <td className="text-right">{formatNumber(currentPlanet.deuterium_per_hour * 24)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Building Queue */}
        <div className="ogame-panel">
          <div className="ogame-panel-header">{t('buildingQueue')}</div>
          <div className="ogame-panel-content">
            {buildingQueue.length === 0 ? (
              <p className="text-ogame-text-muted text-center py-4">{t('noBuildings')}</p>
            ) : (
              <div className="space-y-3">
                {buildingQueue.map((item, index) => {
                  const building = BUILDINGS[item.building_id]
                  const endsAt = new Date(item.ends_at)
                  const now = new Date()
                  const remaining = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000))

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-sm ${
                        index === 0 ? 'bg-ogame-accent/10 building-in-progress' : 'bg-ogame-border/30'
                      }`}
                    >
                      <div>
                        <span className="text-ogame-text-header">
                          {building?.name || `Building ${item.building_id}`}
                        </span>
                        <span className="text-ogame-text-muted ml-2">
                          {tCommon('level')} {item.target_level}
                        </span>
                      </div>
                      <div className="countdown">
                        {formatDuration(remaining)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Research Queue */}
        <div className="ogame-panel">
          <div className="ogame-panel-header">{t('researchQueue')}</div>
          <div className="ogame-panel-content">
            {researchQueue.length === 0 ? (
              <p className="text-ogame-text-muted text-center py-4">{t('noResearch')}</p>
            ) : (
              <div className="space-y-3">
                {researchQueue.map((item, index) => {
                  const endsAt = new Date(item.ends_at)
                  const now = new Date()
                  const remaining = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000))

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-sm ${
                        index === 0 ? 'bg-ogame-accent/10 building-in-progress' : 'bg-ogame-border/30'
                      }`}
                    >
                      <div>
                        <span className="text-ogame-text-header">
                          Research {item.research_id}
                        </span>
                        <span className="text-ogame-text-muted ml-2">
                          {tCommon('level')} {item.target_level}
                        </span>
                      </div>
                      <div className="countdown">
                        {formatDuration(remaining)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Fleet Movements */}
        <div className="ogame-panel lg:col-span-2">
          <div className="ogame-panel-header">{t('fleetMovements')}</div>
          <div className="ogame-panel-content">
            {fleetMissions.length === 0 ? (
              <p className="text-ogame-text-muted text-center py-4">{t('noFleets')}</p>
            ) : (
              <table className="ogame-table">
                <thead>
                  <tr>
                    <th>{t('mission')}</th>
                    <th>{t('origin')}</th>
                    <th>{tFleet('destination')}</th>
                    <th>{t('status')}</th>
                    <th className="text-right">{tFleet('arrivesIn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {fleetMissions.map((mission) => {
                    const arrivesAt = new Date(mission.arrives_at)
                    const now = new Date()
                    const remaining = Math.max(0, Math.floor((arrivesAt.getTime() - now.getTime()) / 1000))

                    return (
                      <tr key={mission.id}>
                        <td className="capitalize">{tFleet(`missions.${mission.mission_type}`)}</td>
                        <td>[{mission.origin_galaxy}:{mission.origin_system}:{mission.origin_position}]</td>
                        <td>[{mission.destination_galaxy}:{mission.destination_system}:{mission.destination_position}]</td>
                        <td>
                          <span className={`ogame-badge ${mission.is_returning ? 'ogame-badge-warning' : 'ogame-badge-info'}`}>
                            {mission.is_returning ? tFleet('returning') : tFleet('outbound')}
                          </span>
                        </td>
                        <td className="text-right countdown">{formatDuration(remaining)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}
