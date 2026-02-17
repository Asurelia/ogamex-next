// =============================================================================
// MoonSystem.cs — Moon system types, constants, and utilities
// Port of: src/lib/moons/types.ts + src/lib/moons/constants.ts + src/lib/moons/MoonService.ts
// Namespace: OGameX.SharedLib.Moon
// =============================================================================

using System;
using System.Collections.Generic;

namespace OGameX.SharedLib.Moon
{
    // =========================================================================
    // ENUMS & CONSTANTS
    // =========================================================================

    /// <summary>
    /// Lunar building keys.
    /// </summary>
    public enum LunarBuildingKey
    {
        LunarBase,
        SensorPhalanx,
        JumpGate,
        MetalStorage,
        CrystalStorage,
        DeuteriumTank,
        RobotFactory,
        Shipyard,
    }

    /// <summary>
    /// Moon creation constants.
    /// </summary>
    public static class MoonCreationConstants
    {
        /// <summary>Minimum moon diameter in km</summary>
        public const int MinDiameter = 2000;

        /// <summary>Maximum moon diameter in km</summary>
        public const int MaxDiameter = 8000;

        /// <summary>Fields per 1000km of diameter</summary>
        public const int FieldsPer1000Km = 1;

        /// <summary>Moon chance percentage per 100k debris (metal + crystal)</summary>
        public const int ChancePer100KDebris = 1;

        /// <summary>Maximum moon creation chance (20%)</summary>
        public const int MaxChance = 20;

        /// <summary>Default moon name</summary>
        public const string DefaultName = "Moon";

        /// <summary>Moon temperature min</summary>
        public const int TempMin = -40;

        /// <summary>Moon temperature max</summary>
        public const int TempMax = -20;
    }

    /// <summary>
    /// Lunar Base constants.
    /// </summary>
    public static class LunarBaseConstants
    {
        public const int BuildingId = 41;
        public const int FieldsPerLevel = 3;
        public const int BaseCostMetal = 20000;
        public const int BaseCostCrystal = 40000;
        public const int BaseCostDeuterium = 20000;
        public const double CostFactor = 2.0;
    }

    /// <summary>
    /// Sensor Phalanx constants.
    /// </summary>
    public static class SensorPhalanxConstants
    {
        public const int BuildingId = 42;
        public const int DeuteriumCostPerScan = 5000;
        public const int BaseCostMetal = 20000;
        public const int BaseCostCrystal = 40000;
        public const int BaseCostDeuterium = 20000;
        public const double CostFactor = 2.0;
        public const int RequiredLunarBase = 1;

        /// <summary>
        /// Calculate phalanx range in systems.
        /// Formula: level^2 - 1
        /// </summary>
        public static int CalculateRange(int level)
        {
            if (level <= 0) return 0;
            return level * level - 1;
        }
    }

    /// <summary>
    /// Jump Gate constants.
    /// </summary>
    public static class JumpGateConstants
    {
        public const int BuildingId = 43;
        public const int CooldownHours = 1;
        public const int CooldownMs = 60 * 60 * 1000;
        public const int CooldownSeconds = 60 * 60;
        public const int BaseCostMetal = 2000000;
        public const int BaseCostCrystal = 4000000;
        public const int BaseCostDeuterium = 2000000;
        public const double CostFactor = 2.0;
        public const int RequiredLunarBase = 1;
        public const int RequiredHyperspaceTech = 7;
        public const int FuelCost = 0;
        public const int TravelTime = 0;
        public const bool CanTransferResources = false;
    }

    /// <summary>
    /// Moon destruction constants.
    /// </summary>
    public static class MoonDestructionConstants
    {
        /// <summary>Maximum moon destruction chance</summary>
        public const double MaxMoonDestroyChance = 100.0;

        /// <summary>Maximum RIP destruction chance</summary>
        public const double MaxRipDestroyChance = 100.0;

        /// <summary>
        /// Calculate moon destruction chance.
        /// Formula: (100 - sqrt(diameter)) * ripsCount / 100
        ///
        /// Examples:
        /// - 8000km moon, 1 RIP: (100 - 89.44) * 1 / 100 = 10.56%
        /// - 8000km moon, 5 RIPs: (100 - 89.44) * 5 / 100 = 52.8%
        /// - 2000km moon, 1 RIP: (100 - 44.72) * 1 / 100 = 55.28%
        /// </summary>
        public static double MoonDestroyChance(int diameter, int ripsCount)
        {
            double sqrtDiameter = Math.Sqrt(diameter);
            return Math.Min(MaxMoonDestroyChance, Math.Max(0, ((100 - sqrtDiameter) * ripsCount) / 100));
        }

