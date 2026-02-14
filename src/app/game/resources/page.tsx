'use client'

import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { BuildingCard } from '@/components/game/BuildingCard'
import { BUILDINGS } from '@/game/constants'
import { HoloCard, HoloStats, HoloProgress } from '@/components/ui'
import { motion } from 'framer-motion'

// Resource buildings IDs
const RESOURCE_BUILDING_IDS = [1, 2, 3, 4, 5, 6, 7, 8] // Metal Mine, Crystal Mine, Deut Synth, Solar, Fusion, Storages

export default function ResourcesPage() {
  const { currentPlanet } = useGameStore()
  const t = useTranslations('resources')
  const tBuildings = useTranslations('buildings')
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

  const resourceBuildings = RESOURCE_BUILDING_IDS
    .map(id => BUILDINGS[id])
    .filter(Boolean)

  // Get building levels from planet
  const getBuildingLevel = (key: string): number => {
    return (currentPlanet as unknown as Record<string, number>)[key] || 0
  }

  // Calculate production rates (simplified - you can add real formulas)
  const metalProduction = Math.floor(30 * currentPlanet.metal_mine * Math.pow(1.1, currentPlanet.metal_mine))
  const crystalProduction = Math.floor(20 * currentPlanet.crystal_mine * Math.pow(1.1, currentPlanet.crystal_mine))
  const deuteriumProduction = Math.floor(10 * currentPlanet.deuterium_synthesizer * Math.pow(1.1, currentPlanet.deuterium_synthesizer))

  // Energy calculation
  const energyAvailable = currentPlanet.energy_max - currentPlanet.energy_used
  const energyPercentage = currentPlanet.energy_max > 0
    ? (energyAvailable / currentPlanet.energy_max) * 100
    : 0

  // Production stats for HoloStats component
  const productionStats = [
    {
      label: tBuildings('metalMine'),
      value: `Lv ${currentPlanet.metal_mine}`,
      change: metalProduction > 0 ? Math.round(metalProduction / 100) : undefined,
      color: '#cccccc',
    },
    {
      label: tBuildings('crystalMine'),
      value: `Lv ${currentPlanet.crystal_mine}`,
      change: crystalProduction > 0 ? Math.round(crystalProduction / 100) : undefined,
      color: '#77bbff',
    },
    {
      label: tBuildings('deuteriumSynthesizer'),
      value: `Lv ${currentPlanet.deuterium_synthesizer}`,
      change: deuteriumProduction > 0 ? Math.round(deuteriumProduction / 100) : undefined,
      color: '#00cc99',
    },
    {
      label: t('energy'),
      value: `${energyAvailable}`,
      color: energyAvailable >= 0 ? '#ffcc00' : '#ff4444',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1
          className="text-2xl font-bold"
          style={{ color: '#00ffff', textShadow: '0 0 20px rgba(0, 255, 255, 0.5)' }}
        >
          {t('production')}
        </h1>
        <div className="text-cyan-200/60 text-sm">
          {currentPlanet.name} [{currentPlanet.galaxy}:{currentPlanet.system}:{currentPlanet.position}]
        </div>
      </motion.div>

      {/* Production summary with HoloCard */}
      <HoloCard variant="default" glow scanline>
        <div className="p-4">
          <h2 className="text-lg font-semibold text-cyan-300 mb-4" style={{ textShadow: '0 0 10px rgba(0,255,255,0.5)' }}>
            {t('productionSummary')}
          </h2>

          {/* Production Stats */}
          <HoloStats stats={productionStats} columns={4} />

          {/* Storage Progress Bars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-4 border-t border-cyan-500/20">
            <HoloProgress
              value={currentPlanet.metal}
              max={currentPlanet.metal_max || 100000}
              label={`${tCommon('metal')} ${t('storage')}`}
              showValue
              variant="metal"
              size="md"
            />
            <HoloProgress
              value={currentPlanet.crystal}
              max={currentPlanet.crystal_max || 100000}
              label={`${tCommon('crystal')} ${t('storage')}`}
              showValue
              variant="crystal"
              size="md"
            />
            <HoloProgress
              value={currentPlanet.deuterium}
              max={currentPlanet.deuterium_max || 100000}
              label={`${tCommon('deuterium')} ${t('storage')}`}
              showValue
              variant="deuterium"
              size="md"
            />
          </div>

          {/* Energy Bar */}
          <div className="mt-4">
            <HoloProgress
              value={Math.max(0, energyAvailable)}
              max={currentPlanet.energy_max || 1}
              label={t('energyBalance')}
              showValue
              variant="energy"
              size="lg"
            />
          </div>
        </div>
      </HoloCard>

      {/* Building cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {resourceBuildings.map((building, index) => (
          <motion.div
            key={building.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
          >
            <BuildingCard
              building={building}
              currentLevel={getBuildingLevel(building.key)}
              robotFactoryLevel={currentPlanet.robot_factory}
              naniteFactoryLevel={currentPlanet.nanite_factory}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
