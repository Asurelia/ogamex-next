'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DataTable, ConfirmDialog } from '@/components/admin/common'
import { useAdminPermission } from '@/stores/adminStore'
import { ADMIN_PERMISSIONS } from '@/types/admin'

interface Defense {
  [key: string]: unknown
  id: number
  key: string
  name: string
  cost_metal: number
  cost_crystal: number
  cost_deuterium: number
  structural_integrity: number
  shield_power: number
  weapon_power: number
  enabled: boolean
  sort_order: number
}

export default function DefensesPage() {
  const [defenses, setDefenses] = useState<Defense[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDefense, setEditingDefense] = useState<Defense | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Defense | null>(null)
  const [saving, setSaving] = useState(false)

  const canEdit = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_UPDATE)
  const canDelete = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_DELETE)
  const canCreate = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_CREATE)

  useEffect(() => {
    loadDefenses()
  }, [])

  const loadDefenses = async () => {
    try {
      const response = await fetch('/api/admin/entities/defenses')
      const data = await response.json()
      if (data.success) {
        setDefenses(data.data)
      }
    } catch (error) {
      console.error('Failed to load defenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (defense: Defense) => {
    setSaving(true)
    try {
      const isNew = !defense.id
      const url = isNew
        ? '/api/admin/entities/defenses'
        : `/api/admin/entities/defenses/${defense.id}`
      const method = isNew ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defense),
      })

      const data = await response.json()
      if (data.success) {
        await loadDefenses()
        setEditingDefense(null)
      } else {
        alert(data.error || 'Failed to save defense')
      }
    } catch (error) {
      console.error('Failed to save defense:', error)
      alert('Failed to save defense')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (defense: Defense) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/entities/defenses/${defense.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        await loadDefenses()
        setDeleteConfirm(null)
      } else {
        alert(data.error || 'Failed to delete defense')
      }
    } catch (error) {
      console.error('Failed to delete defense:', error)
      alert('Failed to delete defense')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID', width: '60px' },
    { key: 'key', label: 'Key', width: '150px' },
    { key: 'name', label: 'Name', width: '200px' },
    {
      key: 'cost_metal',
      label: 'Metal',
      width: '100px',
      render: (value: unknown) => (value as number).toLocaleString()
    },
    {
      key: 'cost_crystal',
      label: 'Crystal',
      width: '100px',
      render: (value: unknown) => (value as number).toLocaleString()
    },
    {
      key: 'structural_integrity',
      label: 'Hull',
      width: '100px',
      render: (value: unknown) => (value as number).toLocaleString()
    },
    {
      key: 'shield_power',
      label: 'Shield',
      width: '80px',
      render: (value: unknown) => (value as number).toLocaleString()
    },
    {
      key: 'weapon_power',
      label: 'Attack',
      width: '80px',
      render: (value: unknown) => (value as number).toLocaleString()
    },
    {
      key: 'enabled',
      label: 'Enabled',
      width: '80px',
      render: (value: unknown) => (
        <span className={value ? 'text-green-400' : 'text-red-400'}>
          {value ? '✓' : '✗'}
        </span>
      )
    },
  ]

  const formFields = [
    { key: 'key', label: 'Key', type: 'text' as const, required: true },
    { key: 'name', label: 'Name', type: 'text' as const, required: true },
    { key: 'cost_metal', label: 'Metal Cost', type: 'number' as const, required: true },
    { key: 'cost_crystal', label: 'Crystal Cost', type: 'number' as const, required: true },
    { key: 'cost_deuterium', label: 'Deuterium Cost', type: 'number' as const, required: true },
    { key: 'structural_integrity', label: 'Structural Integrity', type: 'number' as const, required: true },
    { key: 'shield_power', label: 'Shield Power', type: 'number' as const, required: true },
    { key: 'weapon_power', label: 'Weapon Power', type: 'number' as const, required: true },
    { key: 'sort_order', label: 'Sort Order', type: 'number' as const },
    { key: 'enabled', label: 'Enabled', type: 'checkbox' as const },
  ]

  const newDefense: Defense = {
    id: 0,
    key: '',
    name: '',
    cost_metal: 0,
    cost_crystal: 0,
    cost_deuterium: 0,
    structural_integrity: 0,
    shield_power: 0,
    weapon_power: 0,
    enabled: true,
    sort_order: 0,
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">Defenses Management</h1>
          <p className="text-gray-400 mt-1">
            Manage planetary defense units and their properties
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setEditingDefense(newDefense)}
            className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg
                     text-cyan-400 hover:bg-cyan-500/30 transition-colors"
          >
            + Add Defense
          </button>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        data={defenses}
        columns={columns}
        loading={loading}
        onEdit={canEdit ? setEditingDefense : undefined}
        onDelete={canDelete ? setDeleteConfirm : undefined}
        searchKeys={['key', 'name']}
      />

      {/* Edit Modal */}
      {editingDefense && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-cyan-400 mb-4">
              {editingDefense.id ? 'Edit Defense' : 'New Defense'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSave(editingDefense)
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                {formFields.map((field) => (
                  <div key={field.key} className={field.type === 'checkbox' ? 'col-span-2' : ''}>
                    <label className="block text-sm text-gray-400 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-400">*</span>}
                    </label>
                    {field.type === 'checkbox' ? (
                      <input
                        type="checkbox"
                        checked={editingDefense[field.key] as boolean}
                        onChange={(e) =>
                          setEditingDefense({ ...editingDefense, [field.key]: e.target.checked })
                        }
                        className="w-5 h-5"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={editingDefense[field.key] as string | number}
                        onChange={(e) =>
                          setEditingDefense({
                            ...editingDefense,
                            [field.key]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingDefense(null)}
                  className="px-4 py-2 bg-gray-700 rounded text-white hover:bg-gray-600"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 rounded text-white hover:bg-cyan-400 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Defense"
          message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          loading={saving}
        />
      )}
    </motion.div>
  )
}
