/**
 * ShipInstances - InstancedMesh rendering for ships
 *
 * Groups ships by type for batched rendering.
 * LOD: full model <10km, simplified <50km, billboard <200km, dot >200km.
 */

'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRTGameStore } from '@/stores/rtGameStore'
import { LOD_FULL, LOD_SIMPLE, LOD_BILLBOARD } from '@shared/types/game-constants'

const tempMatrix = new THREE.Matrix4()
const tempPosition = new THREE.Vector3()
const tempQuaternion = new THREE.Quaternion()
const tempEuler = new THREE.Euler()
const tempScale = new THREE.Vector3()
const tempColor = new THREE.Color()

const FACTION_COLORS: Record<string, string> = {
  amarr: '#ffcc33',
  caldari: '#3399ff',
  gallente: '#33cc66',
  minmatar: '#cc6633',
  pirate: '#ff3333',
  npc: '#999999',
}

const SHIP_SCALES: Record<string, number> = {
  shuttle: 15,
  capsule: 10,
  frigate: 30,
  destroyer: 45,
  cruiser: 80,
  battlecruiser: 120,
  battleship: 200,
  industrial: 100,
  mining_barge: 60,
}

export function ShipInstances() {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const ships = useRTGameStore((s) => s.ships)
  const myShipId = useRTGameStore((s) => s.myShipId)

  // Create geometry (simple box for now, can be replaced with models)
  const geometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 0.3, 1.5)
    return geo
  }, [])

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      metalness: 0.8,
      roughness: 0.3,
      envMapIntensity: 1.0,
    })
  }, [])

  // Update instance matrices every frame
  useFrame((state) => {
    if (!meshRef.current) return

    const camera = state.camera
    let instanceIndex = 0

    // Iterate map directly instead of creating a new Array each frame
    ships.forEach((ship) => {
      if (ship.isDocked || instanceIndex >= meshRef.current!.count) return

      // Distance check for LOD
      tempPosition.set(ship.x, ship.y, ship.z)
      const distance = tempPosition.distanceTo(camera.position)

      if (distance > LOD_BILLBOARD * 2) return // Too far, skip

      // Scale based on ship class
      const shipClass = ship.shipTypeId.split('_').pop() || 'frigate'
      const baseScale = SHIP_SCALES[shipClass] || 30

      // LOD scaling
      let scale = baseScale
      if (distance > LOD_BILLBOARD) {
        scale = baseScale * 0.1 // Dot
      } else if (distance > LOD_SIMPLE) {
        scale = baseScale * 0.5 // Billboard-ish
      }

      // Set matrix - reuse pre-allocated tempEuler instead of creating new Euler each iteration
      tempEuler.set(ship.rx, ship.ry, ship.rz)
      tempQuaternion.setFromEuler(tempEuler)
      tempScale.set(scale, scale, scale)
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale)
      meshRef.current!.setMatrixAt(instanceIndex, tempMatrix)

      // Set color based on faction and ownership
      const color = ship.id === myShipId
        ? '#00ff44'
        : FACTION_COLORS[ship.faction] || '#888888'
      tempColor.set(color)
      meshRef.current!.setColorAt(instanceIndex, tempColor)

      instanceIndex++
    })

    meshRef.current.count = instanceIndex
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, 500]}
      frustumCulled={false}
    />
  )
}
