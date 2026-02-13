'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('buildings')
  const tCommon = useTranslations('common')

  // Convert key like 'metal_mine' to translation key like 'metalMine'
  const getTranslationKey = (key: string): string => {
    return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  }

  const translationKey = getTranslationKey(building.key)
  const buildingName = t(translationKey as any) || building.name
  const buildingDesc = t(`${translationKey}Desc` as any) || ''

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
          {/* Building image */}
          <div className="w-24 h-24 rounded-sm overflow-hidden flex-shrink-0">
            <img
              src={getBuildingImage(building.key)}
              alt={buildingName}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Building info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-ogame-text-header font-semibold">
                {buildingName}
              </h3>
              <span className="text-ogame-accent font-bold">
                {tCommon('level')} {currentLevel}
              </span>
            </div>

            <p className="text-ogame-text-muted text-sm mb-3 line-clamp-2">
              {buildingDesc}
            </p>

            {/* Cost */}
            <div className="flex flex-wrap gap-3 mb-3 text-sm">
              <span className={cost.metal <= (currentPlanet?.metal || 0) ? 'resource-metal' : 'text-ogame-negative'}>
                {tCommon('metal')}: {formatNumber(cost.metal)}
              </span>
              <span className={cost.crystal <= (currentPlanet?.crystal || 0) ? 'resource-crystal' : 'text-ogame-negative'}>
                {tCommon('crystal')}: {formatNumber(cost.crystal)}
              </span>
              {cost.deuterium > 0 && (
                <span className={cost.deuterium <= (currentPlanet?.deuterium || 0) ? 'resource-deuterium' : 'text-ogame-negative'}>
                  {tCommon('deuterium')}: {formatNumber(cost.deuterium)}
                </span>
              )}
            </div>

            {/* Time and button */}
            <div className="flex items-center justify-between">
              <span className="text-ogame-text-muted text-sm">
                {tCommon('buildTime')}: <span className="countdown">{formatDuration(time)}</span>
              </span>

              <button
                onClick={handleBuild}
                disabled={!canAfford || isInQueue || queueFull || loading}
                className="ogame-button-primary text-sm px-3 py-1"
              >
                {loading ? t('building') : isInQueue ? t('inQueue') : queueFull ? t('queueFull') : t('upgradeToLevel', { level: nextLevel })}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getBuildingImage(key: string): string {
  const imageMap: Record<string, string> = {
    metal_mine: 'metal_mine',
    crystal_mine: 'crystal_mine',
    deuterium_synthesizer: 'deuterium_synthesizer',
    solar_plant: 'solar_plant',
    fusion_plant: 'fusion_plant',
    metal_storage: 'metal_store',
    crystal_storage: 'crystal_store',
    deuterium_tank: 'deuterium_store',
    robot_factory: 'robot_factory',
    nanite_factory: 'nanite_factory',
    shipyard: 'shipyard',
    research_lab: 'research_lab',
    terraformer: 'terraformer',
    alliance_depot: 'alliance_depot',
    missile_silo: 'missile_silo',
    space_dock: 'space_dock',
    lunar_base: 'lunar_base',
    sensor_phalanx: 'sensor_phalanx',
    jump_gate: 'jump_gate',
  }
  const imageName = imageMap[key] || key
  return `/img/objects/buildings/${imageName}_small.jpg`
}

