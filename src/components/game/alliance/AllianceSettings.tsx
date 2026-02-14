'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { HoloCard, HoloInput, HoloButton, HoloModal, HoloBadge } from '@/components/ui/holographic'
import type { Alliance, AllianceRank } from '@/types/alliance'

interface AllianceSettingsProps {
  alliance: Alliance
  userRank: AllianceRank
  onUpdate: (updates: Partial<Alliance>) => Promise<boolean>
  onDissolve: () => Promise<boolean>
  onLeave: () => Promise<boolean>
  onTransferLeadership: (userId: string) => Promise<boolean>
}

export function AllianceSettings({
  alliance,
  userRank,
  onUpdate,
  onDissolve,
  onLeave,
  onTransferLeadership,
}: AllianceSettingsProps) {
  const t = useTranslations('alliance')
  const tCommon = useTranslations('common')

  const [name, setName] = useState(alliance.name)
  const [description, setDescription] = useState(alliance.description || '')
  const [internalText, setInternalText] = useState(alliance.internal_text || '')
  const [externalText, setExternalText] = useState(alliance.external_text || '')
  const [logoUrl, setLogoUrl] = useState(alliance.logo_url || '')

  const [saving, setSaving] = useState(false)
  const [showDissolveModal, setShowDissolveModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [dissolving, setDissolving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const isFounder = userRank === 'founder'
  const isLeader = userRank === 'leader' || isFounder

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate({
        name,
        description: description || null,
        internal_text: internalText || null,
        external_text: externalText || null,
        logo_url: logoUrl || null,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDissolve = async () => {
    if (confirmText !== alliance.tag) return

    setDissolving(true)
    try {
      const success = await onDissolve()
      if (success) {
        setShowDissolveModal(false)
      }
    } finally {
      setDissolving(false)
    }
  }

  const handleLeave = async () => {
    setLeaving(true)
    try {
      const success = await onLeave()
      if (success) {
        setShowLeaveModal(false)
      }
    } finally {
      setLeaving(false)
    }
  }

  const hasChanges =
    name !== alliance.name ||
    description !== (alliance.description || '') ||
    internalText !== (alliance.internal_text || '') ||
    externalText !== (alliance.external_text || '') ||
    logoUrl !== (alliance.logo_url || '')

  return (
    <>
      <div className="space-y-6">
        {/* General settings */}
        <HoloCard title={t('generalSettings')}>
          <div className="space-y-4">
            {/* Alliance name */}
            <HoloInput
              label={t('allianceName')}
              value={name}
              onChange={setName}
              disabled={!isLeader}
            />

            {/* Description */}
            <div>
              <label className="block text-cyan-400 text-sm font-medium mb-2">
                {t('description')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isLeader}
                rows={3}
                className="w-full p-3 rounded-lg resize-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(10, 20, 35, 0.8))',
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  color: '#fff',
                }}
                placeholder={t('descriptionPlaceholder')}
              />
            </div>

            {/* Logo URL */}
            <HoloInput
              label={t('logoUrl')}
              value={logoUrl}
              onChange={setLogoUrl}
              disabled={!isLeader}
              placeholder="https://..."
            />

            {/* Logo preview */}
            {logoUrl && (
              <div className="flex items-center gap-4">
                <span className="text-white/60 text-sm">{t('logoPreview')}:</span>
                <div
                  className="w-16 h-16 rounded-lg overflow-hidden"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                  }}
                >
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </HoloCard>

        {/* Texts */}
        <HoloCard title={t('allianceTexts')}>
          <div className="space-y-4">
            {/* External text */}
            <div>
              <label className="block text-cyan-400 text-sm font-medium mb-2">
                {t('externalText')}
                <span className="text-white/40 ml-2 text-xs">({t('visibleToAll')})</span>
              </label>
              <textarea
                value={externalText}
                onChange={(e) => setExternalText(e.target.value)}
                disabled={!isLeader}
                rows={4}
                className="w-full p-3 rounded-lg resize-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(10, 20, 35, 0.8))',
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  color: '#fff',
                }}
                placeholder={t('externalTextPlaceholder')}
              />
            </div>

            {/* Internal text */}
            <div>
              <label className="block text-yellow-400 text-sm font-medium mb-2">
                {t('internalText')}
                <span className="text-white/40 ml-2 text-xs">({t('membersOnly')})</span>
              </label>
              <textarea
                value={internalText}
                onChange={(e) => setInternalText(e.target.value)}
                disabled={!isLeader}
                rows={4}
                className="w-full p-3 rounded-lg resize-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(10, 20, 35, 0.8))',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  color: '#fff',
                }}
                placeholder={t('internalTextPlaceholder')}
              />
            </div>
          </div>
        </HoloCard>

        {/* Save button */}
        {isLeader && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: hasChanges ? 1 : 0.5, y: 0 }}
            className="flex justify-end"
          >
            <HoloButton
              onClick={handleSave}
              disabled={!hasChanges || saving}
              loading={saving}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
            >
              {tCommon('save')}
            </HoloButton>
          </motion.div>
        )}

        {/* Danger zone */}
        <HoloCard title={t('dangerZone')} variant="danger">
          <div className="space-y-4">
            {/* Leave alliance */}
            {!isFounder && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                <div>
                  <h4 className="text-red-400 font-medium">{t('leaveAlliance')}</h4>
                  <p className="text-white/50 text-sm">{t('leaveWarning')}</p>
                </div>
                <HoloButton
                  variant="danger"
                  onClick={() => setShowLeaveModal(true)}
                >
                  {t('leave')}
                </HoloButton>
              </div>
            )}

            {/* Dissolve alliance (founder only) */}
            {isFounder && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <div>
                  <h4 className="text-red-400 font-medium">{t('dissolveAlliance')}</h4>
                  <p className="text-white/50 text-sm">{t('dissolveWarning')}</p>
                </div>
                <HoloButton
                  variant="danger"
                  onClick={() => setShowDissolveModal(true)}
                >
                  {t('dissolve')}
                </HoloButton>
              </div>
            )}
          </div>
        </HoloCard>
      </div>

      {/* Leave confirmation modal */}
      <HoloModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title={t('leaveAlliance')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-white/80">{t('confirmLeave')}</p>
          <p className="text-white/60 text-sm">{t('leaveConsequences')}</p>

          <div className="flex gap-3 justify-end">
            <HoloButton
              variant="ghost"
              onClick={() => setShowLeaveModal(false)}
            >
              {tCommon('cancel')}
            </HoloButton>
            <HoloButton
              variant="danger"
              onClick={handleLeave}
              loading={leaving}
            >
              {t('confirmLeaveButton')}
            </HoloButton>
          </div>
        </div>
      </HoloModal>

      {/* Dissolve confirmation modal */}
      <HoloModal
        isOpen={showDissolveModal}
        onClose={() => {
          setShowDissolveModal(false)
          setConfirmText('')
        }}
        title={t('dissolveAlliance')}
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 font-medium">{t('dissolveIrreversible')}</p>
          </div>

          <p className="text-white/80">{t('dissolveConfirmText')}</p>

          <p className="text-white/60">
            {t('typeToConfirm')}: <HoloBadge variant="danger">{alliance.tag}</HoloBadge>
          </p>

          <HoloInput
            value={confirmText}
            onChange={setConfirmText}
            placeholder={alliance.tag}
          />

          <div className="flex gap-3 justify-end">
            <HoloButton
              variant="ghost"
              onClick={() => {
                setShowDissolveModal(false)
                setConfirmText('')
              }}
            >
              {tCommon('cancel')}
            </HoloButton>
            <HoloButton
              variant="danger"
              onClick={handleDissolve}
              disabled={confirmText !== alliance.tag}
              loading={dissolving}
            >
              {t('confirmDissolve')}
            </HoloButton>
          </div>
        </div>
      </HoloModal>
    </>
  )
}

export default AllianceSettings
