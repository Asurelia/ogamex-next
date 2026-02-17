// =============================================================================
// ResourceCalculator.cs — Ported from OGameX src/lib/game/resource-calculator.ts
// Real-time resource accumulation, queue processing, and ID→key mappings
// =============================================================================

using System;
using System.Collections.Generic;

namespace OGameX.SharedLib.Game
{
    // =========================================================================
    // PLANET DATA
    // =========================================================================

    /// <summary>
    /// Complete planet state used for resource calculations.
    /// Ported from PlanetData interface in resource-calculator.ts.
    /// </summary>
    public class PlanetData
    {
        public string Id;
        public string UserId;

        // Resources
        public double Metal;
        public double Crystal;
        public double Deuterium;

        // Production rates (per hour)
        public double MetalPerHour;
        public double CrystalPerHour;
        public double DeuteriumPerHour;

        // Storage caps
        public double MetalMax;
        public double CrystalMax;
        public double DeuteriumMax;

        // Building levels
        public int MetalMine;
        public int CrystalMine;
        public int DeuteriumSynthesizer;
        public int SolarPlant;
        public int FusionPlant;
        public int MetalStorage;
        public int CrystalStorage;
        public int DeuteriumTank;
        public int RobotFactory;
        public int NaniteFactory;
        public int Shipyard;
        public int ResearchLab;
        public int SolarSatellite;

        // Environment
        public int TempMax;
        public int EnergyUsed;
        public int EnergyMax;
        public int FieldsUsed;

        // Timestamp
        public DateTime LastResourceUpdate;
    }

    // =========================================================================
    // QUEUE ITEMS
    // =========================================================================

    public class BuildingQueueItem
    {
        public string Id;
        public string PlanetId;
        public int BuildingId;
        public int TargetLevel;
        public DateTime EndsAt;
    }

    public enum UnitType { Ship, Defense }

    public class UnitQueueItem
    {
        public string Id;
        public string PlanetId;
        public int UnitId;
        public UnitType UnitType;
        public int Amount;
        public int AmountCompleted;
        public DateTime EndsAt;
    }

    public class ResearchQueueItem
    {
        public string Id;
        public string UserId;
        public int ResearchId;
        public int TargetLevel;
        public DateTime EndsAt;
    }

    // =========================================================================
    // STAR EFFECTS
    // =========================================================================

    public struct StarEffectMultipliers
    {
        public double MetalMultiplier;
        public double CrystalMultiplier;
        public double DeuteriumMultiplier;
        public double EnergyMultiplier;

        public static StarEffectMultipliers Default => new StarEffectMultipliers
        {
            MetalMultiplier = 1.0,
            CrystalMultiplier = 1.0,
            DeuteriumMultiplier = 1.0,
            EnergyMultiplier = 1.0,
        };
    }

    // =========================================================================
    // ID → KEY MAPPINGS (from resource-calculator.ts)
    // =========================================================================

    /// <summary>
    /// Maps numeric IDs to their database column keys.
    /// </summary>
    public static class GameKeyMappings
    {
        public static readonly Dictionary<int, string> ShipKeys = new Dictionary<int, string>
        {
            { 1, "light_fighter" },
            { 2, "heavy_fighter" },
            { 3, "cruiser" },
            { 4, "battleship" },
            { 5, "battlecruiser" },
            { 6, "bomber" },
            { 7, "destroyer" },
            { 8, "deathstar" },
            { 9, "small_cargo" },
            { 10, "large_cargo" },
            { 11, "colony_ship" },
            { 12, "recycler" },
            { 13, "espionage_probe" },
            { 14, "solar_satellite" },
            { 15, "crawler" },
            { 16, "reaper" },
            { 17, "pathfinder" },
        };

        public static readonly Dictionary<int, string> DefenseKeys = new Dictionary<int, string>
        {
            { 1, "rocket_launcher" },
            { 2, "light_laser" },
            { 3, "heavy_laser" },
            { 4, "gauss_cannon" },
            { 5, "ion_cannon" },
            { 6, "plasma_turret" },
            { 7, "small_shield_dome" },
            { 8, "large_shield_dome" },
            { 9, "anti_ballistic_missile" },
            { 10, "interplanetary_missile" },
        };

