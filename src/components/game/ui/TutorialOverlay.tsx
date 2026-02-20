'use client'

/**
 * TutorialOverlay - Step-by-step new player guide
 *
 * Dark overlay with spotlight cutout highlighting UI areas.
 * 7 steps from undocking to trading. Persists progress in localStorage.
 */

import { useState, useEffect, useCallback, memo } from 'react'

// ============================================================================
// TYPES
// ============================================================================

interface TutorialStep {
  title: string
  description: string
  target: { x: number; y: number; w: number; h: number }
}

const STORAGE_KEY = 'ogamex_tutorial_step'

const STEPS: TutorialStep[] = [
  {
    title: 'Welcome to OGameX!',
    description: 'Click "Undock" to leave the station and begin your journey among the stars.',
    target: { x: 48, y: 300, w: 200, h: 60 },
  },
  {
    title: 'The Overview',
    description: 'Use the Overview window to see nearby objects: ships, asteroids, and stations.',
    target: { x: 700, y: 60, w: 350, h: 300 },
  },
  {
    title: 'Mine Asteroids',
    description: 'Select an asteroid in the Overview, then click "Mine" in the action buttons to extract ore.',
    target: { x: 700, y: 380, w: 200, h: 50 },
  },
  {
    title: 'Watch Your Cargo',
    description: 'As you mine, ore fills your cargo bay. Keep an eye on your ship capacity in the HUD.',
    target: { x: 48, y: 500, w: 300, h: 80 },
  },
  {
    title: 'Dock at a Station',
    description: 'When your cargo is full, select a station and click "Dock" to safely store your goods.',
    target: { x: 700, y: 380, w: 200, h: 50 },
  },
  {
    title: 'Open the Market',
    description: 'Click the Market icon in the Neocom sidebar to buy and sell items.',
    target: { x: 0, y: 150, w: 48, h: 40 },
  },
  {
    title: 'You are Ready!',
    description: 'Explore the universe, train skills, join a corporation, and become a space legend. Fly safe!',
    target: { x: 300, y: 200, w: 400, h: 200 },
  },
]

// ============================================================================
// OVERLAY
// ============================================================================

function loadStep(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw !== null) return parseInt(raw, 10)
  } catch { /* noop */ }
  return -1 // -1 = never started
}

function saveStep(step: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(step))
  } catch { /* noop */ }
}

export const TutorialOverlay = memo(function TutorialOverlay() {
  const [step, setStep] = useState<number>(() => loadStep())
  const [visible, setVisible] = useState(false)

  // Show on first visit (step === -1 means never started)
  useEffect(() => {
    if (step === -1) {
      setStep(0)
      saveStep(0)
      setVisible(true)
    }
  }, [step])

  // Listen for reopen event from Neocom
  useEffect(() => {
    const handler = () => {
      setStep(0)
      saveStep(0)
      setVisible(true)
    }
    window.addEventListener('open-tutorial', handler)
    return () => window.removeEventListener('open-tutorial', handler)
  }, [])

  const handleNext = useCallback(() => {
    const next = step + 1
    if (next >= STEPS.length) {
      saveStep(STEPS.length)
      setVisible(false)
      return
    }
    setStep(next)
    saveStep(next)
  }, [step])

  const handleSkip = useCallback(() => {
    saveStep(STEPS.length)
    setVisible(false)
  }, [])

  if (!visible || step < 0 || step >= STEPS.length) return null

  const current = STEPS[step]
  const { x, y, w, h } = current.target

  // Position tooltip near the spotlight area
  const tipX = x + w + 20
  const tipY = y
  const tipRight = tipX + 320 > (typeof window !== 'undefined' ? window.innerWidth : 1920)
  const finalTipX = tipRight ? Math.max(10, x - 340) : tipX
  const finalTipY = Math.min(tipY, (typeof window !== 'undefined' ? window.innerHeight : 1080) - 250)

  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'auto' }}>
      {/* Dark overlay with spotlight cutout via SVG */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tutorial-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={x} y={y} width={w} height={h} rx={8} fill="black" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.7)"
          mask="url(#tutorial-mask)"
        />
        {/* Spotlight border */}
        <rect
          x={x - 2}
          y={y - 2}
          width={w + 4}
          height={h + 4}
          rx={10}
          fill="none"
          stroke="#60A5FA"
          strokeWidth={2}
          style={{ filter: 'drop-shadow(0 0 8px rgba(96,165,250,0.5))' }}
        />
      </svg>

      {/* Tooltip card */}
      <div
        className="absolute p-4 rounded-lg border max-w-[320px]"
        style={{
          left: finalTipX,
          top: finalTipY,
          background: '#0f1923',
          borderColor: '#1e293b',
          boxShadow: '0 4px 30px rgba(0,0,0,0.6)',
        }}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === step ? 'bg-blue-400' : i < step ? 'bg-blue-800' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        <h3 className="text-sm font-semibold text-blue-300 mb-1">{current.title}</h3>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">{current.description}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Skip Tutorial
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
          >
            {step === STEPS.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
})
