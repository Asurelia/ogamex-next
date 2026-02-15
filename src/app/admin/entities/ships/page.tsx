'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DataTable, ConfirmDialog } from '@/components/admin/common'
import { useAdminPermission } from '@/stores/adminStore'
import { ADMIN_PERMISSIONS } from '@/types/admin'

interface Ship {
  id: number
  key: string
  name: string
  category: 'military' | 'civil'
  cost_metal: number
  cost_crystal: number
  cost_deuterium: number
  structural_integrity: number
  shield_power: number
  weapon_power: number
  speed: number
  cargo_capacity: number
  fuel_consumption: number
  drive_type: string
  enabled: boolean
  sort_order: number
}

export default function ShipsPage() {
  const [ships, setShips] = useState<Ship[]>([])
  const [loading, setLoading] = useState(true)
  const [editingShip, setEditingShip] = useState<Ship | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Ship | null>(null)
  const [saving, setSaving] = useState(false)

  const canEdit = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_UPDATE)
  const canDelete = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_DELETE)
  const canCreate = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_CREATE)

  useEffect(() => {
    loadShips()
  }, [])

  const loadShips = async () => {
    try {
      const response = await fetch('/api/admin/entities/ships')
      const data = await response.json()
      if (data.success) {
        setShips(data.data)
      }
    } catch (error) {
      console.error('Failed to load ships:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (ship: Ship) => {
    setSaving(true)
    try {
      const isNew = !ship.id
      const url = isNew
        ? '/api/admin/entities/ships'
        : `/api/admin/entities/ships/${ship.id}`
      const method = isNew ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ship),
      })

      const data = await response.json()
      if (data.success) {
        await loadShips()
        setEditingShip(null)
      } else {
        alert(data.error || 'Failed to save ship')
      }
    } catch (error) {
      console.error('Failed to save ship:', error)
      alert('Failed to save ship')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (ship: Ship) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/entities/ships/${ship.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        await loadShips()
        setDeleteConfirm(null)
      } else {
        alert(data.error || 'Failed to delete ship')
      }
    } catch (error) {
      console.error('Failed to delete ship:', error)
      alert('Failed to delete ship')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID', width: '60px', sortable: true },
    { key: 'key', label: 'Key', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    {
      key: 'category',
      label: 'Category',
      render: (value: unknown) => (
        <span className={`px-2 py-1 rounded text-xs ${
          value === 'military' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
        }`}>
          {String(value)}
        </span>
      ),
    },
    {
      key: 'cost_metal',
      label: 'Metal',
      render: (value: unknown) => (
        <span className="text-gray-400">{Number(value).toLocaleString()}</span>
      ),
    },
    {
      key: 'cost_crystal',
      label: 'Crystal',
      render: (value: unknown) => (
        <span className="text-blue-400">{Number(value).toLocaleString()}</span>
      ),
    },
    { key: 'weapon_power', label: 'Attack', sortable: true },
    { key: 'shield_power', label: 'Shield', sortable: true },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Ships</h1>
          <p className="text-gray-400 mt-1">Manage military and civil ships</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setEditingShip({
              id: 0,
              key: '',
              name: '',
              category: 'military',
              cost_metal: 0,
              cost_crystal: 0,
              cost_deuterium: 0,
              structural_integrity: 4000,
              shield_power: 10,
              weapon_power: 50,
              speed: 12500,
              cargo_capacity: 50,
              fuel_consumption: 20,
              drive_type: 'combustion',
              enabled: true,
              sort_order: 0,
            })}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            + New Ship
          </button>
        )}
      </div>

      {/* Table */}
      <DataTable
        data={ships}
        columns={columns}
        keyField="id"
        loading={loading}
        searchable
        searchPlaceholder="Search ships..."
        onEdit={canEdit ? setEditingShip : undefined}
        onDelete={canDelete ? setDeleteConfirm : undefined}
        emptyMessage="No ships found"
      />

      {/* Edit Modal */}
      {editingShip && (
        <ShipEditModal
          ship={editingShip}
          onSave={handleSave}
          onCancel={() => setEditingShip(null)}
          saving={saving}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Ship"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
        loading={saving}
      />
    </div>
  )
}

function ShipEditModal({
  ship,
  onSave,
  onCancel,
  saving,
}: {
  ship: Ship
  onSave: (ship: Ship) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState(ship)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/70 z-50"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg border border-cyan-500/30">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">
              {ship.id ? 'Edit Ship' : 'Create Ship'}
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
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as 'military' | 'civil' })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              >
                <option value="military">Military</option>
                <option value="civil">Civil</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Drive Type</label>
              <select
                value={form.drive_type}
                onChange={(e) => setForm({ ...form, drive_type: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              >
                <option value="combustion">Combustion</option>
                <option value="impulse">Impulse</option>
                <option value="hyperspace">Hyperspace</option>
              </select>
            </div>

            <div className="col-span-2 border-t border-gray-700 pt-4 mt-2">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Costs</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Metal</label>
                  <input
                    type="number"
                    value={form.cost_metal}
                    onChange={(e) => setForm({ ...form, cost_metal: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Crystal</label>
                  <input
                    type="number"
                    value={form.cost_crystal}
                    onChange={(e) => setForm({ ...form, cost_crystal: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Deuterium</label>
                  <input
                    type="number"
                    value={form.cost_deuterium}
                    onChange={(e) => setForm({ ...form, cost_deuterium: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2 border-t border-gray-700 pt-4 mt-2">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Combat Stats</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Weapon Power</label>
                  <input
                    type="number"
                    value={form.weapon_power}
                    onChange={(e) => setForm({ ...form, weapon_power: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Shield Power</label>
                  <input
                    type="number"
                    value={form.shield_power}
                    onChange={(e) => setForm({ ...form, shield_power: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Structural Integrity</label>
                  <input
                    type="number"
                    value={form.structural_integrity}
                    onChange={(e) => setForm({ ...form, structural_integrity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2 border-t border-gray-700 pt-4 mt-2">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Ship Stats</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Speed</label>
                  <input
                    type="number"
                    value={form.speed}
                    onChange={(e) => setForm({ ...form, speed: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cargo Capacity</label>
                  <input
                    type="number"
                    value={form.cargo_capacity}
                    onChange={(e) => setForm({ ...form, cargo_capacity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fuel Consumption</label>
                  <input
                    type="number"
                    value={form.fuel_consumption}
                    onChange={(e) => setForm({ ...form, fuel_consumption: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="enabled" className="text-sm text-gray-400">Enabled</label>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  )
}
