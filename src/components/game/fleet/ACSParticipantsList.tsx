'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { HoloBadge, HoloProgress } from '@/components/ui'
import type { ACSParticipant, ACSParticipantStatus } from '@/types/acs'
import { SHIPS } from '@/game/constants'

interface ACSParticipantsListProps {
  participants: ACSParticipant[]
  maxParticipants: number
  showDetails?: boolean
  onParticipantClick?: (participantId: string) => void
}

const STATUS_STYLES: Record<
  ACSParticipantStatus,
  { color: string; bgColor: string; pulse: boolean }
> = {
  invited: { color: '#ffd700', bgColor: 'rgba(255, 215, 0, 0.1)', pulse: true },
  confirmed: { color: '#00ffff', bgColor: 'rgba(0, 255, 255, 0.1)', pulse: false },
  en_route: { color: '#ff8800', bgColor: 'rgba(255, 136, 0, 0.1)', pulse: true },
  arrived: { color: '#00ff88', bgColor: 'rgba(0, 255, 136, 0.1)', pulse: false },
  returned: { color: '#8888ff', bgColor: 'rgba(136, 136, 255, 0.1)', pulse: false },
}

// Get total ship count from ships object
function getTotalShips(ships: Record<string, number>): number {
  return Object.values(ships).reduce((sum, count) => sum + (count || 0), 0)
}

// Get top 3 ship types by count
function getTopShips(ships: Record<string, number>): Array<{ key: string; count: number }> {
  return Object.entries(ships)
    .filter(([_, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key, count]) => ({ key, count }))
}

export function ACSParticipantsList({
  participants,
  maxParticipants,
  showDetails = true,
  onParticipantClick,
}: ACSParticipantsListProps) {
  const t = useTranslations('fleet.acs')

  const emptySlots = maxParticipants - participants.length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-cyan-200/70 text-sm uppercase tracking-wider">
          {t('participants')}
        </span>
        <span className="text-cyan-400 font-mono text-sm">
          {participants.length}/{maxParticipants}
        </span>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {participants.map((participant, index) => {
            const statusStyle = STATUS_STYLES[participant.status]
            const totalShips = getTotalShips(participant.ships)
            const topShips = getTopShips(participant.ships)

            return (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="relative p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, rgba(10, 25, 40, 0.8), rgba(5, 15, 30, 0.9))',
                  border: `1px solid ${statusStyle.color}40`,
                }}
                onClick={() => onParticipantClick?.(participant.id)}
              >
                {/* Sync indicator */}
                {participant.status === 'en_route' && (
                  <motion.div
                    className="absolute top-0 left-0 w-full h-[2px]"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${statusStyle.color}, transparent)`,
                    }}
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar placeholder */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${statusStyle.color}30, ${statusStyle.color}10)`,
                        border: `1px solid ${statusStyle.color}50`,
                        color: statusStyle.color,
                      }}
                    >
                      {participant.user_id.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-100 font-medium">
                          {participant.user_id.substring(0, 8)}...
                        </span>
                        <HoloBadge
                          size="sm"
                          variant={
                            participant.status === 'arrived'
                              ? 'success'
                              : participant.status === 'en_route'
                              ? 'warning'
                              : 'default'
                          }
                          pulse={statusStyle.pulse}
                        >
                          {t(`participantStatus.${participant.status}`)}
                        </HoloBadge>
                      </div>

                      {showDetails && (
                        <div className="flex items-center gap-3 mt-1">
                          {/* Total ships */}
                          <div className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4 text-cyan-400/60"
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
                            <span className="text-cyan-300 text-xs font-mono">
                              {totalShips.toLocaleString()}
                            </span>
                          </div>

                          {/* Top ship types */}
                          <div className="flex items-center gap-1">
                            {topShips.map((ship, idx) => (
                              <div
                                key={ship.key}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs"
                                style={{
                                  background: 'rgba(0, 255, 255, 0.1)',
                                  border: '1px solid rgba(0, 255, 255, 0.2)',
                                }}
                              >
                                <img
                                  src={`/img/objects/units/${ship.key}_small.jpg`}
                                  alt={ship.key}
                                  className="w-4 h-4 rounded"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                                <span className="text-cyan-300">{ship.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrival time indicator */}
                  {participant.arrival_time && participant.status === 'en_route' && (
                    <div className="text-right">
                      <div className="text-xs text-cyan-200/50 uppercase">{t('arriving')}</div>
                      <div className="text-cyan-300 font-mono text-sm">
                        {new Date(participant.arrival_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sync check mark for arrived */}
                  {participant.status === 'arrived' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        background: 'rgba(0, 255, 136, 0.2)',
                        border: '1px solid rgba(0, 255, 136, 0.5)',
                      }}
                    >
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
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )
          })}

          {/* Empty slots */}
          {Array.from({ length: emptySlots }).map((_, index) => (
            <motion.div
              key={`empty-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: (participants.length + index) * 0.05 }}
              className="p-3 rounded-lg border-dashed"
              style={{
                background: 'rgba(0, 255, 255, 0.02)',
                border: '1px dashed rgba(0, 255, 255, 0.2)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(0, 255, 255, 0.05)',
                    border: '1px dashed rgba(0, 255, 255, 0.2)',
                  }}
                >
                  <svg
                    className="w-5 h-5 text-cyan-400/30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                </div>
                <span className="text-cyan-200/30 text-sm">{t('emptySlot')}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default ACSParticipantsList
