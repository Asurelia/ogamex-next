// =============================================================================
// ExplorationMission.cs — Exploration mission handler
// Port of: src/lib/missions/handlers/ExplorationMission.ts
// Namespace: OGameX.SharedLib.Missions.Handlers
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Missions.Handlers
{
    /// <summary>
    /// Handles exploration missions for scanning and mapping star systems.
    /// 
    /// Four sub-types (via ExplorationMissionType):
    /// 1. QuickScan — fast surface scan, basic info
    /// 2. DeepScan — detailed scan, more data
    /// 3. Cartography — system mapping, full data
    /// 4. SatelliteDeploy — place observation satellites
    /// 
    /// Scan quality depends on:
    /// - Number of probes/pathfinders sent
    /// - Player's astrophysics research level
    /// - Random variance
    /// 
    /// Discovery levels (progressive):
    /// - Detected → Scanned → Mapped → Charted
    /// 
    /// Special findings possible:
    /// - Hidden debris fields
    /// - Anomalies
    /// - Ancient artifacts
    /// - Resource deposits
    /// </summary>
    public class ExplorationMission : BaseMission
    {
        public override MissionType HandlerMissionType => MissionType.Attack; // Maps to ExplorationScan
        public override bool HasReturn => true;
        public override string Name => "Exploration";

        // For cleaner dispatch, override HandlerMissionType in derived classes
        // or use ExplorationMissionType to distinguish sub-types.

        // =====================================================================
        // CONSTANTS
        // =====================================================================

        /// <summary>Base scan quality per probe.</summary>
        public const double BaseScanQualityPerProbe = 5.0;

        /// <summary>Base scan quality per pathfinder.</summary>
        public const double BaseScanQualityPerPathfinder = 25.0;

        /// <summary>Astrophysics bonus per level.</summary>
        public const double AstroBonus = 2.0;

        /// <summary>Scan quality thresholds for discovery levels.</summary>
        public static readonly Dictionary<DiscoveryLevel, double> DiscoveryThresholds = new()
        {
            { DiscoveryLevel.Detected, 10.0 },
            { DiscoveryLevel.Scanned, 30.0 },
            { DiscoveryLevel.Mapped, 60.0 },
            { DiscoveryLevel.Charted, 100.0 },
        };

        /// <summary>Special finding probabilities by discovery level.</summary>
        public static readonly Dictionary<DiscoveryLevel, double> SpecialFindingChance = new()
        {
            { DiscoveryLevel.Detected, 0.05 },
            { DiscoveryLevel.Scanned, 0.10 },
            { DiscoveryLevel.Mapped, 0.20 },
            { DiscoveryLevel.Charted, 0.35 },
        };

        // =====================================================================
        // ARRIVAL PROCESSING
        // =====================================================================

        public override MissionArrivalResult ProcessArrival(MissionContext context)
        {
            var mission = context.Mission;
            var ships = GetShips(mission);

            var targetCoords = FormatCoords(
                mission.DestinationGalaxy,
                mission.DestinationSystem,
                mission.DestinationPosition);

            // Determine exploration sub-type
            var subType = DetermineSubType(mission);

            // Calculate scan quality
            double scanQuality = CalculateScanQuality(
                ships, context.AttackerResearch, subType);

            // Determine discovery level
            var discoveryLevel = DetermineDiscoveryLevel(scanQuality);

            // Check for special findings
            var specialFindings = CheckSpecialFindings(discoveryLevel);

            // Build report
            var messages = new List<MissionMessage>();

            string reportBody = BuildExplorationReport(
                targetCoords, subType, scanQuality,
                discoveryLevel, specialFindings);

            messages.Add(CreateMessage(
                mission.UserId,
                MessageType.System,
                FormatSubTypeSubject(subType, discoveryLevel),
                reportBody
            ));

            // If satellite deploy, handle deployment
            if (subType == ExplorationMissionType.SatelliteDeploy)
            {
                OnSatelliteDeployed(context, targetCoords);
                messages.Add(CreateMessage(
                    mission.UserId,
                    MessageType.System,
                    "Satellite Deployed",
                    $"An observation satellite has been deployed at {targetCoords}.\n" +
                    $"You will now receive continuous monitoring data from this system."
                ));
            }

            // All explore missions return
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

            var originCoords = FormatCoords(
                mission.DestinationGalaxy,
                mission.DestinationSystem,
                mission.DestinationPosition);

            var message = CreateMessage(
                mission.UserId,
                MessageType.System,
                "Exploration Fleet Returned",
                $"Your exploration fleet has returned to {originCoords}."
            );

            return SuccessReturn(new List<MissionMessage> { message });
        }

        // =====================================================================
        // SCAN QUALITY CALCULATION
        // =====================================================================

        /// <summary>
        /// Calculate scan quality based on probes, pathfinders, and research.
        /// </summary>
        public static double CalculateScanQuality(
            ShipCounts ships,
            UserResearch? research,
            ExplorationMissionType subType)
        {
            double quality = 0;

            // Probes contribution (diminishing returns)
            int probes = ships.EspionageProbe;
            quality += Math.Sqrt(probes) * BaseScanQualityPerProbe;

            // Pathfinders contribution
            int pathfinders = ships.Pathfinder;
            quality += Math.Sqrt(pathfinders) * BaseScanQualityPerPathfinder;

            // Astrophysics bonus
            int astroLevel = research?.Astrophysics ?? 0;
            quality += astroLevel * AstroBonus;

            // Sub-type multiplier
            quality *= subType switch
            {
                ExplorationMissionType.QuickScan => 0.5,
                ExplorationMissionType.DeepScan => 1.0,
                ExplorationMissionType.Cartography => 1.5,
                ExplorationMissionType.SatelliteDeploy => 0.8,
                _ => 1.0,
            };

            return quality;
        }

        /// <summary>Determine discovery level from scan quality.</summary>
        public static DiscoveryLevel DetermineDiscoveryLevel(double scanQuality)
        {
            if (scanQuality >= DiscoveryThresholds[DiscoveryLevel.Charted])
                return DiscoveryLevel.Charted;
            if (scanQuality >= DiscoveryThresholds[DiscoveryLevel.Mapped])
                return DiscoveryLevel.Mapped;
            if (scanQuality >= DiscoveryThresholds[DiscoveryLevel.Scanned])
                return DiscoveryLevel.Scanned;
            return DiscoveryLevel.Detected;
        }

        // =====================================================================
        // SPECIAL FINDINGS
        // =====================================================================

        /// <summary>Special finding types.</summary>
        public enum SpecialFindingType
        {
            None,
            HiddenDebris,
            SpaceAnomaly,
            AncientArtifact,
            ResourceDeposit,
        }

        /// <summary>Check for special findings based on discovery level.</summary>
        protected virtual List<SpecialFindingType> CheckSpecialFindings(DiscoveryLevel level)
        {
            var findings = new List<SpecialFindingType>();
            var random = new Random();

            double chance = SpecialFindingChance.ContainsKey(level)
                ? SpecialFindingChance[level]
                : 0.05;

            if (random.NextDouble() < chance)
            {
                // Pick a random finding type
                var possibleFindings = new[]
                {
                    SpecialFindingType.HiddenDebris,
                    SpecialFindingType.SpaceAnomaly,
                    SpecialFindingType.AncientArtifact,
                    SpecialFindingType.ResourceDeposit,
                };
                findings.Add(possibleFindings[random.Next(possibleFindings.Length)]);
            }

            return findings;
        }

        // =====================================================================
        // SUB-TYPE DETERMINATION
        // =====================================================================

        /// <summary>
        /// Determine the exploration sub-type from the mission.
        /// Override in game layer if mission has sub-type metadata.
        /// </summary>
        protected virtual ExplorationMissionType DetermineSubType(FleetMission mission)
        {
            // Default: use ship composition to infer sub-type
            var ships = GetShips(mission);
            if (ships.Pathfinder > 0)
                return ExplorationMissionType.Cartography;
            if (ships.EspionageProbe > 5)
                return ExplorationMissionType.DeepScan;
            return ExplorationMissionType.QuickScan;
        }

        // =====================================================================
        // REPORT BUILDING
        // =====================================================================

        private string BuildExplorationReport(
            string coords,
            ExplorationMissionType subType,
            double scanQuality,
            DiscoveryLevel level,
            List<SpecialFindingType> findings)
        {
            var lines = new List<string>
            {
                $"=== Exploration Report ===",
                $"Target: {coords}",
                $"Mission type: {FormatSubType(subType)}",
                $"Scan quality: {scanQuality:F1}",
                $"Discovery level: {level}",
                "",
            };

            // Discovery level descriptions
            lines.Add(level switch
            {
                DiscoveryLevel.Detected => "Basic detection complete. Position confirmed but limited data gathered.",
                DiscoveryLevel.Scanned => "Surface scan complete. Major features and composition analyzed.",
                DiscoveryLevel.Mapped => "Detailed mapping complete. Terrain, resources, and infrastructure catalogued.",
                DiscoveryLevel.Charted => "Full cartographic survey complete. All details recorded with high precision.",
                _ => "Survey data incomplete.",
            });
            lines.Add("");

            // Special findings
            if (findings.Count > 0)
            {
                lines.Add("--- Special Findings ---");
                foreach (var finding in findings)
                {
                    lines.Add(finding switch
                    {
                        SpecialFindingType.HiddenDebris => "✦ Hidden debris field detected — resources may be recoverable.",
                        SpecialFindingType.SpaceAnomaly => "✦ Space anomaly detected — further investigation recommended.",
                        SpecialFindingType.AncientArtifact => "✦ Ancient artifact signal found — could yield valuable technology.",
                        SpecialFindingType.ResourceDeposit => "✦ Rich resource deposit identified — colonization recommended.",
                        _ => "",
                    });
                }
            }
            else
            {
                lines.Add("No special findings.");
            }

            return string.Join("\n", lines);
        }

        private string FormatSubType(ExplorationMissionType subType) => subType switch
        {
            ExplorationMissionType.QuickScan => "Quick Scan",
            ExplorationMissionType.DeepScan => "Deep Scan",
            ExplorationMissionType.Cartography => "Cartography",
            ExplorationMissionType.SatelliteDeploy => "Satellite Deployment",
            _ => "Exploration",
        };

        private string FormatSubTypeSubject(ExplorationMissionType subType, DiscoveryLevel level) =>
            $"Exploration - {FormatSubType(subType)} ({level})";

        // =====================================================================
        // VIRTUAL HOOKS
        // =====================================================================

        /// <summary>
        /// Called when a satellite is deployed.
        /// Override in game layer to create monitoring entity.
        /// </summary>
        protected virtual void OnSatelliteDeployed(MissionContext context, string coords)
        {
            // Override to create satellite entity in your data store
        }
    }
}
