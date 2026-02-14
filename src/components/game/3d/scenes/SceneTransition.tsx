'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TransitionType, SceneType } from './types'

// ============================================================================
// TYPES
// ============================================================================

export interface SceneTransitionProps {
  /** Current scene being displayed */
  currentScene: SceneType
  /** Type of transition animation to use */
  transitionType?: TransitionType
  /** Children to render (the actual scene content) */
  children: ReactNode
  /** Duration of transition in milliseconds */
  duration?: number
  /** Callback when transition starts */
  onTransitionStart?: () => void
  /** Callback when transition completes */
  onTransitionComplete?: () => void
}

// ============================================================================
// TRANSITION CONFIGURATIONS
// ============================================================================

interface TransitionConfig {
  overlay: {
    initial: Record<string, number | string>
    animate: Record<string, number | string>
    exit: Record<string, number | string>
  }
  content: {
    initial: Record<string, number | string>
    animate: Record<string, number | string>
    exit: Record<string, number | string>
  }
  duration: number
  overlayColor: string
  icon: string
  label: string
}

const TRANSITION_CONFIGS: Record<TransitionType, TransitionConfig> = {
  warp: {
    overlay: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 1.5 },
    },
    content: {
      initial: { opacity: 0, scale: 0.5, filter: 'blur(20px)' },
      animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
      exit: { opacity: 0, scale: 2, filter: 'blur(30px)' },
    },
    duration: 1.2,
    overlayColor: 'from-blue-900/95 via-purple-900/90 to-cyan-900/95',
    icon: 'warp',
    label: 'Engaging Warp Drive...',
  },
  elevator: {
    overlay: {
      initial: { opacity: 0, y: '-100%' },
      animate: { opacity: 1, y: '0%' },
      exit: { opacity: 0, y: '100%' },
    },
    content: {
      initial: { opacity: 0, y: -100 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 100 },
    },
    duration: 0.8,
    overlayColor: 'from-slate-900/95 via-slate-800/90 to-slate-900/95',
    icon: 'elevator',
    label: 'Descending...',
  },
  teleport: {
    overlay: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    content: {
      initial: { opacity: 0, scale: 0, rotate: 180 },
      animate: { opacity: 1, scale: 1, rotate: 0 },
      exit: { opacity: 0, scale: 0, rotate: -180 },
    },
    duration: 0.6,
    overlayColor: 'from-cyan-900/95 via-teal-900/90 to-cyan-900/95',
    icon: 'teleport',
    label: 'Teleporting...',
  },
  walk: {
    overlay: {
      initial: { opacity: 0, x: '-100%' },
      animate: { opacity: 1, x: '0%' },
      exit: { opacity: 0, x: '100%' },
    },
    content: {
      initial: { opacity: 0, x: -200 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 200 },
    },
    duration: 0.6,
    overlayColor: 'from-slate-900/90 via-slate-800/85 to-slate-900/90',
    icon: 'walk',
    label: 'Moving...',
  },
  shuttle: {
    overlay: {
      initial: { opacity: 0, y: '100%', scale: 0.9 },
      animate: { opacity: 1, y: '0%', scale: 1 },
      exit: { opacity: 0, y: '-100%', scale: 1.1 },
    },
    content: {
      initial: { opacity: 0, y: 150, scale: 0.8 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -150, scale: 1.2 },
    },
    duration: 1.0,
    overlayColor: 'from-indigo-900/95 via-slate-900/90 to-indigo-900/95',
    icon: 'shuttle',
    label: 'Shuttle Transit...',
  },
}

// ============================================================================
// TRANSITION ICONS
// ============================================================================

function TransitionIcon({ type }: { type: TransitionType }) {
  const iconClasses = 'w-16 h-16 text-cyan-400'

  switch (type) {
    case 'warp':
      return (
        <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M8.76 15.24l-2.83 2.83m0-12.14l2.83 2.83m7.48 7.48l2.83 2.83"
          />
        </svg>
      )
    case 'elevator':
      return (
        <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="4" y="2" width="16" height="20" rx="2" strokeWidth={1.5} />
          <line x1="12" y1="6" x2="12" y2="18" strokeWidth={1.5} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 9l3-3 3 3m-6 6l3 3 3-3" />
        </svg>
      )
    case 'teleport':
      return (
        <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="9" strokeWidth={1.5} strokeDasharray="4 2" />
          <circle cx="12" cy="12" r="5" strokeWidth={1.5} />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      )
    case 'walk':
      return (
        <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="4" r="2" strokeWidth={1.5} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l-3 5m3-5l3 5m-6-8h6" />
        </svg>
      )
    case 'shuttle':
      return (
        <svg className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 2l3 6h4l-2 4 2 4h-4l-3 6-3-6H5l2-4-2-4h4l3-6z"
          />
        </svg>
      )
    default:
      return null
  }
}

