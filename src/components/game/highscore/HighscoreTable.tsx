'use client'

import React, { useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { formatNumber } from '@/game/formulas'
import { RankChangeIndicator } from './RankChangeIndicator'
import { HoloBadge } from '@/components/ui/holographic'
import type { PlayerScore, ScoreCategory } from './types'

interface HighscoreTableProps {
  data: PlayerScore[]
  category: ScoreCategory
  loading?: boolean
  currentUserId?: string
  onPlayerClick?: (player: PlayerScore) => void
  onAllianceClick?: (allianceId: string) => void
}

// Skeleton row for loading state
function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, idx) => (
        <td
          key={idx}
          className="px-4 py-3 border-b border-cyan-500/10"
        >
          <motion.div
            className="h-4 rounded"
            style={{
              background: 'linear-gradient(90deg, rgba(0,255,255,0.1) 0%, rgba(0,255,255,0.2) 50%, rgba(0,255,255,0.1) 100%)',
              backgroundSize: '200% 100%',
            }}
            animate={{
              backgroundPosition: ['0% 0%', '200% 0%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </td>
      ))}
    </tr>
  )
}

// Rank medal for top 3
function RankMedal({ rank }: { rank: number }) {
  const medals = {
    1: { color: '#FFD700', label: '1st' },
    2: { color: '#C0C0C0', label: '2nd' },
    3: { color: '#CD7F32', label: '3rd' },
  }

  const medal = medals[rank as keyof typeof medals]
  if (!medal) return null

  return (
    <motion.div
      className="relative inline-flex items-center justify-center w-8 h-8"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 24 24"
        fill="none"
      >
        {/* Medal shape */}
        <circle
          cx="12"
          cy="12"
          r="10"
          fill={medal.color}
          style={{
            filter: `drop-shadow(0 0 6px ${medal.color}80)`,
          }}
        />
        <circle
          cx="12"
          cy="12"
          r="7"
          fill="transparent"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1"
        />
        <text
          x="12"
          y="16"
          textAnchor="middle"
          fill="rgba(0,0,0,0.8)"
          fontSize="10"
          fontWeight="bold"
        >
          {rank}
        </text>
      </svg>
    </motion.div>
  )
}

