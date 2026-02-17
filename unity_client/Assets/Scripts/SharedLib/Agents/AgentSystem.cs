// ============================================================================
// AgentSystem.cs — Ported from EvEmu agents/Agent.cpp + agents/AgentMgrService.cpp
//
// NPC agents & mission system: agent interactions, mission generation,
// mission completion, rewards, standing adjustments.
// ============================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using OGameX.SharedLib.Standing;  // for StandingFormulas

namespace OGameX.SharedLib.Agents
{
    // ========================================================================
    // ENUMS
    // ========================================================================

    public enum AgentType
    {
        BasicAgent = 1,
        TutorialAgent = 2,
        ResearchAgent = 3,
        FactionalWarfareAgent = 4,
        EPICAgent = 5,
        AuraAgent = 6,
        CareerAgent = 7,
    }

    public enum MissionState
    {
        Available = 0,
        Offered = 1,
        Accepted = 2,
        InProgress = 3,
        Completed = 4,
        Failed = 5,
        Declined = 6,
        Expired = 7,
    }

    public enum MissionType
    {
        Courier = 1,        // transport cargo
        Mining = 2,         // mine ore
        Kill = 3,           // destroy target(s)
        Trade = 4,          // provide items
        Storyline = 5,      // special chain missions (every 16 missions)
    }

    public enum MissionDifficulty
    {
        Level1 = 1,
        Level2 = 2,
        Level3 = 3,
        Level4 = 4,
        Level5 = 5,
    }

    // ========================================================================
    // DATA STRUCTURES
    // ========================================================================

    /// <summary>
    /// An NPC agent that gives missions.
    /// Source: EvEmu agents/Agent.h
    /// </summary>
    public class Agent
    {
        public int AgentID;
        public string Name;
        public AgentType Type;
        public int Level;                    // 1-5
        public int Quality;                  // -20 to +20 (legacy, affects rewards)
        public int CorporationID;
        public int FactionID;
        public int StationID;
        public int SolarSystemID;
        public int DivisionID;              // mission division (security, mining, etc.)
    }

    /// <summary>
    /// A mission instance.
    /// Source: EvEmu agents/Agent.h / MissionDB
    /// </summary>
    public class Mission
    {
        public long MissionID;
        public int AgentID;
        public int CharacterID;
        public MissionType Type;
        public MissionDifficulty Difficulty;
        public MissionState State;
        public string Title;
        public string Description;

        // Objectives
        public List<MissionObjective> Objectives = new();

        // Rewards
        public float ISKReward;
        public float LPReward;              // loyalty points
        public float StandingReward;         // base standing increase
        public float BonusISK;              // bonus for completing quickly
        public long BonusDeadline;           // Unix timestamp

        // Timing
        public long OfferExpiry;             // when the offer expires
        public long AcceptedTime;
        public long CompletedTime;

        // Location
        public int SourceStationID;
        public int TargetSystemID;
        public int TargetStationID;          // for courier missions

        /// <summary>Check if all objectives are completed.</summary>
        public bool AllObjectivesComplete =>
            Objectives.Count > 0 && Objectives.All(o => o.IsComplete);
    }

    /// <summary>
    /// A single mission objective.
    /// </summary>
    public class MissionObjective
    {
        public string Description;
        public MissionObjectiveType Type;
        public int TargetTypeID;             // type to kill/mine/deliver
        public int TargetQuantity;
        public int CurrentQuantity;

        public bool IsComplete => CurrentQuantity >= TargetQuantity;
    }

    public enum MissionObjectiveType
    {
        KillTarget = 1,
        DeliverItem = 2,
        MineOre = 3,
        TravelTo = 4,
    }

    // ========================================================================
    // AGENT FORMULAS — from EvEMath::Agent
    // ========================================================================

    /// <summary>
    /// Agent interaction formulas.
    /// Source: EvEMath.cpp Agent namespace (already in StandingFormulas, referenced here)
    /// </summary>
    public static class AgentFormulas
    {
        /// <summary>
        /// Check if character meets standing requirement for an agent.
        /// </summary>
        public static bool MeetsRequirement(int agentLevel, int agentQuality,
                                             float effectiveStanding)
        {
            float required = StandingFormulas.RequiredStanding(agentLevel, agentQuality);
            return effectiveStanding >= required;
        }

        /// <summary>
        /// Scale ISK reward by agent effective quality.
        /// </summary>
        public static float ScaleReward(float baseReward, float effectiveQuality)
        {
            return baseReward * (1.0f + effectiveQuality / 100.0f);
        }

        /// <summary>
        /// Calculate LP reward based on mission level and security.
        /// </summary>
        public static float CalculateLPReward(int missionLevel, float systemSecurity)
        {
            float baseLp = missionLevel * 300;
            // Dangerous systems (low sec) give more LP
            float secBonus = Math.Max(0, 1.0f - systemSecurity) * 0.5f;
            return baseLp * (1.0f + secBonus);
        }
    }

