/**
 * Battle Effect Pool
 *
 * Object pool for managing reusable visual effects in battle animations.
 * Extracted from BattleAnimationEngine.ts for maintainability.
 */

import * as THREE from 'three'
import type { PooledEffect } from './battle-animation-types'
import { EFFECT_POOL_CONFIG, getMaxEffectsForType } from './battle-animation-config'

/**
 * Object pool for managing reusable visual effects
 */
export class EffectPool {
  private pools: Map<string, PooledEffect[]> = new Map()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private effectsGroup: THREE.Group | null = null

  constructor() {
    this.pools.set('laser', [])
    this.pools.set('explosion', [])
    this.pools.set('shield_hit', [])
    this.pools.set('debris', [])
  }

  /**
   * Initialize pool with scene reference
   */
  initialize(effectsGroup: THREE.Group): void {
    this.effectsGroup = effectsGroup
    this.startCleanupTimer()
  }

  /**
   * Acquire an effect from the pool or create new
   */
  acquire(type: string, createFn: () => THREE.Object3D): PooledEffect {
    const pool = this.pools.get(type) || []

    // Find available pooled effect
    const available = pool.find(e => !e.inUse)
    if (available) {
      available.inUse = true
      available.createdAt = Date.now()
      available.object.visible = true
      return available
    }

    // Create new effect
    const object = createFn()
    const effect: PooledEffect = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      object,
      inUse: true,
      createdAt: Date.now(),
    }

    pool.push(effect)
    this.pools.set(type, pool)

    if (this.effectsGroup) {
      this.effectsGroup.add(object)
    }

    return effect
  }

  /**
   * Release an effect back to the pool
   */
  release(effect: PooledEffect): void {
    effect.inUse = false
    effect.object.visible = false
  }

  /**
   * Get pool statistics
   */
  getStats(): Record<string, { total: number; inUse: number }> {
    const stats: Record<string, { total: number; inUse: number }> = {}

    this.pools.forEach((pool, type) => {
      stats[type] = {
        total: pool.length,
        inUse: pool.filter(e => e.inUse).length,
      }
    })

    return stats
  }

  /**
   * Start automatic cleanup of expired effects
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) return

    this.cleanupTimer = setInterval(() => {
      const now = Date.now()

      this.pools.forEach((pool, type) => {
        const maxEffects = getMaxEffectsForType(type)

        // Clean up unused effects that exceed the limit
        if (pool.length > maxEffects) {
          const toRemove = pool
            .filter(e => !e.inUse && now - e.createdAt > EFFECT_POOL_CONFIG.effectLifetime)
            .slice(0, pool.length - maxEffects)

          toRemove.forEach(effect => {
            this.disposeEffect(effect)
          })

          this.pools.set(type, pool.filter(e => !toRemove.includes(e)))
        }
      })
    }, EFFECT_POOL_CONFIG.cleanupInterval)
  }

  /**
   * Dispose a single effect
   */
  private disposeEffect(effect: PooledEffect): void {
    if (this.effectsGroup) {
      this.effectsGroup.remove(effect.object)
    }

    effect.object.traverse(child => {
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose()
      }
      if ((child as THREE.Mesh).material) {
        const material = (child as THREE.Mesh).material
        if (Array.isArray(material)) {
          material.forEach(m => m.dispose())
        } else {
          material.dispose()
        }
      }
    })
  }

  /**
   * Dispose all pooled effects
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    this.pools.forEach(pool => {
      pool.forEach(effect => {
        this.disposeEffect(effect)
      })
    })

    this.pools.clear()
    this.effectsGroup = null
  }
}
