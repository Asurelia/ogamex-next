'use client'

import { memo, useState, useEffect } from 'react'
import { useControls, folder, LevaPanel, useCreateStore } from 'leva'
import { useEngineDebugStore } from '@/engine/debug/EngineDebugStore'

export const DevPanel = memo(function DevPanel() {
  const [visible, setVisible] = useState(false)
  const store = useCreateStore()

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault()
        setVisible(v => !v)
      }
    }
    const handleCustomEvent = () => {
      setVisible(v => !v)
    }
    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('toggle-devpanel', handleCustomEvent)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
      window.removeEventListener('toggle-devpanel', handleCustomEvent)
    }
  }, [])

  const debugState = useEngineDebugStore()

  useControls(
    {
      'ECS': folder({
        'Entities': { value: debugState.entityCount, disabled: true },
        'Systems': { value: debugState.systemCount, disabled: true },
      }),
      'Performance': folder({
        'FPS': { value: Math.round(debugState.fps), disabled: true },
        'Frame Time (ms)': { value: Number(debugState.frameTime.toFixed(2)), disabled: true },
      }),
      'AI': folder({
        'Active NPCs': { value: debugState.activeNpcs, disabled: true },
        'BT Evals/s': { value: debugState.btEvalsPerSec, disabled: true },
        'Pause AI': { value: debugState.pauseAI, onChange: (v: boolean) => debugState.setPauseAI(v) },
      }),
      'Network': folder({
        'Ping (ms)': { value: debugState.ping, disabled: true },
        'Messages/s': { value: debugState.messagesPerSec, disabled: true },
      }),
    },
    { store },
    [debugState]
  )

  if (!visible) return null

  return (
    <div style={{ position: 'fixed', top: 8, right: 8, zIndex: 9999 }}>
      <LevaPanel store={store} fill flat titleBar={{ title: 'Engine Debug' }} />
    </div>
  )
})
