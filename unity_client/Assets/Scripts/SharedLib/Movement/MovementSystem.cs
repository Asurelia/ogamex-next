// =============================================================================
// MovementSystem.cs — Ported from EvEmu DestinyManager.cpp + DestinyManager.h
// Source: src/eve-server/system/DestinyManager.cpp (Zhur, Allan)
//         src/eve-server/system/DestinyManager.h
// Port:   C# for OGameX-Next / Unity (Feb 2026)
//
// Handles all space movement: sub-warp propulsion (acceleration, deceleration,
// turning), warp travel (3-phase: accel/cruise/decel), orbit, follow, approach,
// and collision detection.
//
// Key physics formulas:
//   V(t) = Vmax * (1 - e^(-t / agility))            — acceleration
//   t = agility * -ln(1 - v/V)                        — time to reach speed v
//   Warp accel: x = e^(3t), v = 3*e^(3t)             — k=3
//   Warp decel: x = e^(t),  v = e^(t)                — k=1
//   Align time = -ln(0.25) * Agility * Mass / 1e6     — time to 75% speed
// =============================================================================

using System;
using UnityEngine;

namespace OGameX.SharedLib.Movement
{
    // =========================================================================
    // Constants (from DestinyManager.h)
    // =========================================================================

    /// <summary>
    /// Movement constants extracted from EvEmu source.
    /// </summary>
    public static class MovementConstants
    {
        /// <summary>Alignment deviation threshold for standard turns (degrees).</summary>
        public const float TurnAlignment = 4.0f;
        /// <summary>Alignment deviation threshold for warp entry (degrees).</summary>
        public const float WarpAlignment = 6.0f;
        /// <summary>Collision distance threshold (meters).</summary>
        public const float BumpDistance = 50f;
        /// <summary>1 AU in meters.</summary>
        public const double OneAUInMeters = 149597870700.0;
        /// <summary>Base warp acceleration time (seconds).</summary>
        public const int BaseWarpAccelTime = 7;
        /// <summary>Base warp deceleration time (seconds). Always 3× accel.</summary>
        public const int BaseWarpDecelTime = 21;
        /// <summary>Total base warp time for distances > ship warp speed (seconds).</summary>
        public const int BaseWarpTime = 29; // 7 + 21 + cruise
        /// <summary>Warp speed drop threshold (fraction of max speed to leave warp).</summary>
        public const float WarpDropSpeedFraction = 0.75f;
        /// <summary>Minimum speed fraction to enter warp.</summary>
        public const float WarpEntrySpeedFraction = 0.75f;
    }

    // =========================================================================
    // Enums (from Destiny::Ball::Mode)
    // =========================================================================

    /// <summary>
    /// Entity movement mode / ball mode.
    /// Ported from Destiny::Ball::Mode enum in EvEmu.
    /// </summary>
    public enum BallMode
    {
        Stop       = 0,
        GoTo       = 1,
        Orbit      = 2,
        Missile    = 3,
        Mushroom   = 4,  // AoE
        Boid       = 5,  // temporary movement
        Follow     = 6,
        Troll      = 7,  // wreck drift
        MiniBALL   = 8,  // sentry
        Field      = 9,
        Rigid      = 10, // static objects
        Formation  = 11,
        Warp       = 13
    }

    /// <summary>
    /// Orbit state tracking.
    /// Ported from Destiny::Ball::Orbit enum.
    /// </summary>
    public enum OrbitState
    {
        None     = 0,
        AtRange  = 1,
        TooClose = 2,
        TooFar   = 3,
        WayTooClose = 4,
        WayTooFar   = 5
    }

    // =========================================================================
    // Warp State (from DestinyManager::WarpState inner class)
    // =========================================================================

    /// <summary>
    /// Tracks state during warp travel.
    /// Ported from DestinyManager::WarpState.
    /// </summary>
    public class WarpState
    {
        public float StartTime;
        public double TotalDistance;     // in meters
        public double WarpSpeed;         // in m/s (ship warp AU/s × 1AU)
        public double AccelDistance;      // in meters
        public double CruiseDistance;     // in meters
        public double DecelDistance;      // in meters
        public float WarpTime;           // total warp time in seconds
        public bool IsAccelerating;
        public bool IsCruising;
        public bool IsDecelerating;
        public Vector3 WarpVector;       // normalized direction
        public double DistanceTraveled;  // current progress in meters
    }

