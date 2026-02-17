// ============================================================================
// InsuranceSystem.cs — Ported from EvEmu station/InsuranceService.cpp
//
// Ship insurance: pay premium, get payout on destruction.
// ============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Station
{
    // ========================================================================
    // CONSTANTS & ENUMS
    // ========================================================================

    public enum InsuranceTier
    {
        Basic = 0,          // free, minimal payout
        Standard = 1,
        Bronze = 2,
        Silver = 3,
        Gold = 4,
        Platinum = 5
    }

    public static class InsuranceConstants
    {
        public const int ContractDurationDays = 84;  // 12 weeks
        public const float BasicPayoutPercent = 0.40f;

        // Premium as fraction of base price per tier
        public static readonly float[] PremiumPercent = { 0f, 0.05f, 0.10f, 0.15f, 0.20f, 0.25f };

        // Payout as fraction of base price per tier
        public static readonly float[] PayoutPercent = { 0.40f, 0.50f, 0.60f, 0.70f, 0.85f, 1.00f };
    }

    // ========================================================================
    // DATA STRUCTURES
    // ========================================================================

    /// <summary>
    /// An active insurance contract.
    /// </summary>
    public class InsuranceContract
    {
        public long ContractID;
        public long ShipItemID;
        public int ShipTypeID;
        public int OwnerID;
        public InsuranceTier Tier;
        public float Premium;               // ISK paid
        public float Payout;                 // ISK received on destruction
        public long StartTime;
        public long ExpiryTime;
        public bool Claimed;
    }

    // ========================================================================
    // INSURANCE SYSTEM
    // ========================================================================

    /// <summary>
    /// Manages ship insurance contracts.
    /// Source: EvEmu station/InsuranceService.cpp
    /// </summary>
    public class InsuranceSystem
    {
        private readonly Dictionary<long, InsuranceContract> _contracts = new();
        private long _nextContractID = 1;

        // Events
        public event Action<InsuranceContract> OnInsured;
        public event Action<InsuranceContract> OnPayoutClaimed;
        public event Action<InsuranceContract> OnExpired;

        // ====================================================================
        // QUERIES
        // ====================================================================

        /// <summary>Get active insurance for a specific ship.</summary>
        public InsuranceContract GetInsurance(long shipItemID)
        {
            return _contracts.Values.FirstOrDefault(c =>
                c.ShipItemID == shipItemID && !c.Claimed &&
                c.ExpiryTime > DateTimeOffset.UtcNow.ToUnixTimeSeconds());
        }

        /// <summary>Get all active contracts for a character.</summary>
        public List<InsuranceContract> GetCharacterContracts(int ownerID)
        {
            long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            return _contracts.Values
                .Where(c => c.OwnerID == ownerID && !c.Claimed && c.ExpiryTime > now)
                .ToList();
        }

        /// <summary>
        /// Calculate premium and payout for a ship at a given tier.
        /// </summary>
        public (float premium, float payout) GetQuote(float shipBasePrice, InsuranceTier tier)
        {
            int t = (int)tier;
            float premium = shipBasePrice * InsuranceConstants.PremiumPercent[t];
            float payout = shipBasePrice * InsuranceConstants.PayoutPercent[t];
            return (premium, payout);
        }

        // ====================================================================
        // INSURE
        // ====================================================================

        /// <summary>
        /// Insure a ship. Returns premium cost, or -1 on failure.
        /// </summary>
        public float InsureShip(long shipItemID, int shipTypeID, int ownerID,
                                 float shipBasePrice, InsuranceTier tier)
        {
            // Check if already insured
            if (GetInsurance(shipItemID) != null)
                return -1;

            var (premium, payout) = GetQuote(shipBasePrice, tier);
            long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            var contract = new InsuranceContract
            {
                ContractID = _nextContractID++,
                ShipItemID = shipItemID,
                ShipTypeID = shipTypeID,
                OwnerID = ownerID,
                Tier = tier,
                Premium = premium,
                Payout = payout,
                StartTime = now,
                ExpiryTime = now + InsuranceConstants.ContractDurationDays * 86400L,
                Claimed = false
            };

            _contracts[contract.ContractID] = contract;
            OnInsured?.Invoke(contract);
            return premium;
        }

        // ====================================================================
        // CLAIM (on ship destruction)
        // ====================================================================

        /// <summary>
        /// Claim insurance payout when a ship is destroyed.
        /// Returns payout amount, or 0 if no active insurance.
        /// </summary>
        public float ClaimInsurance(long shipItemID)
        {
            var contract = GetInsurance(shipItemID);
            if (contract == null)
            {
                // No insurance — basic payout only
                return 0;
            }

            contract.Claimed = true;
            OnPayoutClaimed?.Invoke(contract);
            return contract.Payout;
        }

        // ====================================================================
        // PROCESS (expiry)
        // ====================================================================

        /// <summary>Check for expired contracts.</summary>
        public void ProcessExpiry(long currentTime)
        {
            foreach (var contract in _contracts.Values
                .Where(c => !c.Claimed && c.ExpiryTime <= currentTime))
            {
                contract.Claimed = true;  // mark as expired (no payout)
                OnExpired?.Invoke(contract);
            }
        }
    }
}
