'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { formatNumber } from '@/game/formulas'
import { HoloModal, HoloBadge, HoloChart } from '@/components/ui/holographic'
import type { PlayerDetailStats, ScoreCategory } from './types'

interface PlayerStatsCardProps {
  isOpen: boolean
  onClose: () => void
  player: PlayerDetailStats | null
  loading?: boolean
}

// Stats row component
function StatsRow({
  label,
  rank,
  points,
  icon,
  color,
  maxPoints,
}: {
  label: string
  rank: number
  points: number
  icon: React.ReactNode
  color: string
  maxPoints?: number
}) {
  const percentage = maxPoints && maxPoints > 0 ? (points / maxPoints) * 100 : 0

  return (
    <div className="flex items-center gap-3">
      {/* Icon */}
      <div
        className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${color}30, ${color}10)`,
          border: `1px solid ${color}50`,
        }}
      >
        {icon}
      </div>

      {/* Label and progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm text-white/80">{label}</span>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-mono"
              style={{ color: color }}
            >
              #{rank}
            </span>
            <span
              className="text-sm font-mono font-semibold"
              style={{ color: '#00ffff' }}
            >
              {formatNumber(points)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {maxPoints && (
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${color}, ${color}80)`,
                boxShadow: `0 0 6px ${color}50`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentage, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export function PlayerStatsCard({
  isOpen,
  onClose,
  player,
  loading = false,
}: PlayerStatsCardProps) {
  // Prepare chart data if history is available
  const chartData = useMemo(() => {
    if (!player?.history || player.history.length === 0) return null

    return player.history.slice(-7).map((h) => ({
      label: new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      value: h.totalPoints,
    }))
  }, [player?.history])

  // Calculate max points for progress bars
  const maxPoints = useMemo(() => {
    if (!player) return 0
    return Math.max(
      player.points.economy,
      player.points.research,
      player.points.military,
      player.points.defense
    )
  }, [player])

  if (!player && !loading) return null

  return (
    <HoloModal
      isOpen={isOpen}
      onClose={onClose}
      title={player?.username || 'Chargement...'}
      size="lg"
    >
      {loading || !player ? (
        // Loading skeleton
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-cyan-500/10 rounded w-1/2" />
          <div className="h-4 bg-cyan-500/10 rounded w-3/4" />
          <div className="h-4 bg-cyan-500/10 rounded w-2/3" />
          <div className="h-32 bg-cyan-500/10 rounded" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header with alliance and join date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {player.allianceTag && (
                <HoloBadge variant="info" size="md" glow>
                  {player.allianceTag}
                </HoloBadge>
              )}
              <span className="text-white/50 text-sm">
                Membre depuis {new Date(player.joinedAt).toLocaleDateString('fr-FR')}
              </span>
            </div>

            {/* Honor points if available */}
            {player.honorPoints !== undefined && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span className="font-mono text-yellow-400">{formatNumber(player.honorPoints)}</span>
              </div>
            )}
          </div>

          {/* Main stats grid */}
          <div
            className="p-4 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.05), rgba(0, 0, 0, 0.3))',
              border: '1px solid rgba(0, 255, 255, 0.2)',
            }}
          >
            {/* Total rank header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 180, 0, 0.1))',
                    border: '2px solid rgba(255, 215, 0, 0.5)',
                    boxShadow: '0 0 15px rgba(255, 215, 0, 0.3)',
                  }}
                >
                  <span
                    className="text-lg font-bold font-mono"
                    style={{ color: '#ffd700' }}
                  >
                    #{player.ranks.total}
                  </span>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-white/50">Rang Global</span>
                  <div
                    className="text-2xl font-bold font-mono"
                    style={{
                      color: '#00ffff',
                      textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                    }}
                  >
                    {formatNumber(player.points.total)}
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex gap-4 text-right">
                <div>
                  <span className="text-xs text-white/50 block">Planetes</span>
                  <span className="font-mono text-white">{player.planetsCount}</span>
                </div>
                <div>
                  <span className="text-xs text-white/50 block">Vaisseaux</span>
                  <span className="font-mono text-white">{formatNumber(player.shipsCount)}</span>
                </div>
              </div>
            </div>

            {/* Category stats */}
            <div className="space-y-3">
              <StatsRow
                label="Economie"
                rank={player.ranks.economy}
                points={player.points.economy}
                maxPoints={maxPoints}
                color="#ffd700"
                icon={
                  <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="9" r="5"/>
                    <circle cx="15" cy="15" r="5"/>
                  </svg>
                }
              />
              <StatsRow
                label="Recherche"
                rank={player.ranks.research}
                points={player.points.research}
                maxPoints={maxPoints}
                color="#00ffff"
                icon={
                  <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 3h6v2h-1v4l4 8v2H6v-2l4-8V5H9V3zm2 4v4.47L8.53 17h6.94L13 11.47V7h-2z"/>
                  </svg>
                }
              />
              <StatsRow
                label="Militaire"
                rank={player.ranks.military}
                points={player.points.military}
                maxPoints={maxPoints}
                color="#ff4444"
                icon={
                  <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14.1 4.5L19.5 9.9l-1.4 1.4-5.4-5.4L14.1 4.5zM4 16l4-4 4 4-4 4-4-4z"/>
                  </svg>
                }
              />
              <StatsRow
                label="Defense"
                rank={player.ranks.defense}
                points={player.points.defense}
                maxPoints={maxPoints}
                color="#00ff88"
                icon={
                  <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"/>
                  </svg>
                }
              />
            </div>
          </div>

          {/* Points evolution chart */}
          {chartData && chartData.length > 1 && (
            <div
              className="p-4 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.05), rgba(0, 0, 0, 0.3))',
                border: '1px solid rgba(0, 255, 255, 0.2)',
              }}
            >
              <h4
                className="text-sm font-semibold uppercase tracking-wider mb-3"
                style={{ color: '#00ffff' }}
              >
                Evolution des points (7 derniers jours)
              </h4>
              <div className="h-32">
                <HoloChart
                  type="line"
                  data={chartData.map(d => ({ ...d, color: '#00ffff' }))}
                  height={128}
                  showLegend={false}
                  animated
                />
              </div>
            </div>
          )}
        </div>
      )}
    </HoloModal>
  )
}

export default PlayerStatsCard
