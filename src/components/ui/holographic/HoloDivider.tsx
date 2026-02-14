'use client'

import React from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

export interface HoloDividerProps {
  orientation?: 'horizontal' | 'vertical'
  variant?: 'default' | 'glow' | 'dashed' | 'gradient'
  color?: 'cyan' | 'magenta' | 'gold' | 'white'
  animated?: boolean
  label?: string
  className?: string
}

const colorStyles = {
  cyan: {
    solid: 'rgba(0, 255, 255, 0.3)',
    glow: 'rgba(0, 255, 255, 0.5)',
    text: '#00ffff',
  },
  magenta: {
    solid: 'rgba(255, 0, 255, 0.3)',
    glow: 'rgba(255, 0, 255, 0.5)',
    text: '#ff00ff',
  },
  gold: {
    solid: 'rgba(255, 215, 0, 0.3)',
    glow: 'rgba(255, 215, 0, 0.5)',
    text: '#ffd700',
  },
  white: {
    solid: 'rgba(255, 255, 255, 0.2)',
    glow: 'rgba(255, 255, 255, 0.4)',
    text: '#ffffff',
  },
}

export function HoloDivider({
  orientation = 'horizontal',
  variant = 'default',
  color = 'cyan',
  animated = false,
  label,
  className,
}: HoloDividerProps) {
  const colors = colorStyles[color]
  const isHorizontal = orientation === 'horizontal'

  const getBackground = () => {
    switch (variant) {
      case 'gradient':
        return isHorizontal
          ? `linear-gradient(90deg, transparent, ${colors.solid}, transparent)`
          : `linear-gradient(180deg, transparent, ${colors.solid}, transparent)`
      case 'glow':
        return colors.solid
      case 'dashed':
        return 'transparent'
      default:
        return colors.solid
    }
  }

  const dividerContent = (
    <motion.div
      className={clsx(
        'relative',
        isHorizontal ? 'w-full h-[1px]' : 'h-full w-[1px]',
        variant === 'dashed' && (isHorizontal ? 'border-t border-dashed' : 'border-l border-dashed'),
        className
      )}
      style={{
        background: variant !== 'dashed' ? getBackground() : 'none',
        borderColor: variant === 'dashed' ? colors.solid : 'transparent',
        boxShadow: variant === 'glow' ? `0 0 8px ${colors.glow}` : 'none',
      }}
    >
      {/* Animated glow effect */}
      {animated && variant !== 'dashed' && (
        <motion.div
          className={clsx(
            'absolute',
            isHorizontal ? 'top-0 h-full w-20' : 'left-0 w-full h-20'
          )}
          style={{
            background: isHorizontal
              ? `linear-gradient(90deg, transparent, ${colors.glow}, transparent)`
              : `linear-gradient(180deg, transparent, ${colors.glow}, transparent)`,
            filter: 'blur(2px)',
          }}
          animate={
            isHorizontal
              ? { left: ['-20%', '120%'] }
              : { top: ['-20%', '120%'] }
          }
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}
    </motion.div>
  )

  // With label (only horizontal)
  if (label && isHorizontal) {
    return (
      <div className={clsx('flex items-center gap-4', className)}>
        <div className="flex-1">
          {dividerContent}
        </div>
        <span
          className="text-xs font-medium uppercase tracking-wider shrink-0"
          style={{
            color: colors.text,
            textShadow: `0 0 8px ${colors.glow}`,
          }}
        >
          {label}
        </span>
        <div className="flex-1">
          {dividerContent}
        </div>
      </div>
    )
  }

  return dividerContent
}

export default HoloDivider
