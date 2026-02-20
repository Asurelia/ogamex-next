'use client'

/**
 * Neocom Sidebar
 *
 * Vertical icon rail on the left side of the screen (48px wide).
 * EVE Online-inspired navigation bar with tooltips and notification badges.
 */

import { memo, useCallback, useMemo } from 'react'
import { useWindowManager } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'
import { NeocomIcon } from './NeocomIcon'
import { PHOTON_COLORS, PHOTON_EFFECTS } from '../photon/photon-theme'

// ============================================================================
// NEOCOM ITEMS
// ============================================================================

interface NeocomItem {
  id: string
  windowId: string
  icon: string
  label: string
  getBadge?: () => number
}

const NEOCOM_ITEMS: NeocomItem[] = [
  { id: 'character', windowId: 'rt-fitting', icon: '👤', label: 'Character' },
  { id: 'overview', windowId: 'rt-overview', icon: '📡', label: 'Overview' },
  { id: 'starmap', windowId: 'rt-starmap', icon: '🗺️', label: 'Starmap' },
  { id: 'market', windowId: 'rt-market', icon: '💰', label: 'Market' },
  { id: 'fitting', windowId: 'rt-fitting', icon: '🔧', label: 'Fitting' },
  { id: 'fleet', windowId: 'rt-fleet', icon: '👥', label: 'Fleet' },
  { id: 'skills', windowId: 'rt-skills', icon: '📖', label: 'Skills' },
  { id: 'chat', windowId: 'rt-chat', icon: '💬', label: 'Chat' },
  { id: 'route', windowId: 'rt-route', icon: '🧭', label: 'Route' },
  { id: 'corp', windowId: 'rt-corp', icon: '🏢', label: 'Corporation' },
  { id: 'clones', windowId: 'rt-clones', icon: '🧬', label: 'Clones' },
  { id: 'implants', windowId: 'rt-implants', icon: '🧠', label: 'Implants' },
  { id: 'industry', windowId: 'rt-industry', icon: '🏭', label: 'Industry' },
  { id: 'pi', windowId: 'rt-pi', icon: '🌍', label: 'Planets' },
  { id: 'scanner', windowId: 'rt-scanner', icon: '🔍', label: 'Scanner' },
  { id: 'contracts', windowId: 'rt-contracts', icon: '📜', label: 'Contracts' },
  { id: 'sovereignty', windowId: 'rt-sovereignty', icon: '⚔️', label: 'Sovereignty' },
  { id: 'settings', windowId: 'rt-settings', icon: '⚙️', label: 'Settings' },
  { id: 'tutorial', windowId: 'rt-tutorial', icon: '❓', label: 'Tutorial' },
  { id: 'devtools', windowId: 'rt-devtools', icon: '🛠️', label: 'DevTools' },
]

// ============================================================================
// SYSTEM INFO (top of neocom)
// ============================================================================

const SystemInfo = memo(function SystemInfo() {
  const { systemName, securityLevel } = useRTGameStore()

  const secColor = useMemo(() => {
    if (securityLevel >= 0.5) return PHOTON_COLORS.highsec
    if (securityLevel > 0.0) return PHOTON_COLORS.lowsec
    return PHOTON_COLORS.nullsec
  }, [securityLevel])

  return (
    <div className="flex flex-col items-center gap-0.5 px-1 py-2 border-b border-slate-700/50">
      <span className="text-[9px] text-slate-400 truncate max-w-[44px]">
        {systemName || '---'}
      </span>
      <span
        className="text-[10px] font-bold"
        style={{ color: secColor }}
      >
        {securityLevel.toFixed(1)}
      </span>
    </div>
  )
})

// ============================================================================
// SHIP STATUS (bottom of neocom)
// ============================================================================

const ShipMiniStatus = memo(function ShipMiniStatus() {
  const { getMyShip } = useRTGameStore()
  const ship = getMyShip()

  if (!ship) return null

  const shieldPct = ship.shieldMax > 0 ? (ship.shield / ship.shieldMax) * 100 : 0
  const armorPct = ship.armorMax > 0 ? (ship.armor / ship.armorMax) * 100 : 0
  const hullPct = ship.hpMax > 0 ? (ship.hp / ship.hpMax) * 100 : 0

  return (
    <div className="flex flex-col items-center gap-1 px-1 py-2 border-t border-slate-700/50">
      <MiniBar color="#3B82F6" percent={shieldPct} />
      <MiniBar color="#F59E0B" percent={armorPct} />
      <MiniBar color="#EF4444" percent={hullPct} />
    </div>
  )
})

function MiniBar({ color, percent }: { color: string; percent: number }) {
  return (
    <div className="w-8 h-1.5 bg-slate-800 rounded-sm overflow-hidden">
      <div
        className="h-full rounded-sm transition-all duration-300"
        style={{ width: `${Math.min(100, percent)}%`, backgroundColor: color }}
      />
    </div>
  )
}

// ============================================================================
// NEOCOM COMPONENT
// ============================================================================

export const Neocom = memo(function Neocom() {
  const { toggleWindow, isWindowOpen } = useWindowManager()
  const chatMessages = useRTGameStore(s => s.chatMessages)

  // Chat badge: count unread (simple: show count if chat window is closed)
  const chatBadge = useMemo(() => {
    return 0 // Could implement unread tracking later
  }, [chatMessages])

  const handleClick = useCallback((item: NeocomItem) => {
    if (item.id === 'devtools') {
      window.dispatchEvent(new CustomEvent('toggle-devpanel'))
      return
    }
    if (item.id === 'tutorial') {
      window.dispatchEvent(new CustomEvent('open-tutorial'))
      return
    }
    toggleWindow(item.windowId)
  }, [toggleWindow])

  return (
    <div
      className="fixed left-0 top-0 h-full z-[250] flex flex-col items-center py-2 gap-1"
      style={{
        width: '48px',
        background: PHOTON_COLORS.panelBg,
        backdropFilter: PHOTON_EFFECTS.blur,
        borderRight: `1px solid ${PHOTON_COLORS.borderDefault}`,
        boxShadow: PHOTON_EFFECTS.shadow,
      }}
    >
      {/* System info at top */}
      <SystemInfo />

      {/* Navigation icons */}
      <div className="flex-1 flex flex-col items-center gap-1 py-2 overflow-y-auto">
        {NEOCOM_ITEMS.map((item) => (
          <NeocomIcon
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={isWindowOpen(item.windowId)}
            badge={item.id === 'chat' ? chatBadge : undefined}
            onClick={() => handleClick(item)}
          />
        ))}
      </div>

      {/* Ship mini status at bottom */}
      <ShipMiniStatus />
    </div>
  )
})