        /// <summary>
        /// Calculate RIP destruction chance.
        /// Formula: sqrt(diameter) / 2
        ///
        /// Examples:
        /// - 8000km moon: sqrt(8000) / 2 = 44.72%
        /// - 2000km moon: sqrt(2000) / 2 = 22.36%
        /// </summary>
        public static double RipDestroyChance(int diameter)
        {
            return Math.Sqrt(diameter) / 2;
        }
    }

    /// <summary>
    /// Phalanx scanning constants.
    /// </summary>
    public static class PhalanxConstants
    {
        /// <summary>Deuterium cost per scan</summary>
        public const int ScanCost = 5000;

        /// <summary>Cannot scan own planets</summary>
        public const bool CanScanOwn = false;

        /// <summary>Cannot scan moons (only planets)</summary>
        public const bool CanScanMoons = false;
    }

    // =========================================================================
    // TYPES
    // =========================================================================

    /// <summary>
    /// Moon entity - stored in planets table with planet_type='moon'.
    /// Moons have no production, only storage and special buildings.
    /// </summary>
    public class MoonData
    {
        public string Id { get; set; } = "";
        public string PlanetId { get; set; } = "";
        public string UserId { get; set; } = "";
        public string Name { get; set; } = "";

        // Location (same as parent planet)
        public int Galaxy { get; set; }
        public int System { get; set; }
        public int Position { get; set; }

        // Physical properties
        public int Diameter { get; set; }
        public int Fields { get; set; }
        public int FieldsUsed { get; set; }

        // Lunar-exclusive buildings
        public int LunarBase { get; set; }
        public int SensorPhalanx { get; set; }
        public int JumpGate { get; set; }

        // Storage buildings
        public int MetalStorage { get; set; }
        public int CrystalStorage { get; set; }
        public int DeuteriumTank { get; set; }

        // Resources (no production, only storage)
        public double Metal { get; set; }
        public double Crystal { get; set; }
        public double Deuterium { get; set; }

        // Ships stationed on moon
        public Dictionary<string, int> Ships { get; set; } = new();

        // Jump gate cooldown
        public DateTime? JumpGateCooldown { get; set; }

        // Timestamps
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        /// <summary>Format coordinates string</summary>
        public string FormatCoordinates() => $"[{Galaxy}:{System}:{Position}]";
    }

    /// <summary>
    /// Result of a moon creation attempt.
    /// </summary>
    public class MoonCreationResult
    {
        public bool Success { get; set; }
        public bool MoonCreated { get; set; }
        public string? MoonId { get; set; }
        public int? Diameter { get; set; }
        public int? Fields { get; set; }
        public double Chance { get; set; }
        public string? Error { get; set; }
    }

    /// <summary>
    /// Fleet movement detected by phalanx scan.
    /// </summary>
    public class FleetMovement
    {
        public string MissionId { get; set; } = "";
        public string MissionType { get; set; } = "";

        // Origin
        public int OriginGalaxy { get; set; }
        public int OriginSystem { get; set; }
        public int OriginPosition { get; set; }
        public string OriginPlanetType { get; set; } = "planet";

        // Destination
        public int DestinationGalaxy { get; set; }
        public int DestinationSystem { get; set; }
        public int DestinationPosition { get; set; }
        public string DestinationPlanetType { get; set; } = "planet";

        // Ships
        public Dictionary<string, int> Ships { get; set; } = new();

        // Timing
        public DateTime DepartedAt { get; set; }
        public DateTime ArrivesAt { get; set; }
        public DateTime? ReturnsAt { get; set; }
        public bool IsReturning { get; set; }

        /// <summary>Format origin coordinates</summary>
        public string FormatOrigin() => $"[{OriginGalaxy}:{OriginSystem}:{OriginPosition}]";

        /// <summary>Format destination coordinates</summary>
        public string FormatDestination() => $"[{DestinationGalaxy}:{DestinationSystem}:{DestinationPosition}]";
    }

