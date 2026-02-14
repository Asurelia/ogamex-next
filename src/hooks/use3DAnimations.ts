/**
 * 3D Animation Hooks for OGameX
 * Provides cinematic camera animations and visual effects for space scenes
 *
 * Uses GSAP for smooth transitions and React Three Fiber for 3D rendering
 */

'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { gsap } from 'gsap'
import * as THREE from 'three'

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface CameraAnimationOptions {
  duration?: number
  ease?: string
  onStart?: () => void
  onUpdate?: (progress: number) => void
  onComplete?: () => void
}

export interface CameraPosition {
  position: THREE.Vector3 | [number, number, number]
  lookAt?: THREE.Vector3 | [number, number, number]
}

export interface PlanetFocusOptions extends CameraAnimationOptions {
  orbitOffset?: number
  verticalAngle?: number
  autoOrbit?: boolean
  orbitSpeed?: number
}

export interface HyperspaceOptions {
  duration?: number
  starStretchFactor?: number
  flashIntensity?: number
  onJumpStart?: () => void
  onJumpComplete?: () => void
}

export interface HyperspaceState {
  isJumping: boolean
  starStretch: number
  flashOpacity: number
  phase: 'idle' | 'accelerating' | 'jumping' | 'decelerating'
}

// ============================================================================
// Animation Presets
// ============================================================================

/**
 * Camera animation presets for common transitions
 */
export const CAMERA_ANIMATIONS = {
  orbitPlanet: {
    duration: 2,
    ease: 'power2.inOut',
  },
  zoomIn: {
    duration: 1.5,
    ease: 'power3.out',
  },
  zoomOut: {
    duration: 1,
    ease: 'power2.in',
  },
  panTo: {
    duration: 1.2,
    ease: 'power2.inOut',
  },
  cinematic: {
    duration: 3,
    ease: 'power1.inOut',
  },
  quick: {
    duration: 0.5,
    ease: 'power2.out',
  },
  dramatic: {
    duration: 2.5,
    ease: 'expo.inOut',
  },
} as const

export type CameraAnimationPreset = keyof typeof CAMERA_ANIMATIONS

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Convert position to THREE.Vector3
 */
function toVector3(
  pos: THREE.Vector3 | [number, number, number] | undefined
): THREE.Vector3 {
  if (!pos) return new THREE.Vector3()
  if (pos instanceof THREE.Vector3) return pos.clone()
  return new THREE.Vector3(pos[0], pos[1], pos[2])
}

/**
 * Calculate optimal camera distance based on object radius
 */
function calculateOptimalDistance(radius: number, fov: number = 45): number {
  const fovRadians = (fov * Math.PI) / 180
  return (radius * 2.5) / Math.tan(fovRadians / 2)
}

// ============================================================================
// useCameraAnimation Hook
// ============================================================================

export interface UseCameraAnimationReturn {
  animateTo: (target: CameraPosition, options?: CameraAnimationOptions) => void
  animateToPreset: (
    preset: CameraAnimationPreset,
    target: CameraPosition,
    overrides?: Partial<CameraAnimationOptions>
  ) => void
  stopAnimation: () => void
  isAnimating: boolean
}

/**
 * Hook for animating the camera to a target position
 *
 * @example
 * ```tsx
 * const { animateTo, isAnimating } = useCameraAnimation()
 *
 * animateTo(
 *   { position: [10, 5, 10], lookAt: [0, 0, 0] },
 *   { duration: 2, ease: 'power2.inOut', onComplete: () => console.log('Done!') }
 * )
 * ```
 */
