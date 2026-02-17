// =============================================================================
// ShipAttributes.cs — Inspired by EvEmu Dogma Attribute System
// Source: EvEmu's DogmaIM (Item Manager), InventoryItem.h, StaticDataMgr.h
//         + dgmAttributeTypes, dgmTypeAttributes SQL tables
// Port:   C# for OGameX-Next / Unity (Feb 2026)
//
// The Dogma system is EVE's attribute engine. Every item in the game is defined
// by a set of typed attributes (HP, speed, mass, etc.) that can be modified
// by effects (modules, skills, environmental).
//
// This file provides:
//   1. Attribute ID enum (matching EVE's dgmAttributeTypes table)
//   2. Ship stats container with all commonly-used ship attributes
//   3. Attribute modifier system (stacking-penalized)
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace OGameX.SharedLib.Dogma
{
    // =========================================================================
    // Core Attribute IDs (from dgmAttributeTypes)
    // =========================================================================

    /// <summary>
    /// Most commonly used attribute IDs from EVE's Dogma system.
    /// These map directly to dgmAttributeTypes.attributeID.
    /// Only the attributes relevant to OGameX ship combat are included.
    /// </summary>
    public enum AttributeId
    {
        // --- Hull / Structure ---
        HP                           = 9,
        Damage                       = 15,  // accumulated hull damage
        Mass                         = 4,
        Volume                       = 161,
        Radius                       = 162,
        Capacity                     = 38,

        // --- Shield ---
        ShieldCapacity               = 263,
        ShieldCharge                  = 264,
        ShieldRechargeRate           = 479,
        ShieldEmDamageResonance      = 271,
        ShieldThermalDamageResonance = 274,
        ShieldKineticDamageResonance = 273,
        ShieldExplosiveDamageResonance = 272,
        ShieldUniformity             = 484,

        // --- Armor ---
        ArmorHP                      = 265,
        ArmorDamage                  = 266,  // accumulated armor damage
        ArmorEmDamageResonance       = 267,
        ArmorThermalDamageResonance  = 270,
        ArmorKineticDamageResonance  = 269,
        ArmorExplosiveDamageResonance = 268,
        ArmorUniformity              = 524,

        // --- Hull Resonance ---
        EmDamageResonance            = 113,
        ThermalDamageResonance       = 115,
        KineticDamageResonance       = 109,
        ExplosiveDamageResonance     = 111,

        // --- Navigation ---
        MaxVelocity                  = 37,
        Agility                      = 70,   // inverse inertia modifier
        WarpSpeedMultiplier          = 600,
        WarpCapacitorNeed            = 153,

        // --- Weapons ---
        EmDamage                     = 114,
        ThermalDamage                = 118,
        KineticDamage                = 117,
        ExplosiveDamage              = 116,
        DamageMultiplier             = 64,
        TrackingSpeed                = 160,
        OptimalRange                 = 54,   // AttrMaxRange
        Falloff                      = 158,
        SignatureResolution           = 691,  // AttrOptimalSigRadius

        // --- Targeting ---
        MaxTargetRange               = 76,
        MaxLockedTargets             = 192,
        ScanResolution               = 564,
        SignatureRadius              = 552,

        // --- Capacitor ---
        CapacitorCapacity            = 482,
        RechargeRate                 = 55,

        // --- Fitting ---
        PowerOutput                  = 11,
        CpuOutput                    = 48,
        PowerLoad                    = 15,
        CpuLoad                      = 49,
        HiSlots                      = 14,
        MedSlots                     = 13,
        LowSlots                     = 12,
        RigSlots                     = 1137,
        TurretSlots                  = 102,
        LauncherSlots                = 101,

        // --- Cargo ---
        DroneCapacity                = 283,
        DroneBandwidth               = 1271,

        // --- Skills ---
        RequiredSkill1               = 182,
        RequiredSkill1Level          = 277,
        RequiredSkill2               = 183,
        RequiredSkill2Level          = 278,
        RequiredSkill3               = 184,
        RequiredSkill3Level          = 279,
    }

    // =========================================================================
    // Modifier System
    // =========================================================================

    /// <summary>
    /// How a modifier is applied to a base value.
    /// </summary>
    public enum ModifierOperation
    {
        /// <summary>value = base + modifier</summary>
        Add,
        /// <summary>value = base * modifier</summary>
        Multiply,
        /// <summary>value = base * (1 + modifier) — percentage bonus</summary>
        PercentAdd,
        /// <summary>Applied after stacking penalty.</summary>
        MultiplyStacking
    }

    /// <summary>
    /// A single modifier affecting an attribute.
    /// </summary>
    public struct AttributeModifier
    {
        public AttributeId TargetAttribute;
        public ModifierOperation Operation;
        public float Value;
        public string SourceId; // module or effect that created this modifier

        public AttributeModifier(AttributeId target, ModifierOperation op, float value, string source)
        {
            TargetAttribute = target;
            Operation = op;
            Value = value;
            SourceId = source;
        }
    }

    // =========================================================================
    // Ship Stats Container
    // =========================================================================

    /// <summary>
    /// Complete ship attribute container, inspired by EvEmu's InventoryItem + Dogma.
    /// Base values come from the database (invTypes + dgmTypeAttributes).
    /// Modified values are calculated at runtime from modifiers (modules, skills, effects).
    /// </summary>
    [System.Serializable]
    public class ShipAttributes
    {
        /// <summary>Ship type ID (from invTypes).</summary>
        public int TypeId;
        /// <summary>Ship type name.</summary>
        public string TypeName;

        // --- Base attribute values (from database) ---
        private readonly Dictionary<AttributeId, float> _baseValues = new();

        // --- Active modifiers ---
        private readonly List<AttributeModifier> _modifiers = new();

        // --- Cached computed values ---
        private readonly Dictionary<AttributeId, float> _cache = new();
        private bool _isDirty = true;

        // =====================================================================
        // Base Value Management
        // =====================================================================

        /// <summary>Set a base attribute value (from database or item creation).</summary>
        public void SetBaseValue(AttributeId attr, float value)
        {
            _baseValues[attr] = value;
            _isDirty = true;
        }

        /// <summary>Get a base attribute value (unmodified).</summary>
        public float GetBaseValue(AttributeId attr)
        {
            return _baseValues.TryGetValue(attr, out float val) ? val : 0f;
        }

        // =====================================================================
        // Modifier Management
        // =====================================================================

        /// <summary>Add a modifier (from a fitted module, skill, or effect).</summary>
        public void AddModifier(AttributeModifier mod)
        {
            _modifiers.Add(mod);
            _isDirty = true;
        }

        /// <summary>Remove all modifiers from a specific source.</summary>
        public void RemoveModifiersBySource(string sourceId)
        {
            _modifiers.RemoveAll(m => m.SourceId == sourceId);
            _isDirty = true;
        }

        /// <summary>Clear all modifiers.</summary>
        public void ClearAllModifiers()
        {
            _modifiers.Clear();
            _isDirty = true;
        }

        // =====================================================================
        // Computed Value Access
        // =====================================================================

        /// <summary>
        /// Get the final computed value for an attribute, with all modifiers applied.
        /// Uses caching — recalculates only when dirty.
        /// </summary>
        public float GetValue(AttributeId attr)
        {
            if (_isDirty)
                RecalculateAll();

            return _cache.TryGetValue(attr, out float val) ? val : GetBaseValue(attr);
        }

        /// <summary>
        /// Force recalculation of all attribute values.
        /// </summary>
        public void RecalculateAll()
        {
            _cache.Clear();

            foreach (var baseKvp in _baseValues)
            {
                _cache[baseKvp.Key] = CalculateModifiedValue(baseKvp.Key, baseKvp.Value);
            }

            _isDirty = false;
        }

        private float CalculateModifiedValue(AttributeId attr, float baseValue)
        {
            var relevantMods = _modifiers.Where(m => m.TargetAttribute == attr).ToList();
            if (relevantMods.Count == 0)
                return baseValue;

            float result = baseValue;

            // 1. Additive modifiers first
            foreach (var mod in relevantMods.Where(m => m.Operation == ModifierOperation.Add))
                result += mod.Value;

            // 2. Percentage-additive (sum all % bonuses, then apply once)
            float percentSum = relevantMods
                .Where(m => m.Operation == ModifierOperation.PercentAdd)
                .Sum(m => m.Value);
            if (percentSum != 0f)
                result *= (1f + percentSum);

            // 3. Direct multipliers
            foreach (var mod in relevantMods.Where(m => m.Operation == ModifierOperation.Multiply))
                result *= mod.Value;

            // 4. Stacking-penalized multipliers
            var stackingMods = relevantMods
                .Where(m => m.Operation == ModifierOperation.MultiplyStacking)
                .OrderByDescending(m => Math.Abs(m.Value - 1f)) // strongest first
                .ToList();

            for (int i = 0; i < stackingMods.Count; i++)
            {
                float penalty = CalculateStackingPenalty(i);
                float effectiveMod = 1f + (stackingMods[i].Value - 1f) * penalty;
                result *= effectiveMod;
            }

            return result;
        }

        // =====================================================================
        // Stacking Penalty
        // =====================================================================

        /// <summary>
        /// EVE Online stacking penalty formula.
        /// Penalty = e^(-(n/2.67)^2) where n is the 0-indexed position.
        /// <para>
        /// Effect: 1st = 100%, 2nd = 87%, 3rd = 57%, 4th = 28%, 5th = 11%, 6th+ ≈ 0%
        /// </para>
        /// </summary>
        private static float CalculateStackingPenalty(int index)
        {
            // Formula: exp(-(index / 2.67)^2)
            float n = index;
            float exponent = -(n / 2.67f) * (n / 2.67f);
            return Mathf.Exp(exponent);
        }

        /// <summary>
        /// Get stacking penalty effectiveness for display purposes.
        /// </summary>
        public static float GetStackingPenalty(int position)
        {
            return CalculateStackingPenalty(position);
        }

        // =====================================================================
        // Convenience Properties (most commonly accessed ship stats)
        // =====================================================================

        // -- Defense --
        public float ShieldCapacity     => GetValue(AttributeId.ShieldCapacity);
        public float ArmorHP            => GetValue(AttributeId.ArmorHP);
        public float HullHP             => GetValue(AttributeId.HP);
        public float SignatureRadius    => GetValue(AttributeId.SignatureRadius);

        // -- Navigation --
        public float MaxVelocity        => GetValue(AttributeId.MaxVelocity);
        public float Agility            => GetValue(AttributeId.Agility);
        public float Mass               => GetValue(AttributeId.Mass);
        public float WarpSpeed          => GetValue(AttributeId.WarpSpeedMultiplier);

        /// <summary>
        /// Align time in seconds. Formula: -ln(0.25) * Agility * Mass / 500000
        /// This is the time to reach 75% max velocity for warp.
        /// </summary>
        public float AlignTime => (float)(-Math.Log(0.25) * Agility * Mass / 500000.0);

        // -- Fitting --
        public float PowerGrid          => GetValue(AttributeId.PowerOutput);
        public float CPU                => GetValue(AttributeId.CpuOutput);
        public int   HighSlots          => (int)GetValue(AttributeId.HiSlots);
        public int   MidSlots           => (int)GetValue(AttributeId.MedSlots);
        public int   LowSlots           => (int)GetValue(AttributeId.LowSlots);
        public int   RigSlots           => (int)GetValue(AttributeId.RigSlots);
        public int   TurretSlots        => (int)GetValue(AttributeId.TurretSlots);
        public int   LauncherSlots      => (int)GetValue(AttributeId.LauncherSlots);

        // -- Targeting --
        public float MaxTargetRange     => GetValue(AttributeId.MaxTargetRange);
        public int   MaxLockedTargets   => (int)GetValue(AttributeId.MaxLockedTargets);
        public float ScanResolution     => GetValue(AttributeId.ScanResolution);

        // -- Capacitor --
        public float CapacitorCapacity  => GetValue(AttributeId.CapacitorCapacity);
        public float CapRechargeRate    => GetValue(AttributeId.RechargeRate);

        // -- Drones --
        public float DroneCapacity      => GetValue(AttributeId.DroneCapacity);
        public float DroneBandwidth     => GetValue(AttributeId.DroneBandwidth);

        // =====================================================================
        // Defense State Conversion (for DamageProcessor)
        // =====================================================================

        /// <summary>
        /// Creates a DefenseState from this ship's current attributes.
        /// Used as input for DamageProcessor.ApplyDamage().
        /// </summary>
        public Combat.DefenseState ToDefenseState()
        {
            return new Combat.DefenseState
            {
                ShieldCapacity = ShieldCapacity,
                ShieldCharge = GetValue(AttributeId.ShieldCharge),
                ShieldResonance = new Combat.ResistanceProfile(
                    GetValue(AttributeId.ShieldEmDamageResonance),
                    GetValue(AttributeId.ShieldThermalDamageResonance),
                    GetValue(AttributeId.ShieldKineticDamageResonance),
                    GetValue(AttributeId.ShieldExplosiveDamageResonance)
                ),
                ShieldUniformity = GetValue(AttributeId.ShieldUniformity),

                ArmorHP = ArmorHP,
                ArmorDamage = GetValue(AttributeId.ArmorDamage),
                ArmorResonance = new Combat.ResistanceProfile(
                    GetValue(AttributeId.ArmorEmDamageResonance),
                    GetValue(AttributeId.ArmorThermalDamageResonance),
                    GetValue(AttributeId.ArmorKineticDamageResonance),
                    GetValue(AttributeId.ArmorExplosiveDamageResonance)
                ),
                ArmorUniformity = GetValue(AttributeId.ArmorUniformity),

                HullHP = HullHP,
                HullDamage = GetValue(AttributeId.Damage),
                HullResonance = new Combat.ResistanceProfile(
                    GetValue(AttributeId.EmDamageResonance),
                    GetValue(AttributeId.ThermalDamageResonance),
                    GetValue(AttributeId.KineticDamageResonance),
                    GetValue(AttributeId.ExplosiveDamageResonance)
                )
            };
        }
    }
}
