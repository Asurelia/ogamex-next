'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { HoloModal } from '@/components/ui/holographic/HoloModal'
import { HoloButton } from '@/components/ui/holographic/HoloButton'
import { useGameStore } from '@/stores/gameStore'
import { useToastContext } from '@/components/ui/toast/ToastContext'
import type { BoostType } from '@/types/database'

interface BoostOption {
  type: BoostType
  icon: string
  multiplier: number
  duration: number // minutes
  cost: number
  color: string
  glowColor: string
}

const BOOST_OPTIONS: BoostOption[] = [
  {
    type: 'production',
    icon: '⛏️',
    multiplier: 1.5,
    duration: 60,
    cost: 20,
    color: '#00ff88',
    glowColor: 'rgba(0, 255, 136, 0.5)',
  },
  {
    type: 'construction',
    icon: '🏗️',
    multiplier: 1.25,
    duration: 30,
    cost: 15,
    color: '#ffaa00',
    glowColor: 'rgba(255, 170, 0, 0.5)',
  },
  {
    type: 'research',
    icon: '🔬',
    multiplier: 1.25,
    duration: 30,
    cost: 15,
    color: '#aa88ff',
    glowColor: 'rgba(170, 136, 255, 0.5)',
  },
  {
    type: 'expedition',
    icon: '🚀',
    multiplier: 1.5,
    duration: 120,
    cost: 25,
    color: '#00ccff',
    glowColor: 'rgba(0, 204, 255, 0.5)',
  },
  {
    type: 'attack',
    icon: '⚔️',
    multiplier: 1.2,
    duration: 30,
    cost: 30,
    color: '#ff4444',
    glowColor: 'rgba(255, 68, 68, 0.5)',
  },
]

interface BoostMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function BoostMenu({ isOpen, onClose }: BoostMenuProps) {
  const t = useTranslations('boost')
  const { user, getBoostEnergy, activeBoosts, setActiveBoosts } = useGameStore()
  const toast = useToastContext()
  const [currentEnergy, setCurrentEnergy] = useState(0)
  const [activating, setActivating] = useState<BoostType | null>(null)

