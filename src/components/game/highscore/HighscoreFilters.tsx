'use client'

import React, { useCallback } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { HoloInput, HoloButton } from '@/components/ui/holographic'
import type { ScoreCategory, HighscoreFiltersState } from './types'
import { SCORE_CATEGORIES, ITEMS_PER_PAGE_OPTIONS } from './types'

interface HighscoreFiltersProps {
  filters: HighscoreFiltersState
  onFiltersChange: (filters: Partial<HighscoreFiltersState>) => void
  totalPlayers?: number
  loading?: boolean
}

// Category icon component
function CategoryIcon({ category, active }: { category: string; active: boolean }) {
  const iconColor = active ? '#00ffff' : 'rgba(255,255,255,0.5)'
  const glowColor = active ? 'rgba(0,255,255,0.5)' : 'transparent'

  const icons: Record<string, React.ReactNode> = {
    trophy: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={iconColor} style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}>
        <path d="M5 3h14c.55 0 1 .45 1 1v3c0 1.66-1.34 3-3 3h-1.07c-.43 1.37-1.44 2.48-2.73 3.04-.32.14-.54.44-.54.79V15h1.5c.83 0 1.5.67 1.5 1.5v.5H8v-.5c0-.83.67-1.5 1.5-1.5H11v-1.17c0-.35-.22-.65-.54-.79-1.29-.56-2.3-1.67-2.73-3.04H6c-1.66 0-3-1.34-3-3V4c0-.55.45-1 1-1zm1 2v2c0 .55.45 1 1 1h.5c0-1.1.24-2.14.68-3H6zm12 0h-1.68c.44.86.68 1.9.68 3h.5c.55 0 1-.45 1-1V5zM7 20h10v1c0 .55-.45 1-1 1H8c-.55 0-1-.45-1-1v-1z"/>
      </svg>
    ),
    coins: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={iconColor} style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}>
        <circle cx="9" cy="9" r="6" stroke={iconColor} strokeWidth="2" fill="none"/>
        <circle cx="15" cy="15" r="6" fill={iconColor}/>
      </svg>
    ),
    flask: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={iconColor} style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}>
        <path d="M9 3h6v2h-1v4l4 8v2H6v-2l4-8V5H9V3zm2 4v4.47L8.53 17h6.94L13 11.47V7h-2z"/>
      </svg>
    ),
    sword: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={iconColor} style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}>
        <path d="M14.1 4.5L19.5 9.9l-1.4 1.4-5.4-5.4L14.1 4.5zM4 16l4-4 4 4-4 4-4-4zm6.6-6.6l-5 5L4 12.8l5-5 1.6 1.6zm4.3 4.3l5 5-1.6 1.6-5-5 1.6-1.6zM19 3v2h-2v2h2v2h2V7h2V5h-2V3h-2z"/>
      </svg>
    ),
    shield: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={iconColor} style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}>
        <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm0 10.99h6c-.53 4.12-3.28 7.79-6 8.94V13H6V7.3l6-3V12.99z"/>
      </svg>
    ),
    users: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={iconColor} style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}>
        <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    ),
  }

  return icons[category] || icons.trophy
}

