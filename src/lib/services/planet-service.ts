import { getSupabaseClient } from '@/lib/supabase/client'
import { Resources, ShipCounts } from '@/types/game-core'
import type { Planet as PlanetData } from '@/types/database'
import { Database } from '@/types/database'
import { ServiceCache } from './service-cache'

type DbPlanet = Database['public']['Tables']['planets']['Row']

// Cache planets by ID (moderate TTL — resources change on actions)
const planetCache = new ServiceCache<PlanetData>({
    maxEntries: 50,
    ttlMs: 30_000, // 30s
    name: 'PlanetService:byId'
})

// Cache planets by coordinates (same TTL)
const coordsCache = new ServiceCache<PlanetData>({
    maxEntries: 30,
    ttlMs: 30_000,
    name: 'PlanetService:byCoords'
})

export class PlanetService {
    private static supabase = getSupabaseClient()

    /**
     * Get planet by ID (cached, 30s TTL)
     */
    static async getPlanetById(planetId: string): Promise<PlanetData | null> {
        return this.getPlanetData(planetId)
    }

    /**
     * Get planet data by ID with caching
     */
    static async getPlanetData(planetId: string): Promise<PlanetData | null> {
        const cacheKey = `id:${planetId}`
        const cached = planetCache.get(cacheKey)
        if (cached) return cached

        const { data, error } = await this.supabase
            .from('planets')
            .select('*')
            .eq('id', planetId)
            .single()

        if (error || !data) {
            console.error(`Error fetching planet ${planetId}:`, error)
            return null
        }

        const planet = data as PlanetData
        planetCache.set(cacheKey, planet)
        return planet
    }

    /**
     * Find planet by coordinates (cached, 30s TTL)
     */
    static async getPlanetByCoords(galaxy: number, system: number, position: number, type: string): Promise<PlanetData | null> {
        const cacheKey = `coords:${galaxy}:${system}:${position}:${type}`
        const cached = coordsCache.get(cacheKey)
        if (cached) return cached

        const { data, error } = await this.supabase
            .from('planets')
            .select('*')
            .eq('galaxy', galaxy)
            .eq('system', system)
            .eq('position', position)
            .eq('planet_type', type.toLowerCase())
            .single()

        if (error || !data) {
            return null
        }

        const planet = data as PlanetData
        coordsCache.set(cacheKey, planet)
        return planet
    }

    /**
     * Update planet resources (Add/Subtract)
     * Invalidates cache after write.
     */
    static async updateResources(planetId: string, resources: Partial<Resources>): Promise<boolean> {
        const planet = await this.getPlanetData(planetId)
        if (!planet) return false

        const newMetal = Math.max(0, planet.metal + (resources.metal || 0))
        const newCrystal = Math.max(0, planet.crystal + (resources.crystal || 0))
        const newDeuterium = Math.max(0, planet.deuterium + (resources.deuterium || 0))

        const { error } = await this.supabase
            .from('planets')
            .update({
                metal: newMetal,
                crystal: newCrystal,
                deuterium: newDeuterium,
                last_resource_update: new Date().toISOString()
            })
            .eq('id', planetId)

        if (!error) {
            this.invalidatePlanet(planetId)
        }

        return !error
    }

    /**
     * Update planet fleet (Add/Subtract ships)
     */
    static async updateFleet(planetId: string, ships: Partial<ShipCounts>, operation: 'add' | 'subtract'): Promise<boolean> {
        const { data: current, error: fetchError } = await this.supabase
            .from('planets')
            .select('*')
            .eq('id', planetId)
            .single()

        if (fetchError || !current) return false

        const updates: Record<string, number> = {}
        const multiplier = operation === 'add' ? 1 : -1

        for (const [shipKey, count] of Object.entries(ships)) {
            if (typeof count !== 'number') continue
            const currentCount = Number((current as Record<string, unknown>)[shipKey] || 0)
            const newCount = Math.max(0, currentCount + (count * multiplier))
            updates[shipKey] = newCount
        }

        const { error } = await this.supabase
            .from('planets')
            .update(updates)
            .eq('id', planetId)

        if (!error) {
            this.invalidatePlanet(planetId)
        }

        return !error
    }

    /**
     * Overwrite planet fleet (for battle losses)
     */
    static async setFleet(planetId: string, ships: Partial<ShipCounts>): Promise<boolean> {
        const updates: Record<string, number> = {}

        for (const [shipKey, count] of Object.entries(ships)) {
            if (typeof count === 'number') {
                updates[shipKey] = count
            }
        }

        const { error } = await this.supabase
            .from('planets')
            .update(updates)
            .eq('id', planetId)

        if (!error) {
            this.invalidatePlanet(planetId)
        }

        return !error
    }

    /**
     * Overwrite planet defense (for battle losses)
     */
    static async setDefense(planetId: string, defense: Record<string, number>): Promise<boolean> {
        const { error } = await this.supabase
            .from('planets')
            .update(defense)
            .eq('id', planetId)

        if (!error) {
            this.invalidatePlanet(planetId)
        }

        return !error
    }

    /**
     * Create or Update Debris Field
     */
    static async updateDebrisField(galaxy: number, system: number, position: number, metal: number, crystal: number): Promise<boolean> {
        if (metal <= 0 && crystal <= 0) return true

        const { data: existing, error: fetchError } = await this.supabase
            .from('debris_fields')
            .select('*')
            .eq('galaxy', galaxy)
            .eq('system', system)
            .eq('position', position)
            .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking debris field:', fetchError)
            return false
        }

        if (existing) {
            const { error } = await this.supabase
                .from('debris_fields')
                .update({
                    metal: existing.metal + metal,
                    crystal: existing.crystal + crystal,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
            return !error
        } else {
            const { error } = await this.supabase
                .from('debris_fields')
                .insert({
                    galaxy,
                    system,
                    position,
                    metal,
                    crystal
                })
            return !error
        }
    }

    // --- Cache Management ---

    /**
     * Invalidate all caches for a specific planet
     */
    private static invalidatePlanet(planetId: string): void {
        planetCache.invalidate(`id:${planetId}`)
        // Also clear coords cache since we don't know which coords this planet maps to
        coordsCache.clear()
    }

    /** Expose cache stats for monitoring */
    static getCacheStats() {
        return {
            byId: planetCache.stats(),
            byCoords: coordsCache.stats()
        }
    }
}
