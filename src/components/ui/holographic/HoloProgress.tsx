'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

export interface HoloProgressProps {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  variant?: 'default' | 'energy' | 'health' | 'shield' | 'metal' | 'crystal' | 'deuterium' | 'danger' | 'warning' | 'success'
  animated?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const variantStyles = {
  default: {
    gradient: 'linear-gradient(90deg, #00ffff, #0088ff)',
    glow: 'rgba(0, 255, 255, 0.5)',
    bg: 'rgba(0, 255, 255, 0.1)',
    color: '#00ffff',
  },
  energy: {
    gradient: 'linear-gradient(90deg, #ffcc00, #ff8800)',
    glow: 'rgba(255, 204, 0, 0.5)',
    bg: 'rgba(255, 204, 0, 0.1)',
    color: '#ffcc00',
  },
  health: {
    gradient: 'linear-gradient(90deg, #00ff88, #00cc66)',
    glow: 'rgba(0, 255, 136, 0.5)',
    bg: 'rgba(0, 255, 136, 0.1)',
    color: '#00ff88',
  },
  shield: {
    gradient: 'linear-gradient(90deg, #4488ff, #00ccff)',
    glow: 'rgba(68, 136, 255, 0.5)',
    bg: 'rgba(68, 136, 255, 0.1)',
    color: '#4488ff',
  },
  metal: {
    gradient: 'linear-gradient(90deg, #cccccc, #888888)',
    glow: 'rgba(204, 204, 204, 0.5)',
    bg: 'rgba(204, 204, 204, 0.1)',
    color: '#cccccc',
  },
  crystal: {
    gradient: 'linear-gradient(90deg, #77bbff, #4488cc)',
    glow: 'rgba(119, 187, 255, 0.5)',
    bg: 'rgba(119, 187, 255, 0.1)',
    color: '#77bbff',
  },
  deuterium: {
    gradient: 'linear-gradient(90deg, #00cc99, #008866)',
    glow: 'rgba(0, 204, 153, 0.5)',
    bg: 'rgba(0, 204, 153, 0.1)',
    color: '#00cc99',
  },
  danger: {
    gradient: 'linear-gradient(90deg, #ff4444, #cc0000)',
    glow: 'rgba(255, 68, 68, 0.5)',
    bg: 'rgba(255, 68, 68, 0.1)',
    color: '#ff4444',
  },
  warning: {
    gradient: 'linear-gradient(90deg, #ffd700, #ff8800)',
    glow: 'rgba(255, 215, 0, 0.5)',
    bg: 'rgba(255, 215, 0, 0.1)',
    color: '#ffd700',
  },
  success: {
    gradient: 'linear-gradient(90deg, #00ff88, #00cc66)',
    glow: 'rgba(0, 255, 136, 0.5)',
    bg: 'rgba(0, 255, 136, 0.1)',
    color: '#00ff88',
  },
}

const sizeStyles = {
  sm: {
    height: 4,
    labelSize: 'text-xs',
    valueSize: 'text-xs',
  },
  md: {
    height: 8,
    labelSize: 'text-sm',
    valueSize: 'text-sm',
  },
  lg: {
    height: 12,
    labelSize: 'text-base',
    valueSize: 'text-base',
  },
}

export function HoloProgress({
  value,
  max = 100,
  label,
  showValue = false,
  variant = 'default',
  animated = true,
  size = 'md',
  className,
}: HoloProgressProps) {
  const styles = variantStyles[variant]
  const sizes = sizeStyles[size]

  const percentage = useMemo(() => {
    const clamped = Math.max(0, Math.min(value, max))
    return (clamped / max) * 100
  }, [value, max])

  const displayValue = useMemo(() => {
    if (max === 100) {
      return `${Math.round(percentage)}%`
    }
    return `${value.toLocaleString()} / ${max.toLocaleString()}`
  }, [percentage, value, max])

  return (
    <div className={clsx('w-full', className)}>
      {/* Label and value row */}
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span
              className={clsx('font-medium tracking-wide', sizes.labelSize)}
              style={{
                color: styles.color,
                textShadow: `0 0 8px ${styles.glow}`,
              }}
            >
              {label}
            </span>
          )}
          {showValue && (
            <span
              className={clsx('font-mono tabular-nums', sizes.valueSize)}
              style={{
                color: styles.color,
                textShadow: `0 0 8px ${styles.glow}`,
              }}
            >
              {displayValue}
            </span>
          )}
        </div>
      )}

      {/* Progress bar container */}
      <div className="relative">
        {/* Background track */}
        <div
          className="w-full rounded-full overflow-hidden"
          style={{
            height: sizes.height,
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Background glow */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: styles.bg,
              opacity: 0.3,
            }}
          />

          {/* Progress fill */}
          <motion.div
            className="h-full rounded-full relative overflow-hidden"
            style={{
              background: styles.gradient,
              boxShadow: `0 0 10px ${styles.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
            }}
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{
              duration: animated ? 0.5 : 0,
              ease: [0.32, 0.72, 0, 1],
            }}
          >
            {/* Shimmer effect */}
            {animated && percentage > 0 && (
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                }}
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            )}

            {/* Inner glow line */}
            <div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)',
              }}
            />
          </motion.div>
        </div>

        {/* Glowing cap at the end of progress */}
        {percentage > 0 && (
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: sizes.height + 2,
              height: sizes.height + 2,
              background: `radial-gradient(circle, ${styles.color}, transparent 70%)`,
              filter: 'blur(2px)',
              opacity: animated ? 0.8 : 0.5,
            }}
            initial={false}
            animate={{
              left: `calc(${percentage}% - ${(sizes.height + 2) / 2}px)`,
              opacity: animated ? [0.5, 0.8, 0.5] : 0.5,
            }}
            transition={{
              left: { duration: 0.5, ease: [0.32, 0.72, 0, 1] },
              opacity: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        )}

        {/* Tick marks */}
        <div className="absolute inset-0 flex justify-between items-center px-[1px] pointer-events-none">
          {[25, 50, 75].map((tick) => (
            <div
              key={tick}
              className="absolute h-full flex items-center"
              style={{ left: `${tick}%` }}
            >
              <div
                className="w-[1px] opacity-30"
                style={{
                  height: sizes.height - 2,
                  background: 'rgba(255, 255, 255, 0.5)',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Warning indicator when low */}
      {percentage <= 20 && percentage > 0 && variant === 'energy' && (
        <motion.div
          className="flex items-center gap-1 mt-1"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <svg
            className="w-3 h-3 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs text-red-400">Low Energy</span>
        </motion.div>
      )}
    </div>
  )
}

export default HoloProgress
