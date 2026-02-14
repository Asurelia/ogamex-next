'use client'

import React, { useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

export interface HoloModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  className?: string
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[90vw] max-h-[90vh]',
}

export function HoloModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
}: HoloModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && closeOnEscape) {
      onClose()
    }
  }, [onClose, closeOnEscape])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  // Focus trap and initial focus
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus()
      }
    }
  }, [isOpen])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose()
    }
  }, [onClose, closeOnOverlayClick])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop with blur */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9))',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleOverlayClick}
          />

          {/* Grid lines background effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal container */}
          <motion.div
            ref={modalRef}
            className={clsx(
              'relative w-full rounded-lg overflow-hidden',
              sizeStyles[size],
              className
            )}
            initial={{
              scale: 0.9,
              y: 20,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              y: 0,
              opacity: 1,
            }}
            exit={{
              scale: 0.9,
              y: 20,
              opacity: 0,
            }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
            }}
          >
            {/* Outer glow */}
            <div
              className="absolute -inset-2 rounded-xl pointer-events-none blur-xl"
              style={{
                background: 'radial-gradient(circle at center, rgba(0, 255, 255, 0.2), transparent 70%)',
              }}
            />

            {/* Main modal body */}
            <div
              className="relative rounded-lg overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(10, 20, 35, 0.95), rgba(5, 15, 30, 0.98))',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                boxShadow: '0 0 30px rgba(0, 255, 255, 0.2), 0 20px 50px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* Animated border effect */}
              <motion.div
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.3), transparent)',
                  backgroundSize: '200% 100%',
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '200% 50%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />

              {/* Scanline overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.02]"
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
                className="absolute left-0 right-0 h-[1px] pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.5), transparent)',
                  boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                }}
                animate={{
                  top: ['0%', '100%'],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />

              {/* Header */}
              {(title || showCloseButton) && (
                <div
                  className="flex items-center justify-between px-5 py-4"
                  style={{
                    borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
                    background: 'linear-gradient(180deg, rgba(0, 255, 255, 0.05) 0%, transparent 100%)',
                  }}
                >
                  {/* Title with decorative element */}
                  {title && (
                    <div className="flex items-center gap-3">
                      {/* Title indicator */}
                      <div className="flex items-center gap-1">
                        <motion.div
                          className="w-1 h-4 rounded-full"
                          style={{
                            background: 'linear-gradient(180deg, #00ffff, #0088ff)',
                            boxShadow: '0 0 8px rgba(0, 255, 255, 0.6)',
                          }}
                          animate={{
                            opacity: [0.7, 1, 0.7],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        />
                        <motion.div
                          className="w-0.5 h-3 rounded-full"
                          style={{
                            background: 'rgba(0, 255, 255, 0.5)',
                          }}
                        />
                      </div>

                      <h2
                        className="text-lg font-semibold tracking-wide uppercase"
                        style={{
                          color: '#00ffff',
                          textShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
                        }}
                      >
                        {title}
                      </h2>
                    </div>
                  )}

                  {/* Close button */}
                  {showCloseButton && (
                    <motion.button
                      className="relative p-2 rounded-lg group"
                      style={{
                        background: 'rgba(255, 68, 68, 0.1)',
                        border: '1px solid rgba(255, 68, 68, 0.3)',
                      }}
                      onClick={onClose}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100"
                        style={{
                          background: 'rgba(255, 68, 68, 0.2)',
                          boxShadow: '0 0 15px rgba(255, 68, 68, 0.3)',
                        }}
                        transition={{ duration: 0.2 }}
                      />
                      <svg
                        className="w-5 h-5 text-red-400 relative z-10"
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
                    </motion.button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="relative p-5">
                {children}
              </div>

              {/* Corner decorations */}
              <div className="absolute top-0 left-0 w-6 h-6 pointer-events-none">
                <div
                  className="absolute top-0 left-0 w-full h-[2px]"
                  style={{ background: 'linear-gradient(90deg, #00ffff, transparent)' }}
                />
                <div
                  className="absolute top-0 left-0 w-[2px] h-full"
                  style={{ background: 'linear-gradient(180deg, #00ffff, transparent)' }}
                />
              </div>
              <div className="absolute top-0 right-0 w-6 h-6 pointer-events-none">
                <div
                  className="absolute top-0 right-0 w-full h-[2px]"
                  style={{ background: 'linear-gradient(270deg, #00ffff, transparent)' }}
                />
                <div
                  className="absolute top-0 right-0 w-[2px] h-full"
                  style={{ background: 'linear-gradient(180deg, #00ffff, transparent)' }}
                />
              </div>
              <div className="absolute bottom-0 left-0 w-6 h-6 pointer-events-none">
                <div
                  className="absolute bottom-0 left-0 w-full h-[2px]"
                  style={{ background: 'linear-gradient(90deg, #00ffff, transparent)' }}
                />
                <div
                  className="absolute bottom-0 left-0 w-[2px] h-full"
                  style={{ background: 'linear-gradient(0deg, #00ffff, transparent)' }}
                />
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none">
                <div
                  className="absolute bottom-0 right-0 w-full h-[2px]"
                  style={{ background: 'linear-gradient(270deg, #00ffff, transparent)' }}
                />
                <div
                  className="absolute bottom-0 right-0 w-[2px] h-full"
                  style={{ background: 'linear-gradient(0deg, #00ffff, transparent)' }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default HoloModal
