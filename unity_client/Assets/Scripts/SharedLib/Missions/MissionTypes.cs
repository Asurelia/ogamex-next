// =============================================================================
// MissionTypes.cs — Mission System Types
// Port of: src/lib/missions/types.ts
// Namespace: OGameX.SharedLib.Missions
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using OGameX.SharedLib.Battle;

namespace OGameX.SharedLib.Missions
{
    // =========================================================================
    // MISSION ENUMS & CONSTANTS
    // =========================================================================

    /// <summary>
    /// Numeric mission type identifiers (OGame-compatible).
    /// </summary>
    public enum MissionTypeId
    {
        Attack = 1,
        ACSAttack = 2,
        Transport = 3,
        Deployment = 4,
        ACSDefend = 5,
        Espionage = 6,
        Colonization = 7,
        Recycle = 8,
        MoonDestruction = 9,
        Expedition = 15,
        // Exploration missions (Sprint 2)
        ExplorationScan = 20,
        ExplorationDeep = 21,
        ExplorationMap = 22,
        DeploySatellite = 23,
    }

    /// <summary>
    /// String-based mission type (matches DB enum values).
    /// </summary>
    public enum MissionType
    {
        Attack,
        ACSAttack,
        Transport,
        Deployment,
        ACSDefend,
        Espionage,
        Colonization,
        Recycle,
        MoonDestruction,
        Expedition,
    }

    /// <summary>
    /// Maps string-based MissionType to numeric MissionTypeId.
    /// </summary>
    public static class MissionTypeMapping
    {
        private static readonly Dictionary<MissionType, MissionTypeId> Map = new()
        {
            { MissionType.Attack, MissionTypeId.Attack },
            { MissionType.ACSAttack, MissionTypeId.ACSAttack },
            { MissionType.Transport, MissionTypeId.Transport },
            { MissionType.Deployment, MissionTypeId.Deployment },
            { MissionType.ACSDefend, MissionTypeId.ACSDefend },
            { MissionType.Espionage, MissionTypeId.Espionage },
            { MissionType.Colonization, MissionTypeId.Colonization },
            { MissionType.Recycle, MissionTypeId.Recycle },
            { MissionType.MoonDestruction, MissionTypeId.MoonDestruction },
            { MissionType.Expedition, MissionTypeId.Expedition },
        };

        public static MissionTypeId ToId(MissionType type) => Map[type];

        public static MissionType? FromId(MissionTypeId id) =>
            Map.FirstOrDefault(kv => kv.Value == id).Key;
    }

    // =========================================================================
    // RESOURCE TYPES
    // =========================================================================

    /// <summary>
    /// Resource container (metal, crystal, deuterium).
    /// </summary>
    public class Resources
    {
        public double Metal { get; set; }
        public double Crystal { get; set; }
        public double Deuterium { get; set; }

        public Resources() { }

        public Resources(double metal, double crystal, double deuterium)
        {
            Metal = metal;
            Crystal = crystal;
            Deuterium = deuterium;
        }

        public static Resources Empty() => new(0, 0, 0);

        public double Sum() => Metal + Crystal + Deuterium;

        public bool HasResources() => Metal > 0 || Crystal > 0 || Deuterium > 0;

        public Resources Clone() => new(Metal, Crystal, Deuterium);

        public void Add(Resources other)
        {
            Metal += other.Metal;
            Crystal += other.Crystal;
            Deuterium += other.Deuterium;
        }

        public void Subtract(Resources other)
        {
            Metal = Math.Max(0, Metal - other.Metal);
            Crystal = Math.Max(0, Crystal - other.Crystal);
            Deuterium = Math.Max(0, Deuterium - other.Deuterium);
        }
    }

    // =========================================================================
    // SHIP TYPES
    // =========================================================================

    /// <summary>
    /// Ship type keys matching database column names.
    /// </summary>
    public enum ShipType
    {
        LightFighter,
        HeavyFighter,
        Cruiser,
        Battleship,
        Battlecruiser,
        Bomber,
        Destroyer,
        Deathstar,
        SmallCargo,
        LargeCargo,
        ColonyShip,
        Recycler,
        EspionageProbe,
        Reaper,
        Pathfinder,
    }

    /// <summary>
    /// Ship counts container with per-type quantities.
    /// </summary>
    public class ShipCounts
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
        public int Reaper { get; set; }
        public int Pathfinder { get; set; }

