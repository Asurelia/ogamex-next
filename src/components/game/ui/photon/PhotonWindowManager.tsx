'use client'

/**
 * PhotonWindowManager
 *
 * Manages multiple PhotonWindow instances with z-ordering, pin support,
 * and compact mode. Tracks which window is focused and handles the
 * 3-state opacity based on camera drag state.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { PhotonWindow, type PhotonWindowState, type PhotonWindowProps } from './PhotonWindow'

// ============================================================================
// CONTEXT
// ============================================================================

interface PhotonWindowMeta {
  isOpen: boolean
  zIndex: number
  isPinned: boolean
  isCompact: boolean
}

interface PhotonManagerContextType {
  openWindow: (id: string) => void
  closeWindow: (id: string) => void
  toggleWindow: (id: string) => void
  focusWindow: (id: string) => void
  pinWindow: (id: string) => void
  unpinWindow: (id: string) => void
  toggleCompact: (id: string) => void
  isWindowOpen: (id: string) => boolean
  getWindowZIndex: (id: string) => number
  isWindowPinned: (id: string) => boolean
  isWindowCompact: (id: string) => boolean
  focusedWindowId: string | null
  isCameraDragging: boolean
  setCameraDragging: (dragging: boolean) => void
}

const PhotonManagerContext = createContext<PhotonManagerContextType | null>(null)

export function usePhotonWindowManager() {
  const ctx = useContext(PhotonManagerContext)
  if (!ctx) throw new Error('usePhotonWindowManager must be used within PhotonWindowManagerProvider')
  return ctx
}

// ============================================================================
// PROVIDER
// ============================================================================

export function PhotonWindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<Record<string, PhotonWindowMeta>>({})
  const [topZ, setTopZ] = useState(200)
  const [focusedWindowId, setFocusedWindowId] = useState<string | null>(null)
  const [isCameraDragging, setIsCameraDragging] = useState(false)

  const openWindow = useCallback((id: string) => {
    setTopZ(z => z + 1)
    setWindows(prev => ({ ...prev, [id]: { isOpen: true, zIndex: topZ + 1, isPinned: prev[id]?.isPinned ?? false, isCompact: prev[id]?.isCompact ?? false } }))
    setFocusedWindowId(id)
  }, [topZ])

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => ({ ...prev, [id]: { ...prev[id], isOpen: false } }))
    if (focusedWindowId === id) setFocusedWindowId(null)
  }, [focusedWindowId])

  const toggleWindow = useCallback((id: string) => {
    setWindows(prev => {
      const isOpen = prev[id]?.isOpen ?? false
      if (isOpen) {
        if (focusedWindowId === id) setFocusedWindowId(null)
        return { ...prev, [id]: { ...prev[id], isOpen: false } }
      }
      setTopZ(z => z + 1)
      setFocusedWindowId(id)
      return { ...prev, [id]: { isOpen: true, zIndex: topZ + 1, isPinned: prev[id]?.isPinned ?? false, isCompact: prev[id]?.isCompact ?? false } }
    })
  }, [topZ, focusedWindowId])

  const focusWindow = useCallback((id: string) => {
    setTopZ(z => z + 1)
    setWindows(prev => ({ ...prev, [id]: { ...prev[id], zIndex: topZ + 1 } }))
    setFocusedWindowId(id)
  }, [topZ])

  const pinWindow = useCallback((id: string) => {
    setWindows(prev => ({ ...prev, [id]: { ...prev[id], isPinned: true } }))
  }, [])

  const unpinWindow = useCallback((id: string) => {
    setWindows(prev => ({ ...prev, [id]: { ...prev[id], isPinned: false } }))
  }, [])

  const toggleCompact = useCallback((id: string) => {
    setWindows(prev => ({ ...prev, [id]: { ...prev[id], isCompact: !prev[id]?.isCompact } }))
  }, [])

  const isWindowOpen = useCallback((id: string) => windows[id]?.isOpen ?? false, [windows])
  const getWindowZIndex = useCallback((id: string) => windows[id]?.zIndex ?? 200, [windows])
  const isWindowPinned = useCallback((id: string) => windows[id]?.isPinned ?? false, [windows])
  const isWindowCompact = useCallback((id: string) => windows[id]?.isCompact ?? false, [windows])

  return (
    <PhotonManagerContext.Provider value={{
      openWindow, closeWindow, toggleWindow, focusWindow,
      pinWindow, unpinWindow, toggleCompact,
      isWindowOpen, getWindowZIndex, isWindowPinned, isWindowCompact,
      focusedWindowId, isCameraDragging,
      setCameraDragging: setIsCameraDragging,
    }}>
      {children}
    </PhotonManagerContext.Provider>
  )
}

// ============================================================================
// MANAGED PHOTON WINDOW
// ============================================================================

interface ManagedPhotonWindowProps {
  id: string
  title: string
  icon?: string
  children: ReactNode
  defaultPosition?: { x: number; y: number }
  defaultSize?: { width: number; height: number }
  minWidth?: number
  minHeight?: number
}

export function ManagedPhotonWindow({
  id,
  title,
  icon,
  children,
  defaultPosition,
  defaultSize,
  minWidth,
  minHeight,
}: ManagedPhotonWindowProps) {
  const {
    isWindowOpen, getWindowZIndex, closeWindow, focusWindow,
    isWindowPinned, isWindowCompact, pinWindow, unpinWindow, toggleCompact,
    focusedWindowId, isCameraDragging,
  } = usePhotonWindowManager()

  if (!isWindowOpen(id)) return null

  let windowState: PhotonWindowState = 'inactive'
  if (isCameraDragging) {
    windowState = 'cameraDrag'
  } else if (focusedWindowId === id) {
    windowState = 'active'
  }

  return (
    <PhotonWindow
      id={id}
      title={title}
      icon={icon}
      defaultPosition={defaultPosition}
      defaultSize={defaultSize}
      minWidth={minWidth}
      minHeight={minHeight}
      zIndex={getWindowZIndex(id)}
      isPinned={isWindowPinned(id)}
      isCompact={isWindowCompact(id)}
      windowState={windowState}
      onClose={() => closeWindow(id)}
      onFocus={() => focusWindow(id)}
      onPin={() => isWindowPinned(id) ? unpinWindow(id) : pinWindow(id)}
      onCompact={() => toggleCompact(id)}
    >
      {children}
    </PhotonWindow>
  )
}
