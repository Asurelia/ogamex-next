'use client'

/**
 * Clones Window
 *
 * Medical clone, jump clones list, cooldown timers, install button.
 */

import { useState, useCallback, memo, useMemo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'

const ClonesContent = memo(function ClonesContent() {
  const { clones, medicalCloneStationId } = useRTGameStore()
  const [selectedClone, setSelectedClone] = useState<string | null>(null)

  const jumpClones = useMemo(() => clones.filter(c => c.cloneType === 'jump'), [clones])

  const handleJump = useCallback((cloneId: string) => {
    useRTGameStore.getState().cloneJump(cloneId)
  }, [])

  const handleInstall = useCallback(() => {
    useRTGameStore.getState().cloneInstall()
  }, [])

  const handleDestroy = useCallback((cloneId: string) => {
    useRTGameStore.getState().cloneDestroy(cloneId)
    setSelectedClone(null)
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Medical Clone Section */}
      <div className="p-3 border-b border-slate-700">
        <div className="text-xs font-medium text-slate-300 mb-1">Medical Clone</div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {medicalCloneStationId ? 'Station set' : 'Default station'}
          </span>
          <button
            onClick={() => useRTGameStore.getState().cloneSetMedical()}
            className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] rounded"
          >
            Set Here
          </button>
        </div>
      </div>

      {/* Jump Clones */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-slate-300">Jump Clones ({jumpClones.length}/5)</span>
          <button
            onClick={handleInstall}
            disabled={jumpClones.length >= 5}
            className="px-2 py-0.5 bg-cyan-800 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-[10px] rounded"
          >
            Install Clone
          </button>
        </div>

        {jumpClones.map((clone) => {
          const isOnCooldown = clone.jumpCooldownUntil && new Date(clone.jumpCooldownUntil) > new Date()
          const cooldownHours = isOnCooldown
            ? Math.ceil((new Date(clone.jumpCooldownUntil!).getTime() - Date.now()) / 3600000)
            : 0

          return (
            <div
              key={clone.id}
              className={`p-2 rounded border cursor-pointer transition-colors ${
                selectedClone === clone.id
                  ? 'border-cyan-600 bg-cyan-900/20'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
              onClick={() => setSelectedClone(clone.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-200">{clone.cloneName}</span>
                  <div className="text-[10px] text-slate-500">{clone.stationName || 'Unknown Station'}</div>
                </div>
                <div className="flex gap-1">
                  {isOnCooldown ? (
                    <span className="text-[10px] text-yellow-400">{cooldownHours}h cooldown</span>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleJump(clone.id) }}
                      className="px-2 py-0.5 bg-green-800 hover:bg-green-700 text-white text-[10px] rounded"
                    >
                      Jump
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDestroy(clone.id) }}
                    className="px-2 py-0.5 bg-red-900/50 hover:bg-red-800/50 text-red-300 text-[10px] rounded"
                  >
                    X
                  </button>
                </div>
              </div>
              {clone.implants && clone.implants.length > 0 && (
                <div className="mt-1 flex gap-1 flex-wrap">
                  {clone.implants.map((imp: { slot: number; name?: string }, idx: number) => (
                    <span key={idx} className="px-1 py-0.5 bg-purple-900/30 text-purple-300 text-[9px] rounded">
                      S{imp.slot}: {imp.name || 'Implant'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {jumpClones.length === 0 && (
          <div className="text-center text-slate-500 py-8 text-xs">
            No jump clones installed.<br />
            Dock at a station to install one.
          </div>
        )}
      </div>
    </div>
  )
})

export function ClonesWindow() {
  return (
    <ManagedWindow
      id="rt-clones"
      title="Clones"
      icon="🧬"
      defaultPosition={{ x: 350, y: 150 }}
      defaultSize={{ width: 380, height: 350 }}
      minWidth={300}
      minHeight={250}
    >
      <ClonesContent />
    </ManagedWindow>
  )
}
