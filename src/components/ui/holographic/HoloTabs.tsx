'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

export interface HoloTab {
  id: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
  badge?: string | number
}

export interface HoloTabsProps {
  tabs: HoloTab[]
  activeTab?: string
  defaultTab?: string
  onChange?: (tabId: string) => void
  children?: React.ReactNode
  variant?: 'default' | 'pills' | 'underline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  tabsClassName?: string
  contentClassName?: string
  fullWidth?: boolean
}

const sizeStyles = {
  sm: {
    padding: 'px-3 py-1.5',
    fontSize: 'text-xs',
    gap: 'gap-1',
    height: 'h-8',
  },
  md: {
    padding: 'px-4 py-2',
    fontSize: 'text-sm',
    gap: 'gap-2',
    height: 'h-10',
  },
  lg: {
    padding: 'px-5 py-2.5',
    fontSize: 'text-base',
    gap: 'gap-2',
    height: 'h-12',
  },
}

export function HoloTabs({
  tabs,
  activeTab: controlledActiveTab,
  defaultTab,
  onChange,
  children,
  variant = 'default',
  size = 'md',
  className,
  tabsClassName,
  contentClassName,
  fullWidth = false,
}: HoloTabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(
    defaultTab || tabs[0]?.id || ''
  )
  const tabsRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  const activeTab = controlledActiveTab ?? internalActiveTab
  const sizes = sizeStyles[size]

  const handleTabChange = useCallback((tabId: string) => {
    if (tabs.find(t => t.id === tabId)?.disabled) return
    setInternalActiveTab(tabId)
    onChange?.(tabId)
  }, [tabs, onChange])

  // Update indicator position
  useEffect(() => {
    if (!tabsRef.current) return

    const activeElement = tabsRef.current.querySelector(
      `[data-tab-id="${activeTab}"]`
    ) as HTMLElement

    if (activeElement) {
      const containerRect = tabsRef.current.getBoundingClientRect()
      const tabRect = activeElement.getBoundingClientRect()
      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      })
    }
  }, [activeTab])

  // Get content for active tab
  const activeContent = useMemo(() => {
    if (!children) return null
    const childArray = React.Children.toArray(children)
    const activeIndex = tabs.findIndex(t => t.id === activeTab)
    return childArray[activeIndex] || null
  }, [children, tabs, activeTab])

  return (
    <div className={clsx('w-full', className)}>
      {/* Tab list */}
      <div
        ref={tabsRef}
        className={clsx(
          'relative flex',
          variant === 'pills' && 'gap-2',
          variant === 'underline' && 'border-b border-cyan-500/20',
          tabsClassName
        )}
        role="tablist"
      >
        {/* Animated indicator for default and underline variants */}
        {(variant === 'default' || variant === 'underline') && (
          <motion.div
            className={clsx(
              'absolute pointer-events-none',
              variant === 'default' && 'top-0 bottom-0 rounded-lg',
              variant === 'underline' && 'bottom-0 h-[2px]'
            )}
            style={{
              background: variant === 'default'
                ? 'linear-gradient(180deg, rgba(0, 255, 255, 0.15) 0%, rgba(0, 255, 255, 0.05) 100%)'
                : 'linear-gradient(90deg, transparent, #00ffff, transparent)',
              border: variant === 'default' ? '1px solid rgba(0, 255, 255, 0.4)' : 'none',
              boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
            }}
            animate={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
          />
        )}

        {/* Tab buttons */}
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab

          return (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-disabled={tab.disabled}
              disabled={tab.disabled}
              className={clsx(
                'relative flex items-center justify-center',
                'font-medium uppercase tracking-wider',
                'transition-all duration-200',
                'focus:outline-none',
                sizes.padding,
                sizes.fontSize,
                sizes.gap,
                sizes.height,
                tab.disabled && 'opacity-40 cursor-not-allowed',
                !tab.disabled && 'cursor-pointer',
                variant === 'pills' && [
                  'rounded-lg',
                  isActive
                    ? 'bg-cyan-500/20 border border-cyan-500/50'
                    : 'bg-transparent border border-transparent hover:bg-white/5 hover:border-white/10',
                ]
              )}
              style={{
                color: isActive ? '#00ffff' : 'rgba(255, 255, 255, 0.6)',
                textShadow: isActive ? '0 0 10px rgba(0, 255, 255, 0.5)' : 'none',
              }}
              onClick={() => handleTabChange(tab.id)}
            >
              {/* Icon */}
              {tab.icon && (
                <motion.span
                  className="flex items-center justify-center"
                  animate={{
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {tab.icon}
                </motion.span>
              )}

              {/* Label */}
              <span className="relative">
                {tab.label}
              </span>

              {/* Badge */}
              {tab.badge !== undefined && (
                <motion.span
                  className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.3), rgba(0, 200, 255, 0.2))'
                      : 'rgba(255, 255, 255, 0.1)',
                    border: `1px solid ${isActive ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                    color: isActive ? '#00ffff' : 'rgba(255, 255, 255, 0.6)',
                  }}
                  animate={{
                    scale: isActive ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 0.3,
                  }}
                >
                  {tab.badge}
                </motion.span>
              )}

              {/* Hover glow effect for pills variant */}
              {variant === 'pills' && !tab.disabled && (
                <motion.div
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{
                    boxShadow: isActive ? '0 0 15px rgba(0, 255, 255, 0.3)' : 'none',
                  }}
                />
              )}
            </button>
          )
        })}

        {/* Decorative elements */}
        {variant === 'default' && (
          <>
            <div
              className="absolute left-0 bottom-0 w-full h-[1px]"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.2), transparent)',
              }}
            />
          </>
        )}
      </div>

      {/* Tab content */}
      {children && (
        <div className={clsx('mt-4', contentClassName)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{
                duration: 0.2,
                ease: [0.32, 0.72, 0, 1],
              }}
            >
              {activeContent}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// Tab panel component for convenience
export interface HoloTabPanelProps {
  children: React.ReactNode
  className?: string
}

export function HoloTabPanel({ children, className }: HoloTabPanelProps) {
  return (
    <div className={className} role="tabpanel">
      {children}
    </div>
  )
}

export default HoloTabs
