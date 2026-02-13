'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useGameStore } from '@/stores/gameStore'

const menuItems = [
  { href: '/game/overview', label: 'Overview', icon: '🏠' },
  { href: '/game/resources', label: 'Resources', icon: '⛏️' },
  { href: '/game/facilities', label: 'Facilities', icon: '🏭' },
  { href: '/game/research', label: 'Research', icon: '🔬' },
  { href: '/game/shipyard', label: 'Shipyard', icon: '🚀' },
  { href: '/game/defense', label: 'Defense', icon: '🛡️' },
  { href: '/game/fleet', label: 'Fleet', icon: '🛸' },
  { href: '/game/galaxy', label: 'Galaxy', icon: '🌌' },
  { href: '/game/messages', label: 'Messages', icon: '✉️' },
  { href: '/game/alliance', label: 'Alliance', icon: '🤝' },
  { href: '/game/highscore', label: 'Highscore', icon: '🏆' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { planets, currentPlanet, selectPlanet, isSidebarOpen } = useGameStore()

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
            {/* Planet image placeholder */}
            <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center">
              <span className="text-3xl">🌍</span>
            </div>
            <h3 className="text-ogame-text-header font-semibold">
              {currentPlanet.name}
            </h3>
            <p className="text-ogame-text-muted text-xs">
              [{currentPlanet.galaxy}:{currentPlanet.system}:{currentPlanet.position}]
            </p>
            <p className="text-ogame-text-muted text-xs mt-1">
              Fields: {currentPlanet.fields_used}/{currentPlanet.fields_max}
            </p>
            <p className="text-ogame-text-muted text-xs">
              Temp: {currentPlanet.temp_min}°C to {currentPlanet.temp_max}°C
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
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer links */}
      <div className="p-3 border-t border-ogame-border text-xs">
        <div className="flex flex-col gap-1">
          <Link href="/game/settings" className="text-ogame-text-muted hover:text-ogame-accent">
            Settings
          </Link>
          <Link href="/api-docs" className="text-ogame-text-muted hover:text-ogame-accent">
            API Documentation
          </Link>
        </div>
      </div>
    </aside>
  )
}
