'use client'

import { memo, useMemo, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { HolographicTooltip } from '@/components/ui/HolographicTooltip'
import { formatNumber, formatCoordinatesObj, formatTimeRemaining } from '@/lib/utils/format'

// Planet types for visuals
type VisualPlanetType = 'desert' | 'dry' | 'gas' | 'ice' | 'jungle' | 'normal' | 'water'

// ============================================================================
// TYPES
// ============================================================================

export interface PlanetCoordinates {
  galaxy: number
  system: number
  position: number
}

export interface PlanetResources {
  metal: number
  crystal: number
  deuterium: number
}

export interface ProductionRates {
  metalPerHour: number
  crystalPerHour: number
  deuteriumPerHour: number
}

export interface StorageCapacity {
  metalMax: number
  crystalMax: number
  deuteriumMax: number
}

export interface FleetInTransit {
  id: string
  missionType: 'attack' | 'transport' | 'deploy' | 'return' | 'espionage'
  arrivalTime: Date
  shipCount: number
}

export interface Planet {
  id: string
  name: string
  coordinates: PlanetCoordinates
  resources: PlanetResources
  type: VisualPlanetType
  variant?: number
  // Optional extended properties with defaults
  production?: ProductionRates
  storage?: StorageCapacity
  fleetsInTransit?: FleetInTransit[]
  isMainPlanet?: boolean
  hasConstruction?: boolean
  constructionEndTime?: Date
  isUnderAttack?: boolean
  attackArrivalTime?: Date
}

interface PlanetSidebarProps {
  planets: Planet[]
  selectedPlanetId: string | null
  onPlanetSelect: (planetId: string) => void
  collapsed?: boolean
}

interface PlanetCardProps {
  planet: Planet
  isSelected: boolean
  onSelect: () => void
  collapsed?: boolean
  index: number
}

// ============================================================================
// UTILITY FUNCTIONS (imported from @/lib/utils/format)
// ============================================================================

// Alias formatCoordinatesObj for use with PlanetCoordinates
const formatCoordinates = (coords: PlanetCoordinates): string => formatCoordinatesObj(coords)

/**
 * Get mission type display name
 */
function getMissionTypeName(type: FleetInTransit['missionType']): string {
  const names: Record<FleetInTransit['missionType'], string> = {
    attack: 'Attack',
    transport: 'Transport',
    deploy: 'Deploy',
    return: 'Return',
    espionage: 'Espionage',
  }
  return names[type]
}

/**
 * Get mission type color
 */
function getMissionTypeColor(type: FleetInTransit['missionType']): string {
  const colors: Record<FleetInTransit['missionType'], string> = {
    attack: '#ff4444',
    transport: '#44ff88',
    deploy: '#4488ff',
    return: '#ffaa44',
    espionage: '#aa44ff',
  }
  return colors[type]
}

// ============================================================================
// RESOURCE ICONS
// ============================================================================

function MetalIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  )
}

function CrystalIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l-8 10 8 10 8-10-8-10z"
            stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  )
}

function DeuteriumIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  )
}

function StorageIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="6" rx="1" />
      <rect x="3" y="9" width="18" height="6" rx="1" />
      <rect x="3" y="15" width="18" height="6" rx="1" />
      <circle cx="17" cy="6" r="1" fill="currentColor" />
      <circle cx="17" cy="12" r="1" fill="currentColor" />
      <circle cx="17" cy="18" r="1" fill="currentColor" />
    </svg>
  )
}

function FleetIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L4 12l8 10 8-10L12 2zm0 3l5 7-5 6.5L7 12l5-7z" />
    </svg>
  )
}

function ConstructionIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function CrownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3l3 6 6-3-2 9H5L3 6l6 3 3-6zm-6 15h12v2H6v-2z" />
    </svg>
  )
}

function AlertIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z" />
    </svg>
  )
}

// ============================================================================
// MINI PLANET IMAGE VIEW (Simple image instead of 3D)
// ============================================================================

