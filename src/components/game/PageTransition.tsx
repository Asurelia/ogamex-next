'use client'

import { memo, useCallback, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

// ============================================================================
// TYPES
// ============================================================================

export type TransitionType = 'fade' | 'slide' | 'scale' | 'warp' | 'none'

interface PageTransitionProps {
  children: React.ReactNode
  type?: TransitionType
  duration?: number
  className?: string
}

// ============================================================================
// TRANSITION VARIANTS
// ============================================================================

const transitionVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
  },
  warp: {
    initial: {
      opacity: 0,
      scale: 0.9,
      filter: 'blur(10px)',
    },
    animate: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
    },
    exit: {
      opacity: 0,
      scale: 1.1,
      filter: 'blur(10px)',
    },
  },
  none: {
    initial: {},
    animate: {},
    exit: {},
  },
}

// ============================================================================
// STARFIELD WARP EFFECT
// ============================================================================

interface WarpEffectProps {
  isActive: boolean
  duration: number
}

const WarpEffect = memo(function WarpEffect({ isActive, duration }: WarpEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const starsRef = useRef<Array<{ x: number; y: number; z: number; speed: number }>>([])

  useEffect(() => {
    if (!isActive || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Initialize stars
    const starCount = 200
    starsRef.current = Array.from({ length: starCount }, () => ({
      x: (Math.random() - 0.5) * canvas.width * 3,
      y: (Math.random() - 0.5) * canvas.height * 3,
      z: Math.random() * 1000,
      speed: Math.random() * 0.5 + 0.5,
    }))

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    let warpSpeed = 1

    const animate = () => {
      // Increase warp speed over time
      warpSpeed = Math.min(warpSpeed + 0.1, 50)

      // Clear with trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw stars
      starsRef.current.forEach(star => {
        // Move star towards viewer
        star.z -= warpSpeed * star.speed

        // Reset star if it passes the viewer
        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * canvas.width * 3
          star.y = (Math.random() - 0.5) * canvas.height * 3
          star.z = 1000
        }

        // Project 3D position to 2D
        const perspective = 200 / star.z
        const screenX = centerX + star.x * perspective
        const screenY = centerY + star.y * perspective

        // Draw star trail
        const prevZ = star.z + warpSpeed * star.speed * 2
        const prevPerspective = 200 / prevZ
        const prevScreenX = centerX + star.x * prevPerspective
        const prevScreenY = centerY + star.y * prevPerspective

        // Calculate brightness based on depth
        const brightness = Math.min(1, (1000 - star.z) / 500)
        const size = Math.max(0.5, (1000 - star.z) / 200)

        // Draw trail line
        ctx.beginPath()
        ctx.moveTo(prevScreenX, prevScreenY)
        ctx.lineTo(screenX, screenY)
        ctx.strokeStyle = `rgba(100, 200, 255, ${brightness * 0.8})`
        ctx.lineWidth = size
        ctx.stroke()

        // Draw star point
        ctx.beginPath()
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener('resize', resize)
    }
  }, [isActive])

  if (!isActive) return null

  return (
    <motion.canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    />
  )
})

// ============================================================================
// PAGE TRANSITION COMPONENT
// ============================================================================

export const PageTransition = memo(function PageTransition({
  children,
  type = 'fade',
  duration = 0.3,
  className = '',
}: PageTransitionProps) {
  const pathname = usePathname()
  const shouldReduceMotion = useReducedMotion()
  const isFirstRender = useRef(true)

  // Skip animation on first render
  useEffect(() => {
    isFirstRender.current = false
  }, [])

  // Use reduced motion settings
  const effectiveType = shouldReduceMotion ? 'none' : type
  const effectiveDuration = shouldReduceMotion ? 0 : duration

  const variants = transitionVariants[effectiveType]
  const transition = {
    duration: effectiveDuration,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number], // Custom cubic bezier curve
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={isFirstRender.current ? false : variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={transition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
})

// ============================================================================
// PAGE WRAPPER WITH WARP EFFECT
// ============================================================================

interface PageWrapperProps {
  children: React.ReactNode
  enableWarp?: boolean
  transitionType?: TransitionType
  duration?: number
  className?: string
}

export const PageWrapper = memo(function PageWrapper({
  children,
  enableWarp = false,
  transitionType = 'fade',
  duration = 0.3,
  className = '',
}: PageWrapperProps) {
  const pathname = usePathname()
  const prevPathRef = useRef(pathname)
  const isTransitioning = useRef(false)

  // Detect page changes
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      isTransitioning.current = true
      const timeout = setTimeout(() => {
        isTransitioning.current = false
      }, duration * 1000 + 100)

      prevPathRef.current = pathname
      return () => clearTimeout(timeout)
    }
  }, [pathname, duration])

  return (
    <>
      {/* Warp effect overlay */}
      <AnimatePresence>
        {enableWarp && isTransitioning.current && (
          <WarpEffect isActive={true} duration={duration} />
        )}
      </AnimatePresence>

      {/* Page content with transition */}
      <PageTransition type={transitionType} duration={duration} className={className}>
        {children}
      </PageTransition>
    </>
  )
})

// ============================================================================
// LOADING OVERLAY
// ============================================================================

interface LoadingOverlayProps {
  isLoading: boolean
}

export const LoadingOverlay = memo(function LoadingOverlay({ isLoading }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Animated loading indicator */}
          <div className="relative">
            {/* Outer ring */}
            <motion.div
              className="w-16 h-16 rounded-full border-2 border-cyan-500/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />

            {/* Inner ring */}
            <motion.div
              className="absolute inset-2 rounded-full border-2 border-cyan-500/50
                         border-t-cyan-500"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />

            {/* Center dot */}
            <motion.div
              className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-cyan-500"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>

          {/* Loading text */}
          <motion.p
            className="absolute mt-24 text-sm text-cyan-500/70 font-mono"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Warping...
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

export default PageTransition
