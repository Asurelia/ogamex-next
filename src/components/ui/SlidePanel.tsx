'use client'

import React, {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

// Lazy load GSAP to reduce initial bundle
let gsapModule: typeof import('gsap') | null = null
const loadGSAP = async () => {
  if (!gsapModule) {
    gsapModule = await import('gsap')
  }
  return gsapModule
}

// ============================================================================
// TYPES
// ============================================================================

export type SlidePanelPosition = 'left' | 'right' | 'bottom'
export type SlidePanelSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export interface SlidePanelProps {
  /** Whether the panel is open */
  isOpen: boolean
  /** Callback when panel should close */
  onClose: () => void
  /** Panel title */
  title?: string
  /** Panel content */
  children: ReactNode
  /** Position of the panel */
  position?: SlidePanelPosition
  /** Size of the panel */
  size?: SlidePanelSize
  /** Show close button */
  showCloseButton?: boolean
  /** Close on overlay click */
  closeOnOverlayClick?: boolean
  /** Close on Escape key */
  closeOnEscape?: boolean
  /** Additional class names */
  className?: string
  /** Custom z-index */
  zIndex?: number
  /** Accessibility label */
  ariaLabel?: string
}

// ============================================================================
// SIZE CONFIGURATIONS
// ============================================================================

const PANEL_SIZES: Record<SlidePanelPosition, Record<SlidePanelSize, string>> = {
  left: {
    sm: 'w-72',
    md: 'w-96',
    lg: 'w-[32rem]',
    xl: 'w-[40rem]',
    full: 'w-full',
  },
  right: {
    sm: 'w-72',
    md: 'w-96',
    lg: 'w-[32rem]',
    xl: 'w-[40rem]',
    full: 'w-full',
  },
  bottom: {
    sm: 'h-48',
    md: 'h-64',
    lg: 'h-96',
    xl: 'h-[32rem]',
    full: 'h-full',
  },
}

const POSITION_STYLES: Record<SlidePanelPosition, string> = {
  left: 'left-0 top-0 bottom-0',
  right: 'right-0 top-0 bottom-0',
  bottom: 'left-0 right-0 bottom-0',
}

// ============================================================================
// FOCUS TRAP HOOK
// ============================================================================

function useFocusTrap(isOpen: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus first element on open
    if (firstElement) {
      firstElement.focus()
    }

    const handleTabKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen, containerRef])
}

// ============================================================================
// REDUCED MOTION HOOK
// ============================================================================

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

// ============================================================================
// SLIDE PANEL COMPONENT
// ============================================================================

export function SlidePanel({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  zIndex = 50,
  ariaLabel,
}: SlidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const prefersReducedMotion = usePrefersReducedMotion()
  useFocusTrap(isOpen, panelRef)

  // Store previous active element and restore on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      previousActiveElement.current?.focus()
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // GSAP animations
  useEffect(() => {
    if (!panelRef.current || !overlayRef.current) return

    const animate = async () => {
      const { gsap } = await loadGSAP()
      const panel = panelRef.current
      const overlay = overlayRef.current
      if (!panel || !overlay) return

      const duration = prefersReducedMotion ? 0 : 0.3
      const ease = 'power2.out'

      // Get initial transform based on position
      const getTransform = (isClosing: boolean) => {
        const value = isClosing ? (position === 'bottom' ? '100%' : position === 'left' ? '-100%' : '100%') : '0%'
        return position === 'bottom' ? { y: value } : { x: value }
      }

      if (isOpen) {
        // Opening animation
        gsap.set(panel, getTransform(true))
        gsap.set(overlay, { opacity: 0 })

        gsap.to(panel, {
          ...getTransform(false),
          duration,
          ease,
        })
        gsap.to(overlay, {
          opacity: 1,
          duration,
          ease,
        })
      } else {
        // Closing animation
        gsap.to(panel, {
          ...getTransform(true),
          duration,
          ease,
        })
        gsap.to(overlay, {
          opacity: 0,
          duration,
          ease,
        })
      }
    }

    animate()
  }, [isOpen, position, prefersReducedMotion])

  // Escape key handler
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeOnEscape, onClose])

  // Touch handling for mobile swipe to close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y
      const threshold = 100

      // Check swipe direction based on panel position
      const shouldClose =
        (position === 'right' && deltaX > threshold) ||
        (position === 'left' && deltaX < -threshold) ||
        (position === 'bottom' && deltaY > threshold)

      if (shouldClose) {
        onClose()
      }

      touchStartRef.current = null
    },
    [position, onClose]
  )

  // Overlay click handler
  const handleOverlayClick = useCallback(() => {
    if (closeOnOverlayClick) {
      onClose()
    }
  }, [closeOnOverlayClick, onClose])

  // Don't render if not open (after animation)
  const [shouldRender, setShouldRender] = React.useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
    } else {
      const timer = setTimeout(() => setShouldRender(false), prefersReducedMotion ? 0 : 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, prefersReducedMotion])

  if (!shouldRender) return null

  // Portal to body
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title || 'Side panel'}
    >
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={clsx(
          'absolute flex flex-col',
          'bg-gradient-to-br from-gray-900/98 to-gray-950/98',
          'border-cyan-500/30',
          'shadow-2xl shadow-cyan-500/10',
          POSITION_STYLES[position],
          PANEL_SIZES[position][size],
          position === 'left' && 'border-r',
          position === 'right' && 'border-l',
          position === 'bottom' && 'border-t',
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: position === 'bottom' ? 'translateY(100%)' : position === 'left' ? 'translateX(-100%)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20"
            style={{
              background: 'linear-gradient(180deg, rgba(0, 255, 255, 0.05) 0%, transparent 100%)',
            }}
          >
            {title && (
              <h2
                className="text-lg font-semibold tracking-wide uppercase"
                style={{
                  color: '#00ffff',
                  textShadow: '0 0 10px rgba(0, 255, 255, 0.4)',
                }}
              >
                {title}
              </h2>
            )}

            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close panel"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>

        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent" />
          <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-cyan-500/50 to-transparent" />
        </div>
        <div className="absolute top-0 right-0 w-4 h-4 pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-[1px] bg-gradient-to-l from-cyan-500/50 to-transparent" />
          <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-cyan-500/50 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none">
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent" />
          <div className="absolute bottom-0 left-0 w-[1px] h-full bg-gradient-to-t from-cyan-500/50 to-transparent" />
        </div>
        <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-cyan-500/50 to-transparent" />
          <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-cyan-500/50 to-transparent" />
        </div>

        {/* Mobile swipe hint */}
        {position !== 'bottom' && (
          <div className="absolute top-1/2 -translate-y-1/2 w-1 h-16 bg-cyan-500/30 rounded-full pointer-events-none md:hidden"
            style={{
              [position === 'left' ? 'right' : 'left']: '4px',
            }}
          />
        )}
        {position === 'bottom' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-cyan-500/30 rounded-full pointer-events-none md:hidden" />
        )}
      </div>
    </div>,
    document.body
  )
}

export default SlidePanel
