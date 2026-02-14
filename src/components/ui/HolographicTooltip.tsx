'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface HolographicTooltipProps {
  children: React.ReactNode
  title?: string
  content?: React.ReactNode
  stats?: Array<{ label: string; value: string | number; color?: string }>
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  delay?: number
}

interface TooltipPosition {
  x: number
  y: number
  placement: 'top' | 'bottom' | 'left' | 'right'
}

const TOOLTIP_MARGIN = 12
const VIEWPORT_PADDING = 16

export function HolographicTooltip({
  children,
  title,
  content,
  stats,
  position = 'auto',
  delay = 200,
}: HolographicTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    x: 0,
    y: 0,
    placement: 'top',
  })
  const [glitchActive, setGlitchActive] = useState(false)

  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const glitchIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let placement: 'top' | 'bottom' | 'left' | 'right' = position === 'auto' ? 'top' : position
    let x = 0
    let y = 0

    // Calculate available space in each direction
    const spaceTop = triggerRect.top
    const spaceBottom = viewportHeight - triggerRect.bottom
    const spaceLeft = triggerRect.left
    const spaceRight = viewportWidth - triggerRect.right

    // Auto positioning logic
    if (position === 'auto') {
      const tooltipHeight = tooltipRect.height + TOOLTIP_MARGIN
      const tooltipWidth = tooltipRect.width + TOOLTIP_MARGIN

      if (spaceTop >= tooltipHeight) {
        placement = 'top'
      } else if (spaceBottom >= tooltipHeight) {
        placement = 'bottom'
      } else if (spaceRight >= tooltipWidth) {
        placement = 'right'
      } else if (spaceLeft >= tooltipWidth) {
        placement = 'left'
      } else {
        // Default to top if no space is ideal
        placement = spaceTop > spaceBottom ? 'top' : 'bottom'
      }
    }

    // Calculate x, y based on placement
    switch (placement) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        y = triggerRect.top - tooltipRect.height - TOOLTIP_MARGIN
        break
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        y = triggerRect.bottom + TOOLTIP_MARGIN
        break
      case 'left':
        x = triggerRect.left - tooltipRect.width - TOOLTIP_MARGIN
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        break
      case 'right':
        x = triggerRect.right + TOOLTIP_MARGIN
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        break
    }

    // Keep tooltip within viewport bounds
    x = Math.max(VIEWPORT_PADDING, Math.min(x, viewportWidth - tooltipRect.width - VIEWPORT_PADDING))
    y = Math.max(VIEWPORT_PADDING, Math.min(y, viewportHeight - tooltipRect.height - VIEWPORT_PADDING))

    setTooltipPosition({ x, y, placement })
  }, [position])

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }, [delay])

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }, [])

  // Recalculate position when tooltip becomes visible or content changes
  useEffect(() => {
    if (isVisible) {
      // Small delay to ensure tooltip is rendered before measuring
      requestAnimationFrame(() => {
        calculatePosition()
      })
    }
  }, [isVisible, calculatePosition, title, content, stats])

  // Subtle glitch effect
  useEffect(() => {
    if (isVisible) {
      glitchIntervalRef.current = setInterval(() => {
        if (Math.random() > 0.85) {
          setGlitchActive(true)
          setTimeout(() => setGlitchActive(false), 50 + Math.random() * 100)
        }
      }, 2000)

      return () => {
        if (glitchIntervalRef.current) {
          clearInterval(glitchIntervalRef.current)
        }
      }
    }
  }, [isVisible])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current)
    }
  }, [])

  const getAnimationOrigin = () => {
    switch (tooltipPosition.placement) {
      case 'top': return { originY: 1 }
      case 'bottom': return { originY: 0 }
      case 'left': return { originX: 1 }
      case 'right': return { originX: 0 }
      default: return { originY: 1 }
    }
  }

  const hasContent = title || content || (stats && stats.length > 0)

  if (!hasContent) {
    return <>{children}</>
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9, ...getAnimationOrigin() }}
            animate={{
              opacity: 1,
              scale: 1,
              x: glitchActive ? (Math.random() - 0.5) * 4 : 0,
            }}
            exit={{ opacity: 0, scale: 0.9, ...getAnimationOrigin() }}
            transition={{
              duration: 0.2,
              ease: [0.23, 1, 0.32, 1],
              x: { duration: 0.05 }
            }}
            style={{
              position: 'fixed',
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              zIndex: 9999,
            }}
            className="pointer-events-none"
          >
            {/* Main tooltip container */}
            <div className="relative">
              {/* Glow effect layer */}
              <div
                className="absolute inset-0 rounded-lg blur-md opacity-60"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(0, 200, 255, 0.2))',
                  transform: 'scale(1.05)',
                }}
              />

              {/* Main tooltip body */}
              <div
                className="relative rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(10, 25, 40, 0.95), rgba(5, 15, 30, 0.98))',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  minWidth: '180px',
                  maxWidth: '320px',
                }}
              >
                {/* Animated border */}
                <div className="absolute inset-0 rounded-lg pointer-events-none">
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="holoBorderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgba(0, 255, 255, 0.8)">
                          <animate
                            attributeName="stop-color"
                            values="rgba(0, 255, 255, 0.8);rgba(0, 200, 255, 0.6);rgba(0, 255, 255, 0.8)"
                            dur="3s"
                            repeatCount="indefinite"
                          />
                        </stop>
                        <stop offset="50%" stopColor="rgba(0, 200, 255, 0.4)">
                          <animate
                            attributeName="stop-color"
                            values="rgba(0, 200, 255, 0.4);rgba(100, 200, 255, 0.6);rgba(0, 200, 255, 0.4)"
                            dur="3s"
                            repeatCount="indefinite"
                          />
                        </stop>
                        <stop offset="100%" stopColor="rgba(0, 255, 255, 0.8)">
                          <animate
                            attributeName="stop-color"
                            values="rgba(0, 255, 255, 0.8);rgba(0, 200, 255, 0.6);rgba(0, 255, 255, 0.8)"
                            dur="3s"
                            repeatCount="indefinite"
                          />
                        </stop>
                      </linearGradient>
                    </defs>
                    <rect
                      x="0.5"
                      y="0.5"
                      width="calc(100% - 1px)"
                      height="calc(100% - 1px)"
                      rx="8"
                      ry="8"
                      fill="none"
                      stroke="url(#holoBorderGradient)"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>

                {/* Scanlines overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-10"
                  style={{
                    background: `repeating-linear-gradient(
                      0deg,
                      transparent,
                      transparent 2px,
                      rgba(0, 255, 255, 0.03) 2px,
                      rgba(0, 255, 255, 0.03) 4px
                    )`,
                    animation: 'holo-scanlines 8s linear infinite',
                  }}
                />

                {/* Content */}
                <div className="relative p-3">
                  {/* Title */}
                  {title && (
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-1 h-4 rounded-full"
                        style={{
                          background: 'linear-gradient(180deg, #00ffff, #0088ff)',
                          boxShadow: '0 0 8px rgba(0, 255, 255, 0.6)',
                        }}
                      />
                      <h4
                        className="text-sm font-semibold tracking-wide"
                        style={{
                          color: '#00ffff',
                          textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                        }}
                      >
                        {title}
                      </h4>
                    </div>
                  )}

                  {/* Content */}
                  {content && (
                    <div
                      className="text-xs leading-relaxed mb-2"
                      style={{ color: 'rgba(200, 230, 255, 0.9)' }}
                    >
                      {content}
                    </div>
                  )}

                  {/* Stats */}
                  {stats && stats.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-cyan-500/20">
                      {stats.map((stat, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-4"
                        >
                          <span
                            className="text-xs"
                            style={{ color: 'rgba(150, 200, 230, 0.8)' }}
                          >
                            {stat.label}
                          </span>
                          <span
                            className="text-xs font-mono font-medium"
                            style={{
                              color: stat.color || '#00ffff',
                              textShadow: `0 0 8px ${stat.color || 'rgba(0, 255, 255, 0.4)'}`,
                            }}
                          >
                            {stat.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Corner decorations */}
                  <div className="absolute top-0 left-0 w-3 h-3">
                    <div
                      className="absolute top-0 left-0 w-full h-[1px]"
                      style={{ background: 'linear-gradient(90deg, #00ffff, transparent)' }}
                    />
                    <div
                      className="absolute top-0 left-0 w-[1px] h-full"
                      style={{ background: 'linear-gradient(180deg, #00ffff, transparent)' }}
                    />
                  </div>
                  <div className="absolute top-0 right-0 w-3 h-3">
                    <div
                      className="absolute top-0 right-0 w-full h-[1px]"
                      style={{ background: 'linear-gradient(270deg, #00ffff, transparent)' }}
                    />
                    <div
                      className="absolute top-0 right-0 w-[1px] h-full"
                      style={{ background: 'linear-gradient(180deg, #00ffff, transparent)' }}
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 w-3 h-3">
                    <div
                      className="absolute bottom-0 left-0 w-full h-[1px]"
                      style={{ background: 'linear-gradient(90deg, #00ffff, transparent)' }}
                    />
                    <div
                      className="absolute bottom-0 left-0 w-[1px] h-full"
                      style={{ background: 'linear-gradient(0deg, #00ffff, transparent)' }}
                    />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3">
                    <div
                      className="absolute bottom-0 right-0 w-full h-[1px]"
                      style={{ background: 'linear-gradient(270deg, #00ffff, transparent)' }}
                    />
                    <div
                      className="absolute bottom-0 right-0 w-[1px] h-full"
                      style={{ background: 'linear-gradient(0deg, #00ffff, transparent)' }}
                    />
                  </div>
                </div>

                {/* Flicker overlay for glitch effect */}
                {glitchActive && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'rgba(0, 255, 255, 0.1)',
                      mixBlendMode: 'overlay',
                    }}
                  />
                )}
              </div>

              {/* Data stream decoration */}
              <motion.div
                className="absolute -right-1 top-1/2 -translate-y-1/2 w-[2px] h-8 overflow-hidden opacity-60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
              >
                <motion.div
                  className="w-full h-2 rounded-full"
                  style={{ background: 'linear-gradient(180deg, transparent, #00ffff, transparent)' }}
                  animate={{ y: ['-100%', '400%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default HolographicTooltip
