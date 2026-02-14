'use client'

import React, { useState, useEffect, useCallback, memo, useMemo } from 'react'
import Link from 'next/link'

// ============================================================================
// TYPES
// ============================================================================

interface Alert {
  type: 'warning' | 'danger' | 'info' | 'success'
  message: string
}

interface RadarPoint {
  x: number
  y: number
  type: 'friendly' | 'hostile' | 'neutral'
}

interface Construction {
  name: string
  progress: number
  endsAt: Date
}

interface CockpitFrameProps {
  children: React.ReactNode
  planetName?: string
  coordinates?: { galaxy: number; system: number; position: number }
  serverTime?: Date
  alerts?: Alert[]
  radarData?: RadarPoint[]
  currentConstruction?: Construction
  onQuickNav?: (destination: string) => void
  viewMode?: '3D' | '2D'
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Corner decoration with metallic look and rivets
 */
const CockpitCorner = memo(function CockpitCorner({
  position,
}: {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}) {
  const positionClasses = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0 scale-x-[-1]',
    'bottom-left': 'bottom-0 left-0 scale-y-[-1]',
    'bottom-right': 'bottom-0 right-0 scale-x-[-1] scale-y-[-1]',
  }

  return (
    <div className={`absolute ${positionClasses[position]} pointer-events-none`}>
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        className="opacity-80"
      >
        {/* Main corner frame */}
        <defs>
          <linearGradient id="metalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a5568" />
            <stop offset="30%" stopColor="#2d3748" />
            <stop offset="60%" stopColor="#1a202c" />
            <stop offset="100%" stopColor="#0d1117" />
          </linearGradient>
          <linearGradient id="metalHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#718096" />
            <stop offset="50%" stopColor="#4a5568" />
            <stop offset="100%" stopColor="#2d3748" />
          </linearGradient>
          <filter id="innerShadow">
            <feOffset dx="1" dy="1" />
            <feGaussianBlur stdDeviation="1" result="offset-blur" />
            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
            <feFlood floodColor="black" floodOpacity="0.5" result="color" />
            <feComposite operator="in" in="color" in2="inverse" result="shadow" />
            <feComposite operator="over" in="shadow" in2="SourceGraphic" />
          </filter>
        </defs>

        {/* Outer frame shape */}
        <path
          d="M0,0 L80,0 L80,8 L8,8 L8,80 L0,80 Z"
          fill="url(#metalGradient)"
          filter="url(#innerShadow)"
        />

        {/* Inner highlight */}
        <path
          d="M2,2 L76,2 L76,6 L6,6 L6,76 L2,76 Z"
          fill="none"
          stroke="url(#metalHighlight)"
          strokeWidth="0.5"
          opacity="0.6"
        />

        {/* Diagonal accent */}
        <path
          d="M20,0 L40,0 L0,40 L0,20 Z"
          fill="#1a202c"
          opacity="0.5"
        />

        {/* Rivets */}
        <circle cx="15" cy="4" r="2" fill="#4a5568" />
        <circle cx="15" cy="4" r="1" fill="#718096" />
        <circle cx="35" cy="4" r="2" fill="#4a5568" />
        <circle cx="35" cy="4" r="1" fill="#718096" />
        <circle cx="55" cy="4" r="2" fill="#4a5568" />
        <circle cx="55" cy="4" r="1" fill="#718096" />
        <circle cx="4" cy="15" r="2" fill="#4a5568" />
        <circle cx="4" cy="15" r="1" fill="#718096" />
        <circle cx="4" cy="35" r="2" fill="#4a5568" />
        <circle cx="4" cy="35" r="1" fill="#718096" />
        <circle cx="4" cy="55" r="2" fill="#4a5568" />
        <circle cx="4" cy="55" r="1" fill="#718096" />

        {/* Corner bolt */}
        <circle cx="12" cy="12" r="6" fill="#2d3748" />
        <circle cx="12" cy="12" r="4" fill="#4a5568" />
        <line x1="9" y1="12" x2="15" y2="12" stroke="#2d3748" strokeWidth="1.5" />
        <line x1="12" y1="9" x2="12" y2="15" stroke="#2d3748" strokeWidth="1.5" />
      </svg>
    </div>
  )
})

