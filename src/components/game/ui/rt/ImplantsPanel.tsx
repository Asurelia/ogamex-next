'use client'

/**
 * Implants Panel
 *
 * Shows 10 implant slots, install/remove, set bonus summary.
 */

import { useState, useCallback, memo, useMemo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'

const SLOT_LABELS = [
  'Perception', 'Memory', 'Willpower', 'Intelligence', 'Charisma',
  'Slot 6', 'Slot 7', 'Slot 8', 'Slot 9', 'Slot 10',
]

const ImplantsContent = memo(function ImplantsContent() {
  const { activeImplants, implantSetBonuses } = useRTGameStore()
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)

  const slotMap = useMemo(() => {
    const map = new Map<number, { implantTypeId: string; name: string; bonusDesc: string }>()
    for (const imp of activeImplants) {
      map.set(imp.slot, {
        implantTypeId: imp.implantTypeId,
        name: imp.name || imp.implantTypeId,
        bonusDesc: imp.description || '',
      })
    }
    return map
  }, [activeImplants])

  const handleRemove = useCallback((slot: number) => {
    useRTGameStore.getState().implantRemove(slot)
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Implant Slots */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <div className="text-xs text-slate-400 mb-1 px-1">Attribute Implants (1-5)</div>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((slot) => {
          const implant = slotMap.get(slot)
          const isAttribute = slot <= 5

          return (
            <div key={slot}>
              {slot === 6 && (
                <div className="text-xs text-slate-400 mt-2 mb-1 px-1">Hardwiring Implants (6-10)</div>
              )}
              <div
                className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                  selectedSlot === slot
                    ? 'border border-cyan-600 bg-cyan-900/20'
                    : 'border border-transparent bg-slate-800/50 hover:bg-slate-800'
                }`}
                onClick={() => setSelectedSlot(slot)}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                    implant
                      ? isAttribute ? 'bg-blue-900/50 text-blue-300' : 'bg-purple-900/50 text-purple-300'
                      : 'bg-slate-700 text-slate-500'
                  }`}>
                    {slot}
                  </div>
                  <div>
                    <div className="text-xs text-slate-200">
                      {implant ? implant.name : `Empty - ${SLOT_LABELS[slot - 1]}`}
                    </div>
                    {implant && (
                      <div className="text-[10px] text-slate-400">{implant.bonusDesc}</div>
                    )}
                  </div>
                </div>
                {implant && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(slot) }}
                    className="px-2 py-0.5 bg-red-900/30 hover:bg-red-900/50 text-red-300 text-[10px] rounded"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Set Bonuses */}
      {implantSetBonuses.length > 0 && (
        <div className="border-t border-slate-700 p-2">
          <div className="text-xs text-slate-400 mb-1">Set Bonuses</div>
          {implantSetBonuses.map((bonus, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-purple-300">{bonus.type.replace(/_/g, ' ')}</span>
              <span className="text-green-400">+{bonus.totalBonus}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

export function ImplantsPanel() {
  return (
    <ManagedWindow
      id="rt-implants"
      title="Implants"
      icon="🧠"
      defaultPosition={{ x: 400, y: 200 }}
      defaultSize={{ width: 360, height: 400 }}
      minWidth={300}
      minHeight={300}
    >
      <ImplantsContent />
    </ManagedWindow>
  )
}
