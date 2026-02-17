// =============================================================================
// EspionageSystem.cs — Espionage system utilities and constants
// Port of: src/lib/espionage/types.ts + src/lib/espionage/index.ts
// Namespace: OGameX.SharedLib.Espionage
// =============================================================================

using System;
using System.Collections.Generic;

namespace OGameX.SharedLib.Espionage
{
    // =========================================================================
    // ENUMS
    // =========================================================================

    /// <summary>
    /// Information level revealed by espionage.
    /// Based on espionage tech difference and probe count.
    /// </summary>
    public enum InfoLevel
    {
        /// <summary>Always revealed - basic resources</summary>
        Resources = 1,
        /// <summary>Revealed at +1 tech difference - fleet composition</summary>
        Fleet = 2,
        /// <summary>Revealed at +3 tech difference - defense structures</summary>
        Defense = 3,
        /// <summary>Revealed at +5 tech difference - building levels</summary>
        Buildings = 4,
        /// <summary>Revealed at +7 tech difference - research levels</summary>
        Research = 5,
    }

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    /// <summary>
    /// Espionage system constants and thresholds.
    /// </summary>
    public static class EspionageConstants
    {
        /// <summary>Tech difference thresholds for revealing information</summary>
        public static readonly Dictionary<InfoLevel, int> InfoLevelThresholds = new()
        {
            { InfoLevel.Resources, 0 },
            { InfoLevel.Fleet, 1 },
            { InfoLevel.Defense, 3 },
            { InfoLevel.Buildings, 5 },
            { InfoLevel.Research, 7 },
        };

        /// <summary>
        /// Counter-espionage base factor per tech point per probe.
        /// Formula: chance = defenderTech * probeCount * BASE_FACTOR
        /// </summary>
        public const double CounterEspionageBaseFactor = 0.02;

        /// <summary>
        /// Additional probes bonus for info level.
        /// Each probe beyond minimum adds to effective tech difference.
        /// </summary>
        public const double ProbeInfoBonus = 0.25;
    }

    /// <summary>
    /// Espionage probe combat statistics.
    /// Probes have minimal combat stats - mostly used for detection rolls.
    /// </summary>
    public static class ProbeStats
    {
        /// <summary>Base attack power (minimal)</summary>
        public const double Attack = 0.01;

        /// <summary>Base shield power (minimal)</summary>
        public const double Shield = 0.01;

        /// <summary>Hull points</summary>
        public const int Hull = 1000;

        /// <summary>Speed (very fast)</summary>
        public const int Speed = 100000000;

        /// <summary>Cargo capacity (none)</summary>
        public const int Cargo = 0;

        /// <summary>Fuel consumption per unit distance</summary>
        public const int FuelConsumption = 1;
    }

    // =========================================================================
    // TYPES
    // =========================================================================

    /// <summary>
    /// Complete espionage report structure.
    /// </summary>
    public class EspionageReport
    {
        /// <summary>Unique report identifier</summary>
        public string Id { get; set; } = "";

        /// <summary>Target planet ID</summary>
        public string TargetPlanetId { get; set; } = "";

        /// <summary>Target player ID</summary>
        public string TargetPlayerId { get; set; } = "";

        /// <summary>Target planet name</summary>
        public string TargetPlanetName { get; set; } = "";

        /// <summary>Target planet coordinates</summary>
        public string TargetCoordinates { get; set; } = "";

        /// <summary>Number of probes sent</summary>
        public int SpyCount { get; set; }

        /// <summary>Maximum info level achieved</summary>
        public InfoLevel InfoLevelValue { get; set; }

        /// <summary>Resources on target (always revealed)</summary>
        public TargetResources? Resources { get; set; }

        /// <summary>Fleet on target (info level >= 2)</summary>
        public Dictionary<string, int>? Fleet { get; set; }

        /// <summary>Defense on target (info level >= 3)</summary>
        public Dictionary<string, int>? Defense { get; set; }

        /// <summary>Buildings on target (info level >= 4)</summary>
        public Dictionary<string, int>? Buildings { get; set; }

