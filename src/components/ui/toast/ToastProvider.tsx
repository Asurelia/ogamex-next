'use client'

import { useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ToastProviderInternal, useToastContext } from './ToastContext'
import { Toast } from './Toast'

export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center'

export interface ToastProviderProps {
  children: React.ReactNode
  position?: ToastPosition
  maxToasts?: number
}

// Position styles for the container
const POSITION_STYLES: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4 items-end',
  'top-left': 'top-4 left-4 items-start',
  'bottom-right': 'bottom-4 right-4 items-end',
  'bottom-left': 'bottom-4 left-4 items-start',
  'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
}

// Container component that renders toasts
function ToastContainer({ position }: { position: ToastPosition }) {
  const { toasts, dismiss } = useToastContext()

  const positionClasses = POSITION_STYLES[position]
  const isBottom = position.includes('bottom')

  // Reverse order for bottom positions so newest appears at the bottom
  const orderedToasts = useMemo(() => {
    return isBottom ? [...toasts].reverse() : toasts
  }, [toasts, isBottom])

  return (
    <div
      className={`fixed z-[9999] flex flex-col gap-3 pointer-events-none ${positionClasses}`}
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {orderedToasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onDismiss={dismiss}
            position={position}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Main ToastProvider component
export function ToastProvider({
  children,
  position = 'top-right',
  maxToasts = 5
}: ToastProviderProps) {
  return (
    <ToastProviderInternal maxToasts={maxToasts}>
      {children}
      <ToastContainer position={position} />
    </ToastProviderInternal>
  )
}
