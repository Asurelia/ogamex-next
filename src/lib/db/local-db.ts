/**
 * Local SQLite Database Service
 *
 * Singleton connection to local SQLite for high-frequency data:
 * - Combat logs (full timeline, round-by-round)
 * - Chat messages
 * - Activity logs
 *
 * This avoids hitting Supabase rate limits for frequent writes.
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { SCHEMA_VERSION, CREATE_TABLES_SQL, getMigrationSQL } from './local-db-schema'

// Types for our local tables
export interface LocalCombatLog {
  id: string
  battle_id: string
  attacker_id: string
  defender_id: string
  started_at: string
  ended_at?: string
  winner?: 'attacker' | 'defender' | 'draw'
  total_rounds: number
  timeline_events?: string // JSON
  attacker_losses_value: number
  defender_losses_value: number
  loot_metal: number
  loot_crystal: number
  loot_deuterium: number
  debris_metal: number
  debris_crystal: number
  moon_created: number
  created_at: string
}

export interface LocalCombatRound {
  id?: number
  battle_id: string
  round_number: number
  attacker_units: number
  defender_units: number
  attacker_damage: number
  defender_damage: number
  attacker_lost: number
  defender_lost: number
  events?: string // JSON
}

export interface LocalChatMessage {
  id?: number
  channel: string
  sender_id: string
  sender_name?: string
  content: string
  message_type: 'text' | 'system' | 'combat_link'
  metadata?: string // JSON
  created_at: string
}

export interface LocalActivityLog {
  id?: number
  user_id: string
  action_type: string
  target_type?: string
  target_id?: string
  details?: string // JSON
  created_at: string
}

/**
 * Local Database singleton
 */
class LocalDatabase {
  private static instance: LocalDatabase | null = null
  private db: Database.Database | null = null
  private dbPath: string

  private constructor() {
    // Store in project data folder
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    this.dbPath = path.join(dataDir, 'game.db')
  }

  static getInstance(): LocalDatabase {
    if (!LocalDatabase.instance) {
      LocalDatabase.instance = new LocalDatabase()
    }
    return LocalDatabase.instance
  }

  /**
   * Get the database connection, initializing if needed
   */
  getDb(): Database.Database {
    if (!this.db) {
      this.db = new Database(this.dbPath)
      this.db.pragma('journal_mode = WAL') // Better concurrent access
      this.db.pragma('synchronous = NORMAL') // Good balance of safety/speed
      this.initSchema()
    }
    return this.db
  }

