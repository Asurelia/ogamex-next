import { useState, useEffect, useCallback } from 'react'
import type { InventoryContainer } from '@/lib/game/inventory/inventory-system'
import type { InventoryItem } from '@/lib/game/inventory/inventory-types'
import { InventoryService } from '@/lib/services/inventory-service'

/**
 * Hook to manage inventory state and interactions via Supabase
 */
export function useInventory(container: InventoryContainer | null) {
    const [items, setItems] = useState<InventoryItem[]>([])
    const [capacity, setCapacity] = useState({ used: 0, max: 0 })
    const [loading, setLoading] = useState(false)

    // Initial Fetch & Realtime Subscription
    useEffect(() => {
        if (!container) {
            setItems([])
            return
        }

        const containerID = container.data.containerID
        setLoading(true)

        // 1. Load Initial Data
        InventoryService.getContainerItems(containerID).then(fetchedItems => {
            setItems(fetchedItems)
            setCapacity({
                used: fetchedItems.reduce((acc, i) => acc + (i.type?.volume || 0) * i.quantity, 0),
                max: container.data.maxCapacity
            })
            setLoading(false)
        })

        // 2. Subscribe to Realtime Updates
        const subscription = InventoryService.subscribeToContainer(containerID, () => {
            // Reload on any change
            InventoryService.getContainerItems(containerID).then(fetchedItems => {
                setItems(fetchedItems)
                setCapacity({
                    used: fetchedItems.reduce((acc, i) => acc + (i.type?.volume || 0) * i.quantity, 0),
                    max: container.data.maxCapacity
                })
            })
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [container])

    // Actions (Wrap Service)
    const moveItem = useCallback(async (itemId: number, targetContainer: InventoryContainer) => {
        // TODO: Implement move in Service
        console.log("Move not implemented in service yet")
        return false
    }, [])

    const removeItem = useCallback(async (itemId: number) => {
        return await InventoryService.removeItem(itemId)
    }, [])

    return {
        items,
        capacity,
        loading,
        moveItem,
        removeItem
    }
}

