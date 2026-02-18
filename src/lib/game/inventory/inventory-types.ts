/**
 * Inventory System Types
 * 
 * Ported from C# OGameX.SharedLib.Inventory (InventorySystem.cs)
 */

// ============================================================================
// ENUMS
// ============================================================================

/** Item categories — from EVEDB::invCategories */
export enum ItemCategory {
    System = 0,
    Owner = 1,
    Celestial = 2,
    Station = 3,
    Material = 4,
    Accessories = 5,
    Ship = 6,
    Module = 7,
    Charge = 8,
    Blueprint = 9,
    Trading = 10,
    Entity = 11,             // NPC ships
    Bonus = 14,
    Skill = 16,
    Commodity = 17,
    Drone = 18,
    Implant = 20,
    Deployable = 22,
    Structure = 23,
    Reaction = 24,
    Asteroid = 25,
    PlanetaryCommodities = 43,
    PlanetaryResources = 42,
}

/** Item flags — where the item is located on a ship/station. */
export enum ItemFlag {
    None = 0,
    Hangar = 4,
    Cargo = 5,
    LoSlot0 = 11,      // low power slots 0-7
    LoSlot7 = 18,
    MedSlot0 = 19,     // medium power slots 0-7
    MedSlot7 = 26,
    HiSlot0 = 27,      // high power slots 0-7
    HiSlot7 = 34,
    SkillFlag = 61,
    SkillInTraining = 61,
    DroneBay = 87,
    Implant = 89,
    ShipHangar = 90,
    SpecializedOreHold = 133,
    SpecializedAmmoHold = 143,
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Static item type definition (from SDE/database).
 */
export interface ItemType {
    typeID: number
    name: string
    groupID: number
    categoryID: ItemCategory
    mass: number
    volume: number
    capacity: number              // cargo capacity (for containers)
    basePrice: number
    portionSize: number           // reprocessing batch size
    published: boolean

    // Base attributes for this type
    baseAttributes: Record<number, number>
}

/**
 * A single item instance in the game world.
 */
export interface InventoryItem {
    itemID: number // long in C#, number (safe integer) or string in TS? keeping number for now
    typeID: number
    ownerID: number
    locationID: number
    flag: ItemFlag
    quantity: number
    singleton: boolean          // true = unique item (fitted module, ship), not stackable

    // Reference to static data (optional, populated on load)
    type?: ItemType

    // Dynamic attributes (override base type attributes)
    attributes?: Record<number, number>
}

/**
 * A container that holds items (cargo bay, hangar, etc.).
 */
export interface InventoryContainerData {
    containerID: number
    maxCapacity: number       // 0 = unlimited
    items: Record<number, InventoryItem>
}
