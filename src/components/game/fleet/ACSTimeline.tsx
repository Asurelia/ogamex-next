'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { HoloCard } from '@/components/ui'
import type { ACSOperation, ACSParticipant, ACSOperationStatus } from '@/types/acs'

interface TimelineEvent {
  id: string
  type: 'created' | 'participant_joined' | 'participant_left' | 'launched' | 'arrived' | 'combat_started' | 'combat_ended' | 'returning' | 'completed' | 'cancelled'
  timestamp: Date
  description: string
  participantName?: string
  status: 'past' | 'current' | 'future'
}

interface ACSTimelineProps {
  operation: ACSOperation
  onEventClick?: (eventId: string) => void
}

const EVENT_STYLES: Record<TimelineEvent['type'], { color: string; icon: string }> = {
  created: {
    color: '#00ffff',
    icon: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
  },
  participant_joined: {
    color: '#00ff88',
    icon: 'M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z',
  },
  participant_left: {
    color: '#ff8800',
    icon: 'M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z',
  },
  launched: {
    color: '#ff00ff',
    icon: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z',
  },
  arrived: {
    color: '#ffd700',
    icon: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
  },
  combat_started: {
    color: '#ff4444',
    icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  },
  combat_ended: {
    color: '#ff8844',
    icon: 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z',
  },
  returning: {
    color: '#8888ff',
    icon: 'M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3',
  },
  completed: {
    color: '#00ff88',
    icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  cancelled: {
    color: '#ff4444',
    icon: 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
}

function generateTimelineEvents(operation: ACSOperation): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const now = new Date()

  // Created event
  events.push({
    id: 'created',
    type: 'created',
    timestamp: new Date(operation.created_at),
    description: 'Operation created',
    status: 'past',
  })

  // Participant events
  operation.participants.forEach((participant) => {
    events.push({
      id: `joined-${participant.id}`,
      type: 'participant_joined',
      timestamp: new Date(participant.created_at),
      description: `Joined the operation`,
      participantName: participant.user_id.substring(0, 8),
      status: 'past',
    })
  })

  // Scheduled events based on status
  const scheduledArrival = new Date(operation.scheduled_arrival)

  if (operation.status === 'forming') {
    events.push({
      id: 'launched',
      type: 'launched',
      timestamp: new Date(now.getTime() + 60000), // Placeholder
      description: 'Fleets launch',
      status: 'future',
    })
  }

  if (operation.status === 'in_progress') {
    events.push({
      id: 'launched',
      type: 'launched',
      timestamp: new Date(operation.updated_at),
      description: 'Fleets launched',
      status: 'past',
    })
  }

  // Arrival
  events.push({
    id: 'arrived',
    type: 'arrived',
    timestamp: scheduledArrival,
    description: 'Synchronized arrival',
    status: scheduledArrival > now ? 'future' : operation.status === 'in_progress' ? 'current' : 'past',
  })

  // Combat
  if (operation.type === 'attack') {
    events.push({
      id: 'combat_started',
      type: 'combat_started',
      timestamp: new Date(scheduledArrival.getTime() + 1000),
      description: 'Combat begins',
      status: scheduledArrival > now ? 'future' : 'past',
    })

    events.push({
      id: 'combat_ended',
      type: 'combat_ended',
      timestamp: new Date(scheduledArrival.getTime() + 60000),
      description: 'Combat ends',
      status: scheduledArrival > now ? 'future' : 'past',
    })
  }

  // Return
  const returnTime = new Date(scheduledArrival.getTime() * 2 - new Date(operation.created_at).getTime())
  events.push({
    id: 'returning',
    type: 'returning',
    timestamp: returnTime,
    description: 'Fleets returning',
    status: returnTime > now ? 'future' : 'past',
  })

  // Completed
  if (operation.status === 'completed') {
    events.push({
      id: 'completed',
      type: 'completed',
      timestamp: new Date(operation.updated_at),
      description: 'Operation completed',
      status: 'past',
    })
  }

  if (operation.status === 'cancelled') {
    events.push({
      id: 'cancelled',
      type: 'cancelled',
      timestamp: new Date(operation.updated_at),
      description: 'Operation cancelled',
      status: 'past',
    })
  }

  // Sort by timestamp
  return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

export function ACSTimeline({ operation, onEventClick }: ACSTimelineProps) {
  const t = useTranslations('fleet.acs')

  const events = useMemo(() => generateTimelineEvents(operation), [operation])

  const currentEventIndex = events.findIndex((e) => e.status === 'current')

  return (
    <HoloCard glow>
      <div className="p-4">
        <h3
          className="text-lg font-bold mb-4"
          style={{ color: '#00ffff', textShadow: '0 0 10px rgba(0, 255, 255, 0.5)' }}
        >
          {t('timeline')}
        </h3>

        <div className="relative">
          {/* Connecting line */}
          <div
            className="absolute left-[15px] top-0 bottom-0 w-[2px]"
            style={{
              background: 'linear-gradient(180deg, rgba(0, 255, 255, 0.3), rgba(0, 255, 255, 0.1))',
            }}
          />

          {/* Progress line */}
          {currentEventIndex >= 0 && (
            <motion.div
              className="absolute left-[15px] top-0 w-[2px]"
              style={{
                background: 'linear-gradient(180deg, #00ffff, #ff00ff)',
                boxShadow: '0 0 10px #00ffff',
              }}
              initial={{ height: 0 }}
              animate={{
                height: `${((currentEventIndex + 1) / events.length) * 100}%`,
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          )}

          {/* Events */}
          <div className="space-y-4">
            <AnimatePresence>
              {events.map((event, index) => {
                const style = EVENT_STYLES[event.type]
                const isPast = event.status === 'past'
                const isCurrent = event.status === 'current'
                const isFuture = event.status === 'future'

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex items-start gap-4 cursor-pointer group"
                    onClick={() => onEventClick?.(event.id)}
                  >
                    {/* Event dot */}
                    <motion.div
                      className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isFuture
                          ? 'rgba(50, 70, 90, 0.5)'
                          : `linear-gradient(135deg, ${style.color}30, ${style.color}10)`,
                        border: `2px solid ${isFuture ? 'rgba(100, 150, 200, 0.3)' : style.color}`,
                        boxShadow: isCurrent ? `0 0 15px ${style.color}` : 'none',
                        opacity: isFuture ? 0.5 : 1,
                      }}
                      animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isFuture ? 'rgba(100, 150, 200, 0.5)' : style.color}
                        strokeWidth={1.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d={style.icon} />
                      </svg>

                      {/* Pulse for current */}
                      {isCurrent && (
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{
                            border: `2px solid ${style.color}`,
                          }}
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.8, 0, 0.8],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                          }}
                        />
                      )}
                    </motion.div>

                    {/* Event content */}
                    <div
                      className={`flex-1 p-3 rounded-lg transition-all group-hover:scale-[1.02] ${
                        isFuture ? 'opacity-50' : ''
                      }`}
                      style={{
                        background: isCurrent
                          ? `linear-gradient(135deg, ${style.color}15, transparent)`
                          : 'rgba(10, 25, 40, 0.5)',
                        border: `1px solid ${
                          isCurrent ? style.color + '40' : 'rgba(0, 255, 255, 0.1)'
                        }`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div
                            className="font-medium"
                            style={{ color: isFuture ? 'rgba(150, 200, 230, 0.5)' : style.color }}
                          >
                            {event.description}
                          </div>
                          {event.participantName && (
                            <div className="text-sm text-cyan-200/50">{event.participantName}</div>
                          )}
                        </div>
                        <div className="text-xs text-cyan-200/40 font-mono">
                          {event.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </HoloCard>
  )
}

export default ACSTimeline
