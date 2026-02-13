'use client'

import { useGameStore } from '@/stores/gameStore'
import { formatNumber } from '@/game/formulas'

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
      icon: '⚙️',
    },
    {
      name: 'Crystal',
      value: currentPlanet.crystal,
      max: currentPlanet.crystal_max,
      perHour: currentPlanet.crystal_per_hour,
      colorClass: 'resource-crystal',
      icon: '💎',
    },
    {
      name: 'Deuterium',
      value: currentPlanet.deuterium,
      max: currentPlanet.deuterium_max,
      perHour: currentPlanet.deuterium_per_hour,
      colorClass: 'resource-deuterium',
      icon: '🧪',
    },
    {
      name: 'Energy',
      value: currentPlanet.energy_max - currentPlanet.energy_used,
      max: currentPlanet.energy_max,
      perHour: null,
      colorClass: currentPlanet.energy_used <= currentPlanet.energy_max ? 'resource-energy' : 'text-ogame-negative',
      icon: '⚡',
    },
  ]

  return (
    <div className="bg-ogame-panel border-b border-ogame-border">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Resources */}
        <div className="flex items-center gap-6">
          {resources.map((resource) => (
            <div key={resource.name} className="flex items-center gap-2">
              <span className="text-lg">{resource.icon}</span>
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
            <span className="text-lg">🔮</span>
            <span className="font-mono resource-dark-matter">
              {formatNumber(user.dark_matter)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
