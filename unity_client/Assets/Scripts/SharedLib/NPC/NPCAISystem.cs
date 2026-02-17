// ============================================================================
// NPCAISystem.cs — Ported from EvEmu npc/NPCAI.cpp + npc/DroneAI.cpp
//
// NPC behavior: state machine (idle/chase/engage/flee/warp), targeting,
// aggro management, combat decision-making.
// ============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.NPC
{
    // ========================================================================
    // ENUMS — from NPCAI.h State namespace
    // ========================================================================

    /// <summary>
    /// NPC AI states.
    /// Source: NPCAI::State enum in NPCAI.h
    /// </summary>
    public enum NPCState
    {
        Invalid = -1,
        Idle = 1,
        Chasing = 2,
        Following = 3,
        Engaged = 4,
        Fleeing = 5,
        Signaling = 6,
        WarpOut = 7,
        WarpFollow = 8,
    }

    /// <summary>EWar (electronic warfare) types.</summary>
    public enum EWarType
    {
        None = 0,
        Webifier = 1,       // speed reduction
        Scrambler = 2,      // warp disable
        Painter = 3,        // sig radius increase
        TrackingDisrupt = 4,
        ECM = 5,            // sensor jam
        NeutDrain = 6,      // capacitor warfare
    }

    /// <summary>Drone states for drone AI.</summary>
    public enum DroneState
    {
        Idle = 0,
        Returning = 1,
        Fighting = 2,
        Mining = 3,
        Approaching = 4,
    }

    // ========================================================================
    // DATA STRUCTURES
    // ========================================================================

    /// <summary>
    /// An entity in space that can be targeted.
    /// </summary>
    public class SpaceEntity
    {
        public long EntityID;
        public int TypeID;
        public string Name;
        public float X, Y, Z;               // position
        public float VelocityX, VelocityY, VelocityZ;
        public float ShieldHP, ArmorHP, HullHP;
        public float MaxShieldHP, MaxArmorHP, MaxHullHP;
        public float SignatureRadius;
        public float MaxVelocity;
        public bool IsNPC;
        public bool IsDrone;

        public float DistanceTo(SpaceEntity other)
        {
            float dx = X - other.X, dy = Y - other.Y, dz = Z - other.Z;
            return (float)Math.Sqrt(dx * dx + dy * dy + dz * dz);
        }

        public float HPPercent => MaxHullHP > 0
            ? (ShieldHP + ArmorHP + HullHP) / (MaxShieldHP + MaxArmorHP + MaxHullHP)
            : 0;
    }

    /// <summary>
    /// NPC combat attributes.
    /// Source: NPCAIMgr members in NPCAI.h
    /// </summary>
    public class NPCProfile
    {
        public int TypeID;
        public string Name;

        // Range
        public float OptimalRange;           // m_optimalRange
        public float FalloffRange;           // m_falloff
        public float AttackRange;            // m_attackRange (max engagement distance)
        public float OrbitRange;             // m_orbitRange (preferred combat distance)

        // Combat stats
        public float TrackingSpeed;          // m_trackingSpeed
        public float DamageMultiplier;
        public float BaseDamage;
        public float FireRate;               // seconds between shots

        // EWar
        public EWarType EWarCapability;
        public float EWarRange;

        // Movement
        public float MaxVelocity;
        public float WarpSpeed;
        public float AlignTime;

        // HP & resist
        public float ShieldHP, ArmorHP, HullHP;
        public float ShieldResistEM, ShieldResistThermal, ShieldResistKinetic, ShieldResistExplosive;
        public float ArmorResistEM, ArmorResistThermal, ArmorResistKinetic, ArmorResistExplosive;

        // Behavior
        public float FleeThresholdPercent = 0.25f;  // flee when HP below this
        public float AggroRange;                      // m_attackRange for initial aggro
        public bool CanCallForHelp;                   // m_signalingTimer logic
        public float SignalRange;                     // range to call for help
    }

    /// <summary>
    /// Aggro/threat entry for a target.
    /// </summary>
    public struct ThreatEntry
    {
        public long EntityID;
        public float ThreatLevel;
        public long LastDamageTime;
    }

    // ========================================================================
    // NPC AI SYSTEM — state machine
    // ========================================================================

    /// <summary>
    /// NPC AI managing combat behavior.
    /// Source: EvEmu npc/NPCAI.cpp — NPCAIMgr class
    /// </summary>
    public class NPCAIController
    {
        private readonly NPCProfile _profile;
        private readonly SpaceEntity _self;

        // State
        public NPCState State { get; private set; } = NPCState.Idle;
        public SpaceEntity CurrentTarget { get; private set; }

        // Aggro table
        private readonly Dictionary<long, ThreatEntry> _threatTable = new();
        private float _lastFireTime;

        // Timers (in seconds)
        private float _stateTimer;
        private float _signalingCooldown;

        // Events
        public event Action<NPCAIController, SpaceEntity> OnTargetAcquired;
        public event Action<NPCAIController, SpaceEntity, float> OnFired;
        public event Action<NPCAIController> OnFleeing;
        public event Action<NPCAIController, float> OnSignaling; // calls for help in range
        public event Action<NPCAIController> OnWarpOut;

        public NPCAIController(NPCProfile profile, SpaceEntity self)
        {
            _profile = profile;
            _self = self;
        }

        // ====================================================================
        // PROCESS — called each tick from SystemManager
        // Source: NPCAIMgr::Process() in NPCAI.cpp
        // ====================================================================

        public void Process(float deltaTime, List<SpaceEntity> nearbyEntities)
        {
            _stateTimer -= deltaTime;
            _signalingCooldown -= deltaTime;

            switch (State)
            {
                case NPCState.Idle:
                    ProcessIdle(nearbyEntities);
                    break;
                case NPCState.Chasing:
                    ProcessChasing(deltaTime);
                    break;
                case NPCState.Engaged:
                    ProcessEngaged(deltaTime, nearbyEntities);
                    break;
                case NPCState.Fleeing:
                    ProcessFleeing(deltaTime);
                    break;
                case NPCState.Signaling:
                    ProcessSignaling(nearbyEntities);
                    break;
                case NPCState.WarpOut:
                    // NPC warps out — remove from space after timer
                    break;
            }
        }

        // ====================================================================
        // STATE HANDLERS
        // ====================================================================

        private void ProcessIdle(List<SpaceEntity> nearby)
        {
            // Scan for hostiles in aggro range
            var target = FindHighestThreat(nearby);
            if (target != null)
            {
                SetTarget(target);
                float dist = _self.DistanceTo(target);
                State = dist > _profile.AttackRange ? NPCState.Chasing : NPCState.Engaged;
            }
        }

        private void ProcessChasing(float deltaTime)
        {
            if (CurrentTarget == null) { State = NPCState.Idle; return; }

            float dist = _self.DistanceTo(CurrentTarget);

            // Move toward target
            MoveToward(CurrentTarget, deltaTime);

            // Close enough to engage?
            if (dist <= _profile.AttackRange)
            {
                State = NPCState.Engaged;
            }

            // Target too far? Reset
            if (dist > _profile.AggroRange * 2)
            {
                ClearTarget();
                State = NPCState.Idle;
            }
        }

        private void ProcessEngaged(float deltaTime, List<SpaceEntity> nearby)
        {
            if (CurrentTarget == null) { State = NPCState.Idle; return; }

            // Check HP — should we flee?
            if (_self.HPPercent < _profile.FleeThresholdPercent)
            {
                if (_profile.CanCallForHelp && _signalingCooldown <= 0)
                {
                    State = NPCState.Signaling;
                    _signalingCooldown = 30f;
                    return;
                }
                State = NPCState.Fleeing;
                OnFleeing?.Invoke(this);
                return;
            }

            float dist = _self.DistanceTo(CurrentTarget);

            // Target out of range?
            if (dist > _profile.AttackRange)
            {
                State = NPCState.Chasing;
                return;
            }

            // Orbit at preferred range
            if (Math.Abs(dist - _profile.OrbitRange) > 500)
            {
                MoveToward(CurrentTarget, deltaTime, _profile.OrbitRange);
            }

            // Fire weapons
            _lastFireTime += deltaTime;
            if (_lastFireTime >= _profile.FireRate)
            {
                _lastFireTime = 0;
                float damage = CalculateDamage(dist);
                OnFired?.Invoke(this, CurrentTarget, damage);
            }

            // Check for higher-threat target
            var betterTarget = FindHighestThreat(nearby);
            if (betterTarget != null && betterTarget.EntityID != CurrentTarget.EntityID)
            {
                // Switch to higher threat target
                var oldThreat = GetThreat(CurrentTarget.EntityID);
                var newThreat = GetThreat(betterTarget.EntityID);
                if (newThreat > oldThreat * 1.2f)  // 20% hysteresis
                {
                    SetTarget(betterTarget);
                }
            }
        }

        private void ProcessFleeing(float deltaTime)
        {
            // Move away from target
            if (CurrentTarget != null)
            {
                MoveAway(CurrentTarget, deltaTime);

                float dist = _self.DistanceTo(CurrentTarget);
                if (dist > _profile.AggroRange)
                {
                    // Warp out
                    State = NPCState.WarpOut;
                    OnWarpOut?.Invoke(this);
                }
            }
            else
            {
                State = NPCState.WarpOut;
                OnWarpOut?.Invoke(this);
            }
        }

        private void ProcessSignaling(List<SpaceEntity> nearby)
        {
            OnSignaling?.Invoke(this, _profile.SignalRange);
            // After signaling, go back to engaged or flee
            State = _self.HPPercent > _profile.FleeThresholdPercent * 0.5f
                ? NPCState.Engaged
                : NPCState.Fleeing;
        }

        // ====================================================================
        // TARGETING & THREAT
        // ====================================================================

        /// <summary>
        /// Add threat for an entity (when they attack us).
        /// Source: NPCAIMgr threat management
        /// </summary>
        public void AddThreat(long entityID, float amount)
        {
            if (_threatTable.TryGetValue(entityID, out var entry))
            {
                entry.ThreatLevel += amount;
                entry.LastDamageTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                _threatTable[entityID] = entry;
            }
            else
            {
                _threatTable[entityID] = new ThreatEntry
                {
                    EntityID = entityID,
                    ThreatLevel = amount,
                    LastDamageTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                };
            }
        }

        public float GetThreat(long entityID)
        {
            return _threatTable.TryGetValue(entityID, out var entry) ? entry.ThreatLevel : 0;
        }

        private SpaceEntity FindHighestThreat(List<SpaceEntity> nearby)
        {
            SpaceEntity best = null;
            float bestThreat = 0;

            foreach (var entity in nearby)
            {
                if (entity.EntityID == _self.EntityID) continue;
                if (entity.IsNPC) continue;  // don't target other NPCs

                float dist = _self.DistanceTo(entity);
                if (dist > _profile.AggroRange) continue;

                float threat = GetThreat(entity.EntityID);
                // Proximity bonus
                if (dist < _profile.AttackRange)
                    threat += 10;

                if (threat > bestThreat)
                {
                    bestThreat = threat;
                    best = entity;
                }
            }

            return best;
        }

        private void SetTarget(SpaceEntity target)
        {
            CurrentTarget = target;
            OnTargetAcquired?.Invoke(this, target);
        }

        private void ClearTarget()
        {
            CurrentTarget = null;
        }

        // ====================================================================
        // COMBAT MATH
        // ====================================================================

        /// <summary>
        /// Calculate damage based on tracking, range, and target signature.
        /// Simplified from EvEmu turret tracking formula.
        /// </summary>
        private float CalculateDamage(float distance)
        {
            float baseDmg = _profile.BaseDamage * _profile.DamageMultiplier;

            // Range falloff
            if (distance > _profile.OptimalRange)
            {
                float falloffDist = distance - _profile.OptimalRange;
                float falloffMult = (float)Math.Pow(0.5, Math.Pow(falloffDist / _profile.FalloffRange, 2));
                baseDmg *= falloffMult;
            }

            // Tracking (simplified)
            if (CurrentTarget != null && _profile.TrackingSpeed > 0)
            {
                float targetSigRadius = CurrentTarget.SignatureRadius;
                float trackingChance = Math.Min(1.0f,
                    _profile.TrackingSpeed * targetSigRadius / Math.Max(1, distance * 0.001f));
                baseDmg *= trackingChance;
            }

            return baseDmg;
        }

        // ====================================================================
        // MOVEMENT (simplified — delegate to Unity physics in practice)
        // ====================================================================

        private void MoveToward(SpaceEntity target, float deltaTime, float orbitDist = 0)
        {
            float dist = _self.DistanceTo(target);
            if (dist < 1) return;

            float dx = target.X - _self.X;
            float dy = target.Y - _self.Y;
            float dz = target.Z - _self.Z;

            float speed = _profile.MaxVelocity * deltaTime;
            float factor = Math.Min(speed / dist, 1.0f);

            if (orbitDist > 0 && dist < orbitDist)
                return; // already at orbit range

            _self.X += dx * factor;
            _self.Y += dy * factor;
            _self.Z += dz * factor;
        }

        private void MoveAway(SpaceEntity target, float deltaTime)
        {
            float dist = _self.DistanceTo(target);
            if (dist < 1) dist = 1;

            float dx = _self.X - target.X;
            float dy = _self.Y - target.Y;
            float dz = _self.Z - target.Z;

            float speed = _profile.MaxVelocity * deltaTime;
            float factor = speed / dist;

            _self.X += dx * factor;
            _self.Y += dy * factor;
            _self.Z += dz * factor;
        }
    }

    // ========================================================================
    // DRONE AI — from EvEmu npc/DroneAI.cpp
    // ========================================================================

    /// <summary>
    /// Player-owned drone AI. Simpler than NPC AI.
    /// Source: EvEmu npc/DroneAI.cpp
    /// </summary>
    public class DroneAIController
    {
        public SpaceEntity Drone { get; }
        public SpaceEntity Owner { get; }
        public DroneState State { get; set; } = DroneState.Idle;
        public SpaceEntity Target { get; set; }

        public float OrbitRange = 1000;
        public float DamagePerShot = 10;
        public float FireRate = 3;           // seconds
        private float _lastFire;

        public DroneAIController(SpaceEntity drone, SpaceEntity owner)
        {
            Drone = drone;
            Owner = owner;
        }

        // Commands
        public void Engage(SpaceEntity target) { Target = target; State = DroneState.Fighting; }
        public void ReturnToBay() { Target = null; State = DroneState.Returning; }
        public void Idle() { Target = null; State = DroneState.Idle; }

        public void Process(float deltaTime)
        {
            switch (State)
            {
                case DroneState.Idle:
                    // Follow owner at idle distance
                    break;
                case DroneState.Fighting:
                    if (Target == null || Target.HPPercent <= 0)
                    {
                        State = DroneState.Idle;
                        break;
                    }
                    _lastFire += deltaTime;
                    if (_lastFire >= FireRate)
                    {
                        _lastFire = 0;
                        // Fire event handled externally
                    }
                    break;
                case DroneState.Returning:
                    float dist = Drone.DistanceTo(Owner);
                    if (dist < 2500) // scooped
                        State = DroneState.Idle;
                    break;
            }
        }
    }
}
