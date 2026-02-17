// =============================================================================
// DamageProcessor.cs — Ported from EvEmu evemu_Crucible Damage.cpp
// Source: src/eve-server/system/Damage.cpp (Zhur, Allan)
// Port:   C# for OGameX-Next / Unity (Feb 2026)
//
// Implements the 3-layer damage pipeline: Shield → Armor → Hull
// Each layer has 4 resistance types (EM, Thermal, Kinetic, Explosive).
// =============================================================================

using System;
using UnityEngine;

namespace OGameX.SharedLib.Combat
{
    // =========================================================================
    // Enums
    // =========================================================================

    /// <summary>
    /// The four damage types in EVE's combat system.
    /// </summary>
    public enum DamageType
    {
        EM,
        Thermal,
        Kinetic,
        Explosive
    }

    // =========================================================================
    // Data Structures
    // =========================================================================

    /// <summary>
    /// Represents raw damage values across the 4 damage types.
    /// Ported from the Damage class constructor in Damage.cpp.
    /// </summary>
    [System.Serializable]
    public struct DamagePacket
    {
        public float EM;
        public float Thermal;
        public float Kinetic;
        public float Explosive;

        public float Total => EM + Thermal + Kinetic + Explosive;

        public DamagePacket(float em, float thermal, float kinetic, float explosive)
        {
            EM = em;
            Thermal = thermal;
            Kinetic = kinetic;
            Explosive = explosive;
        }

        /// <summary>
        /// Multiply each damage type by its corresponding resonance.
        /// In EVE, resonance 1.0 = no resistance, 0.0 = full immunity.
        /// Ported from Damage::MultiplyDup().
        /// </summary>
        public DamagePacket ApplyResonance(ResistanceProfile resonance)
        {
            return new DamagePacket(
                EM * resonance.EM,
                Thermal * resonance.Thermal,
                Kinetic * resonance.Kinetic,
                Explosive * resonance.Explosive
            );
        }

        /// <summary>
        /// Scale all damage types by a uniform multiplier.
        /// Used for config rate multipliers and hit quality.
        /// </summary>
        public DamagePacket Scale(float multiplier)
        {
            return new DamagePacket(
                EM * multiplier,
                Thermal * multiplier,
                Kinetic * multiplier,
                Explosive * multiplier
            );
        }

        /// <summary>
        /// Reduce damage by a fraction (e.g., after partial shield absorption).
        /// Ported from: d *= (1 - (available / damageToLayer))
        /// </summary>
        public DamagePacket ReduceByFraction(float fraction)
        {
            float mult = Mathf.Clamp01(1f - fraction);
            return Scale(mult);
        }
    }

    /// <summary>
    /// Resistance/resonance profile for a defense layer (Shield, Armor, or Hull).
    /// Values are resonance (1.0 = no resistance, 0.0 = immune).
    /// </summary>
    [System.Serializable]
    public struct ResistanceProfile
    {
        /// <summary>EM resonance (1.0 = no resistance).</summary>
        public float EM;
        /// <summary>Thermal resonance.</summary>
        public float Thermal;
        /// <summary>Kinetic resonance.</summary>
        public float Kinetic;
        /// <summary>Explosive resonance.</summary>
        public float Explosive;

        public ResistanceProfile(float em, float thermal, float kinetic, float explosive)
        {
            EM = em;
            Thermal = thermal;
            Kinetic = kinetic;
            Explosive = explosive;
        }

        /// <summary>Default: no resistances (all resonance = 1.0).</summary>
        public static ResistanceProfile None => new(1f, 1f, 1f, 1f);
    }

    /// <summary>
    /// Complete defense state of a ship/entity.
    /// Ported from the attributes used in SystemEntity::ApplyDamage().
    /// </summary>
    [System.Serializable]
    public class DefenseState
    {
        // --- Shield ---
        public float ShieldCapacity;
        public float ShieldCharge; // current shield HP
        public ResistanceProfile ShieldResonance;
        /// <summary>Shield uniformity (0.0–1.0). Below this %, damage bleeds through.</summary>
        public float ShieldUniformity;

        // --- Armor ---
        public float ArmorHP;
        public float ArmorDamage; // accumulated damage (reduces effective armor)
        public ResistanceProfile ArmorResonance;
        /// <summary>Armor uniformity threshold for bleed-through.</summary>
        public float ArmorUniformity;

        // --- Hull/Structure ---
        public float HullHP;
        public float HullDamage; // accumulated damage
        public ResistanceProfile HullResonance;

