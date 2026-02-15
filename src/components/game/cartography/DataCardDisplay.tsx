'use client'

import { motion } from 'framer-motion'
import type { CartographyItem, CardRarity } from '@/lib/exploration'

interface DataCardDisplayProps {
  card: CartographyItem
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  showActions?: boolean
  onUse?: () => void
  onSell?: () => void
}

const RARITY_COLORS: Record<CardRarity, { border: string; bg: string; glow: string; text: string }> = {
  common: {
    border: 'border-gray-500',
    bg: 'bg-gray-800/80',
    glow: '',
    text: 'text-gray-300'
  },
  uncommon: {
    border: 'border-green-500',
    bg: 'bg-green-900/30',
    glow: 'shadow-green-500/20',
    text: 'text-green-400'
  },
  rare: {
    border: 'border-blue-500',
    bg: 'bg-blue-900/30',
    glow: 'shadow-blue-500/30',
    text: 'text-blue-400'
  },
  epic: {
    border: 'border-purple-500',
    bg: 'bg-purple-900/30',
    glow: 'shadow-purple-500/40',
    text: 'text-purple-400'
  },
  legendary: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-900/30',
    glow: 'shadow-yellow-500/50',
    text: 'text-yellow-400'
  }
}

const CARD_TYPE_ICONS: Record<string, string> = {
  system_map: '🌟',
  galaxy_map: '🌌',
  resource_map: '💎',
  route_map: '🛤️',
  wormhole_map: '🌀',
  special_map: '✨'
}

const CARD_TYPE_NAMES: Record<string, string> = {
  system_map: 'Carte Système',
  galaxy_map: 'Carte Galactique',
  resource_map: 'Carte Ressources',
  route_map: 'Carte Route',
  wormhole_map: 'Carte Trou de Ver',
  special_map: 'Carte Spéciale'
}

const SIZE_CLASSES = {
  sm: 'w-32 h-44',
  md: 'w-48 h-64',
  lg: 'w-64 h-80'
}

export function DataCardDisplay({
  card,
  onClick,
  size = 'md',
  showActions = false,
  onUse,
  onSell
}: DataCardDisplayProps) {
  const colors = RARITY_COLORS[card.rarity]
  const icon = CARD_TYPE_ICONS[card.cardType] || '📜'
  const isLegendary = card.rarity === 'legendary'

  return (
    <motion.div
      className={`relative ${SIZE_CLASSES[size]} rounded-lg border-2 ${colors.border} ${colors.bg}
        cursor-pointer overflow-hidden transition-all hover:scale-105
        ${isLegendary ? 'shadow-lg shadow-yellow-500/30' : ''}`}
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Legendary glow effect */}
      {isLegendary && (
        <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent animate-pulse" />
      )}

      {/* Card Content */}
      <div className="relative h-full flex flex-col p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">{icon}</span>
          <span className={`text-xs font-bold uppercase ${colors.text}`}>
            {card.rarity}
          </span>
        </div>

        {/* Icon Area */}
        <div className="flex-1 flex items-center justify-center">
          <div className={`text-6xl opacity-80 ${isLegendary ? 'animate-pulse' : ''}`}>
            {icon}
          </div>
        </div>

        {/* Card Info */}
        <div className="mt-auto">
          <h3 className="text-sm font-semibold text-white truncate">
            {card.name}
          </h3>
          <p className="text-xs text-gray-400 truncate">
            {CARD_TYPE_NAMES[card.cardType]}
          </p>

          {/* Quality indicator */}
          {card.dataPayload?.quality && (
            <div className="mt-1 flex items-center gap-1">
              <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    card.dataPayload.quality >= 80
                      ? 'bg-green-500'
                      : card.dataPayload.quality >= 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${card.dataPayload.quality}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{card.dataPayload.quality}%</span>
            </div>
          )}

          {/* Special features */}
          {card.dataPayload?.specialFeatures && card.dataPayload.specialFeatures.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {card.dataPayload.specialFeatures.slice(0, 2).map((feature, i) => (
                <span
                  key={i}
                  className="text-xs px-1 py-0.5 bg-purple-500/20 text-purple-300 rounded"
                >
                  {feature.replace('_', ' ')}
                </span>
              ))}
              {card.dataPayload.specialFeatures.length > 2 && (
                <span className="text-xs text-gray-500">
                  +{card.dataPayload.specialFeatures.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions overlay */}
      {showActions && (
        <motion.div
          className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity"
          initial={false}
        >
          {onUse && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUse()
              }}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition-colors"
            >
              Utiliser
            </button>
          )}
          {onSell && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSell()
              }}
              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg transition-colors"
            >
              Vendre
            </button>
          )}
        </motion.div>
      )}

      {/* Consumed badge */}
      {card.isConsumed && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <span className="text-red-400 font-bold uppercase text-lg transform -rotate-12">
            Utilisée
          </span>
        </div>
      )}
    </motion.div>
  )
}
