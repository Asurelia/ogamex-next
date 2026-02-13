'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('alliance')
  const tCommon = useTranslations('common')

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
    return <div className="text-ogame-text-muted">{tCommon('loading')}</div>
  }

  if (!alliance) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ogame-text-header">{t('title')}</h1>

        {!showCreate ? (
          <div className="ogame-panel">
            <div className="ogame-panel-header">{t('joinOrCreate')}</div>
            <div className="ogame-panel-content text-center py-8">
              <p className="text-ogame-text-muted mb-6">
                {t('notMember')}
              </p>
              <div className="flex justify-center gap-4">
                <button className="ogame-button">
                  {t('searchAlliances')}
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  className="ogame-button-primary"
                >
                  {t('createAlliance')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="ogame-panel max-w-md">
            <div className="ogame-panel-header">{t('createNew')}</div>
            <div className="ogame-panel-content space-y-4">
              <div>
                <label className="block text-ogame-text-header text-sm mb-1">
                  {t('allianceName')}
                </label>
                <input
                  type="text"
                  value={newAllianceName}
                  onChange={(e) => setNewAllianceName(e.target.value)}
                  className="ogame-input w-full"
                  placeholder={t('namePlaceholder')}
                  maxLength={30}
                />
              </div>
              <div>
                <label className="block text-ogame-text-header text-sm mb-1">
                  {t('allianceTag')}
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
                  {t('tagDescription')}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="ogame-button flex-1"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={createAlliance}
                  disabled={!newAllianceName || newAllianceTag.length < 3}
                  className="ogame-button-primary flex-1"
                >
                  {tCommon('create')}
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
        <h1 className="text-2xl font-bold text-ogame-text-header">{t('title')}</h1>
        <span className="ogame-badge ogame-badge-info text-lg px-3 py-1">
          [{alliance.tag}]
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alliance info */}
        <div className="ogame-panel">
          <div className="ogame-panel-header">{t('information')}</div>
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
                  <img
                    src="/img/alliance/alliance_default.png"
                    alt="Alliance"
                    className="w-16 h-16 object-contain opacity-70"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-ogame-text-header mb-2">
                  {alliance.name}
                </h2>
                <p className="text-ogame-text-muted text-sm">
                  {alliance.description || t('noDescription')}
                </p>
                <p className="text-ogame-text-muted text-xs mt-4">
                  {t('founded')}: {new Date(alliance.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="ogame-panel">
          <div className="ogame-panel-header">{t('members')}</div>
          <div className="ogame-panel-content">
            <p className="text-ogame-text-muted text-center py-4">
              {t('membersComingSoon')}
            </p>
          </div>
        </div>

        {/* Alliance actions */}
        <div className="ogame-panel lg:col-span-2">
          <div className="ogame-panel-header">{t('actions')}</div>
          <div className="ogame-panel-content">
            <div className="flex gap-4">
              <button className="ogame-button">{t('viewApplications')}</button>
              <button className="ogame-button">{t('sendMessage')}</button>
              <button className="ogame-button">{t('editDescription')}</button>
              <button className="ogame-button-danger">{t('leave')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
