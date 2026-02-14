'use client'

import { useToastContext, type ToastOptions } from '@/components/ui/toast'

/**
 * Hook to show toast notifications with a holographic style.
 * Must be used within a ToastProvider.
 *
 * @example
 * ```tsx
 * const { toast, success, error, warning, info, loading, dismiss, dismissAll, update } = useToast()
 *
 * // Basic usage
 * toast({ title: 'Hello', message: 'World' })
 *
 * // Type shortcuts
 * const toastId = success('Operation completed!')
 * error('Something went wrong', 'Please try again')
 * warning('Low resources', 'Metal storage is nearly full')
 * info('New event', 'An asteroid field has been discovered')
 * const loadingId = loading('Processing...', 'Please wait')
 *
 * // Dismiss
 * dismiss(toastId)
 * dismissAll()
 *
 * // Update a loading toast to success
 * update(loadingId, { type: 'success', title: 'Done!' })
 * ```
 */
export function useToast() {
  return useToastContext()
}

export type { ToastOptions }
