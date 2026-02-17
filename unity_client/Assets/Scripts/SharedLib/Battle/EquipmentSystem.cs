// =============================================================================
// EquipmentSystem.cs — Ported from equipment-system.ts
// Ship equipment: slots, abilities, triggers, stat modifiers, functions
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Battle
{
    // =========================================================================
    // ENUMS
    // =========================================================================

    public enum EquipmentSlot
    {
        Weapon, Secondary, Shield, Armor, Engine, Computer, Special, Consumable
    }

    public enum EquipmentRarity
    {
        Common, Uncommon, Rare, Epic, Legendary
    }

    public enum ActivationType
    {
        Passive, Active, Triggered, Consumable
    }

    public enum AbilityEffectType
    {
        Damage, Buff, Debuff, Repair, Special
    }

    public enum TriggerType
    {
        OnHit, OnDamage, OnKill, OnCritical, OnShieldBreak,
        OnLowHull, OnRoundStart, OnRoundEnd, OnBoarding
    }

    // =========================================================================
    // STAT MODIFIERS
    // =========================================================================

    public class EquipmentStatModifiers
    {
        public double DamageMultiplier = 1;
        public double ShieldMultiplier = 1;
        public double ArmorMultiplier = 1;
        public double HullMultiplier = 1;
        public double SpeedMultiplier = 1;
        public double AccuracyBonus;
        public double EvasionBonus;
        public double CritChanceBonus;
        public double CritDamageBonus;
        public double PointDefenseBonus;
        public double ShieldRegenBonus;
        public DamageTypes DamageTypeBonuses;
        public ResistanceTypes ResistanceBonuses;
        public int CrewCapacityBonus;
        public double CrewCombatBonus;
        public double BoardingPowerBonus;
        public double AntiBoardingBonus;
    }

    // =========================================================================
    // ABILITY EFFECTS
    // =========================================================================

    public class AbilityEffect
    {
        public AbilityEffectType Type;
        public DamageTypes Damage;
        public int TargetCount;
        public bool AreaEffect;
        public double Penetration;
        public string Target;
        public EquipmentStatModifiers Modifiers;
        public int Duration;
        public StatusEffectType StatusEffect;
        public double Strength;
        public double RepairAmount;
        public string RepairType;
        public string EffectId;
        public Dictionary<string, object> Params;
    }

    public class EquipmentAbility
    {
        public string Id;
        public string Name;
        public string Description;
        public int Cooldown;
        public int CurrentCooldown;
        public int EnergyCost;
        public int Duration;
        public AbilityEffect Effect;
    }

    public class TriggerCondition
    {
        public TriggerType Trigger;
        public double? Threshold;
        public double Chance;
    }

    public class EquipmentTrigger
    {
        public TriggerCondition Condition;
        public AbilityEffect Effect;
    }

    public class EquipmentRequirements
    {
        public int WeaponsTech;
        public int ShieldTech;
        public int ArmorTech;
        public int ComputerTech;
        public int EngineTech;
        public int MinShipLevel;
        public List<string> RequiredEquipment;
        public List<string> IncompatibleEquipment;
    }

    // =========================================================================
    // EQUIPMENT
    // =========================================================================

    public class Equipment
    {
        public string Id;
        public string Name;
        public string Description;
        public EquipmentSlot Slot;
        public EquipmentRarity Rarity;
        public ActivationType ActivationType;
        public List<UnitClass> CompatibleClasses = new List<UnitClass>();
        public EquipmentStatModifiers StatModifiers = new EquipmentStatModifiers();
        public List<EquipmentAbility> Abilities = new List<EquipmentAbility>();
        public List<EquipmentTrigger> Triggers = new List<EquipmentTrigger>();
        public EquipmentRequirements Requirements = new EquipmentRequirements();
        public UnitCost InstallCost;
        public int PowerConsumption;
        public int Mass;
        public int? UsesRemaining;
    }

    public class InstalledEquipment
    {
        public Equipment Equipment;
        public EquipmentSlot Slot;
        public int SlotIndex;
        public bool Active = true;
    }

    public class EquippedUnit
    {
        public AdvancedCombatUnit Unit;
        public List<InstalledEquipment> Equipment = new List<InstalledEquipment>();
        public int TotalPowerConsumption;
        public int MaxPower;
        public Dictionary<EquipmentSlot, int> SlotConfig = new Dictionary<EquipmentSlot, int>();
    }

    // =========================================================================
    // SLOT CONFIG BY CLASS
    // =========================================================================

    public static class EquipmentSlotConfigs
    {
        public static Dictionary<EquipmentSlot, int> GetSlotConfig(UnitClass c)
        {
            return c switch
            {
                UnitClass.Fighter => S(1,0,1,1,1,0,0,1),
                UnitClass.Corvette => S(1,1,1,1,1,1,0,1),
                UnitClass.Frigate => S(2,1,1,1,1,1,1,2),
                UnitClass.Cruiser => S(2,2,2,2,1,1,1,2),
                UnitClass.Battlecruiser => S(3,2,2,2,1,2,1,2),
                UnitClass.Battleship => S(4,2,2,3,1,2,2,3),
                UnitClass.Dreadnought => S(5,3,3,3,1,2,3,3),
                UnitClass.Carrier => S(2,2,2,2,1,2,4,2),
                UnitClass.Transport => S(0,1,2,2,2,1,1,2),
                UnitClass.Platform => S(2,1,2,2,0,1,1,1),
                UnitClass.Turret => S(1,0,1,1,0,1,0,0),
                UnitClass.Defense => S(2,1,2,3,0,1,1,0),
                UnitClass.Missile => S(3,0,1,1,0,2,1,0),
                _ => S(0,1,1,1,2,2,1,0),
            };
        }

        private static Dictionary<EquipmentSlot, int> S(
            int w, int s2, int sh, int ar, int en, int co, int sp, int cn)
            => new Dictionary<EquipmentSlot, int>
            {
                [EquipmentSlot.Weapon]=w, [EquipmentSlot.Secondary]=s2,
                [EquipmentSlot.Shield]=sh, [EquipmentSlot.Armor]=ar,
                [EquipmentSlot.Engine]=en, [EquipmentSlot.Computer]=co,
                [EquipmentSlot.Special]=sp, [EquipmentSlot.Consumable]=cn,
            };
    }

    // =========================================================================
    // EQUIPMENT FUNCTIONS
    // =========================================================================

    public static class EquipmentFunctions
    {
        private static int _counter;

        public static (bool Ok, string Reason) CanInstall(
            Equipment eq, AdvancedCombatUnit unit,
            List<InstalledEquipment> current, Dictionary<EquipmentSlot, int> slots)
        {
            if (!eq.CompatibleClasses.Contains(unit.UnitClass))
                return (false, $"Not compatible with {unit.UnitClass}");
            int used = current.Count(e => e.Slot == eq.Slot);
            if (used >= slots.GetValueOrDefault(eq.Slot, 0))
                return (false, $"No {eq.Slot} slots available");
            if (eq.Requirements?.IncompatibleEquipment != null)
                foreach (var id in eq.Requirements.IncompatibleEquipment)
                    if (current.Any(e => e.Equipment.Id.StartsWith(id)))
                        return (false, $"Incompatible with {id}");
            if (eq.Requirements?.RequiredEquipment != null)
                foreach (var id in eq.Requirements.RequiredEquipment)
                    if (!current.Any(e => e.Equipment.Id.StartsWith(id)))
                        return (false, $"Requires {id}");
            return (true, null);
        }

        public static bool Install(EquippedUnit eu, Equipment eq)
        {
            var (ok, _) = CanInstall(eq, eu.Unit, eu.Equipment, eu.SlotConfig);
            if (!ok) return false;
            int idx = eu.Equipment.Count(e => e.Slot == eq.Slot);
            eu.Equipment.Add(new InstalledEquipment
                { Equipment = eq, Slot = eq.Slot, SlotIndex = idx, Active = true });
            eu.TotalPowerConsumption += eq.PowerConsumption;
            return true;
        }

        public static Equipment Uninstall(EquippedUnit eu, string equipmentId)
        {
            int i = eu.Equipment.FindIndex(e => e.Equipment.Id == equipmentId);
            if (i < 0) return null;
            var r = eu.Equipment[i];
            eu.Equipment.RemoveAt(i);
            eu.TotalPowerConsumption -= r.Equipment.PowerConsumption;
            return r.Equipment;
        }

        public static EquipmentStatModifiers CalculateModifiers(List<InstalledEquipment> equip)
        {
            var t = new EquipmentStatModifiers();
            foreach (var inst in equip)
            {
                if (!inst.Active) continue;
                var m = inst.Equipment.StatModifiers;
                t.DamageMultiplier *= m.DamageMultiplier;
                t.ShieldMultiplier *= m.ShieldMultiplier;
                t.ArmorMultiplier *= m.ArmorMultiplier;
                t.HullMultiplier *= m.HullMultiplier;
                t.SpeedMultiplier *= m.SpeedMultiplier;
                t.AccuracyBonus += m.AccuracyBonus;
                t.EvasionBonus += m.EvasionBonus;
                t.CritChanceBonus += m.CritChanceBonus;
                t.CritDamageBonus += m.CritDamageBonus;
                t.PointDefenseBonus += m.PointDefenseBonus;
                t.ShieldRegenBonus += m.ShieldRegenBonus;
                t.CrewCapacityBonus += m.CrewCapacityBonus;
                t.CrewCombatBonus += m.CrewCombatBonus;
                t.BoardingPowerBonus += m.BoardingPowerBonus;
                t.AntiBoardingBonus += m.AntiBoardingBonus;
                t.DamageTypeBonuses = t.DamageTypeBonuses + m.DamageTypeBonuses;
            }
            return t;
        }

        public static void ApplyToUnit(AdvancedCombatUnit u, List<InstalledEquipment> equip)
        {
            var m = CalculateModifiers(equip);
            u.Defense.Shield.Max = (int)(u.Defense.Shield.Max * m.ShieldMultiplier);
            u.Defense.Shield.Current = (int)(u.Defense.Shield.Current * m.ShieldMultiplier);
            u.Defense.Armor.Max = (int)(u.Defense.Armor.Max * m.ArmorMultiplier);
            u.Defense.Armor.Current = (int)(u.Defense.Armor.Current * m.ArmorMultiplier);
            u.Defense.Hull.Max = (int)(u.Defense.Hull.Max * m.HullMultiplier);
            u.Defense.Hull.Current = (int)(u.Defense.Hull.Current * m.HullMultiplier);
            u.Damage = new DamageTypes
            {
                Ballistic = (int)(u.Damage.Ballistic * m.DamageMultiplier) + (int)m.DamageTypeBonuses.Ballistic,
                Ionic = (int)(u.Damage.Ionic * m.DamageMultiplier) + (int)m.DamageTypeBonuses.Ionic,
                Explosive = (int)(u.Damage.Explosive * m.DamageMultiplier) + (int)m.DamageTypeBonuses.Explosive,
                Hacking = u.Damage.Hacking + (int)m.DamageTypeBonuses.Hacking,
                Boarding = u.Damage.Boarding + (int)(m.BoardingPowerBonus + m.DamageTypeBonuses.Boarding),
            };
            u.Stats.Accuracy += m.AccuracyBonus;
            u.Stats.Evasion += m.EvasionBonus;
            u.Stats.CritChance += m.CritChanceBonus;
            u.Stats.CritMultiplier += m.CritDamageBonus;
            u.Stats.PointDefense += m.PointDefenseBonus;
            u.Defense.Shield.RegenRate += (int)m.ShieldRegenBonus;
            u.Crew.Max += m.CrewCapacityBonus;
            u.Crew.CombatStrength += m.CrewCombatBonus;
            u.Resistances.AntiBoarding += m.AntiBoardingBonus;
        }

        public static List<AbilityEffect> ProcessTriggers(
            List<InstalledEquipment> equip, TriggerType trigger,
            AdvancedCombatUnit unit, Random rng = null)
        {
            rng ??= new Random();
            var fx = new List<AbilityEffect>();
            foreach (var inst in equip)
            {
                if (!inst.Active) continue;
                foreach (var tr in inst.Equipment.Triggers)
                {
                    if (tr.Condition.Trigger != trigger) continue;
                    if (tr.Condition.Threshold.HasValue && trigger == TriggerType.OnLowHull)
                    {
                        double hp = (double)unit.Defense.Hull.Current / unit.Defense.Hull.Max * 100;
                        if (hp >= tr.Condition.Threshold.Value) continue;
                    }
                    if (rng.NextDouble() * 100 > tr.Condition.Chance) continue;
                    fx.Add(tr.Effect);
                }
            }
            return fx;
        }

        public static AbilityEffect UseAbility(Equipment eq, string abilityId)
        {
            var ab = eq.Abilities.FirstOrDefault(a => a.Id == abilityId);
            if (ab == null || ab.CurrentCooldown > 0) return null;
            ab.CurrentCooldown = ab.Cooldown;
            if (eq.ActivationType == ActivationType.Consumable && eq.UsesRemaining.HasValue)
                eq.UsesRemaining--;
            return ab.Effect;
        }

        public static void TickCooldowns(List<InstalledEquipment> equip)
        {
            foreach (var inst in equip)
                foreach (var ab in inst.Equipment.Abilities)
                    if (ab.CurrentCooldown > 0) ab.CurrentCooldown--;
        }

        public static EquippedUnit CreateEquippedUnit(AdvancedCombatUnit unit, int maxPower = 100)
            => new EquippedUnit
            {
                Unit = unit, MaxPower = maxPower,
                SlotConfig = EquipmentSlotConfigs.GetSlotConfig(unit.UnitClass),
            };
    }
}
