'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { HoloCard, HoloInput, HoloButton, HoloBadge } from '@/components/ui/holographic'

interface CreateAllianceFormProps {
  onSubmit: (tag: string, name: string, description?: string) => Promise<void>
  onCancel: () => void
  checkTagAvailable?: (tag: string) => Promise<boolean>
}

export function CreateAllianceForm({
  onSubmit,
  onCancel,
  checkTagAvailable,
}: CreateAllianceFormProps) {
  const t = useTranslations('alliance')
  const tCommon = useTranslations('common')

  const [tag, setTag] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tagError, setTagError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tagAvailable, setTagAvailable] = useState<boolean | null>(null)

  const validateTag = (value: string) => {
    if (value.length < 3) {
      return t('tagTooShort')
    }
    if (value.length > 8) {
      return t('tagTooLong')
    }
    if (!/^[A-Z0-9]+$/.test(value)) {
      return t('tagInvalidChars')
    }
    return null
  }

  const validateName = (value: string) => {
    if (value.length < 3) {
      return t('nameTooShort')
    }
    if (value.length > 30) {
      return t('nameTooLong')
    }
    return null
  }

  const handleTagChange = async (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setTag(upperValue)
    setTagAvailable(null)

    const error = validateTag(upperValue)
    setTagError(error)

    if (!error && checkTagAvailable) {
      setChecking(true)
      try {
        const available = await checkTagAvailable(upperValue)
        setTagAvailable(available)
        if (!available) {
          setTagError(t('tagTaken'))
        }
      } finally {
        setChecking(false)
      }
    }
  }

  const handleNameChange = (value: string) => {
    setName(value)
    setNameError(validateName(value))
  }

  const handleSubmit = async () => {
    const tagErr = validateTag(tag)
    const nameErr = validateName(name)

    setTagError(tagErr)
    setNameError(nameErr)

    if (tagErr || nameErr || !tagAvailable) return

    setSubmitting(true)
    try {
      await onSubmit(tag, name, description || undefined)
    } finally {
      setSubmitting(false)
    }
  }

  const isValid = !tagError && !nameError && tag.length >= 3 && name.length >= 3 && tagAvailable !== false

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-lg mx-auto"
    >
      <HoloCard
        title={t('createNew')}
        subtitle={t('createSubtitle')}
        glow
        scanline
      >
        <div className="space-y-6">
          {/* Alliance Tag */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-cyan-400 text-sm font-medium">
                {t('allianceTag')}
              </label>
              {checking && (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full"
                />
              )}
              {tagAvailable === true && !tagError && (
                <HoloBadge variant="success" size="sm">
                  {t('available')}
                </HoloBadge>
              )}
            </div>
            <HoloInput
              value={tag}
              onChange={handleTagChange}
              placeholder="MYTAG"
              error={tagError || undefined}
              icon={
                <span className="text-cyan-400 font-bold">[</span>
              }
            />
            <p className="text-white/50 text-xs mt-1">
              {t('tagDescription')}
            </p>
          </div>

          {/* Alliance Name */}
          <HoloInput
            label={t('allianceName')}
            value={name}
            onChange={handleNameChange}
            placeholder={t('namePlaceholder')}
            error={nameError || undefined}
          />

          {/* Description */}
          <div>
            <label className="block text-cyan-400 text-sm font-medium mb-2">
              {t('description')}
              <span className="text-white/40 ml-2 text-xs">({t('optional')})</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full p-3 rounded-lg resize-none transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(10, 20, 35, 0.8))',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                color: '#fff',
              }}
              placeholder={t('descriptionPlaceholder')}
            />
            <p className="text-white/40 text-xs text-right mt-1">
              {description.length}/500
            </p>
          </div>

          {/* Preview */}
          <div
            className="p-4 rounded-lg"
            style={{
              background: 'rgba(0, 255, 255, 0.05)',
              border: '1px solid rgba(0, 255, 255, 0.2)',
            }}
          >
            <h4 className="text-white/60 text-xs uppercase tracking-wider mb-3">
              {t('preview')}
            </h4>
            <div className="flex items-center gap-4">
              {/* Logo placeholder */}
              <div
                className="w-14 h-14 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(128, 0, 255, 0.3), rgba(0, 128, 255, 0.3))',
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                }}
              >
                <span
                  className="text-xl font-bold"
                  style={{
                    color: '#00ffff',
                    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                  }}
                >
                  {tag.substring(0, 2) || '??'}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-lg font-bold"
                    style={{
                      color: '#00ffff',
                      textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                    }}
                  >
                    {name || t('allianceName')}
                  </span>
                  <HoloBadge variant="purple" size="sm" glow>
                    [{tag || 'TAG'}]
                  </HoloBadge>
                </div>
                {description && (
                  <p className="text-white/60 text-sm mt-1 line-clamp-2">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <HoloButton
              variant="ghost"
              onClick={onCancel}
            >
              {tCommon('cancel')}
            </HoloButton>
            <HoloButton
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              loading={submitting}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              {t('createAlliance')}
            </HoloButton>
          </div>
        </div>
      </HoloCard>
    </motion.div>
  )
}

export default CreateAllianceForm
