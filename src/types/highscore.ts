/**
 * OGameX Highscore Types
 * Complete type definitions for the ranking system
 */

// ============================================================================
// SCORE CATEGORIES
// ============================================================================

export type ScoreCategory = 'total' | 'economy' | 'research' | 'military' | 'defense'

// ============================================================================
// PLAYER SCORE
// ============================================================================

export interface PlayerScore {
  user_id: string
  username: string
  alliance_tag?: string
  alliance_id?: string

  // Points by category
  total_points: number
  economy_points: number
  research_points: number
  military_points: number
  defense_points: number

  // Statistics
  planets_count: number
  ships_count: number

  // Rankings
  total_rank: number
  economy_rank: number
  research_rank: number
  military_rank: number
  defense_rank: number

  // Change since yesterday (positive = climbed, negative = dropped)
  rank_change: number

  updated_at: Date | string
}

// ============================================================================
// ALLIANCE SCORE
// ============================================================================

export interface AllianceScore {
  alliance_id: string
  alliance_tag: string
  alliance_name: string

  total_points: number
  average_points: number
  member_count: number

  total_rank: number
  rank_change: number

  updated_at: Date | string
}

// ============================================================================
// SCORE HISTORY (for graphs)
// ============================================================================

export interface ScoreHistoryEntry {
  id: string
  entity_type: 'player' | 'alliance'
  entity_id: string

  total_points: number
  economy_points: number
  research_points: number
  military_points: number
  defense_points: number

  total_rank: number

  recorded_date: string
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface HighscoreFilters {
  category?: ScoreCategory
  search?: string
  alliance_id?: string
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface PlayerHighscoreResponse extends PaginatedResponse<PlayerScore> {
  category: ScoreCategory
}

export interface AllianceHighscoreResponse extends PaginatedResponse<AllianceScore> {}

export interface PlayerDetailResponse {
  player: PlayerScore
  history: ScoreHistoryEntry[]
  alliance?: {
    id: string
    tag: string
    name: string
    rank: number
  }
}

export interface HistoryResponse {
  entity_type: 'player' | 'alliance'
  entity_id: string
  history: ScoreHistoryEntry[]
}

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

export interface PlayerScoreRow {
  id: string
  user_id: string
  total_points: number
  economy_points: number
  research_points: number
  military_points: number
  defense_points: number
  planets_count: number
  ships_count: number
  total_rank: number
  economy_rank: number
  research_rank: number
  military_rank: number
  defense_rank: number
  previous_total_rank: number
  rank_change: number
  created_at: string
  updated_at: string
}

export interface AllianceScoreRow {
  id: string
  alliance_id: string
  total_points: number
  average_points: number
  member_count: number
  total_rank: number
  previous_total_rank: number
  rank_change: number
  created_at: string
  updated_at: string
}

export interface ScoreHistoryRow {
  id: string
  entity_type: 'player' | 'alliance'
  entity_id: string
  total_points: number
  economy_points: number
  research_points: number
  military_points: number
  defense_points: number
  total_rank: number
  recorded_date: string
  created_at: string
}

// ============================================================================
// POINT CALCULATION TYPES
// ============================================================================

export interface PointCalculation {
  economy: number
  research: number
  military: number
  defense: number
  total: number
}

export interface BuildingPointsConfig {
  key: string
  baseCost: number  // metal + crystal + deuterium
  priceFactor: number
}

export interface UnitPointsConfig {
  key: string
  points: number  // pre-calculated points per unit
}