export function useCameraAnimation(): UseCameraAnimationReturn {
  const { camera } = useThree()
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  const stopAnimation = useCallback(() => {
    if (tweenRef.current) {
      tweenRef.current.kill()
      tweenRef.current = null
    }
    setIsAnimating(false)
  }, [])

  const animateTo = useCallback(
    (target: CameraPosition, options: CameraAnimationOptions = {}) => {
      if (!isBrowser()) return

      const {
        duration = 1.5,
        ease = 'power2.inOut',
        onStart,
        onUpdate,
        onComplete,
      } = options

      // Kill any existing animation
      stopAnimation()

      const targetPosition = toVector3(target.position)
      const targetLookAt = target.lookAt ? toVector3(target.lookAt) : null

      // Store initial camera state
      const startPosition = camera.position.clone()
      const startQuaternion = camera.quaternion.clone()

      // Calculate end quaternion if lookAt is specified
      let endQuaternion: THREE.Quaternion | null = null
      if (targetLookAt) {
        const tempCamera = camera.clone()
        tempCamera.position.copy(targetPosition)
        tempCamera.lookAt(targetLookAt)
        endQuaternion = tempCamera.quaternion.clone()
      }

      // Animation progress object
      const progress = { value: 0 }

      setIsAnimating(true)
      onStart?.()

      tweenRef.current = gsap.to(progress, {
        value: 1,
        duration,
        ease,
        onUpdate: () => {
          const t = progress.value

          // Interpolate position
          camera.position.lerpVectors(startPosition, targetPosition, t)

          // Interpolate rotation if lookAt was specified
          if (endQuaternion) {
            camera.quaternion.slerpQuaternions(startQuaternion, endQuaternion, t)
          } else if (targetLookAt) {
            // Smooth lookAt interpolation
            const currentLookAt = new THREE.Vector3()
            currentLookAt.lerpVectors(
              startPosition.clone().add(
                new THREE.Vector3(0, 0, -1).applyQuaternion(startQuaternion)
              ),
              targetLookAt,
              t
            )
            camera.lookAt(currentLookAt)
          }

          onUpdate?.(t)
        },
        onComplete: () => {
          // Ensure final position is exact
          camera.position.copy(targetPosition)
          if (targetLookAt) {
            camera.lookAt(targetLookAt)
          }

          setIsAnimating(false)
          tweenRef.current = null
          onComplete?.()
        },
      })
    },
    [camera, stopAnimation]
  )

  const animateToPreset = useCallback(
    (
      preset: CameraAnimationPreset,
      target: CameraPosition,
      overrides: Partial<CameraAnimationOptions> = {}
    ) => {
      const presetOptions = CAMERA_ANIMATIONS[preset]
      animateTo(target, { ...presetOptions, ...overrides })
    },
    [animateTo]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation()
    }
  }, [stopAnimation])

  return {
    animateTo,
    animateToPreset,
    stopAnimation,
    isAnimating,
  }
}

// ============================================================================
// usePlanetFocus Hook
// ============================================================================

export interface UsePlanetFocusReturn {
  focusOnPlanet: (
    position: THREE.Vector3 | [number, number, number],
    radius: number,
    options?: PlanetFocusOptions
  ) => void
  unfocus: (returnPosition?: CameraPosition) => void
  isFocused: boolean
  isOrbiting: boolean
  setOrbitEnabled: (enabled: boolean) => void
}

/**
 * Hook for focusing and orbiting around a planet
 *
 * @example
 * ```tsx
 * const { focusOnPlanet, unfocus, isFocused } = usePlanetFocus()
 *
 * // Focus on a planet at position [10, 0, 0] with radius 2
 * focusOnPlanet([10, 0, 0], 2, {
 *   autoOrbit: true,
 *   orbitSpeed: 0.5,
 *   onComplete: () => console.log('Focused!')
 * })
 * ```
 */