    // =========================================================================
    // Ship Movement Parameters
    // =========================================================================

    /// <summary>
    /// All parameters needed for movement calculations.
    /// Derived from ship attributes + Dogma modifiers.
    /// </summary>
    [System.Serializable]
    public class MovementParams
    {
        /// <summary>Ship mass in kg.</summary>
        public float Mass;
        /// <summary>Ship agility (inertia modifier). Higher = slower to turn/accel.</summary>
        public double Agility;
        /// <summary>Ship inertia in s/Mkg (reciprocal of drag coefficient).</summary>
        public double Inertia;
        /// <summary>Max sub-warp speed in m/s.</summary>
        public float MaxShipSpeed;
        /// <summary>Warp speed in AU/s.</summary>
        public float WarpSpeed;
        /// <summary>Capacitor needed to initiate warp (GJ).</summary>
        public double WarpCapacitorNeed;
        /// <summary>Ship radius in meters.</summary>
        public double Radius;

        /// <summary>
        /// Align time in seconds (time to reach 75% max speed for warp entry).
        /// Formula: -ln(0.25) * Agility * Mass / 1e6
        /// </summary>
        public float AlignTime => (float)(-Math.Log(0.25) * Agility * Mass / 1_000_000.0);

        /// <summary>
        /// Maximum acceleration time from 0 to ~100% max speed.
        /// Formula: -log(0.0001) * Agility
        /// </summary>
        public float MaxAccelTime => (float)(-Math.Log(0.0001) * Agility);

        /// <summary>
        /// Speed the ship should be at when exiting warp (75% of max speed).
        /// </summary>
        public float WarpDropSpeed => MaxShipSpeed * MovementConstants.WarpDropSpeedFraction;

        /// <summary>
        /// Time required to accelerate from speed v to speed V.
        /// Formula: t = agility * -ln(1 - v/V)
        /// </summary>
        public float TimeToReachSpeed(float targetSpeedFraction)
        {
            if (targetSpeedFraction >= 1.0f)
                targetSpeedFraction = 0.9999f; // avoid ln(0)
            return (float)(Agility * -Math.Log(1.0 - targetSpeedFraction));
        }
    }

    // =========================================================================
    // Movement State (the runtime state of a moving entity)
    // =========================================================================

    /// <summary>
    /// Runtime movement state for a single entity.
    /// This is the C# equivalent of the DestinyManager instance's member variables.
    /// </summary>
    [System.Serializable]
    public class MovementState
    {
        // --- Mode ---
        public BallMode Mode = BallMode.Stop;

        // --- Position & Velocity ---
        public Vector3 Position;
        public Vector3 Velocity;
        public Vector3 Heading;

        // --- Speed fractions ---
        /// <summary>User-commanded speed fraction (0.0 to 1.0).</summary>
        public float UserSpeedFraction;
        /// <summary>Current active speed fraction (interpolated).</summary>
        public float ActiveSpeedFraction;
        /// <summary>Previous speed fraction (for accel/decel calculation).</summary>
        public float PrevSpeedFraction;
        /// <summary>Current Euler time fraction (0.0 to 1.0).</summary>
        public float TimeFraction;

        // --- Acceleration ---
        public bool IsAccelerating;
        public bool IsDecelerating;
        public float AccelTime;
        public float MaxAccelTime;
        public float PrevSpeed;
        public double MoveStartTime;

        // --- Target ---
        public Vector3 TargetPoint;
        public string TargetEntityId;
        public float TargetDistance;
        public float FollowDistance;
        public float StopDistance;

        // --- Orbit ---
        public OrbitState OrbitState;
        public float OrbitTime;
        public float OrbitRadPerTic;

        // --- Warp ---
        public WarpState Warp;

        // --- Flags ---
        public bool IsCloaked;
        public bool IsFrozen;
        public bool IsStopped => Mode == BallMode.Stop;

        // --- Computed ---
        public float CurrentSpeed => ActiveSpeedFraction * MaxSpeed;
        public float MaxSpeed; // current max speed (may be boosted by prop mod)
        public bool IsMoving => TimeFraction > 0f;
        public bool IsWarping => Warp != null;
    }

    // =========================================================================
    // Core Movement Formulas
    // =========================================================================

