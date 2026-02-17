// =============================================================================
// BaseMission.cs — Abstract base class for all mission handlers
// Port of: src/lib/missions/BaseMission.ts
// Namespace: OGameX.SharedLib.Missions
// =============================================================================

using System;
using System.Collections.Generic;

namespace OGameX.SharedLib.Missions
{
    /// <summary>
    /// Abstract base class for all mission handlers.
    /// Provides common functionality for mission processing including:
    /// - Resource and ship extraction from missions
    /// - Return mission creation
    /// - Message creation utilities
    /// - Result factory methods
    /// 
    /// DB operations are virtual stubs — override in Unity game layer.
    /// </summary>
    public abstract class BaseMission : IMissionHandler
    {
        public abstract MissionType HandlerMissionType { get; }
        public abstract bool HasReturn { get; }
        public abstract string Name { get; }

        // =====================================================================
        // ABSTRACT METHODS — Must be implemented by child classes
        // =====================================================================

        public abstract MissionArrivalResult ProcessArrival(MissionContext context);
        public abstract MissionReturnResult ProcessReturn(MissionContext context);

        // =====================================================================
        // RESOURCE / SHIP EXTRACTION
        // =====================================================================

        /// <summary>Extract resources from a fleet mission.</summary>
        protected Resources GetResources(FleetMission mission)
        {
            return mission.CargoResources?.Clone() ?? Resources.Empty();
        }

        /// <summary>Extract ship counts from a fleet mission.</summary>
        protected ShipCounts GetShips(FleetMission mission)
        {
            return mission.Ships?.Clone() ?? ShipCounts.Empty();
        }

        // =====================================================================
        // RETURN MISSION HELPERS
        // =====================================================================

        /// <summary>
        /// Create a return mission data object from the current mission.
        /// Swaps origin/destination and calculates return timing.
        /// </summary>
        protected FleetMission CreateReturnMissionData(
            FleetMission mission,
            Resources resources,
            ShipCounts ships)
        {
            // Calculate one-way duration
            var oneWayDuration = mission.ArrivesAt - mission.DepartedAt;

            // Return departure = arrival time, return arrival = departure + one-way
            var returnDeparture = mission.ArrivesAt;
            var returnArrival = returnDeparture + oneWayDuration;

            return new FleetMission
            {
                UserId = mission.UserId,
                // Keep original origin planet for return
                OriginPlanetId = mission.OriginPlanetId,
                // Swap origin and destination coordinates
                OriginGalaxy = mission.DestinationGalaxy,
                OriginSystem = mission.DestinationSystem,
                OriginPosition = mission.DestinationPosition,
                DestinationGalaxy = mission.OriginGalaxy,
                DestinationSystem = mission.OriginSystem,
                DestinationPosition = mission.OriginPosition,
                DestinationType = PlanetType.Planet,
                MissionTypeValue = mission.MissionTypeValue,
                // Ships
                Ships = ships.Clone(),
                // Resources
                CargoResources = resources.Clone(),
                // Timing
                DepartedAt = returnDeparture,
                ArrivesAt = returnArrival,
                ReturnsAt = null,
                // Status
                IsReturning = true,
                Processed = false,
                Cancelled = false,
            };
        }

        /// <summary>
        /// Check if a return mission should be created (has surviving ships).
        /// </summary>
        protected bool ShouldCreateReturn(ShipCounts ships)
        {
            return ships.GetTotal() > 0;
        }

        // =====================================================================
        // MESSAGE HELPERS
        // =====================================================================

        /// <summary>Create a system message for a user.</summary>
        protected MissionMessage CreateMessage(
            string userId,
            MessageType type,
            string subject,
            string body)
        {
            return new MissionMessage
            {
                Recipient = MessageRecipient.Origin,
                UserId = userId,
                Type = type,
                Subject = subject,
                Body = body,
            };
        }

        // =====================================================================
        // RESULT FACTORY METHODS
        // =====================================================================

