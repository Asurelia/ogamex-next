// =============================================================================
// OGameBattleEngine.cs — Ported from OGameX src/lib/battle/BattleEngine.ts
// Classic OGame combat simulation: 6 rounds, rapid fire, debris, loot, moon
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Battle
{
    /// <summary>
    /// OGame classic battle engine.
    /// Ported from src/lib/battle/BattleEngine.ts.
    ///
    /// Combat Flow:
    /// 1. Initialize both fleets with effective stats (tech bonuses)
    /// 2. Execute combat rounds (max 6)
    ///    a. Each unit selects a random target
    ///    b. Calculate damage with shield absorption
    ///    c. Apply rapid fire for additional shots
    ///    d. Check for unit explosion (hull &lt; 70%)
    ///    e. Regenerate shields
    /// 3. Determine winner
    /// 4. Calculate debris, loot, and moon chance
    /// </summary>
    public class OGameBattleEngine
    {
        private readonly TechLevels _attackerTech;
        private readonly TechLevels _defenderTech;
        private readonly BattleOptions _options;

        // Config data — must be set before simulation
        public Dictionary<string, UnitStats> ShipStats = new Dictionary<string, UnitStats>();
        public Dictionary<string, UnitStats> DefenseStats = new Dictionary<string, UnitStats>();
        public Dictionary<string, UnitCost> ShipCosts = new Dictionary<string, UnitCost>();
        public Dictionary<string, UnitCost> DefenseCosts = new Dictionary<string, UnitCost>();
        public Dictionary<string, int> ShipIds = new Dictionary<string, int>();
        public Dictionary<string, int> DefenseIds = new Dictionary<string, int>();
        public Dictionary<string, int> ShipCargoCapacity = new Dictionary<string, int>();
        public RapidFireTable RapidFire = new RapidFireTable();

        public OGameBattleEngine(
            TechLevels attackerTech, TechLevels defenderTech,
            BattleOptions options = null)
        {
            _attackerTech = attackerTech;
            _defenderTech = defenderTech;
            _options = options ?? new BattleOptions();
        }

        // =====================================================================
        // MAIN SIMULATION
        // =====================================================================

        /// <summary>
        /// Simulate a complete battle and return the result.
        /// </summary>
        public BattleResult Simulate(
            FleetComposition attackerFleet,
            FleetComposition defenderFleet,
            DefenseComposition defenderDefense,
            double defenderMetal = 0, double defenderCrystal = 0, double defenderDeuterium = 0)
        {
            // Create combat units
            var attackerUnits = BattleUtils.CreateCombatUnitsFromFleet(
                attackerFleet, _attackerTech, ShipStats, ShipCosts, ShipIds);
            var defenderShipUnits = BattleUtils.CreateCombatUnitsFromFleet(
                defenderFleet, _defenderTech, ShipStats, ShipCosts, ShipIds);
            var defenderDefenseUnits = BattleUtils.CreateCombatUnitsFromDefense(
                defenderDefense, _defenderTech, DefenseStats, DefenseCosts, DefenseIds);

            var defenderUnits = new List<CombatUnit>(defenderShipUnits);
            defenderUnits.AddRange(defenderDefenseUnits);

            // Store initial state for loss calculation
            var initialAttackerUnits = new List<CombatUnit>(attackerUnits);
            var initialDefenderUnits = new List<CombatUnit>(defenderUnits);

            // Execute combat rounds
            var rounds = new List<CombatRound>();
            int roundNumber = 0;

            while (roundNumber < _options.MaxRounds)
            {
                roundNumber++;

                int attackerAlive = attackerUnits.Count(u => !u.Destroyed);
                int defenderAlive = defenderUnits.Count(u => !u.Destroyed);
                if (attackerAlive == 0 || defenderAlive == 0) break;

                var round = ExecuteRound(roundNumber, attackerUnits, defenderUnits);
                rounds.Add(round);

                // Regenerate shields for next round
                BattleUtils.RegenerateShields(attackerUnits);
                BattleUtils.RegenerateShields(defenderUnits);
            }

            // Winner
            var winner = BattleUtils.DetermineWinner(attackerUnits, defenderUnits);

            // Remaining
            var attackerRemaining = GetRemainingByType(attackerUnits, CombatUnitType.Ship);
            var defenderRemainingShips = GetRemainingByType(defenderUnits, CombatUnitType.Ship);
            var defenderRemainingDef = GetRemainingByType(defenderUnits, CombatUnitType.Defense);

            // Losses
            var attackerLosses = BattleUtils.CalculateShipLosses(initialAttackerUnits, attackerUnits, ShipCosts);
            var defenderShipLosses = BattleUtils.CalculateShipLosses(
                initialDefenderUnits.Where(u => u.Type == CombatUnitType.Ship).ToList(),
                defenderUnits.Where(u => u.Type == CombatUnitType.Ship).ToList(),
                ShipCosts);
            var defenderDefLosses = BattleUtils.CalculateDefenseLosses(
                initialDefenderUnits.Where(u => u.Type == CombatUnitType.Defense).ToList(),
                defenderUnits.Where(u => u.Type == CombatUnitType.Defense).ToList(),
                DefenseCosts);

            // Debris (ships only — merge attacker + defender ship losses)
            var allDestroyedShips = new Dictionary<string, int>();
            foreach (var kvp in attackerLosses.Ships)
                allDestroyedShips[kvp.Key] = allDestroyedShips.GetValueOrDefault(kvp.Key) + kvp.Value;
            foreach (var kvp in defenderShipLosses.Ships)
                allDestroyedShips[kvp.Key] = allDestroyedShips.GetValueOrDefault(kvp.Key) + kvp.Value;

            var (debrisMetal, debrisCrystal) = BattleUtils.GenerateDebris(allDestroyedShips, ShipCosts);

            // Loot (only if attacker wins)
            double lootM = 0, lootC = 0, lootD = 0;
            if (winner == BattleWinner.Attacker)
            {
                double cargo = CalculateFleetCargo(attackerRemaining);
                (lootM, lootC, lootD) = BattleUtils.CalculateLoot(
                    defenderMetal, defenderCrystal, defenderDeuterium, cargo);
            }

            // Moon chance
            int moonChance = BattleUtils.CalculateMoonChance(debrisMetal, debrisCrystal);
            bool moonCreated = BattleUtils.RollMoonCreation(moonChance, _options.Rng);

            return new BattleResult
            {
                Winner = winner,
                Rounds = rounds,
                AttackerRemainingShips = attackerRemaining,
                DefenderRemainingShips = defenderRemainingShips,
                DefenderRemainingDefense = defenderRemainingDef,
                AttackerLosses = attackerLosses,
                DefenderShipLosses = defenderShipLosses,
                DefenderDefenseLosses = defenderDefLosses,
                DefenderTotalMetalValue = defenderShipLosses.MetalValue + defenderDefLosses.MetalValue,
                DefenderTotalCrystalValue = defenderShipLosses.CrystalValue + defenderDefLosses.CrystalValue,
                DefenderTotalDeuteriumValue = defenderShipLosses.DeuteriumValue + defenderDefLosses.DeuteriumValue,
                DebrisMetal = debrisMetal,
                DebrisCrystal = debrisCrystal,
                LootMetal = lootM,
                LootCrystal = lootC,
                LootDeuterium = lootD,
                MoonChance = moonChance,
                MoonCreated = moonCreated,
                TotalRounds = rounds.Count,
            };
        }

        // =====================================================================
        // ROUND EXECUTION
        // =====================================================================

        private CombatRound ExecuteRound(
            int roundNumber, List<CombatUnit> attackerUnits, List<CombatUnit> defenderUnits)
        {
            var initialAttSnap = BattleUtils.CreateFleetSnapshot(attackerUnits);
            var initialDefSnap = BattleUtils.CreateFleetSnapshot(defenderUnits);

            int attackerShots = 0, defenderShots = 0;
            long attackerDamage = 0, defenderDamage = 0;

            // Attacker fires
            foreach (var attacker in attackerUnits.Where(u => !u.Destroyed).ToList())
            {
                var targets = defenderUnits.Where(u => !u.Destroyed).ToList();
                if (targets.Count == 0) break;
                var (shots, damage) = FireUnit(attacker, targets);
                attackerShots += shots;
                attackerDamage += damage;
            }

            // Defender fires
            foreach (var defender in defenderUnits.Where(u => !u.Destroyed).ToList())
            {
                var targets = attackerUnits.Where(u => !u.Destroyed).ToList();
                if (targets.Count == 0) break;
                var (shots, damage) = FireUnit(defender, targets);
                defenderShots += shots;
                defenderDamage += damage;
            }

            var finalAttSnap = BattleUtils.CreateFleetSnapshot(attackerUnits);
            var finalDefSnap = BattleUtils.CreateFleetSnapshot(defenderUnits);

            return new CombatRound
            {
                RoundNumber = roundNumber,
                Attacker = finalAttSnap,
                Defender = finalDefSnap,
                AttackerShots = attackerShots,
                DefenderShots = defenderShots,
                AttackerDamage = attackerDamage,
                DefenderDamage = defenderDamage,
                AttackerUnitsLost = initialAttSnap.UnitCount - finalAttSnap.UnitCount,
                DefenderUnitsLost = initialDefSnap.UnitCount - finalDefSnap.UnitCount,
            };
        }

        // =====================================================================
        // FIRE UNIT (with rapid fire)
        // =====================================================================

        private (int Shots, long Damage) FireUnit(CombatUnit attacker, List<CombatUnit> defenders)
        {
            if (attacker.Destroyed || defenders.Count == 0)
                return (0, 0);

            int shots = 0;
            long totalDamage = 0;
            bool continueRapidFire = true;
            var rng = _options.Rng;

            while (continueRapidFire && !attacker.Destroyed)
            {
                var aliveDefenders = defenders.Where(d => !d.Destroyed).ToList();
                if (aliveDefenders.Count == 0) break;

                // Random target
                var target = aliveDefenders[rng.Next(aliveDefenders.Count)];

                // Damage
                var (shieldDmg, hullDmg, bounced) = BattleUtils.CalculateDamage(
                    attacker.Attack, target.CurrentShield);
                shots++;

                if (!bounced)
                {
                    target.CurrentShield = Math.Max(0, target.CurrentShield - shieldDmg);
                    target.CurrentHull = Math.Max(0, target.CurrentHull - hullDmg);
                    totalDamage += shieldDmg + hullDmg;

                    if (target.CurrentHull <= 0)
                        target.Destroyed = true;
                    else if (BattleUtils.RollExplosion(target.CurrentHull, target.MaxHull, rng))
                        target.Destroyed = true;
                }

                // Rapid fire
                int extra = BattleUtils.RollRapidFire(attacker.UnitKey, target.UnitKey, RapidFire, rng);
                continueRapidFire = extra > 0;
            }

            return (shots, totalDamage);
        }

        // =====================================================================
        // HELPERS
        // =====================================================================

        private Dictionary<string, int> GetRemainingByType(List<CombatUnit> units, CombatUnitType type)
        {
            var result = new Dictionary<string, int>();
            foreach (var u in units)
            {
                if (u.Destroyed || u.Type != type) continue;
                result[u.UnitKey] = result.GetValueOrDefault(u.UnitKey) + 1;
            }
            return result;
        }

        private double CalculateFleetCargo(Dictionary<string, int> ships)
        {
            double total = 0;
            foreach (var kvp in ships)
            {
                if (ShipCargoCapacity.TryGetValue(kvp.Key, out int cap))
                    total += cap * kvp.Value;
            }
            return total;
        }
    }
}
