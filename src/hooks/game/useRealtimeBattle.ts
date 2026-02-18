/**
 * useRealtimeBattle Hook
 *
 * React hook for real-time combat via SSE.
 * Connects to the combat stream, receives events, and manages local state.
 * Automatically saves replays to IndexedDB when battle ends.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { BattleTimelineEvent } from '@/lib/battle/AdvancedBattleEngine'
import type { AbilityId, AbilityState } from '@/lib/battle/player-abilities'
import { getReplayStore, type StoredReplay } from '@/lib/db/replay-store'

// ============================================================================
// TYPES
// ============================================================================

export type BattleStatus = 'connecting' | 'waiting' | 'running' | 'paused' | 'finished' | 'error'

export interface BattleParticipant {
  id: string
  name: string
}

export interface BattleState {
  sessionId: string | null
  status: BattleStatus
  currentRound: number
  attacker: BattleParticipant | null
  defender: BattleParticipant | null
  timeline: BattleTimelineEvent[]
  winner: 'attacker' | 'defender' | 'draw' | null
  error: string | null
  // Ability state
  availableAbilities: AbilityId[]
  canActivateAbility: boolean
  abilityWindowRemainingMs: number
}

export interface UseRealtimeBattleOptions {
  sessionId: string
  autoSaveReplay?: boolean
  onEvent?: (event: SSEBattleEvent) => void
  onBattleEnd?: (result: BattleEndData) => void
}

interface SSEBattleEvent {
  type: string
  sessionId: string
  timestamp: number
  data: unknown
}

interface BattleEndData {
  winner: 'attacker' | 'defender' | 'draw'
  totalRounds: number
  reason: string
}

// ============================================================================
// HOOK
// ============================================================================

export function useRealtimeBattle(options: UseRealtimeBattleOptions) {
  const { sessionId, autoSaveReplay = true, onEvent, onBattleEnd } = options

  const [state, setState] = useState<BattleState>({
    sessionId: null,
    status: 'connecting',
    currentRound: 0,
    attacker: null,
    defender: null,
    timeline: [],
    winner: null,
    error: null,
    availableAbilities: [],
    canActivateAbility: false,
    abilityWindowRemainingMs: 0,
  })

  const eventSourceRef = useRef<EventSource | null>(null)
  const abilityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ==========================================================================
  // CONNECT TO SSE STREAM
  // ==========================================================================

  useEffect(() => {
    if (!sessionId) return

    const eventSource = new EventSource(`/api/game/combat/stream?sessionId=${sessionId}`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setState((prev) => ({ ...prev, status: 'waiting', sessionId }))
    }

    eventSource.onmessage = (event) => {
      try {
        const data: SSEBattleEvent = JSON.parse(event.data)
        handleEvent(data)
        onEvent?.(data)
      } catch (e) {
        console.error('Failed to parse SSE event:', e)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: 'Connection lost',
      }))
    }

    return () => {
      eventSource.close()
      eventSourceRef.current = null
      if (abilityTimerRef.current) {
        clearInterval(abilityTimerRef.current)
      }
    }
  }, [sessionId])

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  const handleEvent = useCallback(
    (event: SSEBattleEvent) => {
      switch (event.type) {
        case 'session_created': {
          const data = event.data as {
            status?: string
            currentRound?: number
            attacker?: BattleParticipant
            defender?: BattleParticipant
            timeline?: BattleTimelineEvent[]
            availableAbilities?: AbilityId[]
          }
          setState((prev) => ({
            ...prev,
            status: (data.status as BattleStatus) || 'waiting',
            currentRound: data.currentRound || 0,
            attacker: data.attacker || null,
            defender: data.defender || null,
            timeline: data.timeline || [],
            availableAbilities: data.availableAbilities || [],
          }))
          break
        }

        case 'round_start': {
          const data = event.data as { round: number }
          setState((prev) => ({
            ...prev,
            status: 'running',
            currentRound: data.round,
            canActivateAbility: false,
          }))
          break
        }

        case 'round_event': {
          const timelineEvent = event.data as BattleTimelineEvent
          setState((prev) => ({
            ...prev,
            timeline: [...prev.timeline, timelineEvent],
          }))
          break
        }

        case 'round_end': {
          // Round completed, wait for ability window or next round
          break
        }

        case 'ability_window': {
          const data = event.data as {
            windowDurationMs: number
            attackerAbilities?: AbilityId[]
            defenderAbilities?: AbilityId[]
          }
          setState((prev) => ({
            ...prev,
            status: 'paused',
            canActivateAbility: true,
            abilityWindowRemainingMs: data.windowDurationMs,
            // Note: Server sends both, client should only show their own
            availableAbilities: data.attackerAbilities || data.defenderAbilities || [],
          }))

          // Start countdown timer
          if (abilityTimerRef.current) {
            clearInterval(abilityTimerRef.current)
          }
          const startTime = Date.now()
          const duration = data.windowDurationMs
          abilityTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime
            const remaining = Math.max(0, duration - elapsed)
            setState((prev) => ({
              ...prev,
              abilityWindowRemainingMs: remaining,
            }))
            if (remaining <= 0 && abilityTimerRef.current) {
              clearInterval(abilityTimerRef.current)
            }
          }, 100)
          break
        }

        case 'ability_activated': {
          const data = event.data as { abilityId: AbilityId }
          // Could show visual feedback here
          break
        }

        case 'battle_end': {
          const data = event.data as BattleEndData & { result?: unknown }
          setState((prev) => ({
            ...prev,
            status: 'finished',
            winner: data.winner,
            canActivateAbility: false,
          }))

          onBattleEnd?.(data)

          // Save replay if enabled
          if (autoSaveReplay) {
            saveReplay(data)
          }
          break
        }

        case 'error': {
          const data = event.data as { message: string }
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: data.message,
          }))
          break
        }
      }
    },
    [autoSaveReplay, onBattleEnd]
  )

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const activateAbility = useCallback(
    async (abilityId: AbilityId): Promise<boolean> => {
      if (!state.canActivateAbility || !sessionId) {
        return false
      }

      try {
        const response = await fetch('/api/game/combat/ability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, abilityId }),
        })

        const result = await response.json()

        if (result.success) {
          setState((prev) => ({
            ...prev,
            availableAbilities: result.availableAbilities || [],
          }))
          return true
        }

        return false
      } catch (e) {
        console.error('Failed to activate ability:', e)
        return false
      }
    },
    [sessionId, state.canActivateAbility]
  )

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (abilityTimerRef.current) {
      clearInterval(abilityTimerRef.current)
    }
  }, [])

  // ==========================================================================
  // REPLAY SAVING
  // ==========================================================================

  const saveReplay = useCallback(
    async (endData: BattleEndData) => {
      if (!state.attacker || !state.defender || !sessionId) return

      try {
        const replay: StoredReplay = {
          battleId: sessionId,
          attackerId: state.attacker.id,
          defenderId: state.defender.id,
          winner: endData.winner,
          totalRounds: endData.totalRounds,
          timeline: state.timeline,
          attackerLosses: 0, // TODO: Extract from result
          defenderLosses: 0,
          loot: { metal: 0, crystal: 0, deuterium: 0 },
          debris: { metal: 0, crystal: 0 },
          moonCreated: false,
          createdAt: Date.now(),
          coordinates: '0:0:0', // TODO: Get from session
        }

        const store = getReplayStore()
        await store.saveReplay(replay)
      } catch (e) {
        console.error('Failed to save replay:', e)
      }
    },
    [sessionId, state.attacker, state.defender, state.timeline]
  )

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    ...state,
    activateAbility,
    disconnect,
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
  }
}

// ============================================================================
// START BATTLE HOOK
// ============================================================================

export interface StartBattleParams {
  attackerFleet: Record<string, number>
  attackerTech: { weaponsTech: number; shieldTech: number; armorTech: number }
  targetPlanetId?: string
  targetCoords?: { galaxy: number; system: number; position: number }
}

export function useStartBattle() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const startBattle = useCallback(async (params: StartBattleParams): Promise<string | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/game/combat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to start battle')
        return null
      }

      setSessionId(result.sessionId)
      return result.sessionId
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { startBattle, loading, error, sessionId }
}
