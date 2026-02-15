'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { DataTable } from '@/components/admin/common'

interface Player {
  [key: string]: unknown
  id: string
  username: string
  email: string
  created_at: string
  last_activity: string | null
  dark_matter: number
  boost_energy: number
  character_class: string | null
  vacation_mode: boolean
  planets_count: number
  total_points: number
  rank: number
}

export default function PlayersPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadPlayers()
  }, [search])

  const loadPlayers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await fetch(`/api/admin/players?${params}`)
      const data = await response.json()
      if (data.success) {
        setPlayers(data.data.items)
        setTotal(data.data.total)
      }
    } catch (error) {
      console.error('Failed to load players:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { key: 'rank', label: '#', width: '60px', sortable: true },
    {
      key: 'username',
      label: 'Username',
      sortable: true,
      render: (value: unknown, row: Player) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{String(value)}</span>
          {row.vacation_mode && (
            <span className="text-xs px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">
              Vacation
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'character_class',
      label: 'Class',
      render: (value: unknown) => (
        <span className="capitalize text-gray-400">{String(value || 'None')}</span>
      ),
    },
    { key: 'planets_count', label: 'Planets', sortable: true },
    {
      key: 'total_points',
      label: 'Points',
      sortable: true,
      render: (value: unknown) => (
        <span className="text-cyan-400">{Number(value).toLocaleString()}</span>
      ),
    },
    {
      key: 'dark_matter',
      label: 'DM',
      render: (value: unknown) => (
        <span className="text-purple-400">{Number(value).toLocaleString()}</span>
      ),
    },
    {
      key: 'last_activity',
      label: 'Last Active',
      render: (value: unknown) => {
        if (!value) return <span className="text-gray-500">Never</span>
        const date = new Date(String(value))
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const days = Math.floor(hours / 24)

        if (days > 0) {
          return <span className="text-gray-400">{days}d ago</span>
        }
        if (hours > 0) {
          return <span className="text-gray-400">{hours}h ago</span>
        }
        return <span className="text-green-400">Online</span>
      },
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (value: unknown) => (
        <span className="text-gray-500 text-sm">
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
          <h1 className="text-3xl font-bold text-white">Players</h1>
          <p className="text-gray-400 mt-1">
            {total} total players
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or email..."
          className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          🔍
        </span>
      </div>

      {/* Table */}
      <DataTable
        data={players}
        columns={columns}
        keyField="id"
        loading={loading}
        onRowClick={(player) => router.push(`/admin/players/${player.id}`)}
        emptyMessage="No players found"
      />
    </div>
  )
}
