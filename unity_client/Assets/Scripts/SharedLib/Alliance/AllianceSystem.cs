// =============================================================================
// AllianceSystem.cs — Alliance system types and utilities
// Port of: src/types/alliance.ts + src/stores/allianceStore.ts
// Namespace: OGameX.SharedLib.Alliance
// =============================================================================

using System;
using System.Collections.Generic;

namespace OGameX.SharedLib.Alliance
{
    // =========================================================================
    // ENUMS
    // =========================================================================

    /// <summary>
    /// Alliance member rank.
    /// </summary>
    public enum AllianceRank
    {
        Founder,
        Leader,
        Officer,
        Veteran,
        Member,
        Newbie,
    }

    /// <summary>
    /// Application status for joining an alliance.
    /// </summary>
    public enum ApplicationStatus
    {
        Pending,
        Accepted,
        Rejected,
    }

    /// <summary>
    /// Invitation status for alliance invites.
    /// </summary>
    public enum InvitationStatus
    {
        Pending,
        Accepted,
        Rejected,
        Expired,
    }

    /// <summary>
    /// Diplomacy relation type.
    /// </summary>
    public enum DiplomacyRelation
    {
        War,
        NAP,
        Ally,
        Neutral,
    }

    /// <summary>
    /// Diplomacy status.
    /// </summary>
    public enum DiplomacyStatus
    {
        Proposed,
        Active,
        Rejected,
        Expired,
    }

    // =========================================================================
    // RANK SYSTEM
    // =========================================================================

    /// <summary>
    /// Rank hierarchy and permissions.
    /// </summary>
    public static class RankSystem
    {
        /// <summary>
        /// Rank hierarchy (lower = more power).
        /// </summary>
        public static readonly Dictionary<AllianceRank, int> Hierarchy = new()
        {
            [AllianceRank.Founder] = 0,
            [AllianceRank.Leader] = 1,
            [AllianceRank.Officer] = 2,
            [AllianceRank.Veteran] = 3,
            [AllianceRank.Member] = 4,
            [AllianceRank.Newbie] = 5,
        };

        /// <summary>
        /// Check if a rank has permission over another rank.
        /// </summary>
        public static bool HasRankPermission(AllianceRank actorRank, AllianceRank targetRank)
        {
            return Hierarchy[actorRank] < Hierarchy[targetRank];
        }

        /// <summary>
        /// Check if a rank can perform an action.
        /// </summary>
        public static bool CanPerformAction(AllianceRank rank, AllianceAction action)
        {
            AllianceRank requiredRank = GetRequiredRank(action);
            return Hierarchy[rank] <= Hierarchy[requiredRank];
        }

        /// <summary>
        /// Get minimum rank required for an action.
        /// </summary>
        public static AllianceRank GetRequiredRank(AllianceAction action)
        {
            return action switch
            {
                // Alliance management
                AllianceAction.UpdateAlliance => AllianceRank.Leader,
                AllianceAction.DeleteAlliance => AllianceRank.Founder,
                AllianceAction.TransferLeadership => AllianceRank.Founder,

                // Member management
                AllianceAction.InviteMembers => AllianceRank.Officer,
                AllianceAction.ProcessApplications => AllianceRank.Officer,
                AllianceAction.KickMembers => AllianceRank.Officer,
                AllianceAction.UpdateMemberRank => AllianceRank.Leader,

                // Diplomacy
                AllianceAction.ProposeDiplomacy => AllianceRank.Leader,
                AllianceAction.AcceptDiplomacy => AllianceRank.Leader,
                AllianceAction.CancelDiplomacy => AllianceRank.Leader,

                // Communication
                AllianceAction.SendCircular => AllianceRank.Officer,
                AllianceAction.ViewInternalText => AllianceRank.Newbie,

                _ => AllianceRank.Founder,
            };
        }
    }

    /// <summary>
    /// Alliance actions that require permissions.
    /// </summary>
    public enum AllianceAction
    {
        UpdateAlliance,
        DeleteAlliance,
        TransferLeadership,
        InviteMembers,
        ProcessApplications,
        KickMembers,
        UpdateMemberRank,
        ProposeDiplomacy,
        AcceptDiplomacy,
        CancelDiplomacy,
        SendCircular,
        ViewInternalText,
    }

    // =========================================================================
    // CORE TYPES
    // =========================================================================

    /// <summary>
    /// Alliance entity.
    /// </summary>
    public class AllianceData
    {
        /// <summary>Unique alliance identifier</summary>
        public string Id { get; set; } = "";

        /// <summary>Alliance tag (3-8 characters, unique)</summary>
        public string Tag { get; set; } = "";

        /// <summary>Alliance name</summary>
        public string Name { get; set; } = "";

        /// <summary>Alliance logo URL</summary>
        public string? LogoUrl { get; set; }

        /// <summary>Public description</summary>
        public string? Description { get; set; }

        /// <summary>Internal text visible only to members</summary>
        public string? InternalText { get; set; }

        /// <summary>External text visible to all</summary>
        public string? ExternalText { get; set; }

        /// <summary>Founder user ID</summary>
        public string FounderId { get; set; } = "";

