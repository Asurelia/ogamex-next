// =============================================================================
// GalaxyGenerator.cs — Procedural galaxy generation system
// Port of: src/lib/galaxy/generators/GalaxyGenerator.ts + prng.ts + constants.ts
// Namespace: OGameX.SharedLib.Galaxy
// =============================================================================

using System;
using System.Collections.Generic;

namespace OGameX.SharedLib.Galaxy
{
    // =========================================================================
    // SEEDED RANDOM NUMBER GENERATOR
    // =========================================================================

    /// <summary>
    /// Seeded Pseudo-Random Number Generator.
    /// Uses Mulberry32 algorithm - fast and high-quality 32-bit PRNG.
    /// Provides deterministic random generation for procedural content.
    /// </summary>
    public class SeededRandom
    {
        private uint _state;

        /// <summary>
        /// Create a new seeded random generator.
        /// </summary>
        /// <param name="seed">Initial seed value</param>
        public SeededRandom(int seed)
        {
            _state = unchecked((uint)seed);
        }

        /// <summary>Get the current seed state</summary>
        public uint GetSeed() => _state;

        /// <summary>Set a new seed</summary>
        public void SetSeed(int seed) => _state = unchecked((uint)seed);

        /// <summary>
        /// Generate next random number using Mulberry32 algorithm.
        /// </summary>
        /// <returns>Random float in range [0, 1)</returns>
        public double Next()
        {
            unchecked
            {
                uint t = _state += 0x6D2B79F5;
                t = (t ^ (t >> 15)) * (t | 1);
                t ^= t + (t ^ (t >> 7)) * (t | 61);
                return ((t ^ (t >> 14))) / 4294967296.0;
            }
        }

        /// <summary>Generate random integer in range [min, max] (inclusive)</summary>
        public int NextInt(int min, int max)
        {
            return (int)Math.Floor(Next() * (max - min + 1)) + min;
        }

        /// <summary>Generate random float in range [min, max)</summary>
        public double NextFloat(double min, double max)
        {
            return Next() * (max - min) + min;
        }

        /// <summary>Generate random boolean with given probability of true</summary>
        public bool NextBool(double probability = 0.5)
        {
            return Next() < probability;
        }

        /// <summary>Pick a random element from an array</summary>
        public T Pick<T>(T[] items)
        {
            if (items.Length == 0)
                throw new ArgumentException("Cannot pick from empty array");
            return items[NextInt(0, items.Length - 1)];
        }

        /// <summary>
        /// Derive a new seed from current state with an offset.
        /// Useful for hierarchical seeding (galaxy -> system -> planet).
        /// </summary>
        public int DeriveSeed(int offset)
        {
            unchecked
            {
                return (int)((_state ^ (uint)(offset * 2654435761)) & 0xFFFFFFFF);
            }
        }

        /// <summary>Create a child generator with derived seed</summary>
        public SeededRandom DeriveChild(int offset)
        {
            return new SeededRandom(DeriveSeed(offset));
        }

        /// <summary>
        /// Generate Gaussian (normal) distributed random number.
        /// Uses Box-Muller transform.
        /// </summary>
        public double NextGaussian(double mean = 0, double stdDev = 1)
        {
            double u1 = Next();
            double u2 = Next();
            double z0 = Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
            return z0 * stdDev + mean;
        }

        /// <summary>Shuffle array in place using Fisher-Yates algorithm</summary>
        public T[] Shuffle<T>(T[] array)
        {
            for (int i = array.Length - 1; i > 0; i--)
            {
                int j = NextInt(0, i);
                (array[i], array[j]) = (array[j], array[i]);
            }
            return array;
        }
    }

    // =========================================================================
    // SEED HIERARCHY UTILITIES
    // =========================================================================

