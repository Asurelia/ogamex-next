'use client'

import React, { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { formatNumber } from '@/game/formulas'
import { RankChangeIndicator } from './RankChangeIndicator'
import { HoloBadge } from '@/components/ui/holographic'
import type { AllianceScore } from './types'

interface AllianceHighscoreTableProps {
  data: AllianceScore[]
  loading?: boolean
  onAllianceClick?: (alliance: AllianceScore) => void
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

// Alliance rank medal for top 3
function AllianceRankMedal({ rank }: { rank: number }) {
  const medals = {
    1: { color: '#FFD700', secondaryColor: '#B8860B' },
    2: { color: '#C0C0C0', secondaryColor: '#A0A0A0' },
    3: { color: '#CD7F32', secondaryColor: '#8B4513' },
  }

  const medal = medals[rank as keyof typeof medals]
  if (!medal) return null

  return (
    <motion.div
      className="relative inline-flex items-center justify-center w-10 h-10"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 32 32"
        fill="none"
      >
        {/* Shield shape for alliances */}
        <path
          d="M16 2L4 8v10c0 8 12 12 12 12s12-4 12-12V8L16 2z"
          fill={medal.color}
          style={{
            filter: `drop-shadow(0 0 8px ${medal.color}80)`,
          }}
        />
        <path
          d="M16 4L6 9v9c0 6.5 10 10 10 10s10-3.5 10-10V9L16 4z"
          fill="transparent"
          stroke={medal.secondaryColor}
          strokeWidth="1"
        />
        <text
          x="16"
          y="20"
          textAnchor="middle"
          fill="rgba(0,0,0,0.8)"
          fontSize="12"
          fontWeight="bold"
        >
          {rank}
        </text>
      </svg>
    </motion.div>
  )
}

export function AllianceHighscoreTable({
  data,
  loading = false,
  onAllianceClick,
}: AllianceHighscoreTableProps) {
  const router = useRouter()

  const handleAllianceClick = useCallback((alliance: AllianceScore) => {
    if (onAllianceClick) {
      onAllianceClick(alliance)
    } else {
      router.push(`/game/alliance?id=${alliance.allianceId}`)
    }
  }, [onAllianceClick, router])

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Glow background - magenta for alliances */}
      <div
        className="absolute inset-0 rounded-lg blur-xl opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,0,255,0.15), transparent 70%)',
        }}
      />

      {/* Main container */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(10, 25, 40, 0.9), rgba(5, 15, 30, 0.95))',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 0, 255, 0.2)',
        }}
      >
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden">
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,0,255,0.3), transparent)',
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
              rgba(255, 0, 255, 0.05) 2px,
              rgba(255, 0, 255, 0.05) 4px
            )`,
          }}
        />

        <div className="relative overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th
                  className="w-20 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border-b border-fuchsia-500/30"
                  style={{
                    color: '#ff00ff',
                    textShadow: '0 0 10px rgba(255,0,255,0.5)',
                    background: 'linear-gradient(180deg, rgba(255,0,255,0.1), transparent)',
                  }}
                >
                  Rang
                </th>
                <th
                  className="w-16 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider border-b border-fuchsia-500/30"
                  style={{
                    color: '#ff00ff',
                    textShadow: '0 0 10px rgba(255,0,255,0.5)',
                    background: 'linear-gradient(180deg, rgba(255,0,255,0.1), transparent)',
                  }}
                >
                  <span className="sr-only">Changement</span>
                </th>
                <th
                  className="w-24 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border-b border-fuchsia-500/30"
                  style={{
                    color: '#ff00ff',
                    textShadow: '0 0 10px rgba(255,0,255,0.5)',
                    background: 'linear-gradient(180deg, rgba(255,0,255,0.1), transparent)',
                  }}
                >
                  Tag
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-b border-fuchsia-500/30"
                  style={{
                    color: '#ff00ff',
                    textShadow: '0 0 10px rgba(255,0,255,0.5)',
                    background: 'linear-gradient(180deg, rgba(255,0,255,0.1), transparent)',
                  }}
                >
                  Nom
                </th>
                <th
                  className="w-24 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border-b border-fuchsia-500/30 hidden sm:table-cell"
                  style={{
                    color: '#ff00ff',
                    textShadow: '0 0 10px rgba(255,0,255,0.5)',
                    background: 'linear-gradient(180deg, rgba(255,0,255,0.1), transparent)',
                  }}
                >
                  Membres
                </th>
                <th
                  className="w-32 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider border-b border-fuchsia-500/30"
                  style={{
                    color: '#ff00ff',
                    textShadow: '0 0 10px rgba(255,0,255,0.5)',
                    background: 'linear-gradient(180deg, rgba(255,0,255,0.1), transparent)',
                  }}
                >
                  Points
                </th>
                <th
                  className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider border-b border-fuchsia-500/30 hidden md:table-cell"
                  style={{
                    color: '#ff00ff',
                    textShadow: '0 0 10px rgba(255,0,255,0.5)',
                    background: 'linear-gradient(180deg, rgba(255,0,255,0.1), transparent)',
                  }}
                >
                  Moyenne
                </th>
              </tr>
            </thead>

            <tbody>
              <AnimatePresence mode="wait">
                {loading ? (
                  // Skeleton loading state
                  Array.from({ length: 10 }).map((_, idx) => (
                    <SkeletonRow key={`skeleton-${idx}`} columns={7} />
                  ))
                ) : data.length === 0 ? (
                  // Empty state
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255,0,255,0.1), rgba(200,0,255,0.05))',
                            border: '1px solid rgba(255,0,255,0.2)',
                          }}
                        >
                          <svg
                            className="w-8 h-8"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="rgba(255,0,255,0.5)"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                        <span style={{ color: 'rgba(200,150,230,0.7)' }}>
                          Aucune alliance trouvee
                        </span>
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  // Data rows
                  data.map((alliance, rowIdx) => (
                    <motion.tr
                      key={alliance.allianceId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: rowIdx * 0.03, duration: 0.3 }}
                      className="relative cursor-pointer transition-colors group"
                      onClick={() => handleAllianceClick(alliance)}
                      whileHover={{
                        backgroundColor: 'rgba(255,0,255,0.05)',
                      }}
                    >
                      {/* Rank */}
                      <td className="px-4 py-3 text-center border-b border-fuchsia-500/10">
                        {alliance.rank <= 3 ? (
                          <AllianceRankMedal rank={alliance.rank} />
                        ) : (
                          <span
                            className="font-mono text-lg font-bold"
                            style={{
                              color: 'rgba(200,180,255,0.9)',
                            }}
                          >
                            {alliance.rank}
                          </span>
                        )}
                      </td>

                      {/* Rank change */}
                      <td className="px-2 py-3 text-center border-b border-fuchsia-500/10">
                        <RankChangeIndicator
                          currentRank={alliance.rank}
                          previousRank={alliance.previousRank}
                          size="sm"
                        />
                      </td>

                      {/* Tag */}
                      <td className="px-4 py-3 text-center border-b border-fuchsia-500/10">
                        <HoloBadge
                          variant="purple"
                          size="sm"
                          glow
                        >
                          {alliance.tag}
                        </HoloBadge>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3 border-b border-fuchsia-500/10">
                        <span
                          className="font-semibold"
                          style={{
                            color: 'rgba(200,180,255,0.9)',
                          }}
                        >
                          {alliance.name}
                        </span>
                      </td>

                      {/* Members */}
                      <td className="px-4 py-3 text-center border-b border-fuchsia-500/10 hidden sm:table-cell">
                        <span
                          className="font-mono"
                          style={{
                            color: 'rgba(200,200,255,0.7)',
                          }}
                        >
                          {alliance.membersCount}
                        </span>
                      </td>

                      {/* Total Points */}
                      <td className="px-4 py-3 text-right border-b border-fuchsia-500/10">
                        <span
                          className="font-mono font-semibold"
                          style={{
                            color: '#ff00ff',
                            textShadow: '0 0 8px rgba(255,0,255,0.3)',
                          }}
                        >
                          {formatNumber(alliance.totalPoints)}
                        </span>
                      </td>

                      {/* Average Points */}
                      <td className="px-4 py-3 text-right border-b border-fuchsia-500/10 hidden md:table-cell">
                        <span
                          className="font-mono text-sm"
                          style={{
                            color: 'rgba(200,150,255,0.7)',
                          }}
                        >
                          {formatNumber(alliance.averagePoints)}
                        </span>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Corner decorations - magenta theme */}
        <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none">
          <div
            className="absolute top-0 left-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(90deg, #ff00ff, transparent)' }}
          />
          <div
            className="absolute top-0 left-0 w-[1px] h-full"
            style={{ background: 'linear-gradient(180deg, #ff00ff, transparent)' }}
          />
        </div>
        <div className="absolute top-0 right-0 w-4 h-4 pointer-events-none">
          <div
            className="absolute top-0 right-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(270deg, #ff00ff, transparent)' }}
          />
          <div
            className="absolute top-0 right-0 w-[1px] h-full"
            style={{ background: 'linear-gradient(180deg, #ff00ff, transparent)' }}
          />
        </div>
        <div className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none">
          <div
            className="absolute bottom-0 left-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(90deg, #ff00ff, transparent)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-[1px] h-full"
            style={{ background: 'linear-gradient(0deg, #ff00ff, transparent)' }}
          />
        </div>
        <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none">
          <div
            className="absolute bottom-0 right-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(270deg, #ff00ff, transparent)' }}
          />
          <div
            className="absolute bottom-0 right-0 w-[1px] h-full"
            style={{ background: 'linear-gradient(0deg, #ff00ff, transparent)' }}
          />
        </div>
      </div>
    </div>
  )
}

export default AllianceHighscoreTable