        /// <summary>Create a success result for arrival.</summary>
        protected MissionArrivalResult SuccessArrival(
            bool shouldReturn,
            Resources? returnResources = null,
            ShipCounts? returnShips = null,
            List<MissionMessage>? messages = null,
            List<MissionUpdate>? updates = null)
        {
            return new MissionArrivalResult
            {
                Success = true,
                ShouldReturn = shouldReturn,
                ReturnResources = returnResources ?? Resources.Empty(),
                ReturnShips = returnShips ?? ShipCounts.Empty(),
                Messages = messages ?? new List<MissionMessage>(),
                Updates = updates ?? new List<MissionUpdate>(),
            };
        }

        /// <summary>Create an error result for arrival.</summary>
        protected MissionArrivalResult ErrorArrival(string error)
        {
            return new MissionArrivalResult
            {
                Success = false,
                ShouldReturn = false,
                ReturnResources = Resources.Empty(),
                ReturnShips = ShipCounts.Empty(),
                Messages = new List<MissionMessage>(),
                Updates = new List<MissionUpdate>(),
                Error = error,
            };
        }

        /// <summary>Create a success result for return.</summary>
        protected MissionReturnResult SuccessReturn(
            List<MissionMessage>? messages = null,
            List<MissionUpdate>? updates = null)
        {
            return new MissionReturnResult
            {
                Success = true,
                Messages = messages ?? new List<MissionMessage>(),
                Updates = updates ?? new List<MissionUpdate>(),
            };
        }

        /// <summary>Create an error result for return.</summary>
        protected MissionReturnResult ErrorReturn(string error)
        {
            return new MissionReturnResult
            {
                Success = false,
                Messages = new List<MissionMessage>(),
                Updates = new List<MissionUpdate>(),
                Error = error,
            };
        }

        // =====================================================================
        // UTILITY METHODS
        // =====================================================================

        /// <summary>Format coordinates for display in messages.</summary>
        protected string FormatCoords(int galaxy, int system, int position)
        {
            return new Coordinates(galaxy, system, position).Format();
        }

        /// <summary>Format a snake_case key to Title Case display name.</summary>
        protected string FormatKeyName(string key)
        {
            if (string.IsNullOrEmpty(key)) return key;
            var words = key.Split('_');
            for (int i = 0; i < words.Length; i++)
            {
                if (words[i].Length > 0)
                    words[i] = char.ToUpper(words[i][0]) + words[i].Substring(1);
            }
            return string.Join(" ", words);
        }

        /// <summary>Format resource amounts for a message body.</summary>
        protected string FormatResources(Resources resources)
        {
            return $"Metal: {resources.Metal:N0}\nCrystal: {resources.Crystal:N0}\nDeuterium: {resources.Deuterium:N0}";
        }

        /// <summary>Format ship losses for a message (non-zero entries only).</summary>
        protected string FormatShipLosses(ShipCounts ships)
        {
            var lines = new List<string>();
            foreach (var t in ShipCounts.AllTypes)
            {
                int count = ships.Get(t);
                if (count > 0)
                    lines.Add($"{ShipCounts.DisplayNames[t]}: {count:N0}");
            }
            return lines.Count > 0 ? string.Join("\n", lines) : "None";
        }

        /// <summary>Format defense losses for a message (non-zero entries only).</summary>
        protected string FormatDefenseLosses(Dictionary<string, int> defense)
        {
            var lines = new List<string>();
            foreach (var kv in defense)
            {
                if (kv.Value > 0)
                {
                    string name = DefenseKeys.DisplayNames.ContainsKey(kv.Key)
                        ? DefenseKeys.DisplayNames[kv.Key]
                        : FormatKeyName(kv.Key);
                    lines.Add($"{name}: {kv.Value:N0}");
                }
            }
            return lines.Count > 0 ? string.Join("\n", lines) : "None";
        }
    }
}
