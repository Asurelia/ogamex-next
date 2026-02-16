'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import { formatNumber, calculateDistance, calculateFleetDuration } from '@/lib/game'
import { HoloCard, HoloButton, HoloStats, HoloInput } from '@/components/ui'
import { RECYCLER_CAPACITY } from '@/lib/debris/types'

// Recycler speed (base speed from OGame)
const RECYCLER_BASE_SPEED = 2000

// ============================================================================
// TYPES
// ============================================================================

interface DebrisField {
  id: string
  galaxy: number
  system: number
  position: number
  metal: number
  crystal: number
  created_at: string
  updated_at: string
}

interface RecycleMission {
  id: string
  origin_galaxy: number
  origin_system: number
  origin_position: number
  destination_galaxy: number
  destination_system: number
  destination_position: number
  recycler: number
  mission_type: string
  status: string
  arrives_at: string
  returns_at: string | null
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCoords = (galaxy: number, system: number, position: number): string => {
  return `[${galaxy}:${system}:${position}]`
}

const calculateRecycleCapacity = (recyclerCount: number): number => {
  return recyclerCount * RECYCLER_CAPACITY
}

const formatTimeRemaining = (targetDate: string): string => {
  const now = new Date()
  const target = new Date(targetDate)
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) return 'Arriving...'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function RecyclePage() {
  const { currentPlanet, user } = useGameStore()
  const [debrisFields, setDebrisFields] = useState<DebrisField[]>([])
  const [activeMissions, setActiveMissions] = useState<RecycleMission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDebris, setSelectedDebris] = useState<DebrisField | null>(null)
  const [recyclerAmount, setRecyclerAmount] = useState<number>(1)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load debris fields in current system and nearby
  const loadDebrisFields = useCallback(async () => {
    if (!currentPlanet) return

    setLoading(true)
    try {
      const supabase = getSupabaseClient()

      // Get debris fields in same galaxy, within 10 systems
      const { data: debrisData, error: debrisError } = await supabase
        .from('debris_fields')
        .select('*')
        .eq('galaxy', currentPlanet.galaxy)
        .gte('system', currentPlanet.system - 10)
        .lte('system', currentPlanet.system + 10)
        .or('metal.gt.0,crystal.gt.0')
        .order('system')
        .order('position')

      if (debrisError) throw debrisError

      setDebrisFields(debrisData || [])

      // Get active recycle missions
      if (user?.id) {
        const { data: missionData, error: missionError } = await supabase
          .from('fleet_missions')
          .select('*')
          .eq('user_id', user.id)
          .eq('mission_type', 'recycle')
          .in('status', ['outbound', 'returning'])
          .order('arrives_at')

        if (missionError) throw missionError

        setActiveMissions(missionData || [])
      }
    } catch (error) {
      console.error('Failed to load debris fields:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPlanet, user?.id])

  useEffect(() => {
    loadDebrisFields()

    // Refresh every 30 seconds
    const interval = setInterval(loadDebrisFields, 30000)
    return () => clearInterval(interval)
  }, [loadDebrisFields])

  // Available recyclers on current planet
  const availableRecyclers = (currentPlanet as unknown as Record<string, number>)?.recycler || 0

  // Send recycle mission
  const handleSendRecyclers = async () => {
    if (!selectedDebris || !currentPlanet || recyclerAmount <= 0) return
    if (recyclerAmount > availableRecyclers) {
      setError('Not enough recyclers available')
      return
    }

    setSending(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()

      // Calculate distance and flight time
      const distance = calculateDistance(
        currentPlanet.galaxy,
        currentPlanet.system,
        currentPlanet.position,
        selectedDebris.galaxy,
        selectedDebris.system,
        selectedDebris.position
      )
      const flightDuration = calculateFleetDuration(distance, RECYCLER_BASE_SPEED, 100, 1)
      const arrivalTime = new Date(Date.now() + flightDuration * 1000)

      // Create fleet mission
      const { error: missionError } = await supabase.from('fleet_missions').insert({
        user_id: user?.id,
        origin_planet_id: currentPlanet.id,
        origin_galaxy: currentPlanet.galaxy,
        origin_system: currentPlanet.system,
        origin_position: currentPlanet.position,
        destination_galaxy: selectedDebris.galaxy,
        destination_system: selectedDebris.system,
        destination_position: selectedDebris.position,
        mission_type: 'recycle',
        recycler: recyclerAmount,
        status: 'outbound',
        started_at: new Date().toISOString(),
        arrives_at: arrivalTime.toISOString(),
      })

      if (missionError) throw missionError

      // Remove recyclers from planet
      const { error: updateError } = await supabase
        .from('player_colonies')
        .update({
          recycler: availableRecyclers - recyclerAmount,
        })
        .eq('id', currentPlanet.id)

      if (updateError) throw updateError

      // Refresh data
      await loadDebrisFields()
      setSelectedDebris(null)
      setRecyclerAmount(1)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send recyclers'
      setError(message)
      setTimeout(() => setError(null), 5000)
    } finally {
      setSending(false)
    }
  }

  // Calculate potential harvest
  const calculateHarvest = (debris: DebrisField, recyclers: number): { metal: number; crystal: number } => {
    const capacity = calculateRecycleCapacity(recyclers)
    const totalDebris = debris.metal + debris.crystal
    const ratio = Math.min(1, capacity / totalDebris)

    return {
      metal: Math.floor(debris.metal * ratio),
      crystal: Math.floor(debris.crystal * ratio),
    }
  }

  // Stats
  const totalDebris = debrisFields.reduce(
    (sum, d) => ({
      metal: sum.metal + d.metal,
      crystal: sum.crystal + d.crystal,
    }),
    { metal: 0, crystal: 0 }
  )

  const stats = [
    { label: 'Debris Fields', value: debrisFields.length, color: '#ffaa00' },
    { label: 'Available Metal', value: formatNumber(totalDebris.metal), color: '#888888' },
    { label: 'Available Crystal', value: formatNumber(totalDebris.crystal), color: '#4488ff' },
    { label: 'Recyclers', value: availableRecyclers, color: '#00ff88' },
  ]

  if (loading && debrisFields.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          className="text-cyan-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Scanning for debris fields...
        </motion.div>
      </div>
    )
  }

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

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: '#ffaa00', textShadow: '0 0 20px rgba(255, 170, 0, 0.5)' }}
          >
            Debris Recycling
          </h1>
          <p className="text-cyan-200/60 text-sm mt-1">
            Collect resources from debris fields in systems {currentPlanet?.system ? `${currentPlanet.system - 10} to ${currentPlanet.system + 10}` : ''}
          </p>
        </div>
        <HoloStats stats={stats} columns={4} />
      </motion.div>

      {/* Active Missions */}
      {activeMissions.length > 0 && (
        <HoloCard variant="accent">
          <div className="p-4">
            <h3 className="text-cyan-400 font-semibold mb-3">Active Recycle Missions</h3>
            <div className="space-y-2">
              {activeMissions.map((mission) => (
                <div
                  key={mission.id}
                  className="flex items-center justify-between p-2 rounded bg-cyan-500/10 border border-cyan-500/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">♻️</span>
                    <div>
                      <div className="text-sm text-cyan-300">
                        {formatCoords(mission.destination_galaxy, mission.destination_system, mission.destination_position)}
                      </div>
                      <div className="text-xs text-cyan-200/50">
                        {mission.recycler} recycler(s) • {mission.status === 'outbound' ? 'En route' : 'Returning'}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-cyan-400 font-mono">
                    {formatTimeRemaining(mission.status === 'outbound' ? mission.arrives_at : mission.returns_at || mission.arrives_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </HoloCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Debris Fields List */}
        <div className="lg:col-span-2 space-y-3">
          {debrisFields.length === 0 ? (
            <HoloCard>
              <div className="text-center py-12 text-cyan-200/50">
                <div className="text-4xl mb-4">🌌</div>
                <p>No debris fields detected nearby.</p>
                <p className="text-sm mt-2">Debris is created from destroyed ships in battles.</p>
              </div>
            </HoloCard>
          ) : (
            <AnimatePresence>
              {debrisFields.map((debris, index) => {
                const total = debris.metal + debris.crystal
                const isSelected = selectedDebris?.id === debris.id
                const isInSamePosition = currentPlanet &&
                  debris.galaxy === currentPlanet.galaxy &&
                  debris.system === currentPlanet.system &&
                  debris.position === currentPlanet.position

                return (
                  <motion.div
                    key={debris.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <HoloCard
                      variant={isSelected ? 'accent' : 'default'}
                      className="cursor-pointer transition-all hover:border-orange-400/50"
                      onClick={() => setSelectedDebris(debris)}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-3xl">💥</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-orange-300">
                                  {formatCoords(debris.galaxy, debris.system, debris.position)}
                                </span>
                                {isInSamePosition && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                                    Your position
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-4 mt-1 text-sm">
                                <span className="text-gray-400">
                                  Metal: {formatNumber(debris.metal)}
                                </span>
                                <span className="text-blue-400">
                                  Crystal: {formatNumber(debris.crystal)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-bold text-orange-400">
                              {formatNumber(total)}
                            </div>
                            <div className="text-xs text-cyan-200/50">Total Resources</div>
                          </div>
                        </div>
                      </div>
                    </HoloCard>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Selected Debris / Send Recyclers Panel */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedDebris ? (
              <motion.div
                key={selectedDebris.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <HoloCard variant="accent" glow>
                  <div className="p-4 space-y-4">
                    {/* Header */}
                    <div className="text-center">
                      <div className="text-4xl mb-2">💥</div>
                      <h3 className="font-semibold text-orange-300 text-lg">
                        Debris Field
                      </h3>
                      <p className="text-cyan-200/50 text-sm">
                        {formatCoords(selectedDebris.galaxy, selectedDebris.system, selectedDebris.position)}
                      </p>
                    </div>

                    {/* Debris contents */}
                    <div className="space-y-2">
                      <div className="flex justify-between p-2 rounded bg-gray-500/10">
                        <span className="text-cyan-200/60">Metal:</span>
                        <span className="text-gray-300 font-mono font-bold">
                          {formatNumber(selectedDebris.metal)}
                        </span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-blue-500/10">
                        <span className="text-cyan-200/60">Crystal:</span>
                        <span className="text-blue-300 font-mono font-bold">
                          {formatNumber(selectedDebris.crystal)}
                        </span>
                      </div>
                    </div>

                    {/* Recycler input */}
                    <div className="pt-4 border-t border-cyan-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-cyan-200/60">Recyclers to send:</span>
                        <span className="text-xs text-cyan-200/40">
                          Available: {availableRecyclers}
                        </span>
                      </div>

                      <HoloInput
                        type="number"
                        min={1}
                        max={availableRecyclers}
                        value={recyclerAmount}
                        onChange={(val) => setRecyclerAmount(Math.min(availableRecyclers, parseInt(val) || 1))}
                        className="w-full mb-3"
                      />

                      {/* Capacity indicator */}
                      <div className="text-xs text-cyan-200/50 mb-3">
                        Capacity: {formatNumber(calculateRecycleCapacity(recyclerAmount))} units
                      </div>

                      {/* Estimated harvest */}
                      {recyclerAmount > 0 && (
                        <div className="p-3 rounded bg-green-500/10 border border-green-500/20 mb-3">
                          <div className="text-xs text-green-400 mb-1">Estimated Harvest:</div>
                          {(() => {
                            const harvest = calculateHarvest(selectedDebris, recyclerAmount)
                            return (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-300">M: {formatNumber(harvest.metal)}</span>
                                <span className="text-blue-300">C: {formatNumber(harvest.crystal)}</span>
                              </div>
                            )
                          })()}
                        </div>
                      )}

                      {/* Send button */}
                      <HoloButton
                        variant="primary"
                        fullWidth
                        onClick={handleSendRecyclers}
                        disabled={availableRecyclers === 0 || recyclerAmount <= 0 || sending}
                        loading={sending}
                      >
                        {availableRecyclers === 0 ? 'No Recyclers' : `Send ${recyclerAmount} Recycler${recyclerAmount > 1 ? 's' : ''}`}
                      </HoloButton>
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
                  <div className="text-center text-cyan-200/50 py-12 px-4">
                    <div className="text-4xl mb-4">♻️</div>
                    <p>Select a debris field</p>
                    <p className="text-sm mt-2">Send recyclers to collect resources</p>
                  </div>
                </HoloCard>

                {/* Recycler info */}
                <HoloCard className="mt-4">
                  <div className="p-4 text-sm">
                    <h4 className="text-cyan-400 font-semibold mb-2">Recycler Info</h4>
                    <ul className="space-y-1 text-cyan-200/60">
                      <li>• Capacity: {formatNumber(RECYCLER_CAPACITY)} per recycler</li>
                      <li>• Collects both metal and crystal</li>
                      <li>• Cannot be attacked during mission</li>
                      <li>• Build recyclers in your Shipyard</li>
                    </ul>
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