        /// <summary>All ship type enum values in order.</summary>
        public static readonly ShipType[] AllTypes = (ShipType[])Enum.GetValues(typeof(ShipType));

        /// <summary>DB column name mapping for each ShipType.</summary>
        public static readonly Dictionary<ShipType, string> DbKeys = new()
        {
            { ShipType.LightFighter, "light_fighter" },
            { ShipType.HeavyFighter, "heavy_fighter" },
            { ShipType.Cruiser, "cruiser" },
            { ShipType.Battleship, "battleship" },
            { ShipType.Battlecruiser, "battlecruiser" },
            { ShipType.Bomber, "bomber" },
            { ShipType.Destroyer, "destroyer" },
            { ShipType.Deathstar, "deathstar" },
            { ShipType.SmallCargo, "small_cargo" },
            { ShipType.LargeCargo, "large_cargo" },
            { ShipType.ColonyShip, "colony_ship" },
            { ShipType.Recycler, "recycler" },
            { ShipType.EspionageProbe, "espionage_probe" },
            { ShipType.Reaper, "reaper" },
            { ShipType.Pathfinder, "pathfinder" },
        };

        /// <summary>Display name for each ShipType.</summary>
        public static readonly Dictionary<ShipType, string> DisplayNames = new()
        {
            { ShipType.LightFighter, "Light Fighter" },
            { ShipType.HeavyFighter, "Heavy Fighter" },
            { ShipType.Cruiser, "Cruiser" },
            { ShipType.Battleship, "Battleship" },
            { ShipType.Battlecruiser, "Battlecruiser" },
            { ShipType.Bomber, "Bomber" },
            { ShipType.Destroyer, "Destroyer" },
            { ShipType.Deathstar, "Deathstar" },
            { ShipType.SmallCargo, "Small Cargo" },
            { ShipType.LargeCargo, "Large Cargo" },
            { ShipType.ColonyShip, "Colony Ship" },
            { ShipType.Recycler, "Recycler" },
            { ShipType.EspionageProbe, "Espionage Probe" },
            { ShipType.Reaper, "Reaper" },
            { ShipType.Pathfinder, "Pathfinder" },
        };

        public static ShipCounts Empty() => new();

        public int GetTotal()
        {
            return LightFighter + HeavyFighter + Cruiser + Battleship +
                   Battlecruiser + Bomber + Destroyer + Deathstar +
                   SmallCargo + LargeCargo + ColonyShip + Recycler +
                   EspionageProbe + Reaper + Pathfinder;
        }

        public int Get(ShipType type) => type switch
        {
            ShipType.LightFighter => LightFighter,
            ShipType.HeavyFighter => HeavyFighter,
            ShipType.Cruiser => Cruiser,
            ShipType.Battleship => Battleship,
            ShipType.Battlecruiser => Battlecruiser,
            ShipType.Bomber => Bomber,
            ShipType.Destroyer => Destroyer,
            ShipType.Deathstar => Deathstar,
            ShipType.SmallCargo => SmallCargo,
            ShipType.LargeCargo => LargeCargo,
            ShipType.ColonyShip => ColonyShip,
            ShipType.Recycler => Recycler,
            ShipType.EspionageProbe => EspionageProbe,
            ShipType.Reaper => Reaper,
            ShipType.Pathfinder => Pathfinder,
            _ => 0,
        };

        public void Set(ShipType type, int value)
        {
            switch (type)
            {
                case ShipType.LightFighter: LightFighter = value; break;
                case ShipType.HeavyFighter: HeavyFighter = value; break;
                case ShipType.Cruiser: Cruiser = value; break;
                case ShipType.Battleship: Battleship = value; break;
                case ShipType.Battlecruiser: Battlecruiser = value; break;
                case ShipType.Bomber: Bomber = value; break;
                case ShipType.Destroyer: Destroyer = value; break;
                case ShipType.Deathstar: Deathstar = value; break;
                case ShipType.SmallCargo: SmallCargo = value; break;
                case ShipType.LargeCargo: LargeCargo = value; break;
                case ShipType.ColonyShip: ColonyShip = value; break;
                case ShipType.Recycler: Recycler = value; break;
                case ShipType.EspionageProbe: EspionageProbe = value; break;
                case ShipType.Reaper: Reaper = value; break;
                case ShipType.Pathfinder: Pathfinder = value; break;
            }
        }

