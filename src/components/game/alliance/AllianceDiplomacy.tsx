'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { HoloCard, HoloBadge, HoloButton, HoloModal, HoloInput, HoloSpinner } from '@/components/ui/holographic'
import type { AllianceDiplomacy, DiplomacyRelation, Alliance } from '@/types/alliance'

interface AllianceDiplomacyProps {
  diplomacy: AllianceDiplomacy[]
  allianceId: string
  loading?: boolean
  onPropose: (targetAllianceId: string, relationType: DiplomacyRelation) => Promise<void>
  onRespond: (diplomacyId: string, accept: boolean) => Promise<void>
  onCancel: (diplomacyId: string) => Promise<void>
  onSearchAlliance: (query: string) => Promise<Alliance[]>
}

const relationStyles: Record<DiplomacyRelation, { variant: 'danger' | 'warning' | 'success' | 'default'; icon: string }> = {
  war: {
    variant: 'danger',
    icon: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z',
  },
  nap: {
    variant: 'warning',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
  ally: {
    variant: 'success',
    icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
  },
  neutral: {
    variant: 'default',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
}

export function AllianceDiplomacy({
  diplomacy,
  allianceId,
  loading = false,
  onPropose,
  onRespond,
  onCancel,
  onSearchAlliance,
}: AllianceDiplomacyProps) {
  const t = useTranslations('alliance')
  const tCommon = useTranslations('common')

  const [showProposeModal, setShowProposeModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Alliance[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedAlliance, setSelectedAlliance] = useState<Alliance | null>(null)
  const [selectedRelation, setSelectedRelation] = useState<DiplomacyRelation>('nap')
  const [proposing, setProposing] = useState(false)

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const results = await onSearchAlliance(query)
      // Filter out own alliance
      setSearchResults(results.filter((a) => a.id !== allianceId))
    } finally {
      setSearching(false)
    }
  }

  const handlePropose = async () => {
    if (!selectedAlliance) return

    setProposing(true)
    try {
      await onPropose(selectedAlliance.id, selectedRelation)
      setShowProposeModal(false)
      setSelectedAlliance(null)
      setSearchQuery('')
      setSearchResults([])
    } finally {
      setProposing(false)
    }
  }

  // Group diplomacy by type
  const groupedDiplomacy = {
    incoming: diplomacy.filter((d) => d.target_alliance_id === allianceId && d.status === 'proposed'),
    outgoing: diplomacy.filter((d) => d.alliance_id === allianceId && d.status === 'proposed'),
    active: diplomacy.filter((d) => d.status === 'active'),
  }

  if (loading) {
    return (
      <HoloCard title={t('diplomacy')}>
        <div className="flex justify-center py-8">
          <HoloSpinner size="lg" variant="orbital" />
        </div>
      </HoloCard>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Active relations */}
        <HoloCard title={t('activeRelations')}>
          <div className="flex justify-between items-center mb-4">
            <span className="text-white/60 text-sm">
              {groupedDiplomacy.active.length} {t('activeAgreements')}
            </span>
            <HoloButton
              size="sm"
              onClick={() => setShowProposeModal(true)}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              {t('proposeRelation')}
            </HoloButton>
          </div>

          {groupedDiplomacy.active.length === 0 ? (
            <p className="text-white/40 text-center py-4">{t('noActiveRelations')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedDiplomacy.active.map((relation) => (
                <RelationCard
                  key={relation.id}
                  relation={relation}
                  isOwn={relation.alliance_id === allianceId}
                  onCancel={() => onCancel(relation.id)}
                  t={t}
                />
              ))}
            </div>
          )}
        </HoloCard>

        {/* Incoming proposals */}
        {groupedDiplomacy.incoming.length > 0 && (
          <HoloCard
            title={t('incomingProposals')}
            variant="accent"
          >
            <div className="space-y-3">
              {groupedDiplomacy.incoming.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  isIncoming
                  onAccept={() => onRespond(proposal.id, true)}
                  onReject={() => onRespond(proposal.id, false)}
                  t={t}
                />
              ))}
            </div>
          </HoloCard>
        )}

        {/* Outgoing proposals */}
        {groupedDiplomacy.outgoing.length > 0 && (
          <HoloCard title={t('outgoingProposals')}>
            <div className="space-y-3">
              {groupedDiplomacy.outgoing.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  isIncoming={false}
                  onCancel={() => onCancel(proposal.id)}
                  t={t}
                />
              ))}
            </div>
          </HoloCard>
        )}
      </div>

      {/* Propose relation modal */}
      <HoloModal
        isOpen={showProposeModal}
        onClose={() => {
          setShowProposeModal(false)
          setSelectedAlliance(null)
          setSearchQuery('')
          setSearchResults([])
        }}
        title={t('proposeRelation')}
        size="md"
      >
        <div className="space-y-4">
          {/* Search alliance */}
          <div>
            <HoloInput
              label={t('searchAlliance')}
              placeholder={t('searchAlliancePlaceholder')}
              value={searchQuery}
              onChange={handleSearch}
              icon={
                searching ? (
                  <HoloSpinner size="sm" />
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )
              }
            />

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {searchResults.map((alliance) => (
                  <motion.button
                    key={alliance.id}
                    onClick={() => {
                      setSelectedAlliance(alliance)
                      setSearchQuery(`[${alliance.tag}] ${alliance.name}`)
                      setSearchResults([])
                    }}
                    className="w-full p-2 rounded text-left transition-colors"
                    style={{
                      background: selectedAlliance?.id === alliance.id
                        ? 'rgba(0, 255, 255, 0.2)'
                        : 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0, 255, 255, 0.2)',
                    }}
                    whileHover={{ background: 'rgba(0, 255, 255, 0.15)' }}
                  >
                    <span className="text-cyan-400 font-medium">[{alliance.tag}]</span>
                    <span className="text-white ml-2">{alliance.name}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Relation type */}
          {selectedAlliance && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <label className="text-white/80 text-sm">{t('relationType')}</label>
              <div className="grid grid-cols-3 gap-3">
                {(['nap', 'ally', 'war'] as DiplomacyRelation[]).map((type) => {
                  const style = relationStyles[type]
                  return (
                    <motion.button
                      key={type}
                      onClick={() => setSelectedRelation(type)}
                      className="p-3 rounded-lg text-center transition-all"
                      style={{
                        background: selectedRelation === type
                          ? type === 'war'
                            ? 'rgba(255, 68, 68, 0.2)'
                            : type === 'ally'
                              ? 'rgba(0, 255, 136, 0.2)'
                              : 'rgba(255, 215, 0, 0.2)'
                          : 'rgba(0, 0, 0, 0.3)',
                        border: `1px solid ${
                          selectedRelation === type
                            ? type === 'war'
                              ? 'rgba(255, 68, 68, 0.5)'
                              : type === 'ally'
                                ? 'rgba(0, 255, 136, 0.5)'
                                : 'rgba(255, 215, 0, 0.5)'
                            : 'rgba(255, 255, 255, 0.1)'
                        }`,
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <svg className="w-6 h-6 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={style.icon} />
                      </svg>
                      <span className="text-sm text-white/80">{t(`relations.${type}`)}</span>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4">
            <HoloButton
              variant="ghost"
              onClick={() => setShowProposeModal(false)}
            >
              {tCommon('cancel')}
            </HoloButton>
            <HoloButton
              onClick={handlePropose}
              disabled={!selectedAlliance || proposing}
              loading={proposing}
            >
              {t('sendProposal')}
            </HoloButton>
          </div>
        </div>
      </HoloModal>
    </>
  )
}

// Relation card component
function RelationCard({
  relation,
  isOwn,
  onCancel,
  t,
}: {
  relation: AllianceDiplomacy
  isOwn: boolean
  onCancel: () => void
  t: any
}) {
  const style = relationStyles[relation.relation_type]

  return (
    <motion.div
      className="p-4 rounded-lg"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(0, 255, 255, 0.2)',
      }}
      whileHover={{ borderColor: 'rgba(0, 255, 255, 0.4)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HoloBadge variant={style.variant} glow>
            {t(`relations.${relation.relation_type}`)}
          </HoloBadge>
          <span className="text-white font-medium">
            [{relation.target_alliance_tag}] {relation.target_alliance_name}
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onCancel}
          className="p-1.5 rounded text-red-400/60 hover:text-red-400"
          title={t('cancelRelation')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  )
}

// Proposal card component
function ProposalCard({
  proposal,
  isIncoming,
  onAccept,
  onReject,
  onCancel,
  t,
}: {
  proposal: AllianceDiplomacy
  isIncoming: boolean
  onAccept?: () => void
  onReject?: () => void
  onCancel?: () => void
  t: any
}) {
  const style = relationStyles[proposal.relation_type]

  return (
    <motion.div
      className="p-4 rounded-lg"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(0, 255, 255, 0.2)',
      }}
      initial={{ opacity: 0, x: isIncoming ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HoloBadge variant={style.variant}>
            {t(`relations.${proposal.relation_type}`)}
          </HoloBadge>
          <span className="text-white/80">
            {isIncoming ? t('from') : t('to')}:{' '}
            <span className="text-cyan-400 font-medium">
              [{proposal.target_alliance_tag}] {proposal.target_alliance_name}
            </span>
          </span>
        </div>

        {isIncoming ? (
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onAccept}
              className="p-1.5 rounded bg-green-500/10 text-green-400"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onReject}
              className="p-1.5 rounded bg-red-500/10 text-red-400"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onCancel}
            className="p-1.5 rounded text-red-400/60 hover:text-red-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

export default AllianceDiplomacy