        /// <summary>Current leader user ID</summary>
        public string LeaderId { get; set; } = "";

        /// <summary>Creation timestamp</summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>Last update timestamp</summary>
        public DateTime? UpdatedAt { get; set; }

        /// <summary>Current member count</summary>
        public int MemberCount { get; set; }

        /// <summary>Total points of all members</summary>
        public long TotalPoints { get; set; }

        /// <summary>Alliance rank in highscores</summary>
        public int? Rank { get; set; }
    }

    /// <summary>
    /// Alliance member with denormalized user data.
    /// </summary>
    public class AllianceMember
    {
        public string Id { get; set; } = "";
        public string AllianceId { get; set; } = "";
        public string UserId { get; set; } = "";
        public AllianceRank Rank { get; set; }
        public DateTime JoinedAt { get; set; }

        // Denormalized for display
        public string Username { get; set; } = "";
        public long Points { get; set; }
        public int PlanetsCount { get; set; }
    }

    /// <summary>
    /// Alliance application (join request).
    /// </summary>
    public class AllianceApplication
    {
        public string Id { get; set; } = "";
        public string AllianceId { get; set; } = "";
        public string UserId { get; set; } = "";
        public string? Message { get; set; }
        public ApplicationStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public string? ProcessedBy { get; set; }

        // Denormalized
        public string? Username { get; set; }
    }

    /// <summary>
    /// Alliance invitation.
    /// </summary>
    public class AllianceInvitation
    {
        public string Id { get; set; } = "";
        public string AllianceId { get; set; } = "";
        public string InvitedUserId { get; set; } = "";
        public string InvitedBy { get; set; } = "";
        public string? Message { get; set; }
        public InvitationStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }

        // Denormalized
        public string? AllianceName { get; set; }
        public string? AllianceTag { get; set; }
        public string? InviterUsername { get; set; }
    }

    /// <summary>
    /// Alliance diplomacy relation.
    /// </summary>
    public class AllianceDiplomacy
    {
        public string Id { get; set; } = "";
        public string AllianceId { get; set; } = "";
        public string TargetAllianceId { get; set; } = "";
        public DiplomacyRelation RelationType { get; set; }
        public string ProposedBy { get; set; } = "";
        public string? AcceptedBy { get; set; }
        public DiplomacyStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }

        // Denormalized
        public string? TargetAllianceName { get; set; }
        public string? TargetAllianceTag { get; set; }
    }

    /// <summary>
    /// Alliance circular message (broadcast to all members).
    /// </summary>
    public class AllianceCircular
    {
        public string Id { get; set; } = "";
        public string AllianceId { get; set; } = "";
        public string SenderId { get; set; } = "";
        public string Subject { get; set; } = "";
        public string Body { get; set; } = "";
        public DateTime CreatedAt { get; set; }

        // Denormalized
        public string? SenderUsername { get; set; }
    }

    // =========================================================================
    // REQUEST TYPES
    // =========================================================================

    /// <summary>
    /// Create alliance request.
    /// </summary>
    public class CreateAllianceRequest
    {
        public string Tag { get; set; } = "";
        public string Name { get; set; } = "";
        public string? Description { get; set; }
    }

    /// <summary>
    /// Update alliance request.
    /// </summary>
    public class UpdateAllianceRequest
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? InternalText { get; set; }
        public string? ExternalText { get; set; }
        public string? LogoUrl { get; set; }
    }

    /// <summary>
    /// Apply to alliance request.
    /// </summary>
    public class ApplyToAllianceRequest
    {
        public string? Message { get; set; }
    }

    /// <summary>
    /// Process application request.
    /// </summary>
    public class ProcessApplicationRequest
    {
        public ApplicationStatus Status { get; set; }
    }

    /// <summary>
    /// Invite to alliance request.
    /// </summary>
    public class InviteToAllianceRequest
    {
        public string UserId { get; set; } = "";
        public string? Message { get; set; }
    }

    /// <summary>
    /// Respond to invitation request.
    /// </summary>
    public class RespondToInvitationRequest
    {
        public InvitationStatus Status { get; set; }
    }

    /// <summary>
    /// Update member rank request.
    /// </summary>
    public class UpdateMemberRankRequest
    {
        public AllianceRank Rank { get; set; }
    }

    /// <summary>
    /// Create diplomacy request.
    /// </summary>
    public class CreateDiplomacyRequest
    {
        public string TargetAllianceId { get; set; } = "";
        public DiplomacyRelation RelationType { get; set; }
    }

    /// <summary>
    /// Respond to diplomacy request.
    /// </summary>
    public class RespondToDiplomacyRequest
    {
        public DiplomacyStatus Status { get; set; }
    }

    /// <summary>
    /// Send circular request.
    /// </summary>
    public class SendCircularRequest
    {
        public string Subject { get; set; } = "";
        public string Body { get; set; } = "";
    }

    // =========================================================================
    // RESPONSE TYPES
    // =========================================================================

    /// <summary>
    /// Alliance list response.
    /// </summary>
    public class AllianceListResponse
    {
        public List<AllianceData> Alliances { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int Limit { get; set; }
    }

    /// <summary>
    /// Alliance detail response.
    /// </summary>
    public class AllianceDetailResponse : AllianceData
    {
        public List<AllianceMember> Members { get; set; } = new();
        public List<AllianceDiplomacy> Diplomacy { get; set; } = new();
    }

    /// <summary>
    /// Alliance member list response.
    /// </summary>
    public class AllianceMemberListResponse
    {
        public List<AllianceMember> Members { get; set; } = new();
        public int Total { get; set; }
    }

    /// <summary>
    /// Application list response.
    /// </summary>
    public class ApplicationListResponse
    {
        public List<AllianceApplication> Applications { get; set; } = new();
        public int Total { get; set; }
    }

    /// <summary>
    /// Invitation list response.
    /// </summary>
    public class InvitationListResponse
    {
        public List<AllianceInvitation> Invitations { get; set; } = new();
        public int Total { get; set; }
    }

    // =========================================================================
    // ALLIANCE UTILITIES
    // =========================================================================

    /// <summary>
    /// Alliance validation and utility functions.
    /// </summary>
    public static class AllianceUtils
    {
        /// <summary>Minimum tag length</summary>
        public const int MinTagLength = 3;

        /// <summary>Maximum tag length</summary>
        public const int MaxTagLength = 8;

        /// <summary>Minimum name length</summary>
        public const int MinNameLength = 3;

        /// <summary>Maximum name length</summary>
        public const int MaxNameLength = 30;

        /// <summary>Maximum description length</summary>
        public const int MaxDescriptionLength = 5000;

        /// <summary>Invitation validity duration in days</summary>
        public const int InvitationValidityDays = 7;

        /// <summary>
        /// Validate alliance tag.
        /// </summary>
        public static (bool Valid, string? Error) ValidateTag(string tag)
        {
            if (string.IsNullOrWhiteSpace(tag))
                return (false, "Tag is required");

            if (tag.Length < MinTagLength)
                return (false, $"Tag must be at least {MinTagLength} characters");

            if (tag.Length > MaxTagLength)
                return (false, $"Tag must be at most {MaxTagLength} characters");

            // Only alphanumeric characters
            foreach (char c in tag)
            {
                if (!char.IsLetterOrDigit(c))
                    return (false, "Tag can only contain letters and numbers");
            }

            return (true, null);
        }

        /// <summary>
        /// Validate alliance name.
        /// </summary>
        public static (bool Valid, string? Error) ValidateName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return (false, "Name is required");

            if (name.Length < MinNameLength)
                return (false, $"Name must be at least {MinNameLength} characters");

            if (name.Length > MaxNameLength)
                return (false, $"Name must be at most {MaxNameLength} characters");

            return (true, null);
        }

        /// <summary>
        /// Determine user rank within an alliance based on founder/leader IDs.
        /// </summary>
        public static AllianceRank DetermineUserRank(string userId, AllianceData alliance)
        {
            if (alliance.FounderId == userId)
                return AllianceRank.Founder;

            if (alliance.LeaderId == userId)
                return AllianceRank.Leader;

            return AllianceRank.Member;
        }

        /// <summary>
        /// Format alliance tag for display.
        /// </summary>
        public static string FormatTag(string tag)
        {
            return $"[{tag.ToUpperInvariant()}]";
        }

        /// <summary>
        /// Calculate invitation expiration date.
        /// </summary>
        public static DateTime CalculateInvitationExpiry()
        {
            return DateTime.UtcNow.AddDays(InvitationValidityDays);
        }

        /// <summary>
        /// Check if an invitation has expired.
        /// </summary>
        public static bool IsInvitationExpired(AllianceInvitation invitation)
        {
            return DateTime.UtcNow > invitation.ExpiresAt;
        }

        /// <summary>
        /// Get diplomacy relation display name.
        /// </summary>
        public static string GetDiplomacyRelationName(DiplomacyRelation relation)
        {
            return relation switch
            {
                DiplomacyRelation.War => "War",
                DiplomacyRelation.NAP => "Non-Aggression Pact",
                DiplomacyRelation.Ally => "Alliance",
                DiplomacyRelation.Neutral => "Neutral",
                _ => "Unknown",
            };
        }

        /// <summary>
        /// Get diplomacy relation color for UI.
        /// </summary>
        public static string GetDiplomacyRelationColor(DiplomacyRelation relation)
        {
            return relation switch
            {
                DiplomacyRelation.War => "#ff4444",
                DiplomacyRelation.NAP => "#ffaa00",
                DiplomacyRelation.Ally => "#44ff44",
                DiplomacyRelation.Neutral => "#888888",
                _ => "#ffffff",
            };
        }

        /// <summary>
        /// Get rank display name.
        /// </summary>
        public static string GetRankDisplayName(AllianceRank rank)
        {
            return rank switch
            {
                AllianceRank.Founder => "Founder",
                AllianceRank.Leader => "Leader",
                AllianceRank.Officer => "Officer",
                AllianceRank.Veteran => "Veteran",
                AllianceRank.Member => "Member",
                AllianceRank.Newbie => "Newbie",
                _ => "Unknown",
            };
        }
    }
}
