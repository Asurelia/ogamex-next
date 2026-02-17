// =============================================================================
// CombatFormulas.cs — Ported from EvEmu evemu_Crucible TurretFormulas.cpp
// Source: src/eve-server/ship/modules/TurretFormulas.cpp (Allan, 10 June 2015)
// Port:   C# for OGameX-Next / Unity (Feb 2026)
//
// Formula reference (EVE University Wiki + EvEmu source):
//   ChanceToHit = 0.5 ^ ( ((AngularVel / TrackingSpeed) * (SigRes / TargetSig))^2
//                        + (max(0, Distance - OptimalRange) / Falloff)^2 )
// =============================================================================

using System;
using UnityEngine;

namespace OGameX.SharedLib.Combat
{
    /// <summary>
    /// Default critical hit chances per entity type (configurable).
    /// </summary>
    public static class CritChances
    {
        public const float NPC     = 0.015f; // 1.5%
        public const float Player  = 0.02f;  // 2%
        public const float Sentry  = 0.02f;  // 2%
        public const float Drone   = 0.03f;  // 3%
        public const float Concord = 0.05f;  // 5%
    }

    /// <summary>
    /// Result of a hit calculation.
    /// </summary>
    public struct HitResult
    {
        /// <summary>Damage multiplier (0 = miss, 0.1-1.49 = hit, 3.0 = critical).</summary>
        public float DamageMultiplier;
        /// <summary>Quality tier from 0 (miss) to 8 (wrecking shot).</summary>
        public int QualityId;
        /// <summary>Human-readable hit quality message.</summary>
        public string QualityMessage;
        /// <summary>Whether the shot was a critical hit.</summary>
        public bool IsCritical;
        /// <summary>Whether the shot hit at all.</summary>
        public bool IsHit => DamageMultiplier > 0f;
    }

    /// <summary>
    /// Parameters for a turret/weapon performing a to-hit roll.
    /// </summary>
    public struct WeaponParams
    {
        public float TrackingSpeed;
        public float SignatureResolution;
        public float OptimalRange;
        public float Falloff;
        public float CritChance;
    }

    /// <summary>
    /// Parameters for the target being shot at.
    /// </summary>
    public struct TargetParams
    {
        public Vector3 Position;
        public Vector3 Velocity;
        public float SignatureRadius;
    }

    /// <summary>
    /// Combat formulas ported from EvEmu's TurretFormulas.cpp.
    /// All methods are pure functions with no side effects.
    /// </summary>
    public static class CombatFormulas
    {
        // =====================================================================
        // Hit Quality Messages (from Damage.cpp damageID scale)
        // =====================================================================
        private static readonly string[] HitMessages = new string[]
        {
            "Misses completely",    // 0
            "Barely misses",        // 1
            "Glances off",          // 2
            "Barely scratches",     // 3
            "Lightly hits",         // 4
            "Hits",                 // 5
            "Aims well",            // 6
            "Places an excellent hit", // 7
            "Strikes perfectly, wrecking!" // 8 — critical
        };

        // =====================================================================
        // Core Formula: Chance To Hit
        // =====================================================================

        /// <summary>
        /// Calculates the raw chance to hit (0.0 to 1.0) based on tracking and range.
        /// <para>
        /// Formula: 0.5 ^ ( ((angularVel / trackingSpeed) * (sigRes / targetSig))^2
        ///                 + (max(0, distance - optimalRange) / falloff)^2 )
        /// </para>
        /// </summary>
        /// <param name="angularVelocity">Target's angular velocity relative to attacker (rad/s).</param>
        /// <param name="trackingSpeed">Turret's tracking speed.</param>
        /// <param name="signatureResolution">Turret's optimal signature resolution.</param>
        /// <param name="targetSignatureRadius">Target's signature radius.</param>
        /// <param name="distance">Distance to target (meters).</param>
        /// <param name="optimalRange">Turret's optimal range (meters).</param>
        /// <param name="falloff">Turret's falloff range (meters).</param>
        /// <returns>Probability of hitting (0.0 to 1.0).</returns>
        public static float CalculateChanceToHit(
            float angularVelocity,
            float trackingSpeed,
            float signatureResolution,
            float targetSignatureRadius,
            float distance,
            float optimalRange,
            float falloff)
        {
            if (trackingSpeed <= 0f || falloff <= 0f || targetSignatureRadius <= 0f)
                return 0f;

            float a = angularVelocity / trackingSpeed;
            float b = signatureResolution / targetSignatureRadius;

            // EvEmu special case: weapon can track but sigRes > targetSig
            // In this case, b is clamped to 1 (handled in GetToHit with modifier)
            float c = Mathf.Pow(a * b, 2f);
            float d = Mathf.Max(0f, distance - optimalRange);
            float e = Mathf.Pow(d / falloff, 2f);

            return Mathf.Pow(0.5f, c + e);
        }

