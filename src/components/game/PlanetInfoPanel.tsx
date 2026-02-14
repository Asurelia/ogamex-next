'use client'

import { memo, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Planet } from '@/types/database'
import { BUILDINGS, SHIPS } from '@/game/constants'
import { formatNumber, formatCoordinates } from '@/lib/utils/format'

// ============================================================================
// TYPES
// ============================================================================

interface PlanetInfoPanelProps {
  planet: Planet | null
  onNavigate: (page: string) => void
  className?: string
}

interface ResourceBarProps {
  label: string
  current: number
  max: number
  perHour: number
  colorClass: string
  iconColor: string
}

interface BuildingInfo {
  key: string
  name: string
  level: number
}

interface ShipInfo {
  key: string
  name: string
  count: number
}

// formatNumber and formatCoordinates imported from @/lib/utils/format

/**
 * Get top buildings by level from planet data
 */
function getTopBuildings(planet: Planet, limit: number = 5): BuildingInfo[] {
  const buildingKeys: { key: keyof Planet; name: string }[] = [
    { key: 'metal_mine', name: 'Metal Mine' },
    { key: 'crystal_mine', name: 'Crystal Mine' },
    { key: 'deuterium_synthesizer', name: 'Deuterium Synthesizer' },
    { key: 'solar_plant', name: 'Solar Plant' },
    { key: 'fusion_plant', name: 'Fusion Reactor' },
    { key: 'metal_storage', name: 'Metal Storage' },
    { key: 'crystal_storage', name: 'Crystal Storage' },
    { key: 'deuterium_tank', name: 'Deuterium Tank' },
    { key: 'robot_factory', name: 'Robotics Factory' },
    { key: 'nanite_factory', name: 'Nanite Factory' },
    { key: 'shipyard', name: 'Shipyard' },
    { key: 'research_lab', name: 'Research Lab' },
    { key: 'terraformer', name: 'Terraformer' },
    { key: 'alliance_depot', name: 'Alliance Depot' },
    { key: 'missile_silo', name: 'Missile Silo' },
    { key: 'space_dock', name: 'Space Dock' },
  ]

  return buildingKeys
    .map(({ key, name }) => ({
      key: key as string,
      name,
      level: planet[key] as number,
    }))
    .filter((b) => b.level > 0)
    .sort((a, b) => b.level - a.level)
    .slice(0, limit)
}

/**
 * Get stationed ships from planet data
 */
function getStationedFleet(planet: Planet): ShipInfo[] {
  const shipKeys: { key: keyof Planet; name: string }[] = [
    { key: 'light_fighter', name: 'Light Fighter' },
    { key: 'heavy_fighter', name: 'Heavy Fighter' },
    { key: 'cruiser', name: 'Cruiser' },
    { key: 'battleship', name: 'Battleship' },
    { key: 'battlecruiser', name: 'Battlecruiser' },
    { key: 'bomber', name: 'Bomber' },
    { key: 'destroyer', name: 'Destroyer' },
    { key: 'deathstar', name: 'Deathstar' },
    { key: 'small_cargo', name: 'Small Cargo' },
    { key: 'large_cargo', name: 'Large Cargo' },
    { key: 'colony_ship', name: 'Colony Ship' },
    { key: 'recycler', name: 'Recycler' },
    { key: 'espionage_probe', name: 'Espionage Probe' },
    { key: 'solar_satellite', name: 'Solar Satellite' },
    { key: 'crawler', name: 'Crawler' },
    { key: 'reaper', name: 'Reaper' },
    { key: 'pathfinder', name: 'Pathfinder' },
  ]

  return shipKeys
    .map(({ key, name }) => ({
      key: key as string,
      name,
      count: planet[key] as number,
    }))
    .filter((s) => s.count > 0)
}

// ============================================================================
// RESOURCE ICONS
// ============================================================================

function MetalIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )
}

function CrystalIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l-8 10 8 10 8-10-8-10z" />
      <path d="M12 2v20" />
      <path d="M4 12h16" />
    </svg>
  )
}

function DeuteriumIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 4v2" />
      <path d="M12 18v2" />
      <path d="M4 12h2" />
      <path d="M18 12h2" />
    </svg>
  )
}

function EnergyIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
    </svg>
  )
}

function BuildingIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="8" width="16" height="14" rx="1" />
      <path d="M12 2l8 6H4l8-6z" />
      <rect x="8" y="12" width="3" height="4" />
      <rect x="13" y="12" width="3" height="4" />
    </svg>
  )
}

function ShipIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L4 10l2 4 6-2 6 2 2-4L12 2z" />
      <path d="M12 12v10" />
      <path d="M8 16l4 2 4-2" />
    </svg>
  )
}

// ============================================================================
// RESOURCE BAR COMPONENT
// ============================================================================

const ResourceBar = memo(function ResourceBar({
  label,
  current,
  max,
  perHour,
  colorClass,
  iconColor,
}: ResourceBarProps) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0
  const isOverflowing = current >= max * 0.9

  const IconComponent = useMemo(() => {
    switch (label.toLowerCase()) {
      case 'metal':
        return MetalIcon
      case 'crystal':
        return CrystalIcon
      case 'deuterium':
        return DeuteriumIcon
      case 'energy':
        return EnergyIcon
      default:
        return MetalIcon
    }
  }, [label])

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconComponent className={`w-4 h-4 ${iconColor}`} />
          <span className="text-xs text-white/70 uppercase tracking-wider">{label}</span>
        </div>
        <span className={`text-xs font-mono ${isOverflowing ? 'text-orange-400' : 'text-white/60'}`}>
          +{formatNumber(perHour)}/h
        </span>
      </div>

      <div className="relative h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Glow effect */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${colorClass} blur-sm opacity-50`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-white font-mono">{formatNumber(current)}</span>
        <span className="text-white/40 font-mono">/ {formatNumber(max)}</span>
      </div>
    </div>
  )
})

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/20">
      <span className="text-cyan-400">{icon}</span>
      <h3 className="text-cyan-400 font-bold text-sm uppercase tracking-wider">{title}</h3>
    </div>
  )
}

// ============================================================================
// ACTION BUTTON COMPONENT
// ============================================================================

