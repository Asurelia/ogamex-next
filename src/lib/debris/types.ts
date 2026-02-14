/**
 * Debris Field Types
 * Types for debris field management and recycling operations
 */

import type { DebrisField as DbDebrisField } from '@/types/database'

// Re-export database type for consistency
export type DebrisField = DbDebrisField

/**
 * Result of a debris collection operation
 */
export interface DebrisCollectionResult {
  /** Amount of metal collected */
  metalCollected: number
  /** Amount of crystal collected */
  crystalCollected: number
  /** Amount of metal remaining in field */
  metalRemaining: number
  /** Amount of crystal remaining in field */
  crystalRemaining: number
  /** Whether the debris field is now empty */
  fieldDepleted: boolean
}

/**
 * Recycler capacity constants
 */
export const RECYCLER_CAPACITY = 20_000

/**
 * Calculate total recycling capacity for a fleet
 */
export function calculateRecycleCapacity(recyclerCount: number): number {
  return recyclerCount * RECYCLER_CAPACITY
}
