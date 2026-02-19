'use client'

/**
 * PhotonWindow - Glassmorphism window with 3-state opacity
 *
 * Extends the DraggableWindow concept with EVE Online Photon UI:
 * - Active (focused): opacity 0.95, luminous border
 * - Inactive (blurred): opacity 0.7, dimmed border
 * - Camera drag (orbit in progress): opacity 0.3, nearly invisible
 *
 * Glassmorphism CSS:
 *   background: rgba(10, 14, 20, 0.75)
 *   backdrop-filter: blur(12px) saturate(0.8)
 *   border: 1px solid rgba(80, 120, 160, 0.3)
 */

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { PHOTON_COLORS, PHOTON_EFFECTS, PHOTON_OPACITY, getPhotonPanelStyle } from './photon-theme'

// ============================================================================
// TYPES
// ============================================================================

export type PhotonWindowState = 'active' | 'inactive' | 'cameraDrag'

interface Position { x: number; y: number }
interface Size { width: number; height: number }

export interface PhotonWindowProps {
  id: string
  title: string
  icon?: string
  children: ReactNode
  defaultPosition?: Position
  defaultSize?: Size
  minWidth?: number
  minHeight?: number
  zIndex?: number
  isPinned?: boolean
  isCompact?: boolean
  windowState?: PhotonWindowState
  onClose?: () => void
  onFocus?: () => void
  onPin?: () => void
  onCompact?: () => void
}

// Storage
const STORAGE_KEY = 'ogamex_photon_windows'

function loadState(id: string): { position?: Position; size?: Size; collapsed?: boolean } {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)[id] || {}
  } catch { /* ignore */ }
  return {}
}

function saveState(id: string, state: { position?: Position; size?: Size; collapsed?: boolean }) {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const all = stored ? JSON.parse(stored) : {}
    all[id] = { ...all[id], ...state }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch { /* ignore */ }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PhotonWindow({
  id,
  title,
  icon,
  children,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 400, height: 300 },
  minWidth = 220,
  minHeight = 120,
  zIndex = 100,
  isPinned = false,
  isCompact = false,
  windowState = 'inactive',
  onClose,
  onFocus,
  onPin,
  onCompact,
}: PhotonWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null)
  const saved = loadState(id)

  const [position, setPosition] = useState<Position>(saved.position || defaultPosition)
  const [size, setSize] = useState<Size>(saved.size || defaultSize)
  const [isCollapsed, setIsCollapsed] = useState(saved.collapsed || false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  useEffect(() => {
    saveState(id, { position, size, collapsed: isCollapsed })
  }, [id, position, size, isCollapsed])

  // Drag handlers
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    setIsDragging(true)
    onFocus?.()
    const rect = windowRef.current?.getBoundingClientRect()
    if (rect) setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [onFocus])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y)),
      })
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isDragging, dragOffset])

  // Resize handlers
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    onFocus?.()
    setResizeStart({ x: e.clientX, y: e.clientY, w: size.width, h: size.height })
  }, [size, onFocus])

  useEffect(() => {
    if (!isResizing || !resizeStart) return
    const onMove = (e: MouseEvent) => {
      setSize({
        width: Math.max(minWidth, resizeStart.w + e.clientX - resizeStart.x),
        height: Math.max(minHeight, resizeStart.h + e.clientY - resizeStart.y),
      })
    }
    const onUp = () => { setIsResizing(false); setResizeStart(null) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isResizing, resizeStart, minWidth, minHeight])

  const panelStyle = getPhotonPanelStyle(windowState)
  const headerColor = windowState === 'active' ? PHOTON_COLORS.headerTextActive : PHOTON_COLORS.headerText

  return (
    <div
      ref={windowRef}
      className={`fixed rounded-lg overflow-hidden ${isDragging || isResizing ? 'select-none' : ''}`}
      style={{
        ...panelStyle,
        left: position.x,
        top: position.y,
        width: size.width,
        height: isCollapsed ? 'auto' : isCompact ? Math.min(size.height, 200) : size.height,
        zIndex,
        opacity: PHOTON_OPACITY[windowState],
      }}
      onClick={onFocus}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-move select-none"
        style={{ background: PHOTON_COLORS.headerBg }}
        onMouseDown={onDragStart}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-sm">{icon}</span>}
          <h3
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: headerColor }}
          >
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-0.5">
          {/* Pin button */}
          {onPin && (
            <button
              onClick={onPin}
              className={`w-5 h-5 flex items-center justify-center text-[10px] rounded transition-colors ${
                isPinned ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title={isPinned ? 'Unpin' : 'Pin'}
            >
              📌
            </button>
          )}

          {/* Compact toggle */}
          {onCompact && (
            <button
              onClick={onCompact}
              className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-300 text-[10px] rounded transition-colors"
              title={isCompact ? 'Expand' : 'Compact'}
            >
              {isCompact ? '⬜' : '▬'}
            </button>
          )}

          {/* Collapse */}
          <button
            onClick={() => setIsCollapsed(c => !c)}
            className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-300 text-[10px] rounded transition-colors"
          >
            {isCollapsed ? '▼' : '▲'}
          </button>

          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-red-400 text-[10px] rounded transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="overflow-auto" style={{ height: 'calc(100% - 32px)', color: PHOTON_COLORS.textPrimary }}>
          {children}
        </div>
      )}

      {/* Resize handle */}
      {!isCollapsed && (
        <div
          className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize opacity-30 hover:opacity-60"
          onMouseDown={onResizeStart}
        >
          <svg className="w-full h-full" viewBox="0 0 12 12">
            <path d="M12 12L4 12L12 4Z" fill={PHOTON_COLORS.textSecondary} />
          </svg>
        </div>
      )}
    </div>
  )
}
