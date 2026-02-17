// ============================================================================
// ReprocessingSystem.cs — Ported from EvEmu station/ReprocessingService.cpp + EvEMath.cpp
//
// Refine ore/items into base minerals. Station yield + skill bonuses.
// ============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Station
{
    // ========================================================================
    // DATA STRUCTURES
    // ========================================================================

    /// <summary>
    /// What minerals an ore/item refines into.
    /// </summary>
    public struct ReprocessingOutput
    {
        public int MineralTypeID;
        public int Quantity;
    }

    /// <summary>
    /// Player skills affecting reprocessing yields.
    /// </summary>
    public class ReprocessingSkills
    {
        public int Reprocessing;             // +3% per level to yield
        public int ReprocessingEfficiency;   // +2% per level (renamed in later EVE)
        public int OreProcessing;            // +5% per level, specific to ore type
        public int ScrapmetalProcessing;     // for modules/items
    }

    // ========================================================================
    // REPROCESSING FORMULAS — from EvEMath::Refine namespace
    // ========================================================================

    /// <summary>
    /// Refining yield and tax calculations.
    /// Source: EvEMath.cpp Refine namespace
    /// </summary>
    public static class ReprocessingFormulas
    {
        /// <summary>
        /// Station tax rate based on standing with station owner.
        /// Formula: max(5 - 0.75 * standing, 0)%
        /// Standing of 6.67+ = 0% tax.
        /// Source: EvEMath::Refine::StationTaxesForReprocessing
        /// </summary>
        public static float StationTax(float characterStanding)
        {
            return Math.Max(0, 5.0f - 0.75f * characterStanding);
        }

        /// <summary>
        /// Effective refining yield (before tax).
        /// Formula: stationYield + 0.375 * (1 + refining*0.02) * (1 + refEff*0.04) * (1 + oreProc*0.05)
        /// Capped at 1.0 (100%).
        /// Source: EvEMath::Refine::EffectiveRefiningYield
        /// </summary>
        public static float EffectiveYield(float stationEquipmentYield,
            int refiningLevel, int refiningEfficiencyLevel, int oreProcessingLevel)
        {
            float yield = stationEquipmentYield
                        + 0.375f
                        * (1.0f + refiningLevel * 0.02f)
                        * (1.0f + refiningEfficiencyLevel * 0.04f)
                        * (1.0f + oreProcessingLevel * 0.05f);
            return Math.Min(yield, 1.0f);
        }

        /// <summary>
        /// Calculate final mineral output after yield and tax.
        /// </summary>
        public static int FinalOutput(int baseMineralQty, float yield, float taxPercent)
        {
            float afterYield = baseMineralQty * yield;
            float afterTax = afterYield * (1.0f - taxPercent / 100.0f);
            return Math.Max(0, (int)Math.Floor(afterTax));
        }
    }

    // ========================================================================
    // REPROCESSING SYSTEM
    // ========================================================================

    /// <summary>
    /// Manages ore and item reprocessing.
    /// Source: EvEmu station/ReprocessingService.cpp
    /// </summary>
    public class ReprocessingSystem
    {
        // typeID → list of mineral outputs (for one batch)
        private readonly Dictionary<int, List<ReprocessingOutput>> _recipes = new();

        // typeID → portion size (how many items per batch)
        private readonly Dictionary<int, int> _portionSizes = new();

        // Station equipment yield (typically 0.50 for NPC stations)
        public float StationEquipmentYield { get; set; } = 0.50f;

        // ====================================================================
        // REGISTRATION
        // ====================================================================

        /// <summary>
        /// Register a reprocessing recipe (from SDE data).
        /// </summary>
        public void RegisterRecipe(int typeID, int portionSize, List<ReprocessingOutput> outputs)
        {
            _recipes[typeID] = outputs;
            _portionSizes[typeID] = portionSize;
        }

        // ====================================================================
        // QUERIES
        // ====================================================================

        /// <summary>
        /// Get reprocessing preview: what minerals you'd get.
        /// </summary>
        public List<(int mineralTypeID, int quantity)> GetReprocessingPreview(
            int typeID, int itemQuantity, ReprocessingSkills skills, float standingWithOwner)
        {
            if (!_recipes.TryGetValue(typeID, out var recipe))
                return new();

            int portionSize = _portionSizes.GetValueOrDefault(typeID, 1);
            int batches = itemQuantity / portionSize;
            if (batches <= 0) return new();

            float yield = ReprocessingFormulas.EffectiveYield(
                StationEquipmentYield,
                skills.Reprocessing,
                skills.ReprocessingEfficiency,
                skills.OreProcessing);

            float taxPercent = ReprocessingFormulas.StationTax(standingWithOwner);

            return recipe.Select(output =>
            {
                int totalBase = output.Quantity * batches;
                int finalQty = ReprocessingFormulas.FinalOutput(totalBase, yield, taxPercent);
                return (output.MineralTypeID, finalQty);
            }).Where(x => x.finalQty > 0).ToList();
        }

        /// <summary>
        /// Execute reprocessing. Returns mineral outputs.
        /// </summary>
        public List<(int mineralTypeID, int quantity)> Reprocess(
            int typeID, int itemQuantity, ReprocessingSkills skills, float standingWithOwner)
        {
            return GetReprocessingPreview(typeID, itemQuantity, skills, standingWithOwner);
        }

        /// <summary>
        /// Check if an item type can be reprocessed.
        /// </summary>
        public bool CanReprocess(int typeID)
        {
            return _recipes.ContainsKey(typeID);
        }

        /// <summary>
        /// Get the portion size for a type (how many items per batch).
        /// </summary>
        public int GetPortionSize(int typeID)
        {
            return _portionSizes.GetValueOrDefault(typeID, 1);
        }
    }
}
