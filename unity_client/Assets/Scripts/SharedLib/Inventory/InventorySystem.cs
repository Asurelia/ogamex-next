// ============================================================================
// InventorySystem.cs — Ported from EvEmu inventory/InventoryItem.cpp + Inventory.cpp
//
// Generic item system: items, containers, attributes, stacking, moving.
// Foundation for all other systems (Market, Manufacturing, Ship fitting).
// ============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Inventory
{
    // ========================================================================
    // ENUMS — from EvEmu inventory and AttributeEnum.h
    // ========================================================================

    /// <summary>Item categories — from EVEDB::invCategories</summary>
    public enum ItemCategory
    {
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

    /// <summary>Item flags — where the item is located on a ship/station.</summary>
    public enum ItemFlag
    {
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

    // ========================================================================
    // DATA STRUCTURES
    // ========================================================================

    /// <summary>
    /// Static item type definition (from SDE/database).
    /// </summary>
    public class ItemType
    {
        public int TypeID;
        public string Name;
        public int GroupID;
        public ItemCategory CategoryID;
        public float Mass;
        public float Volume;
        public float Capacity;              // cargo capacity (for containers)
        public float BasePrice;
        public int PortionSize = 1;         // reprocessing batch size
        public bool Published = true;

        // Base attributes for this type
        public Dictionary<int, float> BaseAttributes = new();
    }

    /// <summary>
    /// A single item instance in the game world.
    /// Source: EvEmu InventoryItem class
    /// </summary>
    public class InventoryItem
    {
        public long ItemID;
        public int TypeID;
        public int OwnerID;
        public long LocationID;
        public ItemFlag Flag;
        public int Quantity = 1;
        public bool Singleton;              // true = unique item (fitted module, ship), not stackable

        // Item type reference
        public ItemType Type;

        // Dynamic attributes (override base type attributes)
        private readonly Dictionary<int, float> _attributes = new();

        // ================================================================
        // ATTRIBUTE ACCESS — from InventoryItem + AttributeMap
        // ================================================================

        /// <summary>
        /// Get attribute value, falling back to type base if not overridden.
        /// Source: InventoryItem::GetAttribute
        /// </summary>
        public float GetAttribute(int attrID)
        {
            if (_attributes.TryGetValue(attrID, out var val))
                return val;
            if (Type?.BaseAttributes?.TryGetValue(attrID, out var baseVal) == true)
                return baseVal;
            return 0f;
        }

        /// <summary>
        /// Set a dynamic attribute override.
        /// Source: InventoryItem::SetAttribute
        /// </summary>
        public void SetAttribute(int attrID, float value)
        {
            _attributes[attrID] = value;
        }

        /// <summary>
        /// Check if this item has a specific attribute defined.
        /// </summary>
        public bool HasAttribute(int attrID)
        {
            return _attributes.ContainsKey(attrID) ||
                   (Type?.BaseAttributes?.ContainsKey(attrID) == true);
        }

        /// <summary>
        /// Get all dynamic attributes (for serialization).
        /// </summary>
        public IReadOnlyDictionary<int, float> GetAllAttributes()
        {
            var merged = new Dictionary<int, float>(Type?.BaseAttributes ?? new());
            foreach (var (k, v) in _attributes)
                merged[k] = v;
            return merged;
        }

        // ================================================================
        // ITEM PROPERTIES
        // ================================================================

        public bool IsStackable => !Singleton && Quantity > 0;
        public float TotalVolume => (Type?.Volume ?? 0) * Quantity;
        public string Name => Type?.Name ?? $"Unknown #{TypeID}";
    }

    // ========================================================================
    // INVENTORY CONTAINER
    // ========================================================================

    /// <summary>
    /// A container that holds items (cargo bay, hangar, etc.).
    /// Source: EvEmu Inventory class
    /// </summary>
    public class InventoryContainer
    {
        public long ContainerID;
        public float MaxCapacity;               // 0 = unlimited (station hangar)
        private readonly Dictionary<long, InventoryItem> _items = new();

        // Events
        public event Action<InventoryItem> OnItemAdded;
        public event Action<InventoryItem> OnItemRemoved;
        public event Action<InventoryItem> OnItemChanged;

        // ================================================================
        // QUERIES
        // ================================================================

        public IReadOnlyDictionary<long, InventoryItem> Items => _items;
        public int ItemCount => _items.Count;

        public float UsedCapacity => _items.Values.Sum(i => i.TotalVolume);
        public float FreeCapacity => MaxCapacity <= 0 ? float.MaxValue : MaxCapacity - UsedCapacity;

        /// <summary>Get all items of a specific type.</summary>
        public IEnumerable<InventoryItem> GetByType(int typeID)
            => _items.Values.Where(i => i.TypeID == typeID);

        /// <summary>Get all items in a specific flag/slot.</summary>
        public IEnumerable<InventoryItem> GetByFlag(ItemFlag flag)
            => _items.Values.Where(i => i.Flag == flag);

        /// <summary>Get all items of a specific category.</summary>
        public IEnumerable<InventoryItem> GetByCategory(ItemCategory cat)
            => _items.Values.Where(i => i.Type?.CategoryID == cat);

        // ================================================================
        // ADD / REMOVE
        // ================================================================

        /// <summary>
        /// Add an item to this container.
        /// If stackable and a matching stack exists, merge quantities.
        /// Source: Inventory::AddItem logic
        /// </summary>
        public bool AddItem(InventoryItem item)
        {
            // Check capacity
            if (MaxCapacity > 0 && item.TotalVolume > FreeCapacity)
                return false;

            // Try to stack with existing
            if (item.IsStackable)
            {
                var existing = _items.Values.FirstOrDefault(i =>
                    i.TypeID == item.TypeID &&
                    i.Flag == item.Flag &&
                    i.IsStackable);

                if (existing != null)
                {
                    existing.Quantity += item.Quantity;
                    OnItemChanged?.Invoke(existing);
                    return true;
                }
            }

            item.LocationID = ContainerID;
            _items[item.ItemID] = item;
            OnItemAdded?.Invoke(item);
            return true;
        }

        /// <summary>
        /// Remove an item entirely from this container.
        /// </summary>
        public bool RemoveItem(long itemID)
        {
            if (_items.Remove(itemID, out var removed))
            {
                OnItemRemoved?.Invoke(removed);
                return true;
            }
            return false;
        }

        /// <summary>
        /// Remove a quantity from a stackable item. If quantity = all, remove item.
        /// </summary>
        public InventoryItem RemoveQuantity(long itemID, int quantity)
        {
            if (!_items.TryGetValue(itemID, out var item)) return null;

            if (quantity >= item.Quantity)
            {
                RemoveItem(itemID);
                return item;
            }

            item.Quantity -= quantity;
            OnItemChanged?.Invoke(item);

            // Return a new item representing the removed quantity
            return new InventoryItem
            {
                ItemID = -1,    // needs new ID assignment
                TypeID = item.TypeID,
                OwnerID = item.OwnerID,
                LocationID = item.LocationID,
                Flag = item.Flag,
                Quantity = quantity,
                Singleton = false,
                Type = item.Type
            };
        }

        // ================================================================
        // STACK / SPLIT / MOVE
        // ================================================================

        /// <summary>
        /// Split a stack into two. Returns the new split-off item.
        /// </summary>
        public InventoryItem SplitStack(long itemID, int splitQuantity)
        {
            if (!_items.TryGetValue(itemID, out var item)) return null;
            if (item.Singleton || splitQuantity >= item.Quantity || splitQuantity <= 0) return null;

            item.Quantity -= splitQuantity;
            OnItemChanged?.Invoke(item);

            var newItem = new InventoryItem
            {
                ItemID = GenerateItemID(),
                TypeID = item.TypeID,
                OwnerID = item.OwnerID,
                LocationID = ContainerID,
                Flag = item.Flag,
                Quantity = splitQuantity,
                Singleton = false,
                Type = item.Type
            };

            _items[newItem.ItemID] = newItem;
            OnItemAdded?.Invoke(newItem);
            return newItem;
        }

        /// <summary>
        /// Merge two stacks of the same type.
        /// </summary>
        public bool MergeStacks(long sourceID, long targetID)
        {
            if (!_items.TryGetValue(sourceID, out var source)) return false;
            if (!_items.TryGetValue(targetID, out var target)) return false;
            if (source.TypeID != target.TypeID) return false;
            if (source.Singleton || target.Singleton) return false;

            target.Quantity += source.Quantity;
            _items.Remove(sourceID);
            OnItemRemoved?.Invoke(source);
            OnItemChanged?.Invoke(target);
            return true;
        }

        /// <summary>
        /// Move an item to a different flag/slot within this container.
        /// </summary>
        public bool ChangeFlag(long itemID, ItemFlag newFlag)
        {
            if (!_items.TryGetValue(itemID, out var item)) return false;
            item.Flag = newFlag;
            OnItemChanged?.Invoke(item);
            return true;
        }

        // ================================================================
        // TRANSFER BETWEEN CONTAINERS
        // ================================================================

        /// <summary>
        /// Transfer an item from this container to another.
        /// </summary>
        public bool TransferTo(long itemID, InventoryContainer target, int quantity = -1)
        {
            if (!_items.TryGetValue(itemID, out var item)) return false;

            if (quantity > 0 && quantity < item.Quantity && item.IsStackable)
            {
                // Partial transfer
                var split = RemoveQuantity(itemID, quantity);
                if (split == null) return false;
                split.ItemID = GenerateItemID();
                return target.AddItem(split);
            }

            // Full transfer
            if (!target.AddItem(item)) return false;
            _items.Remove(itemID);
            OnItemRemoved?.Invoke(item);
            return true;
        }

        // ================================================================
        // UTILITY
        // ================================================================

        private static long _nextItemID = 1000000;
        public static long GenerateItemID() => System.Threading.Interlocked.Increment(ref _nextItemID);

        /// <summary>
        /// Load an item (from database restoration).
        /// </summary>
        public void LoadItem(InventoryItem item)
        {
            item.LocationID = ContainerID;
            _items[item.ItemID] = item;
        }
    }

    // ========================================================================
    // ITEM FACTORY — from EvEmu ItemFactory
    // ========================================================================

    /// <summary>
    /// Factory for creating and managing items.
    /// Source: EvEmu inventory/ItemFactory.cpp
    /// </summary>
    public class ItemFactory
    {
        private readonly Dictionary<int, ItemType> _types = new();

        /// <summary>Register a type definition (from SDE).</summary>
        public void RegisterType(ItemType type)
        {
            _types[type.TypeID] = type;
        }

        /// <summary>Get a type by ID.</summary>
        public ItemType GetType(int typeID)
        {
            return _types.GetValueOrDefault(typeID);
        }

        /// <summary>
        /// Create a new item instance.
        /// Source: InventoryItem::Spawn
        /// </summary>
        public InventoryItem CreateItem(int typeID, int ownerID, long locationID,
                                         ItemFlag flag = ItemFlag.Hangar,
                                         int quantity = 1, bool singleton = false)
        {
            var type = GetType(typeID);
            if (type == null) return null;

            return new InventoryItem
            {
                ItemID = InventoryContainer.GenerateItemID(),
                TypeID = typeID,
                OwnerID = ownerID,
                LocationID = locationID,
                Flag = flag,
                Quantity = quantity,
                Singleton = singleton,
                Type = type
            };
        }

        /// <summary>
        /// Create a singleton item (unique, non-stackable — typical for ships/modules).
        /// </summary>
        public InventoryItem CreateSingleton(int typeID, int ownerID, long locationID,
                                              ItemFlag flag = ItemFlag.Hangar)
        {
            return CreateItem(typeID, ownerID, locationID, flag, 1, true);
        }

        /// <summary>Get all registered types.</summary>
        public IReadOnlyDictionary<int, ItemType> AllTypes => _types;

        /// <summary>Get types by category.</summary>
        public IEnumerable<ItemType> GetTypesByCategory(ItemCategory category)
            => _types.Values.Where(t => t.CategoryID == category);
    }
}