    /// <summary>
    /// Result of a phalanx scan.
    /// </summary>
    public class PhalanxScanResult
    {
        public bool Success { get; set; }
        public string TargetPlanetId { get; set; } = "";
        public string TargetCoordinates { get; set; } = "";
        public List<FleetMovement> Fleets { get; set; } = new();
        public int DeuteriumCost { get; set; }
        public string? Error { get; set; }
    }

    /// <summary>
    /// Jump gate transfer request.
    /// </summary>
    public class JumpGateTransferRequest
    {
        public string SourceMoonId { get; set; } = "";
        public string TargetMoonId { get; set; } = "";
        public Dictionary<string, int> Ships { get; set; } = new();
    }

    /// <summary>
    /// Jump gate transfer result.
    /// </summary>
    public class JumpGateTransferResult
    {
        public bool Success { get; set; }
        public string SourceMoonId { get; set; } = "";
        public string TargetMoonId { get; set; } = "";
        public Dictionary<string, int> Ships { get; set; } = new();
        public DateTime CooldownUntil { get; set; }
        public string? Error { get; set; }
    }

    /// <summary>
    /// Jump gate status.
    /// </summary>
    public class JumpGateStatus
    {
        public string MoonId { get; set; } = "";
        public bool HasJumpGate { get; set; }
        public int Level { get; set; }
        public bool IsOnCooldown { get; set; }
        public DateTime? CooldownUntil { get; set; }
        public int CooldownRemainingSeconds { get; set; }
    }

    /// <summary>
    /// Result of a moon destruction attempt (RIP attack).
    /// </summary>
    public class MoonDestructionResult
    {
        public bool Success { get; set; }
        public bool MoonDestroyed { get; set; }
        public int RipsDestroyed { get; set; }
        public int RipsRemaining { get; set; }
        public double MoonDestroyChance { get; set; }
        public double RipDestroyChance { get; set; }
        public bool FleetSurvived { get; set; }
        public string? Error { get; set; }
    }

    /// <summary>
    /// Moon destruction chances calculation.
    /// </summary>
    public class MoonDestructionChances
    {
        public double MoonDestroyChance { get; set; }
        public double RipDestroyChance { get; set; }
    }

    // =========================================================================
    // MOON CALCULATOR
    // =========================================================================

    /// <summary>
    /// Moon calculation utilities.
    /// </summary>
    public static class MoonCalculator
    {
        private static readonly Random _random = new();

        /// <summary>
        /// Calculate moon diameter (random within range).
        /// </summary>
        public static int CalculateMoonDiameter()
        {
            int range = MoonCreationConstants.MaxDiameter - MoonCreationConstants.MinDiameter;
            return MoonCreationConstants.MinDiameter + _random.Next(range + 1);
        }

        /// <summary>
        /// Calculate moon diameter with custom RNG for deterministic testing.
        /// </summary>
        public static int CalculateMoonDiameter(Random rng)
        {
            int range = MoonCreationConstants.MaxDiameter - MoonCreationConstants.MinDiameter;
            return MoonCreationConstants.MinDiameter + rng.Next(range + 1);
        }

        /// <summary>
        /// Calculate moon fields from diameter.
        /// </summary>
        public static int CalculateMoonFields(int diameter)
        {
            return (diameter / 1000) * MoonCreationConstants.FieldsPer1000Km;
        }

        /// <summary>
        /// Calculate moon creation chance from debris.
        /// </summary>
        public static double CalculateMoonChance(double debrisMetal, double debrisCrystal)
        {
            double totalDebris = debrisMetal + debrisCrystal;
            double chance = Math.Floor(totalDebris / 100000) * MoonCreationConstants.ChancePer100KDebris;
            return Math.Min(chance, MoonCreationConstants.MaxChance);
        }

        /// <summary>
        /// Calculate phalanx range in systems.
        /// </summary>
        public static int CalculatePhalanxRange(int level)
        {
            return SensorPhalanxConstants.CalculateRange(level);
        }

