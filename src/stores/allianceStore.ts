import { create } from 'zustand'
import { getSupabaseClient } from '@/lib/supabase/client'
import type {
  Alliance,
  AllianceMember,
  AllianceApplication,
  AllianceDiplomacy,
  AllianceCircular,
  AllianceRank,
  DiplomacyRelation,
} from '@/types/alliance'

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determines the rank of a user within an alliance based on founder/leader IDs
 */
function determineUserRank(userId: string, alliance: Alliance): AllianceRank {
  if (alliance.founder_id === userId) {
    return 'founder'
  }
  if (alliance.leader_id === userId) {
    return 'leader'
  }
  return 'member'
}

// Extended Alliance with detailed info
interface AllianceWithDetails extends Alliance {
  members?: AllianceMember[]
  applications?: AllianceApplication[]
  diplomacy?: AllianceDiplomacy[]
  circulars?: AllianceCircular[]
}

// User's pending applications to other alliances
interface UserApplication {
  id: string
  alliance_id: string
  alliance_name: string
  alliance_tag: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

interface AllianceState {
  // Current user's alliance
  alliance: AllianceWithDetails | null
  userRank: AllianceRank | null

  // Cached current user ID to avoid repeated auth.getUser() calls
  currentUserId: string | null

  // Alliance data
  members: AllianceMember[]
  applications: AllianceApplication[]
  diplomacy: AllianceDiplomacy[]
  circulars: AllianceCircular[]

  // Search results
  searchResults: Alliance[]
  searchLoading: boolean

  // User's applications to other alliances
  userApplications: UserApplication[]

  // Granular loading states (replaces single 'loading' boolean)
  loadingStates: Record<string, boolean>
  // Granular error states (replaces single 'error' string)
  errors: Record<string, string | null>
  // Cache timestamps for TTL-based invalidation
  cacheTimestamps: Record<string, number>

  // Legacy loading/error for backwards compatibility
  loading: boolean
  error: string | null

  // Actions
  loadAlliance: (allianceId: string) => Promise<void>
  loadUserAlliance: (userId: string) => Promise<void>
  createAlliance: (tag: string, name: string, description?: string) => Promise<Alliance | null>
  updateAlliance: (updates: Partial<Alliance>) => Promise<boolean>
  dissolveAlliance: () => Promise<boolean>
  leaveAlliance: () => Promise<boolean>

  // Member management
  loadMembers: () => Promise<void>
  updateMemberRank: (memberId: string, newRank: AllianceRank) => Promise<boolean>
  kickMember: (memberId: string) => Promise<boolean>
  inviteMember: (userId: string, message?: string) => Promise<boolean>

  // Applications
  loadApplications: () => Promise<void>
  applyToAlliance: (allianceId: string, message?: string) => Promise<boolean>
  processApplication: (applicationId: string, accept: boolean) => Promise<boolean>
  loadUserApplications: (userId: string) => Promise<void>
  cancelApplication: (applicationId: string) => Promise<boolean>

  // Diplomacy
  loadDiplomacy: () => Promise<void>
  proposeDiplomacy: (targetAllianceId: string, relationType: DiplomacyRelation) => Promise<boolean>
  respondToDiplomacy: (diplomacyId: string, accept: boolean) => Promise<boolean>
  cancelDiplomacy: (diplomacyId: string) => Promise<boolean>

  // Circulars
  loadCirculars: () => Promise<void>
  sendCircular: (subject: string, body: string) => Promise<boolean>

  // Search
  searchAlliances: (query: string) => Promise<void>
  clearSearch: () => void

  // Cache and loading utilities
  loadCurrentUser: () => Promise<string | null>
  isLoading: (key: string) => boolean
  getError: (key: string) => string | null
  isCacheValid: (key: string, ttlMs?: number) => boolean
  setLoading: (key: string, isLoading: boolean) => void
  setError: (key: string, error: string | null) => void
  updateCacheTimestamp: (key: string) => void

