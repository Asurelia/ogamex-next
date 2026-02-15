'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { CardCreationQueueItem, CardRarity } from '@/lib/exploration'

interface CardCreationProgressProps {
  queueItem: CardCreationQueueItem
  onComplete?: () => void
}

const RARITY_COLORS: Record<CardRarity, string> = {
  common: 'bg-gray-500',
  uncommon: 'bg-green-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-yellow-500'
}

const CARD_TYPE_NAMES: Record<string, string> = {
  system_map: 'Carte Système',
  galaxy_map: 'Carte Galactique',
  resource_map: 'Carte Ressources',
  route_map: 'Carte Route',
  wormhole_map: 'Carte Trou de Ver',
  special_map: 'Carte Spéciale'
}

export function CardCreationProgress({ queueItem, onComplete }: CardCreationProgressProps) {
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now()
      const completesAt = new Date(queueItem.completesAt).getTime()
      const remaining = Math.max(0, completesAt - now)
      setTimeRemaining(remaining)
      setIsReady(remaining === 0)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [queueItem.completesAt])

  const startedAt = new Date(queueItem.startedAt).getTime()
  const completesAt = new Date(queueItem.completesAt).getTime()
  const totalDuration = completesAt - startedAt
  const elapsed = Date.now() - startedAt
  const progress = Math.min(100, (elapsed / totalDuration) * 100)

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  return (
    <motion.div
      className="p-3 rounded-lg bg-gray-800/50 border border-gray-700"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${RARITY_COLORS[queueItem.targetRarity]}`}
          />
          <span className="text-white font-medium">
            {CARD_TYPE_NAMES[queueItem.cardType] || queueItem.cardType}
          </span>
          <span className="text-xs text-gray-500 uppercase">
            {queueItem.targetRarity}
          </span>
        </div>

        {isReady ? (
          <button
            onClick={onComplete}
            className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors"
          >
            Récupérer
          </button>
        ) : (
          <span className="text-sm text-cyan-400 font-mono">
            {formatTime(timeRemaining)}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`absolute h-full ${RARITY_COLORS[queueItem.targetRarity]}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
        {isReady && (
          <motion.div
            className="absolute inset-0 bg-green-400/50"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>

      {/* Cost summary */}
      <div className="flex gap-3 mt-2 text-xs text-gray-500">
        {queueItem.costMetal > 0 && (
          <span>🔩 {queueItem.costMetal.toLocaleString()}</span>
        )}
        {queueItem.costCrystal > 0 && (
          <span>💎 {queueItem.costCrystal.toLocaleString()}</span>
        )}
        {queueItem.costDeuterium > 0 && (
          <span>⚗️ {queueItem.costDeuterium.toLocaleString()}</span>
        )}
        {queueItem.costDarkMatter > 0 && (
          <span>🌑 {queueItem.costDarkMatter}</span>
        )}
      </div>
    </motion.div>
  )
}
