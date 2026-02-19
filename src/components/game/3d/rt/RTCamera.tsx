/**
 * RTCamera - Real-time game camera controls
 *
 * WASD pan, QE roll, mouse rotate, scroll zoom.
 * Tracks player ship with smooth lerp.
 */

'use client'

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useRTGameStore } from '@/stores/rtGameStore'

const CAMERA_DISTANCE_MIN = 500
const CAMERA_DISTANCE_MAX = 200000
const CAMERA_LERP = 0.05

export function RTCamera() {
  const { camera } = useThree()
  const targetRef = useRef(new THREE.Vector3())
  const distanceRef = useRef(8000)
  const angleRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 6 })
  const keysRef = useRef(new Set<string>())

  const myShipId = useRTGameStore((s) => s.myShipId)
  const ships = useRTGameStore((s) => s.ships)

  // Keyboard input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase())
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase())
    const onWheel = (e: WheelEvent) => {
      distanceRef.current *= e.deltaY > 0 ? 1.1 : 0.9
      distanceRef.current = Math.max(CAMERA_DISTANCE_MIN, Math.min(CAMERA_DISTANCE_MAX, distanceRef.current))
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('wheel', onWheel)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('wheel', onWheel)
    }
  }, [])

  useFrame((_, dt) => {
    const keys = keysRef.current
    const rotSpeed = 1.5 * dt

    // Rotate camera
    if (keys.has('a') || keys.has('arrowleft')) angleRef.current.theta -= rotSpeed
    if (keys.has('d') || keys.has('arrowright')) angleRef.current.theta += rotSpeed
    if (keys.has('w') || keys.has('arrowup')) angleRef.current.phi = Math.max(0.1, angleRef.current.phi - rotSpeed)
    if (keys.has('s') || keys.has('arrowdown')) angleRef.current.phi = Math.min(Math.PI / 2 - 0.1, angleRef.current.phi + rotSpeed)

    // Zoom
    if (keys.has('q')) distanceRef.current = Math.max(CAMERA_DISTANCE_MIN, distanceRef.current * 0.98)
    if (keys.has('e')) distanceRef.current = Math.min(CAMERA_DISTANCE_MAX, distanceRef.current * 1.02)

    // Track my ship
    const myShip = ships.get(myShipId)
    if (myShip) {
      const shipPos = new THREE.Vector3(myShip.x, myShip.y, myShip.z)
      targetRef.current.lerp(shipPos, CAMERA_LERP)
    }

    // Calculate camera position on orbit
    const { theta, phi } = angleRef.current
    const dist = distanceRef.current

    camera.position.set(
      targetRef.current.x + dist * Math.sin(phi) * Math.sin(theta),
      targetRef.current.y + dist * Math.cos(phi),
      targetRef.current.z + dist * Math.sin(phi) * Math.cos(theta),
    )

    camera.lookAt(targetRef.current)
  })

  return null
}
