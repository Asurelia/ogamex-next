'use client'

/**
 * Warp Tunnel Effect Component
 *
 * R3F component for FTL/hyperspace transition effects.
 */

import { useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { WarpEffect, WarpFlash, type WarpConfig } from '@/lib/3d/warp-effect'

// ============================================================================
// WARP TUNNEL (Full Effect)
// ============================================================================

export interface WarpTunnelProps {
  /** Auto-start on mount */
  autoStart?: boolean
  /** Warp configuration */
  config?: WarpConfig
  /** Callback when warp starts */
  onWarpStart?: () => void
  /** Callback when warp ends */
  onWarpEnd?: () => void
}

export interface WarpTunnelRef {
  start: (duration?: number) => Promise<void>
  stop: (duration?: number) => Promise<void>
  isActive: () => boolean
}

/**
 * Full warp tunnel effect for FTL transitions
 *
 * @example
 * ```tsx
 * const warpRef = useRef<WarpTunnelRef>(null)
 *
 * const handleJump = async () => {
 *   await warpRef.current?.start(1.0)
 *   // Do transition logic
 *   await warpRef.current?.stop(0.5)
 * }
 *
 * <Canvas>
 *   <WarpTunnel ref={warpRef} />
 * </Canvas>
 * ```
 */
export const WarpTunnel = forwardRef<WarpTunnelRef, WarpTunnelProps>(
  function WarpTunnel({ autoStart = false, config, onWarpStart, onWarpEnd }, ref) {
    const warp = useMemo(() => new WarpEffect(config), [config])

    useImperativeHandle(ref, () => ({
      start: async (duration?: number) => {
        onWarpStart?.()
        await warp.start(duration)
      },
      stop: async (duration?: number) => {
        await warp.stop(duration)
        onWarpEnd?.()
      },
      isActive: () => warp.active,
    }))

    useEffect(() => {
      if (autoStart) {
        warp.start()
      }

      return () => {
        warp.dispose()
      }
    }, [autoStart, warp])

    useFrame((_, delta) => {
      warp.update(delta)
    })

    return <primitive object={warp} />
  }
)

// ============================================================================
// WARP FLASH (Quick Effect)
// ============================================================================

export interface WarpFlashProps {
  /** Flash color */
  color?: THREE.Color
}

export interface WarpFlashRef {
  flash: (duration?: number) => Promise<void>
}

/**
 * Quick warp flash effect for instant transitions
 *
 * @example
 * ```tsx
 * const flashRef = useRef<WarpFlashRef>(null)
 *
 * const handleTeleport = async () => {
 *   await flashRef.current?.flash(0.3)
 *   // Teleport logic
 * }
 *
 * <Canvas>
 *   <WarpFlashEffect ref={flashRef} />
 * </Canvas>
 * ```
 */
export const WarpFlashEffect = forwardRef<WarpFlashRef, WarpFlashProps>(
  function WarpFlashEffect({ color }, ref) {
    const { camera } = useThree()
    const flash = useMemo(() => new WarpFlash(), [])

    useImperativeHandle(ref, () => ({
      flash: (duration?: number) => flash.flash(duration),
    }))

    useEffect(() => {
      // Attach to camera for screen-space effect
      camera.add(flash)

      return () => {
        camera.remove(flash)
        flash.dispose()
      }
    }, [camera, flash])

    return null // No scene object needed, attached to camera
  }
)

export default WarpTunnel
