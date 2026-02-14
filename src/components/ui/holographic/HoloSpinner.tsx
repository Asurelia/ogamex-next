'use client'

import React from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

export interface HoloSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'ring' | 'dots' | 'pulse' | 'orbital'
  color?: 'cyan' | 'magenta' | 'gold' | 'green' | 'white'
  className?: string
}

const sizeValues = {
  sm: 16,
  md: 24,
  lg: 40,
  xl: 64,
}

const colorStyles = {
  cyan: {
    primary: '#00ffff',
    secondary: 'rgba(0, 255, 255, 0.3)',
    glow: 'rgba(0, 255, 255, 0.5)',
  },
  magenta: {
    primary: '#ff00ff',
    secondary: 'rgba(255, 0, 255, 0.3)',
    glow: 'rgba(255, 0, 255, 0.5)',
  },
  gold: {
    primary: '#ffd700',
    secondary: 'rgba(255, 215, 0, 0.3)',
    glow: 'rgba(255, 215, 0, 0.5)',
  },
  green: {
    primary: '#00ff88',
    secondary: 'rgba(0, 255, 136, 0.3)',
    glow: 'rgba(0, 255, 136, 0.5)',
  },
  white: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.3)',
    glow: 'rgba(255, 255, 255, 0.5)',
  },
}

export function HoloSpinner({
  size = 'md',
  variant = 'default',
  color = 'cyan',
  className,
}: HoloSpinnerProps) {
  const sizeValue = sizeValues[size]
  const colors = colorStyles[color]
  const strokeWidth = size === 'sm' ? 2 : size === 'md' ? 2.5 : 3

  // Default ring spinner
  if (variant === 'default' || variant === 'ring') {
    return (
      <motion.svg
        width={sizeValue}
        height={sizeValue}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {/* Background ring */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={colors.secondary}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated arc */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray="31.4 31.4"
          strokeDashoffset="15"
          style={{
            filter: `drop-shadow(0 0 4px ${colors.glow})`,
          }}
        />
      </motion.svg>
    )
  }

  // Dots spinner
  if (variant === 'dots') {
    const dotSize = sizeValue / 6
    return (
      <div
        className={clsx('flex items-center justify-center gap-1', className)}
        style={{ width: sizeValue, height: sizeValue }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="rounded-full"
            style={{
              width: dotSize,
              height: dotSize,
              background: colors.primary,
              boxShadow: `0 0 6px ${colors.glow}`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    )
  }

  // Pulse spinner
  if (variant === 'pulse') {
    return (
      <div
        className={clsx('relative flex items-center justify-center', className)}
        style={{ width: sizeValue, height: sizeValue }}
      >
        <motion.div
          className="absolute rounded-full"
          style={{
            width: '100%',
            height: '100%',
            border: `2px solid ${colors.primary}`,
            boxShadow: `0 0 10px ${colors.glow}`,
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: '100%',
            height: '100%',
            border: `2px solid ${colors.primary}`,
            boxShadow: `0 0 10px ${colors.glow}`,
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeOut',
            delay: 0.5,
          }}
        />
        <div
          className="rounded-full"
          style={{
            width: sizeValue / 3,
            height: sizeValue / 3,
            background: colors.primary,
            boxShadow: `0 0 15px ${colors.glow}`,
          }}
        />
      </div>
    )
  }

  // Orbital spinner
  if (variant === 'orbital') {
    const orbitSize = sizeValue / 4
    return (
      <div
        className={clsx('relative flex items-center justify-center', className)}
        style={{ width: sizeValue, height: sizeValue }}
      >
        {/* Center dot */}
        <div
          className="absolute rounded-full"
          style={{
            width: orbitSize,
            height: orbitSize,
            background: colors.primary,
            boxShadow: `0 0 10px ${colors.glow}`,
          }}
        />

        {/* Orbiting element 1 */}
        <motion.div
          className="absolute"
          style={{
            width: '100%',
            height: '100%',
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: orbitSize * 0.6,
              height: orbitSize * 0.6,
              background: colors.primary,
              boxShadow: `0 0 8px ${colors.glow}`,
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
        </motion.div>

        {/* Orbiting element 2 */}
        <motion.div
          className="absolute"
          style={{
            width: '70%',
            height: '70%',
          }}
          animate={{ rotate: -360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: orbitSize * 0.4,
              height: orbitSize * 0.4,
              background: colors.secondary,
              boxShadow: `0 0 6px ${colors.glow}`,
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
        </motion.div>

        {/* Orbit rings */}
        <div
          className="absolute rounded-full border pointer-events-none"
          style={{
            width: '100%',
            height: '100%',
            borderColor: colors.secondary,
            borderWidth: 1,
          }}
        />
        <div
          className="absolute rounded-full border pointer-events-none"
          style={{
            width: '70%',
            height: '70%',
            borderColor: colors.secondary,
            borderWidth: 1,
            opacity: 0.5,
          }}
        />
      </div>
    )
  }

  return null
}

export default HoloSpinner
