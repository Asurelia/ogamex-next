// =============================================================================
// GameFormulas.cs — Ported from OGameX src/lib/game/formulas.ts + constants.ts
// All OGameX game calculations: costs, times, production, fleet, combat, planet
// =============================================================================

using System;
using System.Collections.Generic;

namespace OGameX.SharedLib.Game
{
    // =========================================================================
    // SHARED TYPES
    // =========================================================================

    /// <summary>
    /// Resource cost/amount triple used throughout the game.
    /// </summary>
    public struct Resources
    {
        public double Metal;
        public double Crystal;
        public double Deuterium;

        public Resources(double metal, double crystal, double deuterium)
        {
            Metal = metal;
            Crystal = crystal;
            Deuterium = deuterium;
        }

        public static Resources Zero => new Resources(0, 0, 0);

        public static Resources operator +(Resources a, Resources b)
            => new Resources(a.Metal + b.Metal, a.Crystal + b.Crystal, a.Deuterium + b.Deuterium);

        public static Resources operator *(Resources a, double factor)
            => new Resources(a.Metal * factor, a.Crystal * factor, a.Deuterium * factor);
    }

    // =========================================================================
    // UNIVERSE CONSTANTS
    // =========================================================================

    public static class UniverseConstants
    {
        public const int MinGalaxy = 1;
        public const int MaxGalaxy = 9;
        public const int MinSystem = 1;
        public const int MaxSystem = 499;
        public const int MinPosition = 1;
        public const int MaxPosition = 15;
        public const int ExpeditionPosition = 16;
    }

    public static class ProceduralUniverse
    {
        public const int MinGalaxies = 80;
        public const int MaxGalaxies = 100;
        public const int MinSystemsPerGalaxy = 100;
        public const int MaxSystemsPerGalaxy = 200;
        public const int MinPlanetsPerSystem = 1;
        public const int MaxPlanetsPerSystem = 9;
        public const int MaxMoonsPerPlanet = 8;
        public const int MinPlanetFields = 8;
        public const int MaxPlanetFields = 20;
        public const int MinMoonFields = 3;
        public const int MaxMoonFields = 10;
    }

    // =========================================================================
    // MISSION TYPES
    // =========================================================================

    public static class MissionTypes
    {
        public const int Attack = 1;
        public const int ACSAttack = 2;
        public const int Transport = 3;
        public const int Deployment = 4;
        public const int ACSDefend = 5;
        public const int Espionage = 6;
        public const int Colonization = 7;
        public const int Recycle = 8;
        public const int MoonDestruction = 9;
        public const int Expedition = 15;
    }

    // =========================================================================
    // GAME DEFINITIONS
    // =========================================================================

    public class BuildingDefinition
    {
        public int Id;
        public string Name;
        public string Key;
        public Resources BaseCost;
        public double PriceFactor;
        public string Category; // "resources", "facilities", "moon"
    }

    public class ShipDefinition
    {
        public int Id;
        public string Name;
        public string Key;
        public Resources Cost;
        public int StructuralIntegrity;
        public int ShieldPower;
        public int WeaponPower;
        public int Speed;
        public int CargoCapacity;
        public int FuelConsumption;
        public string DriveType; // "combustion", "impulse", "hyperspace"
        public string Category; // "military", "civil"
    }

    public class DefenseDefinition
    {
        public int Id;
        public string Name;
        public string Key;
        public Resources Cost;
        public int StructuralIntegrity;
        public int ShieldPower;
        public int WeaponPower;
    }

    public class ResearchDefinition
    {
        public int Id;
        public string Name;
        public string Key;
        public Resources BaseCost;
        public double PriceFactor;
    }

    // =========================================================================
    // MAIN FORMULAS — Ported from formulas.ts
    // =========================================================================

    /// <summary>
    /// All OGameX game formulas as pure static functions.
    /// Ported from src/lib/game/formulas.ts.
    /// </summary>
    public static class GameFormulas
    {
        // =====================================================================
        // COST CALCULATIONS
        // =====================================================================

        /// <summary>
        /// Calculate the cost of a building at a specific level.
        /// Formula: baseCost * priceFactor^(level-1)
        /// </summary>
        public static Resources CalculateBuildingCost(Resources baseCost, double priceFactor, int level)
        {
            double factor = Math.Pow(priceFactor, level - 1);
            return new Resources(
                Math.Floor(baseCost.Metal * factor),
                Math.Floor(baseCost.Crystal * factor),
                Math.Floor(baseCost.Deuterium * factor)
            );
        }

