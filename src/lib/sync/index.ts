/**
 * Synchronization Module
 *
 * Provides hierarchical data synchronization utilities for the game.
 * Handles batch operations, aggregation, and cascade updates.
 */

export {
  HierarchicalSyncService,
  createSyncService,
  groupUpdatesByUser,
  aggregateResources,
} from './hierarchical-sync'

export type {
  PlanetResourceUpdate,
  BatchUpdateResult,
  BuildingCompletionResult,
  UnitCompletionResult,
  UserStats,
  SystemOverview,
  GalaxyOverview,
  HierarchySyncResult,
} from './hierarchical-sync'
