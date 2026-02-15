'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameConfigEntry, ConfigCategory } from '@/types/admin'

const CATEGORY_INFO: Record<ConfigCategory, { icon: string; color: string; description: string }> = {
  production: { icon: '⛏️', color: '#00ff88', description: 'Resource production settings' },
  construction: { icon: '🏗️', color: '#ffaa00', description: 'Building construction settings' },
  research: { icon: '🔬', color: '#aa88ff', description: 'Research settings' },
  combat: { icon: '⚔️', color: '#ff6b6b', description: 'Combat mechanics settings' },
  fleet: { icon: '🚀', color: '#00aaff', description: 'Fleet movement settings' },
  economy: { icon: '💰', color: '#ffd700', description: 'Economy settings' },
  universe: { icon: '🌌', color: '#8b5cf6', description: 'Universe structure settings' },
  features: { icon: '✨', color: '#f472b6', description: 'Feature toggles' },
  limits: { icon: '🚫', color: '#ef4444', description: 'Game limits' },
  formulas: { icon: '📐', color: '#06b6d4', description: 'Game formulas' },
}

export default function ConfigPage() {
  const [config, setConfig] = useState<GameConfigEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<ConfigCategory | 'all'>('all')
  const [editedValues, setEditedValues] = useState<Record<string, unknown>>({})

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/config')
      const data = await response.json()
      if (data.success) {
        setConfig(data.data)
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (Object.keys(editedValues).length === 0) return

    setSaving(true)
    try {
      const updates = Object.entries(editedValues).map(([key, value]) => ({
        key,
        value,
      }))

      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      const data = await response.json()
      if (data.success) {
        setEditedValues({})
        await loadConfig()

        // Invalidate cache
        await fetch('/api/admin/config/cache', { method: 'POST' })
        alert('Configuration saved and cache invalidated')
      } else {
        alert(data.error || 'Failed to save configuration')
      }
    } catch (error) {
      console.error('Failed to save config:', error)
      alert('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const categories = [...new Set(config.map((c) => c.category))] as ConfigCategory[]
  const filteredConfig = selectedCategory === 'all'
    ? config
    : config.filter((c) => c.category === selectedCategory)

  const groupedConfig = filteredConfig.reduce((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = []
    acc[entry.category].push(entry)
    return acc
  }, {} as Record<string, GameConfigEntry[]>)

  const hasChanges = Object.keys(editedValues).length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Game Configuration</h1>
          <p className="text-gray-400 mt-1">Configure game settings dynamically</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-orange-400">
              {Object.keys(editedValues).length} unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedCategory === 'all'
              ? 'bg-cyan-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              selectedCategory === cat
                ? 'text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            style={{
              backgroundColor: selectedCategory === cat ? CATEGORY_INFO[cat]?.color : undefined,
            }}
          >
            <span>{CATEGORY_INFO[cat]?.icon}</span>
            <span className="capitalize">{cat}</span>
          </button>
        ))}
      </div>

      {/* Config Entries */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading configuration...</div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedConfig).map(([category, entries]) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-gray-700 overflow-hidden"
            >
              <div
                className="px-6 py-4 flex items-center gap-3"
                style={{
                  backgroundColor: `${CATEGORY_INFO[category as ConfigCategory]?.color}15`,
                  borderBottom: `1px solid ${CATEGORY_INFO[category as ConfigCategory]?.color}30`,
                }}
              >
                <span className="text-2xl">{CATEGORY_INFO[category as ConfigCategory]?.icon}</span>
                <div>
                  <h2 className="text-lg font-semibold capitalize text-white">{category}</h2>
                  <p className="text-sm text-gray-400">
                    {CATEGORY_INFO[category as ConfigCategory]?.description}
                  </p>
                </div>
              </div>
              <div className="divide-y divide-gray-800">
                {entries.map((entry) => (
                  <ConfigRow
                    key={entry.key}
                    entry={entry}
                    value={editedValues[entry.key] ?? entry.value}
                    onChange={(value) =>
                      setEditedValues((prev) => ({ ...prev, [entry.key]: value }))
                    }
                    hasChange={entry.key in editedValues}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function ConfigRow({
  entry,
  value,
  onChange,
  hasChange,
}: {
  entry: GameConfigEntry
  value: unknown
  onChange: (value: unknown) => void
  hasChange: boolean
}) {
  const renderInput = () => {
    switch (entry.value_type) {
      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChange(true)}
              className={`px-3 py-1 rounded ${
                value === true || value === 'true'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              On
            </button>
            <button
              onClick={() => onChange(false)}
              className={`px-3 py-1 rounded ${
                value === false || value === 'false'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              Off
            </button>
          </div>
        )
      case 'number':
        return (
          <input
            type="number"
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            min={entry.min_value as number | undefined}
            max={entry.max_value as number | undefined}
            className="w-32 px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-right"
          />
        )
      case 'formula':
        return (
          <textarea
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white font-mono text-sm"
            rows={2}
          />
        )
      default:
        return (
          <input
            type="text"
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            className="w-64 px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white"
          />
        )
    }
  }

  return (
    <div
      className={`px-6 py-4 flex items-start justify-between gap-4 ${
        hasChange ? 'bg-orange-500/10' : 'bg-gray-900'
      }`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <code className="text-cyan-400 text-sm">{entry.key}</code>
          {hasChange && (
            <span className="text-xs px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">
              modified
            </span>
          )}
        </div>
        {entry.description && (
          <p className="text-sm text-gray-500 mt-1">{entry.description}</p>
        )}
        {entry.min_value !== null && entry.max_value !== null && (
          <p className="text-xs text-gray-600 mt-1">
            Range: {String(entry.min_value)} - {String(entry.max_value)}
          </p>
        )}
      </div>
      <div>{renderInput()}</div>
    </div>
  )
}
