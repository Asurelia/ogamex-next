'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { HoloCard, HoloTable, HoloBadge, HoloButton, HoloModal } from '@/components/ui/holographic'
import type { AllianceMember, AllianceRank } from '@/types/alliance'
import { RANK_HIERARCHY, hasRankPermission } from '@/types/alliance'

interface AllianceMemberListProps {
  members: AllianceMember[]
  userRank: AllianceRank
  currentUserId: string
  founderId: string
  leaderId: string
  onUpdateRank: (memberId: string, newRank: AllianceRank) => void
  onKickMember: (memberId: string) => void
}

const rankColors: Record<AllianceRank, string> = {
  founder: 'warning',
  leader: 'success',
  officer: 'info',
  veteran: 'purple',
  member: 'default',
  newbie: 'default',
}

export function AllianceMemberList({
  members,
  userRank,
  currentUserId,
  founderId,
  leaderId,
  onUpdateRank,
  onKickMember,
}: AllianceMemberListProps) {
  const t = useTranslations('alliance')
  const tCommon = useTranslations('common')

  const [selectedMember, setSelectedMember] = useState<AllianceMember | null>(null)
  const [showRankModal, setShowRankModal] = useState(false)
  const [showKickModal, setShowKickModal] = useState(false)
  const [filterRank, setFilterRank] = useState<AllianceRank | 'all'>('all')
  const [sortBy, setSortBy] = useState<'points' | 'name' | 'date'>('points')

  const filteredMembers = useMemo(() => {
    let result = [...members]

    // Filter by rank
    if (filterRank !== 'all') {
      result = result.filter((m) => m.rank === filterRank)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'points':
          return b.points - a.points
        case 'name':
          return a.username.localeCompare(b.username)
        case 'date':
          return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
        default:
          return 0
      }
    })

    return result
  }, [members, filterRank, sortBy])

  const canManageMember = (member: AllianceMember) => {
    if (member.user_id === currentUserId) return false
    if (member.user_id === founderId) return false
    return hasRankPermission(userRank, member.rank)
  }

  const handlePromote = () => {
    if (!selectedMember) return
    const currentIndex = RANK_HIERARCHY[selectedMember.rank]
    const ranks = Object.keys(RANK_HIERARCHY) as AllianceRank[]
    const newRank = ranks.find((r) => RANK_HIERARCHY[r] === currentIndex - 1)
    if (newRank && newRank !== 'founder') {
      onUpdateRank(selectedMember.user_id, newRank)
    }
    setShowRankModal(false)
    setSelectedMember(null)
  }

  const handleDemote = () => {
    if (!selectedMember) return
    const currentIndex = RANK_HIERARCHY[selectedMember.rank]
    const ranks = Object.keys(RANK_HIERARCHY) as AllianceRank[]
    const newRank = ranks.find((r) => RANK_HIERARCHY[r] === currentIndex + 1)
    if (newRank) {
      onUpdateRank(selectedMember.user_id, newRank)
    }
    setShowRankModal(false)
    setSelectedMember(null)
  }

  const handleKick = () => {
    if (!selectedMember) return
    onKickMember(selectedMember.user_id)
    setShowKickModal(false)
    setSelectedMember(null)
  }

  const columns = [
    {
      key: 'rank' as keyof AllianceMember,
      header: t('memberRank'),
      width: '120px',
      render: (value: any, row: AllianceMember) => (
        <HoloBadge
          variant={rankColors[row.rank] as any}
          size="sm"
        >
          {t(`ranks.${row.rank}`)}
        </HoloBadge>
      ),
    },
    {
      key: 'username' as keyof AllianceMember,
      header: t('memberName'),
      sortable: true,
      render: (value: any, row: AllianceMember) => (
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{row.username}</span>
          {row.user_id === founderId && (
            <span className="text-yellow-400 text-xs">(Founder)</span>
          )}
          {row.user_id === leaderId && row.user_id !== founderId && (
            <span className="text-green-400 text-xs">(Leader)</span>
          )}
          {row.user_id === currentUserId && (
            <span className="text-cyan-400 text-xs">(You)</span>
          )}
        </div>
      ),
    },
    {
      key: 'points' as keyof AllianceMember,
      header: t('memberPoints'),
      sortable: true,
      width: '120px',
      render: (value: any) => (
        <span className="text-cyan-400">{value.toLocaleString()}</span>
      ),
    },
    {
      key: 'planets_count' as keyof AllianceMember,
      header: t('memberPlanets'),
      width: '100px',
      render: (value: any) => (
        <span className="text-white/70">{value}</span>
      ),
    },
    {
      key: 'joined_at' as keyof AllianceMember,
      header: t('memberJoined'),
      sortable: true,
      width: '140px',
      render: (value: any) => (
        <span className="text-white/50 text-sm">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'id' as keyof AllianceMember,
      header: t('memberActions'),
      width: '120px',
      render: (_: any, row: AllianceMember) => {
        if (!canManageMember(row)) return null

        return (
          <div className="flex gap-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded"
              style={{
                background: 'rgba(0, 255, 255, 0.1)',
                border: '1px solid rgba(0, 255, 255, 0.2)',
              }}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedMember(row)
                setShowRankModal(true)
              }}
              title={t('changeRank')}
            >
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded"
              style={{
                background: 'rgba(255, 68, 68, 0.1)',
                border: '1px solid rgba(255, 68, 68, 0.2)',
              }}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedMember(row)
                setShowKickModal(true)
              }}
              title={t('kickMember')}
            >
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <HoloCard title={t('memberList')} subtitle={`${members.length} ${t('members')}`}>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Rank filter */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">{t('filterByRank')}:</span>
            <select
              value={filterRank}
              onChange={(e) => setFilterRank(e.target.value as AllianceRank | 'all')}
              className="px-3 py-1.5 rounded text-sm"
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                color: '#fff',
              }}
            >
              <option value="all">{tCommon('all')}</option>
              {Object.keys(RANK_HIERARCHY).map((rank) => (
                <option key={rank} value={rank}>
                  {t(`ranks.${rank}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">{t('sortBy')}:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'points' | 'name' | 'date')}
              className="px-3 py-1.5 rounded text-sm"
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                color: '#fff',
              }}
            >
              <option value="points">{t('memberPoints')}</option>
              <option value="name">{t('memberName')}</option>
              <option value="date">{t('memberJoined')}</option>
            </select>
          </div>
        </div>

        {/* Member table */}
        <HoloTable
          data={filteredMembers}
          columns={columns}
          emptyMessage={t('noMembers')}
        />
      </HoloCard>

      {/* Rank change modal */}
      <HoloModal
        isOpen={showRankModal}
        onClose={() => {
          setShowRankModal(false)
          setSelectedMember(null)
        }}
        title={t('changeRank')}
        size="sm"
      >
        {selectedMember && (
          <div className="space-y-4">
            <p className="text-white/80">
              {t('changeRankFor')} <span className="text-cyan-400">{selectedMember.username}</span>
            </p>
            <p className="text-white/60 text-sm">
              {t('currentRank')}: <HoloBadge variant={rankColors[selectedMember.rank] as any} size="sm">
                {t(`ranks.${selectedMember.rank}`)}
              </HoloBadge>
            </p>

            <div className="flex gap-3">
              <HoloButton
                variant="success"
                onClick={handlePromote}
                disabled={selectedMember.rank === 'leader'}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                }
              >
                {t('promote')}
              </HoloButton>
              <HoloButton
                variant="danger"
                onClick={handleDemote}
                disabled={selectedMember.rank === 'newbie'}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                }
              >
                {t('demote')}
              </HoloButton>
            </div>
          </div>
        )}
      </HoloModal>

      {/* Kick confirmation modal */}
      <HoloModal
        isOpen={showKickModal}
        onClose={() => {
          setShowKickModal(false)
          setSelectedMember(null)
        }}
        title={t('kickMember')}
        size="sm"
      >
        {selectedMember && (
          <div className="space-y-4">
            <p className="text-white/80">
              {t('confirmKick')} <span className="text-red-400">{selectedMember.username}</span>?
            </p>
            <p className="text-white/60 text-sm">
              {t('kickWarning')}
            </p>

            <div className="flex gap-3 justify-end">
              <HoloButton
                variant="ghost"
                onClick={() => {
                  setShowKickModal(false)
                  setSelectedMember(null)
                }}
              >
                {tCommon('cancel')}
              </HoloButton>
              <HoloButton
                variant="danger"
                onClick={handleKick}
              >
                {t('kickMember')}
              </HoloButton>
            </div>
          </div>
        )}
      </HoloModal>
    </>
  )
}

export default AllianceMemberList
