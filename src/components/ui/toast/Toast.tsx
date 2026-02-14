'use client'

import { useEffect, useState, useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import type { Toast as ToastType, ToastType as ToastVariant } from './ToastContext'

interface ToastProps {
  toast: ToastType
  onDismiss: (id: string) => void
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

// Color schemes for each toast type
const TOAST_STYLES: Record<ToastVariant, {
  borderColor: string
  glowColor: string
  iconColor: string
  progressColor: string
}> = {
  success: {
    borderColor: 'rgba(34, 197, 94, 0.6)',
    glowColor: 'rgba(34, 197, 94, 0.3)',
    iconColor: '#22c55e',
    progressColor: 'linear-gradient(90deg, #22c55e, #4ade80)',
  },
  error: {
    borderColor: 'rgba(239, 68, 68, 0.6)',
    glowColor: 'rgba(239, 68, 68, 0.3)',
    iconColor: '#ef4444',
    progressColor: 'linear-gradient(90deg, #ef4444, #f87171)',
  },
  warning: {
    borderColor: 'rgba(245, 158, 11, 0.6)',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    iconColor: '#f59e0b',
    progressColor: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
  },
  info: {
    borderColor: 'rgba(0, 212, 255, 0.6)',
    glowColor: 'rgba(0, 212, 255, 0.3)',
    iconColor: '#00d4ff',
    progressColor: 'linear-gradient(90deg, #00d4ff, #38bdf8)',
  },
  loading: {
    borderColor: 'rgba(139, 92, 246, 0.6)',
    glowColor: 'rgba(139, 92, 246, 0.3)',
    iconColor: '#8b5cf6',
    progressColor: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
  },
}

// Animation variants based on position
const getAnimationVariants = (position: ToastProps['position']) => {
  const isRight = position.includes('right')
  const isLeft = position.includes('left')
  const isTop = position.includes('top')
  const isCenter = position.includes('center')

  let x = 0
  let y = 0

  if (isRight) x = 100
  else if (isLeft) x = -100
  else if (isCenter) y = isTop ? -100 : 100

  return {
    initial: { opacity: 0, x, y, scale: 0.9 },
    animate: { opacity: 1, x: 0, y: 0, scale: 1 },
    exit: { opacity: 0, x, scale: 0.9 },
  }
}

// Icon components
const SuccessIcon = memo(({ color }: { color: string }) => (
  <motion.svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
  >
    <circle cx="10" cy="10" r="9" stroke={color} strokeWidth="1.5" fill="none" opacity="0.3" />
    <motion.path
      d="M6 10L9 13L14 7"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    />
  </motion.svg>
))
SuccessIcon.displayName = 'SuccessIcon'

const ErrorIcon = memo(({ color }: { color: string }) => (
  <motion.svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
  >
    <circle cx="10" cy="10" r="9" stroke={color} strokeWidth="1.5" fill="none" opacity="0.3" />
    <motion.path
      d="M7 7L13 13M13 7L7 13"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    />
  </motion.svg>
))
ErrorIcon.displayName = 'ErrorIcon'

const WarningIcon = memo(({ color }: { color: string }) => (
  <motion.svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
  >
    <path
      d="M10 2L19 18H1L10 2Z"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
      opacity="0.3"
    />
    <motion.path
      d="M10 8V12"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.2, delay: 0.2 }}
    />
    <motion.circle
      cx="10"
      cy="15"
      r="1"
      fill={color}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.4 }}
    />
  </motion.svg>
))
WarningIcon.displayName = 'WarningIcon'

const InfoIcon = memo(({ color }: { color: string }) => (
  <motion.svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
  >
    <circle cx="10" cy="10" r="9" stroke={color} strokeWidth="1.5" fill="none" opacity="0.3" />
    <motion.circle
      cx="10"
      cy="6"
      r="1"
      fill={color}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.2 }}
    />
    <motion.path
      d="M10 9V14"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.2, delay: 0.3 }}
    />
  </motion.svg>
))
InfoIcon.displayName = 'InfoIcon'

const LoadingIcon = memo(({ color }: { color: string }) => (
  <motion.svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
  >
    <circle cx="10" cy="10" r="8" stroke={color} strokeWidth="2" opacity="0.2" fill="none" />
    <path
      d="M10 2A8 8 0 0 1 18 10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </motion.svg>
))
LoadingIcon.displayName = 'LoadingIcon'

const ICONS: Record<ToastVariant, React.ComponentType<{ color: string }>> = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
  loading: LoadingIcon,
}

