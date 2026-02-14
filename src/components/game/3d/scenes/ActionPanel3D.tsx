'use client'

import { useState, useEffect, useCallback } from 'react'
import { Html } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import type { ResourceCost, ProductionRate } from './types'
import { formatNumber, formatTimeRemaining } from '@/lib/utils/format'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Legacy upgrade cost interface (kept for compatibility)
 */
export interface UpgradeCost {
  metal: number
  crystal: number
  deuterium: number
  time: string
}

/**
 * New ActionPanel3D interface matching the specification
 */
export interface ActionPanel3DProps {
  /** Building/structure title */
  title: string
  /** Current level */
  level: number
  /** Maximum level (optional) */
  maxLevel?: number
  /** Resource cost for upgrade */
  cost: ResourceCost
  /** Production rates per hour */
  productionPerHour?: ProductionRate
  /** Build time as formatted string */
  buildTime: string
  /** Whether player can afford the upgrade */
  canAfford: boolean
  /** Whether currently building/upgrading */
  isBuilding: boolean
  /** Build progress percentage (0-100) */
  buildProgress?: number
  /** Callback when upgrade button is clicked */
  onUpgrade: () => void
  /** Callback when cancel button is clicked (during build) */
  onCancel?: () => void
  /** 3D position for the panel */
  position: [number, number, number]
  /** Panel visibility (defaults to true if using position) */
  isOpen?: boolean
  /** Callback to close panel */
  onClose?: () => void
  /** Description text */
  description?: string
  /** Building end time (for countdown display) */
  buildingEndsAt?: Date
  /** Is this an energy producer */
  isEnergyProducer?: boolean
  /** Energy consumption value */
  energyConsumption?: number
}

// ============================================================================
// HELPERS (formatNumber and formatTimeRemaining imported from @/lib/utils/format)
// ============================================================================

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ActionPanel3D - Floating 3D action panel for building interactions
 *
 * Displays building info, production stats, upgrade costs, and action buttons
 * in a glassmorphic floating panel attached to 3D objects.
 *
 * Features:
 * - Holographic glassmorphism style
 * - Animated appearance on object click
 * - Real-time countdown for builds in progress
 * - Resource cost display with affordability highlighting
 * - Production rates display
 * - Cancel build option
 */
