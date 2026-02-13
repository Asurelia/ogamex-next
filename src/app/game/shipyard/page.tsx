'use client'

import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import { calculateUnitCost, calculateUnitTime, formatNumber, formatDuration } from '@/game/formulas'
import { SHIPS } from '@/game/constants'

export default function ShipyardPage() {
  const { currentPlanet } = useGameStore()
  const [amounts, setAmounts] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState<number | null>(null)

  if (!currentPlanet) {
    return <div className="text-ogame-text-muted">Loading...</div>
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
    try {
      const supabase = getSupabaseClient()

      // Deduct resources
      const { error: updateError } = await supabase
        .from('planets')
        .update({
          metal: currentPlanet.metal - cost.metal,
          crystal: currentPlanet.crystal - cost.crystal,
          deuterium: currentPlanet.deuterium - cost.deuterium,
        })
        .eq('id', currentPlanet.id)

      if (updateError) throw updateError

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
    } catch (error) {
      console.error('Failed to build ships:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ogame-text-header">Shipyard</h1>
        <div className="text-ogame-text-muted">
          Shipyard Level: {currentPlanet.shipyard}
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

          return (
            <div key={ship.id} className="ogame-panel">
              <div className="ogame-panel-content">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-sm bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-3xl">{getShipEmoji(ship.key)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-ogame-text-header font-semibold">{ship.name}</h3>
                      <span className="text-ogame-accent">x{currentCount}</span>
                    </div>

                    <div className="flex gap-4 text-xs text-ogame-text-muted mb-2">
                      <span>Speed: {formatNumber(ship.speed)}</span>
                      <span>Cargo: {formatNumber(ship.cargoCapacity)}</span>
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
                        {loading === ship.id ? '...' : 'Build'}
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