export function HighscoreFilters({
  filters,
  onFiltersChange,
  totalPlayers,
  loading = false,
}: HighscoreFiltersProps) {
  const handleCategoryChange = useCallback((category: ScoreCategory | 'alliance') => {
    onFiltersChange({ category, page: 1 })
  }, [onFiltersChange])

  const handleSearchChange = useCallback((value: string) => {
    onFiltersChange({ search: value, page: 1 })
  }, [onFiltersChange])

  const handlePerPageChange = useCallback((perPage: number) => {
    onFiltersChange({ perPage, page: 1 })
  }, [onFiltersChange])

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {SCORE_CATEGORIES.map((cat) => {
          const isActive = filters.category === cat.id

          return (
            <motion.button
              key={cat.id}
              className={clsx(
                'relative flex items-center gap-2 px-4 py-2 rounded-lg',
                'font-medium text-sm uppercase tracking-wider',
                'transition-all duration-200',
                'focus:outline-none',
                isActive && 'text-cyan-400'
              )}
              style={{
                background: isActive
                  ? 'linear-gradient(180deg, rgba(0, 255, 255, 0.2) 0%, rgba(0, 255, 255, 0.1) 100%)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${isActive ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                color: isActive ? '#00ffff' : 'rgba(255, 255, 255, 0.6)',
                boxShadow: isActive ? '0 0 15px rgba(0, 255, 255, 0.3)' : 'none',
                textShadow: isActive ? '0 0 10px rgba(0, 255, 255, 0.5)' : 'none',
              }}
              onClick={() => handleCategoryChange(cat.id)}
              whileHover={{
                scale: 1.02,
                backgroundColor: isActive ? undefined : 'rgba(255, 255, 255, 0.08)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              <CategoryIcon category={cat.icon} active={isActive} />
              <span className="hidden sm:inline">{cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}</span>
            </motion.button>
          )
        })}

        {/* Alliance tab - separate styling */}
        <motion.button
          className={clsx(
            'relative flex items-center gap-2 px-4 py-2 rounded-lg',
            'font-medium text-sm uppercase tracking-wider',
            'transition-all duration-200',
            'focus:outline-none',
            filters.category === 'alliance' && 'text-fuchsia-400'
          )}
          style={{
            background: filters.category === 'alliance'
              ? 'linear-gradient(180deg, rgba(255, 0, 255, 0.2) 0%, rgba(255, 0, 255, 0.1) 100%)'
              : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${filters.category === 'alliance' ? 'rgba(255, 0, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
            color: filters.category === 'alliance' ? '#ff00ff' : 'rgba(255, 255, 255, 0.6)',
            boxShadow: filters.category === 'alliance' ? '0 0 15px rgba(255, 0, 255, 0.3)' : 'none',
            textShadow: filters.category === 'alliance' ? '0 0 10px rgba(255, 0, 255, 0.5)' : 'none',
          }}
          onClick={() => handleCategoryChange('alliance')}
          whileHover={{
            scale: 1.02,
            backgroundColor: filters.category === 'alliance' ? undefined : 'rgba(255, 255, 255, 0.08)',
          }}
          whileTap={{ scale: 0.98 }}
        >
          <CategoryIcon category="users" active={filters.category === 'alliance'} />
          <span className="hidden sm:inline">Alliances</span>
        </motion.button>
      </div>

      {/* Search and per-page options */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search input */}
        <div className="flex-1 min-w-[200px] max-w-md">
          <HoloInput
            type="search"
            placeholder="Rechercher un joueur..."
            value={filters.search}
            onChange={handleSearchChange}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            }
            size="sm"
            disabled={loading}
          />
        </div>

        {/* Items per page selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/50">Afficher:</span>
          <div className="flex gap-1">
            {ITEMS_PER_PAGE_OPTIONS.map((option) => (
              <motion.button
                key={option}
                className={clsx(
                  'px-3 py-1.5 rounded text-sm font-mono',
                  'transition-all duration-200'
                )}
                style={{
                  background: filters.perPage === option
                    ? 'rgba(0, 255, 255, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${filters.perPage === option ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: filters.perPage === option ? '#00ffff' : 'rgba(255, 255, 255, 0.6)',
                }}
                onClick={() => handlePerPageChange(option)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={loading}
              >
                {option}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Total players info */}
        {totalPlayers !== undefined && (
          <div
            className="text-sm font-mono"
            style={{ color: 'rgba(0, 255, 255, 0.7)' }}
          >
            {totalPlayers.toLocaleString()} joueurs
          </div>
        )}
      </div>
    </div>
  )
}

export default HighscoreFilters