// ============================================================================
// TRANSITION OVERLAY
// ============================================================================

interface TransitionOverlayProps {
  config: TransitionConfig
  type: TransitionType
  isVisible: boolean
}

function TransitionOverlay({ config, type, isVisible }: TransitionOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={config.overlay.initial}
          animate={config.overlay.animate}
          exit={config.overlay.exit}
          transition={{
            duration: config.duration * 0.5,
            ease: [0.4, 0, 0.2, 1],
          }}
          className={`
            fixed inset-0 z-[100]
            bg-gradient-to-br ${config.overlayColor}
            backdrop-blur-lg
            flex flex-col items-center justify-center
          `}
        >
          {/* Animated background effects */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
              }}
            />

            {/* Animated lines for warp effect */}
            {type === 'warp' && (
              <>
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{
                      x: '200%',
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: 1,
                      delay: i * 0.05,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="absolute h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                    style={{
                      top: `${5 + i * 5}%`,
                      width: '100%',
                    }}
                  />
                ))}
              </>
            )}

            {/* Circular pulse for teleport */}
            {type === 'teleport' && (
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 border-cyan-400"
              />
            )}
          </div>

          {/* Icon and label */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative z-10 flex flex-col items-center gap-6"
          >
            {/* Animated icon */}
            <motion.div
              animate={{
                rotate: type === 'warp' ? [0, 360] : 0,
                scale: type === 'teleport' ? [1, 1.2, 1] : 1,
              }}
              transition={{
                duration: type === 'warp' ? 2 : 1,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <TransitionIcon type={type} />
            </motion.div>

            {/* Label */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-cyan-300 text-lg font-medium tracking-wider"
            >
              {config.label}
            </motion.p>

            {/* Progress bar */}
            <div className="w-48 h-1 bg-slate-700/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{
                  duration: config.duration * 0.8,
                  ease: 'easeInOut',
                }}
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * SceneTransition - Manages animated transitions between 3D scenes
 *
 * Provides various transition effects:
 * - warp: Hyperspace-style zoom/blur effect for galactic travel
 * - elevator: Vertical sliding for underground/surface transitions
 * - teleport: Spin/scale effect for instant teleportation
 * - walk: Horizontal slide for walking between nearby areas
 * - shuttle: Lift-off/landing effect for orbital transitions
 */
export function SceneTransition({
  currentScene,
  transitionType = 'warp',
  children,
  duration = 1000,
  onTransitionStart,
  onTransitionComplete,
}: SceneTransitionProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [previousScene, setPreviousScene] = useState<SceneType>(currentScene)
  const [displayedScene, setDisplayedScene] = useState<SceneType>(currentScene)

  const config = TRANSITION_CONFIGS[transitionType]

  // Handle scene changes
  useEffect(() => {
    if (currentScene !== previousScene) {
      // Start transition
      setIsTransitioning(true)
      onTransitionStart?.()

      // Update displayed scene halfway through transition
      const halfDuration = (duration * config.duration) / 2
      const sceneTimer = setTimeout(() => {
        setDisplayedScene(currentScene)
      }, halfDuration)

      // End transition
      const endTimer = setTimeout(() => {
        setIsTransitioning(false)
        setPreviousScene(currentScene)
        onTransitionComplete?.()
      }, duration * config.duration)

      return () => {
        clearTimeout(sceneTimer)
        clearTimeout(endTimer)
      }
    }
  }, [currentScene, previousScene, duration, config.duration, onTransitionStart, onTransitionComplete])

  return (
    <div className="relative w-full h-full">
      {/* Transition overlay */}
      <TransitionOverlay
        config={config}
        type={transitionType}
        isVisible={isTransitioning}
      />

      {/* Scene content with animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={displayedScene}
          initial={config.content.initial}
          animate={config.content.animate}
          exit={config.content.exit}
          transition={{
            duration: config.duration * 0.5,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="absolute inset-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default SceneTransition
