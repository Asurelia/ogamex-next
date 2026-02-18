'use client'

import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'

// ============================================================================
// TYPES
// ============================================================================

type TransitionType = 'hyperspace' | 'zoom' | 'fade'

interface NavItem {
  href: string
  key: string
  icon: React.FC<{ className?: string; active?: boolean }>
  category: 'main' | 'empire' | 'military' | 'social'
  transitionType: TransitionType
}

interface Navigation3DProps {
  onNavigate?: (href: string) => void
  onTransitionStart?: () => void
  onTransitionEnd?: () => void
}

interface HyperspaceState {
  active: boolean
  phase: 'idle' | 'accelerating' | 'jumping' | 'arriving'
}

// ============================================================================
// ICONS - Holographic space-themed icons with active states
// ============================================================================

function OverviewIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <circle cx="12" cy="12" r="8" />
      <ellipse cx="12" cy="12" rx="8" ry="3" transform="rotate(-30 12 12)" />
      {active && <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.5" />}
    </svg>
  )
}

function DashboardIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <rect x="3" y="3" width="7" height="7" rx="1" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.3 : 1} />
      <rect x="14" y="3" width="7" height="7" rx="1" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.2 : 1} />
      <rect x="3" y="14" width="7" height="7" rx="1" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.2 : 1} />
      <rect x="14" y="14" width="7" height="7" rx="1" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.3 : 1} />
    </svg>
  )
}

function ResourcesIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path d="M12 2l-4 8 4 4 4-4-4-8z" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.3 : 1} />
      <path d="M8 10l-4 6 8 6 8-6-4-6" />
      <path d="M12 14v8" opacity="0.5" />
    </svg>
  )
}

function FacilitiesIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <rect x="3" y="10" width="6" height="11" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.2 : 1} />
      <rect x="9" y="5" width="6" height="16" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.3 : 1} />
      <rect x="15" y="12" width="6" height="9" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.2 : 1} />
      <path d="M3 21h18" />
    </svg>
  )
}

function ResearchIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <circle cx="12" cy="12" r="2" fill={active ? 'currentColor' : 'none'} />
      <ellipse cx="12" cy="12" rx="9" ry="4" />
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)" />
    </svg>
  )
}

function ShipyardIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.2 : 1} />
      <path d="M9 21v-6h6v6" />
      <path d="M10 10h4" />
    </svg>
  )
}

function DefenseIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path d="M12 3l8 4v5c0 5.5-3.5 10-8 11-4.5-1-8-5.5-8-11V7l8-4z" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.2 : 1} />
      {active && <path d="M9 12l2 2 4-4" strokeWidth={2} />}
    </svg>
  )
}

function FleetIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path d="M12 3L4 15h4l-2 6 10-10h-4l2-8z" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.3 : 1} />
      <path d="M12 3L4 15h4l-2 6 10-10h-4l2-8z" />
    </svg>
  )
}

function GalaxyIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" fill={active ? 'currentColor' : 'none'} />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10" strokeDasharray={active ? "0" : "3 2"} />
      <path d="M12 7c-3 0-5 2-5 5s2 5 5 5" opacity="0.7" />
      <path d="M12 17c3 0 5-2 5-5s-2-5-5-5" opacity="0.7" />
    </svg>
  )
}

function MessagesIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <rect x="3" y="5" width="18" height="14" rx="2" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.2 : 1} />
      <path d="M3 7l9 6 9-6" />
      {active && <circle cx="18" cy="7" r="3" fill="#ff4444" stroke="none" />}
    </svg>
  )
}

function AllianceIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <circle cx="12" cy="7" r="3" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.3 : 1} />
      <circle cx="5" cy="17" r="2.5" opacity="0.7" />
      <circle cx="19" cy="17" r="2.5" opacity="0.7" />
      <path d="M12 10v4m-4 3l4-3 4 3" />
    </svg>
  )
}

function HighscoreIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path d="M12 2l3 6 6 1-4.5 4 1 6.5L12 17l-5.5 2.5 1-6.5L3 9l6-1 3-6z" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.3 : 1} />
    </svg>
  )
}

function TacticalIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="6" strokeDasharray="4 2" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  )
}

function EspionageIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <circle cx="12" cy="10" r="6" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.2 : 1} />
      <path d="M12 16v4" />
      <path d="M8 20h8" />
      <circle cx="12" cy="10" r="2" fill={active ? 'currentColor' : 'none'} />
      <path d="M3 12c2-3 5-6 9-6s7 3 9 6" opacity="0.5" />
      <path d="M3 12c2 3 5 6 9 6s7-3 9-6" opacity="0.5" />
    </svg>
  )
}

function RecycleIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path d="M12 3l4 6H8l4-6z" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.3 : 1} />
      <path d="M20 12l-4 6 4-2" />
      <path d="M4 12l4 6-4-2" />
      <path d="M12 21l-4-6h8l-4 6z" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.3 : 1} />
      <circle cx="12" cy="12" r="3" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.5 : 1} />
    </svg>
  )
}

function MarketplaceIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path d="M3 3h18l-2 9H5L3 3z" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.2 : 1} />
      <path d="M5 12l-1 5a2 2 0 002 2h12a2 2 0 002-2l-1-5" />
      <circle cx="8" cy="21" r="1.5" fill={active ? 'currentColor' : 'none'} />
      <circle cx="16" cy="21" r="1.5" fill={active ? 'currentColor' : 'none'} />
      {active && <path d="M10 8h4M12 6v4" strokeWidth={2} />}
    </svg>
  )
}

function InventoryIcon({ className = 'w-5 h-5', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <rect x="3" y="5" width="18" height="14" rx="2" fill={active ? 'currentColor' : 'none'} opacity={active ? 0.2 : 1} />
      <path d="M3 9h18" />
      <path d="M9 9v10" />
      <path d="M15 9v10" />
      <rect x="5" y="11" width="2" height="2" fill="currentColor" opacity="0.5" />
      <rect x="11" y="11" width="2" height="2" fill="currentColor" opacity="0.5" />
      <rect x="17" y="11" width="2" height="2" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

// Menu icons
function MenuIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CloseIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

// ============================================================================
// NAVIGATION ITEMS
// ============================================================================

const navItems: NavItem[] = [
  { href: '/game/overview', key: 'overview', icon: OverviewIcon, category: 'main', transitionType: 'zoom' },
  { href: '/game/dashboard', key: 'dashboard', icon: DashboardIcon, category: 'main', transitionType: 'fade' },
  { href: '/game/galaxy', key: 'galaxy', icon: GalaxyIcon, category: 'main', transitionType: 'hyperspace' },
  { href: '/game/resources', key: 'resources', icon: ResourcesIcon, category: 'empire', transitionType: 'fade' },
  { href: '/game/facilities', key: 'facilities', icon: FacilitiesIcon, category: 'empire', transitionType: 'fade' },
  { href: '/game/research', key: 'research', icon: ResearchIcon, category: 'empire', transitionType: 'zoom' },
  { href: '/game/shipyard', key: 'shipyard', icon: ShipyardIcon, category: 'military', transitionType: 'zoom' },
  { href: '/game/defense', key: 'defense', icon: DefenseIcon, category: 'military', transitionType: 'fade' },
  { href: '/game/fleet', key: 'fleet', icon: FleetIcon, category: 'military', transitionType: 'zoom' },
  { href: '/game/tactical-map', key: 'tacticalMap', icon: TacticalIcon, category: 'military', transitionType: 'zoom' },
  { href: '/game/espionage', key: 'espionage', icon: EspionageIcon, category: 'military', transitionType: 'fade' },
  { href: '/game/recycle', key: 'recycle', icon: RecycleIcon, category: 'military', transitionType: 'fade' },
  { href: '/game/inventory', key: 'inventory', icon: InventoryIcon, category: 'empire', transitionType: 'fade' },
  { href: '/game/marketplace', key: 'marketplace', icon: MarketplaceIcon, category: 'empire', transitionType: 'fade' },
  { href: '/game/messages', key: 'messages', icon: MessagesIcon, category: 'social', transitionType: 'fade' },
  { href: '/game/alliance', key: 'alliance', icon: AllianceIcon, category: 'social', transitionType: 'fade' },
  { href: '/game/highscore', key: 'highscore', icon: HighscoreIcon, category: 'social', transitionType: 'fade' },
]

// Category colors and glow effects
const categoryColors: Record<string, { bg: string; border: string; glow: string; glowColor: string }> = {
  main: { bg: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/30', glowColor: '#00ffff' },
  empire: { bg: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30', glow: 'shadow-amber-500/30', glowColor: '#ffaa00' },
  military: { bg: 'from-red-500/20 to-rose-500/20', border: 'border-red-500/30', glow: 'shadow-red-500/30', glowColor: '#ff4444' },
  social: { bg: 'from-purple-500/20 to-violet-500/20', border: 'border-purple-500/30', glow: 'shadow-purple-500/30', glowColor: '#aa44ff' },
}

// ============================================================================
// HYPERSPACE OVERLAY - Full-screen transition effect
// ============================================================================

const HyperspaceOverlay = memo(function HyperspaceOverlay({
  state
}: {
  state: HyperspaceState
}) {
  if (!state.active) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Star streaks effect */}
        <div className="absolute inset-0">
          {Array.from({ length: 80 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-white rounded-full"
              style={{
                width: Math.random() * 3 + 1,
                height: 2,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              initial={{
                scaleX: 1,
                opacity: 0.3,
                x: 0
              }}
              animate={state.phase === 'jumping' ? {
                scaleX: [1, 50, 100],
                opacity: [0.3, 0.9, 0],
                x: [0, -200, -600],
              } : state.phase === 'accelerating' ? {
                scaleX: [1, 5, 15],
                opacity: [0.3, 0.6, 0.8],
              } : {
                scaleX: [15, 5, 1],
                opacity: [0.8, 0.5, 0],
              }}
              transition={{
                duration: state.phase === 'jumping' ? 0.6 : 0.4,
                delay: Math.random() * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* Center white flash on jump */}
        {state.phase === 'jumping' && (
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.35, delay: 0.25 }}
          />
        )}

        {/* Blue radial overlay */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,100,255,0.1) 0%, rgba(0,50,150,0.4) 50%, rgba(0,20,60,0.6) 100%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: state.phase === 'jumping' ? 1 : 0.6 }}
          transition={{ duration: 0.3 }}
        />

        {/* Vignette effect */}
        <div className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.8) 100%)',
          }}
        />
      </motion.div>
    </AnimatePresence>
  )
})

