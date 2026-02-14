'use client'

import { createContext, useContext, useCallback, useReducer, useMemo } from 'react'

// Toast types and interfaces
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastOptions {
  type?: ToastType
  title: string
  message?: string
  duration?: number
  action?: { label: string; onClick: () => void }
  dismissible?: boolean
}

export interface Toast extends Required<Omit<ToastOptions, 'action'>> {
  id: string
  action?: { label: string; onClick: () => void }
  createdAt: number
}

interface ToastState {
  toasts: Toast[]
  maxToasts: number
}

type ToastAction =
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'UPDATE_TOAST'; payload: { id: string; options: Partial<ToastOptions> } }
  | { type: 'REMOVE_ALL' }

interface ToastContextValue {
  toasts: Toast[]
  toast: (options: ToastOptions) => string
  success: (title: string, message?: string) => string
  error: (title: string, message?: string) => string
  warning: (title: string, message?: string) => string
  info: (title: string, message?: string) => string
  loading: (title: string, message?: string) => string
  dismiss: (id: string) => void
  dismissAll: () => void
  update: (id: string, options: Partial<ToastOptions>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// Generate unique ID
const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Default durations per type
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
  loading: 0, // Loading toasts don't auto-dismiss
}

// Reducer for toast state management
function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD_TOAST': {
      const newToasts = [action.payload, ...state.toasts]
      // Respect maxToasts limit
      if (newToasts.length > state.maxToasts) {
        newToasts.pop()
      }
      return { ...state, toasts: newToasts }
    }
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      }
    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.payload.id
            ? { ...t, ...action.payload.options }
            : t
        ),
      }
    case 'REMOVE_ALL':
      return { ...state, toasts: [] }
    default:
      return state
  }
}

interface ToastProviderInternalProps {
  children: React.ReactNode
  maxToasts?: number
}

export function ToastProviderInternal({ children, maxToasts = 5 }: ToastProviderInternalProps) {
  const [state, dispatch] = useReducer(toastReducer, {
    toasts: [],
    maxToasts,
  })

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id })
  }, [])

  const dismissAll = useCallback(() => {
    dispatch({ type: 'REMOVE_ALL' })
  }, [])

  const update = useCallback((id: string, options: Partial<ToastOptions>) => {
    dispatch({ type: 'UPDATE_TOAST', payload: { id, options } })
  }, [])

  const toast = useCallback((options: ToastOptions): string => {
    const id = generateId()
    const type = options.type || 'info'
    const duration = options.duration ?? DEFAULT_DURATIONS[type]

    const newToast: Toast = {
      id,
      type,
      title: options.title,
      message: options.message || '',
      duration,
      action: options.action,
      dismissible: options.dismissible ?? true,
      createdAt: Date.now(),
    }

    dispatch({ type: 'ADD_TOAST', payload: newToast })

    // Auto-dismiss if duration > 0
    if (duration > 0) {
      setTimeout(() => {
        dismiss(id)
      }, duration)
    }

    return id
  }, [dismiss])

  const success = useCallback(
    (title: string, message?: string) => toast({ type: 'success', title, message }),
    [toast]
  )

  const error = useCallback(
    (title: string, message?: string) => toast({ type: 'error', title, message }),
    [toast]
  )

  const warning = useCallback(
    (title: string, message?: string) => toast({ type: 'warning', title, message }),
    [toast]
  )

  const info = useCallback(
    (title: string, message?: string) => toast({ type: 'info', title, message }),
    [toast]
  )

  const loading = useCallback(
    (title: string, message?: string) => toast({ type: 'loading', title, message, duration: 0 }),
    [toast]
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts: state.toasts,
      toast,
      success,
      error,
      warning,
      info,
      loading,
      dismiss,
      dismissAll,
      update,
    }),
    [state.toasts, toast, success, error, warning, info, loading, dismiss, dismissAll, update]
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToastContext() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}
