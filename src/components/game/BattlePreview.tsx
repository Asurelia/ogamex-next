'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { BattlePreviewData } from '@/types/battle'
import { formatNumber, formatCoordinatesObj, formatTimeAgo } from '@/lib/utils/format'

// ============================================================================
// TYPES
// ============================================================================

export interface BattlePreviewProps {
  battle: BattlePreviewData
  compact?: boolean
  onClick?: () => void
}

// Use centralized formatCoordinatesObj as formatCoordinates
const formatCoordinates = formatCoordinatesObj

// ============================================================================
// SHIP ICON COMPONENT
// ============================================================================

function ShipIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2L4 9l8 2 8-2-8-7z" />
      <path d="M4 9v6l8 7 8-7V9" />
      <path d="M12 11v11" />
    </svg>
  )
}

function ExplosionIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L9 9H2l6 4-2 7 6-4 6 4-2-7 6-4h-7l-3-7z" />
    </svg>
  )
}

// ============================================================================
// MINI FLEET DISPLAY
// ============================================================================

function MiniFleetDisplay({ side, lost }: { side: 'attacker' | 'defender'; lost: number }) {
  const ships = useMemo(() => {
    // Generate mini ship representations
    const totalShips = Math.min(10, Math.ceil(lost / 100) + 3)
    const lostShips = Math.min(totalShips, Math.ceil((lost / 1000) * totalShips))

    return Array.from({ length: totalShips }, (_, i) => ({
      id: i,
      destroyed: i < lostShips,
    }))
  }, [lost])

  return (
    <div className="flex gap-0.5 items-center">
      {ships.map(ship => (
        <div
          key={ship.id}
          className={`w-1.5 h-2 rounded-sm ${
            ship.destroyed
              ? 'bg-red-500/70'
              : side === 'attacker'
              ? 'bg-orange-400/70'
              : 'bg-blue-400/70'
          }`}
        />
      ))}
    </div>
  )
}

// ============================================================================
// COMPACT BATTLE PREVIEW
// ============================================================================

function CompactBattlePreview({ battle, onClick }: BattlePreviewProps) {
  const resultColor = battle.winner === 'attacker'
    ? battle.isAttacker ? 'text-green-400' : 'text-red-400'
    : battle.winner === 'defender'
    ? battle.isAttacker ? 'text-red-400' : 'text-green-400'
    : 'text-yellow-400'

  const resultText = battle.winner === 'attacker'
    ? battle.isAttacker ? 'Victory' : 'Defeat'
    : battle.winner === 'defender'
    ? battle.isAttacker ? 'Defeat' : 'Victory'
    : 'Draw'

  return (
    <Link
      href={`/game/battle/${battle.id}`}
      className="block p-3 bg-ogame-dark/50 hover:bg-ogame-dark/70 rounded-lg border border-ogame-border/30 hover:border-ogame-accent/30 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            battle.winner === 'attacker'
              ? 'bg-orange-900/50'
              : battle.winner === 'defender'
              ? 'bg-blue-900/50'
              : 'bg-yellow-900/50'
          }`}>
            <ExplosionIcon className={`w-5 h-5 ${resultColor}`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${resultColor}`}>{resultText}</span>
              <span className="text-gray-500 text-xs">{formatCoordinates(battle.coordinates)}</span>
            </div>
            <div className="text-sm text-gray-400">
              vs <span className="text-gray-300">{battle.opponentName}</span>
              {battle.opponentAlliance && (
                <span className="text-gray-500"> [{battle.opponentAlliance}]</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Debris indicator */}
          {(battle.debris.metal > 0 || battle.debris.crystal > 0) && (
            <div className="text-xs text-gray-500">
              <span className="text-gray-400">{formatNumber(battle.debris.metal + battle.debris.crystal)}</span> debris
            </div>
          )}

          {/* View button */}
          <div className="px-3 py-1 bg-cyan-600/30 group-hover:bg-cyan-600/50 rounded text-cyan-300 text-sm transition-colors">
            View 3D
          </div>
        </div>
      </div>
    </Link>
  )
}

// ============================================================================
// FULL BATTLE PREVIEW
// ============================================================================

