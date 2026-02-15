/**
 * OGameX Highscore Service
 * Handles all score calculations and ranking operations
 *
 * Uses database-driven game configuration via getCachedGameConfig()
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  getCachedGameConfig,
  getAllShipPoints,
  getAllDefensePoints,
} from '@/lib/game'
import type {
  PlayerScore,
  AllianceScore,
  ScoreCategory,
  ScoreHistoryEntry,
  PaginatedResponse,
  PointCalculation,
} from '@/types/highscore'

// ============================================================================
// HIGHSCORE SERVICE CLASS
// ============================================================================

export class HighscoreService {
  private supabase: SupabaseClient

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  // ==========================================================================
  // SCORE CALCULATION
  // ==========================================================================

  /**
   * Calculate total building cost up to a level
   */
  private calculateBuildingTotalCost(
    baseCost: { metal: number; crystal: number; deuterium: number },
    priceFactor: number,
    level: number
  ): number {
    if (level <= 0) return 0

    // Sum of geometric series: base * (factor^n - 1) / (factor - 1)
    const totalMetal = baseCost.metal * (Math.pow(priceFactor, level) - 1) / (priceFactor - 1)
    const totalCrystal = baseCost.crystal * (Math.pow(priceFactor, level) - 1) / (priceFactor - 1)
    const totalDeuterium = baseCost.deuterium * (Math.pow(priceFactor, level) - 1) / (priceFactor - 1)

    return totalMetal + totalCrystal + totalDeuterium
  }

  /**
   * Calculate economy points for a player
   */
  async calculateEconomyPoints(userId: string): Promise<number> {
    const [{ data: planets }, config] = await Promise.all([
      this.supabase
        .from('planets_compat')
        .select('*')
        .eq('user_id', userId)
        .eq('destroyed', false),
      getCachedGameConfig()
    ])

    if (!planets || planets.length === 0) return 0

    let totalCost = 0

    for (const planet of planets) {
      // Resource buildings
      for (const building of Object.values(config.buildingsByKey)) {
        const level = planet[building.key as keyof typeof planet] as number || 0
        if (level > 0) {
          totalCost += this.calculateBuildingTotalCost(
            building.baseCost,
            building.priceFactor,
            level
          )
        }
      }
    }

    return Math.floor(totalCost / 1000)
  }

  /**
   * Calculate research points for a player
   */
  async calculateResearchPoints(userId: string): Promise<number> {
    const [{ data: research }, config] = await Promise.all([
      this.supabase
        .from('user_research')
        .select('*')
        .eq('user_id', userId)
        .single(),
      getCachedGameConfig()
    ])

    if (!research) return 0

    let totalCost = 0

    for (const tech of Object.values(config.researchByKey)) {
      const level = research[tech.key as keyof typeof research] as number || 0
      if (level > 0) {
        totalCost += this.calculateBuildingTotalCost(
          tech.baseCost,
          tech.priceFactor,
          level
        )
      }
    }

    return Math.floor(totalCost / 1000)
  }

  /**
   * Calculate military points for a player
   */
  async calculateMilitaryPoints(userId: string): Promise<{ points: number; shipCount: number }> {
    const [{ data: planets }, shipPoints] = await Promise.all([
      this.supabase
        .from('planets_compat')
        .select('*')
        .eq('user_id', userId)
        .eq('destroyed', false),
      getAllShipPoints()
    ])

    if (!planets || planets.length === 0) return { points: 0, shipCount: 0 }

    let totalPoints = 0
    let shipCount = 0

    for (const planet of planets) {
      for (const [key, pointValue] of Object.entries(shipPoints)) {
        const count = planet[key as keyof typeof planet] as number || 0
        if (count > 0) {
          totalPoints += count * pointValue
          shipCount += count
        }
      }
    }

    return { points: Math.floor(totalPoints), shipCount }
  }

  /**
   * Calculate defense points for a player
   */
  async calculateDefensePoints(userId: string): Promise<number> {
    const [{ data: planets }, defensePoints] = await Promise.all([
      this.supabase
        .from('planets_compat')
        .select('*')
        .eq('user_id', userId)
        .eq('destroyed', false),
      getAllDefensePoints()
    ])

    if (!planets || planets.length === 0) return 0

    let totalPoints = 0

    for (const planet of planets) {
      for (const [key, pointValue] of Object.entries(defensePoints)) {
        const count = planet[key as keyof typeof planet] as number || 0
        if (count > 0) {
          totalPoints += count * pointValue
        }
      }
    }

    return Math.floor(totalPoints)
  }

  /**
   * Calculate all points for a player
   */
  async calculatePlayerPoints(userId: string): Promise<PointCalculation> {
    const [economy, research, militaryResult, defense] = await Promise.all([
      this.calculateEconomyPoints(userId),
      this.calculateResearchPoints(userId),
      this.calculateMilitaryPoints(userId),
      this.calculateDefensePoints(userId),
    ])

    return {
      economy,
      research,
      military: militaryResult.points,
      defense,
      total: economy + research + militaryResult.points + defense,
    }
  }

  // ==========================================================================
  // RANKING OPERATIONS
  // ==========================================================================

  /**
   * Update all scores and rankings (called by cron)
   */
  async updateAllRankings(): Promise<{ success: boolean; playersUpdated: number; alliancesUpdated: number }> {
    try {
      // Call the database function
      const { error } = await this.supabase.rpc('update_highscores')

      if (error) throw error

      // Get counts
      const { count: playersCount } = await this.supabase
        .from('player_scores')
        .select('*', { count: 'exact', head: true })

      const { count: alliancesCount } = await this.supabase
        .from('alliance_scores')
        .select('*', { count: 'exact', head: true })

      return {
        success: true,
        playersUpdated: playersCount || 0,
        alliancesUpdated: alliancesCount || 0,
      }
    } catch (error) {
      console.error('Error updating rankings:', error)
      throw error
    }
  }

  // ==========================================================================
  // QUERY OPERATIONS
  // ==========================================================================

  /**
   * Get top players by category
   */
  async getTopPlayers(
    category: ScoreCategory = 'total',
    limit: number = 100,
    offset: number = 0
  ): Promise<PaginatedResponse<PlayerScore>> {
    const pointsColumn = `${category}_points`

    // Get total count
    const { count } = await this.supabase
      .from('player_scores')
      .select('*', { count: 'exact', head: true })

    // Get paginated data with user and alliance info
    const { data, error } = await this.supabase
      .from('player_scores')
      .select(`
        *,
        users:user_id (
          username,
          alliance_id,
          alliances:alliance_id (
            tag
          )
        )
      `)
      .order(pointsColumn, { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const total = count || 0
    const page = Math.floor(offset / limit) + 1
    const totalPages = Math.ceil(total / limit)

    const players: PlayerScore[] = (data || []).map((row: any) => ({
      user_id: row.user_id,
      username: row.users?.username || 'Unknown',
      alliance_tag: row.users?.alliances?.tag,
      alliance_id: row.users?.alliance_id,
      total_points: row.total_points,
      economy_points: row.economy_points,
      research_points: row.research_points,
      military_points: row.military_points,
      defense_points: row.defense_points,
      planets_count: row.planets_count,
      ships_count: row.ships_count,
      total_rank: row.total_rank,
      economy_rank: row.economy_rank,
      research_rank: row.research_rank,
      military_rank: row.military_rank,
      defense_rank: row.defense_rank,
      rank_change: row.rank_change,
      updated_at: row.updated_at,
    }))

    return {
      data: players,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  }

  /**
   * Get top alliances
   */
  async getTopAlliances(
    limit: number = 100,
    offset: number = 0
  ): Promise<PaginatedResponse<AllianceScore>> {
    // Get total count
    const { count } = await this.supabase
      .from('alliance_scores')
      .select('*', { count: 'exact', head: true })

    // Get paginated data with alliance info
    const { data, error } = await this.supabase
      .from('alliance_scores')
      .select(`
        *,
        alliances:alliance_id (
          tag,
          name
        )
      `)
      .order('total_points', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const total = count || 0
    const page = Math.floor(offset / limit) + 1
    const totalPages = Math.ceil(total / limit)

    const alliances: AllianceScore[] = (data || []).map((row: any) => ({
      alliance_id: row.alliance_id,
      alliance_tag: row.alliances?.tag || '',
      alliance_name: row.alliances?.name || '',
      total_points: row.total_points,
      average_points: row.average_points,
      member_count: row.member_count,
      total_rank: row.total_rank,
      rank_change: row.rank_change,
      updated_at: row.updated_at,
    }))

    return {
      data: alliances,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  }

  /**
   * Get a specific player's rank and score
   */
  async getPlayerRank(userId: string): Promise<PlayerScore | null> {
    const { data, error } = await this.supabase
      .from('player_scores')
      .select(`
        *,
        users:user_id (
          username,
          alliance_id,
          alliances:alliance_id (
            tag
          )
        )
      `)
      .eq('user_id', userId)
      .single()

    if (error || !data) return null

    return {
      user_id: data.user_id,
      username: data.users?.username || 'Unknown',
      alliance_tag: data.users?.alliances?.tag,
      alliance_id: data.users?.alliance_id,
      total_points: data.total_points,
      economy_points: data.economy_points,
      research_points: data.research_points,
      military_points: data.military_points,
      defense_points: data.defense_points,
      planets_count: data.planets_count,
      ships_count: data.ships_count,
      total_rank: data.total_rank,
      economy_rank: data.economy_rank,
      research_rank: data.research_rank,
      military_rank: data.military_rank,
      defense_rank: data.defense_rank,
      rank_change: data.rank_change,
      updated_at: data.updated_at,
    }
  }

  /**
   * Search players by username
   */
  async searchPlayers(
    query: string,
    category: ScoreCategory = 'total',
    limit: number = 50
  ): Promise<PlayerScore[]> {
    const pointsColumn = `${category}_points`

    const { data, error } = await this.supabase
      .from('player_scores')
      .select(`
        *,
        users:user_id (
          username,
          alliance_id,
          alliances:alliance_id (
            tag
          )
        )
      `)
      .ilike('users.username', `%${query}%`)
      .order(pointsColumn, { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || [])
      .filter((row: any) => row.users?.username) // Filter out rows where join failed
      .map((row: any) => ({
        user_id: row.user_id,
        username: row.users?.username || 'Unknown',
        alliance_tag: row.users?.alliances?.tag,
        alliance_id: row.users?.alliance_id,
        total_points: row.total_points,
        economy_points: row.economy_points,
        research_points: row.research_points,
        military_points: row.military_points,
        defense_points: row.defense_points,
        planets_count: row.planets_count,
        ships_count: row.ships_count,
        total_rank: row.total_rank,
        economy_rank: row.economy_rank,
        research_rank: row.research_rank,
        military_rank: row.military_rank,
        defense_rank: row.defense_rank,
        rank_change: row.rank_change,
        updated_at: row.updated_at,
      }))
  }

  /**
   * Get players by alliance
   */
  async getPlayersByAlliance(
    allianceId: string,
    category: ScoreCategory = 'total',
    limit: number = 100
  ): Promise<PlayerScore[]> {
    const pointsColumn = `${category}_points`

    const { data, error } = await this.supabase
      .from('player_scores')
      .select(`
        *,
        users:user_id!inner (
          username,
          alliance_id,
          alliances:alliance_id (
            tag
          )
        )
      `)
      .eq('users.alliance_id', allianceId)
      .order(pointsColumn, { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data || []).map((row: any) => ({
      user_id: row.user_id,
      username: row.users?.username || 'Unknown',
      alliance_tag: row.users?.alliances?.tag,
      alliance_id: row.users?.alliance_id,
      total_points: row.total_points,
      economy_points: row.economy_points,
      research_points: row.research_points,
      military_points: row.military_points,
      defense_points: row.defense_points,
      planets_count: row.planets_count,
      ships_count: row.ships_count,
      total_rank: row.total_rank,
      economy_rank: row.economy_rank,
      research_rank: row.research_rank,
      military_rank: row.military_rank,
      defense_rank: row.defense_rank,
      rank_change: row.rank_change,
      updated_at: row.updated_at,
    }))
  }

  /**
   * Get score history for graphs
   */
  async getScoreHistory(
    entityType: 'player' | 'alliance',
    entityId: string,
    days: number = 30
  ): Promise<ScoreHistoryEntry[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await this.supabase
      .from('score_history')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .gte('recorded_date', startDate.toISOString().split('T')[0])
      .order('recorded_date', { ascending: true })

    if (error) throw error

    return (data || []).map((row: any) => ({
      id: row.id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      total_points: row.total_points,
      economy_points: row.economy_points,
      research_points: row.research_points,
      military_points: row.military_points,
      defense_points: row.defense_points,
      total_rank: row.total_rank,
      recorded_date: row.recorded_date,
    }))
  }

  /**
   * Get players around a specific rank
   */
  async getPlayersAroundRank(
    rank: number,
    category: ScoreCategory = 'total',
    range: number = 5
  ): Promise<PlayerScore[]> {
    const rankColumn = `${category}_rank`
    const minRank = Math.max(1, rank - range)
    const maxRank = rank + range

    const { data, error } = await this.supabase
      .from('player_scores')
      .select(`
        *,
        users:user_id (
          username,
          alliance_id,
          alliances:alliance_id (
            tag
          )
        )
      `)
      .gte(rankColumn, minRank)
      .lte(rankColumn, maxRank)
      .order(rankColumn, { ascending: true })

    if (error) throw error

    return (data || []).map((row: any) => ({
      user_id: row.user_id,
      username: row.users?.username || 'Unknown',
      alliance_tag: row.users?.alliances?.tag,
      alliance_id: row.users?.alliance_id,
      total_points: row.total_points,
      economy_points: row.economy_points,
      research_points: row.research_points,
      military_points: row.military_points,
      defense_points: row.defense_points,
      planets_count: row.planets_count,
      ships_count: row.ships_count,
      total_rank: row.total_rank,
      economy_rank: row.economy_rank,
      research_rank: row.research_rank,
      military_rank: row.military_rank,
      defense_rank: row.defense_rank,
      rank_change: row.rank_change,
      updated_at: row.updated_at,
    }))
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let highscoreServiceInstance: HighscoreService | null = null

export function getHighscoreService(): HighscoreService {
  if (!highscoreServiceInstance) {
    highscoreServiceInstance = new HighscoreService()
  }
  return highscoreServiceInstance
}

export default HighscoreService
