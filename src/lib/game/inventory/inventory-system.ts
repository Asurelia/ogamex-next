/**
 * Inventory System Logic
 * 
 * Ported from C# OGameX.SharedLib.Inventory (InventorySystem.cs)
 */

import {
    ItemCategory,
    ItemFlag,
    type InventoryItem,
    type InventoryContainerData,
    type ItemType
} from './inventory-types'

// Mock Item Database (Replace with real DB/API later)
const itemDefinitions = new Map<number, ItemType>()

// ============================================================================
// ITEM FACTORY
// ============================================================================

export class ItemFactory {
    static registerType(type: ItemType) {
        itemDefinitions.set(type.typeID, type)
    }

    static getType(typeID: number): ItemType | undefined {
        return itemDefinitions.get(typeID)
    }

    static createItem(
        typeID: number,
        ownerID: number,
        locationID: number,
        flag: ItemFlag = ItemFlag.Hangar,
        quantity: number = 1,
        singleton: boolean = false
    ): InventoryItem | null {
        const type = this.getType(typeID)
        if (!type) return null

        return {
            itemID: generateItemID(),
            typeID,
            ownerID,
            locationID,
            flag,
            quantity,
            singleton,
            type
        }
    }
}

// ============================================================================
// INVENTORY CONTAINER CLASS
// ============================================================================

export class InventoryContainer {
    public data: InventoryContainerData

    // Event callbacks
    public onItemAdded?: (item: InventoryItem) => void
    public onItemRemoved?: (item: InventoryItem) => void
    public onItemChanged?: (item: InventoryItem) => void

    constructor(containerID: number, maxCapacity: number = 0) {
        this.data = {
            containerID,
            maxCapacity,
            items: {}
        }
    }

    // =====================================
    // QUERIES
    // =====================================

    get items(): InventoryItem[] {
        return Object.values(this.data.items)
    }

    getItem(itemID: number): InventoryItem | undefined {
        return this.data.items[itemID]
    }

    get usedCapacity(): number {
        return this.items.reduce((total, item) => {
            const vol = (item.type?.volume || 0) * item.quantity
            return total + vol
        }, 0)
    }

    get freeCapacity(): number {
        if (this.data.maxCapacity <= 0) return Number.MAX_VALUE
        return this.data.maxCapacity - this.usedCapacity
    }

    // =====================================
    // ACTIONS
    // =====================================

    addItem(item: InventoryItem): boolean {
        const vol = (item.type?.volume || 0) * item.quantity
        if (this.data.maxCapacity > 0 && vol > this.freeCapacity) {
            return false
        }

        // Try stack
        if (!item.singleton) {
            const existing = this.items.find(i =>
                i.typeID === item.typeID &&
                i.flag === item.flag &&
                !i.singleton
            )

            if (existing) {
                existing.quantity += item.quantity
                this.onItemChanged?.(existing)
                return true
            }
        }

        item.locationID = this.data.containerID
        this.data.items[item.itemID] = item
        this.onItemAdded?.(item)
        return true
    }

    removeItem(itemID: number): boolean {
        const item = this.data.items[itemID]
        if (item) {
            delete this.data.items[itemID]
            this.onItemRemoved?.(item)
            return true
        }
        return false
    }

    removeQuantity(itemID: number, quantity: number): InventoryItem | null {
        const item = this.data.items[itemID]
        if (!item) return null

        if (quantity >= item.quantity) {
            this.removeItem(itemID)
            return item
        }

        item.quantity -= quantity
        this.onItemChanged?.(item)

        // Return split off part (new item)
        return {
            ...item,
            itemID: -1, // Needs new ID
            quantity: quantity
        }
    }

    splitStack(itemID: number, splitQuantity: number): InventoryItem | null {
        const item = this.data.items[itemID]
        if (!item || item.singleton || splitQuantity >= item.quantity || splitQuantity <= 0) {
            return null
        }

        item.quantity -= splitQuantity
        this.onItemChanged?.(item)

        const newItem: InventoryItem = {
            ...item,
            itemID: generateItemID(),
            quantity: splitQuantity,
            attributes: item.attributes ? { ...item.attributes } : undefined
        }

        this.data.items[newItem.itemID] = newItem
        this.onItemAdded?.(newItem)
        return newItem
    }

    mergeStacks(sourceID: number, targetID: number): boolean {
        const source = this.data.items[sourceID]
        const target = this.data.items[targetID]

        if (!source || !target) return false
        if (source.typeID !== target.typeID) return false
        if (source.singleton || target.singleton) return false

        target.quantity += source.quantity
        this.removeItem(sourceID)
        this.onItemChanged?.(target)
        return true
    }

    transferTo(itemID: number, targetContainer: InventoryContainer, quantity: number = -1): boolean {
        const item = this.data.items[itemID]
        if (!item) return false

        if (quantity > 0 && quantity < item.quantity && !item.singleton) {
            // Partial
            const split = this.removeQuantity(itemID, quantity)
            if (!split) return false
            split.itemID = generateItemID()
            return targetContainer.addItem(split)
        }

        // Full
        if (targetContainer.addItem(item)) {
            delete this.data.items[itemID] // Don't call removeItem to avoid triggers if needed, or do it
            this.onItemRemoved?.(item)
            return true
        }
        return false
    }
}

// Utility
let _nextItemID = 1000000
function generateItemID(): number {
    return ++_nextItemID
}
