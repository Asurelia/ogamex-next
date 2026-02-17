// =============================================================================
// ACSDefendMission.cs — Allied Combat System defend mission handler
// Port of: src/lib/missions/handlers/ACSDefendMission.ts
// Namespace: OGameX.SharedLib.Missions.Handlers
// =============================================================================

using System;
using System.Collections.Generic;

namespace OGameX.SharedLib.Missions.Handlers
{
    /// <summary>
    /// Handles ACS (Alliance/Allied Combat System) defense missions.
    /// 
    /// Defense fleets join a target planet's forces temporarily:
    /// 1. Fleet arrives at the allied planet
    /// 2. Ships join the planetary defense for a hold period
    /// 3. If attacked during hold, ships participate in defense
    /// 4. After hold time expires, fleet returns automatically
    /// 
    /// ACS defend is different from deployment because:
    /// - Ships remain under original owner's control
    /// - Ships return after hold period (default: 12 hours)
    /// - Can be sent to ANY player's planet (with invitation)
    /// </summary>
    public class ACSDefendMission : BaseMission
    {
        public override MissionType HandlerMissionType => MissionType.ACSDefend;
        public override bool HasReturn => true;
        public override string Name => "ACS Defend";

        // =====================================================================
        // CONSTANTS
        // =====================================================================

        /// <summary>Default hold time at target (in hours).</summary>
        public const double DefaultHoldTimeHours = 12.0;

        /// <summary>Maximum hold time at target (in hours).</summary>
        public const double MaxHoldTimeHours = 32.0;

        // =====================================================================
        // ARRIVAL PROCESSING
        // =====================================================================

        public override MissionArrivalResult ProcessArrival(MissionContext context)
        {
            var mission = context.Mission;
            var targetPlanet = context.TargetPlanet;

            if (targetPlanet == null)
                return ErrorArrival("Target planet not found");

            var ships = GetShips(mission);
            var originCoords = FormatCoords(
                mission.OriginGalaxy, mission.OriginSystem, mission.OriginPosition);
            var targetCoords = FormatCoords(
                mission.DestinationGalaxy, mission.DestinationSystem, mission.DestinationPosition);

            // Calculate hold duration
            double holdHours = GetHoldDuration(context);
            holdHours = Math.Min(holdHours, MaxHoldTimeHours);

            // Build messages
            var messages = new List<MissionMessage>();

            // Notify fleet owner
            messages.Add(CreateMessage(
                mission.UserId,
                MessageType.System,
                "ACS Defense - Fleet Arrived",
                $"Your defense fleet has arrived at {targetCoords} and will hold " +
                $"position for {holdHours:F1} hours.\n\n" +
                $"Ships stationed:\n{ships.FormatList()}"
            ));

            // Notify planet owner (if different)
            if (targetPlanet.UserId != mission.UserId)
            {
                messages.Add(CreateMessage(
                    targetPlanet.UserId,
                    MessageType.System,
                    "ACS Defense - Fleet Arrived",
                    $"An allied fleet from {originCoords} has arrived to defend your planet at {targetCoords}.\n\n" +
                    $"Ships:\n{ships.FormatList()}\n" +
                    $"Hold duration: {holdHours:F1} hours"
                ));
            }

            // The fleet will return after hold time
            // The game layer schedules the return mission with the hold delay
            return SuccessArrival(
                shouldReturn: true,
                returnResources: GetResources(mission),
                returnShips: ships,
                messages: messages
            );
        }

        // =====================================================================
        // RETURN PROCESSING
        // =====================================================================

        public override MissionReturnResult ProcessReturn(MissionContext context)
        {
            var mission = context.Mission;
            var resources = GetResources(mission);

            var originCoords = FormatCoords(
                mission.DestinationGalaxy, mission.DestinationSystem, mission.DestinationPosition);
            var fromCoords = FormatCoords(
                mission.OriginGalaxy, mission.OriginSystem, mission.OriginPosition);

            var message = CreateMessage(
                mission.UserId,
                MessageType.System,
                "ACS Defense - Fleet Returned",
                $"Your defense fleet has completed its station at {fromCoords} " +
                $"and returned to {originCoords}."
            );

            return SuccessReturn(new List<MissionMessage> { message });
        }

        // =====================================================================
        // VIRTUAL HOOKS
        // =====================================================================

        /// <summary>
        /// Get the hold duration in hours for this ACS defense.
        /// Override to read from mission data or ACS group settings.
        /// </summary>
        protected virtual double GetHoldDuration(MissionContext context)
        {
            return DefaultHoldTimeHours;
        }
    }
}