    // ========================================================================
    // MISSION GENERATOR — from MissionDataMgr
    // ========================================================================

    /// <summary>
    /// Generates missions for agents.
    /// Source: EvEmu agents/MissionDataMgr.cpp
    /// </summary>
    public class MissionGenerator
    {
        private long _nextMissionID = 1;
        private readonly Random _rng = new();

        // Mission templates per type/level
        private readonly List<MissionTemplate> _templates = new();

        /// <summary>Register a mission template.</summary>
        public void RegisterTemplate(MissionTemplate template)
        {
            _templates.Add(template);
        }

        /// <summary>
        /// Generate a mission offer for an agent.
        /// Source: Agent::MakeMissionOffer logic
        /// </summary>
        public Mission GenerateMission(Agent agent, int characterID, float effectiveQuality)
        {
            // Pick a template appropriate for agent level
            var candidates = _templates
                .Where(t => (int)t.Difficulty == agent.Level)
                .ToList();

            if (candidates.Count == 0)
            {
                // Fallback: generate a basic kill mission
                candidates = _templates.Where(t => t.Type == MissionType.Kill).ToList();
            }

            MissionTemplate template;
            if (candidates.Count > 0)
                template = candidates[_rng.Next(candidates.Count)];
            else
                template = CreateDefaultKillTemplate(agent.Level);

            float baseISK = template.BaseISKReward;
            float scaledISK = AgentFormulas.ScaleReward(baseISK, effectiveQuality);
            long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            var mission = new Mission
            {
                MissionID = _nextMissionID++,
                AgentID = agent.AgentID,
                CharacterID = characterID,
                Type = template.Type,
                Difficulty = template.Difficulty,
                State = MissionState.Offered,
                Title = template.Title,
                Description = template.Description,
                ISKReward = scaledISK,
                LPReward = AgentFormulas.CalculateLPReward(agent.Level, 0.5f),
                StandingReward = template.BaseStandingReward,
                BonusISK = scaledISK * 0.5f,
                BonusDeadline = now + template.BonusTimeSeconds,
                OfferExpiry = now + 86400 * 7,   // 7 days to accept
                SourceStationID = agent.StationID,
                TargetSystemID = template.TargetSystemID,
                TargetStationID = template.TargetStationID,
            };

            // Generate objectives
            foreach (var objTemplate in template.Objectives)
            {
                mission.Objectives.Add(new MissionObjective
                {
                    Description = objTemplate.Description,
                    Type = objTemplate.Type,
                    TargetTypeID = objTemplate.TargetTypeID,
                    TargetQuantity = objTemplate.TargetQuantity,
                    CurrentQuantity = 0,
                });
            }

            return mission;
        }

        private MissionTemplate CreateDefaultKillTemplate(int level)
        {
            return new MissionTemplate
            {
                Title = $"Eliminate Hostiles (L{level})",
                Description = "Destroy all hostile targets in the designated area.",
                Type = MissionType.Kill,
                Difficulty = (MissionDifficulty)level,
                BaseISKReward = level * 100000,
                BaseStandingReward = 0.01f * level,
                BonusTimeSeconds = 3600 * 4,
                Objectives = new()
                {
                    new MissionObjectiveTemplate
                    {
                        Description = "Destroy hostile ships",
                        Type = MissionObjectiveType.KillTarget,
                        TargetTypeID = 0,
                        TargetQuantity = level * 3,
                    }
                }
            };
        }
    }

    /// <summary>
    /// Template for generating missions.
    /// </summary>
    public class MissionTemplate
    {
        public string Title;
        public string Description;
        public MissionType Type;
        public MissionDifficulty Difficulty;
        public float BaseISKReward;
        public float BaseStandingReward;
        public long BonusTimeSeconds;
        public int TargetSystemID;
        public int TargetStationID;
        public List<MissionObjectiveTemplate> Objectives = new();
    }

    public struct MissionObjectiveTemplate
    {
        public string Description;
        public MissionObjectiveType Type;
        public int TargetTypeID;
        public int TargetQuantity;
    }

    // ========================================================================
    // AGENT SYSTEM — main logic
    // ========================================================================

    /// <summary>
    /// Manages agent interactions and mission lifecycle.
    /// Source: EvEmu agents/AgentMgrService.cpp
    /// </summary>
    public class AgentSystem
    {
        private readonly Dictionary<int, Agent> _agents = new();
        private readonly Dictionary<long, Mission> _missions = new();
        private readonly MissionGenerator _generator = new();
        private int _missionCount;                            // for storyline tracking

        // Events
        public event Action<Mission> OnMissionOffered;
        public event Action<Mission> OnMissionAccepted;
        public event Action<Mission> OnMissionCompleted;
        public event Action<Mission> OnMissionFailed;
        public event Action<Mission> OnMissionDeclined;

