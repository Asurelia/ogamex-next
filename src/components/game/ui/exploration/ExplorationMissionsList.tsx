'use client'

/**
 * ExplorationMissionsList - Display active exploration missions
 *
 * Features:
 * - Real-time countdown to completion
 * - Progress bars
 * - Cancel functionality
 * - Mission results display
 */

import { useState, useEffect, useMemo, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

interface ExplorationMission {
  id: string
  user_id: string
  target_system_id: string
  mission_type: 'quick_scan' | 'deep_scan' | 'cartography' | 'satellite_deploy'
  probe_count: number
  explorer_count: number
  cartographer_equipped: boolean
  exploration_tech_level: number
  started_at: string
  arrives_at: string
  scan_duration_seconds: number
  completes_at: string
  status: 'in_progress' | 'completed' | 'failed' | 'intercepted'
  results?: {
    discovery_level?: string
    scan_quality?: number
    systems_detected?: string[]
    special_findings?: string[]
    is_first_discoverer?: boolean
    satellite_deployed?: boolean
    bonus_claimed?: { type: string; amount: number }
  }
}

interface ExplorationMissionsListProps {
  missions: ExplorationMission[]
  onCancel?: (missionId: string) => Promise<void>
  onComplete?: (missionId: string) => Promise<void>
  onViewResults?: (mission: ExplorationMission) => void
  className?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MISSION_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  quick_scan: { icon: '🔍', label: 'Quick Scan', color: 'text-blue-400' },
  deep_scan: { icon: '📡', label: 'Deep Scan', color: 'text-cyan-400' },
  cartography: { icon: '🗺️', label: 'Cartography', color: 'text-purple-400' },
  satellite_deploy: { icon: '🛰️', label: 'Satellite Deploy', color: 'text-green-400' },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCountdown(targetTime: string): string {
  const now = Date.now()
  const target = new Date(targetTime).getTime()
  const diff = target - now

  if (diff <= 0) return 'Complete!'

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

function getProgressPercent(startedAt: string, completesAt: string): number {
  const started = new Date(startedAt).getTime()
  const completes = new Date(completesAt).getTime()
  const now = Date.now()

  if (now >= completes) return 100
  if (now <= started) return 0

  const total = completes - started
  const elapsed = now - started
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}

// ============================================================================
// MISSION CARD COMPONENT
// ============================================================================

interface MissionCardProps {
  mission: ExplorationMission
  onCancel?: (missionId: string) => Promise<void>
  onComplete?: (missionId: string) => Promise<void>
  onViewResults?: (mission: ExplorationMission) => void
}

function MissionCard({ mission, onCancel, onComplete, onViewResults }: MissionCardProps) {
  const [countdown, setCountdown] = useState('')
  const [progress, setProgress] = useState(0)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  const config = MISSION_TYPE_CONFIG[mission.mission_type] || {
    icon: '❓',
    label: mission.mission_type,
    color: 'text-gray-400',
  }

  const isComplete = new Date(mission.completes_at).getTime() <= Date.now()
  const isInProgress = mission.status === 'in_progress'

  // Update countdown every second
  useEffect(() => {
    if (!isInProgress) return

    const updateTimer = () => {
      setCountdown(formatCountdown(mission.completes_at))
      setProgress(getProgressPercent(mission.started_at, mission.completes_at))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [mission.started_at, mission.completes_at, isInProgress])

  const handleCancel = useCallback(async () => {
    if (!onCancel || isCancelling) return
    setIsCancelling(true)
    try {
      await onCancel(mission.id)
    } finally {
      setIsCancelling(false)
    }
  }, [mission.id, onCancel, isCancelling])

  const handleComplete = useCallback(async () => {
    if (!onComplete || isCompleting) return
    setIsCompleting(true)
    try {
      await onComplete(mission.id)
    } finally {
      setIsCompleting(false)
    }
  }, [mission.id, onComplete, isCompleting])

  return (
    <div className="bg-gray-800/80 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <div>
            <span className={`font-semibold ${config.color}`}>{config.label}</span>
            {mission.status === 'completed' && (
              <span className="ml-2 text-xs bg-green-600/30 text-green-400 px-2 py-0.5 rounded">
                Completed
              </span>
            )}
            {mission.status === 'failed' && (
              <span className="ml-2 text-xs bg-red-600/30 text-red-400 px-2 py-0.5 rounded">
                Failed
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          {isInProgress && (
            <>
              <div className="text-sm text-gray-400">
                {isComplete ? 'Ready to claim' : 'Completes in'}
              </div>
              <div className="font-mono text-cyan-400">{countdown}</div>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isInProgress && (
        <div className="h-1 bg-gray-900">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Details */}
      <div className="p-3 space-y-2">
        {/* Fleet info */}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          {mission.probe_count > 0 && (
            <span>🛸 {mission.probe_count} probes</span>
          )}
          {mission.explorer_count > 0 && (
            <span>🚀 {mission.explorer_count} explorers</span>
          )}
          {mission.cartographer_equipped && (
            <span>🗺️ Cartographer</span>
          )}
        </div>

        {/* Results (if completed) */}
        {mission.status === 'completed' && mission.results && (
          <div className="bg-gray-900/50 rounded p-2 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Discovery Level:</span>
              <span className="text-green-400 capitalize">
                {mission.results.discovery_level}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Scan Quality:</span>
              <span className="text-cyan-400">{mission.results.scan_quality}%</span>
            </div>
            {mission.results.is_first_discoverer && (
              <div className="text-purple-400 text-sm">
                🏆 First Discoverer!
              </div>
            )}
            {mission.results.special_findings && mission.results.special_findings.length > 0 && (
              <div className="text-yellow-400 text-sm">
                ✨ Special: {mission.results.special_findings.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {isInProgress && isComplete && onComplete && (
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="flex-1 py-1.5 text-sm bg-green-600/30 text-green-400 border border-green-500/50 rounded hover:bg-green-600/50 transition-colors disabled:opacity-50"
            >
              {isCompleting ? 'Claiming...' : '✓ Claim Results'}
            </button>
          )}
          {isInProgress && !isComplete && onCancel && (
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="flex-1 py-1.5 text-sm bg-red-900/30 text-red-400 border border-red-700/50 rounded hover:bg-red-900/50 transition-colors disabled:opacity-50"
            >
              {isCancelling ? 'Cancelling...' : '✕ Cancel'}
            </button>
          )}
          {mission.status === 'completed' && onViewResults && (
            <button
              onClick={() => onViewResults(mission)}
              className="flex-1 py-1.5 text-sm bg-cyan-900/30 text-cyan-400 border border-cyan-700/50 rounded hover:bg-cyan-900/50 transition-colors"
            >
              View Details
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ExplorationMissionsList({
  missions,
  onCancel,
  onComplete,
  onViewResults,
  className = '',
}: ExplorationMissionsListProps) {
  // Separate active and completed missions
  const { activeMissions, completedMissions } = useMemo(() => {
    const active = missions.filter(m => m.status === 'in_progress')
    const completed = missions.filter(m => m.status !== 'in_progress')
    return {
      activeMissions: active.sort((a, b) =>
        new Date(a.completes_at).getTime() - new Date(b.completes_at).getTime()
      ),
      completedMissions: completed.sort((a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      ).slice(0, 5), // Only show last 5 completed
    }
  }, [missions])

  if (missions.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <span className="text-4xl mb-3 block">🔭</span>
        <p className="text-gray-400">No exploration missions</p>
        <p className="text-sm text-gray-500 mt-1">
          Select a system to start exploring
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Active Missions */}
      {activeMissions.length > 0 && (
        <div>
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">
            Active Missions ({activeMissions.length})
          </h3>
          <div className="space-y-2">
            {activeMissions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onCancel={onCancel}
                onComplete={onComplete}
                onViewResults={onViewResults}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Missions */}
      {completedMissions.length > 0 && (
        <div>
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-2">
            Recent Completed
          </h3>
          <div className="space-y-2">
            {completedMissions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onViewResults={onViewResults}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { ExplorationMissionsList, MissionCard }
export type { ExplorationMission, ExplorationMissionsListProps }