    /// <summary>
    /// Pure-function movement calculations ported from DestinyManager.
    /// These are stateless — the caller manages the MovementState.
    /// </summary>
    public static class MovementFormulas
    {
        // =====================================================================
        // Sub-Warp Velocity (from MoveObject)
        // =====================================================================

        /// <summary>
        /// Calculate the Euler time fraction for the current speed transition.
        /// This is the core acceleration formula from EvEmu.
        /// <para>
        /// Formula: timeFraction = 1 - e^(-elapsed / agility)
        /// </para>
        /// </summary>
        /// <param name="elapsedSeconds">Time since speed change started.</param>
        /// <param name="agility">Ship's agility value.</param>
        /// <returns>Time fraction (0.0 to 1.0).</returns>
        public static float CalculateTimeFraction(float elapsedSeconds, double agility)
        {
            if (agility <= 0)
                return 1f;
            return 1f - Mathf.Exp(-elapsedSeconds / (float)agility);
        }

        /// <summary>
        /// Calculate current velocity during acceleration/deceleration.
        /// <para>
        /// Ported from MoveObject() in DestinyManager.cpp.
        /// During accel: speed = prevSpeed + (targetSpeed - prevSpeed) * timeFraction
        /// During decel: speed = prevSpeed - (prevSpeed - targetSpeed) * timeFraction
        /// </para>
        /// </summary>
        public static float CalculateCurrentSpeed(
            float timeFraction,
            float maxShipSpeed,
            float userSpeedFraction,
            float prevSpeedFraction,
            bool isAccelerating)
        {
            float targetSpeed = maxShipSpeed * userSpeedFraction;
            float prevSpeed = maxShipSpeed * prevSpeedFraction;

            if (isAccelerating)
                return prevSpeed + (targetSpeed - prevSpeed) * timeFraction;
            else
                return prevSpeed - (prevSpeed - targetSpeed) * timeFraction;
        }

        /// <summary>
        /// Calculate velocity vector from heading and speed.
        /// <para>
        /// From DestinyManager: m_velocity = m_shipHeading * (ASF * MSS)
        /// </para>
        /// </summary>
        public static Vector3 CalculateVelocity(Vector3 heading, float speed)
        {
            return heading.normalized * speed;
        }

        /// <summary>
        /// Process one tick of sub-warp movement.
        /// This is the main update function, ported from MoveObject().
        /// </summary>
        /// <param name="state">Current movement state (mutated in place).</param>
        /// <param name="shipParams">Ship's movement parameters.</param>
        /// <param name="currentTime">Current time in seconds.</param>
        /// <param name="deltaTime">Time since last tick in seconds.</param>
        public static void ProcessSubWarpTick(
            MovementState state,
            MovementParams shipParams,
            double currentTime,
            float deltaTime)
        {
            if (state.IsFrozen || state.IsWarping)
                return;

            if (state.Mode == BallMode.Stop && !state.IsMoving)
                return;

            // Calculate elapsed time since speed change
            float elapsed = (float)(currentTime - state.MoveStartTime);

            // Calculate time fraction (Euler formula)
            state.TimeFraction = CalculateTimeFraction(elapsed, shipParams.Agility);

            // Check if speed change is complete
            if (elapsed > state.AccelTime && state.TimeFraction > 0.9998f)
            {
                state.ActiveSpeedFraction = state.UserSpeedFraction;
                state.IsAccelerating = false;
                state.IsDecelerating = false;
                state.PrevSpeedFraction = 0f;
                state.PrevSpeed = 0f;

                if (state.UserSpeedFraction <= 0f)
                {
                    // Full stop
                    Halt(state);
                    return;
                }
            }
            else
            {
                // Still changing speed
                float speed = CalculateCurrentSpeed(
                    state.TimeFraction,
                    state.MaxSpeed,
                    state.UserSpeedFraction,
                    state.PrevSpeedFraction,
                    state.IsAccelerating);
                state.ActiveSpeedFraction = speed / state.MaxSpeed;
            }

            // Update velocity and position
            state.Velocity = CalculateVelocity(state.Heading, state.ActiveSpeedFraction * state.MaxSpeed);
            state.Position += state.Velocity * deltaTime;
        }

