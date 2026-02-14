'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import { calculateUnitCost, calculateUnitTime, formatNumber, formatDuration } from '@/game/formulas'
import { DEFENSE } from '@/game/constants'
import { HoloCard, HoloButton, HoloProgress, HoloTable, HoloInput, HoloStats } from '@/components/ui'
import { motion, AnimatePresence } from 'framer-motion'

// Convert key like 'rocket_launcher' to translation key like 'rocketLauncher'
const getTranslationKey = (key: string): string => {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

interface DefenseTableRow {
  id: number
  key: string
  name: string
  count: number
  attack: number
  shield: number
  structuralIntegrity: number
}

export default function DefensePage() {
  const { currentPlanet, updatePlanetResources } = useGameStore()
  const [amounts, setAmounts] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedDefense, setSelectedDefense] = useState<number | null>(null)
  const t = useTranslations('defense')
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

      updatePlanetResources(currentPlanet.id, newResources)

      const timePerUnit = calculateUnitTime(
        defense.structuralIntegrity,
        currentPlanet.shipyard,
        currentPlanet.nanite_factory
      )

      const now = new Date()
      const endsAt = new Date(now.getTime() + timePerUnit * amount * 1000)

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

  // Prepare table data
  const tableData: DefenseTableRow[] = defenseUnits.map(defense => {
    const count = getDefenseCount(defense.key)
    const defenseKey = getTranslationKey(defense.key)
    return {
      id: defense.id,
      key: defense.key,
      name: t(defenseKey as never) || defense.name,
      count,
      attack: defense.weaponPower,
      shield: defense.shieldPower,
      structuralIntegrity: defense.structuralIntegrity,
    }
  })

  // Selected defense details
  const selectedDefenseData = selectedDefense ? DEFENSE[selectedDefense] : null
  const selectedDefenseInfo = selectedDefenseData ? tableData.find(d => d.id === selectedDefense) : null

  // Defense stats
  const defenseStats = [
    { label: t('shipyardLevel'), value: currentPlanet.shipyard, color: '#00ffff' },
    { label: t('totalDefense'), value: defenseUnits.reduce((sum, d) => sum + getDefenseCount(d.key), 0), color: '#00ffff' },
    { label: t('shieldDomes'), value: (getDefenseCount('small_shield_dome') > 0 ? 1 : 0) + (getDefenseCount('large_shield_dome') > 0 ? 1 : 0), color: '#00ff88' },
  ]

  // Table columns
  const columns = [
    {
      key: 'name' as keyof DefenseTableRow,
      header: t('defense'),
      render: (value: DefenseTableRow[keyof DefenseTableRow], row: DefenseTableRow) => (
        <div className="flex items-center gap-3">
          <img
            src={getDefenseImage(row.key)}
            alt={String(value)}
            className="w-10 h-10 rounded-md border border-cyan-500/30"
          />
          <span className="font-medium">{String(value)}</span>
        </div>
      ),
    },
    {
      key: 'count' as keyof DefenseTableRow,
      header: t('built'),
      sortable: true,
      render: (value: DefenseTableRow[keyof DefenseTableRow]) => (
        <span className="font-mono text-cyan-300">{Number(value)}</span>
      ),
    },
    {
      key: 'attack' as keyof DefenseTableRow,
      header: t('attack'),
      sortable: true,
      render: (value: DefenseTableRow[keyof DefenseTableRow]) => (
        <span className="text-red-400">{formatNumber(Number(value))}</span>
      ),
    },
    {
      key: 'shield' as keyof DefenseTableRow,
      header: t('shield'),
      sortable: true,
      render: (value: DefenseTableRow[keyof DefenseTableRow]) => (
        <span className="text-blue-400">{formatNumber(Number(value))}</span>
      ),
    },
  ]

  // Calculate max values for progress bars
  const maxAttack = Math.max(...tableData.map(d => d.attack), 1)
  const maxShield = Math.max(...tableData.map(d => d.shield), 1)
  const maxIntegrity = Math.max(...tableData.map(d => d.structuralIntegrity), 1)

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
        <HoloStats stats={defenseStats} columns={3} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Defense Table */}
        <div className="lg:col-span-2">
          <HoloTable
            columns={columns}
            data={tableData}
            onRowClick={(row) => setSelectedDefense(row.id)}
            selectedRow={selectedDefenseInfo || undefined}
            emptyMessage={t('noDefense')}
          />
        </div>

        {/* Selected defense details */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedDefenseInfo && selectedDefenseData ? (
              <motion.div
                key={selectedDefense}
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
                          src={getDefenseImage(selectedDefenseData.key)}
                          alt={selectedDefenseInfo.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3
                          className="text-lg font-semibold"
                          style={{ color: '#00ffff', textShadow: '0 0 10px rgba(0,255,255,0.5)' }}
                        >
                          {selectedDefenseInfo.name}
                        </h3>
                        <p className="text-cyan-200/60 text-sm">{t('built')}: {selectedDefenseInfo.count}</p>
                      </div>
                    </div>

                    {/* Defense stats with progress bars */}
                    <div className="space-y-3 mb-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-cyan-200/60">{t('attack')}:</span>
                          <span className="text-red-400 font-mono">{formatNumber(selectedDefenseInfo.attack)}</span>
                        </div>
                        <HoloProgress
                          value={selectedDefenseInfo.attack}
                          max={maxAttack}
                          variant="health"
                          size="sm"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-cyan-200/60">{t('shield')}:</span>
                          <span className="text-blue-400 font-mono">{formatNumber(selectedDefenseInfo.shield)}</span>
                        </div>
                        <HoloProgress
                          value={selectedDefenseInfo.shield}
                          max={maxShield}
                          variant="shield"
                          size="sm"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-cyan-200/60">{t('hull')}:</span>
                          <span className="text-gray-300 font-mono">{formatNumber(selectedDefenseInfo.structuralIntegrity)}</span>
                        </div>
                        <HoloProgress
                          value={selectedDefenseInfo.structuralIntegrity}
                          max={maxIntegrity}
                          variant="default"
                          size="sm"
                        />
                      </div>
                    </div>

                    {/* Build section */}
                    <div className="pt-4 border-t border-cyan-500/20">
                      {(() => {
                        const amount = amounts[selectedDefense!] || 1
                        const cost = calculateUnitCost(selectedDefense!, amount, 'defense')
                        const timePerUnit = calculateUnitTime(
                          selectedDefenseData.structuralIntegrity,
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
                                value={amounts[selectedDefense!] || ''}
                                onChange={(value) => setAmounts({ ...amounts, [selectedDefense!]: parseInt(value) || 0 })}
                                placeholder="1"
                                className="w-24"
                              />
                              <span className="text-cyan-200/50 text-xs">
                                {formatDuration(timePerUnit * amount)}
                              </span>
                            </div>

                            {/* Build button */}
                            <HoloButton
                              onClick={() => handleBuild(selectedDefense!)}
                              disabled={!canAfford || currentPlanet.shipyard < 1 || loading === selectedDefense}
                              loading={loading === selectedDefense}
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
                    {t('selectDefenseToBuild')}
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
