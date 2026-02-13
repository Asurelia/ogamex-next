'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Alliance } from '@/types/database'

export default function AlliancePage() {
  const { user } = useGameStore()
  const [alliance, setAlliance] = useState<Alliance | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newAllianceName, setNewAllianceName] = useState('')
  const [newAllianceTag, setNewAllianceTag] = useState('')

  useEffect(() => {
    loadAlliance()
  }, [user?.alliance_id])

  const loadAlliance = async () => {
    if (!user?.alliance_id) {
      setLoading(false)
      return
    }

    const supabase = getSupabaseClient()
    const { data } = await supabase
      .from('alliances')
      .select('*')
      .eq('id', user.alliance_id)
      .single()

    setAlliance(data)
    setLoading(false)
  }

  const createAlliance = async () => {
    if (!user || !newAllianceName || !newAllianceTag) return

    const supabase = getSupabaseClient()

    // Create alliance
    const { data: newAlliance, error } = await supabase
      .from('alliances')
      .insert({
        name: newAllianceName,
        tag: newAllianceTag,
        founder_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create alliance:', error)
      return
    }

    // Update user
    await supabase
      .from('users')
      .update({ alliance_id: newAlliance.id })
      .eq('id', user.id)

    setAlliance(newAlliance)
    setShowCreate(false)
  }

  if (loading) {
    return <div className="text-ogame-text-muted">Loading...</div>
  }

  if (!alliance) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ogame-text-header">Alliance</h1>

        {!showCreate ? (
          <div className="ogame-panel">
            <div className="ogame-panel-header">Join or Create Alliance</div>
            <div className="ogame-panel-content text-center py-8">
              <p className="text-ogame-text-muted mb-6">
                You are not a member of any alliance.
              </p>
              <div className="flex justify-center gap-4">
                <button className="ogame-button">
                  Search Alliances
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  className="ogame-button-primary"
                >
                  Create Alliance
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="ogame-panel max-w-md">
            <div className="ogame-panel-header">Create New Alliance</div>
            <div className="ogame-panel-content space-y-4">
              <div>
                <label className="block text-ogame-text-header text-sm mb-1">
                  Alliance Name
                </label>
                <input
                  type="text"
                  value={newAllianceName}
                  onChange={(e) => setNewAllianceName(e.target.value)}
                  className="ogame-input w-full"
                  placeholder="My Alliance"
                  maxLength={30}
                />
              </div>
              <div>
                <label className="block text-ogame-text-header text-sm mb-1">
                  Alliance Tag
                </label>
                <input
                  type="text"
                  value={newAllianceTag}
                  onChange={(e) => setNewAllianceTag(e.target.value.toUpperCase())}
                  className="ogame-input w-full"
                  placeholder="TAG"
                  maxLength={8}
                />
                <p className="text-ogame-text-muted text-xs mt-1">
                  3-8 characters, shown next to player names
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="ogame-button flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={createAlliance}
                  disabled={!newAllianceName || newAllianceTag.length < 3}
                  className="ogame-button-primary flex-1"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ogame-text-header">Alliance</h1>
        <span className="ogame-badge ogame-badge-info text-lg px-3 py-1">
          [{alliance.tag}]
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alliance info */}
        <div className="ogame-panel">
          <div className="ogame-panel-header">Alliance Information</div>
          <div className="ogame-panel-content">
            <div className="flex gap-6">
              {alliance.logo_url ? (
                <img
                  src={alliance.logo_url}
                  alt={alliance.name}
                  className="w-24 h-24 rounded-sm"
                />
              ) : (
                <div className="w-24 h-24 rounded-sm bg-gradient-to-br from-purple-700 to-purple-900 flex items-center justify-center">
                  <span className="text-4xl">🤝</span>
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-ogame-text-header mb-2">
                  {alliance.name}
                </h2>
                <p className="text-ogame-text-muted text-sm">
                  {alliance.description || 'No description set.'}
                </p>
                <p className="text-ogame-text-muted text-xs mt-4">
                  Founded: {new Date(alliance.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="ogame-panel">
          <div className="ogame-panel-header">Members</div>
          <div className="ogame-panel-content">
            <p className="text-ogame-text-muted text-center py-4">
              Member list coming soon...
            </p>
          </div>
        </div>

        {/* Alliance actions */}
        <div className="ogame-panel lg:col-span-2">
          <div className="ogame-panel-header">Actions</div>
          <div className="ogame-panel-content">
            <div className="flex gap-4">
              <button className="ogame-button">View Applications</button>
              <button className="ogame-button">Send Alliance Message</button>
              <button className="ogame-button">Edit Description</button>
              <button className="ogame-button-danger">Leave Alliance</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