    /// <summary>
    /// Seed hierarchy utilities for procedural generation.
    /// </summary>
    public static class SeedUtils
    {
        /// <summary>Generate seed for a galaxy from master seed</summary>
        public static int GalaxySeed(int masterSeed, int galaxyIndex)
        {
            unchecked
            {
                return (int)((uint)masterSeed ^ (uint)(galaxyIndex * 1000000));
            }
        }

        /// <summary>Generate seed for a solar system from galaxy seed</summary>
        public static int SystemSeed(int galaxySeed, int systemIndex)
        {
            unchecked
            {
                return (int)((uint)galaxySeed ^ (uint)(systemIndex * 1000));
            }
        }

        /// <summary>Generate seed for a celestial body from system seed</summary>
        public static int BodySeed(int systemSeed, int orbitalPosition)
        {
            unchecked
            {
                return (int)((uint)systemSeed ^ (uint)(orbitalPosition * 10));
            }
        }

        /// <summary>Generate seed for a moon from parent body seed</summary>
        public static int MoonSeed(int parentSeed, int moonIndex)
        {
            unchecked
            {
                return (int)((uint)parentSeed ^ (uint)(moonIndex * 100));
            }
        }

        /// <summary>Simple string hash function (djb2)</summary>
        public static int HashString(string str)
        {
            unchecked
            {
                int hash = 5381;
                foreach (char c in str)
                {
                    hash = ((hash << 5) + hash + c);
                }
                return hash;
            }
        }

        /// <summary>Combine multiple seeds into one</summary>
        public static int CombinedSeed(params int[] seeds)
        {
            unchecked
            {
                int result = 0;
                foreach (int seed in seeds)
                {
                    result ^= seed;
                    result = (int)((uint)result * 0x5BD1E995);
                    result ^= result >> 15;
                }
                return result;
            }
        }
    }

    // =========================================================================
    // UNIVERSE LIMITS
    // =========================================================================

    /// <summary>
    /// Universe generation limits.
    /// </summary>
    public static class UniverseLimits
    {
        public const int MinGalaxies = 80;
        public const int MaxGalaxies = 100;
        public const int MinSystemsPerGalaxy = 100;
        public const int MaxSystemsPerGalaxy = 200;
        public const int MinPlanetsPerSystem = 1;
        public const int MaxPlanetsPerSystem = 9;
        public const int MaxOrbitalPositions = 15;
    }

    /// <summary>
    /// Celestial body limits.
    /// </summary>
    public static class BodyLimits
    {
        public const int MinPlanetFields = 8;
        public const int MaxPlanetFields = 20;
        public const int MinMoonFields = 3;
        public const int MaxMoonFields = 10;
        public const int MaxMoonsPerPlanet = 8;
    }

    /// <summary>
    /// Orbital zones.
    /// </summary>
    public static class OrbitalZones
    {
        public static readonly (int Start, int End) Inner = (1, 3);
        public static readonly (int Start, int End) Habitable = (4, 7);
        public static readonly (int Start, int End) Outer = (8, 12);
        public static readonly (int Start, int End) Far = (13, 15);

        public static string GetZone(int position)
        {
            if (position >= Inner.Start && position <= Inner.End) return "inner";
            if (position >= Habitable.Start && position <= Habitable.End) return "habitable";
            if (position >= Outer.Start && position <= Outer.End) return "outer";
            return "far";
        }
    }

    /// <summary>
    /// Temperature generation constants.
    /// </summary>
    public static class TemperatureConstants
    {
        public const int BaseTemp = 200;
        public const int TempDecreasePerPosition = 25;
        public const int TempVariation = 40;
    }

    // =========================================================================
    // STAR TYPE CONFIGURATION
    // =========================================================================

