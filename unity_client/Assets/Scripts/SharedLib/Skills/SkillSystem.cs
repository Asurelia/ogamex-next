// ============================================================================
// SkillSystem.cs — Ported from EvEmu character/Skill.cpp + EvEMath.cpp
//
// Skill training, SP calculations, queue management, prerequisite validation.
// Source formulas: http://wiki.eve-id.net/Equations
// ============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Skills
{
    // ========================================================================
    // CONSTANTS
    // ========================================================================
    public static class SkillConstants
    {
        public const int MaxSkillLevel = 5;
        public const float SkillPointMultiplier = 250f;     // base SP multiplier
        // log(sqrt(32)) used for inverse SP→Level calculation
        public static readonly float DivConstant = (float)Math.Log(Math.Sqrt(32));

        // Character attributes
        public const int BaseAttributePoints = 17;          // per attribute at creation
        public const int BonusAttributePoints = 14;         // distributable bonus
        public const int TotalAttributePoints = BaseAttributePoints * 5 + BonusAttributePoints;
        public const int MinAttribute = 17;
        public const int MaxAttribute = 27;                 // without implants

        // Training queue
        public const int MaxQueueLength = 50;               // max skills in queue
        public const long MaxQueueTimeSeconds = 24 * 60 * 60; // 24h for Alpha, unlimited for Omega
    }

    // ========================================================================
    // ENUMS
    // ========================================================================
    public enum SkillAttribute
    {
        Charisma = 164,
        Intelligence = 165,
        Memory = 166,
        Perception = 167,
        Willpower = 168
    }

    public enum SkillInjectionResult
    {
        Success = 1,
        PrerequisitesIncomplete = 2,
        AlreadyKnown = 3,
        SplitFail = 4,
        LoadFail = 5
    }

    // ========================================================================
    // DATA STRUCTURES
    // ========================================================================

    /// <summary>
    /// Definition of a skill type (static data).
    /// </summary>
    public class SkillDefinition
    {
        public int TypeID;
        public string Name;
        public int GroupID;
        public float Rank;                                  // timeConstant — multiplier for training time
        public SkillAttribute PrimaryAttribute;
        public SkillAttribute SecondaryAttribute;

        // Prerequisites: up to 6 required skills
        public SkillPrerequisite[] Prerequisites = Array.Empty<SkillPrerequisite>();
    }

    public struct SkillPrerequisite
    {
        public int SkillTypeID;
        public int RequiredLevel;
    }

    /// <summary>
    /// A character's learned skill instance.
    /// </summary>
    public class CharacterSkill
    {
        public int TypeID;
        public int Level;
        public int SkillPoints;
        public bool IsTraining;
        public long TrainingStartTime;                      // Unix timestamp (seconds)

        public SkillDefinition Definition;
    }

    /// <summary>
    /// An entry in the skill training queue.
    /// </summary>
    public struct SkillQueueEntry
    {
        public int TypeID;
        public int TargetLevel;
        public long StartTime;                              // Unix timestamp when training begins
        public long EndTime;                                // Unix timestamp when training finishes
    }

    /// <summary>
    /// Character attributes used for SP/min calculation.
    /// </summary>
    public class CharacterAttributes
    {
        public int Charisma = SkillConstants.BaseAttributePoints;
        public int Intelligence = SkillConstants.BaseAttributePoints;
        public int Memory = SkillConstants.BaseAttributePoints;
        public int Perception = SkillConstants.BaseAttributePoints;
        public int Willpower = SkillConstants.BaseAttributePoints;

        // Implant bonuses (additive)
        public int CharismaBonus;
        public int IntelligenceBonus;
        public int MemoryBonus;
        public int PerceptionBonus;
        public int WillpowerBonus;

        public int GetEffective(SkillAttribute attr)
        {
            return attr switch
            {
                SkillAttribute.Charisma     => Charisma + CharismaBonus,
                SkillAttribute.Intelligence => Intelligence + IntelligenceBonus,
                SkillAttribute.Memory       => Memory + MemoryBonus,
                SkillAttribute.Perception   => Perception + PerceptionBonus,
                SkillAttribute.Willpower    => Willpower + WillpowerBonus,
                _ => SkillConstants.BaseAttributePoints
            };
        }
    }

    // ========================================================================
    // SKILL FORMULAS — from EvEMath.cpp
    // ========================================================================

    /// <summary>
    /// Pure math formulas for skill point calculations.
    /// Source: EvEMath::Skill namespace in evemu_Crucible/src/eve-common/utils/EvEMath.cpp
    /// </summary>
    public static class SkillFormulas
    {
        /// <summary>
        /// SP required to reach a given level for a skill of given rank.
        /// Formula: ceil(sqrt(32)^(level-1) * 250 * rank)
        /// </summary>
        public static int PointsAtLevel(int level, float rank)
        {
            if (level <= 0) return 0;
            if (level > SkillConstants.MaxSkillLevel)
                level = SkillConstants.MaxSkillLevel;

            double result = Math.Pow(Math.Sqrt(32), level - 1)
                          * SkillConstants.SkillPointMultiplier
                          * rank;
            return (int)Math.Ceiling(result);
        }

        /// <summary>
        /// Determine skill level from current SP and rank.
        /// Inverse of PointsAtLevel.
        /// </summary>
        public static int LevelForPoints(int currentSP, float rank)
        {
            float baseSLC = rank * SkillConstants.SkillPointMultiplier;
            if (baseSLC <= 0 || currentSP < baseSLC) return 0;

            int level = (int)(Math.Log(currentSP / baseSLC) / SkillConstants.DivConstant) + 1;
            return Math.Min(level, SkillConstants.MaxSkillLevel);
        }

        /// <summary>
        /// Skill points earned per minute based on character attributes.
        /// Formula: primaryAttr + 0.5 * secondaryAttr
        /// </summary>
        public static float PointsPerMinute(int primaryAttr, int secondaryAttr)
        {
            return primaryAttr + 0.5f * secondaryAttr;
        }

        /// <summary>
        /// Calculate training time in seconds for remaining SP.
        /// </summary>
        public static int TrainingTimeSeconds(int remainingSP, float spPerMinute)
        {
            if (spPerMinute <= 0) return int.MaxValue;
            return (int)Math.Ceiling(remainingSP / spPerMinute * 60f);
        }

        /// <summary>
        /// End timestamp for training, given current SP, target SP, and rate.
        /// Source: EvEMath::Skill::EndTime
        /// </summary>
        public static long EndTime(int currentSP, int nextLevelSP, float spPerMinute, long timeNow)
        {
            if (currentSP >= nextLevelSP) return 0;
            long trainingSeconds = (long)Math.Ceiling((nextLevelSP - currentSP) / spPerMinute * 60f);
            return timeNow + trainingSeconds;
        }
    }

    // ========================================================================
    // SKILL SYSTEM — main game logic
    // ========================================================================

    /// <summary>
    /// Manages skills for a single character: training, queue, validation.
    /// Ported from EvEmu character/Skill.cpp + SkillMgrService.cpp
    /// </summary>
    public class SkillSystem
    {
        // Character data
        private readonly CharacterAttributes _attributes;
        private readonly Dictionary<int, CharacterSkill> _skills = new();
        private readonly List<SkillQueueEntry> _queue = new();
        private readonly Dictionary<int, SkillDefinition> _definitions;

        // Events
        public event Action<CharacterSkill> OnSkillTrained;
        public event Action<CharacterSkill> OnSkillInjected;
        public event Action<List<SkillQueueEntry>> OnQueueUpdated;

        public SkillSystem(CharacterAttributes attributes, Dictionary<int, SkillDefinition> skillDefinitions)
        {
            _attributes = attributes;
            _definitions = skillDefinitions;
        }

        // ====================================================================
        // PROPERTIES
        // ====================================================================

        public IReadOnlyDictionary<int, CharacterSkill> Skills => _skills;
        public IReadOnlyList<SkillQueueEntry> Queue => _queue;
        public CharacterAttributes Attributes => _attributes;
        public int TotalSkillPoints => _skills.Values.Sum(s => s.SkillPoints);

        // ====================================================================
        // SP QUERIES
        // ====================================================================

        /// <summary>
        /// Get SP/min for a specific skill based on character attributes.
        /// </summary>
        public float GetSPPerMinute(SkillDefinition def)
        {
            int primary = _attributes.GetEffective(def.PrimaryAttribute);
            int secondary = _attributes.GetEffective(def.SecondaryAttribute);
            return SkillFormulas.PointsPerMinute(primary, secondary);
        }

        /// <summary>
        /// Get current SP for a skill, accounting for active training.
        /// Source: Skill::GetCurrentSP in Skill.cpp
        /// </summary>
        public int GetCurrentSP(int typeID, long currentTime)
        {
            if (!_skills.TryGetValue(typeID, out var skill)) return 0;

            int sp = skill.SkillPoints;
            if (!skill.IsTraining || skill.TrainingStartTime <= 0) return sp;
            if (skill.TrainingStartTime > currentTime) return sp;

            long elapsedSeconds = currentTime - skill.TrainingStartTime;
            float spPerMin = GetSPPerMinute(skill.Definition);
            int delta = (int)(elapsedSeconds / 60f * spPerMin);
            return sp + delta;
        }

        /// <summary>
        /// Get remaining SP to next level.
        /// Source: Skill::GetRemainingSP in Skill.cpp
        /// </summary>
        public int GetRemainingSP(int typeID, long currentTime)
        {
            if (!_skills.TryGetValue(typeID, out var skill)) return 0;
            if (skill.Level >= SkillConstants.MaxSkillLevel) return 0;

            int nextLevelSP = SkillFormulas.PointsAtLevel(skill.Level + 1, skill.Definition.Rank);
            int currentSP = GetCurrentSP(typeID, currentTime);
            return Math.Max(0, nextLevelSP - currentSP);
        }

        /// <summary>
        /// Get training time in seconds for a skill to reach its next level.
        /// Source: Skill::GetTrainingTime in Skill.cpp
        /// </summary>
        public int GetTrainingTimeSeconds(int typeID, long currentTime)
        {
            if (!_skills.TryGetValue(typeID, out var skill)) return 0;

            int remaining = GetRemainingSP(typeID, currentTime);
            float spPerMin = GetSPPerMinute(skill.Definition);
            return SkillFormulas.TrainingTimeSeconds(remaining, spPerMin);
        }

        // ====================================================================
        // SKILL INJECTION
        // ====================================================================

        /// <summary>
        /// Inject a new skill into the character's brain.
        /// Source: SkillMgrBound::InjectSkillIntoBrain
        /// </summary>
        public SkillInjectionResult InjectSkill(int typeID)
        {
            if (!_definitions.TryGetValue(typeID, out var def))
                return SkillInjectionResult.LoadFail;

            if (_skills.ContainsKey(typeID))
                return SkillInjectionResult.AlreadyKnown;

            if (!ArePrerequisitesMet(def))
                return SkillInjectionResult.PrerequisitesIncomplete;

            var skill = new CharacterSkill
            {
                TypeID = typeID,
                Level = 0,
                SkillPoints = 0,
                IsTraining = false,
                TrainingStartTime = 0,
                Definition = def
            };

            _skills[typeID] = skill;
            OnSkillInjected?.Invoke(skill);
            return SkillInjectionResult.Success;
        }

        // ====================================================================
        // PREREQUISITE CHECKING
        // ====================================================================

        /// <summary>
        /// Check if all prerequisites for a skill definition are met.
        /// Source: Skill::SkillPrereqsComplete — checks up to 6 prereqs deep.
        /// </summary>
        public bool ArePrerequisitesMet(SkillDefinition def)
        {
            foreach (var prereq in def.Prerequisites)
            {
                if (!_skills.TryGetValue(prereq.SkillTypeID, out var charSkill))
                    return false;
                if (charSkill.Level < prereq.RequiredLevel)
                    return false;
            }
            return true;
        }

        /// <summary>
        /// Check if character can fit a module requiring specific skills.
        /// Source: Skill::FitModuleSkillCheck — checks up to 6 skill requirements.
        /// </summary>
        public bool CanFitModule(SkillPrerequisite[] moduleRequirements)
        {
            foreach (var req in moduleRequirements)
            {
                if (!_skills.TryGetValue(req.SkillTypeID, out var charSkill))
                    return false;
                if (charSkill.Level < req.RequiredLevel)
                    return false;
            }
            return true;
        }

        // ====================================================================
        // SKILL QUEUE
        // ====================================================================

        /// <summary>
        /// Add a skill to the end of the training queue.
        /// Source: SkillMgrBound::AddToEndOfSkillQueue
        /// </summary>
        public bool AddToQueue(int typeID, int targetLevel)
        {
            if (_queue.Count >= SkillConstants.MaxQueueLength)
                return false;

            if (targetLevel < 1 || targetLevel > SkillConstants.MaxSkillLevel)
                return false;

            if (!_skills.ContainsKey(typeID) && !_definitions.ContainsKey(typeID))
                return false;

            // Don't add duplicate entries
            if (_queue.Any(q => q.TypeID == typeID && q.TargetLevel == targetLevel))
                return false;

            _queue.Add(new SkillQueueEntry
            {
                TypeID = typeID,
                TargetLevel = targetLevel,
                StartTime = 0,
                EndTime = 0
            });

            UpdateQueueTimes(DateTimeOffset.UtcNow.ToUnixTimeSeconds());
            OnQueueUpdated?.Invoke(_queue);
            return true;
        }

        /// <summary>
        /// Save a complete skill queue (replaces current).
        /// Source: SkillMgrBound::SaveSkillQueue
        /// </summary>
        public void SaveQueue(List<(int typeID, int level)> entries)
        {
            _queue.Clear();
            foreach (var (typeID, level) in entries)
            {
                _queue.Add(new SkillQueueEntry
                {
                    TypeID = typeID,
                    TargetLevel = level,
                    StartTime = 0,
                    EndTime = 0
                });
            }
            UpdateQueueTimes(DateTimeOffset.UtcNow.ToUnixTimeSeconds());
            OnQueueUpdated?.Invoke(_queue);
        }

        /// <summary>
        /// Pause the skill queue.
        /// Source: SkillMgrBound::CharStopTrainingSkill
        /// </summary>
        public void PauseQueue(long currentTime)
        {
            // Commit accumulated SP to the front skill
            if (_queue.Count > 0)
            {
                var front = _queue[0];
                if (_skills.TryGetValue(front.TypeID, out var skill) && skill.IsTraining)
                {
                    skill.SkillPoints = GetCurrentSP(front.TypeID, currentTime);
                    skill.IsTraining = false;
                    skill.TrainingStartTime = 0;
                }
            }
        }

        /// <summary>
        /// Resume training from the front of the queue.
        /// Source: SkillMgrBound::CharStartTrainingSkillByTypeID
        /// </summary>
        public void ResumeQueue(long currentTime)
        {
            if (_queue.Count == 0) return;

            var front = _queue[0];
            if (_skills.TryGetValue(front.TypeID, out var skill))
            {
                skill.IsTraining = true;
                skill.TrainingStartTime = currentTime;
            }

            UpdateQueueTimes(currentTime);
        }

        /// <summary>
        /// Recalculate all start/end times in the queue.
        /// Source: Character::UpdateSkillQueueEndTime
        /// </summary>
        public void UpdateQueueTimes(long currentTime)
        {
            long cursor = currentTime;

            for (int i = 0; i < _queue.Count; i++)
            {
                var entry = _queue[i];
                _skills.TryGetValue(entry.TypeID, out var skill);
                var def = skill?.Definition ?? _definitions.GetValueOrDefault(entry.TypeID);
                if (def == null) continue;

                int currentSP = skill?.SkillPoints ?? 0;
                if (i == 0 && skill?.IsTraining == true)
                {
                    // Account for SP accumulated since training started
                    long elapsed = currentTime - skill.TrainingStartTime;
                    float spm = GetSPPerMinute(def);
                    currentSP += (int)(elapsed / 60f * spm);
                }

                // Calculate SP needed for this queue entry's target level
                int startLevel = skill?.Level ?? 0;
                int startSP = currentSP;

                // For queue entries targeting multiple levels (e.g., from L2 to L4),
                // calculate from current SP to target level SP
                int targetSP = SkillFormulas.PointsAtLevel(entry.TargetLevel, def.Rank);
                int remainingSP = Math.Max(0, targetSP - startSP);

                float spPerMin = GetSPPerMinute(def);
                long durationSeconds = (long)Math.Ceiling(remainingSP / spPerMin * 60f);

                entry.StartTime = cursor;
                entry.EndTime = cursor + durationSeconds;
                _queue[i] = entry;

                cursor = entry.EndTime;
            }
        }

        /// <summary>
        /// Get the end time of the entire queue.
        /// Source: Character::GetEndOfTraining
        /// </summary>
        public long GetEndOfTraining()
        {
            if (_queue.Count == 0) return 0;
            return _queue[^1].EndTime;
        }

        // ====================================================================
        // PROCESS (called each tick)
        // ====================================================================

        /// <summary>
        /// Process skill training — check if front skill has finished.
        /// Call this periodically (e.g., every second or on reconnect).
        /// </summary>
        public void Process(long currentTime)
        {
            while (_queue.Count > 0)
            {
                var front = _queue[0];
                if (currentTime < front.EndTime) break;

                // Skill completed training
                if (_skills.TryGetValue(front.TypeID, out var skill))
                {
                    int targetSP = SkillFormulas.PointsAtLevel(front.TargetLevel, skill.Definition.Rank);
                    skill.Level = front.TargetLevel;
                    skill.SkillPoints = targetSP;
                    skill.IsTraining = false;
                    skill.TrainingStartTime = 0;

                    OnSkillTrained?.Invoke(skill);
                }

                _queue.RemoveAt(0);

                // Start next skill
                if (_queue.Count > 0)
                {
                    var next = _queue[0];
                    if (_skills.TryGetValue(next.TypeID, out var nextSkill))
                    {
                        nextSkill.IsTraining = true;
                        nextSkill.TrainingStartTime = front.EndTime; // seamless transition
                    }
                }
            }
        }

        // ====================================================================
        // RESPEC
        // ====================================================================

        /// <summary>
        /// Redistribute character attribute points.
        /// Source: SkillMgrBound::RespecCharacter
        /// </summary>
        public bool RespecAttributes(int charisma, int intelligence, int memory,
                                     int perception, int willpower)
        {
            int total = charisma + intelligence + memory + perception + willpower;
            if (total != SkillConstants.TotalAttributePoints)
                return false;

            if (charisma < SkillConstants.MinAttribute || intelligence < SkillConstants.MinAttribute ||
                memory < SkillConstants.MinAttribute || perception < SkillConstants.MinAttribute ||
                willpower < SkillConstants.MinAttribute)
                return false;

            if (charisma > SkillConstants.MaxAttribute || intelligence > SkillConstants.MaxAttribute ||
                memory > SkillConstants.MaxAttribute || perception > SkillConstants.MaxAttribute ||
                willpower > SkillConstants.MaxAttribute)
                return false;

            // Cannot respec while training
            if (_queue.Count > 0 && _skills.Values.Any(s => s.IsTraining))
                return false;

            _attributes.Charisma = charisma;
            _attributes.Intelligence = intelligence;
            _attributes.Memory = memory;
            _attributes.Perception = perception;
            _attributes.Willpower = willpower;

            return true;
        }

        // ====================================================================
        // SP VERIFICATION
        // ====================================================================

        /// <summary>
        /// Verify and fix SP/level consistency for a skill.
        /// Source: Skill::VerifySP
        /// </summary>
        public void VerifySkillPoints(int typeID)
        {
            if (!_skills.TryGetValue(typeID, out var skill)) return;

            int level = skill.Level + 1;
            if (level > SkillConstants.MaxSkillLevel)
            {
                skill.Level = SkillConstants.MaxSkillLevel;
                level = SkillConstants.MaxSkillLevel;
            }

            int spThisLevel = SkillFormulas.PointsAtLevel(level - 1, skill.Definition.Rank);
            if (skill.SkillPoints < spThisLevel)
            {
                skill.SkillPoints = spThisLevel;
                VerifySkillPoints(typeID);   // re-verify recursively
                return;
            }

            int spNextLevel = SkillFormulas.PointsAtLevel(level, skill.Definition.Rank);
            if (skill.SkillPoints > spNextLevel)
            {
                skill.Level = Math.Min(level, SkillConstants.MaxSkillLevel);
                skill.SkillPoints = spNextLevel;
                VerifySkillPoints(typeID);   // re-verify recursively
            }
        }

        // ====================================================================
        // UTILITY
        // ====================================================================

        /// <summary>
        /// Get skill level for a given type, or 0 if not trained.
        /// </summary>
        public int GetSkillLevel(int typeID)
        {
            return _skills.TryGetValue(typeID, out var skill) ? skill.Level : 0;
        }

        /// <summary>
        /// Load a previously saved skill (from database).
        /// </summary>
        public void LoadSkill(int typeID, int level, int skillPoints)
        {
            if (!_definitions.TryGetValue(typeID, out var def)) return;

            _skills[typeID] = new CharacterSkill
            {
                TypeID = typeID,
                Level = level,
                SkillPoints = skillPoints,
                IsTraining = false,
                TrainingStartTime = 0,
                Definition = def
            };
        }
    }
}
