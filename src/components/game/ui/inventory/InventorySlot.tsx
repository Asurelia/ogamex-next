import { useRef } from 'react'
import type { InventoryItem } from '@/lib/game/inventory/inventory-types'

interface InventorySlotProps {
    item?: InventoryItem
    maxStack?: number
    isSelected?: boolean
    onSelect?: () => void
    onDrop?: (sourceItemId: number) => void
}

export default function InventorySlot({
    item,
    maxStack = 100,
    isSelected,
    onSelect,
    onDrop
}: InventorySlotProps) {
    const slotRef = useRef<HTMLDivElement>(null)

    const handleDragStart = (e: React.DragEvent) => {
        if (!item) return
        e.dataTransfer.setData('text/plain', item.itemID.toString())
        e.dataTransfer.effectAllowed = 'move'
        // Create a custom drag image if needed, or use default
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const sourceId = parseInt(e.dataTransfer.getData('text/plain'))
        if (!isNaN(sourceId) && onDrop) {
            onDrop(sourceId)
        }
    }

    return (
        <div
            ref={slotRef}
            className={`
                w-16 h-16 border border-gray-700 bg-gray-900/50 relative
                flex items-center justify-center cursor-pointer transition-colors
                ${isSelected ? 'border-cyan-500 bg-cyan-900/20' : 'hover:border-gray-500'}
            `}
            onClick={onSelect}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {item ? (
                <div
                    draggable
                    onDragStart={handleDragStart}
                    className="w-full h-full p-1 flex flex-col items-center justify-center group"
                >
                    {/* Icon Placeholder - Replace with real icon later */}
                    <div className="w-8 h-8 bg-gray-600 rounded-sm flex items-center justify-center text-xs text-gray-300">
                        {item.type?.name ? item.type.name.substring(0, 2).toUpperCase() : '?'}
                    </div>

                    {/* Quantity Badge */}
                    <div className="absolute bottom-1 right-1 text-[10px] bg-black/80 px-1 rounded text-gray-300 font-mono">
                        {item.quantity > 1 ? item.quantity : ''}
                    </div>

                    {/* Tooltip hint (simple title for now) */}
                    <div className="hidden group-hover:block absolute z-50 bottom-full mb-2 bg-black/90 border border-gray-700 p-2 text-xs w-max max-w-[200px] pointer-events-none">
                        <div className="font-bold text-cyan-400">{item.type?.name || 'Unknown Item'}</div>
                        <div className="text-gray-400">{item.type?.volume} m3</div>
                    </div>
                </div>
            ) : (
                <div className="text-gray-800 text-2xl font-thin">+</div>
            )}
        </div>
    )
}
