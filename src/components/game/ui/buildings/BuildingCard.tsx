'use client'

/**
 * BuildingCard - Card component for building/upgrading structures
 */

import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { BuildingService, BuildingCost } from '@/lib/services/building-service'
import type { BuildingDefinition } from '@/lib/game/constants'

interface BuildingCardProps {
  building: BuildingDefinition
  currentLevel: number
  planetId: string
  onUpgradeStart?: () => void
  isQueueBusy?: boolean
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

export function BuildingCard({
  building,
  currentLevel,
  planetId,
  onUpgradeStart,
  isQueueBusy = false,
}: BuildingCardProps) {
  const { currentPlanet } = useGameStore()
  const [cost, setCost] = useState<BuildingCost | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load cost on mount and level change
  useEffect(() => {
    async function loadCost() {
      setIsLoading(true)
      const result = await BuildingService.getUpgradeCost(planetId, building.id)
      setCost(result)
      setIsLoading(false)
    }
    loadCost()
  }, [planetId, building.id, currentLevel])

  // Check if player can afford
  const canAfford = cost && currentPlanet
    ? currentPlanet.metal >= cost.metal &&
      currentPlanet.crystal >= cost.crystal &&
      currentPlanet.deuterium >= cost.deuterium
    : false

  // Handle upgrade
  const handleUpgrade = useCallback(async () => {
    if (!canAfford || isQueueBusy || isUpgrading) return

    setIsUpgrading(true)
    setError(null)

    const result = await BuildingService.startUpgrade(planetId, building.id)

    if (result.success) {
      onUpgradeStart?.()
    } else {
      setError(result.error || 'Failed to start upgrade')
    }

    setIsUpgrading(false)
  }, [canAfford, isQueueBusy, isUpgrading, planetId, building.id, onUpgradeStart])

  // Building icon based on key
  const getIcon = () => {
    const key = building.key
    if (key.includes('metal')) return '⛏️'
    if (key.includes('crystal')) return '💎'
    if (key.includes('deuterium') || key.includes('synthesizer')) return '🧪'
    if (key.includes('solar') || key.includes('fusion')) return '☀️'
    if (key.includes('storage')) return '📦'
    if (key.includes('robot')) return '🤖'
    if (key.includes('nanite')) return '🔬'
    if (key.includes('shipyard')) return '🚀'
    if (key.includes('research')) return '🔭'
    if (key.includes('alliance')) return '🏛️'
    if (key.includes('missile')) return '🎯'
    if (key.includes('terraformer')) return '🌍'
    if (key.includes('dock')) return '⚓'
    return '🏗️'
  }

  return (
    <div className={`
      relative bg-slate-900/80 border rounded-lg overflow-hidden transition-all
      ${canAfford && !isQueueBusy ? 'border-cyan-600/50 hover:border-cyan-500' : 'border-slate-700/50'}
      ${isQueueBusy ? 'opacity-60' : ''}
    `}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-slate-800/50">
        <span className="text-2xl">{getIcon()}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{building.name}</h3>
          <div className="text-sm text-cyan-400">Level {currentLevel}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Next Level</div>
          <div className="text-lg font-bold text-white">{currentLevel + 1}</div>
        </div>
      </div>

      {/* Cost */}
      {isLoading ? (
        <div className="p-3 text-center text-slate-400">Loading...</div>
      ) : cost ? (
        <div className="p-3 space-y-2">
          {/* Resources */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className={`flex items-center gap-1 ${currentPlanet && currentPlanet.metal >= cost.metal ? 'text-green-400' : 'text-red-400'}`}>
              <span className="text-slate-400">Metal:</span>
              <span className="font-mono">{formatNumber(cost.metal)}</span>
            </div>
            <div className={`flex items-center gap-1 ${currentPlanet && currentPlanet.crystal >= cost.crystal ? 'text-green-400' : 'text-red-400'}`}>
              <span className="text-slate-400">Crystal:</span>
              <span className="font-mono">{formatNumber(cost.crystal)}</span>
            </div>
            <div className={`flex items-center gap-1 ${currentPlanet && currentPlanet.deuterium >= cost.deuterium ? 'text-green-400' : 'text-red-400'}`}>
              <span className="text-slate-400">Deut:</span>
              <span className="font-mono">{formatNumber(cost.deuterium)}</span>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Construction Time:</span>
            <span className="text-yellow-400 font-mono">{formatTime(cost.time)}</span>
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-400 text-xs">{error}</div>
          )}

          {/* Upgrade Button */}
          <button
            onClick={handleUpgrade}
            disabled={!canAfford || isQueueBusy || isUpgrading}
            className={`
              w-full py-2 px-4 rounded font-semibold text-sm uppercase tracking-wide transition-all
              ${canAfford && !isQueueBusy
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {isUpgrading ? 'Starting...' : isQueueBusy ? 'Queue Busy' : !canAfford ? 'Insufficient Resources' : `Upgrade to Level ${currentLevel + 1}`}
          </button>
        </div>
      ) : (
        <div className="p-3 text-center text-red-400">Error loading cost</div>
      )}
    </div>
  )
}

export default BuildingCard
