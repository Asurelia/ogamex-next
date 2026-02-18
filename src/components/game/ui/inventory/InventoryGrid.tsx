import { useState } from 'react'
import InventorySlot from './InventorySlot'
import type { InventoryContainer } from '@/lib/game/inventory/inventory-system'
import { useInventory } from '@/hooks/game/useInventory'

interface InventoryGridProps {
    container: InventoryContainer | null
    title?: string
    onClose?: () => void
}

export default function InventoryGrid({ container, title = 'Inventory', onClose }: InventoryGridProps) {
    const { items, capacity, moveItem } = useInventory(container)
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null)

    // Calculate slots - OGame/EVE usually uses list or grid. Let's do a fixed grid for now or dynamic.
    // Let's assume a fixed size grid for visual consistency, or just list items.
    // EVE uses free-form or list. Let's do a grid of 6x5 (30 slots) for demo.
    const GRID_SIZE = 30
    const displayedItems = [...items]

    // Fill remaining slots with empty
    // const slots = Array(GRID_SIZE).fill(null).map((_, i) => displayedItems[i] || null)

    const handleDrop = (sourceItemId: number, targetSlotIndex: number) => {
        // Since our backend doesn't support "slots" yet (just list of items),
        // we can't really "move to slot 5".
        // But we can implement "merge" if dropped on another item.
        // For now, let's just log or handle merge.
        console.log(`Dropped item ${sourceItemId} on slot ${targetSlotIndex}`)

        // If dropped on another item, try merge?
        // const targetItem = displayedItems[targetSlotIndex]
        // if (targetItem) { ... }
    }

    const capacityPercent = capacity.max > 0 ? (capacity.used / capacity.max) * 100 : 0

    return (
        <div className="w-[400px] bg-black/90 border border-gray-600 flex flex-col shadow-2xl backdrop-blur-md">
            {/* Header */}
            <div className="bg-gray-800/80 px-3 py-2 flex justify-between items-center border-b border-gray-600 cursor-move">
                <span className="font-bold text-gray-200 uppercase tracking-widest text-sm">{title}</span>
                <div className="flex gap-2">
                    <div className="text-xs text-gray-400 self-center">
                        {capacity.used.toFixed(1)} / {capacity.max > 0 ? capacity.max.toFixed(1) : '∞'} m³
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Capacity Bar */}
            <div className="h-1 bg-gray-800 w-full">
                <div
                    className={`h-full transition-all duration-500 ${capacityPercent > 90 ? 'bg-red-500' : 'bg-cyan-600'}`}
                    style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                />
            </div>

            {/* Grid Content */}
            <div className="p-4 grid grid-cols-5 gap-2 max-h-[400px] overflow-y-auto min-h-[200px]">
                {/* Render actual items */}
                {items.map((item) => (
                    <InventorySlot
                        key={item.itemID}
                        item={item}
                        isSelected={selectedItemId === item.itemID}
                        onSelect={() => setSelectedItemId(item.itemID)}
                        onDrop={(sourceId) => {
                            // Handle merge logic here if compatible
                            console.log('Merge attempt', sourceId, '->', item.itemID)
                        }}
                    />
                ))}

                {/* Render some empty slots to fill the grid visually */}
                {[...Array(Math.max(0, GRID_SIZE - items.length))].map((_, i) => (
                    <InventorySlot
                        key={`empty-${i}`}
                        onDrop={(sourceId) => console.log('Dropped on empty', sourceId)}
                    />
                ))}
            </div>

            {/* Footer / Actions */}
            <div className="p-2 border-t border-gray-700 bg-gray-900/50 flex justify-between text-xs">
                <button className="text-gray-400 hover:text-white">Stack All</button>
                <button className="text-gray-400 hover:text-white">Sort</button>
            </div>
        </div>
    )
}
