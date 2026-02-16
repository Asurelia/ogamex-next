/**
 * @deprecated This file is deprecated. Import from '@/lib/game' instead.
 *
 * Migration guide:
 * ```typescript
 * // Before
 * import { UNIVERSE, MISSION_TYPES, type ShipDefinition } from '@/game/constants'
 *
 * // After
 * import { UNIVERSE, MISSION_TYPES, type ShipDefinition } from '@/lib/game'
 * ```
 *
 * This file re-exports everything for backward compatibility during migration.
 */

// Re-export all constants from the new location
export {
  UNIVERSE,
  PROCEDURAL_UNIVERSE,
  STAR_GAMEPLAY_EFFECTS,
  MISSION_TYPES,
} from '@/lib/game/constants'

export type {
  BuildingDefinition,
  ShipDefinition,
  DefenseDefinition,
  ResearchDefinition,
  MissionTypeId,
} from '@/lib/game/constants'

// ============================================================================
// DEPRECATED EXPORTS
// These are kept for backward compatibility but return empty values.
// Use getCachedGameConfig() from @/lib/game for actual data.
// ============================================================================

import type { ShipDefinition, BuildingDefinition, DefenseDefinition, ResearchDefinition } from '@/lib/game/constants'

/**
 * @deprecated Use getCachedGameConfig() from @/lib/game instead
 * This empty object is kept for type compatibility during migration
 */
export const SHIPS: Record<number, ShipDefinition> = {}

/**
 * @deprecated Use getCachedGameConfig() from @/lib/game instead
 */
export const BUILDINGS: Record<number, BuildingDefinition> = {}

/**
 * @deprecated Use getCachedGameConfig() from @/lib/game instead
 */
export const DEFENSE: Record<number, DefenseDefinition> = {}

/**
 * @deprecated Use getCachedGameConfig() from @/lib/game instead
 */
export const RESEARCH: Record<number, ResearchDefinition> = {}
