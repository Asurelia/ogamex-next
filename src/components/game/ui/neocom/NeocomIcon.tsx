'use client'

/**
 * NeocomIcon - Single icon button for the Neocom sidebar
 *
 * Features faction-colored hover glow and notification badge.
 */

import { memo } from 'react'

interface NeocomIconProps {
  icon: string
  label: string
  isActive: boolean
  badge?: number
  onClick: () => void
}

export const NeocomIcon = memo(function NeocomIcon({ icon, label, isActive, badge, onClick }: NeocomIconProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative w-10 h-10 flex items-center justify-center rounded-md
        transition-all duration-200 group
        ${isActive
          ? 'bg-cyan-900/50 border border-cyan-500/50 shadow-[0_0_8px_rgba(0,170,255,0.2)]'
          : 'bg-slate-800/40 border border-transparent hover:bg-slate-700/50 hover:border-slate-600/50'
        }
      `}
      title={label}
    >
      <span className="text-lg">{icon}</span>

      {/* Notification badge */}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-[8px] font-bold rounded-full animate-pulse">
          {badge > 9 ? '9+' : badge}
        </span>
      )}

      {/* Tooltip */}
      <span className="
        absolute left-full ml-2 px-2 py-1 text-xs text-slate-200
        bg-slate-800/95 border border-slate-600/50 rounded whitespace-nowrap
        opacity-0 group-hover:opacity-100 pointer-events-none
        transition-opacity z-[300]
      ">
        {label}
      </span>
    </button>
  )
})
