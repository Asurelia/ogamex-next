// =============================================================================
// BoardingSystem.cs — Ported from boarding-system.ts
// Ship capture mechanics: approach, breach, crew combat, resolution
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Battle
{
    // =========================================================================
    // ENUMS
    // =========================================================================

    public enum BoardingPhase { Approach, Breach, Combat, Resolution }

    public enum BoardingOutcome
    {
        Captured, Sabotaged, Repelled, MutualDestruction, Retreated
    }

    public enum CrewType
    {
        Marine, Soldier, Security, Engineer, Officer, Elite
    }

    public enum CrewAbilityType
    {
        BreachExpert, CloseCombat, Suppression, Medic,
        Saboteur, Leader, HeavyArmor, Stealth
    }

    public enum SabotageTarget
    {
        Engines, Weapons, Shields, LifeSupport, PowerCore,
        Communications, Navigation
    }

    public enum SabotageSeverity { Minor, Moderate, Severe, Critical }

    public enum BoardingEventType
    {
        ApproachStart, ApproachIntercepted, ApproachSuccess,
        BreachAttempt, BreachSuccess, BreachFailed,
        CombatRound, CrewEliminated, AbilityUsed,
        CountermeasureTriggered, SystemSabotaged,
        BoardingComplete, BoardingRepelled, ShipCaptured, Retreat
    }

    // =========================================================================
    // DATA STRUCTURES
    // =========================================================================

    public class CrewUnit
    {
        public string Id;
        public CrewType Type;
        public int Health;
        public int MaxHealth;
        public int Attack;
        public int Defense;
        public List<CrewAbilityType> Abilities = new();
        public List<StatusEffect> StatusEffects = new();
        public bool Eliminated;
    }

    public class BreachEquipment
    {
        public string Type; // plasma_cutter, explosive_charge, hacking_device, teleporter
        public int Power;
        public int Uses;
    }

    public class BoardingParty
    {
        public string SourceUnitId;
        public string TargetUnitId;
        public List<CrewUnit> Crew = new();
        public double BoardingPower;
        public List<BreachEquipment> BreachEquipment = new();
    }

    public class Countermeasure
    {
        public string Type; // gas_defense, bulkhead_seal, self_destruct, emergency_vent
        public bool Active;
        public int Power;
    }

    public class ShipDefenses
    {
        public double PointDefense;
        public double HullIntegrity;
        public List<CrewUnit> SecurityCrew = new();
        public double AntiBoarding;
        public List<Countermeasure> Countermeasures = new();
    }

    public class BoardingEvent
    {
        public int Timestamp;
        public BoardingPhase Phase;
        public BoardingEventType Type;
        public Dictionary<string, object> Data;
    }

    public class SabotageEffect
    {
        public SabotageTarget System;
        public SabotageSeverity Severity;
        public int Duration;
        public StatusEffect Effect;
    }

    public class BoardingStatistics
    {
        public int TotalRounds;
        public int TotalDamageDealt;
        public int TotalDamageTaken;
        public int AbilitiesUsed;
        public int CriticalHits;
    }

    public class BoardingResult
    {
        public BoardingOutcome Outcome;
        public List<BoardingPhase> PhasesCompleted = new();
        public List<BoardingEvent> Events = new();
        public (int CrewLost, int CrewRemaining) AttackerLosses;
        public (int CrewLost, int CrewRemaining) DefenderLosses;
        public List<SabotageEffect> SabotageEffects;
        public BoardingStatistics Statistics;
    }

    // =========================================================================
    // CREW STATS
    // =========================================================================

    public static class CrewBaseStats
    {
        private static readonly Dictionary<CrewType, (int Hp, int Atk, int Def, CrewAbilityType[] Ab)> _stats = new()
        {
            [CrewType.Marine]   = (100, 25, 15, new[] { CrewAbilityType.BreachExpert, CrewAbilityType.CloseCombat }),
            [CrewType.Soldier]  = (80,  20, 20, Array.Empty<CrewAbilityType>()),
            [CrewType.Security] = (90,  15, 30, new[] { CrewAbilityType.Suppression }),
            [CrewType.Engineer] = (60,  10, 10, new[] { CrewAbilityType.Saboteur }),
            [CrewType.Officer]  = (70,  15, 15, new[] { CrewAbilityType.Leader }),
            [CrewType.Elite]    = (150, 35, 30, new[] { CrewAbilityType.CloseCombat, CrewAbilityType.HeavyArmor, CrewAbilityType.Leader }),
        };

        public static (int Hp, int Atk, int Def, CrewAbilityType[] Ab) Get(CrewType t) => _stats[t];
    }

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    public static class BoardingConstants
    {
        public const int MaxCombatRounds = 10;
        public const double BaseInterceptChance = 0.2;
        public const double BaseBreachChance = 0.5;
        public const double BreachExpertBonus = 1.5;
        public const double CloseCombatBonus = 1.3;
        public const double HeavyArmorReduction = 0.3;
        public const double LeaderBonus = 0.15;
        public const int MedicHealAmount = 15;
        public const double StealthAvoidChance = 0.3;
        public const double CritChance = 0.1;
        public const double CritMultiplier = 2.0;
        public const double CaptureThreshold = 0.1;
        public const double RetreatThreshold = 0.2;
    }

    // =========================================================================
    // BOARDING ENGINE
    // =========================================================================

    public class BoardingEngine
    {
        private readonly List<BoardingEvent> _events = new();
        private int _ts;
        private readonly Random _rng;

        public BoardingEngine(Random rng = null) => _rng = rng ?? new Random();

        public BoardingResult Execute(
            BoardingParty party, ShipDefenses defenses, AdvancedCombatUnit target)
        {
            _events.Clear();
            _ts = 0;

            var phases = new List<BoardingPhase>();
            var stats = new BoardingStatistics();

            // Phase 1: Approach
            bool approachOk = ExecuteApproach(party, defenses);
            phases.Add(BoardingPhase.Approach);
            if (!approachOk) return MakeResult(BoardingOutcome.Repelled, phases, party, defenses, stats);

            // Phase 2: Breach
            bool breachOk = ExecuteBreach(party, defenses, target);
            phases.Add(BoardingPhase.Breach);
            if (!breachOk) return MakeResult(BoardingOutcome.Repelled, phases, party, defenses, stats);

            // Phase 3: Combat
            var combatResult = ExecuteCombat(party, defenses, stats);
            phases.Add(BoardingPhase.Combat);

            // Phase 4: Resolution
            var outcome = Resolve(party, defenses, combatResult.attackerWon, combatResult.defenderEliminated);
            phases.Add(BoardingPhase.Resolution);

            List<SabotageEffect> sabotage = null;
            if (outcome == BoardingOutcome.Sabotaged)
                sabotage = ExecuteSabotage(party, target);

            return MakeResult(outcome, phases, party, defenses, stats, sabotage);
        }

        // --- Approach ---
        private bool ExecuteApproach(BoardingParty party, ShipDefenses def)
        {
            AddEvent(BoardingPhase.Approach, BoardingEventType.ApproachStart,
                new() { ["boardingPower"] = party.BoardingPower, ["defenseLevel"] = def.PointDefense });

            double intercept = Math.Min(0.8, BoardingConstants.BaseInterceptChance + def.PointDefense / 200.0);

            foreach (var c in party.Crew)
            {
                if (_rng.NextDouble() < intercept)
                {
                    int dmg = (int)(def.PointDefense * 0.5 * _rng.NextDouble());
                    c.Health -= dmg;
                    if (c.Health <= 0)
                    {
                        c.Eliminated = true;
                        AddEvent(BoardingPhase.Approach, BoardingEventType.CrewEliminated,
                            new() { ["crewId"] = c.Id, ["crewType"] = c.Type });
                    }
                }
            }

            bool alive = party.Crew.Any(c => !c.Eliminated);
            AddEvent(BoardingPhase.Approach,
                alive ? BoardingEventType.ApproachSuccess : BoardingEventType.ApproachIntercepted,
                new() { ["surviving"] = party.Crew.Count(c => !c.Eliminated) });
            return alive;
        }

        // --- Breach ---
        private bool ExecuteBreach(BoardingParty party, ShipDefenses def, AdvancedCombatUnit target)
        {
            AddEvent(BoardingPhase.Breach, BoardingEventType.BreachAttempt,
                new() { ["hullIntegrity"] = def.HullIntegrity });

            double breachPower = 0;
            foreach (var eq in party.BreachEquipment)
                if (eq.Uses > 0) { breachPower += eq.Power; eq.Uses--; }

            foreach (var c in party.Crew)
                if (!c.Eliminated && c.Abilities.Contains(CrewAbilityType.BreachExpert))
                    breachPower *= BoardingConstants.BreachExpertBonus;

            double hullFactor = (double)target.Defense.Hull.Current / target.Defense.Hull.Max;
            double chance = Math.Min(0.95, BoardingConstants.BaseBreachChance + breachPower / 100.0 - hullFactor * 0.3);
            bool ok = _rng.NextDouble() < chance;

            AddEvent(BoardingPhase.Breach,
                ok ? BoardingEventType.BreachSuccess : BoardingEventType.BreachFailed,
                new() { ["breachPower"] = breachPower, ["chance"] = chance });
            return ok;
        }

        // --- Combat ---
        private (bool attackerWon, bool defenderEliminated) ExecuteCombat(
            BoardingParty party, ShipDefenses def, BoardingStatistics stats)
        {
            for (int round = 0; round < BoardingConstants.MaxCombatRounds; round++)
            {
                stats.TotalRounds++;
                var atk = party.Crew.Where(c => !c.Eliminated).ToList();
                var dfd = def.SecurityCrew.Where(c => !c.Eliminated).ToList();
                if (atk.Count == 0 || dfd.Count == 0) break;

                var (dmgDealt, dmgTaken) = RunCombatRound(atk, dfd, stats);

                AddEvent(BoardingPhase.Combat, BoardingEventType.CombatRound, new()
                {
                    ["round"] = round + 1,
                    ["attackerRemaining"] = atk.Count(c => !c.Eliminated),
                    ["defenderRemaining"] = dfd.Count(c => !c.Eliminated),
                    ["damageDealt"] = dmgDealt, ["damageTaken"] = dmgTaken,
                });

                double ratio = (double)atk.Count(c => !c.Eliminated) / party.Crew.Count;
                if (ratio < BoardingConstants.RetreatThreshold) break;
            }

            int atkRem = party.Crew.Count(c => !c.Eliminated);
            int dfRem = def.SecurityCrew.Count(c => !c.Eliminated);
            return (atkRem > 0 && dfRem == 0, dfRem == 0);
        }

        private (int dealt, int taken) RunCombatRound(
            List<CrewUnit> attackers, List<CrewUnit> defenders, BoardingStatistics stats)
        {
            int dealt = 0, taken = 0;
            double atkLeader = attackers.Any(c => c.Abilities.Contains(CrewAbilityType.Leader))
                ? BoardingConstants.LeaderBonus : 0;
            double defLeader = defenders.Any(c => c.Abilities.Contains(CrewAbilityType.Leader))
                ? BoardingConstants.LeaderBonus : 0;

            // Attackers attack
            foreach (var a in attackers)
            {
                if (a.Eliminated) continue;
                var alive = defenders.Where(d => !d.Eliminated).ToList();
                if (alive.Count == 0) break;
                var t = SelectTarget(alive);
                if (t == null) continue;
                int dmg = CalcDamage(a, t, atkLeader);
                if (_rng.NextDouble() < BoardingConstants.CritChance)
                    { dmg = (int)(dmg * BoardingConstants.CritMultiplier); stats.CriticalHits++; }
                t.Health -= dmg; dealt += dmg; stats.TotalDamageDealt += dmg;
                if (t.Health <= 0)
                {
                    t.Eliminated = true;
                    AddEvent(BoardingPhase.Combat, BoardingEventType.CrewEliminated,
                        new() { ["crewId"] = t.Id, ["killedBy"] = a.Id });
                }
            }

            // Defenders attack
            foreach (var d in defenders)
            {
                if (d.Eliminated) continue;
                var alive = attackers.Where(a => !a.Eliminated).ToList();
                if (alive.Count == 0) break;
                var t = SelectTarget(alive);
                if (t == null) continue;
                int dmg = CalcDamage(d, t, defLeader);
                if (_rng.NextDouble() < BoardingConstants.CritChance)
                    { dmg = (int)(dmg * BoardingConstants.CritMultiplier); stats.CriticalHits++; }
                t.Health -= dmg; taken += dmg; stats.TotalDamageTaken += dmg;
                if (t.Health <= 0)
                {
                    t.Eliminated = true;
                    AddEvent(BoardingPhase.Combat, BoardingEventType.CrewEliminated,
                        new() { ["crewId"] = t.Id, ["killedBy"] = d.Id });
                }
            }

            ApplyMedics(attackers);
            ApplyMedics(defenders);
            return (dealt, taken);
        }

        private CrewUnit SelectTarget(List<CrewUnit> targets)
        {
            var valid = targets.Where(t => !t.Eliminated &&
                (!t.Abilities.Contains(CrewAbilityType.Stealth) ||
                 _rng.NextDouble() > BoardingConstants.StealthAvoidChance)).ToList();
            return valid.Count == 0 ? null : valid[_rng.Next(valid.Count)];
        }

        private int CalcDamage(CrewUnit atk, CrewUnit def, double leaderBonus)
        {
            double attack = atk.Attack * (1 + leaderBonus);
            if (atk.Abilities.Contains(CrewAbilityType.CloseCombat))
                attack *= BoardingConstants.CloseCombatBonus;
            if (def.Abilities.Contains(CrewAbilityType.Suppression))
                attack *= 0.8;
            double defense = def.Defense;
            if (def.Abilities.Contains(CrewAbilityType.HeavyArmor))
                defense *= 1 + BoardingConstants.HeavyArmorReduction;
            return Math.Max(1, (int)(attack - defense * 0.5));
        }

        private void ApplyMedics(List<CrewUnit> crew)
        {
            foreach (var medic in crew.Where(c => !c.Eliminated && c.Abilities.Contains(CrewAbilityType.Medic)))
            {
                var wounded = crew.Where(c => !c.Eliminated && c.Health < c.MaxHealth && c.Id != medic.Id).ToList();
                if (wounded.Count > 0)
                {
                    var t = wounded[_rng.Next(wounded.Count)];
                    t.Health = Math.Min(t.MaxHealth, t.Health + BoardingConstants.MedicHealAmount);
                }
            }
        }

        // --- Resolution ---
        private BoardingOutcome Resolve(BoardingParty party, ShipDefenses def,
            bool attackerWon, bool defenderEliminated)
        {
            int atkRem = party.Crew.Count(c => !c.Eliminated);
            int defRem = def.SecurityCrew.Count(c => !c.Eliminated);

            if (atkRem == 0 && defRem == 0)
            {
                AddEvent(BoardingPhase.Resolution, BoardingEventType.BoardingComplete,
                    new() { ["outcome"] = "mutual_destruction" });
                return BoardingOutcome.MutualDestruction;
            }
            if (atkRem == 0)
            {
                AddEvent(BoardingPhase.Resolution, BoardingEventType.BoardingRepelled, new());
                return BoardingOutcome.Repelled;
            }

            double atkRatio = (double)atkRem / party.Crew.Count;
            if (atkRatio < BoardingConstants.RetreatThreshold)
            {
                AddEvent(BoardingPhase.Resolution, BoardingEventType.Retreat,
                    new() { ["remaining"] = atkRem });
                return BoardingOutcome.Retreated;
            }

            double defRatio = def.SecurityCrew.Count > 0 ? (double)defRem / def.SecurityCrew.Count : 0;
            if (defRatio <= BoardingConstants.CaptureThreshold || defenderEliminated)
            {
                bool hasEngineer = party.Crew.Any(c => !c.Eliminated && c.Type == CrewType.Engineer);
                if (hasEngineer && defRem > 0)
                {
                    AddEvent(BoardingPhase.Resolution, BoardingEventType.BoardingComplete,
                        new() { ["outcome"] = "sabotaged" });
                    return BoardingOutcome.Sabotaged;
                }
                AddEvent(BoardingPhase.Resolution, BoardingEventType.ShipCaptured, new());
                return BoardingOutcome.Captured;
            }

            if (party.Crew.Any(c => !c.Eliminated && c.Type == CrewType.Engineer))
            {
                AddEvent(BoardingPhase.Resolution, BoardingEventType.BoardingComplete,
                    new() { ["outcome"] = "sabotaged" });
                return BoardingOutcome.Sabotaged;
            }

            AddEvent(BoardingPhase.Resolution, BoardingEventType.Retreat,
                new() { ["remaining"] = atkRem });
            return BoardingOutcome.Retreated;
        }

        // --- Sabotage ---
        private List<SabotageEffect> ExecuteSabotage(BoardingParty party, AdvancedCombatUnit target)
        {
            var effects = new List<SabotageEffect>();
            var engineers = party.Crew.Where(c => !c.Eliminated && c.Type == CrewType.Engineer).ToList();
            var targets = new[] { SabotageTarget.Engines, SabotageTarget.Weapons, SabotageTarget.Shields,
                                  SabotageTarget.LifeSupport, SabotageTarget.PowerCore };

            foreach (var eng in engineers)
            {
                var sys = targets[_rng.Next(targets.Length)];
                var sev = RollSeverity();
                var fx = new SabotageEffect
                {
                    System = sys, Severity = sev,
                    Duration = SabotageDuration(sev),
                    Effect = CreateSabotageEffect(sys, sev),
                };
                effects.Add(fx);
                target.StatusEffects.Add(fx.Effect);
                AddEvent(BoardingPhase.Resolution, BoardingEventType.SystemSabotaged,
                    new() { ["system"] = sys, ["severity"] = sev, ["engineerId"] = eng.Id });
            }
            return effects;
        }

        private SabotageSeverity RollSeverity()
        {
            double r = _rng.NextDouble();
            if (r < 0.4) return SabotageSeverity.Minor;
            if (r < 0.7) return SabotageSeverity.Moderate;
            if (r < 0.9) return SabotageSeverity.Severe;
            return SabotageSeverity.Critical;
        }

        private int SabotageDuration(SabotageSeverity s) => s switch
        {
            SabotageSeverity.Minor => 1, SabotageSeverity.Moderate => 2,
            SabotageSeverity.Severe => 3, SabotageSeverity.Critical => 5, _ => 1,
        };

        private StatusEffect CreateSabotageEffect(SabotageTarget sys, SabotageSeverity sev)
        {
            double strength = sev switch
            {
                SabotageSeverity.Minor => 0.2, SabotageSeverity.Moderate => 0.4,
                SabotageSeverity.Severe => 0.6, SabotageSeverity.Critical => 0.8, _ => 0.2,
            };
            var effectType = sys switch
            {
                SabotageTarget.Engines => StatusEffectType.EnginesDisabled,
                SabotageTarget.Weapons => StatusEffectType.WeaponsDisabled,
                SabotageTarget.Shields => StatusEffectType.ShieldDisruption,
                SabotageTarget.LifeSupport => StatusEffectType.CrewPanic,
                SabotageTarget.PowerCore => StatusEffectType.EmpStunned,
                SabotageTarget.Communications => StatusEffectType.SystemHacked,
                SabotageTarget.Navigation => StatusEffectType.Ionized,
                _ => StatusEffectType.EmpStunned,
            };
            return new StatusEffect
            {
                Type = effectType, Duration = SabotageDuration(sev),
                Strength = strength,
            };
        }

        // --- Events ---
        private void AddEvent(BoardingPhase phase, BoardingEventType type,
            Dictionary<string, object> data)
            => _events.Add(new BoardingEvent { Timestamp = _ts++, Phase = phase, Type = type, Data = data });

        private BoardingResult MakeResult(BoardingOutcome outcome, List<BoardingPhase> phases,
            BoardingParty party, ShipDefenses def, BoardingStatistics stats,
            List<SabotageEffect> sabotage = null)
        {
            int atkLost = party.Crew.Count(c => c.Eliminated);
            int defLost = def.SecurityCrew.Count(c => c.Eliminated);
            return new BoardingResult
            {
                Outcome = outcome, PhasesCompleted = phases,
                Events = new List<BoardingEvent>(_events),
                AttackerLosses = (atkLost, party.Crew.Count - atkLost),
                DefenderLosses = (defLost, def.SecurityCrew.Count - defLost),
                SabotageEffects = sabotage, Statistics = stats,
            };
        }
    }

    // =========================================================================
    // HELPER FUNCTIONS
    // =========================================================================

    public static class BoardingHelpers
    {
        private static int _crewId;

        public static CrewUnit CreateCrewUnit(CrewType type, int bonusHp = 0, int bonusAtk = 0, int bonusDef = 0)
        {
            var (hp, atk, def, ab) = CrewBaseStats.Get(type);
            return new CrewUnit
            {
                Id = $"crew_{_crewId++}", Type = type,
                Health = hp + bonusHp, MaxHealth = hp + bonusHp,
                Attack = atk + bonusAtk, Defense = def + bonusDef,
                Abilities = new List<CrewAbilityType>(ab),
            };
        }

        public static BoardingParty CreateBoardingParty(
            AdvancedCombatUnit source, string targetId,
            Dictionary<CrewType, int> distribution = null)
        {
            int crew = source.Crew.Current;
            var dist = new Dictionary<CrewType, int>
            {
                [CrewType.Marine]   = distribution?.GetValueOrDefault(CrewType.Marine)   ?? (int)(crew * 0.4),
                [CrewType.Soldier]  = distribution?.GetValueOrDefault(CrewType.Soldier)  ?? (int)(crew * 0.3),
                [CrewType.Security] = distribution?.GetValueOrDefault(CrewType.Security) ?? 0,
                [CrewType.Engineer] = distribution?.GetValueOrDefault(CrewType.Engineer) ?? (int)(crew * 0.1),
                [CrewType.Officer]  = distribution?.GetValueOrDefault(CrewType.Officer)  ?? (int)(crew * 0.1),
                [CrewType.Elite]    = distribution?.GetValueOrDefault(CrewType.Elite)    ?? (int)(crew * 0.1),
            };

            var units = new List<CrewUnit>();
            foreach (var (t, n) in dist)
                for (int i = 0; i < n; i++)
                    units.Add(CreateCrewUnit(t));

            return new BoardingParty
            {
                SourceUnitId = source.Id, TargetUnitId = targetId,
                Crew = units, BoardingPower = source.Damage.Boarding,
                BreachEquipment = new List<BreachEquipment>
                {
                    new() { Type = "plasma_cutter", Power = 50, Uses = 2 },
                    new() { Type = "explosive_charge", Power = 80, Uses = 1 },
                },
            };
        }

        public static ShipDefenses CreateShipDefenses(
            AdvancedCombatUnit target, int? securityCount = null)
        {
            int count = securityCount ?? target.Crew.Current / 2;
            var rng = new Random();
            var security = new List<CrewUnit>();
            for (int i = 0; i < count; i++)
            {
                double r = rng.NextDouble();
                security.Add(r < 0.5 ? CreateCrewUnit(CrewType.Soldier)
                           : r < 0.8 ? CreateCrewUnit(CrewType.Security)
                                     : CreateCrewUnit(CrewType.Officer));
            }

            return new ShipDefenses
            {
                PointDefense = target.Stats.PointDefense,
                HullIntegrity = (double)target.Defense.Hull.Current / target.Defense.Hull.Max,
                SecurityCrew = security,
                AntiBoarding = target.Resistances.AntiBoarding,
                Countermeasures = new List<Countermeasure>
                    { new() { Type = "bulkhead_seal", Active = true, Power = 20 } },
            };
        }
    }
}
