'use client'

import { memo } from 'react'
import { useRTGameStore } from '@/stores/rtGameStore'

// ============================================================================
// HELPERS
// ============================================================================

function securityColor(sec: number): string {
  if (sec >= 0.8) return 'text-green-400'
  if (sec >= 0.5) return 'text-yellow-400'
  if (sec >= 0.1) return 'text-orange-400'
  return 'text-red-500'
}

function securityBg(sec: number): string {
  if (sec >= 0.8) return 'bg-green-500/20'
  if (sec >= 0.5) return 'bg-yellow-500/20'
  if (sec >= 0.1) return 'bg-orange-500/20'
  return 'bg-red-500/20'
}

function hpPercent(current: number, max: number): number {
  return max > 0 ? Math.min(100, (current / max) * 100) : 0
}

// ============================================================================
// SHIP STATUS BAR
// ============================================================================

function ShipBar({ label, percent, color }: { label: string; percent: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-slate-400 w-6 text-right uppercase">{label}</span>
      <div className="w-32 h-3 bg-slate-800 rounded-sm overflow-hidden border border-slate-700/50">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-300 w-8">{percent.toFixed(0)}%</span>
    </div>
  )
}

// ============================================================================
// MODULE RACK
// ============================================================================

const ModuleRack = memo(function ModuleRack() {
  const { modules, toggleModule } = useRTGameStore()

  // Pad to 8 slots
  const slots = Array.from({ length: 8 }, (_, i) => modules[i] || null)

  return (
    <div className="flex gap-1">
      {slots.map((mod, i) => (
        <button
          key={mod?.id ?? `empty-${i}`}
          onClick={() => mod && toggleModule(mod.id)}
          disabled={!mod}
          className={`w-9 h-9 rounded border text-sm flex items-center justify-center transition-all ${
            mod
              ? mod.active
                ? 'bg-cyan-900/60 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)] text-white'
                : 'bg-slate-800 border-slate-600 hover:border-slate-400 text-slate-300'
              : 'bg-slate-900/50 border-slate-700/30 text-slate-600 cursor-default'
          }`}
          title={mod?.name ?? 'Empty'}
        >
          {mod?.icon ?? '-'}
        </button>
      ))}
    </div>
  )
})

// ============================================================================
// LOCKED TARGETS
// ============================================================================