        /// <summary>Current effective shield HP remaining.</summary>
        public float EffectiveShield => ShieldCharge;
        /// <summary>Current effective armor HP remaining.</summary>
        public float EffectiveArmor => ArmorHP - ArmorDamage;
        /// <summary>Current effective hull HP remaining.</summary>
        public float EffectiveHull => HullHP - HullDamage;
        /// <summary>Total remaining HP across all layers.</summary>
        public float TotalRemaining => EffectiveShield + EffectiveArmor + EffectiveHull;
        /// <summary>Total maximum HP across all layers.</summary>
        public float TotalMaxHP => ShieldCapacity + ArmorHP + HullHP;
        /// <summary>Whether the entity is destroyed.</summary>
        public bool IsDestroyed => EffectiveHull <= 0f;

        /// <summary>Shield as fraction of capacity (0.0–1.0).</summary>
        public float ShieldFraction => ShieldCapacity > 0 ? ShieldCharge / ShieldCapacity : 0f;
        /// <summary>Armor as fraction of capacity (0.0–1.0).</summary>
        public float ArmorFraction => ArmorHP > 0 ? EffectiveArmor / ArmorHP : 0f;
        /// <summary>Hull as fraction of capacity (0.0–1.0).</summary>
        public float HullFraction => HullHP > 0 ? EffectiveHull / HullHP : 0f;
    }

    /// <summary>
    /// Result of applying damage to an entity's defense layers.
    /// </summary>
    public struct DamageResult
    {
        /// <summary>Total damage absorbed across all layers.</summary>
        public float TotalDamageDealt;
        /// <summary>Damage absorbed by shield (after resistances).</summary>
        public float ShieldDamage;
        /// <summary>Damage absorbed by armor (after resistances).</summary>
        public float ArmorDamage;
        /// <summary>Damage absorbed by hull (after resistances).</summary>
        public float HullDamage;
        /// <summary>Whether the entity was destroyed.</summary>
        public bool IsKill;
        /// <summary>Hit quality ID (0–8).</summary>
        public int QualityId;
        /// <summary>Hit quality message.</summary>
        public string QualityMessage;
    }

    // =========================================================================
    // Main Processor
    // =========================================================================

    /// <summary>
    /// Processes damage through the Shield → Armor → Hull pipeline.
    /// Faithfully ported from SystemEntity::ApplyDamage() in Damage.cpp.
    /// </summary>
    public static class DamageProcessor
    {
        /// <summary>
        /// Global damage rate multiplier (from server config).
        /// In EvEmu: sConfig.rates.damageRate
        /// </summary>
        public static float GlobalDamageRate = 1.0f;

        /// <summary>
        /// Missile damage rate multiplier.
        /// In EvEmu: sConfig.rates.missileDamage
        /// </summary>
        public static float MissileDamageRate = 1.0f;

        /// <summary>
        /// Chance of a random module being damaged when hull is taking damage.
        /// In EvEmu: sConfig.server.ModuleDamageChance
        /// </summary>
        public static float ModuleDamageChance = 0.05f;

        // =====================================================================
        // Main Apply Damage
        // =====================================================================

