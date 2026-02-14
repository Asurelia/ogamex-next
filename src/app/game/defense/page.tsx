'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import { calculateUnitCost, calculateUnitTime, formatNumber, formatDuration } from '@/game/formulas'
import { DEFENSE } from '@/game/constants'

// Convert key like 'rocket_launcher' to translation key like 'rocketLauncher'
const getTranslationKey = (key: string): string => {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

export default function DefensePage() {
  const { currentPlanet, updatePlanetResources } = useGameStore()
  const [amounts, setAmounts] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const t = useTranslations('defense')
  const tCommon = useTranslations('common')

  if (!currentPlanet) {
    return <div className="text-ogame-text-muted">{tCommon('loading')}</div>
  }

  const defenseUnits = Object.values(DEFENSE)

  const getDefenseCount = (key: string): number => {
    return (currentPlanet as unknown as Record<string, number>)[key] || 0
  }

  const handleBuild = async (defenseId: number) => {
    const amount = amounts[defenseId] || 1
    if (amount <= 0) return

    const defense = DEFENSE[defenseId]
    const cost = calculateUnitCost(defenseId, amount, 'defense')

    if (
      currentPlanet.metal < cost.metal ||
      currentPlanet.crystal < cost.crystal ||
      currentPlanet.deuterium < cost.deuterium
    ) {
      return
    }

    setLoading(defenseId)
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

      // Calculate time per unit
      const timePerUnit = calculateUnitTime(
        defense.structuralIntegrity,
        currentPlanet.shipyard,
        currentPlanet.nanite_factory
      )

      const now = new Date()
      const endsAt = new Date(now.getTime() + timePerUnit * amount * 1000)

      // Add to unit queue
      const { error: queueError } = await supabase
        .from('unit_queue')
        .insert({
          planet_id: currentPlanet.id,
          unit_id: defenseId,
          unit_type: 'defense',
          amount: amount,
          amount_completed: 0,
          metal_cost: cost.metal,
          crystal_cost: cost.crystal,
          deuterium_cost: cost.deuterium,
          started_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
        })

      if (queueError) throw queueError

      setAmounts({ ...amounts, [defenseId]: 0 })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to build defense'
      setError(message)
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500 rounded-sm text-red-200">
          {error}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ogame-text-header">{t('title')}</h1>
        <div className="text-ogame-text-muted">
          {t('shipyardLevel')}: {currentPlanet.shipyard}
        </div>
      </div>

      {/* Defense grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {defenseUnits.map((defense) => {
          const amount = amounts[defense.id] || 1
          const cost = calculateUnitCost(defense.id, amount, 'defense')
          const timePerUnit = calculateUnitTime(
            defense.structuralIntegrity,
            currentPlanet.shipyard,
            currentPlanet.nanite_factory
          )

          const canAfford =
            currentPlanet.metal >= cost.metal &&
            currentPlanet.crystal >= cost.crystal &&
            currentPlanet.deuterium >= cost.deuterium

          const currentCount = getDefenseCount(defense.key)

          const defenseKey = getTranslationKey(defense.key)
          const defenseName = t(defenseKey as any) || defense.name

          return (
            <div key={defense.id} className="ogame-panel">
              <div className="ogame-panel-content">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-sm overflow-hidden flex-shrink-0">
                    <img
                      src={getDefenseImage(defense.key)}
                      alt={defenseName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-ogame-text-header font-semibold">{defenseName}</h3>
                      <span className="text-ogame-accent">x{currentCount}</span>
                    </div>

                    <div className="flex gap-4 text-xs text-ogame-text-muted mb-2">
                      <span>{t('attack')}: {formatNumber(defense.weaponPower)}</span>
                      <span>{t('shield')}: {formatNumber(defense.shieldPower)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2 text-xs">
                      <span className={cost.metal <= currentPlanet.metal ? 'resource-metal' : 'text-ogame-negative'}>
                        M: {formatNumber(cost.metal)}
                      </span>
                      <span className={cost.crystal <= currentPlanet.crystal ? 'resource-crystal' : 'text-ogame-negative'}>
                        C: {formatNumber(cost.crystal)}
                      </span>
                      {cost.deuterium > 0 && (
                        <span className={cost.deuterium <= currentPlanet.deuterium ? 'resource-deuterium' : 'text-ogame-negative'}>
                          D: {formatNumber(cost.deuterium)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={amounts[defense.id] || ''}
                        onChange={(e) => setAmounts({ ...amounts, [defense.id]: parseInt(e.target.value) || 0 })}
                        placeholder="1"
                        className="ogame-input w-20 text-sm"
                      />
                      <span className="text-xs text-ogame-text-muted">
                        {formatDuration(timePerUnit * amount)}
                      </span>
                      <button
                        onClick={() => handleBuild(defense.id)}
                        disabled={!canAfford || currentPlanet.shipyard < 1 || loading === defense.id}
                        className="ogame-button-primary text-xs px-3 py-1 ml-auto"
                      >
                        {loading === defense.id ? '...' : tCommon('build')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getDefenseImage(key: string): string {
  const imageMap: Record<string, string> = {
    rocket_launcher: 'rocket_launcher',
    light_laser: 'light_laser',
    heavy_laser: 'heavy_laser',
    gauss_cannon: 'gauss_cannon',
    ion_cannon: 'ion_cannon',
    plasma_turret: 'plasma_turret',
    small_shield_dome: 'small_shield_dome',
    large_shield_dome: 'large_shield_dome',
    anti_ballistic_missile: 'anti_ballistic_missile',
    interplanetary_missile: 'interplanetary_missile',
  }
  const imageName = imageMap[key] || key
  return `/img/objects/units/${imageName}_small.jpg`
}
