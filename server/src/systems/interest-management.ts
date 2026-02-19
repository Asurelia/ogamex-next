/**
 * Interest Management System
 *
 * Spatial grid partitioning for efficient entity queries.
 * Priority-based sync rates: own ship 20Hz, nearby 20Hz, far 5Hz.
 */

import { SPATIAL_GRID_CELL_SIZE, NEAR_RANGE, MID_RANGE, VISIBILITY_RADIUS } from '../../../shared/types/game-constants'

// ============================================================================
// SPATIAL GRID
// ============================================================================

interface GridEntity {
  id: string
  x: number
  y: number
  z: number
}

export class SpatialGrid<T extends GridEntity> {
  private cells = new Map<string, Set<string>>()
  private entities = new Map<string, T>()
  private cellSize: number

  constructor(cellSize: number = SPATIAL_GRID_CELL_SIZE) {
    this.cellSize = cellSize
  }

  private getCellKey(x: number, y: number, z: number): string {
    const cx = Math.floor(x / this.cellSize)
    const cy = Math.floor(y / this.cellSize)
    const cz = Math.floor(z / this.cellSize)
    return `${cx},${cy},${cz}`
  }

  /**
   * Add or update entity in the grid
   */
  update(entity: T): void {
    const oldEntity = this.entities.get(entity.id)

    // Remove from old cell
    if (oldEntity) {
      const oldKey = this.getCellKey(oldEntity.x, oldEntity.y, oldEntity.z)
      this.cells.get(oldKey)?.delete(entity.id)
    }

    // Add to new cell
    const newKey = this.getCellKey(entity.x, entity.y, entity.z)
    if (!this.cells.has(newKey)) {
      this.cells.set(newKey, new Set())
    }
    this.cells.get(newKey)!.add(entity.id)

    // Update entity reference
    this.entities.set(entity.id, entity)
  }

  /**
   * Remove entity from grid
   */
  remove(entityId: string): void {
    const entity = this.entities.get(entityId)
    if (entity) {
      const key = this.getCellKey(entity.x, entity.y, entity.z)
      this.cells.get(key)?.delete(entityId)
      this.entities.delete(entityId)
    }
  }

  /**
   * Query entities within radius of a point
   */
  queryRadius(x: number, y: number, z: number, radius: number): T[] {
    const results: T[] = []
    const cellRadius = Math.ceil(radius / this.cellSize)

    const cx = Math.floor(x / this.cellSize)
    const cy = Math.floor(y / this.cellSize)
    const cz = Math.floor(z / this.cellSize)

    const radiusSq = radius * radius

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`
          const cell = this.cells.get(key)
          if (!cell) continue

          for (const entityId of cell) {
            const entity = this.entities.get(entityId)
            if (!entity) continue

            const ex = entity.x - x
            const ey = entity.y - y
            const ez = entity.z - z
            if (ex * ex + ey * ey + ez * ez <= radiusSq) {
              results.push(entity)
            }
          }
        }
      }
    }

    return results
  }

  /**
   * Get entity count
   */
  get size(): number {
    return this.entities.size
  }

  /**
   * Clear the grid
   */
  clear(): void {
    this.cells.clear()
    this.entities.clear()
  }
}

// ============================================================================
// PRIORITY TIERS
// ============================================================================

export type SyncPriority = 'high' | 'medium' | 'low'

/**
 * Determine sync priority based on distance
 */
export function getSyncPriority(distance: number): SyncPriority {
  if (distance <= NEAR_RANGE) return 'high'
  if (distance <= MID_RANGE) return 'medium'
  return 'low'
}

/**
 * Get update frequency multiplier for priority tier.
 * High = every tick, Medium = every tick, Low = every 4th tick.
 */
export function getPriorityTickDivisor(priority: SyncPriority): number {
  switch (priority) {
    case 'high': return 1
    case 'medium': return 1
    case 'low': return 4
  }
}
