'use client'

import { useCallback, memo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'

// ============================================================================
// HELPERS
// ============================================================================

function statusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-green-400'
    case 'warping': return 'text-cyan-400'
    case 'docked': return 'text-yellow-400'
    case 'destroyed': return 'text-red-500'
    default: return 'text-slate-400'
  }
}

function hpBarColor(percent: number): string {
  if (percent > 66) return 'bg-green-500'
  if (percent > 33) return 'bg-yellow-500'
  return 'bg-red-500'
}

const FORMATIONS = [
  { value: 'spread', label: 'Spread' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'wall', label: 'Wall' },
  { value: 'sphere', label: 'Sphere' },
  { value: 'claw', label: 'Claw' },
]

// ============================================================================
// HP BAR
// ============================================================================

function MiniHPBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="flex items-center gap-1" title={`${label}: ${percent.toFixed(0)}%`}>
      <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${hpBarColor(percent)} rounded-full`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

// ============================================================================
// FLEET CONTENT
// ============================================================================

const FleetContent = memo(function FleetContent() {
  const { fleetMembers, fleetFormation, setFleetFormation, fleetCommand } = useRTGameStore()

  const handleCommand = useCallback(
    (cmd: string) => {
      fleetCommand(cmd)
    },
    [fleetCommand],
  )

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Commander Buttons */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-slate-700">
        <button
          onClick={() => handleCommand('warp_fleet')}
          className="px-2 py-1 bg-cyan-700/50 hover:bg-cyan-600/50 text-cyan-300 rounded transition-colors"
        >
          Warp Fleet
        </button>
        <button
          onClick={() => handleCommand('align_fleet')}
          className="px-2 py-1 bg-cyan-700/50 hover:bg-cyan-600/50 text-cyan-300 rounded transition-colors"
        >
          Align Fleet
        </button>
        <button
          onClick={() => handleCommand('engage')}
          className="px-2 py-1 bg-red-700/50 hover:bg-red-600/50 text-red-300 rounded transition-colors"
        >
          Engage Target
        </button>
        <button
          onClick={() => handleCommand('regroup')}
          className="px-2 py-1 bg-yellow-700/50 hover:bg-yellow-600/50 text-yellow-300 rounded transition-colors"
        >
          Regroup
        </button>
      </div>

      {/* Formation Selector */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-slate-700">
        <span className="text-slate-400">Formation:</span>
        <select
          value={fleetFormation}
          onChange={(e) => setFleetFormation(e.target.value)}
          className="bg-slate-800 border border-slate-600 text-slate-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-cyan-600"
        >
          {FORMATIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <span className="ml-auto text-slate-500">{fleetMembers.length} members</span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_80px_60px_40px_40px_40px] gap-1 px-2 py-1 bg-slate-800/50 border-b border-slate-700 text-slate-400">
        <span>Name</span>
        <span>Ship</span>
        <span>Status</span>
        <span title="Shield">S%</span>
        <span title="Armor">A%</span>
        <span title="Hull">H%</span>
      </div>

      {/* Fleet Members */}
      <div className="flex-1 overflow-y-auto">
        {fleetMembers.length === 0 && (
          <div className="text-center text-slate-500 py-4">No fleet members</div>
        )}
        {fleetMembers.map((member) => (
          <div
            key={member.id}
            className="grid grid-cols-[1fr_80px_60px_40px_40px_40px] gap-1 px-2 py-1 hover:bg-slate-800/30 items-center"
          >
            <span className="text-slate-200 truncate">{member.name}</span>
            <span className="text-slate-400 truncate">{member.shipType}</span>
            <span className={`${statusColor(member.status)} capitalize`}>{member.status}</span>
            <MiniHPBar percent={member.shieldPercent} label="Shield" />
            <MiniHPBar percent={member.armorPercent} label="Armor" />
            <MiniHPBar percent={member.hullPercent} label="Hull" />
          </div>
        ))}
      </div>
    </div>
  )
})

// ============================================================================
// EXPORT
// ============================================================================

export function FleetManagerWindow() {
  return (
    <ManagedWindow
      id="rt-fleet"
      title="Fleet Manager"
      icon="👥"
      defaultPosition={{ x: 300, y: 100 }}
      defaultSize={{ width: 480, height: 350 }}
      minWidth={400}
      minHeight={250}
    >
      <FleetContent />
    </ManagedWindow>
  )
}
