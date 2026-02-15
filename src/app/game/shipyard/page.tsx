'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import { calculateUnitCost, calculateUnitTime, formatNumber, formatDuration } from '@/game/formulas'
import { SHIPS } from '@/game/constants'
import { HoloCard, HoloButton, HoloProgress, HoloTable, HoloInput, HoloStats } from '@/components/ui'
import { motion, AnimatePresence } from 'framer-motion'

// Convert key like 'light_fighter' to translation key like 'lightFighter'
const getTranslationKey = (key: string): string => {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

interface ShipTableRow {
  id: number
  key: string
  name: string
  count: number
  speed: number
  cargo: number
  attack: number
  shield: number
  structuralIntegrity: number
}

export default function ShipyardPage() {
  const { currentPlanet, updatePlanetResources } = useGameStore()
  const [amounts, setAmounts] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedShip, setSelectedShip] = useState<number | null>(null)
  const t = useTranslations('ships')
  const tCommon = useTranslations('common')

  if (!currentPlanet) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          className="text-cyan-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {tCommon('loading')}
        </motion.div>
      </div>
    )
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

      const newResources = {
        metal: currentPlanet.metal - cost.metal,
        crystal: currentPlanet.crystal - cost.crystal,
        deuterium: currentPlanet.deuterium - cost.deuterium,
      }

      const { error: updateError } = await supabase
        .from('player_colonies')
        .update(newResources)
        .eq('id', currentPlanet.id)

      if (updateError) throw updateError

      updatePlanetResources(currentPlanet.id, newResources)

      const timePerUnit = calculateUnitTime(
        ship.structuralIntegrity,
        currentPlanet.shipyard,
        currentPlanet.nanite_factory
      )

      const now = new Date()
      const endsAt = new Date(now.getTime() + timePerUnit * amount * 1000)

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

      setAmounts({ ...amounts, [shipId]: 0 })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to build ships'
      setError(message)
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(null)
    }
  }

  // Prepare table data
  const tableData: ShipTableRow[] = ships.map(ship => {
    const count = getShipCount(ship.key)
    const shipKey = getTranslationKey(ship.key)
    return {
      id: ship.id,
      key: ship.key,
      name: t(shipKey as never) || ship.name,
      count,
      speed: ship.speed,
      cargo: ship.cargoCapacity,
      attack: ship.weaponPower,
      shield: ship.shieldPower,
      structuralIntegrity: ship.structuralIntegrity,
    }
  })

  // Selected ship details
  const selectedShipData = selectedShip ? SHIPS[selectedShip] : null
  const selectedShipInfo = selectedShipData ? tableData.find(s => s.id === selectedShip) : null

  // Shipyard stats
  const shipyardStats = [
    { label: t('shipyardLevel'), value: currentPlanet.shipyard, color: '#00ffff' },
    { label: t('naniteLevel'), value: currentPlanet.nanite_factory, color: '#00ff88' },
    { label: t('totalShips'), value: ships.reduce((sum, s) => sum + getShipCount(s.key), 0), color: '#00ffff' },
  ]

  // Table columns for HoloTable
  const columns = [
    {
      key: 'name' as keyof ShipTableRow,
      header: t('ship'),
      render: (value: ShipTableRow[keyof ShipTableRow], row: ShipTableRow) => (
        <div className="flex items-center gap-3">
          <img
            src={getShipImage(row.key)}
            alt={String(value)}
            className="w-10 h-10 rounded-md border border-cyan-500/30"
          />
          <span className="font-medium">{String(value)}</span>
        </div>
      ),
    },
    {
      key: 'count' as keyof ShipTableRow,
      header: t('owned'),
      sortable: true,
      render: (value: ShipTableRow[keyof ShipTableRow]) => (
        <span className="font-mono text-cyan-300">{Number(value)}</span>
      ),
    },
    {
      key: 'speed' as keyof ShipTableRow,
      header: t('speed'),
      sortable: true,
      render: (value: ShipTableRow[keyof ShipTableRow]) => formatNumber(Number(value)),
    },
    {
      key: 'cargo' as keyof ShipTableRow,
      header: t('cargo'),
      sortable: true,
      render: (value: ShipTableRow[keyof ShipTableRow]) => formatNumber(Number(value)),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-3 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 80, 80, 0.2), rgba(255, 50, 50, 0.1))',
              border: '1px solid rgba(255, 80, 80, 0.5)',
              color: '#ff8080',
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <h1
          className="text-2xl font-bold"
          style={{ color: '#00ffff', textShadow: '0 0 20px rgba(0, 255, 255, 0.5)' }}
        >
          {t('title')}
        </h1>
        <HoloStats stats={shipyardStats} columns={3} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ship Table */}
        <div className="lg:col-span-2">
          <HoloTable
            columns={columns}
            data={tableData}
            onRowClick={(row) => setSelectedShip(row.id)}
            selectedRow={selectedShipInfo || undefined}
            emptyMessage={t('noShips')}
          />
        </div>

        {/* Selected ship details */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedShipInfo && selectedShipData ? (
              <motion.div
                key={selectedShip}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <HoloCard variant="accent" glow>
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex gap-4 mb-4">
                      <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 border border-cyan-500/30">
                        <img
                          src={getShipImage(selectedShipData.key)}
                          alt={selectedShipInfo.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3
                          className="text-lg font-semibold"
                          style={{ color: '#00ffff', textShadow: '0 0 10px rgba(0,255,255,0.5)' }}
                        >
                          {selectedShipInfo.name}
                        </h3>
                        <p className="text-cyan-200/60 text-sm">{t('owned')}: {selectedShipInfo.count}</p>
                      </div>
                    </div>

                    {/* Ship stats */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-cyan-200/60">{t('attack')}:</span>
                        <span className="text-red-400 font-mono">{formatNumber(selectedShipInfo.attack)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-cyan-200/60">{t('shield')}:</span>
                        <span className="text-blue-400 font-mono">{formatNumber(selectedShipInfo.shield)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-cyan-200/60">{t('hull')}:</span>
                        <span className="text-gray-300 font-mono">{formatNumber(selectedShipInfo.structuralIntegrity)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-cyan-200/60">{t('speed')}:</span>
                        <span className="text-cyan-300 font-mono">{formatNumber(selectedShipInfo.speed)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-cyan-200/60">{t('cargo')}:</span>
                        <span className="text-yellow-300 font-mono">{formatNumber(selectedShipInfo.cargo)}</span>
                      </div>
                    </div>

                    {/* Build section */}
                    <div className="pt-4 border-t border-cyan-500/20">
                      {(() => {
                        const amount = amounts[selectedShip!] || 1
                        const cost = calculateUnitCost(selectedShip!, amount, 'ship')
                        const timePerUnit = calculateUnitTime(
                          selectedShipData.structuralIntegrity,
                          currentPlanet.shipyard,
                          currentPlanet.nanite_factory
                        )

                        const canAfford =
                          currentPlanet.metal >= cost.metal &&
                          currentPlanet.crystal >= cost.crystal &&
                          currentPlanet.deuterium >= cost.deuterium

                        return (
                          <>
                            {/* Cost display */}
                            <div className="space-y-1 mb-3 text-xs">
                              <div className="flex justify-between">
                                <span className="text-cyan-200/60">{tCommon('metal')}:</span>
                                <span className={cost.metal <= currentPlanet.metal ? 'text-gray-300' : 'text-red-400'}>
                                  {formatNumber(cost.metal)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-cyan-200/60">{tCommon('crystal')}:</span>
                                <span className={cost.crystal <= currentPlanet.crystal ? 'text-blue-300' : 'text-red-400'}>
                                  {formatNumber(cost.crystal)}
                                </span>
                              </div>
                              {cost.deuterium > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-cyan-200/60">{tCommon('deuterium')}:</span>
                                  <span className={cost.deuterium <= currentPlanet.deuterium ? 'text-green-300' : 'text-red-400'}>
                                    {formatNumber(cost.deuterium)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Amount and time */}
                            <div className="flex items-center gap-2 mb-3">
                              <HoloInput
                                type="number"
                                min={1}
                                value={amounts[selectedShip!] || ''}
                                onChange={(value) => setAmounts({ ...amounts, [selectedShip!]: parseInt(value) || 0 })}
                                placeholder="1"
                                className="w-24"
                              />
                              <span className="text-cyan-200/50 text-xs">
                                {formatDuration(timePerUnit * amount)}
                              </span>
                            </div>

                            {/* Build button */}
                            <HoloButton
                              onClick={() => handleBuild(selectedShip!)}
                              disabled={!canAfford || currentPlanet.shipyard < 1 || loading === selectedShip}
                              loading={loading === selectedShip}
                              fullWidth
                              variant={canAfford ? 'primary' : 'ghost'}
                            >
                              {tCommon('build')}
                            </HoloButton>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </HoloCard>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <HoloCard>
                  <div className="text-center text-cyan-200/50 py-8 px-4">
                    {t('selectShipToBuild')}
                  </div>
                </HoloCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
