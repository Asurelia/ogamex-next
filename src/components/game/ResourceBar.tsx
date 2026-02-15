'use client'

import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/game/formulas'
import { HolographicTooltip } from '@/components/ui/HolographicTooltip'
import { BoostMenu } from '@/components/game/BoostMenu'
import { ActiveBoostsBar } from '@/components/game/ActiveBoostIndicator'
import { useEffect, useState } from 'react'

function getResourceIcon(key: string): string {
  const icons: Record<string, string> = {
    metal: '/img/objects/buildings/metal_mine_micro.jpg',
    crystal: '/img/objects/buildings/crystal_mine_micro.jpg',
    deuterium: '/img/objects/buildings/deuterium_synthesizer_micro.jpg',
    energy: '/img/objects/buildings/solar_plant_micro.jpg',
    darkMatter: '/img/objects/buildings/alliance_depot_micro.jpg',
  }
  return icons[key] || icons.metal
}

// Format time in HH:MM:SS or "Xh Ym"
function formatTime(seconds: number): string {
  if (seconds <= 0) return '0:00'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

interface EnergyDisplayProps {
  energyUsed: number
  energyMax: number
  t: (key: string, values?: Record<string, string | number>) => string
}

function EnergyDisplay({ energyUsed, energyMax, t }: EnergyDisplayProps) {
  const balance = energyMax - energyUsed
  const hasDeficit = balance < 0
  const hasProduction = energyMax > 0

  // Calculate efficiency percentage
  const efficiency = hasProduction
    ? Math.min(100, Math.round((energyMax / Math.max(energyUsed, 1)) * 100))
    : 0

  // Determine status and colors
  let statusColor = '#00ff00' // Green - surplus

  if (!hasProduction) {
    statusColor = '#ff4444' // Red
  } else if (hasDeficit) {
    statusColor = '#ff4444' // Red
  } else if (balance === 0) {
    statusColor = '#ffcc00' // Yellow - balanced
  }

  // Tooltip stats
  const tooltipStats = [
    {
      label: t('energyProduction'),
      value: `+${formatNumber(energyMax)}`,
      color: '#00ff00'
    },
    {
      label: t('energyConsumption'),
      value: `-${formatNumber(energyUsed)}`,
      color: energyUsed > 0 ? '#ff8800' : '#888888'
    },
    {
      label: t('energyAvailable'),
      value: `${balance >= 0 ? '+' : ''}${formatNumber(balance)}`,
      color: hasDeficit ? '#ff4444' : '#00ffcc'
    },
    {
      label: t('energyEfficiency'),
      value: `${efficiency}%`,
      color: efficiency >= 100 ? '#00ff00' : efficiency >= 50 ? '#ffcc00' : '#ff4444'
    },
  ]

  // Tooltip content
  const tooltipContent = hasDeficit ? (
    <div className="text-xs text-orange-300">
      {t('energyDeficitWarning', { percent: efficiency })}
    </div>
  ) : !hasProduction ? (
    <div className="text-xs text-cyan-300">
      {t('energyBuildSolarPlant')}
    </div>
  ) : undefined

  return (
    <HolographicTooltip
      title={t('energy')}
      content={tooltipContent}
      stats={tooltipStats}
      position="bottom"
    >
      <div className="flex items-center gap-2 cursor-help">
        <img
          src={getResourceIcon('energy')}
          alt={t('energy')}
          className="w-5 h-5 rounded-sm object-cover"
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            {/* Balance indicator with icon */}
            <span
              className="font-mono font-semibold text-sm"
              style={{ color: statusColor }}
            >
              {balance >= 0 ? '+' : ''}{formatNumber(balance)}
            </span>

            {/* Production/Consumption mini display */}
            <span className="text-ogame-text-muted text-xs">
              ({formatNumber(energyMax)}/{formatNumber(energyUsed)})
            </span>
          </div>

          {/* Efficiency bar */}
          <div className="flex items-center gap-1">
            <div className="h-1 w-12 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, efficiency)}%`,
                  backgroundColor: statusColor,
                  boxShadow: `0 0 4px ${statusColor}`
                }}
              />
            </div>
            <span className="text-[10px] text-ogame-text-muted">
              {efficiency}%
            </span>
          </div>
        </div>
      </div>
    </HolographicTooltip>
  )
}

interface BoostEnergyDisplayProps {
  t: (key: string, values?: Record<string, string | number>) => string
  onOpenBoostMenu: () => void
}