        // =====================================================================
        // Player Turret To-Hit (from GetToHit)
        // =====================================================================

        /// <summary>
        /// Full player turret hit calculation with crit, sig-mismatch modifier, and RNG.
        /// Ported from TurretFormulas::GetToHit().
        /// </summary>
        public static HitResult RollPlayerTurretHit(
            Vector3 attackerPosition,
            Vector3 attackerVelocity,
            WeaponParams weapon,
            TargetParams target,
            System.Random rng = null)
        {
            rng ??= new System.Random();

            float distance = Vector3.Distance(attackerPosition, target.Position);
            if (distance <= 0f)
                return CreateMiss();

            // Transversal velocity = |targetVel - attackerVel|
            Vector3 relativeVelocity = target.Velocity - attackerVelocity;
            float transversalSpeed = relativeVelocity.magnitude;

            // Angular velocity = transversal / distance
            float angularVelocity = transversalSpeed / distance;

            // Signature handling
            float targetSig = target.SignatureRadius;
            if (targetSig < 0.01f)
                targetSig = 25f; // fallback default

            float a = angularVelocity / weapon.TrackingSpeed;
            float b = weapon.SignatureResolution / targetSig;

            // EvEmu sig-mismatch: large gun vs small ship
            float sigModifier = 0f;
            if (a < 1f && b > 1f)
            {
                b = 1f;
                sigModifier = targetSig / weapon.SignatureResolution;
            }

            float c = Mathf.Pow(a * b, 2f);
            float d = Mathf.Max(0f, distance - weapon.OptimalRange);
            float e = Mathf.Pow(d / weapon.Falloff, 2f);
            float trackingComponent = Mathf.Pow(0.5f, c);
            float rangeComponent = Mathf.Pow(0.5f, e);

            float chanceToHit = trackingComponent * rangeComponent;
            float roll = (float)rng.NextDouble();

            // Critical hit check
            if (roll <= weapon.CritChance)
                return CreateHit(3.0f);

            // Normal hit
            if (roll < chanceToHit)
            {
                float modifier = (sigModifier > 0f) ? sigModifier : (roll + 0.49f);
                return CreateHit(modifier);
            }

            return CreateMiss();
        }

        // =====================================================================
        // NPC Turret To-Hit (from GetNPCToHit)
        // =====================================================================

        /// <summary>
        /// NPC turret hit calculation. Identical formula, uses NPC crit chance.
        /// Ported from TurretFormulas::GetNPCToHit().
        /// </summary>
        public static HitResult RollNPCTurretHit(
            Vector3 npcPosition,
            Vector3 npcVelocity,
            WeaponParams weapon,
            TargetParams target,
            System.Random rng = null)
        {
            // Same formula as player, just uses NPC crit chance
            weapon.CritChance = CritChances.NPC;
            return RollPlayerTurretHit(npcPosition, npcVelocity, weapon, target, rng);
        }

        // =====================================================================
        // Drone To-Hit (from GetDroneToHit)
        // =====================================================================

