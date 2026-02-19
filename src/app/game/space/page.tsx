'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { SpaceScene } from '@/components/game/3d/rt/SpaceScene'
import { RTWindowLayout } from '@/components/game/ui/rt/RTWindowLayout'
import { DevPanel } from '@/components/game/ui/dev/DevPanel'
import { GameEngine } from '@/engine/GameEngine'
import { networkBridge } from '@/engine/NetworkBridge'
import { joinSystem } from '@/lib/colyseus/client'

/** Starter system: Jita (1.0 security) */
const DEFAULT_SYSTEM_ID = '7127c86d-a096-4b4e-8de1-755a22bb168a'

export default function SpacePage() {
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

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

        const token = session.access_token

        // Determine system: prefer ship's current system, fall back to default
        let systemId = DEFAULT_SYSTEM_ID
        const { data: ship } = await supabase
          .from('rt_ships')
          .select('system_id')
          .eq('owner_id', session.user.id)
          .eq('is_active', true)
          .single()

        if (ship?.system_id) {
          systemId = ship.system_id
        }

        setLoading(false)
        setConnecting(true)

        // Init engine
        GameEngine.getInstance().init()

        // Join Colyseus room
        const room = await joinSystem(systemId, token)

        // Bridge room state to ECS + store
        networkBridge.connect(room, room.sessionId)

        setConnecting(false)
        setReady(true)
      } catch (err) {
        console.error(err)
        setConnectionError('Failed to connect to game server')
        setConnecting(false)
        setLoading(false)
      }
    }

    init()

    return () => {
      networkBridge.disconnect()
      GameEngine.destroyInstance()
    }
  }, [])

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

  if (connectionError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-red-400">
        <div className="text-center">
          <div className="text-xl mb-2">Connection failed</div>
          <div className="text-sm text-slate-400 mb-4">{connectionError}</div>
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

  if (!ready) return null

  return (
    <div className="w-full h-screen relative">
      <SpaceScene />
      <RTWindowLayout />
      <DevPanel />
    </div>
  )
}
