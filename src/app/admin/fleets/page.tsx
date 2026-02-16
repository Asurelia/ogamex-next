'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { DataTable, ConfirmDialog } from '@/components/admin/common'

interface Fleet {
  [key: string]: unknown
  id: string
  user_id: string
  mission_type: string
  target_galaxy: number
  target_system: number
  target_position: number
  ships: Record<string, number>
  cargo_metal: number
  cargo_crystal: number
  cargo_deuterium: number
  arrival_time: string
  returning: boolean
  cancelled: boolean
  users: { username: string }
  planets: { name: string; galaxy: number; system: number; position: number }
}

const MISSION_COLORS: Record<string, string> = {
  attack: 'bg-red-500/20 text-red-400',
  transport: 'bg-blue-500/20 text-blue-400',
  deploy: 'bg-green-500/20 text-green-400',
  colonize: 'bg-purple-500/20 text-purple-400',
  recycle: 'bg-yellow-500/20 text-yellow-400',
  espionage: 'bg-cyan-500/20 text-cyan-400',
  expedition: 'bg-pink-500/20 text-pink-400',
  acs_attack: 'bg-orange-500/20 text-orange-400',
  acs_defend: 'bg-teal-500/20 text-teal-400',
}

export default function AdminFleetsPage() {
  const [fleets, setFleets] = useState<Fleet[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [selectedFleets, setSelectedFleets] = useState<string[]>([])
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; fleet?: Fleet }>({ open: false })
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    mission_type: '',
    search: '',
  })

  const loadFleets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status !== 'all') params.set('status', filters.status)
      if (filters.mission_type) params.set('mission_type', filters.mission_type)
      if (filters.search) params.set('search', filters.search)

      const response = await fetch(`/api/admin/fleets?${params}`)
      const data = await response.json()
      if (data.success) {
        setFleets(data.data.items)
        setTotal(data.data.total)
      }
    } catch (error) {
      console.error('Failed to load fleets:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadFleets()
  }, [loadFleets])

  const handleDelete = async (fleet: Fleet, reason: string) => {
    try {
      const response = await fetch('/api/admin/fleets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [fleet.id], reason }),
      })
      const data = await response.json()
      if (data.success) {
        setDeleteDialog({ open: false })
        loadFleets()
      }
    } catch (error) {
      console.error('Failed to delete fleet:', error)
    }
  }

  const handleBulkDelete = async (reason: string) => {
    try {
      const response = await fetch('/api/admin/fleets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedFleets, reason }),
      })
      const data = await response.json()
      if (data.success) {
        setBulkDeleteDialog(false)
        setSelectedFleets([])
        loadFleets()
      }
    } catch (error) {
      console.error('Failed to bulk delete fleets:', error)
    }
  }

  const toggleSelectAll = () => {
    if (selectedFleets.length === fleets.length) {
      setSelectedFleets([])
    } else {
      setSelectedFleets(fleets.map(f => f.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedFleets(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const columns = [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={selectedFleets.length === fleets.length && fleets.length > 0}
          onChange={toggleSelectAll}
          className="w-4 h-4"
        />
      ) as unknown as string,
      width: '40px',
      render: (_: unknown, row: Fleet) => (
        <input
          type="checkbox"
          checked={selectedFleets.includes(row.id)}
          onChange={() => toggleSelect(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4"
        />
      ),
    },
    {
      key: 'users',
      label: 'Player',
      render: (value: unknown) => (
        <span className="text-white font-medium">
          {(value as { username: string })?.username || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'mission_type',
      label: 'Mission',
      render: (value: unknown) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${MISSION_COLORS[value as string] || 'bg-gray-500/20 text-gray-400'}`}>
          {String(value).replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'planets',
      label: 'Origin',
      render: (value: unknown) => {
        const planet = value as Fleet['planets']
        return planet ? (
          <span className="text-gray-400">
            {planet.name} [{planet.galaxy}:{planet.system}:{planet.position}]
          </span>
        ) : '-'
      },
    },
    {
      key: 'target',
      label: 'Target',
      render: (_: unknown, row: Fleet) => (
        <span className="text-cyan-400 font-mono">
          [{row.target_galaxy}:{row.target_system}:{row.target_position}]
        </span>
      ),
    },
    {
      key: 'ships',
      label: 'Ships',
      render: (value: unknown) => {
        const ships = value as Record<string, number>
        const total = Object.values(ships || {}).reduce((a, b) => a + b, 0)
        return <span className="text-purple-400">{total.toLocaleString()}</span>
      },
    },
    {
      key: 'arrival_time',
      label: 'Arrival',
      render: (value: unknown, row: Fleet) => {
        const date = new Date(value as string)
        const now = new Date()
        const diff = date.getTime() - now.getTime()
        const minutes = Math.floor(diff / (1000 * 60))

        return (
          <div className="text-sm">
            <div className={diff > 0 ? 'text-green-400' : 'text-gray-400'}>
              {diff > 0 ? `${minutes}m` : 'Arrived'}
            </div>
            <div className="text-gray-500 text-xs">
              {row.returning ? '(Returning)' : ''}
            </div>
          </div>
        )
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: unknown, row: Fleet) => {
        if (row.cancelled) {
          return <span className="text-red-400">Cancelled</span>
        }
        if (row.returning) {
          return <span className="text-yellow-400">Returning</span>
        }
        return <span className="text-green-400">In Flight</span>
      },
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Fleet Management</h1>
          <p className="text-gray-400 mt-1">{total} active fleet missions</p>
        </div>

        {selectedFleets.length > 0 && (
          <button
            onClick={() => setBulkDeleteDialog(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Cancel {selectedFleets.length} Fleet(s)
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          >
            <option value="all">All</option>
            <option value="active">In Flight</option>
            <option value="returning">Returning</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Mission Type</label>
          <select
            value={filters.mission_type}
            onChange={(e) => setFilters({ ...filters, mission_type: e.target.value })}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          >
            <option value="">All Types</option>
            <option value="attack">Attack</option>
            <option value="transport">Transport</option>
            <option value="deploy">Deploy</option>
            <option value="colonize">Colonize</option>
            <option value="recycle">Recycle</option>
            <option value="espionage">Espionage</option>
            <option value="expedition">Expedition</option>
            <option value="acs_attack">ACS Attack</option>
            <option value="acs_defend">ACS Defend</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search missions..."
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => setFilters({ status: 'all', mission_type: '', search: '' })}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={fleets}
        columns={columns}
        keyField="id"
        loading={loading}
        onDelete={(fleet) => setDeleteDialog({ open: true, fleet })}
        emptyMessage="No fleet missions found"
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        onConfirm={(reason) => deleteDialog.fleet && handleDelete(deleteDialog.fleet, reason)}
        title="Cancel Fleet Mission"
        message={`Are you sure you want to cancel this ${deleteDialog.fleet?.mission_type} mission?`}
        confirmText="Cancel Mission"
        requireReason
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        isOpen={bulkDeleteDialog}
        onClose={() => setBulkDeleteDialog(false)}
        onConfirm={handleBulkDelete}
        title="Cancel Multiple Fleets"
        message={`Are you sure you want to cancel ${selectedFleets.length} fleet mission(s)?`}
        confirmText="Cancel All"
        requireReason
      />
    </div>
  )
}
