'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface HoloCountdownProps {
  targetDate?: Date
  endTime?: Date // Alias for targetDate for backward compatibility
  onComplete?: () => void
  format?: 'full' | 'compact' | 'minimal'
  variant?: 'full' | 'compact' | 'minimal' // Alias for format
  size?: 'sm' | 'md' | 'lg' // Size variant
  showLabels?: boolean
}

interface TimeUnit {
  value: number
  label: string
  shortLabel: string
}

function calculateTimeLeft(targetDate: Date): TimeUnit[] {
  const now = new Date()
  const diff = Math.max(0, targetDate.getTime() - now.getTime())

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return [
    { value: days, label: 'Days', shortLabel: 'd' },
    { value: hours, label: 'Hours', shortLabel: 'h' },
    { value: minutes, label: 'Minutes', shortLabel: 'm' },
    { value: seconds, label: 'Seconds', shortLabel: 's' },
  ]
}

function FlipDigit({
  digit,
  prevDigit,
  color,
  size,
}: {
  digit: string
  prevDigit: string
  color: string
  size: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-6 h-8 text-sm',
    md: 'w-8 h-10 text-lg',
    lg: 'w-10 h-14 text-2xl',
  }

  const hasChanged = digit !== prevDigit

  return (
    <div className={`relative ${sizeClasses[size]} perspective-500`}>
      {/* Background */}
      <div
        className="absolute inset-0 rounded"
        style={{
          background: 'linear-gradient(180deg, rgba(10,25,40,0.95) 0%, rgba(5,15,30,0.98) 50%, rgba(10,25,40,0.95) 100%)',
          border: `1px solid ${color}30`,
          boxShadow: `inset 0 1px 2px rgba(0,0,0,0.5), 0 0 10px ${color}20`,
        }}
      />

      {/* Middle line */}
      <div
        className="absolute left-0 right-0 top-1/2 h-[1px] z-10"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
        }}
      />

      {/* Static digit */}
      <div
        className="absolute inset-0 flex items-center justify-center font-mono font-bold"
        style={{
          color,
          textShadow: `0 0 10px ${color}60, 0 0 20px ${color}30`,
        }}
      >
        {digit}
      </div>

      {/* Flip animation */}
      <AnimatePresence mode="popLayout">
        {hasChanged && (
          <motion.div
            key={digit}
            className="absolute inset-0 flex items-center justify-center font-mono font-bold rounded overflow-hidden"
            style={{
              color,
              textShadow: `0 0 10px ${color}60, 0 0 20px ${color}30`,
              backfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
            }}
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: 90, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {digit}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glow on change */}
      <AnimatePresence>
        {hasChanged && (
          <motion.div
            className="absolute inset-0 rounded pointer-events-none"
            style={{
              boxShadow: `0 0 20px ${color}60`,
            }}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TimeUnitDisplay({
  unit,
  prevValue,
  format,
  showLabels,
  isLast,
  urgency,
}: {
  unit: TimeUnit
  prevValue: number
  format: 'full' | 'compact' | 'minimal'
  showLabels: boolean
  isLast: boolean
  urgency: number
}) {
  const [prevDigits, setPrevDigits] = useState<string[]>([])
  const digits = String(unit.value).padStart(2, '0').split('')

  useEffect(() => {
    setPrevDigits(String(prevValue).padStart(2, '0').split(''))
  }, [prevValue])

  const color = urgency > 0.8 ? '#ef4444' : urgency > 0.5 ? '#f59e0b' : '#00ffff'
  const size = format === 'minimal' ? 'sm' : format === 'compact' ? 'md' : 'lg'

  return (
    <div className="flex items-center gap-1">
      <div className="flex flex-col items-center">
        <div className="flex gap-0.5">
          {digits.map((digit, idx) => (
            <FlipDigit
              key={idx}
              digit={digit}
              prevDigit={prevDigits[idx] || '0'}
              color={color}
              size={size}
            />
          ))}
        </div>

        {showLabels && (
          <motion.span
            className="mt-1 text-xs font-medium uppercase tracking-wider"
            style={{
              color: 'rgba(150,200,230,0.6)',
            }}
            animate={{
              color: urgency > 0.8 ? 'rgba(239,68,68,0.8)' : 'rgba(150,200,230,0.6)',
            }}
          >
            {format === 'full' ? unit.label : unit.shortLabel}
          </motion.span>
        )}
      </div>

      {!isLast && (
        <motion.div
          className="flex flex-col gap-1 px-1"
          animate={{
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: color,
              boxShadow: `0 0 6px ${color}`,
            }}
          />
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: color,
              boxShadow: `0 0 6px ${color}`,
            }}
          />
        </motion.div>
      )}
    </div>
  )
}

export function HoloCountdownAdvanced({
  targetDate,
  endTime,
  onComplete,
  format,
  variant,
  size = 'md',
  showLabels = true,
}: HoloCountdownProps) {
  // Support both targetDate and endTime props
  const effectiveTargetDate = targetDate || endTime || new Date()
  // Support both format and variant props
  const effectiveFormat = format || variant || 'full'
  const [timeLeft, setTimeLeft] = useState<TimeUnit[]>(() => calculateTimeLeft(effectiveTargetDate))
  const [prevTimeLeft, setPrevTimeLeft] = useState<TimeUnit[]>(() => calculateTimeLeft(effectiveTargetDate))
  const [isComplete, setIsComplete] = useState(false)

  const updateTimeLeft = useCallback(() => {
    const newTimeLeft = calculateTimeLeft(effectiveTargetDate)
    setPrevTimeLeft(timeLeft)
    setTimeLeft(newTimeLeft)

    const totalSeconds = newTimeLeft.reduce(
      (acc, unit, idx) =>
        acc + unit.value * [86400, 3600, 60, 1][idx],
      0
    )

    if (totalSeconds <= 0 && !isComplete) {
      setIsComplete(true)
      onComplete?.()
    }
  }, [effectiveTargetDate, timeLeft, isComplete, onComplete])

  useEffect(() => {
    const interval = setInterval(updateTimeLeft, 1000)
    return () => clearInterval(interval)
  }, [updateTimeLeft])

  const urgency = useMemo(() => {
    const totalSeconds = timeLeft.reduce(
      (acc, unit, idx) =>
        acc + unit.value * [86400, 3600, 60, 1][idx],
      0
    )
    // Urgency increases as we get closer to 0
    if (totalSeconds <= 60) return 1
    if (totalSeconds <= 300) return 0.8
    if (totalSeconds <= 3600) return 0.5
    return 0
  }, [timeLeft])

  const displayUnits = useMemo(() => {
    if (effectiveFormat === 'minimal') {
      // Only show hours, minutes, seconds
      return timeLeft.slice(1)
    }
    if (effectiveFormat === 'compact') {
      // Skip days if 0
      const startIdx = timeLeft[0].value === 0 ? 1 : 0
      return timeLeft.slice(startIdx)
    }
    return timeLeft
  }, [timeLeft, effectiveFormat])

  const prevDisplayUnits = useMemo(() => {
    if (effectiveFormat === 'minimal') {
      return prevTimeLeft.slice(1)
    }
    if (effectiveFormat === 'compact') {
      const startIdx = prevTimeLeft[0].value === 0 ? 1 : 0
      return prevTimeLeft.slice(startIdx)
    }
    return prevTimeLeft
  }, [prevTimeLeft, effectiveFormat])

  const baseColor = urgency > 0.8 ? '#ef4444' : urgency > 0.5 ? '#f59e0b' : '#00ffff'

  return (
    <div className="relative inline-block">
      {/* Glow background */}
      <motion.div
        className="absolute inset-0 rounded-lg blur-xl pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${baseColor}20, transparent 70%)`,
        }}
        animate={{
          opacity: urgency > 0.5 ? [0.3, 0.6, 0.3] : 0.3,
        }}
        transition={{
          duration: urgency > 0.8 ? 0.5 : 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Main container */}
      <div
        className="relative rounded-lg overflow-hidden p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(10, 25, 40, 0.9), rgba(5, 15, 30, 0.95))',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${baseColor}30`,
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
              ${baseColor}10 2px,
              ${baseColor}10 4px
            )`,
          }}
        />

        {/* Time display */}
        <div className="relative flex items-center justify-center gap-2">
          {isComplete ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-xl font-bold"
              style={{
                color: '#22c55e',
                textShadow: '0 0 20px rgba(34,197,94,0.5)',
              }}
            >
              COMPLETE
            </motion.div>
          ) : (
            displayUnits.map((unit, idx) => (
              <TimeUnitDisplay
                key={unit.label}
                unit={unit}
                prevValue={prevDisplayUnits[idx]?.value ?? 0}
                format={effectiveFormat}
                showLabels={showLabels}
                isLast={idx === displayUnits.length - 1}
                urgency={urgency}
              />
            ))
          )}
        </div>

        {/* Urgency warning effect */}
        <AnimatePresence>
          {urgency > 0.8 && !isComplete && (
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-lg"
              style={{
                border: '2px solid #ef4444',
                boxShadow: 'inset 0 0 20px rgba(239,68,68,0.2)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </AnimatePresence>

        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-3 h-3 pointer-events-none">
          <div
            className="absolute top-0 left-0 w-full h-[1px]"
            style={{ background: `linear-gradient(90deg, ${baseColor}, transparent)` }}
          />
          <div
            className="absolute top-0 left-0 w-[1px] h-full"
            style={{ background: `linear-gradient(180deg, ${baseColor}, transparent)` }}
          />
        </div>
        <div className="absolute top-0 right-0 w-3 h-3 pointer-events-none">
          <div
            className="absolute top-0 right-0 w-full h-[1px]"
            style={{ background: `linear-gradient(270deg, ${baseColor}, transparent)` }}
          />
          <div
            className="absolute top-0 right-0 w-[1px] h-full"
            style={{ background: `linear-gradient(180deg, ${baseColor}, transparent)` }}
          />
        </div>
        <div className="absolute bottom-0 left-0 w-3 h-3 pointer-events-none">
          <div
            className="absolute bottom-0 left-0 w-full h-[1px]"
            style={{ background: `linear-gradient(90deg, ${baseColor}, transparent)` }}
          />
          <div
            className="absolute bottom-0 left-0 w-[1px] h-full"
            style={{ background: `linear-gradient(0deg, ${baseColor}, transparent)` }}
          />
        </div>
        <div className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none">
          <div
            className="absolute bottom-0 right-0 w-full h-[1px]"
            style={{ background: `linear-gradient(270deg, ${baseColor}, transparent)` }}
          />
          <div
            className="absolute bottom-0 right-0 w-[1px] h-full"
            style={{ background: `linear-gradient(0deg, ${baseColor}, transparent)` }}
          />
        </div>
      </div>
    </div>
  )
}

export default HoloCountdownAdvanced
