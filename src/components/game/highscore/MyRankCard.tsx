'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { formatNumber } from '@/game/formulas'
import { RankChangeIndicator } from './RankChangeIndicator'
import { HoloCard } from '@/components/ui/holographic'
import type { ScoreCategory } from './types'

interface MyRankCardProps {
  rank: number
  previousRank: number | null
  totalPlayers: number
  points: number
  category: ScoreCategory
  username: string
  onClick?: () => void
}

export function MyRankCard({
  rank,
  previousRank,
  totalPlayers,
  points,
  category,
  username,
  onClick,
}: MyRankCardProps) {
  // Calculate percentile
  const percentile = totalPlayers > 0 ? Math.round((1 - rank / totalPlayers) * 100) : 0

  // Category labels
  const categoryLabels: Record<ScoreCategory, string> = {
    total: 'General',
    economy: 'Economie',
    research: 'Recherche',
    military: 'Militaire',
    defense: 'Defense',
  }

  return (
    <HoloCard
      variant="highlight"
      glow
      onClick={onClick}
      className="cursor-pointer"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left side - Rank info */}
        <div className="flex items-center gap-4">
          {/* Rank number with glow */}
          <div className="relative">
            <motion.div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 180, 0, 0.1))',
                border: '2px solid rgba(255, 215, 0, 0.5)',
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
              }}
              animate={{
                boxShadow: [
                  '0 0 15px rgba(255, 215, 0, 0.3)',
                  '0 0 25px rgba(255, 215, 0, 0.5)',
                  '0 0 15px rgba(255, 215, 0, 0.3)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <span
                className="text-2xl font-bold font-mono"
                style={{
                  color: '#ffd700',
                  textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
                }}
              >
                #{rank}
              </span>
            </motion.div>

            {/* Rank change indicator */}
            <div className="absolute -top-1 -right-1">
              <RankChangeIndicator
                currentRank={rank}
                previousRank={previousRank}
                size="sm"
                showValue={false}
              />
            </div>
          </div>

          {/* Rank text */}
          <div className="flex flex-col">
            <span
              className="text-xs uppercase tracking-wider"
              style={{ color: 'rgba(255, 215, 0, 0.7)' }}
            >
              {categoryLabels[category]}
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: 'rgba(255, 255, 255, 0.9)' }}
            >
              {username}
            </span>
            <span className="text-xs text-white/50">
              sur {totalPlayers.toLocaleString()} joueurs
            </span>
          </div>
        </div>

        {/* Right side - Stats */}
        <div className="flex flex-col items-end gap-1">
          {/* Points */}
          <div className="flex items-baseline gap-1">
            <span
              className="text-xl font-bold font-mono"
              style={{
                color: '#00ffff',
                textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
              }}
            >
              {formatNumber(points)}
            </span>
            <span className="text-xs text-white/50">pts</span>
          </div>

          {/* Percentile bar */}
          <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #00ffff, #ffd700)',
                boxShadow: '0 0 6px rgba(0, 255, 255, 0.5)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${percentile}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs text-white/50">
            Top {100 - percentile}%
          </span>

          {/* Rank change details */}
          {previousRank !== null && previousRank !== rank && (
            <div className="flex items-center gap-1 mt-1">
              <RankChangeIndicator
                currentRank={rank}
                previousRank={previousRank}
                size="md"
              />
              <span className="text-xs text-white/50">depuis hier</span>
            </div>
          )}
        </div>
      </div>

      {/* Decorative scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[1px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.5), transparent)',
          top: '50%',
        }}
        animate={{
          opacity: [0, 0.5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </HoloCard>
  )
}

export default MyRankCard
