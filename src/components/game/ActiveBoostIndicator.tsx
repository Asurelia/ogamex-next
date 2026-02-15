'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import type { BoostType } from '@/types/database'

interface ActiveBoostIndicatorProps {
  type: BoostType
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const BOOST_CONFIG: Record<BoostType, { icon: string; color: string }> = {
  production: { icon: '⛏️', color: '#00ff88' },
  construction: { icon: '🏗️', color: '#ffaa00' },
  research: { icon: '🔬', color: '#aa88ff' },
  expedition: { icon: '🚀', color: '#00ccff' },
  attack: { icon: '⚔️', color: '#ff4444' },
}

function formatTimeShort(seconds: number): string {
  if (seconds <= 0) return '0s'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
  }
  if (minutes > 0) {
    return `${minutes}m${secs > 0 ? ` ${secs}s` : ''}`
  }
  return `${secs}s`
}

export function ActiveBoostIndicator({ type, showLabel = false, size = 'sm' }: ActiveBoostIndicatorProps) {
  const t = useTranslations('boost')
  const { isBoostActive, getBoostMultiplier, getBoostRemainingSeconds } = useGameStore()
  const [remaining, setRemaining] = useState(0)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const updateState = () => {
      setIsActive(isBoostActive(type))
      setRemaining(getBoostRemainingSeconds(type))
    }

    updateState()
    const interval = setInterval(updateState, 1000)
    return () => clearInterval(interval)
  }, [type, isBoostActive, getBoostRemainingSeconds])

  if (!isActive) return null

  const config = BOOST_CONFIG[type]
  const multiplier = getBoostMultiplier(type)
  const bonus = Math.round((multiplier - 1) * 100)

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={`inline-flex items-center gap-1 rounded ${sizeClasses[size]}`}
        style={{
          background: `${config.color}22`,
          border: `1px solid ${config.color}66`,
          boxShadow: `0 0 8px ${config.color}33`,
        }}
      >
        {/* Pulsing icon */}
        <motion.span
          animate={{ opacity: [1, 0.6, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {config.icon}
        </motion.span>

        {/* Bonus percentage */}
        <span style={{ color: config.color }} className="font-semibold">
          +{bonus}%
        </span>

        {/* Time remaining */}
        <span className="text-gray-400">
          {formatTimeShort(remaining)}
        </span>

        {/* Optional label */}
        {showLabel && (
          <span className="text-gray-500 hidden sm:inline">
            {t(`types.${type}`)}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

// Component to show all active boosts in a row
export function ActiveBoostsBar() {
  const t = useTranslations('boost')
  const { activeBoosts } = useGameStore()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Filter only non-expired boosts
  const currentBoosts = activeBoosts.filter(
    (b) => new Date(b.ends_at) > now
  )

  if (currentBoosts.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/30 rounded-lg border border-gray-700/50">
      <span className="text-xs text-gray-500 uppercase tracking-wide">
        {t('activeBoosts')}:
      </span>
      <div className="flex items-center gap-1.5">
        {currentBoosts.map((boost) => (
          <ActiveBoostIndicator
            key={boost.id}
            type={boost.boost_type}
            size="sm"
          />
        ))}
      </div>
    </div>
  )
}

export default ActiveBoostIndicator
