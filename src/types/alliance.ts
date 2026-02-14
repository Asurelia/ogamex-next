/**
 * OGameX Alliance System Types
 * Complete type definitions for the alliance system
 */

// ============================================================================
// ENUMS
// ============================================================================

export type AllianceRank = 'founder' | 'leader' | 'officer' | 'veteran' | 'member' | 'newbie'

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected'

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

export type DiplomacyRelation = 'war' | 'nap' | 'ally' | 'neutral'

export type DiplomacyStatus = 'proposed' | 'active' | 'rejected' | 'expired'

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Alliance entity
 */
export interface Alliance {
  id: string
  tag: string // 3-8 characters, unique
  name: string
  logo_url?: string | null
  description?: string | null
  internal_text?: string | null // Internal text visible only to members
  external_text?: string | null // External text visible to all
  founder_id: string
  leader_id: string
  created_at: Date | string
  updated_at?: Date | string
  member_count: number
  total_points: number
  rank?: number
}

/**
 * Alliance member with denormalized user data
 */
export interface AllianceMember {
  id: string
  alliance_id: string
  user_id: string
  rank: AllianceRank
  joined_at: Date | string
  // Denormalized for display
  username: string
  points: number
  planets_count: number
}

/**
 * Alliance application (join request)
 */
export interface AllianceApplication {
  id: string
  alliance_id: string
  user_id: string
  message?: string | null
  status: ApplicationStatus
  created_at: Date | string
  processed_at?: Date | string | null
  processed_by?: string | null
  // Denormalized
  username?: string
}

/**
 * Alliance invitation
 */
export interface AllianceInvitation {
  id: string
  alliance_id: string
  invited_user_id: string
  invited_by: string
  message?: string | null
  status: InvitationStatus
  created_at: Date | string
  expires_at: Date | string
  // Denormalized
  alliance_name?: string
  alliance_tag?: string
  inviter_username?: string
}

/**
 * Alliance diplomacy relation
 */
export interface AllianceDiplomacy {
  id: string
  alliance_id: string
  target_alliance_id: string
  relation_type: DiplomacyRelation
  proposed_by: string
  accepted_by?: string | null
  status: DiplomacyStatus
  created_at: Date | string
  expires_at?: Date | string | null
  // Denormalized
  target_alliance_name?: string
  target_alliance_tag?: string
}

/**
 * Alliance circular message (broadcast to all members)
 */
export interface AllianceCircular {
  id: string
  alliance_id: string
  sender_id: string
  subject: string
  body: string
  created_at: Date | string
  // Denormalized
  sender_username?: string
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Create alliance request
 */
export interface CreateAllianceRequest {
  tag: string
  name: string
  description?: string
}

/**
 * Update alliance request
 */
export interface UpdateAllianceRequest {
  name?: string
  description?: string
  internal_text?: string
  external_text?: string
  logo_url?: string
}

/**
 * Apply to alliance request
 */
export interface ApplyToAllianceRequest {
  message?: string
}

/**
 * Process application request
 */
export interface ProcessApplicationRequest {
  status: 'accepted' | 'rejected'
}

/**
 * Invite to alliance request
 */
export interface InviteToAllianceRequest {
  user_id: string
  message?: string
}

/**
 * Respond to invitation request
 */
export interface RespondToInvitationRequest {
  status: 'accepted' | 'rejected'
}

/**
 * Update member rank request
 */
export interface UpdateMemberRankRequest {
  rank: AllianceRank
}

/**
 * Create diplomacy request
 */
export interface CreateDiplomacyRequest {
  target_alliance_id: string
  relation_type: DiplomacyRelation
}

/**
 * Respond to diplomacy request
 */
export interface RespondToDiplomacyRequest {
  status: 'active' | 'rejected'
}

/**
 * Send circular request
 */
export interface SendCircularRequest {
  subject: string
  body: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface AllianceListResponse {
  alliances: Alliance[]
  total: number
  page: number
  limit: number
}

export interface AllianceDetailResponse extends Alliance {
  members: AllianceMember[]
  diplomacy: AllianceDiplomacy[]
}

export interface AllianceMemberListResponse {
  members: AllianceMember[]
  total: number
}

export interface ApplicationListResponse {
  applications: AllianceApplication[]
  total: number
}

export interface InvitationListResponse {
  invitations: AllianceInvitation[]
  total: number
}

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

/**
 * Rank hierarchy (lower = more power)
 */
export const RANK_HIERARCHY: Record<AllianceRank, number> = {
  founder: 0,
  leader: 1,
  officer: 2,
  veteran: 3,
  member: 4,
  newbie: 5,
}

/**
 * Check if a rank has permission over another rank
 */
export function hasRankPermission(actorRank: AllianceRank, targetRank: AllianceRank): boolean {
  return RANK_HIERARCHY[actorRank] < RANK_HIERARCHY[targetRank]
}

/**
 * Get minimum rank required for an action
 */
export const RANK_PERMISSIONS = {
  // Alliance management
  updateAlliance: 'leader' as AllianceRank,
  deleteAlliance: 'founder' as AllianceRank,
  transferLeadership: 'founder' as AllianceRank,

  // Member management
  inviteMembers: 'officer' as AllianceRank,
  processApplications: 'officer' as AllianceRank,
  kickMembers: 'officer' as AllianceRank,
  updateMemberRank: 'leader' as AllianceRank,

  // Diplomacy
  proposeDiplomacy: 'leader' as AllianceRank,
  acceptDiplomacy: 'leader' as AllianceRank,
  cancelDiplomacy: 'leader' as AllianceRank,

  // Communication
  sendCircular: 'officer' as AllianceRank,
  viewInternalText: 'newbie' as AllianceRank,
}

/**
 * Check if a rank can perform an action
 */
export function canPerformAction(
  rank: AllianceRank,
  action: keyof typeof RANK_PERMISSIONS
): boolean {
  const requiredRank = RANK_PERMISSIONS[action]
  return RANK_HIERARCHY[rank] <= RANK_HIERARCHY[requiredRank]
}
