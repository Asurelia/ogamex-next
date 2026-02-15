'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: {
      icon: '⚠️',
      buttonBg: 'bg-red-500 hover:bg-red-600',
      borderColor: 'border-red-500/30',
    },
    warning: {
      icon: '⚡',
      buttonBg: 'bg-orange-500 hover:bg-orange-600',
      borderColor: 'border-orange-500/30',
    },
    info: {
      icon: 'ℹ️',
      buttonBg: 'bg-cyan-500 hover:bg-cyan-600',
      borderColor: 'border-cyan-500/30',
    },
  }

  const styles = variantStyles[variant]

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
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div
              className={`bg-gray-900 rounded-lg border ${styles.borderColor} shadow-2xl overflow-hidden`}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                <span className="text-2xl">{styles.icon}</span>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <p className="text-gray-300">{message}</p>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-800/50 flex items-center justify-end gap-3">
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${styles.buttonBg}`}
                >
                  {loading && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                  )}
                  {confirmLabel}
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
