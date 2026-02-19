/**
 * ShipEffects - Visual effects for ships
 *
 * Engine trails, weapon fire indicators, shield impacts, warp effects.
 * Reads from damage events in the store.
 */

'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRTGameStore } from '@/stores/rtGameStore'

// Simple particle for engine trails
function EngineTrail({ position, velocity, color }: {
  position: [number, number, number]
  velocity: [number, number, number]
  color: string
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[5, 4, 4]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </mesh>
  )
}

export function ShipEffects() {
  const ships = useRTGameStore((s) => s.ships)
  const recentDamage = useRTGameStore((s) => s.recentDamage)

  // Render engine glow for moving ships
  const engineGlows = useMemo(() => {
    const glows: Array<{ id: string; x: number; y: number; z: number; color: string }> = []

    ships.forEach((ship) => {
      if (ship.speed > 10 && !ship.isDocked) {
        // Add engine glow behind ship
        const backX = ship.x - ship.vx * 0.05
        const backY = ship.y - ship.vy * 0.05
        const backZ = ship.z - ship.vz * 0.05

        glows.push({
          id: ship.id + '_engine',
          x: backX,
          y: backY,
          z: backZ,
          color: '#3399ff',
        })
      }
    })

    return glows
  }, [ships])

  // Render damage flash indicators
  const damageFlashes = useMemo(() => {
    const now = Date.now()
    return recentDamage
      .filter((d) => now - d.timestamp < 500) // Show for 500ms
      .map((d) => {
        const target = ships.get(d.targetId)
        if (!target) return null
        return {
          id: `dmg_${d.timestamp}_${d.targetId}`,
          x: target.x,
          y: target.y,
          z: target.z,
          color: d.damageType === 'ionic' ? '#4488ff' : d.damageType === 'explosive' ? '#ff6600' : '#ffaa00',
          scale: d.isCritical ? 2 : 1,
        }
      })
      .filter(Boolean)
  }, [recentDamage, ships])

  return (
    <group>
      {/* Engine glows */}
      {engineGlows.map((glow) => (
        <pointLight
          key={glow.id}
          position={[glow.x, glow.y, glow.z]}
          color={glow.color}
          intensity={1}
          distance={2000}
        />
      ))}

      {/* Damage flashes */}
      {damageFlashes.map((flash) =>
        flash ? (
          <mesh key={flash.id} position={[flash.x, flash.y, flash.z]}>
            <sphereGeometry args={[50 * flash.scale, 8, 8]} />
            <meshBasicMaterial
              color={flash.color}
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ) : null
      )}
    </group>
  )
}
