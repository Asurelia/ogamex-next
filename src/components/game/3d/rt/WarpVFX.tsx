'use client'

/**
 * WarpVFX - Integrates warp tunnel effect into the R3F scene.
 * Listens to rtGameStore.warpActive and triggers start/stop.
 */

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRTGameStore } from '@/stores/rtGameStore'
import { createWarpEffect, type WarpEffect } from '@/lib/3d/warp-effect'

export function WarpVFX() {
  const { scene, camera } = useThree()
  const warpRef = useRef<WarpEffect | null>(null)
  const wasActive = useRef(false)
  const warpActive = useRTGameStore(s => s.warpActive)

  useEffect(() => {
    const effect = createWarpEffect({ starCount: 3000, speed: 80 })
    effect.visible = false
    scene.add(effect)
    warpRef.current = effect

    return () => {
      scene.remove(effect)
      effect.dispose()
      warpRef.current = null
    }
  }, [scene])

  useEffect(() => {
    const effect = warpRef.current
    if (!effect) return

    if (warpActive && !wasActive.current) {
      // Position warp tunnel around camera
      effect.position.copy(camera.position)
      effect.quaternion.copy(camera.quaternion)
      effect.start(0.8)
    } else if (!warpActive && wasActive.current) {
      effect.stop(0.5)
    }

    wasActive.current = warpActive
  }, [warpActive, camera])

  useFrame((_state, delta) => {
    const effect = warpRef.current
    if (effect) {
      effect.update(delta)
      if (warpRef.current?.visible) {
        effect.position.copy(camera.position)
        effect.quaternion.copy(camera.quaternion)
      }
    }
  })

  return null
}
