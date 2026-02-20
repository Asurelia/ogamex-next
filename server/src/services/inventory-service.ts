/**
 * Inventory Service — Re-exports from persistence.ts
 *
 * Kept for backward compatibility with any remaining imports.
 */

export type { InventoryItem } from './persistence-types'

export {
  addItem,
  removeItem,
  moveItem,
  getInventory,
} from './persistence'
