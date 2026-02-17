// =============================================================================
// GalaxyTypes.cs — Galaxy system types and enums
// Port of: src/lib/galaxy/types.ts
// Namespace: OGameX.SharedLib.Galaxy
// =============================================================================

using System;
using System.Collections.Generic;

namespace OGameX.SharedLib.Galaxy
{
    // =========================================================================
    // ENUMS
    // =========================================================================

    /// <summary>
    /// Galaxy morphology type.
    /// </summary>
    public enum GalaxyType
    {
        Spiral,
        Elliptical,
        Irregular,
        BarredSpiral,
    }

    /// <summary>
    /// Star type identifier.
    /// </summary>
    public enum StarTypeId
    {
        YellowDwarf,
        RedDwarf,
        OrangeDwarf,
        WhiteDwarf,
        RedGiant,
        BlueGiant,
        BinaryYellow,
        BinaryRed,
        BinaryMixed,
        NeutronStar,
        BlackHole,
        WhiteGiant,
    }

    /// <summary>
    /// Celestial body type.
    /// </summary>
    public enum CelestialBodyType
    {
        RockyPlanet,
        GasGiant,
        IceGiant,
        DwarfPlanet,
        Moon,
        AsteroidField,
    }

    /// <summary>
    /// Planet visual type for rendering.
    /// </summary>
    public enum PlanetVisualType
    {
        Desert,
        Dry,
        Gas,
        Ice,
        Jungle,
        Normal,
        Water,
    }

    // =========================================================================
    // UNIVERSE CONFIG
    // =========================================================================

