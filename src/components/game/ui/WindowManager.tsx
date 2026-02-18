'use client'

/**
 * WindowManager - Manages all draggable windows in the game UI
 *
 * Handles z-index stacking, window registration, and global window state
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { DraggableWindow } from './DraggableWindow'

// ============================================================================
// TYPES
// ============================================================================

export interface WindowConfig {
  id: string
  title: string
  icon?: string
  defaultPosition?: { x: number; y: number }
  defaultSize?: { width: number; height: number }
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  resizable?: boolean
  collapsible?: boolean
  closable?: boolean
}

interface WindowState {
  isOpen: boolean
  zIndex: number
}

interface WindowManagerContextType {
  openWindow: (id: string) => void
  closeWindow: (id: string) => void
  toggleWindow: (id: string) => void
  focusWindow: (id: string) => void
  isWindowOpen: (id: string) => boolean
  getWindowZIndex: (id: string) => number
  openWindows: string[]
}

// ============================================================================
// CONTEXT
// ============================================================================

const WindowManagerContext = createContext<WindowManagerContextType | null>(null)

export function useWindowManager() {
  const context = useContext(WindowManagerContext)
  if (!context) {
    throw new Error('useWindowManager must be used within a WindowManagerProvider')
  }
  return context
}

// ============================================================================
// PROVIDER
// ============================================================================

interface WindowManagerProviderProps {
  children: ReactNode
}

export function WindowManagerProvider({ children }: WindowManagerProviderProps) {
  const [windowStates, setWindowStates] = useState<Record<string, WindowState>>({})
  const [topZIndex, setTopZIndex] = useState(100)

  const openWindow = useCallback((id: string) => {
    setWindowStates(prev => ({
      ...prev,
      [id]: {
        isOpen: true,
        zIndex: topZIndex + 1,
      },
    }))
    setTopZIndex(z => z + 1)
  }, [topZIndex])

  const closeWindow = useCallback((id: string) => {
    setWindowStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isOpen: false,
      },
    }))
  }, [])

  const toggleWindow = useCallback((id: string) => {
    setWindowStates(prev => {
      const isCurrentlyOpen = prev[id]?.isOpen ?? false
      if (isCurrentlyOpen) {
        return {
          ...prev,
          [id]: { ...prev[id], isOpen: false },
        }
      } else {
        return {
          ...prev,
          [id]: { isOpen: true, zIndex: topZIndex + 1 },
        }
      }
    })
    setTopZIndex(z => z + 1)
  }, [topZIndex])

  const focusWindow = useCallback((id: string) => {
    setWindowStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        zIndex: topZIndex + 1,
      },
    }))
    setTopZIndex(z => z + 1)
  }, [topZIndex])

  const isWindowOpen = useCallback((id: string) => {
    return windowStates[id]?.isOpen ?? false
  }, [windowStates])

  const getWindowZIndex = useCallback((id: string) => {
    return windowStates[id]?.zIndex ?? 100
  }, [windowStates])

  const openWindows = Object.entries(windowStates)
    .filter(([_, state]) => state.isOpen)
    .map(([id]) => id)

  return (
    <WindowManagerContext.Provider
      value={{
        openWindow,
        closeWindow,
        toggleWindow,
        focusWindow,
        isWindowOpen,
        getWindowZIndex,
        openWindows,
      }}
    >
      {children}
    </WindowManagerContext.Provider>
  )
}

// ============================================================================
// MANAGED WINDOW COMPONENT
// ============================================================================

interface ManagedWindowProps extends WindowConfig {
  children: ReactNode
}

export function ManagedWindow({
  id,
  title,
  icon,
  children,
  defaultPosition,
  defaultSize,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  resizable = true,
  collapsible = true,
  closable = true,
}: ManagedWindowProps) {
  const { isWindowOpen, getWindowZIndex, closeWindow, focusWindow } = useWindowManager()

  if (!isWindowOpen(id)) {
    return null
  }

  return (
    <DraggableWindow
      id={id}
      title={title}
      icon={icon}
      defaultPosition={defaultPosition}
      defaultSize={defaultSize}
      minWidth={minWidth}
      minHeight={minHeight}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      resizable={resizable}
      collapsible={collapsible}
      closable={closable}
      zIndex={getWindowZIndex(id)}
      onClose={() => closeWindow(id)}
      onFocus={() => focusWindow(id)}
    >
      {children}
    </DraggableWindow>
  )
}
