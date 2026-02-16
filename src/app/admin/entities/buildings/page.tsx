'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DataTable, ConfirmDialog } from '@/components/admin/common'
import { useAdminPermission } from '@/stores/adminStore'
import { ADMIN_PERMISSIONS } from '@/types/admin'

interface Building {
  [key: string]: unknown
  id: number
  key: string
  name: string
  category: 'resources' | 'facilities' | 'moon'
  base_cost_metal: number
  base_cost_crystal: number
  base_cost_deuterium: number
  price_factor: number
  energy_base: number
  energy_factor: number
  production_base: number
  production_factor: number
  enabled: boolean
  sort_order: number
}

const BUILDING_CATEGORIES = [
  { value: 'resources', label: 'Resources' },
  { value: 'facilities', label: 'Facilities' },
  { value: 'moon', label: 'Moon' },
]

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Building | null>(null)
  const [saving, setSaving] = useState(false)

  const canEdit = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_UPDATE)
  const canDelete = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_DELETE)
  const canCreate = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_CREATE)

  useEffect(() => {
    loadBuildings()
  }, [])

  const loadBuildings = async () => {
    try {
      const response = await fetch('/api/admin/entities/buildings')
      const data = await response.json()
      if (data.success) {
        setBuildings(data.data)
      }
    } catch (error) {
      console.error('Failed to load buildings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (building: Building) => {
    setSaving(true)
    try {
      const isNew = !building.id
      const url = isNew
        ? '/api/admin/entities/buildings'
        : `/api/admin/entities/buildings/${building.id}`
      const method = isNew ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(building),
      })

      const data = await response.json()
      if (data.success) {
        await loadBuildings()
        setEditingBuilding(null)
      } else {
        alert(data.error || 'Failed to save building')
      }
    } catch (error) {
      console.error('Failed to save building:', error)
      alert('Failed to save building')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (building: Building) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/entities/buildings/${building.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        await loadBuildings()
        setDeleteConfirm(null)
      } else {
        alert(data.error || 'Failed to delete building')
      }
    } catch (error) {
      console.error('Failed to delete building:', error)
      alert('Failed to delete building')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID', width: '60px' },
    { key: 'key', label: 'Key', width: '150px' },
    { key: 'name', label: 'Name', width: '200px' },
    { key: 'category', label: 'Category', width: '100px' },
    {
      key: 'base_cost_metal',
      label: 'Metal',
      width: '100px',
      render: (value: number) => value.toLocaleString()
    },
    {
      key: 'base_cost_crystal',
      label: 'Crystal',
      width: '100px',
      render: (value: number) => value.toLocaleString()
    },
    {
      key: 'price_factor',
      label: 'Factor',
      width: '80px',
      render: (value: number) => value.toFixed(2)
    },
    {
      key: 'enabled',
      label: 'Enabled',
      width: '80px',
      render: (value: boolean) => (
        <span className={value ? 'text-green-400' : 'text-red-400'}>
          {value ? '✓' : '✗'}
        </span>
      )
    },
  ]

  const formFields = [
    { key: 'key', label: 'Key', type: 'text' as const, required: true },
    { key: 'name', label: 'Name', type: 'text' as const, required: true },
    {
      key: 'category',
      label: 'Category',
      type: 'select' as const,
      options: BUILDING_CATEGORIES,
      required: true
    },
    { key: 'base_cost_metal', label: 'Base Metal Cost', type: 'number' as const, required: true },
    { key: 'base_cost_crystal', label: 'Base Crystal Cost', type: 'number' as const, required: true },
    { key: 'base_cost_deuterium', label: 'Base Deuterium Cost', type: 'number' as const, required: true },
    { key: 'price_factor', label: 'Price Factor', type: 'number' as const, step: 0.01, required: true },
    { key: 'energy_base', label: 'Energy Base', type: 'number' as const },
    { key: 'energy_factor', label: 'Energy Factor', type: 'number' as const, step: 0.01 },
    { key: 'production_base', label: 'Production Base', type: 'number' as const },
    { key: 'production_factor', label: 'Production Factor', type: 'number' as const, step: 0.01 },
    { key: 'sort_order', label: 'Sort Order', type: 'number' as const },
    { key: 'enabled', label: 'Enabled', type: 'checkbox' as const },
  ]

  const newBuilding: Building = {
    id: 0,
    key: '',
    name: '',
    category: 'resources',
    base_cost_metal: 0,
    base_cost_crystal: 0,
    base_cost_deuterium: 0,
    price_factor: 1.5,
    energy_base: 0,
    energy_factor: 1.1,
    production_base: 0,
    production_factor: 1.1,
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
          <h1 className="text-2xl font-bold text-cyan-400">Buildings Management</h1>
          <p className="text-gray-400 mt-1">
            Manage game buildings and their properties
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setEditingBuilding(newBuilding)}
            className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg
                     text-cyan-400 hover:bg-cyan-500/30 transition-colors"
          >
            + Add Building
          </button>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        data={buildings}
        columns={columns}
        loading={loading}
        onEdit={canEdit ? setEditingBuilding : undefined}
        onDelete={canDelete ? setDeleteConfirm : undefined}
        searchKeys={['key', 'name']}
        filterKey="category"
        filterOptions={BUILDING_CATEGORIES}
      />

      {/* Edit Modal */}
      {editingBuilding && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-cyan-400 mb-4">
              {editingBuilding.id ? 'Edit Building' : 'New Building'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSave(editingBuilding)
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
                    {field.type === 'select' ? (
                      <select
                        value={editingBuilding[field.key] as string}
                        onChange={(e) =>
                          setEditingBuilding({ ...editingBuilding, [field.key]: e.target.value })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                        required={field.required}
                      >
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <input
                        type="checkbox"
                        checked={editingBuilding[field.key] as boolean}
                        onChange={(e) =>
                          setEditingBuilding({ ...editingBuilding, [field.key]: e.target.checked })
                        }
                        className="w-5 h-5"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={editingBuilding[field.key] as string | number}
                        onChange={(e) =>
                          setEditingBuilding({
                            ...editingBuilding,
                            [field.key]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                          })
                        }
                        step={field.step}
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
                  onClick={() => setEditingBuilding(null)}
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
          title="Delete Building"
          message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          loading={saving}
        />
      )}
    </motion.div>
  )
}
