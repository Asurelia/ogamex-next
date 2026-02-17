// =============================================================================
// BattleTypes.cs — Ported from OGameX src/lib/battle/types.ts + constants.ts
// All shared types, enums, and constants for the OGame battle system
// =============================================================================

using System;
using System.Collections.Generic;

namespace OGameX.SharedLib.Battle
{
    // =========================================================================
    // COMBAT CONSTANTS (from constants.ts)
    // =========================================================================

    public static class CombatConstants
    {
        public const int MaxRounds = 6;
        public const double MinDamagePercent = 0.01;      // 1% — below this, shot bounces
        public const double ExplosionThreshold = 0.70;     // Hull ≥70% → no explosion
        public const double DebrisPercentage = 0.30;       // 30% of metal+crystal → debris
        public const int MoonChancePer100K = 1;            // 1% per 100k debris
        public const int MaxMoonChance = 20;               // 20% cap
        public const double DefenseRebuildChance = 0.70;   // 70% chance defense survives
    }

    // =========================================================================
    // UNIT STATS
    // =========================================================================

    public struct UnitStats
    {
        public int Attack;
        public int Shield;
        public int Hull;

        public UnitStats(int attack, int shield, int hull)
        {
            Attack = attack;
            Shield = shield;
            Hull = hull;
        }
    }

    public struct UnitCost
    {
        public double Metal;
        public double Crystal;
        public double Deuterium;

        public UnitCost(double metal, double crystal, double deuterium)
        {
            Metal = metal;
            Crystal = crystal;
            Deuterium = deuterium;
        }
    }

    // =========================================================================
    // TECHNOLOGY LEVELS
    // =========================================================================

    public struct TechLevels
    {
        public int WeaponsTech;
        public int ShieldTech;
        public int ArmorTech;
    }

    // =========================================================================
    // COMBAT UNIT
    // =========================================================================

    public enum CombatUnitType { Ship, Defense }

    public class CombatUnit
    {
        public string Id;
        public string UnitKey;
        public int UnitId;
        public CombatUnitType Type;
        public int Attack;
        public int MaxShield;
        public int CurrentShield;
        public int MaxHull;
        public int CurrentHull;
        public bool Destroyed;
        public UnitCost Cost;
    }

    // =========================================================================
    // COMBAT FLEET
    // =========================================================================

    public class CombatFleet
    {
        public string UserId;
        public List<CombatUnit> Units = new List<CombatUnit>();
        public TechLevels Tech;
    }

    // =========================================================================
    // FLEET / DEFENSE COMPOSITIONS (string key → count)
    // =========================================================================

    /// <summary>
    /// Ship counts by key (e.g. "light_fighter" → 100).
    /// </summary>
    public class FleetComposition : Dictionary<string, int> { }

    /// <summary>
    /// Defense counts by key (e.g. "rocket_launcher" → 50).
    /// </summary>
    public class DefenseComposition : Dictionary<string, int> { }

    // =========================================================================
    // FLEET SNAPSHOT (round state)
    // =========================================================================

    public class FleetSnapshot
    {
        public Dictionary<string, int> Ships = new Dictionary<string, int>();
        public Dictionary<string, int> Defense = new Dictionary<string, int>();
        public long TotalAttack;
        public long TotalShield;
        public long TotalHull;
        public int UnitCount;
    }

    // =========================================================================
    // COMBAT ROUND
    // =========================================================================

    public class CombatRound
    {
        public int RoundNumber;
        public FleetSnapshot Attacker;
        public FleetSnapshot Defender;
        public int AttackerShots;
        public int DefenderShots;
        public long AttackerDamage;
        public long DefenderDamage;
        public int AttackerUnitsLost;
        public int DefenderUnitsLost;
    }

    // =========================================================================
    // LOSSES
    // =========================================================================

    public class ShipLosses
    {
        public Dictionary<string, int> Ships = new Dictionary<string, int>();
        public double MetalValue;
        public double CrystalValue;
        public double DeuteriumValue;
    }

    public class DefenseLosses
    {
        public Dictionary<string, int> Defenses = new Dictionary<string, int>();
        public double MetalValue;
        public double CrystalValue;
        public double DeuteriumValue;
    }

    // =========================================================================
    // BATTLE RESULT
    // =========================================================================

    public enum BattleWinner { Attacker, Defender, Draw }

    public class BattleResult
    {
        public BattleWinner Winner;
        public List<CombatRound> Rounds = new List<CombatRound>();

        // Remaining
        public Dictionary<string, int> AttackerRemainingShips = new Dictionary<string, int>();
        public Dictionary<string, int> DefenderRemainingShips = new Dictionary<string, int>();
        public Dictionary<string, int> DefenderRemainingDefense = new Dictionary<string, int>();

        // Losses
        public ShipLosses AttackerLosses;
        public ShipLosses DefenderShipLosses;
        public DefenseLosses DefenderDefenseLosses;
        public double DefenderTotalMetalValue;
        public double DefenderTotalCrystalValue;
        public double DefenderTotalDeuteriumValue;

        // Debris
        public double DebrisMetal;
        public double DebrisCrystal;

        // Loot
        public double LootMetal;
        public double LootCrystal;
        public double LootDeuterium;

        // Moon
        public int MoonChance;
        public bool MoonCreated;
        public int TotalRounds;
    }

    // =========================================================================
    // BATTLE OPTIONS
    // =========================================================================

    public class BattleOptions
    {
        public int MaxRounds = CombatConstants.MaxRounds;
        public double DebrisPercentage = CombatConstants.DebrisPercentage;
        public int MoonChancePerDebris = CombatConstants.MoonChancePer100K;
        public int MaxMoonChance = CombatConstants.MaxMoonChance;
        public Random Rng = new Random();
    }

    // =========================================================================
    // RAPID FIRE TABLE
    // =========================================================================

    /// <summary>
    /// Rapid fire table: RapidFire[attackerKey][defenderKey] = extraShots.
    /// </summary>
    public class RapidFireTable : Dictionary<string, Dictionary<string, int>> { }
}
