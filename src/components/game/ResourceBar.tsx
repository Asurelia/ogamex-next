'use client'

import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/game/formulas'

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
    {
      key: 'energy',
      value: currentPlanet.energy_max - currentPlanet.energy_used,
      max: currentPlanet.energy_max,
      perHour: null,
      colorClass: currentPlanet.energy_used <= currentPlanet.energy_max ? 'resource-energy' : 'text-ogame-negative',
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
