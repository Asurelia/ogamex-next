'use client'

/**
 * TouchControls - Mobile touch input handling for the 3D space scene.
 *
 * Supports:
 * - Single finger drag: Camera orbit
 * - Two finger pinch: Zoom in/out
 * - Double tap: Select target
 * - Long press: Context menu (right-click equivalent)
 */

import { useEffect, useRef, useCallback, memo } from 'react'
import { useThree } from '@react-three/fiber'
import { useRTGameStore } from '@/stores/rtGameStore'

interface TouchState {
  startX: number
  startY: number
  startDist: number
  startTime: number
  fingers: number
  moved: boolean
}

const LONG_PRESS_MS = 500
const DOUBLE_TAP_MS = 300
const MOVE_THRESHOLD = 10

export const TouchControls = memo(function TouchControls() {
  const { camera, gl } = useThree()
  const touchRef = useRef<TouchState>({
    startX: 0, startY: 0, startDist: 0,
    startTime: 0, fingers: 0, moved: false,
  })
  const lastTapRef = useRef(0)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getDistance = useCallback((t1: Touch, t2: Touch) => {
    const dx = t1.clientX - t2.clientX
    const dy = t1.clientY - t2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  useEffect(() => {
    const canvas = gl.domElement

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startDist: e.touches.length >= 2 ? getDistance(e.touches[0], e.touches[1]) : 0,
        startTime: Date.now(),
        fingers: e.touches.length,
        moved: false,
      }

      // Start long press timer for single finger
      if (e.touches.length === 1) {
        longPressTimer.current = setTimeout(() => {
          if (!touchRef.current.moved) {
            // Dispatch context menu event for long press
            window.dispatchEvent(new CustomEvent('touch-context', {
              detail: { x: touch.clientX, y: touch.clientY }
            }))
          }
        }, LONG_PRESS_MS)
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const state = touchRef.current

      if (e.touches.length === 1 && state.fingers === 1) {
        // Single finger - orbit camera
        const dx = e.touches[0].clientX - state.startX
        const dy = e.touches[0].clientY - state.startY
        if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
          state.moved = true
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current)
            longPressTimer.current = null
          }
        }

        // Apply rotation via OrbitControls (handled by r3f)
        // The default orbit controls already handle touch, this is a fallback
      } else if (e.touches.length >= 2) {
        // Pinch zoom
        const newDist = getDistance(e.touches[0], e.touches[1])
        const scale = state.startDist / newDist
        camera.position.multiplyScalar(Math.max(0.5, Math.min(2.0, scale)))
        state.startDist = newDist
        state.moved = true

        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
        }
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }

      const state = touchRef.current

      // Single tap detection (no move, quick)
      if (!state.moved && state.fingers === 1 && e.changedTouches.length === 1) {
        const elapsed = Date.now() - state.startTime
        if (elapsed < 300) {
          const now = Date.now()
          // Double tap detection
          if (now - lastTapRef.current < DOUBLE_TAP_MS) {
            // Double tap -> select target at position
            window.dispatchEvent(new CustomEvent('touch-double-tap', {
              detail: { x: state.startX, y: state.startY }
            }))
            lastTapRef.current = 0
          } else {
            // Single tap -> select at position
            window.dispatchEvent(new CustomEvent('touch-tap', {
              detail: { x: state.startX, y: state.startY }
            }))
            lastTapRef.current = now
          }
        }
      }
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: false })

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
    }
  }, [camera, gl, getDistance])

  return null
})
