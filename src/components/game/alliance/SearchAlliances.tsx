'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { HoloCard, HoloInput, HoloButton, HoloBadge, HoloSpinner, HoloModal } from '@/components/ui/holographic'
import type { Alliance } from '@/types/alliance'

interface SearchAlliancesProps {
  searchResults: Alliance[]
  loading: boolean
  onSearch: (query: string) => void
  onApply: (allianceId: string, message?: string) => Promise<boolean>
  userApplications: Array<{ alliance_id: string }>
}

export function SearchAlliances({
  searchResults,
  loading,
  onSearch,
  onApply,
  userApplications,
}: SearchAlliancesProps) {
  const t = useTranslations('alliance')
  const tCommon = useTranslations('common')

  const [query, setQuery] = useState('')
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [selectedAlliance, setSelectedAlliance] = useState<Alliance | null>(null)
  const [applicationMessage, setApplicationMessage] = useState('')
  const [applying, setApplying] = useState(false)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, onSearch])

  const handleApply = async () => {
    if (!selectedAlliance) return

    setApplying(true)
    try {
      const success = await onApply(selectedAlliance.id, applicationMessage || undefined)
      if (success) {
        setShowApplyModal(false)
        setSelectedAlliance(null)
        setApplicationMessage('')
      }
    } finally {
      setApplying(false)
    }
  }

  const hasApplied = (allianceId: string) => {
    return userApplications.some((app) => app.alliance_id === allianceId)
  }

  return (
    <>
      <HoloCard
        title={t('searchAlliances')}
        subtitle={t('findAndJoin')}
        glow
      >
        <div className="space-y-4">
          {/* Search input */}
          <HoloInput
            value={query}
            onChange={setQuery}
            placeholder={t('searchPlaceholder')}
            icon={
              loading ? (
                <HoloSpinner size="sm" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )
            }
          />

          {/* Results */}
          <div className="min-h-[200px]">
            {query.length < 2 ? (
              <div className="text-center py-8">
                <svg
                  className="w-12 h-12 mx-auto text-cyan-400/30 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-white/50">{t('typeToSearch')}</p>
              </div>
            ) : loading ? (
              <div className="flex justify-center py-8">
                <HoloSpinner size="lg" variant="orbital" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="w-12 h-12 mx-auto text-cyan-400/30 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-white/50">{t('noResults')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {searchResults.map((alliance, index) => {
                    const applied = hasApplied(alliance.id)

                    return (
                      <motion.div
                        key={alliance.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-lg cursor-pointer transition-all"
                        style={{
                          background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.05), rgba(0, 0, 0, 0.3))',
                          border: '1px solid rgba(0, 255, 255, 0.2)',
                        }}
                        whileHover={{
                          borderColor: 'rgba(0, 255, 255, 0.4)',
                          background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 0, 0, 0.3))',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Logo */}
                            <div
                              className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                              style={{
                                background: 'linear-gradient(135deg, rgba(128, 0, 255, 0.3), rgba(0, 128, 255, 0.3))',
                                border: '1px solid rgba(0, 255, 255, 0.3)',
                              }}
                            >
                              {alliance.logo_url ? (
                                <img
                                  src={alliance.logo_url}
                                  alt={alliance.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <span className="text-cyan-400 font-bold">
                                  {alliance.tag.substring(0, 2)}
                                </span>
                              )}
                            </div>

                            {/* Info */}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{alliance.name}</span>
                                <HoloBadge variant="purple" size="sm">
                                  [{alliance.tag}]
                                </HoloBadge>
                              </div>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-white/50 text-sm">
                                  {alliance.member_count || 1} {t('members')}
                                </span>
                                <span className="text-cyan-400/70 text-sm">
                                  {(alliance.total_points || 0).toLocaleString()} pts
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Apply button */}
                          {applied ? (
                            <HoloBadge variant="info" size="sm">
                              {t('applied')}
                            </HoloBadge>
                          ) : (
                            <HoloButton
                              size="sm"
                              onClick={() => {
                                setSelectedAlliance(alliance)
                                setShowApplyModal(true)
                              }}
                            >
                              {t('apply')}
                            </HoloButton>
                          )}
                        </div>

                        {/* Description preview */}
                        {alliance.description && (
                          <p className="text-white/40 text-sm mt-3 line-clamp-2">
                            {alliance.description}
                          </p>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </HoloCard>

      {/* Apply modal */}
      <HoloModal
        isOpen={showApplyModal}
        onClose={() => {
          setShowApplyModal(false)
          setSelectedAlliance(null)
          setApplicationMessage('')
        }}
        title={t('applyToAlliance')}
        size="md"
      >
        {selectedAlliance && (
          <div className="space-y-4">
            {/* Alliance info */}
            <div
              className="p-4 rounded-lg flex items-center gap-4"
              style={{
                background: 'rgba(0, 255, 255, 0.05)',
                border: '1px solid rgba(0, 255, 255, 0.2)',
              }}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(128, 0, 255, 0.3), rgba(0, 128, 255, 0.3))',
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                }}
              >
                <span className="text-cyan-400 font-bold">
                  {selectedAlliance.tag.substring(0, 2)}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{selectedAlliance.name}</span>
                  <HoloBadge variant="purple" size="sm">
                    [{selectedAlliance.tag}]
                  </HoloBadge>
                </div>
              </div>
            </div>

            {/* Application message */}
            <div>
              <label className="block text-cyan-400 text-sm font-medium mb-2">
                {t('applicationMessage')}
                <span className="text-white/40 ml-2 text-xs">({t('optional')})</span>
              </label>
              <textarea
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full p-3 rounded-lg resize-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(10, 20, 35, 0.8))',
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  color: '#fff',
                }}
                placeholder={t('applicationMessagePlaceholder')}
              />
              <p className="text-white/40 text-xs text-right mt-1">
                {applicationMessage.length}/500
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <HoloButton
                variant="ghost"
                onClick={() => {
                  setShowApplyModal(false)
                  setSelectedAlliance(null)
                  setApplicationMessage('')
                }}
              >
                {tCommon('cancel')}
              </HoloButton>
              <HoloButton
                onClick={handleApply}
                loading={applying}
              >
                {t('sendApplication')}
              </HoloButton>
            </div>
          </div>
        )}
      </HoloModal>
    </>
  )
}

export default SearchAlliances
