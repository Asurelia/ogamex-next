'use client'

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

export interface HoloButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

const variantStyles = {
  primary: {
    bg: 'linear-gradient(180deg, rgba(0, 255, 255, 0.2) 0%, rgba(0, 255, 255, 0.1) 100%)',
    hoverBg: 'linear-gradient(180deg, rgba(0, 255, 255, 0.3) 0%, rgba(0, 255, 255, 0.15) 100%)',
    border: 'rgba(0, 255, 255, 0.5)',
    hoverBorder: 'rgba(0, 255, 255, 0.8)',
    color: '#00ffff',
    glow: 'rgba(0, 255, 255, 0.4)',
    ripple: 'rgba(0, 255, 255, 0.5)',
  },
  secondary: {
    bg: 'linear-gradient(180deg, rgba(255, 0, 255, 0.15) 0%, rgba(255, 0, 255, 0.08) 100%)',
    hoverBg: 'linear-gradient(180deg, rgba(255, 0, 255, 0.25) 0%, rgba(255, 0, 255, 0.12) 100%)',
    border: 'rgba(255, 0, 255, 0.4)',
    hoverBorder: 'rgba(255, 0, 255, 0.7)',
    color: '#ff00ff',
    glow: 'rgba(255, 0, 255, 0.4)',
    ripple: 'rgba(255, 0, 255, 0.5)',
  },
  danger: {
    bg: 'linear-gradient(180deg, rgba(255, 68, 68, 0.2) 0%, rgba(255, 68, 68, 0.1) 100%)',
    hoverBg: 'linear-gradient(180deg, rgba(255, 68, 68, 0.3) 0%, rgba(255, 68, 68, 0.15) 100%)',
    border: 'rgba(255, 68, 68, 0.5)',
    hoverBorder: 'rgba(255, 68, 68, 0.8)',
    color: '#ff4444',
    glow: 'rgba(255, 68, 68, 0.4)',
    ripple: 'rgba(255, 68, 68, 0.5)',
  },
  ghost: {
    bg: 'transparent',
    hoverBg: 'rgba(255, 255, 255, 0.05)',
    border: 'transparent',
    hoverBorder: 'rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    glow: 'transparent',
    ripple: 'rgba(255, 255, 255, 0.3)',
  },
  success: {
    bg: 'linear-gradient(180deg, rgba(0, 255, 136, 0.2) 0%, rgba(0, 255, 136, 0.1) 100%)',
    hoverBg: 'linear-gradient(180deg, rgba(0, 255, 136, 0.3) 0%, rgba(0, 255, 136, 0.15) 100%)',
    border: 'rgba(0, 255, 136, 0.5)',
    hoverBorder: 'rgba(0, 255, 136, 0.8)',
    color: '#00ff88',
    glow: 'rgba(0, 255, 136, 0.4)',
    ripple: 'rgba(0, 255, 136, 0.5)',
  },
  warning: {
    bg: 'linear-gradient(180deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%)',
    hoverBg: 'linear-gradient(180deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 215, 0, 0.15) 100%)',
    border: 'rgba(255, 215, 0, 0.5)',
    hoverBorder: 'rgba(255, 215, 0, 0.8)',
    color: '#ffd700',
    glow: 'rgba(255, 215, 0, 0.4)',
    ripple: 'rgba(255, 215, 0, 0.5)',
  },
}

const sizeStyles = {
  sm: {
    padding: '6px 12px',
    fontSize: '0.75rem',
    height: '32px',
    iconSize: 14,
  },
  md: {
    padding: '8px 16px',
    fontSize: '0.875rem',
    height: '40px',
    iconSize: 18,
  },
  lg: {
    padding: '12px 24px',
    fontSize: '1rem',
    height: '48px',
    iconSize: 22,
  },
}

interface RippleEffect {
  x: number
  y: number
  id: number
}

export function HoloButton({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  className,
  onClick,
  type = 'button',
}: HoloButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [ripples, setRipples] = useState<RippleEffect[]>([])

  const styles = variantStyles[variant]
  const sizes = sizeStyles[size]

  const createRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return

    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()

    setRipples(prev => [...prev, { x, y, id }])
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id))
    }, 600)
  }, [disabled, loading])

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e)
    if (!disabled && !loading && onClick) {
      onClick()
    }
  }, [createRipple, disabled, loading, onClick])

  return (
    <motion.button
      ref={buttonRef}
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'relative inline-flex items-center justify-center gap-2',
        'font-medium uppercase tracking-wider',
        'rounded-md overflow-hidden',
        'transition-all duration-200',
        'outline-none focus:outline-none',
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{
        background: isHovered && !disabled ? styles.hoverBg : styles.bg,
        border: `1px solid ${isHovered && !disabled ? styles.hoverBorder : styles.border}`,
        color: styles.color,
        padding: sizes.padding,
        fontSize: sizes.fontSize,
        height: sizes.height,
        boxShadow: isHovered && !disabled && variant !== 'ghost'
          ? `0 0 15px ${styles.glow}, 0 4px 15px rgba(0, 0, 0, 0.3)`
          : '0 2px 8px rgba(0, 0, 0, 0.2)',
        textShadow: variant !== 'ghost' ? `0 0 10px ${styles.glow}` : 'none',
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={!disabled && !loading ? { y: -2 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.98, y: 0 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Background glow pulse */}
      {variant !== 'ghost' && !disabled && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-md"
          style={{
            background: `radial-gradient(circle at center, ${styles.glow}, transparent 70%)`,
          }}
          animate={{
            opacity: isHovered ? [0.3, 0.5, 0.3] : 0,
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: ripple.x,
              top: ripple.y,
              background: styles.ripple,
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ width: 0, height: 0, opacity: 0.6 }}
            animate={{ width: 200, height: 200, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      {/* Loading spinner */}
      {loading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="31.4 31.4"
              opacity={0.3}
            />
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="31.4 31.4"
              strokeDashoffset="75"
            />
          </motion.svg>
        </motion.div>
      )}

      {/* Content */}
      <motion.span
        className="relative z-10 flex items-center gap-2"
        animate={{ opacity: loading ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Icon with animation */}
        {icon && iconPosition === 'left' && (
          <motion.span
            className="flex items-center justify-center"
            style={{ width: sizes.iconSize, height: sizes.iconSize }}
            animate={isHovered && !disabled ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {icon}
          </motion.span>
        )}

        <span>{children}</span>

        {icon && iconPosition === 'right' && (
          <motion.span
            className="flex items-center justify-center"
            style={{ width: sizes.iconSize, height: sizes.iconSize }}
            animate={isHovered && !disabled ? { scale: 1.1, x: 3 } : { scale: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {icon}
          </motion.span>
        )}
      </motion.span>

      {/* Top edge highlight */}
      <div
        className="absolute top-0 left-2 right-2 h-[1px] pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${styles.color}40, transparent)`,
        }}
      />

      {/* Bottom edge shadow */}
      <div
        className="absolute bottom-0 left-2 right-2 h-[1px] pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.3), transparent)`,
        }}
      />
    </motion.button>
  )
}

export default HoloButton
