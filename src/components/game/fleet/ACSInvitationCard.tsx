'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { HoloCard, HoloButton, HoloBadge, HoloCountdown } from '@/components/ui'
import type { ACSInvitation } from '@/types/acs'

interface ACSInvitationCardProps {
  invitation: ACSInvitation
  onAccept: () => void
  onDecline: () => void
}

export function ACSInvitationCard({
  invitation,
  onAccept,
  onDecline,
}: ACSInvitationCardProps) {
  const t = useTranslations('fleet.acs')
  const tCommon = useTranslations('common')

  const expiresAt = new Date(invitation.expires_at)
  const isExpired = expiresAt <= new Date()

  // Extract coordinates from the acs_operation_id or use mock data
  const targetCoords = '[1:234:5]' // Would come from the full operation data

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
    >
      <HoloCard variant="accent" glow={!isExpired}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Invitation Icon */}
              <motion.div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.2), rgba(200, 0, 255, 0.1))',
                  border: '1px solid rgba(255, 0, 255, 0.4)',
                  boxShadow: '0 0 15px rgba(255, 0, 255, 0.3)',
                }}
                animate={!isExpired ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ff00ff"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </motion.div>

              <div>
                <h3
                  className="text-lg font-bold"
                  style={{
                    color: '#ff00ff',
                    textShadow: '0 0 15px rgba(255, 0, 255, 0.5)',
                  }}
                >
                  {t('invitationTitle')}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-fuchsia-200/60 text-sm">{t('from')}:</span>
                  <span className="text-fuchsia-300">{invitation.invited_by}</span>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            {isExpired ? (
              <HoloBadge variant="danger">{t('expired')}</HoloBadge>
            ) : (
              <HoloBadge variant="purple" glow pulse>
                {t('pendingInvitation')}
              </HoloBadge>
            )}
          </div>

          {/* Operation Details */}
          <div
            className="p-3 rounded-lg mb-4"
            style={{
              background: 'rgba(255, 0, 255, 0.05)',
              border: '1px solid rgba(255, 0, 255, 0.2)',
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-fuchsia-200/50 uppercase mb-1">{t('operation')}</div>
                <div className="text-fuchsia-300 font-medium">
                  {invitation.acs_operation_id.substring(0, 8)}...
                </div>
              </div>
              <div>
                <div className="text-xs text-fuchsia-200/50 uppercase mb-1">{t('target')}</div>
                <div className="text-fuchsia-300 font-mono">{targetCoords}</div>
              </div>
            </div>

            {invitation.message && (
              <div className="mt-3 pt-3 border-t border-fuchsia-500/20">
                <div className="text-xs text-fuchsia-200/50 uppercase mb-1">{t('message')}</div>
                <p className="text-fuchsia-200/80 text-sm italic">"{invitation.message}"</p>
              </div>
            )}
          </div>

          {/* Expiration Timer */}
          {!isExpired && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-fuchsia-200/60 text-sm">{t('expiresIn')}</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: '#ff00ff',
                    boxShadow: '0 0 8px #ff00ff',
                  }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <HoloCountdown
                  targetDate={expiresAt}
                  format="compact"
                  showLabels={false}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          {!isExpired && invitation.status === 'pending' && (
            <div className="flex items-center gap-3">
              <HoloButton
                onClick={onAccept}
                variant="success"
                fullWidth
                icon={
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                }
              >
                {t('accept')}
              </HoloButton>
              <HoloButton
                onClick={onDecline}
                variant="ghost"
                fullWidth
                icon={
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                }
              >
                {t('decline')}
              </HoloButton>
            </div>
          )}

          {/* Expired state */}
          {isExpired && (
            <div
              className="p-3 rounded-lg"
              style={{
                background: 'rgba(255, 68, 68, 0.1)',
                border: '1px solid rgba(255, 68, 68, 0.3)',
              }}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-red-400 text-sm">{t('invitationExpired')}</span>
              </div>
            </div>
          )}
        </div>
      </HoloCard>
    </motion.div>
  )
}

export default ACSInvitationCard