        public static readonly Dictionary<int, string> ResearchKeys = new Dictionary<int, string>
        {
            { 1, "energy_technology" },
            { 2, "laser_technology" },
            { 3, "ion_technology" },
            { 4, "hyperspace_technology" },
            { 5, "plasma_technology" },
            { 6, "combustion_drive" },
            { 7, "impulse_drive" },
            { 8, "hyperspace_drive" },
            { 9, "espionage_technology" },
            { 10, "computer_technology" },
            { 11, "astrophysics" },
            { 12, "intergalactic_research_network" },
            { 13, "graviton_technology" },
            { 14, "weapons_technology" },
            { 15, "shielding_technology" },
            { 16, "armor_technology" },
        };

        public static readonly Dictionary<int, string> BuildingKeys = new Dictionary<int, string>
        {
            { 1, "metal_mine" },
            { 2, "crystal_mine" },
            { 3, "deuterium_synthesizer" },
            { 4, "solar_plant" },
            { 5, "fusion_plant" },
            { 6, "metal_storage" },
            { 7, "crystal_storage" },
            { 8, "deuterium_tank" },
            { 9, "robot_factory" },
            { 10, "nanite_factory" },
            { 11, "shipyard" },
            { 12, "research_lab" },
            { 13, "terraformer" },
            { 14, "alliance_depot" },
            { 15, "missile_silo" },
            { 16, "space_dock" },
        };
    }

    // =========================================================================
    // RESOURCE CALCULATOR — Ported from resource-calculator.ts
    // =========================================================================

    /// <summary>
    /// Real-time resource calculation and queue processing.
    /// All formulas ported from src/lib/game/resource-calculator.ts.
    /// </summary>
    public static class ResourceCalculator
    {
        /// <summary>
        /// Calculate mine production rate.
        /// </summary>
        public static int CalculateMineProduction(
            int level, int baseRate, double energyRatio,
            double starMultiplier = 1.0, int universeSpeed = 1)
        {
            if (level == 0)
                return (int)Math.Floor(baseRate * starMultiplier);

            return (int)Math.Floor(
                (baseRate + baseRate * level * Math.Pow(1.1, level) * energyRatio * universeSpeed) *
                starMultiplier
            );
        }

        /// <summary>
        /// Calculate energy consumption for a mine.
        /// Formula: ceil(10 * level * 1.1^level)
        /// </summary>
        public static int CalculateMineEnergyConsumption(int level)
        {
            if (level == 0) return 0;
            return (int)Math.Ceiling(10.0 * level * Math.Pow(1.1, level));
        }

        /// <summary>
        /// Calculate solar plant energy.
        /// Formula: floor(20 * level * 1.1^level * multiplier)
        /// </summary>
        public static int CalculateSolarEnergy(int level, double energyMultiplier = 1.0)
        {
            if (level == 0) return 0;
            return (int)Math.Floor(20.0 * level * Math.Pow(1.1, level) * energyMultiplier);
        }

        /// <summary>
        /// Calculate storage capacity.
        /// Formula: 5000 * floor(2.5 * e^(20*level/33))
        /// </summary>
        public static int CalculateStorageCapacity(int level)
        {
            return (int)(5000 * Math.Floor(2.5 * Math.Exp(20.0 * level / 33.0)));
        }

        /// <summary>
        /// Calculate satellite energy based on planet max temperature.
        /// Formula: floor((tempMax + 160) / 6) per satellite
        /// </summary>
        public static int CalculateSatelliteEnergy(int tempMax)
        {
            return (int)Math.Floor((tempMax + 160.0) / 6.0);
        }