        // =====================================================================
        // Warp (from InitWarp / WarpAccel / WarpCruise / WarpDecel)
        // =====================================================================

        /// <summary>
        /// Initialize warp travel between two points.
        /// Ported from DestinyManager::InitWarp().
        /// <para>
        /// Warp physics (from CCP dev blog):
        ///   Accel: x = e^(3t), v = 3*e^(3t)   — k=3
        ///   Decel: x = e^(t),  v = e^(t)       — k=1
        /// </para>
        /// </summary>
        /// <param name="state">Movement state to put into warp (mutated).</param>
        /// <param name="shipParams">Ship movement parameters.</param>
        /// <param name="destination">Target point in space.</param>
        /// <param name="currentTime">Current time in seconds.</param>
        /// <returns>The WarpState with computed distances and times.</returns>
        public static WarpState InitiateWarp(
            MovementState state,
            MovementParams shipParams,
            Vector3 destination,
            float currentTime)
        {
            double distance = Vector3.Distance(state.Position, destination);
            double warpSpeedMs = shipParams.WarpSpeed * MovementConstants.OneAUInMeters;

            Vector3 warpVector = (destination - state.Position).normalized;

            double accelDist, decelDist, cruiseDist;
            int accelTime, decelTime;
            float cruiseTime;

            if (distance < warpSpeedMs)
            {
                // Short warp — no cruise phase
                accelDist = distance / 3.0;
                decelDist = distance - accelDist;
                warpSpeedMs = accelDist; // cap to distance
                decelTime = (int)Math.Log(decelDist / 3.0);
                accelTime = (int)(Math.Log(accelDist / 3.0) / 3.0);
                cruiseDist = 0;
                cruiseTime = 0;
            }
            else
            {
                // Normal warp: 7s accel, 21s decel, cruise fills the gap
                accelTime = MovementConstants.BaseWarpAccelTime;
                decelTime = MovementConstants.BaseWarpDecelTime;
                accelDist = Math.Exp(3.0 * accelTime);    // e^(3*7) ≈ 1.59e9 m
                decelDist = Math.Exp(decelTime);           // e^21 ≈ 1.32e9 m
                cruiseDist = distance - accelDist - decelDist;
                cruiseTime = (float)(cruiseDist / warpSpeedMs);
            }

            float totalWarpTime = accelTime + decelTime + Mathf.Floor(cruiseTime);

            var warpState = new WarpState
            {
                StartTime = currentTime,
                TotalDistance = distance,
                WarpSpeed = warpSpeedMs,
                AccelDistance = accelDist,
                CruiseDistance = cruiseDist,
                DecelDistance = decelDist,
                WarpTime = totalWarpTime,
                IsAccelerating = true,
                IsCruising = false,
                IsDecelerating = false,
                WarpVector = warpVector,
                DistanceTraveled = 0
            };

            state.Mode = BallMode.Warp;
            state.Warp = warpState;
            state.Heading = warpVector;
            state.TargetPoint = destination;

            return warpState;
        }

        /// <summary>
        /// Process one tick of warp travel.
        /// Ported from WarpAccel/WarpCruise/WarpDecel in DestinyManager.
        /// </summary>
        public static void ProcessWarpTick(
            MovementState state,
            MovementParams shipParams,
            float currentTime,
            float deltaTime)
        {
            if (state.Warp == null)
                return;

            var warp = state.Warp;
            float elapsed = currentTime - warp.StartTime;

            double currentSpeed;
            double distanceThisTick;

            if (warp.IsAccelerating)
            {
                // Accel: v = 3 * e^(3t)
                currentSpeed = 3.0 * Math.Exp(3.0 * elapsed);
                if (currentSpeed >= warp.WarpSpeed || warp.DistanceTraveled >= warp.AccelDistance)
                {
                    currentSpeed = warp.WarpSpeed;
                    warp.IsAccelerating = false;
                    warp.IsCruising = warp.CruiseDistance > 0;
                    warp.IsDecelerating = warp.CruiseDistance <= 0;
                }
            }
            else if (warp.IsCruising)
            {
                // Cruise: constant speed
                currentSpeed = warp.WarpSpeed;
                if (warp.DistanceTraveled >= warp.AccelDistance + warp.CruiseDistance)
                {
                    warp.IsCruising = false;
                    warp.IsDecelerating = true;
                }
            }
            else if (warp.IsDecelerating)
            {
                // Decel: v = e^(remainingTime)
                double remaining = Math.Max(0, warp.WarpTime - elapsed);
                currentSpeed = Math.Exp(remaining);
                if (currentSpeed <= shipParams.WarpDropSpeed || warp.DistanceTraveled >= warp.TotalDistance)
                {
                    // Warp complete
                    ExitWarp(state, shipParams);
                    return;
                }
            }
            else
            {
                ExitWarp(state, shipParams);
                return;
            }

            // Cap speed to warp speed
            currentSpeed = Math.Min(currentSpeed, warp.WarpSpeed);

            // Update position
            distanceThisTick = currentSpeed * deltaTime;
            warp.DistanceTraveled += distanceThisTick;
            state.Position += warp.WarpVector * (float)distanceThisTick;
            state.Velocity = warp.WarpVector * (float)currentSpeed;
        }