        public void Add(ShipType type, int amount) => Set(type, Get(type) + amount);

        public ShipCounts Clone()
        {
            var clone = new ShipCounts();
            foreach (var t in AllTypes) clone.Set(t, Get(t));
            return clone;
        }

        /// <summary>Add all ships from another ShipCounts.</summary>
        public void AddAll(ShipCounts other)
        {
            foreach (var t in AllTypes) Set(t, Get(t) + other.Get(t));
        }

        /// <summary>Subtract ships, clamping to zero.</summary>
        public void SubtractAll(ShipCounts other)
        {
            foreach (var t in AllTypes) Set(t, Math.Max(0, Get(t) - other.Get(t)));
        }

        /// <summary>Build a formatted list of non-zero ship counts for messages.</summary>
        public string FormatList()
        {
            var lines = new List<string>();
            foreach (var t in AllTypes)
            {
                int count = Get(t);
                if (count > 0)
                    lines.Add($"  {DisplayNames[t]}: {count:N0}");
            }
            return lines.Count > 0 ? string.Join("\n", lines) : "  None";
        }
    }

    // =========================================================================
    // COORDINATE TYPES
    // =========================================================================

    /// <summary>
    /// Galactic coordinates (galaxy:system:position).
    /// </summary>
    public struct Coordinates
    {
        public int Galaxy { get; set; }
        public int System { get; set; }
        public int Position { get; set; }

        public Coordinates(int galaxy, int system, int position)
        {
            Galaxy = galaxy;
            System = system;
            Position = position;
        }

        public string Format() => $"[{Galaxy}:{System}:{Position}]";

        public override string ToString() => Format();
    }

    // =========================================================================
    // PLANET TYPE
    // =========================================================================

    /// <summary>Target planet type for mission destinations.</summary>
    public enum PlanetType
    {
        Planet,
        Moon,
        DebrisField,
    }

    // =========================================================================
    // FLEET MISSION DATA
    // =========================================================================

    /// <summary>
    /// Represents a fleet mission record (mirrors DB schema).
    /// </summary>
    public class FleetMission
    {
        public string Id { get; set; } = "";
        public string UserId { get; set; } = "";

        // Origin
        public string OriginPlanetId { get; set; } = "";
        public int OriginGalaxy { get; set; }
        public int OriginSystem { get; set; }
        public int OriginPosition { get; set; }

        // Destination
        public int DestinationGalaxy { get; set; }
        public int DestinationSystem { get; set; }
        public int DestinationPosition { get; set; }
        public PlanetType DestinationType { get; set; } = PlanetType.Planet;

        // Mission
        public MissionType MissionTypeValue { get; set; } = MissionType.Transport;

        // Ships
        public ShipCounts Ships { get; set; } = new();

        // Resources
        public Resources CargoResources { get; set; } = new();

        // Timing
        public DateTime DepartedAt { get; set; }
        public DateTime ArrivesAt { get; set; }
        public DateTime? ReturnsAt { get; set; }

        // Status
        public bool IsReturning { get; set; }
        public bool Processed { get; set; }
        public bool Cancelled { get; set; }

        // Convenience
        public Coordinates OriginCoords => new(OriginGalaxy, OriginSystem, OriginPosition);
        public Coordinates DestinationCoords => new(DestinationGalaxy, DestinationSystem, DestinationPosition);
    }

    // =========================================================================
    // PLANET DATA (simplified for mission context)
    // =========================================================================

    /// <summary>
    /// Planet data as needed by mission handlers.
    /// </summary>
    public class PlanetData
    {
        public string Id { get; set; } = "";
        public string UserId { get; set; } = "";
        public string Name { get; set; } = "";

        public int Galaxy { get; set; }
        public int System { get; set; }
        public int Position { get; set; }
        public PlanetType Type { get; set; } = PlanetType.Planet;

        public double Metal { get; set; }
        public double Crystal { get; set; }
        public double Deuterium { get; set; }

        // Ships stationed on this planet
        public ShipCounts Ships { get; set; } = new();

        // Defense structures (key → count)
        public Dictionary<string, int> Defense { get; set; } = new();

        // Building levels (key → level)
        public Dictionary<string, int> Buildings { get; set; } = new();

        // Moon-specific
        public int Diameter { get; set; }
        public int Fields { get; set; }
        public int TempMin { get; set; }
        public int TempMax { get; set; }

        public Coordinates Coords => new(Galaxy, System, Position);
    }

    // =========================================================================
    // USER RESEARCH DATA
    // =========================================================================

    /// <summary>
    /// User research levels as needed by mission handlers.
    /// </summary>
    public class UserResearch
    {
        public string UserId { get; set; } = "";
        public int EspionageTechnology { get; set; }
        public int ComputerTechnology { get; set; }
        public int WeaponsTechnology { get; set; }
        public int ShieldingTechnology { get; set; }
        public int ArmorTechnology { get; set; }
        public int Astrophysics { get; set; }
        public int EnergyTechnology { get; set; }
        public int LaserTechnology { get; set; }
        public int IonTechnology { get; set; }
        public int HyperspaceTechnology { get; set; }
        public int PlasmaTechnology { get; set; }
        public int CombustionDrive { get; set; }
        public int ImpulseDrive { get; set; }
        public int HyperspaceDrive { get; set; }
        public int IntergalacticResearchNetwork { get; set; }
        public int GravitonTechnology { get; set; }

        /// <summary>All research keys for report extraction.</summary>
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
    // MISSION CONTEXT
    // =========================================================================

    /// <summary>
    /// Context passed to mission handlers with all necessary data.
    /// </summary>
    public class MissionContext
    {
        public FleetMission Mission { get; set; } = new();
        public PlanetData? OriginPlanet { get; set; }
        public PlanetData? TargetPlanet { get; set; }
        public UserResearch? AttackerResearch { get; set; }
        public UserResearch? DefenderResearch { get; set; }
    }

    // =========================================================================
    // MISSION RESULT TYPES
    // =========================================================================

    /// <summary>
    /// Result of processing a mission arrival.
    /// </summary>
    public class MissionArrivalResult
    {
        public bool Success { get; set; }
        public bool ShouldReturn { get; set; }
        public Resources ReturnResources { get; set; } = Resources.Empty();
        public ShipCounts ReturnShips { get; set; } = ShipCounts.Empty();
        public List<MissionMessage> Messages { get; set; } = new();
        public List<MissionUpdate> Updates { get; set; } = new();
        public string? Error { get; set; }
    }

    /// <summary>
    /// Result of processing a mission return.
    /// </summary>
    public class MissionReturnResult
    {
        public bool Success { get; set; }
        public List<MissionMessage> Messages { get; set; } = new();
        public List<MissionUpdate> Updates { get; set; } = new();
        public string? Error { get; set; }
    }

    /// <summary>
    /// Generic mission processing result.
    /// </summary>
    public class MissionProcessResult
    {
        public bool Success { get; set; }
        public int ProcessedCount { get; set; }
        public List<MissionError> Errors { get; set; } = new();
    }

    /// <summary>
    /// Mission error for logging/reporting.
    /// </summary>
    public class MissionError
    {
        public string MissionId { get; set; } = "";
        public MissionType MissionTypeValue { get; set; }
        public string ErrorMessage { get; set; } = "";
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    // =========================================================================
    // MESSAGE TYPES
    // =========================================================================

    /// <summary>Message recipient type.</summary>
    public enum MessageRecipient
    {
        Origin,
        Target,
        Both,
    }

    /// <summary>Message category type.</summary>
    public enum MessageType
    {
        Transport,
        Battle,
        Espionage,
        Expedition,
        System,
    }

    /// <summary>
    /// Mission message to be sent to a player.
    /// </summary>
    public class MissionMessage
    {
        public MessageRecipient Recipient { get; set; }
        public string UserId { get; set; } = "";
        public MessageType Type { get; set; }
        public string Subject { get; set; } = "";
        public string Body { get; set; } = "";
    }

    // =========================================================================
    // UPDATE TYPES
    // =========================================================================

    /// <summary>Update target type.</summary>
    public enum UpdateTarget
    {
        OriginPlanet,
        TargetPlanet,
        DebrisField,
        Mission,
    }

    /// <summary>
    /// Mission update to be applied to a target entity.
    /// </summary>
    public class MissionUpdate
    {
        public UpdateTarget Target { get; set; }
        public string TargetId { get; set; } = "";
        public Dictionary<string, object> Data { get; set; } = new();
    }

    // =========================================================================
    // MISSION HANDLER INTERFACE
    // =========================================================================

    /// <summary>
    /// Interface that all mission handlers must implement.
    /// </summary>
    public interface IMissionHandler
    {
        /// <summary>Mission type this handler processes.</summary>
        MissionType HandlerMissionType { get; }

        /// <summary>Whether this mission type has a return trip.</summary>
        bool HasReturn { get; }

        /// <summary>Display name for the mission.</summary>
        string Name { get; }

        /// <summary>Process mission arrival at destination.</summary>
        MissionArrivalResult ProcessArrival(MissionContext context);

        /// <summary>Process mission return to origin.</summary>
        MissionReturnResult ProcessReturn(MissionContext context);
    }

    // =========================================================================
    // MISSION PROCESSOR OPTIONS
    // =========================================================================

    /// <summary>
    /// Options for the mission processor.
    /// </summary>
    public class MissionProcessorOptions
    {
        /// <summary>Maximum missions to process in one batch.</summary>
        public int BatchSize { get; set; } = 100;

        /// <summary>Whether to continue on errors.</summary>
        public bool ContinueOnError { get; set; } = true;

        /// <summary>Custom timestamp for testing.</summary>
        public DateTime CurrentTime { get; set; } = DateTime.UtcNow;
    }

    // =========================================================================
    // BATTLE TYPES (for AttackMission)
    // =========================================================================

    /// <summary>
    /// A single unit type in a battle fleet.
    /// </summary>
    public class BattleUnit
    {
        public ShipType ShipKey { get; set; }
        public int Amount { get; set; }
        public double StructuralIntegrity { get; set; }
        public double ShieldPower { get; set; }
        public double WeaponPower { get; set; }
    }

    /// <summary>
    /// A fleet participating in battle.
    /// </summary>
    public class BattleFleet
    {
        public string UserId { get; set; } = "";
        public List<BattleUnit> Units { get; set; } = new();
        public int WeaponTech { get; set; }
        public int ShieldTech { get; set; }
        public int ArmorTech { get; set; }
    }

    /// <summary>
    /// A single round of battle.
    /// </summary>
    public class BattleRound
    {
        public int RoundNumber { get; set; }
        public ShipCounts AttackerShips { get; set; } = new();
        public ShipCounts DefenderShips { get; set; } = new();
        public ShipCounts AttackerLosses { get; set; } = new();
        public ShipCounts DefenderLosses { get; set; } = new();
    }

    // Note: BattleWinner enum is defined in OGameX.SharedLib.Battle.BattleTypes
    // and imported via the using directive at the top of this file.

    /// <summary>
    /// Result of a complete battle simulation (mission-level).
    /// Uses BattleWinner from Battle namespace.
    /// </summary>
    public class MissionBattleResult
    {
        public BattleWinner Winner { get; set; }
        public List<BattleRound> Rounds { get; set; } = new();
        public int TotalRounds { get; set; }
        public Resources AttackerLossesValue { get; set; } = Resources.Empty();
        public Resources DefenderLossesValue { get; set; } = Resources.Empty();
        public Resources Loot { get; set; } = Resources.Empty();
        public Resources Debris { get; set; } = Resources.Empty();
        public double MoonChance { get; set; }
        public bool MoonCreated { get; set; }
        public ShipCounts AttackerRemainingShips { get; set; } = new();
        public ShipCounts DefenderRemainingShips { get; set; } = new();
        public Dictionary<string, int> DefenderRemainingDefense { get; set; } = new();
        public ShipCounts AttackerShipLosses { get; set; } = new();
        public ShipCounts DefenderShipLosses { get; set; } = new();
        public Dictionary<string, int> DefenderDefenseLosses { get; set; } = new();
    }

    // =========================================================================
    // ESPIONAGE TYPES
    // =========================================================================

    /// <summary>Espionage information detail level.</summary>
    public enum InfoLevel
    {
        Resources = 1,
        Fleet = 2,
        Defense = 3,
        Buildings = 4,
        Research = 5,
    }

    /// <summary>
    /// Espionage info level tech-difference thresholds.
    /// </summary>
    public static class EspionageConstants
    {
        public static readonly Dictionary<InfoLevel, int> InfoLevelThresholds = new()
        {
            { InfoLevel.Resources, 0 },
            { InfoLevel.Fleet, 1 },
            { InfoLevel.Defense, 3 },
            { InfoLevel.Buildings, 5 },
            { InfoLevel.Research, 7 },
        };

        /// <summary>Counter-espionage base factor per tech point per probe.</summary>
        public const double CounterEspionageBaseFactor = 0.02;

        /// <summary>Bonus info per extra probe (diminishing returns).</summary>
        public const double ProbeInfoBonus = 0.25;
    }

    /// <summary>
    /// Counter-espionage detection result.
    /// </summary>
    public class CounterEspionageResult
    {
        public bool Detected { get; set; }
        public int ProbesLost { get; set; }
        public double DetectionChance { get; set; }
    }

    /// <summary>
    /// Full espionage report.
    /// </summary>
    public class EspionageReport
    {
        public string Id { get; set; } = "";
        public string TargetPlanetId { get; set; } = "";
        public string TargetPlayerId { get; set; } = "";
        public string TargetPlanetName { get; set; } = "";
        public string TargetCoordinates { get; set; } = "";
        public int SpyCount { get; set; }
        public InfoLevel InfoLevelValue { get; set; }
        public bool CounterEspionageDetected { get; set; }
        public int ProbesLost { get; set; }
        public double CounterEspionageChance { get; set; }
        public DateTime CreatedAt { get; set; }

        // Data sections (null = not revealed at this info level)
        public Resources? ReportResources { get; set; }
        public Dictionary<string, int>? Fleet { get; set; }
        public Dictionary<string, int>? ReportDefense { get; set; }
        public Dictionary<string, int>? ReportBuildings { get; set; }
        public Dictionary<string, int>? ReportResearch { get; set; }
    }

    // =========================================================================
    // EXPEDITION TYPES
    // =========================================================================

    /// <summary>Possible expedition outcomes.</summary>
    public enum ExpeditionOutcome
    {
        Nothing,
        ResourcesFound,
        DarkMatter,
        ShipFound,
        PirateAttack,
        AlienAttack,
        Delay,
        EarlyReturn,
        BlackHole,
    }

    /// <summary>
    /// Result of an expedition event.
    /// </summary>
    public class ExpeditionEventResult
    {
        public ExpeditionOutcome Outcome { get; set; }
        public Resources? FoundResources { get; set; }
        public int DarkMatterFound { get; set; }
        public Dictionary<ShipType, int>? ShipsGained { get; set; }
        public Dictionary<ShipType, int>? ShipsLost { get; set; }
        public double TimeModifier { get; set; } = 1.0;
        public string EventMessage { get; set; } = "";
    }

    // =========================================================================
    // EXPLORATION TYPES
    // =========================================================================

    /// <summary>Exploration mission subtypes.</summary>
    public enum ExplorationMissionType
    {
        QuickScan,
        DeepScan,
        Cartography,
        SatelliteDeploy,
    }

    /// <summary>Discovery level from exploration.</summary>
    public enum DiscoveryLevel
    {
        Detected,
        Scanned,
        Mapped,
        Charted,
    }

    /// <summary>
    /// Colonization position data (planet fields by orbital position).
    /// </summary>
    public static class ColonizationConstants
    {
        /// <summary>
        /// Planet field ranges by orbital position (OGame original values).
        /// Key = position (1-15), Value = (min, max) fields.
        /// </summary>
        public static readonly Dictionary<int, (int Min, int Max)> FieldsByPosition = new()
        {
            { 1, (40, 70) },
            { 2, (43, 77) },
            { 3, (47, 84) },
            { 4, (75, 120) },
            { 5, (95, 130) },
            { 6, (105, 145) },
            { 7, (110, 150) },
            { 8, (114, 155) },
            { 9, (110, 150) },
            { 10, (105, 145) },
            { 11, (95, 130) },
            { 12, (75, 120) },
            { 13, (47, 84) },
            { 14, (43, 77) },
            { 15, (40, 70) },
        };

        /// <summary>
        /// Temperature ranges by orbital position (min, max) in °C.
        /// Closer to star = hotter.
        /// </summary>
        public static readonly Dictionary<int, (int Min, int Max)> TemperatureByPosition = new()
        {
            { 1, (220, 260) },
            { 2, (170, 220) },
            { 3, (120, 170) },
            { 4, (70, 120) },
            { 5, (60, 100) },
            { 6, (50, 90) },
            { 7, (40, 80) },
            { 8, (30, 70) },
            { 9, (20, 60) },
            { 10, (10, 50) },
            { 11, (0, 40) },
            { 12, (-10, 30) },
            { 13, (-50, -10) },
            { 14, (-90, -50) },
            { 15, (-130, -90) },
        };

        /// <summary>Maximum number of planets (including homeworld).</summary>
        public const int MaxPlanets = 9;

        /// <summary>Starting resources for a new colony.</summary>
        public static Resources ColonyStartingResources => new(500, 500, 0);
    }

    // =========================================================================
    // DEFENSE KEYS
    // =========================================================================

    /// <summary>
    /// Defense structure type keys matching database column names.
    /// </summary>
    public static class DefenseKeys
    {
        public static readonly string[] All =
        {
            "rocket_launcher",
            "light_laser",
            "heavy_laser",
            "gauss_cannon",
            "ion_cannon",
            "plasma_turret",
            "small_shield_dome",
            "large_shield_dome",
            "anti_ballistic_missile",
            "interplanetary_missile",
        };

        public static readonly Dictionary<string, string> DisplayNames = new()
        {
            ["rocket_launcher"] = "Rocket Launcher",
            ["light_laser"] = "Light Laser",
            ["heavy_laser"] = "Heavy Laser",
            ["gauss_cannon"] = "Gauss Cannon",
            ["ion_cannon"] = "Ion Cannon",
            ["plasma_turret"] = "Plasma Turret",
            ["small_shield_dome"] = "Small Shield Dome",
            ["large_shield_dome"] = "Large Shield Dome",
            ["anti_ballistic_missile"] = "Anti-Ballistic Missile",
            ["interplanetary_missile"] = "Interplanetary Missile",
        };
    }

    // =========================================================================
    // BUILDING KEYS
    // =========================================================================

    /// <summary>
    /// Building type keys matching database column names.
    /// </summary>
    public static class BuildingKeys
    {
        public static readonly string[] All =
        {
            "metal_mine", "crystal_mine", "deuterium_synthesizer",
            "solar_plant", "fusion_plant",
            "metal_storage", "crystal_storage", "deuterium_tank",
            "robot_factory", "nanite_factory", "shipyard",
            "research_lab", "terraformer", "alliance_depot",
            "missile_silo", "space_dock",
            "lunar_base", "sensor_phalanx", "jump_gate",
        };
    }

    // =========================================================================
    // MOON DESTRUCTION CONSTANTS
    // =========================================================================

    /// <summary>
    /// Moon destruction formula constants.
    /// </summary>
    public static class MoonDestructionConstants
    {
        /// <summary>
        /// Moon destruction chance = (100 - sqrt(diameter)) * ripsCount / 100.
        /// Capped at this maximum percent.
        /// </summary>
        public const double MaxMoonDestroyChance = 100.0;

        /// <summary>
        /// RIP (Deathstar) destruction chance = sqrt(diameter) / 2.
        /// Capped at this maximum percent.
        /// </summary>
        public const double MaxRipDestroyChance = 50.0;
    }

    // =========================================================================
    // RECYCLER CONSTANTS
    // =========================================================================

    /// <summary>
    /// Recycler capacity for debris collection.
    /// </summary>
    public static class RecyclerConstants
    {
        /// <summary>Cargo capacity per recycler ship.</summary>
        public const int CapacityPerRecycler = 20000;
    }

    // =========================================================================
    // DEBRIS FIELD
    // =========================================================================

    /// <summary>
    /// Debris field at a coordinate position.
    /// </summary>
    public class DebrisField
    {
        public string Id { get; set; } = "";
        public int Galaxy { get; set; }
        public int System { get; set; }
        public int Position { get; set; }
        public double Metal { get; set; }
        public double Crystal { get; set; }

        public double Total => Metal + Crystal;
    }

    /// <summary>
    /// Result of collecting debris from a debris field.
    /// </summary>
    public class DebrisCollectionResult
    {
        public double MetalCollected { get; set; }
        public double CrystalCollected { get; set; }
        public double MetalRemaining { get; set; }
        public double CrystalRemaining { get; set; }
        public bool FieldDepleted { get; set; }
    }
}
