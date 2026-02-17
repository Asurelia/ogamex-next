// =============================================================================
// RecycleMission.cs — Recycler debris collection mission handler
// Port of: src/lib/missions/handlers/RecycleMission.ts
// Namespace: OGameX.SharedLib.Missions.Handlers
// =============================================================================

using System;
using System.Collections.Generic;

namespace OGameX.SharedLib.Missions.Handlers
{
    /// <summary>
    /// Handles recycling missions that collect debris from debris fields.
    /// - On arrival: collects metal/crystal from debris field up to recycler capacity
    /// - On return: delivers collected resources to origin planet
    /// 
    /// Recycler capacity: 20,000 per recycler ship.
    /// If capacity &lt; total debris, collects proportionally (50/50 split).
    /// </summary>
    public class RecycleMission : BaseMission
    {
        public override MissionType HandlerMissionType => MissionType.Recycle;
        public override bool HasReturn => true;
        public override string Name => "Recycle";

        /// <summary>
        /// Process recycle mission arrival at debris field.
        /// 1. Calculate recycling capacity
        /// 2. Collect resources (proportional if capacity &lt; debris)
        /// 3. Create return mission with collected resources
        /// </summary>
        public override MissionArrivalResult ProcessArrival(MissionContext context)
        {
            var mission = context.Mission;
            var ships = GetShips(mission);
            var resources = GetResources(mission);

            // Calculate recycler capacity
            int recyclerCount = ships.Recycler;
            if (recyclerCount <= 0)
            {
                var noRecyclerMsg = CreateMessage(
                    mission.UserId,
                    MessageType.System,
                    "Recycle Mission Failed",
                    $"Your fleet arrived at {FormatCoords(mission.DestinationGalaxy, mission.DestinationSystem, mission.DestinationPosition)} but had no recyclers."
                );
                return SuccessArrival(true, resources, ships, new List<MissionMessage> { noRecyclerMsg });
            }

            long totalCapacity = (long)recyclerCount * RecyclerConstants.CapacityPerRecycler;

            // The debris field data should be provided via TargetPlanet or context
            // In the pure-logic port, we simulate against any debris data present
            // The game layer will populate context.TargetPlanet with debris info
            var targetCoords = FormatCoords(
                mission.DestinationGalaxy, mission.DestinationSystem, mission.DestinationPosition);

            // If no debris field data available, return with what we have
            if (context.TargetPlanet == null)
            {
                var noDebrisMsg = CreateMessage(
                    mission.UserId,
                    MessageType.System,
                    "Recycling - No Debris",
                    $"Your recyclers arrived at {targetCoords} but found no debris field. The fleet is returning."
                );
                return SuccessArrival(true, resources, ships, new List<MissionMessage> { noDebrisMsg });
            }

            // Extract debris from target planet data (metal/crystal fields)
            double debrisMetal = context.TargetPlanet.Metal;
            double debrisCrystal = context.TargetPlanet.Crystal;
            double totalDebris = debrisMetal + debrisCrystal;

            if (totalDebris <= 0)
            {
                var emptyDebrisMsg = CreateMessage(
                    mission.UserId,
                    MessageType.System,
                    "Recycling - Empty Debris",
                    $"Your recyclers arrived at {targetCoords} but the debris field was empty. The fleet is returning."
                );
                return SuccessArrival(true, resources, ships, new List<MissionMessage> { emptyDebrisMsg });
            }

            // Harvest debris
            var collection = HarvestDebris(debrisMetal, debrisCrystal, totalCapacity);

            // Add collected resources to return cargo
            var returnResources = resources.Clone();
            returnResources.Metal += collection.MetalCollected;
            returnResources.Crystal += collection.CrystalCollected;

            // Build message
            string messageBody = $"Your recyclers at {targetCoords} have collected:\n" +
                                 $"Metal: {collection.MetalCollected:N0}\n" +
                                 $"Crystal: {collection.CrystalCollected:N0}\n";

            if (!collection.FieldDepleted)
            {
                messageBody += $"\nRemaining debris:\n" +
                               $"Metal: {collection.MetalRemaining:N0}\n" +
                               $"Crystal: {collection.CrystalRemaining:N0}";
            }
            else
            {
                messageBody += "\nThe debris field has been fully collected.";
            }

            var message = CreateMessage(
                mission.UserId,
                MessageType.System,
                "Recycling Report",
                messageBody
            );

            return SuccessArrival(
                shouldReturn: true,
                returnResources: returnResources,
                returnShips: ships,
                messages: new List<MissionMessage> { message }
            );
        }

        /// <summary>
        /// Process recycle mission return.
        /// </summary>
        public override MissionReturnResult ProcessReturn(MissionContext context)
        {
            var mission = context.Mission;
            var originPlanet = context.OriginPlanet;

            if (originPlanet == null)
                return ErrorReturn("Origin planet not found");

            var resources = GetResources(mission);
            var targetCoords = FormatCoords(
                mission.OriginGalaxy, mission.OriginSystem, mission.OriginPosition);

            string messageBody = $"Your recycler fleet has returned from {targetCoords}";

            if (resources.HasResources())
            {
                messageBody += $" carrying:\n{FormatResources(resources)}";
            }
            else
            {
                messageBody += ".";
            }

            var message = CreateMessage(
                mission.UserId,
                MessageType.System,
                "Recyclers Returned",
                messageBody
            );

            return SuccessReturn(new List<MissionMessage> { message });
        }

        // =====================================================================
        // DEBRIS HARVESTING LOGIC
        // =====================================================================

        /// <summary>
        /// Harvest debris from a debris field based on recycler capacity.
        /// If capacity is less than total debris, collects proportionally (50/50 split).
        /// </summary>
        private DebrisCollectionResult HarvestDebris(
            double debrisMetal,
            double debrisCrystal,
            long capacity)
        {
            double totalDebris = debrisMetal + debrisCrystal;

            if (capacity >= totalDebris)
            {
                // Collect everything
                return new DebrisCollectionResult
                {
                    MetalCollected = debrisMetal,
                    CrystalCollected = debrisCrystal,
                    MetalRemaining = 0,
                    CrystalRemaining = 0,
                    FieldDepleted = true,
                };
            }

            // Proportional collection — split capacity 50/50
            double halfCapacity = capacity / 2.0;

            double metalCollected, crystalCollected;

            if (debrisMetal >= halfCapacity && debrisCrystal >= halfCapacity)
            {
                // Both types have enough — take half capacity from each
                metalCollected = halfCapacity;
                crystalCollected = halfCapacity;
            }
            else if (debrisMetal < halfCapacity)
            {
                // Take all metal, rest from crystal
                metalCollected = debrisMetal;
                crystalCollected = Math.Min(debrisCrystal, capacity - metalCollected);
            }
            else
            {
                // Take all crystal, rest from metal
                crystalCollected = debrisCrystal;
                metalCollected = Math.Min(debrisMetal, capacity - crystalCollected);
            }

            return new DebrisCollectionResult
            {
                MetalCollected = metalCollected,
                CrystalCollected = crystalCollected,
                MetalRemaining = debrisMetal - metalCollected,
                CrystalRemaining = debrisCrystal - crystalCollected,
                FieldDepleted = false,
            };
        }
    }
}
