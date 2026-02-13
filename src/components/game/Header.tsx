'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useGameStore } from '@/stores/gameStore'
import { getSupabaseClient } from '@/lib/supabase/client'

export function Header() {
  const router = useRouter()
  const { user, toggleSidebar, reset } = useGameStore()

  const handleLogout = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    reset()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="bg-ogame-panel border-b border-ogame-border">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-ogame-border rounded-sm transition-colors"
            title="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/game/overview" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-ogame-accent to-yellow-400">
              OGameX
            </span>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Server time */}
          <ServerTime />

          {/* User info */}
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-ogame-text-header">
                {user.username}
              </span>
              {user.alliance_id && (
                <span className="ogame-badge ogame-badge-info">
                  Alliance
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-ogame-text-muted hover:text-ogame-accent text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function ServerTime() {
  // Simple server time display - in real app, sync with server
  const now = new Date()
  const timeString = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="text-ogame-text-muted text-sm font-mono">
      {timeString}
    </div>
  )
}
