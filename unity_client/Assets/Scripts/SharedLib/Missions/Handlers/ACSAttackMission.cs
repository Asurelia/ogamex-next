// =============================================================================
// ACSAttackMission.cs — Allied Combat System attack mission handler
// Port of: src/lib/missions/handlers/ACSAttackMission.ts
// Namespace: OGameX.SharedLib.Missions.Handlers
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Missions.Handlers
{
    /// <summary>
    /// Handles ACS (Alliance/Allied Combat System) attack missions.
    /// 
    /// ACS attacks coordinate multiple fleets from different players
    /// to attack a single target simultaneously. Flow:
    /// 1. Each ACS participant sends a fleet with mission type ACSAttack
    /// 2. All fleets share an ACS group ID
    /// 3. When the last fleet arrives (or timeout), battle executes
    /// 4. Battle includes all participating attacker fleets vs. defender
    /// 5. Loot is distributed among attackers proportionally
    /// 6. Each fleet returns independently with their share
    /// 
    /// Note: The ACS coordination logic (waiting, grouping) is handled
    /// at the data layer. This handler processes the actual combat once
    /// all participants have arrived.
    /// </summary>
    public class ACSAttackMission : BaseMission
    {
        public override MissionType HandlerMissionType => MissionType.ACSAttack;
        public override bool HasReturn => true;
        public override string Name => "ACS Attack";

        // =====================================================================
        // ACS GROUP TYPES
        // =====================================================================

        /// <summary>Represents a participating fleet in an ACS attack.</summary>
        public class ACSParticipant
        {
            public string UserId { get; set; } = "";
            public FleetMission Mission { get; set; } = new();
            public ShipCounts Ships { get; set; } = new();
            public UserResearch? Research { get; set; }
        }

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

            // In a full implementation, we check if all ACS members have arrived
            // For the shared library, we process this fleet's contribution
            var isACSReady = CheckACSGroupReady(context);

            if (!isACSReady)
            {
                // Not all participants arrived yet — mark as waiting
                var waitMsg = CreateMessage(
                    mission.UserId,
                    MessageType.Battle,
                    "ACS Attack - Waiting",
                    $"Your fleet has arrived at {targetCoords} and is waiting for allied fleets."
                );

                return SuccessArrival(
                    shouldReturn: false,
                    messages: new List<MissionMessage> { waitMsg }
                );
            }

            // All participants ready — execute combined attack
            var participants = GetACSParticipants(context);
            var combinedResult = ExecuteACSBattle(participants, targetPlanet, context);

            // Distribute loot proportionally among participants
            var lootShare = DistributeLoot(
                combinedResult.Loot, mission, participants);

            // Build messages
            var messages = new List<MissionMessage>();

            // Report for this participant
            messages.Add(CreateMessage(
                mission.UserId,
                MessageType.Battle,
                "ACS Attack Report",
                $"ACS attack at {targetCoords}\n\n" +
                $"Participants: {participants.Count}\n" +
                $"Result: {FormatBattleWinner(combinedResult.Winner)}\n\n" +
                $"Your loot share:\n{FormatResources(lootShare)}\n\n" +
                $"Total rounds: {combinedResult.TotalRounds}"
            ));

            // Report for defender
            if (targetPlanet.UserId != mission.UserId)
            {
                messages.Add(CreateMessage(
                    targetPlanet.UserId,
                    MessageType.Battle,
                    "ACS Attack Report (Defense)",
                    $"An ACS attack from {participants.Count} fleets hit your planet at {targetCoords}.\n\n" +
                    $"Result: {FormatBattleWinner(combinedResult.Winner)}\n\n" +
                    $"Your losses:\n{FormatShipLosses(combinedResult.DefenderShipLosses)}"
                ));
            }

            return SuccessArrival(
                shouldReturn: true,
                returnResources: lootShare,
                returnShips: GetSurvivingShips(ships, combinedResult),
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

            string messageBody = $"Your ACS attack fleet has returned to {originCoords}";
            if (resources.HasResources())
                messageBody += $" carrying loot:\n{FormatResources(resources)}";
            else
                messageBody += ".";

            var message = CreateMessage(
                mission.UserId,
                MessageType.Battle,
                "ACS Fleet Returned",
                messageBody
            );

            return SuccessReturn(new List<MissionMessage> { message });
        }

        // =====================================================================
        // ACS GROUP COORDINATION (Virtual hooks)
        // =====================================================================

        /// <summary>
        /// Check if all ACS group participants have arrived.
        /// Override in game layer with actual group tracking.
        /// Default: always ready (single-fleet).
        /// </summary>
        protected virtual bool CheckACSGroupReady(MissionContext context)
        {
            return true;
        }

        /// <summary>
        /// Get all participant fleets for this ACS group.
        /// Override in game layer to fetch grouped fleets.
        /// Default: just the current mission.
        /// </summary>
        protected virtual List<ACSParticipant> GetACSParticipants(MissionContext context)
        {
            return new List<ACSParticipant>
            {
                new ACSParticipant
                {
                    UserId = context.Mission.UserId,
                    Mission = context.Mission,
                    Ships = GetShips(context.Mission),
                    Research = context.AttackerResearch,
                }
            };
        }

        /// <summary>
        /// Execute the combined ACS battle.
        /// Override with real battle engine. Default: attacker wins.
        /// </summary>
        protected virtual MissionBattleResult ExecuteACSBattle(
            List<ACSParticipant> attackers,
            PlanetData defender,
            MissionContext context)
        {
            // Default stub — merge all attacker ships and simulate
            var combined = ShipCounts.Empty();
            foreach (var p in attackers)
                combined.AddAll(p.Ships);

            return new MissionBattleResult
            {
                Winner = BattleWinner.Attacker,
                TotalRounds = 1,
                AttackerRemainingShips = combined,
                DefenderRemainingShips = ShipCounts.Empty(),
                AttackerShipLosses = ShipCounts.Empty(),
                DefenderShipLosses = defender.Ships.Clone(),
                Loot = new Resources(
                    Math.Floor(defender.Metal * 0.5),
                    Math.Floor(defender.Crystal * 0.5),
                    Math.Floor(defender.Deuterium * 0.5)
                ),
            };
        }

        // =====================================================================
        // LOOT DISTRIBUTION
        // =====================================================================

        /// <summary>
        /// Distribute loot proportionally based on each participant's fleet value.
        /// </summary>
        protected Resources DistributeLoot(
            Resources totalLoot,
            FleetMission thisFleet,
            List<ACSParticipant> participants)
        {
            if (participants.Count <= 1)
                return totalLoot;

            // Calculate fleet "power" for each participant (simple ship count)
            int totalPower = participants.Sum(p => p.Ships.GetTotal());
            if (totalPower == 0) totalPower = 1;

            int thisPower = GetShips(thisFleet).GetTotal();
            double share = (double)thisPower / totalPower;

            return new Resources(
                Math.Floor(totalLoot.Metal * share),
                Math.Floor(totalLoot.Crystal * share),
                Math.Floor(totalLoot.Deuterium * share)
            );
        }

        // =====================================================================
        // HELPERS
        // =====================================================================

        /// <summary>Get surviving ships for this fleet from combined result.</summary>
        private ShipCounts GetSurvivingShips(
            ShipCounts originalShips,
            MissionBattleResult result)
        {
            // Simplified: proportional survival based on total losses
            // Real impl should track per-fleet losses
            var remaining = originalShips.Clone();
            int totalOriginal = originalShips.GetTotal();
            if (totalOriginal == 0) return remaining;

            int totalRemaining = result.AttackerRemainingShips.GetTotal();
            int totalSent = 0;
            foreach (var ship in ShipCounts.AllTypes)
                totalSent += result.AttackerRemainingShips.Get(ship) + result.AttackerShipLosses.Get(ship);

            if (totalSent == 0) return remaining;

            double survivalRate = (double)totalRemaining / totalSent;
            foreach (var t in ShipCounts.AllTypes)
            {
                int original = originalShips.Get(t);
                remaining.Set(t, (int)Math.Floor(original * survivalRate));
            }

            return remaining;
        }

        private string FormatBattleWinner(BattleWinner winner) => winner switch
        {
            BattleWinner.Attacker => "Attacker wins!",
            BattleWinner.Defender => "Defender wins!",
            BattleWinner.Draw => "Draw",
            _ => "Unknown",
        };
    }
}
