// ============================================================================
// StandingSystem.cs — Ported from EvEmu standing/Standing.cpp + EvEMath.cpp
//
// Reputation system: standings between characters, corps, factions.
// Affects agent access, market fees, station taxes, aggression flags.
// ============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Standing
{
    // ========================================================================
    // CONSTANTS
    // ========================================================================
    public static class StandingConstants
    {
        public const float MinStanding = -10.0f;
        public const float MaxStanding = 10.0f;
        public const float NeutralStanding = 0.0f;

        // Security status thresholds
        public const float HighSecThreshold = -2.0f;   // below this = denied entry to 1.0 systems
        public const float LowSecWarning = -5.0f;       // shoot on sight by CONCORD in high-sec

        // Decay
        public const float DecayRate = 0.02f;           // 2% decay per period
        public const int DecayPeriodHours = 24;          // daily decay
    }

    // ========================================================================
    // ENUMS — from Standing.h event type comments
    // ========================================================================
    public enum StandingEventType
    {
        // Agent/Mission events
        AgentBuyOff = 1,
        AgentDonation = 2,
        AgentMissionBonus = 3,
        AgentMissionCompleted = 4,
        AgentMissionDeclined = 5,
        AgentMissionFailed = 6,
        AgentMissionOfferExpired = 7,

        // Combat events
        CombatAggression = 8,
        CombatOther = 9,
        CombatPodKill = 10,
        CombatShipKill = 11,

        // Automatic adjustments
        Decay = 12,
        DerivedModificationNegative = 13,
        DerivedModificationPositive = 14,

        // Initial standings
        InitialCorpAgent = 15,
        InitialFactionAlly = 16,
        InitialFactionCorp = 17,
        InitialFactionEnemy = 18,

        // Other
        PirateKillSecurityStatus = 19,
        PlayerCorpSetStanding = 20,
        PlayerSetStanding = 21,
        SlashSetStanding = 22,           // GM intervention
        StandingReset = 23,
        TutorialAgentInitial = 24,
    }

    // ========================================================================
    // DATA STRUCTURES
    // ========================================================================

    /// <summary>
    /// A standing value between two entities.
    /// </summary>
    public class StandingEntry
    {
        public int FromID;                   // entity granting the standing
        public int ToID;                     // entity receiving the standing
        public float Value;                  // -10.0 to +10.0
        public long LastUpdated;             // Unix timestamp
    }

    /// <summary>
    /// Record of a standing change event.
    /// </summary>
    public struct StandingTransaction
    {
        public int FromID;
        public int ToID;
        public StandingEventType EventType;
        public float Change;
        public float NewValue;
        public long Timestamp;
        public string Message;
    }

    // ========================================================================
    // STANDING FORMULAS — from EvEMath::Agent namespace
    // ========================================================================

    /// <summary>
    /// Pure formula calculations for standings.
    /// Source: EvEMath.cpp Agent namespace
    /// </summary>
    public static class StandingFormulas
    {
        /// <summary>
        /// Calculate effective standing with skill bonuses.
        /// Formula: (1 - (1 - YourStanding/10) * (1 - standingBonus/10)) * 10
        /// Source: EvEMath::Agent::EffectiveStanding
        /// </summary>
        public static float EffectiveStanding(float yourStanding, float standingBonus)
        {
            return (1.0f - (1.0f - yourStanding / 10.0f) * (1.0f - standingBonus / 10.0f)) * 10.0f;
        }

        /// <summary>
        /// Calculate standing bonus from skills.
        /// Diplomacy (negative standings), Connections (positive), Criminal Connections (pirates).
        /// Source: EvEMath::Agent::GetStandingBonus
        /// </summary>
        public static float GetStandingBonus(float fromStanding, int fromFactionID,
            int connectionsLevel, int diplomacyLevel, int criminalConnectionsLevel)
        {
            if (fromStanding < 0.0f)
                return diplomacyLevel * 0.4f;

            if (fromStanding > 0.0f)
            {
                // Pirate factions use Criminal Connections
                return IsPirateFaction(fromFactionID)
                    ? criminalConnectionsLevel * 0.4f
                    : connectionsLevel * 0.4f;
            }

            return 0.0f;
        }

        /// <summary>
        /// Required standing to use an agent.
        /// Formula: ((AgentLevel - 1) * 2) + (AgentQuality / 20)
        /// Source: EvEMath::Agent::RequiredStanding
        /// </summary>
        public static float RequiredStanding(int agentLevel, int agentQuality)
        {
            return ((agentLevel - 1.0f) * 2.0f) + (agentQuality / 20.0f);
        }

        /// <summary>
        /// Standing increase from completing a mission.
        /// Formula: baseIncrease * (1 + 0.05 * socialSkillLevel)
        /// Source: EvEMath::Agent::MissionStandingIncrease
        /// </summary>
        public static float MissionStandingIncrease(float baseIncrease, int socialSkillLevel)
        {
            return baseIncrease * (1.0f + 0.05f * socialSkillLevel);
        }

        /// <summary>
        /// Apply standing increase toward 10.0 cap.
        /// Formula: ((10 - currentStanding) * percentIncrease) + currentStanding
        /// Source: EvEMath::Agent::AgentStandingIncrease
        /// </summary>
        public static float AgentStandingIncrease(float currentStanding, float percentIncrease)
        {
            return ((10.0f - currentStanding) * percentIncrease) + currentStanding;
        }

        /// <summary>
        /// Agent efficiency rating.
        /// Formula: 0.01 * ((8 * level) + (0.1 * quality) - 4)
        /// Source: EvEMath::Agent::Efficiency
        /// </summary>
        public static float AgentEfficiency(int level, int quality)
        {
            return 0.01f * ((8.0f * level) + (0.1f * quality) - 4.0f);
        }

        /// <summary>
        /// Agent effective quality (affects rewards).
        /// Formula: quality + (5 * negotiationLevel) + personalStanding
        /// Source: EvEMath::Agent::EffectiveQuality
        /// </summary>
        public static float EffectiveQuality(int quality, int negotiationLevel, float personalStanding)
        {
            return quality + (5.0f * negotiationLevel) + personalStanding;
        }

        /// <summary>
        /// Check if a faction is considered pirate (for skill bonus routing).
        /// </summary>
        public static bool IsPirateFaction(int factionID)
        {
            // EvEmu pirate faction IDs: Serpentis, Angel, Guristas, Blood, Sansha
            return factionID is 500010 or 500011 or 500012 or 500019 or 500020;
        }
    }

    // ========================================================================
    // STANDING SYSTEM — main logic
    // ========================================================================

    /// <summary>
    /// Manages all standings for a character.
    /// Ported from EvEmu standing/Standing.cpp + StandingMgr.cpp
    /// </summary>
    public class StandingSystem
    {
        // fromID → toID → standing
        private readonly Dictionary<int, Dictionary<int, StandingEntry>> _standings = new();
        private readonly List<StandingTransaction> _transactions = new();
        private long _lastDecayTime;

        // Character skill levels for modifiers
        public int DiplomacyLevel { get; set; }
        public int ConnectionsLevel { get; set; }
        public int CriminalConnectionsLevel { get; set; }
        public int SocialLevel { get; set; }

        // Events
        public event Action<StandingTransaction> OnStandingChanged;

        // ====================================================================
        // QUERIES
        // ====================================================================

        /// <summary>
        /// Get raw standing between two entities.
        /// </summary>
        public float GetStanding(int fromID, int toID)
        {
            if (_standings.TryGetValue(fromID, out var inner) &&
                inner.TryGetValue(toID, out var entry))
            {
                return entry.Value;
            }
            return StandingConstants.NeutralStanding;
        }

        /// <summary>
        /// Get effective standing (with skill bonuses applied).
        /// </summary>
        public float GetEffectiveStanding(int fromID, int toID, int fromFactionID = 0)
        {
            float raw = GetStanding(fromID, toID);
            float bonus = StandingFormulas.GetStandingBonus(raw, fromFactionID,
                ConnectionsLevel, DiplomacyLevel, CriminalConnectionsLevel);
            return StandingFormulas.EffectiveStanding(raw, bonus);
        }

        /// <summary>
        /// Get all standings from a specific entity.
        /// </summary>
        public IReadOnlyDictionary<int, StandingEntry> GetStandingsFrom(int fromID)
        {
            if (_standings.TryGetValue(fromID, out var inner))
                return inner;
            return new Dictionary<int, StandingEntry>();
        }

        /// <summary>
        /// Get standing transaction history.
        /// </summary>
        public IReadOnlyList<StandingTransaction> GetTransactions(int fromID = 0, int toID = 0, int limit = 50)
        {
            var query = _transactions.AsEnumerable();
            if (fromID != 0) query = query.Where(t => t.FromID == fromID);
            if (toID != 0)   query = query.Where(t => t.ToID == toID);
            return query.OrderByDescending(t => t.Timestamp).Take(limit).ToList();
        }

        // ====================================================================
        // MODIFICATIONS
        // ====================================================================

        /// <summary>
        /// Set standing between two entities, clamped to [-10, 10].
        /// </summary>
        public void SetStanding(int fromID, int toID, float value,
                                StandingEventType eventType, string message = "")
        {
            value = Math.Clamp(value, StandingConstants.MinStanding, StandingConstants.MaxStanding);

            if (!_standings.ContainsKey(fromID))
                _standings[fromID] = new Dictionary<int, StandingEntry>();

            float oldValue = GetStanding(fromID, toID);

            _standings[fromID][toID] = new StandingEntry
            {
                FromID = fromID,
                ToID = toID,
                Value = value,
                LastUpdated = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };

            var transaction = new StandingTransaction
            {
                FromID = fromID,
                ToID = toID,
                EventType = eventType,
                Change = value - oldValue,
                NewValue = value,
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                Message = message
            };

            _transactions.Add(transaction);
            OnStandingChanged?.Invoke(transaction);
        }

        /// <summary>
        /// Modify standing by a delta amount (additive), clamped.
        /// </summary>
        public void ModifyStanding(int fromID, int toID, float delta,
                                   StandingEventType eventType, string message = "")
        {
            float current = GetStanding(fromID, toID);
            SetStanding(fromID, toID, current + delta, eventType, message);
        }

        /// <summary>
        /// Apply mission completion standing increase.
        /// Uses the EvEmu formula: approaches +10 asymptotically.
        /// </summary>
        public void ApplyMissionComplete(int fromID, int toID, float baseMissionIncrease)
        {
            float current = GetStanding(fromID, toID);
            float increase = StandingFormulas.MissionStandingIncrease(baseMissionIncrease, SocialLevel);
            float newValue = StandingFormulas.AgentStandingIncrease(current, increase);
            SetStanding(fromID, toID, newValue,
                StandingEventType.AgentMissionCompleted, "Mission completed");
        }

        /// <summary>
        /// Apply mission decline/fail penalty.
        /// </summary>
        public void ApplyMissionPenalty(int fromID, int toID, float penalty,
                                       StandingEventType eventType, string missionName = "")
        {
            ModifyStanding(fromID, toID, -Math.Abs(penalty), eventType,
                $"Mission penalty: {missionName}");
        }

        // ====================================================================
        // DERIVED STANDINGS
        // ====================================================================

        /// <summary>
        /// Calculate derived standing modification.
        /// When you gain standing with A, A's friends gain standing with you
        /// and A's enemies lose standing with you.
        /// </summary>
        public void ApplyDerivedStandings(int fromID, int toID, float change)
        {
            var fromStandings = GetStandingsFrom(fromID);
            foreach (var (thirdPartyID, entry) in fromStandings)
            {
                if (thirdPartyID == toID) continue;

                // Derived = fraction of original change, proportional to relationship
                float derivedChange = change * entry.Value / 10.0f * 0.1f;
                if (Math.Abs(derivedChange) < 0.001f) continue;

                var eventType = derivedChange > 0
                    ? StandingEventType.DerivedModificationPositive
                    : StandingEventType.DerivedModificationNegative;

                ModifyStanding(thirdPartyID, toID, derivedChange, eventType,
                    derivedChange > 0
                        ? $"Pleased by actions for {fromID}'s friends"
                        : $"Displeased by actions against {fromID}'s friends");
            }
        }

        // ====================================================================
        // SECURITY STATUS
        // ====================================================================

        /// <summary>
        /// Modify security status after killing an NPC pirate.
        /// Source: standing event PirateKillSecurityStatus
        /// </summary>
        public void ApplySecurityStatusGain(int characterID, float gain)
        {
            float current = GetStanding(0, characterID);  // 0 = CONCORD
            float newValue = Math.Min(StandingConstants.MaxStanding, current + gain);
            SetStanding(0, characterID, newValue,
                StandingEventType.PirateKillSecurityStatus, "Pirate kill security gain");
        }

        /// <summary>
        /// Apply security status penalty for criminal actions.
        /// </summary>
        public void ApplySecurityStatusPenalty(int characterID, float penalty)
        {
            float current = GetStanding(0, characterID);
            float newValue = Math.Max(StandingConstants.MinStanding, current - Math.Abs(penalty));
            SetStanding(0, characterID, newValue,
                StandingEventType.CombatAggression, "Criminal action penalty");
        }

        /// <summary>
        /// Check if character has high-sec access.
        /// </summary>
        public bool CanAccessHighSec(int characterID)
        {
            return GetStanding(0, characterID) > StandingConstants.HighSecThreshold;
        }

        // ====================================================================
        // DECAY
        // ====================================================================

        /// <summary>
        /// Apply standing decay. All standings slowly approach 0 over time.
        /// Source: Standing.h — "All standings decay by a certain amount on a regular basis"
        /// </summary>
        public void ProcessDecay(long currentTime)
        {
            long decayPeriodSeconds = StandingConstants.DecayPeriodHours * 3600;
            if (currentTime - _lastDecayTime < decayPeriodSeconds)
                return;

            _lastDecayTime = currentTime;

            foreach (var fromEntry in _standings.Values)
            {
                foreach (var entry in fromEntry.Values)
                {
                    if (Math.Abs(entry.Value) < 0.01f) continue;

                    // Decay toward 0
                    float decayed = entry.Value * (1.0f - StandingConstants.DecayRate);
                    if (Math.Abs(decayed) < 0.01f)
                        decayed = 0;

                    entry.Value = decayed;
                    entry.LastUpdated = currentTime;
                }
            }
        }

        // ====================================================================
        // LOAD/SAVE
        // ====================================================================

        /// <summary>
        /// Load a standing entry from database.
        /// </summary>
        public void LoadStanding(int fromID, int toID, float value, long lastUpdated)
        {
            if (!_standings.ContainsKey(fromID))
                _standings[fromID] = new Dictionary<int, StandingEntry>();

            _standings[fromID][toID] = new StandingEntry
            {
                FromID = fromID,
                ToID = toID,
                Value = Math.Clamp(value, StandingConstants.MinStanding, StandingConstants.MaxStanding),
                LastUpdated = lastUpdated
            };
        }
    }
}
