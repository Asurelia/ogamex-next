'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DataTable, ConfirmDialog } from '@/components/admin/common'
import { useAdminPermission } from '@/stores/adminStore'
import { ADMIN_PERMISSIONS } from '@/types/admin'

interface Formation {
  [key: string]: unknown
  id: string
  formation_key: string
  name: string
  description: string
  positions: unknown[]
  global_bonuses: Record<string, unknown>
  requirements: Record<string, unknown>
  composition_modifiers: unknown[]
  enabled: boolean
  sort_order: number
}

export default function FormationsPage() {
  const [formations, setFormations] = useState<Formation[]>([])
  const [loading, setLoading] = useState(true)
  const [editingFormation, setEditingFormation] = useState<Formation | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Formation | null>(null)
  const [saving, setSaving] = useState(false)

  const canEdit = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_UPDATE)
  const canDelete = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_DELETE)
  const canCreate = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_CREATE)

  useEffect(() => {
    loadFormations()
  }, [])

  const loadFormations = async () => {
    try {
      const response = await fetch('/api/admin/entities/formations')
      const data = await response.json()
      if (data.success) {
        setFormations(data.data)
      }
    } catch (error) {
      console.error('Failed to load formations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (item: Formation) => {
    setSaving(true)
    try {
      const isNew = !item.id
      const url = isNew
        ? '/api/admin/entities/formations'
        : `/api/admin/entities/formations/${item.id}`
      const method = isNew ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })

      const data = await response.json()
      if (data.success) {
        await loadFormations()
        setEditingFormation(null)
      } else {
        alert(data.error || 'Failed to save formation')
      }
    } catch (error) {
      console.error('Failed to save formation:', error)
      alert('Failed to save formation')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: Formation) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/entities/formations/${item.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        await loadFormations()
        setDeleteConfirm(null)
      } else {
        alert(data.error || 'Failed to delete formation')
      }
    } catch (error) {
      console.error('Failed to delete formation:', error)
      alert('Failed to delete formation')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'formation_key', label: 'Key', width: '150px' },
    { key: 'name', label: 'Name', width: '200px' },
    { key: 'description', label: 'Description', width: '300px' },
    {
      key: 'positions',
      label: 'Positions',
      width: '100px',
      render: (value: unknown) => `${Array.isArray(value) ? value.length : 0} positions`
    },
    {
      key: 'requirements',
      label: 'Min Ships',
      width: '100px',
      render: (value: unknown) => {
        const req = value as Record<string, unknown> | null
        return (req?.minShips as number) || 0
      }
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
    { key: 'formation_key', label: 'Formation Key', type: 'text' as const, required: true },
    { key: 'name', label: 'Name', type: 'text' as const, required: true },
    { key: 'description', label: 'Description', type: 'text' as const },
    { key: 'sort_order', label: 'Sort Order', type: 'number' as const },
    { key: 'enabled', label: 'Enabled', type: 'checkbox' as const },
  ]

  const newFormation: Formation = {
    id: '',
    formation_key: '',
    name: '',
    description: '',
    positions: [],
    global_bonuses: {
      attackMultiplier: 1,
      defenseMultiplier: 1,
      speedMultiplier: 1,
      accuracyBonus: 0,
      evasionBonus: 0,
      critBonus: 0,
      shieldBonus: 0,
      coordinationBonus: 0,
    },
    requirements: { minShips: 10, maxShips: 0 },
    composition_modifiers: [],
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
          <h1 className="text-2xl font-bold text-cyan-400">Fleet Formations</h1>
          <p className="text-gray-400 mt-1">
            Manage tactical fleet formations and bonuses
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setEditingFormation(newFormation)}
            className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg
                     text-cyan-400 hover:bg-cyan-500/30 transition-colors"
          >
            + Add Formation
          </button>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        data={formations}
        columns={columns}
        keyField="id"
        loading={loading}
        onEdit={canEdit ? setEditingFormation : undefined}
        onDelete={canDelete ? setDeleteConfirm : undefined}
        searchable
        searchPlaceholder="Search by key or name..."
      />

      {/* Edit Modal */}
      {editingFormation && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-cyan-400 mb-4">
              {editingFormation.id ? 'Edit Formation' : 'New Formation'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSave(editingFormation)
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
                        checked={editingFormation[field.key] as boolean}
                        onChange={(e) =>
                          setEditingFormation({ ...editingFormation, [field.key]: e.target.checked })
                        }
                        className="w-5 h-5"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={editingFormation[field.key] as string | number}
                        onChange={(e) =>
                          setEditingFormation({
                            ...editingFormation,
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

              {/* Global Bonuses Section */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-cyan-400 mb-3">Global Bonuses</h3>
                <div className="grid grid-cols-4 gap-3">
                  {['attackMultiplier', 'defenseMultiplier', 'speedMultiplier', 'accuracyBonus', 'evasionBonus', 'critBonus', 'shieldBonus', 'coordinationBonus'].map((bonusKey) => (
                    <div key={bonusKey}>
                      <label className="block text-xs text-gray-400 mb-1">
                        {bonusKey.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={(editingFormation.global_bonuses[bonusKey] as number) || 0}
                        onChange={(e) =>
                          setEditingFormation({
                            ...editingFormation,
                            global_bonuses: {
                              ...editingFormation.global_bonuses,
                              [bonusKey]: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements Section */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-cyan-400 mb-3">Requirements</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Min Ships</label>
                    <input
                      type="number"
                      value={(editingFormation.requirements.minShips as number) || 0}
                      onChange={(e) =>
                        setEditingFormation({
                          ...editingFormation,
                          requirements: {
                            ...editingFormation.requirements,
                            minShips: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max Ships (0 = no limit)</label>
                    <input
                      type="number"
                      value={(editingFormation.requirements.maxShips as number) || 0}
                      onChange={(e) =>
                        setEditingFormation({
                          ...editingFormation,
                          requirements: {
                            ...editingFormation.requirements,
                            maxShips: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingFormation(null)}
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
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Formation"
        message={deleteConfirm ? `Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.` : ''}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
        loading={saving}
      />
    </motion.div>
  )
}