function BoostEnergyDisplay({ t, onOpenBoostMenu }: BoostEnergyDisplayProps) {
  const { user, getBoostEnergy, getBoostEnergyPercent, getTimeToFullEnergy } = useGameStore()
  const [currentEnergy, setCurrentEnergy] = useState(0)
  const [percent, setPercent] = useState(0)
  const [timeToFull, setTimeToFull] = useState(0)

  // Update energy display every second for smooth animation
  useEffect(() => {
    const updateEnergy = () => {
      setCurrentEnergy(getBoostEnergy())
      setPercent(getBoostEnergyPercent())
      setTimeToFull(getTimeToFullEnergy())
    }

    updateEnergy()
    const interval = setInterval(updateEnergy, 1000)
    return () => clearInterval(interval)
  }, [getBoostEnergy, getBoostEnergyPercent, getTimeToFullEnergy])

  if (!user) return null

  const maxEnergy = user.boost_energy_max || 100
  const regenRate = user.boost_energy_regen_rate || 8.33
  const isFull = currentEnergy >= maxEnergy

  // Determine color based on percentage
  let barColor = '#00ffcc' // Cyan - full/high
  if (percent < 25) {
    barColor = '#ff4444' // Red - low
  } else if (percent < 50) {
    barColor = '#ff8800' // Orange - medium-low
  } else if (percent < 75) {
    barColor = '#ffcc00' // Yellow - medium
  }

  // Tooltip stats
  const tooltipStats = [
    {
      label: t('boostCurrent'),
      value: `${currentEnergy}`,
      color: barColor
    },
    {
      label: t('boostMax'),
      value: `${maxEnergy}`,
      color: '#00ffcc'
    },
    {
      label: t('boostRegenRate'),
      value: `+${regenRate.toFixed(1)}${t('boostPerHour')}`,
      color: '#88ff88'
    },
  ]

  if (!isFull) {
    tooltipStats.push({
      label: t('boostTimeToFull'),
      value: formatTime(timeToFull),
      color: '#ffcc00'
    })
  }

  const tooltipContent = (
    <div className="text-xs text-cyan-300">
      {isFull ? t('boostFull') : t('boostUseHint')}
    </div>
  )

  return (
    <HolographicTooltip
      title={t('boostEnergy')}
      content={tooltipContent}
      stats={tooltipStats}
      position="bottom"
    >
      <div
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onOpenBoostMenu}
      >
        {/* Boost energy icon - lightning bolt */}
        <div
          className="w-5 h-5 rounded-sm flex items-center justify-center text-sm"
          style={{
            background: `linear-gradient(135deg, ${barColor}33, ${barColor}11)`,
            border: `1px solid ${barColor}66`
          }}
        >
          ⚡
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            {/* Current / Max */}
            <span
              className="font-mono font-semibold text-sm"
              style={{ color: barColor }}
            >
              {currentEnergy}
            </span>
            <span className="text-ogame-text-muted text-xs">
              / {maxEnergy}
            </span>
          </div>

          {/* Progress bar with glow */}
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-14 bg-gray-700 rounded-full overflow-hidden relative">
              <div
                className="h-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${percent}%`,
                  background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                  boxShadow: `0 0 6px ${barColor}, 0 0 2px ${barColor}`
                }}
              />
              {/* Animated glow effect when not full */}
              {!isFull && (
                <div
                  className="absolute top-0 right-0 h-full w-2 animate-pulse"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${barColor}66)`,
                  }}
                />
              )}
            </div>
            {/* Time to full or "FULL" indicator */}
            <span className="text-[10px] text-ogame-text-muted min-w-[32px]">
              {isFull ? (
                <span style={{ color: '#00ff00' }}>MAX</span>
              ) : (
                formatTime(timeToFull)
              )}
            </span>
          </div>
        </div>
      </div>
    </HolographicTooltip>
  )
}

export function ResourceBar() {
  const { currentPlanet, user } = useGameStore()
  const t = useTranslations('resources')
  const [isBoostMenuOpen, setIsBoostMenuOpen] = useState(false)

  if (!currentPlanet) return null

  const resources = [
    {
      key: 'metal',
      value: currentPlanet.metal,
      max: currentPlanet.metal_max,
      perHour: currentPlanet.metal_per_hour,
      colorClass: 'resource-metal',
    },
    {
      key: 'crystal',
      value: currentPlanet.crystal,
      max: currentPlanet.crystal_max,
      perHour: currentPlanet.crystal_per_hour,
      colorClass: 'resource-crystal',
    },
    {
      key: 'deuterium',
      value: currentPlanet.deuterium,
      max: currentPlanet.deuterium_max,
      perHour: currentPlanet.deuterium_per_hour,
      colorClass: 'resource-deuterium',
    },
  ]

  return (
    <>
      <div className="bg-ogame-panel border-b border-ogame-border">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Resources */}
          <div className="flex items-center gap-6">
            {resources.map((resource) => (
              <div key={resource.key} className="flex items-center gap-2" title={t(resource.key)}>
                <img
                  src={getResourceIcon(resource.key)}
                  alt={t(resource.key)}
                  className="w-5 h-5 rounded-sm object-cover"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className={`font-mono ${resource.colorClass}`}>
                      {formatNumber(Math.floor(resource.value))}
                    </span>
                    {resource.max && (
                      <span className="text-ogame-text-muted text-xs">
                        / {formatNumber(resource.max)}
                      </span>
                    )}
                  </div>
                  {resource.perHour !== null && (
                    <span className="text-xs text-ogame-text-muted">
                      +{formatNumber(resource.perHour)}/h
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Separator */}
            <div className="h-8 w-px bg-ogame-border" />

            {/* Energy (OGame style - production/consumption) */}
            <EnergyDisplay
              energyUsed={currentPlanet.energy_used}
              energyMax={currentPlanet.energy_max}
              t={t}
            />

            {/* Separator */}
            <div className="h-8 w-px bg-ogame-border" />

            {/* Boost Energy (new regenerating resource) */}
            <BoostEnergyDisplay
              t={t}
              onOpenBoostMenu={() => setIsBoostMenuOpen(true)}
            />
          </div>

          {/* Active Boosts Indicator */}
          <ActiveBoostsBar />

          {/* Dark Matter */}
          {user && (
            <div className="flex items-center gap-2" title={t('darkMatter')}>
              <img
                src={getResourceIcon('darkMatter')}
                alt={t('darkMatter')}
                className="w-5 h-5 rounded-sm object-cover"
              />
              <span className="font-mono resource-dark-matter">
                {formatNumber(user.dark_matter)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Boost Menu Modal */}
      <BoostMenu
        isOpen={isBoostMenuOpen}
        onClose={() => setIsBoostMenuOpen(false)}
      />
    </>
  )
}
