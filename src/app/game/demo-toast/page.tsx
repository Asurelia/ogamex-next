'use client'

import { useState } from 'react'
import { useToast } from '@/hooks/useToast'

export default function ToastDemoPage() {
  const { toast, success, error, warning, info, loading, dismiss, dismissAll, update } = useToast()
  const [loadingToastId, setLoadingToastId] = useState<string | null>(null)

  const handleSuccessToast = () => {
    success('Construction Started', 'Metal Mine Level 15 - 2h 34m remaining')
  }

  const handleErrorToast = () => {
    error('Insufficient Resources', 'You need 5,000 more Crystal to build the Shipyard.')
  }

  const handleWarningToast = () => {
    warning('Storage Almost Full', 'Metal storage is at 95% capacity. Consider upgrading.')
  }

  const handleInfoToast = () => {
    info('Fleet Arrived', 'Your transport fleet has arrived at [2:145:7].')
  }

  const handleLoadingToast = () => {
    const id = loading('Processing Mission', 'Calculating fleet trajectory...')
    setLoadingToastId(id)

    // Simulate completion after 3 seconds
    setTimeout(() => {
      update(id, {
        type: 'success',
        title: 'Mission Launched',
        message: 'Fleet is now en route to target coordinates.',
        duration: 4000,
      })
      setLoadingToastId(null)
    }, 3000)
  }

  const handleActionToast = () => {
    toast({
      type: 'warning',
      title: 'Enemy Fleet Detected',
      message: 'A hostile fleet has been spotted heading to your planet.',
      duration: 0,
      action: {
        label: 'Deploy Defense',
        onClick: () => {
          success('Defense Activated', 'Missile launcher targeting initiated.')
        },
      },
    })
  }

  const handleCustomDurationToast = () => {
    toast({
      type: 'info',
      title: 'Quick Notification',
      message: 'This toast will disappear in 2 seconds.',
      duration: 2000,
    })
  }

  const handlePersistentToast = () => {
    toast({
      type: 'info',
      title: 'Persistent Toast',
      message: 'This toast will stay until you dismiss it.',
      duration: 0,
      dismissible: true,
    })
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-cyan-400 mb-2" style={{ textShadow: '0 0 10px rgba(0, 212, 255, 0.5)' }}>
        Toast Notification System Demo
      </h1>
      <p className="text-gray-400 mb-8">
        Test the holographic toast notification system with various configurations.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Basic Types */}
        <div className="p-4 rounded-lg bg-black/40 border border-cyan-500/20">
          <h2 className="text-sm font-semibold text-cyan-400 mb-3 uppercase tracking-wider">Basic Types</h2>
          <div className="space-y-2">
            <button
              onClick={handleSuccessToast}
              className="w-full px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors"
            >
              Success Toast
            </button>
            <button
              onClick={handleErrorToast}
              className="w-full px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Error Toast
            </button>
            <button
              onClick={handleWarningToast}
              className="w-full px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              Warning Toast
            </button>
            <button
              onClick={handleInfoToast}
              className="w-full px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
            >
              Info Toast
            </button>
          </div>
        </div>

        {/* Advanced Features */}
        <div className="p-4 rounded-lg bg-black/40 border border-cyan-500/20">
          <h2 className="text-sm font-semibold text-cyan-400 mb-3 uppercase tracking-wider">Advanced Features</h2>
          <div className="space-y-2">
            <button
              onClick={handleLoadingToast}
              disabled={loadingToastId !== null}
              className="w-full px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingToastId ? 'Processing...' : 'Loading -> Success'}
            </button>
            <button
              onClick={handleActionToast}
              className="w-full px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-colors"
            >
              Toast with Action
            </button>
            <button
              onClick={handleCustomDurationToast}
              className="w-full px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              Custom Duration (2s)
            </button>
            <button
              onClick={handlePersistentToast}
              className="w-full px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
            >
              Persistent Toast
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 rounded-lg bg-black/40 border border-cyan-500/20">
          <h2 className="text-sm font-semibold text-cyan-400 mb-3 uppercase tracking-wider">Controls</h2>
          <div className="space-y-2">
            <button
              onClick={dismissAll}
              className="w-full px-4 py-2 rounded-lg bg-gray-500/10 border border-gray-500/30 text-gray-400 hover:bg-gray-500/20 transition-colors"
            >
              Dismiss All Toasts
            </button>
            <button
              onClick={() => {
                // Trigger multiple toasts rapidly
                success('First', 'Message 1')
                setTimeout(() => info('Second', 'Message 2'), 200)
                setTimeout(() => warning('Third', 'Message 3'), 400)
                setTimeout(() => error('Fourth', 'Message 4'), 600)
                setTimeout(() => info('Fifth', 'Message 5'), 800)
              }}
              className="w-full px-4 py-2 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-400 hover:bg-pink-500/20 transition-colors"
            >
              Stress Test (5 toasts)
            </button>
          </div>
        </div>
      </div>

      {/* Game Scenario Examples */}
      <div className="mt-8 p-4 rounded-lg bg-black/40 border border-cyan-500/20">
        <h2 className="text-sm font-semibold text-cyan-400 mb-3 uppercase tracking-wider">Game Scenario Examples</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            onClick={() => success('Research Complete', 'Energy Technology Level 12 unlocked!')}
            className="px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm"
          >
            Research Complete
          </button>
          <button
            onClick={() => warning('Attack Incoming', 'Enemy fleet arrives in 2h 15m. Prepare defenses!')}
            className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
          >
            Attack Warning
          </button>
          <button
            onClick={() => info('Alliance Message', 'New message from "Galactic Dominion" alliance.')}
            className="px-4 py-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm"
          >
            Alliance Message
          </button>
          <button
            onClick={() => error('Mission Failed', 'Fleet destroyed at coordinates [4:287:12].')}
            className="px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors text-sm"
          >
            Mission Failed
          </button>
        </div>
      </div>
    </div>
  )
}
