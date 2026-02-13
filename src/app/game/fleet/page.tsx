'use client'

import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { formatNumber, formatDuration } from '@/game/formulas'
import { SHIPS } from '@/game/constants'

type FleetStep = 'select' | 'destination' | 'mission' | 'confirm'

export default function FleetPage() {
  const { currentPlanet, fleetMissions } = useGameStore()
  const [step, setStep] = useState<FleetStep>('select')
  const [selectedShips, setSelectedShips] = useState<Record<number, number>>({})
  const [destination, setDestination] = useState({ galaxy: 1, system: 1, position: 1, type: 'planet' as 'planet' | 'moon' })
  const [mission, setMission] = useState<string>('transport')
  const [resources, setResources] = useState({ metal: 0, crystal: 0, deuterium: 0 })
  const [speed, setSpeed] = useState(100)

  if (!currentPlanet) {
    return <div className="text-ogame-text-muted">Loading...</div>
  }

  const getShipCount = (key: string): number => {
    return (currentPlanet as unknown as Record<string, number>)[key] || 0
  }

  const ships = Object.values(SHIPS)
  const availableShips = ships.filter(ship => getShipCount(ship.key) > 0)

  const totalSelected = Object.values(selectedShips).reduce((a, b) => a + b, 0)

  const handleShipChange = (shipId: number, value: number, max: number) => {
    setSelectedShips({
      ...selectedShips,
      [shipId]: Math.max(0, Math.min(value, max)),
    })
  }

  const selectAll = () => {
    const all: Record<number, number> = {}
    ships.forEach(ship => {
      const count = getShipCount(ship.key)
      if (count > 0) all[ship.id] = count
    })
    setSelectedShips(all)
  }

  const selectNone = () => {
    setSelectedShips({})
  }

  const missions = [
    { id: 'attack', label: 'Attack', icon: '⚔️' },
    { id: 'transport', label: 'Transport', icon: '📦' },
    { id: 'deployment', label: 'Deployment', icon: '🏠' },
    { id: 'espionage', label: 'Espionage', icon: '🔍' },
    { id: 'colonization', label: 'Colonize', icon: '🌍' },
    { id: 'recycle', label: 'Recycle', icon: '♻️' },
    { id: 'expedition', label: 'Expedition', icon: '🧭' },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ogame-text-header">Fleet</h1>
        <div className="text-ogame-text-muted">
          Active missions: {fleetMissions.length}
        </div>
      </div>

      {/* Step indicator */}
      <div className="ogame-panel">
        <div className="ogame-panel-content">
          <div className="flex justify-between">
            {(['select', 'destination', 'mission', 'confirm'] as FleetStep[]).map((s, i) => (
              <div
                key={s}
                className={`flex items-center gap-2 ${step === s ? 'text-ogame-accent' : 'text-ogame-text-muted'}`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === s ? 'bg-ogame-accent text-black' : 'bg-ogame-border'
                }`}>
                  {i + 1}
                </span>
                <span className="capitalize hidden sm:inline">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step 1: Select ships */}
      {step === 'select' && (
        <div className="ogame-panel">
          <div className="ogame-panel-header flex justify-between items-center">
            <span>Select Ships</span>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs ogame-button">All</button>
              <button onClick={selectNone} className="text-xs ogame-button">None</button>
            </div>
          </div>
          <div className="ogame-panel-content">
            {availableShips.length === 0 ? (
              <p className="text-ogame-text-muted text-center py-4">No ships available</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {availableShips.map(ship => {
                  const max = getShipCount(ship.key)
                  const selected = selectedShips[ship.id] || 0

                  return (
                    <div key={ship.id} className="flex items-center gap-3 p-2 bg-ogame-border/30 rounded-sm">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-700 to-blue-900 rounded-sm flex items-center justify-center">
                        <span className="text-xl">{getShipEmoji(ship.key)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-ogame-text-header truncate">{ship.name}</div>
                        <div className="text-xs text-ogame-text-muted">Available: {max}</div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={max}
                        value={selected || ''}
                        onChange={(e) => handleShipChange(ship.id, parseInt(e.target.value) || 0, max)}
                        className="ogame-input w-16 text-sm"
                      />
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-4 flex justify-between items-center">
              <span className="text-ogame-text-muted">
                Selected: {totalSelected} ships
              </span>
              <button
                onClick={() => setStep('destination')}
                disabled={totalSelected === 0}
                className="ogame-button-primary"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Destination */}
      {step === 'destination' && (
        <div className="ogame-panel">
          <div className="ogame-panel-header">Destination</div>
          <div className="ogame-panel-content">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-ogame-text-muted text-sm mb-1">Galaxy</label>
                <input
                  type="number"
                  min="1"
                  max="9"
                  value={destination.galaxy}
                  onChange={(e) => setDestination({ ...destination, galaxy: parseInt(e.target.value) || 1 })}
                  className="ogame-input w-full"
                />
              </div>
              <div>
                <label className="block text-ogame-text-muted text-sm mb-1">System</label>
                <input
                  type="number"
                  min="1"
                  max="499"
                  value={destination.system}
                  onChange={(e) => setDestination({ ...destination, system: parseInt(e.target.value) || 1 })}
                  className="ogame-input w-full"
                />
              </div>
              <div>
                <label className="block text-ogame-text-muted text-sm mb-1">Position</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={destination.position}
                  onChange={(e) => setDestination({ ...destination, position: parseInt(e.target.value) || 1 })}
                  className="ogame-input w-full"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-ogame-text-muted text-sm mb-1">Target Type</label>
              <select
                value={destination.type}
                onChange={(e) => setDestination({ ...destination, type: e.target.value as 'planet' | 'moon' })}
                className="ogame-input w-full"
              >
                <option value="planet">Planet</option>
                <option value="moon">Moon</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-ogame-text-muted text-sm mb-1">Speed: {speed}%</label>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep('select')} className="ogame-button">
                Back
              </button>
              <button onClick={() => setStep('mission')} className="ogame-button-primary">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Mission */}
      {step === 'mission' && (
        <div className="ogame-panel">
          <div className="ogame-panel-header">Mission Type</div>
          <div className="ogame-panel-content">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {missions.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMission(m.id)}
                  className={`p-4 rounded-sm border transition-colors ${
                    mission === m.id
                      ? 'border-ogame-accent bg-ogame-accent/10'
                      : 'border-ogame-border hover:border-ogame-text-muted'
                  }`}
                >
                  <div className="text-2xl mb-1">{m.icon}</div>
                  <div className="text-sm text-ogame-text-header">{m.label}</div>
                </button>
              ))}
            </div>

            {/* Resources to send */}
            {(mission === 'transport' || mission === 'deployment') && (
              <div className="mb-4">
                <h3 className="text-ogame-text-header mb-2">Resources to Send</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm resource-metal mb-1">Metal</label>
                    <input
                      type="number"
                      min="0"
                      max={currentPlanet.metal}
                      value={resources.metal}
                      onChange={(e) => setResources({ ...resources, metal: parseInt(e.target.value) || 0 })}
                      className="ogame-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm resource-crystal mb-1">Crystal</label>
                    <input
                      type="number"
                      min="0"
                      max={currentPlanet.crystal}
                      value={resources.crystal}
                      onChange={(e) => setResources({ ...resources, crystal: parseInt(e.target.value) || 0 })}
                      className="ogame-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm resource-deuterium mb-1">Deuterium</label>
                    <input
                      type="number"
                      min="0"
                      max={currentPlanet.deuterium}
                      value={resources.deuterium}
                      onChange={(e) => setResources({ ...resources, deuterium: parseInt(e.target.value) || 0 })}
                      className="ogame-input w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep('destination')} className="ogame-button">
                Back
              </button>
              <button onClick={() => setStep('confirm')} className="ogame-button-primary">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 'confirm' && (
        <div className="ogame-panel">
          <div className="ogame-panel-header">Confirm Mission</div>
          <div className="ogame-panel-content">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-ogame-text-muted">Mission:</span>
                <span className="text-ogame-text-header capitalize">{mission}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ogame-text-muted">Destination:</span>
                <span className="text-ogame-text-header">
                  [{destination.galaxy}:{destination.system}:{destination.position}] ({destination.type})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ogame-text-muted">Ships:</span>
                <span className="text-ogame-text-header">{totalSelected}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ogame-text-muted">Speed:</span>
                <span className="text-ogame-text-header">{speed}%</span>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep('mission')} className="ogame-button">
                Back
              </button>
              <button className="ogame-button-primary">
                Send Fleet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active missions */}
      {fleetMissions.length > 0 && (
        <div className="ogame-panel">
          <div className="ogame-panel-header">Active Missions</div>
          <div className="ogame-panel-content p-0">
            <table className="ogame-table">
              <thead>
                <tr>
                  <th>Mission</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th className="text-right">Arrival</th>
                </tr>
              </thead>
              <tbody>
                {fleetMissions.map(mission => {
                  const arrivesAt = new Date(mission.arrives_at)
                  const remaining = Math.max(0, Math.floor((arrivesAt.getTime() - Date.now()) / 1000))

                  return (
                    <tr key={mission.id}>
                      <td className="capitalize">{mission.mission_type.replace('_', ' ')}</td>
                      <td>[{mission.destination_galaxy}:{mission.destination_system}:{mission.destination_position}]</td>
                      <td>
                        <span className={`ogame-badge ${mission.returning ? 'ogame-badge-warning' : 'ogame-badge-info'}`}>
                          {mission.returning ? 'Returning' : 'Outbound'}
                        </span>
                      </td>
                      <td className="text-right countdown">{formatDuration(remaining)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function getShipEmoji(key: string): string {
  const emojis: Record<string, string> = {
    light_fighter: '✈️',
    heavy_fighter: '🛩️',
    cruiser: '🚢',
    battleship: '⚓',
    battlecruiser: '🗡️',
    bomber: '💣',
    destroyer: '💀',
    deathstar: '☠️',
    small_cargo: '📦',
    large_cargo: '🚚',
    colony_ship: '🏠',
    recycler: '♻️',
    espionage_probe: '🔍',
    solar_satellite: '🛰️',
    crawler: '🐛',
    reaper: '⚰️',
    pathfinder: '🧭',
  }
  return emojis[key] || '🚀'
}