        /// <summary>
        /// Drone hit calculation. Drones always deal minimum 0.1x damage (never 0).
        /// Ported from TurretFormulas::GetDroneToHit().
        /// </summary>
        public static HitResult RollDroneHit(
            Vector3 dronePosition,
            Vector3 droneVelocity,
            WeaponParams weapon,
            TargetParams target,
            System.Random rng = null)
        {
            rng ??= new System.Random();

            float distance = Vector3.Distance(dronePosition, target.Position);
            if (distance <= 0f)
                return CreateHit(1.0f);

            Vector3 relativeVelocity = target.Velocity - droneVelocity;
            float transversalSpeed = relativeVelocity.magnitude;

            float a = transversalSpeed / (distance * weapon.TrackingSpeed);
            float b = weapon.SignatureResolution / target.SignatureRadius;
            float c = Mathf.Pow(a * b, 2f);
            float d = Mathf.Max(0f, distance - weapon.OptimalRange);
            float e = Mathf.Pow(d / weapon.Falloff, 2f);

            float chanceToHit = Mathf.Pow(0.5f, c + e);
            float roll = (float)rng.NextDouble();

            if (roll <= CritChances.Drone)
                return CreateHit(3.0f);

            if (roll < chanceToHit)
                return CreateHit(roll + 0.49f);

            // Drones always deal minimum damage (never fully miss)
            return CreateHit(0.1f);
        }

        // =====================================================================
        // Missile Damage Application
        // =====================================================================

        /// <summary>
        /// Missile damage application factor.
        /// missiles always hit, but damage is reduced by explosion radius/velocity.
        /// <para>
        /// DamageReduction = min(1, sigRadius/expRadius, (sigRadius/expRadius * expVelocity/targetVelocity)^(ln(drf)/ln(5.5)) )
        /// where drf = damage reduction factor (typically 0.5 for rockets, varies)
        /// </para>
        /// </summary>
        public static float CalculateMissileDamageApplication(
            float targetSignatureRadius,
            float targetVelocity,
            float explosionRadius,
            float explosionVelocity,
            float damageReductionFactor = 0.5f)
        {
            if (explosionRadius <= 0f)
                return 1f;

            float sigRatio = targetSignatureRadius / explosionRadius;
            if (sigRatio >= 1f)
                return 1f; // target is bigger than explosion, full damage

            if (targetVelocity <= 0f || explosionVelocity <= 0f)
                return Mathf.Min(1f, sigRatio);

            float velocityRatio = explosionVelocity / targetVelocity;
            float drfExponent = Mathf.Log(damageReductionFactor) / Mathf.Log(5.5f);
            float velocityComponent = Mathf.Pow(sigRatio * velocityRatio, drfExponent);

            return Mathf.Min(1f, Mathf.Min(sigRatio, velocityComponent));
        }

        // =====================================================================
        // Helpers
        // =====================================================================

        /// <summary>
        /// Converts a damage modifier to a quality ID and message.
        /// Based on Damage.cpp damageID thresholds.
        /// </summary>
        public static (int qualityId, string message) GetHitQuality(float modifier)
        {
            int id;
            if (modifier >= 3.0f)       id = 8; // Wrecking
            else if (modifier > 1.2501f) id = 7;
            else if (modifier > 0.9999f) id = 6;
            else if (modifier > 0.7501f) id = 5;
            else if (modifier > 0.6251f) id = 4;
            else if (modifier > 0.4121f) id = 3;
            else if (modifier > 0.3751f) id = 2;
            else if (modifier > 0.2501f) id = 1;
            else                          id = 0;

            return (id, HitMessages[id]);
        }

        private static HitResult CreateHit(float modifier)
        {
            var (qualityId, message) = GetHitQuality(modifier);
            return new HitResult
            {
                DamageMultiplier = modifier,
                QualityId = qualityId,
                QualityMessage = message,
                IsCritical = modifier >= 3.0f
            };
        }

        private static HitResult CreateMiss()
        {
            return new HitResult
            {
                DamageMultiplier = 0f,
                QualityId = 0,
                QualityMessage = HitMessages[0],
                IsCritical = false
            };
        }
    }
}
