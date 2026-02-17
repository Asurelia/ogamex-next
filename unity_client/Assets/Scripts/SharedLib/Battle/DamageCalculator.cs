// =============================================================================
// DamageCalculator.cs — Ported from OGameX src/lib/battle/damage-calculator.ts
// Advanced damage calculator: accuracy, crits, layered damage, hacking, crew
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Battle
{
    /// <summary>
    /// Advanced damage calculator with multi-type damage, accuracy/evasion,
    /// critical hits, point defense interception, status effects (ionic
    /// disruption, hacking, hull breach), and crew casualties.
    /// <para>Ported from src/lib/battle/damage-calculator.ts.</para>
    /// </summary>
    public static class DamageCalculator
    {
        // Constants
        private const double MinHitChance = 0.10;
        private const double MinShieldPenetration = 0.01;
        private const double IonicDisruptionThreshold = 0.30;
        private const int HackAttemptThreshold = 50;
        private const double HullBreachThreshold = 0.50;

        // =====================================================================
        // MAIN ENTRY POINT
        // =====================================================================

        /// <summary>
        /// Calculate advanced damage from attacker to defender.
        /// </summary>
        public static AdvancedDamageResult CalculateAdvancedDamage(
            AdvancedCombatUnit attacker, AdvancedCombatUnit defender, Random rng)
        {
            var events = new List<DamageEvent>();
            var effects = new List<StatusEffect>();

            if (!AdvancedUnitHelpers.CanAttack(attacker))
                return MissResult();

            // --- Point defense interception ---
            if (defender.Stats.PointDefense > 0 && IsInterceptable(attacker))
            {
                double interceptChance = CalculateInterceptChance(
                    defender.Stats.PointDefense, attacker.Stats.Evasion);
                if (rng.NextDouble() < interceptChance)
                {
                    events.Add(new DamageEvent
                    {
                        Type = DamageEventType.PointDefenseIntercept,
                        Data = { ["interceptedUnit"] = attacker.UnitKey },
                    });
                    return new AdvancedDamageResult
                    {
                        Hit = false, Intercepted = true, Events = events,
                    };
                }
            }

            // --- Hit check ---
            double hitChance = CalculateHitChance(attacker, defender);
            if (rng.NextDouble() > hitChance)
                return MissResult();

            // --- Critical hit ---
            bool isCrit = rng.NextDouble() < attacker.Stats.CritChance / 100.0;
            double critMult = isCrit ? attacker.Stats.CritMultiplier : 1.0;
            if (isCrit)
                events.Add(new DamageEvent
                {
                    Type = DamageEventType.CriticalHit,
                    Data = { ["multiplier"] = critMult },
                });

            // --- Raw damage ---
            var rawDamage = CalculateRawDamage(attacker, critMult);

            // --- Resistances ---
            var finalDamage = DamageTypeHelpers.ApplyResistances(rawDamage, defender.Resistances);

            // --- Layered damage (shield → armor → hull) ---
            var (shieldDmg, armorDmg, hullDmg, layerEvents) =
                CalculateLayeredDamage(finalDamage, defender);
            events.AddRange(layerEvents);

            // Apply damage
            var (actShield, actArmor, actHull) =
                AdvancedUnitHelpers.ApplyDamage(defender, shieldDmg, armorDmg, hullDmg);

            // --- Status effects ---
            // Ionic disruption
            if (finalDamage.Ionic > 0)
            {
                var ionEffect = CheckIonicDisruption(finalDamage.Ionic, defender, attacker.Id);
                if (ionEffect != null) effects.Add(ionEffect);
            }

            // Hacking
            if (finalDamage.Hacking >= HackAttemptThreshold)
            {
                var (hackEffects, hackEvents) = AttemptHack(
                    finalDamage.Hacking, defender, attacker.Id, rng);
                effects.AddRange(hackEffects);
                events.AddRange(hackEvents);
            }

            // Hull breach
            if (defender.Defense.Hull.Current > 0 &&
                (double)defender.Defense.Hull.Current / defender.Defense.Hull.Max < HullBreachThreshold &&
                !DamageTypeHelpers.HasEffect(defender.StatusEffects, StatusEffectType.HullBreach))
            {
                effects.Add(new StatusEffect
                {
                    Type = StatusEffectType.HullBreach,
                    Duration = 3,
                    Strength = 0.2,
                    SourceId = attacker.Id,
                });
                events.Add(new DamageEvent
                {
                    Type = DamageEventType.HullBreach,
                    Data = { ["hullPercent"] = (double)defender.Defense.Hull.Current / defender.Defense.Hull.Max },
                });
            }

            // Crew casualties
            int crewDmg = 0;
            if (actHull > 0 && defender.CrewCurrent > 0)
            {
                crewDmg = CalculateCrewCasualties(actHull, defender.Defense.Hull.Max, defender.CrewCurrent, rng);
                if (crewDmg > 0)
                {
                    defender.CrewCurrent = Math.Max(0, defender.CrewCurrent - crewDmg);
                    events.Add(new DamageEvent
                    {
                        Type = DamageEventType.CrewCasualties,
                        Data = { ["casualties"] = crewDmg, ["remaining"] = defender.CrewCurrent },
                    });
                }
            }

            // Push status effects onto defender
            defender.StatusEffects.AddRange(effects);

            return new AdvancedDamageResult
            {
                Hit = true,
                Critical = isCrit,
                Intercepted = false,
                RawDamage = rawDamage,
                FinalDamage = finalDamage,
                AppliedShield = actShield,
                AppliedArmor = actArmor,
                AppliedHull = actHull,
                AppliedCrew = crewDmg,
                Effects = effects,
                Events = events,
            };
        }

        // =====================================================================
        // HIT CALCULATION
        // =====================================================================

        private static double CalculateHitChance(AdvancedCombatUnit attacker, AdvancedCombatUnit defender)
        {
            double accuracy = attacker.Stats.Accuracy;
            if (DamageTypeHelpers.HasEffect(attacker.StatusEffects, StatusEffectType.Ionized))
                accuracy *= 1.0 - DamageTypeHelpers.GetEffectStrength(attacker.StatusEffects, StatusEffectType.Ionized);

            double hit = (accuracy - defender.Stats.Evasion + 50.0) / 100.0;
            return Math.Max(MinHitChance, Math.Min(1.0, hit));
        }

        // =====================================================================
        // RAW DAMAGE
        // =====================================================================

        private static DamageTypes CalculateRawDamage(AdvancedCombatUnit attacker, double critMult)
        {
            var d = attacker.Damage;
            int b = (int)Math.Floor(d.Ballistic * critMult);
            int i = (int)Math.Floor(d.Ionic * critMult);
            int e = (int)Math.Floor(d.Explosive * critMult);

            if (DamageTypeHelpers.HasEffect(attacker.StatusEffects, StatusEffectType.Ionized))
            {
                double red = DamageTypeHelpers.GetEffectStrength(attacker.StatusEffects, StatusEffectType.Ionized);
                b = (int)Math.Floor(b * (1.0 - red));
                i = (int)Math.Floor(i * (1.0 - red));
                e = (int)Math.Floor(e * (1.0 - red));
            }

            return new DamageTypes
            {
                Ballistic = b,
                Ionic = i,
                Explosive = e,
                Hacking = d.Hacking,
                Boarding = d.Boarding,
            };
        }

        // =====================================================================
        // LAYERED DAMAGE
        // =====================================================================

        private static (int ShieldDmg, int ArmorDmg, int HullDmg, List<DamageEvent> Events)
            CalculateLayeredDamage(DamageTypes dmg, AdvancedCombatUnit defender)
        {
            var events = new List<DamageEvent>();

            double vsShield = dmg.Ballistic * DamageEffectiveness.BallisticVsShield
                            + dmg.Ionic * DamageEffectiveness.IonicVsShield
                            + dmg.Explosive * DamageEffectiveness.ExplosiveVsShield;
            double vsArmor = dmg.Ballistic * DamageEffectiveness.BallisticVsArmor
                           + dmg.Ionic * DamageEffectiveness.IonicVsArmor
                           + dmg.Explosive * DamageEffectiveness.ExplosiveVsArmor;
            double vsHull = dmg.Ballistic * DamageEffectiveness.BallisticVsHull
                          + dmg.Ionic * DamageEffectiveness.IonicVsHull
                          + dmg.Explosive * DamageEffectiveness.ExplosiveVsHull;

            int shieldCur = defender.Defense.Shield.Current;
            int totalDmg = dmg.TotalCombatDamage;

            // Bounce
            if (shieldCur > 0 && totalDmg < shieldCur * MinShieldPenetration)
                return (0, 0, 0, events);

            int shieldDamage = Math.Min(shieldCur, (int)vsShield);
            double overflow = vsShield - shieldDamage;

            if (shieldCur > 0 && defender.Defense.Shield.Current - shieldDamage <= 0)
                events.Add(new DamageEvent { Type = DamageEventType.ShieldBreak });

            int armorCur = defender.Defense.Armor.Current;
            int armorDamage = Math.Min(armorCur, (int)(vsArmor + overflow * 0.5));
            double armorOverflow = Math.Max(0, vsArmor + overflow * 0.5 - armorCur);

            if (armorCur > 0 && defender.Defense.Armor.Current - armorDamage <= 0)
                events.Add(new DamageEvent { Type = DamageEventType.ArmorBreak });

            double rawHull = vsHull + armorOverflow;
            if (DamageTypeHelpers.HasEffect(defender.StatusEffects, StatusEffectType.HullBreach))
            {
                double str = DamageTypeHelpers.GetEffectStrength(defender.StatusEffects, StatusEffectType.HullBreach);
                rawHull = Math.Floor(rawHull * (1.0 + str));
            }

            return (shieldDamage, armorDamage, (int)rawHull, events);
        }

        // =====================================================================
        // IONIC DISRUPTION
        // =====================================================================

        private static StatusEffect CheckIonicDisruption(int ionicDmg, AdvancedCombatUnit defender, string srcId)
        {
            if (defender.Defense.Shield.Max == 0) return null;
            double ratio = (double)ionicDmg / defender.Defense.Shield.Max;
            if (ratio < IonicDisruptionThreshold) return null;
            return new StatusEffect
            {
                Type = StatusEffectType.ShieldDisruption,
                Duration = 1,
                Strength = Math.Min(0.5, ratio),
                SourceId = srcId,
            };
        }

        // =====================================================================
        // HACKING
        // =====================================================================

        private static readonly HackableSystem[] HackableSystems =
        {
            HackableSystem.Weapons, HackableSystem.Shields, HackableSystem.Engines,
            HackableSystem.Sensors, HackableSystem.Communications,
        };

        private static readonly Dictionary<HackableSystem, StatusEffectType> HackEffectMap =
            new Dictionary<HackableSystem, StatusEffectType>
        {
            { HackableSystem.Weapons, StatusEffectType.WeaponsDisabled },
            { HackableSystem.Shields, StatusEffectType.ShieldDisruption },
            { HackableSystem.Engines, StatusEffectType.EnginesDisabled },
            { HackableSystem.Sensors, StatusEffectType.Ionized },
            { HackableSystem.Communications, StatusEffectType.SystemHacked },
            { HackableSystem.LifeSupport, StatusEffectType.CrewPanic },
            { HackableSystem.PowerCore, StatusEffectType.EmpStunned },
        };

        private static (List<StatusEffect>, List<DamageEvent>) AttemptHack(
            int hackPower, AdvancedCombatUnit defender, string srcId, Random rng)
        {
            var effects = new List<StatusEffect>();
            var events = new List<DamageEvent>();

            double chance = Math.Max(0.1, (hackPower - defender.Resistances.HackDefense) / 100.0);

            if (rng.NextDouble() < chance)
            {
                var sys = HackableSystems[rng.Next(HackableSystems.Length)];
                int dur = Math.Min(3, (int)Math.Floor((double)hackPower / 50));
                double str = Math.Min(1.0, hackPower / 100.0);

                effects.Add(new StatusEffect
                {
                    Type = HackEffectMap[sys],
                    Duration = dur,
                    Strength = str,
                    SourceId = srcId,
                    TargetSystem = sys,
                });
                events.Add(new DamageEvent
                {
                    Type = DamageEventType.HackSuccess,
                    Data = { ["targetSystem"] = sys.ToString(), ["hackPower"] = hackPower },
                });

                if (hackPower > 100 && sys == HackableSystem.PowerCore)
                    defender.Disabled = true;
            }
            else
            {
                events.Add(new DamageEvent
                {
                    Type = DamageEventType.HackFailed,
                    Data = { ["hackPower"] = hackPower, ["hackDefense"] = defender.Resistances.HackDefense },
                });
            }
            return (effects, events);
        }

        // =====================================================================
        // POINT DEFENSE
        // =====================================================================

        private static bool IsInterceptable(AdvancedCombatUnit u) =>
            u.UnitClass == UnitClass.Fighter ||
            u.UnitClass == UnitClass.Missile ||
            u.UnitKey == "espionage_probe";

        private static double CalculateInterceptChance(int pointDefense, double targetEvasion)
        {
            double baseChance = pointDefense / 100.0;
            double adj = baseChance * (1.0 - targetEvasion / 200.0);
            return Math.Max(0, Math.Min(0.8, adj));
        }

        // =====================================================================
        // CREW CASUALTIES
        // =====================================================================

        private static int CalculateCrewCasualties(int hullDmg, int maxHull, int currentCrew, Random rng)
        {
            double damageRatio = (double)hullDmg / maxHull;
            int baseCas = (int)Math.Floor(currentCrew * damageRatio * 0.5);
            int variance = (int)Math.Floor(rng.NextDouble() * baseCas * 0.2);
            int total = baseCas + variance - (int)Math.Floor(baseCas * 0.1);
            return Math.Max(0, Math.Min(currentCrew, total));
        }

        // =====================================================================
        // LEGACY COMPATIBILITY
        // =====================================================================

        /// <summary>
        /// Convert total weapon power into 5-channel DamageTypes based on unit class.
        /// </summary>
        public static DamageTypes ConvertLegacyDamage(int weaponPower, UnitClass unitClass)
        {
            (double b, double i, double e) dist = unitClass switch
            {
                UnitClass.Fighter => (0.8, 0.1, 0.1),
                UnitClass.Corvette => (0.7, 0.2, 0.1),
                UnitClass.Frigate => (0.6, 0.2, 0.2),
                UnitClass.Cruiser => (0.5, 0.3, 0.2),
                UnitClass.Battleship => (0.4, 0.3, 0.3),
                UnitClass.Carrier => (0.3, 0.4, 0.3),
                UnitClass.Dreadnought => (0.3, 0.3, 0.4),
                UnitClass.Defense => (0.5, 0.3, 0.2),
                UnitClass.Missile => (0.1, 0.0, 0.9),
                UnitClass.Transport => (1.0, 0.0, 0.0),
                _ => (1.0, 0.0, 0.0),
            };

            return new DamageTypes
            {
                Ballistic = (int)Math.Floor(weaponPower * dist.b),
                Ionic = (int)Math.Floor(weaponPower * dist.i),
                Explosive = (int)Math.Floor(weaponPower * dist.e),
                Hacking = 0,
                Boarding = 0,
            };
        }

        // =====================================================================
        // MISS RESULT
        // =====================================================================

        private static AdvancedDamageResult MissResult() => new AdvancedDamageResult
        {
            Hit = false, Critical = false, Intercepted = false,
        };
    }
}