        /// <summary>
        /// Exit warp and return to normal movement.
        /// Ported from WarpStop() in DestinyManager.
        /// </summary>
        public static void ExitWarp(MovementState state, MovementParams shipParams)
        {
            state.Position = state.TargetPoint; // snap to destination
            state.Warp = null;
            state.Mode = BallMode.Stop;
            state.ActiveSpeedFraction = shipParams.WarpDropSpeed / shipParams.MaxShipSpeed;
            state.MaxSpeed = shipParams.MaxShipSpeed;
            state.IsDecelerating = true;
            state.IsAccelerating = false;
            state.PrevSpeed = shipParams.WarpDropSpeed;
            state.PrevSpeedFraction = state.ActiveSpeedFraction;
            state.UserSpeedFraction = 0f;
            state.AccelTime = shipParams.MaxAccelTime * state.ActiveSpeedFraction;
        }

        // =====================================================================
        // Orbit (from DestinyManager::Orbit)
        // =====================================================================

        /// <summary>
        /// Calculate orbit parameters for orbiting a target at a given distance.
        /// Ported from Orbit() in DestinyManager.cpp.
        /// <para>
        /// OrbitTime = 2π * desiredRadius / orbitSpeed
        /// OrbitRadPerTic = 2π / OrbitTime
        /// </para>
        /// </summary>
        public static (float orbitTime, float radPerTic, float maxSpeedFraction) CalculateOrbitParams(
            float desiredDistance,
            float maxShipSpeed,
            double agility,
            float mass)
        {
            // Orbit speed is limited by ship's turning capability
            // From EvEmu: orbit speed ≤ max speed, adjusted by radius
            float circumference = 2f * Mathf.PI * desiredDistance;
            float orbitTime = circumference / maxShipSpeed;

            // Minimum orbit time based on agility (can't turn faster than ship allows)
            float minOrbitTime = (float)(2.0 * Math.PI * agility);
            orbitTime = Mathf.Max(orbitTime, minOrbitTime);

            float radPerTic = 2f * Mathf.PI / orbitTime;
            float actualSpeed = circumference / orbitTime;
            float speedFraction = Mathf.Min(1f, actualSpeed / maxShipSpeed);

            return (orbitTime, radPerTic, speedFraction);
        }

        // =====================================================================
        // Approach / Follow (from DestinyManager::Follow)
        // =====================================================================

        /// <summary>
        /// Calculate heading towards a target point.
        /// From Follow() / GotoPoint() in DestinyManager.
        /// </summary>
        public static Vector3 CalculateApproachHeading(Vector3 currentPosition, Vector3 targetPosition)
        {
            return (targetPosition - currentPosition).normalized;
        }

        /// <summary>
        /// Check if entity has arrived at target (within stop distance).
        /// </summary>
        public static bool HasArrived(Vector3 currentPosition, Vector3 targetPosition, float stopDistance)
        {
            return Vector3.Distance(currentPosition, targetPosition) <= stopDistance;
        }

        // =====================================================================
        // Alignment (from DestinyManager warp alignment check)
        // =====================================================================

        /// <summary>
        /// Check if the ship is aligned to a target direction.
        /// Alignment threshold for warp is 6 degrees, for normal turns is 4 degrees.
        /// Ported from ProcessState() warp alignment check.
        /// </summary>
        public static bool IsAligned(Vector3 heading, Vector3 targetDirection, float thresholdDegrees)
        {
            float dot = Vector3.Dot(heading.normalized, targetDirection.normalized);
            float degrees = Mathf.Acos(Mathf.Clamp(dot, -1f, 1f)) * Mathf.Rad2Deg;
            return degrees < thresholdDegrees;
        }

