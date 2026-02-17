// =============================================================================
// MoonDestructionMission.cs — Moon destruction mission handler
// Port of: src/lib/missions/handlers/MoonDestructionMission.ts
// Namespace: OGameX.SharedLib.Missions.Handlers
// =============================================================================

using System;
using System.Collections.Generic;

namespace OGameX.SharedLib.Missions.Handlers
{
    /// <summary>
    /// Handles moon destruction missions using Deathstars (RIPs).
    /// 
    /// OGame formula:
    /// - Moon destruction chance = (100 - sqrt(diameter)) * ripsCount
    ///   Capped at 100%
    /// - RIP (fleet) destruction chance = sqrt(diameter) / 2
    ///   Capped at 50%
    /// 
    /// Possible outcomes:
    /// 1. Moon destroyed, fleet survives → fleet returns
    /// 2. Moon destroyed, fleet destroyed → nothing returns
    /// 3. Moon survives, fleet survives → fleet returns
    /// 4. Moon survives, fleet destroyed → nothing returns
    /// Both moon and fleet destruction are rolled independently.
    /// </summary>
    public class MoonDestructionMission : BaseMission
    {
        public override MissionType HandlerMissionType => MissionType.MoonDestruction;
        public override bool HasReturn => true;
        public override string Name => "Moon Destruction";

        // =====================================================================
        // ARRIVAL PROCESSING
        // =====================================================================

        public override MissionArrivalResult ProcessArrival(MissionContext context)
        {
            var mission = context.Mission;
            var targetPlanet = context.TargetPlanet;

            if (targetPlanet == null)
                return ErrorArrival("Target moon not found");

            // Must target a moon
            if (targetPlanet.Type != PlanetType.Moon)
                return ErrorArrival("Moon destruction can only target moons");

            var ships = GetShips(mission);
            int ripsCount = ships.Deathstar;

            if (ripsCount <= 0)
                return ErrorArrival("Moon destruction requires at least one Deathstar (RIP)");

            var originCoords = FormatCoords(
                mission.OriginGalaxy, mission.OriginSystem, mission.OriginPosition);
            var targetCoords = FormatCoords(
                mission.DestinationGalaxy, mission.DestinationSystem, mission.DestinationPosition);

            // Calculate chances using OGame formula
            int diameter = targetPlanet.Diameter;
            double moonDestroyChance = CalculateMoonDestroyChance(diameter, ripsCount);
            double ripDestroyChance = CalculateRipDestroyChance(diameter);

            // Roll for outcomes
            bool moonDestroyed = RollChance(moonDestroyChance);
            bool ripsDestroyed = RollChance(ripDestroyChance);

            // Build result
            var messages = new List<MissionMessage>();

            // Determine surviving ships
            var survivingShips = ships.Clone();
            if (ripsDestroyed)
            {
                // All deathstars destroyed
                survivingShips.Deathstar = 0;
            }

            bool shouldReturn = survivingShips.GetTotal() > 0;

            // Build report
            string report = BuildDestructionReport(
                originCoords, targetCoords,
                targetPlanet.Name, diameter,
                ripsCount, moonDestroyChance, ripDestroyChance,
                moonDestroyed, ripsDestroyed
            );

            // Message to attacker
            messages.Add(CreateMessage(
                mission.UserId,
                MessageType.Battle,
                "Moon Destruction Report",
                report
            ));

            // Message to defender (moon owner)
            if (targetPlanet.UserId != mission.UserId)
            {
                string defenderReport = BuildDefenderReport(
                    originCoords, targetCoords,
                    targetPlanet.Name, diameter,
                    moonDestroyed, ripsDestroyed
                );

                messages.Add(CreateMessage(
                    targetPlanet.UserId,
                    MessageType.Battle,
                    moonDestroyed ? "Moon Destroyed!" : "Moon Destruction Attempt",
                    defenderReport
                ));
            }

            return SuccessArrival(
                shouldReturn: shouldReturn,
                returnResources: GetResources(mission),
                returnShips: survivingShips,
                messages: messages
            );
        }

