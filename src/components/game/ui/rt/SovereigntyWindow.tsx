'use client'

/**
 * Sovereignty Window
 *
 * System sovereignty info, ADM bars, structure list, vulnerability window.
 */

import { useState, useCallback, memo, useMemo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'

const ADM_BAR_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-cyan-500']

function ADMBar({ label, value, maxValue = 5 }: { label: string; value: number; maxValue?: number }) {
  const pct = Math.min(100, (value / maxValue) * 100)
  const colorIdx = Math.min(4, Math.floor(pct / 25))

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200">{value.toFixed(2)}/{maxValue}</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${ADM_BAR_COLORS[colorIdx]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

const STRUCTURE_ICONS: Record<string, string> = {
  tcu: '🏴',
  ihub: '🏗️',
  station_egg: '🥚',
  cyno_jammer: '🛡️',
  cyno_beacon: '📡',
  jump_bridge: '🌉',
}

const SovereigntyContent = memo(function SovereigntyContent() {
  const { sovereigntyInfo, sovStructures } = useRTGameStore()

  if (!sovereigntyInfo) {
    return (
      <div className="p-3 text-center text-slate-500 text-xs">
        <div className="mb-2">No sovereignty data for this system</div>
        <div className="text-[10px] text-slate-600">
          Sovereignty is only available in nullsec systems.
          <br />Deploy a TCU to claim sovereignty.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-3 space-y-3">
      {/* System Sov Info */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-200">System Sovereignty</span>
          <span className="text-[10px] text-cyan-400">Level {sovereigntyInfo.sovLevel}</span>
        </div>
        <div className="text-[10px] text-slate-400">
          Owner: {sovereigntyInfo.ownerCorpName || 'Unknown'}
        </div>
      </div>

      {/* ADM Indices */}
      <div className="space-y-2">
        <div className="text-xs text-slate-400">Activity Defense Multiplier</div>
        <ADMBar label="Military" value={sovereigntyInfo.militaryIndex} />
        <ADMBar label="Industrial" value={sovereigntyInfo.industrialIndex} />
        <ADMBar label="Strategic" value={sovereigntyInfo.strategicIndex} />
      </div>

      {/* Structures */}
      <div className="flex-1 overflow-y-auto space-y-1">
        <div className="text-xs text-slate-400">Structures ({sovStructures.length})</div>
        {sovStructures.map((structure) => {
          const maxHp = structure.hp + structure.shield
          const hpPct = maxHp > 0 ? (structure.hp / maxHp) * 100 : 0

          return (
            <div key={structure.id} className="p-2 bg-slate-800/50 rounded border border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span>{STRUCTURE_ICONS[structure.structureType] || '🏗️'}</span>
                  <span className="text-xs text-slate-200">
                    {structure.structureType.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  structure.state === 'online' ? 'bg-green-900/50 text-green-300' :
                  structure.state === 'reinforced' ? 'bg-red-900/50 text-red-300' :
                  structure.state === 'anchoring' ? 'bg-yellow-900/50 text-yellow-300' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {structure.state}
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                <span>HP: {structure.hp.toLocaleString()} | Shield: {structure.shield.toLocaleString()}</span>
                <span>Vuln: {structure.vulnerabilityStartHour}:00 ({structure.vulnerabilityDurationHours}h)</span>
              </div>
              {structure.state === 'reinforced' && (
                <div className="text-[10px] text-red-400 mt-0.5">
                  Structure is reinforced
                </div>
              )}
            </div>
          )
        })}

        {sovStructures.length === 0 && (
          <div className="text-center text-slate-500 py-4 text-xs">
            No sovereignty structures deployed
          </div>
        )}
      </div>

      {/* Deploy */}
      <div className="border-t border-slate-700 pt-2">
        <div className="flex gap-1">
          <button
            onClick={() => useRTGameStore.getState().sovDeployStructure('tcu')}
            className="flex-1 px-2 py-1 bg-cyan-800 hover:bg-cyan-700 text-white text-[10px] rounded"
          >
            Deploy TCU
          </button>
          <button
            onClick={() => useRTGameStore.getState().sovDeployStructure('ihub')}
            className="flex-1 px-2 py-1 bg-cyan-800 hover:bg-cyan-700 text-white text-[10px] rounded"
          >
            Deploy iHub
          </button>
        </div>
      </div>
    </div>
  )
})

export function SovereigntyWindow() {
  return (
    <ManagedWindow
      id="rt-sovereignty"
      title="Sovereignty"
      icon="🏴"
      defaultPosition={{ x: 350, y: 100 }}
      defaultSize={{ width: 380, height: 450 }}
      minWidth={320}
      minHeight={350}
    >
      <SovereigntyContent />
    </ManagedWindow>
  )
}