// ============================================================================
// ZOOM OVERLAY - Radial zoom transition
// ============================================================================

const ZoomOverlay = memo(function ZoomOverlay({
  active
}: {
  active: boolean
}) {
  if (!active) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Radial blur/zoom effect */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.9) 100%)',
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.2, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        />

        {/* Speed lines from center */}
        <div className="absolute inset-0 flex items-center justify-center">
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
              style={{
                width: '200%',
                height: 1,
                transformOrigin: 'center',
                transform: `rotate(${i * 22.5}deg)`,
              }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{
                scaleX: [0, 1, 0],
                opacity: [0, 0.7, 0]
              }}
              transition={{
                duration: 0.4,
                delay: i * 0.015,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
})

// ============================================================================
// HOLOGRAPHIC ICON WRAPPER
// ============================================================================

const HoloIcon = memo(function HoloIcon({
  children,
  isActive,
  glowColor = '#00ffff'
}: {
  children: React.ReactNode
  isActive: boolean
  glowColor?: string
}) {
  return (
    <div className="relative">
      {/* Pulsing glow behind active icon */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full blur-md"
          style={{ backgroundColor: glowColor }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {/* Icon */}
      <div className={`
        relative z-10 w-6 h-6 flex items-center justify-center
        transition-all duration-300
        ${isActive ? 'text-white' : 'text-gray-400'}
      `}>
        {children}
      </div>
    </div>
  )
})

// ============================================================================
// NAV ITEM COMPONENT - For floating bar
// ============================================================================

interface NavItemComponentProps {
  item: NavItem
  isActive: boolean
  onClick?: () => void
  showLabel?: boolean
}

const NavItemComponent = memo(function NavItemComponent({
  item,
  isActive,
  onClick,
  showLabel = false,
}: NavItemComponentProps) {
  const t = useTranslations('nav')
  const [isHovered, setIsHovered] = useState(false)
  const colors = categoryColors[item.category]
  const Icon = item.icon

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative flex flex-col items-center gap-1 p-2 rounded-xl
        transition-all duration-200 group
        ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}
      `}
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Icon with holographic effect */}
      <HoloIcon isActive={isActive} glowColor={colors.glowColor}>
        <Icon className="w-5 h-5" active={isActive} />
      </HoloIcon>

      {/* Label (optional) */}
      {showLabel && (
        <span className={`
          text-[10px] uppercase tracking-wider transition-colors duration-200
          ${isActive ? 'text-white font-semibold' : 'text-gray-500'}
        `}>
          {t(item.key)}
        </span>
      )}

      {/* Active indicator bar */}
      {isActive && (
        <motion.div
          className="absolute -bottom-0.5 left-1/2 w-6 h-0.5 rounded-full -translate-x-1/2"
          style={{ backgroundColor: colors.glowColor }}
          layoutId="floatingNavIndicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {/* Tooltip on hover */}
      <AnimatePresence>
        {isHovered && !showLabel && (
          <motion.div
            className="absolute -top-10 left-1/2 -translate-x-1/2 z-50"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
          >
            <div className={`
              px-2 py-1 rounded-md backdrop-blur-md whitespace-nowrap
              bg-black/80 border border-white/10 text-white text-xs font-medium
            `}>
              {t(item.key)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
})

// ============================================================================
// MOBILE NAV ITEM
// ============================================================================

const MobileNavItem = memo(function MobileNavItem({
  item,
  isActive,
  onClick,
}: NavItemComponentProps) {
  const t = useTranslations('nav')
  const colors = categoryColors[item.category]
  const Icon = item.icon

  return (
    <motion.button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-lg
        transition-all duration-200
        ${isActive
          ? `bg-gradient-to-r ${colors.bg} border ${colors.border}`
          : 'hover:bg-white/5'
        }
      `}
      whileTap={{ scale: 0.98 }}
    >
      <HoloIcon isActive={isActive} glowColor={colors.glowColor}>
        <Icon className="w-5 h-5" active={isActive} />
      </HoloIcon>
      <span className={`
        text-sm font-medium transition-colors
        ${isActive ? 'text-white' : 'text-gray-400'}
      `}>
        {t(item.key)}
      </span>
    </motion.button>
  )
})