/**
 * Get planet image path based on type and variant
 */
function getPlanetImagePath(type: VisualPlanetType, variant: number = 1): string {
  const safeVariant = Math.max(1, Math.min(10, variant))
  return `/img/planets/medium/${type}_${safeVariant}.png`
}

const MiniPlanetImageView = memo(function MiniPlanetImageView({
  type,
  variant = 1,
  isHovered = false,
}: {
  type: VisualPlanetType
  variant?: number
  isHovered?: boolean
}) {
  const imagePath = useMemo(() => getPlanetImagePath(type, variant), [type, variant])

  return (
    <motion.div
      className="w-[60px] h-[60px] rounded-full overflow-hidden relative"
      animate={{
        boxShadow: isHovered
          ? '0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(0, 200, 255, 0.2)'
          : '0 0 0 rgba(0, 255, 255, 0)',
      }}
      transition={{ duration: 0.3 }}
    >
      <Image
        src={imagePath}
        alt={`${type} planet`}
        width={60}
        height={60}
        className="w-full h-full object-cover"
      />
    </motion.div>
  )
})

// ============================================================================
// PLANET TOOLTIP CONTENT
// ============================================================================

const PlanetTooltipContent = memo(function PlanetTooltipContent({
  planet,
}: {
  planet: Planet
}) {
  const coordsText = formatCoordinates(planet.coordinates)

  // Default values for optional properties
  const production = planet.production || {
    metalPerHour: 0,
    crystalPerHour: 0,
    deuteriumPerHour: 0,
  }

  const storage = planet.storage || {
    metalMax: 10000,
    crystalMax: 10000,
    deuteriumMax: 10000,
  }

  const fleetsInTransit = planet.fleetsInTransit || []

  return (
    <div className="space-y-3 min-w-[240px]">
      {/* Header: Planet name and coordinates */}
      <div className="flex items-center gap-2">
        {planet.isMainPlanet && (
          <CrownIcon className="w-4 h-4 text-yellow-400" />
        )}
        <div>
          <h4 className="text-sm font-semibold text-cyan-400">{planet.name}</h4>
          <p className="text-xs text-white/60 font-mono">{coordsText}</p>
        </div>
      </div>

      {/* Production rates */}
      <div className="space-y-1">
        <h5 className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
          Production / Hour
        </h5>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center gap-2">
            <MetalIcon className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-300">Metal</span>
          </div>
          <span className="text-xs font-mono text-right text-gray-200">
            +{formatNumber(production.metalPerHour)}
          </span>

          <div className="flex items-center gap-2">
            <CrystalIcon className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-gray-300">Crystal</span>
          </div>
          <span className="text-xs font-mono text-right text-blue-300">
            +{formatNumber(production.crystalPerHour)}
          </span>

          <div className="flex items-center gap-2">
            <DeuteriumIcon className="w-3 h-3 text-cyan-400" />
            <span className="text-xs text-gray-300">Deuterium</span>
          </div>
          <span className="text-xs font-mono text-right text-cyan-300">
            +{formatNumber(production.deuteriumPerHour)}
          </span>
        </div>
      </div>

      {/* Storage capacity */}
      <div className="space-y-1 pt-2 border-t border-white/10">
        <h5 className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
          Storage Capacity
        </h5>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <MetalIcon className="w-3 h-3 text-gray-400 mx-auto mb-0.5" />
            <span className="text-[10px] font-mono text-gray-300 block">
              {formatNumber(storage.metalMax)}
            </span>
          </div>
          <div className="text-center">
            <CrystalIcon className="w-3 h-3 text-blue-400 mx-auto mb-0.5" />
            <span className="text-[10px] font-mono text-blue-300 block">
              {formatNumber(storage.crystalMax)}
            </span>
          </div>
          <div className="text-center">
            <DeuteriumIcon className="w-3 h-3 text-cyan-400 mx-auto mb-0.5" />
            <span className="text-[10px] font-mono text-cyan-300 block">
              {formatNumber(storage.deuteriumMax)}
            </span>
          </div>
        </div>
      </div>

      {/* Fleets in transit */}
      {fleetsInTransit.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-white/10">
          <h5 className="text-[10px] uppercase tracking-wider text-white/40 mb-1 flex items-center gap-1">
            <FleetIcon className="w-3 h-3" />
            Fleets in Transit ({fleetsInTransit.length})
          </h5>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {fleetsInTransit.slice(0, 3).map((fleet) => (
              <div
                key={fleet.id}
                className="flex items-center justify-between text-xs"
              >
                <span style={{ color: getMissionTypeColor(fleet.missionType) }}>
                  {getMissionTypeName(fleet.missionType)}
                </span>
                <span className="font-mono text-white/70">
                  {fleet.shipCount} ships - {formatTimeRemaining(fleet.arrivalTime)}
                </span>
              </div>
            ))}
            {fleetsInTransit.length > 3 && (
              <p className="text-[10px] text-white/40 italic">
                +{fleetsInTransit.length - 3} more...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Construction in progress */}
      {planet.hasConstruction && planet.constructionEndTime && (
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <ConstructionIcon className="w-4 h-4 text-orange-400" />
          </motion.div>
          <div className="flex-1">
            <span className="text-xs text-orange-400">Construction in progress</span>
            <span className="text-[10px] text-white/50 block font-mono">
              Completes in {formatTimeRemaining(planet.constructionEndTime)}
            </span>
          </div>
        </div>
      )}

      {/* Under attack warning */}
      {planet.isUnderAttack && planet.attackArrivalTime && (
        <motion.div
          className="flex items-center gap-2 pt-2 border-t border-red-500/30 bg-red-500/10 -mx-3 px-3 py-1.5 -mb-3 rounded-b-lg"
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          <AlertIcon className="w-4 h-4 text-red-500" />
          <div className="flex-1">
            <span className="text-xs text-red-400 font-semibold">UNDER ATTACK!</span>
            <span className="text-[10px] text-red-300/70 block font-mono">
              Impact in {formatTimeRemaining(planet.attackArrivalTime)}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  )
})

// ============================================================================
// STATUS INDICATORS COMPONENT
// ============================================================================

const StatusIndicators = memo(function StatusIndicators({
  planet,
}: {
  planet: Planet
}) {
  return (
    <div className="absolute -top-1 -right-1 flex gap-0.5">
      {/* Main planet indicator */}
      {planet.isMainPlanet && (
        <motion.div
          className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <CrownIcon className="w-3 h-3 text-yellow-400" />
        </motion.div>
      )}

      {/* Construction indicator */}
      {planet.hasConstruction && (
        <motion.div
          className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <ConstructionIcon className="w-3 h-3 text-orange-400" />
        </motion.div>
      )}

      {/* Attack warning indicator */}
      {planet.isUnderAttack && (
        <motion.div
          className="w-5 h-5 rounded-full bg-red-500/30 flex items-center justify-center"
          animate={{
            scale: [1, 1.2, 1],
            backgroundColor: ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.6)', 'rgba(239, 68, 68, 0.3)'],
          }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          <AlertIcon className="w-3 h-3 text-red-500" />
        </motion.div>
      )}
    </div>
  )
})

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const cardVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24,
    },
  },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
}

const selectionPulseVariants = {
  initial: { opacity: 0, scale: 1 },
  selected: {
    opacity: [0, 0.5, 0],
    scale: [1, 1.05, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
}

// ============================================================================
// PLANET CARD COMPONENT
// ============================================================================

const PlanetCard = memo(function PlanetCard({
  planet,
  isSelected,
  onSelect,
  collapsed = false,
  index,
}: PlanetCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const coordsText = useMemo(
    () => formatCoordinates(planet.coordinates),
    [planet.coordinates]
  )

  // Staggered delay for animation
  const staggerDelay = index * 0.05

  // Collapsed view
  if (collapsed) {
    return (
      <HolographicTooltip
        title={planet.name}
        content={<PlanetTooltipContent planet={planet} />}
        position="right"
      >
        <motion.button
          onClick={onSelect}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          initial={{ opacity: 0, x: -20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 24,
            delay: staggerDelay,
          }}
          className={`
            relative w-full p-2 rounded-lg overflow-hidden
            bg-black/40 backdrop-blur-md border border-white/10
            ${isSelected ? 'border-cyan-500/50' : ''}
            ${planet.isUnderAttack ? 'border-red-500/50' : ''}
          `}
          title={`${planet.name} ${coordsText}`}
        >
          {/* Background glow effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              background: isHovered
                ? 'radial-gradient(circle at center, rgba(0, 255, 255, 0.15) 0%, transparent 70%)'
                : 'radial-gradient(circle at center, rgba(0, 255, 255, 0) 0%, transparent 70%)',
            }}
            transition={{ duration: 0.3 }}
          />

          {/* Selection pulse effect */}
          {isSelected && (
            <motion.div
              className="absolute inset-0 rounded-lg border-2 border-cyan-500 pointer-events-none"
              animate={{
                opacity: [0, 0.5, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}

          {/* Attack border animation */}
          {planet.isUnderAttack && (
            <motion.div
              className="absolute inset-0 rounded-lg border-2 border-red-500 pointer-events-none"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}

          <div className="relative flex justify-center">
            <MiniPlanetImageView type={planet.type} variant={planet.variant} isHovered={isHovered} />
            <StatusIndicators planet={planet} />
          </div>
        </motion.button>
      </HolographicTooltip>
    )
  }

  // Expanded view
  return (
    <HolographicTooltip
      title={planet.name}
      content={<PlanetTooltipContent planet={planet} />}
      position="right"
    >
      <motion.button
        onClick={onSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        whileTap="tap"
        className={`
          relative w-full p-3 text-left rounded-lg overflow-hidden
          bg-black/40 backdrop-blur-md border border-white/10
          ${isSelected ? 'border-cyan-500/50' : ''}
          ${planet.isUnderAttack ? 'border-red-500/50' : ''}
        `}
      >
        {/* Background gradient on hover */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: isHovered
              ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.08) 0%, rgba(0, 100, 255, 0.05) 50%, transparent 100%)'
              : 'linear-gradient(135deg, rgba(0, 255, 255, 0) 0%, transparent 100%)',
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Selection pulse effect */}
        {isSelected && (
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-cyan-500 pointer-events-none"
            variants={selectionPulseVariants}
            initial="initial"
            animate="selected"
          />
        )}

        {/* Attack border animation */}
        {planet.isUnderAttack && (
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-red-500 pointer-events-none"
            animate={{
              opacity: [0.3, 1, 0.3],
              boxShadow: [
                '0 0 10px rgba(255, 0, 0, 0.3)',
                '0 0 20px rgba(255, 0, 0, 0.6)',
                '0 0 10px rgba(255, 0, 0, 0.3)',
              ],
            }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}

        <div className="relative flex gap-3">
          {/* Mini 3D Planet View */}
          <div className="relative flex-shrink-0">
            <MiniPlanetImageView type={planet.type} variant={planet.variant} isHovered={isHovered} />
            <StatusIndicators planet={planet} />
          </div>

          {/* Planet Info */}
          <div className="flex-1 min-w-0">
            {/* Name and Coordinates */}
            <div className="mb-2">
              <div className="flex items-center gap-1.5">
                {planet.isMainPlanet && (
                  <CrownIcon className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                )}
                <h3 className="text-sm font-semibold text-white truncate">
                  {planet.name}
                </h3>
              </div>
              <p className="text-xs text-cyan-400/80 font-mono">
                {coordsText}
              </p>
            </div>

            {/* Resources */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <MetalIcon className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-300 font-mono">
                  {formatNumber(planet.resources.metal)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <CrystalIcon className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-gray-300 font-mono">
                  {formatNumber(planet.resources.crystal)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <DeuteriumIcon className="w-3 h-3 text-cyan-400" />
                <span className="text-xs text-gray-300 font-mono">
                  {formatNumber(planet.resources.deuterium)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Selection indicator bar with glow */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500"
              initial={{ scaleY: 0, originY: 0.5 }}
              animate={{ scaleY: 1 }}
              exit={{ scaleY: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{
                boxShadow: '0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.4)',
              }}
            />
          )}
        </AnimatePresence>

        {/* Hover glow effect */}
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          animate={{
            boxShadow: isHovered
              ? 'inset 0 0 30px rgba(0, 255, 255, 0.1)'
              : 'inset 0 0 0 rgba(0, 255, 255, 0)',
          }}
          transition={{ duration: 0.3 }}
        />
      </motion.button>
    </HolographicTooltip>
  )
})

// ============================================================================
// PLANET SIDEBAR COMPONENT
// ============================================================================

export function PlanetSidebar({
  planets,
  selectedPlanetId,
  onPlanetSelect,
  collapsed = false,
}: PlanetSidebarProps) {
  // Count planets with active states
  const planetsUnderAttack = planets.filter(p => p.isUnderAttack).length
  const planetsWithConstruction = planets.filter(p => p.hasConstruction).length

  // Sidebar animation variants
  const sidebarVariants = {
    collapsed: { width: '5rem' },
    expanded: { width: '16rem' },
  }

  // Header animation variants
  const headerVariants = {
    initial: { opacity: 0, y: -10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { delay: 0.1, duration: 0.3 },
    },
  }

  // Container animation for staggered children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  }

  return (
    <motion.aside
      variants={sidebarVariants}
      initial={false}
      animate={collapsed ? 'collapsed' : 'expanded'}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`
        flex flex-col h-full overflow-hidden
        bg-black/40 backdrop-blur-md border-r border-white/10
      `}
    >
      {/* Header with holographic styling */}
      <motion.div
        variants={headerVariants}
        initial="initial"
        animate="animate"
        className="relative p-3 border-b border-white/10"
      >
        {/* Header glow line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.5), transparent)',
          }}
        />

        <h2 className={`
          text-sm font-semibold uppercase tracking-wider
          ${collapsed ? 'text-center' : ''}
        `}
        style={{
          color: '#00d4ff',
          textShadow: '0 0 10px rgba(0, 212, 255, 0.3)',
        }}
        >
          {collapsed ? 'P' : 'Planets'}
        </h2>

        {/* Alert indicators in header */}
        {!collapsed && planetsUnderAttack > 0 && (
          <motion.div
            className="flex items-center gap-1 mt-1"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <AlertIcon className="w-3 h-3 text-red-500" />
            <span className="text-[10px] text-red-400">
              {planetsUnderAttack} under attack
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Planet List with staggered animations */}
      <motion.div
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-col gap-1 p-2">
          <AnimatePresence mode="popLayout">
            {planets.map((planet, index) => (
              <PlanetCard
                key={planet.id}
                planet={planet}
                isSelected={planet.id === selectedPlanetId}
                onSelect={() => onPlanetSelect(planet.id)}
                collapsed={collapsed}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Footer with stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative p-3 border-t border-white/10"
      >
        {/* Footer glow line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.3), transparent)',
          }}
        />

        <div className={`${collapsed ? 'text-center' : 'flex items-center justify-between'}`}>
          <p className="text-xs text-white/50">
            {collapsed ? planets.length : `${planets.length} planet${planets.length !== 1 ? 's' : ''}`}
          </p>

          {!collapsed && planetsWithConstruction > 0 && (
            <div className="flex items-center gap-1">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <ConstructionIcon className="w-3 h-3 text-orange-400" />
              </motion.div>
              <span className="text-[10px] text-orange-400/80">
                {planetsWithConstruction} building
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.aside>
  )
}

export default PlanetSidebar