export function usePlanetFocus(): UsePlanetFocusReturn {
  const { camera } = useThree()
  const { animateTo } = useCameraAnimation()

  const [isFocused, setIsFocused] = useState(false)
  const [isOrbiting, setIsOrbiting] = useState(false)

  const orbitRef = useRef({
    enabled: false,
    center: new THREE.Vector3(),
    radius: 10,
    angle: 0,
    speed: 0.3,
    verticalAngle: Math.PI / 6, // 30 degrees above horizon
  })

  const previousPositionRef = useRef<THREE.Vector3 | null>(null)

  const focusOnPlanet = useCallback(
    (
      position: THREE.Vector3 | [number, number, number],
      radius: number,
      options: PlanetFocusOptions = {}
    ) => {
      if (!isBrowser()) return

      const {
        duration = CAMERA_ANIMATIONS.orbitPlanet.duration,
        ease = CAMERA_ANIMATIONS.orbitPlanet.ease,
        orbitOffset = 2.5,
        verticalAngle = Math.PI / 6,
        autoOrbit = false,
        orbitSpeed = 0.3,
        onStart,
        onUpdate,
        onComplete,
      } = options

      const planetPos = toVector3(position)
      const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 45
      const optimalDistance = calculateOptimalDistance(radius, fov) * orbitOffset

      // Store previous position for unfocus
      previousPositionRef.current = camera.position.clone()

      // Calculate camera position on a sphere around the planet
      const currentAngle = Math.atan2(
        camera.position.z - planetPos.z,
        camera.position.x - planetPos.x
      )

      const targetPosition = new THREE.Vector3(
        planetPos.x + Math.cos(currentAngle) * Math.cos(verticalAngle) * optimalDistance,
        planetPos.y + Math.sin(verticalAngle) * optimalDistance,
        planetPos.z + Math.sin(currentAngle) * Math.cos(verticalAngle) * optimalDistance
      )

      // Setup orbit parameters
      orbitRef.current = {
        enabled: autoOrbit,
        center: planetPos.clone(),
        radius: optimalDistance,
        angle: currentAngle,
        speed: orbitSpeed,
        verticalAngle,
      }

      setIsFocused(true)
      setIsOrbiting(autoOrbit)

      animateTo(
        { position: targetPosition, lookAt: planetPos },
        {
          duration,
          ease,
          onStart,
          onUpdate,
          onComplete: () => {
            onComplete?.()
          },
        }
      )
    },
    [camera, animateTo]
  )

  const unfocus = useCallback(
    (returnPosition?: CameraPosition) => {
      if (!isBrowser()) return

      orbitRef.current.enabled = false
      setIsOrbiting(false)
      setIsFocused(false)

      if (returnPosition) {
        animateTo(returnPosition, {
          duration: CAMERA_ANIMATIONS.zoomOut.duration,
          ease: CAMERA_ANIMATIONS.zoomOut.ease,
        })
      } else if (previousPositionRef.current) {
        animateTo(
          {
            position: previousPositionRef.current,
            lookAt: [0, 0, 0],
          },
          {
            duration: CAMERA_ANIMATIONS.zoomOut.duration,
            ease: CAMERA_ANIMATIONS.zoomOut.ease,
          }
        )
      }
    },
    [animateTo]
  )

  const setOrbitEnabled = useCallback((enabled: boolean) => {
    orbitRef.current.enabled = enabled
    setIsOrbiting(enabled)
  }, [])

  // Update orbit position each frame
  useFrame((_, delta) => {
    if (!orbitRef.current.enabled || !isFocused) return

    const orbit = orbitRef.current
    orbit.angle += delta * orbit.speed

    const newPosition = new THREE.Vector3(
      orbit.center.x + Math.cos(orbit.angle) * Math.cos(orbit.verticalAngle) * orbit.radius,
      orbit.center.y + Math.sin(orbit.verticalAngle) * orbit.radius,
      orbit.center.z + Math.sin(orbit.angle) * Math.cos(orbit.verticalAngle) * orbit.radius
    )

    camera.position.copy(newPosition)
    camera.lookAt(orbit.center)
  })

  return {
    focusOnPlanet,
    unfocus,
    isFocused,
    isOrbiting,
    setOrbitEnabled,
  }
}

// ============================================================================
// useHyperspaceEffect Hook
// ============================================================================

export interface UseHyperspaceEffectReturn {
  triggerJump: (options?: HyperspaceOptions) => void
  cancelJump: () => void
  state: HyperspaceState
  starStretchRef: React.MutableRefObject<number>
  flashOpacityRef: React.MutableRefObject<number>
}

/**
 * Hook for triggering hyperspace jump visual effects
 *
 * @example
 * ```tsx
 * const { triggerJump, state, starStretchRef } = useHyperspaceEffect()
 *
 * // In your starfield component, use starStretchRef.current to stretch stars
 *
 * // Trigger jump
 * triggerJump({
 *   duration: 2,
 *   starStretchFactor: 50,
 *   onJumpComplete: () => {
 *     // Load new system
 *     loadNewSolarSystem()
 *   }
 * })
 * ```
 */
