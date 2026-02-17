// =============================================================================
// AdvancedBattleTypes.cs
// Ported from damage-types.ts + advanced-unit.ts
// Multi-damage types, resistances, status effects, defense layers, advanced units
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Battle
{
    // =========================================================================
    // DAMAGE TYPES (5-channel)
    // =========================================================================

    /// <summary>
    /// Multi-channel damage: ballistic (vs armor), ionic (vs shields),
    /// explosive (vs hull), hacking (cyber), boarding (capture).
    /// </summary>
    public struct DamageTypes
    {
        public int Ballistic;
        public int Ionic;
        public int Explosive;
        public int Hacking;
        public int Boarding;

        public static DamageTypes Zero => new DamageTypes();

        public static DamageTypes operator +(DamageTypes a, DamageTypes b) =>
            new DamageTypes
            {
                Ballistic = a.Ballistic + b.Ballistic,
                Ionic = a.Ionic + b.Ionic,
                Explosive = a.Explosive + b.Explosive,
                Hacking = a.Hacking + b.Hacking,
                Boarding = a.Boarding + b.Boarding,
            };

        /// <summary>Total direct combat damage (excludes hacking/boarding).</summary>
        public int TotalCombatDamage => Ballistic + Ionic + Explosive;
    }

    // =========================================================================
    // RESISTANCE TYPES
    // =========================================================================

    public struct ResistanceTypes
    {
        /// <summary>% reduction vs ballistic.</summary>
        public double BallisticResistance;
        /// <summary>% reduction vs ionic.</summary>
        public double IonicResistance;
        /// <summary>% reduction vs explosive.</summary>
        public double ExplosiveResistance;
        /// <summary>% resistance to hacking.</summary>
        public double HackDefense;
        /// <summary>Anti-boarding defense strength.</summary>
        public double AntiBoarding;

        public static ResistanceTypes Zero => new ResistanceTypes();
    }

    // =========================================================================
    // DAMAGE EFFECTIVENESS (layer multipliers)
    // =========================================================================

    public static class DamageEffectiveness
    {
        // Ballistic
        public const double BallisticVsShield = 0.8;
        public const double BallisticVsArmor = 1.2;
        public const double BallisticVsHull = 1.0;
        // Ionic
        public const double IonicVsShield = 1.5;
        public const double IonicVsArmor = 0.5;
        public const double IonicVsHull = 0.7;
        // Explosive
        public const double ExplosiveVsShield = 0.7;
        public const double ExplosiveVsArmor = 0.9;
        public const double ExplosiveVsHull = 1.4;
    }

    // =========================================================================
    // STATUS EFFECTS
    // =========================================================================

    public enum StatusEffectType
    {
        ShieldDisruption,
        SystemHacked,
        WeaponsDisabled,
        EnginesDisabled,
        Ionized,
        OnFire,
        HullBreach,
        CrewPanic,
        Boarded,
        EmpStunned,
        SensorsJammed,
        NaniteRepair,
        ShieldOvercharge,
        Phased,
    }

    public enum HackableSystem
    {
        Weapons, Shields, Engines, Sensors, Communications, LifeSupport, PowerCore,
    }

    public class StatusEffect
    {
        public StatusEffectType Type;
        public int Duration;
        public double Strength;
        public string SourceId;
        public HackableSystem? TargetSystem;
    }

    // =========================================================================
    // ADVANCED COMBAT STATS
    // =========================================================================

    public struct AdvancedCombatStats
    {
        public double Accuracy;
        public double Evasion;
        public double CritChance;
        public double CritMultiplier;
        public int PointDefense;
        public int CrewCurrent;
        public int CrewMax;

        public static AdvancedCombatStats Default => new AdvancedCombatStats
        {
            Accuracy = 80,
            Evasion = 0,
            CritChance = 5,
            CritMultiplier = 1.5,
            PointDefense = 0,
            CrewCurrent = 0,
            CrewMax = 0,
        };
    }

    // =========================================================================
    // DEFENSE LAYERS (shield → armor → hull)
    // =========================================================================

    public class DefenseLayer
    {
        public int Current;
        public int Max;
        public DefenseLayer(int max) { Current = max; Max = max; }
    }

    public class ShieldLayer : DefenseLayer
    {
        public int RegenRate; // % per round
        public ShieldLayer(int max, int regenRate = 100) : base(max) { RegenRate = regenRate; }
    }

    public class DefenseLayers
    {
        public ShieldLayer Shield;
        public DefenseLayer Armor;
        public DefenseLayer Hull;

        public DefenseLayers(int shield, int armor, int hull, int shieldRegenRate = 100)
        {
            Shield = new ShieldLayer(shield, shieldRegenRate);
            Armor = new DefenseLayer(armor);
            Hull = new DefenseLayer(hull);
        }
    }

    // =========================================================================
    // UNIT CLASSIFICATION
    // =========================================================================

    public enum UnitCategory { Military, Civil, Special }

    public enum UnitClass
    {
        Fighter, Corvette, Frigate, Cruiser, BattleCruiser,
        Battleship, Carrier, Dreadnought,
        Transport, Utility,
        Defense, Missile, Platform, Turret,
    }

    // =========================================================================
    // ADVANCED TECH LEVELS
    // =========================================================================

    public struct AdvancedTechLevels
    {
        public int WeaponsTech;
        public int ShieldTech;
        public int ArmorTech;
        public int IonicTech;
        public int HackingTech;
        public int BoardingTech;
    }

    // =========================================================================
    // DAMAGE EVENTS
    // =========================================================================

    public enum DamageEventType
    {
        CriticalHit, ShieldBreak, ArmorBreak, HullBreach,
        SystemDisabled, HackSuccess, HackFailed,
        BoardingInitiated, CrewCasualties, PointDefenseIntercept,
    }

    public class DamageEvent
    {
        public DamageEventType Type;
        public Dictionary<string, object> Data = new Dictionary<string, object>();
    }

    // =========================================================================
    // ADVANCED DAMAGE RESULT
    // =========================================================================

    public class AdvancedDamageResult
    {
        public bool Hit;
        public bool Critical;
        public bool Intercepted;
        public DamageTypes RawDamage;
        public DamageTypes FinalDamage;
        public int AppliedShield;
        public int AppliedArmor;
        public int AppliedHull;
        public int AppliedCrew;
        public List<StatusEffect> Effects = new List<StatusEffect>();
        public List<DamageEvent> Events = new List<DamageEvent>();
    }

    // =========================================================================
    // ADVANCED COMBAT UNIT
    // =========================================================================

    /// <summary>
    /// Full-featured combat unit with multi-layer defenses,
    /// multi-damage, resistances, status effects, crew, etc.
    /// </summary>
    public class AdvancedCombatUnit
    {
        public string Id;
        public string UnitKey;
        public int UnitId;
        public CombatUnitType Type;
        public UnitCategory Category;
        public UnitClass UnitClass;
        public string OwnerId;

        // Defense
        public DefenseLayers Defense;

        // Offense
        public DamageTypes Damage;
        public int WeaponPower;

        // Resistances
        public ResistanceTypes Resistances;

        // Stats
        public AdvancedCombatStats Stats;

        // Crew
        public int CrewCurrent;
        public int CrewMax;
        public double CrewCombatStrength = 1.0;

        // Status
        public bool Destroyed;
        public bool Disabled;
        public List<StatusEffect> StatusEffects = new List<StatusEffect>();

        // Cost (for debris)
        public UnitCost Cost;

        // Rapid fire (legacy)
        public Dictionary<string, int> RapidFire = new Dictionary<string, int>();
    }

    // =========================================================================
    // UNIT CLASS MAPPINGS
    // =========================================================================

    public static class UnitClassMap
    {
        private static readonly Dictionary<string, UnitClass> Map = new Dictionary<string, UnitClass>
        {
            { "light_fighter", UnitClass.Fighter },
            { "heavy_fighter", UnitClass.Fighter },
            { "cruiser", UnitClass.Cruiser },
            { "battleship", UnitClass.Battleship },
            { "battlecruiser", UnitClass.Cruiser },
            { "bomber", UnitClass.Frigate },
            { "destroyer", UnitClass.Battleship },
            { "deathstar", UnitClass.Dreadnought },
            { "reaper", UnitClass.Battleship },
            { "pathfinder", UnitClass.Corvette },
            { "small_cargo", UnitClass.Transport },
            { "large_cargo", UnitClass.Transport },
            { "colony_ship", UnitClass.Utility },
            { "recycler", UnitClass.Utility },
            { "espionage_probe", UnitClass.Utility },
            { "solar_satellite", UnitClass.Utility },
            { "crawler", UnitClass.Utility },
            { "rocket_launcher", UnitClass.Defense },
            { "light_laser", UnitClass.Defense },
            { "heavy_laser", UnitClass.Defense },
            { "gauss_cannon", UnitClass.Defense },
            { "ion_cannon", UnitClass.Defense },
            { "plasma_turret", UnitClass.Defense },
            { "small_shield_dome", UnitClass.Defense },
            { "large_shield_dome", UnitClass.Defense },
        };

        public static UnitClass Get(string unitKey)
        {
            return Map.TryGetValue(unitKey, out var cls) ? cls : UnitClass.Utility;
        }
    }

    // =========================================================================
    // HELPER FUNCTIONS
    // =========================================================================

    public static class DamageTypeHelpers
    {
        /// <summary>Scale damage by a multiplier.</summary>
        public static DamageTypes Scale(DamageTypes d, double m) => new DamageTypes
        {
            Ballistic = (int)Math.Floor(d.Ballistic * m),
            Ionic = (int)Math.Floor(d.Ionic * m),
            Explosive = (int)Math.Floor(d.Explosive * m),
            Hacking = (int)Math.Floor(d.Hacking * m),
            Boarding = (int)Math.Floor(d.Boarding * m),
        };

        /// <summary>Apply resistance percentages to damage.</summary>
        public static DamageTypes ApplyResistances(DamageTypes d, ResistanceTypes r) => new DamageTypes
        {
            Ballistic = (int)Math.Floor(d.Ballistic * (1.0 - r.BallisticResistance / 100.0)),
            Ionic = (int)Math.Floor(d.Ionic * (1.0 - r.IonicResistance / 100.0)),
            Explosive = (int)Math.Floor(d.Explosive * (1.0 - r.ExplosiveResistance / 100.0)),
            Hacking = (int)Math.Floor(d.Hacking * (1.0 - r.HackDefense / 100.0)),
            Boarding = d.Boarding, // handled separately
        };

        public static bool HasEffect(List<StatusEffect> effects, StatusEffectType type) =>
            effects.Any(e => e.Type == type && e.Duration > 0);

        public static double GetEffectStrength(List<StatusEffect> effects, StatusEffectType type)
        {
            var e = effects.FirstOrDefault(x => x.Type == type && x.Duration > 0);
            return e?.Strength ?? 0;
        }

        /// <summary>Tick all effects: reduce duration by 1, remove expired.</summary>
        public static void TickEffects(List<StatusEffect> effects)
        {
            for (int i = effects.Count - 1; i >= 0; i--)
            {
                effects[i].Duration--;
                if (effects[i].Duration <= 0)
                    effects.RemoveAt(i);
            }
        }
    }

    // =========================================================================
    // ADVANCED UNIT HELPERS
    // =========================================================================

    public static class AdvancedUnitHelpers
    {
        private static int _idCounter = 0;

        /// <summary>
        /// Create an AdvancedCombatUnit from base definition + tech levels.
        /// </summary>
        public static AdvancedCombatUnit CreateUnit(
            string unitKey, int unitId, CombatUnitType type,
            UnitCategory category, UnitClass unitClass,
            int shieldPower, int armorValue, int structuralIntegrity,
            int shieldRegenRate,
            DamageTypes baseDamage, int weaponPower,
            ResistanceTypes resistances, AdvancedCombatStats stats,
            int crewCapacity, double crewCombatStrength,
            UnitCost cost, Dictionary<string, int> rapidFire,
            AdvancedTechLevels tech, string ownerId)
        {
            double wpnM = 1.0 + tech.WeaponsTech * 0.1;
            double shldM = 1.0 + tech.ShieldTech * 0.1;
            double armM = 1.0 + tech.ArmorTech * 0.1;
            double ionM = 1.0 + tech.IonicTech * 0.1;
            double hackM = 1.0 + tech.HackingTech * 0.1;

            var effDmg = new DamageTypes
            {
                Ballistic = (int)Math.Floor(baseDamage.Ballistic * wpnM),
                Ionic = (int)Math.Floor(baseDamage.Ionic * ionM),
                Explosive = (int)Math.Floor(baseDamage.Explosive * wpnM),
                Hacking = (int)Math.Floor(baseDamage.Hacking * hackM),
                Boarding = baseDamage.Boarding,
            };

            int effShield = (int)Math.Floor(shieldPower * shldM);
            int effArmor = (int)Math.Floor(armorValue * armM);
            int effHull = (int)Math.Floor(structuralIntegrity * armM);

            return new AdvancedCombatUnit
            {
                Id = $"adv_{(type == CombatUnitType.Ship ? "ship" : "def")}_{_idCounter++}",
                UnitKey = unitKey,
                UnitId = unitId,
                Type = type,
                Category = category,
                UnitClass = unitClass,
                OwnerId = ownerId,
                Defense = new DefenseLayers(effShield, effArmor, effHull, shieldRegenRate),
                Damage = effDmg,
                WeaponPower = (int)Math.Floor(weaponPower * wpnM),
                Resistances = resistances,
                Stats = stats,
                CrewCurrent = crewCapacity,
                CrewMax = crewCapacity,
                CrewCombatStrength = crewCombatStrength,
                Destroyed = false,
                Disabled = false,
                StatusEffects = new List<StatusEffect>(),
                Cost = cost,
                RapidFire = rapidFire ?? new Dictionary<string, int>(),
            };
        }

        public static bool CanAttack(AdvancedCombatUnit u)
        {
            if (u.Destroyed || u.Disabled) return false;
            if (DamageTypeHelpers.HasEffect(u.StatusEffects, StatusEffectType.WeaponsDisabled)) return false;
            if (DamageTypeHelpers.HasEffect(u.StatusEffects, StatusEffectType.EmpStunned)) return false;
            return true;
        }

        public static int GetTotalHP(AdvancedCombatUnit u) =>
            u.Defense.Shield.Current + u.Defense.Armor.Current + u.Defense.Hull.Current;

        public static bool ShouldExplode(AdvancedCombatUnit u, double threshold, Random rng)
        {
            if (u.Defense.Hull.Current <= 0) return true;
            double pct = (double)u.Defense.Hull.Current / u.Defense.Hull.Max;
            if (pct >= threshold) return false;
            return rng.NextDouble() < (1.0 - pct);
        }

        public static void RegenerateShields(AdvancedCombatUnit u)
        {
            if (u.Destroyed) return;
            int regen = (int)Math.Floor(u.Defense.Shield.Max * (u.Defense.Shield.RegenRate / 100.0));
            u.Defense.Shield.Current = Math.Min(u.Defense.Shield.Max, u.Defense.Shield.Current + regen);
        }

        /// <summary>Apply layered damage and return actual damage to each layer.</summary>
        public static (int Shield, int Armor, int Hull) ApplyDamage(
            AdvancedCombatUnit u, int shieldDmg, int armorDmg, int hullDmg)
        {
            int actShield = Math.Min(u.Defense.Shield.Current, shieldDmg);
            u.Defense.Shield.Current -= actShield;
            int overflowShield = shieldDmg - actShield;

            int totalArmor = armorDmg + overflowShield;
            int actArmor = Math.Min(u.Defense.Armor.Current, totalArmor);
            u.Defense.Armor.Current -= actArmor;
            int overflowArmor = totalArmor - actArmor;

            int totalHull = hullDmg + overflowArmor;
            int actHull = Math.Min(u.Defense.Hull.Current, totalHull);
            u.Defense.Hull.Current -= actHull;

            if (u.Defense.Hull.Current <= 0)
                u.Destroyed = true;

            return (actShield, actArmor, actHull);
        }

        public static void TickStatusEffects(AdvancedCombatUnit u)
        {
            DamageTypeHelpers.TickEffects(u.StatusEffects);
            if (u.Disabled)
            {
                bool still = u.StatusEffects.Any(e =>
                    (e.Type == StatusEffectType.EmpStunned || e.Type == StatusEffectType.SystemHacked)
                    && e.Duration > 0);
                if (!still) u.Disabled = false;
            }
        }
    }
}
