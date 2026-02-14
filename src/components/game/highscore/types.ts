// Types for the Highscore system

export type ScoreCategory = 'total' | 'economy' | 'research' | 'military' | 'defense'

export interface PlayerScore {
  rank: number
  previousRank: number | null
  userId: string
  username: string
  allianceId: string | null
  allianceTag: string | null
  totalPoints: number
  economyPoints: number
  researchPoints: number
  militaryPoints: number
  defensePoints: number
  planetsCount?: number
  shipsCount?: number
  lastUpdated?: string
}

export interface AllianceScore {
  rank: number
  previousRank: number | null
  allianceId: string
  tag: string
  name: string
  membersCount: number
  totalPoints: number
  averagePoints: number
  foundedAt?: string
}

export interface PlayerDetailStats {
  userId: string
  username: string
  allianceTag: string | null
  ranks: {
    total: number
    economy: number
    research: number
    military: number
    defense: number
  }
  points: {
    total: number
    economy: number
    research: number
    military: number
    defense: number
  }
  history?: Array<{
    date: string
    totalPoints: number
  }>
  planetsCount: number
  shipsCount: number
  honorPoints?: number
  joinedAt: string
}

export interface HighscoreFiltersState {
  category: ScoreCategory | 'alliance'
  search: string
  allianceFilter: string | null
  page: number
  perPage: number
}

export const SCORE_CATEGORIES: { id: ScoreCategory; labelKey: string; icon: string }[] = [
  { id: 'total', labelKey: 'categories.total', icon: 'trophy' },
  { id: 'economy', labelKey: 'categories.economy', icon: 'coins' },
  { id: 'research', labelKey: 'categories.research', icon: 'flask' },
  { id: 'military', labelKey: 'categories.military', icon: 'sword' },
  { id: 'defense', labelKey: 'categories.defense', icon: 'shield' },
]

export const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100]
export const DEFAULT_ITEMS_PER_PAGE = 50
