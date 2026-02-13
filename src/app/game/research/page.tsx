'use client'

import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import { calculateResearchCost, calculateResearchTime, formatNumber, formatDuration } from '@/game/formulas'
import { RESEARCH } from '@/game/constants'

export default function ResearchPage() {
  const { currentPlanet, research, researchQueue, setResearchQueue, user } = useGameStore()
  const [loading, setLoading] = useState<number | null>(null)

  if (!currentPlanet || !research) {
    return <div className="text-ogame-text-muted">Loading...</div>
  }

  const researchList = Object.values(RESEARCH)

  const getResearchLevel = (key: string): number => {
    return (research as unknown as Record<string, number>)[key] || 0
  }

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

      // Calculate time
      const time = calculateResearchTime(
        cost.metal,
        cost.crystal,
        currentPlanet.research_lab,
        1, // universe speed
        1  // research speed
      )

      const now = new Date()
      const endsAt = new Date(now.getTime() + time * 1000)

      // Add to queue
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ogame-text-header">Research</h1>
        <div className="text-ogame-text-muted">
          Research Lab Level: {currentPlanet.research_lab}
        </div>
      </div>

      {/* Research in progress */}
      {researchQueue.length > 0 && (
        <div className="ogame-panel">
          <div className="ogame-panel-header">Research in Progress</div>
          <div className="ogame-panel-content">
            {researchQueue.map((item) => {
              const tech = RESEARCH[item.research_id]
              const endsAt = new Date(item.ends_at)
              const now = new Date()
              const remaining = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000))

              return (
                <div key={item.id} className="flex items-center justify-between p-3 bg-ogame-accent/10 rounded-sm building-in-progress">
                  <div>
                    <span className="text-ogame-text-header">{tech?.name || `Research ${item.research_id}`}</span>
                    <span className="text-ogame-text-muted ml-2">Level {item.target_level}</span>
                  </div>
                  <div className="countdown">{formatDuration(remaining)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Research grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {researchList.map((tech) => {
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

          return (
            <div key={tech.id} className="ogame-panel">
              <div className="ogame-panel-content">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-sm overflow-hidden flex-shrink-0">
                    <img
                      src={getResearchImage(tech.key)}
                      alt={tech.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-ogame-text-header font-semibold">{tech.name}</h3>
                      <span className="text-ogame-accent font-bold">Level {currentLevel}</span>
                    </div>

                    <p className="text-ogame-text-muted text-xs mb-2 line-clamp-2">
                      {getResearchDescription(tech.key)}
                    </p>

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

                    <div className="flex items-center justify-between">
                      <span className="text-ogame-text-muted text-xs">
                        Time: <span className="countdown">{formatDuration(time)}</span>
                      </span>

                      <button
                        onClick={() => handleResearch(tech.id, tech.key)}
                        disabled={!canAfford || !hasLabRequirement || isResearching || researchQueue.length > 0 || loading === tech.id}
                        className="ogame-button-primary text-xs px-2 py-1"
                      >
                        {loading === tech.id ? '...' : isResearching ? 'Researching' : researchQueue.length > 0 ? 'Busy' : 'Research'}
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

function getResearchDescription(key: string): string {
  const descriptions: Record<string, string> = {
    energy_technology: 'Improves energy efficiency and unlocks advanced power sources.',
    laser_technology: 'Enables laser weapons and improves combat systems.',
    ion_technology: 'Advanced ion-based weapons with increased damage.',
    hyperspace_technology: 'Enables faster-than-light travel and hyperspace drives.',
    plasma_technology: 'Powerful plasma weapons and increased resource production.',
    combustion_drive: 'Basic propulsion system, increases ship speed.',
    impulse_drive: 'Advanced propulsion for faster ships.',
    hyperspace_drive: 'Fastest drive technology for interstellar travel.',
    espionage_technology: 'Improves spy probes and counter-espionage.',
    computer_technology: 'Increases maximum fleet slots.',
    astrophysics: 'Enables colonization and expeditions.',
    intergalactic_research_network: 'Link research labs across planets.',
    graviton_technology: 'Required for Death Star construction.',
    weapons_technology: 'Increases weapon damage for all units.',
    shielding_technology: 'Increases shield strength for all units.',
    armor_technology: 'Increases hull strength for all units.',
  }
  return descriptions[key] || 'Advanced research technology.'
}
