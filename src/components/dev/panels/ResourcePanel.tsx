'use client'

import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'

export function ResourcePanel() {
  const { currentPlanet, user } = useGameStore()
  const [amounts, setAmounts] = useState({
    metal: 10000,
    crystal: 10000,
    deuterium: 5000,
    dark_matter: 100,
  })
  const [loading, setLoading] = useState(false)

  const quickAmounts = [
    { label: '10K', value: 10000 },
    { label: '100K', value: 100000 },
    { label: '1M', value: 1000000 },
    { label: '10M', value: 10000000 },
  ]

  const handleInject = async (resourceType: 'all' | keyof typeof amounts) => {
    if (!user || !currentPlanet) return

    setLoading(true)
    try {
      const payload: Record<string, number | string> = {
        reason: 'Dev overlay injection',
      }

      if (resourceType === 'all' || resourceType === 'metal' || resourceType === 'crystal' || resourceType === 'deuterium') {
        payload.planet_id = currentPlanet.id
      }

      if (resourceType === 'all') {
        payload.metal = amounts.metal
        payload.crystal = amounts.crystal
        payload.deuterium = amounts.deuterium
        payload.dark_matter = amounts.dark_matter
      } else {
        payload[resourceType] = amounts[resourceType]
      }

      const response = await fetch(`/api/admin/players/${user.id}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (data.success) {
        // Refresh page to show new resources
        window.location.reload()
      } else {
        console.error('Failed to inject:', data.error)
      }
    } catch (error) {
      console.error('Failed to inject resources:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
        Inject Resources
      </h3>

      {/* Quick amounts */}
      <div className="flex gap-2">
        {quickAmounts.map((qa) => (
          <button
            key={qa.label}
            onClick={() => setAmounts({
              metal: qa.value,
              crystal: qa.value,
              deuterium: Math.floor(qa.value / 2),
              dark_matter: Math.floor(qa.value / 100),
            })}
            className="flex-1 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* Resource inputs */}
      <div className="space-y-2">
        <ResourceInput
          label="Metal"
          icon="🔩"
          color="#9ca3af"
          value={amounts.metal}
          onChange={(v) => setAmounts({ ...amounts, metal: v })}
          onInject={() => handleInject('metal')}
          loading={loading}
        />
        <ResourceInput
          label="Crystal"
          icon="💎"
          color="#60a5fa"
          value={amounts.crystal}
          onChange={(v) => setAmounts({ ...amounts, crystal: v })}
          onInject={() => handleInject('crystal')}
          loading={loading}
        />
        <ResourceInput
          label="Deuterium"
          icon="⚗️"
          color="#34d399"
          value={amounts.deuterium}
          onChange={(v) => setAmounts({ ...amounts, deuterium: v })}
          onInject={() => handleInject('deuterium')}
          loading={loading}
        />
        <ResourceInput
          label="Dark Matter"
          icon="💜"
          color="#a78bfa"
          value={amounts.dark_matter}
          onChange={(v) => setAmounts({ ...amounts, dark_matter: v })}
          onInject={() => handleInject('dark_matter')}
          loading={loading}
        />
      </div>

      {/* Inject all button */}
      <button
        onClick={() => handleInject('all')}
        disabled={loading}
        className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {loading ? 'Injecting...' : 'Inject All Resources'}
      </button>

      {/* Current planet info */}
      {currentPlanet && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            Current: {currentPlanet.name} [{currentPlanet.galaxy}:{currentPlanet.system}:{currentPlanet.position}]
          </p>
        </div>
      )}
    </div>
  )
}

function ResourceInput({
  label,
  icon,
  color,
  value,
  onChange,
  onInject,
  loading,
}: {
  label: string
  icon: string
  color: string
  value: number
  onChange: (v: number) => void
  onInject: () => void
  loading: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
      />
      <button
        onClick={onInject}
        disabled={loading}
        className="px-2 py-1 text-xs rounded transition-colors disabled:opacity-50"
        style={{ backgroundColor: `${color}20`, color }}
      >
        +
      </button>
    </div>
  )
}

export default ResourcePanel
