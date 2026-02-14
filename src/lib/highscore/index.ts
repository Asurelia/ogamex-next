/**
 * OGameX Highscore Module
 * Export all highscore-related functionality
 */

export { HighscoreService, getHighscoreService } from './HighscoreService'
export type {
  PlayerScore,
  AllianceScore,
  ScoreCategory,
  ScoreHistoryEntry,
  HighscoreFilters,
  PaginatedResponse,
  PlayerHighscoreResponse,
  AllianceHighscoreResponse,
  PlayerDetailResponse,
  HistoryResponse,
  PointCalculation,
} from '@/types/highscore'