// ============================================================================
// MOBILE MENU DRAWER
// ============================================================================

const MobileMenu = memo(function MobileMenu({
  isOpen,
  onClose,
  currentPath,
  onNavigate,
}: {
  isOpen: boolean
  onClose: () => void
  currentPath: string
  onNavigate: (item: NavItem) => void
}) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const isActive = useCallback((href: string) => {
    if (href === '/game/overview') return currentPath === '/game' || currentPath === '/game/overview'
    return currentPath === href || currentPath.startsWith(href + '/')
  }, [currentPath])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed top-0 right-0 z-[95] h-full w-72
                       bg-gradient-to-b from-slate-900/98 to-slate-950/98
                       backdrop-blur-xl border-l border-cyan-500/20"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-transparent bg-clip-text
                             bg-gradient-to-r from-cyan-400 to-purple-500">
                Navigation
              </h2>
              <motion.button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                whileTap={{ scale: 0.9 }}
              >
                <CloseIcon className="w-5 h-5 text-gray-400" />
              </motion.button>
            </div>

            {/* Nav items */}
            <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-100px)]">
              {navItems.map((item) => (
                <MobileNavItem
                  key={item.key}
                  item={item}
                  isActive={isActive(item.href)}
                  onClick={() => {
                    onNavigate(item)
                    onClose()
                  }}
                />
              ))}
            </nav>

            {/* Decorative gradient at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-24
                            bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})

// ============================================================================
// SERVER TIME COMPONENT
// ============================================================================

function ServerTime() {
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="text-xs font-mono text-white/50 tabular-nums hidden sm:block">
      {time}
    </div>
  )
}

// ============================================================================
// USER MENU COMPONENT
// ============================================================================

const UserMenu = memo(function UserMenu() {
  const router = useRouter()
  const { user, reset } = useGameStore()
  const t = useTranslations('auth')
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = useCallback(async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    reset()
    router.push('/')
    router.refresh()
  }, [reset, router])

  if (!user) return null

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg
                   bg-black/30 border border-white/10 backdrop-blur-md
                   hover:bg-white/5 hover:border-white/20 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600
                        flex items-center justify-center text-xs font-bold text-white">
          {user.username?.charAt(0).toUpperCase() || '?'}
        </div>
        <span className="text-sm font-medium text-white/80 hidden sm:inline">
          {user.username}
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute right-0 top-full mt-2 w-40 py-2 rounded-lg
                       bg-black/90 border border-white/10 backdrop-blur-xl shadow-xl z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-sm text-white/70
                         hover:text-white hover:bg-white/5 transition-colors"
            >
              {t('logout')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

// ============================================================================
// MAIN NAVIGATION 3D COMPONENT
// ============================================================================

export const Navigation3D = memo(function Navigation3D({
  onNavigate,
  onTransitionStart,
  onTransitionEnd,
}: Navigation3DProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { toggleSidebar, isSidebarOpen } = useGameStore()

  // State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [hyperspaceState, setHyperspaceState] = useState<HyperspaceState>({
    active: false,
    phase: 'idle',
  })
  const [zoomActive, setZoomActive] = useState(false)
  const isTransitioningRef = useRef(false)

  // Check if a nav item is active
  const isActive = useCallback((href: string) => {
    if (href === '/game') {
      return pathname === '/game' || pathname === '/game/overview'
    }
    return pathname === href || pathname.startsWith(href + '/')
  }, [pathname])

  // Handle navigation with animated transitions
  const handleNavigate = useCallback((item: NavItem) => {
    if (isTransitioningRef.current) return
    if (pathname === item.href) return

    isTransitioningRef.current = true
    onTransitionStart?.()
    onNavigate?.(item.href)

    // Apply transition based on type
    if (item.transitionType === 'hyperspace') {
      // Hyperspace jump sequence
      setHyperspaceState({ active: true, phase: 'accelerating' })

      setTimeout(() => {
        setHyperspaceState({ active: true, phase: 'jumping' })
      }, 350)

      setTimeout(() => {
        router.push(item.href)
        setHyperspaceState({ active: true, phase: 'arriving' })
      }, 700)

      setTimeout(() => {
        setHyperspaceState({ active: false, phase: 'idle' })
        isTransitioningRef.current = false
        onTransitionEnd?.()
      }, 1100)

    } else if (item.transitionType === 'zoom') {
      // Zoom transition
      setZoomActive(true)

      setTimeout(() => {
        router.push(item.href)
      }, 200)

      setTimeout(() => {
        setZoomActive(false)
        isTransitioningRef.current = false
        onTransitionEnd?.()
      }, 500)

    } else {
      // Simple fade (handled by Next.js)
      router.push(item.href)
      setTimeout(() => {
        isTransitioningRef.current = false
        onTransitionEnd?.()
      }, 150)
    }
  }, [pathname, router, onNavigate, onTransitionStart, onTransitionEnd])

  return (
    <>
      {/* Transition Overlays */}
      <HyperspaceOverlay state={hyperspaceState} />
      <ZoomOverlay active={zoomActive} />

      {/* Top Header Bar */}
      <header className="relative z-40">
        <nav className="bg-black/50 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between px-3 py-2">
            {/* Left - Logo & sidebar toggle */}
            <div className="flex items-center gap-3">
              <motion.button
                onClick={toggleSidebar}
                className="p-2 rounded-lg bg-black/30 border border-white/10
                           hover:bg-white/5 hover:border-white/20 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Toggle sidebar"
              >
                <motion.div
                  animate={{ rotate: isSidebarOpen ? 0 : 180 }}
                  transition={{ duration: 0.3 }}
                >
                  <MenuIcon className="w-5 h-5 text-white/70" />
                </motion.div>
              </motion.button>

              <Link href="/game" className="flex items-center">
                <motion.span
                  className="text-xl font-bold bg-clip-text text-transparent
                             bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500"
                  whileHover={{ scale: 1.05 }}
                >
                  OGameX
                </motion.span>
              </Link>
            </div>

            {/* Right - Time, user */}
            <div className="flex items-center gap-3">
              <ServerTime />
              <UserMenu />
            </div>
          </div>
        </nav>
      </header>

      {/* Floating Bottom Navigation Bar (Desktop) */}
      <nav className={`
        hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        px-3 py-2 rounded-2xl
        bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90
        backdrop-blur-xl border border-cyan-500/20
        shadow-[0_0_40px_rgba(0,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]
      `}>
        {/* Animated holographic sheen */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Nav items */}
        <div className="relative flex items-center gap-0.5">
          {navItems.map((item, index) => {
            // Add visual separators between categories
            const prevItem = navItems[index - 1]
            const showSeparator = prevItem && prevItem.category !== item.category

            return (
              <div key={item.key} className="flex items-center">
                {showSeparator && (
                  <div className="w-px h-6 bg-white/10 mx-1" />
                )}
                <NavItemComponent
                  item={item}
                  isActive={isActive(item.href)}
                  onClick={() => handleNavigate(item)}
                />
              </div>
            )
          })}
        </div>
      </nav>

      {/* Mobile Floating Action Button */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <motion.button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`
            p-4 rounded-full
            bg-gradient-to-br from-cyan-500/30 to-purple-500/30
            backdrop-blur-xl border border-cyan-500/40
            shadow-[0_0_30px_rgba(0,255,255,0.25)]
          `}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <MenuIcon className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      {/* Mobile Menu Drawer */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentPath={pathname}
        onNavigate={handleNavigate}
      />
    </>
  )
})

export default Navigation3D
