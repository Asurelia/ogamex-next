'use client'

import React, { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'

interface StatItem {
  label: string
  value: string | number
  change?: number
  icon?: React.ReactNode
  color?: string
}

interface HoloStatsProps {
  stats: StatItem[]
  columns?: 2 | 3 | 4
  size?: 'sm' | 'md' | 'lg' | string // Size variant for backward compatibility
}

function AnimatedNumber({ value, color }: { value: string | number; color: string }) {
  const [displayValue, setDisplayValue] = useState<string | number>(0)
  const previousValue = useRef<string | number>(0)

  useEffect(() => {
    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0
    const prevNum = typeof previousValue.current === 'number'
      ? previousValue.current
      : parseFloat(previousValue.current as string) || 0

    if (typeof value === 'string' && isNaN(parseFloat(value))) {
      setDisplayValue(value)
      previousValue.current = value
      return
    }

    const duration = 1000
    const startTime = performance.now()
    const diff = numValue - prevNum

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const current = prevNum + diff * easeOutQuart

      if (typeof value === 'number') {
        setDisplayValue(Math.round(current))
      } else {
        setDisplayValue(current.toFixed(2))
      }

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
        previousValue.current = value
      }
    }

    requestAnimationFrame(animate)
  }, [value])

  return (
    <span
      className="text-2xl font-bold font-mono"
      style={{
        color,
        textShadow: `0 0 20px ${color}40, 0 0 40px ${color}20`,
      }}
    >
      {displayValue}
    </span>
  )
}

function ChangeIndicator({ change, color }: { change: number; color: string }) {
  const isPositive = change > 0
  const isNegative = change < 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1 text-xs font-medium"
      style={{
        color: isPositive ? '#22c55e' : isNegative ? '#ef4444' : color,
      }}
    >
      {isPositive && (
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <path
            d="M6 2L10 7H2L6 2Z"
            fill="currentColor"
            style={{
              filter: 'drop-shadow(0 0 4px currentColor)',
            }}
          />
        </motion.svg>
      )}
      {isNegative && (
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          initial={{ y: -5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <path
            d="M6 10L2 5H10L6 10Z"
            fill="currentColor"
            style={{
              filter: 'drop-shadow(0 0 4px currentColor)',
            }}
          />
        </motion.svg>
      )}
      <span
        style={{
          textShadow: `0 0 8px ${isPositive ? '#22c55e' : isNegative ? '#ef4444' : color}40`,
        }}
      >
        {isPositive ? '+' : ''}{change.toFixed(1)}%
      </span>
    </motion.div>
  )
}

export function HoloStatsAdvanced({ stats, columns = 4, size = 'md' }: HoloStatsProps) {
  // Size is accepted for backward compatibility but doesn't affect styling in this version
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {stats.map((stat, index) => {
        const color = stat.color || '#00ffff'

        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: index * 0.1,
              duration: 0.4,
              ease: [0.23, 1, 0.32, 1],
            }}
            className="relative group"
          >
            {/* Glow background */}
            <div
              className="absolute inset-0 rounded-lg blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500"
              style={{
                background: `radial-gradient(ellipse at center, ${color}30, transparent 70%)`,
              }}
            />

            {/* Main card */}
            <div
              className="relative rounded-lg overflow-hidden p-4"
              style={{
                background: 'linear-gradient(135deg, rgba(10, 25, 40, 0.9), rgba(5, 15, 30, 0.95))',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${color}30`,
              }}
            >
              {/* Animated border */}
              <motion.div
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${color}20, transparent 50%, ${color}10)`,
                }}
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Scanlines */}
              <div
                className="absolute inset-0 pointer-events-none opacity-5"
                style={{
                  background: `repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    ${color}10 2px,
                    ${color}10 4px
                  )`,
                }}
              />

              {/* Content */}
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  {/* Label */}
                  <div
                    className="text-xs font-medium uppercase tracking-wider mb-2"
                    style={{ color: 'rgba(150, 200, 230, 0.7)' }}
                  >
                    {stat.label}
                  </div>

                  {/* Value */}
                  <div className="flex items-baseline gap-3">
                    <AnimatedNumber value={stat.value} color={color} />

                    {stat.change !== undefined && (
                      <ChangeIndicator change={stat.change} color={color} />
                    )}
                  </div>
                </div>

                {/* Icon */}
                {stat.icon && (
                  <motion.div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${color}20, ${color}10)`,
                      border: `1px solid ${color}30`,
                      color,
                      filter: `drop-shadow(0 0 8px ${color}40)`,
                    }}
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {stat.icon}
                  </motion.div>
                )}
              </div>

              {/* Bottom accent line */}
              <motion.div
                className="absolute bottom-0 left-0 h-[2px]"
                style={{
                  background: `linear-gradient(90deg, ${color}, ${color}50, transparent)`,
                  boxShadow: `0 0 10px ${color}60`,
                }}
                initial={{ width: '0%' }}
                animate={{ width: '60%' }}
                transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
              />

              {/* Corner decorations */}
              <div className="absolute top-0 left-0 w-3 h-3 pointer-events-none">
                <div
                  className="absolute top-0 left-0 w-full h-[1px]"
                  style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
                />
                <div
                  className="absolute top-0 left-0 w-[1px] h-full"
                  style={{ background: `linear-gradient(180deg, ${color}, transparent)` }}
                />
              </div>
              <div className="absolute top-0 right-0 w-3 h-3 pointer-events-none">
                <div
                  className="absolute top-0 right-0 w-full h-[1px]"
                  style={{ background: `linear-gradient(270deg, ${color}, transparent)` }}
                />
                <div
                  className="absolute top-0 right-0 w-[1px] h-full"
                  style={{ background: `linear-gradient(180deg, ${color}, transparent)` }}
                />
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export default HoloStatsAdvanced