    /// <summary>
    /// Universe configuration.
    /// </summary>
    public class UniverseConfig
    {
        public string Id { get; set; } = "";
        public int MasterSeed { get; set; }
        public string Name { get; set; } = "";
        public int GalaxyCount { get; set; }
        public int SystemsPerGalaxyMin { get; set; }
        public int SystemsPerGalaxyMax { get; set; }
        public double UniverseSpeed { get; set; }
        public double FleetSpeed { get; set; }
        public double ResourceMultiplier { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // =========================================================================
    // STAR TYPE
    // =========================================================================

    /// <summary>
    /// Star type definition with properties and effects.
    /// </summary>
    public class StarType
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

    // =========================================================================
    // GALAXY
    // =========================================================================

    /// <summary>
    /// Galaxy entity.
    /// </summary>
    public class GalaxyData
    {
        public string Id { get; set; } = "";
        public int GalaxyIndex { get; set; }
        public string Name { get; set; } = "";
        public int Seed { get; set; }
        public GalaxyType GalaxyTypeValue { get; set; }
        public int SystemCount { get; set; }
        public double CenterX { get; set; }
        public double CenterY { get; set; }
        public double CenterZ { get; set; }
        public double RotationAngle { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Galaxy summary for listings.
    /// </summary>
    public class GalaxySummary
    {
        public string Id { get; set; } = "";
        public int GalaxyIndex { get; set; }
        public string Name { get; set; } = "";
        public GalaxyType GalaxyTypeValue { get; set; }
        public int SystemCount { get; set; }
        public int? ColonizedSystems { get; set; }
        public int? TotalPlayers { get; set; }
    }

    // =========================================================================
    // SOLAR SYSTEM
    // =========================================================================

    /// <summary>
    /// Solar system entity.
    /// </summary>
    public class SolarSystem
    {
        public string Id { get; set; } = "";
        public string GalaxyId { get; set; } = "";
        public int SystemIndex { get; set; }
        public int Seed { get; set; }
        public StarTypeId StarType { get; set; }
        public StarTypeId? SecondaryStarType { get; set; }
        public int PlanetCount { get; set; }
        public double HabitableZoneInner { get; set; }
        public double HabitableZoneOuter { get; set; }
        public double PositionX { get; set; }
        public double PositionY { get; set; }
        public double PositionZ { get; set; }
        public bool IsGenerated { get; set; }
        public DateTime? GeneratedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Solar system with star data.
    /// </summary>
    public class SolarSystemWithStar : SolarSystem
    {
        public StarType Star { get; set; } = new();
        public StarType? SecondaryStar { get; set; }
    }

    /// <summary>
    /// Solar system summary for listings.
    /// </summary>
    public class SolarSystemSummary
    {
        public string Id { get; set; } = "";
        public int SystemIndex { get; set; }
        public StarTypeId StarType { get; set; }
        public string StarColor { get; set; } = "";
        public int PlanetCount { get; set; }
        public int ColonizedPlanets { get; set; }
        public bool HasExoticStar { get; set; }
    }

    // =========================================================================
    // CELESTIAL BODY
    // =========================================================================

    /// <summary>
    /// Celestial body entity (planet, moon, asteroid field, etc.).
    /// </summary>
    public class CelestialBody
    {
        public string Id { get; set; } = "";
        public string SolarSystemId { get; set; } = "";
        public string? ParentBodyId { get; set; }
        public CelestialBodyType BodyType { get; set; }
        public int OrbitalPosition { get; set; }
        public string Name { get; set; } = "";
        public int Diameter { get; set; }
        public int FieldsMax { get; set; }
        public int MoonCapacity { get; set; }
        public int TemperatureMin { get; set; }
        public int TemperatureMax { get; set; }
        public string AtmosphereType { get; set; } = "";
        public int Seed { get; set; }
        public PlanetVisualType PlanetVisualTypeValue { get; set; }
        public int PlanetVisualVariant { get; set; }
        public bool HasRings { get; set; }
        public string? RingColor { get; set; }
        public double MetalMultiplier { get; set; }
        public double CrystalMultiplier { get; set; }
        public double DeuteriumMultiplier { get; set; }
        public bool IsColonizable { get; set; }
        public DateTime? ColonizedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// Celestial body with moons.
    /// </summary>
    public class CelestialBodyWithMoons : CelestialBody
    {
        public List<CelestialBody> Moons { get; set; } = new();
    }

    /// <summary>
    /// Celestial body summary for listings.
    /// </summary>
    public class CelestialBodySummary
    {
        public string Id { get; set; } = "";
        public int OrbitalPosition { get; set; }
        public string Name { get; set; } = "";
        public CelestialBodyType BodyType { get; set; }
        public int Diameter { get; set; }
        public int FieldsMax { get; set; }
        public bool IsColonizable { get; set; }
        public bool IsColonized { get; set; }
        public string? OwnerId { get; set; }
        public string? OwnerName { get; set; }
        public int MoonCount { get; set; }
    }

    // =========================================================================
    // STAR EFFECTS
    // =========================================================================

    /// <summary>
    /// Star effects on a solar system.
    /// </summary>
    public class StarEffects
    {
        public string Id { get; set; } = "";
        public string SolarSystemId { get; set; } = "";
        public double MetalMultiplier { get; set; }
        public double CrystalMultiplier { get; set; }
        public double DeuteriumMultiplier { get; set; }
        public double EnergyMultiplier { get; set; }
        public double ExpeditionBonus { get; set; }
        public double FleetDamageChance { get; set; }
        public double FleetLossChance { get; set; }
        public bool IsColonizable { get; set; }
        public bool HasRadiationHazard { get; set; }
        public bool HasGravitationalAnomaly { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // =========================================================================
    // PLAYER COLONY
    // =========================================================================

    /// <summary>
    /// Player colony entity.
    /// </summary>
    public class PlayerColony
    {
        public string Id { get; set; } = "";
        public string UserId { get; set; } = "";
        public string CelestialBodyId { get; set; } = "";
        public string Name { get; set; } = "";
        public bool IsHomeworld { get; set; }

        // Resources
        public double Metal { get; set; }
        public double MetalPerHour { get; set; }
        public double MetalMax { get; set; }
        public double Crystal { get; set; }
        public double CrystalPerHour { get; set; }
        public double CrystalMax { get; set; }
        public double Deuterium { get; set; }
        public double DeuteriumPerHour { get; set; }
        public double DeuteriumMax { get; set; }
        public double EnergyUsed { get; set; }
        public double EnergyMax { get; set; }

        // Building levels
        public int FieldsUsed { get; set; }
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
        public DateTime? JumpGateCooldown { get; set; }

        // Ships
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

        // Defense
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

        // Timestamps
        public DateTime LastResourceUpdate { get; set; }
        public bool Destroyed { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// Colony with celestial body data.
    /// </summary>
    public class ColonyWithBody : PlayerColony
    {
        public CelestialBody CelestialBody { get; set; } = new();
        public SolarSystem SolarSystemData { get; set; } = new();
        public GalaxyData GalaxyDataValue { get; set; } = new();
        public StarEffects StarEffectsValue { get; set; } = new();
    }

    // =========================================================================
    // GALAXY VIEW
    // =========================================================================

    /// <summary>
    /// Galaxy view entry for UI display.
    /// </summary>
    public class GalaxyViewEntry
    {
        public int Galaxy { get; set; }
        public int System { get; set; }
        public int Position { get; set; }
        public string CelestialBodyId { get; set; } = "";
        public string? ColonyId { get; set; }
        public string PlanetName { get; set; } = "";
        public string PlanetType { get; set; } = "";
        public string? UserId { get; set; }
        public string? Username { get; set; }
        public string? AllianceTag { get; set; }
        public int FieldsMax { get; set; }
        public int FieldsUsed { get; set; }
        public int Diameter { get; set; }
        public int TemperatureMin { get; set; }
        public int TemperatureMax { get; set; }
        public StarTypeId StarType { get; set; }
        public StarTypeId? SecondaryStarType { get; set; }
        public string StarColor { get; set; } = "";
        public bool IsColonizable { get; set; }
        public bool HasMoon { get; set; }
        public double DebrisMetal { get; set; }
        public double DebrisCrystal { get; set; }
    }

    // =========================================================================
    // COORDINATES
    // =========================================================================

    /// <summary>
    /// Galactic coordinates.
    /// </summary>
    public struct GalacticCoordinates
    {
        public int Galaxy { get; set; }
        public int System { get; set; }
        public int Position { get; set; }

        public GalacticCoordinates(int galaxy, int system, int position)
        {
            Galaxy = galaxy;
            System = system;
            Position = position;
        }

        public string Format() => $"[{Galaxy}:{System}:{Position}]";
        public override string ToString() => Format();
    }

    /// <summary>
    /// Full coordinates with IDs.
    /// </summary>
    public class FullCoordinates
    {
        public int Galaxy { get; set; }
        public int System { get; set; }
        public int Position { get; set; }
        public string GalaxyId { get; set; } = "";
        public string SolarSystemId { get; set; } = "";
        public string CelestialBodyId { get; set; } = "";

        public GalacticCoordinates ToGalactic() => new(Galaxy, System, Position);
    }

    // =========================================================================
    // GENERATION PARAMETERS
    // =========================================================================

    /// <summary>
    /// Parameters for planet generation.
    /// </summary>
    public class PlanetGenerationParams
    {
        public int Position { get; set; }
        public int SystemSeed { get; set; }
        public StarTypeId StarType { get; set; }
        public double HabitableZoneInner { get; set; }
        public double HabitableZoneOuter { get; set; }
    }

    /// <summary>
    /// Parameters for moon generation.
    /// </summary>
    public class MoonGenerationParams
    {
        public int ParentDiameter { get; set; }
        public int ParentSeed { get; set; }
        public int MoonIndex { get; set; }
    }

    // =========================================================================
    // API RESPONSE TYPES
    // =========================================================================

    /// <summary>
    /// Universe response.
    /// </summary>
    public class UniverseResponse
    {
        public UniverseConfig Config { get; set; } = new();
        public int GalaxyCount { get; set; }
        public int TotalSystems { get; set; }
        public int TotalColonies { get; set; }
    }

    /// <summary>
    /// Galaxy response.
    /// </summary>
    public class GalaxyResponse
    {
        public GalaxyData Galaxy { get; set; } = new();
        public List<SolarSystemSummary> Systems { get; set; } = new();
        public GalaxyStatistics Statistics { get; set; } = new();
    }

    /// <summary>
    /// Galaxy statistics.
    /// </summary>
    public class GalaxyStatistics
    {
        public int TotalPlanets { get; set; }
        public int ColonizedPlanets { get; set; }
        public int UniquePlayers { get; set; }
    }

    /// <summary>
    /// Solar system response.
    /// </summary>
    public class SolarSystemResponse
    {
        public SolarSystemWithStar System { get; set; } = new();
        public List<CelestialBodyWithMoons> Bodies { get; set; } = new();
        public StarEffects Effects { get; set; } = new();
        public List<ColonyInfo> Colonies { get; set; } = new();
    }

    /// <summary>
    /// Colony info for solar system response.
    /// </summary>
    public class ColonyInfo
    {
        public string BodyId { get; set; } = "";
        public string ColonyId { get; set; } = "";
        public string UserId { get; set; } = "";
        public string Username { get; set; } = "";
        public string ColonyName { get; set; } = "";
        public string? AllianceTag { get; set; }
    }
}
