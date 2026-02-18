'use client'

/**
 * FleetWindow - Draggable window for fleet management and missions
 */

import { useState, useEffect, useMemo } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { GameConfigService } from '@/lib/game/GameConfigService'
import type { ShipDefinition } from '@/lib/game/constants'
import { ManagedWindow } from '../WindowManager'

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`
  return Math.floor(num).toLocaleString()
}

function formatTimeRemaining(targetDate: Date): string {
  const now = new Date()
  const diff = targetDate.getTime() - now.getTime()
  if (diff <= 0) return 'Arriving...'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

type MissionType = 'attack' | 'transport' | 'colonize' | 'spy' | 'recycle' | 'expedition'

interface MissionConfig {
  key: MissionType
  name: string
  description: string
  color: string
}

const MISSION_TYPES: MissionConfig[] = [
  { key: 'attack', name: 'Attack', description: 'Attack an enemy planet', color: 'text-red-400' },
  { key: 'transport', name: 'Transport', description: 'Send resources to another planet', color: 'text-blue-400' },
  { key: 'colonize', name: 'Colonize', description: 'Colonize a new planet', color: 'text-green-400' },
  { key: 'spy', name: 'Espionage', description: 'Spy on an enemy', color: 'text-purple-400' },
  { key: 'recycle', name: 'Harvest', description: 'Collect debris field', color: 'text-yellow-400' },
  { key: 'expedition', name: 'Expedition', description: 'Explore the unknown', color: 'text-cyan-400' },
]

export function FleetWindowContent() {
  const { currentPlanet, user, fleetMissions } = useGameStore()
  const [ships, setShips] = useState<ShipDefinition[]>([])
  const [selectedShips, setSelectedShips] = useState<Record<string, number>>({})
  const [targetCoords, setTargetCoords] = useState({ galaxy: 1, system: 1, position: 1 })
  const [selectedMission, setSelectedMission] = useState<MissionType>('attack')
  const [resources, setResources] = useState({ metal: 0, crystal: 0, deuterium: 0 })
  const [view, setView] = useState<'fleet' | 'missions'>('fleet')

  // Load ships from config
  useEffect(() => {
    const config = GameConfigService.getInstance()
    const shipsRecord = config.getShips()
    // Convert record to array
    const allShips = Object.values(shipsRecord)
    setShips(allShips)
  }, [])

  // Get current ship count
  const getShipCount = (key: string): number => {
    if (!currentPlanet) return 0
    return (currentPlanet as unknown as Record<string, number>)[key] || 0
  }

  // Handle ship selection
  const handleShipSelect = (shipKey: string, count: number) => {
    const maxCount = getShipCount(shipKey)
    setSelectedShips(prev => ({
      ...prev,
      [shipKey]: Math.min(Math.max(0, count), maxCount)
    }))
  }

  // Total selected ships
  const totalSelected = useMemo(() => {
    return Object.values(selectedShips).reduce((a, b) => a + b, 0)
  }, [selectedShips])

  // Active fleet missions
  const activeMissions = fleetMissions.filter(m => !m.processed)

  // Handle mission launch
  const handleLaunch = () => {
    if (totalSelected === 0) return
    console.log('Launching mission:', {
      ships: selectedShips,
      target: targetCoords,
      mission: selectedMission,
      resources,
    })
    // Reset after launch
    setSelectedShips({})
  }

  if (!currentPlanet || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tab navigation */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setView('fleet')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            view === 'fleet'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Send Fleet
        </button>
        <button
          onClick={() => setView('missions')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            view === 'missions'
              ? 'text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Active Missions ({activeMissions.length})
        </button>
      </div>

      {view === 'fleet' ? (
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Ship selection */}
          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
            <h4 className="text-sm font-semibold text-cyan-400 mb-3">Select Ships</h4>
            <div className="space-y-2">
              {ships.map(ship => {
                const available = getShipCount(ship.key)
                if (available === 0) return null
                return (
                  <div key={ship.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white">{ship.name}</span>
                      <span className="text-slate-500 text-sm">({available} available)</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={available}
                      value={selectedShips[ship.key] || 0}
                      onChange={(e) => handleShipSelect(ship.key, parseInt(e.target.value) || 0)}
                      className="w-24 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white text-right"
                    />
                  </div>
                )
              })}
            </div>
            {ships.every(s => getShipCount(s.key) === 0) && (
              <p className="text-slate-400 text-sm text-center py-4">
                No ships available. Build ships in the Shipyard.
              </p>
            )}
          </div>

          {/* Target coordinates */}
          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
            <h4 className="text-sm font-semibold text-cyan-400 mb-3">Target Coordinates</h4>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-slate-400">Galaxy</label>
                <input
                  type="number"
                  min="1"
                  max="9"
                  value={targetCoords.galaxy}
                  onChange={(e) => setTargetCoords(p => ({ ...p, galaxy: parseInt(e.target.value) || 1 }))}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400">System</label>
                <input
                  type="number"
                  min="1"
                  max="499"
                  value={targetCoords.system}
                  onChange={(e) => setTargetCoords(p => ({ ...p, system: parseInt(e.target.value) || 1 }))}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400">Position</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={targetCoords.position}
                  onChange={(e) => setTargetCoords(p => ({ ...p, position: parseInt(e.target.value) || 1 }))}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white"
                />
              </div>
            </div>
          </div>

          {/* Mission type */}
          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
            <h4 className="text-sm font-semibold text-cyan-400 mb-3">Mission Type</h4>
            <div className="grid grid-cols-2 gap-2">
              {MISSION_TYPES.map(mission => (
                <button
                  key={mission.key}
                  onClick={() => setSelectedMission(mission.key)}
                  className={`p-2 rounded border text-left transition-colors ${
                    selectedMission === mission.key
                      ? 'border-cyan-500 bg-cyan-900/30'
                      : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                  }`}
                >
                  <div className={`font-medium ${mission.color}`}>{mission.name}</div>
                  <div className="text-xs text-slate-400">{mission.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Resources to send (for transport) */}
          {selectedMission === 'transport' && (
            <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
              <h4 className="text-sm font-semibold text-cyan-400 mb-3">Resources to Send</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400">Metal</label>
                  <input
                    type="number"
                    min="0"
                    value={resources.metal}
                    onChange={(e) => setResources(p => ({ ...p, metal: parseInt(e.target.value) || 0 }))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Crystal</label>
                  <input
                    type="number"
                    min="0"
                    value={resources.crystal}
                    onChange={(e) => setResources(p => ({ ...p, crystal: parseInt(e.target.value) || 0 }))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Deuterium</label>
                  <input
                    type="number"
                    min="0"
                    value={resources.deuterium}
                    onChange={(e) => setResources(p => ({ ...p, deuterium: parseInt(e.target.value) || 0 }))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Launch button */}
          <button
            onClick={handleLaunch}
            disabled={totalSelected === 0}
            className={`w-full py-3 rounded-lg font-bold text-lg transition-colors ${
              totalSelected > 0
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            Launch Fleet ({totalSelected} ships)
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          {activeMissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-4">F</div>
              <h3 className="text-xl font-bold text-white mb-2">No Active Missions</h3>
              <p className="text-slate-400">
                All your fleets are stationed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeMissions.map(mission => (
                <div
                  key={mission.id}
                  className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`font-medium ${
                        mission.mission_type === 'attack' ? 'text-red-400' :
                        mission.mission_type === 'transport' ? 'text-blue-400' :
                        mission.mission_type === 'espionage' ? 'text-purple-400' :
                        'text-cyan-400'
                      }`}>
                        {mission.mission_type.toUpperCase()}
                      </span>
                      {mission.is_returning && (
                        <span className="ml-2 text-xs text-yellow-400">(Returning)</span>
                      )}
                    </div>
                    <span className="text-sm text-slate-400">
                      {formatTimeRemaining(new Date(mission.arrives_at))}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300">
                    [{mission.origin_galaxy}:{mission.origin_system}:{mission.origin_position}] &rarr; [{mission.destination_galaxy}:{mission.destination_system}:{mission.destination_position}]
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function FleetWindow() {
  return (
    <ManagedWindow
      id="fleet"
      title="Fleet Command"
      icon="F"
      defaultPosition={{ x: 240, y: 180 }}
      defaultSize={{ width: 500, height: 600 }}
      minWidth={400}
      minHeight={400}
      maxWidth={800}
      maxHeight={800}
    >
      <FleetWindowContent />
    </ManagedWindow>
  )
}
