'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { HoloCard, HoloBadge, HoloButton, HoloStats } from '@/components/ui/holographic'
import type { Alliance, AllianceCircular, AllianceRank } from '@/types/alliance'
import { formatDistanceToNow } from '@/lib/utils/format'

interface AllianceDashboardProps {
  alliance: Alliance
  userRank: AllianceRank
  circulars: AllianceCircular[]
  onViewMembers: () => void
  onInvite: () => void
  onSettings: () => void
  onSendCircular: () => void
}

export function AllianceDashboard({
  alliance,
  userRank,
  circulars,
  onViewMembers,
  onInvite,
  onSettings,
  onSendCircular,
}: AllianceDashboardProps) {
  const t = useTranslations('alliance')
  const tCommon = useTranslations('common')

  const canManage = userRank === 'founder' || userRank === 'leader'
  const canInvite = userRank === 'founder' || userRank === 'leader' || userRank === 'officer'

  const stats = [
    {
      label: t('members'),
      value: alliance.member_count || 1,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      label: t('totalPoints'),
      value: alliance.total_points || 0,
      format: 'number' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: t('rank'),
      value: alliance.rank || '-',
      prefix: '#',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: t('avgPoints'),
      value: alliance.member_count
        ? Math.round((alliance.total_points || 0) / alliance.member_count)
        : 0,
      format: 'number' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          {/* Logo */}
          <motion.div
            className="relative w-20 h-20 rounded-lg overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(128, 0, 255, 0.3), rgba(0, 128, 255, 0.3))',
              border: '1px solid rgba(0, 255, 255, 0.3)',
            }}
            whileHover={{ scale: 1.05 }}
          >
            {alliance.logo_url ? (
              <img
                src={alliance.logo_url}
                alt={alliance.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span
                  className="text-2xl font-bold"
                  style={{
                    color: '#00ffff',
                    textShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
                  }}
                >
                  {alliance.tag.substring(0, 2)}
                </span>
              </div>
            )}
            {/* Glow effect */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at center, rgba(0, 255, 255, 0.2), transparent 70%)',
              }}
            />
          </motion.div>

          {/* Name and tag */}
          <div>
            <div className="flex items-center gap-3">
              <h1
                className="text-2xl font-bold"
                style={{
                  color: '#00ffff',
                  textShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
                }}
              >
                {alliance.name}
              </h1>
              <HoloBadge variant="purple" size="lg" glow>
                [{alliance.tag}]
              </HoloBadge>
            </div>
            <p className="text-white/60 text-sm mt-1">
              {t('founded')}: {new Date(alliance.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Your rank */}
        <HoloBadge
          variant={userRank === 'founder' ? 'warning' : userRank === 'leader' ? 'success' : 'default'}
          size="lg"
          glow
          pulse={userRank === 'founder'}
        >
          {t(`ranks.${userRank}`)}
        </HoloBadge>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <HoloStats stats={stats} columns={4} size="md" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alliance Info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <HoloCard title={t('information')}>
            <div className="space-y-4">
              {/* Description */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-cyan-400/80 mb-1">
                  {t('description')}
                </h4>
                <p className="text-white/80 text-sm">
                  {alliance.description || t('noDescription')}
                </p>
              </div>

              {/* External text */}
              {alliance.external_text && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-cyan-400/80 mb-1">
                    {t('externalText')}
                  </h4>
                  <p className="text-white/80 text-sm">{alliance.external_text}</p>
                </div>
              )}

              {/* Internal text (members only) */}
              {alliance.internal_text && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-yellow-400/80 mb-1">
                    {t('internalText')}
                  </h4>
                  <p className="text-white/80 text-sm">{alliance.internal_text}</p>
                </div>
              )}
            </div>
          </HoloCard>
        </motion.div>

        {/* Recent Circulars */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <HoloCard title={t('recentCirculars')}>
            <div className="space-y-3">
              {circulars.length === 0 ? (
                <p className="text-white/50 text-sm text-center py-4">
                  {t('noCirculars')}
                </p>
              ) : (
                circulars.slice(0, 3).map((circular) => (
                  <motion.div
                    key={circular.id}
                    className="p-3 rounded-lg"
                    style={{
                      background: 'rgba(0, 255, 255, 0.05)',
                      border: '1px solid rgba(0, 255, 255, 0.1)',
                    }}
                    whileHover={{
                      background: 'rgba(0, 255, 255, 0.1)',
                      borderColor: 'rgba(0, 255, 255, 0.3)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-cyan-400 font-medium text-sm">
                        {circular.subject}
                      </span>
                      <span className="text-white/40 text-xs">
                        {formatDistanceToNow(new Date(circular.created_at))}
                      </span>
                    </div>
                    <p className="text-white/60 text-xs line-clamp-2">
                      {circular.body}
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      - {circular.sender_username}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </HoloCard>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <HoloCard title={t('quickActions')}>
          <div className="flex flex-wrap gap-3">
            <HoloButton
              onClick={onViewMembers}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            >
              {t('viewMembers')}
            </HoloButton>

            {canInvite && (
              <HoloButton
                variant="secondary"
                onClick={onInvite}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                }
              >
                {t('inviteMember')}
              </HoloButton>
            )}

            {canInvite && (
              <HoloButton
                variant="success"
                onClick={onSendCircular}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              >
                {t('sendCircular')}
              </HoloButton>
            )}

            {canManage && (
              <HoloButton
                variant="warning"
                onClick={onSettings}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              >
                {t('settings')}
              </HoloButton>
            )}
          </div>
        </HoloCard>
      </motion.div>
    </div>
  )
}

export default AllianceDashboard
