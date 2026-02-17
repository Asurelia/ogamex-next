// =============================================================================
// VeterancySystem.cs — Ported from veterancy-system.ts
// Unit experience, ranks, stat bonuses, abilities, and progression
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Battle
{
    // =========================================================================
    // ENUMS
    // =========================================================================

    public enum VeterancyRank { Recruit, Trained, Veteran, Elite, Legendary }

    public enum ExperienceAction
    {
        DamageDealt, DamageTaken, Kill, CriticalHit,
        BoardingSuccess, BoardingDefense,
        SurviveBattle, WinBattle, LoseBattle
    }

    public enum VeterancyAbilityType
    {
        SteadyAim, BattleHardened, AdrenalineSurge, KillStreak,
        Leadership, LastStand, TacticalGenius, IronWill
    }

    // =========================================================================
    // CONFIGURATION
    // =========================================================================

    public static class VeterancyConfig
    {
        public static readonly VeterancyRank[] RankOrder =
            { VeterancyRank.Recruit, VeterancyRank.Trained, VeterancyRank.Veteran,
              VeterancyRank.Elite, VeterancyRank.Legendary };

        public static readonly Dictionary<VeterancyRank, int> RankThresholds = new()
        {
            [VeterancyRank.Recruit] = 0, [VeterancyRank.Trained] = 100,
            [VeterancyRank.Veteran] = 500, [VeterancyRank.Elite] = 2000,
            [VeterancyRank.Legendary] = 10000,
        };

        public static readonly Dictionary<ExperienceAction, double> ExperienceGains = new()
        {
            [ExperienceAction.DamageDealt] = 1,
            [ExperienceAction.DamageTaken] = 0.5,
            [ExperienceAction.Kill] = 25,
            [ExperienceAction.CriticalHit] = 5,
            [ExperienceAction.BoardingSuccess] = 50,
            [ExperienceAction.BoardingDefense] = 30,
            [ExperienceAction.SurviveBattle] = 10,
            [ExperienceAction.WinBattle] = 20,
            [ExperienceAction.LoseBattle] = 5,
        };
    }

    // =========================================================================
    // RANK BONUSES
    // =========================================================================

    public struct RankBonuses
    {
        public double DamageMultiplier;
        public double DefenseMultiplier;
        public double AccuracyBonus;
        public double EvasionBonus;
        public double CritBonus;
        public double CritDamageBonus;
        public double ShieldRegenBonus;
        public double MoraleBonus;
    }

    public static class RankBonusData
    {
        public static readonly Dictionary<VeterancyRank, RankBonuses> Bonuses = new()
        {
            [VeterancyRank.Recruit] = new RankBonuses
                { DamageMultiplier = 1.0, DefenseMultiplier = 1.0 },
            [VeterancyRank.Trained] = new RankBonuses
                { DamageMultiplier = 1.05, DefenseMultiplier = 1.03,
                  AccuracyBonus = 2, EvasionBonus = 1, CritBonus = 1,
                  CritDamageBonus = 0.05, ShieldRegenBonus = 2, MoraleBonus = 5 },
            [VeterancyRank.Veteran] = new RankBonuses
                { DamageMultiplier = 1.10, DefenseMultiplier = 1.08,
                  AccuracyBonus = 5, EvasionBonus = 3, CritBonus = 3,
                  CritDamageBonus = 0.15, ShieldRegenBonus = 5, MoraleBonus = 15 },
            [VeterancyRank.Elite] = new RankBonuses
                { DamageMultiplier = 1.18, DefenseMultiplier = 1.15,
                  AccuracyBonus = 10, EvasionBonus = 6, CritBonus = 6,
                  CritDamageBonus = 0.30, ShieldRegenBonus = 10, MoraleBonus = 30 },
            [VeterancyRank.Legendary] = new RankBonuses
                { DamageMultiplier = 1.30, DefenseMultiplier = 1.25,
                  AccuracyBonus = 15, EvasionBonus = 10, CritBonus = 10,
                  CritDamageBonus = 0.50, ShieldRegenBonus = 15, MoraleBonus = 50 },
        };
    }

    // =========================================================================
    // VETERANCY ABILITIES
    // =========================================================================

    public class VeterancyAbility
    {
        public VeterancyAbilityType Type;
        public string Name;
        public string Description;
        public VeterancyRank RequiredRank;
        public List<UnitClass> EligibleClasses;
        public Dictionary<string, double> Params;
    }

    public static class VeterancyAbilities
    {
        public static readonly List<VeterancyAbility> All = new()
        {
            new VeterancyAbility {
                Type = VeterancyAbilityType.SteadyAim, Name = "Steady Aim",
                Description = "+20% accuracy on first shot each round",
                RequiredRank = VeterancyRank.Trained,
                EligibleClasses = new() { UnitClass.Fighter, UnitClass.Corvette, UnitClass.Frigate,
                    UnitClass.Cruiser, UnitClass.Battlecruiser, UnitClass.Battleship, UnitClass.Dreadnought },
                Params = new() { ["accuracyBonus"] = 20 },
            },
            new VeterancyAbility {
                Type = VeterancyAbilityType.BattleHardened, Name = "Battle Hardened",
                Description = "First hit each round deals 25% less damage",
                RequiredRank = VeterancyRank.Veteran,
                EligibleClasses = new() { UnitClass.Frigate, UnitClass.Cruiser, UnitClass.Battlecruiser,
                    UnitClass.Battleship, UnitClass.Dreadnought, UnitClass.Carrier },
                Params = new() { ["damageReduction"] = 25 },
            },
            new VeterancyAbility {
                Type = VeterancyAbilityType.AdrenalineSurge, Name = "Adrenaline Surge",
                Description = "+30% damage when below 30% hull",
                RequiredRank = VeterancyRank.Veteran,
                EligibleClasses = new() { UnitClass.Fighter, UnitClass.Corvette, UnitClass.Frigate,
                    UnitClass.Cruiser, UnitClass.Battlecruiser },
                Params = new() { ["damageBonus"] = 30, ["hullThreshold"] = 30 },
            },
            new VeterancyAbility {
                Type = VeterancyAbilityType.KillStreak, Name = "Kill Streak",
                Description = "+10% damage per kill this battle (max 50%)",
                RequiredRank = VeterancyRank.Elite,
                EligibleClasses = new() { UnitClass.Fighter, UnitClass.Corvette, UnitClass.Cruiser,
                    UnitClass.Battlecruiser, UnitClass.Battleship, UnitClass.Dreadnought },
                Params = new() { ["damagePerKill"] = 10, ["maxBonus"] = 50 },
            },
            new VeterancyAbility {
                Type = VeterancyAbilityType.Leadership, Name = "Leadership",
                Description = "Nearby allies gain +5% accuracy and evasion",
                RequiredRank = VeterancyRank.Elite,
                EligibleClasses = new() { UnitClass.Battleship, UnitClass.Dreadnought, UnitClass.Carrier },
                Params = new() { ["accuracyBonus"] = 5, ["evasionBonus"] = 5, ["range"] = 3 },
            },
            new VeterancyAbility {
                Type = VeterancyAbilityType.LastStand, Name = "Last Stand",
                Description = "Cannot be destroyed by a single hit",
                RequiredRank = VeterancyRank.Legendary,
                EligibleClasses = new() { UnitClass.Battleship, UnitClass.Dreadnought, UnitClass.Carrier },
                Params = new(),
            },
            new VeterancyAbility {
                Type = VeterancyAbilityType.TacticalGenius, Name = "Tactical Genius",
                Description = "Critical hits deal 100% bonus damage instead of 50%",
                RequiredRank = VeterancyRank.Legendary,
                EligibleClasses = new() { UnitClass.Cruiser, UnitClass.Battlecruiser,
                    UnitClass.Battleship, UnitClass.Dreadnought },
                Params = new() { ["critMultiplierBonus"] = 0.5 },
            },
            new VeterancyAbility {
                Type = VeterancyAbilityType.IronWill, Name = "Iron Will",
                Description = "Immune to morale effects, status effects 50% shorter",
                RequiredRank = VeterancyRank.Legendary,
                EligibleClasses = new() { UnitClass.Frigate, UnitClass.Cruiser, UnitClass.Battlecruiser,
                    UnitClass.Battleship, UnitClass.Dreadnought, UnitClass.Carrier },
                Params = new() { ["statusDurationReduction"] = 50 },
            },
        };
    }

    // =========================================================================
    // UNIT EXPERIENCE
    // =========================================================================

    public class CombatStatistics
    {
        public int TotalKills;
        public double TotalDamageDealt;
        public double TotalDamageTaken;
        public int CriticalHits;
        public int BoardingAttempts;
        public int BoardingSuccesses;
        public int BoardingsDefended;
        public int TotalBattleSurvived;
    }

    public class UnitExperience
    {
        public double TotalXP;
        public VeterancyRank Rank = VeterancyRank.Recruit;
        public double ProgressToNextRank;
        public List<VeterancyAbilityType> UnlockedAbilities = new();
        public VeterancyAbilityType? ActiveAbility;
        public CombatStatistics Stats = new();
        public int CurrentKillStreak;
        public int HighestKillStreak;
        public int BattlesParticipated;
        public int BattlesWon;
    }

    // =========================================================================
    // EXPERIENCE FUNCTIONS
    // =========================================================================

    public struct AwardResult
    {
        public double XPGained;
        public bool RankUp;
        public VeterancyRank? NewRank;
    }

    public static class VeterancyFunctions
    {
        public static VeterancyRank GetRankFromXP(double xp)
        {
            for (int i = VeterancyConfig.RankOrder.Length - 1; i >= 0; i--)
            {
                if (xp >= VeterancyConfig.RankThresholds[VeterancyConfig.RankOrder[i]])
                    return VeterancyConfig.RankOrder[i];
            }
            return VeterancyRank.Recruit;
        }

        public static int? GetXPForNextRank(VeterancyRank rank)
        {
            int idx = Array.IndexOf(VeterancyConfig.RankOrder, rank);
            if (idx >= VeterancyConfig.RankOrder.Length - 1) return null;
            return VeterancyConfig.RankThresholds[VeterancyConfig.RankOrder[idx + 1]];
        }

        public static double CalcProgress(double xp)
        {
            var rank = GetRankFromXP(xp);
            var next = GetXPForNextRank(rank);
            if (next == null) return 100;
            int cur = VeterancyConfig.RankThresholds[rank];
            return Math.Min(100, (xp - cur) / (next.Value - cur) * 100);
        }

        public static AwardResult AwardExperience(
            UnitExperience exp, ExperienceAction action, double amount = 1)
        {
            double baseXP = VeterancyConfig.ExperienceGains[action];
            double gained = 0;

            switch (action)
            {
                case ExperienceAction.DamageDealt:
                    gained = Math.Floor(amount / 100 * baseXP);
                    exp.Stats.TotalDamageDealt += amount;
                    break;
                case ExperienceAction.DamageTaken:
                    gained = Math.Floor(amount / 100 * baseXP);
                    exp.Stats.TotalDamageTaken += amount;
                    break;
                case ExperienceAction.Kill:
                    gained = baseXP * amount;
                    exp.Stats.TotalKills += (int)amount;
                    exp.CurrentKillStreak += (int)amount;
                    if (exp.CurrentKillStreak > exp.HighestKillStreak)
                        exp.HighestKillStreak = exp.CurrentKillStreak;
                    break;
                case ExperienceAction.CriticalHit:
                    gained = baseXP * amount;
                    exp.Stats.CriticalHits += (int)amount;
                    break;
                case ExperienceAction.BoardingSuccess:
                    gained = baseXP * amount;
                    exp.Stats.BoardingAttempts += (int)amount;
                    exp.Stats.BoardingSuccesses += (int)amount;
                    break;
                case ExperienceAction.BoardingDefense:
                    gained = baseXP * amount;
                    exp.Stats.BoardingsDefended += (int)amount;
                    break;
                case ExperienceAction.SurviveBattle:
                    gained = baseXP;
                    exp.Stats.TotalBattleSurvived++;
                    exp.BattlesParticipated++;
                    break;
                case ExperienceAction.WinBattle:
                    gained = baseXP;
                    exp.BattlesWon++;
                    break;
                case ExperienceAction.LoseBattle:
                    gained = baseXP;
                    break;
            }

            var oldRank = exp.Rank;
            exp.TotalXP += gained;
            exp.Rank = GetRankFromXP(exp.TotalXP);
            exp.ProgressToNextRank = CalcProgress(exp.TotalXP);

            bool rankUp = exp.Rank != oldRank;
            return new AwardResult
            {
                XPGained = gained, RankUp = rankUp,
                NewRank = rankUp ? exp.Rank : null,
            };
        }

        public static void ResetKillStreak(UnitExperience exp) => exp.CurrentKillStreak = 0;

        public static List<VeterancyAbility> GetAvailableAbilities(
            UnitClass unitClass, VeterancyRank rank)
        {
            int rankIdx = Array.IndexOf(VeterancyConfig.RankOrder, rank);
            return VeterancyAbilities.All
                .Where(a => Array.IndexOf(VeterancyConfig.RankOrder, a.RequiredRank) <= rankIdx
                         && a.EligibleClasses.Contains(unitClass))
                .ToList();
        }

        public static List<VeterancyAbilityType> UpdateUnlockedAbilities(
            UnitExperience exp, UnitClass unitClass)
        {
            var available = GetAvailableAbilities(unitClass, exp.Rank);
            var newAbilities = new List<VeterancyAbilityType>();
            foreach (var a in available)
            {
                if (!exp.UnlockedAbilities.Contains(a.Type))
                {
                    exp.UnlockedAbilities.Add(a.Type);
                    newAbilities.Add(a.Type);
                }
            }
            return newAbilities;
        }

        public static bool SetActiveAbility(UnitExperience exp, VeterancyAbilityType? type)
        {
            if (type == null) { exp.ActiveAbility = null; return true; }
            if (!exp.UnlockedAbilities.Contains(type.Value)) return false;
            exp.ActiveAbility = type;
            return true;
        }

        public static void ApplyVeterancyToUnit(AdvancedCombatUnit unit, UnitExperience exp)
        {
            var b = RankBonusData.Bonuses[exp.Rank];
            unit.Damage = new DamageTypes
            {
                Ballistic = (int)(unit.Damage.Ballistic * b.DamageMultiplier),
                Ionic = (int)(unit.Damage.Ionic * b.DamageMultiplier),
                Explosive = (int)(unit.Damage.Explosive * b.DamageMultiplier),
                Hacking = unit.Damage.Hacking,
                Boarding = unit.Damage.Boarding,
            };
            unit.Defense.Shield.Max = (int)(unit.Defense.Shield.Max * b.DefenseMultiplier);
            unit.Defense.Shield.Current = (int)(unit.Defense.Shield.Current * b.DefenseMultiplier);
            unit.Defense.Armor.Max = (int)(unit.Defense.Armor.Max * b.DefenseMultiplier);
            unit.Defense.Armor.Current = (int)(unit.Defense.Armor.Current * b.DefenseMultiplier);
            unit.Stats.Accuracy += b.AccuracyBonus;
            unit.Stats.Evasion += b.EvasionBonus;
            unit.Stats.CritChance += b.CritBonus;
            unit.Stats.CritMultiplier += b.CritDamageBonus;
            unit.Defense.Shield.RegenRate += (int)b.ShieldRegenBonus;
        }

        public static (bool Triggers, double? Bonus) CheckAbilityTrigger(
            VeterancyAbility ability, UnitExperience exp, AdvancedCombatUnit unit,
            bool isFirstShot = false, bool isFirstHit = false,
            double? hullPercent = null, int killsThisBattle = 0)
        {
            switch (ability.Type)
            {
                case VeterancyAbilityType.SteadyAim:
                    return isFirstShot ? (true, ability.Params["accuracyBonus"]) : (false, null);
                case VeterancyAbilityType.BattleHardened:
                    return isFirstHit ? (true, ability.Params["damageReduction"]) : (false, null);
                case VeterancyAbilityType.AdrenalineSurge:
                    if (hullPercent.HasValue && hullPercent.Value <= ability.Params["hullThreshold"])
                        return (true, ability.Params["damageBonus"]);
                    return (false, null);
                case VeterancyAbilityType.KillStreak:
                    if (killsThisBattle > 0)
                    {
                        double bonus = Math.Min(killsThisBattle * ability.Params["damagePerKill"],
                                                ability.Params["maxBonus"]);
                        return (true, bonus);
                    }
                    return (false, null);
                case VeterancyAbilityType.LastStand:
                    return (true, null);
                case VeterancyAbilityType.TacticalGenius:
                    return (true, ability.Params["critMultiplierBonus"]);
                case VeterancyAbilityType.IronWill:
                    return (true, ability.Params["statusDurationReduction"]);
                default:
                    return (false, null);
            }
        }

        public static VeterancyAbility GetAbility(VeterancyAbilityType type)
            => VeterancyAbilities.All.FirstOrDefault(a => a.Type == type);

        public static UnitExperience CreateUnitExperience(double initialXP = 0)
            => new UnitExperience
            {
                TotalXP = initialXP,
                Rank = GetRankFromXP(initialXP),
                ProgressToNextRank = CalcProgress(initialXP),
            };

        public static int CompareRanks(VeterancyRank a, VeterancyRank b)
            => Array.IndexOf(VeterancyConfig.RankOrder, a) -
               Array.IndexOf(VeterancyConfig.RankOrder, b);

        public static bool IsAtLeastRank(VeterancyRank current, VeterancyRank required)
            => CompareRanks(current, required) >= 0;

        public static (string Name, string Color, string Icon) GetRankDisplay(VeterancyRank rank)
            => rank switch
            {
                VeterancyRank.Recruit => ("Recruit", "#808080", "⚪"),
                VeterancyRank.Trained => ("Trained", "#4CAF50", "🟢"),
                VeterancyRank.Veteran => ("Veteran", "#2196F3", "🔵"),
                VeterancyRank.Elite => ("Elite", "#9C27B0", "🟣"),
                VeterancyRank.Legendary => ("Legendary", "#FFD700", "⭐"),
                _ => ("Unknown", "#808080", "?"),
            };

        public static (double TotalXP, VeterancyRank AverageRank, VeterancyRank HighestRank,
            Dictionary<VeterancyRank, int> Distribution)
            CalculateFleetExperience(List<UnitExperience> units)
        {
            if (units.Count == 0)
                return (0, VeterancyRank.Recruit, VeterancyRank.Recruit,
                    VeterancyConfig.RankOrder.ToDictionary(r => r, _ => 0));

            double total = 0; int totalIdx = 0; int highIdx = 0;
            var dist = VeterancyConfig.RankOrder.ToDictionary(r => r, _ => 0);

            foreach (var u in units)
            {
                total += u.TotalXP;
                int idx = Array.IndexOf(VeterancyConfig.RankOrder, u.Rank);
                totalIdx += idx;
                if (idx > highIdx) highIdx = idx;
                dist[u.Rank]++;
            }

            int avgIdx = totalIdx / units.Count;
            return (total, VeterancyConfig.RankOrder[avgIdx],
                    VeterancyConfig.RankOrder[highIdx], dist);
        }
    }
}
