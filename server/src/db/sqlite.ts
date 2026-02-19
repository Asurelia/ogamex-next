/**
 * SQLite Database for Ephemeral Data
 *
 * High-frequency writes: chat logs, combat logs, temporary state.
 * Rotated daily. WAL mode for concurrent reads.
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { CONFIG } from '../config'

let db: Database.Database | null = null

/**
 * Initialize SQLite database
 */
export function initSQLite(): Database.Database {
  const dbPath = path.resolve(CONFIG.SQLITE_PATH)
  const dir = path.dirname(dbPath)

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  db = new Database(dbPath)

  // Enable WAL mode for concurrent reads
  if (CONFIG.SQLITE_WAL_MODE) {
    db.pragma('journal_mode = WAL')
  }

  // Performance pragmas
  db.pragma('synchronous = NORMAL')
  db.pragma('cache_size = -64000') // 64MB cache

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      system_id TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'local',
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS combat_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      system_id TEXT NOT NULL,
      attacker_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      damage_shield REAL DEFAULT 0,
      damage_armor REAL DEFAULT 0,
      damage_hull REAL DEFAULT 0,
      damage_type TEXT DEFAULT 'ballistic',
      is_critical INTEGER DEFAULT 0,
      is_kill INTEGER DEFAULT 0,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS mining_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      system_id TEXT NOT NULL,
      miner_id TEXT NOT NULL,
      asteroid_id TEXT NOT NULL,
      ore_type TEXT NOT NULL,
      amount REAL NOT NULL,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_chat_system_time ON chat_logs(system_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_combat_system_time ON combat_logs(system_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_mining_miner_time ON mining_logs(miner_id, timestamp);
  `)

  console.log(`[SQLite] Initialized at ${dbPath}`)
  return db
}

/**
 * Get the SQLite database instance
 */
export function getSQLite(): Database.Database {
  if (!db) {
    throw new Error('SQLite not initialized. Call initSQLite() first.')
  }
  return db
}

// ============================================================================
// PREPARED STATEMENTS (lazy-initialized)
// ============================================================================

let insertChatStmt: Database.Statement | null = null
let insertCombatStmt: Database.Statement | null = null
let insertMiningStmt: Database.Statement | null = null

export function logChat(systemId: string, channel: string, senderId: string, senderName: string, content: string) {
  const database = getSQLite()
  if (!insertChatStmt) {
    insertChatStmt = database.prepare(
      'INSERT INTO chat_logs (system_id, channel, sender_id, sender_name, content) VALUES (?, ?, ?, ?, ?)'
    )
  }
  insertChatStmt.run(systemId, channel, senderId, senderName, content)
}

export function logCombat(
  systemId: string,
  attackerId: string,
  targetId: string,
  damageShield: number,
  damageArmor: number,
  damageHull: number,
  damageType: string,
  isCritical: boolean,
  isKill: boolean
) {
  const database = getSQLite()
  if (!insertCombatStmt) {
    insertCombatStmt = database.prepare(
      'INSERT INTO combat_logs (system_id, attacker_id, target_id, damage_shield, damage_armor, damage_hull, damage_type, is_critical, is_kill) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
  }
  insertCombatStmt.run(systemId, attackerId, targetId, damageShield, damageArmor, damageHull, damageType, isCritical ? 1 : 0, isKill ? 1 : 0)
}

export function logMining(systemId: string, minerId: string, asteroidId: string, oreType: string, amount: number) {
  const database = getSQLite()
  if (!insertMiningStmt) {
    insertMiningStmt = database.prepare(
      'INSERT INTO mining_logs (system_id, miner_id, asteroid_id, ore_type, amount) VALUES (?, ?, ?, ?, ?)'
    )
  }
  insertMiningStmt.run(systemId, minerId, asteroidId, oreType, amount)
}

/**
 * Rotate old logs (delete entries older than 24h)
 */
export function rotateLogs() {
  const database = getSQLite()
  const cutoff = Math.floor(Date.now() / 1000) - 86400 // 24h ago

  database.exec(`
    DELETE FROM chat_logs WHERE timestamp < ${cutoff};
    DELETE FROM combat_logs WHERE timestamp < ${cutoff};
    DELETE FROM mining_logs WHERE timestamp < ${cutoff};
  `)

  console.log('[SQLite] Log rotation complete')
}
