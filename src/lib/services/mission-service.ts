import { getSupabaseClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import type { FleetMission } from '@/types/database'
import { ServiceCache } from './service-cache'

export type DbFleetMission = Database['public']['Tables']['fleet_missions']['Row']

// Cache active missions per user (short TTL — missions change frequently)
const missionsCache = new ServiceCache<FleetMission[]>({
    maxEntries: 20,
    ttlMs: 10_000, // 10s
    name: 'MissionService'
})

export class MissionService {
    private static supabase = getSupabaseClient()

    /**
     * Start a new mission (Persist to DB)
     * 
     * FleetMission uses snake_case property names matching the DB schema:
     * user_id, origin_galaxy, destination_galaxy, mission_type, cargo_resources, etc.
     */
    static async startMission(mission: Partial<FleetMission>): Promise<string | null> {
        const { data, error } = await this.supabase
            .from('fleet_missions')
            .insert({
                user_id: mission.user_id!,
                origin_galaxy: mission.origin_galaxy!,
                origin_system: mission.origin_system!,
                origin_position: mission.origin_position!,
                destination_galaxy: mission.destination_galaxy!,
                destination_system: mission.destination_system!,
                destination_position: mission.destination_position!,
                destination_type: mission.destination_type!,
                mission_type: mission.mission_type!,
                ships: mission.ships as unknown as Record<string, unknown>,
                cargo_resources: mission.cargo_resources as unknown as Record<string, unknown>,
                departed_at: mission.departed_at!,
                arrives_at: mission.arrives_at!,
                is_returning: false,
                processed: false,
                cancelled: false
            })
            .select('id')
            .single()

        if (error) {
            console.error('Error starting mission:', error)
            return null
        }

        // Invalidate user's mission cache
        if (mission.user_id) {
            missionsCache.invalidate(`active:${mission.user_id}`)
        }

        return data.id
    }

    /**
     * Get active missions for a user (cached, 10s TTL)
     */
    static async getActiveMissions(userId: string): Promise<FleetMission[]> {
        const cacheKey = `active:${userId}`
        const cached = missionsCache.get(cacheKey)
        if (cached) return cached

        const { data, error } = await this.supabase
            .from('fleet_missions')
            .select('*')
            .eq('user_id', userId)
            .eq('processed', false)
            .order('arrives_at', { ascending: true })

        if (error) {
            console.error('Error fetching missions:', error)
            return []
        }

        const missions = (data ?? []) as FleetMission[]
        missionsCache.set(cacheKey, missions)
        return missions
    }

    /**
     * Get missions that are due for processing (arrives_at <= now, processed = false)
     * NOT cached — used by server-side processor only
     */
    static async getDueMissions(): Promise<FleetMission[]> {
        const now = new Date().toISOString()
        const { data, error } = await this.supabase
            .from('fleet_missions')
            .select('*')
            .eq('processed', false)
            .lte('arrives_at', now)

        if (error) {
            console.error('Error fetching due missions:', error)
            return []
        }

        return (data ?? []) as FleetMission[]
    }

    /**
     * Mark a mission as processed and optionally returning
     */
    static async completeMission(id: string, updates: Partial<DbFleetMission>): Promise<boolean> {
        const { error } = await this.supabase
            .from('fleet_missions')
            .update({
                processed: updates.processed,
                is_returning: updates.is_returning,
                returns_at: updates.returns_at,
                ships: updates.ships,
                cargo_resources: updates.cargo_resources
            })
            .eq('id', id)

        // Invalidate all user mission caches (we don't know the user_id here)
        missionsCache.clear()

        return !error
    }

    /**
     * Cancel a mission (Recall)
     */
    static async cancelMission(missionId: string): Promise<boolean> {
        const { data: mission, error: fetchError } = await this.supabase
            .from('fleet_missions')
            .select('*')
            .eq('id', missionId)
            .single()

        if (fetchError || !mission) return false

        const now = new Date().getTime()
        const departure = new Date(mission.departed_at!).getTime()
        const elapsed = now - departure
        const returnTime = new Date(now + elapsed).toISOString()

        const { error } = await this.supabase
            .from('fleet_missions')
            .update({
                is_returning: true,
                returns_at: returnTime
            })
            .eq('id', missionId)

        // Invalidate user's cache
        if (mission.user_id) {
            missionsCache.invalidate(`active:${mission.user_id}`)
        }

        return !error
    }

    /** Expose cache stats for monitoring */
    static getCacheStats() {
        return missionsCache.stats()
    }
}
