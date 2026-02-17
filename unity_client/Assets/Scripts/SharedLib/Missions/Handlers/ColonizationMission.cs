// =============================================================================
// ColonizationMission.cs — Colonization mission handler
// Port of: src/lib/missions/handlers/ColonizationMission.ts
// Namespace: OGameX.SharedLib.Missions.Handlers
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Missions.Handlers
{
    /// <summary>
    /// Handles colonization missions that create new planets.
    /// 
    /// Processing flow:
    /// 1. Check colony ship is present in fleet
    /// 2. Validate colony limit (max 9 planets per Astrophysics)
    /// 3. Check target position is unoccupied
    /// 4. Validate position is colonizable (1-15)
    /// 5. Generate planet characteristics (fields, temperature by position)
    /// 6. Create new planet with starting resources
    /// 7. Colony ship is consumed, remaining fleet returns
    /// 
    /// If colonization fails, fleet returns intact with colony ship.
    /// </summary>
    public class ColonizationMission : BaseMission
    {
        public override MissionType HandlerMissionType => MissionType.Colonization;
        public override bool HasReturn => true;
        public override string Name => "Colonization";

        // =====================================================================
        // ARRIVAL PROCESSING
        // =====================================================================

        public override MissionArrivalResult ProcessArrival(MissionContext context)
        {
            var mission = context.Mission;
            var ships = GetShips(mission);
            var resources = GetResources(mission);

            var targetCoords = FormatCoords(
                mission.DestinationGalaxy,
                mission.DestinationSystem,
                mission.DestinationPosition);
            var originCoords = FormatCoords(
                mission.OriginGalaxy,
                mission.OriginSystem,
                mission.OriginPosition);

            var messages = new List<MissionMessage>();

            // --- Validation ---

            // 1. Check colony ship
            if (ships.ColonyShip <= 0)
            {
                messages.Add(CreateMessage(mission.UserId, MessageType.System,
                    "Colonization Failed",
                    $"Your fleet arrived at {targetCoords} but has no colony ship. The fleet is returning."));
                return SuccessArrival(true, resources, ships, messages);
            }

            // 2. Check max colonies (Astrophysics → max planets)
            int maxPlanets = CalculateMaxPlanets(context.AttackerResearch);
            int currentPlanets = GetCurrentPlanetCount(context);
            if (currentPlanets >= maxPlanets)
            {
                messages.Add(CreateMessage(mission.UserId, MessageType.System,
                    "Colonization Failed",
                    $"You have reached the maximum number of colonies ({maxPlanets}). " +
                    $"Research Astrophysics to increase your limit. The fleet is returning from {targetCoords}."));
                return SuccessArrival(true, resources, ships, messages);
            }

            // 3. Check position is unoccupied
            if (context.TargetPlanet != null)
            {
                messages.Add(CreateMessage(mission.UserId, MessageType.System,
                    "Colonization Failed",
                    $"Position {targetCoords} is already occupied. The fleet is returning."));
                return SuccessArrival(true, resources, ships, messages);
            }

            // 4. Validate position is in range
            int pos = mission.DestinationPosition;
            if (pos < 1 || pos > 15)
            {
                messages.Add(CreateMessage(mission.UserId, MessageType.System,
                    "Colonization Failed",
                    $"Position {pos} is not a valid orbital position (1-15). The fleet is returning from {targetCoords}."));
                return SuccessArrival(true, resources, ships, messages);
            }

            // --- Generate planet ---
            var planetData = GeneratePlanetData(
                mission.DestinationGalaxy,
                mission.DestinationSystem,
                mission.DestinationPosition);

            // Consume colony ship
            var returningShips = ships.Clone();
            returningShips.ColonyShip -= 1;

            // Add starting resources to mission cargo for the planet
            var startingResources = ColonizationConstants.ColonyStartingResources;

            // Build success message
            string planetInfo = $"Planet Name: Colony\n" +
                                $"Position: {targetCoords}\n" +
                                $"Fields: {planetData.Fields}\n" +
                                $"Temperature: {planetData.TempMin}°C to {planetData.TempMax}°C\n" +
                                $"Diameter: {planetData.Diameter:N0} km\n\n" +
                                $"Starting Resources:\n{FormatResources(startingResources)}";

            messages.Add(CreateMessage(mission.UserId, MessageType.System,
                "Colonization Successful!",
                $"Your colony ship has successfully established a new colony at {targetCoords}!\n\n{planetInfo}"));

            // Notify virtual hook
            OnColonyCreated(mission.UserId, planetData);

            // Return remaining fleet (minus colony ship) with any resources
            bool shouldReturn = returningShips.GetTotal() > 0;
            return SuccessArrival(shouldReturn, resources, returningShips, messages);
        }

        // =====================================================================
        // RETURN PROCESSING
        // =====================================================================

        public override MissionReturnResult ProcessReturn(MissionContext context)
        {
            var mission = context.Mission;
            var resources = GetResources(mission);

            var originCoords = FormatCoords(
                mission.DestinationGalaxy,
                mission.DestinationSystem,
                mission.DestinationPosition);

            string messageBody = $"Your fleet has returned from colonization mission to {originCoords}";
            if (resources.HasResources())
                messageBody += $" carrying:\n{FormatResources(resources)}";
            else
                messageBody += ".";

            var message = CreateMessage(
                mission.UserId,
                MessageType.System,
                "Colonization Fleet Returned",
                messageBody
            );

            return SuccessReturn(new List<MissionMessage> { message });
        }

        // =====================================================================
        // PLANET GENERATION
        // =====================================================================

        /// <summary>
        /// Generate planet characteristics based on orbital position.
        /// Uses OGame-accurate field/temperature tables from ColonizationConstants.
        /// </summary>
        public PlanetData GeneratePlanetData(int galaxy, int system, int position)
        {
            var random = GetRandom();

            // Get field range for this position
            var fieldRange = ColonizationConstants.FieldsByPosition.ContainsKey(position)
                ? ColonizationConstants.FieldsByPosition[position]
                : (Min: 40, Max: 70);

            // Get temperature range for this position
            var tempRange = ColonizationConstants.TemperatureByPosition.ContainsKey(position)
                ? ColonizationConstants.TemperatureByPosition[position]
                : (Min: 0, Max: 40);

            int fields = random.Next(fieldRange.Min, fieldRange.Max + 1);
            int tempMin = random.Next(tempRange.Min, tempRange.Max);
            int tempMax = tempMin + random.Next(30, 51); // 30-50 degree range

            // Diameter is roughly proportional to fields
            int diameter = (int)(fields * 100 + random.Next(-500, 500));
            diameter = Math.Max(1000, diameter);

            return new PlanetData
            {
                UserId = "",
                Name = "Colony",
                Galaxy = galaxy,
                System = system,
                Position = position,
                Type = PlanetType.Planet,
                Fields = fields,
                TempMin = tempMin,
                TempMax = tempMax,
                Diameter = diameter,
                Metal = ColonizationConstants.ColonyStartingResources.Metal,
                Crystal = ColonizationConstants.ColonyStartingResources.Crystal,
                Deuterium = ColonizationConstants.ColonyStartingResources.Deuterium,
            };
        }

        /// <summary>
        /// Calculate the maximum number of planets a player can have.
        /// Formula: 1 (home) + floor(astrophysics / 2) + 1
        /// Max: ColonizationConstants.MaxPlanets
        /// </summary>
        public static int CalculateMaxPlanets(UserResearch? research)
        {
            int astroLevel = research?.Astrophysics ?? 0;
            int max = 1 + (int)Math.Floor(astroLevel / 2.0) + 1;
            return Math.Min(max, ColonizationConstants.MaxPlanets);
        }

        // =====================================================================
        // VIRTUAL HOOKS
        // =====================================================================

        /// <summary>
        /// Get the current number of planets for this player.
        /// Override in game layer to query actual data.
        /// Default: 1 (homeworld only).
        /// </summary>
        protected virtual int GetCurrentPlanetCount(MissionContext context)
        {
            return 1;
        }

        /// <summary>
        /// Called when a new colony is successfully created.
        /// Override in game layer to insert the planet into DB.
        /// </summary>
        protected virtual void OnColonyCreated(string userId, PlanetData planetData)
        {
            // Override to create the planet in your data store
        }

        /// <summary>
        /// Get a random number generator.
        /// Virtual for deterministic testing.
        /// </summary>
        protected virtual Random GetRandom()
        {
            return new Random();
        }
    }
}
