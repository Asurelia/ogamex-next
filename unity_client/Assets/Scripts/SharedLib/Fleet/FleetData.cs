// =============================================================================
// FleetData.cs — Ported from EvEmu evemu_Crucible FleetData.h
// Source: src/eve-server/fleet/FleetData.h (Allan, 2014-2017)
// Port:   C# for OGameX-Next / Unity (Feb 2026)
//
// Fleet hierarchy: Fleet → Wing (5 max) → Squad (5 per wing) → Members (10 per squad)
// Maximum fleet size: 1 FC + 5 WC + 25 SC + 225 members = 256 pilots
// =============================================================================

using System;
using System.Collections.Generic;

namespace OGameX.SharedLib.Fleet
{
    // =========================================================================
    // Enums (from FleetData.h namespace enums)
    // =========================================================================

    /// <summary>
    /// Fleet job assignments.
    /// Ported from Fleet::Job enum.
    /// </summary>
    public enum FleetJob
    {
        None    = 0,
        Scout   = 1,
        Creator = 2
    }

    /// <summary>
    /// Fleet role hierarchy.
    /// Ported from Fleet::Role enum.
    /// </summary>
    public enum FleetRole
    {
        FleetLeader = 1,
        WingLeader  = 2,
        SquadLeader = 3,
        Member      = 4
    }

    /// <summary>
    /// Booster role (who provides fleet bonuses).
    /// Ported from Fleet::Booster enum.
    /// </summary>
    public enum BoosterRole
    {
        None  = 0,
        Fleet = 1,
        Wing  = 2,
        Squad = 3
    }

    /// <summary>
    /// Fleet invitation scope (flags, can be combined).
    /// Ported from Fleet::Invite enum.
    /// </summary>
    [Flags]
    public enum InviteScope
    {
        Closed   = 0,
        Corp     = 1,
        Alliance = 2,
        Militia  = 4,
        Public   = 8,
        Any      = 15
    }

    /// <summary>
    /// Broadcast scope.
    /// Ported from Fleet::BCast::Scope enum.
    /// </summary>
    public enum BroadcastScope
    {
        Universe = 0,
        System   = 1,
        Bubble   = 2
    }

    /// <summary>
    /// Broadcast target group.
    /// Ported from Fleet::BCast::Group enum.
    /// </summary>
    public enum BroadcastGroup
    {
        None = 0,
        Down = 1, // Subordinates
        Up   = 2, // Superiors
        All  = 3
    }

    // =========================================================================
    // Data Structures (from C++ structs)
    // =========================================================================

    /// <summary>
    /// Fleet boost data — all bonuses are 2% per skill level.
    /// Ported from BoostData struct.
    /// </summary>
    [System.Serializable]
    public class BoostData
    {
        /// <summary>Armor hit points bonus level.</summary>
        public int Armored;
        /// <summary>Targeting speed bonus level.</summary>
        public int Leader;
        /// <summary>Targeting range bonus level.</summary>
        public int Info;
        /// <summary>Mining yield bonus level.</summary>
        public int Mining;
        /// <summary>Shield capacity bonus level.</summary>
        public int Siege;
        /// <summary>Agility bonus level.</summary>
        public int Skirmish;

        /// <summary>
        /// Calculate the actual bonus multiplier for a given boost type.
        /// Formula: 1.0 + (level * 0.02) = 2% per level.
        /// </summary>
        public float GetArmorBonus()    => 1.0f + Armored  * 0.02f;
        public float GetLeaderBonus()   => 1.0f + Leader   * 0.02f;
        public float GetInfoBonus()     => 1.0f + Info     * 0.02f;
        public float GetMiningBonus()   => 1.0f + Mining   * 0.02f;
        public float GetSiegeBonus()    => 1.0f + Siege    * 0.02f;
        public float GetSkirmishBonus() => 1.0f + Skirmish * 0.02f;
    }

