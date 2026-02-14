'use client'

import { memo, useState, useCallback, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import { useTranslations } from 'next-intl'
import type { PlanetType as VisualPlanetType } from '@/lib/3d/constants'
import type { Planet } from '@/types/database'
import type { SceneType } from './3d/GameScene3DManager'
import { formatNumber, formatCoordinates } from '@/lib/utils/format'

// ============================================================================
// DYNAMIC IMPORTS
// ============================================================================

const Canvas = dynamic(
  () => import('@react-three/fiber').then((mod) => mod.Canvas),
  { ssr: false }
)

const Planet3D = dynamic(() => import('./3d/Planet3D').then((mod) => mod.Planet3D), {
  ssr: false,
})

// ============================================================================
// TYPES
// ============================================================================

interface CockpitSidebarProps {
  planets: Planet[]
  currentPlanetId: string | null
  onSelectPlanet: (id: string) => void
  currentScene: SceneType
  onNavigateScene: (scene: SceneType) => void
  resources: {
    metal: number
    crystal: number
    deuterium: number
    energy: { current: number; max: number }
  }
  alerts?: Array<{
    type: 'attack' | 'construction' | 'fleet' | 'message'
    text: string
    time: Date
  }>
  constructions?: Array<{ name: string; endsAt: Date }>
}

interface NavCategory {
  id: string
  label: string
  items: NavItem[]
}

interface NavItem {
  scene: SceneType
  icon: string
  label: string
  color: string
}

// ============================================================================
// NAVIGATION CONFIGURATION
// ============================================================================

const navigationItems: NavItem[] = [
  { scene: 'orbital', icon: '🌍', label: 'Vue Orbitale', color: '#00d4ff' },
  { scene: 'mines', icon: '⛏️', label: 'Production', color: '#ffa500' },
  { scene: 'shipyard', icon: '🚀', label: 'Chantier Naval', color: '#00ff88' },
  { scene: 'research', icon: '🔬', label: 'Recherche', color: '#aa44ff' },
  { scene: 'defense', icon: '🛡️', label: 'Defenses', color: '#ff4444' },
  { scene: 'fleet', icon: '🚢', label: 'Flottes', color: '#4488ff' },
  { scene: 'galaxy', icon: '🌌', label: 'Carte Galactique', color: '#ff88ff' },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getVisualPlanetType(position: number): VisualPlanetType {
  if (position <= 3) return position === 1 ? 'desert' : 'dry'
  if (position <= 6) return ['normal', 'jungle', 'water'][position % 3] as VisualPlanetType
  if (position <= 9) return position === 9 ? 'ice' : 'normal'
  return position % 2 === 0 ? 'gas' : 'ice'
}

// formatNumber and formatCoordinates imported from @/lib/utils/format

function formatCountdown(endsAt: Date): string {
  const now = new Date()
  const diff = endsAt.getTime() - now.getTime()
  if (diff <= 0) return '00:00:00'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// ============================================================================
// SCAN LINE ANIMATION COMPONENT
// ============================================================================

const ScanLine = memo(function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent pointer-events-none"
      initial={{ top: 0, opacity: 0 }}
      animate={{
        top: ['0%', '100%'],
        opacity: [0, 0.8, 0.8, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'linear',
        times: [0, 0.1, 0.9, 1],
      }}
      style={{
        boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
      }}
    />
  )
})

// ============================================================================
// STATUS INDICATOR COMPONENT
// ============================================================================

const StatusIndicator = memo(function StatusIndicator({
  status,
  label,
}: {
  status: 'online' | 'warning' | 'danger'
  label: string
}) {
  const colors = {
    online: { bg: 'bg-green-500', glow: 'rgba(34, 197, 94, 0.8)' },
    warning: { bg: 'bg-yellow-500', glow: 'rgba(234, 179, 8, 0.8)' },
    danger: { bg: 'bg-red-500', glow: 'rgba(239, 68, 68, 0.8)' },
  }

  const color = colors[status]

  return (
    <div className="flex items-center gap-2">
      <motion.div
        className={`w-2 h-2 rounded-full ${color.bg}`}
        animate={{
          boxShadow: [
            `0 0 4px ${color.glow}`,
            `0 0 12px ${color.glow}`,
            `0 0 4px ${color.glow}`,
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
        {label}
      </span>
    </div>
  )
})

// ============================================================================
// COCKPIT FRAME COMPONENT
// ============================================================================

const CockpitFrame = memo(function CockpitFrame({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative h-full">
      {/* Metallic border effect */}
      <div
        className="absolute inset-0 rounded-r-lg pointer-events-none"
        style={{
          background: `
            linear-gradient(135deg, rgba(100, 150, 200, 0.1) 0%, transparent 50%),
            linear-gradient(225deg, rgba(50, 100, 150, 0.1) 0%, transparent 50%)
          `,
        }}
      />

      {/* Outer glow border */}
      <div
        className="absolute inset-0 rounded-r-lg pointer-events-none"
        style={{
          border: '1px solid rgba(0, 212, 255, 0.3)',
          boxShadow: `
            inset 0 0 30px rgba(0, 0, 0, 0.5),
            0 0 20px rgba(0, 212, 255, 0.1)
          `,
        }}
      />

      {/* Corner decorations */}
      <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <path
            d="M0 0 L32 0 L32 32"
            fill="none"
            stroke="rgba(0, 212, 255, 0.5)"
            strokeWidth="2"
          />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none">
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <path
            d="M32 0 L32 32 L0 32"
            fill="none"
            stroke="rgba(0, 212, 255, 0.5)"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative h-full overflow-hidden">
        {children}
      </div>
    </div>
  )
})

// ============================================================================
// MINI PLANET 3D VIEW
// ============================================================================

const MiniPlanet3DView = memo(function MiniPlanet3DView({
  type,
  variant = 1,
  isSelected = false,
  size = 44,
}: {
  type: VisualPlanetType
  variant?: number
  isSelected?: boolean
  size?: number
}) {
  return (
    <motion.div
      className="rounded-full overflow-hidden"
      style={{ width: size, height: size }}
      animate={{
        boxShadow: isSelected
          ? '0 0 15px rgba(0, 255, 255, 0.6), 0 0 30px rgba(0, 200, 255, 0.3)'
          : '0 0 8px rgba(0, 255, 255, 0.2)',
      }}
      transition={{ duration: 0.3 }}
    >
      <Canvas
        style={{ width: size, height: size }}
        camera={{ position: [0, 0, 2.5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} intensity={1} />
        <Planet3D
          type={type}
          variant={variant}
          size={0.7}
          rotationSpeed={isSelected ? 0.01 : 0.003}
        />
      </Canvas>
    </motion.div>
  )
})

// ============================================================================
// PLANET SLOT COMPONENT
// ============================================================================

interface PlanetSlotProps {
  planet: Planet
  isSelected: boolean
  onSelect: () => void
  slotNumber: number
}

const PlanetSlot = memo(function PlanetSlot({
  planet,
  isSelected,
  onSelect,
  slotNumber,
}: PlanetSlotProps) {
  const visualType = useMemo(
    () => getVisualPlanetType(planet.position),
    [planet.position]
  )
  const variant = useMemo(() => ((planet.position - 1) % 10) + 1, [planet.position])

  return (
    <motion.button
      onClick={onSelect}
      className={`
        relative w-full p-2 rounded-lg overflow-hidden
        backdrop-blur-md border transition-all duration-200
        ${isSelected
          ? 'bg-cyan-900/30 border-cyan-500/60'
          : 'bg-black/40 border-white/10 hover:border-cyan-500/30 hover:bg-cyan-900/10'
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Slot number indicator */}
      <div className="absolute top-1 left-1 w-4 h-4 rounded-sm bg-black/60 flex items-center justify-center">
        <span className="text-[10px] font-mono text-cyan-400">{slotNumber}</span>
      </div>

      {/* Selected glow effect */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          animate={{
            boxShadow: [
              'inset 0 0 15px rgba(0, 255, 255, 0.2)',
              'inset 0 0 25px rgba(0, 255, 255, 0.4)',
              'inset 0 0 15px rgba(0, 255, 255, 0.2)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div className="flex items-center gap-2">
        {/* Mini 3D planet */}
        <MiniPlanet3DView
          type={visualType}
          variant={variant}
          isSelected={isSelected}
          size={40}
        />

        {/* Planet info */}
        <div className="flex-1 min-w-0 text-left">
          <h4 className="text-xs font-semibold text-white truncate">
            {planet.name}
          </h4>
          <p className="text-[10px] text-cyan-400/70 font-mono">
            {formatCoordinates(planet.galaxy, planet.system, planet.position)}
          </p>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <motion.div
            className="w-2 h-2 rounded-full bg-cyan-400"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
    </motion.button>
  )
})

// ============================================================================
// RESOURCE GAUGE COMPONENT
// ============================================================================

interface ResourceGaugeProps {
  label: string
  value: number
  max?: number
  color: string
  icon: string
}

const ResourceGauge = memo(function ResourceGauge({
  label,
  value,
  max,
  color,
  icon,
}: ResourceGaugeProps) {
  const percentage = max ? Math.min((value / max) * 100, 100) : null

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          <span className="text-[10px] uppercase tracking-wider text-white/60">
            {label}
          </span>
        </div>
        <span className="text-xs font-mono" style={{ color }}>
          {formatNumber(value)}
        </span>
      </div>

      {/* Gauge bar */}
      <div className="relative h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            boxShadow: `0 0 8px ${color}60`,
          }}
          initial={{ width: 0 }}
          animate={{ width: percentage ? `${percentage}%` : '60%' }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        {/* Animated glow */}
        <motion.div
          className="absolute inset-y-0 w-4 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
          }}
          animate={{ left: ['-10%', '110%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    </div>
  )
})

// ============================================================================
// NAV BUTTON COMPONENT
// ============================================================================

interface NavButtonProps {
  item: NavItem
  isActive: boolean
  onClick: () => void
}

const NavButton = memo(function NavButton({
  item,
  isActive,
  onClick,
}: NavButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        relative w-full px-3 py-2 rounded-lg flex items-center gap-2
        border transition-all duration-200
        ${isActive
          ? 'bg-cyan-900/40 border-cyan-500/50'
          : 'bg-black/30 border-white/10 hover:border-cyan-500/30 hover:bg-cyan-900/20'
        }
      `}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Active indicator glow */}
      {isActive && (
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
          style={{
            background: item.color,
            boxShadow: `0 0 10px ${item.color}`,
          }}
          layoutId="navIndicator"
        />
      )}

      <span className="text-lg">{item.icon}</span>
      <span
        className={`text-xs font-medium ${isActive ? 'text-white' : 'text-white/70'}`}
      >
        {item.label}
      </span>

      {/* Hover effect */}
      <motion.div
        className="absolute inset-0 rounded-lg pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        style={{
          background: `linear-gradient(90deg, ${item.color}10, transparent)`,
        }}
      />
    </motion.button>
  )
})

// ============================================================================
// ALERT ITEM COMPONENT
// ============================================================================

interface AlertItemProps {
  alert: {
    type: 'attack' | 'construction' | 'fleet' | 'message'
    text: string
    time: Date
  }
}

const AlertItem = memo(function AlertItem({ alert }: AlertItemProps) {
  const colors = {
    attack: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', icon: '⚠️' },
    construction: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400', icon: '🔧' },
    fleet: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', icon: '🚀' },
    message: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400', icon: '💬' },
  }

  const style = colors[alert.type]

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`p-2 rounded-lg ${style.bg} border ${style.border}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs ${style.text} truncate`}>{alert.text}</p>
          <p className="text-[10px] text-white/40 font-mono">
            {formatCountdown(alert.time)}
          </p>
        </div>
      </div>

      {/* Pulse animation for attacks */}
      {alert.type === 'attack' && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-red-500 pointer-events-none"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  )
})

// ============================================================================
// CONSTRUCTION TIMER COMPONENT
// ============================================================================

interface ConstructionTimerProps {
  construction: { name: string; endsAt: Date }
}

const ConstructionTimer = memo(function ConstructionTimer({
  construction,
}: ConstructionTimerProps) {
  const [countdown, setCountdown] = useState(formatCountdown(construction.endsAt))

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(formatCountdown(construction.endsAt))
    }, 1000)
    return () => clearInterval(interval)
  }, [construction.endsAt])

  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-orange-500/10 border border-orange-500/30">
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <span className="text-sm">🔧</span>
        </motion.div>
        <span className="text-xs text-white/80 truncate max-w-[100px]">
          {construction.name}
        </span>
      </div>
      <motion.span
        className="text-xs font-mono text-orange-400"
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        {countdown}
      </motion.span>
    </div>
  )
})

