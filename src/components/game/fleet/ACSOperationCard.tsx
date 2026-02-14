'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { HoloCard, HoloButton, HoloBadge, HoloCountdown, HoloProgress } from '@/components/ui'
import ACSParticipantsList from './ACSParticipantsList'
import type { ACSOperation, ACSOperationStatus, ACSOperationType } from '@/types/acs'
import { ACS_MAX_PARTICIPANTS } from '@/types/acs'

interface ACSOperationCardProps {
  operation: ACSOperation
  onJoin?: () => void
  onLeave?: () => void
  onCancel?: () => void
  isHistory?: boolean
  isOrganizer?: boolean
  currentUserId?: string
}

const STATUS_COLORS: Record<ACSOperationStatus, { bg: string; border: string; text: string }> = {
  forming: {
    bg: 'rgba(0, 255, 255, 0.1)',
    border: 'rgba(0, 255, 255, 0.4)',
    text: '#00ffff',
  },
  launching: {
    bg: 'rgba(255, 215, 0, 0.1)',
    border: 'rgba(255, 215, 0, 0.4)',
    text: '#ffd700',
  },
  in_progress: {
    bg: 'rgba(255, 136, 0, 0.1)',
    border: 'rgba(255, 136, 0, 0.4)',
    text: '#ff8800',
  },
  completed: {
    bg: 'rgba(0, 255, 136, 0.1)',
    border: 'rgba(0, 255, 136, 0.4)',
    text: '#00ff88',
  },
  cancelled: {
    bg: 'rgba(255, 68, 68, 0.1)',
    border: 'rgba(255, 68, 68, 0.4)',
    text: '#ff4444',
  },
}

const TYPE_COLORS: Record<ACSOperationType, { bg: string; border: string; text: string; icon: string }> = {
  attack: {
    bg: 'rgba(255, 68, 68, 0.15)',
    border: 'rgba(255, 68, 68, 0.5)',
    text: '#ff4444',
    icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  },
  defend: {
    bg: 'rgba(0, 136, 255, 0.15)',
    border: 'rgba(0, 136, 255, 0.5)',
    text: '#0088ff',
    icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  },
}

export function ACSOperationCard({
  operation,
  onJoin,
  onLeave,
  onCancel,
  isHistory = false,
  isOrganizer = false,
  currentUserId,
}: ACSOperationCardProps) {
  const t = useTranslations('fleet.acs')
  const tCommon = useTranslations('common')

  const statusStyle = STATUS_COLORS[operation.status]
  const typeStyle = TYPE_COLORS[operation.type]

  const isParticipant = useMemo(() => {
    if (!currentUserId) return false
    return operation.participants.some((p) => p.user_id === currentUserId)
  }, [operation.participants, currentUserId])

  const canJoin = useMemo(() => {
    return (
      operation.status === 'forming' &&
      !isParticipant &&
      operation.participants.length < operation.max_participants
    )
  }, [operation.status, isParticipant, operation.participants.length, operation.max_participants])

  const participantCount = operation.participants.length
  const maxParticipants = operation.max_participants || ACS_MAX_PARTICIPANTS

  const coordinates = `[${operation.target_coordinates.galaxy}:${operation.target_coordinates.system}:${operation.target_coordinates.position}]`

  const arrivalTime = operation.scheduled_arrival
    ? new Date(operation.scheduled_arrival)
    : null

  return (
    <HoloCard
      variant={operation.type === 'attack' ? 'danger' : 'default'}
      glow={!isHistory}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Type Icon */}
            <motion.div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{
                background: typeStyle.bg,
                border: `1px solid ${typeStyle.border}`,
                boxShadow: !isHistory ? `0 0 15px ${typeStyle.border}` : 'none',
              }}
              animate={
                !isHistory && operation.status === 'in_progress'
                  ? { scale: [1, 1.05, 1] }
                  : {}
              }
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke={typeStyle.text}
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={typeStyle.icon} />
              </svg>
            </motion.div>

            <div>
              <h3
                className="text-lg font-bold"
                style={{ color: typeStyle.text, textShadow: `0 0 10px ${typeStyle.border}` }}
              >
                {operation.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-cyan-200/60 text-sm">{t('target')}:</span>
                <span className="text-cyan-300 font-mono">{coordinates}</span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <HoloBadge
            variant={
              operation.status === 'completed'
                ? 'success'
                : operation.status === 'cancelled'
                ? 'danger'
                : operation.status === 'in_progress'
                ? 'warning'
                : 'default'
            }
            glow={!isHistory}
            pulse={operation.status === 'in_progress'}
          >
            {t(`status.${operation.status}`)}
          </HoloBadge>
        </div>

        {/* Progress bar for participants */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-cyan-200/60 text-sm">{t('participants')}</span>
            <span className="text-cyan-300 font-mono">
              {participantCount}/{maxParticipants}
            </span>
          </div>
          <HoloProgress
            value={participantCount}
            max={maxParticipants}
            variant={operation.type === 'attack' ? 'danger' : 'default'}
            size="sm"
          />
        </div>

        {/* Arrival Time */}
        {arrivalTime && !isHistory && operation.status !== 'completed' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyan-200/60 text-sm">{t('arrivalIn')}</span>
            </div>
            <HoloCountdown
              targetDate={arrivalTime}
              format="compact"
              showLabels={false}
            />
          </div>
        )}

        {/* Participants List */}
        {operation.participants.length > 0 && (
          <div className="mb-4">
            <ACSParticipantsList
              participants={operation.participants}
              maxParticipants={maxParticipants}
              showDetails={!isHistory}
            />
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div
            className="p-2 rounded-lg"
            style={{
              background: 'rgba(0, 255, 255, 0.05)',
              border: '1px solid rgba(0, 255, 255, 0.1)',
            }}
          >
            <div className="text-xs text-cyan-200/50 uppercase">{t('organizer')}</div>
            <div className="text-cyan-300 text-sm truncate">
              {operation.participants.find((p) => p.user_id === operation.organizer_id)?.user_id ||
                'Unknown'}
            </div>
          </div>
          <div
            className="p-2 rounded-lg"
            style={{
              background: 'rgba(0, 255, 255, 0.05)',
              border: '1px solid rgba(0, 255, 255, 0.1)',
            }}
          >
            <div className="text-xs text-cyan-200/50 uppercase">{t('type')}</div>
            <div style={{ color: typeStyle.text }} className="text-sm capitalize">
              {t(`type.${operation.type}`)}
            </div>
          </div>
        </div>

        {/* Actions */}
        {!isHistory && (
          <div className="flex items-center gap-2">
            {canJoin && onJoin && (
              <HoloButton onClick={onJoin} variant="primary" fullWidth>
                {t('joinOperation')}
              </HoloButton>
            )}
            {isParticipant && !isOrganizer && onLeave && (
              <HoloButton onClick={onLeave} variant="ghost" fullWidth>
                {t('leaveOperation')}
              </HoloButton>
            )}
            {isOrganizer && operation.status === 'forming' && onCancel && (
              <HoloButton onClick={onCancel} variant="danger" fullWidth>
                {t('cancelOperation')}
              </HoloButton>
            )}
          </div>
        )}

        {/* History result */}
        {isHistory && operation.status === 'completed' && (
          <div
            className="p-3 rounded-lg mt-4"
            style={{
              background: 'rgba(0, 255, 136, 0.1)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
            }}
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-green-400">{t('operationCompleted')}</span>
            </div>
          </div>
        )}
      </div>
    </HoloCard>
  )
}

export default ACSOperationCard