        /// <summary>Research levels of target player (info level >= 5)</summary>
        public Dictionary<string, int>? Research { get; set; }

        /// <summary>Whether counter-espionage was triggered</summary>
        public bool CounterEspionage { get; set; }

        /// <summary>Number of probes destroyed by counter-espionage</summary>
        public int ProbesLost { get; set; }

        /// <summary>Counter-espionage chance percentage (0-1)</summary>
        public double CounterEspionageChance { get; set; }

        /// <summary>Report creation timestamp</summary>
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Result of counter-espionage check.
    /// </summary>
    public class CounterEspionageResult
    {
        /// <summary>Whether probes were detected</summary>
        public bool Detected { get; set; }

        /// <summary>Number of probes destroyed</summary>
        public int ProbesLost { get; set; }

        /// <summary>Detection chance (0-1)</summary>
        public double DetectionChance { get; set; }
    }

    /// <summary>
    /// Parameters for calculating espionage info level.
    /// </summary>
    public class EspionageCalcParams
    {
        /// <summary>Attacker's espionage technology level</summary>
        public int AttackerTech { get; set; }

        /// <summary>Defender's espionage technology level</summary>
        public int DefenderTech { get; set; }

        /// <summary>Number of probes sent</summary>
        public int ProbeCount { get; set; }
    }

    // =========================================================================
    // TARGET DATA STRUCTURES
    // =========================================================================

    /// <summary>
    /// Resources data from target planet.
    /// </summary>
    public class TargetResources
    {
        public double Metal { get; set; }
        public double Crystal { get; set; }
        public double Deuterium { get; set; }

        public TargetResources() { }

        public TargetResources(double metal, double crystal, double deuterium)
        {
            Metal = metal;
            Crystal = crystal;
            Deuterium = deuterium;
        }
    }

    /// <summary>
    /// Fleet data from target planet.
    /// </summary>
    public class TargetFleet
    {
        public int LightFighter { get; set; }
        public int HeavyFighter { get; set; }
        public int Cruiser { get; set; }
        public int Battleship { get; set; }
        public int Battlecruiser { get; set; }
        public int Bomber { get; set; }
        public int Destroyer { get; set; }
        public int Deathstar { get; set; }
        public int SmallCargo { get; set; }
        public int LargeCargo { get; set; }
        public int ColonyShip { get; set; }
        public int Recycler { get; set; }
        public int EspionageProbe { get; set; }
        public int SolarSatellite { get; set; }
        public int Crawler { get; set; }
        public int Reaper { get; set; }
        public int Pathfinder { get; set; }

        public Dictionary<string, int> ToDictionary()
        {
            return new Dictionary<string, int>
            {
                ["light_fighter"] = LightFighter,
                ["heavy_fighter"] = HeavyFighter,
                ["cruiser"] = Cruiser,
                ["battleship"] = Battleship,
                ["battlecruiser"] = Battlecruiser,
                ["bomber"] = Bomber,
                ["destroyer"] = Destroyer,
                ["deathstar"] = Deathstar,
                ["small_cargo"] = SmallCargo,
                ["large_cargo"] = LargeCargo,
                ["colony_ship"] = ColonyShip,
                ["recycler"] = Recycler,
                ["espionage_probe"] = EspionageProbe,
                ["solar_satellite"] = SolarSatellite,
                ["crawler"] = Crawler,
                ["reaper"] = Reaper,
                ["pathfinder"] = Pathfinder,
            };
        }
    }

    /// <summary>
    /// Defense data from target planet.
    /// </summary>
    public class TargetDefense
    {
        public int RocketLauncher { get; set; }
        public int LightLaser { get; set; }
        public int HeavyLaser { get; set; }
        public int GaussCannon { get; set; }
        public int IonCannon { get; set; }
        public int PlasmaTurret { get; set; }
        public int SmallShieldDome { get; set; }
        public int LargeShieldDome { get; set; }
        public int AntiBallisticMissile { get; set; }
        public int InterplanetaryMissile { get; set; }

