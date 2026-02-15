'use client'

import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/game/formulas'
import { HolographicTooltip } from '@/components/ui/HolographicTooltip'

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
  let statusText = t('energySurplus')

  if (!hasProduction) {
    statusColor = '#ff4444' // Red
    statusText = t('energyNoProduction')
  } else if (hasDeficit) {
    statusColor = '#ff4444' // Red
    statusText = t('energyDeficitWarning', { percent: efficiency })
  } else if (balance === 0) {
    statusColor = '#ffcc00' // Yellow - balanced
    statusText = t('energyBalance')
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
      ⚠️ {t('energyDeficitWarning', { percent: efficiency })}
    </div>
  ) : !hasProduction ? (
    <div className="text-xs text-cyan-300">
      💡 {t('energyBuildSolarPlant')}
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
              className="font-mono font-semibold"
              style={{ color: statusColor }}
            >
              {hasDeficit ? '⚡' : '⚡'}
              {balance >= 0 ? '+' : ''}{formatNumber(balance)}
            </span>

            {/* Production/Consumption mini display */}
            <span className="text-ogame-text-muted text-xs">
              ({formatNumber(energyMax)}/{formatNumber(energyUsed)})
            </span>
          </div>

          {/* Efficiency bar */}
          <div className="flex items-center gap-1">
            <div className="h-1 w-16 bg-gray-700 rounded-full overflow-hidden">
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

export function ResourceBar() {
  const { currentPlanet, user } = useGameStore()
  const t = useTranslations('resources')

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

          {/* Energy - Special display with tooltip */}
          <EnergyDisplay
            energyUsed={currentPlanet.energy_used}
            energyMax={currentPlanet.energy_max}
            t={t}
          />
        </div>

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
  )
}
