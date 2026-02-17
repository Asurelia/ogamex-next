// ============================================================================
// ScanningSystem.cs — Ported from EvEmu exploration/Scanning.cpp
//
// Probe scanning for sites (combat, data, relic, wormholes).
// Signal strength, triangulation, probe placement.
// ============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Exploration
{
    // ========================================================================
    // ENUMS
    // ========================================================================

    public enum ScanResultType
    {
        CosmicAnomaly = 1,       // easy to find, no probes needed
        CosmicSignature = 2,     // needs probes
        Ship = 3,
        Structure = 4,
        Drone = 5,
    }

    public enum SignatureSiteType
    {
        Combat = 1,
        Gas = 2,
        Data = 3,
        Relic = 4,
        Wormhole = 5,
        OreAnomaly = 6,
    }

    public enum ScanProbeType
    {
        CoreScanner = 1,        // for cosmic signatures
        CombatScanner = 2,     // for signatures + ships
        DScan = 3,              // directional scan (no probes)
    }

    public enum ScanQuality
    {
        None = 0,
        Red = 1,        // point only; 0-25%
        Yellow = 2,     // sphere area; 25-75%
        Green = 3,      // warpable; 75-99%
        Perfect = 4,    // exact position; 100%
    }

    // ========================================================================
    // DATA STRUCTURES
    // ========================================================================

    /// <summary>
    /// A cosmic signature or anomaly in the system.
    /// </summary>
    public class CosmicSignature
    {
        public string SignatureID;           // e.g. "ABC-123"
        public ScanResultType ResultType;
        public SignatureSiteType SiteType;
        public string Name;
        public float X, Y, Z;               // actual position
        public float SignatureStrength;      // base difficulty (0.0 = hard, 1.0 = easy)
        public int DifficultyLevel;          // 1-5

        // Discovered state
        public float ScanStrength;           // 0-100%, accumulated
        public ScanQuality Quality;
        public float DiscoveredX, DiscoveredY, DiscoveredZ;  // estimated position (inaccurate until 100%)
    }

    /// <summary>
    /// A scan probe deployed in space.
    /// </summary>
    public class ScanProbe
    {
        public long ProbeID;
        public ScanProbeType Type;
        public float X, Y, Z;               // probe position
        public float ScanRange;              // AU
        public float BaseScanStrength;       // probe's capability (affected by skills)
        public bool IsActive;

        public float DistanceTo(float x, float y, float z)
        {
            float dx = X - x, dy = Y - y, dz = Z - z;
            return (float)Math.Sqrt(dx * dx + dy * dy + dz * dz);
        }
    }

    /// <summary>
    /// Player scanning skills.
    /// </summary>
    public class ScanningSkills
    {
        public int Astrometrics;              // +1 probe per level (base 4)
        public int AstrometricAcquisition;    // +10% scan speed per level
        public int AstrometricPinpointing;    // -10% scan deviation per level
        public int AstrometricRangefinding;   // +10% scan probe strength per level
    }

    /// <summary>
    /// Result of a scan operation.
    /// </summary>
    public class ScanResult
    {
        public string SignatureID;
        public ScanResultType ResultType;
        public SignatureSiteType? SiteType;   // null until enough scan strength
        public string Name;                    // null until high scan strength
        public ScanQuality Quality;
        public float ScanStrength;            // 0-100%
        public float EstimatedX, EstimatedY, EstimatedZ;
    }

    // ========================================================================
    // SCANNING FORMULAS
    // ========================================================================

    public static class ScanningFormulas
    {
        /// <summary>AU to meters conversion.</summary>
        public const float AUInMeters = 149_597_870_700f;

        /// <summary>
        /// Max probes a character can have active.
        /// Formula: 4 + astrometricsLevel (capped at 8)
        /// </summary>
        public static int MaxProbes(int astrometricsLevel)
        {
            return Math.Min(8, 4 + astrometricsLevel);
        }

        /// <summary>
        /// Effective probe scan strength.
        /// Formula: baseStrength * (1 + 0.1 * rangefindingLevel)
        /// </summary>
        public static float EffectiveProbeStrength(float baseStrength, int rangefindingLevel)
        {
            return baseStrength * (1.0f + 0.1f * rangefindingLevel);
        }

        /// <summary>
        /// Scan deviation — how far off the estimated position is.
        /// Formula: maxDeviation * (1 - 0.1 * pinpointingLevel) * (1 - scanStrength/100)
        /// </summary>
        public static float ScanDeviation(float maxDeviation, int pinpointingLevel, float scanStrength)
        {
            return maxDeviation * (1.0f - 0.1f * pinpointingLevel) * (1.0f - scanStrength / 100.0f);
        }

        /// <summary>
        /// Scan speed modifier (lower = faster).
        /// Formula: baseTime * (1 - 0.1 * acquisitionLevel)
        /// </summary>
        public static float ScanTime(float baseTime, int acquisitionLevel)
        {
            return baseTime * (1.0f - 0.1f * acquisitionLevel);
        }

        /// <summary>
        /// Calculate scan strength contribution from a single probe to a signature.
        /// Based on distance and probe range.
        /// </summary>
        public static float ProbeContribution(float probeStrength, float probeRange,
                                               float signatureStrength, float distance)
        {
            if (distance > probeRange * AUInMeters) return 0;

            float rangeRatio = distance / (probeRange * AUInMeters);
            // Stronger contribution when closer, falls off quadratically
            float distanceFactor = 1.0f - rangeRatio * rangeRatio;
            return probeStrength * signatureStrength * Math.Max(0, distanceFactor);
        }

        /// <summary>
        /// Calculate total scan strength from multiple probes.
        /// Multiple probes in overlapping range give triangulation bonus.
        /// </summary>
        public static float CombinedScanStrength(float[] probeContributions)
        {
            if (probeContributions.Length == 0) return 0;

            float sum = probeContributions.Sum();
            int activeProbes = probeContributions.Count(c => c > 0);

            // Triangulation bonus: 2 probes = 1.1x, 3 = 1.25x, 4+ = 1.5x
            float triangulationBonus = activeProbes switch
            {
                0 => 0,
                1 => 1.0f,
                2 => 1.1f,
                3 => 1.25f,
                _ => 1.5f
            };

            return Math.Min(100f, sum * triangulationBonus);
        }
    }

    // ========================================================================
    // SCANNING SYSTEM — main logic
    // ========================================================================

    /// <summary>
    /// Manages probe scanning for a player.
    /// Source: EvEmu exploration/Scanning.cpp (simplified for game use)
    /// </summary>
    public class ScanningSystem
    {
        private readonly List<ScanProbe> _probes = new();
        private readonly Dictionary<string, CosmicSignature> _signatures = new();
        private readonly Random _rng = new();
        private long _nextProbeID = 1;

        // Events
        public event Action<List<ScanResult>> OnScanCompleted;
        public event Action<CosmicSignature> OnSignatureLocked;

        // ====================================================================
        // PROBE MANAGEMENT
        // ====================================================================

        /// <summary>Deploy a probe at a position.</summary>
        public ScanProbe DeployProbe(ScanProbeType type, float x, float y, float z,
                                      float scanRange, ScanningSkills skills)
        {
            int max = ScanningFormulas.MaxProbes(skills.Astrometrics);
            if (_probes.Count(p => p.IsActive) >= max)
                return null;

            var probe = new ScanProbe
            {
                ProbeID = _nextProbeID++,
                Type = type,
                X = x, Y = y, Z = z,
                ScanRange = scanRange,
                BaseScanStrength = ScanningFormulas.EffectiveProbeStrength(
                    type == ScanProbeType.CoreScanner ? 40 : 20, skills.AstrometricRangefinding),
                IsActive = true,
            };

            _probes.Add(probe);
            return probe;
        }

        /// <summary>Move a probe to a new position.</summary>
        public bool MoveProbe(long probeID, float x, float y, float z)
        {
            var probe = _probes.FirstOrDefault(p => p.ProbeID == probeID);
            if (probe == null) return false;
            probe.X = x; probe.Y = y; probe.Z = z;
            return true;
        }

        /// <summary>Adjust probe scan range.</summary>
        public bool SetProbeRange(long probeID, float rangeAU)
        {
            var probe = _probes.FirstOrDefault(p => p.ProbeID == probeID);
            if (probe == null) return false;
            probe.ScanRange = Math.Clamp(rangeAU, 0.25f, 64f);
            return true;
        }

        /// <summary>Recall all probes.</summary>
        public void RecallProbes()
        {
            _probes.RemoveAll(p => p.IsActive);
        }

        // ====================================================================
        // SIGNATURES — system-level
        // ====================================================================

        /// <summary>Add a cosmic signature to the current system.</summary>
        public void AddSignature(CosmicSignature sig)
        {
            _signatures[sig.SignatureID] = sig;
        }

        /// <summary>Generate random signatures for a solar system.</summary>
        public void GenerateSignatures(int count, float systemSecurity)
        {
            for (int i = 0; i < count; i++)
            {
                float maxCoord = 5e12f;    // ~33 AU
                var sig = new CosmicSignature
                {
                    SignatureID = GenerateSignatureID(),
                    ResultType = _rng.NextDouble() < 0.3 ? ScanResultType.CosmicAnomaly : ScanResultType.CosmicSignature,
                    SiteType = (SignatureSiteType)(_rng.Next(1, 6)),
                    Name = GenerateSiteName(),
                    X = (float)(_rng.NextDouble() * 2 - 1) * maxCoord,
                    Y = (float)(_rng.NextDouble() * 2 - 1) * maxCoord * 0.1f,
                    Z = (float)(_rng.NextDouble() * 2 - 1) * maxCoord,
                    SignatureStrength = 0.1f + (float)_rng.NextDouble() * 0.9f,
                    DifficultyLevel = Math.Max(1, (int)(5 * (1 - systemSecurity))),
                };
                _signatures[sig.SignatureID] = sig;
            }
        }

        // ====================================================================
        // SCANNING — core scan logic
        // ====================================================================

        /// <summary>
        /// Execute a scan with all deployed probes.
        /// Returns scan results for all signatures.
        /// </summary>
        public List<ScanResult> ExecuteScan(ScanningSkills skills)
        {
            var results = new List<ScanResult>();
            var activeProbes = _probes.Where(p => p.IsActive).ToList();

            foreach (var sig in _signatures.Values)
            {
                // Calculate probe contributions
                float[] contributions = activeProbes.Select(probe =>
                {
                    float dist = probe.DistanceTo(sig.X, sig.Y, sig.Z);
                    return ScanningFormulas.ProbeContribution(
                        probe.BaseScanStrength, probe.ScanRange,
                        sig.SignatureStrength, dist);
                }).ToArray();

                float scanStrength = ScanningFormulas.CombinedScanStrength(contributions);

                // Anomalies are always visible
                if (sig.ResultType == ScanResultType.CosmicAnomaly)
                    scanStrength = 100;

                // Update persistent scan strength (ratchet — never goes down)
                sig.ScanStrength = Math.Max(sig.ScanStrength, scanStrength);

                // Determine quality
                sig.Quality = sig.ScanStrength switch
                {
                    >= 100 => ScanQuality.Perfect,
                    >= 75 => ScanQuality.Green,
                    >= 25 => ScanQuality.Yellow,
                    > 0 => ScanQuality.Red,
                    _ => ScanQuality.None
                };

                if (sig.ScanStrength <= 0) continue;

                // Calculate estimated position with deviation
                float deviation = ScanningFormulas.ScanDeviation(
                    1e12f, skills.AstrometricPinpointing, sig.ScanStrength);

                sig.DiscoveredX = sig.X + (float)(_rng.NextDouble() * 2 - 1) * deviation;
                sig.DiscoveredY = sig.Y + (float)(_rng.NextDouble() * 2 - 1) * deviation * 0.1f;
                sig.DiscoveredZ = sig.Z + (float)(_rng.NextDouble() * 2 - 1) * deviation;

                if (sig.Quality == ScanQuality.Perfect)
                {
                    sig.DiscoveredX = sig.X;
                    sig.DiscoveredY = sig.Y;
                    sig.DiscoveredZ = sig.Z;
                    OnSignatureLocked?.Invoke(sig);
                }

                results.Add(new ScanResult
                {
                    SignatureID = sig.SignatureID,
                    ResultType = sig.ResultType,
                    SiteType = sig.ScanStrength >= 50 ? sig.SiteType : null,
                    Name = sig.ScanStrength >= 75 ? sig.Name : null,
                    Quality = sig.Quality,
                    ScanStrength = sig.ScanStrength,
                    EstimatedX = sig.DiscoveredX,
                    EstimatedY = sig.DiscoveredY,
                    EstimatedZ = sig.DiscoveredZ,
                });
            }

            OnScanCompleted?.Invoke(results);
            return results;
        }

        // ====================================================================
        // DIRECTIONAL SCAN
        // ====================================================================

        /// <summary>
        /// Perform a directional scan (no probes needed).
        /// Returns entities within angle cone and range.
        /// </summary>
        public List<ScanResult> DirectionalScan(float originX, float originY, float originZ,
            float dirX, float dirY, float dirZ,
            float rangeMeters, float angleDegrees)
        {
            var results = new List<ScanResult>();
            float cosAngle = (float)Math.Cos(angleDegrees * Math.PI / 180 / 2);

            foreach (var sig in _signatures.Values)
            {
                float dx = sig.X - originX, dy = sig.Y - originY, dz = sig.Z - originZ;
                float dist = (float)Math.Sqrt(dx * dx + dy * dy + dz * dz);
                if (dist > rangeMeters || dist < 1) continue;

                // Check angle cone
                float dirLen = (float)Math.Sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
                if (dirLen < 0.001f) continue;

                float dot = (dx * dirX + dy * dirY + dz * dirZ) / (dist * dirLen);
                if (dot < cosAngle) continue;

                // D-scan shows anomalies/cosmic sigs but not their type
                results.Add(new ScanResult
                {
                    SignatureID = sig.SignatureID,
                    ResultType = sig.ResultType,
                    Quality = ScanQuality.Red,
                    ScanStrength = 0,
                    EstimatedX = sig.X,
                    EstimatedY = sig.Y,
                    EstimatedZ = sig.Z,
                });
            }

            return results;
        }

        // ====================================================================
        // UTILITIES
        // ====================================================================

        private string GenerateSignatureID()
        {
            string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            return $"{chars[_rng.Next(26)]}{chars[_rng.Next(26)]}{chars[_rng.Next(26)]}" +
                   $"-{_rng.Next(100, 999)}";
        }

        private string GenerateSiteName()
        {
            string[] prefixes = { "Serpentis", "Blood Raider", "Angel", "Guristas", "Sansha" };
            string[] types = { "Hideaway", "Refuge", "Den", "Forlorn", "Perimeter" };
            return $"{prefixes[_rng.Next(prefixes.Length)]} {types[_rng.Next(types.Length)]}";
        }

        /// <summary>Clear all scan data (e.g., when changing systems).</summary>
        public void ClearSystem()
        {
            _signatures.Clear();
            _probes.Clear();
        }
    }
}