/**
 * Server time display with pulsing indicator
 */
const ServerClock = memo(function ServerClock({ serverTime }: { serverTime?: Date }) {
  const [time, setTime] = useState(serverTime || new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const timeString = time.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      <span className="font-mono text-xs text-ogame-text-header tracking-wider">
        {timeString}
      </span>
    </div>
  )
})

/**
 * Mini radar display with fleet positions
 */
const MiniRadar = memo(function MiniRadar({ radarData }: { radarData?: RadarPoint[] }) {
  const typeColors = {
    friendly: '#00ff88',
    hostile: '#ff4444',
    neutral: '#ffcc00',
  }

  return (
    <div className="relative w-20 h-20 rounded-full bg-black/50 border border-cyan-900/50 overflow-hidden">
      {/* Radar grid */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-[1px] bg-cyan-900/30" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[1px] h-full bg-cyan-900/30" />
      </div>
      <div className="absolute inset-2 rounded-full border border-cyan-900/20" />
      <div className="absolute inset-4 rounded-full border border-cyan-900/20" />

      {/* Center point (current position) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00ffff]" />

      {/* Radar sweep animation */}
      <div
        className="absolute top-1/2 left-1/2 origin-bottom-left w-10 h-[1px] bg-gradient-to-r from-cyan-500/80 to-transparent"
        style={{
          animation: 'radar-sweep 3s linear infinite',
          transformOrigin: 'left center',
        }}
      />

      {/* Fleet positions */}
      {radarData?.map((point, index) => (
        <div
          key={index}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            left: `${50 + point.x * 40}%`,
            top: `${50 + point.y * 40}%`,
            backgroundColor: typeColors[point.type],
            boxShadow: `0 0 4px ${typeColors[point.type]}`,
          }}
        />
      ))}

      {/* Radar label */}
      <div className="absolute bottom-0 left-0 right-0 text-center text-[8px] text-cyan-500/70 font-mono uppercase">
        RADAR
      </div>
    </div>
  )
})

/**
 * Alert indicator with animations
 */
