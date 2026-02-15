'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'
import type { GameBoostType } from '@/types/admin'

export function BoostPanel() {
  const { user, activeBoosts, setActiveBoosts } = useGameStore()
  const [boostTypes, setBoostTypes] = useState<GameBoostType[]>([])
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState<string | null>(null)

  useEffect(() => {
    loadBoostTypes()
  }, [])

  const loadBoostTypes = async () => {
    try {
      const response = await fetch('/api/admin/boosts/types')
      const data = await response.json()
      if (data.success) {
        setBoostTypes(data.data.filter((b: GameBoostType) => b.enabled))
      }
    } catch (error) {
      console.error('Failed to load boost types:', error)
    } finally {
      setLoading(false)
    }
  }

  const activateBoost = async (boostType: GameBoostType) => {
    if (!user) return

    setActivating(boostType.key)
    try {
      const response = await fetch(`/api/admin/players/${user.id}/boosts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boost_type: boostType.key,
          multiplier: boostType.multiplier,
          duration_minutes: boostType.duration_minutes,
          reason: 'Dev overlay activation',
        }),
      })

      const data = await response.json()
      if (data.success) {
        setActiveBoosts([...activeBoosts, data.data])
      } else {
        console.error('Failed to activate boost:', data.error)
      }
    } catch (error) {
      console.error('Failed to activate boost:', error)
    } finally {
      setActivating(null)
    }
  }

  const isBoostActive = (key: string): boolean => {
    const now = new Date()
    return activeBoosts.some(
      (b) => b.boost_type === key && new Date(b.ends_at) > now
    )
  }

  const getBoostRemainingTime = (key: string): string => {
    const now = new Date()
    const boost = activeBoosts.find(
      (b) => b.boost_type === key && new Date(b.ends_at) > now
    )
    if (!boost) return ''

    const remaining = Math.max(0, new Date(boost.ends_at).getTime() - now.getTime())
    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
        Quick Boost Activation
      </h3>

      {loading ? (
        <div className="text-center text-gray-500 py-4">Loading...</div>
      ) : (
        <div className="space-y-2">
          {boostTypes.map((boost) => {
            const active = isBoostActive(boost.key)
            const remaining = active ? getBoostRemainingTime(boost.key) : ''

            return (
              <div
                key={boost.key}
                className="flex items-center justify-between p-2 rounded"
                style={{
                  backgroundColor: active ? `${boost.color}15` : 'rgba(30, 40, 60, 0.5)',
                  border: `1px solid ${active ? boost.color : 'transparent'}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-8 h-8 rounded flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${boost.color}20` }}
                  >
                    {boost.icon}
                  </span>
                  <div>
                    <div className="text-sm text-white">{boost.name}</div>
                    <div className="text-xs text-gray-500">
                      x{boost.multiplier} • {boost.duration_minutes}m
                    </div>
                  </div>
                </div>

                {active ? (
                  <span
                    className="text-xs px-2 py-1 rounded"
                    style={{ color: boost.color, backgroundColor: `${boost.color}20` }}
                  >
                    {remaining}
                  </span>
                ) : (
                  <button
                    onClick={() => activateBoost(boost)}
                    disabled={activating === boost.key}
                    className="px-3 py-1 text-xs rounded transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: boost.color,
                      color: '#000',
                    }}
                  >
                    {activating === boost.key ? '...' : 'Activate'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Active boosts summary */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          {activeBoosts.filter((b) => new Date(b.ends_at) > new Date()).length} active boosts
        </p>
      </div>
    </div>
  )
}

export default BoostPanel
