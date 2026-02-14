'use client'

import React from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

interface RankChangeIndicatorProps {
  currentRank: number
  previousRank: number | null
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  className?: string
}

const sizeStyles = {
  sm: {
    icon: 'w-3 h-3',
    text: 'text-[10px]',
    gap: 'gap-0.5',
  },
  md: {
    icon: 'w-4 h-4',
    text: 'text-xs',
    gap: 'gap-1',
  },
  lg: {
    icon: 'w-5 h-5',
    text: 'text-sm',
    gap: 'gap-1.5',
  },
}

export function RankChangeIndicator({
  currentRank,
  previousRank,
  size = 'md',
  showValue = true,
  className,
}: RankChangeIndicatorProps) {
  const styles = sizeStyles[size]

  // No previous rank data
  if (previousRank === null || previousRank === undefined) {
    return (
      <span
        className={clsx('text-gray-500', styles.text, className)}
        title="Nouveau"
      >
        -
      </span>
    )
  }

  const change = previousRank - currentRank

  // No change
  if (change === 0) {
    return (
      <span
        className={clsx(
          'flex items-center justify-center',
          styles.gap,
          className
        )}
        title="Stable"
      >
        <span className="text-gray-500">-</span>
      </span>
    )
  }

  const isImproved = change > 0
  const changeValue = Math.abs(change)

  return (
    <motion.span
      className={clsx(
        'inline-flex items-center justify-center',
        styles.gap,
        isImproved ? 'text-emerald-400' : 'text-red-400',
        className
      )}
      initial={{ opacity: 0, y: isImproved ? 5 : -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      title={isImproved ? `+${changeValue} places` : `-${changeValue} places`}
    >
      {/* Arrow icon */}
      <motion.svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="currentColor"
        initial={false}
        animate={{
          y: isImproved ? [0, -2, 0] : [0, 2, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          filter: `drop-shadow(0 0 4px ${isImproved ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'})`,
        }}
      >
        {isImproved ? (
          // Arrow up
          <path d="M12 4l-8 8h5v8h6v-8h5z" />
        ) : (
          // Arrow down
          <path d="M12 20l8-8h-5V4H9v8H4z" />
        )}
      </motion.svg>

      {/* Change value */}
      {showValue && (
        <span
          className={clsx(
            'font-mono font-semibold',
            styles.text
          )}
          style={{
            textShadow: `0 0 8px ${isImproved ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
          }}
        >
          {changeValue}
        </span>
      )}
    </motion.span>
  )
}

export default RankChangeIndicator
