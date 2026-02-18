import { getSupabaseClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import type { InventoryItem } from '@/lib/game/inventory/inventory-types'
import { ItemFactory } from '@/lib/game/inventory/inventory-system'

type DbInventoryItem = Database['public']['Tables']['inventory_items']['Row']

export class InventoryService {
    private static supabase = getSupabaseClient()

    /**
     * Fetch all items in a container.
     */
    static async getContainerItems(containerID: number): Promise<InventoryItem[]> {
        const { data, error } = await this.supabase
            .from('inventory_items')
            .select('*')
            .eq('container_id', containerID)

        if (error) {
            console.error('Error fetching inventory items:', error)
            return []
        }

        return data.map(this.mapDbItemToInventoryItem)
    }

    /**
     * Subscribe to changes in a container.
     */
    static subscribeToContainer(containerID: number, callback: () => void) {
        return this.supabase
            .channel(`container:${containerID}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'inventory_items',
                    filter: `container_id=eq.${containerID}`
                },
                () => callback()
            )
            .subscribe()
    }

    /**
     * Add an item to a container (or update stack).
     */
    static async addItem(
        containerID: number,
        typeID: number,
        quantity: number,
        attributes: Record<string, any> = {}
    ): Promise<boolean> {
        // Simple implementation: Insert new row.
        // In production, we'd check for existing stack and update it.

        const { error } = await this.supabase
            .from('inventory_items')
            .insert({
                container_id: containerID,
                type_id: typeID,
                quantity: quantity,
                attributes: attributes, // Cast to Json?
                flag: 4 // default
            })

        return !error
    }

    /**
     * Remove or decrease item quantity.
     */
    static async removeItem(itemID: number): Promise<boolean> {
        const { error } = await this.supabase
            .from('inventory_items')
            .delete()
            .eq('id', itemID)

        return !error
    }

    // Helper: Map DB Row to Game Type
    private static mapDbItemToInventoryItem(dbItem: DbInventoryItem): InventoryItem {
        const type = ItemFactory.getType(dbItem.type_id)
        return {
            itemID: dbItem.id,
            typeID: dbItem.type_id,
            ownerID: 0, // TODO: User ID from context
            locationID: dbItem.container_id,
            flag: dbItem.flag,
            quantity: dbItem.quantity,
            singleton: dbItem.singleton || false,
            attributes: (dbItem.attributes as Record<number, number>) || {},
            type: type
        }
    }
}