export function useHyperspaceEffect(): UseHyperspaceEffectReturn {
  const [state, setState] = useState<HyperspaceState>({
    isJumping: false,
    starStretch: 1,
    flashOpacity: 0,
    phase: 'idle',
  })

  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const starStretchRef = useRef(1)
  const flashOpacityRef = useRef(0)

  const cancelJump = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.kill()
      timelineRef.current = null
    }

    starStretchRef.current = 1
    flashOpacityRef.current = 0

    setState({
      isJumping: false,
      starStretch: 1,
      flashOpacity: 0,
      phase: 'idle',
    })
  }, [])

  const triggerJump = useCallback(
    (options: HyperspaceOptions = {}) => {
      if (!isBrowser()) return

      const {
        duration = 2,
        starStretchFactor = 50,
        flashIntensity = 1,
        onJumpStart,
        onJumpComplete,
      } = options

      // Cancel any existing jump
      cancelJump()

      // Animation values object for GSAP
      const values = {
        starStretch: 1,
        flashOpacity: 0,
      }

      setState((prev) => ({
        ...prev,
        isJumping: true,
        phase: 'accelerating',
      }))

      onJumpStart?.()

      // Create timeline for the hyperspace sequence
      const timeline = gsap.timeline()

      // Phase 1: Acceleration - stars start stretching
      timeline.to(values, {
        starStretch: starStretchFactor * 0.3,
        duration: duration * 0.25,
        ease: 'power2.in',
        onUpdate: () => {
          starStretchRef.current = values.starStretch
          setState((prev) => ({
            ...prev,
            starStretch: values.starStretch,
          }))
        },
      })

      // Phase 2: Jump - maximum stretch with flash
      timeline.to(values, {
        starStretch: starStretchFactor,
        flashOpacity: flashIntensity,
        duration: duration * 0.15,
        ease: 'power4.in',
        onStart: () => {
          setState((prev) => ({ ...prev, phase: 'jumping' }))
        },
        onUpdate: () => {
          starStretchRef.current = values.starStretch
          flashOpacityRef.current = values.flashOpacity
          setState((prev) => ({
            ...prev,
            starStretch: values.starStretch,
            flashOpacity: values.flashOpacity,
          }))
        },
      })

      // Phase 3: Hold at peak
      timeline.to(values, {
        duration: duration * 0.1,
        ease: 'none',
      })

      // Phase 4: Deceleration - flash fades, stars return
      timeline.to(values, {
        starStretch: 1,
        flashOpacity: 0,
        duration: duration * 0.5,
        ease: 'power2.out',
        onStart: () => {
          setState((prev) => ({ ...prev, phase: 'decelerating' }))
        },
        onUpdate: () => {
          starStretchRef.current = values.starStretch
          flashOpacityRef.current = values.flashOpacity
          setState((prev) => ({
            ...prev,
            starStretch: values.starStretch,
            flashOpacity: values.flashOpacity,
          }))
        },
        onComplete: () => {
          setState({
            isJumping: false,
            starStretch: 1,
            flashOpacity: 0,
            phase: 'idle',
          })
          timelineRef.current = null
          onJumpComplete?.()
        },
      })

      timelineRef.current = timeline
    },
    [cancelJump]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelJump()
    }
  }, [cancelJump])

  return {
    triggerJump,
    cancelJump,
    state,
    starStretchRef,
    flashOpacityRef,
  }
}

// ============================================================================
// useCameraShake Hook
// ============================================================================

export interface CameraShakeOptions {
  intensity?: number
  duration?: number
  frequency?: number
  decay?: boolean
}

export interface UseCameraShakeReturn {
  shake: (options?: CameraShakeOptions) => void
  stop: () => void
  isShaking: boolean
}

/**
 * Hook for camera shake effects (explosions, impacts, etc.)
 *
 * @example
 * ```tsx
 * const { shake, isShaking } = useCameraShake()
 *
 * // Trigger shake on explosion
 * shake({ intensity: 0.5, duration: 0.5, decay: true })
 * ```
 */
