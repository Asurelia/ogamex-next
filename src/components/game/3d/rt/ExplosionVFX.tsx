'use client'

/**
 * ExplosionVFX - Spawns particle burst explosions when ships are destroyed.
 * Monitors ship state transitions to DESTROYED (state===8) and renders
 * expanding instanced sphere particles with a brief point light flash.
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRTGameStore } from '@/stores/rtGameStore'
import * as THREE from 'three'

// ============================================================================
// CONSTANTS
// ============================================================================

const SHIP_STATE_DESTROYED = 8
const PARTICLE_COUNT = 80
const EXPLOSION_DURATION = 1.5
const MAX_EXPLOSIONS = 8
const EXPAND_SPEED = 600
const FLASH_INTENSITY = 50
const FLASH_DISTANCE = 2000

const COLOR_CENTER = new THREE.Color('#FB923C')
const COLOR_OUTER = new THREE.Color('#EF4444')
const COLOR_SPARK = new THREE.Color('#FCD34D')

// ============================================================================
// TYPES
// ============================================================================

interface Explosion {
  id: string
  position: THREE.Vector3
  elapsed: number
  velocities: THREE.Vector3[]
  colors: THREE.Color[]
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExplosionVFX() {
  const groupRef = useRef<THREE.Group>(null)
  const explosionsRef = useRef<Explosion[]>([])
  const prevStatesRef = useRef<Map<string, number>>(new Map())

  // Shared geometry for all particles
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(12, 6, 4), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tmpColor = useMemo(() => new THREE.Color(), [])

  // Instanced mesh refs per explosion
  const instancedRefs = useRef<Map<string, THREE.InstancedMesh>>(new Map())
  const lightRefs = useRef<Map<string, THREE.PointLight>>(new Map())

  useFrame((_, delta) => {
    const ships = useRTGameStore.getState().ships
    const group = groupRef.current
    if (!group) return

    // Detect newly destroyed ships
    const currentStates = new Map<string, number>()
    for (const [id, ship] of ships) {
      currentStates.set(id, ship.state)
      const prevState = prevStatesRef.current.get(id)
      if (
        prevState !== undefined &&
        prevState !== SHIP_STATE_DESTROYED &&
        ship.state === SHIP_STATE_DESTROYED &&
        explosionsRef.current.length < MAX_EXPLOSIONS
      ) {
        // Spawn explosion
        const velocities: THREE.Vector3[] = []
        const colors: THREE.Color[] = []
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const dir = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
          ).normalize()
          const speed = EXPAND_SPEED * (0.3 + Math.random() * 0.7)
          velocities.push(dir.multiplyScalar(speed))

          // Color distribution: 30% center, 40% outer, 30% spark
          const r = Math.random()
          if (r < 0.3) colors.push(COLOR_CENTER.clone())
          else if (r < 0.7) colors.push(COLOR_OUTER.clone())
          else colors.push(COLOR_SPARK.clone())
        }

        const explosion: Explosion = {
          id: id + '_' + Date.now(),
          position: new THREE.Vector3(ship.x, ship.y, ship.z),
          elapsed: 0,
          velocities,
          colors,
        }
        explosionsRef.current.push(explosion)

        // Create instanced mesh
        const mat = new THREE.MeshBasicMaterial({
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
        const instMesh = new THREE.InstancedMesh(sphereGeo, mat, PARTICLE_COUNT)
        instMesh.frustumCulled = false
        group.add(instMesh)
        instancedRefs.current.set(explosion.id, instMesh)

        // Create flash light
        const light = new THREE.PointLight('#FFFFFF', FLASH_INTENSITY, FLASH_DISTANCE)
        light.position.copy(explosion.position)
        group.add(light)
        lightRefs.current.set(explosion.id, light)
      }
    }
    prevStatesRef.current = currentStates

    // Update explosions
    const toRemove: string[] = []
    for (const exp of explosionsRef.current) {
      exp.elapsed += delta
      if (exp.elapsed >= EXPLOSION_DURATION) {
        toRemove.push(exp.id)
        continue
      }

      const progress = exp.elapsed / EXPLOSION_DURATION
      const opacity = 1 - progress * progress // quadratic fade
      const slowdown = 1 - progress * 0.8 // particles decelerate

      const instMesh = instancedRefs.current.get(exp.id)
      if (!instMesh) continue

      const mat = instMesh.material as THREE.MeshBasicMaterial
      mat.opacity = opacity

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const vel = exp.velocities[i]
        const px = exp.position.x + vel.x * exp.elapsed * slowdown
        const py = exp.position.y + vel.y * exp.elapsed * slowdown
        const pz = exp.position.z + vel.z * exp.elapsed * slowdown

        // Scale particles down over time
        const scale = (1 - progress * 0.6) * (0.5 + Math.random() * 0.1)
        dummy.position.set(px, py, pz)
        dummy.scale.setScalar(scale)
        dummy.updateMatrix()
        instMesh.setMatrixAt(i, dummy.matrix)
        instMesh.setColorAt(i, tmpColor.copy(exp.colors[i]).multiplyScalar(opacity))
      }
      instMesh.instanceMatrix.needsUpdate = true
      if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true

      // Flash light decays quickly (first 20% of duration)
      const light = lightRefs.current.get(exp.id)
      if (light) {
        const flashProgress = Math.min(exp.elapsed / (EXPLOSION_DURATION * 0.2), 1)
        light.intensity = FLASH_INTENSITY * (1 - flashProgress)
      }
    }

    // Clean up finished explosions
    for (const id of toRemove) {
      const instMesh = instancedRefs.current.get(id)
      if (instMesh) {
        group.remove(instMesh)
        ;(instMesh.material as THREE.MeshBasicMaterial).dispose()
        instancedRefs.current.delete(id)
      }
      const light = lightRefs.current.get(id)
      if (light) {
        group.remove(light)
        light.dispose()
        lightRefs.current.delete(id)
      }
      explosionsRef.current = explosionsRef.current.filter((e) => e.id !== id)
    }
  })

  return <group ref={groupRef} />
}
