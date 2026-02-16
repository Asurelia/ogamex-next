'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useGameStore } from '@/stores/gameStore'
import { HoloCard, HoloButton, HoloSpinner } from '@/components/ui/holographic'
import {
  HighscoreTable,
  AllianceHighscoreTable,
  HighscoreFilters,
  MyRankCard,
  PlayerStatsCard,
  Pagination,
  type PlayerScore,
  type AllianceScore,
  type PlayerDetailStats,
  type ScoreCategory,
  type HighscoreFiltersState,
  DEFAULT_ITEMS_PER_PAGE,
} from '@/components/game/highscore'

// Auto-refresh interval (5 minutes)
const REFRESH_INTERVAL = 5 * 60 * 1000

// Loading fallback for Suspense
function HighscorePageLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
        <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
      </div>
      <div className="h-12 bg-white/10 rounded animate-pulse" />
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}

/**
 * Main page export with Suspense boundary
 * Required for useSearchParams in Next.js 14+
 */
export default function HighscorePage() {
  return (
    <Suspense fallback={<HighscorePageLoading />}>
      <HighscorePageContent />
    </Suspense>
  )
}

/**
 * Highscore page content (uses useSearchParams)
 */
function HighscorePageContent() {
  const { user } = useGameStore()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize filters from URL params
  const initialFilters: HighscoreFiltersState = useMemo(() => ({
    category: (searchParams.get('category') as ScoreCategory | 'alliance') || 'total',
    search: searchParams.get('search') || '',
    allianceFilter: searchParams.get('alliance') || null,
    page: parseInt(searchParams.get('page') || '1', 10),
    perPage: parseInt(searchParams.get('perPage') || String(DEFAULT_ITEMS_PER_PAGE), 10),
  }), [searchParams])

  // State
  const [filters, setFilters] = useState<HighscoreFiltersState>(initialFilters)
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([])
  const [allianceScores, setAllianceScores] = useState<AllianceScore[]>([])
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [totalAlliances, setTotalAlliances] = useState(0)
  const [loading, setLoading] = useState(true)
  const [myRank, setMyRank] = useState<PlayerScore | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetailStats | null>(null)
  const [playerModalOpen, setPlayerModalOpen] = useState(false)
  const [playerModalLoading, setPlayerModalLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.category !== 'total') params.set('category', filters.category)
    if (filters.search) params.set('search', filters.search)
    if (filters.allianceFilter) params.set('alliance', filters.allianceFilter)
    if (filters.page > 1) params.set('page', String(filters.page))
    if (filters.perPage !== DEFAULT_ITEMS_PER_PAGE) params.set('perPage', String(filters.perPage))

    const queryString = params.toString()
    const newUrl = queryString ? `?${queryString}` : '/game/highscore'
    router.replace(newUrl, { scroll: false })
  }, [filters, router])

  // Load player scores
  const loadPlayerScores = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabaseClient()

    const orderColumn = filters.category === 'economy' ? 'economy_points'
      : filters.category === 'research' ? 'research_points'
      : filters.category === 'military' ? 'military_points'
      : filters.category === 'defense' ? 'defense_points'
      : 'total_points'

    try {
      // Build query
      let query = supabase
        .from('highscores')
        .select(`
          *,
          users!inner(id, username, alliance_id, alliances(id, tag))
        `, { count: 'exact' })

      // Apply search filter
      if (filters.search) {
        query = query.ilike('users.username', `%${filters.search}%`)
      }

      // Apply alliance filter
      if (filters.allianceFilter) {
        query = query.eq('users.alliance_id', filters.allianceFilter)
      }

      // Order and paginate
      query = query
        .order(orderColumn, { ascending: false })
        .range((filters.page - 1) * filters.perPage, filters.page * filters.perPage - 1)

      const { data: highscores, count, error } = await query

      if (error) {
        console.error('Error loading highscores:', error)
        return
      }

      if (highscores) {
        const baseRank = (filters.page - 1) * filters.perPage + 1
        setPlayerScores(highscores.map((h: any, index: number) => ({
          rank: baseRank + index,
          previousRank: h.previous_rank ?? null,
          userId: h.user_id,
          username: h.users?.username || 'Unknown',
          allianceId: h.users?.alliance_id || null,
          allianceTag: h.users?.alliances?.tag || null,
          totalPoints: h.total_points || 0,
          economyPoints: h.economy_points || 0,
          researchPoints: h.research_points || 0,
          militaryPoints: h.military_points || 0,
          defensePoints: h.defense_points || 0,
        })))
        setTotalPlayers(count || 0)
      }

      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error loading highscores:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Load alliance scores
  const loadAllianceScores = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabaseClient()

    try {
      let query = supabase
        .from('alliance_highscores')
        .select('*', { count: 'exact' })

      // Apply search filter
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,tag.ilike.%${filters.search}%`)
      }

      query = query
        .order('total_points', { ascending: false })
        .range((filters.page - 1) * filters.perPage, filters.page * filters.perPage - 1)

      const { data: alliances, count, error } = await query

      if (error) {
        console.error('Error loading alliance highscores:', error)
        return
      }

      if (alliances) {
        const baseRank = (filters.page - 1) * filters.perPage + 1
        setAllianceScores(alliances.map((a: any, index: number) => ({
          rank: baseRank + index,
          previousRank: a.previous_rank ?? null,
          allianceId: a.alliance_id,
          tag: a.tag || '',
          name: a.name || '',
          membersCount: a.members_count || 0,
          totalPoints: a.total_points || 0,
          averagePoints: a.average_points || 0,
        })))
        setTotalAlliances(count || 0)
      }

      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error loading alliance highscores:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Load my rank
  const loadMyRank = useCallback(async () => {
    if (!user?.id) return

    const supabase = getSupabaseClient()

    const orderColumn = filters.category === 'economy' ? 'economy_points'
      : filters.category === 'research' ? 'research_points'
      : filters.category === 'military' ? 'military_points'
      : filters.category === 'defense' ? 'defense_points'
      : 'total_points'

    try {
      // Get user's score
      const { data: myScore } = await supabase
        .from('highscores')
        .select(`
          *,
          users!inner(username, alliance_id, alliances(tag))
        `)
        .eq('user_id', user.id)
        .single()

      if (myScore) {
        // Count players with higher score to determine rank
        const { count } = await supabase
          .from('highscores')
          .select('*', { count: 'exact', head: true })
          .gt(orderColumn, myScore[orderColumn])

        const rank = (count || 0) + 1

        setMyRank({
          rank,
          previousRank: myScore.previous_rank ?? null,
          userId: myScore.user_id,
          username: myScore.users?.username || 'Unknown',
          allianceId: myScore.users?.alliance_id || null,
          allianceTag: myScore.users?.alliances?.tag || null,
          totalPoints: myScore.total_points || 0,
          economyPoints: myScore.economy_points || 0,
          researchPoints: myScore.research_points || 0,
          militaryPoints: myScore.military_points || 0,
          defensePoints: myScore.defense_points || 0,
        })
      }
    } catch (err) {
      console.error('Error loading my rank:', err)
    }
  }, [user?.id, filters.category])

  // Load player details for modal
  const loadPlayerDetails = useCallback(async (userId: string) => {
    setPlayerModalLoading(true)
    setPlayerModalOpen(true)

    const supabase = getSupabaseClient()

    try {
      // Get player data
      const { data: playerData } = await supabase
        .from('highscores')
        .select(`
          *,
          users!inner(id, username, created_at, alliance_id, alliances(tag))
        `)
        .eq('user_id', userId)
        .single()

      if (playerData) {
        // Get rank for each category
        const categories = ['total_points', 'economy_points', 'research_points', 'military_points', 'defense_points']
        const ranks: Record<string, number> = {}

        await Promise.all(categories.map(async (col) => {
          const { count } = await supabase
            .from('highscores')
            .select('*', { count: 'exact', head: true })
            .gt(col, playerData[col])
          ranks[col] = (count || 0) + 1
        }))

        // Get planets count
        const { count: planetsCount } = await supabase
          .from('planets_compat')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        // Get ships count (simplified)
        const { data: shipsData } = await supabase
          .from('planet_ships')
          .select('amount')
          .eq('planet_id', userId) // This should be joined with planets

        const shipsCount = shipsData?.reduce((sum: number, s: any) => sum + (s.amount || 0), 0) || 0

        setSelectedPlayer({
          userId: playerData.user_id,
          username: playerData.users?.username || 'Unknown',
          allianceTag: playerData.users?.alliances?.tag || null,
          ranks: {
            total: ranks['total_points'] || 0,
            economy: ranks['economy_points'] || 0,
            research: ranks['research_points'] || 0,
            military: ranks['military_points'] || 0,
            defense: ranks['defense_points'] || 0,
          },
          points: {
            total: playerData.total_points || 0,
            economy: playerData.economy_points || 0,
            research: playerData.research_points || 0,
            military: playerData.military_points || 0,
            defense: playerData.defense_points || 0,
          },
          planetsCount: planetsCount || 0,
          shipsCount,
          joinedAt: playerData.users?.created_at || new Date().toISOString(),
        })
      }
    } catch (err) {
      console.error('Error loading player details:', err)
    } finally {
      setPlayerModalLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    if (filters.category === 'alliance') {
      loadAllianceScores()
    } else {
      loadPlayerScores()
      loadMyRank()
    }
  }, [filters, loadPlayerScores, loadAllianceScores, loadMyRank])

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (filters.category === 'alliance') {
        loadAllianceScores()
      } else {
        loadPlayerScores()
        loadMyRank()
      }
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [filters, loadPlayerScores, loadAllianceScores, loadMyRank])

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: Partial<HighscoreFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  // Handle player click
  const handlePlayerClick = useCallback((player: PlayerScore) => {
    loadPlayerDetails(player.userId)
  }, [loadPlayerDetails])

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    if (filters.category === 'alliance') {
      loadAllianceScores()
    } else {
      loadPlayerScores()
      loadMyRank()
    }
  }, [filters.category, loadPlayerScores, loadAllianceScores, loadMyRank])

  // Calculate total pages
  const totalPages = useMemo(() => {
    const total = filters.category === 'alliance' ? totalAlliances : totalPlayers
    return Math.ceil(total / filters.perPage)
  }, [filters.category, filters.perPage, totalPlayers, totalAlliances])

  // Get points for my rank card
  const getMyRankPoints = useCallback(() => {
    if (!myRank) return 0
    switch (filters.category) {
      case 'economy': return myRank.economyPoints
      case 'research': return myRank.researchPoints
      case 'military': return myRank.militaryPoints
      case 'defense': return myRank.defensePoints
      default: return myRank.totalPoints
    }
  }, [myRank, filters.category])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold uppercase tracking-wider"
            style={{
              color: '#00ffff',
              textShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
            }}
          >
            Classement
          </h1>
          {lastUpdated && (
            <p className="text-sm text-white/50 mt-1">
              Mis a jour : {lastUpdated.toLocaleTimeString('fr-FR')}
            </p>
          )}
        </div>

        <HoloButton
          onClick={handleRefresh}
          disabled={loading}
          size="sm"
          icon={
            <motion.svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              animate={loading ? { rotate: 360 } : {}}
              transition={loading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
            >
              <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </motion.svg>
          }
        >
          Actualiser
        </HoloButton>
      </div>

      {/* My rank card (only for player categories) */}
      {filters.category !== 'alliance' && myRank && user && (
        <MyRankCard
          rank={myRank.rank}
          previousRank={myRank.previousRank}
          totalPlayers={totalPlayers}
          points={getMyRankPoints()}
          category={filters.category as ScoreCategory}
          username={user.username}
          onClick={() => handlePlayerClick(myRank)}
        />
      )}

      {/* Filters */}
      <HoloCard noPadding>
        <div className="p-4">
          <HighscoreFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            totalPlayers={filters.category === 'alliance' ? totalAlliances : totalPlayers}
            loading={loading}
          />
        </div>
      </HoloCard>

      {/* Table */}
      {filters.category === 'alliance' ? (
        <AllianceHighscoreTable
          data={allianceScores}
          loading={loading}
        />
      ) : (
        <HighscoreTable
          data={playerScores}
          category={filters.category}
          loading={loading}
          currentUserId={user?.id}
          onPlayerClick={handlePlayerClick}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={filters.page}
            totalPages={totalPages}
            onPageChange={(page) => handleFiltersChange({ page })}
            disabled={loading}
          />
        </div>
      )}

      {/* Player details modal */}
      <PlayerStatsCard
        isOpen={playerModalOpen}
        onClose={() => setPlayerModalOpen(false)}
        player={selectedPlayer}
        loading={playerModalLoading}
      />
    </div>
  )
}
