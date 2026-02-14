'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useBattleStore } from '@/stores/battleStore'
import { BattleReportViewer } from '@/components/game/3d/scenes/BattleReportViewer'

interface BattlePageProps {
  params: Promise<{ battleId: string }>
}

export default function BattlePage({ params }: BattlePageProps) {
  const { battleId } = use(params)
  const router = useRouter()
  const { currentBattle, isLoading, error, loadBattle, clearBattle } = useBattleStore()
  const [isFullscreen, setIsFullscreen] = useState(true)

  useEffect(() => {
    loadBattle(battleId)

    return () => {
      clearBattle()
    }
  }, [battleId, loadBattle, clearBattle])

  const handleBack = () => {
    router.push('/game/messages')
  }

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-300 text-lg">Loading Battle Report...</span>
          <span className="text-gray-500 text-sm">Reconstructing combat data</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-8 max-w-md text-center">
          <div className="text-red-400 text-5xl mb-4">!</div>
          <h2 className="text-red-300 text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-red-200 mb-6">{error}</p>
          <Link
            href="/game/messages"
            className="inline-block px-6 py-2 bg-red-600 hover:bg-red-500 rounded text-white transition-colors"
          >
            Return to Messages
          </Link>
        </div>
      </div>
    )
  }

  if (!currentBattle) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-gray-400">Battle not found</div>
      </div>
    )
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'relative w-full h-[calc(100vh-80px)]'} bg-black`}>
      {/* Control bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg text-gray-300 hover:text-white transition-colors border border-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Messages</span>
          </button>

          <div className="text-gray-400 text-sm">
            Battle Report: [{currentBattle.coordinates.galaxy}:{currentBattle.coordinates.system}:{currentBattle.coordinates.position}]
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Battle result badge */}
          <div className={`px-4 py-1 rounded-full text-sm font-bold ${
            currentBattle.result.winner === 'attacker'
              ? 'bg-green-600/30 text-green-300 border border-green-500/50'
              : currentBattle.result.winner === 'defender'
              ? 'bg-red-600/30 text-red-300 border border-red-500/50'
              : 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/50'
          }`}>
            {currentBattle.result.winner === 'attacker' ? 'Attacker Victory' :
             currentBattle.result.winner === 'defender' ? 'Defender Victory' : 'Draw'}
          </div>

          {/* Fullscreen toggle */}
          <button
            onClick={handleToggleFullscreen}
            className="p-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg text-gray-300 hover:text-white transition-colors border border-gray-700"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>

          {/* Fleet link */}
          <Link
            href="/game/fleet"
            className="px-4 py-2 bg-blue-600/80 hover:bg-blue-500/80 rounded-lg text-white transition-colors border border-blue-500"
          >
            Go to Fleet
          </Link>
        </div>
      </div>

      {/* 3D Battle Viewer */}
      <BattleReportViewer battle={currentBattle} />

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center gap-6 text-sm">
          <div className="text-gray-400">
            <span className="text-gray-500">Attacker:</span>{' '}
            <span className="text-orange-300">{currentBattle.attacker.playerName}</span>
            {currentBattle.attacker.allianceTag && (
              <span className="text-orange-400/70"> [{currentBattle.attacker.allianceTag}]</span>
            )}
          </div>
          <div className="text-gray-500">vs</div>
          <div className="text-gray-400">
            <span className="text-gray-500">Defender:</span>{' '}
            <span className="text-blue-300">{currentBattle.defender.playerName}</span>
            {currentBattle.defender.allianceTag && (
              <span className="text-blue-400/70"> [{currentBattle.defender.allianceTag}]</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="text-gray-400">
            <span className="text-gray-500">Rounds:</span>{' '}
            <span className="text-white">{currentBattle.result.totalRounds}</span>
          </div>
          <div className="text-gray-400">
            <span className="text-gray-500">Debris:</span>{' '}
            <span className="text-gray-300">{currentBattle.debris.metal.toLocaleString()} M</span>
            <span className="text-gray-500"> / </span>
            <span className="text-cyan-300">{currentBattle.debris.crystal.toLocaleString()} C</span>
          </div>
          {currentBattle.loot && (currentBattle.loot.metal > 0 || currentBattle.loot.crystal > 0 || currentBattle.loot.deuterium > 0) && (
            <div className="text-gray-400">
              <span className="text-gray-500">Loot:</span>{' '}
              <span className="text-yellow-300">
                {(currentBattle.loot.metal + currentBattle.loot.crystal + currentBattle.loot.deuterium).toLocaleString()}
              </span>
            </div>
          )}
          {currentBattle.result.moonCreated && (
            <div className="px-2 py-1 bg-purple-600/30 rounded text-purple-300 border border-purple-500/50">
              Moon Created!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
