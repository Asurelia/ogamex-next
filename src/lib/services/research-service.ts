import { getSupabaseClient } from '@/lib/supabase/client'
import type { UserResearch } from '@/types/database'
import { ServiceCache } from './service-cache'

// Cache research per user (long TTL — research changes rarely)
const researchCache = new ServiceCache<UserResearch>({
    maxEntries: 20,
    ttlMs: 60_000, // 60s
    name: 'ResearchService'
})

export class ResearchService {
    private static supabase = getSupabaseClient()

    /**
     * Get user research levels (cached, 60s TTL)
     * UserResearch from database.ts uses snake_case matching the DB schema.
     */
    static async getUserResearch(userId: string): Promise<UserResearch | null> {
        const cacheKey = `user:${userId}`
        const cached = researchCache.get(cacheKey)
        if (cached) return cached

        const { data, error } = await this.supabase
            .from('user_research')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error) {
            console.error(`Error fetching research for ${userId}:`, error)
            return null
        }

        const research = data as UserResearch
        researchCache.set(cacheKey, research)
        return research
    }

    /**
     * Invalidate research cache for a user (call after research upgrade)
     */
    static invalidateUser(userId: string): void {
        researchCache.invalidate(`user:${userId}`)
    }

    /** Expose cache stats for monitoring */
    static getCacheStats() {
        return researchCache.stats()
    }
}
