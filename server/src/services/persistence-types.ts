/**
 * Shared types for the persistence layer.
 */

export interface InventoryItem {
  id: string
  owner_id: string
  owner_type: 'character' | 'corporation'
  location_type: 'ship_cargo' | 'station_hangar' | 'corp_hangar' | 'contract_escrow' | 'colony'
  location_id: string
  item_type_id: string
  quantity: number
  hangar_division: number
  is_assembled: boolean
  meta_data: Record<string, unknown>
}
