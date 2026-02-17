// =============================================================================
// TransportMission.cs — Transport mission handler
// Port of: src/lib/missions/handlers/TransportMission.ts
// Namespace: OGameX.SharedLib.Missions.Handlers
// =============================================================================

using System.Collections.Generic;

namespace OGameX.SharedLib.Missions.Handlers
{
    /// <summary>
    /// Handles transport missions that deliver resources to another planet.
    /// - On arrival: delivers resources to target planet, fleet returns empty
    /// - On return: fleet returns to origin planet
    /// Transport missions can be sent to any planet (own or other players').
    /// </summary>
    public class TransportMission : BaseMission
    {
        public override MissionType HandlerMissionType => MissionType.Transport;
        public override bool HasReturn => true;
        public override string Name => "Transport";

        /// <summary>
        /// Process transport mission arrival.
        /// 1. Deliver resources to target planet
        /// 2. Send messages to both players (if different)
        /// 3. Fleet returns empty
        /// </summary>
        public override MissionArrivalResult ProcessArrival(MissionContext context)
        {
            var mission = context.Mission;
            var targetPlanet = context.TargetPlanet;

            // Target planet must exist
            if (targetPlanet == null)
                return ErrorArrival("Target planet not found");

            var resources = GetResources(mission);
            var ships = GetShips(mission);

            // Format coordinates
            var originCoords = FormatCoords(
                mission.OriginGalaxy, mission.OriginSystem, mission.OriginPosition);
            var targetCoords = FormatCoords(
                mission.DestinationGalaxy, mission.DestinationSystem, mission.DestinationPosition);

            // Create messages
            var messages = new List<MissionMessage>();

            // Message to fleet owner
            messages.Add(CreateMessage(
                mission.UserId,
                MessageType.Transport,
                "Transport Arrived",
                $"Your transport fleet has arrived at {targetCoords} and delivered:\n" +
                FormatResources(resources) + "\n" +
                $"The fleet is now returning to {originCoords}."
            ));

            // If target is a different player, notify them too
            if (targetPlanet.UserId != mission.UserId)
            {
                messages.Add(CreateMessage(
                    targetPlanet.UserId,
                    MessageType.Transport,
                    "Transport Received",
                    $"A transport fleet from {originCoords} has delivered resources to your planet {targetCoords}:\n" +
                    FormatResources(resources)
                ));
            }

            // Return with ships but no resources (all delivered)
            return SuccessArrival(
                shouldReturn: true,
                returnResources: Resources.Empty(),
                returnShips: ships,
                messages: messages
            );
        }

        /// <summary>
        /// Process transport mission return.
        /// 1. Add ships back to origin planet
        /// 2. Send return message
        /// </summary>
        public override MissionReturnResult ProcessReturn(MissionContext context)
        {
            var mission = context.Mission;
            var originPlanet = context.OriginPlanet;

            if (originPlanet == null)
                return ErrorReturn("Origin planet not found");

            var originCoords = FormatCoords(
                mission.DestinationGalaxy, mission.DestinationSystem, mission.DestinationPosition);
            var returnFromCoords = FormatCoords(
                mission.OriginGalaxy, mission.OriginSystem, mission.OriginPosition);

            var message = CreateMessage(
                mission.UserId,
                MessageType.Transport,
                "Fleet Returned",
                $"Your fleet has returned from transport mission to {returnFromCoords} and arrived at {originCoords}."
            );

            return SuccessReturn(new List<MissionMessage> { message });
        }
    }
}
