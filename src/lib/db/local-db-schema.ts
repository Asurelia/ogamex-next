/**
 * Local SQLite Database Schema
 *
 * High-frequency data stored locally to avoid Supabase limits:
 * - Combat logs (rounds, events, timeline)
 * - Chat messages
 * - Activity logs
 */

export const SCHEMA_VERSION = 1

export const CREATE_TABLES_SQL = `
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now'))
);

-- Combat logs: stores full battle data locally
CREATE TABLE IF NOT EXISTS combat_logs (
  id TEXT PRIMARY KEY,
  battle_id TEXT NOT NULL,
  attacker_id TEXT NOT NULL,
  defender_id TEXT NOT NULL,
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT,
  winner TEXT CHECK(winner IN ('attacker', 'defender', 'draw')),
  total_rounds INTEGER DEFAULT 0,
  -- Serialized JSON for full timeline
  timeline_events TEXT,
  -- Summary stats
  attacker_losses_value INTEGER DEFAULT 0,
  defender_losses_value INTEGER DEFAULT 0,
  loot_metal INTEGER DEFAULT 0,
  loot_crystal INTEGER DEFAULT 0,
  loot_deuterium INTEGER DEFAULT 0,
  debris_metal INTEGER DEFAULT 0,
  debris_crystal INTEGER DEFAULT 0,
  moon_created INTEGER DEFAULT 0,
  -- Indexes
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_combat_logs_battle_id ON combat_logs(battle_id);
CREATE INDEX IF NOT EXISTS idx_combat_logs_attacker ON combat_logs(attacker_id);
CREATE INDEX IF NOT EXISTS idx_combat_logs_defender ON combat_logs(defender_id);
CREATE INDEX IF NOT EXISTS idx_combat_logs_created ON combat_logs(created_at);

-- Combat round details (no FK for flexibility)
CREATE TABLE IF NOT EXISTS combat_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  battle_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  attacker_units INTEGER,
  defender_units INTEGER,
  attacker_damage INTEGER,
  defender_damage INTEGER,
  attacker_lost INTEGER,
  defender_lost INTEGER,
  events TEXT -- JSON array of events this round
);

CREATE INDEX IF NOT EXISTS idx_combat_rounds_battle ON combat_rounds(battle_id);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL, -- 'global', 'alliance:123', 'private:user1:user2'
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'system', 'combat_link'
  metadata TEXT, -- JSON for links, attachments
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_channel ON chat_messages(channel);
CREATE INDEX IF NOT EXISTS idx_chat_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages(created_at);

-- Activity log for player actions
CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'fleet_sent', 'building_started', 'research_started', 'combat', etc.
  target_type TEXT, -- 'planet', 'fleet', 'research', etc.
  target_id TEXT,
  details TEXT, -- JSON with action-specific data
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);

-- Cleanup old data (keep 30 days by default)
-- This is a placeholder - actual cleanup done in code
`

export const MIGRATIONS: Record<number, string> = {
  1: CREATE_TABLES_SQL,
}

/**
 * Get migration SQL for upgrading from one version to another
 */
export function getMigrationSQL(fromVersion: number, toVersion: number): string[] {
  const sqls: string[] = []
  for (let v = fromVersion + 1; v <= toVersion; v++) {
    if (MIGRATIONS[v]) {
      sqls.push(MIGRATIONS[v])
    }
  }
  return sqls
}