        /// <summary>
        /// Check if a planet is within phalanx range.
        /// </summary>
        public static bool IsInPhalanxRange(
            int moonGalaxy, int moonSystem,
            int targetGalaxy, int targetSystem,
            int phalanxLevel)
        {
            // Must be in same galaxy
            if (moonGalaxy != targetGalaxy)
                return false;

            int range = CalculatePhalanxRange(phalanxLevel);
            int systemDistance = Math.Abs(moonSystem - targetSystem);

            return systemDistance <= range;
        }

        /// <summary>
        /// Calculate lunar base fields bonus.
        /// </summary>
        public static int CalculateLunarBaseFieldsBonus(int level)
        {
            return level * LunarBaseConstants.FieldsPerLevel;
        }

        /// <summary>
        /// Calculate total moon fields (base + lunar base bonus).
        /// </summary>
        public static int CalculateTotalMoonFields(int baseDiameter, int lunarBaseLevel)
        {
            int baseFields = CalculateMoonFields(baseDiameter);
            int bonusFields = CalculateLunarBaseFieldsBonus(lunarBaseLevel);
            return baseFields + bonusFields;
        }

        /// <summary>
        /// Calculate moon destruction chances.
        /// </summary>
        public static MoonDestructionChances CalculateDestructionChances(int diameter, int ripsCount)
        {
            return new MoonDestructionChances
            {
                MoonDestroyChance = MoonDestructionConstants.MoonDestroyChance(diameter, ripsCount),
                RipDestroyChance = MoonDestructionConstants.RipDestroyChance(diameter),
            };
        }

        /// <summary>
        /// Get jump gate status.
        /// </summary>
        public static JumpGateStatus GetJumpGateStatus(MoonData moon)
        {
            long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            long cooldownUntil = moon.JumpGateCooldown.HasValue
                ? new DateTimeOffset(moon.JumpGateCooldown.Value).ToUnixTimeMilliseconds()
                : 0;

            bool isOnCooldown = cooldownUntil > now;
            int cooldownRemainingSeconds = isOnCooldown
                ? (int)Math.Ceiling((cooldownUntil - now) / 1000.0)
                : 0;

            return new JumpGateStatus
            {
                MoonId = moon.Id,
                HasJumpGate = moon.JumpGate > 0,
                Level = moon.JumpGate,
                IsOnCooldown = isOnCooldown,
                CooldownUntil = moon.JumpGateCooldown,
                CooldownRemainingSeconds = cooldownRemainingSeconds,
            };
        }
    }

    // =========================================================================
    // BUILDING AVAILABILITY
    // =========================================================================

    /// <summary>
    /// Building availability on moons.
    /// </summary>
    public static class MoonBuildingAvailability
    {
        /// <summary>All lunar building keys</summary>
        public static readonly LunarBuildingKey[] LunarBuildingKeys =
        {
            LunarBuildingKey.LunarBase,
            LunarBuildingKey.SensorPhalanx,
            LunarBuildingKey.JumpGate,
            LunarBuildingKey.MetalStorage,
            LunarBuildingKey.CrystalStorage,
            LunarBuildingKey.DeuteriumTank,
            LunarBuildingKey.RobotFactory,
            LunarBuildingKey.Shipyard,
        };

        /// <summary>Lunar-exclusive building keys (only available on moons)</summary>
        public static readonly LunarBuildingKey[] LunarExclusiveBuildingKeys =
        {
            LunarBuildingKey.LunarBase,
            LunarBuildingKey.SensorPhalanx,
            LunarBuildingKey.JumpGate,
        };

        /// <summary>Buildings NOT available on moons</summary>
        public static readonly string[] PlanetOnlyBuildings =
        {
            "metal_mine",
            "crystal_mine",
            "deuterium_synthesizer",
            "solar_plant",
            "fusion_plant",
            "research_lab",
            "terraformer",
            "alliance_depot",
            "missile_silo",
            "space_dock",
            "nanite_factory",
        };

        /// <summary>
        /// Check if a building can be built on a moon.
        /// </summary>
        public static bool CanBuildOnMoon(string buildingKey)
        {
            return Array.IndexOf(PlanetOnlyBuildings, buildingKey) == -1;
        }

        /// <summary>
        /// Check if a building is lunar-exclusive.
        /// </summary>
        public static bool IsLunarExclusive(string buildingKey)
        {
            return buildingKey == "lunar_base" ||
                   buildingKey == "sensor_phalanx" ||
                   buildingKey == "jump_gate";
        }
    }
}