        /// <summary>
        /// Calculate the cost of research at a specific level.
        /// Formula: baseCost * priceFactor^(level-1)
        /// </summary>
        public static Resources CalculateResearchCost(Resources baseCost, double priceFactor, int level)
        {
            double factor = Math.Pow(priceFactor, level - 1);
            return new Resources(
                Math.Floor(baseCost.Metal * factor),
                Math.Floor(baseCost.Crystal * factor),
                Math.Floor(baseCost.Deuterium * factor)
            );
        }

        /// <summary>
        /// Calculate the cost of building multiple units (ships/defense).
        /// </summary>
        public static Resources CalculateUnitCost(Resources unitCost, int amount)
        {
            return new Resources(
                unitCost.Metal * amount,
                unitCost.Crystal * amount,
                unitCost.Deuterium * amount
            );
        }

        // =====================================================================
        // TIME CALCULATIONS
        // =====================================================================

        /// <summary>
        /// Calculate building construction time in seconds.
        /// </summary>
        public static int CalculateBuildingTime(
            double metalCost, double crystalCost,
            int robotFactoryLevel, int naniteFactoryLevel,
            int universeSpeed = 1, bool isNaniteFactory = false)
        {
            double baseCost = metalCost + crystalCost;
            double time;

            if (isNaniteFactory)
            {
                time = baseCost / (2500.0 * (1 + robotFactoryLevel) * universeSpeed * Math.Pow(2, naniteFactoryLevel));
            }
            else
            {
                double levelFactor = Math.Max(4.0 - robotFactoryLevel / 2.0, 1.0);
                time = baseCost / (2500.0 * levelFactor * (1 + robotFactoryLevel) * universeSpeed * Math.Pow(2, naniteFactoryLevel));
            }

            return Math.Max(1, (int)Math.Floor(time * 3600));
        }

        /// <summary>
        /// Calculate unit (ship/defense) build time in seconds.
        /// </summary>
        public static int CalculateUnitTime(
            int structuralIntegrity, int shipyardLevel,
            int naniteFactoryLevel, int universeSpeed = 1)
        {
            double time = structuralIntegrity / (2500.0 * (1 + shipyardLevel) * universeSpeed * Math.Pow(2, naniteFactoryLevel));
            return Math.Max(1, (int)Math.Floor(time * 3600));
        }

        /// <summary>
        /// Calculate research time in seconds.
        /// </summary>
        public static int CalculateResearchTime(
            double metalCost, double crystalCost,
            int researchLabLevel, int universeSpeed = 1,
            int researchSpeed = 1, double characterClassMultiplier = 1.0)
        {
            double baseCost = metalCost + crystalCost;
            double time = baseCost / (1000.0 * (1 + researchLabLevel) * universeSpeed * researchSpeed);
            return Math.Max(1, (int)Math.Floor(time * 3600 * characterClassMultiplier));
        }

        // =====================================================================
        // PRODUCTION CALCULATIONS
        // =====================================================================

        /// <summary>
        /// Calculate metal mine production per hour.
        /// Formula: 30 * level * 1.1^level * universeSpeed * (percent/100) * plasmaBonus
        /// </summary>
        public static int CalculateMetalProduction(
            int mineLevel, int universeSpeed = 1,
            int productionPercent = 100, int plasmaLevel = 0)
        {
            if (mineLevel == 0) return 0;
            double baseProduction = 30.0 * mineLevel * Math.Pow(1.1, mineLevel);
            double plasmaBonus = 1.0 + plasmaLevel * 0.01;
            return (int)Math.Floor(baseProduction * universeSpeed * (productionPercent / 100.0) * plasmaBonus);
        }

        /// <summary>
        /// Calculate crystal mine production per hour.
        /// Formula: 20 * level * 1.1^level * universeSpeed * (percent/100) * plasmaBonus
        /// </summary>
        public static int CalculateCrystalProduction(
            int mineLevel, int universeSpeed = 1,
            int productionPercent = 100, int plasmaLevel = 0)
        {
            if (mineLevel == 0) return 0;
            double baseProduction = 20.0 * mineLevel * Math.Pow(1.1, mineLevel);
            double plasmaBonus = 1.0 + plasmaLevel * 0.0066;
            return (int)Math.Floor(baseProduction * universeSpeed * (productionPercent / 100.0) * plasmaBonus);
        }

