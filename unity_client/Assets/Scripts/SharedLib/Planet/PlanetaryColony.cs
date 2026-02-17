// ============================================================================
// PlanetaryColony.cs — Ported from EvEmu planet/Colony.cpp + Colony.h
//
// Planetary Interaction: extractors, processors, storage, routes.
// Colony lifecycle: place pins → set routes → run extraction → process → export.
// ============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Planet
{
    // ========================================================================
    // ENUMS — from Colony.h pin types
    // ========================================================================

    public enum PinType
    {
        CommandCenter = 0,
        Extractor = 1,
        BasicProcessor = 2,
        AdvancedProcessor = 3,
        HighTechProcessor = 4,
        Storage = 5,
        Launchpad = 6,          // storage + export capability
    }

    public enum PlanetResourceType
    {
        // P0 raw resources (extracted from planet)
        AqueousLiquids = 2268,
        Autotrophs = 2305,
        BaseMetals = 2267,
        CarbonCompounds = 2288,
        ComplexOrganisms = 2287,
        FelsicMagma = 2307,
        HeavyMetals = 2272,
        IonicSolutions = 2309,
        MicroOrganisms = 2073,
        NobleGas = 2310,
        NobleMetals = 2270,
        PlankticColonies = 2286,
        ReactiveGas = 2311,
        SuspendedPlasma = 2308,
        NonCSCrystals = 2306,
    }

    public enum ColonyLevel
    {
        Level1 = 1,     // 1 extractor, basic processor
        Level2 = 2,     // 2 extractors
        Level3 = 3,     // advanced processors
        Level4 = 4,     // high-tech processors
        Level5 = 5,     // full chain
    }

    // ========================================================================
    // DATA STRUCTURES — from Colony.h
    // ========================================================================

    /// <summary>
    /// A pin (building) on a planet.
    /// Source: Colony.h pinData / PlanetPin
    /// </summary>
    public class PlanetPin
    {
        public long PinID;
        public PinType Type;
        public float Latitude;              // planet surface coords
        public float Longitude;
        public int SchematicID;             // what this processes (if processor)

        // Extractor specific
        public int ResourceTypeID;           // what resource to extract
        public float ExtractionRate;         // units per cycle
        public int CycleTime;               // seconds per cycle
        public int HeadCount;               // number of extractor heads

        // Storage
        public float StorageCapacity;
        public Dictionary<int, int> Contents = new(); // typeID → quantity

        // State
        public bool IsActive;
        public long LastRunTime;
        public long InstallTime;
    }

    /// <summary>
    /// A route between two pins.
    /// Source: Colony.h routeData
    /// </summary>
    public struct PlanetRoute
    {
        public long RouteID;
        public long SourcePinID;
        public long DestinationPinID;
        public int CommodityTypeID;
        public int Quantity;                 // per transfer
    }

    /// <summary>
    /// Processing schematic — defines inputs/outputs.
    /// Source: planetSchematics table
    /// </summary>
    public class ProcessingSchematic
    {
        public int SchematicID;
        public string Name;
        public int CycleTime;               // seconds
        public List<(int typeID, int quantity)> Inputs = new();
        public (int typeID, int quantity) Output;
    }

    // ========================================================================
    // PLANETARY COLONY — main logic
    // ========================================================================

    /// <summary>
    /// Manages a player's colony on a planet.
    /// Source: EvEmu planet/Colony.cpp
    /// </summary>
    public class PlanetaryColony
    {
        public int CharacterID;
        public int PlanetID;
        public int PlanetTypeID;
        public ColonyLevel Level = ColonyLevel.Level1;

        private readonly Dictionary<long, PlanetPin> _pins = new();
        private readonly List<PlanetRoute> _routes = new();
        private readonly Dictionary<int, ProcessingSchematic> _schematics = new();
        private long _nextPinID = 1;
        private long _nextRouteID = 1;

        // Events
        public event Action<PlanetPin> OnPinPlaced;
        public event Action<PlanetPin, Dictionary<int, int>> OnExtracted;
        public event Action<PlanetPin, int, int> OnProcessed; // pin, outputType, outputQty
        public event Action<int, int> OnExported;              // typeID, quantity

        // ====================================================================
        // LIMITS — from Colony.h colony level logic
        // ====================================================================

        public int MaxPins => Level switch
        {
            ColonyLevel.Level1 => 6,
            ColonyLevel.Level2 => 8,
            ColonyLevel.Level3 => 10,
            ColonyLevel.Level4 => 14,
            ColonyLevel.Level5 => 18,
            _ => 6
        };

        public float CPUOutput => Level switch
        {
            ColonyLevel.Level1 => 1675,
            ColonyLevel.Level2 => 7057,
            ColonyLevel.Level3 => 12136,
            ColonyLevel.Level4 => 17215,
            ColonyLevel.Level5 => 21315,
            _ => 1675
        };

        public float PowerOutput => Level switch
        {
            ColonyLevel.Level1 => 6000,
            ColonyLevel.Level2 => 9000,
            ColonyLevel.Level3 => 12000,
            ColonyLevel.Level4 => 15000,
            ColonyLevel.Level5 => 17000,
            _ => 6000
        };

        // ====================================================================
        // QUERIES
        // ====================================================================

        public IReadOnlyDictionary<long, PlanetPin> Pins => _pins;
        public IReadOnlyList<PlanetRoute> Routes => _routes;

        public void RegisterSchematic(ProcessingSchematic schematic)
            => _schematics[schematic.SchematicID] = schematic;

        // ====================================================================
        // PIN MANAGEMENT — from Colony::CreatePin
        // ====================================================================

        /// <summary>Place a new pin on the planet.</summary>
        public PlanetPin PlacePin(PinType type, float lat, float lon)
        {
            if (_pins.Count >= MaxPins) return null;

            // Only one Command Center allowed
            if (type == PinType.CommandCenter &&
                _pins.Values.Any(p => p.Type == PinType.CommandCenter))
                return null;

            var pin = new PlanetPin
            {
                PinID = _nextPinID++,
                Type = type,
                Latitude = lat,
                Longitude = lon,
                StorageCapacity = GetStorageCapacity(type),
                InstallTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            };

            _pins[pin.PinID] = pin;
            OnPinPlaced?.Invoke(pin);
            return pin;
        }

        /// <summary>Remove a pin and its routes.</summary>
        public bool RemovePin(long pinID)
        {
            if (!_pins.Remove(pinID)) return false;
            _routes.RemoveAll(r => r.SourcePinID == pinID || r.DestinationPinID == pinID);
            return true;
        }

        /// <summary>Configure an extractor pin.</summary>
        public bool ConfigureExtractor(long pinID, int resourceTypeID, int headCount, int cycleTime)
        {
            if (!_pins.TryGetValue(pinID, out var pin)) return false;
            if (pin.Type != PinType.Extractor) return false;

            pin.ResourceTypeID = resourceTypeID;
            pin.HeadCount = Math.Clamp(headCount, 1, 10);
            pin.CycleTime = Math.Max(900, cycleTime);   // min 15 min cycle
            pin.ExtractionRate = CalculateExtractionRate(headCount, cycleTime);
            return true;
        }

        /// <summary>Set processing schematic on a processor pin.</summary>
        public bool SetSchematic(long pinID, int schematicID)
        {
            if (!_pins.TryGetValue(pinID, out var pin)) return false;
            if (pin.Type is not (PinType.BasicProcessor or PinType.AdvancedProcessor
                or PinType.HighTechProcessor)) return false;
            if (!_schematics.ContainsKey(schematicID)) return false;

            pin.SchematicID = schematicID;
            return true;
        }

        // ====================================================================
        // ROUTES — from Colony::CreateRoute / Colony::DeleteRoute
        // ====================================================================

        /// <summary>Create a route between two pins.</summary>
        public long CreateRoute(long sourcePinID, long destPinID, int commodityTypeID, int quantity)
        {
            if (!_pins.ContainsKey(sourcePinID) || !_pins.ContainsKey(destPinID))
                return -1;
            if (sourcePinID == destPinID) return -1;

            var route = new PlanetRoute
            {
                RouteID = _nextRouteID++,
                SourcePinID = sourcePinID,
                DestinationPinID = destPinID,
                CommodityTypeID = commodityTypeID,
                Quantity = quantity,
            };

            _routes.Add(route);
            return route.RouteID;
        }

        /// <summary>Delete a route.</summary>
        public bool DeleteRoute(long routeID)
        {
            int idx = _routes.FindIndex(r => r.RouteID == routeID);
            if (idx < 0) return false;
            _routes.RemoveAt(idx);
            return true;
        }

        // ====================================================================
        // SIMULATION — from Colony::ProcessPins / Colony::Update
        // ====================================================================

        /// <summary>
        /// Run one simulation cycle for ALL active pins.
        /// Source: Colony::Update — called periodically
        /// </summary>
        public void Simulate(long currentTime)
        {
            // 1. Run extractors
            foreach (var pin in _pins.Values.Where(p => p.Type == PinType.Extractor && p.IsActive))
            {
                if (currentTime - pin.LastRunTime < pin.CycleTime) continue;

                int extracted = (int)pin.ExtractionRate;
                pin.Contents.TryGetValue(pin.ResourceTypeID, out int existing);
                pin.Contents[pin.ResourceTypeID] = existing + extracted;
                pin.LastRunTime = currentTime;

                OnExtracted?.Invoke(pin, new Dictionary<int, int> { { pin.ResourceTypeID, extracted } });
            }

            // 2. Transfer along routes
            foreach (var route in _routes)
            {
                if (!_pins.TryGetValue(route.SourcePinID, out var src)) continue;
                if (!_pins.TryGetValue(route.DestinationPinID, out var dst)) continue;

                if (!src.Contents.TryGetValue(route.CommodityTypeID, out int available)) continue;
                int transferQty = Math.Min(available, route.Quantity);
                if (transferQty <= 0) continue;

                src.Contents[route.CommodityTypeID] = available - transferQty;
                dst.Contents.TryGetValue(route.CommodityTypeID, out int dstQty);
                dst.Contents[route.CommodityTypeID] = dstQty + transferQty;
            }

            // 3. Run processors
            foreach (var pin in _pins.Values.Where(p =>
                p.Type is PinType.BasicProcessor or PinType.AdvancedProcessor
                    or PinType.HighTechProcessor && p.SchematicID > 0))
            {
                if (!_schematics.TryGetValue(pin.SchematicID, out var schematic)) continue;
                if (currentTime - pin.LastRunTime < schematic.CycleTime) continue;

                // Check inputs
                bool hasAll = schematic.Inputs.All(input =>
                    pin.Contents.TryGetValue(input.typeID, out int qty) && qty >= input.quantity);

                if (!hasAll) continue;

                // Consume inputs
                foreach (var (typeID, qty) in schematic.Inputs)
                    pin.Contents[typeID] -= qty;

                // Produce output
                pin.Contents.TryGetValue(schematic.Output.typeID, out int outQty);
                pin.Contents[schematic.Output.typeID] = outQty + schematic.Output.quantity;
                pin.LastRunTime = currentTime;

                OnProcessed?.Invoke(pin, schematic.Output.typeID, schematic.Output.quantity);
            }
        }

        /// <summary>Start/stop a pin.</summary>
        public void SetPinActive(long pinID, bool active)
        {
            if (_pins.TryGetValue(pinID, out var pin))
            {
                pin.IsActive = active;
                if (active) pin.LastRunTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            }
        }

        /// <summary>Export goods from a launchpad to space.</summary>
        public Dictionary<int, int> ExportFromLaunchpad(long pinID)
        {
            if (!_pins.TryGetValue(pinID, out var pin)) return null;
            if (pin.Type != PinType.Launchpad) return null;

            var exported = new Dictionary<int, int>(pin.Contents);
            pin.Contents.Clear();

            foreach (var (typeID, qty) in exported)
                OnExported?.Invoke(typeID, qty);

            return exported;
        }

        // ====================================================================
        // UTILITY
        // ====================================================================

        private static float GetStorageCapacity(PinType type) => type switch
        {
            PinType.CommandCenter => 500,
            PinType.Storage => 12000,
            PinType.Launchpad => 10000,
            PinType.Extractor => 0,
            _ => 0
        };

        private static float CalculateExtractionRate(int headCount, int cycleTime)
        {
            // More heads = more output, longer cycles = more per cycle but less per hour
            return headCount * 20.0f * (cycleTime / 3600.0f);
        }
    }
}
