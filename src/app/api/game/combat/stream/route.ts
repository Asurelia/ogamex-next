/**
 * GET /api/game/combat/stream
 *
 * Server-Sent Events (SSE) endpoint for real-time combat updates.
 * Clients connect with sessionId to receive battle events as they happen.
 *
 * Zero Supabase cost - all events streamed via SSE, not Realtime channels.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCombatSessionManager, type SSEEvent } from '@/lib/battle/combat-session'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')

  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 })
  }

  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get session
  const sessionManager = getCombatSessionManager()
  const session = sessionManager.getSession(sessionId)

  if (!session) {
    return new Response('Session not found', { status: 404 })
  }

  // Verify user is participant
  const state = session.getState()
  if (state.attacker.id !== user.id && state.defender.id !== user.id) {
    return new Response('Not a participant', { status: 403 })
  }

  // Create SSE stream
  const listenerId = randomUUID()

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // Send initial state
      const sendEvent = (event: SSEEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          // Stream closed
        }
      }

      // Send current state
      sendEvent({
        type: 'session_created',
        sessionId: session.id,
        timestamp: Date.now(),
        data: {
          status: state.status,
          currentRound: state.currentRound,
          attacker: { id: state.attacker.id, name: state.attacker.name },
          defender: { id: state.defender.id, name: state.defender.name },
          timeline: state.timeline,
          availableAbilities: session.getAvailableAbilities(user.id),
        },
      })

      // Subscribe to session events
      session.addListener(listenerId, (event) => {
        sendEvent(event)

        // Close stream when battle ends
        if (event.type === 'battle_end' || event.type === 'error') {
          setTimeout(() => {
            try {
              controller.close()
            } catch {
              // Already closed
            }
          }, 1000) // Give time for final event to send
        }
      })
    },

    cancel() {
      // Cleanup when client disconnects
      session.removeListener(listenerId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}
