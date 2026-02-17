// =============================================================================
// BattleUtils.cs — Ported from OGameX src/lib/battle/utils.ts
// Combat helper functions: stats, damage, explosion, debris, loot, rapid fire
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Battle
{
    /// <summary>
    /// Pure utility functions for the OGame battle system.
    /// Ported from src/lib/battle/utils.ts.
    /// </summary>
    public static class BattleUtils
    {
        // =====================================================================
        // EFFECTIVE STATS CALCULATION
        // =====================================================================

        /// <summary>
        /// Calculate effective combat stats with technology bonuses.
        /// Each tech level gives +10% bonus.
        /// </summary>
        public static UnitStats CalculateEffectiveStats(UnitStats baseStats, TechLevels tech)
        {
            double weaponsMultiplier = 1.0 + tech.WeaponsTech * 0.1;
            double shieldMultiplier = 1.0 + tech.ShieldTech * 0.1;
            double armorMultiplier = 1.0 + tech.ArmorTech * 0.1;

            return new UnitStats(
                (int)Math.Floor(baseStats.Attack * weaponsMultiplier),
                (int)Math.Floor(baseStats.Shield * shieldMultiplier),
                (int)Math.Floor(baseStats.Hull * armorMultiplier)
            );
        }

        // =====================================================================
        // DAMAGE CALCULATION
        // =====================================================================

        /// <summary>
        /// Calculate damage dealt to a defender.
        /// OGame rules:
        /// 1. If damage &lt; 1% of shield, shot bounces
        /// 2. Shield absorbs damage up to its current value
        /// 3. Remaining damage goes to hull
        /// </summary>
        public static (int ShieldDamage, int HullDamage, bool Bounced) CalculateDamage(
            int attackerDamage, int defenderShield)
        {
            // Bounced — damage too low
            if (defenderShield > 0 && attackerDamage < defenderShield * CombatConstants.MinDamagePercent)
                return (0, 0, true);

            int shieldDmg = Math.Min(attackerDamage, defenderShield);
            int hullDmg = Math.Max(0, attackerDamage - defenderShield);
            return (shieldDmg, hullDmg, false);
        }

        // =====================================================================
        // EXPLOSION CHECK
        // =====================================================================

        /// <summary>
        /// Roll for unit explosion when hull is below 70%.
        /// Explosion chance = 1 - (currentHull / maxHull).
        /// </summary>
        public static bool RollExplosion(int currentHull, int maxHull, Random rng)
        {
            double hullPercent = (double)currentHull / maxHull;
            if (hullPercent >= CombatConstants.ExplosionThreshold)
                return false;

            double explosionChance = 1.0 - hullPercent;
            return rng.NextDouble() < explosionChance;
        }

        // =====================================================================
        // RAPID FIRE
        // =====================================================================

        /// <summary>
        /// Roll rapid fire for additional shots.
        /// Probability per extra shot = (rapidFire - 1) / rapidFire.
        /// </summary>
        public static int RollRapidFire(
            string attackerKey, string defenderKey,
            RapidFireTable rapidFireTable, Random rng)
        {
            if (rapidFireTable == null) return 0;
            if (!rapidFireTable.TryGetValue(attackerKey, out var targets)) return 0;
            if (!targets.TryGetValue(defenderKey, out int rapidFireValue)) return 0;
            if (rapidFireValue <= 1) return 0;

            double continueChance = (double)(rapidFireValue - 1) / rapidFireValue;
            int additionalShots = 0;
            while (rng.NextDouble() < continueChance)
            {
                additionalShots++;
                if (additionalShots >= 1000) break; // safety
            }
            return additionalShots;
        }

        // =====================================================================
        // SHIELD REGENERATION
        // =====================================================================

        /// <summary>
        /// Regenerate shields to full between rounds. Hull does NOT regenerate.
        /// </summary>
        public static void RegenerateShields(List<CombatUnit> units)
        {
            foreach (var unit in units)
                if (!unit.Destroyed)
                    unit.CurrentShield = unit.MaxShield;
        }

        // =====================================================================
        // COMBAT UNIT CREATION
        // =====================================================================

        private static int _unitIdCounter = 0;

        /// <summary>
        /// Create combat units from a fleet composition.
        /// </summary>
        public static List<CombatUnit> CreateCombatUnitsFromFleet(
            FleetComposition fleet, TechLevels tech,
            Dictionary<string, UnitStats> shipStats,
            Dictionary<string, UnitCost> shipCosts,
            Dictionary<string, int> shipIds)
        {
            var units = new List<CombatUnit>();
            foreach (var kvp in fleet)
            {
                string key = kvp.Key;
                int count = kvp.Value;
                if (count <= 0) continue;

                if (!shipStats.TryGetValue(key, out var baseStats)) continue;
                var eff = CalculateEffectiveStats(baseStats, tech);
                shipCosts.TryGetValue(key, out var cost);
                shipIds.TryGetValue(key, out int unitId);

                for (int i = 0; i < count; i++)
                {
                    units.Add(new CombatUnit
                    {
                        Id = $"ship_{_unitIdCounter++}",
                        UnitKey = key,
                        UnitId = unitId,
                        Type = CombatUnitType.Ship,
                        Attack = eff.Attack,
                        MaxShield = eff.Shield,
                        CurrentShield = eff.Shield,
                        MaxHull = eff.Hull,
                        CurrentHull = eff.Hull,
                        Destroyed = false,
                        Cost = cost,
                    });
                }
            }
            return units;
        }

        /// <summary>
        /// Create combat units from a defense composition.
        /// </summary>
        public static List<CombatUnit> CreateCombatUnitsFromDefense(
            DefenseComposition defense, TechLevels tech,
            Dictionary<string, UnitStats> defenseStats,
            Dictionary<string, UnitCost> defenseCosts,
            Dictionary<string, int> defenseIds)
        {
            var units = new List<CombatUnit>();
            foreach (var kvp in defense)
            {
                string key = kvp.Key;
                int count = kvp.Value;
                if (count <= 0) continue;

                if (!defenseStats.TryGetValue(key, out var baseStats)) continue;
                var eff = CalculateEffectiveStats(baseStats, tech);
                defenseCosts.TryGetValue(key, out var cost);
                defenseIds.TryGetValue(key, out int unitId);

                for (int i = 0; i < count; i++)
                {
                    units.Add(new CombatUnit
                    {
                        Id = $"def_{_unitIdCounter++}",
                        UnitKey = key,
                        UnitId = unitId,
                        Type = CombatUnitType.Defense,
                        Attack = eff.Attack,
                        MaxShield = eff.Shield,
                        CurrentShield = eff.Shield,
                        MaxHull = eff.Hull,
                        CurrentHull = eff.Hull,
                        Destroyed = false,
                        Cost = cost,
                    });
                }
            }
            return units;
        }

        // =====================================================================
        // FLEET SNAPSHOT
        // =====================================================================

        /// <summary>
        /// Create a snapshot of the current fleet state (alive units only).
        /// </summary>
        public static FleetSnapshot CreateFleetSnapshot(List<CombatUnit> units)
        {
            var snap = new FleetSnapshot();
            foreach (var unit in units)
            {
                if (unit.Destroyed) continue;
                snap.UnitCount++;
                snap.TotalAttack += unit.Attack;
                snap.TotalShield += unit.CurrentShield;
                snap.TotalHull += unit.CurrentHull;

                var dict = unit.Type == CombatUnitType.Ship ? snap.Ships : snap.Defense;
                if (!dict.ContainsKey(unit.UnitKey)) dict[unit.UnitKey] = 0;
                dict[unit.UnitKey]++;
            }
            return snap;
        }

        // =====================================================================
        // LOSS CALCULATION
        // =====================================================================

        /// <summary>
        /// Calculate ship losses by comparing initial vs remaining units.
        /// </summary>
        public static ShipLosses CalculateShipLosses(
            List<CombatUnit> initialUnits, List<CombatUnit> remainingUnits,
            Dictionary<string, UnitCost> shipCosts)
        {
            var initial = new Dictionary<string, int>();
            var remaining = new Dictionary<string, int>();

            foreach (var u in initialUnits)
            {
                if (u.Type != CombatUnitType.Ship) continue;
                initial[u.UnitKey] = initial.GetValueOrDefault(u.UnitKey) + 1;
            }
            foreach (var u in remainingUnits)
            {
                if (u.Type != CombatUnitType.Ship || u.Destroyed) continue;
                remaining[u.UnitKey] = remaining.GetValueOrDefault(u.UnitKey) + 1;
            }

            var losses = new ShipLosses();
            foreach (var kvp in initial)
            {
                int rem = remaining.GetValueOrDefault(kvp.Key, 0);
                int lost = kvp.Value - rem;
                if (lost > 0)
                {
                    losses.Ships[kvp.Key] = lost;
                    if (shipCosts.TryGetValue(kvp.Key, out var cost))
                    {
                        losses.MetalValue += cost.Metal * lost;
                        losses.CrystalValue += cost.Crystal * lost;
                        losses.DeuteriumValue += cost.Deuterium * lost;
                    }
                }
            }
            return losses;
        }

        /// <summary>
        /// Calculate defense losses by comparing initial vs remaining units.
        /// </summary>
        public static DefenseLosses CalculateDefenseLosses(
            List<CombatUnit> initialUnits, List<CombatUnit> remainingUnits,
            Dictionary<string, UnitCost> defenseCosts)
        {
            var initial = new Dictionary<string, int>();
            var remaining = new Dictionary<string, int>();

            foreach (var u in initialUnits)
            {
                if (u.Type != CombatUnitType.Defense) continue;
                initial[u.UnitKey] = initial.GetValueOrDefault(u.UnitKey) + 1;
            }
            foreach (var u in remainingUnits)
            {
                if (u.Type != CombatUnitType.Defense || u.Destroyed) continue;
                remaining[u.UnitKey] = remaining.GetValueOrDefault(u.UnitKey) + 1;
            }

            var losses = new DefenseLosses();
            foreach (var kvp in initial)
            {
                int rem = remaining.GetValueOrDefault(kvp.Key, 0);
                int lost = kvp.Value - rem;
                if (lost > 0)
                {
                    losses.Defenses[kvp.Key] = lost;
                    if (defenseCosts.TryGetValue(kvp.Key, out var cost))
                    {
                        losses.MetalValue += cost.Metal * lost;
                        losses.CrystalValue += cost.Crystal * lost;
                        losses.DeuteriumValue += cost.Deuterium * lost;
                    }
                }
            }
            return losses;
        }

        // =====================================================================
        // DEBRIS GENERATION
        // =====================================================================

        /// <summary>
        /// Generate debris from destroyed ships.
        /// 30% of metal + crystal. Deuterium never becomes debris.
        /// Only ships generate debris, not defenses.
        /// </summary>
        public static (double Metal, double Crystal) GenerateDebris(
            Dictionary<string, int> destroyedShips,
            Dictionary<string, UnitCost> shipCosts)
        {
            double totalMetal = 0;
            double totalCrystal = 0;

            foreach (var kvp in destroyedShips)
            {
                if (kvp.Value <= 0) continue;
                if (shipCosts.TryGetValue(kvp.Key, out var cost))
                {
                    totalMetal += cost.Metal * kvp.Value;
                    totalCrystal += cost.Crystal * kvp.Value;
                }
            }

            return (
                Math.Floor(totalMetal * CombatConstants.DebrisPercentage),
                Math.Floor(totalCrystal * CombatConstants.DebrisPercentage)
            );
        }

        // =====================================================================
        // LOOT CALCULATION
        // =====================================================================

        /// <summary>
        /// Calculate loot from defender's resources. Max 50%, limited by cargo.
        /// </summary>
        public static (double Metal, double Crystal, double Deuterium) CalculateLoot(
            double availMetal, double availCrystal, double availDeuterium,
            double cargoCapacity)
        {
            double maxM = Math.Floor(availMetal * 0.5);
            double maxC = Math.Floor(availCrystal * 0.5);
            double maxD = Math.Floor(availDeuterium * 0.5);
            double total = maxM + maxC + maxD;

            if (total <= cargoCapacity)
                return (maxM, maxC, maxD);

            double ratio = cargoCapacity / total;
            return (
                Math.Floor(maxM * ratio),
                Math.Floor(maxC * ratio),
                Math.Floor(maxD * ratio)
            );
        }

        // =====================================================================
        // MOON CHANCE
        // =====================================================================

        /// <summary>
        /// Calculate moon creation chance: 1% per 100k debris, max 20%.
        /// </summary>
        public static int CalculateMoonChance(double debrisMetal, double debrisCrystal)
        {
            double totalDebris = debrisMetal + debrisCrystal;
            int chance = (int)Math.Floor(totalDebris / 100000) * CombatConstants.MoonChancePer100K;
            return Math.Min(chance, CombatConstants.MaxMoonChance);
        }

        /// <summary>
        /// Roll for moon creation.
        /// </summary>
        public static bool RollMoonCreation(int moonChance, Random rng)
        {
            if (moonChance <= 0) return false;
            return rng.NextDouble() * 100 < moonChance;
        }

        // =====================================================================
        // WINNER DETERMINATION
        // =====================================================================

        /// <summary>
        /// Determine the winner of the battle.
        /// </summary>
        public static BattleWinner DetermineWinner(
            List<CombatUnit> attackerUnits, List<CombatUnit> defenderUnits)
        {
            int attackerAlive = attackerUnits.Count(u => !u.Destroyed);
            int defenderAlive = defenderUnits.Count(u => !u.Destroyed);

            if (attackerAlive > 0 && defenderAlive == 0) return BattleWinner.Attacker;
            if (defenderAlive > 0 && attackerAlive == 0) return BattleWinner.Defender;
            return BattleWinner.Draw;
        }
    }
}
