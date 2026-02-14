'use client'

import React, { useRef, useState, useCallback } from 'react'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import clsx from 'clsx'

export interface HoloCardProps {
  children: React.ReactNode
  variant?: 'default' | 'accent' | 'warning' | 'danger' | 'success' | 'highlight'
  glow?: boolean
  scanline?: boolean
  className?: string
  onClick?: () => void
  // Optional header with title
  title?: string
  subtitle?: string
  // Optional image
  image?: string
  imageAlt?: string
  // Padding control
  noPadding?: boolean
}

const variantStyles = {
  default: {
    border: 'rgba(0, 255, 255, 0.3)',
    glow: 'rgba(0, 255, 255, 0.4)',
    gradient: 'from-cyan-500/10 to-transparent',
    hoverBorder: 'rgba(0, 255, 255, 0.6)',
  },
  accent: {
    border: 'rgba(255, 0, 255, 0.3)',
    glow: 'rgba(255, 0, 255, 0.4)',
    gradient: 'from-fuchsia-500/10 to-transparent',
    hoverBorder: 'rgba(255, 0, 255, 0.6)',
  },
  warning: {
    border: 'rgba(255, 215, 0, 0.3)',
    glow: 'rgba(255, 215, 0, 0.4)',
    gradient: 'from-yellow-500/10 to-transparent',
    hoverBorder: 'rgba(255, 215, 0, 0.6)',
  },
  danger: {
    border: 'rgba(255, 68, 68, 0.3)',
    glow: 'rgba(255, 68, 68, 0.4)',
    gradient: 'from-red-500/10 to-transparent',
    hoverBorder: 'rgba(255, 68, 68, 0.6)',
  },
  success: {
    border: 'rgba(0, 255, 136, 0.3)',
    glow: 'rgba(0, 255, 136, 0.4)',
    gradient: 'from-emerald-500/10 to-transparent',
    hoverBorder: 'rgba(0, 255, 136, 0.6)',
  },
  highlight: {
    border: 'rgba(255, 215, 0, 0.4)',
    glow: 'rgba(255, 215, 0, 0.5)',
    gradient: 'from-amber-500/15 to-transparent',
    hoverBorder: 'rgba(255, 215, 0, 0.7)',
  },
}

export function HoloCard({
  children,
  variant = 'default',
  glow = true,
  scanline = false,
  className,
  onClick,
  title,
  subtitle,
  image,
  imageAlt,
  noPadding = false,
}: HoloCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), {
    stiffness: 150,
    damping: 20,
  })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), {
    stiffness: 150,
    damping: 20,
  })

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }, [mouseX, mouseY])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    mouseX.set(0)
    mouseY.set(0)
  }, [mouseX, mouseY])

  const styles = variantStyles[variant]

  return (
    <motion.div
      ref={cardRef}
      className={clsx(
        'relative rounded-lg overflow-hidden',
        onClick && 'cursor-pointer',
        className
      )}
      style={{
        perspective: 1000,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <motion.div
        className="relative rounded-lg overflow-hidden"
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Glow layer */}
        {glow && (
          <motion.div
            className="absolute -inset-1 rounded-lg blur-lg opacity-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, ${styles.glow}, transparent 70%)`,
            }}
            animate={{ opacity: isHovered ? 0.6 : 0 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Main card body */}
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(10, 20, 35, 0.9), rgba(5, 15, 30, 0.95))',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${isHovered ? styles.hoverBorder : styles.border}`,
            boxShadow: glow && isHovered
              ? `0 0 20px ${styles.glow}, 0 8px 32px rgba(0, 0, 0, 0.4)`
              : '0 4px 20px rgba(0, 0, 0, 0.3)',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          {/* Gradient overlay */}
          <div
            className={clsx(
              'absolute inset-0 bg-gradient-to-b opacity-50 pointer-events-none',
              styles.gradient
            )}
          />

          {/* Scanline effect */}
          {scanline && (
            <>
              {/* Static scanlines */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                  background: `repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(0, 255, 255, 0.1) 2px,
                    rgba(0, 255, 255, 0.1) 4px
                  )`,
                }}
              />
              {/* Moving scan line */}
              <motion.div
                className="absolute left-0 right-0 h-[2px] pointer-events-none"
                style={{
                  background: `linear-gradient(90deg, transparent, ${styles.glow}, transparent)`,
                  boxShadow: `0 0 10px ${styles.glow}`,
                }}
                animate={{
                  top: ['0%', '100%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            </>
          )}

          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none">
            <div
              className="absolute top-0 left-0 w-full h-[1px]"
              style={{ background: `linear-gradient(90deg, ${styles.border}, transparent)` }}
            />
            <div
              className="absolute top-0 left-0 w-[1px] h-full"
              style={{ background: `linear-gradient(180deg, ${styles.border}, transparent)` }}
            />
          </div>
          <div className="absolute top-0 right-0 w-4 h-4 pointer-events-none">
            <div
              className="absolute top-0 right-0 w-full h-[1px]"
              style={{ background: `linear-gradient(270deg, ${styles.border}, transparent)` }}
            />
            <div
              className="absolute top-0 right-0 w-[1px] h-full"
              style={{ background: `linear-gradient(180deg, ${styles.border}, transparent)` }}
            />
          </div>
          <div className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none">
            <div
              className="absolute bottom-0 left-0 w-full h-[1px]"
              style={{ background: `linear-gradient(90deg, ${styles.border}, transparent)` }}
            />
            <div
              className="absolute bottom-0 left-0 w-[1px] h-full"
              style={{ background: `linear-gradient(0deg, ${styles.border}, transparent)` }}
            />
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none">
            <div
              className="absolute bottom-0 right-0 w-full h-[1px]"
              style={{ background: `linear-gradient(270deg, ${styles.border}, transparent)` }}
            />
            <div
              className="absolute bottom-0 right-0 w-[1px] h-full"
              style={{ background: `linear-gradient(0deg, ${styles.border}, transparent)` }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10">
            {/* Optional image */}
            {image && (
              <div className="relative w-full h-32 overflow-hidden">
                <img
                  src={image}
                  alt={imageAlt || title || ''}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            )}

            {/* Optional header */}
            {(title || subtitle) && (
              <div
                className="px-4 py-3"
                style={{
                  borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
                  background: 'linear-gradient(180deg, rgba(0, 255, 255, 0.05) 0%, transparent 100%)',
                }}
              >
                {title && (
                  <h3
                    className="text-sm font-semibold tracking-wide uppercase"
                    style={{
                      color: '#00ffff',
                      textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                    }}
                  >
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-white/60 mt-0.5">{subtitle}</p>
                )}
              </div>
            )}

            {/* Main content */}
            <div className={noPadding ? '' : 'p-4'}>
              {children}
            </div>
          </div>

          {/* Hover shine effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(
                105deg,
                transparent 40%,
                rgba(255, 255, 255, 0.03) 45%,
                rgba(255, 255, 255, 0.05) 50%,
                rgba(255, 255, 255, 0.03) 55%,
                transparent 60%
              )`,
            }}
            animate={{
              x: isHovered ? ['100%', '-100%'] : '100%',
            }}
            transition={{
              duration: 0.8,
              ease: 'easeInOut',
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

export default HoloCard
