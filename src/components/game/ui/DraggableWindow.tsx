'use client'

/**
 * DraggableWindow - Resizable, draggable window component
 *
 * Used for all game UI panels to allow user customization
 * Similar to EVE Online's window system
 */

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react'

interface Position {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

interface DraggableWindowProps {
  id: string
  title: string
  icon?: string
  children: ReactNode
  defaultPosition?: Position
  defaultSize?: Size
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  resizable?: boolean
  collapsible?: boolean
  closable?: boolean
  onClose?: () => void
  className?: string
  zIndex?: number
  onFocus?: () => void
}

// Storage key for window positions
const WINDOW_STORAGE_KEY = 'ogamex_window_positions'

function loadWindowState(id: string): { position?: Position; size?: Size; collapsed?: boolean } {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(WINDOW_STORAGE_KEY)
    if (stored) {
      const all = JSON.parse(stored)
      return all[id] || {}
    }
  } catch {
    // Ignore
  }
  return {}
}

function saveWindowState(id: string, state: { position?: Position; size?: Size; collapsed?: boolean }) {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(WINDOW_STORAGE_KEY)
    const all = stored ? JSON.parse(stored) : {}
    all[id] = { ...all[id], ...state }
    localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Ignore
  }
}

export function DraggableWindow({
  id,
  title,
  icon,
  children,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 400, height: 300 },
  minWidth = 200,
  minHeight = 100,
  maxWidth = 1200,
  maxHeight = 800,
  resizable = true,
  collapsible = true,
  closable = true,
  onClose,
  className = '',
  zIndex = 100,
  onFocus,
}: DraggableWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  // Load saved state
  const savedState = loadWindowState(id)

  const [position, setPosition] = useState<Position>(savedState.position || defaultPosition)
  const [size, setSize] = useState<Size>(savedState.size || defaultSize)
  const [isCollapsed, setIsCollapsed] = useState(savedState.collapsed || false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  // Save state on change
  useEffect(() => {
    saveWindowState(id, { position, size, collapsed: isCollapsed })
  }, [id, position, size, isCollapsed])

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return

    e.preventDefault()
    setIsDragging(true)
    onFocus?.()

    const rect = windowRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }, [onFocus])

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.x))
      const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y))
      setPosition({ x: newX, y: newY })
    }

    const handleUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging, dragOffset])

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    onFocus?.()
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    })
  }, [size, onFocus])

  // Handle resize move
  useEffect(() => {
    if (!isResizing || !resizeStart) return

    const handleMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x
      const deltaY = e.clientY - resizeStart.y

      const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.width + deltaX))
      const newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.height + deltaY))

      setSize({ width: newWidth, height: newHeight })
    }

    const handleUp = () => {
      setIsResizing(false)
      setResizeStart(null)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isResizing, resizeStart, minWidth, minHeight, maxWidth, maxHeight])

  // Toggle collapse
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  // Handle close
  const handleClose = useCallback(() => {
    onClose?.()
  }, [onClose])

  return (
    <div
      ref={windowRef}
      className={`
        fixed bg-slate-900/95 backdrop-blur-sm border border-cyan-700/50 rounded-lg shadow-2xl
        ${isDragging || isResizing ? 'select-none' : ''}
        ${className}
      `}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: isCollapsed ? 'auto' : size.height,
        zIndex,
      }}
      onClick={onFocus}
    >
      {/* Window Header */}
      <div
        ref={headerRef}
        className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-cyan-700/30 rounded-t-lg cursor-move"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {collapsible && (
            <button
              onClick={handleToggleCollapse}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              {isCollapsed ? '▼' : '▲'}
            </button>
          )}
          {closable && (
            <button
              onClick={handleClose}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Window Content */}
      {!isCollapsed && (
        <div className="overflow-auto" style={{ height: `calc(100% - 40px)` }}>
          {children}
        </div>
      )}

      {/* Resize Handle */}
      {resizable && !isCollapsed && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeStart}
        >
          <svg className="w-full h-full text-slate-500" viewBox="0 0 16 16">
            <path d="M14 14L6 14L14 6Z" fill="currentColor" />
          </svg>
        </div>
      )}
    </div>
  )
}

export default DraggableWindow
