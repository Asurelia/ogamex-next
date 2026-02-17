// ============================================================================
// ManufacturingSystem.cs — Ported from EvEmu manufacturing/RamMethods.cpp + EvEMath.cpp
//
// Blueprint-based production: manufacturing, research ME/TE, copying, invention.
// ============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Manufacturing
{
    // ========================================================================
    // ENUMS
    // ========================================================================

    /// <summary>RAM activity types — from EvEmu RamMethods.h</summary>
    public enum ManufacturingActivity
    {
        None = 0,
        Manufacturing = 1,
        ResearchTE = 2,     // Time Efficiency (formerly PE)
        ResearchME = 3,     // Material Efficiency
        Copying = 4,
        Invention = 8,
        ReverseEngineering = 7,
    }

    public enum BlueprintType
    {
        Original = 0,       // BPO — infinite runs
        Copy = 1,           // BPC — limited runs
    }

    // ========================================================================
    // DATA STRUCTURES
    // ========================================================================

    /// <summary>
    /// A blueprint with ME/TE research levels.
    /// Source: EvEmu manufacturing/Blueprint.h
    /// </summary>
    public class Blueprint
    {
        public long ItemID;
        public int TypeID;
        public BlueprintType Type;
        public int MaterialEfficiency;       // 0-10 for BPOs
        public int TimeEfficiency;           // 0-20 for BPOs (in steps of 2)
        public int RunsRemaining;            // -1 for BPO (infinite), finite for BPC
        public int MaxRuns;

        // Copying
        public int LicensedProductionRunsRemaining;
    }

    /// <summary>
    /// A material required for manufacturing.
    /// </summary>
    public struct BillOfMaterial
    {
        public int TypeID;
        public int Quantity;
        public float DamagePerJob;           // fraction consumed per run (usually 1.0)
    }

    /// <summary>
    /// An active manufacturing/research job.
    /// </summary>
    public class ManufacturingJob
    {
        public long JobID;
        public int CharacterID;
        public ManufacturingActivity Activity;
        public long BlueprintID;
        public int BlueprintTypeID;
        public int OutputTypeID;
        public int Runs;
        public int StationID;
        public long StartTime;               // Unix timestamp
        public long EndTime;
        public bool Completed;

        public float MaterialMultiplier = 1.0f;
        public float TimeMultiplier = 1.0f;
    }

    /// <summary>
    /// Player skills relevant to manufacturing.
    /// </summary>
    public class IndustrySkills
    {
        public int Industry;                // reduces manufacturing time
        public int AdvancedIndustry;
        public int ProductionEfficiency;    // reduces material waste
        public int Metallurgy;              // reduces ME research time
        public int Research;                // reduces TE research time
        public int Science;                  // reduces copy time
        public int AdvancedLaboratoryOp;    // reduces invention time
    }

    // ========================================================================
    // MANUFACTURING FORMULAS — from EvEMath::RAM namespace
    // ========================================================================

    /// <summary>
    /// Production time and material calculations.
    /// Source: EvEMath.cpp RAM namespace
    /// </summary>
    public static class ManufacturingFormulas
    {
        /// <summary>
        /// Calculate production time.
        /// Source: EvEMath::RAM::ProductionTime
        /// </summary>
        public static int ProductionTime(int baseTime, float bpProductivityModifier,
                                          float productionLevel, float timeModifier = 1.0f)
        {
            float peFactor;
            if (productionLevel >= 0)
                peFactor = productionLevel / (1.0f + productionLevel);
            else
                peFactor = productionLevel - 1.0f;

            float effModifier = 1.0f - (bpProductivityModifier / baseTime) * peFactor;
            return (int)(baseTime * effModifier * timeModifier);
        }

        /// <summary>
        /// ME research time.
        /// Source: EvEMath::RAM::ME_ResearchTime
        /// </summary>
        public static int MEResearchTime(int baseTime, int bpLevel, int runs,
                                          int metallurgyLevel, float slotModifier = 1.0f,
                                          float implantModifier = 1.0f)
        {
            return (int)(baseTime * (1.0f + 0.05f * metallurgyLevel) * slotModifier *
                         implantModifier * ResearchLevelModifier(bpLevel, runs) / 13.0f);
        }

        /// <summary>
        /// TE (PE) research time.
        /// Source: EvEMath::RAM::PE_ResearchTime
        /// </summary>
        public static int TEResearchTime(int baseTime, int bpLevel, int runs,
                                          int researchLevel, float slotModifier = 1.0f,
                                          float implantModifier = 1.0f)
        {
            return (int)(baseTime * (1.0f + 0.05f * researchLevel) * slotModifier *
                         implantModifier * ResearchLevelModifier(bpLevel, runs) / 15.0f);
        }

        /// <summary>
        /// Copy time.
        /// Source: EvEMath::RAM::CopyTime
        /// </summary>
        public static int CopyTime(int baseTime, int scienceLevel,
                                    float slotModifier = 1.0f, float implantModifier = 1.0f)
        {
            return (int)(baseTime * (1.0f - 0.05f * scienceLevel) * slotModifier * implantModifier);
        }

        /// <summary>
        /// Invention time.
        /// Source: EvEMath::RAM::InventionTime
        /// </summary>
        public static int InventionTime(int baseTime, int advLabLevel,
                                         float slotModifier = 1.0f, float implantModifier = 1.0f)
        {
            return (int)(baseTime * (1.0f - 0.03f * advLabLevel) * slotModifier * implantModifier);
        }

        /// <summary>
        /// Material waste from ME level.
        /// Source: EvEMath::RAM::ME_EffectOnWaste
        /// </summary>
        public static float MEWaste(float materialAmount, float baseWasteFactor, float materialEfficiency)
        {
            float meFactor;
            if (materialEfficiency >= 0)
                meFactor = 1.0f / (1.0f + materialEfficiency);
            else
                meFactor = 1.0f - materialEfficiency;

            return (float)Math.Floor(0.5f + materialAmount * (baseWasteFactor / 100.0f) * meFactor);
        }

        /// <summary>
        /// Skill-based material waste.
        /// Source: EvEMath::RAM::WasteSkillBased
        /// </summary>
        public static float SkillWaste(int materialAmount, float productionEfficiencyLevel)
        {
            return (float)Math.Floor(0.5f + materialAmount *
                   ((25.0f - 5.0f * productionEfficiencyLevel) / 100.0f));
        }

        /// <summary>
        /// Perfect ME level needed for zero waste.
        /// Source: EvEMath::RAM::PerfectME
        /// </summary>
        public static int PerfectME(int materialAmount, int baseWasteFactor)
        {
            return (int)Math.Floor(0.02f * baseWasteFactor * materialAmount);
        }

        /// <summary>
        /// Invention success chance.
        /// Source: EvEMath::RAM::InventionChance
        /// </summary>
        public static float InventionChance(float baseChance, int encryptionLevel,
            int datacore1Level, int datacore2Level, int metaLevel, float decryptorModifier = 1.0f)
        {
            return baseChance * (1 + 0.11f * encryptionLevel) *
                   (1.0f + (datacore1Level + datacore2Level) *
                    (0.8f / (5.0f - metaLevel)) * decryptorModifier);
        }

        /// <summary>
        /// Research points per day from a research agent.
        /// Source: EvEMath::RAM::ResearchPointsPerDay
        /// </summary>
        public static float ResearchPointsPerDay(float multiplier, float agentEffectiveQuality,
                                                  int charSkillLevel, int agentSkillLevel)
        {
            return multiplier * (2.0f + agentEffectiveQuality / 100.0f) *
                   (float)Math.Pow(charSkillLevel + agentSkillLevel, 2);
        }

        /// <summary>
        /// Level modifier for research progression.
        /// Source: EvEMath::RAM::Research_LevelModifier
        /// </summary>
        public static float ResearchLevelModifier(int bpLevel, int runs)
        {
            if (bpLevel + runs > 10) return 0.0f;

            int[] levelModifiers = { 0, 105, 250, 595, 1414, 3360, 8000, 19000, 45255, 107700, 256000 };
            return (levelModifiers[bpLevel + runs] / 105.0f) - (levelModifiers[bpLevel] / 105.0f);
        }
    }

    // ========================================================================
    // MANUFACTURING SYSTEM — main logic
    // ========================================================================

    /// <summary>
    /// Manages blueprints and manufacturing jobs.
    /// Source: EvEmu manufacturing/RamMethods.cpp + RamProxyService.cpp
    /// </summary>
    public class ManufacturingSystem
    {
        private readonly Dictionary<long, Blueprint> _blueprints = new();
        private readonly Dictionary<long, ManufacturingJob> _jobs = new();
        private readonly Dictionary<int, List<BillOfMaterial>> _bom = new();   // typeID → materials
        private long _nextJobID = 1;

        // Events
        public event Action<ManufacturingJob> OnJobStarted;
        public event Action<ManufacturingJob> OnJobCompleted;

        // ====================================================================
        // BLUEPRINT MANAGEMENT
        // ====================================================================

        public void RegisterBlueprint(Blueprint bp) => _blueprints[bp.ItemID] = bp;
        public Blueprint GetBlueprint(long itemID) => _blueprints.GetValueOrDefault(itemID);

        public void RegisterBOM(int blueprintTypeID, List<BillOfMaterial> materials)
            => _bom[blueprintTypeID] = materials;

        /// <summary>
        /// Get adjusted material requirements after ME research.
        /// </summary>
        public List<(int typeID, int quantity)> GetAdjustedMaterials(Blueprint bp, int runs = 1)
        {
            if (!_bom.TryGetValue(bp.TypeID, out var materials))
                return new();

            return materials.Select(m =>
            {
                float waste = ManufacturingFormulas.MEWaste(m.Quantity, 10, bp.MaterialEfficiency);
                int adjusted = (int)Math.Ceiling((m.Quantity + waste) * runs * m.DamagePerJob);
                return (m.TypeID, Math.Max(runs, adjusted));
            }).ToList();
        }

        // ====================================================================
        // START JOB
        // ====================================================================

        /// <summary>
        /// Start a manufacturing/research job.
        /// Source: RamProxyService::InstallJob logic
        /// </summary>
        public ManufacturingJob StartJob(int characterID, long blueprintID,
            ManufacturingActivity activity, int runs, int stationID,
            IndustrySkills skills, long currentTime)
        {
            var bp = GetBlueprint(blueprintID);
            if (bp == null) return null;

            // BPC run limit check
            if (bp.Type == BlueprintType.Copy && runs > bp.RunsRemaining)
                return null;

            // Calculate duration
            int baseDuration = 3600;    // default 1h base, should come from type data
            int duration = activity switch
            {
                ManufacturingActivity.Manufacturing =>
                    ManufacturingFormulas.ProductionTime(baseDuration, 0, bp.TimeEfficiency),
                ManufacturingActivity.ResearchME =>
                    ManufacturingFormulas.MEResearchTime(baseDuration, bp.MaterialEfficiency, runs, skills.Metallurgy),
                ManufacturingActivity.ResearchTE =>
                    ManufacturingFormulas.TEResearchTime(baseDuration, bp.TimeEfficiency / 2, runs, skills.Research),
                ManufacturingActivity.Copying =>
                    ManufacturingFormulas.CopyTime(baseDuration, skills.Science),
                ManufacturingActivity.Invention =>
                    ManufacturingFormulas.InventionTime(baseDuration, skills.AdvancedLaboratoryOp),
                _ => baseDuration
            };

            var job = new ManufacturingJob
            {
                JobID = _nextJobID++,
                CharacterID = characterID,
                Activity = activity,
                BlueprintID = blueprintID,
                BlueprintTypeID = bp.TypeID,
                Runs = runs,
                StationID = stationID,
                StartTime = currentTime,
                EndTime = currentTime + duration,
                Completed = false,
            };

            _jobs[job.JobID] = job;
            OnJobStarted?.Invoke(job);
            return job;
        }

        // ====================================================================
        // COMPLETE JOB
        // ====================================================================

        /// <summary>
        /// Complete a finished job. Returns output type ID.
        /// Source: RamProxyService::CompleteJob
        /// </summary>
        public int CompleteJob(long jobID, long currentTime)
        {
            if (!_jobs.TryGetValue(jobID, out var job)) return -1;
            if (job.Completed) return -1;
            if (currentTime < job.EndTime) return -1;

            job.Completed = true;
            var bp = GetBlueprint(job.BlueprintID);

            switch (job.Activity)
            {
                case ManufacturingActivity.Manufacturing:
                    // Consume BPC runs if applicable
                    if (bp?.Type == BlueprintType.Copy)
                        bp.RunsRemaining -= job.Runs;
                    break;

                case ManufacturingActivity.ResearchME:
                    if (bp != null)
                        bp.MaterialEfficiency = Math.Min(10, bp.MaterialEfficiency + job.Runs);
                    break;

                case ManufacturingActivity.ResearchTE:
                    if (bp != null)
                        bp.TimeEfficiency = Math.Min(20, bp.TimeEfficiency + job.Runs * 2);
                    break;

                case ManufacturingActivity.Copying:
                    // Creates a BPC — handled by caller
                    break;

                case ManufacturingActivity.Invention:
                    // Success/failure determined by InventionChance — handled by caller
                    break;
            }

            OnJobCompleted?.Invoke(job);
            return job.OutputTypeID;
        }

        // ====================================================================
        // PROCESS
        // ====================================================================

        /// <summary>
        /// Get all jobs for a character.
        /// </summary>
        public List<ManufacturingJob> GetCharacterJobs(int characterID)
            => _jobs.Values.Where(j => j.CharacterID == characterID).ToList();

        /// <summary>
        /// Get active (incomplete) jobs for a character.
        /// </summary>
        public List<ManufacturingJob> GetActiveJobs(int characterID)
            => _jobs.Values.Where(j => j.CharacterID == characterID && !j.Completed).ToList();
    }
}