const ActionButton = memo(function ActionButton({
  label,
  icon,
  onClick,
  variant = 'primary',
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'accent'
}) {
  const variantClasses = {
    primary: 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 text-cyan-300',
    secondary: 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40 text-purple-300',
    accent: 'bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/40 text-orange-300',
  }

  return (
    <motion.button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        border backdrop-blur-sm transition-all duration-200
        text-xs font-medium uppercase tracking-wider
        ${variantClasses[variant]}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PlanetInfoPanel = memo(function PlanetInfoPanel({
  planet,
  onNavigate,
  className = '',
}: PlanetInfoPanelProps) {
  // Memoized computed values
  const topBuildings = useMemo(
    () => (planet ? getTopBuildings(planet, 5) : []),
    [planet]
  )

  const stationedFleet = useMemo(
    () => (planet ? getStationedFleet(planet) : []),
    [planet]
  )

  const energyBalance = useMemo(
    () => (planet ? planet.energy_max - planet.energy_used : 0),
    [planet]
  )

  const isEnergyDeficit = energyBalance < 0

  // Animation variants
  const panelVariants = {
    hidden: {
      x: 100,
      opacity: 0,
      scale: 0.95,
    },
    visible: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.05,
      },
    },
    exit: {
      x: 100,
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 },
    },
  }

  const childVariants = {
    hidden: { x: 20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 500, damping: 30 },
    },
  }

  return (
    <AnimatePresence mode="wait">
      {planet && (
        <motion.div
          key={planet.id}
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={`
            w-80 max-h-[calc(100vh-2rem)] overflow-y-auto
            bg-black/60 backdrop-blur-xl
            border border-cyan-500/30 rounded-xl
            shadow-lg shadow-cyan-500/10
            scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent
            ${className}
          `}
        >
          {/* ============================================================== */}
          {/* HEADER */}
          {/* ============================================================== */}
          <motion.div
            variants={childVariants}
            className="p-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-transparent"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{planet.name}</h2>
                <p className="text-sm font-mono text-cyan-400">
                  {formatCoordinates(planet.galaxy, planet.system, planet.position)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-white/50 uppercase">Online</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-white/50">
              <span>Diameter: {planet.diameter.toLocaleString()} km</span>
              <span>Fields: {planet.fields_used}/{planet.fields_max}</span>
            </div>
          </motion.div>

          {/* ============================================================== */}
          {/* RESOURCES SECTION */}
          {/* ============================================================== */}
          <motion.div variants={childVariants} className="p-4 border-b border-cyan-500/10">
            <SectionHeader
              title="Resources"
              icon={<MetalIcon className="w-4 h-4" />}
            />

            <div className="space-y-4">
              <ResourceBar
                label="Metal"
                current={planet.metal}
                max={planet.metal_max}
                perHour={planet.metal_per_hour}
                colorClass="bg-gradient-to-r from-gray-500 to-gray-400"
                iconColor="text-gray-400"
              />

              <ResourceBar
                label="Crystal"
                current={planet.crystal}
                max={planet.crystal_max}
                perHour={planet.crystal_per_hour}
                colorClass="bg-gradient-to-r from-blue-600 to-blue-400"
                iconColor="text-blue-400"
              />

              <ResourceBar
                label="Deuterium"
                current={planet.deuterium}
                max={planet.deuterium_max}
                perHour={planet.deuterium_per_hour}
                colorClass="bg-gradient-to-r from-cyan-600 to-cyan-400"
                iconColor="text-cyan-400"
              />

              {/* Energy display (special - no storage bar) */}
              <div className="pt-2 border-t border-cyan-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <EnergyIcon className={`w-4 h-4 ${isEnergyDeficit ? 'text-red-400' : 'text-yellow-400'}`} />
                    <span className="text-xs text-white/70 uppercase tracking-wider">Energy</span>
                  </div>
                  <div className={`text-sm font-mono ${isEnergyDeficit ? 'text-red-400' : 'text-yellow-400'}`}>
                    {isEnergyDeficit ? '' : '+'}{formatNumber(energyBalance)}
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-white/40">
                  <span>Used: {formatNumber(planet.energy_used)}</span>
                  <span>Max: {formatNumber(planet.energy_max)}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ============================================================== */}
          {/* BUILDINGS SECTION */}
          {/* ============================================================== */}
          <motion.div variants={childVariants} className="p-4 border-b border-cyan-500/10">
            <SectionHeader
              title="Top Buildings"
              icon={<BuildingIcon className="w-4 h-4" />}
            />

            {topBuildings.length > 0 ? (
              <div className="space-y-2">
                {topBuildings.map((building, index) => (
                  <motion.div
                    key={building.key}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-cyan-500/20 flex items-center justify-center">
                        <BuildingIcon className="w-3 h-3 text-cyan-400" />
                      </div>
                      <span className="text-sm text-white/80">{building.name}</span>
                    </div>
                    <span className="text-sm font-mono text-cyan-400">Lv.{building.level}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40 italic">No buildings constructed</p>
            )}
          </motion.div>

          {/* ============================================================== */}
          {/* FLEET SECTION */}
          {/* ============================================================== */}
          <motion.div variants={childVariants} className="p-4 border-b border-cyan-500/10">
            <SectionHeader
              title="Stationed Fleet"
              icon={<ShipIcon className="w-4 h-4" />}
            />

            {stationedFleet.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {stationedFleet.map((ship, index) => (
                  <motion.div
                    key={ship.key}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                  >
                    <div className="flex items-center gap-1.5">
                      <ShipIcon className="w-3 h-3 text-purple-400" />
                      <span className="text-xs text-white/70 truncate max-w-[70px]" title={ship.name}>
                        {ship.name.split(' ').map(w => w[0]).join('')}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-purple-400">x{formatNumber(ship.count)}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40 italic">No fleet stationed</p>
            )}
          </motion.div>

          {/* ============================================================== */}
          {/* ACTION BUTTONS */}
          {/* ============================================================== */}
          <motion.div variants={childVariants} className="p-4">
            <SectionHeader
              title="Quick Actions"
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />

            <div className="flex flex-wrap gap-2">
              <ActionButton
                label="Buildings"
                icon={<BuildingIcon className="w-3.5 h-3.5" />}
                onClick={() => onNavigate('buildings')}
                variant="primary"
              />
              <ActionButton
                label="Fleet"
                icon={<ShipIcon className="w-3.5 h-3.5" />}
                onClick={() => onNavigate('fleet')}
                variant="secondary"
              />
              <ActionButton
                label="Send Mission"
                icon={
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                }
                onClick={() => onNavigate('mission')}
                variant="accent"
              />
            </div>
          </motion.div>

          {/* ============================================================== */}
          {/* DECORATIVE ELEMENTS */}
          {/* ============================================================== */}
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/50 rounded-br-xl pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  )
})

export default PlanetInfoPanel