    /// <summary>
    /// Star type configuration with properties and effects.
    /// </summary>
    public class StarTypeConfig
    {
        public StarTypeId Id { get; set; }
        public string Name { get; set; } = "";
        public double Probability { get; set; }
        public string Color { get; set; } = "";
        public int TemperatureKelvin { get; set; }
        public double Luminosity { get; set; }
        public bool IsBinary { get; set; }
        public bool IsExotic { get; set; }
        public bool Colonizable { get; set; }
        public double MetalMultiplier { get; set; }
        public double CrystalMultiplier { get; set; }
        public double DeuteriumMultiplier { get; set; }
        public double EnergyMultiplier { get; set; }
        public double ExpeditionBonus { get; set; }
        public double FleetDamageChance { get; set; }
        public double FleetLossChance { get; set; }
        public string Description { get; set; } = "";
    }

    /// <summary>
    /// Star type registry with all star configurations.
    /// </summary>
    public static class StarTypes
    {
        public static readonly Dictionary<StarTypeId, StarTypeConfig> All = new()
        {
            [StarTypeId.YellowDwarf] = new StarTypeConfig
            {
                Id = StarTypeId.YellowDwarf,
                Name = "Yellow Dwarf (G-type)",
                Probability = 0.25,
                Color = "#ffdd44",
                TemperatureKelvin = 5800,
                Luminosity = 1.0,
                IsBinary = false,
                IsExotic = false,
                Colonizable = true,
                MetalMultiplier = 1.0,
                CrystalMultiplier = 1.0,
                DeuteriumMultiplier = 1.0,
                EnergyMultiplier = 1.0,
                ExpeditionBonus = 1.0,
                FleetDamageChance = 0.0,
                FleetLossChance = 0.0,
                Description = "A stable main-sequence star similar to our Sun"
            },
            [StarTypeId.RedDwarf] = new StarTypeConfig
            {
                Id = StarTypeId.RedDwarf,
                Name = "Red Dwarf (M-type)",
                Probability = 0.25,
                Color = "#ff6644",
                TemperatureKelvin = 3500,
                Luminosity = 0.4,
                IsBinary = false,
                IsExotic = false,
                Colonizable = true,
                MetalMultiplier = 0.9,
                CrystalMultiplier = 0.9,
                DeuteriumMultiplier = 1.1,
                EnergyMultiplier = 0.9,
                ExpeditionBonus = 1.0,
                FleetDamageChance = 0.0,
                FleetLossChance = 0.0,
                Description = "The most common star type with reduced energy output"
            },
            [StarTypeId.OrangeDwarf] = new StarTypeConfig
            {
                Id = StarTypeId.OrangeDwarf,
                Name = "Orange Dwarf (K-type)",
                Probability = 0.10,
                Color = "#ffaa44",
                TemperatureKelvin = 4800,
                Luminosity = 0.6,
                IsBinary = false,
                IsExotic = false,
                Colonizable = true,
                MetalMultiplier = 1.0,
                CrystalMultiplier = 1.0,
                DeuteriumMultiplier = 1.0,
                EnergyMultiplier = 0.95,
                ExpeditionBonus = 1.0,
                FleetDamageChance = 0.0,
                FleetLossChance = 0.0,
                Description = "A stable star slightly cooler than the Sun"
            },
            [StarTypeId.WhiteDwarf] = new StarTypeConfig
            {
                Id = StarTypeId.WhiteDwarf,
                Name = "White Dwarf",
                Probability = 0.05,
                Color = "#ffffff",
                TemperatureKelvin = 15000,
                Luminosity = 0.01,
                IsBinary = false,
                IsExotic = false,
                Colonizable = true,
                MetalMultiplier = 0.8,
                CrystalMultiplier = 1.2,
                DeuteriumMultiplier = 0.9,
                EnergyMultiplier = 1.1,
                ExpeditionBonus = 1.2,
                FleetDamageChance = 0.01,
                FleetLossChance = 0.0,
                Description = "A stellar remnant with unusual radiation patterns"
            },
            [StarTypeId.RedGiant] = new StarTypeConfig
            {
                Id = StarTypeId.RedGiant,
                Name = "Red Giant",
                Probability = 0.03,
                Color = "#ff4422",
                TemperatureKelvin = 4000,
                Luminosity = 100.0,
                IsBinary = false,
                IsExotic = false,
                Colonizable = true,
                MetalMultiplier = 1.3,
                CrystalMultiplier = 0.9,
                DeuteriumMultiplier = 0.8,
                EnergyMultiplier = 0.8,
                ExpeditionBonus = 1.1,
                FleetDamageChance = 0.02,
                FleetLossChance = 0.0,
                Description = "An evolved star with expanded outer layers"
            },
            [StarTypeId.BlueGiant] = new StarTypeConfig
            {
                Id = StarTypeId.BlueGiant,
                Name = "Blue Giant (O/B-type)",
                Probability = 0.02,
                Color = "#4488ff",
                TemperatureKelvin = 25000,
                Luminosity = 10000.0,
                IsBinary = false,
                IsExotic = false,
                Colonizable = true,
                MetalMultiplier = 0.9,
                CrystalMultiplier = 0.9,
                DeuteriumMultiplier = 1.3,
                EnergyMultiplier = 1.5,
                ExpeditionBonus = 1.3,
                FleetDamageChance = 0.05,
                FleetLossChance = 0.0,
                Description = "A massive hot star with intense radiation"
            },
            [StarTypeId.BinaryYellow] = new StarTypeConfig
            {
                Id = StarTypeId.BinaryYellow,
                Name = "Binary Yellow",
                Probability = 0.08,
                Color = "#ffee44",
                TemperatureKelvin = 5800,
                Luminosity = 2.0,
                IsBinary = true,
                IsExotic = false,
                Colonizable = true,
                MetalMultiplier = 1.0,
                CrystalMultiplier = 1.0,
                DeuteriumMultiplier = 1.0,
                EnergyMultiplier = 1.15,
                ExpeditionBonus = 1.1,
                FleetDamageChance = 0.01,
                FleetLossChance = 0.0,
                Description = "Two yellow stars in gravitational dance"
            },
            [StarTypeId.BinaryRed] = new StarTypeConfig
            {
                Id = StarTypeId.BinaryRed,
                Name = "Binary Red",
                Probability = 0.07,
                Color = "#ff5533",
                TemperatureKelvin = 3500,
                Luminosity = 0.8,
                IsBinary = true,
                IsExotic = false,
                Colonizable = true,
                MetalMultiplier = 0.95,
                CrystalMultiplier = 0.95,
                DeuteriumMultiplier = 1.05,
                EnergyMultiplier = 0.95,
                ExpeditionBonus = 1.05,
                FleetDamageChance = 0.01,
                FleetLossChance = 0.0,
                Description = "Two red dwarfs orbiting each other"
            },
            [StarTypeId.BinaryMixed] = new StarTypeConfig
            {
                Id = StarTypeId.BinaryMixed,
                Name = "Binary Mixed",
                Probability = 0.05,
                Color = "#ffaa77",
                TemperatureKelvin = 4500,
                Luminosity = 1.5,
                IsBinary = true,
                IsExotic = false,
                Colonizable = true,
                MetalMultiplier = 1.0,
                CrystalMultiplier = 1.1,
                DeuteriumMultiplier = 1.1,
                EnergyMultiplier = 1.05,
                ExpeditionBonus = 1.15,
                FleetDamageChance = 0.02,
                FleetLossChance = 0.0,
                Description = "A pair of different star types"
            },
            [StarTypeId.NeutronStar] = new StarTypeConfig
            {
                Id = StarTypeId.NeutronStar,
                Name = "Neutron Star",
                Probability = 0.05,
                Color = "#88aaff",
                TemperatureKelvin = 1000000,
                Luminosity = 0.001,
                IsBinary = false,
                IsExotic = true,
                Colonizable = true,
                MetalMultiplier = 0.7,
                CrystalMultiplier = 0.8,
                DeuteriumMultiplier = 2.0,
                EnergyMultiplier = 0.5,
                ExpeditionBonus = 1.5,
                FleetDamageChance = 0.05,
                FleetLossChance = 0.01,
                Description = "An ultra-dense stellar remnant with extreme conditions"
            },
            [StarTypeId.BlackHole] = new StarTypeConfig
            {
                Id = StarTypeId.BlackHole,
                Name = "Black Hole",
                Probability = 0.03,
                Color = "#220033",
                TemperatureKelvin = 0,
                Luminosity = 0.0,
                IsBinary = false,
                IsExotic = true,
                Colonizable = false,
                MetalMultiplier = 0.0,
                CrystalMultiplier = 0.0,
                DeuteriumMultiplier = 0.0,
                EnergyMultiplier = 0.0,
                ExpeditionBonus = 3.0,
                FleetDamageChance = 0.10,
                FleetLossChance = 0.10,
                Description = "A gravitational singularity - extremely dangerous"
            },
            [StarTypeId.WhiteGiant] = new StarTypeConfig
            {
                Id = StarTypeId.WhiteGiant,
                Name = "White Giant",
                Probability = 0.02,
                Color = "#eeeeff",
                TemperatureKelvin = 10000,
                Luminosity = 1000.0,
                IsBinary = false,
                IsExotic = false,
                Colonizable = true,
                MetalMultiplier = 0.9,
                CrystalMultiplier = 1.4,
                DeuteriumMultiplier = 0.9,
                EnergyMultiplier = 1.2,
                ExpeditionBonus = 1.2,
                FleetDamageChance = 0.02,
                FleetLossChance = 0.0,
                Description = "A luminous evolved star rich in heavy elements"
            },
        };

