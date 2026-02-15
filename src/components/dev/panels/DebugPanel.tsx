'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { GameConfigService } from '@/lib/game/GameConfigService'

export function DebugPanel() {
  const { user, currentPlanet, planets, research } = useGameStore()
  const [cacheStatus, setCacheStatus] = useState<{
    initialized: boolean
    cacheAge: number
    cacheAgeFormatted: string
  } | null>(null)
  const [invalidating, setInvalidating] = useState(false)

  useEffect(() => {
    loadCacheStatus()
  }, [])

  const loadCacheStatus = async () => {
    try {
      const response = await fetch('/api/admin/config/cache')
      const data = await response.json()
      if (data.success) {
        setCacheStatus(data.data)
      }
    } catch (error) {
      console.error('Failed to load cache status:', error)
    }
  }

  const invalidateCache = async () => {
    setInvalidating(true)
    try {
      await fetch('/api/admin/config/cache', { method: 'POST' })
      await loadCacheStatus()
    } catch (error) {
      console.error('Failed to invalidate cache:', error)
    } finally {
      setInvalidating(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
        Debug Info
      </h3>

      {/* Cache Status */}
      <div className="p-3 rounded bg-gray-800/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Config Cache</span>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              cacheStatus?.initialized
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {cacheStatus?.initialized ? 'Active' : 'Not loaded'}
          </span>
        </div>
        {cacheStatus && (
          <p className="text-xs text-gray-500 mb-2">
            Age: {cacheStatus.cacheAgeFormatted}
          </p>
        )}
        <button
          onClick={invalidateCache}
          disabled={invalidating}
          className="w-full py-1.5 text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded transition-colors disabled:opacity-50"
        >
          {invalidating ? 'Invalidating...' : '🔄 Invalidate Cache'}
        </button>
      </div>

      {/* Current State */}
      <div className="space-y-2">
        <DebugRow label="User ID" value={user?.id || 'N/A'} />
        <DebugRow label="Username" value={user?.username || 'N/A'} />
        <DebugRow label="Planet ID" value={currentPlanet?.id || 'N/A'} />
        <DebugRow label="Planet Name" value={currentPlanet?.name || 'N/A'} />
        <DebugRow label="Coordinates" value={
          currentPlanet
            ? `[${currentPlanet.galaxy}:${currentPlanet.system}:${currentPlanet.position}]`
            : 'N/A'
        } />
        <DebugRow label="Total Planets" value={planets?.length?.toString() || '0'} />
      </div>

      {/* Current Resources */}
      {currentPlanet && (
        <div className="p-3 rounded bg-gray-800/50">
          <p className="text-xs text-gray-500 mb-2">Current Resources</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-gray-400">Metal</div>
              <div className="text-white font-mono">
                {Math.floor(currentPlanet.metal).toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-blue-400">Crystal</div>
              <div className="text-white font-mono">
                {Math.floor(currentPlanet.crystal).toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-green-400">Deut</div>
              <div className="text-white font-mono">
                {Math.floor(currentPlanet.deuterium).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-2">
        <button
          onClick={() => window.location.reload()}
          className="w-full py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
        >
          🔄 Reload Page
        </button>
        <button
          onClick={() => window.open('/admin', '_blank')}
          className="w-full py-1.5 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded transition-colors"
        >
          🎛️ Open Admin Panel
        </button>
      </div>
    </div>
  )
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 font-mono truncate max-w-[180px]" title={value}>
        {value}
      </span>
    </div>
  )
}

export default DebugPanel
