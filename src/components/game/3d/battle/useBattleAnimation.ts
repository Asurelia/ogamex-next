/**
 * useBattleAnimation React Hook
 *
 * React hook for using the Battle Animation Engine.
 * Extracted from BattleAnimationEngine.ts for maintainability.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { BattleResult } from '../../../../lib/battle/types'
import { BattleAnimationEngine } from './BattleAnimationEngine'
import type {
  AnimationPhase,
  BattleAnimationControls,
  BattleData,
  BattleSceneRef,
  EngineCallbacks,
  UseBattleAnimationReturn,
} from './battle-animation-types'

/**
 * React hook for using the Battle Animation Engine
 *
 * @example
 * ```tsx
 * const {
 *   engine,
 *   currentRound,
 *   isPlaying,
 *   progress,
 *   controls,
 *   initialize,
 *   setCallbacks
 * } = useBattleAnimation()
 *
 * // Initialize when scene and data are ready
 * useEffect(() => {
 *   if (sceneRef && battleData) {
 *     initialize(sceneRef, battleData)
 *   }
 * }, [sceneRef, battleData])
 *
 * // Set callbacks
 * setCallbacks({
 *   onRoundStart: (round) => console.log(`Round ${round} started`),
 *   onShipDestroyed: (ship, side) => console.log(`${side} ship destroyed`)
 * })
 *
 * // Use controls
 * <button onClick={controls.play}>Play</button>
 * <button onClick={controls.pause}>Pause</button>
 * <input
 *   type="range"
 *   value={progress * 100}
 *   onChange={(e) => controls.seekTo(Math.ceil(e.target.value / 100 * totalRounds))}
 * />
 * ```
 */
export function useBattleAnimation(): UseBattleAnimationReturn {
  const engineRef = useRef<BattleAnimationEngine | null>(null)

  // State
  const [currentRound, setCurrentRound] = useState(0)
  const [totalRounds, setTotalRounds] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentPhase, setCurrentPhase] = useState<AnimationPhase>('idle')
  const [speedMultiplier, setSpeedMultiplier] = useState(1)

  // Create engine on mount
  useEffect(() => {
    engineRef.current = new BattleAnimationEngine()

    return () => {
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [])

  // Initialize engine
  const initialize = useCallback((scene: BattleSceneRef, battleData: BattleData) => {
    if (!engineRef.current) return

    engineRef.current.initialize(scene, battleData)

    const state = engineRef.current.getState()
    setTotalRounds(state.totalRounds)
    setCurrentRound(state.currentRound)
    setProgress(state.progress)
    setCurrentPhase(state.currentPhase)

    // Set up state sync callbacks
    engineRef.current.setCallbacks({
      onRoundStart: (round) => setCurrentRound(round),
      onProgressUpdate: (p) => setProgress(p),
      onPhaseChange: (phase) => setCurrentPhase(phase),
      onBattleEnd: () => {
        setIsPlaying(false)
        setIsPaused(false)
      },
    })
  }, [])

  // Set callbacks
  const setCallbacks = useCallback((callbacks: EngineCallbacks) => {
    if (!engineRef.current) return

    // Merge with state sync callbacks
    const existingCallbacks: EngineCallbacks = {
      onRoundStart: (round: number) => {
        setCurrentRound(round)
        callbacks.onRoundStart?.(round)
      },
      onProgressUpdate: (p: number) => {
        setProgress(p)
        callbacks.onProgressUpdate?.(p)
      },
      onPhaseChange: (phase: AnimationPhase, round: number) => {
        setCurrentPhase(phase)
        callbacks.onPhaseChange?.(phase, round)
      },
      onBattleEnd: (result: BattleResult) => {
        setIsPlaying(false)
        setIsPaused(false)
        callbacks.onBattleEnd?.(result)
      },
      onRoundEnd: callbacks.onRoundEnd,
      onShipDestroyed: callbacks.onShipDestroyed,
      onDamageDealt: callbacks.onDamageDealt,
    }

    engineRef.current.setCallbacks(existingCallbacks)
  }, [])

  // Controls
  const controls: BattleAnimationControls = {
    play: useCallback(() => {
      engineRef.current?.play()
      setIsPlaying(true)
      setIsPaused(false)
    }, []),

    pause: useCallback(() => {
      engineRef.current?.pause()
      setIsPlaying(false)
      setIsPaused(true)
    }, []),

    stop: useCallback(() => {
      engineRef.current?.stop()
      setIsPlaying(false)
      setIsPaused(false)
      setCurrentRound(0)
      setProgress(0)
      setCurrentPhase('idle')
    }, []),

    setSpeed: useCallback((speed: number) => {
      engineRef.current?.setSpeed(speed)
      setSpeedMultiplier(speed)
    }, []),

    seekTo: useCallback((round: number) => {
      engineRef.current?.seekToRound(round)
      setCurrentRound(round)
    }, []),
  }

  return {
    engine: engineRef.current,
    currentRound,
    totalRounds,
    isPlaying,
    isPaused,
    progress,
    currentPhase,
    speedMultiplier,
    controls,
    initialize,
    setCallbacks,
  }
}