        public static StarTypeConfig Get(StarTypeId id) => All[id];
    }

    /// <summary>
    /// Galaxy type probabilities.
    /// </summary>
    public static class GalaxyTypeProbabilities
    {
        public static readonly Dictionary<GalaxyType, double> All = new()
        {
            [GalaxyType.Spiral] = 0.50,
            [GalaxyType.BarredSpiral] = 0.25,
            [GalaxyType.Elliptical] = 0.15,
            [GalaxyType.Irregular] = 0.10,
        };
    }

    /// <summary>
    /// Resource multipliers by orbital position zone.
    /// </summary>
    public static class PositionMultipliers
    {
        public static readonly Dictionary<string, (double Metal, double Crystal, double Deuterium)> All = new()
        {
            ["inner"] = (1.2, 0.9, 0.5),
            ["habitable"] = (1.0, 1.0, 1.0),
            ["outer"] = (0.8, 1.0, 1.5),
            ["far"] = (0.6, 0.8, 1.8),
        };

        public static (double Metal, double Crystal, double Deuterium) GetForPosition(int position)
        {
            string zone = OrbitalZones.GetZone(position);
            return All.TryGetValue(zone, out var multipliers) ? multipliers : (1.0, 1.0, 1.0);
        }
    }

    // =========================================================================
    // GALAXY NAMES
    // =========================================================================