function FullBattlePreview({ battle, onClick }: BattlePreviewProps) {
  const isVictory = (battle.winner === 'attacker' && battle.isAttacker) ||
                    (battle.winner === 'defender' && !battle.isAttacker)
  const isDraw = battle.winner === 'draw'

  return (
    <div className="bg-gradient-to-r from-ogame-dark/80 to-ogame-dark/60 rounded-lg border border-ogame-border/40 overflow-hidden">
      {/* Header with result */}
      <div className={`px-4 py-3 ${
        isVictory
          ? 'bg-gradient-to-r from-green-900/40 to-transparent border-b border-green-500/20'
          : isDraw
          ? 'bg-gradient-to-r from-yellow-900/40 to-transparent border-b border-yellow-500/20'
          : 'bg-gradient-to-r from-red-900/40 to-transparent border-b border-red-500/20'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              isVictory ? 'bg-green-600/30' : isDraw ? 'bg-yellow-600/30' : 'bg-red-600/30'
            }`}>
              <ExplosionIcon className={`w-7 h-7 ${
                isVictory ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-red-400'
              }`} />
            </div>

            <div>
              <div className={`text-lg font-bold ${
                isVictory ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {isVictory ? 'Victory!' : isDraw ? 'Draw' : 'Defeat'}
              </div>
              <div className="text-sm text-gray-400">
                Combat at {formatCoordinates(battle.coordinates)}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-400">{formatTimeAgo(new Date(battle.timestamp))}</div>
            <div className="text-xs text-gray-500">
              {new Date(battle.timestamp).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Battle content */}
      <div className="p-4">
        {/* Participants */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">
              {battle.isAttacker ? 'You (Attacker)' : 'Attacker'}
            </div>
            <div className={`text-sm ${battle.isAttacker ? 'text-orange-300' : 'text-gray-300'}`}>
              {battle.isAttacker ? 'Your Fleet' : battle.opponentName}
            </div>
            <MiniFleetDisplay side="attacker" lost={battle.attackerLossValue} />
          </div>

          <div className="px-4 py-2 bg-ogame-dark/50 rounded-full text-gray-500 text-sm">
            VS
          </div>

          <div className="flex-1 text-right">
            <div className="text-xs text-gray-500 mb-1">
              {!battle.isAttacker ? 'You (Defender)' : 'Defender'}
            </div>
            <div className={`text-sm ${!battle.isAttacker ? 'text-blue-300' : 'text-gray-300'}`}>
              {!battle.isAttacker ? 'Your Forces' : battle.opponentName}
              {battle.opponentAlliance && !battle.isAttacker && (
                <span className="text-gray-500"> [{battle.opponentAlliance}]</span>
              )}
            </div>
            <div className="flex justify-end">
              <MiniFleetDisplay side="defender" lost={battle.defenderLossValue} />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Losses */}
          <div className="bg-ogame-dark/40 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Total Losses</div>
            <div className="text-red-400 font-mono">
              {formatNumber(battle.attackerLossValue + battle.defenderLossValue)}
            </div>
          </div>

          {/* Debris */}
          <div className="bg-ogame-dark/40 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Debris Field</div>
            <div className="text-gray-300 font-mono">
              {formatNumber(battle.debris.metal + battle.debris.crystal)}
            </div>
          </div>

          {/* Loot */}
          <div className="bg-ogame-dark/40 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">
              {battle.isAttacker && battle.winner === 'attacker' ? 'Loot Taken' : 'Resources'}
            </div>
            <div className="text-yellow-400 font-mono">
              {battle.loot
                ? formatNumber(battle.loot.metal + battle.loot.crystal + battle.loot.deuterium)
                : '-'}
            </div>
          </div>
        </div>

        {/* Special events */}
        {battle.moonCreated && (
          <div className="mb-4 px-3 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-600/50 flex items-center justify-center">
              <span className="text-xs">M</span>
            </div>
            <span className="text-purple-300 text-sm">A moon was created from the debris!</span>
          </div>
        )}

        {/* Action button */}
        <Link
          href={`/game/battle/${battle.id}`}
          className="block w-full py-3 bg-gradient-to-r from-cyan-600/80 to-blue-600/80 hover:from-cyan-500/80 hover:to-blue-500/80 rounded-lg text-center text-white font-semibold transition-all group"
          onClick={onClick}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Watch Battle in 3D
          </span>
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BattlePreview({ battle, compact = false, onClick }: BattlePreviewProps) {
  if (compact) {
    return <CompactBattlePreview battle={battle} onClick={onClick} />
  }

  return <FullBattlePreview battle={battle} onClick={onClick} />
}

export default BattlePreview
