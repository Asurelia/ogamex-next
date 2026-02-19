'use client'

import { useRef, useCallback, useEffect, memo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'

// ============================================================================
// HELPERS
// ============================================================================

function securityColor(sec: number): string {
  if (sec >= 0.8) return 'text-green-400'
  if (sec >= 0.5) return 'text-yellow-400'
  if (sec >= 0.1) return 'text-orange-400'
  return 'text-red-500'
}

function securityBg(sec: number): string {
  if (sec >= 0.8) return 'bg-green-500/20 border-green-500/50'
  if (sec >= 0.5) return 'bg-yellow-500/20 border-yellow-500/50'
  if (sec >= 0.1) return 'bg-orange-500/20 border-orange-500/50'
  return 'bg-red-500/20 border-red-500/50'
}

// Map coordinates to canvas coordinates
const MAP_PADDING = 20
const MAP_RANGE = 100_000 // virtual unit range

function toCanvas(
  val: number,
  canvasSize: number,
): number {
  const normalized = (val + MAP_RANGE) / (MAP_RANGE * 2)
  return MAP_PADDING + normalized * (canvasSize - MAP_PADDING * 2)
}

// ============================================================================
// STARMAP CONTENT
// ============================================================================

const StarmapContent = memo(function StarmapContent() {
  const { systemName, securityLevel, ships, asteroids, stations, myShipId, navigate } = useRTGameStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const canvasSize = 320

  // Draw the minimap
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasSize, canvasSize)

    // Background grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 8; i++) {
      const pos = MAP_PADDING + (i / 8) * (canvasSize - MAP_PADDING * 2)
      ctx.beginPath()
      ctx.moveTo(pos, MAP_PADDING)
      ctx.lineTo(pos, canvasSize - MAP_PADDING)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(MAP_PADDING, pos)
      ctx.lineTo(canvasSize - MAP_PADDING, pos)
      ctx.stroke()
    }

    // Asteroids (cyan dots)
    asteroids.forEach((ast) => {
      const cx = toCanvas(ast.x, canvasSize)
      const cy = toCanvas(ast.z, canvasSize)
      ctx.fillStyle = '#22d3ee'
      ctx.beginPath()
      ctx.arc(cx, cy, 2, 0, Math.PI * 2)
      ctx.fill()
    })

    // Stations (white squares)
    stations.forEach((st) => {
      const cx = toCanvas(st.x, canvasSize)
      const cy = toCanvas(st.z, canvasSize)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx - 3, cy - 3, 6, 6)
    })

    // Ships (colored by faction)
    ships.forEach((ship) => {
      if (ship.id === myShipId) return
      const cx = toCanvas(ship.x, canvasSize)
      const cy = toCanvas(ship.z, canvasSize)

      if (ship.faction === 'hostile') ctx.fillStyle = '#ef4444'
      else if (ship.faction === 'friendly') ctx.fillStyle = '#4ade80'
      else ctx.fillStyle = '#facc15'

      ctx.beginPath()
      ctx.arc(cx, cy, 3, 0, Math.PI * 2)
      ctx.fill()
    })

    // My ship (green with ring)
    const myShip = ships.get(myShipId)
    if (myShip) {
      const cx = toCanvas(myShip.x, canvasSize)
      const cy = toCanvas(myShip.z, canvasSize)
      ctx.fillStyle = '#4ade80'
      ctx.beginPath()
      ctx.arc(cx, cy, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#4ade80'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, 8, 0, Math.PI * 2)
      ctx.stroke()
    }
  }, [ships, asteroids, stations, myShipId, canvasSize])

  // Redraw on data changes
  useEffect(() => {
    requestAnimationFrame(drawMap)
  }, [drawMap])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top

      // Convert canvas coords back to world coords
      const worldX = ((clickX - MAP_PADDING) / (canvasSize - MAP_PADDING * 2)) * MAP_RANGE * 2 - MAP_RANGE
      const worldZ = ((clickY - MAP_PADDING) / (canvasSize - MAP_PADDING * 2)) * MAP_RANGE * 2 - MAP_RANGE
      navigate(worldX, 0, worldZ)
    },
    [navigate, canvasSize],
  )

  return (
    <div className="flex flex-col h-full">
      {/* System info header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
        <span className="text-sm font-semibold text-slate-200">{systemName}</span>
        <span
          className={`text-xs font-bold px-1.5 py-0.5 rounded border ${securityBg(securityLevel)} ${securityColor(securityLevel)}`}
        >
          {securityLevel.toFixed(1)}
        </span>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="bg-slate-950 border border-slate-700 rounded cursor-crosshair"
          onClick={handleCanvasClick}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-t border-slate-700 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> You
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Hostile
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Neutral
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Asteroid
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-white inline-block" /> Station
        </span>
      </div>
    </div>
  )
})

// ============================================================================
// EXPORT
// ============================================================================

export function StarmapWindow() {
  return (
    <ManagedWindow
      id="rt-starmap"
      title="Starmap"
      icon="🗺️"
      defaultPosition={{ x: 200, y: 100 }}
      defaultSize={{ width: 380, height: 440 }}
      minWidth={300}
      minHeight={300}
    >
      <StarmapContent />
    </ManagedWindow>
  )
}
