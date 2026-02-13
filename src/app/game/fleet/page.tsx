'use client'

import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import {
  formatNumber,
  formatDuration,
  calculateDistance,
  calculateFleetDuration,
  getSlowestShipSpeed,
  calculateFuelConsumption
} from '@/game/formulas'
import { SHIPS } from '@/game/constants'
import type { FleetMission, MissionType } from '@/types/database'

type FleetStep = 'select' | 'destination' | 'mission' | 'confirm'

export default function FleetPage() {
  const { currentPlanet, fleetMissions, setFleetMissions, updatePlanetResources, research, user } = useGameStore()
  const [step, setStep] = useState<FleetStep>('select')
  const [selectedShips, setSelectedShips] = useState<Record<number, number>>({})
  const [destination, setDestination] = useState({ galaxy: 1, system: 1, position: 1, type: 'planet' as 'planet' | 'moon' })
  const [missionType, setMissionType] = useState<string>('transport')
  const [resources, setResources] = useState({ metal: 0, crystal: 0, deuterium: 0 })
  const [speed, setSpeed] = useState(100)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Calculate fleet info for display
  const getFleetInfo = () => {
    const shipsArray = Object.entries(selectedShips)
      .filter(([_, amount]) => amount > 0)
      .map(([shipId, amount]) => ({ shipId: parseInt(shipId), amount }))

    if (shipsArray.length === 0) return null

    const combustionLevel = research?.combustion_drive ?? 0
    const impulseLevel = research?.impulse_drive ?? 0
    const hyperspaceLevel = research?.hyperspace_drive ?? 0

    const distance = calculateDistance(
      currentPlanet.galaxy, currentPlanet.system, currentPlanet.position,
      destination.galaxy, destination.system, destination.position
    )

    const slowestSpeed = getSlowestShipSpeed(shipsArray, combustionLevel, impulseLevel, hyperspaceLevel)
    const duration = calculateFleetDuration(distance, slowestSpeed, speed, 1)
    const fuel = calculateFuelConsumption(shipsArray, distance, duration, speed)

    return { distance, duration, fuel }
  }

  const sendFleet = async () => {
    if (!currentPlanet || !user) return

    setError(null)
    setSending(true)

    try {
      const supabase = getSupabaseClient()

      // Build ships array for calculations
      const shipsArray = Object.entries(selectedShips)
        .filter(([_, amount]) => amount > 0)
        .map(([shipId, amount]) => ({ shipId: parseInt(shipId), amount }))

      if (shipsArray.length === 0) {
        throw new Error('No ships selected')
      }

      // Get research levels for speed calculation
      const combustionLevel = research?.combustion_drive ?? 0
      const impulseLevel = research?.impulse_drive ?? 0
      const hyperspaceLevel = research?.hyperspace_drive ?? 0

      // Calculate distance and duration
      const distance = calculateDistance(
        currentPlanet.galaxy, currentPlanet.system, currentPlanet.position,
        destination.galaxy, destination.system, destination.position
      )

      const slowestSpeed = getSlowestShipSpeed(shipsArray, combustionLevel, impulseLevel, hyperspaceLevel)
      const duration = calculateFleetDuration(distance, slowestSpeed, speed, 1)
      const fuelCost = calculateFuelConsumption(shipsArray, distance, duration, speed)

      // Check if we have enough deuterium for fuel
      const totalDeuteriumNeeded = (missionType === 'transport' || missionType === 'deployment')
        ? resources.deuterium + fuelCost
        : fuelCost

      if (totalDeuteriumNeeded > currentPlanet.deuterium) {
        throw new Error(`Not enough deuterium. Need ${totalDeuteriumNeeded}, have ${currentPlanet.deuterium}`)
      }

      // Build ship counts for the mission
      const shipCounts: Record<string, number> = {}
      Object.values(SHIPS).forEach(ship => {
        shipCounts[ship.key] = selectedShips[ship.id] || 0
      })

      // Calculate arrival and return times
      const now = new Date()
      const arrivesAt = new Date(now.getTime() + duration * 1000)
      const returnsAt = missionType !== 'deployment'
        ? new Date(now.getTime() + duration * 2 * 1000)
        : null

      // Create fleet mission in database
      const { data: newMission, error: insertError } = await supabase
        .from('fleet_missions')
        .insert({
          user_id: user.id,
          origin_planet_id: currentPlanet.id,
          origin_galaxy: currentPlanet.galaxy,
          origin_system: currentPlanet.system,
          origin_position: currentPlanet.position,
          destination_galaxy: destination.galaxy,
          destination_system: destination.system,
          destination_position: destination.position,
          destination_type: destination.type,
          mission_type: missionType as MissionType,
          // Ships
          light_fighter: shipCounts.light_fighter || 0,
          heavy_fighter: shipCounts.heavy_fighter || 0,
          cruiser: shipCounts.cruiser || 0,
          battleship: shipCounts.battleship || 0,
          battlecruiser: shipCounts.battlecruiser || 0,
          bomber: shipCounts.bomber || 0,
          destroyer: shipCounts.destroyer || 0,
          deathstar: shipCounts.deathstar || 0,
          small_cargo: shipCounts.small_cargo || 0,
          large_cargo: shipCounts.large_cargo || 0,
          colony_ship: shipCounts.colony_ship || 0,
          recycler: shipCounts.recycler || 0,
          espionage_probe: shipCounts.espionage_probe || 0,
          reaper: shipCounts.reaper || 0,
          pathfinder: shipCounts.pathfinder || 0,
          // Resources
          metal: (missionType === 'transport' || missionType === 'deployment') ? resources.metal : 0,
          crystal: (missionType === 'transport' || missionType === 'deployment') ? resources.crystal : 0,
          deuterium: (missionType === 'transport' || missionType === 'deployment') ? resources.deuterium : 0,
          // Timing
          departed_at: now.toISOString(),
          arrives_at: arrivesAt.toISOString(),
          returns_at: returnsAt?.toISOString() ?? null,
          // Status
          is_returning: false,
          processed: false,
          cancelled: false,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Update planet: deduct ships, fuel, and resources
      const planetUpdates: Record<string, number> = {}

      // Deduct ships
      Object.values(SHIPS).forEach(ship => {
        const amount = selectedShips[ship.id] || 0
        if (amount > 0) {
          planetUpdates[ship.key] = getShipCount(ship.key) - amount
        }
      })

      // Deduct resources
      planetUpdates.deuterium = currentPlanet.deuterium - fuelCost
      if (missionType === 'transport' || missionType === 'deployment') {
        planetUpdates.metal = currentPlanet.metal - resources.metal
        planetUpdates.crystal = currentPlanet.crystal - resources.crystal
        planetUpdates.deuterium -= resources.deuterium
      }

      // Save to database
      const { error: updateError } = await supabase
        .from('planets')
        .update(planetUpdates)
        .eq('id', currentPlanet.id)

      if (updateError) throw updateError

      // Update local state
      updatePlanetResources(currentPlanet.id, planetUpdates)
      setFleetMissions([...fleetMissions, newMission])

      // Reset form
      setSelectedShips({})
      setResources({ metal: 0, crystal: 0, deuterium: 0 })
      setStep('select')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send fleet')
    } finally {
      setSending(false)
    }
  }

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
                  onClick={() => setMissionType(m.id)}
                  className={`p-4 rounded-sm border transition-colors ${
                    missionType === m.id
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
            {(missionType === 'transport' || missionType === 'deployment') && (
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
      {step === 'confirm' && (() => {
        const fleetInfo = getFleetInfo()
        return (
          <div className="ogame-panel">
            <div className="ogame-panel-header">Confirm Mission</div>
            <div className="ogame-panel-content">
              {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-ogame-text-muted">Mission:</span>
                  <span className="text-ogame-text-header capitalize">{missionType}</span>
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
                {fleetInfo && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-ogame-text-muted">Distance:</span>
                      <span className="text-ogame-text-header">{formatNumber(fleetInfo.distance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ogame-text-muted">Duration:</span>
                      <span className="text-ogame-text-header">{formatDuration(fleetInfo.duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ogame-text-muted">Fuel:</span>
                      <span className={`${fleetInfo.fuel > currentPlanet.deuterium ? 'text-red-400' : 'resource-deuterium'}`}>
                        {formatNumber(fleetInfo.fuel)}
                      </span>
                    </div>
                  </>
                )}
                {(missionType === 'transport' || missionType === 'deployment') && (resources.metal > 0 || resources.crystal > 0 || resources.deuterium > 0) && (
                  <div className="pt-2 border-t border-ogame-border">
                    <div className="text-ogame-text-muted mb-2">Resources:</div>
                    <div className="flex gap-4 text-sm">
                      <span className="resource-metal">{formatNumber(resources.metal)} M</span>
                      <span className="resource-crystal">{formatNumber(resources.crystal)} C</span>
                      <span className="resource-deuterium">{formatNumber(resources.deuterium)} D</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep('mission')} className="ogame-button" disabled={sending}>
                  Back
                </button>
                <button
                  onClick={sendFleet}
                  disabled={sending || !fleetInfo || fleetInfo.fuel > currentPlanet.deuterium}
                  className="ogame-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending...' : 'Send Fleet'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
                {fleetMissions.map(fm => {
                  const arrivesAt = new Date(fm.arrives_at)
                  const remaining = Math.max(0, Math.floor((arrivesAt.getTime() - Date.now()) / 1000))

                  return (
                    <tr key={fm.id}>
                      <td className="capitalize">{fm.mission_type.replace('_', ' ')}</td>
                      <td>[{fm.destination_galaxy}:{fm.destination_system}:{fm.destination_position}]</td>
                      <td>
                        <span className={`ogame-badge ${fm.is_returning ? 'ogame-badge-warning' : 'ogame-badge-info'}`}>
                          {fm.is_returning ? 'Returning' : 'Outbound'}
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
