'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DataTable, ConfirmDialog } from '@/components/admin/common'
import { useAdminPermission } from '@/stores/adminStore'
import { ADMIN_PERMISSIONS } from '@/types/admin'

interface EquipmentTemplate {
  [key: string]: unknown
  id: string
  template_key: string
  name: string
  description: string
  slot: 'weapon' | 'secondary' | 'shield' | 'armor' | 'engine' | 'computer' | 'special' | 'consumable'
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  activation_type: 'passive' | 'active' | 'triggered' | 'consumable'
  compatible_classes: string[]
  stat_modifiers: Record<string, unknown>
  abilities: unknown[]
  triggers: unknown[]
  requirements: Record<string, unknown>
  install_cost: { metal: number; crystal: number; deuterium: number }
  power_consumption: number
  mass: number
  enabled: boolean
  sort_order: number
}

const EQUIPMENT_SLOTS = [
  { value: 'weapon', label: 'Weapon' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'shield', label: 'Shield' },
  { value: 'armor', label: 'Armor' },
  { value: 'engine', label: 'Engine' },
  { value: 'computer', label: 'Computer' },
  { value: 'special', label: 'Special' },
  { value: 'consumable', label: 'Consumable' },
]

const RARITIES = [
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Epic' },
  { value: 'legendary', label: 'Legendary' },
]

const ACTIVATION_TYPES = [
  { value: 'passive', label: 'Passive' },
  { value: 'active', label: 'Active' },
  { value: 'triggered', label: 'Triggered' },
  { value: 'consumable', label: 'Consumable' },
]

const RARITY_COLORS: Record<string, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400',
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<EquipmentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingEquipment, setEditingEquipment] = useState<EquipmentTemplate | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<EquipmentTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  const canEdit = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_UPDATE)
  const canDelete = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_DELETE)
  const canCreate = useAdminPermission(ADMIN_PERMISSIONS.ENTITIES_CREATE)

  useEffect(() => {
    loadEquipment()
  }, [])

  const loadEquipment = async () => {
    try {
      const response = await fetch('/api/admin/entities/equipment')
      const data = await response.json()
      if (data.success) {
        setEquipment(data.data)
      }
    } catch (error) {
      console.error('Failed to load equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (item: EquipmentTemplate) => {
    setSaving(true)
    try {
      const isNew = !item.id
      const url = isNew
        ? '/api/admin/entities/equipment'
        : `/api/admin/entities/equipment/${item.id}`
      const method = isNew ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })

      const data = await response.json()
      if (data.success) {
        await loadEquipment()
        setEditingEquipment(null)
      } else {
        alert(data.error || 'Failed to save equipment')
      }
    } catch (error) {
      console.error('Failed to save equipment:', error)
      alert('Failed to save equipment')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: EquipmentTemplate) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/entities/equipment/${item.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        await loadEquipment()
        setDeleteConfirm(null)
      } else {
        alert(data.error || 'Failed to delete equipment')
      }
    } catch (error) {
      console.error('Failed to delete equipment:', error)
      alert('Failed to delete equipment')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'template_key', label: 'Key', width: '150px' },
    { key: 'name', label: 'Name', width: '200px' },
    { key: 'slot', label: 'Slot', width: '100px' },
    {
      key: 'rarity',
      label: 'Rarity',
      width: '100px',
      render: (value: string) => (
        <span className={RARITY_COLORS[value] || 'text-gray-400'}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    { key: 'activation_type', label: 'Activation', width: '100px' },
    {
      key: 'power_consumption',
      label: 'Power',
      width: '80px',
    },
    {
      key: 'mass',
      label: 'Mass',
      width: '80px',
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
    { key: 'template_key', label: 'Template Key', type: 'text' as const, required: true },
    { key: 'name', label: 'Name', type: 'text' as const, required: true },
    { key: 'description', label: 'Description', type: 'text' as const },
    {
      key: 'slot',
      label: 'Slot',
      type: 'select' as const,
      options: EQUIPMENT_SLOTS,
      required: true
    },
    {
      key: 'rarity',
      label: 'Rarity',
      type: 'select' as const,
      options: RARITIES,
      required: true
    },
    {
      key: 'activation_type',
      label: 'Activation Type',
      type: 'select' as const,
      options: ACTIVATION_TYPES,
      required: true
    },
    { key: 'power_consumption', label: 'Power Consumption', type: 'number' as const },
    { key: 'mass', label: 'Mass', type: 'number' as const },
    { key: 'sort_order', label: 'Sort Order', type: 'number' as const },
    { key: 'enabled', label: 'Enabled', type: 'checkbox' as const },
  ]

  const newEquipment: EquipmentTemplate = {
    id: '',
    template_key: '',
    name: '',
    description: '',
    slot: 'weapon',
    rarity: 'common',
    activation_type: 'passive',
    compatible_classes: [],
    stat_modifiers: {},
    abilities: [],
    triggers: [],
    requirements: {},
    install_cost: { metal: 0, crystal: 0, deuterium: 0 },
    power_consumption: 0,
    mass: 0,
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
          <h1 className="text-2xl font-bold text-cyan-400">Equipment Templates</h1>
          <p className="text-gray-400 mt-1">
            Manage ship equipment and modifications
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setEditingEquipment(newEquipment)}
            className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg
                     text-cyan-400 hover:bg-cyan-500/30 transition-colors"
          >
            + Add Equipment
          </button>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        data={equipment}
        columns={columns}
        loading={loading}
        onEdit={canEdit ? setEditingEquipment : undefined}
        onDelete={canDelete ? setDeleteConfirm : undefined}
        searchKeys={['template_key', 'name']}
        filterKey="slot"
        filterOptions={EQUIPMENT_SLOTS}
      />

      {/* Edit Modal */}
      {editingEquipment && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-cyan-400 mb-4">
              {editingEquipment.id ? 'Edit Equipment' : 'New Equipment'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSave(editingEquipment)
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
                        value={editingEquipment[field.key] as string}
                        onChange={(e) =>
                          setEditingEquipment({ ...editingEquipment, [field.key]: e.target.value })
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
                        checked={editingEquipment[field.key] as boolean}
                        onChange={(e) =>
                          setEditingEquipment({ ...editingEquipment, [field.key]: e.target.checked })
                        }
                        className="w-5 h-5"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={editingEquipment[field.key] as string | number}
                        onChange={(e) =>
                          setEditingEquipment({
                            ...editingEquipment,
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
                  onClick={() => setEditingEquipment(null)}
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
          title="Delete Equipment"
          message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
          loading={saving}
        />
      )}
    </motion.div>
  )
}
