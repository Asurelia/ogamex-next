'use client'

import React from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

export interface HoloBadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md' | 'lg'
  glow?: boolean
  pulse?: boolean
  icon?: React.ReactNode
  className?: string
}

const variantStyles = {
  default: {
    bg: 'rgba(0, 255, 255, 0.1)',
    border: 'rgba(0, 255, 255, 0.4)',
    color: '#00ffff',
    glow: 'rgba(0, 255, 255, 0.4)',
  },
  success: {
    bg: 'rgba(0, 255, 136, 0.1)',
    border: 'rgba(0, 255, 136, 0.4)',
    color: '#00ff88',
    glow: 'rgba(0, 255, 136, 0.4)',
  },
  warning: {
    bg: 'rgba(255, 215, 0, 0.1)',
    border: 'rgba(255, 215, 0, 0.4)',
    color: '#ffd700',
    glow: 'rgba(255, 215, 0, 0.4)',
  },
  danger: {
    bg: 'rgba(255, 68, 68, 0.1)',
    border: 'rgba(255, 68, 68, 0.4)',
    color: '#ff4444',
    glow: 'rgba(255, 68, 68, 0.4)',
  },
  info: {
    bg: 'rgba(68, 136, 255, 0.1)',
    border: 'rgba(68, 136, 255, 0.4)',
    color: '#4488ff',
    glow: 'rgba(68, 136, 255, 0.4)',
  },
  purple: {
    bg: 'rgba(170, 68, 255, 0.1)',
    border: 'rgba(170, 68, 255, 0.4)',
    color: '#aa44ff',
    glow: 'rgba(170, 68, 255, 0.4)',
  },
}

const sizeStyles = {
  sm: {
    padding: 'px-1.5 py-0.5',
    fontSize: 'text-[10px]',
    gap: 'gap-1',
  },
  md: {
    padding: 'px-2 py-1',
    fontSize: 'text-xs',
    gap: 'gap-1.5',
  },
  lg: {
    padding: 'px-3 py-1.5',
    fontSize: 'text-sm',
    gap: 'gap-2',
  },
}

export function HoloBadge({
  children,
  variant = 'default',
  size = 'md',
  glow = false,
  pulse = false,
  icon,
  className,
}: HoloBadgeProps) {
  const styles = variantStyles[variant]
  const sizes = sizeStyles[size]

  return (
    <motion.span
      className={clsx(
        'inline-flex items-center justify-center',
        'rounded-full font-semibold uppercase tracking-wider',
        sizes.padding,
        sizes.fontSize,
        sizes.gap,
        className
      )}
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.color,
        textShadow: glow ? `0 0 8px ${styles.glow}` : 'none',
        boxShadow: glow ? `0 0 10px ${styles.glow}` : 'none',
      }}
      animate={pulse ? {
        boxShadow: [
          `0 0 5px ${styles.glow}`,
          `0 0 15px ${styles.glow}`,
          `0 0 5px ${styles.glow}`,
        ],
      } : undefined}
      transition={pulse ? {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      } : undefined}
    >
      {icon && (
        <span className="flex items-center justify-center">
          {icon}
        </span>
      )}
      {children}
    </motion.span>
  )
}

export default HoloBadge
