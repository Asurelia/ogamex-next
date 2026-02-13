'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

const menuItems = [
  { href: '/game/overview', key: 'overview' },
  { href: '/game/resources', key: 'resources' },
  { href: '/game/facilities', key: 'facilities' },
  { href: '/game/research', key: 'research' },
  { href: '/game/shipyard', key: 'shipyard' },
  { href: '/game/defense', key: 'defense' },
  { href: '/game/fleet', key: 'fleet' },
  { href: '/game/galaxy', key: 'galaxy' },
  { href: '/game/messages', key: 'messages' },
  { href: '/game/alliance', key: 'alliance' },
  { href: '/game/highscore', key: 'highscore' },
]

function getPlanetImage(planetType: string = 'normal', position: number = 1): string {
  const types = ['desert', 'dry', 'gas', 'ice', 'jungle', 'normal', 'water']
  const type = types.includes(planetType) ? planetType : 'normal'
  // Use position to generate a consistent variant (1-10)
  const variant = ((position - 1) % 10) + 1
  return `/img/planets/medium/${type}_${variant}.png`
}

export function Sidebar() {
  const pathname = usePathname()
  const { planets, currentPlanet, selectPlanet, isSidebarOpen } = useGameStore()
  const t = useTranslations('nav')
  const tOverview = useTranslations('overview')

  if (!isSidebarOpen) return null

  return (
    <aside className="w-52 bg-ogame-panel border-r border-ogame-border flex flex-col">
      {/* Planet selector */}
      <div className="p-3 border-b border-ogame-border">
        <select
          value={currentPlanet?.id || ''}
          onChange={(e) => selectPlanet(e.target.value)}
          className="ogame-input w-full text-sm"
        >
          {planets.map((planet) => (
            <option key={planet.id} value={planet.id}>
              {planet.name} [{planet.galaxy}:{planet.system}:{planet.position}]
            </option>
          ))}
        </select>
      </div>

      {/* Planet info */}
      {currentPlanet && (
        <div className="p-3 border-b border-ogame-border">
          <div className="text-center">
            {/* Planet image */}
            <div className="w-20 h-20 mx-auto mb-2 rounded-full overflow-hidden">
              <img
                src={getPlanetImage(currentPlanet.planet_type, currentPlanet.position)}
                alt={currentPlanet.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-ogame-text-header font-semibold">
              {currentPlanet.name}
            </h3>
            <p className="text-ogame-text-muted text-xs">
              [{currentPlanet.galaxy}:{currentPlanet.system}:{currentPlanet.position}]
            </p>
            <p className="text-ogame-text-muted text-xs mt-1">
              {tOverview('fields')}: {currentPlanet.fields_used}/{currentPlanet.fields_max}
            </p>
            <p className="text-ogame-text-muted text-xs">
              {tOverview('temperature')}: {currentPlanet.temp_min}°C - {currentPlanet.temp_max}°C
            </p>
          </div>
        </div>
      )}

      {/* Navigation menu */}
      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-2 text-sm transition-colors
                ${isActive
                  ? 'bg-ogame-accent/10 text-ogame-accent border-r-2 border-ogame-accent'
                  : 'text-ogame-text-muted hover:bg-ogame-border/50 hover:text-ogame-text'
                }
              `}
            >
              <span>{t(item.key)}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer links */}
      <div className="p-3 border-t border-ogame-border text-xs">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Link href="/game/settings" className="text-ogame-text-muted hover:text-ogame-accent">
              {t('settings')}
            </Link>
            <LanguageSwitcher />
          </div>
          <Link href="/api-docs" className="text-ogame-text-muted hover:text-ogame-accent">
            {t('apiDocs')}
          </Link>
        </div>
      </div>
    </aside>
  )
}
