/**
 * ServiceCache<T> — Generic TTL + LRU in-memory cache
 * 
 * Designed for service-level caching of frequently-read data (planets, research, missions).
 * Bounds RAM via maxEntries with LRU eviction. Prevents stale data via TTL.
 * 
 * Usage:
 *   const cache = new ServiceCache<PlanetData>({ maxEntries: 50, ttlMs: 30_000 })
 *   cache.set('planet-123', planetData)
 *   const hit = cache.get('planet-123') // PlanetData | undefined
 *   cache.invalidate('planet-123')
 */

export interface ServiceCacheOptions {
    /** Maximum number of entries before LRU eviction (default: 50) */
    maxEntries?: number
    /** Time-to-live in milliseconds (default: 30000 = 30s) */
    ttlMs?: number
    /** Cache name for debug logging */
    name?: string
}

interface CacheEntry<T> {
    value: T
    expiresAt: number
    lastAccessed: number
}

export class ServiceCache<T> {
    private cache = new Map<string, CacheEntry<T>>()
    private readonly maxEntries: number
    private readonly ttlMs: number
    private readonly name: string

    // Stats
    private hits = 0
    private misses = 0

    constructor(options: ServiceCacheOptions = {}) {
        this.maxEntries = options.maxEntries ?? 50
        this.ttlMs = options.ttlMs ?? 30_000
        this.name = options.name ?? 'ServiceCache'
    }

    /**
     * Get a cached value by key. Returns undefined if not found or expired.
     */
    get(key: string): T | undefined {
        const entry = this.cache.get(key)

        if (!entry) {
            this.misses++
            return undefined
        }

        // Check TTL expiry
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key)
            this.misses++
            return undefined
        }

        // Update LRU timestamp
        entry.lastAccessed = Date.now()
        this.hits++
        return entry.value
    }

    /**
     * Set a value in the cache. Evicts LRU entry if at capacity.
     */
    set(key: string, value: T): void {
        // If already exists, update in-place
        if (this.cache.has(key)) {
            const entry = this.cache.get(key)!
            entry.value = value
            entry.expiresAt = Date.now() + this.ttlMs
            entry.lastAccessed = Date.now()
            return
        }

        // Evict LRU if at capacity
        if (this.cache.size >= this.maxEntries) {
            this.evictLRU()
        }

        this.cache.set(key, {
            value,
            expiresAt: Date.now() + this.ttlMs,
            lastAccessed: Date.now()
        })
    }

    /**
     * Invalidate a specific key.
     */
    invalidate(key: string): boolean {
        return this.cache.delete(key)
    }

    /**
     * Invalidate all keys matching a prefix (e.g., invalidateByPrefix('planet:') clears all planets).
     */
    invalidateByPrefix(prefix: string): number {
        let count = 0
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key)
                count++
            }
        }
        return count
    }

    /**
     * Clear all entries.
     */
    clear(): void {
        this.cache.clear()
    }

    /**
     * Get cache statistics.
     */
    stats(): { name: string; size: number; maxEntries: number; ttlMs: number; hits: number; misses: number; hitRate: string } {
        const total = this.hits + this.misses
        return {
            name: this.name,
            size: this.cache.size,
            maxEntries: this.maxEntries,
            ttlMs: this.ttlMs,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : 'N/A'
        }
    }

    /**
     * Reset statistics counters.
     */
    resetStats(): void {
        this.hits = 0
        this.misses = 0
    }

    /**
     * Evict expired entries (call periodically for cleanup).
     */
    evictExpired(): number {
        const now = Date.now()
        let count = 0
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key)
                count++
            }
        }
        return count
    }

    // --- Internal ---

    private evictLRU(): void {
        let oldestKey: string | null = null
        let oldestTime = Infinity

        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed
                oldestKey = key
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey)
        }
    }
}
