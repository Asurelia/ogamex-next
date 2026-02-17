// =============================================================================
// ExpeditionMission.cs — Expedition mission handler
// Port of: src/lib/missions/handlers/ExpeditionMission.ts
// Namespace: OGameX.SharedLib.Missions.Handlers
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Missions.Handlers
{
    /// <summary>
    /// Handles expedition missions to deep space (position 16).
    /// 
    /// Expeditions produce random events with weighted probabilities.
    /// Fleet power determines reward tiers.
    /// 
    /// Possible outcomes:
    /// - Nothing (30%) — no event
    /// - Resources found (25%) — metal/crystal/deuterium
    /// - Dark matter (10%) — premium currency
    /// - Ships found (12%) — free ships discovered
    /// - Pirate attack (8%) — combat vs. NPC pirates
    /// - Alien attack (5%) — combat vs. NPC aliens
    /// - Delay (5%) — fleet delayed
    /// - Early return (3%) — fleet returns early
    /// - Black hole (2%) — fleet partially/fully destroyed
    /// 
    /// Reward scaling is based on fleet power tiers:
    /// Tier 1: 0-5k, Tier 2: 5k-25k, Tier 3: 25k-100k,
    /// Tier 4: 100k-500k, Tier 5: 500k+
    /// </summary>
    public class ExpeditionMission : BaseMission
    {
        public override MissionType HandlerMissionType => MissionType.Expedition;
        public override bool HasReturn => true;
        public override string Name => "Expedition";

        // =====================================================================
        // OUTCOME PROBABILITY TABLE
        // =====================================================================

        /// <summary>Weighted outcome table (probabilities sum to 1.0).</summary>
        private static readonly (ExpeditionOutcome Outcome, double Weight)[] OutcomeTable =
        {
            (ExpeditionOutcome.Nothing, 0.30),
            (ExpeditionOutcome.ResourcesFound, 0.25),
            (ExpeditionOutcome.DarkMatter, 0.10),
            (ExpeditionOutcome.ShipFound, 0.12),
            (ExpeditionOutcome.PirateAttack, 0.08),
            (ExpeditionOutcome.AlienAttack, 0.05),
            (ExpeditionOutcome.Delay, 0.05),
            (ExpeditionOutcome.EarlyReturn, 0.03),
            (ExpeditionOutcome.BlackHole, 0.02),
        };

        // =====================================================================
        // FLEET POWER TIERS
        // =====================================================================

        /// <summary>Fleet power thresholds for reward tiers.</summary>
        private static readonly (int Min, int Max, double Multiplier)[] FleetPowerTiers =
        {
            (0, 5000, 1.0),
            (5000, 25000, 2.0),
            (25000, 100000, 4.0),
            (100000, 500000, 8.0),
            (500000, int.MaxValue, 15.0),
        };

        // =====================================================================
        // RESOURCE REWARDS BASE VALUES
        // =====================================================================

        private const double BaseMetalReward = 10000;
        private const double BaseCrystalReward = 5000;
        private const double BaseDeuteriumReward = 2000;
        private const int BaseDarkMatterReward = 50;

        // =====================================================================
        // ARRIVAL PROCESSING
        // =====================================================================

        public override MissionArrivalResult ProcessArrival(MissionContext context)
        {
            var mission = context.Mission;
            var ships = GetShips(mission);
            var resources = GetResources(mission);

            var coords = FormatCoords(
                mission.DestinationGalaxy,
                mission.DestinationSystem,
                mission.DestinationPosition);

            // Calculate fleet power
            int fleetPower = CalculateFleetPower(ships);
            double rewardMultiplier = GetRewardMultiplier(fleetPower);

            // Roll expedition outcome
            var outcome = RollOutcome();

            // Process outcome
            var eventResult = ProcessOutcome(outcome, ships, rewardMultiplier, coords);

            // Build messages
            var messages = new List<MissionMessage>();
            messages.Add(CreateMessage(
                mission.UserId,
                MessageType.Expedition,
                FormatOutcomeSubject(eventResult.Outcome),
                eventResult.EventMessage
            ));

            // Calculate return ships and resources
            var returnShips = ships.Clone();
            var returnResources = resources.Clone();

            // Apply gains
            if (eventResult.FoundResources != null)
            {
                returnResources.Add(eventResult.FoundResources);
            }

            if (eventResult.ShipsGained != null)
            {
                foreach (var kv in eventResult.ShipsGained)
                    returnShips.Add(kv.Key, kv.Value);
            }

            // Apply losses
            if (eventResult.ShipsLost != null)
            {
                foreach (var kv in eventResult.ShipsLost)
                {
                    int current = returnShips.Get(kv.Key);
                    returnShips.Set(kv.Key, Math.Max(0, current - kv.Value));
                }
            }

            bool shouldReturn = returnShips.GetTotal() > 0;

            return SuccessArrival(
                shouldReturn: shouldReturn,
                returnResources: returnResources,
                returnShips: returnShips,
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
                mission.DestinationGalaxy,
                mission.DestinationSystem,
                mission.DestinationPosition);

            string messageBody = $"Your expedition fleet has returned to {originCoords}";
            if (resources.HasResources())
                messageBody += $" carrying:\n{FormatResources(resources)}";
            else
                messageBody += ".";

            var message = CreateMessage(
                mission.UserId,
                MessageType.Expedition,
                "Expedition Returned",
                messageBody
            );

            return SuccessReturn(new List<MissionMessage> { message });
        }

        // =====================================================================
        // FLEET POWER CALCULATION
        // =====================================================================

        /// <summary>
        /// Calculate fleet power based on ship counts.
        /// Each ship type has a different combat power value.
        /// </summary>
        public static int CalculateFleetPower(ShipCounts ships)
        {
            // Approximate combat values per ship type
            int power = 0;
            power += ships.LightFighter * 15;
            power += ships.HeavyFighter * 45;
            power += ships.Cruiser * 170;
            power += ships.Battleship * 395;
            power += ships.Battlecruiser * 510;
            power += ships.Bomber * 500;
            power += ships.Destroyer * 850;
            power += ships.Deathstar * 50000;
            power += ships.SmallCargo * 10;
            power += ships.LargeCargo * 15;
            power += ships.ColonyShip * 5;
            power += ships.Recycler * 8;
            power += ships.EspionageProbe * 1;
            power += ships.Reaper * 2800;
            power += ships.Pathfinder * 310;
            return power;
        }

        /// <summary>Get the reward multiplier for a given fleet power tier.</summary>
        private static double GetRewardMultiplier(int fleetPower)
        {
            foreach (var tier in FleetPowerTiers)
            {
                if (fleetPower >= tier.Min && fleetPower < tier.Max)
                    return tier.Multiplier;
            }
            return 1.0;
        }

        // =====================================================================
        // OUTCOME PROCESSING
        // =====================================================================

        /// <summary>Roll a random expedition outcome from the probability table.</summary>
        protected virtual ExpeditionOutcome RollOutcome()
        {
            var random = new Random();
            double roll = random.NextDouble();
            double cumulative = 0;

            foreach (var (outcome, weight) in OutcomeTable)
            {
                cumulative += weight;
                if (roll < cumulative)
                    return outcome;
            }

            return ExpeditionOutcome.Nothing;
        }

        /// <summary>Process an expedition outcome and generate the event result.</summary>
        private ExpeditionEventResult ProcessOutcome(
            ExpeditionOutcome outcome,
            ShipCounts ships,
            double multiplier,
            string coords)
        {
            var random = new Random();

            return outcome switch
            {
                ExpeditionOutcome.Nothing => new ExpeditionEventResult
                {
                    Outcome = outcome,
                    EventMessage = $"Your expedition at {coords} scouted the area but found nothing of interest. The fleet is returning.",
                },

                ExpeditionOutcome.ResourcesFound => ProcessResourceFind(multiplier, coords, random),
                ExpeditionOutcome.DarkMatter => ProcessDarkMatterFind(multiplier, coords, random),
                ExpeditionOutcome.ShipFound => ProcessShipFind(multiplier, coords, random),
                ExpeditionOutcome.PirateAttack => ProcessPirateAttack(ships, multiplier, coords, random),
                ExpeditionOutcome.AlienAttack => ProcessAlienAttack(ships, multiplier, coords, random),
                ExpeditionOutcome.Delay => ProcessDelay(coords, random),
                ExpeditionOutcome.EarlyReturn => ProcessEarlyReturn(coords),
                ExpeditionOutcome.BlackHole => ProcessBlackHole(ships, coords, random),
                _ => new ExpeditionEventResult
                {
                    Outcome = ExpeditionOutcome.Nothing,
                    EventMessage = "Nothing happened.",
                },
            };
        }

        // =====================================================================
        // EVENT PROCESSORS
        // =====================================================================

        private ExpeditionEventResult ProcessResourceFind(double multiplier, string coords, Random rng)
        {
            double metal = Math.Floor(BaseMetalReward * multiplier * (0.5 + rng.NextDouble()));
            double crystal = Math.Floor(BaseCrystalReward * multiplier * (0.5 + rng.NextDouble()));
            double deut = Math.Floor(BaseDeuteriumReward * multiplier * (0.5 + rng.NextDouble()));

            return new ExpeditionEventResult
            {
                Outcome = ExpeditionOutcome.ResourcesFound,
                FoundResources = new Resources(metal, crystal, deut),
                EventMessage = $"Your expedition at {coords} discovered an abandoned cargo container!\n\n" +
                               $"Resources found:\nMetal: {metal:N0}\nCrystal: {crystal:N0}\nDeuterium: {deut:N0}",
            };
        }

        private ExpeditionEventResult ProcessDarkMatterFind(double multiplier, string coords, Random rng)
        {
            int dm = (int)Math.Floor(BaseDarkMatterReward * multiplier * (0.5 + rng.NextDouble()));

            return new ExpeditionEventResult
            {
                Outcome = ExpeditionOutcome.DarkMatter,
                DarkMatterFound = dm,
                EventMessage = $"Your expedition at {coords} found a cache of Dark Matter!\n\nDark Matter found: {dm:N0}",
            };
        }

        private ExpeditionEventResult ProcessShipFind(double multiplier, string coords, Random rng)
        {
            // Choose a random ship type to find
            var findableShips = new[]
            {
                (ShipType.LightFighter, 5),
                (ShipType.HeavyFighter, 3),
                (ShipType.Cruiser, 2),
                (ShipType.SmallCargo, 4),
                (ShipType.LargeCargo, 2),
                (ShipType.EspionageProbe, 8),
                (ShipType.Pathfinder, 1),
            };

            var pick = findableShips[rng.Next(findableShips.Length)];
            int count = (int)Math.Max(1, Math.Floor(pick.Item2 * multiplier * (0.5 + rng.NextDouble())));

            var gained = new Dictionary<ShipType, int> { { pick.Item1, count } };

            return new ExpeditionEventResult
            {
                Outcome = ExpeditionOutcome.ShipFound,
                ShipsGained = gained,
                EventMessage = $"Your expedition at {coords} found abandoned ships drifting in space!\n\n" +
                               $"Ships found: {count}x {ShipCounts.DisplayNames[pick.Item1]}",
            };
        }

        private ExpeditionEventResult ProcessPirateAttack(ShipCounts ships, double multiplier, string coords, Random rng)
        {
            // Pirates cause random ship losses (5-20% of fleet)
            double lossRate = 0.05 + rng.NextDouble() * 0.15;
            var losses = CalculateFleetLosses(ships, lossRate);

            return new ExpeditionEventResult
            {
                Outcome = ExpeditionOutcome.PirateAttack,
                ShipsLost = losses,
                EventMessage = $"Your expedition at {coords} was ambushed by space pirates!\n\n" +
                               $"Ships lost in combat:\n{FormatShipLossDict(losses)}",
            };
        }

        private ExpeditionEventResult ProcessAlienAttack(ShipCounts ships, double multiplier, string coords, Random rng)
        {
            // Aliens are stronger — 10-35% losses
            double lossRate = 0.10 + rng.NextDouble() * 0.25;
            var losses = CalculateFleetLosses(ships, lossRate);

            return new ExpeditionEventResult
            {
                Outcome = ExpeditionOutcome.AlienAttack,
                ShipsLost = losses,
                EventMessage = $"Your expedition at {coords} encountered hostile alien forces!\n\n" +
                               $"Ships lost in combat:\n{FormatShipLossDict(losses)}",
            };
        }

        private ExpeditionEventResult ProcessDelay(string coords, Random rng)
        {
            double modifier = 1.0 + (0.5 + rng.NextDouble()); // 1.5x to 2.0x

            return new ExpeditionEventResult
            {
                Outcome = ExpeditionOutcome.Delay,
                TimeModifier = modifier,
                EventMessage = $"Your expedition at {coords} encountered a navigational anomaly " +
                               $"and will be delayed. Return time increased by {(modifier - 1.0) * 100:F0}%.",
            };
        }

        private ExpeditionEventResult ProcessEarlyReturn(string coords)
        {
            return new ExpeditionEventResult
            {
                Outcome = ExpeditionOutcome.EarlyReturn,
                TimeModifier = 0.5,
                EventMessage = $"Your expedition at {coords} found a shortcut through a wormhole " +
                               $"and is returning early!",
            };
        }

        private ExpeditionEventResult ProcessBlackHole(ShipCounts ships, string coords, Random rng)
        {
            // Black hole: 30-100% fleet loss
            double lossRate = 0.30 + rng.NextDouble() * 0.70;
            var losses = CalculateFleetLosses(ships, lossRate);

            string severity = lossRate > 0.8 ? "catastrophic" : lossRate > 0.5 ? "severe" : "partial";

            return new ExpeditionEventResult
            {
                Outcome = ExpeditionOutcome.BlackHole,
                ShipsLost = losses,
                EventMessage = $"Your expedition at {coords} was caught in a gravitational anomaly!\n\n" +
                               $"The black hole caused {severity} damage to the fleet.\n" +
                               $"Ships lost:\n{FormatShipLossDict(losses)}",
            };
        }

        // =====================================================================
        // HELPERS
        // =====================================================================

        /// <summary>Calculate proportional fleet losses.</summary>
        private Dictionary<ShipType, int> CalculateFleetLosses(ShipCounts ships, double lossRate)
        {
            var losses = new Dictionary<ShipType, int>();
            foreach (var t in ShipCounts.AllTypes)
            {
                int count = ships.Get(t);
                if (count > 0)
                {
                    int lost = (int)Math.Ceiling(count * lossRate);
                    lost = Math.Min(lost, count);
                    if (lost > 0)
                        losses[t] = lost;
                }
            }
            return losses;
        }

        private string FormatShipLossDict(Dictionary<ShipType, int> losses)
        {
            var lines = losses
                .Where(kv => kv.Value > 0)
                .Select(kv => $"  {ShipCounts.DisplayNames[kv.Key]}: {kv.Value:N0}");
            return lines.Any() ? string.Join("\n", lines) : "  None";
        }

        private string FormatOutcomeSubject(ExpeditionOutcome outcome) => outcome switch
        {
            ExpeditionOutcome.Nothing => "Expedition - No Findings",
            ExpeditionOutcome.ResourcesFound => "Expedition - Resources Found!",
            ExpeditionOutcome.DarkMatter => "Expedition - Dark Matter Found!",
            ExpeditionOutcome.ShipFound => "Expedition - Ships Discovered!",
            ExpeditionOutcome.PirateAttack => "Expedition - Pirate Attack!",
            ExpeditionOutcome.AlienAttack => "Expedition - Alien Encounter!",
            ExpeditionOutcome.Delay => "Expedition - Navigation Delay",
            ExpeditionOutcome.EarlyReturn => "Expedition - Early Return",
            ExpeditionOutcome.BlackHole => "Expedition - Black Hole!",
            _ => "Expedition Report",
        };
    }
}
