'use client'

import { useCallback, useEffect, useRef, memo, type ReactNode } from 'react'
import { WindowManagerProvider, useWindowManager } from '../WindowManager'
import { Neocom } from '../neocom/Neocom'
import { OverviewWindow } from './OverviewWindow'
import { Starmap3DWindow } from './Starmap3DWindow'
import { ChatWindow } from './ChatWindow'
import { FleetManagerWindow } from './FleetManagerWindow'
import { MarketWindow } from './MarketWindow'
import { SkillsWindow } from './SkillsWindow'
import { FittingWindow } from './FittingWindow'
import { SelectedItemWindow } from './SelectedItemWindow'
import { RouteWindow } from './RouteWindow'
import { CorpWindow } from './CorpWindow'
import { ClonesWindow } from './ClonesWindow'
import { ImplantsPanel } from './ImplantsPanel'
import { IndustryWindow } from './IndustryWindow'
import { PIWindow } from './PIWindow'
import { ScannerWindow } from './ScannerWindow'
import { ContractsWindow } from './ContractsWindow'
import { SovereigntyWindow } from './SovereigntyWindow'
import { SettingsWindow } from './SettingsWindow'
import { HUDOverlay } from './HUDOverlay'
import { DevPanel } from '../dev/DevPanel'

// ============================================================================
// WINDOW OPENER (opens default windows on mount)
// ============================================================================

function WindowOpener() {
  const { openWindow, isWindowOpen } = useWindowManager()
  const hasOpened = useRef(false)

  useEffect(() => {
    if (hasOpened.current) return
    hasOpened.current = true
    const defaults = ['rt-overview', 'rt-chat', 'rt-selecteditem']
    defaults.forEach((id) => {
      if (!isWindowOpen(id)) openWindow(id)
    })
  }, [openWindow, isWindowOpen])

  return null
}

// ============================================================================
// LAYOUT
// ============================================================================

export function RTWindowLayout({ children }: { children?: ReactNode }) {
  return (
    <WindowManagerProvider>
      <WindowOpener />

      {/* Neocom sidebar (replaces old toolbar) */}
      <Neocom />

      {/* 3D viewport area (offset for Neocom) */}
      <div className="absolute inset-0" style={{ left: '48px' }}>
        {children}
      </div>

      {/* All managed windows */}
      <OverviewWindow />
      <Starmap3DWindow />
      <ChatWindow />
      <FleetManagerWindow />
      <MarketWindow />
      <SkillsWindow />
      <FittingWindow />
      <SelectedItemWindow />
      <RouteWindow />
      <CorpWindow />
      <ClonesWindow />
      <ImplantsPanel />
      <IndustryWindow />
      <PIWindow />
      <ScannerWindow />
      <ContractsWindow />
      <SovereigntyWindow />
      <SettingsWindow />

      {/* HUD overlay (not a managed window) */}
      <HUDOverlay />

      {/* Dev panel - toggle with F12 or Neocom DevTools button */}
      <DevPanel />
    </WindowManagerProvider>
  )
}
