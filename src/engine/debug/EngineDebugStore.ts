import { create } from 'zustand'

interface EngineDebugState {
  // ECS
  entityCount: number
  systemCount: number
  systemTimings: Record<string, number>

  // Performance
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number

  // AI
  activeNpcs: number
  btEvalsPerSec: number
  pauseAI: boolean

  // Network
  ping: number
  bandwidth: number
  messagesPerSec: number
  predictionError: number

  // Actions
  updateMetrics: (partial: Partial<EngineDebugState>) => void
  setPauseAI: (pause: boolean) => void
}

export const useEngineDebugStore = create<EngineDebugState>((set) => ({
  entityCount: 0,
  systemCount: 0,
  systemTimings: {},
  fps: 0,
  frameTime: 0,
  drawCalls: 0,
  triangles: 0,
  activeNpcs: 0,
  btEvalsPerSec: 0,
  pauseAI: false,
  ping: 0,
  bandwidth: 0,
  messagesPerSec: 0,
  predictionError: 0,
  updateMetrics: (partial) => set(partial),
  setPauseAI: (pause) => set({ pauseAI: pause }),
}))
