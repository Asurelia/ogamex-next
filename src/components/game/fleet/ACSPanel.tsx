'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useACSStore } from '@/stores/acsStore'
import { HoloCard, HoloButton, HoloTabs, HoloBadge } from '@/components/ui'
import ACSOperationCard from './ACSOperationCard'
import ACSInvitationCard from './ACSInvitationCard'
import type { ACSOperation, ACSInvitation } from '@/types/acs'

interface ACSPanelProps {
  currentOperations: ACSOperation[]
  invitations: ACSInvitation[]
  onCreateOperation: () => void
  onJoinOperation: (opId: string) => void
  hasAlliance?: boolean
}

export function ACSPanel({
  currentOperations,
  invitations,
  onCreateOperation,
  onJoinOperation,
  hasAlliance = false,
}: ACSPanelProps) {
  const t = useTranslations('fleet.acs')
  const tCommon = useTranslations('common')
  const [activeTab, setActiveTab] = useState('operations')

  const activeOperations = currentOperations.filter(
    (op) => op.status !== 'completed' && op.status !== 'cancelled'
  )
  const completedOperations = currentOperations.filter(
    (op) => op.status === 'completed' || op.status === 'cancelled'
  )
  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending')

  const tabs = [
    {
      id: 'operations',
      label: t('activeOperations'),
      badge: activeOperations.length > 0 ? activeOperations.length : undefined,
    },
    {
      id: 'invitations',
      label: t('invitations'),
      badge: pendingInvitations.length > 0 ? pendingInvitations.length : undefined,
    },
    {
      id: 'history',
      label: t('history'),
      badge: completedOperations.length > 0 ? completedOperations.length : undefined,
    },
  ]

  const handleAcceptInvitation = (invitationId: string, operationId: string) => {
    onJoinOperation(operationId)
  }

  const handleDeclineInvitation = (invitationId: string) => {
    // Handle decline logic
    console.log('Declining invitation:', invitationId)
  }

  const handleLeaveOperation = (operationId: string) => {
    // Handle leave logic
    console.log('Leaving operation:', operationId)
  }

  const handleCancelOperation = (operationId: string) => {
    // Handle cancel logic
    console.log('Cancelling operation:', operationId)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <HoloCard glow>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* ACS Icon */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.2), rgba(0, 255, 255, 0.2))',
                  border: '1px solid rgba(255, 0, 255, 0.4)',
                  boxShadow: '0 0 15px rgba(255, 0, 255, 0.3)',
                }}
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  style={{ color: '#ff00ff' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
              </div>

              <div>
                <h2
                  className="text-lg font-bold"
                  style={{
                    color: '#ff00ff',
                    textShadow: '0 0 15px rgba(255, 0, 255, 0.5)',
                  }}
                >
                  {t('title')}
                </h2>
                <p className="text-cyan-200/60 text-sm">{t('subtitle')}</p>
              </div>
            </div>

            <HoloButton
              onClick={onCreateOperation}
              variant="secondary"
              disabled={!hasAlliance}
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              }
            >
              {t('createOperation')}
            </HoloButton>
          </div>

          {!hasAlliance && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 rounded-lg mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 150, 0, 0.05))',
                border: '1px solid rgba(255, 215, 0, 0.3)',
              }}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-yellow-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                <span className="text-yellow-400/90 text-sm">{t('allianceRequired')}</span>
              </div>
            </motion.div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div
              className="p-3 rounded-lg text-center"
              style={{
                background: 'rgba(0, 255, 255, 0.05)',
                border: '1px solid rgba(0, 255, 255, 0.2)',
              }}
            >
              <div className="text-2xl font-bold text-cyan-400">{activeOperations.length}</div>
              <div className="text-xs text-cyan-200/60 uppercase">{t('active')}</div>
            </div>
            <div
              className="p-3 rounded-lg text-center"
              style={{
                background: 'rgba(255, 0, 255, 0.05)',
                border: '1px solid rgba(255, 0, 255, 0.2)',
              }}
            >
              <div className="text-2xl font-bold text-fuchsia-400">{pendingInvitations.length}</div>
              <div className="text-xs text-fuchsia-200/60 uppercase">{t('pending')}</div>
            </div>
            <div
              className="p-3 rounded-lg text-center"
              style={{
                background: 'rgba(0, 255, 136, 0.05)',
                border: '1px solid rgba(0, 255, 136, 0.2)',
              }}
            >
              <div className="text-2xl font-bold text-green-400">{completedOperations.length}</div>
              <div className="text-xs text-green-200/60 uppercase">{t('completed')}</div>
            </div>
          </div>
        </div>
      </HoloCard>

      {/* Tabs */}
      <HoloTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="pills" />

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'operations' && (
          <motion.div
            key="operations"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {activeOperations.length === 0 ? (
              <HoloCard>
                <div className="p-8 text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(0, 255, 255, 0.1)',
                      border: '1px solid rgba(0, 255, 255, 0.2)',
                    }}
                  >
                    <svg
                      className="w-8 h-8 text-cyan-400/50"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-cyan-300 text-lg mb-2">{t('noActiveOperations')}</h3>
                  <p className="text-cyan-200/50 text-sm">{t('noActiveOperationsDesc')}</p>
                </div>
              </HoloCard>
            ) : (
              activeOperations.map((operation) => (
                <ACSOperationCard
                  key={operation.id}
                  operation={operation}
                  onJoin={() => onJoinOperation(operation.id)}
                  onLeave={() => handleLeaveOperation(operation.id)}
                  onCancel={() => handleCancelOperation(operation.id)}
                />
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'invitations' && (
          <motion.div
            key="invitations"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {pendingInvitations.length === 0 ? (
              <HoloCard>
                <div className="p-8 text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(255, 0, 255, 0.1)',
                      border: '1px solid rgba(255, 0, 255, 0.2)',
                    }}
                  >
                    <svg
                      className="w-8 h-8 text-fuchsia-400/50"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                  </div>
                  <h3 className="text-fuchsia-300 text-lg mb-2">{t('noInvitations')}</h3>
                  <p className="text-fuchsia-200/50 text-sm">{t('noInvitationsDesc')}</p>
                </div>
              </HoloCard>
            ) : (
              pendingInvitations.map((invitation) => (
                <ACSInvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  onAccept={() =>
                    handleAcceptInvitation(invitation.id, invitation.acs_operation_id)
                  }
                  onDecline={() => handleDeclineInvitation(invitation.id)}
                />
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {completedOperations.length === 0 ? (
              <HoloCard>
                <div className="p-8 text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(0, 255, 136, 0.1)',
                      border: '1px solid rgba(0, 255, 136, 0.2)',
                    }}
                  >
                    <svg
                      className="w-8 h-8 text-green-400/50"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-green-300 text-lg mb-2">{t('noHistory')}</h3>
                  <p className="text-green-200/50 text-sm">{t('noHistoryDesc')}</p>
                </div>
              </HoloCard>
            ) : (
              completedOperations.map((operation) => (
                <ACSOperationCard
                  key={operation.id}
                  operation={operation}
                  isHistory
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default ACSPanel
