'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import { calculateUnitCost, calculateUnitTime, formatNumber, formatDuration } from '@/game/formulas'
import { SHIPS } from '@/game/constants'

// Convert key like 'light_fighter' to translation key like 'lightFighter'
const getTranslationKey = (key: string): string => {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

export default function ShipyardPage() {
  const { currentPlanet, updatePlanetResources } = useGameStore()
  const [amounts, setAmounts] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const t = useTranslations('ships')
  const tCommon = useTranslations('common')

  if (!currentPlanet) {
    return <div className="text-ogame-text-muted">{tCommon('loading')}</div>
  }

  const ships = Object.values(SHIPS)

  const getShipCount = (key: string): number => {
    return (currentPlanet as unknown as Record<string, number>)[key] || 0
  }

  const handleBuild = async (shipId: number) => {
    const amount = amounts[shipId] || 1
    if (amount <= 0) return

    const ship = SHIPS[shipId]
    const cost = calculateUnitCost(shipId, amount, 'ship')

    if (
      currentPlanet.metal < cost.metal ||
      currentPlanet.crystal < cost.crystal ||
      currentPlanet.deuterium < cost.deuterium
    ) {
      return
    }

    setLoading(shipId)
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
        ship.structuralIntegrity,
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
          unit_id: shipId,
          unit_type: 'ship',
          amount: amount,
          amount_completed: 0,
          metal_cost: cost.metal,
          crystal_cost: cost.crystal,
          deuterium_cost: cost.deuterium,
          started_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
        })

      if (queueError) throw queueError

      // Clear amount
      setAmounts({ ...amounts, [shipId]: 0 })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to build ships'
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

      {/* Ship grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ships.map((ship) => {
          const amount = amounts[ship.id] || 1
          const cost = calculateUnitCost(ship.id, amount, 'ship')
          const timePerUnit = calculateUnitTime(
            ship.structuralIntegrity,
            currentPlanet.shipyard,
            currentPlanet.nanite_factory
          )

          const canAfford =
            currentPlanet.metal >= cost.metal &&
            currentPlanet.crystal >= cost.crystal &&
            currentPlanet.deuterium >= cost.deuterium

          const currentCount = getShipCount(ship.key)

          const shipKey = getTranslationKey(ship.key)
          const shipName = t(shipKey as any) || ship.name

          return (
            <div key={ship.id} className="ogame-panel">
              <div className="ogame-panel-content">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-sm overflow-hidden flex-shrink-0">
                    <img
                      src={getShipImage(ship.key)}
                      alt={shipName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-ogame-text-header font-semibold">{shipName}</h3>
                      <span className="text-ogame-accent">x{currentCount}</span>
                    </div>

                    <div className="flex gap-4 text-xs text-ogame-text-muted mb-2">
                      <span>{t('speed')}: {formatNumber(ship.speed)}</span>
                      <span>{t('cargo')}: {formatNumber(ship.cargoCapacity)}</span>
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
                        value={amounts[ship.id] || ''}
                        onChange={(e) => setAmounts({ ...amounts, [ship.id]: parseInt(e.target.value) || 0 })}
                        placeholder="1"
                        className="ogame-input w-20 text-sm"
                      />
                      <span className="text-xs text-ogame-text-muted">
                        {formatDuration(timePerUnit * amount)}
                      </span>
                      <button
                        onClick={() => handleBuild(ship.id)}
                        disabled={!canAfford || currentPlanet.shipyard < 1 || loading === ship.id}
                        className="ogame-button-primary text-xs px-3 py-1 ml-auto"
                      >
                        {loading === ship.id ? '...' : tCommon('build')}
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

function getShipImage(key: string): string {
  const imageMap: Record<string, string> = {
    light_fighter: 'light_fighter',
    heavy_fighter: 'heavy_fighter',
    cruiser: 'cruiser',
    battleship: 'battleship',
    battlecruiser: 'battlecruiser',
    bomber: 'bomber',
    destroyer: 'destroyer',
    deathstar: 'deathstar',
    small_cargo: 'small_cargo',
    large_cargo: 'large_cargo',
    colony_ship: 'colony_ship',
    recycler: 'recycler',
    espionage_probe: 'espionage_probe',
    solar_satellite: 'solar_satellite',
    crawler: 'crawler',
    reaper: 'reaper',
    pathfinder: 'pathfinder',
  }
  const imageName = imageMap[key] || key
  return `/img/objects/units/${imageName}_small.jpg`
}
