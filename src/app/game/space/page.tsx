/**
 * Real-Time Space Game Page
 *
 * Main entry point for the EVE-style real-time game.
 * Handles auth, Colyseus connection, and renders the 3D scene + UI.
 */

'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { SpaceScene } from '@/components/game/3d/rt/SpaceScene'
import { RTWindowLayout } from '@/components/game/ui/rt/RTWindowLayout'
import { useColyseus } from '@/hooks/useColyseus'

export default function SpacePage() {
  const [token, setToken] = useState<string>('')
  const [systemId, setSystemId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // Get auth token and load initial system
  useEffect(() => {
    async function init() {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setAuthError('Not authenticated. Please log in first.')
          setLoading(false)
          return
        }

        setToken(session.access_token)

        // Load the player's current system (or default to first system)
        const { data: ship } = await supabase
          .from('rt_ships')
          .select('system_id')
          .eq('owner_id', session.user.id)
          .eq('is_active', true)
          .single()

        if (ship?.system_id) {
          setSystemId(ship.system_id)
        } else {
          // Get first high-sec system as default
          const { data: systems } = await supabase
            .from('rt_solar_systems')
            .select('id')
            .gte('security_level', 0.5)
            .order('name')
            .limit(1)

          if (systems && systems.length > 0) {
            setSystemId(systems[0].id)
          }
        }
      } catch (err) {
        setAuthError('Failed to initialize game session')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  // Connect to Colyseus
  const { connecting, error: colyseusError } = useColyseus({
    systemId,
    token,
    autoConnect: !!systemId && !!token,
  })

  // Loading state
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-cyan-400">
        <div className="text-center">
          <div className="animate-pulse text-2xl mb-4">Loading game...</div>
          <div className="text-sm text-slate-500">Initializing systems</div>
        </div>
      </div>
    )
  }

  // Auth error
  if (authError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-red-400">
        <div className="text-center">
          <div className="text-xl mb-2">{authError}</div>
          <a href="/login" className="text-cyan-400 hover:underline">Go to login</a>
        </div>
      </div>
    )
  }

  // Connecting state
  if (connecting) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-cyan-400">
        <div className="text-center">
          <div className="animate-pulse text-2xl mb-4">Connecting to server...</div>
          <div className="text-sm text-slate-500">Establishing real-time link</div>
        </div>
      </div>
    )
  }

  // Connection error
  if (colyseusError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-red-400">
        <div className="text-center">
          <div className="text-xl mb-2">Connection failed</div>
          <div className="text-sm text-slate-400 mb-4">{colyseusError}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-cyan-700 text-white rounded hover:bg-cyan-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <RTWindowLayout>
      <SpaceScene />
    </RTWindowLayout>
  )
}
