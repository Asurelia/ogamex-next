/**
 * Centralized Type Exports for OGameX
 *
 * Import types from here to avoid duplications and ensure consistency.
 * Example: import type { Planet, Alliance, Coordinates } from '@/types'
 */

// ============================================================================
// DATABASE TYPES (Supabase)
// ============================================================================

export type {
  // Core entities
  User,
  Planet,
  UserResearch,
  Alliance,
  FleetMission,
  Message,
  EspionageReport,
  BattleReport,
  DebrisField,

  // Queues
  BuildingQueue,
  ResearchQueue,
  UnitQueue,

  // Scores (DB rows)
  PlayerScoreRow,
  AllianceScoreRow,
  ScoreHistoryRow,

  // Enums
  MissionType,
  PlanetType,
  MessageType,

  // Supabase helpers
  Json,
  Database,
  Tables,
} from './database'

// ============================================================================
// ALLIANCE TYPES
// ============================================================================

export type {
  // Core alliance types
  Alliance as AllianceData,
  AllianceMember,
  AllianceApplication,
  AllianceCircular,
  AllianceDiplomacy,
  AllianceInvitation,

  // Enums
  AllianceRank,
  ApplicationStatus,
  InvitationStatus,
  DiplomacyRelation,
  DiplomacyStatus,

  // API Request types
  CreateAllianceRequest,
  UpdateAllianceRequest,
  ApplyToAllianceRequest,
  ProcessApplicationRequest,
  InviteToAllianceRequest,
  RespondToInvitationRequest,
  UpdateMemberRankRequest,
  CreateDiplomacyRequest,
  RespondToDiplomacyRequest,
  SendCircularRequest,

  // API Response types
  AllianceListResponse,
  AllianceDetailResponse,
  AllianceMemberListResponse,
} from './alliance'

// Re-export permission helpers
export {
  RANK_HIERARCHY,
  RANK_PERMISSIONS,
  hasRankPermission,
  canPerformAction,
} from './alliance'

// ============================================================================
// BATTLE TYPES
// ============================================================================

export type {
  // Core battle types
  Coordinates,
  BattleParticipant,
  DefenderParticipant,
  BattleRound,
  BattleEventType,
  BattleEvent,
  Battle,
  BattleReportData,
  BattlePreviewData,
  BattleReportDB,
  BattleState,
  BattleActions,
  BattleStore,

  // API types
  BattleApiResponse,
  BattleListApiResponse,
} from './battle'

// ============================================================================
// ACS TYPES (Alliance Combat System)
// ============================================================================

export type {
  // Core ACS types
  ACSOperation,
  ACSOperationDB,
  ACSParticipant,
  ACSParticipantDB,
  ACSInvitation,
  ACSInvitationDB,
  ACSCoordinates,
  ACSFleet,
  ACSBattleResult,

  // Enums
  ACSOperationType,
  ACSOperationStatus,
  ACSParticipantStatus,
  ACSInvitationStatus,

  // Params
  CreateACSOperationParams,
  JoinACSParams,
  InviteToACSParams,

  // API types
  ACSOperationResponse,
  ACSOperationsListResponse,
  ACSInvitationResponse,
  ACSParticipantResponse,
} from './acs'

// Re-export ACS constants
export {
  ACS_MAX_PARTICIPANTS,
  ACS_MAX_HOLD_TIME,
  ACS_DEFAULT_HOLD_TIME,
  ACS_INVITATION_EXPIRY_HOURS,
  ACS_SYNC_TOLERANCE_SECONDS,
} from './acs'

// ============================================================================
// HIGHSCORE TYPES
// ============================================================================

export type {
  // Score categories
  ScoreCategory,

  // Player scores
  PlayerScore,
  PlayerHighscoreResponse,
  PlayerDetailResponse,

  // Alliance scores
  AllianceScore,
  AllianceHighscoreResponse,

  // History
  ScoreHistoryEntry,
  HistoryResponse,

  // Filters & Pagination
  HighscoreFilters,
  PaginatedResponse,

  // Row types (DB format)
  PlayerScoreRow as HighscorePlayerScoreRow,
  AllianceScoreRow as HighscoreAllianceScoreRow,
  ScoreHistoryRow as HighscoreScoreHistoryRow,

  // Point calculations
  PointCalculation,
  BuildingPointsConfig,
  UnitPointsConfig,
} from './highscore'
