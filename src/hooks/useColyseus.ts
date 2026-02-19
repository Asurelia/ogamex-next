/**
 * useColyseus Hook
 *
 * React hook for connecting to Colyseus rooms.
 * Handles connect/disconnect/reconnect lifecycle.
 */

'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { Room } from 'colyseus.js'
import { joinSystem, leaveRoom } from '@/lib/colyseus/client'
import { setupStateSync } from '@/lib/colyseus/state-sync'
import { useRTGameStore } from '@/stores/rtGameStore'
import { MAX_RECONNECT_ATTEMPTS, RECONNECT_BASE_DELAY } from '@shared/types/game-constants'

interface UseColyseusOptions {
  systemId: string
  token: string
  autoConnect?: boolean
}

interface UseColyseusReturn {
  room: Room | null
  connected: boolean
  connecting: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

export function useColyseus({
  systemId,
  token,
  autoConnect = true,
}: UseColyseusOptions): UseColyseusReturn {
  const roomRef = useRef<Room | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const reconnectAttempts = useRef(0)

  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connected = useRTGameStore((s) => s.connected)
  const setConnected = useRTGameStore((s) => s.setConnected)
  const setMyShipId = useRTGameStore((s) => s.setMyShipId)
  const reset = useRTGameStore((s) => s.reset)

  const connect = useCallback(async () => {
    if (!systemId || !token) return

    setConnecting(true)
    setError(null)

    try {
      const room = await joinSystem(systemId, token)
      roomRef.current = room

      // Set up state sync
      cleanupRef.current = setupStateSync(room)

      // Set my ship ID (Colyseus sessionId)
      setMyShipId(room.sessionId)
      setConnected(true)
      reconnectAttempts.current = 0

      // Handle disconnect
      room.onLeave((code) => {
        console.log(`[Colyseus] Left room with code: ${code}`)
        setConnected(false)

        // Auto-reconnect on unexpected disconnect
        if (code !== 1000 && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts.current)
          reconnectAttempts.current++
          console.log(`[Colyseus] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`)
          setTimeout(() => connect(), delay)
        }
      })

      room.onError((code, message) => {
        console.error(`[Colyseus] Room error: ${code} - ${message}`)
        setError(`Room error: ${message}`)
      })

      console.log(`[Colyseus] Connected to system ${systemId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed'
      console.error('[Colyseus] Connection error:', message)
      setError(message)
      setConnected(false)
    } finally {
      setConnecting(false)
    }
  }, [systemId, token, setConnected, setMyShipId])

  const disconnect = useCallback(async () => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    await leaveRoom()
    roomRef.current = null
    setConnected(false)
    reset()
  }, [setConnected, reset])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && systemId && token) {
      connect()
    }

    return () => {
      // Cleanup on unmount
      if (cleanupRef.current) {
        cleanupRef.current()
      }
      leaveRoom()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    room: roomRef.current,
    connected,
    connecting,
    error,
    connect,
    disconnect,
  }
}