        /// <summary>
        /// Check if the ship can enter warp (aligned AND at ≥75% speed).
        /// </summary>
        public static bool CanEnterWarp(
            Vector3 heading,
            Vector3 warpDirection,
            float currentSpeedFraction)
        {
            return IsAligned(heading, warpDirection, MovementConstants.WarpAlignment)
                && currentSpeedFraction >= MovementConstants.WarpEntrySpeedFraction;
        }

        // =====================================================================
        // Collision / Bumping (from CheckBump / Bump)
        // =====================================================================

        /// <summary>
        /// Check if two entities are colliding (within bump distance).
        /// Ported from DestinyManager::CheckBump().
        /// </summary>
        public static bool CheckCollision(
            Vector3 posA, float radiusA,
            Vector3 posB, float radiusB)
        {
            float distance = Vector3.Distance(posA, posB);
            float effectiveDistance = distance - radiusA - radiusB;
            return effectiveDistance < MovementConstants.BumpDistance;
        }

        /// <summary>
        /// Calculate bump velocity for the lighter ship.
        /// From bump math by Scheulagh Santorine, Ph.D. (cited in Damage.cpp):
        ///   v2(t=0+) = 2*v1*m1 / (m1+m2)
        /// </summary>
        public static Vector3 CalculateBumpVelocity(
            Vector3 velocity1, float mass1,
            float mass2)
        {
            float factor = 2f * mass1 / (mass1 + mass2);
            return velocity1 * factor;
        }

        // =====================================================================
        // Utility: Command entry points
        // =====================================================================

        /// <summary>
        /// Command: begin moving toward a point.
        /// Ported from DestinyManager::GotoPoint().
        /// </summary>
        public static void BeginGoTo(
            MovementState state,
            MovementParams shipParams,
            Vector3 targetPoint,
            double currentTime)
        {
            state.Mode = BallMode.GoTo;
            state.TargetPoint = targetPoint;
            state.Heading = CalculateApproachHeading(state.Position, targetPoint);
            state.UserSpeedFraction = 1.0f;
            state.PrevSpeedFraction = state.ActiveSpeedFraction;
            state.IsAccelerating = true;
            state.IsDecelerating = false;
            state.AccelTime = shipParams.MaxAccelTime;
            state.MoveStartTime = currentTime;
            state.MaxSpeed = shipParams.MaxShipSpeed;
        }

        /// <summary>
        /// Command: full stop.
        /// Ported from DestinyManager::Stop().
        /// </summary>
        public static void BeginStop(
            MovementState state,
            MovementParams shipParams,
            double currentTime)
        {
            if (state.IsWarping)
                return; // can't stop during warp

            state.Mode = BallMode.Stop;
            state.UserSpeedFraction = 0f;
            state.PrevSpeedFraction = state.ActiveSpeedFraction;
            state.PrevSpeed = state.ActiveSpeedFraction * state.MaxSpeed;
            state.IsAccelerating = false;
            state.IsDecelerating = true;
            state.AccelTime = shipParams.MaxAccelTime * state.ActiveSpeedFraction;
            state.MoveStartTime = currentTime;
        }

        /// <summary>
        /// Force immediate halt (reset all movement vars).
        /// Ported from DestinyManager::Halt().
        /// </summary>
        public static void Halt(MovementState state)
        {
            state.Mode = BallMode.Stop;
            state.Warp = null;
            state.Velocity = Vector3.zero;
            state.MaxSpeed = 0f;
            state.PrevSpeed = 0f;
            state.UserSpeedFraction = 0f;
            state.ActiveSpeedFraction = 0f;
            state.PrevSpeedFraction = 0f;
            state.TimeFraction = 0f;
            state.IsAccelerating = false;
            state.IsDecelerating = false;
            state.TargetEntityId = null;
            state.TargetDistance = 0f;
            state.FollowDistance = 0f;
            state.StopDistance = 0f;
            state.OrbitState = OrbitState.None;
            state.MoveStartTime = 0;
        }
    }
}