        /// <summary>
        /// Apply a damage packet to a defense state.
        /// This is the core function ported from SystemEntity::ApplyDamage().
        /// Mutates the defenseState in place (same as C++ version).
        /// </summary>
        /// <param name="defenseState">The entity's current defense state (mutated).</param>
        /// <param name="damage">Raw damage packet from weapon.</param>
        /// <param name="hitModifier">Hit quality modifier from CombatFormulas (0=miss, 3=crit).</param>
        /// <param name="isMissile">Whether this damage came from a missile launcher.</param>
        /// <returns>Result with damage breakdown and kill status.</returns>
        public static DamageResult ApplyDamage(
            DefenseState defenseState,
            DamagePacket damage,
            float hitModifier = 1.0f,
            bool isMissile = false)
        {
            var result = new DamageResult();

            // --- Apply hit modifier (from turret chance-to-hit roll) ---
            if (hitModifier <= 0f)
            {
                var (qId, qMsg) = CombatFormulas.GetHitQuality(0f);
                result.QualityId = qId;
                result.QualityMessage = qMsg;
                return result; // Complete miss
            }

            damage = damage.Scale(hitModifier);

            // --- Apply config rate multipliers ---
            if (isMissile)
                damage = damage.Scale(MissileDamageRate);
            damage = damage.Scale(GlobalDamageRate);

            // --- Get hit quality for messaging ---
            {
                var (qId, qMsg) = CombatFormulas.GetHitQuality(hitModifier);
                result.QualityId = qId;
                result.QualityMessage = qMsg;
            }

            // =================================================================
            // LAYER 1: SHIELD
            // =================================================================
            DamagePacket damageToShield = damage.ApplyResonance(defenseState.ShieldResonance);
            float shieldDamage = damageToShield.Total;
            float availableShield = defenseState.ShieldCharge;

            if (shieldDamage <= availableShield)
            {
                // Shield absorbs all damage
                result.ShieldDamage = shieldDamage;
                result.TotalDamageDealt = shieldDamage;
                defenseState.ShieldCharge = availableShield - shieldDamage;
                return result;
            }

            // Shield depleted: calculate remaining damage fraction
            if (availableShield > 0f)
            {
                result.ShieldDamage = availableShield;
                result.TotalDamageDealt += availableShield;
                damage = damage.ReduceByFraction(availableShield / shieldDamage);
                defenseState.ShieldCharge = 0f;
            }

            // =================================================================
            // LAYER 2: ARMOR
            // =================================================================
            float availableArmor = defenseState.EffectiveArmor;
            DamagePacket damageToArmor = damage.ApplyResonance(defenseState.ArmorResonance);
            float armorDamage = damageToArmor.Total;

            if (armorDamage <= availableArmor)
            {
                // Armor absorbs remaining damage
                // Bleed-through: 1% of raw damage goes to hull when armor is low
                float bleedThrough = 0f;
                if (availableArmor / defenseState.ArmorHP < defenseState.ArmorUniformity)
                {
                    bleedThrough = damage.Total * 0.01f;
                    defenseState.HullDamage += bleedThrough;
                    armorDamage -= bleedThrough;
                }

                result.ArmorDamage = armorDamage;
                result.TotalDamageDealt += armorDamage + bleedThrough;
                defenseState.ArmorDamage += armorDamage;
                return result;
            }

            // Armor depleted
            if (availableArmor > 0f)
            {
                result.ArmorDamage = availableArmor;
                result.TotalDamageDealt += availableArmor;
                damage = damage.ReduceByFraction(availableArmor / armorDamage);
                defenseState.ArmorDamage = defenseState.ArmorHP; // fully damaged
            }

            // =================================================================
            // LAYER 3: HULL / STRUCTURE
            // =================================================================
            float availableHull = defenseState.EffectiveHull;
            DamagePacket damageToHull = damage.ApplyResonance(defenseState.HullResonance);
            float hullDamage = damageToHull.Total;

            if (hullDamage < availableHull)
            {
                result.HullDamage = hullDamage;
                result.TotalDamageDealt += hullDamage;
                defenseState.HullDamage += hullDamage;
                return result;
            }

            // DESTROYED
            result.HullDamage = availableHull;
            result.TotalDamageDealt += availableHull;
            defenseState.HullDamage = defenseState.HullHP; // fully destroyed
            result.IsKill = true;

            return result;
        }

        // =====================================================================
        // Security Status Loss (from ShipSE::Killed)
        // =====================================================================

        /// <summary>
        /// Calculate security status loss for the aggressor when killing a player.
        /// Ported from ShipSE::Killed() in Damage.cpp.
        /// <para>
        /// Formula: loss = base_penalty * system_truesec * (1 + (victim_sec - aggressor_sec) / 90)
        ///                  * (aggressor_sec + 10) * secRate
        /// </para>
        /// </summary>
        /// <param name="systemSecurityRating">System's true security (0.0–1.0).</param>
        /// <param name="victimSecStatus">Victim's security status.</param>
        /// <param name="aggressorSecStatus">Aggressor's security status.</param>
        /// <param name="basePenalty">Base penalty multiplier (default 6.0).</param>
        /// <param name="secRateMultiplier">Server config rate (default 1.0).</param>
        /// <returns>Security status loss (negative value to apply).</returns>
        public static float CalculateSecurityLoss(
            float systemSecurityRating,
            float victimSecStatus,
            float aggressorSecStatus,
            float basePenalty = 6.0f,
            float secRateMultiplier = 1.0f)
        {
            if (systemSecurityRating <= 0f)
                return 0f; // No sec loss in null-sec or wormholes

            float modifier = 1f + (victimSecStatus - aggressorSecStatus) / 90f;
            float penalty = basePenalty * systemSecurityRating * modifier;
            float loss = penalty * (aggressorSecStatus + 10f);
            return loss * secRateMultiplier;
        }

        // =====================================================================
        // Loot Drop (from ShipSE::Killed)
        // =====================================================================

        /// <summary>
        /// Determines if an item survives a ship destruction.
        /// In EVE, each item has a 50% chance to survive (except rigs which always die).
        /// Ported from the loot drop logic in ShipSE::Killed().
        /// </summary>
        /// <param name="isRig">Whether the item is a rig module.</param>
        /// <param name="rng">Optional RNG for deterministic tests.</param>
        /// <returns>True if the item survives and drops as loot.</returns>
        public static bool DoesItemSurviveDestruction(bool isRig, System.Random rng = null)
        {
            if (isRig)
                return false; // Rigs are always destroyed

            rng ??= new System.Random();
            return rng.Next(0, 101) % 2 == 0; // 50% chance
        }

        /// <summary>
        /// For stackable items that survive, determine how many drop.
        /// </summary>
        public static int CalculateLootDropQuantity(int totalQuantity, System.Random rng = null)
        {
            if (totalQuantity <= 1)
                return totalQuantity;

            rng ??= new System.Random();
            return rng.Next(0, totalQuantity + 1);
        }
    }
}
