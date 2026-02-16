'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DataTable, ConfirmDialog } from '@/components/admin/common'
import { useAdminPermission } from '@/stores/adminStore'
import { ADMIN_PERMISSIONS } from '@/types/admin'

interface Research {
  [key: string]: unknown
  id: number
  key: string
  name: string
  category: 'basic' | 'drive' | 'advanced' | 'combat'
  base_cost_metal: number
  base_cost_crystal: number
  base_cost_deuterium: number
  price_factor: number
  max_level: number
  enabled: boolean
  sort_order: number
}

const RESEARCH_CATEGORIES = [
  { value: 'basic', label: 'Basic' },
  { value: 'drive', label: 'Drive' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'combat', label: 'Combat' },
]

export default function ResearchPage() {
  const [research, setResearch] = useState<Research[]>([])
  const [loading, setLoading] = useState(true)
  const [editingResearch, setEditingResearch] = useState<Research | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Research | null>(null)
  const [saving, setSaving] = useState(false)

  const canEdit = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_UPDATE)
  const canDelete = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_DELETE)
  const canCreate = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_CREATE)

  useEffect(() => {
    loadResearch()
  }, [])

  const loadResearch = async () => {
    try {
      const response = await fetch('/api/admin/entities/research')
      const data = await response.json()
      if (data.success) {
        setResearch(data.data)
      }
    } catch (error) {
      console.error('Failed to load research:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (item: Research) => {
    setSaving(true)
    try {
      const isNew = !item.id
      const url = isNew
        ? '/api/admin/entities/research'
        : `/api/admin/entities/research/${item.id}`
      const method = isNew ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })

      const data = await response.json()
      if (data.success) {
        await loadResearch()
        setEditingResearch(null)
      } else {
        alert(data.error || 'Failed to save research')
      }
    } catch (error) {
      console.error('Failed to save research:', error)
      alert('Failed to save research')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: Research) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/entities/research/${item.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        await loadResearch()
        setDeleteConfirm(null)
      } else {
        alert(data.error || 'Failed to delete research')
      }
    } catch (error) {
      console.error('Failed to delete research:', error)
      alert('Failed to delete research')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID', width: '60px' },
    { key: 'key', label: 'Key', width: '180px' },
    { key: 'name', label: 'Name', width: '200px' },
    { key: 'category', label: 'Category', width: '100px' },
    {
      key: 'base_cost_metal',
      label: 'Metal',
      width: '100px',
      render: (value: unknown) => (value as number).toLocaleString()
    },
    {
      key: 'base_cost_crystal',
      label: 'Crystal',
      width: '100px',
      render: (value: unknown) => (value as number).toLocaleString()
    },
    {
      key: 'price_factor',
      label: 'Factor',
      width: '80px',
      render: (value: unknown) => (value as number).toFixed(2)
    },
    {
      key: 'max_level',
      label: 'Max Lvl',
      width: '80px',
      render: (value: unknown) => (value as number) || '∞'
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
    {
      key: 'category',
      label: 'Category',
      type: 'select' as const,
      options: RESEARCH_CATEGORIES,
      required: true
    },
    { key: 'base_cost_metal', label: 'Base Metal Cost', type: 'number' as const, required: true },
    { key: 'base_cost_crystal', label: 'Base Crystal Cost', type: 'number' as const, required: true },
    { key: 'base_cost_deuterium', label: 'Base Deuterium Cost', type: 'number' as const, required: true },
    { key: 'price_factor', label: 'Price Factor', type: 'number' as const, step: 0.01, required: true },
    { key: 'max_level', label: 'Max Level (0 = unlimited)', type: 'number' as const },
    { key: 'sort_order', label: 'Sort Order', type: 'number' as const },
    { key: 'enabled', label: 'Enabled', type: 'checkbox' as const },
  ]

  const newResearch: Research = {
    id: 0,
    key: '',
    name: '',
    category: 'basic',
    base_cost_metal: 0,
    base_cost_crystal: 0,
    base_cost_deuterium: 0,
    price_factor: 2.0,
    max_level: 0,
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
          <h1 className="text-2xl font-bold text-cyan-400">Research Management</h1>
          <p className="text-gray-400 mt-1">
            Manage technologies and their properties
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setEditingResearch(newResearch)}
            className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg
                     text-cyan-400 hover:bg-cyan-500/30 transition-colors"
          >
            + Add Research
          </button>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        data={research}
        columns={columns}
        loading={loading}
        onEdit={canEdit ? setEditingResearch : undefined}
        onDelete={canDelete ? setDeleteConfirm : undefined}
        searchKeys={['key', 'name']}
        filterKey="category"
        filterOptions={RESEARCH_CATEGORIES}
      />

      {/* Edit Modal */}
      {editingResearch && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-cyan-400 mb-4">
              {editingResearch.id ? 'Edit Research' : 'New Research'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSave(editingResearch)
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
                        value={editingResearch[field.key] as string}
                        onChange={(e) =>
                          setEditingResearch({ ...editingResearch, [field.key]: e.target.value })
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
                        checked={editingResearch[field.key] as boolean}
                        onChange={(e) =>
                          setEditingResearch({ ...editingResearch, [field.key]: e.target.checked })
                        }
                        className="w-5 h-5"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={editingResearch[field.key] as string | number}
                        onChange={(e) =>
                          setEditingResearch({
                            ...editingResearch,
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
                  onClick={() => setEditingResearch(null)}
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
          title="Delete Research"
          message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          loading={saving}
        />
      )}
    </motion.div>
  )
}