// ============================================================================
// MAIN COCKPIT SIDEBAR COMPONENT
// ============================================================================

export const CockpitSidebar = memo(function CockpitSidebar({
  planets,
  currentPlanetId,
  onSelectPlanet,
  currentScene,
  onNavigateScene,
  resources,
  alerts = [],
  constructions = [],
}: CockpitSidebarProps) {
  const t = useTranslations('sidebar')

  // Energy percentage for display
  const energyPercentage = resources.energy.max > 0
    ? (resources.energy.current / resources.energy.max) * 100
    : 0

  return (
    <motion.aside
      initial={{ x: -280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-64 h-full bg-black/80 backdrop-blur-lg flex flex-col"
    >
      <CockpitFrame>
        {/* Scan line effect */}
        <ScanLine />

        {/* ============================================
            HEADER - Status Indicator
            ============================================ */}
        <div className="p-3 border-b border-cyan-500/20">
          <div className="flex items-center justify-between">
            <StatusIndicator
              status={alerts.some(a => a.type === 'attack') ? 'danger' : 'online'}
              label={alerts.some(a => a.type === 'attack') ? 'ALERT' : 'TACTICAL ONLINE'}
            />
            <div className="flex items-center gap-1">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-cyan-500"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[10px] font-mono text-white/40">SYS</span>
            </div>
          </div>

          {/* Decorative line */}
          <div
            className="mt-2 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.5), transparent)',
            }}
          />
        </div>

        {/* ============================================
            PLANET SLOTS
            ============================================ */}
        <div className="flex-shrink-0 p-2 border-b border-cyan-500/20">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{
                color: '#00d4ff',
                textShadow: '0 0 8px rgba(0, 212, 255, 0.5)',
              }}
            >
              COLONY SLOTS
            </h3>
            <span className="text-[10px] text-white/40 font-mono">
              {planets.length}/15
            </span>
          </div>

          <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
            {planets.map((planet, index) => (
              <PlanetSlot
                key={planet.id}
                planet={planet}
                isSelected={planet.id === currentPlanetId}
                onSelect={() => onSelectPlanet(planet.id)}
                slotNumber={index + 1}
              />
            ))}
          </div>
        </div>

        {/* ============================================
            NAVIGATION
            ============================================ */}
        <div className="flex-1 overflow-y-auto p-2 border-b border-cyan-500/20">
          <h3
            className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-1"
            style={{
              color: '#00d4ff',
              textShadow: '0 0 8px rgba(0, 212, 255, 0.5)',
            }}
          >
            NAVIGATION
          </h3>

          <div className="space-y-1">
            {navigationItems.map((item) => (
              <NavButton
                key={item.scene}
                item={item}
                isActive={currentScene === item.scene}
                onClick={() => onNavigateScene(item.scene)}
              />
            ))}
          </div>
        </div>

        {/* ============================================
            RESOURCE GAUGES
            ============================================ */}
        <div className="p-3 border-b border-cyan-500/20">
          <h3
            className="text-[10px] font-semibold uppercase tracking-wider mb-2"
            style={{
              color: '#00d4ff',
              textShadow: '0 0 8px rgba(0, 212, 255, 0.5)',
            }}
          >
            RESOURCES
          </h3>

          <div className="space-y-2">
            <ResourceGauge
              label="Metal"
              value={resources.metal}
              color="#cccccc"
              icon="⬡"
            />
            <ResourceGauge
              label="Crystal"
              value={resources.crystal}
              color="#77bbff"
              icon="💎"
            />
            <ResourceGauge
              label="Deuterium"
              value={resources.deuterium}
              color="#00cc99"
              icon="⚗️"
            />
            <ResourceGauge
              label="Energy"
              value={resources.energy.current}
              max={resources.energy.max}
              color={energyPercentage < 30 ? '#ff4444' : '#ffcc00'}
              icon="⚡"
            />
          </div>
        </div>

        {/* ============================================
            CONSTRUCTION TIMERS
            ============================================ */}
        {constructions.length > 0 && (
          <div className="p-2 border-b border-cyan-500/20">
            <h3
              className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-1"
              style={{
                color: '#ffa500',
                textShadow: '0 0 8px rgba(255, 165, 0, 0.5)',
              }}
            >
              IN PROGRESS
            </h3>
            <div className="space-y-1">
              {constructions.slice(0, 3).map((construction, index) => (
                <ConstructionTimer key={index} construction={construction} />
              ))}
            </div>
          </div>
        )}

        {/* ============================================
            ALERTS
            ============================================ */}
        {alerts.length > 0 && (
          <div className="p-2">
            <h3
              className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-1"
              style={{
                color: alerts.some(a => a.type === 'attack') ? '#ff4444' : '#00d4ff',
                textShadow: alerts.some(a => a.type === 'attack')
                  ? '0 0 8px rgba(255, 68, 68, 0.5)'
                  : '0 0 8px rgba(0, 212, 255, 0.5)',
              }}
            >
              ALERTS
            </h3>
            <div className="space-y-1 max-h-[100px] overflow-y-auto">
              <AnimatePresence>
                {alerts.slice(0, 3).map((alert, index) => (
                  <AlertItem key={index} alert={alert} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ============================================
            FOOTER DECORATION
            ============================================ */}
        <div className="mt-auto p-2">
          <div
            className="h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent)',
            }}
          />
          <div className="flex items-center justify-center gap-2 mt-2">
            <motion.div
              className="w-1 h-1 rounded-full bg-cyan-500/50"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-1 h-1 rounded-full bg-cyan-500/50"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            />
            <motion.div
              className="w-1 h-1 rounded-full bg-cyan-500/50"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
            />
          </div>
        </div>
      </CockpitFrame>
    </motion.aside>
  )
})

export default CockpitSidebar