  // Update energy display
  useEffect(() => {
    if (isOpen) {
      setCurrentEnergy(getBoostEnergy())
      const interval = setInterval(() => {
        setCurrentEnergy(getBoostEnergy())
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isOpen, getBoostEnergy])

  // Check if a boost type is already active
  const isBoostActive = (type: BoostType): boolean => {
    const now = new Date()
    return activeBoosts.some(
      (b) => b.boost_type === type && new Date(b.ends_at) > now
    )
  }

  // Get remaining time for an active boost
  const getBoostRemainingTime = (type: BoostType): string => {
    const now = new Date()
    const boost = activeBoosts.find(
      (b) => b.boost_type === type && new Date(b.ends_at) > now
    )
    if (!boost) return ''

    const remaining = Math.max(0, new Date(boost.ends_at).getTime() - now.getTime())
    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  // Activate a boost
  const activateBoost = async (option: BoostOption) => {
    if (!user) return

    // Check if enough energy
    if (currentEnergy < option.cost) {
      toast.error(
        t('notEnoughEnergy'),
        t('notEnoughEnergyDesc', { cost: option.cost, current: currentEnergy })
      )
      return
    }

    // Check if already active
    if (isBoostActive(option.type)) {
      toast.warning(
        t('alreadyActive'),
        t('alreadyActiveDesc', { type: t(`types.${option.type}`) })
      )
      return
    }

    setActivating(option.type)

    try {
      const response = await fetch('/api/v1/boosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boost_type: option.type,
          multiplier: option.multiplier,
          duration_minutes: option.duration,
          energy_cost: option.cost,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate boost')
      }

      // Update active boosts
      setActiveBoosts([...activeBoosts, data.boost])

      // Update user's boost energy locally
      setCurrentEnergy((prev) => Math.max(0, prev - option.cost))

      toast.success(
        t('boostActivated'),
        t('boostActivatedDesc', {
          type: t(`types.${option.type}`),
          multiplier: Math.round((option.multiplier - 1) * 100),
          duration: option.duration,
        })
      )
    } catch (error) {
      console.error('Failed to activate boost:', error)
      toast.error(
        t('activationFailed'),
        error instanceof Error ? error.message : t('activationFailedDesc')
      )
    } finally {
      setActivating(null)
    }
  }

  if (!user) return null

  const maxEnergy = user.boost_energy_max || 100

  return (
    <HoloModal isOpen={isOpen} onClose={onClose} title={t('title')} size="lg">
      <div className="space-y-6">
        {/* Current Energy Display */}
        <div className="flex items-center justify-between p-4 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 255, 204, 0.1), rgba(0, 200, 255, 0.05))',
            border: '1px solid rgba(0, 255, 204, 0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="text-sm text-cyan-300">{t('currentEnergy')}</div>
              <div className="text-2xl font-bold" style={{ color: '#00ffcc' }}>
                {currentEnergy} <span className="text-sm text-gray-400">/ {maxEnergy}</span>
              </div>
            </div>
          </div>
          {/* Energy bar */}
          <div className="w-32">
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full"
                style={{
                  background: 'linear-gradient(90deg, #00ffcc, #00aaff)',
                  boxShadow: '0 0 10px rgba(0, 255, 204, 0.5)',
                }}
                animate={{ width: `${(currentEnergy / maxEnergy) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Boost Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BOOST_OPTIONS.map((option) => {
            const active = isBoostActive(option.type)
            const canAfford = currentEnergy >= option.cost
            const remainingTime = active ? getBoostRemainingTime(option.type) : ''

            return (
              <motion.div
                key={option.type}
                className="relative p-4 rounded-lg cursor-pointer transition-all"
                style={{
                  background: active
                    ? `linear-gradient(135deg, ${option.color}22, ${option.color}11)`
                    : 'linear-gradient(135deg, rgba(30, 40, 60, 0.8), rgba(20, 30, 50, 0.9))',
                  border: `1px solid ${active ? option.color : 'rgba(100, 120, 150, 0.3)'}`,
                  opacity: !active && !canAfford ? 0.5 : 1,
                }}
                whileHover={!active && canAfford ? { scale: 1.02, borderColor: option.color } : {}}
                whileTap={!active && canAfford ? { scale: 0.98 } : {}}
                onClick={() => !active && canAfford && activateBoost(option)}
              >
                {/* Active indicator */}
                {active && (
                  <motion.div
                    className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold"
                    style={{
                      background: `${option.color}33`,
                      color: option.color,
                      border: `1px solid ${option.color}`,
                    }}
                    animate={{ opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {t('active')} - {remainingTime}
                  </motion.div>
                )}

                {/* Loading indicator */}
                {activating === option.type && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <motion.div
                      className="w-8 h-8 border-2 border-t-transparent rounded-full"
                      style={{ borderColor: option.color }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className="text-3xl p-2 rounded-lg"
                    style={{
                      background: `${option.color}22`,
                      boxShadow: active ? `0 0 15px ${option.glowColor}` : 'none',
                    }}
                  >
                    {option.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">
                      {t(`types.${option.type}`)}
                    </h3>
                    <p className="text-sm text-gray-400 mb-2">
                      {t(`descriptions.${option.type}`)}
                    </p>

                    <div className="flex items-center gap-4 text-xs">
                      {/* Bonus */}
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">{t('bonus')}:</span>
                        <span style={{ color: option.color }}>
                          +{Math.round((option.multiplier - 1) * 100)}%
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">{t('duration')}:</span>
                        <span className="text-white">{option.duration}m</span>
                      </div>

                      {/* Cost */}
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">{t('cost')}:</span>
                        <span className={canAfford ? 'text-cyan-400' : 'text-red-400'}>
                          ⚡{option.cost}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activate button for non-active, affordable boosts */}
                {!active && canAfford && (
                  <div className="mt-3 flex justify-end">
                    <HoloButton
                      size="sm"
                      variant="primary"
                      onClick={() => activateBoost(option)}
                      disabled={activating === option.type}
                    >
                      {t('activate')}
                    </HoloButton>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Info text */}
        <p className="text-xs text-gray-500 text-center">
          {t('infoText')}
        </p>
      </div>
    </HoloModal>
  )
}

export default BoostMenu
