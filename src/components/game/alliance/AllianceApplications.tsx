'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { HoloCard, HoloBadge, HoloButton, HoloSpinner } from '@/components/ui/holographic'
import type { AllianceApplication } from '@/types/alliance'
import { formatDistanceToNow } from '@/lib/utils/format'

interface AllianceApplicationsProps {
  applications: AllianceApplication[]
  loading?: boolean
  onAccept: (applicationId: string) => Promise<void>
  onReject: (applicationId: string) => Promise<void>
}

export function AllianceApplications({
  applications,
  loading = false,
  onAccept,
  onReject,
}: AllianceApplicationsProps) {
  const t = useTranslations('alliance')
  const tCommon = useTranslations('common')

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const handleAccept = async (id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id))
    try {
      await onAccept(id)
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleReject = async (id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id))
    try {
      await onReject(id)
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  if (loading) {
    return (
      <HoloCard title={t('applications')}>
        <div className="flex justify-center py-8">
          <HoloSpinner size="lg" variant="orbital" />
        </div>
      </HoloCard>
    )
  }

  return (
    <HoloCard
      title={t('applications')}
      subtitle={`${applications.length} ${t('pendingApplications')}`}
    >
      {applications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(0, 128, 255, 0.05))',
              border: '1px solid rgba(0, 255, 255, 0.2)',
            }}
          >
            <svg
              className="w-8 h-8 text-cyan-400/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-white/50">{t('noApplications')}</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {applications.map((application, index) => {
              const isProcessing = processingIds.has(application.id)

              return (
                <motion.div
                  key={application.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative p-4 rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.05), rgba(0, 0, 0, 0.3))',
                    border: '1px solid rgba(0, 255, 255, 0.2)',
                  }}
                >
                  {/* Processing overlay */}
                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-10"
                    >
                      <HoloSpinner size="md" />
                    </motion.div>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Applicant avatar placeholder */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, rgba(128, 0, 255, 0.3), rgba(0, 128, 255, 0.3))',
                        border: '1px solid rgba(0, 255, 255, 0.3)',
                      }}
                    >
                      <span className="text-cyan-400 font-bold">
                        {application.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>

                    {/* Applicant info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">
                          {application.username || 'Unknown'}
                        </span>
                        <HoloBadge variant="info" size="sm">
                          {t('applicant')}
                        </HoloBadge>
                      </div>

                      {/* Application message */}
                      {application.message ? (
                        <div
                          className="p-2 rounded mt-2 text-sm"
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(0, 255, 255, 0.1)',
                          }}
                        >
                          <p className="text-white/70 italic">"{application.message}"</p>
                        </div>
                      ) : (
                        <p className="text-white/40 text-sm italic">
                          {t('noApplicationMessage')}
                        </p>
                      )}

                      {/* Timestamp */}
                      <p className="text-white/40 text-xs mt-2">
                        {t('appliedAt')}: {formatDistanceToNow(new Date(application.created_at))}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleAccept(application.id)}
                        disabled={isProcessing}
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          background: 'rgba(0, 255, 136, 0.1)',
                          border: '1px solid rgba(0, 255, 136, 0.3)',
                        }}
                        title={t('accept')}
                      >
                        <svg
                          className="w-5 h-5 text-green-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleReject(application.id)}
                        disabled={isProcessing}
                        className="p-2 rounded-lg transition-colors"
                        style={{
                          background: 'rgba(255, 68, 68, 0.1)',
                          border: '1px solid rgba(255, 68, 68, 0.3)',
                        }}
                        title={t('reject')}
                      >
                        <svg
                          className="w-5 h-5 text-red-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </HoloCard>
  )
}

export default AllianceApplications
