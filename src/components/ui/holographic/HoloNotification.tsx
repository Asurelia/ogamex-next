'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface HoloNotificationProps {
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  duration?: number
  onClose?: () => void
  action?: { label: string; onClick: () => void }
}

const TYPE_CONFIG = {
  info: {
    color: '#00ffff',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  success: {
    color: '#22c55e',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  warning: {
    color: '#f59e0b',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  error: {
    color: '#ef4444',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
}

export function HoloNotification({
  type,
  title,
  message,
  duration = 5000,
  onClose,
  action,
}: HoloNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(100)
  const [isPaused, setIsPaused] = useState(false)

  const config = TYPE_CONFIG[type]

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(() => {
      onClose?.()
    }, 300) // Wait for exit animation
  }, [onClose])

  useEffect(() => {
    if (duration <= 0 || isPaused) return

    const startTime = Date.now()
    const remainingDuration = (progress / 100) * duration

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.max(0, ((remainingDuration - elapsed) / duration) * 100)
      setProgress(newProgress)

      if (newProgress <= 0) {
        clearInterval(interval)
        handleClose()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [duration, isPaused, progress, handleClose])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="relative max-w-sm w-full pointer-events-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Glow background */}
          <div
            className="absolute inset-0 rounded-lg blur-xl opacity-40 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, ${config.color}30, transparent 70%)`,
            }}
          />

          {/* Main container */}
          <div
            className="relative rounded-lg overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(10, 25, 40, 0.95), rgba(5, 15, 30, 0.98))',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${config.color}40`,
            }}
          >
            {/* Animated border highlight */}
            <motion.div
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${config.color}20, transparent 50%, ${config.color}10)`,
              }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
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
                  ${config.color}10 2px,
                  ${config.color}10 4px
                )`,
              }}
            />

            {/* Content */}
            <div className="relative p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <motion.div
                  className="flex-shrink-0"
                  style={{
                    color: config.color,
                    filter: `drop-shadow(0 0 8px ${config.color}60)`,
                  }}
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  {config.icon}
                </motion.div>

                {/* Text content */}
                <div className="flex-1 min-w-0">
                  <h4
                    className="text-sm font-semibold mb-1"
                    style={{
                      color: config.color,
                      textShadow: `0 0 10px ${config.color}40`,
                    }}
                  >
                    {title}
                  </h4>
                  {message && (
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: 'rgba(200,230,255,0.8)' }}
                    >
                      {message}
                    </p>
                  )}

                  {/* Action button */}
                  {action && (
                    <motion.button
                      className="mt-2 px-3 py-1 text-xs font-medium rounded"
                      style={{
                        background: `${config.color}20`,
                        border: `1px solid ${config.color}40`,
                        color: config.color,
                      }}
                      whileHover={{
                        background: `${config.color}30`,
                        boxShadow: `0 0 15px ${config.color}40`,
                      }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        action.onClick()
                        handleClose()
                      }}
                    >
                      {action.label}
                    </motion.button>
                  )}
                </div>

                {/* Close button */}
                <motion.button
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded"
                  style={{
                    color: 'rgba(150,200,230,0.6)',
                  }}
                  whileHover={{
                    color: config.color,
                    background: `${config.color}20`,
                  }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <path d="M4.293 4.293a1 1 0 011.414 0L7 5.586l1.293-1.293a1 1 0 111.414 1.414L8.414 7l1.293 1.293a1 1 0 01-1.414 1.414L7 8.414l-1.293 1.293a1 1 0 01-1.414-1.414L5.586 7 4.293 5.707a1 1 0 010-1.414z" />
                  </svg>
                </motion.button>
              </div>
            </div>

            {/* Progress bar */}
            {duration > 0 && (
              <div className="relative h-1">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `${config.color}10`,
                  }}
                />
                <motion.div
                  className="absolute left-0 top-0 bottom-0"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${config.color}, ${config.color}80)`,
                    boxShadow: `0 0 10px ${config.color}60`,
                  }}
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />

                {/* Animated glow on progress bar */}
                <motion.div
                  className="absolute top-0 bottom-0 w-8"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${config.color}60, transparent)`,
                    left: `${progress - 5}%`,
                  }}
                  animate={{
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </div>
            )}

            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-3 h-3 pointer-events-none">
              <div
                className="absolute top-0 left-0 w-full h-[1px]"
                style={{ background: `linear-gradient(90deg, ${config.color}, transparent)` }}
              />
              <div
                className="absolute top-0 left-0 w-[1px] h-full"
                style={{ background: `linear-gradient(180deg, ${config.color}, transparent)` }}
              />
            </div>
            <div className="absolute top-0 right-0 w-3 h-3 pointer-events-none">
              <div
                className="absolute top-0 right-0 w-full h-[1px]"
                style={{ background: `linear-gradient(270deg, ${config.color}, transparent)` }}
              />
              <div
                className="absolute top-0 right-0 w-[1px] h-full"
                style={{ background: `linear-gradient(180deg, ${config.color}, transparent)` }}
              />
            </div>
          </div>

          {/* Data stream decoration */}
          <motion.div
            className="absolute -right-1 top-1/2 -translate-y-1/2 w-[2px] h-8 overflow-hidden opacity-60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
          >
            <motion.div
              className="w-full h-2 rounded-full"
              style={{ background: `linear-gradient(180deg, transparent, ${config.color}, transparent)` }}
              animate={{ y: ['-100%', '400%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Toast container for multiple notifications
interface ToastContainerProps {
  children: React.ReactNode
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export function HoloToastContainer({
  children,
  position = 'top-right',
}: ToastContainerProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  }

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-3 pointer-events-none`}
    >
      {children}
    </div>
  )
}

export default HoloNotification
