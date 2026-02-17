// =============================================================================
// EquipmentTemplates.cs — Ported from equipment-templates.ts
// Predefined equipment data for weapons, shields, armor, engines, etc.
// =============================================================================

using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Battle
{
    public static class EquipmentTemplates
    {
        private static readonly Dictionary<string, Equipment> _t;

        static EquipmentTemplates()
        {
            _t = new Dictionary<string, Equipment>();

            // --- WEAPONS ---
            Add("gauss_cannon", "Gauss Cannon", "Electromagnetic railgun with high armor penetration.",
                EquipmentSlot.Weapon, EquipmentRarity.Common, ActivationType.Passive,
                new[] { UnitClass.Frigate, UnitClass.Cruiser, UnitClass.Battlecruiser, UnitClass.Battleship, UnitClass.Dreadnought },
                new EquipmentStatModifiers { DamageTypeBonuses = new DamageTypes { Ballistic = 50 }, AccuracyBonus = 5 },
                5000, 2000, 500, 10, 100);

            Add("ion_disruptor", "Ion Disruptor", "Disrupts enemy shields and systems.",
                EquipmentSlot.Weapon, EquipmentRarity.Uncommon, ActivationType.Passive,
                new[] { UnitClass.Cruiser, UnitClass.Battlecruiser, UnitClass.Battleship, UnitClass.Dreadnought },
                new EquipmentStatModifiers { DamageTypeBonuses = new DamageTypes { Ionic = 80 } },
                8000, 6000, 1000, 15, 80, weaponsTech: 8,
                triggers: new[] { MkTrigger(TriggerType.OnHit, 20, AbilityEffectType.Debuff, StatusEffectType.ShieldDisruption, 2, 50) });

            Add("plasma_lance", "Plasma Lance", "High-energy plasma with devastating crits.",
                EquipmentSlot.Weapon, EquipmentRarity.Rare, ActivationType.Passive,
                new[] { UnitClass.Battleship, UnitClass.Dreadnought },
                new EquipmentStatModifiers { DamageTypeBonuses = new DamageTypes { Explosive = 100, Ballistic = 50 }, CritChanceBonus = 10, CritDamageBonus = 0.5 },
                15000, 10000, 3000, 25, 150, weaponsTech: 12);

            // --- SECONDARY ---
            Add("torpedo_launcher", "Torpedo Launcher", "Guided torpedoes with explosive damage.",
                EquipmentSlot.Secondary, EquipmentRarity.Common, ActivationType.Passive,
                new[] { UnitClass.Corvette, UnitClass.Frigate, UnitClass.Cruiser, UnitClass.Battlecruiser, UnitClass.Battleship, UnitClass.Dreadnought },
                new EquipmentStatModifiers { DamageTypeBonuses = new DamageTypes { Explosive = 75 } },
                4000, 2000, 1000, 8, 60);

            // --- SHIELDS ---
            Add("reinforced_shields", "Reinforced Shield Generator", "Enhanced shield capacity.",
                EquipmentSlot.Shield, EquipmentRarity.Common, ActivationType.Passive,
                new[] { UnitClass.Fighter, UnitClass.Corvette, UnitClass.Frigate, UnitClass.Cruiser, UnitClass.Battlecruiser, UnitClass.Battleship, UnitClass.Dreadnought, UnitClass.Carrier, UnitClass.Transport, UnitClass.Utility },
                new EquipmentStatModifiers { ShieldMultiplier = 1.2, ShieldRegenBonus = 5 },
                3000, 4000, 500, 10, 50);

            Add("adaptive_shields", "Adaptive Shield Matrix", "Shields that adapt to incoming damage.",
                EquipmentSlot.Shield, EquipmentRarity.Rare, ActivationType.Passive,
                new[] { UnitClass.Cruiser, UnitClass.Battlecruiser, UnitClass.Battleship, UnitClass.Dreadnought, UnitClass.Carrier },
                new EquipmentStatModifiers { ShieldMultiplier = 1.15, ResistanceBonuses = new ResistanceTypes { BallisticResistance = 10, IonicResistance = 10, ExplosiveResistance = 10 } },
                10000, 15000, 2000, 20, 80, shieldTech: 10);

            // --- ARMOR ---
            Add("reactive_armor", "Reactive Armor Plating", "Deflects incoming projectiles.",
                EquipmentSlot.Armor, EquipmentRarity.Uncommon, ActivationType.Passive,
                new[] { UnitClass.Frigate, UnitClass.Cruiser, UnitClass.Battlecruiser, UnitClass.Battleship, UnitClass.Dreadnought, UnitClass.Carrier, UnitClass.Transport },
                new EquipmentStatModifiers { ArmorMultiplier = 1.25, ResistanceBonuses = new ResistanceTypes { BallisticResistance = 15, ExplosiveResistance = 10 } },
                8000, 3000, 500, 5, 150, armorTech: 8);

            Add("nanobot_hull", "Nanobot Hull Repair", "Self-repairing hull nanobots.",
                EquipmentSlot.Armor, EquipmentRarity.Rare, ActivationType.Triggered,
                new[] { UnitClass.Cruiser, UnitClass.Battlecruiser, UnitClass.Battleship, UnitClass.Dreadnought, UnitClass.Carrier },
                new EquipmentStatModifiers { HullMultiplier = 1.1 },
                12000, 8000, 3000, 12, 40, armorTech: 12,
                triggers: new[] { MkTrigger(TriggerType.OnRoundEnd, 100, AbilityEffectType.Repair, repairAmt: 5, repairType: "hull") });

            // --- ENGINE ---
            Add("afterburner", "Combat Afterburner", "Emergency speed boost.",
                EquipmentSlot.Engine, EquipmentRarity.Common, ActivationType.Active,
                new[] { UnitClass.Fighter, UnitClass.Corvette, UnitClass.Frigate, UnitClass.Cruiser, UnitClass.Battlecruiser },
                new EquipmentStatModifiers { SpeedMultiplier = 1.1, EvasionBonus = 5 },
                3000, 2000, 2000, 8, 30);

            // --- COMPUTER ---
            Add("targeting_computer", "Advanced Targeting Computer", "Improved accuracy and crits.",
                EquipmentSlot.Computer, EquipmentRarity.Common, ActivationType.Passive,
                new[] { UnitClass.Corvette, UnitClass.Frigate, UnitClass.Cruiser, UnitClass.Battlecruiser, UnitClass.Battleship, UnitClass.Dreadnought, UnitClass.Carrier },
                new EquipmentStatModifiers { AccuracyBonus = 10, CritChanceBonus = 5 },
                2000, 5000, 500, 8, 20);

            Add("ecm_suite", "ECM Suite", "Electronic countermeasures.",
                EquipmentSlot.Computer, EquipmentRarity.Uncommon, ActivationType.Passive,
                new[] { UnitClass.Frigate, UnitClass.Cruiser, UnitClass.Battlecruiser, UnitClass.Battleship, UnitClass.Dreadnought, UnitClass.Carrier, UnitClass.Utility },
                new EquipmentStatModifiers { EvasionBonus = 15, ResistanceBonuses = new ResistanceTypes { HackDefense = 20 } },
                5000, 8000, 1000, 12, 25, computerTech: 8);

            Add("fire_control", "Integrated Fire Control", "Maximum weapon efficiency.",
                EquipmentSlot.Computer, EquipmentRarity.Rare, ActivationType.Passive,
                new[] { UnitClass.Battleship, UnitClass.Dreadnought },
                new EquipmentStatModifiers { DamageMultiplier = 1.15, AccuracyBonus = 15, CritDamageBonus = 0.25 },
                12000, 18000, 3000, 20, 40, computerTech: 14);

            // --- SPECIAL ---
            Add("boarding_bay", "Assault Boarding Bay", "Launch boarding parties.",
                EquipmentSlot.Special, EquipmentRarity.Uncommon, ActivationType.Passive,
                new[] { UnitClass.Cruiser, UnitClass.Battlecruiser, UnitClass.Battleship, UnitClass.Dreadnought, UnitClass.Carrier },
                new EquipmentStatModifiers { BoardingPowerBonus = 50, CrewCapacityBonus = 20 },
                10000, 5000, 2000, 15, 200);

            Add("point_defense_array", "Point Defense Array", "Anti-missile/fighter defense.",
                EquipmentSlot.Special, EquipmentRarity.Common, ActivationType.Passive,
                new[] { UnitClass.Frigate, UnitClass.Cruiser, UnitClass.Battlecruiser, UnitClass.Battleship, UnitClass.Dreadnought, UnitClass.Carrier },
                new EquipmentStatModifiers { PointDefenseBonus = 30 },
                4000, 3000, 500, 10, 50);

            Add("command_bridge", "Enhanced Command Bridge", "Fleet coordination bonuses.",
                EquipmentSlot.Special, EquipmentRarity.Rare, ActivationType.Passive,
                new[] { UnitClass.Battleship, UnitClass.Dreadnought, UnitClass.Carrier },
                new EquipmentStatModifiers { AccuracyBonus = 5, CrewCombatBonus = 20 },
                15000, 20000, 5000, 25, 100, computerTech: 10);

            // --- CONSUMABLES ---
            Add("repair_nanites", "Emergency Repair Nanites", "One-time 30% repair.",
                EquipmentSlot.Consumable, EquipmentRarity.Common, ActivationType.Consumable,
                new[] { UnitClass.Fighter, UnitClass.Corvette, UnitClass.Frigate, UnitClass.Cruiser, UnitClass.Battlecruiser, UnitClass.Battleship, UnitClass.Dreadnought, UnitClass.Carrier, UnitClass.Transport, UnitClass.Utility },
                new EquipmentStatModifiers(),
                1000, 2000, 500, 0, 5, uses: 1);

            Add("overcharge_cell", "Weapon Overcharge Cell", "One-time double damage.",
                EquipmentSlot.Consumable, EquipmentRarity.Uncommon, ActivationType.Consumable,
                new[] { UnitClass.Fighter, UnitClass.Corvette, UnitClass.Frigate, UnitClass.Cruiser, UnitClass.Battlecruiser, UnitClass.Battleship, UnitClass.Dreadnought },
                new EquipmentStatModifiers(),
                2000, 3000, 1000, 0, 10, uses: 1);
        }

        // --- Accessors ---
        public static Equipment Get(string id) => _t.GetValueOrDefault(id);
        public static IReadOnlyDictionary<string, Equipment> All => _t;
        public static Dictionary<string, Equipment> BySlot(EquipmentSlot s) =>
            _t.Where(kv => kv.Value.Slot == s).ToDictionary(kv => kv.Key, kv => kv.Value);
        public static Dictionary<string, Equipment> ByRarity(EquipmentRarity r) =>
            _t.Where(kv => kv.Value.Rarity == r).ToDictionary(kv => kv.Key, kv => kv.Value);
        public static Dictionary<string, Equipment> ForClass(UnitClass c) =>
            _t.Where(kv => kv.Value.CompatibleClasses.Contains(c)).ToDictionary(kv => kv.Key, kv => kv.Value);

        // --- Helpers ---
        private static void Add(string id, string name, string desc,
            EquipmentSlot slot, EquipmentRarity rarity, ActivationType act,
            UnitClass[] classes, EquipmentStatModifiers mods,
            int costM, int costC, int costD, int power, int mass,
            int weaponsTech = 0, int shieldTech = 0, int armorTech = 0, int computerTech = 0,
            EquipmentTrigger[] triggers = null, int? uses = null)
        {
            _t[id] = new Equipment
            {
                Id = id, Name = name, Description = desc,
                Slot = slot, Rarity = rarity, ActivationType = act,
                CompatibleClasses = new List<UnitClass>(classes),
                StatModifiers = mods,
                Triggers = triggers != null ? new List<EquipmentTrigger>(triggers) : new List<EquipmentTrigger>(),
                Requirements = new EquipmentRequirements { WeaponsTech = weaponsTech, ShieldTech = shieldTech, ArmorTech = armorTech, ComputerTech = computerTech },
                InstallCost = new UnitCost { Metal = costM, Crystal = costC, Deuterium = costD },
                PowerConsumption = power, Mass = mass, UsesRemaining = uses,
            };
        }

        private static EquipmentTrigger MkTrigger(TriggerType trigger, double chance,
            AbilityEffectType effectType,
            StatusEffectType status = default, int duration = 0, double strength = 0,
            double repairAmt = 0, string repairType = null)
        {
            return new EquipmentTrigger
            {
                Condition = new TriggerCondition { Trigger = trigger, Chance = chance },
                Effect = new AbilityEffect
                {
                    Type = effectType, Target = "self",
                    StatusEffect = status, Duration = duration, Strength = strength,
                    RepairAmount = repairAmt, RepairType = repairType,
                },
            };
        }
    }
}
