'use client'

import { useCallback, memo } from 'react'
import { WindowManagerProvider, useWindowManager } from '../WindowManager'
import { OverviewWindow } from './OverviewWindow'
import { StarmapWindow } from './StarmapWindow'
import { ChatWindow } from './ChatWindow'
import { FleetManagerWindow } from './FleetManagerWindow'
import { MarketWindow } from './MarketWindow'
import { SkillsWindow } from './SkillsWindow'
import { FittingWindow } from './FittingWindow'
import { SelectedItemWindow } from './SelectedItemWindow'
import { HUDOverlay } from './HUDOverlay'

// ============================================================================
// TOOLBAR
// ============================================================================

interface ToolbarButtonProps {
  windowId: string
  icon: string
  label: string
}

function ToolbarButton({ windowId, icon, label }: ToolbarButtonProps) {
  const { toggleWindow, isWindowOpen } = useWindowManager()
  const open = isWindowOpen(windowId)

  return (
    <button
      onClick={() => toggleWindow(windowId)}
      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded transition-all ${
        open
          ? 'bg-cyan-700/40 text-cyan-300 border border-cyan-600/50'
          : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:text-slate-200 hover:bg-slate-700/60'
      }`}
      title={`${open ? 'Hide' : 'Show'} ${label}`}
    >
      <span>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

const TOOLBAR_ITEMS: ToolbarButtonProps[] = [
  { windowId: 'rt-overview', icon: '📡', label: 'Overview' },
  { windowId: 'rt-selecteditem', icon: '🎯', label: 'Target' },
  { windowId: 'rt-chat', icon: '💬', label: 'Chat' },
  { windowId: 'rt-starmap', icon: '🗺️', label: 'Starmap' },
  { windowId: 'rt-fleet', icon: '👥', label: 'Fleet' },
  { windowId: 'rt-market', icon: '💰', label: 'Market' },
  { windowId: 'rt-skills', icon: '📖', label: 'Skills' },
  { windowId: 'rt-fitting', icon: '🔧', label: 'Fitting' },
]

const Toolbar = memo(function Toolbar() {
  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-1 bg-slate-900/90 backdrop-blur-sm rounded-b-lg px-3 py-1.5 border-x border-b border-slate-700/50">
      {TOOLBAR_ITEMS.map((item) => (
        <ToolbarButton key={item.windowId} {...item} />
      ))}
    </div>
  )
})

// ============================================================================
// WINDOW OPENER (opens default windows on mount)
// ============================================================================

function WindowOpener() {
  const { openWindow, isWindowOpen } = useWindowManager()

  // Open default windows once on mount
  const opened = useCallback(() => {
    const defaults = ['rt-overview', 'rt-chat', 'rt-selecteditem']
    defaults.forEach((id) => {
      if (!isWindowOpen(id)) openWindow(id)
    })
  }, [openWindow, isWindowOpen])

  // Run once
  if (typeof window !== 'undefined') {
    requestAnimationFrame(opened)
  }

  return null
}

// ============================================================================
// LAYOUT
// ============================================================================

export function RTWindowLayout() {
  return (
    <WindowManagerProvider>
      <WindowOpener />
      <Toolbar />

      {/* All managed windows */}
      <OverviewWindow />
      <StarmapWindow />
      <ChatWindow />
      <FleetManagerWindow />
      <MarketWindow />
      <SkillsWindow />
      <FittingWindow />
      <SelectedItemWindow />

      {/* HUD overlay (not a managed window) */}
      <HUDOverlay />
    </WindowManagerProvider>
  )
}
