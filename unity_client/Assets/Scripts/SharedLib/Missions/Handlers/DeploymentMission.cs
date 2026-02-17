// =============================================================================
// DeploymentMission.cs — Deployment (stationing) mission handler
// Port of: src/lib/missions/handlers/DeploymentMission.ts
// Namespace: OGameX.SharedLib.Missions.Handlers
// =============================================================================

using System.Collections.Generic;

namespace OGameX.SharedLib.Missions.Handlers
{
    /// <summary>
    /// Handles deployment missions (fleet save / stationing).
    /// - On arrival: ships and resources are permanently added to target planet
    /// - No return trip — ships stay at the target
    /// Deployment can ONLY be sent to your OWN planets/moons.
    /// </summary>
    public class DeploymentMission : BaseMission
    {
        public override MissionType HandlerMissionType => MissionType.Deployment;
        public override bool HasReturn => false;
        public override string Name => "Deployment";

        /// <summary>
        /// Process deployment mission arrival.
        /// 1. Verify target belongs to same player
        /// 2. Add ships permanently to target planet
        /// 3. Add resources to target planet
        /// 4. Send arrival message
        /// 5. No return trip
        /// </summary>
        public override MissionArrivalResult ProcessArrival(MissionContext context)
        {
            var mission = context.Mission;
            var targetPlanet = context.TargetPlanet;

            if (targetPlanet == null)
                return ErrorArrival("Target planet not found");

            // Verify target belongs to the same player
            if (targetPlanet.UserId != mission.UserId)
                return ErrorArrival("Deployment can only be sent to your own planets");

            var resources = GetResources(mission);
            var ships = GetShips(mission);

            // Format coordinates
            var originCoords = FormatCoords(
                mission.OriginGalaxy, mission.OriginSystem, mission.OriginPosition);
            var targetCoords = FormatCoords(
                mission.DestinationGalaxy, mission.DestinationSystem, mission.DestinationPosition);

            // Build ship list
            string shipList = ships.FormatList();

            // Build message body
            string messageBody = $"Your fleet has been deployed from {originCoords} to {targetCoords}.\n\n" +
                                 $"Ships stationed:\n{shipList}\n";

            if (resources.HasResources())
            {
                messageBody += $"\nResources delivered:\n{FormatResources(resources)}";
            }

            var message = CreateMessage(
                mission.UserId,
                MessageType.Transport,
                "Fleet Deployed",
                messageBody
            );

            // No return — ships stay at target
            return SuccessArrival(
                shouldReturn: false,
                returnResources: Resources.Empty(),
                returnShips: ShipCounts.Empty(),
                messages: new List<MissionMessage> { message }
            );
        }

        /// <summary>
        /// Process deployment return (only for cancelled/recalled deployments).
        /// </summary>
        public override MissionReturnResult ProcessReturn(MissionContext context)
        {
            var mission = context.Mission;
            var originPlanet = context.OriginPlanet;

            if (originPlanet == null)
                return ErrorReturn("Origin planet not found");

            var targetCoords = FormatCoords(
                mission.OriginGalaxy, mission.OriginSystem, mission.OriginPosition);
            var originCoords = FormatCoords(
                mission.DestinationGalaxy, mission.DestinationSystem, mission.DestinationPosition);

            var message = CreateMessage(
                mission.UserId,
                MessageType.Transport,
                "Fleet Returned",
                $"Your recalled deployment fleet has returned from {targetCoords} to {originCoords}."
            );

            return SuccessReturn(new List<MissionMessage> { message });
        }
    }
}
