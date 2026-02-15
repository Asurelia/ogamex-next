'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import { calculateResearchCost, calculateResearchTime, formatNumber, formatDuration } from '@/game/formulas'
import { RESEARCH } from '@/game/constants'
import { HoloCard, HoloButton, HoloProgress, HoloTabs, HoloCountdown, HoloStats } from '@/components/ui'
import { motion } from 'framer-motion'

// Convert key like 'energy_technology' to translation key like 'energyTechnology'
const getTranslationKey = (key: string): string => {
  return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

// Research categories
const RESEARCH_CATEGORIES = {
  basic: [113, 120, 121, 122, 123], // Energy, Laser, Ion, Hyperspace, Plasma
  propulsion: [115, 117, 118], // Combustion, Impulse, Hyperspace Drive
  advanced: [106, 108, 124, 199], // Espionage, Computer, Astrophysics, Graviton
  combat: [109, 110, 111], // Weapons, Shielding, Armor
}

export default function ResearchPage() {
  const { currentPlanet, research, researchQueue, setResearchQueue, user } = useGameStore()
  const [loading, setLoading] = useState<number | null>(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const t = useTranslations('research')
  const tCommon = useTranslations('common')

  if (!currentPlanet || !research) {
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

  const researchList = Object.values(RESEARCH)

  const getResearchLevel = (key: string): number => {
    return (research as unknown as Record<string, number>)[key] || 0
  }

  // Filter research by category
  const filteredResearch = activeCategory === 'all'
    ? researchList
    : researchList.filter(tech =>
        RESEARCH_CATEGORIES[activeCategory as keyof typeof RESEARCH_CATEGORIES]?.includes(tech.id)
      )

  const handleResearch = async (researchId: number, key: string) => {
    if (!user) return

    const currentLevel = getResearchLevel(key)
    const nextLevel = currentLevel + 1
    const cost = calculateResearchCost(researchId, nextLevel)

    if (
      currentPlanet.metal < cost.metal ||
      currentPlanet.crystal < cost.crystal ||
      currentPlanet.deuterium < cost.deuterium
    ) {
      return
    }

    setLoading(researchId)
    try {
      const supabase = getSupabaseClient()

      const { error: updateError } = await supabase
        .from('player_colonies')
        .update({
          metal: currentPlanet.metal - cost.metal,
          crystal: currentPlanet.crystal - cost.crystal,
          deuterium: currentPlanet.deuterium - cost.deuterium,
        })
        .eq('id', currentPlanet.id)

      if (updateError) throw updateError

      const time = calculateResearchTime(
        cost.metal,
        cost.crystal,
        currentPlanet.research_lab,
        1,
        1
      )

      const now = new Date()
      const endsAt = new Date(now.getTime() + time * 1000)

      const { data: newQueueItem, error: queueError } = await supabase
        .from('research_queue')
        .insert({
          user_id: user.id,
          planet_id: currentPlanet.id,
          research_id: researchId,
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
        setResearchQueue([...researchQueue, newQueueItem])
      }
    } catch (error) {
      console.error('Failed to start research:', error)
    } finally {
      setLoading(null)
    }
  }

  const tabs = [
    { id: 'all', label: t('allResearch'), badge: researchList.length },
    { id: 'basic', label: t('basicTech') },
    { id: 'propulsion', label: t('propulsion') },
    { id: 'advanced', label: t('advanced') },
    { id: 'combat', label: t('combat') },
  ]

  // Lab stats
  const labStats = [
    { label: t('labLevel'), value: currentPlanet.research_lab, color: '#00ffff' },
    { label: t('researchSpeed'), value: '100%', color: '#00ff88' },
    { label: t('inQueue'), value: researchQueue.length, color: researchQueue.length > 0 ? '#ffcc00' : '#00ffff' },
  ]

  return (
    <div className="space-y-6">
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
        <HoloStats stats={labStats} columns={3} />
      </motion.div>

      {/* Research in progress */}
      {researchQueue.length > 0 && (
        <HoloCard variant="warning" glow>
          <div className="p-4">
            <h2 className="text-lg font-semibold text-yellow-300 mb-4" style={{ textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>
              {t('inProgress')}
            </h2>
            <div className="space-y-3">
              {researchQueue.map((item) => {
                const tech = RESEARCH[item.research_id]
                const endsAt = new Date(item.ends_at)
                const startedAt = new Date(item.started_at)
                const totalDuration = endsAt.getTime() - startedAt.getTime()
                const elapsed = Date.now() - startedAt.getTime()
                const progress = Math.min(100, (elapsed / totalDuration) * 100)

                const techKey = tech ? getTranslationKey(tech.key) : ''
                const techName = tech ? (t(techKey as never) || tech.name) : `${t('research')} ${item.research_id}`

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 200, 0, 0.1), rgba(255, 150, 0, 0.05))',
                      border: '1px solid rgba(255, 200, 0, 0.3)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-cyan-100 font-medium">{techName}</span>
                        <span className="text-cyan-200/60 ml-2">{tCommon('level')} {item.target_level}</span>
                      </div>
                      <HoloCountdown targetDate={endsAt} format="compact" showLabels={false} />
                    </div>
                    <HoloProgress value={progress} max={100} variant="energy" size="sm" animated />
                  </div>
                )
              })}
            </div>
          </div>
        </HoloCard>
      )}

      {/* Category tabs */}
      <HoloTabs
        tabs={tabs}
        activeTab={activeCategory}
        onChange={setActiveCategory}
        variant="pills"
      />

      {/* Research grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {filteredResearch.map((tech, index) => {
          const currentLevel = getResearchLevel(tech.key)
          const nextLevel = currentLevel + 1
          const cost = calculateResearchCost(tech.id, nextLevel)
          const time = calculateResearchTime(cost.metal, cost.crystal, currentPlanet.research_lab)

          const canAfford =
            currentPlanet.metal >= cost.metal &&
            currentPlanet.crystal >= cost.crystal &&
            currentPlanet.deuterium >= cost.deuterium

          const isResearching = researchQueue.some(q => q.research_id === tech.id)
          const hasLabRequirement = currentPlanet.research_lab >= 1

          const techKey = getTranslationKey(tech.key)
          const techName = t(techKey as never) || tech.name
          const techDesc = t(`${techKey}Desc` as never) || ''

          return (
            <motion.div
              key={tech.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + index * 0.03 }}
            >
              <HoloCard variant={isResearching ? 'warning' : 'default'} glow>
                <div className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 border border-cyan-500/30">
                      <img
                        src={getResearchImage(tech.key)}
                        alt={techName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3
                          className="text-lg font-semibold truncate"
                          style={{ color: '#00ffff', textShadow: '0 0 10px rgba(0,255,255,0.3)' }}
                        >
                          {techName}
                        </h3>
                        <span className="text-cyan-300 font-mono">{tCommon('level')} {currentLevel}</span>
                      </div>

                      <p className="text-cyan-200/60 text-xs mb-3 line-clamp-2">
                        {techDesc}
                      </p>

                      {/* Cost display */}
                      <div className="flex flex-wrap gap-2 mb-3 text-xs">
                        <span className={cost.metal <= currentPlanet.metal ? 'text-gray-300' : 'text-red-400'}>
                          M: {formatNumber(cost.metal)}
                        </span>
                        <span className={cost.crystal <= currentPlanet.crystal ? 'text-blue-300' : 'text-red-400'}>
                          C: {formatNumber(cost.crystal)}
                        </span>
                        {cost.deuterium > 0 && (
                          <span className={cost.deuterium <= currentPlanet.deuterium ? 'text-green-300' : 'text-red-400'}>
                            D: {formatNumber(cost.deuterium)}
                          </span>
                        )}
                      </div>

                      {/* Time and button */}
                      <div className="flex items-center justify-between">
                        <span className="text-cyan-200/50 text-xs">
                          {tCommon('time')}: <span className="font-mono text-cyan-300">{formatDuration(time)}</span>
                        </span>

                        <HoloButton
                          onClick={() => handleResearch(tech.id, tech.key)}
                          disabled={!canAfford || !hasLabRequirement || isResearching || researchQueue.length > 0 || loading === tech.id}
                          loading={loading === tech.id}
                          size="sm"
                          variant={canAfford ? 'primary' : 'ghost'}
                        >
                          {isResearching ? t('researching') : researchQueue.length > 0 ? t('busy') : t('research')}
                        </HoloButton>
                      </div>
                    </div>
                  </div>
                </div>
              </HoloCard>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

function getResearchImage(key: string): string {
  const imageMap: Record<string, string> = {
    energy_technology: 'energy_technology',
    laser_technology: 'laser_technology',
    ion_technology: 'ion_technology',
    hyperspace_technology: 'hyperspace_technology',
    plasma_technology: 'plasma_technology',
    combustion_drive: 'combustion_drive',
    impulse_drive: 'impulse_drive',
    hyperspace_drive: 'hyperspace_drive',
    espionage_technology: 'espionage_technology',
    computer_technology: 'computer_technology',
    astrophysics: 'astrophysics_technology',
    intergalactic_research_network: 'intergalactic_research_network',
    graviton_technology: 'graviton_technology',
    weapons_technology: 'weapons_technology',
    shielding_technology: 'shielding_technology',
    armor_technology: 'armor_technology',
  }
  const imageName = imageMap[key] || key
  return `/img/objects/research/${imageName}_small.jpg`
}