        // =====================================================================
        // RETURN PROCESSING
        // =====================================================================

        public override MissionReturnResult ProcessReturn(MissionContext context)
        {
            var mission = context.Mission;

            var originCoords = FormatCoords(
                mission.DestinationGalaxy, mission.DestinationSystem, mission.DestinationPosition);

            var message = CreateMessage(
                mission.UserId,
                MessageType.Battle,
                "Moon Destruction Fleet Returned",
                $"Your moon destruction fleet has returned to {originCoords}."
            );

            return SuccessReturn(new List<MissionMessage> { message });
        }

        // =====================================================================
        // OGame FORMULAS
        // =====================================================================

        /// <summary>
        /// Calculate moon destruction chance.
        /// Formula: (100 - sqrt(diameter)) * ripsCount, capped at 100%.
        /// </summary>
        public static double CalculateMoonDestroyChance(int diameter, int ripsCount)
        {
            double sqrtDiameter = Math.Sqrt(diameter);
            double chance = (100.0 - sqrtDiameter) * ripsCount;
            return Math.Min(chance, MoonDestructionConstants.MaxMoonDestroyChance) / 100.0;
        }

        /// <summary>
        /// Calculate RIP (Deathstar) destruction chance.
        /// Formula: sqrt(diameter) / 2, capped at 50%.
        /// </summary>
        public static double CalculateRipDestroyChance(int diameter)
        {
            double sqrtDiameter = Math.Sqrt(diameter);
            double chance = sqrtDiameter / 2.0;
            return Math.Min(chance, MoonDestructionConstants.MaxRipDestroyChance) / 100.0;
        }

        /// <summary>
        /// Roll a chance (0.0-1.0) and return if it succeeds.
        /// Virtual for deterministic testing.
        /// </summary>
        protected virtual bool RollChance(double chance)
        {
            if (chance <= 0) return false;
            if (chance >= 1.0) return true;
            var random = new Random();
            return random.NextDouble() < chance;
        }

        // =====================================================================
        // REPORT BUILDING
        // =====================================================================

        private string BuildDestructionReport(
            string originCoords, string targetCoords,
            string moonName, int diameter,
            int ripsCount, double moonChance, double ripChance,
            bool moonDestroyed, bool ripsDestroyed)
        {
            return $"Moon Destruction Mission\n" +
                   $"From: {originCoords}\n" +
                   $"Target: {targetCoords} ({moonName})\n" +
                   $"Diameter: {diameter:N0} km\n" +
                   $"Deathstars: {ripsCount}\n\n" +
                   $"Moon destruction chance: {moonChance * 100:F1}%\n" +
                   $"RIP destruction chance: {ripChance * 100:F1}%\n\n" +
                   $"Result:\n" +
                   $"  Moon: {(moonDestroyed ? "DESTROYED" : "Survived")}\n" +
                   $"  Deathstars: {(ripsDestroyed ? "DESTROYED" : "Survived")}";
        }

        private string BuildDefenderReport(
            string originCoords, string targetCoords,
            string moonName, int diameter,
            bool moonDestroyed, bool ripsDestroyed)
        {
            string result;
            if (moonDestroyed)
            {
                result = $"Your moon \"{moonName}\" at {targetCoords} (diameter {diameter:N0} km) " +
                         $"has been destroyed by a fleet from {originCoords}!\n";
            }
            else
            {
                result = $"A fleet from {originCoords} attempted to destroy your moon \"{moonName}\" " +
                         $"at {targetCoords} (diameter {diameter:N0} km) but failed.\n";
            }

            if (ripsDestroyed)
            {
                result += "\nThe attacking Deathstars were destroyed in the process.";
            }
            else
            {
                result += "\nThe attacking fleet survived and is returning.";
            }

            return result;
        }
    }
}
