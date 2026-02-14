'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TimelineEvent {
  time: Date
  title: string
  description?: string
  type?: 'info' | 'success' | 'warning' | 'danger'
  icon?: React.ReactNode
}

interface HoloTimelineProps {
  events: TimelineEvent[]
  orientation?: 'vertical' | 'horizontal'
}

const TYPE_COLORS = {
  info: '#00ffff',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isRecent(date: Date, thresholdMinutes: number = 5): boolean {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return diffMs < thresholdMinutes * 60000
}

function TimelinePoint({
  event,
  index,
  isHovered,
  onHover,
  orientation,
}: {
  event: TimelineEvent
  index: number
  isHovered: boolean
  onHover: (idx: number | null) => void
  orientation: 'vertical' | 'horizontal'
}) {
  const color = TYPE_COLORS[event.type || 'info']
  const recent = isRecent(event.time)

  return (
    <motion.div
      className={`relative flex ${
        orientation === 'vertical' ? 'flex-row gap-4' : 'flex-col items-center gap-2'
      }`}
      initial={{ opacity: 0, x: orientation === 'vertical' ? -20 : 0, y: orientation === 'horizontal' ? -20 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Point */}
      <div className="relative flex-shrink-0">
        {/* Pulse animation for recent events */}
        {recent && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: color,
              boxShadow: `0 0 20px ${color}`,
            }}
            animate={{
              scale: [1, 2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Main point */}
        <motion.div
          className="relative w-4 h-4 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle, ${color}, ${color}80)`,
            boxShadow: `0 0 12px ${color}80`,
            border: `2px solid ${color}`,
          }}
          animate={{
            scale: isHovered ? 1.3 : 1,
            boxShadow: isHovered ? `0 0 20px ${color}` : `0 0 12px ${color}80`,
          }}
          transition={{ duration: 0.2 }}
        >
          {event.icon && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ color: 'white', fontSize: '0.5rem' }}
              animate={{ scale: isHovered ? 1.2 : 1 }}
            >
              {event.icon}
            </motion.div>
          )}
        </motion.div>

        {/* Inner glow */}
        <div
          className="absolute inset-1 rounded-full"
          style={{
            background: `radial-gradient(circle, white 0%, transparent 70%)`,
            opacity: 0.5,
          }}
        />
      </div>

      {/* Content */}
      <div
        className={`flex-1 ${
          orientation === 'horizontal' ? 'text-center max-w-[150px]' : ''
        }`}
      >
        {/* Time */}
        <div
          className="text-xs font-mono mb-1"
          style={{
            color: 'rgba(150,200,230,0.6)',
          }}
        >
          {formatTimeAgo(event.time)}
        </div>

        {/* Title */}
        <motion.div
          className="text-sm font-medium mb-1"
          style={{
            color: isHovered ? color : 'rgba(200,230,255,0.9)',
            textShadow: isHovered ? `0 0 10px ${color}40` : 'none',
          }}
          animate={{
            x: isHovered && orientation === 'vertical' ? 4 : 0,
          }}
          transition={{ duration: 0.2 }}
        >
          {event.title}
        </motion.div>

        {/* Description on hover */}
        <AnimatePresence>
          {isHovered && event.description && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs overflow-hidden"
              style={{ color: 'rgba(150,200,230,0.7)' }}
            >
              {event.description}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export function HoloTimelineAdvanced({
  events,
  orientation = 'vertical',
}: HoloTimelineProps) {
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null)

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => b.time.getTime() - a.time.getTime()),
    [events]
  )

  return (
    <div className="relative">
      {/* Glow background */}
      <div
        className="absolute inset-0 rounded-lg blur-xl opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,255,255,0.15), transparent 70%)',
        }}
      />

      {/* Main container */}
      <div
        className="relative rounded-lg overflow-hidden p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(10, 25, 40, 0.9), rgba(5, 15, 30, 0.95))',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 255, 255, 0.2)',
        }}
      >
        {/* Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 255, 255, 0.05) 2px,
              rgba(0, 255, 255, 0.05) 4px
            )`,
          }}
        />

        <div
          className={`relative ${
            orientation === 'vertical'
              ? 'flex flex-col gap-6'
              : 'flex flex-row gap-8 overflow-x-auto pb-2'
          }`}
        >
          {/* Connecting line */}
          <div
            className={`absolute pointer-events-none ${
              orientation === 'vertical'
                ? 'left-[7px] top-0 bottom-0 w-[2px]'
                : 'top-[7px] left-0 right-0 h-[2px]'
            }`}
            style={{
              background: 'linear-gradient(180deg, rgba(0,255,255,0.3), rgba(0,255,255,0.1))',
            }}
          />

          {/* Animated light traveling along the line */}
          <motion.div
            className={`absolute pointer-events-none ${
              orientation === 'vertical'
                ? 'left-[6px] w-[4px] h-8'
                : 'top-[6px] h-[4px] w-8'
            }`}
            style={{
              background: orientation === 'vertical'
                ? 'linear-gradient(180deg, transparent, #00ffff, transparent)'
                : 'linear-gradient(90deg, transparent, #00ffff, transparent)',
              borderRadius: '2px',
              boxShadow: '0 0 10px #00ffff',
            }}
            animate={
              orientation === 'vertical'
                ? { top: ['0%', '100%'] }
                : { left: ['0%', '100%'] }
            }
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          {/* Events */}
          {sortedEvents.map((event, idx) => (
            <TimelinePoint
              key={idx}
              event={event}
              index={idx}
              isHovered={hoveredEvent === idx}
              onHover={setHoveredEvent}
              orientation={orientation}
            />
          ))}
        </div>

        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-4 h-4 pointer-events-none">
          <div
            className="absolute top-0 left-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(90deg, #00ffff, transparent)' }}
          />
          <div
            className="absolute top-0 left-0 w-[1px] h-full"
            style={{ background: 'linear-gradient(180deg, #00ffff, transparent)' }}
          />
        </div>
        <div className="absolute top-0 right-0 w-4 h-4 pointer-events-none">
          <div
            className="absolute top-0 right-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(270deg, #00ffff, transparent)' }}
          />
          <div
            className="absolute top-0 right-0 w-[1px] h-full"
            style={{ background: 'linear-gradient(180deg, #00ffff, transparent)' }}
          />
        </div>
        <div className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none">
          <div
            className="absolute bottom-0 left-0 w-full h-[1px]"
            style={{ background: 'linear-gradient(90deg, #00ffff, transparent)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-[1px] h-full"
            style={{ background: 'linear-gradient(0deg, #00ffff, transparent)' }}
          />
        </div>
        <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none">
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
    </div>
  )
}

export default HoloTimelineAdvanced
