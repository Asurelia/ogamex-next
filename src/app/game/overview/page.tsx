'use client'

import { useGameStore } from '@/stores/gameStore'
import { formatNumber, formatDuration } from '@/game/formulas'
import { BUILDINGS } from '@/game/constants'

export default function OverviewPage() {
  const { currentPlanet, buildingQueue, researchQueue, fleetMissions } = useGameStore()

  if (!currentPlanet) {
    return <div className="text-ogame-text-muted">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ogame-text-header">Overview</h1>
        <div className="text-ogame-text-muted">
          {currentPlanet.name} [{currentPlanet.galaxy}:{currentPlanet.system}:{currentPlanet.position}]
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Planet Info */}
        <div className="ogame-panel">
          <div className="ogame-panel-header">Planet Information</div>
          <div className="ogame-panel-content">
            <div className="flex gap-6">
              {/* Planet image */}
              <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center">
                <span className="text-6xl">🌍</span>
              </div>

              {/* Planet details */}
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <span className="text-ogame-text-muted">Diameter:</span>
                  <span>{formatNumber(currentPlanet.diameter)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ogame-text-muted">Temperature:</span>
                  <span>{currentPlanet.temp_min}°C to {currentPlanet.temp_max}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ogame-text-muted">Fields:</span>
                  <span>
                    {currentPlanet.fields_used} / {currentPlanet.fields_max}
                    <span className="text-ogame-text-muted ml-1">
                      ({currentPlanet.fields_max - currentPlanet.fields_used} free)
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ogame-text-muted">Coordinates:</span>
                  <span>[{currentPlanet.galaxy}:{currentPlanet.system}:{currentPlanet.position}]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ogame-text-muted">Type:</span>
                  <span className="capitalize">{currentPlanet.planet_type}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resources Production */}
        <div className="ogame-panel">
          <div className="ogame-panel-header">Resource Production</div>
          <div className="ogame-panel-content">
            <table className="ogame-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th className="text-right">Per Hour</th>
                  <th className="text-right">Per Day</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="resource-metal">Metal</td>
                  <td className="text-right">{formatNumber(currentPlanet.metal_per_hour)}</td>
                  <td className="text-right">{formatNumber(currentPlanet.metal_per_hour * 24)}</td>
                </tr>
                <tr>
                  <td className="resource-crystal">Crystal</td>
                  <td className="text-right">{formatNumber(currentPlanet.crystal_per_hour)}</td>
                  <td className="text-right">{formatNumber(currentPlanet.crystal_per_hour * 24)}</td>
                </tr>
                <tr>
                  <td className="resource-deuterium">Deuterium</td>
                  <td className="text-right">{formatNumber(currentPlanet.deuterium_per_hour)}</td>
                  <td className="text-right">{formatNumber(currentPlanet.deuterium_per_hour * 24)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Building Queue */}
        <div className="ogame-panel">
          <div className="ogame-panel-header">Building Queue</div>
          <div className="ogame-panel-content">
            {buildingQueue.length === 0 ? (
              <p className="text-ogame-text-muted text-center py-4">No buildings in queue</p>
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
                          Level {item.target_level}
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
          <div className="ogame-panel-header">Research Queue</div>
          <div className="ogame-panel-content">
            {researchQueue.length === 0 ? (
              <p className="text-ogame-text-muted text-center py-4">No research in progress</p>
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
                          Level {item.target_level}
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
          <div className="ogame-panel-header">Fleet Movements</div>
          <div className="ogame-panel-content">
            {fleetMissions.length === 0 ? (
              <p className="text-ogame-text-muted text-center py-4">No active fleet missions</p>
            ) : (
              <table className="ogame-table">
                <thead>
                  <tr>
                    <th>Mission</th>
                    <th>Origin</th>
                    <th>Destination</th>
                    <th>Status</th>
                    <th className="text-right">Arrives In</th>
                  </tr>
                </thead>
                <tbody>
                  {fleetMissions.map((mission) => {
                    const arrivesAt = new Date(mission.arrives_at)
                    const now = new Date()
                    const remaining = Math.max(0, Math.floor((arrivesAt.getTime() - now.getTime()) / 1000))

                    return (
                      <tr key={mission.id}>
                        <td className="capitalize">{mission.mission_type.replace('_', ' ')}</td>
                        <td>[{mission.origin_galaxy}:{mission.origin_system}:{mission.origin_position}]</td>
                        <td>[{mission.destination_galaxy}:{mission.destination_system}:{mission.destination_position}]</td>
                        <td>
                          <span className={`ogame-badge ${mission.is_returning ? 'ogame-badge-warning' : 'ogame-badge-info'}`}>
                            {mission.is_returning ? 'Returning' : 'Outbound'}
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
