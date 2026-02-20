'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRTGameStore } from '@/stores/rtGameStore'
import type { DamageEvent } from '@/stores/rtGameStore'

// ============================================================================
// TYPES
// ============================================================================

interface DamageText {
  id: number
  x: number
  y: number
  z: number
  totalDamage: number
  color: string
  isCritical: boolean
  startTime: number
  opacity: number
  offsetY: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DAMAGE_DURATION_MS = 2000
const FLOAT_SPEED = 80 // units per second upward
const COLOR_SHIELD = '#60A5FA'
const COLOR_ARMOR = '#FB923C'
const COLOR_HULL = '#EF4444'

// ============================================================================
// HELPERS
// ============================================================================

let nextId = 0

/**
 * Determines the dominant damage color based on which layer took the most damage.
 * Priority: hull > armor > shield when amounts are equal.
 */
function getDamageColor(event: DamageEvent): string {
  const { shieldDamage, armorDamage, hullDamage } = event
  if (hullDamage >= armorDamage && hullDamage >= shieldDamage) return COLOR_HULL
  if (armorDamage >= shieldDamage) return COLOR_ARMOR
  return COLOR_SHIELD
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Renders floating damage numbers in 3D space.
 *
 * Subscribes to `recentDamage` from the Zustand store and spawns
 * an Html overlay at each target ship's position. The text floats
 * upward and fades out over DAMAGE_DURATION_MS milliseconds.
 */
export function DamageVFX() {
  const [damageTexts, setDamageTexts] = useState<DamageText[]>([])
  const processedCountRef = useRef(0)

  const recentDamage = useRTGameStore((s) => s.recentDamage)
  const ships = useRTGameStore((s) => s.ships)

  // Process new damage events from the store
  useEffect(() => {
    if (recentDamage.length <= processedCountRef.current) {
      // Store was reset or no new events
      if (recentDamage.length < processedCountRef.current) {
        processedCountRef.current = recentDamage.length
      }
      return
    }

    const newEvents = recentDamage.slice(processedCountRef.current)
    processedCountRef.current = recentDamage.length

    const now = performance.now()
    const newTexts: DamageText[] = []

    for (const event of newEvents) {
      const totalDamage = event.shieldDamage + event.armorDamage + event.hullDamage
      if (totalDamage <= 0) continue

      const targetShip = ships.get(event.targetId)
      if (!targetShip) continue

      // Add small random horizontal offset so overlapping hits don't stack
      const offsetX = (Math.random() - 0.5) * 200
      const offsetZ = (Math.random() - 0.5) * 200

      newTexts.push({
        id: nextId++,
        x: targetShip.x + offsetX,
        y: targetShip.y,
        z: targetShip.z + offsetZ,
        totalDamage,
        color: getDamageColor(event),
        isCritical: event.isCritical,
        startTime: now,
        opacity: 1,
        offsetY: 0,
      })
    }

    if (newTexts.length > 0) {
      setDamageTexts((prev) => [...prev, ...newTexts])
    }
  }, [recentDamage, ships])

  // Animate texts upward and fade them out, then remove expired ones
  useFrame((_, delta) => {
    setDamageTexts((prev) => {
      const now = performance.now()
      let changed = false
      const updated: DamageText[] = []

      for (const text of prev) {
        const elapsed = now - text.startTime
        if (elapsed >= DAMAGE_DURATION_MS) {
          changed = true
          continue // Remove this text
        }

        const progress = elapsed / DAMAGE_DURATION_MS
        const newOpacity = 1 - progress
        const newOffsetY = text.offsetY + FLOAT_SPEED * delta

        if (newOpacity !== text.opacity || newOffsetY !== text.offsetY) {
          changed = true
          updated.push({
            ...text,
            opacity: newOpacity,
            offsetY: newOffsetY,
          })
        } else {
          updated.push(text)
        }
      }

      return changed ? updated : prev
    })
  })

  if (damageTexts.length === 0) return null

  return (
    <group>
      {damageTexts.map((text) => (
        <DamageNumber key={text.id} text={text} />
      ))}
    </group>
  )
}

// ============================================================================
// SUB-COMPONENT
// ============================================================================

interface DamageNumberProps {
  text: DamageText
}

/**
 * A single floating damage number rendered as an Html overlay
 * positioned in 3D space.
 */
function DamageNumber({ text }: DamageNumberProps) {
  const fontSize = text.isCritical ? 18 : 14
  const displayText = text.isCritical
    ? `${Math.round(text.totalDamage)}!`
    : `${Math.round(text.totalDamage)}`

  return (
    <Html
      position={[text.x, text.y + text.offsetY, text.z]}
      center
      sprite
      style={{ pointerEvents: 'none' }}
      zIndexRange={[50, 0]}
    >
      <div
        style={{
          color: text.color,
          fontSize: `${fontSize}px`,
          fontWeight: 700,
          fontFamily: 'monospace',
          textShadow: `0 0 4px ${text.color}, 0 0 8px rgba(0,0,0,0.8)`,
          opacity: text.opacity,
          whiteSpace: 'nowrap',
          userSelect: 'none',
          transform: text.isCritical ? 'scale(1.3)' : undefined,
        }}
      >
        {displayText}
      </div>
    </Html>
  )
}
