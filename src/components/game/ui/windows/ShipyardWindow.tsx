'use client'

/**
 * ShipyardWindow - Draggable window for ship construction
 */

import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { GameConfigService } from '@/lib/game/GameConfigService'
import type { ShipDefinition } from '@/lib/game/constants'
import { ManagedWindow } from '../WindowManager'

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`
  return Math.floor(num).toLocaleString()
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

interface ShipCardProps {
  ship: ShipDefinition
  currentCount: number
  planetId: string
  onBuildStart: () => void
  isQueueBusy: boolean
}

function ShipCard({ ship, currentCount, planetId, onBuildStart, isQueueBusy }: ShipCardProps) {
  const { currentPlanet } = useGameStore()
  const [buildAmount, setBuildAmount] = useState(1)

  const cost = {
    metal: ship.cost.metal * buildAmount,
    crystal: ship.cost.crystal * buildAmount,
    deuterium: ship.cost.deuterium * buildAmount,
  }

  const canAfford = currentPlanet &&
    currentPlanet.metal >= cost.metal &&
    currentPlanet.crystal >= cost.crystal &&
    currentPlanet.deuterium >= cost.deuterium

  // Estimate build time (base 60 seconds per 1000 resources)
  const baseCost = ship.cost.metal + ship.cost.crystal + ship.cost.deuterium
  const buildTime = Math.floor((baseCost / 1000) * 60 * buildAmount)

  const handleBuild = async () => {
    if (!canAfford || isQueueBusy) return
    // TODO: Call shipyard service
    console.log(`Building ${buildAmount} ${ship.name}`)
    onBuildStart()
  }

  return (
    <div className="bg-slate-800/80 rounded-lg border border-slate-700/50 p-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-white">{ship.name}</h4>
          <p className="text-xs text-slate-400">Owned: {currentCount}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Attack: {ship.weaponPower}</div>
          <div className="text-xs text-slate-400">Shield: {ship.shieldPower}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 text-xs mb-2">
        <div className={cost.metal > (currentPlanet?.metal || 0) ? 'text-red-400' : 'text-slate-300'}>
          M: {formatNumber(cost.metal)}
        </div>
        <div className={cost.crystal > (currentPlanet?.crystal || 0) ? 'text-red-400' : 'text-slate-300'}>
          C: {formatNumber(cost.crystal)}
        </div>
        <div className={cost.deuterium > (currentPlanet?.deuterium || 0) ? 'text-red-400' : 'text-slate-300'}>
          D: {formatNumber(cost.deuterium)}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1"
          max="9999"
          value={buildAmount}
          onChange={(e) => setBuildAmount(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-20 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white"
        />
        <button
          onClick={handleBuild}
          disabled={!canAfford || isQueueBusy}
          className={`
            flex-1 px-3 py-1 rounded text-sm font-medium transition-colors
            ${canAfford && !isQueueBusy
              ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
          `}
        >
          Build ({formatDuration(buildTime)})
        </button>
      </div>
    </div>
  )
}

export function ShipyardWindowContent() {
  const { currentPlanet, user } = useGameStore()
  const [ships, setShips] = useState<ShipDefinition[]>([])
  const [isQueueBusy, setIsQueueBusy] = useState(false)

  // Load ships from config
  useEffect(() => {
    const config = GameConfigService.getInstance()
    const shipsRecord = config.getShips()
    // Convert record to array
    const allShips = Object.values(shipsRecord)
    setShips(allShips)
  }, [])

  const handleBuildStart = useCallback(() => {
    setIsQueueBusy(true)
  }, [])

  // Get current ship count
  const getShipCount = (key: string): number => {
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

  // Check shipyard level
  const shipyardLevel = (currentPlanet as unknown as Record<string, number>)['shipyard'] || 0

  if (shipyardLevel < 1) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-4xl mb-4">S</div>
        <h3 className="text-xl font-bold text-white mb-2">Shipyard Required</h3>
        <p className="text-slate-400">
          Build a Shipyard (level 1) to construct ships.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Shipyard status */}
      <div className="bg-slate-800/60 rounded-lg p-3 border border-cyan-700/30">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">Shipyard Level</span>
          <span className="text-cyan-400 font-bold">{shipyardLevel}</span>
        </div>
      </div>

      {/* Ship Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {ships.map(ship => (
          <ShipCard
            key={ship.id}
            ship={ship}
            currentCount={getShipCount(ship.key)}
            planetId={currentPlanet.id}
            onBuildStart={handleBuildStart}
            isQueueBusy={isQueueBusy}
          />
        ))}
      </div>

      {ships.length === 0 && (
        <div className="text-center text-slate-400 py-8">
          <p>No ships configured.</p>
        </div>
      )}
    </div>
  )
}

export function ShipyardWindow() {
  return (
    <ManagedWindow
      id="shipyard"
      title="Shipyard"
      icon="S"
      defaultPosition={{ x: 120, y: 120 }}
      defaultSize={{ width: 650, height: 500 }}
      minWidth={400}
      minHeight={300}
      maxWidth={900}
      maxHeight={700}
    >
      <ShipyardWindowContent />
    </ManagedWindow>
  )
}