    /// <summary>
    /// Galaxy name pool.
    /// </summary>
    public static class GalaxyNames
    {
        public static readonly string[] Pool =
        {
            "Andromeda", "Pegasus", "Orion", "Centaurus", "Draco",
            "Phoenix", "Sculptor", "Fornax", "Cetus", "Eridanus",
            "Hydra", "Virgo", "Corvus", "Crater", "Vela",
            "Carina", "Puppis", "Pyxis", "Antlia", "Columba",
            "Caelum", "Horologium", "Reticulum", "Pictor", "Dorado",
            "Volans", "Mensa", "Chamaeleon", "Musca", "Crux",
            "Circinus", "Norma", "Lupus", "Ara", "Corona",
            "Serpens", "Ophiuchus", "Scutum", "Sagittarius", "Capricornus",
            "Aquarius", "Pisces", "Aries", "Taurus", "Gemini",
            "Cancer", "Leo", "Libra", "Scorpius", "Aquila",
            "Cygnus", "Lyra", "Delphinus", "Equuleus", "Sagitta",
            "Vulpecula", "Lacerta", "Cassiopeia", "Cepheus", "Perseus",
            "Auriga", "Lynx", "Ursa Minor", "Ursa Major", "Canes",
            "Bootes", "Hercules", "Triangulum", "Canis Major", "Canis Minor",
            "Monoceros", "Lepus", "Grus", "Tucana", "Pavo",
            "Indus", "Microscopium", "Telescopium", "Octans", "Apus",
            "Aether", "Nebula Prime", "Void Walker", "Star Forge", "Dark Matter",
            "Quantum", "Singularity", "Event Horizon", "Cosmic Web", "Stellar",
        };

