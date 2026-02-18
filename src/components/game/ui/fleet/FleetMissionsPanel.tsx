'use client'

/**
 * FleetMissionsPanel - Display and manage active fleet missions
 *
 * Features:
 * - List all active missions with details
 * - Real-time countdown to arrival
 * - Mission type icons and colors
 * - Recall/cancel functionality
 * - Filter by mission type
 */

import { useState, useEffect, useMemo } from 'react'
import { useGameStore } from '@/stores/gameStore'
import type { FleetMission, MissionType } from '@/types/database'
import { MissionService } from '@/lib/services/mission-service'

// ============================================================================
// TYPES
// ============================================================================

interface FleetMissionsPanelProps {
  userId: string
  onSelectMission?: (mission: FleetMission) => void
  className?: string
}

// ============================================================================
// MISSION TYPE CONFIG
// ============================================================================

const MISSION_CONFIG: Record<
  MissionType,
  { icon: string; color: string; label: string }
> = {
  attack: { icon: '⚔️', color: 'text-red-400', label: 'Attack' },
  transport: { icon: '📦', color: 'text-blue-400', label: 'Transport' },
  deployment: { icon: '🏠', color: 'text-green-400', label: 'Deployment' },
  espionage: { icon: '🔍', color: 'text-purple-400', label: 'Espionage' },
  colonization: { icon: '🌍', color: 'text-emerald-400', label: 'Colonization' },
  recycle: { icon: '♻️', color: 'text-yellow-400', label: 'Recycle' },
  expedition: { icon: '🚀', color: 'text-cyan-400', label: 'Expedition' },
  acs_attack: { icon: '⚔️', color: 'text-orange-400', label: 'ACS Attack' },
  acs_defend: { icon: '🛡️', color: 'text-teal-400', label: 'ACS Defend' },
  moon_destruction: { icon: '💥', color: 'text-pink-400', label: 'Moon Destruction' },
  // Exploration missions
  exploration_quick_scan: { icon: '🔍', color: 'text-blue-400', label: 'Quick Scan' },
  exploration_deep_scan: { icon: '📡', color: 'text-cyan-400', label: 'Deep Scan' },
  exploration_cartography: { icon: '🗺️', color: 'text-purple-400', label: 'Cartography' },
  exploration_satellite_deploy: { icon: '🛰️', color: 'text-green-400', label: 'Satellite Deploy' },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCountdown(targetTime: string): string {
  const now = Date.now()
  const target = new Date(targetTime).getTime()
  const diff = target - now

  if (diff <= 0) return 'Arrived'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

function formatCoordinates(galaxy: number, system: number, position: number): string {
  return `[${galaxy}:${system}:${position}]`
}

function getTotalShips(ships: Record<string, number> | null): number {
  if (!ships) return 0
  return Object.values(ships).reduce((sum, count) => sum + (count || 0), 0)
}

function getProgressPercent(departedAt: string, arrivesAt: string): number {
  const departed = new Date(departedAt).getTime()
  const arrives = new Date(arrivesAt).getTime()
  const now = Date.now()

  if (now >= arrives) return 100
  if (now <= departed) return 0

  const total = arrives - departed
  const elapsed = now - departed
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}

// ============================================================================
// MISSION CARD COMPONENT
// ============================================================================

interface MissionCardProps {
  mission: FleetMission
  onRecall?: (mission: FleetMission) => void
  onSelect?: (mission: FleetMission) => void
}

function MissionCard({ mission, onRecall, onSelect }: MissionCardProps) {
  const [countdown, setCountdown] = useState('')
  const [progress, setProgress] = useState(0)

  const config = MISSION_CONFIG[mission.mission_type] || {
    icon: '❓',
    color: 'text-gray-400',
    label: mission.mission_type,
  }

  // Parse ships from JSON
  const ships = mission.ships as Record<string, number> | null
  const totalShips = getTotalShips(ships)

  // Update countdown every second
  useEffect(() => {
    const updateTimer = () => {
      setCountdown(formatCountdown(mission.arrives_at))
      setProgress(getProgressPercent(mission.departed_at, mission.arrives_at))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [mission.arrives_at, mission.departed_at])

  const canRecall = !mission.is_returning && !mission.processed && !mission.cancelled

  return (
    <div
      className="bg-gray-800/80 border border-gray-700 rounded-lg overflow-hidden hover:border-teal-600/50 transition-colors cursor-pointer"
      onClick={() => onSelect?.(mission)}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <div>
            <span className={`font-semibold ${config.color}`}>{config.label}</span>
            {mission.is_returning && (
              <span className="ml-2 text-xs bg-yellow-600/30 text-yellow-400 px-2 py-0.5 rounded">
                Returning
              </span>
            )}
            {mission.cancelled && (
              <span className="ml-2 text-xs bg-red-600/30 text-red-400 px-2 py-0.5 rounded">
                Recalled
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">
            {mission.is_returning ? 'Return in' : 'Arrives in'}
          </div>
          <div className="font-mono text-teal-400">{countdown}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-900">
        <div
          className={`h-full transition-all duration-1000 ${
            mission.is_returning ? 'bg-yellow-500' : 'bg-teal-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Details */}
      <div className="p-3 space-y-2">
        {/* Route */}
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-500">
            <span className="text-gray-400">From:</span>{' '}
            {formatCoordinates(
              mission.origin_galaxy,
              mission.origin_system,
              mission.origin_position
            )}
          </div>
          <div className="text-teal-600">→</div>
          <div className="text-gray-500">
            <span className="text-gray-400">To:</span>{' '}
            {formatCoordinates(
              mission.destination_galaxy,
              mission.destination_system,
              mission.destination_position
            )}
          </div>
        </div>

        {/* Ships */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Ships:</span>
          <span className="text-white font-medium">{totalShips.toLocaleString()}</span>
        </div>

        {/* Ship breakdown (collapsed by default) */}
        {ships && totalShips > 0 && (
          <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
            {Object.entries(ships)
              .filter(([, count]) => count > 0)
              .slice(0, 4)
              .map(([type, count]) => (
                <span key={type} className="capitalize">
                  {type.replace(/_/g, ' ')}: {count}
                </span>
              ))}
            {Object.entries(ships).filter(([, count]) => count > 0).length > 4 && (
              <span className="text-gray-600">
                +{Object.entries(ships).filter(([, count]) => count > 0).length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        {canRecall && onRecall && (
          <div className="pt-2 border-t border-gray-700/50">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRecall(mission)
              }}
              className="w-full py-1.5 text-sm bg-red-900/30 text-red-400 border border-red-700/50 rounded hover:bg-red-900/50 transition-colors"
            >
              Recall Fleet
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FleetMissionsPanel({
  userId,
  onSelectMission,
  className = '',
}: FleetMissionsPanelProps) {
  const { fleetMissions, setFleetMissions } = useGameStore()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<MissionType | 'all'>('all')
  const [recallingId, setRecallingId] = useState<string | null>(null)

  // Load missions on mount
  useEffect(() => {
    async function loadMissions() {
      setLoading(true)
      try {
        const missions = await MissionService.getActiveMissions(userId)
        setFleetMissions(missions)
      } catch (error) {
        console.error('Failed to load missions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMissions()

    // Refresh every 30 seconds
    const interval = setInterval(loadMissions, 30000)
    return () => clearInterval(interval)
  }, [userId, setFleetMissions])

  // Filter missions
  const filteredMissions = useMemo(() => {
    if (filter === 'all') return fleetMissions
    return fleetMissions.filter((m) => m.mission_type === filter)
  }, [fleetMissions, filter])

  // Sort by arrival time
  const sortedMissions = useMemo(() => {
    return [...filteredMissions].sort(
      (a, b) => new Date(a.arrives_at).getTime() - new Date(b.arrives_at).getTime()
    )
  }, [filteredMissions])

  // Handle recall
  const handleRecall = async (mission: FleetMission) => {
    if (recallingId) return

    const confirmed = window.confirm(
      `Recall fleet from ${formatCoordinates(
        mission.destination_galaxy,
        mission.destination_system,
        mission.destination_position
      )}?`
    )

    if (!confirmed) return

    setRecallingId(mission.id)
    try {
      await MissionService.cancelMission(mission.id)
      // Refresh missions
      const missions = await MissionService.getActiveMissions(userId)
      setFleetMissions(missions)
    } catch (error) {
      console.error('Failed to recall mission:', error)
      alert('Failed to recall fleet')
    } finally {
      setRecallingId(null)
    }
  }

  // Get unique mission types for filter
  const missionTypes = useMemo(() => {
    const types = new Set(fleetMissions.map((m) => m.mission_type))
    return Array.from(types)
  }, [fleetMissions])

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="bg-gray-900/80 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-teal-400 uppercase tracking-wider">
            Active Missions
          </h2>
          <div className="text-sm text-gray-500">
            {fleetMissions.length} mission{fleetMissions.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Filter */}
        {missionTypes.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filter === 'all'
                  ? 'bg-teal-600/30 border-teal-500 text-teal-400'
                  : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'
              }`}
            >
              All ({fleetMissions.length})
            </button>
            {missionTypes.map((type) => {
              const config = MISSION_CONFIG[type]
              const count = fleetMissions.filter((m) => m.mission_type === type).length
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    filter === type
                      ? 'bg-teal-600/30 border-teal-500 text-teal-400'
                      : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {config?.icon} {config?.label} ({count})
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading missions...</div>
          </div>
        ) : sortedMissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <span className="text-3xl mb-2">🚀</span>
            <span>No active missions</span>
            <span className="text-sm text-gray-600">
              Dispatch a fleet to begin
            </span>
          </div>
        ) : (
          sortedMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onRecall={handleRecall}
              onSelect={onSelectMission}
            />
          ))
        )}
      </div>

      {/* Footer stats */}
      {fleetMissions.length > 0 && (
        <div className="bg-gray-900/80 border-t border-gray-700 p-3">
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Total Ships:{' '}
              <span className="text-white">
                {fleetMissions
                  .reduce((sum, m) => sum + getTotalShips(m.ships as Record<string, number>), 0)
                  .toLocaleString()}
              </span>
            </span>
            <span>
              Outbound:{' '}
              <span className="text-teal-400">
                {fleetMissions.filter((m) => !m.is_returning).length}
              </span>{' '}
              | Returning:{' '}
              <span className="text-yellow-400">
                {fleetMissions.filter((m) => m.is_returning).length}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export { MissionCard }
export type { FleetMissionsPanelProps, MissionCardProps }
