'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { StatCard, ConfirmDialog } from '@/components/admin/common'
import type { PlayerDetails } from '@/types/admin'

export default function PlayerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string

  const [player, setPlayer] = useState<PlayerDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [showResourceModal, setShowResourceModal] = useState(false)
  const [showBoostModal, setShowBoostModal] = useState(false)

  useEffect(() => {
    loadPlayer()
  }, [userId])

  const loadPlayer = async () => {
    try {
      const response = await fetch(`/api/admin/players/${userId}`)
      const data = await response.json()
      if (data.success) {
        setPlayer(data.data)
      }
    } catch (error) {
      console.error('Failed to load player:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Player not found</p>
        <button
          onClick={() => router.push('/admin/players')}
          className="mt-4 text-cyan-400 hover:text-cyan-300"
        >
          Back to players
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/players')}
            className="text-gray-400 hover:text-white"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">{player.username}</h1>
            <p className="text-gray-400">{player.email}</p>
          </div>
          {player.vacation_mode && (
            <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg">
              Vacation Mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResourceModal(true)}
            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
          >
            💰 Inject Resources
          </button>
          <button
            onClick={() => setShowBoostModal(true)}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors"
          >
            ⚡ Grant Boost
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Rank"
          value={`#${player.rank}`}
          icon="🏆"
          color="#ffd700"
        />
        <StatCard
          title="Total Points"
          value={player.total_points}
          icon="⭐"
          color="#00ffcc"
        />
        <StatCard
          title="Dark Matter"
          value={player.dark_matter}
          icon="💎"
          color="#aa88ff"
        />
        <StatCard
          title="Planets"
          value={player.planets_count}
          icon="🌍"
          color="#00aaff"
        />
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-lg border border-gray-700 bg-gray-900/50"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Player Info</h2>
          <dl className="space-y-3">
            <InfoRow label="ID" value={player.id} />
            <InfoRow label="Class" value={player.character_class || 'None'} />
            <InfoRow label="Alliance" value={player.alliance_name || 'None'} />
            <InfoRow
              label="Boost Energy"
              value={`${player.boost_energy || 0} / 100`}
            />
            <InfoRow
              label="Last Activity"
              value={
                player.last_activity
                  ? new Date(player.last_activity).toLocaleString()
                  : 'Never'
              }
            />
            <InfoRow
              label="Joined"
              value={new Date(player.created_at).toLocaleString()}
            />
          </dl>
        </motion.div>

        {/* Active Boosts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-lg border border-gray-700 bg-gray-900/50"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Active Boosts</h2>
          {player.active_boosts.length === 0 ? (
            <p className="text-gray-500">No active boosts</p>
          ) : (
            <div className="space-y-2">
              {player.active_boosts.map((boost) => (
                <div
                  key={boost.id}
                  className="flex items-center justify-between p-3 rounded bg-gray-800"
                >
                  <div>
                    <span className="font-medium text-white capitalize">
                      {boost.boost_type}
                    </span>
                    <span className="ml-2 text-sm text-green-400">
                      x{boost.multiplier}
                    </span>
                  </div>
                  <span className="text-sm text-gray-400">
                    Ends: {new Date(boost.ends_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Planets */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 rounded-lg border border-gray-700 bg-gray-900/50"
      >
        <h2 className="text-xl font-semibold text-white mb-4">Planets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {player.planets?.map((planet) => (
            <div
              key={planet.id}
              className="p-4 rounded-lg bg-gray-800 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">{planet.name}</span>
                <span className="text-xs text-gray-500">
                  [{planet.galaxy}:{planet.system}:{planet.position}]
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Metal</span>
                  <span className="text-gray-300">
                    {Math.floor(planet.metal).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-400">Crystal</span>
                  <span className="text-gray-300">
                    {Math.floor(planet.crystal).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-400">Deuterium</span>
                  <span className="text-gray-300">
                    {Math.floor(planet.deuterium).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t border-gray-700">
                  <span className="text-gray-500">Fields</span>
                  <span className="text-gray-400">
                    {planet.fields_used}/{planet.fields_max}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Resource Injection Modal */}
      {showResourceModal && (
        <ResourceModal
          userId={userId}
          planets={player.planets || []}
          onClose={() => setShowResourceModal(false)}
          onSuccess={() => {
            setShowResourceModal(false)
            loadPlayer()
          }}
        />
      )}

      {/* Boost Modal */}
      {showBoostModal && (
        <BoostModal
          userId={userId}
          onClose={() => setShowBoostModal(false)}
          onSuccess={() => {
            setShowBoostModal(false)
            loadPlayer()
          }}
        />
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-white">{value}</dd>
    </div>
  )
}

function ResourceModal({
  userId,
  planets,
  onClose,
  onSuccess,
}: {
  userId: string
  planets: Array<{ id: string; name: string }>
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    planet_id: planets[0]?.id || '',
    metal: 0,
    crystal: 0,
    deuterium: 0,
    dark_matter: 0,
    boost_energy: 0,
    reason: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.reason) {
      alert('Reason is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/players/${userId}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (data.success) {
        onSuccess()
      } else {
        alert(data.error || 'Failed to inject resources')
      }
    } catch (error) {
      console.error('Failed to inject resources:', error)
      alert('Failed to inject resources')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
      >
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg border border-cyan-500/30">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Inject Resources</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Planet</label>
              <select
                value={form.planet_id}
                onChange={(e) => setForm({ ...form, planet_id: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              >
                {planets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Metal</label>
                <input
                  type="number"
                  value={form.metal}
                  onChange={(e) => setForm({ ...form, metal: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Crystal</label>
                <input
                  type="number"
                  value={form.crystal}
                  onChange={(e) => setForm({ ...form, crystal: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Deuterium</label>
                <input
                  type="number"
                  value={form.deuterium}
                  onChange={(e) => setForm({ ...form, deuterium: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dark Matter</label>
                <input
                  type="number"
                  value={form.dark_matter}
                  onChange={(e) => setForm({ ...form, dark_matter: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Boost Energy</label>
                <input
                  type="number"
                  value={form.boost_energy}
                  onChange={(e) => setForm({ ...form, boost_energy: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Reason *</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Bug compensation, Event reward..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                required
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Injecting...' : 'Inject'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  )
}

function BoostModal({
  userId,
  onClose,
  onSuccess,
}: {
  userId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    boost_type: 'production',
    multiplier: 1.5,
    duration_minutes: 60,
    reason: '',
  })
  const [saving, setSaving] = useState(false)

  const boostTypes = [
    { value: 'production', label: 'Production' },
    { value: 'construction', label: 'Construction' },
    { value: 'research', label: 'Research' },
    { value: 'expedition', label: 'Expedition' },
    { value: 'attack', label: 'Attack' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/players/${userId}/boosts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (data.success) {
        onSuccess()
      } else {
        alert(data.error || 'Failed to grant boost')
      }
    } catch (error) {
      console.error('Failed to grant boost:', error)
      alert('Failed to grant boost')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
      >
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg border border-purple-500/30">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Grant Boost</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Boost Type</label>
              <select
                value={form.boost_type}
                onChange={(e) => setForm({ ...form, boost_type: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              >
                {boostTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.multiplier}
                  onChange={(e) => setForm({ ...form, multiplier: parseFloat(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Reason (optional)</label>
              <input
                type="text"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Event prize, Support gift..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Granting...' : 'Grant Boost'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  )
}