        private static readonly string[] RomanNumerals = { "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X" };

        public static string GetName(int galaxyIndex)
        {
            string baseName = Pool[(galaxyIndex - 1) % Pool.Length];
            int suffix = (galaxyIndex - 1) / Pool.Length;

            if (suffix == 0) return baseName;

            int numeralIndex = Math.Min(suffix - 1, RomanNumerals.Length - 1);
            return $"{baseName} {RomanNumerals[numeralIndex]}";
        }
    }

    // =========================================================================
    // GALAXY GENERATION
    // =========================================================================

    /// <summary>
    /// Result of galaxy generation.
    /// </summary>
    public class GalaxyGenerationResult
    {
        public int GalaxyIndex { get; set; }
        public string Name { get; set; } = "";
        public int Seed { get; set; }
        public GalaxyType GalaxyTypeValue { get; set; }
        public int SystemCount { get; set; }
        public double CenterX { get; set; }
        public double CenterY { get; set; }
        public double CenterZ { get; set; }
        public double RotationAngle { get; set; }
        public List<int> SystemSeeds { get; set; } = new();
    }

    /// <summary>
    /// Galaxy distribution statistics.
    /// </summary>
    public class GalaxyDistributionStats
    {
        public int TotalGalaxies { get; set; }
        public int TotalSystems { get; set; }
        public double AvgSystemsPerGalaxy { get; set; }
        public Dictionary<GalaxyType, int> TypeDistribution { get; set; } = new();
    }

    /// <summary>
    /// Procedural galaxy generator.
    /// </summary>
    public static class GalaxyGenerator
    {
        /// <summary>
        /// Generate galaxy type based on weighted probabilities.
        /// </summary>
        private static GalaxyType GenerateGalaxyType(SeededRandom rng)
        {
            double roll = rng.Next();
            double cumulative = 0;

            foreach (var (type, prob) in GalaxyTypeProbabilities.All)
            {
                cumulative += prob;
                if (roll < cumulative) return type;
            }

            return GalaxyType.Spiral;
        }

        /// <summary>
        /// Generate galaxy spatial position.
        /// </summary>
        private static (double CenterX, double CenterY, double CenterZ, double RotationAngle)
            GenerateGalaxyPosition(SeededRandom rng, int galaxyIndex)
        {
            int gridSize = (int)Math.Ceiling(Math.Pow(UniverseLimits.MaxGalaxies, 1.0 / 3.0));
            double baseX = (galaxyIndex % gridSize) * 1000;
            double baseY = ((galaxyIndex / gridSize) % gridSize) * 1000;
            double baseZ = (galaxyIndex / (gridSize * gridSize)) * 1000;

            return (
                baseX + rng.NextFloat(-200, 200),
                baseY + rng.NextFloat(-100, 100),
                baseZ + rng.NextFloat(-150, 150),
                rng.NextFloat(0, 360)
            );
        }