        public Dictionary<string, int> ToDictionary()
        {
            return new Dictionary<string, int>
            {
                ["rocket_launcher"] = RocketLauncher,
                ["light_laser"] = LightLaser,
                ["heavy_laser"] = HeavyLaser,
                ["gauss_cannon"] = GaussCannon,
                ["ion_cannon"] = IonCannon,
                ["plasma_turret"] = PlasmaTurret,
                ["small_shield_dome"] = SmallShieldDome,
                ["large_shield_dome"] = LargeShieldDome,
                ["anti_ballistic_missile"] = AntiBallisticMissile,
                ["interplanetary_missile"] = InterplanetaryMissile,
            };
        }
    }

    /// <summary>
    /// Building data from target planet.
    /// </summary>
    public class TargetBuildings
    {
        public int MetalMine { get; set; }
        public int CrystalMine { get; set; }
        public int DeuteriumSynthesizer { get; set; }
        public int SolarPlant { get; set; }
        public int FusionPlant { get; set; }
        public int MetalStorage { get; set; }
        public int CrystalStorage { get; set; }
        public int DeuteriumTank { get; set; }
        public int RobotFactory { get; set; }
        public int NaniteFactory { get; set; }
        public int Shipyard { get; set; }
        public int ResearchLab { get; set; }
        public int Terraformer { get; set; }
        public int AllianceDepot { get; set; }
        public int MissileSilo { get; set; }
        public int SpaceDock { get; set; }
        public int LunarBase { get; set; }
        public int SensorPhalanx { get; set; }
        public int JumpGate { get; set; }

        public Dictionary<string, int> ToDictionary()
        {
            return new Dictionary<string, int>
            {
                ["metal_mine"] = MetalMine,
                ["crystal_mine"] = CrystalMine,
                ["deuterium_synthesizer"] = DeuteriumSynthesizer,
                ["solar_plant"] = SolarPlant,
                ["fusion_plant"] = FusionPlant,
                ["metal_storage"] = MetalStorage,
                ["crystal_storage"] = CrystalStorage,
                ["deuterium_tank"] = DeuteriumTank,
                ["robot_factory"] = RobotFactory,
                ["nanite_factory"] = NaniteFactory,
                ["shipyard"] = Shipyard,
                ["research_lab"] = ResearchLab,
                ["terraformer"] = Terraformer,
                ["alliance_depot"] = AllianceDepot,
                ["missile_silo"] = MissileSilo,
                ["space_dock"] = SpaceDock,
                ["lunar_base"] = LunarBase,
                ["sensor_phalanx"] = SensorPhalanx,
                ["jump_gate"] = JumpGate,
            };
        }
    }

    /// <summary>
    /// Research data from target player.
    /// </summary>
    public class TargetResearch
    {
        public int EnergyTechnology { get; set; }
        public int LaserTechnology { get; set; }
        public int IonTechnology { get; set; }
        public int HyperspaceTechnology { get; set; }
        public int PlasmaTechnology { get; set; }
        public int CombustionDrive { get; set; }
        public int ImpulseDrive { get; set; }
        public int HyperspaceDrive { get; set; }
        public int EspionageTechnology { get; set; }
        public int ComputerTechnology { get; set; }
        public int Astrophysics { get; set; }
        public int IntergalacticResearchNetwork { get; set; }
        public int GravitonTechnology { get; set; }
        public int WeaponsTechnology { get; set; }
        public int ShieldingTechnology { get; set; }
        public int ArmorTechnology { get; set; }

        public Dictionary<string, int> ToDictionary()
        {
            return new Dictionary<string, int>
            {
                ["energy_technology"] = EnergyTechnology,
                ["laser_technology"] = LaserTechnology,
                ["ion_technology"] = IonTechnology,
                ["hyperspace_technology"] = HyperspaceTechnology,
                ["plasma_technology"] = PlasmaTechnology,
                ["combustion_drive"] = CombustionDrive,
                ["impulse_drive"] = ImpulseDrive,
                ["hyperspace_drive"] = HyperspaceDrive,
                ["espionage_technology"] = EspionageTechnology,
                ["computer_technology"] = ComputerTechnology,
                ["astrophysics"] = Astrophysics,
                ["intergalactic_research_network"] = IntergalacticResearchNetwork,
                ["graviton_technology"] = GravitonTechnology,
                ["weapons_technology"] = WeaponsTechnology,
                ["shielding_technology"] = ShieldingTechnology,
                ["armor_technology"] = ArmorTechnology,
            };
        }
    }