        /// <summary>
        /// Calculate deuterium synthesizer production per hour.
        /// Formula: 10 * level * 1.1^level * (1.44 - 0.004*maxTemp) * universeSpeed * percent * plasmaBonus
        /// </summary>
        public static int CalculateDeuteriumProduction(
            int synthLevel, int maxTemp,
            int universeSpeed = 1, int productionPercent = 100, int plasmaLevel = 0)
        {
            if (synthLevel == 0) return 0;
            double tempFactor = 1.44 - 0.004 * maxTemp;
            double baseProduction = 10.0 * synthLevel * Math.Pow(1.1, synthLevel) * tempFactor;
            double plasmaBonus = 1.0 + plasmaLevel * 0.0033;
            return (int)Math.Floor(baseProduction * universeSpeed * (productionPercent / 100.0) * plasmaBonus);
        }

        /// <summary>
        /// Calculate solar plant energy production.
        /// Formula: 20 * level * 1.1^level
        /// </summary>
        public static int CalculateSolarPlantEnergy(int level)
        {
            if (level == 0) return 0;
            return (int)Math.Floor(20.0 * level * Math.Pow(1.1, level));
        }

        /// <summary>
        /// Calculate fusion reactor energy production.
        /// Formula: 30 * level * (1.05 + energyTech*0.01)^level
        /// </summary>
        public static int CalculateFusionEnergy(int level, int energyTechLevel)
        {
            if (level == 0) return 0;
            return (int)Math.Floor(30.0 * level * Math.Pow(1.05 + energyTechLevel * 0.01, level));
        }

        /// <summary>
        /// Calculate energy consumption for a mine.
        /// Metal/Crystal: 10 * level * 1.1^level
        /// Deuterium:     20 * level * 1.1^level
        /// </summary>
        public static int CalculateMineEnergyConsumption(int mineLevel, string mineType = "metal")
        {
            if (mineLevel == 0) return 0;
            int baseFactor = mineType == "deuterium" ? 20 : 10;
            return (int)Math.Floor(baseFactor * (double)mineLevel * Math.Pow(1.1, mineLevel));
        }

        /// <summary>
        /// Calculate storage capacity.
        /// Formula: 5000 * floor(2.5 * e^(20*level/33))
        /// </summary>
        public static int CalculateStorageCapacity(int storageLevel)
        {
            return (int)(5000 * Math.Floor(2.5 * Math.Exp(20.0 * storageLevel / 33.0)));
        }

        // =====================================================================
        // FLEET CALCULATIONS
        // =====================================================================

        /// <summary>
        /// Calculate distance between two coordinate sets.
        /// Different galaxies: diff * 20000
        /// Same galaxy, different systems: diff * 5 * 19 + 2700
        /// Same system, different positions: diff * 5 + 1000
        /// Same position: 5
        /// </summary>
        public static int CalculateDistance(
            int galaxy1, int system1, int position1,
            int galaxy2, int system2, int position2,
            int maxGalaxies = 9, int maxSystems = 499)
        {
            if (galaxy1 != galaxy2)
            {
                int galaxyDiff = Math.Abs(galaxy1 - galaxy2);
                int wrappedDiff = Math.Min(galaxyDiff, maxGalaxies - galaxyDiff);
                return wrappedDiff * 20000;
            }
            if (system1 != system2)
            {
                int systemDiff = Math.Abs(system1 - system2);
                int wrappedDiff = Math.Min(systemDiff, maxSystems - systemDiff);
                return wrappedDiff * 5 * 19 + 2700;
            }
            if (position1 != position2)
            {
                return Math.Abs(position1 - position2) * 5 + 1000;
            }
            return 5;
        }

        /// <summary>
        /// Calculate fleet mission duration in seconds.
        /// Formula: (35000/speedFactor * sqrt(distance*10/slowestSpeed) + 10) / fleetSpeed
        /// </summary>
        public static int CalculateFleetDuration(
            int distance, int slowestShipSpeed,
            int speedPercent = 100, int fleetSpeed = 1)
        {
            double speedFactor = speedPercent / 100.0;
            double duration = (35000.0 / speedFactor * Math.Sqrt(distance * 10.0 / slowestShipSpeed) + 10) / fleetSpeed;
            return Math.Max(1, (int)Math.Round(duration));
        }