        // ====================================================================
        // REGISTRATION
        // ====================================================================

        public void RegisterAgent(Agent agent) => _agents[agent.AgentID] = agent;
        public Agent GetAgent(int agentID) => _agents.GetValueOrDefault(agentID);

        public void RegisterMissionTemplate(MissionTemplate template)
            => _generator.RegisterTemplate(template);

        // ====================================================================
        // AGENT INTERACTION
        // ====================================================================

        /// <summary>
        /// Request a mission from an agent.
        /// Returns null if standing too low or agent unavailable.
        /// Source: Agent::MakeMissionOffer
        /// </summary>
        public Mission RequestMission(int agentID, int characterID,
                                       float effectiveStanding, float effectiveQuality)
        {
            var agent = GetAgent(agentID);
            if (agent == null) return null;

            if (!AgentFormulas.MeetsRequirement(agent.Level, agent.Quality, effectiveStanding))
                return null;

            // Check if character already has a mission from this agent
            var existing = _missions.Values.FirstOrDefault(m =>
                m.AgentID == agentID && m.CharacterID == characterID &&
                m.State is MissionState.Offered or MissionState.Accepted or MissionState.InProgress);

            if (existing != null) return existing;

            var mission = _generator.GenerateMission(agent, characterID, effectiveQuality);
            _missions[mission.MissionID] = mission;
            OnMissionOffered?.Invoke(mission);
            return mission;
        }

        /// <summary>Accept a mission offer.</summary>
        public bool AcceptMission(long missionID, int characterID)
        {
            if (!_missions.TryGetValue(missionID, out var mission)) return false;
            if (mission.CharacterID != characterID) return false;
            if (mission.State != MissionState.Offered) return false;

            mission.State = MissionState.Accepted;
            mission.AcceptedTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            OnMissionAccepted?.Invoke(mission);
            return true;
        }

        /// <summary>Decline a mission (standing penalty).</summary>
        public bool DeclineMission(long missionID, int characterID)
        {
            if (!_missions.TryGetValue(missionID, out var mission)) return false;
            if (mission.CharacterID != characterID) return false;
            if (mission.State != MissionState.Offered) return false;

            mission.State = MissionState.Declined;
            OnMissionDeclined?.Invoke(mission);
            return true;
        }

        /// <summary>
        /// Update mission objective progress (kill, mine, deliver).
        /// </summary>
        public void UpdateObjective(long missionID, MissionObjectiveType type,
                                     int targetTypeID, int quantity)
        {
            if (!_missions.TryGetValue(missionID, out var mission)) return;
            if (mission.State != MissionState.Accepted && mission.State != MissionState.InProgress)
                return;

            mission.State = MissionState.InProgress;

            foreach (var obj in mission.Objectives)
            {
                if (obj.Type == type &&
                    (obj.TargetTypeID == 0 || obj.TargetTypeID == targetTypeID))
                {
                    obj.CurrentQuantity = Math.Min(obj.TargetQuantity,
                        obj.CurrentQuantity + quantity);
                }
            }
        }

        /// <summary>
        /// Turn in a completed mission. Returns (ISK, LP, standing) rewards.
        /// Source: Agent::CompleteMission
        /// </summary>
        public (float isk, float lp, float standing) CompleteMission(long missionID, int characterID)
        {
            if (!_missions.TryGetValue(missionID, out var mission))
                return (0, 0, 0);
            if (mission.CharacterID != characterID) return (0, 0, 0);
            if (!mission.AllObjectivesComplete) return (0, 0, 0);

            mission.State = MissionState.Completed;
            mission.CompletedTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            float isk = mission.ISKReward;
            float lp = mission.LPReward;
            float standing = mission.StandingReward;

            // Bonus rewards if completed before deadline
            if (mission.CompletedTime <= mission.BonusDeadline)
                isk += mission.BonusISK;

            _missionCount++;

            OnMissionCompleted?.Invoke(mission);
            return (isk, lp, standing);
        }

        /// <summary>Check if a storyline mission should be offered (every 16 missions).</summary>
        public bool IsStorylineDue() => _missionCount > 0 && _missionCount % 16 == 0;

        /// <summary>Fail a mission (expired or player fails objectives).</summary>
        public void FailMission(long missionID)
        {
            if (!_missions.TryGetValue(missionID, out var mission)) return;
            mission.State = MissionState.Failed;
            OnMissionFailed?.Invoke(mission);
        }

        /// <summary>Get active missions for a character.</summary>
        public List<Mission> GetActiveMissions(int characterID)
        {
            return _missions.Values
                .Where(m => m.CharacterID == characterID &&
                            m.State is MissionState.Accepted or MissionState.InProgress)
                .ToList();
        }
    }
}
