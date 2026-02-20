'use client'

/**
 * MobileWindowStack - Full-screen stacked panels with bottom tab bar for mobile.
 *
 * On mobile, windows are shown as full-screen panels instead of draggable windows.
 * A bottom tab bar provides navigation between panels.
 */

import { memo, useState, useCallback, type ReactNode } from 'react'
import { PHOTON_COLORS, PHOTON_EFFECTS } from '../photon/photon-theme'

// ============================================================================
// TYPES
// ============================================================================

interface MobileTab {
  id: string
  icon: string
  label: string
}

const MOBILE_TABS: MobileTab[] = [
  { id: 'overview', icon: '📡', label: 'Overview' },
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'fitting', icon: '🔧', label: 'Ship' },
  { id: 'market', icon: '💰', label: 'Market' },
  { id: 'more', icon: '⋯', label: 'More' },
]

// ============================================================================
// MOBILE PANEL
// ============================================================================

interface MobilePanelProps {
  isActive: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

const MobilePanel = memo(function MobilePanel({ isActive, title, children, onClose }: MobilePanelProps) {
  if (!isActive) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col"
      style={{
        background: PHOTON_COLORS.panelBg,
        backdropFilter: PHOTON_EFFECTS.blur,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
        <span className="text-sm font-medium text-slate-200">{title}</span>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-white"
        >
          X
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
})

// ============================================================================
// MORE MENU (expander for additional windows)
// ============================================================================

interface MoreMenuProps {
  isOpen: boolean
  onSelect: (windowId: string) => void
  onClose: () => void
}

const MORE_ITEMS = [
  { id: 'rt-skills', icon: '📖', label: 'Skills' },
  { id: 'rt-fleet', icon: '👥', label: 'Fleet' },
  { id: 'rt-corp', icon: '🏢', label: 'Corporation' },
  { id: 'rt-clones', icon: '🧬', label: 'Clones' },
  { id: 'rt-industry', icon: '🏭', label: 'Industry' },
  { id: 'rt-pi', icon: '🌍', label: 'Planets' },
  { id: 'rt-scanner', icon: '🔍', label: 'Scanner' },
  { id: 'rt-contracts', icon: '📜', label: 'Contracts' },
  { id: 'rt-sovereignty', icon: '⚔️', label: 'Sovereignty' },
  { id: 'rt-route', icon: '🧭', label: 'Route' },
  { id: 'rt-starmap', icon: '🗺️', label: 'Starmap' },
]

const MoreMenu = memo(function MoreMenu({ isOpen, onSelect, onClose }: MoreMenuProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed bottom-14 left-0 right-0 z-[310] p-2 grid grid-cols-4 gap-2"
      style={{
        background: PHOTON_COLORS.panelBg,
        backdropFilter: PHOTON_EFFECTS.blur,
        borderTop: `1px solid ${PHOTON_COLORS.borderDefault}`,
      }}
    >
      {MORE_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => { onSelect(item.id); onClose() }}
          className="flex flex-col items-center gap-1 py-2 rounded hover:bg-slate-700/50 active:bg-slate-600/50"
        >
          <span className="text-lg">{item.icon}</span>
          <span className="text-[9px] text-slate-400">{item.label}</span>
        </button>
      ))}
    </div>
  )
})

// ============================================================================
// BOTTOM TAB BAR
// ============================================================================

interface BottomTabBarProps {
  activeTab: string
  onSelect: (tabId: string) => void
}

const BottomTabBar = memo(function BottomTabBar({ activeTab, onSelect }: BottomTabBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[300] flex items-center justify-around py-1"
      style={{
        background: PHOTON_COLORS.panelBg,
        backdropFilter: PHOTON_EFFECTS.blur,
        borderTop: `1px solid ${PHOTON_COLORS.borderDefault}`,
        height: '52px',
      }}
    >
      {MOBILE_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
            activeTab === tab.id ? 'bg-cyan-900/30 text-cyan-400' : 'text-slate-400'
          }`}
        >
          <span className="text-lg">{tab.icon}</span>
          <span className="text-[9px]">{tab.label}</span>
        </button>
      ))}
    </div>
  )
})

// ============================================================================
// MOBILE WINDOW STACK (exported)
// ============================================================================

interface MobileWindowStackProps {
  children: ReactNode
  isMobile: boolean
}

export const MobileWindowStack = memo(function MobileWindowStack({ children, isMobile }: MobileWindowStackProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [moreOpen, setMoreOpen] = useState(false)

  const handleTabSelect = useCallback((tabId: string) => {
    if (tabId === 'more') {
      setMoreOpen((v) => !v)
    } else {
      setActiveTab(tabId)
      setMoreOpen(false)
    }
  }, [])

  const handleMoreSelect = useCallback((windowId: string) => {
    setActiveTab(windowId)
  }, [])

  if (!isMobile) {
    return <>{children}</>
  }

  return (
    <>
      {/* 3D scene area - leave room for bottom bar */}
      <div className="fixed inset-0" style={{ bottom: '52px' }}>
        {children}
      </div>

      {/* More menu overlay */}
      <MoreMenu
        isOpen={moreOpen}
        onSelect={handleMoreSelect}
        onClose={() => setMoreOpen(false)}
      />

      {/* Bottom tab bar */}
      <BottomTabBar
        activeTab={activeTab}
        onSelect={handleTabSelect}
      />
    </>
  )
})

// ============================================================================
// MOBILE DETECTION HOOK
// ============================================================================

export function useIsMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768 || 'ontouchstart' in window
}
