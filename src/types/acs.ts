/**
 * ACS (Alliance Combat System) Types
 *
 * Types for coordinated multi-fleet attack and defense operations.
 * Based on classic OGame mechanics where up to 5 fleets can attack or defend together.
 */

import type { ShipCounts, Resources } from '@/lib/missions/types'

// ============================================================================
// ACS OPERATION TYPES
// ============================================================================

/**
 * ACS operation type - attack or defense coordination
 */
export type ACSOperationType = 'attack' | 'defend'

/**
 * ACS operation status lifecycle
 */
export type ACSOperationStatus =
  | 'forming' // Waiting for participants to join
  | 'launching' // All participants confirmed, missions being created
  | 'in_progress' // Fleets en route or battle ongoing
  | 'completed' // Operation finished
  | 'cancelled' // Operation cancelled by organizer

/**
 * Coordinates for target location
 */
export interface ACSCoordinates {
  galaxy: number
  system: number
  position: number
}

/**
 * Main ACS Operation entity
 */
export interface ACSOperation {
  id: string
  name: string
  type: ACSOperationType
  target_planet_id: string
  target_coordinates: ACSCoordinates
  organizer_id: string
  alliance_id?: string

  // Timing
  scheduled_arrival: Date
  hold_time: number // Seconds to wait for synchronization (max 30)

  status: ACSOperationStatus

  // Participants
  max_participants: number // Max 5 for attack, 5 for defense
  participants: ACSParticipant[]

  created_at: Date
  updated_at: Date
}

/**
 * Database row type for ACS operations
 */
export interface ACSOperationDB {
  id: string
  name: string
  type: ACSOperationType
  target_planet_id: string
  target_galaxy: number
  target_system: number
  target_position: number
  organizer_id: string
  alliance_id: string | null

  scheduled_arrival: string
  hold_time: number

  status: ACSOperationStatus
  max_participants: number

  created_at: string
  updated_at: string
}

// ============================================================================
// ACS PARTICIPANT TYPES
// ============================================================================

/**
 * Participant status in an ACS operation
 */
export type ACSParticipantStatus =
  | 'invited' // Received invitation
  | 'confirmed' // Accepted and fleet configured
  | 'en_route' // Fleet launched and traveling
  | 'arrived' // Fleet arrived at target
  | 'returned' // Fleet returned home

/**
 * ACS Participant - a single fleet in the operation
 */
export interface ACSParticipant {
  id: string
  acs_operation_id: string
  user_id: string
  fleet_mission_id: string | null

  // Fleet composition
  ships: Record<string, number>
  resources?: Resources

  // State
  status: ACSParticipantStatus
  arrival_time: Date | null

  // Results (filled after battle)
  ships_lost?: Record<string, number>
  loot_share?: Resources

  created_at: Date
  updated_at: Date
}

/**
 * Database row type for ACS participants
 */
export interface ACSParticipantDB {
  id: string
  acs_operation_id: string
  user_id: string
  fleet_mission_id: string | null

  ships: Record<string, number>
  metal: number
  crystal: number
  deuterium: number

  status: ACSParticipantStatus
  arrival_time: string | null

  ships_lost: Record<string, number> | null
  loot_metal: number | null
  loot_crystal: number | null
  loot_deuterium: number | null

  created_at: string
  updated_at: string
}

// ============================================================================
// ACS INVITATION TYPES
// ============================================================================

/**
 * Invitation status
 */
export type ACSInvitationStatus =
  | 'pending' // Waiting for response
  | 'accepted' // User accepted
  | 'declined' // User declined
  | 'expired' // Invitation expired

/**
 * ACS Invitation to join an operation
 */
export interface ACSInvitation {
  id: string
  acs_operation_id: string
  invited_user_id: string
  invited_by: string
  message?: string
  status: ACSInvitationStatus
  created_at: Date
  expires_at: Date
}

/**
 * Database row type for ACS invitations
 */
export interface ACSInvitationDB {
  id: string
  acs_operation_id: string
  invited_user_id: string
  invited_by: string
  message: string | null
  status: ACSInvitationStatus
  created_at: string
  expires_at: string
}

// ============================================================================
// ACS SERVICE PARAMS
// ============================================================================

/**
 * Parameters for creating a new ACS operation
 */
export interface CreateACSOperationParams {
  name: string
  type: ACSOperationType
  target_galaxy: number
  target_system: number
  target_position: number
  target_planet_id?: string // Optional, can be null for empty positions
  scheduled_arrival: Date
  hold_time?: number // Default 30 seconds
  alliance_id?: string
}

/**
 * Parameters for joining an ACS operation
 */
export interface JoinACSParams {
  operation_id: string
  ships: Partial<ShipCounts>
  resources?: Resources
}

/**
 * Parameters for inviting a user to an ACS operation
 */
export interface InviteToACSParams {
  operation_id: string
  user_id: string
  message?: string
}

// ============================================================================
// ACS BATTLE TYPES
// ============================================================================

/**
 * Combined fleet for ACS battle
 */
export interface ACSFleet {
  participants: Array<{
    user_id: string
    ships: Record<string, number>
    tech_levels: {
      weapons: number
      shields: number
      armor: number
    }
  }>
  total_ships: Record<string, number>
}

/**
 * ACS battle result with loot distribution
 */
export interface ACSBattleResult {
  winner: 'attacker' | 'defender' | 'draw'
  total_rounds: number
  debris: {
    metal: number
    crystal: number
  }
  moon_chance: number
  moon_created: boolean
  // Per-participant results
  participant_results: Array<{
    user_id: string
    ships_remaining: Record<string, number>
    ships_lost: Record<string, number>
    loot_share: Resources
    cargo_used: number
    cargo_capacity: number
  }>
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ACSOperationResponse {
  success: boolean
  operation?: ACSOperation
  error?: string
}

export interface ACSOperationsListResponse {
  success: boolean
  operations: ACSOperation[]
  total: number
}

export interface ACSInvitationResponse {
  success: boolean
  invitation?: ACSInvitation
  error?: string
}

export interface ACSParticipantResponse {
  success: boolean
  participant?: ACSParticipant
  error?: string
}

// ============================================================================
// ACS CONSTANTS
// ============================================================================

/**
 * Maximum participants per ACS operation (attack or defense)
 */
export const ACS_MAX_PARTICIPANTS = 5

/**
 * Maximum hold time in seconds (for fleet synchronization)
 */
export const ACS_MAX_HOLD_TIME = 30

/**
 * Default hold time in seconds
 */
export const ACS_DEFAULT_HOLD_TIME = 30

/**
 * Invitation expiry time in hours
 */
export const ACS_INVITATION_EXPIRY_HOURS = 24

/**
 * Synchronization tolerance in seconds (fleets must arrive within this window)
 */
export const ACS_SYNC_TOLERANCE_SECONDS = 30
