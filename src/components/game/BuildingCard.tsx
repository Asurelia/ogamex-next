'use client'

import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import { calculateBuildingCost, calculateBuildingTime, formatNumber, formatDuration } from '@/game/formulas'
import type { BuildingDefinition } from '@/game/constants'

interface BuildingCardProps {
  building: BuildingDefinition
  currentLevel: number
  robotFactoryLevel: number
  naniteFactoryLevel: number
  universeSpeed?: number
}

export function BuildingCard({
  building,
  currentLevel,
  robotFactoryLevel,
  naniteFactoryLevel,
  universeSpeed = 1,
}: BuildingCardProps) {
  const { currentPlanet, buildingQueue, setBuildingQueue, updatePlanetResources } = useGameStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextLevel = currentLevel + 1
  const cost = calculateBuildingCost(building.id, nextLevel)
  const time = calculateBuildingTime(
    cost.metal,
    cost.crystal,
    robotFactoryLevel,
    naniteFactoryLevel,
    universeSpeed,
    building.key === 'nanite_factory'
  )

  const canAfford = currentPlanet &&
    currentPlanet.metal >= cost.metal &&
    currentPlanet.crystal >= cost.crystal &&
    currentPlanet.deuterium >= cost.deuterium

  const isInQueue = buildingQueue.some(q => q.building_id === building.id)
  const queueFull = buildingQueue.length >= 5

  const handleBuild = async () => {
    if (!currentPlanet || !canAfford || isInQueue || queueFull) return

    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()

      // Deduct resources
      const newResources = {
        metal: currentPlanet.metal - cost.metal,
        crystal: currentPlanet.crystal - cost.crystal,
        deuterium: currentPlanet.deuterium - cost.deuterium,
      }

      const { error: updateError } = await supabase
        .from('planets')
        .update(newResources)
        .eq('id', currentPlanet.id)

      if (updateError) throw updateError

      // Update local state immediately
      updatePlanetResources(currentPlanet.id, newResources)

      // Add to queue
      const now = new Date()
      const endsAt = new Date(now.getTime() + time * 1000)

      const { data: newQueueItem, error: queueError } = await supabase
        .from('building_queue')
        .insert({
          planet_id: currentPlanet.id,
          building_id: building.id,
          target_level: nextLevel,
          metal_cost: cost.metal,
          crystal_cost: cost.crystal,
          deuterium_cost: cost.deuterium,
          started_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
        })
        .select()
        .single()

      if (queueError) throw queueError

      if (newQueueItem) {
        setBuildingQueue([...buildingQueue, newQueueItem])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start building'
      setError(message)
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ogame-panel">
      <div className="ogame-panel-content">
        {error && (
          <div className="mb-3 p-2 bg-red-900/50 border border-red-500 rounded-sm text-red-200 text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-4">
          {/* Building image placeholder */}
          <div className="w-24 h-24 rounded-sm bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0">
            <span className="text-4xl">{getBuildingEmoji(building.key)}</span>
          </div>

          {/* Building info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-ogame-text-header font-semibold">
                {building.name}
              </h3>
              <span className="text-ogame-accent font-bold">
                Level {currentLevel}
              </span>
            </div>

            <p className="text-ogame-text-muted text-sm mb-3 line-clamp-2">
              {getBuildingDescription(building.key)}
            </p>

            {/* Cost */}
            <div className="flex flex-wrap gap-3 mb-3 text-sm">
              <span className={cost.metal <= (currentPlanet?.metal || 0) ? 'resource-metal' : 'text-ogame-negative'}>
                Metal: {formatNumber(cost.metal)}
              </span>
              <span className={cost.crystal <= (currentPlanet?.crystal || 0) ? 'resource-crystal' : 'text-ogame-negative'}>
                Crystal: {formatNumber(cost.crystal)}
              </span>
              {cost.deuterium > 0 && (
                <span className={cost.deuterium <= (currentPlanet?.deuterium || 0) ? 'resource-deuterium' : 'text-ogame-negative'}>
                  Deuterium: {formatNumber(cost.deuterium)}
                </span>
              )}
            </div>

            {/* Time and button */}
            <div className="flex items-center justify-between">
              <span className="text-ogame-text-muted text-sm">
                Build time: <span className="countdown">{formatDuration(time)}</span>
              </span>

              <button
                onClick={handleBuild}
                disabled={!canAfford || isInQueue || queueFull || loading}
                className="ogame-button-primary text-sm px-3 py-1"
              >
                {loading ? 'Building...' : isInQueue ? 'In Queue' : queueFull ? 'Queue Full' : `Upgrade to ${nextLevel}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getBuildingEmoji(key: string): string {
  const emojis: Record<string, string> = {
    metal_mine: '⛏️',
    crystal_mine: '💎',
    deuterium_synthesizer: '🧪',
    solar_plant: '☀️',
    fusion_plant: '⚛️',
    metal_storage: '🏭',
    crystal_storage: '💠',
    deuterium_tank: '🛢️',
    robot_factory: '🤖',
    nanite_factory: '🔬',
    shipyard: '🚀',
    research_lab: '🔭',
    terraformer: '🌍',
    alliance_depot: '🏢',
    missile_silo: '🎯',
    space_dock: '🛸',
    lunar_base: '🌙',
    sensor_phalanx: '📡',
    jump_gate: '🌀',
  }
  return emojis[key] || '🏗️'
}

function getBuildingDescription(key: string): string {
  const descriptions: Record<string, string> = {
    metal_mine: 'Extracts metal ore from the planet surface. Metal is the most basic resource.',
    crystal_mine: 'Mines crystal deposits. Crystal is essential for electronics and alloys.',
    deuterium_synthesizer: 'Synthesizes deuterium from heavy hydrogen. Essential for fuel and research.',
    solar_plant: 'Generates energy from solar radiation to power your mines and facilities.',
    fusion_plant: 'Advanced power plant using nuclear fusion. Consumes deuterium for energy.',
    metal_storage: 'Increases maximum metal storage capacity.',
    crystal_storage: 'Increases maximum crystal storage capacity.',
    deuterium_tank: 'Increases maximum deuterium storage capacity.',
    robot_factory: 'Produces robots that speed up construction of buildings.',
    nanite_factory: 'Produces nanites for extremely fast construction and ship building.',
    shipyard: 'Constructs ships and defensive structures.',
    research_lab: 'Enables research of new technologies.',
    terraformer: 'Increases usable planet surface area.',
    alliance_depot: 'Allows alliance members to provide defensive support.',
    missile_silo: 'Stores and launches interplanetary missiles.',
    space_dock: 'Allows fleet repairs without consuming resources.',
    lunar_base: 'Provides living space on moons.',
    sensor_phalanx: 'Scans solar systems for enemy fleet movements.',
    jump_gate: 'Enables instant fleet transport between moons.',
  }
  return descriptions[key] || 'A building that enhances your colony.'
}