export function useCameraShake(): UseCameraShakeReturn {
  const { camera } = useThree()
  const [isShaking, setIsShaking] = useState(false)

  const shakeRef = useRef({
    active: false,
    intensity: 0,
    startTime: 0,
    duration: 0,
    frequency: 0,
    decay: true,
    originalPosition: new THREE.Vector3(),
  })

  const tweenRef = useRef<gsap.core.Tween | null>(null)

  const stop = useCallback(() => {
    shakeRef.current.active = false
    setIsShaking(false)

    if (tweenRef.current) {
      tweenRef.current.kill()
      tweenRef.current = null
    }

    // Restore original position
    camera.position.copy(shakeRef.current.originalPosition)
  }, [camera])

  const shake = useCallback(
    (options: CameraShakeOptions = {}) => {
      if (!isBrowser()) return

      const {
        intensity = 0.3,
        duration = 0.5,
        frequency = 25,
        decay = true,
      } = options

      // Store original position
      shakeRef.current.originalPosition.copy(camera.position)
      shakeRef.current.active = true
      shakeRef.current.intensity = intensity
      shakeRef.current.duration = duration
      shakeRef.current.frequency = frequency
      shakeRef.current.decay = decay
      shakeRef.current.startTime = performance.now()

      setIsShaking(true)

      // Use GSAP for timing
      const progress = { value: 0 }

      tweenRef.current = gsap.to(progress, {
        value: 1,
        duration,
        ease: 'none',
        onComplete: () => {
          stop()
        },
      })
    },
    [camera, stop]
  )

  // Apply shake each frame
  useFrame(() => {
    if (!shakeRef.current.active) return

    const elapsed = (performance.now() - shakeRef.current.startTime) / 1000
    const progress = elapsed / shakeRef.current.duration

    if (progress >= 1) {
      stop()
      return
    }

    let currentIntensity = shakeRef.current.intensity
    if (shakeRef.current.decay) {
      currentIntensity *= 1 - progress
    }

    const time = elapsed * shakeRef.current.frequency

    const offsetX = (Math.sin(time * 1.5) + Math.sin(time * 3.7)) * currentIntensity * 0.5
    const offsetY = (Math.cos(time * 2.3) + Math.cos(time * 4.1)) * currentIntensity * 0.5
    const offsetZ = (Math.sin(time * 1.9) + Math.cos(time * 2.8)) * currentIntensity * 0.3

    camera.position.copy(shakeRef.current.originalPosition)
    camera.position.x += offsetX
    camera.position.y += offsetY
    camera.position.z += offsetZ
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    shake,
    stop,
    isShaking,
  }
}

// ============================================================================
// useCinematicSequence Hook
// ============================================================================

export interface CinematicKeyframe {
  position: THREE.Vector3 | [number, number, number]
  lookAt?: THREE.Vector3 | [number, number, number]
  duration: number
  ease?: string
  onReach?: () => void
  delay?: number
}

export interface UseCinematicSequenceReturn {
  playSequence: (
    keyframes: CinematicKeyframe[],
    options?: { loop?: boolean; onComplete?: () => void }
  ) => void
  stop: () => void
  pause: () => void
  resume: () => void
  isPlaying: boolean
  currentKeyframe: number
}

/**
 * Hook for playing multi-keyframe camera sequences
 *
 * @example
 * ```tsx
 * const { playSequence, isPlaying, currentKeyframe } = useCinematicSequence()
 *
 * playSequence([
 *   { position: [0, 10, 20], lookAt: [0, 0, 0], duration: 2 },
 *   { position: [20, 5, 0], lookAt: [0, 0, 0], duration: 1.5 },
 *   { position: [0, 30, 0], lookAt: [0, 0, 0], duration: 2, ease: 'power2.inOut' },
 * ], { onComplete: () => console.log('Sequence complete!') })
 * ```
 */
export function useCinematicSequence(): UseCinematicSequenceReturn {
  const { animateTo } = useCameraAnimation()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentKeyframe, setCurrentKeyframe] = useState(0)

  const sequenceRef = useRef<{
    keyframes: CinematicKeyframe[]
    currentIndex: number
    loop: boolean
    onComplete?: () => void
    paused: boolean
  }>({
    keyframes: [],
    currentIndex: 0,
    loop: false,
    onComplete: undefined,
    paused: false,
  })

  const playNextKeyframe = useCallback(() => {
    const seq = sequenceRef.current

    if (seq.paused) return

    if (seq.currentIndex >= seq.keyframes.length) {
      if (seq.loop) {
        seq.currentIndex = 0
      } else {
        setIsPlaying(false)
        seq.onComplete?.()
        return
      }
    }

    const keyframe = seq.keyframes[seq.currentIndex]
    setCurrentKeyframe(seq.currentIndex)

    const executeKeyframe = () => {
      animateTo(
        {
          position: keyframe.position,
          lookAt: keyframe.lookAt,
        },
        {
          duration: keyframe.duration,
          ease: keyframe.ease || 'power2.inOut',
          onComplete: () => {
            keyframe.onReach?.()
            seq.currentIndex++
            playNextKeyframe()
          },
        }
      )
    }

    if (keyframe.delay && keyframe.delay > 0) {
      setTimeout(executeKeyframe, keyframe.delay * 1000)
    } else {
      executeKeyframe()
    }
  }, [animateTo])

  const playSequence = useCallback(
    (
      keyframes: CinematicKeyframe[],
      options: { loop?: boolean; onComplete?: () => void } = {}
    ) => {
      if (!isBrowser() || keyframes.length === 0) return

      sequenceRef.current = {
        keyframes,
        currentIndex: 0,
        loop: options.loop || false,
        onComplete: options.onComplete,
        paused: false,
      }

      setIsPlaying(true)
      setCurrentKeyframe(0)
      playNextKeyframe()
    },
    [playNextKeyframe]
  )

  const stop = useCallback(() => {
    sequenceRef.current.paused = true
    sequenceRef.current.currentIndex = 0
    setIsPlaying(false)
    setCurrentKeyframe(0)
  }, [])

  const pause = useCallback(() => {
    sequenceRef.current.paused = true
  }, [])

  const resume = useCallback(() => {
    if (sequenceRef.current.keyframes.length > 0) {
      sequenceRef.current.paused = false
      playNextKeyframe()
    }
  }, [playNextKeyframe])

  return {
    playSequence,
    stop,
    pause,
    resume,
    isPlaying,
    currentKeyframe,
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate camera position for optimal view of an object
 */
export function calculateViewPosition(
  objectPosition: THREE.Vector3 | [number, number, number],
  objectRadius: number,
  viewAngle: { horizontal: number; vertical: number } = { horizontal: Math.PI / 4, vertical: Math.PI / 6 },
  distanceMultiplier: number = 2.5
): THREE.Vector3 {
  const pos = toVector3(objectPosition)
  const distance = objectRadius * distanceMultiplier

  return new THREE.Vector3(
    pos.x + Math.cos(viewAngle.horizontal) * Math.cos(viewAngle.vertical) * distance,
    pos.y + Math.sin(viewAngle.vertical) * distance,
    pos.z + Math.sin(viewAngle.horizontal) * Math.cos(viewAngle.vertical) * distance
  )
}

/**
 * Interpolate between two camera positions with bezier curve
 */
export function createBezierPath(
  start: THREE.Vector3,
  end: THREE.Vector3,
  controlPoint1?: THREE.Vector3,
  controlPoint2?: THREE.Vector3
): THREE.CubicBezierCurve3 {
  const cp1 = controlPoint1 || new THREE.Vector3(
    start.x + (end.x - start.x) * 0.25,
    Math.max(start.y, end.y) + 5,
    start.z + (end.z - start.z) * 0.25
  )

  const cp2 = controlPoint2 || new THREE.Vector3(
    start.x + (end.x - start.x) * 0.75,
    Math.max(start.y, end.y) + 5,
    start.z + (end.z - start.z) * 0.75
  )

  return new THREE.CubicBezierCurve3(start, cp1, cp2, end)
}

// ============================================================================
// Export All
// ============================================================================

export {
  toVector3,
  calculateOptimalDistance,
  isBrowser,
}
