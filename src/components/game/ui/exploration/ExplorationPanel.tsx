'use client'

/**
 * ExplorationPanel - UI for launching exploration missions using fleet mechanics
 *
 * Features:
 * - Mission type selection (quick_scan, deep_scan, cartography, satellite_deploy)
 * - Fleet composition for exploration
 * - Mission duration and quality preview
 * - Uses FleetMission system (fleet_missions table)
 */

import { useState, useMemo, useCallback } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { MissionService } from '@/lib/services/mission-service'
import type { MissionType } from '@/types/database'
import type { VisibleSystem } from '@/lib/exploration/types'

// ============================================================================
// TYPES
// ============================================================================

export type ExplorationMissionType = 'exploration_quick_scan' | 'exploration_deep_scan' | 'exploration_cartography' | 'exploration_satellite_deploy'

interface ExplorationPanelProps {
  userId: string
  selectedSystem: VisibleSystem | null
  onClose: () => void
  onMissionLaunched?: () => void
  className?: string
}

interface MissionConfig {
  type: ExplorationMissionType
  name: string
  icon: string
  description: string
  baseDuration: number // seconds
  baseQuality: number
  requiresCartographer: boolean
  minDiscoveryLevel: 'detected' | 'scanned' | 'explored' | 'mapped'
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MISSION_CONFIGS: MissionConfig[] = [
  {
    type: 'exploration_quick_scan',
    name: 'Quick Scan',
    icon: '🔍',
    description: 'Fast reconnaissance. Detects basic system information.',
    baseDuration: 3600, // 1 hour
    baseQuality: 20,
    requiresCartographer: false,
    minDiscoveryLevel: 'detected',
  },
  {
    type: 'exploration_deep_scan',
    name: 'Deep Scan',
    icon: '📡',
    description: 'Thorough exploration. Reveals planet details and resources.',
    baseDuration: 14400, // 4 hours
    baseQuality: 50,
    requiresCartographer: false,
    minDiscoveryLevel: 'scanned',
  },
  {
    type: 'exploration_cartography',
    name: 'Cartography',
    icon: '🗺️',
    description: 'Complete mapping. Enables Data Card creation.',
    baseDuration: 28800, // 8 hours
    baseQuality: 80,
    requiresCartographer: true,
    minDiscoveryLevel: 'mapped',
  },
  {
    type: 'exploration_satellite_deploy',
    name: 'Deploy Satellite',
    icon: '🛰️',
    description: 'Permanent surveillance. Continuous system monitoring.',
    baseDuration: 7200, // 2 hours
    baseQuality: 60,
    requiresCartographer: false,
    minDiscoveryLevel: 'explored',
  },
]

const SCAN_QUALITY_CONFIG = {
  PROBE_PER_UNIT: 2,
  PROBE_MAX: 20,
  EXPLORER_PER_UNIT: 5,
  EXPLORER_MAX: 30,
  CARTOGRAPHER: 20,
  TECH_PER_LEVEL: 2,
  MAX_QUALITY: 100,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function calculateScanQuality(
  missionType: ExplorationMissionType,
  probeCount: number,
  explorerCount: number,
  cartographerEquipped: boolean,
  techLevel: number
): number {
  const config = MISSION_CONFIGS.find(c => c.type === missionType)
  if (!config) return 0

  let quality = config.baseQuality

  // Probe bonus
  quality += Math.min(
    probeCount * SCAN_QUALITY_CONFIG.PROBE_PER_UNIT,
    SCAN_QUALITY_CONFIG.PROBE_MAX
  )

  // Explorer bonus
  quality += Math.min(
    explorerCount * SCAN_QUALITY_CONFIG.EXPLORER_PER_UNIT,
    SCAN_QUALITY_CONFIG.EXPLORER_MAX
  )

  // Cartographer bonus
  if (cartographerEquipped) {
    quality += SCAN_QUALITY_CONFIG.CARTOGRAPHER
  }

  // Tech level bonus
  quality += techLevel * SCAN_QUALITY_CONFIG.TECH_PER_LEVEL

  return Math.min(quality, SCAN_QUALITY_CONFIG.MAX_QUALITY)
}

function calculateDuration(
  missionType: ExplorationMissionType,
  techLevel: number
): number {
  const config = MISSION_CONFIGS.find(c => c.type === missionType)
  if (!config) return 0

  // Tech reduces duration (min 70%)
  const techReduction = Math.max(0.7, 1.0 - techLevel * 0.03)
  return Math.floor(config.baseDuration * techReduction)
}

function getDiscoveryLevelColor(level: string | null): string {
  switch (level) {
    case 'mapped': return 'text-purple-400'
    case 'explored': return 'text-green-400'
    case 'scanned': return 'text-blue-400'
    case 'detected': return 'text-yellow-400'
    default: return 'text-gray-500'
  }
}

function getDiscoveryLevelLabel(level: string | null): string {
  switch (level) {
    case 'mapped': return 'Mapped'
    case 'explored': return 'Explored'
    case 'scanned': return 'Scanned'
    case 'detected': return 'Detected'
    default: return 'Unknown'
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ExplorationPanel({
  userId,
  selectedSystem,
  onClose,
  onMissionLaunched,
  className = '',
}: ExplorationPanelProps) {
  const { currentPlanet, research, setFleetMissions } = useGameStore()

  // State
  const [selectedMission, setSelectedMission] = useState<ExplorationMissionType>('exploration_quick_scan')
  const [probeCount, setProbeCount] = useState(1)
  const [explorerCount, setExplorerCount] = useState(0)
  const [cartographerEquipped, setCartographerEquipped] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get exploration tech level (using astrophysics as proxy)
  const explorationTechLevel = useMemo(() => {
    return research?.astrophysics || 0
  }, [research])

  // Available ships
  const availableProbes = currentPlanet?.espionage_probe || 0
  const availableExplorers = 0 // TODO: Add explorer ship type
  const hasCartographer = false // TODO: Check for cartographer equipment

  // Selected mission config
  const missionConfig = useMemo(() => {
    return MISSION_CONFIGS.find(c => c.type === selectedMission)
  }, [selectedMission])

  // Calculate preview values
  const previewQuality = useMemo(() => {
    return calculateScanQuality(
      selectedMission,
      probeCount,
      explorerCount,
      cartographerEquipped,
      explorationTechLevel
    )
  }, [selectedMission, probeCount, explorerCount, cartographerEquipped, explorationTechLevel])

  const previewDuration = useMemo(() => {
    return calculateDuration(selectedMission, explorationTechLevel)
  }, [selectedMission, explorationTechLevel])

  // Can launch?
  const canLaunch = useMemo(() => {
    if (!selectedSystem) return false
    if (!currentPlanet) return false
    if (probeCount === 0 && explorerCount === 0) return false
    if (missionConfig?.requiresCartographer && !cartographerEquipped) return false
    return true
  }, [selectedSystem, currentPlanet, probeCount, explorerCount, missionConfig, cartographerEquipped])

  // Handle launch using fleet mission system
  const handleLaunch = useCallback(async () => {
    if (!canLaunch || !selectedSystem || !currentPlanet) return

    setIsLaunching(true)
    setError(null)

    try {
      const now = new Date()
      const arrivalTime = new Date(now.getTime() + previewDuration * 1000)

      // Build ships object
      const ships: Record<string, number> = {}
      if (probeCount > 0) ships.espionage_probe = probeCount
      if (explorerCount > 0) ships.explorer = explorerCount

      // Build cargo/metadata for exploration
      const cargoResources = {
        metal: 0,
        crystal: 0,
        deuterium: 0,
        // Exploration metadata
        _exploration: {
          scanQuality: previewQuality,
          cartographerEquipped,
          techLevel: explorationTechLevel,
          targetSystemId: selectedSystem.systemId,
        }
      }

      // Create fleet mission
      const missionId = await MissionService.startMission({
        user_id: userId,
        origin_planet_id: currentPlanet.id,
        origin_galaxy: currentPlanet.galaxy,
        origin_system: currentPlanet.system,
        origin_position: currentPlanet.position,
        destination_galaxy: selectedSystem.galaxyIndex,
        destination_system: selectedSystem.systemIndex,
        destination_position: 1, // Exploration targets the system, not a specific position
        destination_type: 'planet',
        mission_type: selectedMission as MissionType,
        ships,
        cargo_resources: cargoResources,
        departed_at: now.toISOString(),
        arrives_at: arrivalTime.toISOString(),
      })

      if (!missionId) {
        throw new Error('Failed to create mission')
      }

      // Refresh missions list
      const updatedMissions = await MissionService.getActiveMissions(userId)
      setFleetMissions(updatedMissions)

      // Callback
      onMissionLaunched?.()
      onClose()
    } catch (err) {
      console.error('Failed to launch exploration mission:', err)
      setError(err instanceof Error ? err.message : 'Failed to launch mission')
    } finally {
      setIsLaunching(false)
    }
  }, [
    canLaunch,
    selectedSystem,
    currentPlanet,
    previewDuration,
    probeCount,
    explorerCount,
    previewQuality,
    cartographerEquipped,
    explorationTechLevel,
    userId,
    selectedMission,
    setFleetMissions,
    onMissionLaunched,
    onClose
  ])

  if (!selectedSystem) {
    return null
  }

  return (
    <div className={`bg-gray-900/95 backdrop-blur-sm border border-cyan-700/50 rounded-lg shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div>
          <h2 className="text-lg font-bold text-cyan-400 uppercase tracking-wider">
            Exploration Mission
          </h2>
          <div className="text-sm text-gray-400 mt-1">
            Target: System [{selectedSystem.galaxyIndex}:{selectedSystem.systemIndex}]
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* System Info */}
      <div className="p-4 border-b border-gray-700/50 bg-gray-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              {selectedSystem.starType ? '⭐' : '❓'}
            </div>
            <div>
              <div className="text-white font-medium">
                {selectedSystem.starType || 'Unknown Star'}
              </div>
              <div className={`text-sm ${getDiscoveryLevelColor(selectedSystem.discoveryLevel)}`}>
                {getDiscoveryLevelLabel(selectedSystem.discoveryLevel)}
                {selectedSystem.scanQuality > 0 && (
                  <span className="text-gray-500 ml-2">
                    ({selectedSystem.scanQuality}% scanned)
                  </span>
                )}
              </div>
            </div>
          </div>
          {selectedSystem.isFirstDiscoverer && (
            <div className="px-2 py-1 bg-purple-600/30 text-purple-400 text-xs rounded border border-purple-500/50">
              🏆 First Discoverer
            </div>
          )}
        </div>
      </div>

      {/* Mission Type Selection */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="text-sm text-gray-400 mb-3">Mission Type</div>
        <div className="grid grid-cols-2 gap-2">
          {MISSION_CONFIGS.map((config) => (
            <button
              key={config.type}
              onClick={() => setSelectedMission(config.type)}
              disabled={config.requiresCartographer && !hasCartographer}
              className={`
                p-3 rounded-lg border text-left transition-all
                ${selectedMission === config.type
                  ? 'bg-cyan-600/20 border-cyan-500 text-white'
                  : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                }
                ${config.requiresCartographer && !hasCartographer
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{config.icon}</span>
                <span className="font-medium">{config.name}</span>
              </div>
              <div className="text-xs text-gray-500 line-clamp-2">
                {config.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Fleet Composition */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="text-sm text-gray-400 mb-3">Fleet Composition</div>

        {/* Probes */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛸</span>
            <span className="text-white">Espionage Probes</span>
            <span className="text-xs text-gray-500">
              (Available: {availableProbes})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setProbeCount(Math.max(0, probeCount - 1))}
              className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white"
            >
              -
            </button>
            <input
              type="number"
              value={probeCount}
              onChange={(e) => setProbeCount(Math.min(availableProbes, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center text-white"
            />
            <button
              onClick={() => setProbeCount(Math.min(availableProbes, probeCount + 1))}
              className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white"
            >
              +
            </button>
          </div>
        </div>

        {/* Explorers */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚀</span>
            <span className="text-white">Explorers</span>
            <span className="text-xs text-gray-500">
              (Available: {availableExplorers})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExplorerCount(Math.max(0, explorerCount - 1))}
              className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white"
              disabled={availableExplorers === 0}
            >
              -
            </button>
            <input
              type="number"
              value={explorerCount}
              onChange={(e) => setExplorerCount(Math.min(availableExplorers, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center text-white"
              disabled={availableExplorers === 0}
            />
            <button
              onClick={() => setExplorerCount(Math.min(availableExplorers, explorerCount + 1))}
              className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white"
              disabled={availableExplorers === 0}
            >
              +
            </button>
          </div>
        </div>

        {/* Cartographer checkbox */}
        {missionConfig?.requiresCartographer && (
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <span>⚠️</span>
            <span>Requires cartographer equipment (not available)</span>
          </div>
        )}
      </div>

      {/* Mission Preview */}
      <div className="p-4 border-b border-gray-700/50 bg-gray-800/30">
        <div className="text-sm text-gray-400 mb-3">Mission Preview</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 uppercase">Duration</div>
            <div className="text-lg text-white font-mono">
              {formatDuration(previewDuration)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Scan Quality</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-green-400 transition-all"
                  style={{ width: `${previewQuality}%` }}
                />
              </div>
              <span className="text-white font-mono">{previewQuality}%</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Result Level</div>
            <div className={`text-lg font-medium ${getDiscoveryLevelColor(missionConfig?.minDiscoveryLevel || null)}`}>
              {getDiscoveryLevelLabel(missionConfig?.minDiscoveryLevel || null)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Tech Bonus</div>
            <div className="text-lg text-cyan-400">
              Lv.{explorationTechLevel} (-{Math.floor((1 - Math.max(0.7, 1.0 - explorationTechLevel * 0.03)) * 100)}%)
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-900/30 border-b border-red-700/50">
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      )}

      {/* Launch Button */}
      <div className="p-4">
        <button
          onClick={handleLaunch}
          disabled={!canLaunch || isLaunching}
          className={`
            w-full py-3 rounded-lg font-bold uppercase tracking-wider transition-all
            ${canLaunch && !isLaunching
              ? 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-500/30'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isLaunching ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              Launching...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>🚀</span>
              Launch Exploration
            </span>
          )}
        </button>
        {!canLaunch && (
          <div className="text-center text-xs text-gray-500 mt-2">
            {probeCount === 0 && explorerCount === 0
              ? 'Select at least one ship'
              : missionConfig?.requiresCartographer && !cartographerEquipped
                ? 'Cartographer equipment required'
                : !currentPlanet
                  ? 'No planet selected'
                  : 'Cannot launch mission'
            }
          </div>
        )}
      </div>
    </div>
  )
}

export { ExplorationPanel }
export type { ExplorationPanelProps }
