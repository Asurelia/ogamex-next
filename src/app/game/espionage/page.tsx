'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import { formatNumber, formatRelativeTime } from '@/game/formulas'
import { HoloCard, HoloButton, HoloStats } from '@/components/ui'
import { InfoLevel } from '@/lib/espionage/types'

// ============================================================================
// TYPES
// ============================================================================

interface EspionageReport {
  id: string
  user_id: string
  target_user_id: string
  target_planet_id: string
  resources: { metal: number; crystal: number; deuterium: number } | null
  buildings: Record<string, number> | null
  research: Record<string, number> | null
  ships: Record<string, number> | null
  defense: Record<string, number> | null
  counter_espionage_chance: number
  created_at: string
  // Joined data
  target_planet?: {
    name: string
    galaxy: number
    system: number
    position: number
  }
  target_user?: {
    username: string
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatKeyName = (key: string): string => {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const formatCoords = (galaxy: number, system: number, position: number): string => {
  return `[${galaxy}:${system}:${position}]`
}

const getInfoLevelFromReport = (report: EspionageReport): InfoLevel => {
  if (report.research && Object.keys(report.research).length > 0) return InfoLevel.RESEARCH
  if (report.buildings && Object.keys(report.buildings).length > 0) return InfoLevel.BUILDINGS
  if (report.defense && Object.keys(report.defense).length > 0) return InfoLevel.DEFENSE
  if (report.ships && Object.keys(report.ships).length > 0) return InfoLevel.FLEET
  return InfoLevel.RESOURCES
}

const getInfoLevelLabel = (level: InfoLevel): string => {
  switch (level) {
    case InfoLevel.RESEARCH: return 'Full Intel'
    case InfoLevel.BUILDINGS: return 'Buildings'
    case InfoLevel.DEFENSE: return 'Defense'
    case InfoLevel.FLEET: return 'Fleet'
    default: return 'Resources'
  }
}

const getInfoLevelColor = (level: InfoLevel): string => {
  switch (level) {
    case InfoLevel.RESEARCH: return '#00ff88'
    case InfoLevel.BUILDINGS: return '#00ffff'
    case InfoLevel.DEFENSE: return '#ffaa00'
    case InfoLevel.FLEET: return '#ff8800'
    default: return '#888888'
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function EspionagePage() {
  const { user } = useGameStore()
  const [reports, setReports] = useState<EspionageReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<EspionageReport | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load espionage reports
  const loadReports = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const supabase = getSupabaseClient()

      const { data, error } = await supabase
        .from('espionage_reports')
        .select(`
          *,
          target_planet:player_colonies!target_planet_id(name, galaxy, system, position),
          target_user:users!target_user_id(username)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setReports(data || [])
    } catch (error) {
      console.error('Failed to load espionage reports:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  // Delete report
  const handleDelete = async (reportId: string) => {
    setDeletingId(reportId)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('espionage_reports')
        .delete()
        .eq('id', reportId)

      if (error) throw error

      setReports(reports.filter(r => r.id !== reportId))
      if (selectedReport?.id === reportId) {
        setSelectedReport(null)
      }
    } catch (error) {
      console.error('Failed to delete report:', error)
    } finally {
      setDeletingId(null)
    }
  }

  // Calculate total resources from reports
  const totalLoot = reports.reduce((sum, r) => {
    if (r.resources) {
      return {
        metal: sum.metal + r.resources.metal,
        crystal: sum.crystal + r.resources.crystal,
        deuterium: sum.deuterium + r.resources.deuterium,
      }
    }
    return sum
  }, { metal: 0, crystal: 0, deuterium: 0 })

  // Stats
  const stats = [
    { label: 'Reports', value: reports.length, color: '#00ffff' },
    { label: 'Potential Metal', value: formatNumber(totalLoot.metal), color: '#888888' },
    { label: 'Potential Crystal', value: formatNumber(totalLoot.crystal), color: '#4488ff' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          className="text-cyan-400"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading espionage reports...
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: '#00ffff', textShadow: '0 0 20px rgba(0, 255, 255, 0.5)' }}
          >
            Espionage Reports
          </h1>
          <p className="text-cyan-200/60 text-sm mt-1">
            Intelligence gathered from your spy probes
          </p>
        </div>
        <HoloStats stats={stats} columns={3} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports List */}
        <div className="lg:col-span-2 space-y-3">
          {reports.length === 0 ? (
            <HoloCard>
              <div className="text-center py-12 text-cyan-200/50">
                <div className="text-4xl mb-4">🛰️</div>
                <p>No espionage reports yet.</p>
                <p className="text-sm mt-2">Send espionage probes to gather intelligence on enemy planets.</p>
              </div>
            </HoloCard>
          ) : (
            <AnimatePresence>
              {reports.map((report, index) => {
                const infoLevel = getInfoLevelFromReport(report)
                const coords = report.target_planet
                  ? formatCoords(report.target_planet.galaxy, report.target_planet.system, report.target_planet.position)
                  : '[?:?:?]'
                const isSelected = selectedReport?.id === report.id

                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <HoloCard
                      variant={isSelected ? 'accent' : 'default'}
                      className="cursor-pointer transition-all hover:border-cyan-400/50"
                      onClick={() => setSelectedReport(report)}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Target info */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-cyan-300">
                                {report.target_planet?.name || 'Unknown Planet'}
                              </span>
                              <span className="text-cyan-200/50 text-sm">{coords}</span>
                            </div>

                            {/* Player name */}
                            <div className="text-sm text-cyan-200/60 mb-2">
                              Player: {report.target_user?.username || 'Unknown'}
                            </div>

                            {/* Resources preview */}
                            {report.resources && (
                              <div className="flex flex-wrap gap-3 text-xs">
                                <span className="text-gray-400">
                                  M: {formatNumber(report.resources.metal)}
                                </span>
                                <span className="text-blue-400">
                                  C: {formatNumber(report.resources.crystal)}
                                </span>
                                <span className="text-green-400">
                                  D: {formatNumber(report.resources.deuterium)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Right side: info level badge + time */}
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className="text-xs px-2 py-1 rounded-full border"
                              style={{
                                color: getInfoLevelColor(infoLevel),
                                borderColor: getInfoLevelColor(infoLevel) + '50',
                                backgroundColor: getInfoLevelColor(infoLevel) + '10',
                              }}
                            >
                              {getInfoLevelLabel(infoLevel)}
                            </span>
                            <span className="text-xs text-cyan-200/40">
                              {formatRelativeTime(new Date(report.created_at))}
                            </span>
                          </div>
                        </div>

                        {/* Counter-espionage warning */}
                        {report.counter_espionage_chance > 50 && (
                          <div className="mt-2 text-xs text-orange-400">
                            ⚠️ High detection risk: {report.counter_espionage_chance.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </HoloCard>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Selected Report Details */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedReport ? (
              <motion.div
                key={selectedReport.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <HoloCard variant="accent" glow>
                  <div className="p-4 space-y-4">
                    {/* Header */}
                    <div>
                      <h3 className="font-semibold text-cyan-300 text-lg">
                        {selectedReport.target_planet?.name || 'Unknown'}
                      </h3>
                      <p className="text-cyan-200/50 text-sm">
                        {selectedReport.target_planet
                          ? formatCoords(
                              selectedReport.target_planet.galaxy,
                              selectedReport.target_planet.system,
                              selectedReport.target_planet.position
                            )
                          : '[?:?:?]'}
                      </p>
                      <p className="text-cyan-200/60 text-sm">
                        Player: {selectedReport.target_user?.username || 'Unknown'}
                      </p>
                    </div>

                    {/* Resources */}
                    {selectedReport.resources && (
                      <div>
                        <h4 className="text-sm font-semibold text-cyan-400 mb-2 border-b border-cyan-500/20 pb-1">
                          Resources
                        </h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-cyan-200/60">Metal:</span>
                            <span className="text-gray-300 font-mono">
                              {formatNumber(selectedReport.resources.metal)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-cyan-200/60">Crystal:</span>
                            <span className="text-blue-300 font-mono">
                              {formatNumber(selectedReport.resources.crystal)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-cyan-200/60">Deuterium:</span>
                            <span className="text-green-300 font-mono">
                              {formatNumber(selectedReport.resources.deuterium)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fleet */}
                    {selectedReport.ships && Object.keys(selectedReport.ships).length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-orange-400 mb-2 border-b border-orange-500/20 pb-1">
                          Fleet
                        </h4>
                        <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                          {Object.entries(selectedReport.ships).map(([ship, count]) => (
                            <div key={ship} className="flex justify-between">
                              <span className="text-cyan-200/60">{formatKeyName(ship)}:</span>
                              <span className="text-orange-300 font-mono">{formatNumber(count)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Defense */}
                    {selectedReport.defense && Object.keys(selectedReport.defense).length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-yellow-400 mb-2 border-b border-yellow-500/20 pb-1">
                          Defense
                        </h4>
                        <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                          {Object.entries(selectedReport.defense).map(([def, count]) => (
                            <div key={def} className="flex justify-between">
                              <span className="text-cyan-200/60">{formatKeyName(def)}:</span>
                              <span className="text-yellow-300 font-mono">{formatNumber(count)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Buildings */}
                    {selectedReport.buildings && Object.keys(selectedReport.buildings).length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-cyan-400 mb-2 border-b border-cyan-500/20 pb-1">
                          Buildings
                        </h4>
                        <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                          {Object.entries(selectedReport.buildings).map(([building, level]) => (
                            <div key={building} className="flex justify-between">
                              <span className="text-cyan-200/60">{formatKeyName(building)}:</span>
                              <span className="text-cyan-300 font-mono">Lvl {level}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Research */}
                    {selectedReport.research && Object.keys(selectedReport.research).length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-green-400 mb-2 border-b border-green-500/20 pb-1">
                          Research
                        </h4>
                        <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                          {Object.entries(selectedReport.research).map(([tech, level]) => (
                            <div key={tech} className="flex justify-between">
                              <span className="text-cyan-200/60">{formatKeyName(tech)}:</span>
                              <span className="text-green-300 font-mono">Lvl {level}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-4 border-t border-cyan-500/20 flex gap-2">
                      <HoloButton
                        variant="ghost"
                        onClick={() => handleDelete(selectedReport.id)}
                        loading={deletingId === selectedReport.id}
                        className="flex-1"
                      >
                        Delete
                      </HoloButton>
                      <HoloButton
                        variant="primary"
                        onClick={() => {
                          // Navigate to fleet page with pre-filled target
                          if (selectedReport.target_planet) {
                            window.location.href = `/game/fleet?target=${selectedReport.target_planet.galaxy}:${selectedReport.target_planet.system}:${selectedReport.target_planet.position}`
                          }
                        }}
                        className="flex-1"
                      >
                        Attack
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
                    <div className="text-4xl mb-4">📊</div>
                    <p>Select a report to view details</p>
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
