'use client'

import { memo, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import { useTranslations } from 'next-intl'
import type { PlanetType as VisualPlanetType } from './3d/Planet3D'
import type { Planet } from '@/types/database'
import type { SceneType } from './3d/GameScene3DManager'
import { formatCoordinates } from '@/lib/utils/format'

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

interface GameSidebarProps {
  currentScene: SceneType
  onSceneChange: (scene: SceneType) => void
  onPlanetSelect: (planetId: string) => void
  collapsed?: boolean
}

interface NavCategory {
  id: string
  label: string
  items: NavItem[]
}

interface NavItem {
  scene: SceneType
  icon: string
  labelKey: string
  hasPendingAction?: boolean
}

// ============================================================================
// NAVIGATION CONFIGURATION
// ============================================================================

const navigationCategories: NavCategory[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [{ scene: 'orbital', icon: '🏠', labelKey: 'orbital' }],
  },
  {
    id: 'production',
    label: 'Production',
    items: [
      { scene: 'mines', icon: '⛏️', labelKey: 'mines' },
      { scene: 'shipyard', icon: '🚀', labelKey: 'shipyard' },
      { scene: 'research', icon: '🔬', labelKey: 'research' },
    ],
  },
  {
    id: 'military',
    label: 'Military',
    items: [
      { scene: 'defense', icon: '🛡️', labelKey: 'defense' },
      { scene: 'fleet', icon: '🚢', labelKey: 'fleet' },
    ],
  },
  {
    id: 'navigation',
    label: 'Navigation',
    items: [{ scene: 'galaxy', icon: '🌌', labelKey: 'galaxy' }],
  },
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

// formatCoordinates imported from @/lib/utils/format

// ============================================================================
// MINI PLANET 3D VIEW
// ============================================================================

const MiniPlanet3DView = memo(function MiniPlanet3DView({
  type,
  variant = 1,
  isHovered = false,
  isSelected = false,
  size = 50,
}: {
  type: VisualPlanetType
  variant?: number
  isHovered?: boolean
  isSelected?: boolean
  size?: number
}) {
  return (
    <motion.div
      className="rounded-full overflow-hidden"
      style={{ width: size, height: size }}
      animate={{
        boxShadow: isSelected
          ? '0 0 20px rgba(0, 255, 255, 0.5), 0 0 40px rgba(0, 200, 255, 0.3)'
          : isHovered
            ? '0 0 15px rgba(0, 255, 255, 0.3)'
            : '0 0 0 rgba(0, 255, 255, 0)',
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
          size={0.75}
          rotationSpeed={isHovered || isSelected ? 0.01 : 0.003}
        />
      </Canvas>
    </motion.div>
  )
})

// ============================================================================
// PLANET CARD COMPONENT
// ============================================================================

interface PlanetCardProps {
  planet: Planet
  isSelected: boolean
  onSelect: () => void
  collapsed: boolean
  hasConstruction?: boolean
}

const PlanetCard = memo(function PlanetCard({
  planet,
  isSelected,
  onSelect,
  collapsed,
  hasConstruction,
}: PlanetCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const visualType = useMemo(
    () => getVisualPlanetType(planet.position),
    [planet.position]
  )
  const variant = useMemo(() => ((planet.position - 1) % 10) + 1, [planet.position])
  const coords = useMemo(
    () => formatCoordinates(planet.galaxy, planet.system, planet.position),
    [planet.galaxy, planet.system, planet.position]
  )

  if (collapsed) {
    return (
      <motion.button
        onClick={onSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative w-full p-2 rounded-lg
          bg-black/40 backdrop-blur-sm border
          transition-all duration-200
          ${isSelected ? 'border-cyan-500/50' : 'border-white/10 hover:border-white/20'}
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        title={`${planet.name} ${coords}`}
      >
        <div className="flex justify-center">
          <MiniPlanet3DView
            type={visualType}
            variant={variant}
            isHovered={isHovered}
            isSelected={isSelected}
            size={40}
          />
        </div>

        {/* Construction indicator */}
        {hasConstruction && (
          <motion.div
            className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.button>
    )
  }

  return (
    <motion.button
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative w-full p-3 text-left rounded-lg
        bg-black/40 backdrop-blur-sm border
        transition-all duration-200
        ${isSelected ? 'border-cyan-500/50' : 'border-white/10 hover:border-white/20'}
      `}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Selection indicator */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 rounded-l-lg"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            exit={{ scaleY: 0 }}
            style={{
              boxShadow: '0 0 10px rgba(0, 255, 255, 0.8)',
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        {/* Mini 3D planet */}
        <MiniPlanet3DView
          type={visualType}
          variant={variant}
          isHovered={isHovered}
          isSelected={isSelected}
          size={50}
        />

        {/* Planet info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white truncate">
              {planet.name}
            </h3>
            {hasConstruction && (
              <motion.div
                className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                title="Construction in progress"
              />
            )}
          </div>
          <p className="text-xs text-cyan-400/80 font-mono">{coords}</p>

          {/* Resource preview */}
          <div className="flex gap-2 mt-1 text-[10px]">
            <span className="text-gray-400" title="Metal">
              M: {Math.floor(planet.metal || 0).toLocaleString()}
            </span>
            <span className="text-blue-400" title="Crystal">
              C: {Math.floor(planet.crystal || 0).toLocaleString()}
            </span>
            <span className="text-cyan-400" title="Deuterium">
              D: {Math.floor(planet.deuterium || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  )
})

// ============================================================================
// SCENE NAV ITEM
// ============================================================================

interface SceneNavItemProps {
  item: NavItem
  isActive: boolean
  collapsed: boolean
  onClick: () => void
}

const SceneNavItem = memo(function SceneNavItem({
  item,
  isActive,
  collapsed,
  onClick,
}: SceneNavItemProps) {
  const t = useTranslations('scenes')
  const [isHovered, setIsHovered] = useState(false)

  if (collapsed) {
    return (
      <motion.button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative w-full p-2 rounded-lg flex justify-center
          transition-all duration-200
          ${isActive ? 'bg-cyan-500/20 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={t(item.labelKey)}
      >
        <span className="text-lg">{item.icon}</span>

        {item.hasPendingAction && (
          <motion.div
            className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Tooltip */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="absolute left-full ml-2 z-50"
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
            >
              <div className="px-2 py-1 rounded bg-black/90 border border-white/10 whitespace-nowrap">
                <span className="text-xs text-white">{t(item.labelKey)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    )
  }

  return (
    <motion.button
      onClick={onClick}
      className={`
        relative w-full px-3 py-2 rounded-lg flex items-center gap-3
        transition-all duration-200
        ${isActive ? 'bg-cyan-500/20 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
      `}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="text-lg">{item.icon}</span>
      <span className="text-sm font-medium">{t(item.labelKey)}</span>

      {item.hasPendingAction && (
        <motion.div
          className="ml-auto w-2 h-2 rounded-full bg-orange-500"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      {/* Active indicator */}
      {isActive && (
        <motion.div
          className="absolute right-2 w-1.5 h-1.5 rounded-full bg-cyan-400"
          layoutId="activeSceneIndicator"
        />
      )}
    </motion.button>
  )
})

// ============================================================================
// MAIN GAME SIDEBAR COMPONENT
// ============================================================================

export const GameSidebar = memo(function GameSidebar({
  currentScene,
  onSceneChange,
  onPlanetSelect,
  collapsed = false,
}: GameSidebarProps) {
  const { planets, currentPlanet, buildingQueue } = useGameStore()
  const t = useTranslations('sidebar')

  // Check which planets have active construction
  const planetsWithConstruction = useMemo(() => {
    const set = new Set<string>()
    buildingQueue.forEach((item) => set.add(item.planet_id))
    return set
  }, [buildingQueue])

  // Check which scenes have pending actions for current planet
  const scenesWithActions = useMemo(() => {
    const actions: Partial<Record<SceneType, boolean>> = {}
    if (currentPlanet) {
      // Check if current planet has building queue
      if (buildingQueue.some((q) => q.planet_id === currentPlanet.id)) {
        actions.mines = true
        actions.shipyard = true
      }
    }
    return actions
  }, [currentPlanet, buildingQueue])

  // Get nav items with pending action status
  const getNavItemsWithStatus = useCallback(
    (items: NavItem[]): NavItem[] => {
      return items.map((item) => ({
        ...item,
        hasPendingAction: scenesWithActions[item.scene] || false,
      }))
    },
    [scenesWithActions]
  )

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 256 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col h-full bg-black/40 backdrop-blur-md border-r border-white/10"
    >
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <h2
          className={`text-sm font-semibold uppercase tracking-wider text-cyan-400 ${collapsed ? 'text-center' : ''}`}
          style={{ textShadow: '0 0 10px rgba(0, 212, 255, 0.3)' }}
        >
          {collapsed ? 'P' : t('planets')}
        </h2>
      </div>

      {/* Planet list */}
      <div className="flex-shrink-0 max-h-[40%] overflow-y-auto p-2 space-y-1 border-b border-white/10">
        {planets.map((planet) => (
          <PlanetCard
            key={planet.id}
            planet={planet}
            isSelected={planet.id === currentPlanet?.id}
            onSelect={() => {
              onPlanetSelect(planet.id)
              onSceneChange('orbital')
            }}
            collapsed={collapsed}
            hasConstruction={planetsWithConstruction.has(planet.id)}
          />
        ))}
      </div>

      {/* Scene navigation */}
      <div className="flex-1 overflow-y-auto p-2">
        {navigationCategories.map((category) => (
          <div key={category.id} className="mb-3">
            {/* Category header */}
            {!collapsed && (
              <h3 className="px-2 mb-1 text-[10px] uppercase tracking-wider text-white/40">
                {category.label}
              </h3>
            )}

            {/* Category items */}
            <div className="space-y-0.5">
              {getNavItemsWithStatus(category.items).map((item) => (
                <SceneNavItem
                  key={item.scene}
                  item={item}
                  isActive={currentScene === item.scene}
                  collapsed={collapsed}
                  onClick={() => onSceneChange(item.scene)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <div className={collapsed ? 'text-center' : 'flex items-center justify-between'}>
          <p className="text-xs text-white/50">
            {collapsed
              ? planets.length
              : `${planets.length} ${planets.length === 1 ? 'planet' : 'planets'}`}
          </p>
        </div>

        {/* Decorative gradient line */}
        <div
          className="mt-2 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.3), transparent)',
          }}
        />
      </div>
    </motion.aside>
  )
})

export default GameSidebar
