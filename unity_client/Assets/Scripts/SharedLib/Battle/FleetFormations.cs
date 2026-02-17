// =============================================================================
// FleetFormations.cs — Ported from fleet-formations.ts + formation-data.ts
// Tactical fleet formations, bonuses, and optimal placement
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Battle
{
    // =========================================================================
    // ENUMS
    // =========================================================================

    public enum FormationType
    {
        Line, Arrow, DefensiveSphere, CarrierEscort, Pincer,
        Echelon, WolfPack, Siege, Ambush, Scattered
    }

    public enum FormationPosition
    {
        Vanguard, Center, Flank, Rear, Reserve, Screen
    }

    public enum FormationRole
    {
        Assault, Support, Defense, Flanker, Anchor, Scout,
        Artillery, Interceptor, Commander
    }

    // =========================================================================
    // STRUCTURES
    // =========================================================================

    public class FormationBonus
    {
        public double DamageBonus;
        public double DefenseBonus;
        public double AccuracyBonus;
        public double EvasionBonus;
        public double SpeedBonus;
        public double ShieldRegenBonus;
        public double CritBonus;
        public double PointDefenseBonus;
    }

    public class PositionSlot
    {
        public FormationPosition Position;
        public FormationRole Role;
        public FormationBonus Bonuses = new FormationBonus();
        public List<UnitClass> PreferredClasses = new List<UnitClass>();
        public int MinUnits;
        public int MaxUnits;
    }

    public class CompositionRequirement
    {
        public int MinShips;
        public int MaxShips;
        public Dictionary<UnitClass, int> MinClassCount;
        public List<UnitClass> RequiredClasses;
        public List<UnitClass> ExcludedClasses;
    }

    public class FormationData
    {
        public FormationType Type;
        public string Name;
        public string Description;
        public List<PositionSlot> Positions = new List<PositionSlot>();
        public CompositionRequirement Requirements = new CompositionRequirement();
        public FormationBonus GlobalBonus = new FormationBonus();
    }

    public class UnitPlacement
    {
        public string UnitId;
        public UnitClass UnitClass;
        public FormationPosition Position;
        public FormationRole Role;
        public FormationBonus Bonuses;
    }

    public class FleetFormationResult
    {
        public FormationType Formation;
        public List<UnitPlacement> Placements = new List<UnitPlacement>();
        public FormationBonus GlobalBonus;
        public double FormationScore;
    }

    // =========================================================================
    // FORMATION DATA (from formation-data.ts)
    // =========================================================================

    public static class FormationDataStore
    {
        private static readonly Dictionary<FormationType, FormationData> _formations;

        static FormationDataStore()
        {
            _formations = new Dictionary<FormationType, FormationData>
            {
                [FormationType.Line] = new FormationData
                {
                    Type = FormationType.Line, Name = "Line Formation",
                    Description = "Traditional battle line. Balanced offense and defense.",
                    Positions = new List<PositionSlot>
                    {
                        P(FormationPosition.Vanguard, FormationRole.Assault, 1, 5,
                          new FormationBonus { DamageBonus = 10, DefenseBonus = 5 },
                          UnitClass.Cruiser, UnitClass.Battlecruiser, UnitClass.Battleship),
                        P(FormationPosition.Center, FormationRole.Anchor, 2, 10,
                          new FormationBonus { DefenseBonus = 10, ShieldRegenBonus = 5 },
                          UnitClass.Battleship, UnitClass.Dreadnought),
                        P(FormationPosition.Flank, FormationRole.Flanker, 1, 6,
                          new FormationBonus { EvasionBonus = 10, AccuracyBonus = 5 },
                          UnitClass.Corvette, UnitClass.Frigate, UnitClass.Cruiser),
                        P(FormationPosition.Rear, FormationRole.Support, 0, 4,
                          new FormationBonus { ShieldRegenBonus = 10, PointDefenseBonus = 10 },
                          UnitClass.Carrier, UnitClass.Utility),
                    },
                    Requirements = new CompositionRequirement { MinShips = 4, MaxShips = 25 },
                    GlobalBonus = new FormationBonus { DefenseBonus = 5, AccuracyBonus = 3 },
                },
                [FormationType.Arrow] = new FormationData
                {
                    Type = FormationType.Arrow, Name = "Arrow Formation",
                    Description = "Aggressive wedge focusing firepower forward.",
                    Positions = new List<PositionSlot>
                    {
                        P(FormationPosition.Vanguard, FormationRole.Assault, 1, 3,
                          new FormationBonus { DamageBonus = 20, CritBonus = 5, DefenseBonus = -5 },
                          UnitClass.Battleship, UnitClass.Dreadnought),
                        P(FormationPosition.Flank, FormationRole.Flanker, 2, 8,
                          new FormationBonus { DamageBonus = 10, EvasionBonus = 5 },
                          UnitClass.Cruiser, UnitClass.Battlecruiser),
                        P(FormationPosition.Rear, FormationRole.Support, 0, 4,
                          new FormationBonus { ShieldRegenBonus = 5 },
                          UnitClass.Carrier, UnitClass.Utility),
                    },
                    Requirements = new CompositionRequirement { MinShips = 3, MaxShips = 15 },
                    GlobalBonus = new FormationBonus { DamageBonus = 10, SpeedBonus = 5 },
                },
                [FormationType.DefensiveSphere] = new FormationData
                {
                    Type = FormationType.DefensiveSphere, Name = "Defensive Sphere",
                    Description = "All-round protection, ideal for protecting valuable ships.",
                    Positions = new List<PositionSlot>
                    {
                        P(FormationPosition.Center, FormationRole.Commander, 1, 3,
                          new FormationBonus { DefenseBonus = 20, ShieldRegenBonus = 15 },
                          UnitClass.Carrier, UnitClass.Dreadnought),
                        P(FormationPosition.Screen, FormationRole.Defense, 3, 12,
                          new FormationBonus { DefenseBonus = 15, PointDefenseBonus = 10, EvasionBonus = 5 },
                          UnitClass.Frigate, UnitClass.Cruiser, UnitClass.Battlecruiser),
                        P(FormationPosition.Vanguard, FormationRole.Interceptor, 2, 8,
                          new FormationBonus { EvasionBonus = 15, AccuracyBonus = 5 },
                          UnitClass.Fighter, UnitClass.Corvette),
                    },
                    Requirements = new CompositionRequirement { MinShips = 6, MaxShips = 25 },
                    GlobalBonus = new FormationBonus { DefenseBonus = 10, ShieldRegenBonus = 5 },
                },
                [FormationType.CarrierEscort] = new FormationData
                {
                    Type = FormationType.CarrierEscort, Name = "Carrier Escort",
                    Description = "Protects carriers while they launch fighters.",
                    Positions = new List<PositionSlot>
                    {
                        P(FormationPosition.Center, FormationRole.Commander, 1, 3,
                          new FormationBonus { PointDefenseBonus = 20, ShieldRegenBonus = 10 },
                          UnitClass.Carrier),
                        P(FormationPosition.Screen, FormationRole.Defense, 2, 8,
                          new FormationBonus { DefenseBonus = 15, PointDefenseBonus = 15 },
                          UnitClass.Cruiser, UnitClass.Battlecruiser),
                        P(FormationPosition.Vanguard, FormationRole.Interceptor, 2, 10,
                          new FormationBonus { AccuracyBonus = 10, EvasionBonus = 10, SpeedBonus = 10 },
                          UnitClass.Fighter, UnitClass.Corvette),
                    },
                    Requirements = new CompositionRequirement { MinShips = 5, MaxShips = 25,
                        RequiredClasses = new List<UnitClass> { UnitClass.Carrier } },
                    GlobalBonus = new FormationBonus { PointDefenseBonus = 10 },
                },
                [FormationType.WolfPack] = new FormationData
                {
                    Type = FormationType.WolfPack, Name = "Wolf Pack",
                    Description = "Small fast ships hunting together.",
                    Positions = new List<PositionSlot>
                    {
                        P(FormationPosition.Vanguard, FormationRole.Scout, 1, 3,
                          new FormationBonus { EvasionBonus = 15, SpeedBonus = 10, AccuracyBonus = 10 },
                          UnitClass.Corvette),
                        P(FormationPosition.Flank, FormationRole.Assault, 2, 8,
                          new FormationBonus { DamageBonus = 15, CritBonus = 10, EvasionBonus = 10 },
                          UnitClass.Corvette, UnitClass.Frigate),
                    },
                    Requirements = new CompositionRequirement { MinShips = 3, MaxShips = 12,
                        ExcludedClasses = new List<UnitClass> { UnitClass.Battleship, UnitClass.Dreadnought, UnitClass.Carrier } },
                    GlobalBonus = new FormationBonus { SpeedBonus = 10, EvasionBonus = 5, CritBonus = 5 },
                },
                [FormationType.Siege] = new FormationData
                {
                    Type = FormationType.Siege, Name = "Siege Formation",
                    Description = "Long-range bombardment formation.",
                    Positions = new List<PositionSlot>
                    {
                        P(FormationPosition.Rear, FormationRole.Artillery, 2, 6,
                          new FormationBonus { DamageBonus = 25, AccuracyBonus = 10, CritBonus = 5 },
                          UnitClass.Battleship, UnitClass.Dreadnought),
                        P(FormationPosition.Screen, FormationRole.Defense, 2, 10,
                          new FormationBonus { DefenseBonus = 15, PointDefenseBonus = 15 },
                          UnitClass.Frigate, UnitClass.Cruiser),
                        P(FormationPosition.Vanguard, FormationRole.Scout, 1, 4,
                          new FormationBonus { EvasionBonus = 15, AccuracyBonus = 15 },
                          UnitClass.Corvette, UnitClass.Frigate),
                    },
                    Requirements = new CompositionRequirement { MinShips = 5, MaxShips = 20 },
                    GlobalBonus = new FormationBonus { DamageBonus = 10, AccuracyBonus = 5 },
                },
            };
        }

        private static PositionSlot P(FormationPosition pos, FormationRole role,
            int min, int max, FormationBonus bonus, params UnitClass[] preferred)
            => new PositionSlot
            {
                Position = pos, Role = role, MinUnits = min, MaxUnits = max,
                Bonuses = bonus, PreferredClasses = new List<UnitClass>(preferred),
            };

        public static FormationData Get(FormationType type)
            => _formations.GetValueOrDefault(type);

        public static IReadOnlyDictionary<FormationType, FormationData> All => _formations;
    }

    // =========================================================================
    // FLEET FORMATION ENGINE
    // =========================================================================

    public static class FleetFormationEngine
    {
        /// <summary>Check if a fleet can use a given formation.</summary>
        public static (bool IsValid, string Reason) ValidateFormation(
            FormationType type, List<AdvancedCombatUnit> fleet)
        {
            var data = FormationDataStore.Get(type);
            if (data == null) return (false, "Unknown formation");

            var req = data.Requirements;
            if (fleet.Count < req.MinShips) return (false, $"Need at least {req.MinShips} ships");
            if (fleet.Count > req.MaxShips) return (false, $"Max {req.MaxShips} ships");

            if (req.RequiredClasses != null)
                foreach (var rc in req.RequiredClasses)
                    if (!fleet.Any(u => u.UnitClass == rc))
                        return (false, $"Requires at least one {rc}");

            if (req.ExcludedClasses != null)
                foreach (var u in fleet)
                    if (req.ExcludedClasses.Contains(u.UnitClass))
                        return (false, $"{u.UnitClass} not allowed in this formation");

            return (true, null);
        }

        /// <summary>Apply a formation to a fleet, returning placements and bonuses.</summary>
        public static FleetFormationResult ApplyFormation(
            FormationType type, List<AdvancedCombatUnit> fleet)
        {
            var data = FormationDataStore.Get(type);
            var result = new FleetFormationResult
            {
                Formation = type,
                GlobalBonus = data?.GlobalBonus ?? new FormationBonus(),
            };

            if (data == null) return result;

            var remaining = new List<AdvancedCombatUnit>(fleet);

            foreach (var slot in data.Positions)
            {
                // Pick best-fit units for this slot
                var suited = remaining
                    .OrderByDescending(u => slot.PreferredClasses.Contains(u.UnitClass) ? 1 : 0)
                    .Take(slot.MaxUnits)
                    .ToList();

                foreach (var unit in suited)
                {
                    remaining.Remove(unit);
                    result.Placements.Add(new UnitPlacement
                    {
                        UnitId = unit.Id,
                        UnitClass = unit.UnitClass,
                        Position = slot.Position,
                        Role = slot.Role,
                        Bonuses = slot.Bonuses,
                    });
                }
            }

            // Remaining units go to last position with reduced bonuses
            foreach (var unit in remaining)
            {
                var lastSlot = data.Positions.Last();
                result.Placements.Add(new UnitPlacement
                {
                    UnitId = unit.Id,
                    UnitClass = unit.UnitClass,
                    Position = lastSlot.Position,
                    Role = lastSlot.Role,
                    Bonuses = new FormationBonus
                    {
                        DamageBonus = lastSlot.Bonuses.DamageBonus * 0.5,
                        DefenseBonus = lastSlot.Bonuses.DefenseBonus * 0.5,
                        AccuracyBonus = lastSlot.Bonuses.AccuracyBonus * 0.5,
                        EvasionBonus = lastSlot.Bonuses.EvasionBonus * 0.5,
                    },
                });
            }

            result.FormationScore = ScoreFormation(result);
            return result;
        }

        /// <summary>Apply formation bonuses to all units.</summary>
        public static void ApplyBonusesToUnits(
            FleetFormationResult formation, List<AdvancedCombatUnit> fleet)
        {
            var global = formation.GlobalBonus;

            foreach (var placement in formation.Placements)
            {
                var unit = fleet.FirstOrDefault(u => u.Id == placement.UnitId);
                if (unit == null) continue;

                var b = placement.Bonuses;
                double dmgMult = 1 + (b.DamageBonus + global.DamageBonus) / 100.0;
                double defMult = 1 + (b.DefenseBonus + global.DefenseBonus) / 100.0;

                unit.Damage = new DamageTypes
                {
                    Ballistic = (int)(unit.Damage.Ballistic * dmgMult),
                    Ionic = (int)(unit.Damage.Ionic * dmgMult),
                    Explosive = (int)(unit.Damage.Explosive * dmgMult),
                    Hacking = unit.Damage.Hacking,
                    Boarding = unit.Damage.Boarding,
                };

                unit.Defense.Shield.Max = (int)(unit.Defense.Shield.Max * defMult);
                unit.Defense.Shield.Current = (int)(unit.Defense.Shield.Current * defMult);
                unit.Defense.Armor.Max = (int)(unit.Defense.Armor.Max * defMult);
                unit.Defense.Armor.Current = (int)(unit.Defense.Armor.Current * defMult);

                unit.Stats.Accuracy += b.AccuracyBonus + global.AccuracyBonus;
                unit.Stats.Evasion += b.EvasionBonus + global.EvasionBonus;
                unit.Stats.CritChance += b.CritBonus + global.CritBonus;
                unit.Stats.PointDefense += b.PointDefenseBonus + global.PointDefenseBonus;
                unit.Defense.Shield.RegenRate += (int)(b.ShieldRegenBonus + global.ShieldRegenBonus);
            }
        }

        /// <summary>Score how well a fleet suits a formation (0-100).</summary>
        public static double ScoreFormation(FleetFormationResult result)
        {
            if (result.Placements.Count == 0) return 0;

            var data = FormationDataStore.Get(result.Formation);
            if (data == null) return 0;

            double score = 50; // base score

            foreach (var slot in data.Positions)
            {
                var placed = result.Placements
                    .Where(p => p.Position == slot.Position && p.Role == slot.Role)
                    .ToList();
                int preferred = placed.Count(p => slot.PreferredClasses.Contains(p.UnitClass));
                if (placed.Count > 0)
                    score += (double)preferred / placed.Count * 10;
                if (placed.Count >= slot.MinUnits) score += 5;
            }

            return Math.Min(100, score);
        }

        /// <summary>Suggest the best formation for a given fleet.</summary>
        public static FormationType SuggestFormation(List<AdvancedCombatUnit> fleet)
        {
            FormationType best = FormationType.Line;
            double bestScore = 0;

            foreach (var type in FormationDataStore.All.Keys)
            {
                var (valid, _) = ValidateFormation(type, fleet);
                if (!valid) continue;
                var result = ApplyFormation(type, fleet);
                if (result.FormationScore > bestScore)
                {
                    bestScore = result.FormationScore;
                    best = type;
                }
            }

            return best;
        }
    }
}
