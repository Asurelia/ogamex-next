'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { AuditLogEntry } from '@/types/admin'

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-500/20 text-green-400',
  update: 'bg-blue-500/20 text-blue-400',
  delete: 'bg-red-500/20 text-red-400',
  grant_admin_role: 'bg-purple-500/20 text-purple-400',
  revoke_admin_role: 'bg-orange-500/20 text-orange-400',
  ban_player: 'bg-red-500/20 text-red-400',
  unban_player: 'bg-green-500/20 text-green-400',
  inject_resources: 'bg-cyan-500/20 text-cyan-400',
  grant_boost: 'bg-purple-500/20 text-purple-400',
  config_update: 'bg-yellow-500/20 text-yellow-400',
  invalidate_cache: 'bg-orange-500/20 text-orange-400',
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    from_date: '',
    to_date: '',
  })

  useEffect(() => {
    loadAuditLog()
  }, [filters])

  const loadAuditLog = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.action) params.set('action', filters.action)
      if (filters.entity_type) params.set('entity_type', filters.entity_type)
      if (filters.from_date) params.set('from_date', filters.from_date)
      if (filters.to_date) params.set('to_date', filters.to_date)

      const response = await fetch(`/api/admin/audit?${params}`)
      const data = await response.json()
      if (data.success) {
        setEntries(data.data.items)
        setTotal(data.data.total)
      }
    } catch (error) {
      console.error('Failed to load audit log:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Audit Log</h1>
        <p className="text-gray-400 mt-1">Track all admin actions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Action</label>
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          >
            <option value="">All actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="inject_resources">Inject Resources</option>
            <option value="grant_boost">Grant Boost</option>
            <option value="config_update">Config Update</option>
            <option value="grant_admin_role">Grant Admin</option>
            <option value="revoke_admin_role">Revoke Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Entity Type</label>
          <select
            value={filters.entity_type}
            onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          >
            <option value="">All types</option>
            <option value="ship">Ship</option>
            <option value="building">Building</option>
            <option value="defense">Defense</option>
            <option value="research">Research</option>
            <option value="user">User</option>
            <option value="planet">Planet</option>
            <option value="boost">Boost</option>
            <option value="game_config">Config</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={filters.from_date}
            onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={filters.to_date}
            onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => setFilters({ action: '', entity_type: '', from_date: '', to_date: '' })}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-500">
        Showing {entries.length} of {total} entries
      </div>

      {/* Audit Log */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No audit entries found</div>
        ) : (
          entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-gray-900 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Action badge */}
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      ACTION_COLORS[entry.action] || 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {entry.action}
                  </span>

                  {/* Details */}
                  <div>
                    <div className="flex items-center gap-2 text-white">
                      <span className="font-medium">{entry.admin_username || 'Unknown'}</span>
                      {entry.entity_type && (
                        <>
                          <span className="text-gray-500">→</span>
                          <span className="text-gray-400">{entry.entity_type}</span>
                          {entry.entity_id && (
                            <span className="text-gray-500 font-mono text-xs">
                              #{entry.entity_id.substring(0, 8)}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Changes preview */}
                    {(entry.old_value || entry.new_value) && (
                      <div className="mt-2 text-xs">
                        {entry.old_value && (
                          <div className="text-red-400/70 truncate max-w-md">
                            - {JSON.stringify(entry.old_value).substring(0, 100)}...
                          </div>
                        )}
                        {entry.new_value && (
                          <div className="text-green-400/70 truncate max-w-md">
                            + {JSON.stringify(entry.new_value).substring(0, 100)}...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-right text-sm">
                  <div className="text-gray-400">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {new Date(entry.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