        /// <summary>
        /// Calculate fuel consumption for a single ship type.
        /// </summary>
        public static int CalculateShipFuelConsumption(
            int shipFuelConsumption, int shipSpeed, int amount,
            int distance, int duration, int speedPercent = 100)
        {
            if (amount <= 0) return 0;
            double speedValue = Math.Max(0.5, duration * (speedPercent / 100.0) - 10);
            double shipSpeedValue = 35000.0 / speedValue * Math.Sqrt(distance * 10.0 / shipSpeed);
            double consumption = shipFuelConsumption * amount * distance / 35000.0 * Math.Pow(shipSpeedValue / 10.0 + 1, 2);
            return Math.Max(1, (int)Math.Ceiling(consumption));
        }

        /// <summary>
        /// Calculate cargo capacity with hyperspace tech bonus.
        /// Formula: baseCapacity * (1 + hyperspaceTech * 0.05)
        /// </summary>
        public static int CalculateCargoCapacityWithBonus(int baseCapacity, int hyperspaceTechLevel = 0)
        {
            double bonusMultiplier = 1.0 + hyperspaceTechLevel * 0.05;
            return (int)Math.Floor(baseCapacity * bonusMultiplier);
        }

        // =====================================================================
        // COMBAT CALCULATIONS
        // =====================================================================

        /// <summary>
        /// Calculate attack power with weapons technology.
        /// Formula: baseAttack * (1 + weaponsTech * 0.1)
        /// </summary>
        public static int CalculateAttackPower(int baseAttack, int weaponsTechLevel)
        {
            return (int)Math.Floor(baseAttack * (1.0 + weaponsTechLevel * 0.1));
        }

        /// <summary>
        /// Calculate shield power with shielding technology.
        /// Formula: baseShield * (1 + shieldTech * 0.1)
        /// </summary>
        public static int CalculateShieldPower(int baseShield, int shieldingTechLevel)
        {
            return (int)Math.Floor(baseShield * (1.0 + shieldingTechLevel * 0.1));
        }

        /// <summary>
        /// Calculate structural integrity with armor technology.
        /// Formula: baseArmor * (1 + armorTech * 0.1)
        /// </summary>
        public static int CalculateArmor(int baseArmor, int armorTechLevel)
        {
            return (int)Math.Floor(baseArmor * (1.0 + armorTechLevel * 0.1));
        }

        // =====================================================================
        // MISC CALCULATIONS
        // =====================================================================

        /// <summary>Max fleet slots = 1 + computerTech.</summary>
        public static int CalculateMaxFleetSlots(int computerTechLevel) => 1 + computerTechLevel;

        /// <summary>Max colonies = floor(astrophysics / 2).</summary>
        public static int CalculateMaxColonies(int astrophysicsLevel) => astrophysicsLevel / 2;

        /// <summary>Max expeditions = floor(sqrt(astrophysics)).</summary>
        public static int CalculateMaxExpeditions(int astrophysicsLevel) => (int)Math.Floor(Math.Sqrt(astrophysicsLevel));

        /// <summary>Planet fields = floor((diameter/1000)^2).</summary>
        public static int CalculatePlanetFields(int diameter) => (int)Math.Floor(Math.Pow(diameter / 1000.0, 2));

        /// <summary>
        /// Generate random planet diameter based on orbital position.
        /// Closer to sun = smaller, middle = largest. ±20% random variation.
        /// </summary>
        public static int GeneratePlanetDiameter(int position, Random rng = null)
        {
            rng = rng ?? new Random();
            var baseDiameters = new Dictionary<int, int>
            {
                {1, 50}, {2, 80}, {3, 90}, {4, 120}, {5, 140},
                {6, 150}, {7, 160}, {8, 170}, {9, 180}, {10, 160},
                {11, 140}, {12, 120}, {13, 100}, {14, 80}, {15, 60}
            };
            int baseDiameter = baseDiameters.ContainsKey(position) ? baseDiameters[position] : 100;
            double variation = 0.8 + rng.NextDouble() * 0.4;
            return (int)Math.Floor(baseDiameter * 100 * variation);
        }

        /// <summary>
        /// Calculate planet temperature based on orbital position.
        /// Temperature decreases as position increases from the sun.
        /// </summary>
        public static (int Min, int Max) CalculatePlanetTemperature(int position)
        {
            int baseMax = 130 - position * 15;
            int range = 40;
            return (baseMax - range, baseMax);
        }
    }
}