export const Toast = memo(function Toast({ toast, onDismiss, position }: ToastProps) {
  const [progress, setProgress] = useState(100)
  const [isPaused, setIsPaused] = useState(false)

  const styles = TOAST_STYLES[toast.type]
  const Icon = ICONS[toast.type]
  const variants = getAnimationVariants(position)

  // Handle progress bar animation
  useEffect(() => {
    if (toast.duration <= 0 || isPaused) return

    const startTime = Date.now()
    const elapsed = startTime - toast.createdAt
    const remaining = toast.duration - elapsed

    if (remaining <= 0) {
      setProgress(0)
      return
    }

    const initialProgress = (remaining / toast.duration) * 100
    setProgress(initialProgress)

    let animationFrame: number

    const updateProgress = () => {
      const now = Date.now()
      const currentElapsed = now - toast.createdAt
      const currentRemaining = toast.duration - currentElapsed
      const newProgress = Math.max(0, (currentRemaining / toast.duration) * 100)
      setProgress(newProgress)

      if (newProgress > 0) {
        animationFrame = requestAnimationFrame(updateProgress)
      }
    }

    animationFrame = requestAnimationFrame(updateProgress)

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [toast.duration, toast.createdAt, isPaused])

  const handleDismiss = useCallback(() => {
    onDismiss(toast.id)
  }, [onDismiss, toast.id])

  const handleMouseEnter = useCallback(() => {
    setIsPaused(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false)
  }, [])

  return (
    <motion.div
      layout
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        layout: { duration: 0.2 },
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-80 overflow-hidden rounded-lg pointer-events-auto"
      style={{
        background: 'linear-gradient(135deg, rgba(10, 20, 35, 0.95), rgba(5, 15, 30, 0.98))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${styles.borderColor}`,
        boxShadow: `0 0 20px ${styles.glowColor}, inset 0 0 40px rgba(0, 0, 0, 0.3)`,
      }}
    >
      {/* Scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            ${styles.iconColor}10 2px,
            ${styles.iconColor}10 4px
          )`,
        }}
      />

      {/* Glow accent at top */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${styles.iconColor}, transparent)`,
        }}
      />

      {/* Content */}
      <div className="relative flex items-start gap-3 p-4">
        {/* Icon */}
        <div
          className="flex-shrink-0 mt-0.5"
          style={{
            filter: `drop-shadow(0 0 6px ${styles.glowColor})`,
          }}
        >
          <Icon color={styles.iconColor} />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <h4
            className="text-sm font-semibold tracking-wide"
            style={{
              color: styles.iconColor,
              textShadow: `0 0 10px ${styles.glowColor}`,
            }}
          >
            {toast.title}
          </h4>
          {toast.message && (
            <p
              className="mt-1 text-xs leading-relaxed"
              style={{ color: 'rgba(200, 220, 240, 0.85)' }}
            >
              {toast.message}
            </p>
          )}

          {/* Action button */}
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick()
                handleDismiss()
              }}
              className="mt-2 px-3 py-1 text-xs font-medium rounded transition-all duration-200"
              style={{
                background: `linear-gradient(135deg, ${styles.iconColor}20, ${styles.iconColor}10)`,
                border: `1px solid ${styles.borderColor}`,
                color: styles.iconColor,
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        {toast.dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded transition-colors duration-200 hover:bg-white/10"
            style={{ color: 'rgba(200, 220, 240, 0.6)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 3L11 11M11 3L3 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Progress bar */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/30">
          <motion.div
            className="h-full"
            style={{
              background: styles.progressColor,
              width: `${progress}%`,
              boxShadow: `0 0 8px ${styles.glowColor}`,
            }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}

      {/* Corner decorations */}
      <div
        className="absolute top-0 left-0 w-3 h-3 pointer-events-none"
        style={{
          borderTop: `1px solid ${styles.iconColor}`,
          borderLeft: `1px solid ${styles.iconColor}`,
          opacity: 0.5,
        }}
      />
      <div
        className="absolute top-0 right-0 w-3 h-3 pointer-events-none"
        style={{
          borderTop: `1px solid ${styles.iconColor}`,
          borderRight: `1px solid ${styles.iconColor}`,
          opacity: 0.5,
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-3 h-3 pointer-events-none"
        style={{
          borderBottom: `1px solid ${styles.iconColor}`,
          borderLeft: `1px solid ${styles.iconColor}`,
          opacity: 0.5,
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none"
        style={{
          borderBottom: `1px solid ${styles.iconColor}`,
          borderRight: `1px solid ${styles.iconColor}`,
          opacity: 0.5,
        }}
      />

      {/* Holographic shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(
            105deg,
            transparent 40%,
            ${styles.iconColor}08 45%,
            ${styles.iconColor}15 50%,
            ${styles.iconColor}08 55%,
            transparent 60%
          )`,
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPosition: ['200% 0%', '-200% 0%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  )
})