  // Reset
  reset: () => void
}

const initialState = {
  alliance: null,
  userRank: null,
  currentUserId: null,
  members: [],
  applications: [],
  diplomacy: [],
  circulars: [],
  searchResults: [],
  searchLoading: false,
  userApplications: [],
  loadingStates: {} as Record<string, boolean>,
  errors: {} as Record<string, string | null>,
  cacheTimestamps: {} as Record<string, number>,
  // Legacy fields for backwards compatibility
  loading: false,
  error: null,
}

export const useAllianceStore = create<AllianceState>((set, get) => ({
  ...initialState,

  // =============================================================================
  // CACHE AND LOADING UTILITIES
  // =============================================================================

  /**
   * Loads and caches the current user ID to avoid repeated auth.getUser() calls.
   * Returns cached value if available, otherwise fetches from Supabase.
   */
  loadCurrentUser: async () => {
    const { currentUserId } = get()
    if (currentUserId) {
      return currentUserId
    }

    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      set({ currentUserId: user.id })
      return user.id
    }

    return null
  },

  /**
   * Check if a specific operation is loading
   */
  isLoading: (key: string) => {
    return get().loadingStates[key] ?? false
  },

  /**
   * Get error for a specific operation
   */
  getError: (key: string) => {
    return get().errors[key] ?? null
  },

  /**
   * Check if cached data is still valid based on TTL
   */
  isCacheValid: (key: string, ttlMs: number = DEFAULT_CACHE_TTL_MS) => {
    const timestamp = get().cacheTimestamps[key]
    if (!timestamp) return false
    return Date.now() - timestamp < ttlMs
  },

  /**
   * Set loading state for a specific operation
   */
  setLoading: (key: string, isLoading: boolean) => {
    set((state) => ({
      loadingStates: { ...state.loadingStates, [key]: isLoading },
      // Update legacy loading for backwards compatibility
      loading: isLoading || Object.values({ ...state.loadingStates, [key]: isLoading }).some(Boolean),
    }))
  },

  /**
   * Set error for a specific operation
   */
  setError: (key: string, error: string | null) => {
    set((state) => ({
      errors: { ...state.errors, [key]: error },
      // Update legacy error for backwards compatibility
      error: error,
    }))
  },

  /**
   * Update cache timestamp for a specific data type
   */
  updateCacheTimestamp: (key: string) => {
    set((state) => ({
      cacheTimestamps: { ...state.cacheTimestamps, [key]: Date.now() },
    }))
  },

  // =============================================================================
  // ALLIANCE LOADING
  // =============================================================================

  loadAlliance: async (allianceId: string) => {
    const { setLoading, setError, updateCacheTimestamp, isCacheValid, alliance } = get()
    const cacheKey = `alliance:${allianceId}`

    // Skip if cache is still valid and we have the same alliance
    if (alliance?.id === allianceId && isCacheValid(cacheKey)) {
      return
    }

    setLoading('loadAlliance', true)
    setError('loadAlliance', null)
    const supabase = getSupabaseClient()

    try {
      const { data, error } = await supabase
        .from('alliances')
        .select('*')
        .eq('id', allianceId)
        .single()

      if (error) throw error

      set({ alliance: data, loading: false })
      updateCacheTimestamp(cacheKey)
    } catch (err) {
      setError('loadAlliance', (err as Error).message)
    } finally {
      setLoading('loadAlliance', false)
    }
  },

  loadUserAlliance: async (userId: string) => {
    const { setLoading, setError, updateCacheTimestamp, isCacheValid } = get()
    const cacheKey = `userAlliance:${userId}`

    // Skip if cache is still valid
    if (isCacheValid(cacheKey)) {
      return
    }

    setLoading('loadUserAlliance', true)
    setError('loadUserAlliance', null)
    const supabase = getSupabaseClient()

    try {
      // First get user's alliance_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('alliance_id')
        .eq('id', userId)
        .single()

      if (userError) throw userError
      if (!userData?.alliance_id) {
        set({ alliance: null, userRank: null, loading: false })
        return
      }

      // Then get the alliance
      const { data: allianceData, error: allianceError } = await supabase
        .from('alliances')
        .select('*')
        .eq('id', userData.alliance_id)
        .single()

      if (allianceError) throw allianceError

      // Get user's rank using the helper function
      const userRank = determineUserRank(userId, allianceData)

      set({ alliance: allianceData, userRank, loading: false })
      updateCacheTimestamp(cacheKey)
    } catch (err) {
      setError('loadUserAlliance', (err as Error).message)
    } finally {
      setLoading('loadUserAlliance', false)
    }
  },

  createAlliance: async (tag: string, name: string, description?: string) => {
    const { setLoading, setError, loadCurrentUser } = get()

    setLoading('createAlliance', true)
    setError('createAlliance', null)
    const supabase = getSupabaseClient()

    try {
      // Get current user (cached)
      const userId = await loadCurrentUser()
      if (!userId) throw new Error('Not authenticated')

      // Create alliance
      const { data: alliance, error: allianceError } = await supabase
        .from('alliances')
        .insert({
          tag: tag.toUpperCase(),
          name,
          description,
          founder_id: userId,
          leader_id: userId,
        })
        .select()
        .single()

      if (allianceError) throw allianceError

      // Update user's alliance_id
      const { error: userError } = await supabase
        .from('users')
        .update({ alliance_id: alliance.id })
        .eq('id', userId)

      if (userError) throw userError

      set({ alliance, userRank: 'founder', loading: false })
      return alliance
    } catch (err) {
      setError('createAlliance', (err as Error).message)
      return null
    } finally {
      setLoading('createAlliance', false)
    }
  },

  updateAlliance: async (updates: Partial<Alliance>) => {
    const { alliance } = get()
    if (!alliance) return false

    set({ loading: true, error: null })
    const supabase = getSupabaseClient()

    try {
      const { data, error } = await supabase
        .from('alliances')
        .update(updates)
        .eq('id', alliance.id)
        .select()
        .single()

      if (error) throw error

      set({ alliance: { ...alliance, ...data }, loading: false })
      return true
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      return false
    }
  },

  dissolveAlliance: async () => {
    const { alliance } = get()
    if (!alliance) return false

    set({ loading: true, error: null })
    const supabase = getSupabaseClient()

    try {
      // Remove all members from alliance
      const { error: membersError } = await supabase
        .from('users')
        .update({ alliance_id: null })
        .eq('alliance_id', alliance.id)

      if (membersError) throw membersError

      // Delete the alliance
      const { error: deleteError } = await supabase
        .from('alliances')
        .delete()
        .eq('id', alliance.id)

      if (deleteError) throw deleteError

      set({ ...initialState })
      return true
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      return false
    }
  },

  leaveAlliance: async () => {
    const { alliance, setLoading, setError, loadCurrentUser } = get()
    if (!alliance) return false

    setLoading('leaveAlliance', true)
    setError('leaveAlliance', null)
    const supabase = getSupabaseClient()

    try {
      const userId = await loadCurrentUser()
      if (!userId) throw new Error('Not authenticated')

      // Update user's alliance_id to null
      const { error } = await supabase
        .from('users')
        .update({ alliance_id: null })
        .eq('id', userId)

      if (error) throw error

      set({ ...initialState })
      return true
    } catch (err) {
      setError('leaveAlliance', (err as Error).message)
      return false
    } finally {
      setLoading('leaveAlliance', false)
    }
  },

  loadMembers: async () => {
    const { alliance, setLoading, setError, updateCacheTimestamp, isCacheValid } = get()
    if (!alliance) return

    const cacheKey = `members:${alliance.id}`

    // Skip if cache is still valid
    if (isCacheValid(cacheKey)) {
      return
    }

    setLoading('loadMembers', true)
    setError('loadMembers', null)
    const supabase = getSupabaseClient()

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, alliance_id, created_at')
        .eq('alliance_id', alliance.id)

      if (error) throw error

      // Transform to AllianceMember format using the helper function
      const members: AllianceMember[] = (data || []).map((user: { id: string; username: string; alliance_id: string; created_at: string }) => ({
        id: user.id,
        alliance_id: alliance.id,
        user_id: user.id,
        rank: determineUserRank(user.id, alliance),
        joined_at: user.created_at,
        username: user.username,
        points: 0, // Would need highscore join
        planets_count: 0, // Would need planets count
      }))

      set({ members })
      updateCacheTimestamp(cacheKey)
    } catch (err) {
      setError('loadMembers', (err as Error).message)
    } finally {
      setLoading('loadMembers', false)
    }
  },

  updateMemberRank: async (memberId: string, newRank: AllianceRank) => {
    const { alliance, members } = get()
    if (!alliance) return false

    // For now, update local state only (would need alliance_members table)
    const updatedMembers = members.map((m) =>
      m.user_id === memberId ? { ...m, rank: newRank } : m
    )
    set({ members: updatedMembers })
    return true
  },

  kickMember: async (memberId: string) => {
    const { alliance, members } = get()
    if (!alliance) return false

    const supabase = getSupabaseClient()

    try {
      const { error } = await supabase
        .from('users')
        .update({ alliance_id: null })
        .eq('id', memberId)

      if (error) throw error

      set({ members: members.filter((m) => m.user_id !== memberId) })
      return true
    } catch (err) {
      set({ error: (err as Error).message })
      return false
    }
  },

  inviteMember: async (_userId: string, _message?: string) => {
    // Would need invitations table
    return true
  },

  loadApplications: async () => {
    const { alliance, setLoading, setError, updateCacheTimestamp, isCacheValid } = get()
    if (!alliance) return

    const cacheKey = `applications:${alliance.id}`

    // Skip if cache is still valid
    if (isCacheValid(cacheKey)) {
      return
    }

    setLoading('loadApplications', true)
    setError('loadApplications', null)
    const supabase = getSupabaseClient()

    try {
      const { data, error } = await supabase
        .from('alliance_applications')
        .select(`
          *,
          users:user_id (username)
        `)
        .eq('alliance_id', alliance.id)
        .eq('status', 'pending')

      if (error) throw error

      const applications: AllianceApplication[] = (data || []).map((app: any) => ({
        ...app,
        username: app.users?.username,
      }))

      set({ applications })
      updateCacheTimestamp(cacheKey)
    } catch (err) {
      // Table might not exist yet
      set({ applications: [] })
    } finally {
      setLoading('loadApplications', false)
    }
  },

  applyToAlliance: async (allianceId: string, message?: string) => {
    const { setLoading, setError, loadCurrentUser } = get()

    setLoading('applyToAlliance', true)
    setError('applyToAlliance', null)
    const supabase = getSupabaseClient()

    try {
      const userId = await loadCurrentUser()
      if (!userId) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('alliance_applications')
        .insert({
          alliance_id: allianceId,
          user_id: userId,
          message,
          status: 'pending',
        })

      if (error) throw error

      return true
    } catch (err) {
      setError('applyToAlliance', (err as Error).message)
      return false
    } finally {
      setLoading('applyToAlliance', false)
    }
  },

  processApplication: async (applicationId: string, accept: boolean) => {
    const { applications } = get()
    const supabase = getSupabaseClient()

    try {
      const application = applications.find((a) => a.id === applicationId)
      if (!application) throw new Error('Application not found')

      if (accept) {
        // Update user's alliance_id
        const { error: userError } = await supabase
          .from('users')
          .update({ alliance_id: application.alliance_id })
          .eq('id', application.user_id)

        if (userError) throw userError
      }

      // Update application status
      const { error: appError } = await supabase
        .from('alliance_applications')
        .update({
          status: accept ? 'accepted' : 'rejected',
          processed_at: new Date().toISOString(),
        })
        .eq('id', applicationId)

      if (appError) throw appError

      set({ applications: applications.filter((a) => a.id !== applicationId) })
      return true
    } catch (err) {
      set({ error: (err as Error).message })
      return false
    }
  },

  loadUserApplications: async (userId: string) => {
    const supabase = getSupabaseClient()

    try {
      const { data, error } = await supabase
        .from('alliance_applications')
        .select(`
          *,
          alliances:alliance_id (name, tag)
        `)
        .eq('user_id', userId)
        .eq('status', 'pending')

      if (error) throw error

      const userApplications: UserApplication[] = (data || []).map((app: any) => ({
        id: app.id,
        alliance_id: app.alliance_id,
        alliance_name: app.alliances?.name || '',
        alliance_tag: app.alliances?.tag || '',
        status: app.status,
        created_at: app.created_at,
      }))

      set({ userApplications })
    } catch (err) {
      set({ userApplications: [] })
    }
  },

  cancelApplication: async (applicationId: string) => {
    const { userApplications } = get()
    const supabase = getSupabaseClient()

    try {
      const { error } = await supabase
        .from('alliance_applications')
        .delete()
        .eq('id', applicationId)

      if (error) throw error

      set({ userApplications: userApplications.filter((a) => a.id !== applicationId) })
      return true
    } catch (err) {
      set({ error: (err as Error).message })
      return false
    }
  },

  loadDiplomacy: async () => {
    const { alliance, setLoading, setError, updateCacheTimestamp, isCacheValid } = get()
    if (!alliance) return

    const cacheKey = `diplomacy:${alliance.id}`

    // Skip if cache is still valid
    if (isCacheValid(cacheKey)) {
      return
    }

    setLoading('loadDiplomacy', true)
    setError('loadDiplomacy', null)
    const supabase = getSupabaseClient()

    try {
      const { data, error } = await supabase
        .from('alliance_diplomacy')
        .select(`
          *,
          target:target_alliance_id (name, tag)
        `)
        .or(`alliance_id.eq.${alliance.id},target_alliance_id.eq.${alliance.id}`)
        .eq('status', 'active')

      if (error) throw error

      const diplomacy: AllianceDiplomacy[] = (data || []).map((d: any) => ({
        ...d,
        target_alliance_name: d.target?.name,
        target_alliance_tag: d.target?.tag,
      }))

      set({ diplomacy })
      updateCacheTimestamp(cacheKey)
    } catch (err) {
      set({ diplomacy: [] })
    } finally {
      setLoading('loadDiplomacy', false)
    }
  },

  proposeDiplomacy: async (targetAllianceId: string, relationType: DiplomacyRelation) => {
    const { alliance, setLoading, setError, loadCurrentUser } = get()
    if (!alliance) return false

    setLoading('proposeDiplomacy', true)
    setError('proposeDiplomacy', null)
    const supabase = getSupabaseClient()

    try {
      const userId = await loadCurrentUser()
      if (!userId) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('alliance_diplomacy')
        .insert({
          alliance_id: alliance.id,
          target_alliance_id: targetAllianceId,
          relation_type: relationType,
          proposed_by: userId,
          status: 'proposed',
        })

      if (error) throw error
      return true
    } catch (err) {
      setError('proposeDiplomacy', (err as Error).message)
      return false
    } finally {
      setLoading('proposeDiplomacy', false)
    }
  },

  respondToDiplomacy: async (diplomacyId: string, accept: boolean) => {
    const { diplomacy, setLoading, setError, loadCurrentUser } = get()

    setLoading('respondToDiplomacy', true)
    setError('respondToDiplomacy', null)
    const supabase = getSupabaseClient()

    try {
      const userId = await loadCurrentUser()
      if (!userId) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('alliance_diplomacy')
        .update({
          status: accept ? 'active' : 'rejected',
          accepted_by: accept ? userId : null,
        })
        .eq('id', diplomacyId)

      if (error) throw error

      if (!accept) {
        set({ diplomacy: diplomacy.filter((d) => d.id !== diplomacyId) })
      }
      return true
    } catch (err) {
      setError('respondToDiplomacy', (err as Error).message)
      return false
    } finally {
      setLoading('respondToDiplomacy', false)
    }
  },

  cancelDiplomacy: async (diplomacyId: string) => {
    const { diplomacy, setLoading, setError } = get()

    setLoading('cancelDiplomacy', true)
    setError('cancelDiplomacy', null)
    const supabase = getSupabaseClient()

    try {
      const { error } = await supabase
        .from('alliance_diplomacy')
        .update({ status: 'expired' })
        .eq('id', diplomacyId)

      if (error) throw error

      set({ diplomacy: diplomacy.filter((d) => d.id !== diplomacyId) })
      return true
    } catch (err) {
      setError('cancelDiplomacy', (err as Error).message)
      return false
    } finally {
      setLoading('cancelDiplomacy', false)
    }
  },

  loadCirculars: async () => {
    const { alliance, setLoading, setError, updateCacheTimestamp, isCacheValid } = get()
    if (!alliance) return

    const cacheKey = `circulars:${alliance.id}`

    // Skip if cache is still valid
    if (isCacheValid(cacheKey)) {
      return
    }

    setLoading('loadCirculars', true)
    setError('loadCirculars', null)
    const supabase = getSupabaseClient()

    try {
      const { data, error } = await supabase
        .from('alliance_circular')
        .select(`
          *,
          sender:sender_id (username)
        `)
        .eq('alliance_id', alliance.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      const circulars: AllianceCircular[] = (data || []).map((c: any) => ({
        ...c,
        sender_username: c.sender?.username,
      }))

      set({ circulars })
      updateCacheTimestamp(cacheKey)
    } catch (err) {
      set({ circulars: [] })
    } finally {
      setLoading('loadCirculars', false)
    }
  },

  sendCircular: async (subject: string, body: string) => {
    const { alliance, circulars, setLoading, setError, loadCurrentUser } = get()
    if (!alliance) return false

    setLoading('sendCircular', true)
    setError('sendCircular', null)
    const supabase = getSupabaseClient()

    try {
      const userId = await loadCurrentUser()
      if (!userId) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('alliance_circular')
        .insert({
          alliance_id: alliance.id,
          sender_id: userId,
          subject,
          body,
        })
        .select()
        .single()

      if (error) throw error

      set({ circulars: [data, ...circulars] })
      return true
    } catch (err) {
      setError('sendCircular', (err as Error).message)
      return false
    } finally {
      setLoading('sendCircular', false)
    }
  },

  searchAlliances: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [], searchLoading: false })
      return
    }

    set({ searchLoading: true })
    const supabase = getSupabaseClient()

    try {
      const { data, error } = await supabase
        .from('alliances')
        .select('*')
        .or(`name.ilike.%${query}%,tag.ilike.%${query}%`)
        .order('name')
        .limit(20)

      if (error) throw error

      set({ searchResults: data || [], searchLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, searchLoading: false })
    }
  },

  clearSearch: () => {
    set({ searchResults: [], searchLoading: false })
  },

  reset: () => set(initialState),
}))
