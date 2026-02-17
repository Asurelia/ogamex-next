// =============================================================================
// AdvancedBattleEngine.cs — Ported from OGameX AdvancedBattleEngine.ts
// Multi-damage combat engine with status effects and cinematic timeline events
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Battle
{
    // =========================================================================
    // TIMELINE EVENT (for cinematic replay)
    // =========================================================================

    public class BattleTimelineEvent
    {
        public int Timestamp;
        public int Round;
        public string Type;
        public string SourceId;
        public string SourceKey;
        public string TargetId;
        public string TargetKey;
        public Dictionary<string, object> Data = new Dictionary<string, object>();
    }

    // =========================================================================
    // ROUND STATS
    // =========================================================================

    public class AdvancedRoundStats
    {
        public int RoundNumber;
        public int AttackerUnits;
        public int DefenderUnits;
        public int AttackerShots;
        public int DefenderShots;
        public DamageTypes AttackerDamage;
        public DamageTypes DefenderDamage;
        public int AttackerCriticalHits;
        public int DefenderCriticalHits;
        public int AttackerUnitsLost;
        public int DefenderUnitsLost;
        public int StatusEffectsApplied;
        public int HackingAttempts;
    }

    // =========================================================================
    // ADVANCED BATTLE RESULT
    // =========================================================================

    public class AdvancedBattleResult
    {
        public BattleWinner Winner;
        public List<AdvancedRoundStats> Rounds = new List<AdvancedRoundStats>();
        public int TotalRounds;

        // Remaining
        public Dictionary<string, int> AttackerRemainingShips = new Dictionary<string, int>();
        public int AttackerRemainingTotal;
        public Dictionary<string, int> DefenderRemainingShips = new Dictionary<string, int>();
        public Dictionary<string, int> DefenderRemainingDefense = new Dictionary<string, int>();
        public int DefenderRemainingTotal;

        // Losses
        public Dictionary<string, int> AttackerLostShips = new Dictionary<string, int>();
        public int AttackerLostTotal;
        public double AttackerLostMetal, AttackerLostCrystal, AttackerLostDeuterium;
        public Dictionary<string, int> DefenderLostShips = new Dictionary<string, int>();
        public Dictionary<string, int> DefenderLostDefense = new Dictionary<string, int>();
        public int DefenderLostTotal;
        public double DefenderLostMetal, DefenderLostCrystal, DefenderLostDeuterium;

        // Debris & Loot
        public double DebrisMetal, DebrisCrystal;
        public double LootMetal, LootCrystal, LootDeuterium;
        public int MoonChance;
        public bool MoonCreated;

        // Stats
        public DamageTypes TotalDamageDealt;
        public DamageTypes TotalDamageTaken;
        public int CriticalHits;
        public int HackingAttempts;
        public int HackingSuccesses;
        public int StatusEffectsApplied;

        // Timeline
        public List<BattleTimelineEvent> Timeline = new List<BattleTimelineEvent>();
    }

    // =========================================================================
    // ADVANCED BATTLE OPTIONS
    // =========================================================================

    public class AdvancedBattleOptions
    {
        public int MaxRounds = CombatConstants.MaxRounds;
        public double DebrisPercentage = CombatConstants.DebrisPercentage;
        public int MoonChancePerDebris = CombatConstants.MoonChancePer100K;
        public int MaxMoonChance = CombatConstants.MaxMoonChance;
        public Random Rng = new Random();
        public bool TrackEvents = true;
        public bool UseAdvancedDamage = true;
    }

    // =========================================================================
    // ENGINE
    // =========================================================================

    /// <summary>
    /// Advanced combat engine with multi-type damage, status effects,
    /// hacking, crew casualties, and cinematic timeline tracking.
    /// Ported from AdvancedBattleEngine.ts.
    /// </summary>
    public class AdvancedBattleEngine
    {
        private readonly AdvancedTechLevels _attackerTech;
        private readonly AdvancedTechLevels _defenderTech;
        private readonly AdvancedBattleOptions _options;
        private List<BattleTimelineEvent> _timeline;
        private int _timestamp;

        // Config data — ship/defense definitions
        public Dictionary<string, AdvancedShipDef> ShipDefs = new Dictionary<string, AdvancedShipDef>();
        public Dictionary<string, AdvancedDefenseDef> DefenseDefs = new Dictionary<string, AdvancedDefenseDef>();
        public RapidFireTable RapidFire = new RapidFireTable();

        public AdvancedBattleEngine(
            AdvancedTechLevels attackerTech, AdvancedTechLevels defenderTech,
            AdvancedBattleOptions options = null)
        {
            _attackerTech = attackerTech;
            _defenderTech = defenderTech;
            _options = options ?? new AdvancedBattleOptions();
        }

        // =====================================================================
        // SIMULATE
        // =====================================================================

        public AdvancedBattleResult Simulate(
            FleetComposition attackerFleet, FleetComposition defenderFleet,
            DefenseComposition defenderDefense,
            double defenderMetal = 0, double defenderCrystal = 0, double defenderDeuterium = 0)
        {
            _timeline = new List<BattleTimelineEvent>();
            _timestamp = 0;

            var attackerUnits = CreateUnitsFromFleet(attackerFleet, _attackerTech, "attacker");
            var defenderShipUnits = CreateUnitsFromFleet(defenderFleet, _defenderTech, "defender");
            var defenderDefUnits = CreateUnitsFromDefense(defenderDefense, _defenderTech, "defender");
            var defenderUnits = new List<AdvancedCombatUnit>(defenderShipUnits);
            defenderUnits.AddRange(defenderDefUnits);

            var initAttCounts = CountUnits(attackerUnits);
            var initDefCounts = CountUnits(defenderUnits);

            // Stats
            var totalDmgDealt = DamageTypes.Zero;
            var totalDmgTaken = DamageTypes.Zero;
            int totalCrits = 0, totalHackAttempts = 0, totalHackSuccesses = 0, totalEffects = 0;

            AddEvent(0, "battle_start", null, null, new Dictionary<string, object>
            {
                ["attackerUnits"] = attackerUnits.Count,
                ["defenderUnits"] = defenderUnits.Count,
            });

            var rounds = new List<AdvancedRoundStats>();
            int roundNum = 0;

            while (roundNum < _options.MaxRounds)
            {
                roundNum++;
                int attAlive = attackerUnits.Count(u => !u.Destroyed);
                int defAlive = defenderUnits.Count(u => !u.Destroyed);
                if (attAlive == 0 || defAlive == 0) break;

                var rs = ExecuteRound(roundNum, attackerUnits, defenderUnits, ref totalCrits,
                    ref totalHackAttempts, ref totalEffects);
                totalDmgDealt = totalDmgDealt + rs.AttackerDamage;
                totalDmgTaken = totalDmgTaken + rs.DefenderDamage;
                rounds.Add(rs);

                // End round — regen & tick
                EndRound(attackerUnits, defenderUnits);
            }

            var winner = BattleUtils.DetermineWinner(
                attackerUnits.Select(u => ToCombatUnit(u)).ToList(),
                defenderUnits.Select(u => ToCombatUnit(u)).ToList());

            AddEvent(roundNum, "battle_end", null, null, new Dictionary<string, object> { ["winner"] = winner.ToString() });

            // Remaining & losses
            var attRemaining = GetRemaining(attackerUnits, CombatUnitType.Ship);
            var defRemShips = GetRemaining(defenderUnits, CombatUnitType.Ship);
            var defRemDef = GetRemaining(defenderUnits, CombatUnitType.Defense);

            var (attLost, attLostCount, attLostM, attLostC, attLostD) = CalcLosses(initAttCounts, attackerUnits, CombatUnitType.Ship);
            var (defShipLost, dslCount, dslM, dslC, dslD) = CalcLosses(initDefCounts, defenderUnits, CombatUnitType.Ship);
            var (defDefLost, ddlCount, ddlM, ddlC, ddlD) = CalcLosses(initDefCounts, defenderUnits, CombatUnitType.Defense);

            // Debris
            var allDestroyed = new Dictionary<string, int>(attLost);
            foreach (var kvp in defShipLost)
                allDestroyed[kvp.Key] = allDestroyed.GetValueOrDefault(kvp.Key) + kvp.Value;
            var (debM, debC) = CalcDebris(allDestroyed);

            // Loot
            double lM = 0, lC = 0, lD = 0;
            if (winner == BattleWinner.Attacker)
            {
                double cargo = CalcCargo(attRemaining);
                (lM, lC, lD) = BattleUtils.CalculateLoot(defenderMetal, defenderCrystal, defenderDeuterium, cargo);
            }

            int moonChance = BattleUtils.CalculateMoonChance(debM, debC);
            bool moonCreated = _options.Rng.NextDouble() * 100 < moonChance;

            return new AdvancedBattleResult
            {
                Winner = winner,
                Rounds = rounds,
                TotalRounds = rounds.Count,
                AttackerRemainingShips = attRemaining,
                AttackerRemainingTotal = attackerUnits.Count(u => !u.Destroyed),
                DefenderRemainingShips = defRemShips,
                DefenderRemainingDefense = defRemDef,
                DefenderRemainingTotal = defenderUnits.Count(u => !u.Destroyed),
                AttackerLostShips = attLost,
                AttackerLostTotal = attLostCount,
                AttackerLostMetal = attLostM,
                AttackerLostCrystal = attLostC,
                AttackerLostDeuterium = attLostD,
                DefenderLostShips = defShipLost,
                DefenderLostDefense = defDefLost,
                DefenderLostTotal = dslCount + ddlCount,
                DefenderLostMetal = dslM + ddlM,
                DefenderLostCrystal = dslC + ddlC,
                DefenderLostDeuterium = dslD + ddlD,
                DebrisMetal = debM,
                DebrisCrystal = debC,
                LootMetal = lM,
                LootCrystal = lC,
                LootDeuterium = lD,
                MoonChance = moonChance,
                MoonCreated = moonCreated,
                TotalDamageDealt = totalDmgDealt,
                TotalDamageTaken = totalDmgTaken,
                CriticalHits = totalCrits,
                HackingAttempts = totalHackAttempts,
                HackingSuccesses = totalHackSuccesses,
                StatusEffectsApplied = totalEffects,
                Timeline = _timeline,
            };
        }

        // =====================================================================
        // ROUND
        // =====================================================================

        private AdvancedRoundStats ExecuteRound(
            int round, List<AdvancedCombatUnit> attackerUnits, List<AdvancedCombatUnit> defenderUnits,
            ref int totalCrits, ref int totalHackAttempts, ref int totalEffects)
        {
            AddEvent(round, "round_start", null, null, new Dictionary<string, object> { ["roundNumber"] = round });

            var stats = new AdvancedRoundStats { RoundNumber = round };
            stats.AttackerUnits = attackerUnits.Count(u => !u.Destroyed);
            stats.DefenderUnits = defenderUnits.Count(u => !u.Destroyed);
            int initDef = stats.DefenderUnits;
            int initAtt = stats.AttackerUnits;

            // Attacker fires
            foreach (var att in attackerUnits.Where(u => !u.Destroyed).ToList())
            {
                var targets = defenderUnits.Where(u => !u.Destroyed).ToList();
                if (targets.Count == 0) break;
                var r = FireUnit(att, targets, round);
                stats.AttackerShots += r.Shots;
                stats.AttackerDamage = stats.AttackerDamage + r.Damage;
                stats.AttackerCriticalHits += r.Crits;
                stats.StatusEffectsApplied += r.EffectsApplied;
                stats.HackingAttempts += r.HackAttempts;
                totalCrits += r.Crits;
                totalHackAttempts += r.HackAttempts;
                totalEffects += r.EffectsApplied;
            }

            // Defender fires
            foreach (var def in defenderUnits.Where(u => !u.Destroyed).ToList())
            {
                var targets = attackerUnits.Where(u => !u.Destroyed).ToList();
                if (targets.Count == 0) break;
                var r = FireUnit(def, targets, round);
                stats.DefenderShots += r.Shots;
                stats.DefenderDamage = stats.DefenderDamage + r.Damage;
                stats.DefenderCriticalHits += r.Crits;
                stats.StatusEffectsApplied += r.EffectsApplied;
                stats.HackingAttempts += r.HackAttempts;
                totalCrits += r.Crits;
                totalHackAttempts += r.HackAttempts;
                totalEffects += r.EffectsApplied;
            }

            stats.DefenderUnitsLost = initDef - defenderUnits.Count(u => !u.Destroyed);
            stats.AttackerUnitsLost = initAtt - attackerUnits.Count(u => !u.Destroyed);

            AddEvent(round, "round_end", null, null, new Dictionary<string, object>
            {
                ["attackerUnitsRemaining"] = attackerUnits.Count(u => !u.Destroyed),
                ["defenderUnitsRemaining"] = defenderUnits.Count(u => !u.Destroyed),
            });

            return stats;
        }

        // =====================================================================
        // FIRE UNIT
        // =====================================================================

        private struct FireResult
        {
            public int Shots;
            public DamageTypes Damage;
            public int Crits;
            public int EffectsApplied;
            public int HackAttempts;
        }

        private FireResult FireUnit(AdvancedCombatUnit attacker, List<AdvancedCombatUnit> defenders, int round)
        {
            var res = new FireResult();
            if (!AdvancedUnitHelpers.CanAttack(attacker)) return res;

            bool continueRF = true;
            var rng = _options.Rng;

            while (continueRF)
            {
                var targets = defenders.Where(u => !u.Destroyed).ToList();
                if (targets.Count == 0) break;

                var target = targets[rng.Next(targets.Count)];
                var dmgResult = DamageCalculator.CalculateAdvancedDamage(attacker, target, rng);
                res.Shots++;

                if (dmgResult.Hit)
                {
                    res.Damage = res.Damage + dmgResult.FinalDamage;
                    if (dmgResult.Critical) res.Crits++;
                    res.EffectsApplied += dmgResult.Effects.Count;

                    foreach (var ev in dmgResult.Events)
                    {
                        if (ev.Type == DamageEventType.HackSuccess || ev.Type == DamageEventType.HackFailed)
                            res.HackAttempts++;
                    }

                    if (_options.TrackEvents)
                    {
                        AddEvent(round, "attack", attacker, target, new Dictionary<string, object>
                        {
                            ["hit"] = true,
                            ["critical"] = dmgResult.Critical,
                        });
                    }

                    if (target.Destroyed || AdvancedUnitHelpers.ShouldExplode(target, 0.7, rng))
                    {
                        target.Destroyed = true;
                        if (_options.TrackEvents)
                            AddEvent(round, "unit_destroyed", attacker, target, new Dictionary<string, object>
                            {
                                ["unitKey"] = target.UnitKey,
                            });
                    }
                }

                // Rapid fire
                if (RapidFire != null &&
                    RapidFire.TryGetValue(attacker.UnitKey, out var rfTargets) &&
                    rfTargets.TryGetValue(target.UnitKey, out int rfValue) && rfValue > 1)
                {
                    double chance = (double)(rfValue - 1) / rfValue;
                    continueRF = rng.NextDouble() < chance;
                }
                else
                    continueRF = false;

                if (res.Shots >= 1000) break;
            }
            return res;
        }

        // =====================================================================
        // END ROUND
        // =====================================================================

        private void EndRound(List<AdvancedCombatUnit> att, List<AdvancedCombatUnit> def)
        {
            foreach (var u in att.Concat(def))
            {
                if (u.Destroyed) continue;
                AdvancedUnitHelpers.RegenerateShields(u);
                AdvancedUnitHelpers.TickStatusEffects(u);
            }
        }

        // =====================================================================
        // UNIT CREATION
        // =====================================================================

        private List<AdvancedCombatUnit> CreateUnitsFromFleet(
            FleetComposition fleet, AdvancedTechLevels tech, string ownerId)
        {
            var units = new List<AdvancedCombatUnit>();
            foreach (var kvp in fleet)
            {
                if (kvp.Value <= 0) continue;
                if (!ShipDefs.TryGetValue(kvp.Key, out var def)) continue;
                for (int i = 0; i < kvp.Value; i++)
                    units.Add(AdvancedUnitHelpers.CreateUnit(
                        def.Key, def.Id, CombatUnitType.Ship,
                        def.Category, def.UnitClass,
                        def.ShieldPower, def.ArmorValue, def.StructuralIntegrity,
                        def.ShieldRegenRate,
                        def.Damage, def.WeaponPower,
                        def.Resistances, def.CombatStats,
                        def.CrewCapacity, def.CrewCombatStrength,
                        def.Cost, def.RapidFire,
                        tech, ownerId));
            }
            return units;
        }

        private List<AdvancedCombatUnit> CreateUnitsFromDefense(
            DefenseComposition defense, AdvancedTechLevels tech, string ownerId)
        {
            var units = new List<AdvancedCombatUnit>();
            foreach (var kvp in defense)
            {
                if (kvp.Value <= 0) continue;
                if (!DefenseDefs.TryGetValue(kvp.Key, out var def)) continue;
                for (int i = 0; i < kvp.Value; i++)
                    units.Add(AdvancedUnitHelpers.CreateUnit(
                        def.Key, def.Id, CombatUnitType.Defense,
                        UnitCategory.Military, UnitClass.Defense,
                        def.ShieldPower, def.ArmorValue, def.StructuralIntegrity,
                        100,
                        def.Damage, def.WeaponPower,
                        def.Resistances, def.CombatStats,
                        0, 1.0,
                        def.Cost, null,
                        tech, ownerId));
            }
            return units;
        }

        // =====================================================================
        // HELPERS
        // =====================================================================

        private void AddEvent(int round, string type,
            AdvancedCombatUnit source, AdvancedCombatUnit target,
            Dictionary<string, object> data)
        {
            if (!_options.TrackEvents) return;
            _timeline.Add(new BattleTimelineEvent
            {
                Timestamp = _timestamp++,
                Round = round,
                Type = type,
                SourceId = source?.Id,
                SourceKey = source?.UnitKey,
                TargetId = target?.Id,
                TargetKey = target?.UnitKey,
                Data = data ?? new Dictionary<string, object>(),
            });
        }

        private Dictionary<string, int> CountUnits(List<AdvancedCombatUnit> units)
        {
            var c = new Dictionary<string, int>();
            foreach (var u in units)
                c[u.UnitKey] = c.GetValueOrDefault(u.UnitKey) + 1;
            return c;
        }

        private Dictionary<string, int> GetRemaining(List<AdvancedCombatUnit> units, CombatUnitType type)
        {
            var r = new Dictionary<string, int>();
            foreach (var u in units)
            {
                if (u.Destroyed || u.Type != type) continue;
                r[u.UnitKey] = r.GetValueOrDefault(u.UnitKey) + 1;
            }
            return r;
        }

        private (Dictionary<string, int> Lost, int Count, double M, double C, double D)
            CalcLosses(Dictionary<string, int> initial, List<AdvancedCombatUnit> remaining, CombatUnitType type)
        {
            var remCounts = new Dictionary<string, int>();
            foreach (var u in remaining)
            {
                if (u.Destroyed || u.Type != type) continue;
                remCounts[u.UnitKey] = remCounts.GetValueOrDefault(u.UnitKey) + 1;
            }

            var lost = new Dictionary<string, int>();
            double m = 0, c = 0, d = 0;
            int count = 0;
            foreach (var kvp in initial)
            {
                int rem = remCounts.GetValueOrDefault(kvp.Key, 0);
                int diff = kvp.Value - rem;
                if (diff > 0)
                {
                    lost[kvp.Key] = diff;
                    count += diff;
                    UnitCost? cost = null;
                    if (type == CombatUnitType.Ship && ShipDefs.TryGetValue(kvp.Key, out var sd))
                        cost = sd.Cost;
                    else if (type == CombatUnitType.Defense && DefenseDefs.TryGetValue(kvp.Key, out var dd))
                        cost = dd.Cost;
                    if (cost.HasValue) { m += cost.Value.Metal * diff; c += cost.Value.Crystal * diff; d += cost.Value.Deuterium * diff; }
                }
            }
            return (lost, count, m, c, d);
        }

        private (double Metal, double Crystal) CalcDebris(Dictionary<string, int> destroyed)
        {
            double tm = 0, tc = 0;
            foreach (var kvp in destroyed)
            {
                if (ShipDefs.TryGetValue(kvp.Key, out var def))
                {
                    tm += def.Cost.Metal * kvp.Value;
                    tc += def.Cost.Crystal * kvp.Value;
                }
            }
            return (Math.Floor(tm * _options.DebrisPercentage), Math.Floor(tc * _options.DebrisPercentage));
        }

        private double CalcCargo(Dictionary<string, int> ships)
        {
            double total = 0;
            foreach (var kvp in ships)
                if (ShipDefs.TryGetValue(kvp.Key, out var def))
                    total += def.CargoCapacity * kvp.Value;
            return total;
        }

        private CombatUnit ToCombatUnit(AdvancedCombatUnit u) => new CombatUnit
        {
            Id = u.Id, UnitKey = u.UnitKey, Type = u.Type, Destroyed = u.Destroyed,
            CurrentHull = u.Defense.Hull.Current, MaxHull = u.Defense.Hull.Max,
        };
    }

    // =========================================================================
    // DEFINITION TYPES (for config data injection)
    // =========================================================================

    public struct AdvancedShipDef
    {
        public string Key;
        public int Id;
        public UnitCategory Category;
        public UnitClass UnitClass;
        public int ShieldPower;
        public int ArmorValue;
        public int StructuralIntegrity;
        public int ShieldRegenRate;
        public DamageTypes Damage;
        public int WeaponPower;
        public ResistanceTypes Resistances;
        public AdvancedCombatStats CombatStats;
        public int CrewCapacity;
        public double CrewCombatStrength;
        public UnitCost Cost;
        public int CargoCapacity;
        public Dictionary<string, int> RapidFire;
    }

    public struct AdvancedDefenseDef
    {
        public string Key;
        public int Id;
        public int ShieldPower;
        public int ArmorValue;
        public int StructuralIntegrity;
        public DamageTypes Damage;
        public int WeaponPower;
        public ResistanceTypes Resistances;
        public AdvancedCombatStats CombatStats;
        public UnitCost Cost;
    }
}
