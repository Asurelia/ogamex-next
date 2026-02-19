'use client'

import { memo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'
import type { ModuleSlot } from '@/stores/rtGameStore'

// ============================================================================
// HELPERS
// ============================================================================

function slotIcon(type: 'high' | 'mid' | 'low'): string {
  switch (type) {
    case 'high': return '🔫'
    case 'mid': return '🛡️'
    case 'low': return '🔧'
  }
}

function usageBarColor(used: number, max: number): string {
  const pct = max > 0 ? (used / max) * 100 : 0
  if (pct > 95) return 'bg-red-500'
  if (pct > 75) return 'bg-yellow-500'
  return 'bg-cyan-500'
}

// ============================================================================
// USAGE BAR
// ============================================================================

function UsageBar({ label, used, max, unit }: { label: string; used: number; max: number; unit: string }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0
  const overloaded = used > max

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-400">{label}</span>
        <span className={overloaded ? 'text-red-400' : 'text-slate-300'}>
          {used.toFixed(0)} / {max.toFixed(0)} {unit}
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${usageBarColor(used, max)}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  )
}

// ============================================================================
// SLOT ROW
// ============================================================================

function SlotRow({ label, icon, slots }: { label: string; icon: string; slots: ModuleSlot[] }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wider">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {slots.length === 0 && (
          <span className="text-slate-600 text-[10px]">No slots</span>
        )}
        {slots.map((slot) => (
          <div
            key={slot.id}
            className={`w-10 h-10 rounded border flex items-center justify-center text-lg cursor-pointer transition-all ${
              slot.active
                ? 'bg-cyan-900/50 border-cyan-500 shadow-[0_0_6px_rgba(34,211,238,0.3)]'
                : 'bg-slate-800 border-slate-600 hover:border-slate-400'
            }`}
            title={slot.name}
          >
            {slot.icon || slotIcon(slot.type)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// FITTING CONTENT
// ============================================================================

const FittingContent = memo(function FittingContent() {
  const { fitting } = useRTGameStore()

  if (!fitting) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        No ship fitting data
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full text-xs p-3 space-y-3 overflow-y-auto">
      {/* Ship Name */}
      <div className="text-center border-b border-slate-700 pb-2">
        <div className="text-sm font-semibold text-slate-200">{fitting.shipName}</div>
        <div className="text-[10px] text-slate-400 uppercase">{fitting.shipType}</div>
      </div>

      {/* Module Slots */}
      <SlotRow label="High Slots" icon="🔫" slots={fitting.highSlots} />
      <SlotRow label="Mid Slots" icon="🛡️" slots={fitting.midSlots} />
      <SlotRow label="Low Slots" icon="🔧" slots={fitting.lowSlots} />

      {/* Stats Panel */}
      <div className="border-t border-slate-700 pt-2 space-y-1.5">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Ship Stats</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">DPS</span>
            <span className="text-red-400 font-medium">{fitting.dps.toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tank (EHP)</span>
            <span className="text-blue-400 font-medium">{fitting.ehp.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Speed</span>
            <span className="text-green-400 font-medium">{fitting.speed.toFixed(0)} m/s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Capacitor</span>
            <span className="text-yellow-400 font-medium">{fitting.capacitor.toFixed(0)} GJ</span>
          </div>
        </div>
      </div>

      {/* CPU / Powergrid Usage */}
      <div className="space-y-2 border-t border-slate-700 pt-2">
        <UsageBar label="CPU" used={fitting.cpuUsed} max={fitting.cpuMax} unit="tf" />
        <UsageBar label="Powergrid" used={fitting.powergridUsed} max={fitting.powergridMax} unit="MW" />
      </div>
    </div>
  )
})

// ============================================================================
// EXPORT
// ============================================================================

export function FittingWindow() {
  return (
    <ManagedWindow
      id="rt-fitting"
      title="Fitting"
      icon="🔧"
      defaultPosition={{ x: 260, y: 90 }}
      defaultSize={{ width: 360, height: 480 }}
      minWidth={300}
      minHeight={350}
    >
      <FittingContent />
    </ManagedWindow>
  )
}