    /// <summary>
    /// Fleet advertisement data for the fleet finder.
    /// Ported from FleetAdvert struct.
    /// </summary>
    [System.Serializable]
    public class FleetAdvert
    {
        public bool HideInfo;
        public bool JoinNeedsApproval;
        public InviteScope InviteScope;
        public int FleetId;
        public uint SolarSystemId;
        public DateTime AdvertTime;
        public DateTime DateCreated;
        public float LocalMinSecurity;
        public float PublicMinStanding;
        public float LocalMinStanding;
        public float PublicMinSecurity;
        public string LeaderName;
        public string FleetName;
        public string Description;
        public List<uint> PublicAllowedEntities = new();
        public List<uint> LocalAllowedEntities = new();
    }

    /// <summary>
    /// Core fleet data.
    /// Ported from FleetData struct.
    /// </summary>
    [System.Serializable]
    public class FleetInfo
    {
        public bool IsFreeMove;
        public bool IsRegistered;
        public bool IsVoiceEnabled;
        public bool IsLootLogging;
        public int SquadCount;
        public DateTime DateCreated;
        public string CreatorId;
        public string LeaderId;
        public string BoosterId;
        public string Name;
        public string Motd;

        /// <summary>Character IDs muted by leader.</summary>
        public HashSet<uint> MutedByLeader = new();
        /// <summary>Character IDs excluded from muting.</summary>
        public HashSet<uint> ExcludedFromMuting = new();
    }

    /// <summary>
    /// Wing data (5 wings per fleet).
    /// Ported from WingData struct.
    /// </summary>
    [System.Serializable]
    public class WingData
    {
        public int WingId;
        public int FleetId;
        public BoostData Boost = new();
        public string LeaderId;
        public string BoosterId;
        public string Name;
        public List<SquadData> Squads = new();
    }

    /// <summary>
    /// Squad data (5 squads per wing, 10 members per squad).
    /// Ported from SquadData struct.
    /// </summary>
    [System.Serializable]
    public class SquadData
    {
        public int SquadId;
        public int FleetId;
        public int WingId;
        public BoostData Boost = new();
        public string LeaderId;
        public string BoosterId;
        public string Name;
        /// <summary>Member character ID → member data.</summary>
        public Dictionary<string, FleetMember> Members = new();
    }

    /// <summary>
    /// Individual fleet member data.
    /// </summary>
    [System.Serializable]
    public class FleetMember
    {
        public string CharacterId;
        public string CharacterName;
        public FleetRole Role;
        public FleetJob Job;
        public BoosterRole BoosterRole;
        public int FleetId;
        public int WingId;
        public int SquadId;
        public uint SolarSystemId;
        public bool IsOnline;
    }

    /// <summary>
    /// Invitation data.
    /// Ported from InviteData struct.
    /// </summary>
    [System.Serializable]
    public class InviteData
    {
        public FleetRole Role;
        public int WingId;
        public int SquadId;
        public string InvitedCharacterId;
        public string InvitedByCharacterId;
        public DateTime ExpiresAt;
    }

    // =========================================================================
    // Fleet Constraints (from comments in FleetData.h)
    // =========================================================================

    /// <summary>
    /// Fleet structure constants. Directly from EvEmu FleetData.h comments.
    /// </summary>
    public static class FleetConstants
    {
        /// <summary>Max wings per fleet.</summary>
        public const int MaxWingsPerFleet = 5;
        /// <summary>Max squads per wing.</summary>
        public const int MaxSquadsPerWing = 5;
        /// <summary>Max members per squad (including squad commander).</summary>
        public const int MaxMembersPerSquad = 10;
        /// <summary>Max members per wing (5 squads × 10 + wing commander).</summary>
        public const int MaxMembersPerWing = 51;
        /// <summary>Max fleet size (5 wings × 51 + fleet commander).</summary>
        public const int MaxFleetSize = 256;
        /// <summary>Reconnection grace period in seconds.</summary>
        public const int ReconnectGracePeriodSeconds = 120;
        /// <summary>Boost bonus per skill level.</summary>
        public const float BoostPerLevel = 0.02f; // 2%
    }
}
