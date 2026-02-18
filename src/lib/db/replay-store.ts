/**
 * IndexedDB Replay Store
 *
 * Client-side storage for combat replays using IndexedDB.
 * Allows players to re-watch battles with full animation.
 * Auto-cleanup of replays older than 30 days.
 */

import type { BattleTimelineEvent } from '@/lib/battle/AdvancedBattleEngine'

const DB_NAME = 'ogamex-replays'
const DB_VERSION = 1
const STORE_NAME = 'combat_replays'
const MAX_AGE_DAYS = 30

export interface StoredReplay {
  battleId: string
  attackerId: string
  defenderId: string
  winner: 'attacker' | 'defender' | 'draw'
  totalRounds: number
  timeline: BattleTimelineEvent[]
  // Summary for listing
  attackerLosses: number
  defenderLosses: number
  loot: { metal: number; crystal: number; deuterium: number }
  debris: { metal: number; crystal: number }
  moonCreated: boolean
  // Metadata
  createdAt: number // timestamp
  coordinates: string // "1:234:5"
}

/**
 * Open the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'battleId' })
        store.createIndex('attackerId', 'attackerId', { unique: false })
        store.createIndex('defenderId', 'defenderId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
  })
}

/**
 * Replay Store singleton
 */
class ReplayStore {
  private static instance: ReplayStore | null = null
  private dbPromise: Promise<IDBDatabase> | null = null

  private constructor() {}

  static getInstance(): ReplayStore {
    if (!ReplayStore.instance) {
      ReplayStore.instance = new ReplayStore()
    }
    return ReplayStore.instance
  }

  private async getDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDatabase()
    }
    return this.dbPromise
  }

  /**
   * Save a replay
   */
  async saveReplay(replay: StoredReplay): Promise<void> {
    const db = await this.getDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(replay)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Get a replay by battle ID
   */
  async getReplay(battleId: string): Promise<StoredReplay | undefined> {
    const db = await this.getDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(battleId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  /**
   * Get all replays for a user (as attacker or defender)
   */
  async getUserReplays(userId: string, limit = 50): Promise<StoredReplay[]> {
    const db = await this.getDb()
    const replays: StoredReplay[] = []

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)

      // We need to scan all and filter since we need OR condition
      const request = store.openCursor()

      request.onerror = () => reject(request.error)
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor && replays.length < limit) {
          const replay = cursor.value as StoredReplay
          if (replay.attackerId === userId || replay.defenderId === userId) {
            replays.push(replay)
          }
          cursor.continue()
        } else {
          // Sort by createdAt descending
          replays.sort((a, b) => b.createdAt - a.createdAt)
          resolve(replays.slice(0, limit))
        }
      }
    })
  }

  /**
   * Get recent replays
   */
  async getRecentReplays(limit = 20): Promise<StoredReplay[]> {
    const db = await this.getDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const index = store.index('createdAt')
      const replays: StoredReplay[] = []

      // Open cursor in reverse order (newest first)
      const request = index.openCursor(null, 'prev')

      request.onerror = () => reject(request.error)
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor && replays.length < limit) {
          replays.push(cursor.value)
          cursor.continue()
        } else {
          resolve(replays)
        }
      }
    })
  }

  /**
   * Delete a replay
   */
  async deleteReplay(battleId: string): Promise<void> {
    const db = await this.getDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(battleId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Clean up old replays (older than MAX_AGE_DAYS)
   */
  async cleanup(): Promise<number> {
    const db = await this.getDb()
    const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000
    let deleted = 0

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const index = store.index('createdAt')

      // Get all old entries
      const range = IDBKeyRange.upperBound(cutoff)
      const request = index.openCursor(range)

      request.onerror = () => reject(request.error)
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          deleted++
          cursor.continue()
        } else {
          resolve(deleted)
        }
      }
    })
  }

  /**
   * Get storage usage estimate
   */
  async getStorageInfo(): Promise<{ count: number; estimatedSizeKB: number }> {
    const db = await this.getDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const countRequest = store.count()

      countRequest.onerror = () => reject(countRequest.error)
      countRequest.onsuccess = () => {
        const count = countRequest.result
        // Rough estimate: average replay ~50KB
        resolve({
          count,
          estimatedSizeKB: count * 50,
        })
      }
    })
  }

  /**
   * Clear all replays
   */
  async clearAll(): Promise<void> {
    const db = await this.getDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }
}

// Export singleton getter
export function getReplayStore(): ReplayStore {
  return ReplayStore.getInstance()
}

// Export for direct use
export { ReplayStore }