const LockedTargets = memo(function LockedTargets() {
  const { lockedTargets, setSelectedTarget, selectedTargetId } = useRTGameStore()

  if (lockedTargets.length === 0) return null

  return (
    <div className="flex gap-1.5">
      {lockedTargets.slice(0, 5).map((target) => {
        const shieldPct = target.shieldPercent
        const armorPct = target.armorPercent
        const hullPct = target.hullPercent
        const isSelected = selectedTargetId === target.id

        return (
          <button
            key={target.id}
            onClick={() => setSelectedTarget(target.id)}
            className={`flex flex-col items-center gap-0.5 p-1 rounded border transition-all ${
              isSelected
                ? 'bg-cyan-900/40 border-cyan-500'
                : 'bg-slate-800/80 border-slate-600 hover:border-slate-400'
            }`}
            title={`${target.name} (${target.type})`}
          >
            <span className="text-[9px] text-slate-300 truncate max-w-[48px]">{target.name}</span>
            <div className="flex gap-px">
              <div className="w-1 h-3 bg-slate-700 rounded-sm overflow-hidden">
                <div className="w-full bg-blue-500" style={{ height: `${shieldPct}%`, marginTop: `${100 - shieldPct}%` }} />
              </div>
              <div className="w-1 h-3 bg-slate-700 rounded-sm overflow-hidden">
                <div className="w-full bg-orange-500" style={{ height: `${armorPct}%`, marginTop: `${100 - armorPct}%` }} />
              </div>
              <div className="w-1 h-3 bg-slate-700 rounded-sm overflow-hidden">
                <div className="w-full bg-red-500" style={{ height: `${hullPct}%`, marginTop: `${100 - hullPct}%` }} />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
})

// ============================================================================
// ROUTE INDICATOR
// ============================================================================

const RouteIndicator = memo(function RouteIndicator() {
  const route = useRTGameStore(s => s.route)
  const routeDestination = useRTGameStore(s => s.routeDestination)

  if (route.length === 0 || !routeDestination) return null

  const jumpsRemaining = Math.max(0, route.length - 1)

  return (
    <div
      className="fixed z-50"
      style={{
        left: '60px',
        top: '44px',
        background: 'rgba(10, 14, 20, 0.7)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 170, 0, 0.3)',
        borderRadius: '4px',
        padding: '4px 10px',
      }}
    >
      <span className="text-[10px] text-amber-400">
        {routeDestination} ({jumpsRemaining} jump{jumpsRemaining !== 1 ? 's' : ''})
      </span>
    </div>
  )
})

// ============================================================================
// HUD OVERLAY (fixed position, not a managed window)
// ============================================================================

export const HUDOverlay = memo(function HUDOverlay() {
  const { systemName, securityLevel, myShipId, ships, getMyShip } = useRTGameStore()

  const myShip = getMyShip()
  const shieldPct = myShip ? hpPercent(myShip.shield, myShip.shieldMax) : 100
  const armorPct = myShip ? hpPercent(myShip.armor, myShip.armorMax) : 100
  const hullPct = myShip ? hpPercent(myShip.hp, myShip.hpMax) : 100
  const capPct = myShip ? hpPercent(myShip.capacitor, myShip.capacitorMax) : 100
  const speed = myShip?.speed ?? 0
  const maxSpeed = myShip?.maxSpeed ?? 1

  return (
    <>
      {/* System name + Security - Top Left (offset for Neocom) */}
      <div
        className="fixed top-3 z-50 flex items-center gap-2 rounded px-3 py-1.5"
        style={{
          left: '60px',
          background: 'rgba(10, 14, 20, 0.75)',
          backdropFilter: 'blur(12px) saturate(0.8)',
          border: '1px solid rgba(80, 120, 160, 0.3)',
        }}
      >
        <span className="text-sm font-semibold text-slate-200">{systemName || 'Unknown'}</span>
        <span
          className={`text-xs font-bold px-1.5 py-0.5 rounded ${securityBg(securityLevel)} ${securityColor(securityLevel)}`}
        >
          {securityLevel.toFixed(1)}
        </span>
      </div>

      {/* Route indicator - Top Left below system name */}
      <RouteIndicator />

      {/* Locked targets - Top Right */}
      <div className="fixed top-3 right-3 z-50">
        <LockedTargets />
      </div>

      {/* Bottom center HUD */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
        {/* Ship HP bars - Glassmorphism */}
        <div
          className="rounded-lg px-4 py-3 space-y-1"
          style={{
            background: 'rgba(10, 14, 20, 0.8)',
            backdropFilter: 'blur(12px) saturate(0.8)',
            border: '1px solid rgba(80, 120, 160, 0.25)',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
          }}
        >
          <ShipBar label="SH" percent={shieldPct} color="bg-blue-500" />
          <ShipBar label="AR" percent={armorPct} color="bg-orange-500" />
          <ShipBar label="HL" percent={hullPct} color="bg-red-500" />

          <div className="border-t border-slate-700/50 pt-1 mt-1" />
          <ShipBar label="CAP" percent={capPct} color="bg-yellow-500" />

          {/* Speed */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="text-[10px] text-slate-400">Speed:</span>
            <span className="text-sm font-mono text-slate-200">{speed.toFixed(0)}</span>
            <span className="text-[10px] text-slate-500">/ {maxSpeed.toFixed(0)} m/s</span>
          </div>

          {/* Module rack */}
          <div className="flex justify-center pt-1">
            <ModuleRack />
          </div>
        </div>
      </div>
    </>
  )
})
