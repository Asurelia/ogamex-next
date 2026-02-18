'use client'

/**
 * ResearchWindow - Draggable window for research/technology
 */

import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { GameConfigService } from '@/lib/game/GameConfigService'
import type { ResearchDefinition } from '@/lib/game/constants'
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

interface TechCardProps {
  tech: ResearchDefinition
  currentLevel: number
  planetId: string
  onResearchStart: () => void
  isResearching: boolean
}

function TechCard({ tech, currentLevel, planetId, onResearchStart, isResearching }: TechCardProps) {
  const { currentPlanet } = useGameStore()
  const nextLevel = currentLevel + 1

  // Calculate cost for next level
  const factor = Math.pow(tech.priceFactor || 2, currentLevel)
  const cost = {
    metal: Math.floor(tech.baseCost.metal * factor),
    crystal: Math.floor(tech.baseCost.crystal * factor),
    deuterium: Math.floor(tech.baseCost.deuterium * factor),
  }

  const canAfford = currentPlanet &&
    currentPlanet.metal >= cost.metal &&
    currentPlanet.crystal >= cost.crystal &&
    currentPlanet.deuterium >= cost.deuterium

  // Estimate research time (base 60 seconds per 1000 resources)
  const baseCost = cost.metal + cost.crystal + cost.deuterium
  const researchTime = Math.floor((baseCost / 1000) * 60)

  const handleResearch = async () => {
    if (!canAfford || isResearching) return
    // TODO: Call research service
    console.log(`Researching ${tech.name} to level ${nextLevel}`)
    onResearchStart()
  }

  return (
    <div className="bg-slate-800/80 rounded-lg border border-slate-700/50 p-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-white">{tech.name}</h4>
          <p className="text-xs text-slate-400">Research Level {nextLevel}</p>
        </div>
        <div className="bg-purple-900/50 px-2 py-1 rounded text-purple-300 text-sm font-bold">
          Lv. {currentLevel}
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

      <button
        onClick={handleResearch}
        disabled={!canAfford || isResearching}
        className={`
          w-full px-3 py-2 rounded text-sm font-medium transition-colors
          ${canAfford && !isResearching
            ? 'bg-purple-600 hover:bg-purple-500 text-white'
            : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
        `}
      >
        {isResearching ? 'Researching...' : `Research Lv.${nextLevel} (${formatDuration(researchTime)})`}
      </button>
    </div>
  )
}

export function ResearchWindowContent() {
  const { currentPlanet, user } = useGameStore()
  const [technologies, setTechnologies] = useState<ResearchDefinition[]>([])
  const [isResearching, setIsResearching] = useState(false)

  // Load technologies from config
  useEffect(() => {
    const config = GameConfigService.getInstance()
    const researchRecord = config.getResearch()
    // Convert record to array
    const allTechs = Object.values(researchRecord)
    setTechnologies(allTechs)
  }, [])

  const handleResearchStart = useCallback(() => {
    setIsResearching(true)
  }, [])

  // Get current tech level
  const getTechLevel = (key: string): number => {
    if (!user) return 0
    return (user as unknown as Record<string, number>)[key] || 0
  }

  if (!currentPlanet || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  // Check research lab level
  const labLevel = (currentPlanet as unknown as Record<string, number>)['research_lab'] || 0

  if (labLevel < 1) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-4xl mb-4">R</div>
        <h3 className="text-xl font-bold text-white mb-2">Research Lab Required</h3>
        <p className="text-slate-400">
          Build a Research Lab (level 1) to research technologies.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Lab status */}
      <div className="bg-slate-800/60 rounded-lg p-3 border border-purple-700/30">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">Research Lab Level</span>
          <span className="text-purple-400 font-bold">{labLevel}</span>
        </div>
      </div>

      {/* Technology Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {technologies.map(tech => (
          <TechCard
            key={tech.id}
            tech={tech}
            currentLevel={getTechLevel(tech.key)}
            planetId={currentPlanet.id}
            onResearchStart={handleResearchStart}
            isResearching={isResearching}
          />
        ))}
      </div>

      {technologies.length === 0 && (
        <div className="text-center text-slate-400 py-8">
          <p>No technologies configured.</p>
        </div>
      )}
    </div>
  )
}

export function ResearchWindow() {
  return (
    <ManagedWindow
      id="research"
      title="Research"
      icon="R"
      defaultPosition={{ x: 160, y: 140 }}
      defaultSize={{ width: 650, height: 500 }}
      minWidth={400}
      minHeight={300}
      maxWidth={900}
      maxHeight={700}
    >
      <ResearchWindowContent />
    </ManagedWindow>
  )
}