  /**
   * Initialize schema and run migrations
   */
  private initSchema(): void {
    const db = this.db!

    // Check current version
    const versionTable = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='schema_version'
    `).get()

    let currentVersion = 0
    if (versionTable) {
      const row = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number } | undefined
      currentVersion = row?.version || 0
    }

    // Run migrations
    if (currentVersion < SCHEMA_VERSION) {
      if (currentVersion === 0) {
        // Fresh install
        db.exec(CREATE_TABLES_SQL)
        db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION)
      } else {
        // Upgrade
        const migrations = getMigrationSQL(currentVersion, SCHEMA_VERSION)
        for (const sql of migrations) {
          db.exec(sql)
        }
        db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION)
      }
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  // ==========================================================================
  // COMBAT LOGS
  // ==========================================================================

  /**
   * Create a new combat log entry
   */
  createCombatLog(log: Omit<LocalCombatLog, 'created_at'>): void {
    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT INTO combat_logs (
        id, battle_id, attacker_id, defender_id, started_at, ended_at, winner,
        total_rounds, timeline_events, attacker_losses_value, defender_losses_value,
        loot_metal, loot_crystal, loot_deuterium, debris_metal, debris_crystal, moon_created
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      log.id,
      log.battle_id,
      log.attacker_id,
      log.defender_id,
      log.started_at,
      log.ended_at || null,
      log.winner || null,
      log.total_rounds,
      log.timeline_events || null,
      log.attacker_losses_value,
      log.defender_losses_value,
      log.loot_metal,
      log.loot_crystal,
      log.loot_deuterium,
      log.debris_metal,
      log.debris_crystal,
      log.moon_created
    )
  }

  /**
   * Update combat log when battle ends
   */
  updateCombatLogResult(
    battleId: string,
    winner: 'attacker' | 'defender' | 'draw',
    totalRounds: number,
    timelineEvents: unknown[],
    losses: {
      attackerValue: number
      defenderValue: number
      loot: { metal: number; crystal: number; deuterium: number }
      debris: { metal: number; crystal: number }
      moonCreated: boolean
    }
  ): void {
    const db = this.getDb()
    const stmt = db.prepare(`
      UPDATE combat_logs SET
        ended_at = datetime('now'),
        winner = @winner,
        total_rounds = @total_rounds,
        timeline_events = @timeline_events,
        attacker_losses_value = @attacker_losses_value,
        defender_losses_value = @defender_losses_value,
        loot_metal = @loot_metal,
        loot_crystal = @loot_crystal,
        loot_deuterium = @loot_deuterium,
        debris_metal = @debris_metal,
        debris_crystal = @debris_crystal,
        moon_created = @moon_created
      WHERE battle_id = @battle_id
    `)
    stmt.run({
      battle_id: battleId,
      winner,
      total_rounds: totalRounds,
      timeline_events: JSON.stringify(timelineEvents),
      attacker_losses_value: losses.attackerValue,
      defender_losses_value: losses.defenderValue,
      loot_metal: losses.loot.metal,
      loot_crystal: losses.loot.crystal,
      loot_deuterium: losses.loot.deuterium,
      debris_metal: losses.debris.metal,
      debris_crystal: losses.debris.crystal,
      moon_created: losses.moonCreated ? 1 : 0,
    })
  }

  /**
   * Get combat log by battle ID
   */
  getCombatLog(battleId: string): LocalCombatLog | undefined {
    const db = this.getDb()
    return db.prepare('SELECT * FROM combat_logs WHERE battle_id = ?').get(battleId) as LocalCombatLog | undefined
  }

  /**
   * Get recent combat logs for a user
   */
  getUserCombatLogs(userId: string, limit = 50): LocalCombatLog[] {
    const db = this.getDb()
    return db.prepare(`
      SELECT * FROM combat_logs
      WHERE attacker_id = ? OR defender_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, userId, limit) as LocalCombatLog[]
  }

  // ==========================================================================
  // COMBAT ROUNDS
  // ==========================================================================

  /**
   * Insert a combat round
   */
  insertCombatRound(round: Omit<LocalCombatRound, 'id'>): void {
    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT INTO combat_rounds (
        battle_id, round_number, attacker_units, defender_units,
        attacker_damage, defender_damage, attacker_lost, defender_lost, events
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      round.battle_id,
      round.round_number,
      round.attacker_units,
      round.defender_units,
      round.attacker_damage,
      round.defender_damage,
      round.attacker_lost,
      round.defender_lost,
      round.events || null
    )
  }

  /**
   * Get all rounds for a battle
   */
  getCombatRounds(battleId: string): LocalCombatRound[] {
    const db = this.getDb()
    return db.prepare(`
      SELECT * FROM combat_rounds
      WHERE battle_id = ?
      ORDER BY round_number
    `).all(battleId) as LocalCombatRound[]
  }

  // ==========================================================================
  // CHAT MESSAGES
  // ==========================================================================

  /**
   * Insert a chat message
   */
  insertChatMessage(msg: Omit<LocalChatMessage, 'id' | 'created_at'>): number {
    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT INTO chat_messages (channel, sender_id, sender_name, content, message_type, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      msg.channel,
      msg.sender_id,
      msg.sender_name || null,
      msg.content,
      msg.message_type,
      msg.metadata || null
    )
    return result.lastInsertRowid as number
  }

  /**
   * Get recent messages for a channel
   */
  getChannelMessages(channel: string, limit = 100, beforeId?: number): LocalChatMessage[] {
    const db = this.getDb()
    if (beforeId) {
      return db.prepare(`
        SELECT * FROM chat_messages
        WHERE channel = ? AND id < ?
        ORDER BY id DESC
        LIMIT ?
      `).all(channel, beforeId, limit) as LocalChatMessage[]
    }
    return db.prepare(`
      SELECT * FROM chat_messages
      WHERE channel = ?
      ORDER BY id DESC
      LIMIT ?
    `).all(channel, limit) as LocalChatMessage[]
  }

  // ==========================================================================
  // ACTIVITY LOG
  // ==========================================================================

  /**
   * Log an activity
   */
  logActivity(log: Omit<LocalActivityLog, 'id' | 'created_at'>): void {
    const db = this.getDb()
    const stmt = db.prepare(`
      INSERT INTO activity_log (user_id, action_type, target_type, target_id, details)
      VALUES (?, ?, ?, ?, ?)
    `)
    stmt.run(
      log.user_id,
      log.action_type,
      log.target_type || null,
      log.target_id || null,
      log.details || null
    )
  }

  /**
   * Get user activity
   */
  getUserActivity(userId: string, limit = 100): LocalActivityLog[] {
    const db = this.getDb()
    return db.prepare(`
      SELECT * FROM activity_log
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit) as LocalActivityLog[]
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clean up old data (default: older than 30 days)
   */
  cleanup(daysToKeep = 30): { combatLogs: number; chatMessages: number; activityLogs: number } {
    const db = this.getDb()
    const cutoff = `datetime('now', '-${daysToKeep} days')`

    const combatResult = db.prepare(`
      DELETE FROM combat_logs WHERE created_at < ${cutoff}
    `).run()

    const chatResult = db.prepare(`
      DELETE FROM chat_messages WHERE created_at < ${cutoff}
    `).run()

    const activityResult = db.prepare(`
      DELETE FROM activity_log WHERE created_at < ${cutoff}
    `).run()

    // Also clean orphaned rounds
    db.prepare(`
      DELETE FROM combat_rounds
      WHERE battle_id NOT IN (SELECT battle_id FROM combat_logs)
    `).run()

    return {
      combatLogs: combatResult.changes,
      chatMessages: chatResult.changes,
      activityLogs: activityResult.changes,
    }
  }
}

// Export singleton getter
export function getLocalDb(): LocalDatabase {
  return LocalDatabase.getInstance()
}

// Export for testing
export { LocalDatabase }
