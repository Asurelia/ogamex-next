'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  confirmText?: string // Alias for confirmLabel
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: (reason?: string) => void
  onCancel?: () => void
  onClose?: () => void // Alias for onCancel
  loading?: boolean
  requireReason?: boolean
  reasonPlaceholder?: string
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  onClose,
  loading = false,
  requireReason = false,
  reasonPlaceholder = 'Enter reason for this action...',
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  // Handle both naming conventions
  const handleClose = onCancel || onClose || (() => {})
  const buttonLabel = confirmLabel || confirmText || 'Confirm'

  const variantStyles = {
    danger: {
      icon: '!',
      buttonBg: 'bg-red-500 hover:bg-red-600',
      borderColor: 'border-red-500/30',
    },
    warning: {
      icon: '!',
      buttonBg: 'bg-orange-500 hover:bg-orange-600',
      borderColor: 'border-orange-500/30',
    },
    info: {
      icon: 'i',
      buttonBg: 'bg-cyan-500 hover:bg-cyan-600',
      borderColor: 'border-cyan-500/30',
    },
  }

  const styles = variantStyles[variant]

  const handleConfirm = () => {
    if (requireReason && reason.trim().length < 3) {
      setError('Please provide a reason (minimum 3 characters)')
      return
    }
    setError('')
    onConfirm(requireReason ? reason.trim() : undefined)
    setReason('')
  }

  const handleCancel = () => {
    setReason('')
    setError('')
    handleClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50"
            onClick={handleCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4"
          >
            <div
              className={`bg-gray-900 rounded-lg border ${styles.borderColor} shadow-2xl overflow-hidden`}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    variant === 'danger' ? 'bg-red-500' :
                    variant === 'warning' ? 'bg-orange-500' : 'bg-cyan-500'
                  }`}
                >
                  {styles.icon}
                </span>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
              </div>

              {/* Body */}
              <div className="px-6 py-4 space-y-4">
                <p className="text-gray-300">{message}</p>

                {/* Reason input */}
                {requireReason && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Reason <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value)
                        setError('')
                      }}
                      placeholder={reasonPlaceholder}
                      rows={3}
                      className={`w-full px-3 py-2 bg-gray-800 border rounded text-white resize-none ${
                        error ? 'border-red-500' : 'border-gray-700'
                      }`}
                    />
                    {error && (
                      <p className="text-red-400 text-sm mt-1">{error}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-800/50 flex items-center justify-end gap-3">
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading || (requireReason && reason.trim().length < 3)}
                  className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${styles.buttonBg}`}
                >
                  {loading && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                  )}
                  {buttonLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ConfirmDialog