    // =========================================================================
    // ESPIONAGE CALCULATOR
    // =========================================================================

    /// <summary>
    /// Espionage calculation utilities.
    /// </summary>
    public static class EspionageCalculator
    {
        /// <summary>
        /// Calculate the information level based on espionage tech difference
        /// and number of probes sent.
        ///
        /// Base level from tech difference:
        ///   Resources: always (diff >= 0)
        ///   Fleet: diff >= 1
        ///   Defense: diff >= 3
        ///   Buildings: diff >= 5
        ///   Research: diff >= 7
        ///
        /// Extra probes give bonus info (diminishing returns).
        /// </summary>
        public static InfoLevel CalculateInfoLevel(int spyTech, int defTech, int probeCount)
        {
            int techDiff = spyTech - defTech;

            // Base bonus from extra probes (diminishing returns: sqrt of probes)
            double probeBonus = Math.Sqrt(Math.Max(1, probeCount)) * EspionageConstants.ProbeInfoBonus;
            double effectiveDiff = techDiff + probeBonus;

            InfoLevel level = InfoLevel.Resources;

            if (effectiveDiff >= EspionageConstants.InfoLevelThresholds[InfoLevel.Research])
                level = InfoLevel.Research;
            else if (effectiveDiff >= EspionageConstants.InfoLevelThresholds[InfoLevel.Buildings])
                level = InfoLevel.Buildings;
            else if (effectiveDiff >= EspionageConstants.InfoLevelThresholds[InfoLevel.Defense])
                level = InfoLevel.Defense;
            else if (effectiveDiff >= EspionageConstants.InfoLevelThresholds[InfoLevel.Fleet])
                level = InfoLevel.Fleet;

            return level;
        }

        /// <summary>
        /// Calculate counter-espionage detection chance and probe losses.
        /// Formula: detectionChance = defenderEspionageTech * probeCount * 2%
        /// </summary>
        public static CounterEspionageResult CalculateCounterEspionage(int defTech, int probeCount)
        {
            double detectionChance = defTech * probeCount * EspionageConstants.CounterEspionageBaseFactor;
            detectionChance = Math.Min(1.0, detectionChance);

            return new CounterEspionageResult
            {
                Detected = false, // Must be rolled externally
                ProbesLost = 0,
                DetectionChance = detectionChance,
            };
        }

        /// <summary>
        /// Calculate probe losses when detected.
        /// </summary>
        public static int CalculateProbesLost(double detectionChance, int probeCount)
        {
            // Proportional probe loss based on detection strength
            double lossFraction = Math.Min(1.0, detectionChance);
            int probesLost = Math.Max(1, (int)Math.Ceiling(probeCount * lossFraction));
            return Math.Min(probesLost, probeCount);
        }

        /// <summary>
        /// Check if given info level reveals fleet information.
        /// </summary>
        public static bool RevealsFleet(InfoLevel level) => (int)level >= (int)InfoLevel.Fleet;

        /// <summary>
        /// Check if given info level reveals defense information.
        /// </summary>
        public static bool RevealsDefense(InfoLevel level) => (int)level >= (int)InfoLevel.Defense;

        /// <summary>
        /// Check if given info level reveals building information.
        /// </summary>
        public static bool RevealsBuildings(InfoLevel level) => (int)level >= (int)InfoLevel.Buildings;

        /// <summary>
        /// Check if given info level reveals research information.
        /// </summary>
        public static bool RevealsResearch(InfoLevel level) => (int)level >= (int)InfoLevel.Research;
    }
}
