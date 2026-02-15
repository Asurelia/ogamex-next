/**
 * OGameX Alliance Service
 * Centralized business logic for alliance operations
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Alliance,
  AllianceMember,
  AllianceApplication,
  AllianceInvitation,
  AllianceDiplomacy,
  AllianceCircular,
  AllianceRank,
  CreateAllianceRequest,
  UpdateAllianceRequest,
  DiplomacyRelation,
} from '@/types/alliance'
import { RANK_HIERARCHY, canPerformAction } from '@/types/alliance'

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AllianceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'AllianceError'
  }
}

// ============================================================================
// ALLIANCE SERVICE
// ============================================================================

export class AllianceService {
  constructor(private supabase: SupabaseClient) {}

  // ==========================================================================
  // ALLIANCE CRUD
  // ==========================================================================

  /**
   * Create a new alliance
   */
  async createAlliance(
    userId: string,
    data: CreateAllianceRequest
  ): Promise<Alliance> {
    // Validate tag format
    if (data.tag.length < 3 || data.tag.length > 8) {
      throw new AllianceError(
        'Alliance tag must be 3-8 characters',
        'INVALID_TAG',
        400
      )
    }

    // Check if user is already in an alliance
    const { data: existingMember } = await this.supabase
      .from('alliance_members')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      throw new AllianceError(
        'You are already in an alliance',
        'ALREADY_IN_ALLIANCE',
        400
      )
    }

    // Check tag uniqueness
    const { data: existingTag } = await this.supabase
      .from('alliances')
      .select('id')
      .eq('tag', data.tag.toUpperCase())
      .single()

    if (existingTag) {
      throw new AllianceError(
        'Alliance tag already exists',
        'TAG_EXISTS',
        400
      )
    }

    // Check name uniqueness
    const { data: existingName } = await this.supabase
      .from('alliances')
      .select('id')
      .eq('name', data.name)
      .single()

    if (existingName) {
      throw new AllianceError(
        'Alliance name already exists',
        'NAME_EXISTS',
        400
      )
    }

    // Create alliance
    const { data: alliance, error } = await this.supabase
      .from('alliances')
      .insert({
        tag: data.tag.toUpperCase(),
        name: data.name,
        description: data.description,
        founder_id: userId,
        leader_id: userId,
        member_count: 1,
        total_points: 0,
      })
      .select()
      .single()

    if (error) {
      throw new AllianceError(
        'Failed to create alliance',
        'CREATE_FAILED',
        500
      )
    }

    // Add founder as member
    await this.supabase.from('alliance_members').insert({
      alliance_id: alliance.id,
      user_id: userId,
      rank: 'founder',
    })

    // Update user's alliance_id
    await this.supabase
      .from('users')
      .update({ alliance_id: alliance.id })
      .eq('id', userId)

    return alliance
  }

  /**
   * Get alliance by ID
   */
  async getAlliance(allianceId: string): Promise<Alliance | null> {
    const { data, error } = await this.supabase
      .from('alliances')
      .select('*')
      .eq('id', allianceId)
      .single()

    if (error) return null
    return data
  }

  /**
   * Get alliance by tag
   */
  async getAllianceByTag(tag: string): Promise<Alliance | null> {
    const { data, error } = await this.supabase
      .from('alliances')
      .select('*')
      .eq('tag', tag.toUpperCase())
      .single()

    if (error) return null
    return data
  }

  /**
   * List alliances with pagination
   */
  async listAlliances(
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{ alliances: Alliance[]; total: number }> {
    let query = this.supabase
      .from('alliances')
      .select('*', { count: 'exact' })
      .order('total_points', { ascending: false })

    if (search) {
      query = query.or(`tag.ilike.%${search}%,name.ilike.%${search}%`)
    }

    const { data, count, error } = await query
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      throw new AllianceError('Failed to list alliances', 'LIST_FAILED', 500)
    }

    return { alliances: data || [], total: count || 0 }
  }

  /**
   * Update alliance details
   */
  async updateAlliance(
    allianceId: string,
    userId: string,
    data: UpdateAllianceRequest
  ): Promise<Alliance> {
    // Check permission
    const member = await this.getMember(allianceId, userId)
    if (!member || !canPerformAction(member.rank, 'updateAlliance')) {
      throw new AllianceError(
        'You do not have permission to update this alliance',
        'PERMISSION_DENIED',
        403
      )
    }

    const { data: alliance, error } = await this.supabase
      .from('alliances')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', allianceId)
      .select()
      .single()

    if (error) {
      throw new AllianceError('Failed to update alliance', 'UPDATE_FAILED', 500)
    }

    return alliance
  }

  /**
   * Delete alliance (founder only)
   */
  async deleteAlliance(allianceId: string, userId: string): Promise<void> {
    const member = await this.getMember(allianceId, userId)
    if (!member || !canPerformAction(member.rank, 'deleteAlliance')) {
      throw new AllianceError(
        'Only the founder can delete the alliance',
        'PERMISSION_DENIED',
        403
      )
    }

    // Remove all members first (update their alliance_id)
    const { data: members } = await this.supabase
      .from('alliance_members')
      .select('user_id')
      .eq('alliance_id', allianceId)

    if (members) {
      await this.supabase
        .from('users')
        .update({ alliance_id: null })
        .in(
          'id',
          members.map((m) => m.user_id)
        )
    }

    // Delete alliance (cascade will handle members, applications, etc.)
    const { error } = await this.supabase
      .from('alliances')
      .delete()
      .eq('id', allianceId)

    if (error) {
      throw new AllianceError('Failed to delete alliance', 'DELETE_FAILED', 500)
    }
  }

  // ==========================================================================
  // MEMBER MANAGEMENT
  // ==========================================================================

  /**
   * Get member info
   */
  async getMember(
    allianceId: string,
    userId: string
  ): Promise<AllianceMember | null> {
    const { data, error } = await this.supabase
      .from('alliance_members')
      .select(
        `
        *,
        users!inner(username),
        highscores(total_points),
        planets:planets(count)
      `
      )
      .eq('alliance_id', allianceId)
      .eq('user_id', userId)
      .single()

    if (error) return null

    return {
      id: data.id,
      alliance_id: data.alliance_id,
      user_id: data.user_id,
      rank: data.rank,
      joined_at: data.joined_at,
      username: data.users?.username || 'Unknown',
      points: data.highscores?.total_points || 0,
      planets_count: data.planets?.[0]?.count || 0,
    }
  }

  /**
   * List alliance members
   */
  async listMembers(allianceId: string): Promise<AllianceMember[]> {
    const { data, error } = await this.supabase
      .from('alliance_members')
      .select(
        `
        *,
        users!inner(username),
        highscores(total_points)
      `
      )
      .eq('alliance_id', allianceId)
      .order('rank', { ascending: true })

    if (error) {
      throw new AllianceError('Failed to list members', 'LIST_FAILED', 500)
    }

    // Get planet counts separately
    const userIds = data.map((m) => m.user_id)
    const { data: planetCounts } = await this.supabase
      .from('planets_compat')
      .select('user_id')
      .in('user_id', userIds)
      .eq('destroyed', false)

    const countsByUser: Record<string, number> = {}
    planetCounts?.forEach((p) => {
      countsByUser[p.user_id] = (countsByUser[p.user_id] || 0) + 1
    })

    return data.map((m) => ({
      id: m.id,
      alliance_id: m.alliance_id,
      user_id: m.user_id,
      rank: m.rank,
      joined_at: m.joined_at,
      username: m.users?.username || 'Unknown',
      points: m.highscores?.total_points || 0,
      planets_count: countsByUser[m.user_id] || 0,
    }))
  }

  /**
   * Update member rank
   */
  async updateMemberRank(
    allianceId: string,
    actorUserId: string,
    targetUserId: string,
    newRank: AllianceRank
  ): Promise<void> {
    // Get actor's rank
    const actor = await this.getMember(allianceId, actorUserId)
    if (!actor || !canPerformAction(actor.rank, 'updateMemberRank')) {
      throw new AllianceError(
        'You do not have permission to change ranks',
        'PERMISSION_DENIED',
        403
      )
    }

    // Get target's current rank
    const target = await this.getMember(allianceId, targetUserId)
    if (!target) {
      throw new AllianceError('Member not found', 'MEMBER_NOT_FOUND', 404)
    }

    // Cannot change founder's rank
    if (target.rank === 'founder') {
      throw new AllianceError(
        'Cannot change founder rank',
        'CANNOT_CHANGE_FOUNDER',
        400
      )
    }

    // Actor must outrank target
    if (RANK_HIERARCHY[actor.rank] >= RANK_HIERARCHY[target.rank]) {
      throw new AllianceError(
        'You cannot change the rank of someone equal or higher than you',
        'INSUFFICIENT_RANK',
        403
      )
    }

    // Actor cannot promote someone to their own rank or higher
    if (RANK_HIERARCHY[newRank] <= RANK_HIERARCHY[actor.rank]) {
      throw new AllianceError(
        'You cannot promote someone to your rank or higher',
        'INSUFFICIENT_RANK',
        403
      )
    }

    const { error } = await this.supabase
      .from('alliance_members')
      .update({ rank: newRank, updated_at: new Date().toISOString() })
      .eq('alliance_id', allianceId)
      .eq('user_id', targetUserId)

    if (error) {
      throw new AllianceError('Failed to update rank', 'UPDATE_FAILED', 500)
    }
  }

  /**
   * Kick a member
   */
  async kickMember(
    allianceId: string,
    actorUserId: string,
    targetUserId: string
  ): Promise<void> {
    const actor = await this.getMember(allianceId, actorUserId)
    if (!actor || !canPerformAction(actor.rank, 'kickMembers')) {
      throw new AllianceError(
        'You do not have permission to kick members',
        'PERMISSION_DENIED',
        403
      )
    }

    const target = await this.getMember(allianceId, targetUserId)
    if (!target) {
      throw new AllianceError('Member not found', 'MEMBER_NOT_FOUND', 404)
    }

    // Cannot kick founder
    if (target.rank === 'founder') {
      throw new AllianceError('Cannot kick the founder', 'CANNOT_KICK_FOUNDER', 400)
    }

    // Actor must outrank target
    if (RANK_HIERARCHY[actor.rank] >= RANK_HIERARCHY[target.rank]) {
      throw new AllianceError(
        'You cannot kick someone equal or higher rank than you',
        'INSUFFICIENT_RANK',
        403
      )
    }

    await this.removeMember(allianceId, targetUserId)
  }

  /**
   * Leave alliance
   */
  async leaveAlliance(allianceId: string, userId: string): Promise<void> {
    const member = await this.getMember(allianceId, userId)
    if (!member) {
      throw new AllianceError('You are not a member of this alliance', 'NOT_MEMBER', 400)
    }

    // Founder cannot leave
    if (member.rank === 'founder') {
      throw new AllianceError(
        'Founder cannot leave. Transfer leadership or delete the alliance.',
        'FOUNDER_CANNOT_LEAVE',
        400
      )
    }

    await this.removeMember(allianceId, userId)
  }

  /**
   * Remove member (internal)
   */
  private async removeMember(allianceId: string, userId: string): Promise<void> {
    // Remove from alliance_members
    const { error } = await this.supabase
      .from('alliance_members')
      .delete()
      .eq('alliance_id', allianceId)
      .eq('user_id', userId)

    if (error) {
      throw new AllianceError('Failed to remove member', 'REMOVE_FAILED', 500)
    }

    // Update user's alliance_id
    await this.supabase.from('users').update({ alliance_id: null }).eq('id', userId)
  }

  /**
   * Transfer leadership
   */
  async transferLeadership(
    allianceId: string,
    founderId: string,
    newLeaderId: string
  ): Promise<void> {
    const founder = await this.getMember(allianceId, founderId)
    if (!founder || founder.rank !== 'founder') {
      throw new AllianceError(
        'Only the founder can transfer leadership',
        'PERMISSION_DENIED',
        403
      )
    }

    const newLeader = await this.getMember(allianceId, newLeaderId)
    if (!newLeader) {
      throw new AllianceError('New leader is not a member', 'NOT_MEMBER', 400)
    }

    // Update alliance leader
    await this.supabase
      .from('alliances')
      .update({ leader_id: newLeaderId })
      .eq('id', allianceId)

    // Update ranks
    await this.supabase
      .from('alliance_members')
      .update({ rank: 'founder' })
      .eq('alliance_id', allianceId)
      .eq('user_id', newLeaderId)

    await this.supabase
      .from('alliance_members')
      .update({ rank: 'leader' })
      .eq('alliance_id', allianceId)
      .eq('user_id', founderId)
  }

  // ==========================================================================
  // APPLICATIONS
  // ==========================================================================

  /**
   * Apply to alliance
   */
  async applyToAlliance(
    allianceId: string,
    userId: string,
    message?: string
  ): Promise<AllianceApplication> {
    // Check if already in an alliance
    const { data: existingMember } = await this.supabase
      .from('alliance_members')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      throw new AllianceError('You are already in an alliance', 'ALREADY_IN_ALLIANCE', 400)
    }

    // Check for pending application
    const { data: existingApp } = await this.supabase
      .from('alliance_applications')
      .select('id')
      .eq('alliance_id', allianceId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single()

    if (existingApp) {
      throw new AllianceError('You already have a pending application', 'PENDING_EXISTS', 400)
    }

    const { data, error } = await this.supabase
      .from('alliance_applications')
      .insert({
        alliance_id: allianceId,
        user_id: userId,
        message,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      throw new AllianceError('Failed to submit application', 'APPLY_FAILED', 500)
    }

    return data
  }

  /**
   * List applications
   */
  async listApplications(
    allianceId: string,
    userId: string
  ): Promise<AllianceApplication[]> {
    const member = await this.getMember(allianceId, userId)
    if (!member || !canPerformAction(member.rank, 'processApplications')) {
      throw new AllianceError(
        'You do not have permission to view applications',
        'PERMISSION_DENIED',
        403
      )
    }

    const { data, error } = await this.supabase
      .from('alliance_applications')
      .select(
        `
        *,
        users!inner(username)
      `
      )
      .eq('alliance_id', allianceId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      throw new AllianceError('Failed to list applications', 'LIST_FAILED', 500)
    }

    return data.map((app) => ({
      ...app,
      username: app.users?.username,
    }))
  }

  /**
   * Process application (accept/reject)
   */
  async processApplication(
    allianceId: string,
    applicationId: string,
    userId: string,
    status: 'accepted' | 'rejected'
  ): Promise<void> {
    const member = await this.getMember(allianceId, userId)
    if (!member || !canPerformAction(member.rank, 'processApplications')) {
      throw new AllianceError(
        'You do not have permission to process applications',
        'PERMISSION_DENIED',
        403
      )
    }

    const { data: app, error: appError } = await this.supabase
      .from('alliance_applications')
      .select('*')
      .eq('id', applicationId)
      .eq('alliance_id', allianceId)
      .eq('status', 'pending')
      .single()

    if (appError || !app) {
      throw new AllianceError('Application not found', 'NOT_FOUND', 404)
    }

    // Update application
    await this.supabase
      .from('alliance_applications')
      .update({
        status,
        processed_at: new Date().toISOString(),
        processed_by: userId,
      })
      .eq('id', applicationId)

    // If accepted, add member
    if (status === 'accepted') {
      await this.supabase.from('alliance_members').insert({
        alliance_id: allianceId,
        user_id: app.user_id,
        rank: 'newbie',
      })

      await this.supabase
        .from('users')
        .update({ alliance_id: allianceId })
        .eq('id', app.user_id)
    }
  }

  // ==========================================================================
  // INVITATIONS
  // ==========================================================================

  /**
   * Invite user to alliance
   */
  async inviteToAlliance(
    allianceId: string,
    inviterId: string,
    invitedUserId: string,
    message?: string
  ): Promise<AllianceInvitation> {
    const member = await this.getMember(allianceId, inviterId)
    if (!member || !canPerformAction(member.rank, 'inviteMembers')) {
      throw new AllianceError(
        'You do not have permission to invite members',
        'PERMISSION_DENIED',
        403
      )
    }

    // Check if user is already in an alliance
    const { data: existingMember } = await this.supabase
      .from('alliance_members')
      .select('id')
      .eq('user_id', invitedUserId)
      .single()

    if (existingMember) {
      throw new AllianceError('User is already in an alliance', 'USER_IN_ALLIANCE', 400)
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await this.supabase
      .from('alliance_invitations')
      .select('id')
      .eq('alliance_id', allianceId)
      .eq('invited_user_id', invitedUserId)
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      throw new AllianceError('User already has a pending invitation', 'INVITE_EXISTS', 400)
    }

    const { data, error } = await this.supabase
      .from('alliance_invitations')
      .insert({
        alliance_id: allianceId,
        invited_user_id: invitedUserId,
        invited_by: inviterId,
        message,
      })
      .select()
      .single()

    if (error) {
      throw new AllianceError('Failed to create invitation', 'INVITE_FAILED', 500)
    }

    return data
  }

  /**
   * List user's pending invitations
   */
  async listUserInvitations(userId: string): Promise<AllianceInvitation[]> {
    const { data, error } = await this.supabase
      .from('alliance_invitations')
      .select(
        `
        *,
        alliances!inner(name, tag),
        inviter:users!alliance_invitations_invited_by_fkey(username)
      `
      )
      .eq('invited_user_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      throw new AllianceError('Failed to list invitations', 'LIST_FAILED', 500)
    }

    return data.map((inv) => ({
      ...inv,
      alliance_name: inv.alliances?.name,
      alliance_tag: inv.alliances?.tag,
      inviter_username: inv.inviter?.username,
    }))
  }

  /**
   * Respond to invitation
   */
  async respondToInvitation(
    invitationId: string,
    userId: string,
    status: 'accepted' | 'rejected'
  ): Promise<void> {
    const { data: inv, error } = await this.supabase
      .from('alliance_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('invited_user_id', userId)
      .eq('status', 'pending')
      .single()

    if (error || !inv) {
      throw new AllianceError('Invitation not found', 'NOT_FOUND', 404)
    }

    if (new Date(inv.expires_at) < new Date()) {
      throw new AllianceError('Invitation has expired', 'EXPIRED', 400)
    }

    // Update invitation
    await this.supabase
      .from('alliance_invitations')
      .update({ status })
      .eq('id', invitationId)

    // If accepted, add member
    if (status === 'accepted') {
      // Check if already in alliance
      const { data: existingMember } = await this.supabase
        .from('alliance_members')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (existingMember) {
        throw new AllianceError(
          'You are already in an alliance',
          'ALREADY_IN_ALLIANCE',
          400
        )
      }

      await this.supabase.from('alliance_members').insert({
        alliance_id: inv.alliance_id,
        user_id: userId,
        rank: 'newbie',
      })

      await this.supabase
        .from('users')
        .update({ alliance_id: inv.alliance_id })
        .eq('id', userId)
    }
  }

  // ==========================================================================
  // DIPLOMACY
  // ==========================================================================

  /**
   * Propose diplomacy relation
   */
  async proposeDiplomacy(
    allianceId: string,
    userId: string,
    targetAllianceId: string,
    relationType: DiplomacyRelation
  ): Promise<AllianceDiplomacy> {
    const member = await this.getMember(allianceId, userId)
    if (!member || !canPerformAction(member.rank, 'proposeDiplomacy')) {
      throw new AllianceError(
        'You do not have permission to propose diplomacy',
        'PERMISSION_DENIED',
        403
      )
    }

    if (allianceId === targetAllianceId) {
      throw new AllianceError(
        'Cannot create diplomacy with yourself',
        'SAME_ALLIANCE',
        400
      )
    }

    // Check if relation already exists
    const { data: existing } = await this.supabase
      .from('alliance_diplomacy')
      .select('id')
      .or(
        `and(alliance_id.eq.${allianceId},target_alliance_id.eq.${targetAllianceId}),and(alliance_id.eq.${targetAllianceId},target_alliance_id.eq.${allianceId})`
      )
      .single()

    if (existing) {
      throw new AllianceError(
        'A diplomacy relation already exists',
        'RELATION_EXISTS',
        400
      )
    }

    const { data, error } = await this.supabase
      .from('alliance_diplomacy')
      .insert({
        alliance_id: allianceId,
        target_alliance_id: targetAllianceId,
        relation_type: relationType,
        proposed_by: userId,
        status: 'proposed',
      })
      .select()
      .single()

    if (error) {
      throw new AllianceError('Failed to create diplomacy', 'CREATE_FAILED', 500)
    }

    return data
  }

  /**
   * List diplomacy relations
   */
  async listDiplomacy(allianceId: string): Promise<AllianceDiplomacy[]> {
    const { data, error } = await this.supabase
      .from('alliance_diplomacy')
      .select(
        `
        *,
        target:alliances!alliance_diplomacy_target_alliance_id_fkey(name, tag)
      `
      )
      .or(`alliance_id.eq.${allianceId},target_alliance_id.eq.${allianceId}`)
      .in('status', ['proposed', 'active'])

    if (error) {
      throw new AllianceError('Failed to list diplomacy', 'LIST_FAILED', 500)
    }

    return data.map((d) => ({
      ...d,
      target_alliance_name: d.target?.name,
      target_alliance_tag: d.target?.tag,
    }))
  }

  /**
   * Respond to diplomacy proposal
   */
  async respondToDiplomacy(
    diplomacyId: string,
    userId: string,
    status: 'active' | 'rejected'
  ): Promise<void> {
    const { data: diplomacy, error } = await this.supabase
      .from('alliance_diplomacy')
      .select('*')
      .eq('id', diplomacyId)
      .eq('status', 'proposed')
      .single()

    if (error || !diplomacy) {
      throw new AllianceError('Diplomacy proposal not found', 'NOT_FOUND', 404)
    }

    // Check if user is leader of target alliance
    const member = await this.getMember(diplomacy.target_alliance_id, userId)
    if (!member || !canPerformAction(member.rank, 'acceptDiplomacy')) {
      throw new AllianceError(
        'You do not have permission to respond to this proposal',
        'PERMISSION_DENIED',
        403
      )
    }

    await this.supabase
      .from('alliance_diplomacy')
      .update({
        status,
        accepted_by: status === 'active' ? userId : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', diplomacyId)
  }

  /**
   * Cancel/end diplomacy
   */
  async cancelDiplomacy(
    diplomacyId: string,
    allianceId: string,
    userId: string
  ): Promise<void> {
    const member = await this.getMember(allianceId, userId)
    if (!member || !canPerformAction(member.rank, 'cancelDiplomacy')) {
      throw new AllianceError(
        'You do not have permission to cancel diplomacy',
        'PERMISSION_DENIED',
        403
      )
    }

    const { error } = await this.supabase
      .from('alliance_diplomacy')
      .delete()
      .eq('id', diplomacyId)
      .or(`alliance_id.eq.${allianceId},target_alliance_id.eq.${allianceId}`)

    if (error) {
      throw new AllianceError('Failed to cancel diplomacy', 'DELETE_FAILED', 500)
    }
  }

  // ==========================================================================
  // CIRCULAR MESSAGES
  // ==========================================================================

  /**
   * Send circular message
   */
  async sendCircular(
    allianceId: string,
    userId: string,
    subject: string,
    body: string
  ): Promise<AllianceCircular> {
    const member = await this.getMember(allianceId, userId)
    if (!member || !canPerformAction(member.rank, 'sendCircular')) {
      throw new AllianceError(
        'You do not have permission to send circulars',
        'PERMISSION_DENIED',
        403
      )
    }

    const { data, error } = await this.supabase
      .from('alliance_circular')
      .insert({
        alliance_id: allianceId,
        sender_id: userId,
        subject,
        body,
      })
      .select()
      .single()

    if (error) {
      throw new AllianceError('Failed to send circular', 'SEND_FAILED', 500)
    }

    return data
  }

  /**
   * List circular messages
   */
  async listCirculars(
    allianceId: string,
    userId: string,
    limit: number = 20
  ): Promise<AllianceCircular[]> {
    const member = await this.getMember(allianceId, userId)
    if (!member) {
      throw new AllianceError(
        'You must be a member to view circulars',
        'NOT_MEMBER',
        403
      )
    }

    const { data, error } = await this.supabase
      .from('alliance_circular')
      .select(
        `
        *,
        sender:users!alliance_circular_sender_id_fkey(username)
      `
      )
      .eq('alliance_id', allianceId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new AllianceError('Failed to list circulars', 'LIST_FAILED', 500)
    }

    return data.map((c) => ({
      ...c,
      sender_username: c.sender?.username,
    }))
  }

  // ==========================================================================
  // USER ALLIANCE INFO
  // ==========================================================================

  /**
   * Get user's current alliance
   */
  async getUserAlliance(userId: string): Promise<{
    alliance: Alliance
    membership: AllianceMember
  } | null> {
    const { data: member, error } = await this.supabase
      .from('alliance_members')
      .select(
        `
        *,
        alliances!inner(*)
      `
      )
      .eq('user_id', userId)
      .single()

    if (error || !member) return null

    return {
      alliance: member.alliances,
      membership: {
        id: member.id,
        alliance_id: member.alliance_id,
        user_id: member.user_id,
        rank: member.rank,
        joined_at: member.joined_at,
        username: '',
        points: 0,
        planets_count: 0,
      },
    }
  }
}

// Export singleton factory
export function createAllianceService(supabase: SupabaseClient): AllianceService {
  return new AllianceService(supabase)
}
