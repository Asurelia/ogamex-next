'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { DataTable, ConfirmDialog } from '@/components/admin/common'

interface Planet {
  [key: string]: unknown
  id: string
  user_id: string
  name: string
  galaxy: number
  system: number
  position: number
  planet_type: string
  metal: number
  crystal: number
  deuterium: number
  fields_used: number
  fields_max: number
  temperature_min: number
  temperature_max: number
  diameter: number
  users: { username: string }
}

export default function AdminPlanetsPage() {
  const [planets, setPlanets] = useState<Planet[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; planet?: Planet }>({ open: false })
  const [editDialog, setEditDialog] = useState<{ open: boolean; planet?: Planet }>({ open: false })
  const [filters, setFilters] = useState({
    galaxy: '',
    system: '',
    planet_type: '',
    search: '',
  })

  const loadPlanets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.galaxy) params.set('galaxy', filters.galaxy)
      if (filters.system) params.set('system', filters.system)
      if (filters.planet_type) params.set('planet_type', filters.planet_type)
      if (filters.search) params.set('search', filters.search)

      const response = await fetch(`/api/admin/planets?${params}`)
      const data = await response.json()
      if (data.success) {
        setPlanets(data.data.items)
        setTotal(data.data.total)
      }
    } catch (error) {
      console.error('Failed to load planets:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadPlanets()
  }, [loadPlanets])

  const handleDelete = async (planet: Planet, reason: string) => {
    try {
      const response = await fetch('/api/admin/planets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: planet.id, reason }),
      })
      const data = await response.json()
      if (data.success) {
        setDeleteDialog({ open: false })
        loadPlanets()
      } else {
        alert(data.error || 'Failed to delete planet')
      }
    } catch (error) {
      console.error('Failed to delete planet:', error)
    }
  }

  const handleUpdate = async (planet: Planet, updates: Partial<Planet>) => {
    try {
      const response = await fetch('/api/admin/planets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: planet.id, ...updates }),
      })
      const data = await response.json()
      if (data.success) {
        setEditDialog({ open: false })
        loadPlanets()
      } else {
        alert(data.error || 'Failed to update planet')
      }
    } catch (error) {
      console.error('Failed to update planet:', error)
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Planet',
      sortable: true,
      render: (value: unknown, row: Planet) => (
        <div>
          <span className="text-white font-medium">{String(value)}</span>
          {row.planet_type === 'moon' && (
            <span className="ml-2 text-xs px-1.5 py-0.5 bg-gray-600/50 text-gray-300 rounded">
              Moon
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'users',
      label: 'Owner',
      render: (value: unknown) => (
        <span className="text-cyan-400">
          {(value as { username: string })?.username || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'coordinates',
      label: 'Coordinates',
      render: (_: unknown, row: Planet) => (
        <span className="font-mono text-gray-400">
          [{row.galaxy}:{row.system}:{row.position}]
        </span>
      ),
    },
    {
      key: 'metal',
      label: 'Metal',
      sortable: true,
      render: (value: unknown) => (
        <span className="text-gray-300">{Number(value).toLocaleString()}</span>
      ),
    },
    {
      key: 'crystal',
      label: 'Crystal',
      sortable: true,
      render: (value: unknown) => (
        <span className="text-blue-300">{Number(value).toLocaleString()}</span>
      ),
    },
    {
      key: 'deuterium',
      label: 'Deuterium',
      sortable: true,
      render: (value: unknown) => (
        <span className="text-green-300">{Number(value).toLocaleString()}</span>
      ),
    },
    {
      key: 'fields',
      label: 'Fields',
      render: (_: unknown, row: Planet) => (
        <span className={row.fields_used >= row.fields_max ? 'text-red-400' : 'text-gray-400'}>
          {row.fields_used}/{row.fields_max}
        </span>
      ),
    },
    {
      key: 'diameter',
      label: 'Diameter',
      render: (value: unknown) => (
        <span className="text-gray-500">{Number(value).toLocaleString()} km</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Planet Management</h1>
          <p className="text-gray-400 mt-1">{total} total planets</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Galaxy</label>
          <select
            value={filters.galaxy}
            onChange={(e) => setFilters({ ...filters, galaxy: e.target.value })}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          >
            <option value="">All</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
              <option key={g} value={g}>Galaxy {g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">System</label>
          <input
            type="number"
            min="1"
            max="499"
            value={filters.system}
            onChange={(e) => setFilters({ ...filters, system: e.target.value })}
            placeholder="1-499"
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm w-20"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select
            value={filters.planet_type}
            onChange={(e) => setFilters({ ...filters, planet_type: e.target.value })}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          >
            <option value="">All</option>
            <option value="planet">Planet</option>
            <option value="moon">Moon</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Planet name..."
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => setFilters({ galaxy: '', system: '', planet_type: '', search: '' })}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={planets}
        columns={columns}
        keyField="id"
        loading={loading}
        onEdit={(planet) => setEditDialog({ open: true, planet })}
        onDelete={(planet) => setDeleteDialog({ open: true, planet })}
        emptyMessage="No planets found"
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        onConfirm={(reason) => deleteDialog.planet && reason && handleDelete(deleteDialog.planet, reason)}
        title="Delete Planet"
        message={`Are you sure you want to delete "${deleteDialog.planet?.name}"? This action cannot be undone.`}
        confirmText="Delete Planet"
        requireReason
      />

      {/* Edit Dialog */}
      {editDialog.open && editDialog.planet && (
        <EditPlanetDialog
          planet={editDialog.planet}
          onClose={() => setEditDialog({ open: false })}
          onSave={(updates) => handleUpdate(editDialog.planet!, updates)}
        />
      )}
    </div>
  )
}

// Edit Planet Dialog Component
function EditPlanetDialog({
  planet,
  onClose,
  onSave,
}: {
  planet: Planet
  onClose: () => void
  onSave: (updates: Partial<Planet>) => void
}) {
  const [name, setName] = useState(planet.name)
  const [metal, setMetal] = useState(planet.metal)
  const [crystal, setCrystal] = useState(planet.crystal)
  const [deuterium, setDeuterium] = useState(planet.deuterium)
  const [fieldsMax, setFieldsMax] = useState(planet.fields_max)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name,
      metal,
      crystal,
      deuterium,
      fields_max: fieldsMax,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full"
      >
        <h2 className="text-xl font-bold text-white mb-4">Edit Planet</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Metal</label>
              <input
                type="number"
                min="0"
                value={metal}
                onChange={(e) => setMetal(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Crystal</label>
              <input
                type="number"
                min="0"
                value={crystal}
                onChange={(e) => setCrystal(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Deuterium</label>
              <input
                type="number"
                min="0"
                value={deuterium}
                onChange={(e) => setDeuterium(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Fields</label>
            <input
              type="number"
              min="1"
              max="500"
              value={fieldsMax}
              onChange={(e) => setFieldsMax(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
            >
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