export function HighscoreTable({
  data,
  category,
  loading = false,
  currentUserId,
  onPlayerClick,
  onAllianceClick,
}: HighscoreTableProps) {
  const router = useRouter()

  const getPointsForCategory = useCallback((player: PlayerScore): number => {
    switch (category) {
      case 'economy': return player.economyPoints
      case 'research': return player.researchPoints
      case 'military': return player.militaryPoints
      case 'defense': return player.defensePoints
      default: return player.totalPoints
    }
  }, [category])

  const handlePlayerClick = useCallback((player: PlayerScore) => {
    if (onPlayerClick) {
      onPlayerClick(player)
    }
  }, [onPlayerClick])

  const handleAllianceClick = useCallback((e: React.MouseEvent, allianceId: string) => {
    e.stopPropagation()
    if (onAllianceClick) {
      onAllianceClick(allianceId)
    } else {
      router.push(`/game/alliance?id=${allianceId}`)
    }
  }, [onAllianceClick, router])

  const columns = ['rank', 'change', 'player', 'alliance', 'points']

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Glow background */}
      <div
        className="absolute inset-0 rounded-lg blur-xl opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,255,255,0.15), transparent 70%)',
        }}
      />

      {/* Main container */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(10, 25, 40, 0.9), rgba(5, 15, 30, 0.95))',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 255, 255, 0.2)',
        }}
      >
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden">
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,255,255,0.3), transparent)',
              transform: 'translateX(-100%)',
            }}
            animate={{
              transform: ['translateX(-100%)', 'translateX(100%)'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>

        {/* Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 255, 255, 0.05) 2px,
              rgba(0, 255, 255, 0.05) 4px
            )`,
          }}
        />

        <div className="relative overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th
                  className="w-20 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border-b border-cyan-500/30"
                  style={{
                    color: '#00ffff',
                    textShadow: '0 0 10px rgba(0,255,255,0.5)',
                    background: 'linear-gradient(180deg, rgba(0,255,255,0.1), transparent)',
                  }}
                >
                  Rang
                </th>
                <th
                  className="w-16 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider border-b border-cyan-500/30"
                  style={{
                    color: '#00ffff',
                    textShadow: '0 0 10px rgba(0,255,255,0.5)',
                    background: 'linear-gradient(180deg, rgba(0,255,255,0.1), transparent)',
                  }}
                >
                  <span className="sr-only">Changement</span>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-b border-cyan-500/30"
                  style={{
                    color: '#00ffff',
                    textShadow: '0 0 10px rgba(0,255,255,0.5)',
                    background: 'linear-gradient(180deg, rgba(0,255,255,0.1), transparent)',
                  }}
                >
                  Joueur
                </th>
                <th
                  className="w-32 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border-b border-cyan-500/30 hidden sm:table-cell"
                  style={{
                    color: '#00ffff',
                    textShadow: '0 0 10px rgba(0,255,255,0.5)',
                    background: 'linear-gradient(180deg, rgba(0,255,255,0.1), transparent)',
                  }}
                >
                  Alliance
                </th>
                <th
                  className="w-32 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider border-b border-cyan-500/30"
                  style={{
                    color: '#00ffff',
                    textShadow: '0 0 10px rgba(0,255,255,0.5)',
                    background: 'linear-gradient(180deg, rgba(0,255,255,0.1), transparent)',
                  }}
                >
                  Points
                </th>
              </tr>
            </thead>

            <tbody>
              <AnimatePresence mode="wait">
                {loading ? (
                  // Skeleton loading state
                  Array.from({ length: 10 }).map((_, idx) => (
                    <SkeletonRow key={`skeleton-${idx}`} columns={5} />
                  ))
                ) : data.length === 0 ? (
                  // Empty state
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{
                            background: 'linear-gradient(135deg, rgba(0,255,255,0.1), rgba(0,200,255,0.05))',
                            border: '1px solid rgba(0,255,255,0.2)',
                          }}
                        >
                          <svg
                            className="w-8 h-8"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="rgba(0,255,255,0.5)"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <span style={{ color: 'rgba(150,200,230,0.7)' }}>
                          Aucun joueur trouve
                        </span>
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  // Data rows
                  data.map((player, rowIdx) => {
                    const isCurrentUser = player.userId === currentUserId
                    const points = getPointsForCategory(player)

                    return (
                      <motion.tr
                        key={player.userId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: rowIdx * 0.03, duration: 0.3 }}
                        className={clsx(
                          'relative cursor-pointer transition-colors group',
                          isCurrentUser && 'bg-cyan-500/10'
                        )}
                        style={{
                          background: isCurrentUser
                            ? 'linear-gradient(90deg, rgba(0,255,255,0.15), rgba(0,255,255,0.05))'
                            : undefined,
                        }}
                        onClick={() => handlePlayerClick(player)}
                        whileHover={{
                          backgroundColor: 'rgba(0,255,255,0.05)',
                        }}
                      >
                        {/* Current user indicator */}
                        {isCurrentUser && (
                          <motion.div
                            layoutId="current-user-indicator"
                            className="absolute left-0 top-0 bottom-0 w-[3px]"
                            style={{
                              background: 'linear-gradient(180deg, #00ffff, #0088ff)',
                              boxShadow: '0 0 10px rgba(0,255,255,0.6)',
                            }}
                          />
                        )}

                        {/* Rank */}
                        <td className="px-4 py-3 text-center border-b border-cyan-500/10">
                          {player.rank <= 3 ? (
                            <RankMedal rank={player.rank} />
                          ) : (
                            <span
                              className="font-mono text-lg font-bold"
                              style={{
                                color: isCurrentUser ? '#00ffff' : 'rgba(200,230,255,0.9)',
                                textShadow: isCurrentUser ? '0 0 8px rgba(0,255,255,0.5)' : 'none',
                              }}
                            >
                              {player.rank}
                            </span>
                          )}
                        </td>

                        {/* Rank change */}
                        <td className="px-2 py-3 text-center border-b border-cyan-500/10">
                          <RankChangeIndicator
                            currentRank={player.rank}
                            previousRank={player.previousRank}
                            size="sm"
                          />
                        </td>

                        {/* Player name */}
                        <td className="px-4 py-3 border-b border-cyan-500/10">
                          <span
                            className={clsx(
                              'font-semibold transition-colors',
                              isCurrentUser && 'text-cyan-400'
                            )}
                            style={{
                              color: isCurrentUser ? '#00ffff' : 'rgba(200,230,255,0.9)',
                              textShadow: isCurrentUser ? '0 0 8px rgba(0,255,255,0.3)' : 'none',
                            }}
                          >
                            {player.username}
                          </span>
                        </td>

                        {/* Alliance */}
                        <td className="px-4 py-3 text-center border-b border-cyan-500/10 hidden sm:table-cell">
                          {player.allianceTag ? (
                            <span
                              className="cursor-pointer hover:scale-105 transition-transform inline-block"
                              onClick={(e: React.MouseEvent) => {
                                if (player.allianceId) {
                                  handleAllianceClick(e, player.allianceId)
                                }
                              }}
                            >
                              <HoloBadge
                                variant="info"
                                size="sm"
                              >
                                {player.allianceTag}
                              </HoloBadge>
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>

                        {/* Points */}
                        <td className="px-4 py-3 text-right border-b border-cyan-500/10">
                          <span
                            className="font-mono font-semibold"
                            style={{
                              color: '#00ffff',
                              textShadow: '0 0 8px rgba(0,255,255,0.3)',
                            }}
                          >
                            {formatNumber(points)}
                          </span>
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none">
          <div
            className="absolute top-0 left-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(90deg, #00ffff, transparent)' }}
          />
          <div
            className="absolute top-0 left-0 w-[1px] h-full"
            style={{ background: 'linear-gradient(180deg, #00ffff, transparent)' }}
          />
        </div>
        <div className="absolute top-0 right-0 w-4 h-4 pointer-events-none">
          <div
            className="absolute top-0 right-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(270deg, #00ffff, transparent)' }}
          />
          <div
            className="absolute top-0 right-0 w-[1px] h-full"
            style={{ background: 'linear-gradient(180deg, #00ffff, transparent)' }}
          />
        </div>
        <div className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none">
          <div
            className="absolute bottom-0 left-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(90deg, #00ffff, transparent)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-[1px] h-full"
            style={{ background: 'linear-gradient(0deg, #00ffff, transparent)' }}
          />
        </div>
        <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none">
          <div
            className="absolute bottom-0 right-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(270deg, #00ffff, transparent)' }}
          />
          <div
            className="absolute bottom-0 right-0 w-[1px] h-full"
            style={{ background: 'linear-gradient(0deg, #00ffff, transparent)' }}
          />
        </div>
      </div>
    </div>
  )
}

export default HighscoreTable