export function ActionPanel3D({
  title,
  level,
  maxLevel,
  cost,
  productionPerHour,
  buildTime,
  canAfford,
  isBuilding,
  buildProgress = 0,
  onUpgrade,
  onCancel,
  position,
  isOpen = true,
  onClose,
  description,
  buildingEndsAt,
  isEnergyProducer = false,
  energyConsumption,
}: ActionPanel3DProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  // Update countdown timer
  useEffect(() => {
    if (!isBuilding || !buildingEndsAt) return

    const updateTimer = () => {
      setTimeRemaining(formatTimeRemaining(buildingEndsAt))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isBuilding, buildingEndsAt])

  // Check if at max level
  const atMaxLevel = maxLevel !== undefined && level >= maxLevel

  // Determine if upgrade is possible
  const canUpgrade = canAfford && !isBuilding && !atMaxLevel

  return (
    <Html position={position} center distanceFactor={25} style={{ pointerEvents: isOpen ? 'auto' : 'none' }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-80 select-none"
          >
            {/* Glassmorphic panel */}
            <div className="relative bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl shadow-cyan-500/20">
              {/* Header glow effect */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/80 hover:bg-red-500/50 border border-slate-600 hover:border-red-400 transition-all duration-200 z-10"
              >
                <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Content */}
              <div className="p-5">
                {/* Title and level */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-cyan-300">{title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-slate-400">Level</span>
                    <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/40 rounded text-cyan-300 font-mono font-bold">
                      {level}
                    </span>
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/40 rounded text-green-300 font-mono font-bold">
                      {level + 1}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {description && (
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">{description}</p>
                )}

                {/* Production stats */}
                {productionPerHour && (productionPerHour.metal || productionPerHour.crystal || productionPerHour.deuterium || productionPerHour.energy) && (
                  <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Production per Hour</div>
                    <div className="space-y-1.5">
                      {productionPerHour.metal && productionPerHour.metal > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">Metal</span>
                          <span className="font-mono font-bold text-slate-200">+{formatNumber(productionPerHour.metal)}/h</span>
                        </div>
                      )}
                      {productionPerHour.crystal && productionPerHour.crystal > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">Crystal</span>
                          <span className="font-mono font-bold text-cyan-300">+{formatNumber(productionPerHour.crystal)}/h</span>
                        </div>
                      )}
                      {productionPerHour.deuterium && productionPerHour.deuterium > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">Deuterium</span>
                          <span className="font-mono font-bold text-green-300">+{formatNumber(productionPerHour.deuterium)}/h</span>
                        </div>
                      )}
                      {productionPerHour.energy && productionPerHour.energy > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">Energy</span>
                          <span className="font-mono font-bold text-yellow-400">+{formatNumber(productionPerHour.energy)}</span>
                        </div>
                      )}
                    </div>
                    {energyConsumption !== undefined && energyConsumption > 0 && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
                        <span className="text-sm text-slate-400">Energy Consumption</span>
                        <span className="font-mono font-bold text-red-400">-{formatNumber(energyConsumption)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Upgrade costs */}
                <div className="mb-4">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Upgrade Cost</div>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Metal */}
                    <div className={`p-2 rounded-lg border ${canAfford || cost.metal === 0 ? 'bg-slate-800/50 border-slate-700/50' : 'bg-red-900/20 border-red-500/30'}`}>
                      <div className="text-xs text-slate-500 mb-1">Metal</div>
                      <div className={`font-mono text-sm font-bold ${canAfford || cost.metal === 0 ? 'text-slate-200' : 'text-red-400'}`}>
                        {formatNumber(cost.metal)}
                      </div>
                    </div>
                    {/* Crystal */}
                    <div className={`p-2 rounded-lg border ${canAfford || cost.crystal === 0 ? 'bg-slate-800/50 border-slate-700/50' : 'bg-red-900/20 border-red-500/30'}`}>
                      <div className="text-xs text-slate-500 mb-1">Crystal</div>
                      <div className={`font-mono text-sm font-bold ${canAfford || cost.crystal === 0 ? 'text-cyan-300' : 'text-red-400'}`}>
                        {formatNumber(cost.crystal)}
                      </div>
                    </div>
                    {/* Deuterium */}
                    <div className={`p-2 rounded-lg border ${canAfford || cost.deuterium === 0 ? 'bg-slate-800/50 border-slate-700/50' : 'bg-red-900/20 border-red-500/30'}`}>
                      <div className="text-xs text-slate-500 mb-1">Deuterium</div>
                      <div className={`font-mono text-sm font-bold ${canAfford || cost.deuterium === 0 ? 'text-green-300' : 'text-red-400'}`}>
                        {formatNumber(cost.deuterium)}
                      </div>
                    </div>
                  </div>
                  {/* Energy cost if present */}
                  {cost.energy !== undefined && cost.energy > 0 && (
                    <div className={`mt-2 p-2 rounded-lg border ${canAfford ? 'bg-slate-800/50 border-slate-700/50' : 'bg-red-900/20 border-red-500/30'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Energy Required</span>
                        <span className={`font-mono text-sm font-bold ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
                          {formatNumber(cost.energy)}
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Build time */}
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Build time: <span className="text-cyan-300 font-mono">{buildTime}</span></span>
                  </div>
                </div>

                {/* Building in progress */}
                {isBuilding && (
                  <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                        <span className="text-sm text-yellow-300 font-medium">Building in progress</span>
                      </div>
                      {buildProgress > 0 && (
                        <span className="text-xs text-yellow-400 font-mono">{Math.round(buildProgress)}%</span>
                      )}
                    </div>
                    {/* Progress bar */}
                    {buildProgress > 0 && (
                      <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden mb-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${buildProgress}%` }}
                          className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                        />
                      </div>
                    )}
                    {/* Countdown */}
                    {buildingEndsAt && (
                      <div className="text-center">
                        <span className="text-2xl font-mono font-bold text-yellow-400">{timeRemaining}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-2">
                  {/* Cancel button (during build) */}
                  {isBuilding && onCancel && (
                    <button
                      onClick={onCancel}
                      className="
                        w-full py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider
                        bg-red-500/20 border border-red-500/40 text-red-300
                        hover:bg-red-500/30 hover:border-red-400/60 hover:text-red-200
                        transition-all duration-300
                      "
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel Build
                      </span>
                    </button>
                  )}

                  {/* Upgrade button */}
                  <button
                    onClick={onUpgrade}
                    disabled={!canUpgrade}
                    className={`
                      w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider
                      transition-all duration-300 relative overflow-hidden
                      ${canUpgrade
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/50'
                        : 'bg-slate-700/50 text-slate-500 cursor-not-allowed border border-slate-600/50'
                      }
                    `}
                  >
                    {isBuilding ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Building...
                      </span>
                    ) : atMaxLevel ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Max Level Reached
                      </span>
                    ) : canAfford ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        Upgrade to Level {level + 1}
                      </span>
                    ) : (
                      'Insufficient Resources'
                    )}
                  </button>
                </div>
              </div>

              {/* Bottom decoration */}
              <div className="h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 opacity-50" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Html>
  )
}

export default ActionPanel3D