        /// <summary>
        /// Recalculate a planet's energy balance, production rates, storage,
        /// and accumulated resources based on elapsed time.
        /// This is the core update function ported from updatePlanetResources().
        /// Does NOT write to database — returns updated PlanetData.
        /// </summary>
        public static PlanetData UpdatePlanetResources(
            PlanetData planet, int universeSpeed = 1,
            StarEffectMultipliers? starEffects = null)
        {
            var effects = starEffects ?? StarEffectMultipliers.Default;
            var now = DateTime.UtcNow;
            double hoursElapsed = (now - planet.LastResourceUpdate).TotalHours;

            if (hoursElapsed < 0.0003) // less than ~1 second
                return planet;

            // --- Energy balance ---
            int metalConsumption = CalculateMineEnergyConsumption(planet.MetalMine);
            int crystalConsumption = CalculateMineEnergyConsumption(planet.CrystalMine);
            int deuteriumConsumption = CalculateMineEnergyConsumption(planet.DeuteriumSynthesizer);
            int totalEnergyUsed = metalConsumption + crystalConsumption + deuteriumConsumption;

            int solarEnergy = CalculateSolarEnergy(planet.SolarPlant, effects.EnergyMultiplier);
            int satelliteEnergy = planet.SolarSatellite * CalculateSatelliteEnergy(planet.TempMax);
            int totalEnergyMax = solarEnergy + satelliteEnergy;

            double energyRatio = totalEnergyUsed > 0
                ? Math.Min(1.0, (double)totalEnergyMax / totalEnergyUsed)
                : 1.0;

            // --- Production rates ---
            int metalPerHour = CalculateMineProduction(planet.MetalMine, 30, energyRatio, effects.MetalMultiplier, universeSpeed);
            int crystalPerHour = CalculateMineProduction(planet.CrystalMine, 20, energyRatio, effects.CrystalMultiplier, universeSpeed);
            int deuteriumPerHour = planet.DeuteriumSynthesizer > 0
                ? (int)Math.Floor(10.0 * planet.DeuteriumSynthesizer *
                    Math.Pow(1.1, planet.DeuteriumSynthesizer) *
                    (1.36 - 0.004 * planet.TempMax) *
                    energyRatio * universeSpeed * effects.DeuteriumMultiplier)
                : 0;

            // --- Storage ---
            int metalMax = CalculateStorageCapacity(planet.MetalStorage);
            int crystalMax = CalculateStorageCapacity(planet.CrystalStorage);
            int deuteriumMax = CalculateStorageCapacity(planet.DeuteriumTank);

            // --- Accumulate ---
            double newMetal = Math.Min(metalMax, planet.Metal + metalPerHour * hoursElapsed);
            double newCrystal = Math.Min(crystalMax, planet.Crystal + crystalPerHour * hoursElapsed);
            double newDeuterium = Math.Min(deuteriumMax, planet.Deuterium + deuteriumPerHour * hoursElapsed);

            // --- Return updated ---
            planet.Metal = newMetal;
            planet.Crystal = newCrystal;
            planet.Deuterium = newDeuterium;
            planet.MetalPerHour = metalPerHour;
            planet.CrystalPerHour = crystalPerHour;
            planet.DeuteriumPerHour = deuteriumPerHour;
            planet.MetalMax = metalMax;
            planet.CrystalMax = crystalMax;
            planet.DeuteriumMax = deuteriumMax;
            planet.EnergyUsed = totalEnergyUsed;
            planet.EnergyMax = totalEnergyMax;
            planet.LastResourceUpdate = now;

            return planet;
        }

        /// <summary>
        /// Get real-time resource values without modifying planet state.
        /// Useful for client-side display interpolation.
        /// Ported from calculateCurrentResources().
        /// </summary>
        public static (double Metal, double Crystal, double Deuterium) CalculateCurrentResources(PlanetData planet)
        {
            var now = DateTime.UtcNow;
            double hoursElapsed = (now - planet.LastResourceUpdate).TotalHours;

            return (
                Math.Min(planet.MetalMax, Math.Floor(planet.Metal + planet.MetalPerHour * hoursElapsed)),
                Math.Min(planet.CrystalMax, Math.Floor(planet.Crystal + planet.CrystalPerHour * hoursElapsed)),
                Math.Min(planet.DeuteriumMax, Math.Floor(planet.Deuterium + planet.DeuteriumPerHour * hoursElapsed))
            );
        }
    }
}
