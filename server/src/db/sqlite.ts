/**
 * SQLite Database — Local Persistence + Ephemeral Logs
 *
 * All gameplay state is persisted here (ships, wallets, corps, clones,
 * industry, PI, contracts, sovereignty, scanning, wormholes, economy).
 * Supabase is used only for auth and static bootstrap data.
 *
 * WAL mode for concurrent reads. Synchronous better-sqlite3 for speed.
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
    -- =======================================================================
    -- EPHEMERAL LOGS (rotated daily)
    -- =======================================================================

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

    -- =======================================================================
    -- PLAYERS
    -- =======================================================================

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      email TEXT,
      username TEXT,
      balance REAL NOT NULL DEFAULT 5000,
      lifetime_earnings REAL NOT NULL DEFAULT 0,
      lifetime_spending REAL NOT NULL DEFAULT 0,
      corp_id TEXT,
      medical_clone_station_id TEXT,
      charisma INTEGER NOT NULL DEFAULT 20,
      intelligence INTEGER NOT NULL DEFAULT 20,
      memory INTEGER NOT NULL DEFAULT 20,
      perception INTEGER NOT NULL DEFAULT 20,
      willpower INTEGER NOT NULL DEFAULT 20,
      charisma_bonus INTEGER NOT NULL DEFAULT 0,
      intelligence_bonus INTEGER NOT NULL DEFAULT 0,
      memory_bonus INTEGER NOT NULL DEFAULT 0,
      perception_bonus INTEGER NOT NULL DEFAULT 0,
      willpower_bonus INTEGER NOT NULL DEFAULT 0,
      last_activity INTEGER DEFAULT (unixepoch()),
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- =======================================================================
    -- SHIPS
    -- =======================================================================

    CREATE TABLE IF NOT EXISTS ships (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      owner_id TEXT NOT NULL,
      ship_type_id TEXT NOT NULL DEFAULT 'caldari_frigate',
      system_id TEXT NOT NULL,
      position_x REAL NOT NULL DEFAULT 0,
      position_y REAL NOT NULL DEFAULT 0,
      position_z REAL NOT NULL DEFAULT 0,
      current_hp REAL NOT NULL DEFAULT 500,
      current_shield REAL NOT NULL DEFAULT 500,
      current_armor REAL NOT NULL DEFAULT 500,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_docked INTEGER NOT NULL DEFAULT 0,
      fitting TEXT DEFAULT '[]',
      cargo TEXT DEFAULT '[]',
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_ships_owner ON ships(owner_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_ships_system ON ships(system_id, is_docked);

    -- =======================================================================
    -- SKILLS
    -- =======================================================================

    CREATE TABLE IF NOT EXISTS character_skills (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      character_id TEXT NOT NULL,
      skill_type_id INTEGER NOT NULL,
      skill_points INTEGER NOT NULL DEFAULT 0,
      current_level INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(character_id, skill_type_id)
    );

    CREATE INDEX IF NOT EXISTS idx_charskills_char ON character_skills(character_id);

    CREATE TABLE IF NOT EXISTS skill_queue (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      character_id TEXT NOT NULL,
      skill_type_id INTEGER NOT NULL,
      target_level INTEGER NOT NULL,
      queue_position INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      completed_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_skillqueue_char_active ON skill_queue(character_id, is_active, queue_position);

    -- =======================================================================
    -- WALLET
    -- =======================================================================

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      transaction_type TEXT NOT NULL,
      description TEXT DEFAULT '',
      reference_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id, created_at);

    -- =======================================================================
    -- CORPORATIONS
    -- =======================================================================

    CREATE TABLE IF NOT EXISTS corporations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL UNIQUE,
      ticker TEXT NOT NULL UNIQUE,
      ceo_id TEXT NOT NULL,
      member_count INTEGER NOT NULL DEFAULT 1,
      tax_rate REAL NOT NULL DEFAULT 0.05,
      is_recruiting INTEGER NOT NULL DEFAULT 0,
      description TEXT DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS corp_members (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      corp_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(corp_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_corpmembers_corp ON corp_members(corp_id);
    CREATE INDEX IF NOT EXISTS idx_corpmembers_user ON corp_members(user_id);

    CREATE TABLE IF NOT EXISTS corp_applications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      corp_id TEXT NOT NULL,
      applicant_id TEXT NOT NULL,
      message TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_corpapps_corp_status ON corp_applications(corp_id, status);

    CREATE TABLE IF NOT EXISTS corp_wallet (
      corp_id TEXT NOT NULL,
      division INTEGER NOT NULL DEFAULT 1,
      balance REAL NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY(corp_id, division)
    );

    CREATE TABLE IF NOT EXISTS corp_wallet_journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corp_id TEXT NOT NULL,
      division INTEGER NOT NULL DEFAULT 1,
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      ref_type TEXT NOT NULL,
      description TEXT DEFAULT '',
      actor_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_corpjournal_corp ON corp_wallet_journal(corp_id, division, created_at);

    -- =======================================================================
    -- CLONES & IMPLANTS
    -- =======================================================================

    CREATE TABLE IF NOT EXISTS clones (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      owner_id TEXT NOT NULL,
      clone_type TEXT NOT NULL DEFAULT 'jump',
      station_id TEXT NOT NULL,
      clone_name TEXT DEFAULT 'Jump Clone',
      is_active INTEGER NOT NULL DEFAULT 0,
      jump_cooldown_until INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_clones_owner ON clones(owner_id);

    CREATE TABLE IF NOT EXISTS clone_implants (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      clone_id TEXT NOT NULL,
      implant_type_id TEXT NOT NULL,
      slot INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(clone_id, slot)
    );

    CREATE INDEX IF NOT EXISTS idx_cloneimplants_clone ON clone_implants(clone_id);

    -- =======================================================================
    -- INDUSTRY
    -- =======================================================================

    CREATE TABLE IF NOT EXISTS blueprints (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      owner_id TEXT NOT NULL,
      item_type_id TEXT NOT NULL,
      is_original INTEGER NOT NULL DEFAULT 1,
      runs_remaining INTEGER NOT NULL DEFAULT -1,
      material_efficiency INTEGER NOT NULL DEFAULT 0,
      time_efficiency INTEGER NOT NULL DEFAULT 0,
      tech_level INTEGER NOT NULL DEFAULT 1,
      location_type TEXT NOT NULL DEFAULT 'station_hangar',
      location_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_blueprints_owner ON blueprints(owner_id);

    CREATE TABLE IF NOT EXISTS industry_jobs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      owner_id TEXT NOT NULL,
      station_id TEXT NOT NULL,
      blueprint_id TEXT NOT NULL,
      activity TEXT NOT NULL,
      output_item_type_id TEXT,
      output_quantity INTEGER NOT NULL DEFAULT 1,
      duration_seconds INTEGER NOT NULL,
      started_at INTEGER NOT NULL DEFAULT (unixepoch()),
      ends_at INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      outcome TEXT,
      success_probability REAL NOT NULL DEFAULT 1.0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_industryjobs_owner ON industry_jobs(owner_id);
    CREATE INDEX IF NOT EXISTS idx_industryjobs_pending ON industry_jobs(completed, ends_at);

    -- =======================================================================
    -- PLANETARY INTERACTION
    -- =======================================================================

    CREATE TABLE IF NOT EXISTS colonies (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      owner_id TEXT NOT NULL,
      planet_id TEXT NOT NULL,
      system_id TEXT NOT NULL,
      planet_type TEXT NOT NULL DEFAULT 'temperate',
      command_center_level INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(owner_id, planet_id)
    );

    CREATE INDEX IF NOT EXISTS idx_colonies_owner ON colonies(owner_id);

    CREATE TABLE IF NOT EXISTS colony_buildings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      colony_id TEXT NOT NULL,
      building_type TEXT NOT NULL,
      position_x REAL NOT NULL DEFAULT 0,
      position_y REAL NOT NULL DEFAULT 0,
      resource_type TEXT,
      schematic_id TEXT,
      cycle_time_seconds INTEGER NOT NULL DEFAULT 1800,
      last_cycle_at INTEGER NOT NULL DEFAULT (unixepoch()),
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_colbuildings_colony ON colony_buildings(colony_id);

    CREATE TABLE IF NOT EXISTS colony_routes (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      colony_id TEXT NOT NULL,
      source_building_id TEXT NOT NULL,
      destination_building_id TEXT NOT NULL,
      item_type_id TEXT NOT NULL,
      quantity_per_cycle INTEGER NOT NULL DEFAULT 100
    );

    CREATE INDEX IF NOT EXISTS idx_colroutes_colony ON colony_routes(colony_id);

    CREATE TABLE IF NOT EXISTS colony_storage (
      building_id TEXT NOT NULL,
      item_type_id TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      PRIMARY KEY(building_id, item_type_id)
    );

    -- =======================================================================
    -- CONTRACTS
    -- =======================================================================

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      issuer_id TEXT NOT NULL,
      assignee_id TEXT,
      contract_type TEXT NOT NULL DEFAULT 'item_exchange',
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      reward REAL NOT NULL DEFAULT 0,
      collateral REAL NOT NULL DEFAULT 0,
      buyout_price REAL,
      current_bid REAL NOT NULL DEFAULT 0,
      current_bidder_id TEXT,
      start_station_id TEXT NOT NULL,
      end_station_id TEXT,
      volume REAL NOT NULL DEFAULT 0,
      days_to_complete INTEGER NOT NULL DEFAULT 7,
      status TEXT NOT NULL DEFAULT 'outstanding',
      accepted_at INTEGER,
      completed_at INTEGER,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_contracts_issuer ON contracts(issuer_id);

    CREATE TABLE IF NOT EXISTS contract_items (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      contract_id TEXT NOT NULL,
      item_type_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      is_issuer_item INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_contractitems_contract ON contract_items(contract_id);

    CREATE TABLE IF NOT EXISTS contract_bids (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      contract_id TEXT NOT NULL,
      bidder_id TEXT NOT NULL,
      bid_amount REAL NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_contractbids_contract ON contract_bids(contract_id);

    -- =======================================================================
    -- SOVEREIGNTY
    -- =======================================================================

    CREATE TABLE IF NOT EXISTS sovereignty (
      system_id TEXT PRIMARY KEY,
      owner_corp_id TEXT NOT NULL,
      sovereignty_level INTEGER NOT NULL DEFAULT 1,
      military_index REAL NOT NULL DEFAULT 0,
      industrial_index REAL NOT NULL DEFAULT 0,
      strategic_index REAL NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS sovereignty_structures (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      system_id TEXT NOT NULL,
      owner_corp_id TEXT NOT NULL,
      structure_type TEXT NOT NULL,
      hp REAL NOT NULL DEFAULT 10000,
      hp_max REAL NOT NULL DEFAULT 10000,
      state TEXT NOT NULL DEFAULT 'anchoring',
      reinforced_until INTEGER,
      vulnerability_start_hour INTEGER NOT NULL DEFAULT 18,
      vulnerability_duration_hours INTEGER NOT NULL DEFAULT 4,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_sovstruct_system ON sovereignty_structures(system_id);
    CREATE INDEX IF NOT EXISTS idx_sovstruct_state ON sovereignty_structures(state);

    -- =======================================================================
    -- INVENTORY
    -- =======================================================================

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      owner_id TEXT NOT NULL,
      owner_type TEXT NOT NULL DEFAULT 'character',
      location_type TEXT NOT NULL,
      location_id TEXT NOT NULL,
      item_type_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      hangar_division INTEGER NOT NULL DEFAULT 1,
      is_assembled INTEGER NOT NULL DEFAULT 0,
      meta_data TEXT DEFAULT '{}',
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_owner_loc ON inventory(owner_id, location_type, location_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_stack ON inventory(owner_id, location_type, location_id, item_type_id, hangar_division);

    -- =======================================================================
    -- MARKET / ECONOMY
    -- =======================================================================

    CREATE TABLE IF NOT EXISTS market_orders (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      station_id TEXT NOT NULL,
      item_type_id TEXT NOT NULL,
      is_buy_order INTEGER NOT NULL,
      price REAL NOT NULL,
      volume_remaining INTEGER NOT NULL,
      volume_total INTEGER NOT NULL,
      character_id TEXT,
      min_volume INTEGER NOT NULL DEFAULT 1,
      issued_at INTEGER NOT NULL DEFAULT (unixepoch()),
      expires_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_marketorders_station_item ON market_orders(station_id, item_type_id, is_buy_order);

    CREATE TABLE IF NOT EXISTS trade_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buy_order_id TEXT,
      sell_order_id TEXT,
      item_type_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      station_id TEXT NOT NULL,
      executed_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_tradehistory_item_station ON trade_history(item_type_id, station_id, executed_at);

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type_id TEXT NOT NULL,
      station_id TEXT NOT NULL,
      average_price REAL NOT NULL,
      lowest_price REAL NOT NULL,
      highest_price REAL NOT NULL,
      volume INTEGER NOT NULL,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_pricehistory_item ON price_history(item_type_id, station_id, timestamp);

    -- =======================================================================
    -- WORMHOLES
    -- =======================================================================

    CREATE TABLE IF NOT EXISTS wormhole_systems (
      system_id TEXT PRIMARY KEY,
      wh_class INTEGER NOT NULL DEFAULT 1,
      effect TEXT,
      static_connection_type TEXT
    );

    CREATE TABLE IF NOT EXISTS wormhole_connections (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      connection_id TEXT,
      wh_type TEXT NOT NULL,
      mass_remaining REAL NOT NULL,
      mass_total REAL NOT NULL,
      max_mass_per_jump REAL NOT NULL,
      stage TEXT NOT NULL DEFAULT 'fresh',
      time_remaining_hours REAL NOT NULL DEFAULT 24,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dynamic_connections (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      system_a_id TEXT NOT NULL,
      system_b_id TEXT NOT NULL,
      connection_type TEXT NOT NULL DEFAULT 'wormhole',
      is_stable INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_dynconn_systems ON dynamic_connections(system_a_id, system_b_id);

    -- =======================================================================
    -- SCANNING
    -- =======================================================================

    CREATE TABLE IF NOT EXISTS scan_probes (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      owner_id TEXT NOT NULL,
      system_id TEXT NOT NULL,
      position_x REAL NOT NULL,
      position_y REAL NOT NULL,
      position_z REAL NOT NULL,
      scan_radius REAL NOT NULL DEFAULT 8,
      probe_type TEXT NOT NULL DEFAULT 'core',
      expires_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_scanprobes_owner ON scan_probes(owner_id, system_id);

    CREATE TABLE IF NOT EXISTS scan_results (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      system_id TEXT NOT NULL,
      scanner_id TEXT NOT NULL,
      signature_id TEXT NOT NULL,
      signature_type TEXT NOT NULL,
      scan_strength REAL NOT NULL DEFAULT 0,
      resolved INTEGER NOT NULL DEFAULT 0,
      position_x REAL,
      position_y REAL,
      position_z REAL
    );

    CREATE INDEX IF NOT EXISTS idx_scanresults_system_scanner ON scan_results(system_id, scanner_id);

    -- =======================================================================
    -- STATIC DATA CACHE (loaded from Supabase at startup)
    -- =======================================================================

    CREATE TABLE IF NOT EXISTS planet_resources (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      planet_id TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      abundance REAL NOT NULL DEFAULT 0.5,
      UNIQUE(planet_id, resource_type)
    );

    CREATE TABLE IF NOT EXISTS cached_skill_definitions (
      type_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      rank INTEGER NOT NULL DEFAULT 1,
      primary_attribute INTEGER NOT NULL,
      secondary_attribute INTEGER NOT NULL,
      description TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS cached_implant_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slot INTEGER NOT NULL,
      attribute TEXT,
      bonus REAL NOT NULL DEFAULT 0,
      description TEXT DEFAULT ''
    );
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
 * Uses prepared statements instead of string interpolation for safety and performance.
 */
let _rotateStmts: { chat: Database.Statement; combat: Database.Statement; mining: Database.Statement } | null = null

export function rotateLogs() {
  const database = getSQLite()
  if (!_rotateStmts) {
    _rotateStmts = {
      chat: database.prepare('DELETE FROM chat_logs WHERE timestamp < ?'),
      combat: database.prepare('DELETE FROM combat_logs WHERE timestamp < ?'),
      mining: database.prepare('DELETE FROM mining_logs WHERE timestamp < ?'),
    }
  }
  const cutoff = Math.floor(Date.now() / 1000) - 86400 // 24h ago
  const tx = database.transaction(() => {
    _rotateStmts!.chat.run(cutoff)
    _rotateStmts!.combat.run(cutoff)
    _rotateStmts!.mining.run(cutoff)
  })
  tx()

  console.log('[SQLite] Log rotation complete')
}
