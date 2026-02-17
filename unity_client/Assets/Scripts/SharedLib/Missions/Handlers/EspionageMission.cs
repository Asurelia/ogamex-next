// =============================================================================
// EspionageMission.cs — Espionage mission handler
// Port of: src/lib/missions/handlers/EspionageMission.ts
// Namespace: OGameX.SharedLib.Missions.Handlers
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Missions.Handlers
{
    /// <summary>
    /// Handles espionage missions that spy on other players' planets.
    /// 
    /// Processing flow:
    /// 1. Calculate information level based on tech difference and probe count
    /// 2. Perform counter-espionage detection check
    /// 3. Generate espionage report with sections revealed per info level
    /// 4. Send report to spy, notify defender if detected
    /// 5. Probes return (if not destroyed by counter-espionage)
    /// 
    /// Information levels (determined by spy tech advantage + probe bonus):
    /// - Level 1 (Resources): Always visible
    /// - Level 2 (Fleet): spy tech ≥ defender tech + 1
    /// - Level 3 (Defense): spy tech ≥ defender tech + 3
    /// - Level 4 (Buildings): spy tech ≥ defender tech + 5
    /// - Level 5 (Research): spy tech ≥ defender tech + 7
    /// 
    /// Counter-espionage:
    /// - Detection chance = defender_espionage * probes_sent * 2%
    /// - If detected, probes may be destroyed
    /// </summary>
    public class EspionageMission : BaseMission
    {
        public override MissionType HandlerMissionType => MissionType.Espionage;
        public override bool HasReturn => true;
        public override string Name => "Espionage";

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
            var targetCoords = FormatCoords(
                mission.DestinationGalaxy,
                mission.DestinationSystem,
                mission.DestinationPosition);
            var originCoords = FormatCoords(
                mission.OriginGalaxy,
                mission.OriginSystem,
                mission.OriginPosition);

            int probeCount = ships.EspionageProbe;
            if (probeCount <= 0)
            {
                var noProbeMsg = CreateMessage(mission.UserId, MessageType.Espionage,
                    "Espionage Failed",
                    $"Your fleet arrived at {targetCoords} but has no espionage probes.");
                return SuccessArrival(true, GetResources(mission), ships, new List<MissionMessage> { noProbeMsg });
            }

            // Get tech levels
            int spyTech = context.AttackerResearch?.EspionageTechnology ?? 0;
            int defTech = context.DefenderResearch?.EspionageTechnology ?? 0;

            // 1. Calculate info level
            InfoLevel infoLevel = CalculateInfoLevel(spyTech, defTech, probeCount);

            // 2. Counter-espionage check
            var counterResult = CalculateCounterEspionage(defTech, probeCount);

            // 3. Generate report
            var report = GenerateReport(
                targetPlanet, context.DefenderResearch,
                infoLevel, probeCount, counterResult, targetCoords);

            // 4. Build messages
            var messages = new List<MissionMessage>();

            // Report to spy
            string reportBody = FormatEspionageReport(report);
            messages.Add(CreateMessage(
                mission.UserId,
                MessageType.Espionage,
                $"Espionage Report: {targetPlanet.Name} {targetCoords}",
                reportBody
            ));

            // Notify defender if detected
            if (counterResult.Detected && targetPlanet.UserId != mission.UserId)
            {
                messages.Add(CreateMessage(
                    targetPlanet.UserId,
                    MessageType.Espionage,
                    "Espionage Detected!",
                    $"An espionage activity was detected on your planet at {targetCoords}.\n" +
                    $"Enemy probes detected from {originCoords}.\n" +
                    $"Probes destroyed: {counterResult.ProbesLost}"
                ));
            }

            // 5. Calculate surviving probes
            var survivingShips = ships.Clone();
            survivingShips.EspionageProbe = Math.Max(0,
                survivingShips.EspionageProbe - counterResult.ProbesLost);

            bool shouldReturn = survivingShips.GetTotal() > 0;

            return SuccessArrival(
                shouldReturn: shouldReturn,
                returnResources: GetResources(mission),
                returnShips: survivingShips,
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
                MessageType.Espionage,
                "Espionage Probes Returned",
                $"Your espionage probes have returned to {originCoords}."
            );

            return SuccessReturn(new List<MissionMessage> { message });
        }

        // =====================================================================
        // INFO LEVEL CALCULATION
        // =====================================================================

        /// <summary>
        /// Calculate the information level based on espionage tech difference
        /// and number of probes sent.
        /// 
        /// Base level from tech difference:
        ///   Resources: always (diff ≥ 0)
        ///   Fleet: diff ≥ 1
        ///   Defense: diff ≥ 3
        ///   Buildings: diff ≥ 5
        ///   Research: diff ≥ 7
        /// 
        /// Extra probes give bonus info (diminishing returns).
        /// </summary>
        public static InfoLevel CalculateInfoLevel(int spyTech, int defTech, int probeCount)
        {
            int techDiff = spyTech - defTech;

            // Base bonus from extra probes (diminishing returns: sqrt of probes)
            double probeBonus = Math.Sqrt(Math.Max(1, probeCount)) * EspionageConstants.ProbeInfoBonus;
            double effectiveDiff = techDiff + probeBonus;

            InfoLevel level = InfoLevel.Resources;

            if (effectiveDiff >= EspionageConstants.InfoLevelThresholds[InfoLevel.Research])
                level = InfoLevel.Research;
            else if (effectiveDiff >= EspionageConstants.InfoLevelThresholds[InfoLevel.Buildings])
                level = InfoLevel.Buildings;
            else if (effectiveDiff >= EspionageConstants.InfoLevelThresholds[InfoLevel.Defense])
                level = InfoLevel.Defense;
            else if (effectiveDiff >= EspionageConstants.InfoLevelThresholds[InfoLevel.Fleet])
                level = InfoLevel.Fleet;

            return level;
        }

        // =====================================================================
        // COUNTER-ESPIONAGE
        // =====================================================================

        /// <summary>
        /// Calculate counter-espionage detection chance and probe losses.
        /// Formula: detectionChance = defenderEspionageTech * probeCount * 2%
        /// </summary>
        public CounterEspionageResult CalculateCounterEspionage(int defTech, int probeCount)
        {
            double detectionChance = defTech * probeCount * EspionageConstants.CounterEspionageBaseFactor;
            detectionChance = Math.Min(1.0, detectionChance);

            bool detected = RollChance(detectionChance);

            int probesLost = 0;
            if (detected)
            {
                // Proportional probe loss based on detection strength
                double lossFraction = Math.Min(1.0, detectionChance);
                probesLost = Math.Max(1, (int)Math.Ceiling(probeCount * lossFraction));
                probesLost = Math.Min(probesLost, probeCount);
            }

            return new CounterEspionageResult
            {
                Detected = detected,
                ProbesLost = probesLost,
                DetectionChance = detectionChance,
            };
        }

        // =====================================================================
        // REPORT GENERATION
        // =====================================================================

        /// <summary>
        /// Generate an espionage report with sections based on info level.
        /// </summary>
        private EspionageReport GenerateReport(
            PlanetData target,
            UserResearch? defResearch,
            InfoLevel infoLevel,
            int probeCount,
            CounterEspionageResult counterResult,
            string targetCoords)
        {
            var report = new EspionageReport
            {
                Id = Guid.NewGuid().ToString(),
                TargetPlanetId = target.Id,
                TargetPlayerId = target.UserId,
                TargetPlanetName = target.Name,
                TargetCoordinates = targetCoords,
                SpyCount = probeCount,
                InfoLevelValue = infoLevel,
                CounterEspionageDetected = counterResult.Detected,
                ProbesLost = counterResult.ProbesLost,
                CounterEspionageChance = counterResult.DetectionChance,
                CreatedAt = DateTime.UtcNow,
            };

            // Level 1: Resources (always visible)
            report.ReportResources = new Resources(target.Metal, target.Crystal, target.Deuterium);

            // Level 2: Fleet
            if ((int)infoLevel >= (int)InfoLevel.Fleet)
            {
                report.Fleet = new Dictionary<string, int>();
                foreach (var shipType in ShipCounts.AllTypes)
                {
                    int count = target.Ships.Get(shipType);
                    if (count > 0)
                        report.Fleet[ShipCounts.DbKeys[shipType]] = count;
                }
            }

            // Level 3: Defense
            if ((int)infoLevel >= (int)InfoLevel.Defense)
            {
                report.ReportDefense = new Dictionary<string, int>(target.Defense);
            }

            // Level 4: Buildings
            if ((int)infoLevel >= (int)InfoLevel.Buildings)
            {
                report.ReportBuildings = new Dictionary<string, int>(target.Buildings);
            }

            // Level 5: Research
            if ((int)infoLevel >= (int)InfoLevel.Research && defResearch != null)
            {
                report.ReportResearch = defResearch.ToDictionary();
            }

            return report;
        }

        // =====================================================================
        // REPORT FORMATTING
        // =====================================================================

        /// <summary>Format an espionage report into a readable message body.</summary>
        private string FormatEspionageReport(EspionageReport report)
        {
            var lines = new List<string>
            {
                $"=== Espionage Report ===",
                $"Target: {report.TargetPlanetName} {report.TargetCoordinates}",
                $"Probes sent: {report.SpyCount}",
                $"Info level: {report.InfoLevelValue}",
                "",
            };

            // Resources
            if (report.ReportResources != null)
            {
                lines.Add("--- Resources ---");
                lines.Add($"Metal: {report.ReportResources.Metal:N0}");
                lines.Add($"Crystal: {report.ReportResources.Crystal:N0}");
                lines.Add($"Deuterium: {report.ReportResources.Deuterium:N0}");
                lines.Add("");
            }

            // Fleet
            if (report.Fleet != null && report.Fleet.Count > 0)
            {
                lines.Add("--- Fleet ---");
                foreach (var kv in report.Fleet)
                {
                    string name = DefenseKeys.DisplayNames.ContainsKey(kv.Key)
                        ? DefenseKeys.DisplayNames[kv.Key]
                        : FormatKeyName(kv.Key);
                    lines.Add($"{name}: {kv.Value:N0}");
                }
                lines.Add("");
            }

            // Defense
            if (report.ReportDefense != null && report.ReportDefense.Count > 0)
            {
                lines.Add("--- Defense ---");
                foreach (var kv in report.ReportDefense)
                {
                    if (kv.Value > 0)
                    {
                        string name = DefenseKeys.DisplayNames.ContainsKey(kv.Key)
                            ? DefenseKeys.DisplayNames[kv.Key]
                            : FormatKeyName(kv.Key);
                        lines.Add($"{name}: {kv.Value:N0}");
                    }
                }
                lines.Add("");
            }

            // Buildings
            if (report.ReportBuildings != null && report.ReportBuildings.Count > 0)
            {
                lines.Add("--- Buildings ---");
                foreach (var kv in report.ReportBuildings)
                {
                    if (kv.Value > 0)
                        lines.Add($"{FormatKeyName(kv.Key)}: Level {kv.Value}");
                }
                lines.Add("");
            }

            // Research
            if (report.ReportResearch != null && report.ReportResearch.Count > 0)
            {
                lines.Add("--- Research ---");
                foreach (var kv in report.ReportResearch)
                {
                    if (kv.Value > 0)
                        lines.Add($"{FormatKeyName(kv.Key)}: Level {kv.Value}");
                }
                lines.Add("");
            }

            // Counter-espionage info
            if (report.CounterEspionageDetected)
            {
                lines.Add($"*** Counter-espionage detected! ***");
                lines.Add($"Detection chance: {report.CounterEspionageChance * 100:F1}%");
                lines.Add($"Probes lost: {report.ProbesLost}");
            }
            else
            {
                lines.Add($"Counter-espionage chance: {report.CounterEspionageChance * 100:F1}%");
            }

            return string.Join("\n", lines);
        }

        // =====================================================================
        // VIRTUAL HOOKS
        // =====================================================================

        /// <summary>
        /// Roll a chance (0.0-1.0).
        /// Virtual for deterministic testing.
        /// </summary>
        protected virtual bool RollChance(double chance)
        {
            if (chance <= 0) return false;
            if (chance >= 1.0) return true;
            var random = new Random();
            return random.NextDouble() < chance;
        }
    }
}