        /// <summary>
        /// Generate a single galaxy.
        /// </summary>
        public static GalaxyGenerationResult GenerateGalaxy(int masterSeed, int galaxyIndex)
        {
            int seed = SeedUtils.GalaxySeed(masterSeed, galaxyIndex);
            var rng = new SeededRandom(seed);

            // Generate galaxy type
            GalaxyType galaxyType = GenerateGalaxyType(rng);

            // Generate system count
            int systemCount = rng.NextInt(
                UniverseLimits.MinSystemsPerGalaxy,
                UniverseLimits.MaxSystemsPerGalaxy);

            // Generate name
            string name = GalaxyNames.GetName(galaxyIndex);

            // Generate position
            var (centerX, centerY, centerZ, rotationAngle) = GenerateGalaxyPosition(rng, galaxyIndex);

            // Generate seeds for all systems
            var systemSeeds = new List<int>();
            for (int i = 1; i <= systemCount; i++)
            {
                systemSeeds.Add(rng.DeriveSeed(i * 1000));
            }

            return new GalaxyGenerationResult
            {
                GalaxyIndex = galaxyIndex,
                Name = name,
                Seed = seed,
                GalaxyTypeValue = galaxyType,
                SystemCount = systemCount,
                CenterX = centerX,
                CenterY = centerY,
                CenterZ = centerZ,
                RotationAngle = rotationAngle,
                SystemSeeds = systemSeeds,
            };
        }

        /// <summary>
        /// Generate all galaxies for a universe.
        /// </summary>
        public static List<GalaxyGenerationResult> GenerateAllGalaxies(int masterSeed, int? galaxyCount = null)
        {
            var rng = new SeededRandom(masterSeed);

            int count = galaxyCount ?? rng.NextInt(UniverseLimits.MinGalaxies, UniverseLimits.MaxGalaxies);

            var results = new List<GalaxyGenerationResult>();
            for (int i = 1; i <= count; i++)
            {
                results.Add(GenerateGalaxy(masterSeed, i));
            }

            return results;
        }

        /// <summary>
        /// Get statistics about galaxy distribution.
        /// </summary>
        public static GalaxyDistributionStats GetGalaxyDistributionStats(List<GalaxyGenerationResult> galaxies)
        {
            var typeDistribution = new Dictionary<GalaxyType, int>
            {
                [GalaxyType.Spiral] = 0,
                [GalaxyType.BarredSpiral] = 0,
                [GalaxyType.Elliptical] = 0,
                [GalaxyType.Irregular] = 0,
            };

            int totalSystems = 0;

            foreach (var galaxy in galaxies)
            {
                typeDistribution[galaxy.GalaxyTypeValue]++;
                totalSystems += galaxy.SystemCount;
            }

            return new GalaxyDistributionStats
            {
                TotalGalaxies = galaxies.Count,
                TotalSystems = totalSystems,
                AvgSystemsPerGalaxy = galaxies.Count > 0 ? (double)totalSystems / galaxies.Count : 0,
                TypeDistribution = typeDistribution,
            };
        }

        /// <summary>
        /// Generate star type for a solar system.
        /// </summary>
        public static StarTypeId GenerateStarType(SeededRandom rng)
        {
            double roll = rng.Next();
            double cumulative = 0;

            foreach (var (id, config) in StarTypes.All)
            {
                cumulative += config.Probability;
                if (roll < cumulative) return id;
            }

            return StarTypeId.YellowDwarf;
        }

        /// <summary>
        /// Calculate temperature for a planet at given position.
        /// </summary>
        public static (int Min, int Max) CalculateTemperature(int position, SeededRandom rng)
        {
            int baseTemp = TemperatureConstants.BaseTemp -
                (position * TemperatureConstants.TempDecreasePerPosition);

            int variation = rng.NextInt(-TemperatureConstants.TempVariation / 2,
                TemperatureConstants.TempVariation / 2);

            int tempMin = baseTemp + variation - 20;
            int tempMax = baseTemp + variation + 20;

            return (tempMin, tempMax);
        }
    }
}
