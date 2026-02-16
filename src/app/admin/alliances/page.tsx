'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { DataTable, ConfirmDialog } from '@/components/admin/common'

interface Alliance {
  [key: string]: unknown
  id: string
  name: string
  tag: string
  description: string | null
  logo_url: string | null
  homepage: string | null
  application_open: boolean
  created_at: string
  founder_id: string
  founder_username: string | null
  member_count: number
  deleted_at: string | null
  deleted_by: string | null
  delete_reason: string | null
}

export default function AdminAlliancesPage() {
  const [alliances, setAlliances] = useState<Alliance[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; alliance?: Alliance }>({ open: false })
  const [editDialog, setEditDialog] = useState<{ open: boolean; alliance?: Alliance }>({ open: false })
  const [membersDialog, setMembersDialog] = useState<{ open: boolean; alliance?: Alliance }>({ open: false })
  const [filters, setFilters] = useState({
    min_members: '',
    search: '',
    include_deleted: false, // Toggle to show soft-deleted alliances
  })

  const loadAlliances = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.min_members) params.set('min_members', filters.min_members)
      if (filters.search) params.set('search', filters.search)
      if (filters.include_deleted) params.set('include_deleted', 'true')

      const response = await fetch(`/api/admin/alliances?${params}`)
      const data = await response.json()
      if (data.success) {
        setAlliances(data.data.items)
        setTotal(data.data.total)
      }
    } catch (error) {
      console.error('Failed to load alliances:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadAlliances()
  }, [loadAlliances])

  const handleDelete = async (alliance: Alliance, reason: string) => {
    try {
      const response = await fetch('/api/admin/alliances', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alliance.id, reason }),
      })
      const data = await response.json()
      if (data.success) {
        setDeleteDialog({ open: false })
        loadAlliances()
      } else {
        alert(data.error || 'Failed to delete alliance')
      }
    } catch (error) {
      console.error('Failed to delete alliance:', error)
    }
  }

  const handleUpdate = async (alliance: Alliance, updates: Partial<Alliance>) => {
    try {
      const response = await fetch('/api/admin/alliances', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alliance.id, ...updates }),
      })
      const data = await response.json()
      if (data.success) {
        setEditDialog({ open: false })
        loadAlliances()
      } else {
        alert(data.error || 'Failed to update alliance')
      }
    } catch (error) {
      console.error('Failed to update alliance:', error)
    }
  }

  const columns = [
    {
      key: 'deleted_at',
      label: '',
      width: '30px',
      render: (value: unknown) => (
        value ? (
          <span className="text-red-500" title={`Deleted: ${new Date(String(value)).toLocaleString()}`}>🗑️</span>
        ) : null
      ),
    },
    {
      key: 'tag',
      label: 'Tag',
      width: '80px',
      render: (value: unknown) => (
        <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded font-mono font-bold">
          {String(value)}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value: unknown) => (
        <span className="text-white font-medium">{String(value)}</span>
      ),
    },
    {
      key: 'founder_username',
      label: 'Founder',
      render: (value: unknown) => (
        <span className="text-purple-400">{String(value || 'Unknown')}</span>
      ),
    },
    {
      key: 'member_count',
      label: 'Members',
      sortable: true,
      render: (value: unknown) => (
        <span className="text-green-400 font-mono">{Number(value)}</span>
      ),
    },
    {
      key: 'application_open',
      label: 'Recruiting',
      render: (value: unknown) => (
        value ? (
          <span className="text-green-400">Open</span>
        ) : (
          <span className="text-red-400">Closed</span>
        )
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (value: unknown) => (
        <span className="text-gray-400 text-sm">
          {new Date(String(value)).toLocaleDateString()}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Alliance Management</h1>
          <p className="text-gray-400 mt-1">{total} total alliances</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Min Members</label>
          <input
            type="number"
            min="0"
            value={filters.min_members}
            onChange={(e) => setFilters({ ...filters, min_members: e.target.value })}
            placeholder="0"
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm w-20"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Name or tag..."
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />
        </div>
        <div className="flex items-center gap-2 ml-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.include_deleted}
              onChange={(e) => setFilters({ ...filters, include_deleted: e.target.checked })}
              className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-red-500 focus:ring-red-500"
            />
            <span className="text-sm text-gray-400">Show Deleted</span>
          </label>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => setFilters({ min_members: '', search: '', include_deleted: false })}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={alliances}
        columns={columns}
        keyField="id"
        loading={loading}
        onEdit={(alliance) => setEditDialog({ open: true, alliance })}
        onDelete={(alliance) => setDeleteDialog({ open: true, alliance })}
        onRowClick={(alliance) => setMembersDialog({ open: true, alliance })}
        emptyMessage="No alliances found"
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        onConfirm={(reason) => deleteDialog.alliance && reason && handleDelete(deleteDialog.alliance, reason)}
        title="Delete Alliance"
        message={`Are you sure you want to delete "[${deleteDialog.alliance?.tag}] ${deleteDialog.alliance?.name}"? All ${deleteDialog.alliance?.member_count || 0} members will be removed from the alliance.`}
        confirmText="Delete Alliance"
        requireReason
      />

      {/* Edit Dialog */}
      {editDialog.open && editDialog.alliance && (
        <EditAllianceDialog
          alliance={editDialog.alliance}
          onClose={() => setEditDialog({ open: false })}
          onSave={(updates) => handleUpdate(editDialog.alliance!, updates)}
        />
      )}

      {/* Members Dialog */}
      {membersDialog.open && membersDialog.alliance && (
        <AllianceMembersDialog
          alliance={membersDialog.alliance}
          onClose={() => setMembersDialog({ open: false })}
          onRefresh={loadAlliances}
        />
      )}
    </div>
  )
}

// Edit Alliance Dialog Component
function EditAllianceDialog({
  alliance,
  onClose,
  onSave,
}: {
  alliance: Alliance
  onClose: () => void
  onSave: (updates: Partial<Alliance>) => void
}) {
  const [name, setName] = useState(alliance.name)
  const [tag, setTag] = useState(alliance.tag)
  const [description, setDescription] = useState(alliance.description || '')
  const [applicationOpen, setApplicationOpen] = useState(alliance.application_open)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name,
      tag: tag.toUpperCase(),
      description: description || null,
      application_open: applicationOpen,
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
        <h2 className="text-xl font-bold text-white mb-4">Edit Alliance</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tag</label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value.toUpperCase())}
                maxLength={8}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="applicationOpen"
              checked={applicationOpen}
              onChange={(e) => setApplicationOpen(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="applicationOpen" className="text-sm text-gray-400">
              Open for applications
            </label>
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

// Alliance Members Dialog Component
function AllianceMembersDialog({
  alliance,
  onClose,
  onRefresh,
}: {
  alliance: Alliance
  onClose: () => void
  onRefresh: () => void
}) {
  const [members, setMembers] = useState<Array<{
    id: string
    username: string
    alliance_rank: string
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMembers()
  }, [alliance.id])

  const loadMembers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/players?alliance_id=${alliance.id}`)
      const data = await response.json()
      if (data.success) {
        setMembers(data.data.items.map((p: Record<string, unknown>) => ({
          id: p.id,
          username: p.username,
          alliance_rank: p.alliance_rank || 'member',
        })))
      }
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/alliances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alliance_id: alliance.id,
          user_id: userId,
          action: 'remove',
          reason: 'Removed by admin',
        }),
      })
      const data = await response.json()
      if (data.success) {
        loadMembers()
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const rankColors: Record<string, string> = {
    leader: 'text-yellow-400',
    co_leader: 'text-orange-400',
    officer: 'text-purple-400',
    veteran: 'text-blue-400',
    member: 'text-gray-400',
    applicant: 'text-gray-500',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            [{alliance.tag}] {alliance.name} - Members
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No members found</div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded bg-gray-800/50"
                >
                  <div>
                    <span className="text-white">{member.username}</span>
                    <span className={`ml-2 text-sm ${rankColors[member.alliance_rank] || 'text-gray-400'}`}>
                      ({member.alliance_rank})
                    </span>
                  </div>
                  {member.alliance_rank !== 'leader' && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
