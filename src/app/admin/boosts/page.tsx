'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DataTable, ConfirmDialog } from '@/components/admin/common'
import type { GameBoostType } from '@/types/admin'

export default function BoostsPage() {
  const [boostTypes, setBoostTypes] = useState<GameBoostType[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<GameBoostType | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<GameBoostType | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadBoostTypes()
  }, [])

  const loadBoostTypes = async () => {
    try {
      const response = await fetch('/api/admin/boosts/types')
      const data = await response.json()
      if (data.success) {
        setBoostTypes(data.data)
      }
    } catch (error) {
      console.error('Failed to load boost types:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (boost: GameBoostType) => {
    setSaving(true)
    try {
      const isNew = !boost.id
      const method = isNew ? 'POST' : 'PUT'

      const response = await fetch('/api/admin/boosts/types', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(boost),
      })

      const data = await response.json()
      if (data.success) {
        await loadBoostTypes()
        setEditing(null)
      } else {
        alert(data.error || 'Failed to save boost type')
      }
    } catch (error) {
      console.error('Failed to save boost type:', error)
      alert('Failed to save boost type')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (boost: GameBoostType) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/boosts/types?id=${boost.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        await loadBoostTypes()
        setDeleteConfirm(null)
      } else {
        alert(data.error || 'Failed to delete boost type')
      }
    } catch (error) {
      console.error('Failed to delete boost type:', error)
      alert('Failed to delete boost type')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      key: 'icon',
      label: '',
      width: '50px',
      render: (value: unknown, row: GameBoostType) => (
        <div
          className="w-8 h-8 rounded flex items-center justify-center text-lg"
          style={{ backgroundColor: `${row.color}20` }}
        >
          {String(value)}
        </div>
      ),
    },
    { key: 'key', label: 'Key', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    {
      key: 'multiplier',
      label: 'Multiplier',
      render: (value: unknown) => (
        <span className="text-green-400">x{Number(value)}</span>
      ),
    },
    {
      key: 'duration_minutes',
      label: 'Duration',
      render: (value: unknown) => `${Number(value)}m`,
    },
    {
      key: 'energy_cost',
      label: 'Cost',
      render: (value: unknown) => (
        <span className="text-cyan-400">⚡{Number(value)}</span>
      ),
    },
    { key: 'scope', label: 'Scope' },
    {
      key: 'enabled',
      label: 'Status',
      render: (value: unknown) => (
        <span className={`px-2 py-1 rounded text-xs ${
          value ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
        }`}>
          {value ? 'Active' : 'Disabled'}
        </span>
      ),
    },
  ]

  const createNew = (): GameBoostType => ({
    id: '',
    key: '',
    name: '',
    description: '',
    icon: '⚡',
    color: '#00ffcc',
    glow_color: 'rgba(0, 255, 204, 0.5)',
    multiplier: 1.5,
    duration_minutes: 60,
    energy_cost: 20,
    scope: 'global',
    stackable: false,
    max_stacks: 1,
    cooldown_minutes: 0,
    enabled: true,
    sort_order: 0,
    created_at: '',
    updated_at: '',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Boost Types</h1>
          <p className="text-gray-400 mt-1">Manage available boost types for players</p>
        </div>
        <button
          onClick={() => setEditing(createNew())}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          + New Boost Type
        </button>
      </div>

      <DataTable
        data={boostTypes}
        columns={columns}
        keyField="id"
        loading={loading}
        onEdit={setEditing}
        onDelete={setDeleteConfirm}
        emptyMessage="No boost types found"
      />

      {/* Edit Modal */}
      {editing && (
        <BoostTypeModal
          boostType={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Boost Type"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"?`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
        loading={saving}
      />
    </div>
  )
}

function BoostTypeModal({
  boostType,
  onSave,
  onCancel,
  saving,
}: {
  boostType: GameBoostType
  onSave: (boost: GameBoostType) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState(boostType)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg border border-cyan-500/30">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">
              {boostType.id ? 'Edit Boost Type' : 'Create Boost Type'}
            </h2>
          </div>

          <div className="p-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Key</label>
              <input
                type="text"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <input
                type="text"
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Icon (emoji)</label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Color</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-full h-10 bg-gray-800 border border-gray-700 rounded"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Multiplier</label>
              <input
                type="number"
                step="0.05"
                value={form.multiplier}
                onChange={(e) => setForm({ ...form, multiplier: parseFloat(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Energy Cost</label>
              <input
                type="number"
                value={form.energy_cost}
                onChange={(e) => setForm({ ...form, energy_cost: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Scope</label>
              <select
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value as GameBoostType['scope'] })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              >
                <option value="global">Global</option>
                <option value="planet">Planet</option>
                <option value="fleet">Fleet</option>
              </select>
            </div>

            <div className="col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-400">Enabled</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.stackable}
                  onChange={(e) => setForm({ ...form, stackable: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-400">Stackable</span>
              </label>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  )
}
