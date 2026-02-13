'use client'

import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { formatNumber, formatDuration } from '@/game/formulas'
import { BUILDINGS } from '@/game/constants'

function getPlanetImage(planetType: string = 'normal', position: number = 1): string {
  const types = ['desert', 'dry', 'gas', 'ice', 'jungle', 'normal', 'water']
  const type = types.includes(planetType) ? planetType : 'normal'
  const variant = ((position - 1) % 10) + 1
  return `/img/planets/medium/${type}_${variant}.png`
}

export default function OverviewPage() {
  const { currentPlanet, buildingQueue, researchQueue, fleetMissions } = useGameStore()
  const t = useTranslations('overview')
  const tRes = useTranslations('resources')
  const tFleet = useTranslations('fleet')
  const tCommon = useTranslations('common')
  const tPlanet = useTranslations('planet')

  if (!currentPlanet) {
    return <div className="text-ogame-text-muted">{tCommon('loading')}</div>
  }

  return (
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
  )
}