const AlertIndicator = memo(function AlertIndicator({ alerts }: { alerts?: Alert[] }) {
  const [currentAlert, setCurrentAlert] = useState(0)

  useEffect(() => {
    if (!alerts || alerts.length <= 1) return
    const interval = setInterval(() => {
      setCurrentAlert((prev) => (prev + 1) % alerts.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [alerts])

  if (!alerts || alerts.length === 0) return null

  const alert = alerts[currentAlert]
  const typeStyles = {
    warning: 'border-yellow-500/50 text-yellow-400 bg-yellow-900/20',
    danger: 'border-red-500/50 text-red-400 bg-red-900/20 animate-pulse',
    info: 'border-cyan-500/50 text-cyan-400 bg-cyan-900/20',
    success: 'border-green-500/50 text-green-400 bg-green-900/20',
  }

  const typeIcons = {
    warning: '!',
    danger: 'X',
    info: 'i',
    success: 'ok',
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${typeStyles[alert.type]} backdrop-blur-sm`}>
      <span className="font-bold text-xs">[{typeIcons[alert.type]}]</span>
      <span className="text-xs font-mono truncate max-w-32">{alert.message}</span>
      {alerts.length > 1 && (
        <span className="text-[10px] opacity-60">
          {currentAlert + 1}/{alerts.length}
        </span>
      )}
    </div>
  )
})

/**
 * Construction progress indicator
 */
const ConstructionProgress = memo(function ConstructionProgress({
  construction,
}: {
  construction?: Construction
}) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!construction) return

    const updateTime = () => {
      const now = new Date()
      const diff = construction.endsAt.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('Complete!')
        return
      }

      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [construction])

  if (!construction) return null

  return (
    <div className="w-full max-w-32">
      <div className="text-[10px] text-ogame-text-muted uppercase tracking-wider mb-1">
        Building
      </div>
      <div className="text-xs text-ogame-accent font-medium truncate mb-1">
        {construction.name}
      </div>
      <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-ogame-accent to-yellow-400 transition-all duration-1000"
          style={{ width: `${construction.progress}%` }}
        />
      </div>
      <div className="text-[10px] text-ogame-text-muted font-mono mt-0.5">
        {timeLeft}
      </div>
    </div>
  )
})

/**
 * Quick navigation buttons
 */
const QuickNavButton = memo(function QuickNavButton({
  icon,
  label,
  shortcut,
  href,
  onClick,
  color = 'blue',
}: {
  icon: string
  label: string
  shortcut: string
  href?: string
  onClick?: () => void
  color?: 'blue' | 'yellow' | 'red' | 'purple' | 'green' | 'cyan'
}) {
  const colorStyles = {
    blue: 'bg-blue-900/40 hover:bg-blue-800/50 border-blue-700/50',
    yellow: 'bg-yellow-900/40 hover:bg-yellow-800/50 border-yellow-700/50',
    red: 'bg-red-900/40 hover:bg-red-800/50 border-red-700/50',
    purple: 'bg-purple-900/40 hover:bg-purple-800/50 border-purple-700/50',
    green: 'bg-green-900/40 hover:bg-green-800/50 border-green-700/50',
    cyan: 'bg-cyan-900/40 hover:bg-cyan-800/50 border-cyan-700/50',
  }

  const content = (
    <div
      className={`
        flex flex-col items-center justify-center
        w-16 h-14 md:w-20 md:h-16
        ${colorStyles[color]}
        border rounded
        backdrop-blur-sm
        transition-all duration-200
        cursor-pointer
        group
      `}
      onClick={onClick}
    >
      <span className="text-lg mb-0.5 group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-[9px] md:text-[10px] text-ogame-text-header uppercase tracking-wider">
        {label}
      </span>
      <span className="text-[8px] text-ogame-text-muted font-mono">[{shortcut}]</span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="pointer-events-auto">
        {content}
      </Link>
    )
  }

  return <div className="pointer-events-auto">{content}</div>
})

/**
 * Scanline effect overlay
 */
const ScanlineEffect = memo(function ScanlineEffect() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.03]"
      style={{
        background:
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.1) 2px, rgba(0,255,255,0.1) 4px)',
        animation: 'scanlines 8s linear infinite',
      }}
    />
  )
})

/**
 * Vignette effect overlay
 */
const VignetteEffect = memo(function VignetteEffect() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
      }}
    />
  )
})

/**
 * Glass reflection effect
 */
const GlassReflection = memo(function GlassReflection() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Top reflection */}
      <div
        className="absolute top-0 left-0 right-0 h-32 opacity-[0.02]"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
        }}
      />
      {/* Diagonal reflection */}
      <div
        className="absolute top-0 left-1/4 w-64 h-full opacity-[0.01] rotate-12"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
        }}
      />
    </div>
  )
})

/**
 * Space dust particles
 */
const SpaceDust = memo(function SpaceDust() {
  const particles = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 10,
    }))
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white/20"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animation: `float-particle ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CockpitFrame = memo(function CockpitFrame({
  children,
  planetName,
  coordinates,
  serverTime,
  alerts,
  radarData,
  currentConstruction,
  onQuickNav,
  viewMode = '3D',
}: CockpitFrameProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleQuickNav = useCallback(
    (destination: string) => {
      onQuickNav?.(destination)
    },
    [onQuickNav]
  )

  const coordString = coordinates
    ? `[${coordinates.galaxy}:${coordinates.system}:${coordinates.position}]`
    : ''

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Main 3D content */}
      <div className="absolute inset-0">{children}</div>

      {/* Visual effects layer */}
      <ScanlineEffect />
      <VignetteEffect />
      <GlassReflection />
      <SpaceDust />

      {/* Cockpit frame overlay */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* Corner decorations */}
        <CockpitCorner position="top-left" />
        <CockpitCorner position="top-right" />
        <CockpitCorner position="bottom-left" />
        <CockpitCorner position="bottom-right" />

        {/* Top HUD bar */}
        <div className="absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-32 md:px-36">
          <div className="flex items-center gap-6 pointer-events-auto">
            {/* Planet info */}
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded border border-cyan-900/30">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00ffff]" />
              <div>
                <div className="text-xs text-ogame-text-header font-medium">
                  {planetName || 'Unknown'}
                </div>
                <div className="text-[10px] text-ogame-text-muted font-mono">
                  {coordString || '[?:?:?]'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pointer-events-auto">
            {/* Server clock */}
            <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded border border-cyan-900/30">
              <ServerClock serverTime={serverTime} />
            </div>

            {/* View mode indicator */}
            <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded border border-cyan-900/30">
              <span className="text-xs font-mono text-ogame-text-muted">MODE: </span>
              <span className="text-xs font-mono text-ogame-accent">{viewMode}</span>
            </div>

            {/* Settings button */}
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="w-8 h-8 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded border border-cyan-900/30 hover:border-cyan-500/50 transition-colors"
            >
              <svg
                className="w-4 h-4 text-ogame-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Left side panel */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto">
          {/* Mini radar */}
          <div className="bg-black/30 backdrop-blur-sm p-2 rounded border border-cyan-900/30">
            <MiniRadar radarData={radarData} />
          </div>

          {/* Alerts */}
          <AlertIndicator alerts={alerts} />
        </div>

        {/* Right side panel */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 items-end pointer-events-auto">
          {/* Construction progress */}
          {currentConstruction && (
            <div className="bg-black/30 backdrop-blur-sm p-3 rounded border border-cyan-900/30">
              <ConstructionProgress construction={currentConstruction} />
            </div>
          )}

          {/* Status indicators */}
          <div className="bg-black/30 backdrop-blur-sm px-3 py-2 rounded border border-cyan-900/30">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-ogame-text-muted uppercase">Shields</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-ogame-text-muted uppercase">Engines</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <span className="text-[10px] text-ogame-text-muted uppercase">Sensors</span>
            </div>
          </div>
        </div>

        {/* Bottom HUD bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <QuickNavButton
            icon="O"
            label="Overview"
            shortcut="O"
            href="/game/overview"
            color="blue"
            onClick={() => handleQuickNav('overview')}
          />
          <QuickNavButton
            icon="R"
            label="Resources"
            shortcut="R"
            href="/game/resources"
            color="yellow"
            onClick={() => handleQuickNav('resources')}
          />
          <QuickNavButton
            icon="F"
            label="Fleet"
            shortcut="F"
            href="/game/fleet"
            color="red"
            onClick={() => handleQuickNav('fleet')}
          />
          <QuickNavButton
            icon="T"
            label="Research"
            shortcut="T"
            href="/game/research"
            color="purple"
            onClick={() => handleQuickNav('research')}
          />
          <QuickNavButton
            icon="S"
            label="Shipyard"
            shortcut="S"
            href="/game/shipyard"
            color="cyan"
            onClick={() => handleQuickNav('shipyard')}
          />
          <QuickNavButton
            icon="G"
            label="Galaxy"
            shortcut="G"
            href="/game/galaxy"
            color="green"
            onClick={() => handleQuickNav('galaxy')}
          />
        </div>

        {/* Bottom frame edge */}
        <div className="absolute bottom-0 left-32 right-32 h-2 bg-gradient-to-r from-transparent via-cyan-900/20 to-transparent" />
        <div className="absolute bottom-0 left-32 right-32 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      </div>

      {/* CSS animations */}
      <style jsx global>{`
        @keyframes radar-sweep {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes scanlines {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 0 100vh;
          }
        }

        @keyframes float-particle {
          0% {
            transform: translate(0, 0);
            opacity: 0;
          }
          10% {
            opacity: 0.3;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            transform: translate(50px, 100px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
})

export default CockpitFrame
