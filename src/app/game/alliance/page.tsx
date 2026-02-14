'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useGameStore } from '@/stores/gameStore'
import { useAllianceStore } from '@/stores/allianceStore'
import { useToast } from '@/hooks/useToast'
import { HoloCard, HoloButton, HoloTabs, HoloSpinner, HoloBadge } from '@/components/ui/holographic'
import {
  AllianceDashboard,
  AllianceMemberList,
  AllianceApplications,
  AllianceDiplomacy,
  AllianceSettings,
  CreateAllianceForm,
  SearchAlliances,
} from '@/components/game/alliance'
import type { AllianceRank } from '@/types/alliance'

type ViewMode = 'overview' | 'members' | 'applications' | 'diplomacy' | 'settings'

export default function AlliancePage() {
  const { user } = useGameStore()
  const t = useTranslations('alliance')
  const tCommon = useTranslations('common')
  const { success, error: showError } = useToast()

  const {
    alliance,
    userRank,
    members,
    applications,
    diplomacy,
    circulars,
    searchResults,
    searchLoading,
    userApplications,
    loading,
    error,
    loadUserAlliance,
    createAlliance,
    updateAlliance,
    dissolveAlliance,
    leaveAlliance,
    loadMembers,
    updateMemberRank,
    kickMember,
    loadApplications,
    processApplication,
    applyToAlliance,
    loadUserApplications,
    loadDiplomacy,
    proposeDiplomacy,
    respondToDiplomacy,
    cancelDiplomacy,
    loadCirculars,
    searchAlliances,
    clearSearch,
  } = useAllianceStore()

  const [showCreate, setShowCreate] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [currentView, setCurrentView] = useState<ViewMode>('overview')

  // Load alliance data
  useEffect(() => {
    if (user?.id) {
      loadUserAlliance(user.id)
      loadUserApplications(user.id)
    }
  }, [user?.id, loadUserAlliance, loadUserApplications])

  // Load additional data when alliance is loaded
  useEffect(() => {
    if (alliance) {
      loadMembers()
      loadApplications()
      loadDiplomacy()
      loadCirculars()
    }
  }, [alliance, loadMembers, loadApplications, loadDiplomacy, loadCirculars])

  // Handle create alliance
  const handleCreate = async (tag: string, name: string, description?: string) => {
    const result = await createAlliance(tag, name, description)
    if (result) {
      success(t('allianceCreated'), t('welcomeToAlliance', { name: result.name }))
      setShowCreate(false)
    } else {
      showError(t('createFailed'), error || t('genericError'))
    }
  }

  // Handle apply to alliance
  const handleApply = async (allianceId: string, message?: string) => {
    const result = await applyToAlliance(allianceId, message)
    if (result) {
      success(t('applicationSent'), t('applicationSentDesc'))
      if (user?.id) {
        loadUserApplications(user.id)
      }
      return true
    } else {
      showError(t('applicationFailed'), error || t('genericError'))
      return false
    }
  }

  // Handle process application
  const handleProcessApplication = async (applicationId: string, accept: boolean) => {
    const result = await processApplication(applicationId, accept)
    if (result) {
      success(
        accept ? t('applicationAccepted') : t('applicationRejected'),
        accept ? t('memberAdded') : t('applicationRejectedDesc')
      )
      loadMembers()
    } else {
      showError(t('processError'), error || t('genericError'))
    }
  }

  // Handle update member rank
  const handleUpdateRank = (memberId: string, newRank: AllianceRank) => {
    updateMemberRank(memberId, newRank)
    success(t('rankUpdated'))
  }

  // Handle kick member
  const handleKickMember = async (memberId: string) => {
    const result = await kickMember(memberId)
    if (result) {
      success(t('memberKicked'))
    } else {
      showError(t('kickFailed'), error || t('genericError'))
    }
  }

  // Handle diplomacy
  const handleProposeDiplomacy = async (targetId: string, type: any) => {
    const result = await proposeDiplomacy(targetId, type)
    if (result) {
      success(t('proposalSent'))
      loadDiplomacy()
    } else {
      showError(t('proposalFailed'))
    }
  }

  const handleRespondDiplomacy = async (diplomacyId: string, accept: boolean) => {
    const result = await respondToDiplomacy(diplomacyId, accept)
    if (result) {
      success(accept ? t('proposalAccepted') : t('proposalRejected'))
      loadDiplomacy()
    }
  }

  const handleCancelDiplomacy = async (diplomacyId: string) => {
    const result = await cancelDiplomacy(diplomacyId)
    if (result) {
      success(t('relationCancelled'))
    }
  }

  // Handle update alliance
  const handleUpdateAlliance = async (updates: any) => {
    const result = await updateAlliance(updates)
    if (result) {
      success(t('allianceUpdated'))
    } else {
      showError(t('updateFailed'))
    }
    return result
  }

  // Handle dissolve
  const handleDissolve = async () => {
    const result = await dissolveAlliance()
    if (result) {
      success(t('allianceDissolved'))
    } else {
      showError(t('dissolveFailed'))
    }
    return result
  }

  // Handle leave
  const handleLeave = async () => {
    const result = await leaveAlliance()
    if (result) {
      success(t('leftAlliance'))
    } else {
      showError(t('leaveFailed'))
    }
    return result
  }

  // Search alliances for diplomacy
  const searchAlliancesForDiplomacy = useCallback(async (query: string) => {
    await searchAlliances(query)
    return searchResults
  }, [searchAlliances, searchResults])

  // Loading state
  if (loading && !alliance && !showCreate && !showSearch) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <HoloSpinner size="xl" variant="orbital" />
      </div>
    )
  }

  // No alliance view
  if (!alliance) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <h1
            className="text-2xl font-bold"
            style={{
              color: '#00ffff',
              textShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
            }}
          >
            {t('title')}
          </h1>
        </motion.div>

        <AnimatePresence mode="wait">
          {showCreate ? (
            <CreateAllianceForm
              key="create"
              onSubmit={handleCreate}
              onCancel={() => setShowCreate(false)}
            />
          ) : showSearch ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-4">
                <HoloButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSearch(false)
                    clearSearch()
                  }}
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  }
                >
                  {tCommon('back')}
                </HoloButton>
              </div>
              <SearchAlliances
                searchResults={searchResults}
                loading={searchLoading}
                onSearch={searchAlliances}
                onApply={handleApply}
                userApplications={userApplications}
              />
            </motion.div>
          ) : (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <HoloCard glow scanline>
                <div className="text-center py-8">
                  <motion.div
                    className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(128, 0, 255, 0.2), rgba(0, 128, 255, 0.2))',
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                    }}
                    animate={{
                      boxShadow: [
                        '0 0 20px rgba(0, 255, 255, 0.3)',
                        '0 0 40px rgba(0, 255, 255, 0.5)',
                        '0 0 20px rgba(0, 255, 255, 0.3)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <svg
                      className="w-10 h-10 text-cyan-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </motion.div>

                  <h2 className="text-xl font-bold text-white mb-2">{t('joinOrCreate')}</h2>
                  <p className="text-white/60 mb-8 max-w-md mx-auto">
                    {t('notMember')}
                  </p>

                  <div className="flex justify-center gap-4">
                    <HoloButton
                      onClick={() => setShowSearch(true)}
                      icon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      }
                    >
                      {t('searchAlliances')}
                    </HoloButton>
                    <HoloButton
                      variant="secondary"
                      onClick={() => setShowCreate(true)}
                      icon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      }
                    >
                      {t('createAlliance')}
                    </HoloButton>
                  </div>

                  {/* Pending applications */}
                  {userApplications.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 pt-8"
                      style={{ borderTop: '1px solid rgba(0, 255, 255, 0.2)' }}
                    >
                      <h3 className="text-white/80 font-medium mb-4">{t('yourApplications')}</h3>
                      <div className="space-y-2 max-w-md mx-auto">
                        {userApplications.map((app) => (
                          <div
                            key={app.id}
                            className="flex items-center justify-between p-3 rounded-lg"
                            style={{
                              background: 'rgba(0, 0, 0, 0.3)',
                              border: '1px solid rgba(0, 255, 255, 0.2)',
                            }}
                          >
                            <span className="text-white">
                              [{app.alliance_tag}] {app.alliance_name}
                            </span>
                            <HoloBadge variant="info" size="sm">
                              {t('pending')}
                            </HoloBadge>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </HoloCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Alliance member view
  const tabs = [
    { id: 'overview', label: t('overview'), icon: null },
    { id: 'members', label: t('members'), badge: members.length },
    { id: 'applications', label: t('applications'), badge: applications.length },
    { id: 'diplomacy', label: t('diplomacy') },
    ...(userRank === 'founder' || userRank === 'leader'
      ? [{ id: 'settings', label: t('settings') }]
      : []),
  ]

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <HoloTabs
        tabs={tabs}
        activeTab={currentView}
        onChange={(tab) => setCurrentView(tab as ViewMode)}
        variant="default"
      />

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {currentView === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AllianceDashboard
              alliance={alliance}
              userRank={userRank!}
              circulars={circulars}
              onViewMembers={() => setCurrentView('members')}
              onInvite={() => {}}
              onSettings={() => setCurrentView('settings')}
              onSendCircular={() => {}}
            />
          </motion.div>
        )}

        {currentView === 'members' && (
          <motion.div
            key="members"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AllianceMemberList
              members={members}
              userRank={userRank!}
              currentUserId={user?.id || ''}
              founderId={alliance.founder_id}
              leaderId={alliance.leader_id}
              onUpdateRank={handleUpdateRank}
              onKickMember={handleKickMember}
            />
          </motion.div>
        )}

        {currentView === 'applications' && (
          <motion.div
            key="applications"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AllianceApplications
              applications={applications}
              onAccept={(id) => handleProcessApplication(id, true)}
              onReject={(id) => handleProcessApplication(id, false)}
            />
          </motion.div>
        )}

        {currentView === 'diplomacy' && (
          <motion.div
            key="diplomacy"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AllianceDiplomacy
              diplomacy={diplomacy}
              allianceId={alliance.id}
              onPropose={handleProposeDiplomacy}
              onRespond={handleRespondDiplomacy}
              onCancel={handleCancelDiplomacy}
              onSearchAlliance={searchAlliancesForDiplomacy}
            />
          </motion.div>
        )}

        {currentView === 'settings' && (userRank === 'founder' || userRank === 'leader') && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AllianceSettings
              alliance={alliance}
              userRank={userRank!}
              onUpdate={handleUpdateAlliance}
              onDissolve={handleDissolve}
              onLeave={handleLeave}
              onTransferLeadership={async () => true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
