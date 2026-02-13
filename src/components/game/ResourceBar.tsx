'use client'

import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/game/formulas'

function getResourceIcon(name: string): string {
  const icons: Record<string, string> = {
    Metal: '/img/objects/buildings/metal_mine_micro.jpg',
    Crystal: '/img/objects/buildings/crystal_mine_micro.jpg',
    Deuterium: '/img/objects/buildings/deuterium_synthesizer_micro.jpg',
    Energy: '/img/objects/buildings/solar_plant_micro.jpg',
    DarkMatter: '/img/objects/buildings/alliance_depot_micro.jpg',
  }
  return icons[name] || icons.Metal
}

export function ResourceBar() {
  const { currentPlanet, user } = useGameStore()

  if (!currentPlanet) return null

  const resources = [
    {
      name: 'Metal',
      value: currentPlanet.metal,
      max: currentPlanet.metal_max,
      perHour: currentPlanet.metal_per_hour,
      colorClass: 'resource-metal',
    },
    {
      name: 'Crystal',
      value: currentPlanet.crystal,
      max: currentPlanet.crystal_max,
      perHour: currentPlanet.crystal_per_hour,
      colorClass: 'resource-crystal',
    },
    {
      name: 'Deuterium',
      value: currentPlanet.deuterium,
      max: currentPlanet.deuterium_max,
      perHour: currentPlanet.deuterium_per_hour,
      colorClass: 'resource-deuterium',
    },
    {
      name: 'Energy',
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
            <div key={resource.name} className="flex items-center gap-2">
              <img
                src={getResourceIcon(resource.name)}
                alt={resource.name}
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
          <div className="flex items-center gap-2">
            <img
              src={getResourceIcon('DarkMatter')}
              alt="Dark Matter"
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
