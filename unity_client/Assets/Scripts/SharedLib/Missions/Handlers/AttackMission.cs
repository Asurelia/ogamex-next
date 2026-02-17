// =============================================================================
// AttackMission.cs — Attack mission handler
// Port of: src/lib/missions/handlers/AttackMission.ts
// Namespace: OGameX.SharedLib.Missions.Handlers
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Missions.Handlers
{
    /// <summary>
    /// Handles attack missions against other players' planets.
    /// 
    /// Processing flow:
    /// 1. Build attacker fleet from mission ships + tech
    /// 2. Build defender fleet from planet ships + defense + tech
    /// 3. Run battle simulation (calls virtual SimulateBattle)
    /// 4. Calculate loot from target planet resources
    /// 5. Generate debris field from losses
    /// 6. Check for moon creation (debris threshold)
    /// 7. Create battle report messages for both sides
    /// 8. Create return mission with surviving ships + loot
    /// 
    /// The actual battle simulation is delegated to a virtual method
    /// so the game layer can plug in OGameBattleEngine or AdvancedBattleEngine.
    /// </summary>
    public class AttackMission : BaseMission
    {
        public override MissionType HandlerMissionType => MissionType.Attack;
        public override bool HasReturn => true;
        public override string Name => "Attack";

        // =====================================================================
        // CONSTANTS
        // =====================================================================

        /// <summary>Loot percentage of defender's resources.</summary>
        public const double LootPercentage = 0.50;

        /// <summary>Debris field percentage of lost units' structural cost.</summary>
        public const double DebrisPercentage = 0.30;

        /// <summary>Moon chance increment per 100k debris (1%).</summary>
        public const double MoonChancePer100KDebris = 0.01;

        /// <summary>Maximum moon creation chance.</summary>
        public const double MaxMoonChance = 0.20;

        /// <summary>Default moon size if created.</summary>
        public const int DefaultMoonDiameter = 8366;

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

            // Build attacker and defender fleets
            var attackerFleet = BuildAttackerFleet(mission, context.AttackerResearch);
            var defenderFleet = BuildDefenderFleet(targetPlanet, context.DefenderResearch);

            // Run battle simulation
            var battleResult = SimulateBattle(attackerFleet, defenderFleet);

            // Calculate loot
            var loot = CalculateLoot(targetPlanet, battleResult);

            // Calculate debris
            var debris = CalculateDebris(battleResult);

            // Check moon creation
            double moonChance = CalculateMoonChance(debris);
            bool moonCreated = CheckMoonCreation(moonChance);
            battleResult.MoonChance = moonChance;
            battleResult.MoonCreated = moonCreated;
            battleResult.Loot = loot;
            battleResult.Debris = debris;

            // Build messages and updates
            var messages = new List<MissionMessage>();
            var updates = new List<MissionUpdate>();

            // Battle report for attacker
            messages.Add(CreateBattleReportMessage(
                mission.UserId, originCoords, targetCoords,
                battleResult, isAttacker: true));

            // Battle report for defender
            if (targetPlanet.UserId != mission.UserId)
            {
                messages.Add(CreateBattleReportMessage(
                    targetPlanet.UserId, originCoords, targetCoords,
                    battleResult, isAttacker: false));
            }

            // Return with surviving ships + loot
            return SuccessArrival(
                shouldReturn: true,
                returnResources: loot,
                returnShips: battleResult.AttackerRemainingShips,
                messages: messages,
                updates: updates
            );
        }

        // =====================================================================
        // RETURN PROCESSING
        // =====================================================================

        public override MissionReturnResult ProcessReturn(MissionContext context)
        {
            var mission = context.Mission;
            var originPlanet = context.OriginPlanet;

            if (originPlanet == null)
                return ErrorReturn("Origin planet not found");

            var resources = GetResources(mission);
            var originCoords = FormatCoords(
                mission.DestinationGalaxy, mission.DestinationSystem, mission.DestinationPosition);

            string messageBody = $"Your attacking fleet has returned to {originCoords}";

            if (resources.HasResources())
            {
                messageBody += $" carrying loot:\n{FormatResources(resources)}";
            }
            else
            {
                messageBody += " with no loot.";
            }

            var message = CreateMessage(
                mission.UserId,
                MessageType.Battle,
                "Attack Fleet Returned",
                messageBody
            );

            return SuccessReturn(new List<MissionMessage> { message });
        }

        // =====================================================================
        // FLEET BUILDING
        // =====================================================================

        /// <summary>Build attacker fleet data from mission ships and research.</summary>
        protected BattleFleet BuildAttackerFleet(FleetMission mission, UserResearch? research)
        {
            var fleet = new BattleFleet
            {
                UserId = mission.UserId,
                WeaponTech = research?.WeaponsTechnology ?? 0,
                ShieldTech = research?.ShieldingTechnology ?? 0,
                ArmorTech = research?.ArmorTechnology ?? 0,
            };

            var ships = GetShips(mission);
            foreach (var shipType in ShipCounts.AllTypes)
            {
                int count = ships.Get(shipType);
                if (count > 0)
                {
                    fleet.Units.Add(new BattleUnit
                    {
                        ShipKey = shipType,
                        Amount = count,
                    });
                }
            }

            return fleet;
        }

        /// <summary>Build defender fleet data from planet units and research.</summary>
        protected BattleFleet BuildDefenderFleet(PlanetData planet, UserResearch? research)
        {
            var fleet = new BattleFleet
            {
                UserId = planet.UserId,
                WeaponTech = research?.WeaponsTechnology ?? 0,
                ShieldTech = research?.ShieldingTechnology ?? 0,
                ArmorTech = research?.ArmorTechnology ?? 0,
            };

            // Add ships
            foreach (var shipType in ShipCounts.AllTypes)
            {
                int count = planet.Ships.Get(shipType);
                if (count > 0)
                {
                    fleet.Units.Add(new BattleUnit
                    {
                        ShipKey = shipType,
                        Amount = count,
                    });
                }
            }

            return fleet;
        }

        // =====================================================================
        // BATTLE SIMULATION (Virtual — override with real engine)
        // =====================================================================

        /// <summary>
        /// Simulate a battle between attacker and defender fleets.
        /// Override this to plug in OGameBattleEngine or AdvancedBattleEngine.
        /// Default implementation: attacker wins with no losses.
        /// </summary>
        protected virtual MissionBattleResult SimulateBattle(
            BattleFleet attacker,
            BattleFleet defender)
        {
            // Default stub — real game layer should override
            var result = new MissionBattleResult
            {
                Winner = BattleWinner.Attacker,
                TotalRounds = 1,
                AttackerRemainingShips = new ShipCounts(),
                DefenderRemainingShips = ShipCounts.Empty(),
                AttackerShipLosses = ShipCounts.Empty(),
                DefenderShipLosses = new ShipCounts(),
                DefenderRemainingDefense = new Dictionary<string, int>(),
                DefenderDefenseLosses = new Dictionary<string, int>(),
            };

            // All attacker ships survive by default
            foreach (var unit in attacker.Units)
                result.AttackerRemainingShips.Set(unit.ShipKey, unit.Amount);

            // All defender ships lost by default
            foreach (var unit in defender.Units)
                result.DefenderShipLosses.Set(unit.ShipKey, unit.Amount);

            return result;
        }

        // =====================================================================
        // LOOT CALCULATION
        // =====================================================================

        /// <summary>
        /// Calculate loot from target planet resources (50% max).
        /// Attacker can only loot if they won or drew.
        /// </summary>
        protected virtual Resources CalculateLoot(
            PlanetData targetPlanet,
            MissionBattleResult battleResult)
        {
            if (battleResult.Winner == BattleWinner.Defender)
                return Resources.Empty();

            double metalLoot = Math.Floor(targetPlanet.Metal * LootPercentage);
            double crystalLoot = Math.Floor(targetPlanet.Crystal * LootPercentage);
            double deutLoot = Math.Floor(targetPlanet.Deuterium * LootPercentage);

            // TODO: Limit to fleet cargo capacity (needs ship cargo data)
            return new Resources(metalLoot, crystalLoot, deutLoot);
        }

        // =====================================================================
        // DEBRIS FIELD CALCULATION
        // =====================================================================

        /// <summary>
        /// Calculate debris field from battle losses (30% of structural costs).
        /// Only metal and crystal produce debris.
        /// </summary>
        protected virtual Resources CalculateDebris(MissionBattleResult battleResult)
        {
            // Simplified: uses structural cost values per ship type
            // The real implementation should use actual ship cost data
            double debrisMetal = (battleResult.AttackerLossesValue.Metal +
                                  battleResult.DefenderLossesValue.Metal) * DebrisPercentage;
            double debrisCrystal = (battleResult.AttackerLossesValue.Crystal +
                                    battleResult.DefenderLossesValue.Crystal) * DebrisPercentage;

            return new Resources(Math.Floor(debrisMetal), Math.Floor(debrisCrystal), 0);
        }

        // =====================================================================
        // MOON CREATION
        // =====================================================================

        /// <summary>Calculate moon creation chance from debris total.</summary>
        protected double CalculateMoonChance(Resources debris)
        {
            double debrisTotal = debris.Metal + debris.Crystal;
            double chance = (debrisTotal / 100000.0) * MoonChancePer100KDebris;
            return Math.Min(chance, MaxMoonChance);
        }

        /// <summary>
        /// Check if a moon is created (random roll against chance).
        /// Virtual so game layer can inject deterministic RNG for testing.
        /// </summary>
        protected virtual bool CheckMoonCreation(double chance)
        {
            if (chance <= 0) return false;
            var random = new Random();
            return random.NextDouble() < chance;
        }

        // =====================================================================
        // BATTLE REPORT MESSAGE
        // =====================================================================

        /// <summary>Create a battle report message for a participant.</summary>
        protected MissionMessage CreateBattleReportMessage(
            string userId,
            string originCoords,
            string targetCoords,
            MissionBattleResult result,
            bool isAttacker)
        {
            string winnerText = result.Winner switch
            {
                BattleWinner.Attacker => "The attacker has won the battle!",
                BattleWinner.Defender => "The defender has won the battle!",
                BattleWinner.Draw => "The battle ended in a draw.",
                _ => "The battle has concluded.",
            };

            string body = $"Battle at {targetCoords}\n" +
                           $"Attacker from {originCoords}\n\n" +
                           $"{winnerText}\n\n" +
                           $"Rounds: {result.TotalRounds}\n\n" +
                           $"Attacker losses:\n{FormatShipLosses(result.AttackerShipLosses)}\n\n" +
                           $"Defender losses:\n{FormatShipLosses(result.DefenderShipLosses)}\n";

            if (result.DefenderDefenseLosses.Count > 0)
            {
                body += $"\nDefense losses:\n{FormatDefenseLosses(result.DefenderDefenseLosses)}\n";
            }

            body += $"\nLoot:\n{FormatResources(result.Loot)}\n" +
                    $"\nDebris field:\nMetal: {result.Debris.Metal:N0}\n" +
                    $"Crystal: {result.Debris.Crystal:N0}\n" +
                    $"\nMoon chance: {result.MoonChance * 100:F1}%";

            if (result.MoonCreated)
            {
                body += "\n\nA moon has been created from the debris!";
            }

            return CreateMessage(
                userId,
                MessageType.Battle,
                isAttacker ? "Battle Report (Attack)" : "Battle Report (Defense)",
                body
            );
        }
    }
}
