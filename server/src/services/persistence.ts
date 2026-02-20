/**
 * Persistence Service — Synchronous SQLite CRUD
 *
 * All gameplay state reads/writes go through here.
 * Uses better-sqlite3 sync API with prepared statements + transactions.
 * Replaces all previous Supabase gameplay queries.
 */

import { getSQLite } from '../db/sqlite'
import { getShipTypeOrDefault } from '@shared/data/ship-type-lookup'
import type Database from 'better-sqlite3'

// ============================================================================
// LAZY PREPARED STATEMENTS
// ============================================================================

let _stmts: Record<string, Database.Statement> | null = null

function stmts() {
  if (_stmts) return _stmts
  const db = getSQLite()
  _stmts = {
    // Players
    getPlayer: db.prepare('SELECT * FROM players WHERE id = ?'),
    upsertPlayer: db.prepare(`
      INSERT INTO players (id, email, username) VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET last_activity = unixepoch()
    `),
    updatePlayerCorpId: db.prepare('UPDATE players SET corp_id = ? WHERE id = ?'),
    updatePlayerMedClone: db.prepare('UPDATE players SET medical_clone_station_id = ? WHERE id = ?'),
    getPlayerBalance: db.prepare('SELECT balance FROM players WHERE id = ?'),
    creditPlayer: db.prepare('UPDATE players SET balance = balance + ?, lifetime_earnings = lifetime_earnings + ? WHERE id = ?'),
    debitPlayer: db.prepare('UPDATE players SET balance = balance - ?, lifetime_spending = lifetime_spending + ? WHERE id = ?'),
    getPlayerAttributes: db.prepare('SELECT charisma, intelligence, memory, perception, willpower, charisma_bonus, intelligence_bonus, memory_bonus, perception_bonus, willpower_bonus FROM players WHERE id = ?'),

    // Ships
    getActiveShip: db.prepare('SELECT * FROM ships WHERE owner_id = ? AND is_active = 1 LIMIT 1'),
    insertShip: db.prepare(`
      INSERT INTO ships (id, owner_id, ship_type_id, system_id, position_x, position_y, position_z, current_hp, current_shield, current_armor, is_active, is_docked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
    `),
    saveShip: db.prepare(`
      UPDATE ships SET system_id=?, position_x=?, position_y=?, position_z=?, current_hp=?, current_shield=?, current_armor=?, is_docked=?, updated_at=unixepoch()
      WHERE id=?
    `),
    getShipsInSystem: db.prepare('SELECT * FROM ships WHERE system_id = ? AND is_docked = 0'),

    // Wallet transactions
    insertWalletTx: db.prepare(`
      INSERT INTO wallet_transactions (user_id, amount, balance_after, transaction_type, description, reference_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `),

    // Corps
    insertCorp: db.prepare(`
      INSERT INTO corporations (id, name, ticker, ceo_id) VALUES (?, ?, ?, ?)
    `),
    getCorp: db.prepare('SELECT * FROM corporations WHERE id = ?'),
    updateCorpTax: db.prepare('UPDATE corporations SET tax_rate = ? WHERE id = ?'),
    updateCorpRecruiting: db.prepare('UPDATE corporations SET is_recruiting = ? WHERE id = ?'),
    updateCorpCeo: db.prepare('UPDATE corporations SET ceo_id = ? WHERE id = ?'),
    updateCorpMemberCount: db.prepare('UPDATE corporations SET member_count = ? WHERE id = ?'),
    getCorpMemberCount: db.prepare('SELECT member_count FROM corporations WHERE id = ?'),

    // Corp members
    insertCorpMember: db.prepare('INSERT INTO corp_members (id, corp_id, user_id, role) VALUES (?, ?, ?, ?)'),
    getCorpMember: db.prepare('SELECT * FROM corp_members WHERE corp_id = ? AND user_id = ?'),
    getCorpMembers: db.prepare('SELECT cm.*, p.username, p.email, p.last_activity FROM corp_members cm LEFT JOIN players p ON p.id = cm.user_id WHERE cm.corp_id = ?'),
    updateCorpMemberRole: db.prepare('UPDATE corp_members SET role = ? WHERE corp_id = ? AND user_id = ?'),
    deleteCorpMember: db.prepare('DELETE FROM corp_members WHERE corp_id = ? AND user_id = ?'),

    // Corp applications
    insertCorpApp: db.prepare('INSERT INTO corp_applications (id, corp_id, applicant_id, message) VALUES (?, ?, ?, ?)'),
    getCorpApp: db.prepare('SELECT * FROM corp_applications WHERE id = ?'),
    getCorpPendingApps: db.prepare(`SELECT ca.*, p.username, p.email FROM corp_applications ca LEFT JOIN players p ON p.id = ca.applicant_id WHERE ca.corp_id = ? AND ca.status = 'pending'`),
    updateCorpAppStatus: db.prepare('UPDATE corp_applications SET status = ?, reviewed_by = ? WHERE id = ?'),

    // Corp wallet
    upsertCorpWallet: db.prepare(`
      INSERT INTO corp_wallet (corp_id, division, balance) VALUES (?, ?, ?)
      ON CONFLICT(corp_id, division) DO UPDATE SET balance = ?, updated_at = unixepoch()
    `),
    getCorpBalance: db.prepare('SELECT balance FROM corp_wallet WHERE corp_id = ? AND division = ?'),
    updateCorpBalance: db.prepare('UPDATE corp_wallet SET balance = ?, updated_at = unixepoch() WHERE corp_id = ? AND division = ?'),
    insertCorpJournal: db.prepare(`
      INSERT INTO corp_wallet_journal (corp_id, division, amount, balance_after, ref_type, description, actor_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `),

    // Clones
    insertClone: db.prepare('INSERT INTO clones (id, owner_id, clone_type, station_id, clone_name) VALUES (?, ?, ?, ?, ?)'),
    getClone: db.prepare('SELECT * FROM clones WHERE id = ? AND owner_id = ?'),
    countJumpClones: db.prepare(`SELECT COUNT(*) as cnt FROM clones WHERE owner_id = ? AND clone_type = 'jump'`),
    getActiveClone: db.prepare('SELECT * FROM clones WHERE owner_id = ? AND is_active = 1 LIMIT 1'),
    getAllClones: db.prepare('SELECT * FROM clones WHERE owner_id = ?'),
    deactivateClones: db.prepare('UPDATE clones SET is_active = 0 WHERE owner_id = ? AND is_active = 1'),
    activateClone: db.prepare('UPDATE clones SET is_active = 1, jump_cooldown_until = ? WHERE id = ?'),
    deleteClone: db.prepare('DELETE FROM clones WHERE id = ? AND owner_id = ?'),

    // Implants
    insertImplant: db.prepare('INSERT OR REPLACE INTO clone_implants (id, clone_id, implant_type_id, slot) VALUES (?, ?, ?, ?)'),
    deleteImplant: db.prepare('DELETE FROM clone_implants WHERE clone_id = ? AND slot = ?'),
    getImplantsForClone: db.prepare('SELECT * FROM clone_implants WHERE clone_id = ?'),

    // Blueprints
    getBlueprint: db.prepare('SELECT * FROM blueprints WHERE id = ? AND owner_id = ?'),
    insertBlueprint: db.prepare(`
      INSERT INTO blueprints (id, owner_id, item_type_id, is_original, runs_remaining, material_efficiency, time_efficiency, tech_level, location_type, location_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateBlueprintRuns: db.prepare('UPDATE blueprints SET runs_remaining = ? WHERE id = ?'),
    updateBlueprintME: db.prepare('UPDATE blueprints SET material_efficiency = ? WHERE id = ?'),
    updateBlueprintTE: db.prepare('UPDATE blueprints SET time_efficiency = ? WHERE id = ?'),
    deleteBlueprint: db.prepare('DELETE FROM blueprints WHERE id = ?'),

    // Industry jobs
    insertIndustryJob: db.prepare(`
      INSERT INTO industry_jobs (id, owner_id, station_id, blueprint_id, activity, output_item_type_id, output_quantity, duration_seconds, started_at, ends_at, success_probability)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    getPendingJobs: db.prepare('SELECT * FROM industry_jobs WHERE completed = 0 AND ends_at <= ?'),
    completeJob: db.prepare('UPDATE industry_jobs SET completed = 1, outcome = ? WHERE id = ?'),

    // Colonies
    getColonyBuildings: db.prepare(`
      SELECT cb.*, c.owner_id FROM colony_buildings cb
      JOIN colonies c ON c.id = cb.colony_id
      WHERE cb.building_type NOT IN ('command_center','storage','launchpad')
    `),
    updateBuildingCycle: db.prepare('UPDATE colony_buildings SET last_cycle_at = ? WHERE id = ?'),

    // Colony storage
    getColonyStorage: db.prepare('SELECT quantity FROM colony_storage WHERE building_id = ? AND item_type_id = ?'),
    upsertColonyStorage: db.prepare(`
      INSERT INTO colony_storage (building_id, item_type_id, quantity) VALUES (?, ?, ?)
      ON CONFLICT(building_id, item_type_id) DO UPDATE SET quantity = ?
    `),
    updateColonyStorageQty: db.prepare('UPDATE colony_storage SET quantity = ? WHERE building_id = ? AND item_type_id = ?'),

    // Colony routes
    getAllRoutes: db.prepare('SELECT * FROM colony_routes'),

    // Contracts
    insertContract: db.prepare(`
      INSERT INTO contracts (id, issuer_id, contract_type, title, description, price, reward, collateral, buyout_price, start_station_id, end_station_id, volume, days_to_complete, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    getContract: db.prepare('SELECT * FROM contracts WHERE id = ?'),
    getContractByStatus: db.prepare('SELECT * FROM contracts WHERE id = ? AND status = ?'),
    updateContractStatus: db.prepare('UPDATE contracts SET status = ?, assignee_id = ?, accepted_at = ?, completed_at = ? WHERE id = ?'),
    updateContractBidInfo: db.prepare('UPDATE contracts SET current_bid = ?, current_bidder_id = ? WHERE id = ?'),
    browseContracts: db.prepare(`SELECT * FROM contracts WHERE status = 'outstanding' ORDER BY created_at DESC LIMIT 50`),
    browseContractsByType: db.prepare(`SELECT * FROM contracts WHERE status = 'outstanding' AND contract_type = ? ORDER BY created_at DESC LIMIT 50`),
    getMyContracts: db.prepare('SELECT * FROM contracts WHERE issuer_id = ? OR assignee_id = ? ORDER BY created_at DESC LIMIT 50'),

    // Contract items
    insertContractItem: db.prepare('INSERT INTO contract_items (id, contract_id, item_type_id, quantity, is_issuer_item) VALUES (?, ?, ?, ?, ?)'),
    getContractItems: db.prepare('SELECT * FROM contract_items WHERE contract_id = ?'),

    // Contract bids
    insertContractBid: db.prepare('INSERT INTO contract_bids (id, contract_id, bidder_id, bid_amount) VALUES (?, ?, ?, ?)'),
    getContractBids: db.prepare('SELECT * FROM contract_bids WHERE contract_id = ? ORDER BY bid_amount DESC'),

    // Contract ticker queries
    getExpiredOutstanding: db.prepare(`SELECT id FROM contracts WHERE status = 'outstanding' AND expires_at <= ?`),
    expireContract: db.prepare(`UPDATE contracts SET status = 'expired' WHERE id = ?`),
    getExpiredAuctions: db.prepare(`SELECT * FROM contracts WHERE contract_type = 'auction' AND status = 'outstanding' AND expires_at <= ?`),
    getOverdueCouriers: db.prepare(`SELECT * FROM contracts WHERE contract_type = 'courier' AND status = 'in_progress'`),
    finishContract: db.prepare(`UPDATE contracts SET status = 'finished', assignee_id = ?, completed_at = ? WHERE id = ?`),
    failContract: db.prepare(`UPDATE contracts SET status = 'failed' WHERE id = ?`),

    // Sovereignty
    getAllSovereignty: db.prepare('SELECT * FROM sovereignty'),
    updateSovIndices: db.prepare('UPDATE sovereignty SET military_index = ?, industrial_index = ?, strategic_index = ?, updated_at = ? WHERE system_id = ?'),
    getSov: db.prepare('SELECT * FROM sovereignty WHERE system_id = ?'),
    upsertSov: db.prepare(`
      INSERT INTO sovereignty (system_id, owner_corp_id, sovereignty_level) VALUES (?, ?, ?)
      ON CONFLICT(system_id) DO UPDATE SET owner_corp_id = ?, sovereignty_level = ?
    `),
    deleteSov: db.prepare('DELETE FROM sovereignty WHERE system_id = ?'),

    // Sov structures
    getReinforcedStructures: db.prepare(`SELECT * FROM sovereignty_structures WHERE state = 'reinforced' AND reinforced_until <= ?`),
    getAnchoringStructures: db.prepare(`SELECT * FROM sovereignty_structures WHERE state = 'anchoring' AND created_at <= ?`),
    updateSovStructState: db.prepare('UPDATE sovereignty_structures SET state = ?, reinforced_until = ? WHERE id = ?'),
    getSovStructure: db.prepare('SELECT * FROM sovereignty_structures WHERE id = ?'),
    updateSovStructHp: db.prepare('UPDATE sovereignty_structures SET hp = ? WHERE id = ?'),
    updateSovStructReinforce: db.prepare('UPDATE sovereignty_structures SET hp = ?, state = ?, reinforced_until = ? WHERE id = ?'),

    // Inventory
    getInventoryStack: db.prepare('SELECT id, quantity FROM inventory WHERE owner_id = ? AND location_type = ? AND location_id = ? AND item_type_id = ? AND hangar_division = ?'),
    updateInventoryQty: db.prepare('UPDATE inventory SET quantity = ?, updated_at = unixepoch() WHERE id = ?'),
    insertInventory: db.prepare('INSERT INTO inventory (id, owner_id, owner_type, location_type, location_id, item_type_id, quantity, hangar_division) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
    deleteInventory: db.prepare('DELETE FROM inventory WHERE id = ?'),
    getInventoryByOwner: db.prepare('SELECT * FROM inventory WHERE owner_id = ? ORDER BY item_type_id'),
    getInventoryByOwnerLoc: db.prepare('SELECT * FROM inventory WHERE owner_id = ? AND location_type = ? ORDER BY item_type_id'),
    getInventoryByOwnerLocId: db.prepare('SELECT * FROM inventory WHERE owner_id = ? AND location_type = ? AND location_id = ? ORDER BY item_type_id'),

    // Market orders
    upsertNpcOrder: db.prepare(`
      INSERT INTO market_orders (id, station_id, item_type_id, is_buy_order, price, volume_remaining, volume_total, character_id, min_volume, issued_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET volume_remaining = ?, price = ?
    `),
    getBuyOrders: db.prepare('SELECT * FROM market_orders WHERE station_id = ? AND item_type_id = ? AND is_buy_order = 1 AND volume_remaining > 0 ORDER BY price DESC, issued_at ASC'),
    getSellOrders: db.prepare('SELECT * FROM market_orders WHERE station_id = ? AND item_type_id = ? AND is_buy_order = 0 AND volume_remaining > 0 ORDER BY price ASC, issued_at ASC'),
    updateOrderVolume: db.prepare('UPDATE market_orders SET volume_remaining = ? WHERE id = ?'),

    insertPlayerOrder: db.prepare(`
      INSERT INTO market_orders (id, station_id, item_type_id, is_buy_order, price, volume_remaining, volume_total, character_id, min_volume, issued_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `),
    getStationOrders: db.prepare('SELECT * FROM market_orders WHERE station_id = ? AND volume_remaining > 0 ORDER BY item_type_id, is_buy_order, price'),
    getPlayerOrders: db.prepare('SELECT * FROM market_orders WHERE character_id = ? AND volume_remaining > 0 ORDER BY issued_at DESC'),
    deleteDepletedOrders: db.prepare('DELETE FROM market_orders WHERE volume_remaining <= 0 AND character_id IS NOT NULL'),

    // Trade history
    insertTrade: db.prepare('INSERT INTO trade_history (buy_order_id, sell_order_id, item_type_id, quantity, price, station_id) VALUES (?, ?, ?, ?, ?, ?)'),
    getRecentTrades: db.prepare('SELECT item_type_id, station_id, price, quantity FROM trade_history WHERE executed_at >= ?'),

    // Price history
    insertPriceHistory: db.prepare('INSERT INTO price_history (item_type_id, station_id, average_price, lowest_price, highest_price, volume) VALUES (?, ?, ?, ?, ?, ?)'),

    // Wormhole systems
    getAllWhSystems: db.prepare('SELECT * FROM wormhole_systems'),

    // Wormhole connections
    getExpiredWh: db.prepare('SELECT id, connection_id FROM wormhole_connections WHERE expires_at <= ?'),
    collapseWh: db.prepare(`UPDATE wormhole_connections SET stage = 'collapsed' WHERE id = ?`),
    deleteCollapsedWh: db.prepare(`DELETE FROM wormhole_connections WHERE stage = 'collapsed'`),
    getActiveWh: db.prepare(`SELECT * FROM wormhole_connections WHERE stage != 'collapsed'`),
    updateWhStage: db.prepare('UPDATE wormhole_connections SET stage = ?, time_remaining_hours = ? WHERE id = ?'),
    insertWhConnection: db.prepare('INSERT INTO wormhole_connections (id, connection_id, wh_type, mass_remaining, mass_total, max_mass_per_jump, stage, time_remaining_hours, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    getWhByConnectionId: db.prepare('SELECT * FROM wormhole_connections WHERE connection_id = ?'),
    updateWhMass: db.prepare('UPDATE wormhole_connections SET mass_remaining = ? WHERE id = ?'),

    // Dynamic connections
    insertDynConn: db.prepare('INSERT INTO dynamic_connections (id, system_a_id, system_b_id, connection_type, is_stable, expires_at) VALUES (?, ?, ?, ?, ?, ?)'),
    deleteDynConn: db.prepare('DELETE FROM dynamic_connections WHERE id = ?'),
    countDynConnForSystem: db.prepare(`SELECT COUNT(*) as cnt FROM dynamic_connections WHERE (system_a_id = ? OR system_b_id = ?) AND connection_type = 'wormhole'`),

    // Scan probes
    deleteProbesForUser: db.prepare('DELETE FROM scan_probes WHERE owner_id = ?'),
    insertProbe: db.prepare('INSERT INTO scan_probes (id, owner_id, system_id, position_x, position_y, position_z, scan_radius, probe_type, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    getProbes: db.prepare('SELECT * FROM scan_probes WHERE owner_id = ? AND system_id = ?'),

    // Scan results
    getScanResults: db.prepare('SELECT * FROM scan_results WHERE system_id = ? AND scanner_id = ?'),
    insertScanResult: db.prepare('INSERT INTO scan_results (id, system_id, scanner_id, signature_id, signature_type, scan_strength, resolved, position_x, position_y, position_z) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    updateScanStrength: db.prepare('UPDATE scan_results SET scan_strength = ?, resolved = ? WHERE id = ?'),

    // Skills
    getCharSkill: db.prepare('SELECT * FROM character_skills WHERE character_id = ? AND skill_type_id = ?'),
    upsertCharSkill: db.prepare(`
      INSERT INTO character_skills (id, character_id, skill_type_id, skill_points, current_level)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(character_id, skill_type_id) DO UPDATE SET skill_points = ?, current_level = ?, updated_at = unixepoch()
    `),
    getActiveSkillQueues: db.prepare(`SELECT * FROM skill_queue WHERE queue_position = 0 AND is_active = 1`),
    getCharSkills: db.prepare('SELECT * FROM character_skills WHERE character_id = ?'),
    completeQueueEntry: db.prepare(`UPDATE skill_queue SET is_active = 0, completed_at = ? WHERE id = ?`),
    getNextQueueEntry: db.prepare('SELECT * FROM skill_queue WHERE character_id = ? AND is_active = 1 ORDER BY queue_position ASC LIMIT 1'),
    promoteQueueEntry: db.prepare('UPDATE skill_queue SET queue_position = 0 WHERE id = ?'),

    // Cached static data
    upsertSkillDef: db.prepare(`
      INSERT INTO cached_skill_definitions (type_id, name, rank, primary_attribute, secondary_attribute, description)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(type_id) DO UPDATE SET name=?, rank=?, primary_attribute=?, secondary_attribute=?, description=?
    `),
    getAllSkillDefs: db.prepare('SELECT * FROM cached_skill_definitions'),
    upsertImplantType: db.prepare(`
      INSERT INTO cached_implant_types (id, name, slot, attribute, bonus, description)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=?, slot=?, attribute=?, bonus=?, description=?
    `),
    getAllImplantTypes: db.prepare('SELECT * FROM cached_implant_types'),
  }
  return _stmts
}

// ============================================================================
// UUID HELPER
// ============================================================================

function uuid(): string {
  const hex = '0123456789abcdef'
  let s = ''
  for (let i = 0; i < 32; i++) {
    s += hex[Math.floor(Math.random() * 16)]
    if (i === 7 || i === 11 || i === 15 || i === 19) s += '-'
  }
  return s
}

function nowUnix(): number {
  return Math.floor(Date.now() / 1000)
}

// ============================================================================
// PLAYERS
// ============================================================================

export function getOrCreatePlayer(userId: string, email?: string): Record<string, unknown> {
  const s = stmts()
  let player = s.getPlayer.get(userId) as Record<string, unknown> | undefined
  if (!player) {
    const username = email?.split('@')[0] || 'Pilot'
    s.upsertPlayer.run(userId, email || null, username)
    player = s.getPlayer.get(userId) as Record<string, unknown>
  }
  return player
}

export function updatePlayerCorpId(userId: string, corpId: string | null): void {
  stmts().updatePlayerCorpId.run(corpId, userId)
}

export function updatePlayerMedicalClone(userId: string, stationId: string): void {
  stmts().updatePlayerMedClone.run(stationId, userId)
}

export function getPlayerAttributes(userId: string): Record<string, number> | undefined {
  return stmts().getPlayerAttributes.get(userId) as Record<string, number> | undefined
}

// ============================================================================
// WALLET - PLAYER
// ============================================================================

export function getPlayerBalance(userId: string): number {
  const row = stmts().getPlayerBalance.get(userId) as { balance: number } | undefined
  return row?.balance ?? 0
}

export function creditPlayer(userId: string, amount: number, txType: string, description: string = '', refId?: string): boolean {
  if (amount <= 0) return false
  const s = stmts()
  const db = getSQLite()
  const tx = db.transaction(() => {
    getOrCreatePlayer(userId)
    s.creditPlayer.run(amount, amount, userId)
    const newBal = getPlayerBalance(userId)
    s.insertWalletTx.run(userId, amount, newBal, txType, description, refId || null)
  })
  tx()
  return true
}

export function debitPlayer(userId: string, amount: number, txType: string, description: string = '', refId?: string): boolean {
  if (amount <= 0) return false
  const s = stmts()
  const db = getSQLite()
  let success = false
  const tx = db.transaction(() => {
    const balance = getPlayerBalance(userId)
    if (balance < amount) return
    s.debitPlayer.run(amount, amount, userId)
    const newBal = getPlayerBalance(userId)
    s.insertWalletTx.run(userId, -amount, newBal, txType, description, refId || null)
    success = true
  })
  tx()
  return success
}

export function transferBetweenPlayers(fromId: string, toId: string, amount: number, desc: string = 'Player transfer'): boolean {
  const db = getSQLite()
  let success = false
  const tx = db.transaction(() => {
    if (!debitPlayer(fromId, amount, 'transfer', desc)) return
    creditPlayer(toId, amount, 'transfer', desc)
    success = true
  })
  tx()
  return success
}

// ============================================================================
// WALLET - CORPORATION
// ============================================================================

export function getCorpBalance(corpId: string, division: number = 1): number {
  const row = stmts().getCorpBalance.get(corpId, division) as { balance: number } | undefined
  return row?.balance ?? 0
}

export function creditCorp(corpId: string, amount: number, division: number, refType: string, description: string = '', actorId?: string): void {
  if (amount <= 0) return
  const s = stmts()
  const db = getSQLite()
  const tx = db.transaction(() => {
    const balance = getCorpBalance(corpId, division)
    const newBal = balance + amount
    s.upsertCorpWallet.run(corpId, division, newBal, newBal)
    s.insertCorpJournal.run(corpId, division, amount, newBal, refType, description, actorId || null)
  })
  tx()
}

export function debitCorp(corpId: string, amount: number, division: number, refType: string, description: string = '', actorId?: string): boolean {
  if (amount <= 0) return false
  const s = stmts()
  const db = getSQLite()
  let success = false
  const tx = db.transaction(() => {
    const balance = getCorpBalance(corpId, division)
    if (balance < amount) return
    const newBal = balance - amount
    s.updateCorpBalance.run(newBal, corpId, division)
    s.insertCorpJournal.run(corpId, division, -amount, newBal, refType, description, actorId || null)
    success = true
  })
  tx()
  return success
}

// ============================================================================
// SHIPS
// ============================================================================

const STARTER_SYSTEM_ID = '7127c86d-a096-4b4e-8de1-755a22bb168a'
const STARTER_SHIP_TYPE = 'caldari_frigate'

export function loadShipForPlayer(userId: string): Record<string, unknown> {
  const s = stmts()
  let ship = s.getActiveShip.get(userId) as Record<string, unknown> | undefined

  if (ship) {
    const shipType = getShipTypeOrDefault((ship.ship_type_id as string) ?? '')
    return { ...ship, rt_ship_types: shipType }
  }

  console.log(`[Persistence] Creating starter ship for player ${userId}`)
  const starterType = getShipTypeOrDefault(STARTER_SHIP_TYPE)
  const id = uuid()

  s.insertShip.run(
    id, userId, STARTER_SHIP_TYPE, STARTER_SYSTEM_ID,
    (Math.random() - 0.5) * 10000,
    (Math.random() - 0.5) * 2000,
    (Math.random() - 0.5) * 10000,
    starterType.baseHp, starterType.baseShield, starterType.baseArmor
  )

  ship = s.getActiveShip.get(userId) as Record<string, unknown>
  return { ...ship, rt_ship_types: starterType }
}

export function saveShipState(shipId: string, state: {
  system_id: string; position_x: number; position_y: number; position_z: number
  current_hp: number; current_shield: number; current_armor: number; is_docked: boolean
}): void {
  stmts().saveShip.run(
    state.system_id, state.position_x, state.position_y, state.position_z,
    state.current_hp, state.current_shield, state.current_armor, state.is_docked ? 1 : 0,
    shipId
  )
}

export function batchSaveShips(ships: Array<{
  id: string; system_id: string; position_x: number; position_y: number; position_z: number
  current_hp: number; current_shield: number; current_armor: number; is_docked: boolean
}>): void {
  const s = stmts()
  const db = getSQLite()
  const tx = db.transaction(() => {
    for (const ship of ships) {
      s.saveShip.run(
        ship.system_id, ship.position_x, ship.position_y, ship.position_z,
        ship.current_hp, ship.current_shield, ship.current_armor, ship.is_docked ? 1 : 0,
        ship.id
      )
    }
  })
  tx()
}

export function loadShipsInSystem(systemId: string): Record<string, unknown>[] {
  const rows = stmts().getShipsInSystem.all(systemId) as Record<string, unknown>[]
  return rows.map(ship => ({
    ...ship,
    rt_ship_types: getShipTypeOrDefault((ship.ship_type_id as string) ?? ''),
  }))
}

// ============================================================================
// CORPORATIONS
// ============================================================================

export function createCorporation(name: string, ticker: string, ceoId: string): Record<string, unknown> {
  const s = stmts()
  const db = getSQLite()
  const id = uuid()
  const tx = db.transaction(() => {
    s.insertCorp.run(id, name, ticker.toUpperCase(), ceoId)
    s.insertCorpMember.run(uuid(), id, ceoId, 'ceo')
    updatePlayerCorpId(ceoId, id)
    // Init 7 wallet divisions
    for (let d = 1; d <= 7; d++) {
      s.upsertCorpWallet.run(id, d, 0, 0)
    }
  })
  tx()
  return s.getCorp.get(id) as Record<string, unknown>
}

export function getCorporation(corpId: string): Record<string, unknown> | undefined {
  return stmts().getCorp.get(corpId) as Record<string, unknown> | undefined
}

export function getCorpMember(corpId: string, userId: string): Record<string, unknown> | undefined {
  return stmts().getCorpMember.get(corpId, userId) as Record<string, unknown> | undefined
}

export function getCorpMembers(corpId: string): Record<string, unknown>[] {
  return stmts().getCorpMembers.all(corpId) as Record<string, unknown>[]
}

export function setCorpMemberRole(corpId: string, userId: string, role: string): void {
  stmts().updateCorpMemberRole.run(role, corpId, userId)
}

export function addCorpMember(corpId: string, userId: string, role: string = 'member'): void {
  const s = stmts()
  const db = getSQLite()
  const tx = db.transaction(() => {
    s.insertCorpMember.run(uuid(), corpId, userId, role)
    updatePlayerCorpId(userId, corpId)
    const row = s.getCorpMemberCount.get(corpId) as { member_count: number } | undefined
    s.updateCorpMemberCount.run((row?.member_count ?? 0) + 1, corpId)
  })
  tx()
}

export function removeCorpMember(corpId: string, userId: string): void {
  const s = stmts()
  const db = getSQLite()
  const tx = db.transaction(() => {
    s.deleteCorpMember.run(corpId, userId)
    updatePlayerCorpId(userId, null)
    const row = s.getCorpMemberCount.get(corpId) as { member_count: number } | undefined
    s.updateCorpMemberCount.run(Math.max(0, (row?.member_count ?? 1) - 1), corpId)
  })
  tx()
}

export function transferCeo(corpId: string, oldCeoId: string, newCeoId: string): void {
  const s = stmts()
  const db = getSQLite()
  const tx = db.transaction(() => {
    s.updateCorpCeo.run(newCeoId, corpId)
    s.updateCorpMemberRole.run('director', corpId, oldCeoId)
    s.updateCorpMemberRole.run('ceo', corpId, newCeoId)
  })
  tx()
}

export function setCorpTaxRate(corpId: string, rate: number): void {
  stmts().updateCorpTax.run(rate, corpId)
}

export function setCorpRecruiting(corpId: string, recruiting: boolean): void {
  stmts().updateCorpRecruiting.run(recruiting ? 1 : 0, corpId)
}

export function createCorpApplication(corpId: string, applicantId: string, message: string): void {
  stmts().insertCorpApp.run(uuid(), corpId, applicantId, message)
}

export function getCorpApplication(appId: string): Record<string, unknown> | undefined {
  return stmts().getCorpApp.get(appId) as Record<string, unknown> | undefined
}

export function getCorpPendingApplications(corpId: string): Record<string, unknown>[] {
  return stmts().getCorpPendingApps.all(corpId) as Record<string, unknown>[]
}

export function updateCorpApplicationStatus(appId: string, status: string, reviewedBy: string): void {
  stmts().updateCorpAppStatus.run(status, reviewedBy, appId)
}

// ============================================================================
// CLONES & IMPLANTS
// ============================================================================

export function installClone(ownerId: string, stationId: string, cloneName: string): Record<string, unknown> | null {
  const s = stmts()
  const countRow = s.countJumpClones.get(ownerId) as { cnt: number }
  if (countRow.cnt >= 5) return null

  const id = uuid()
  s.insertClone.run(id, ownerId, 'jump', stationId, cloneName)
  return s.getClone.get(id, ownerId) as Record<string, unknown>
}

export function jumpToClone(ownerId: string, cloneId: string, cooldownHours: number = 24): Record<string, unknown> | null {
  const s = stmts()
  const active = s.getActiveClone.get(ownerId) as Record<string, unknown> | undefined

  if (active?.jump_cooldown_until) {
    const cooldownEnd = active.jump_cooldown_until as number
    if (cooldownEnd > nowUnix()) return null
  }

  const target = s.getClone.get(cloneId, ownerId) as Record<string, unknown> | undefined
  if (!target) return null

  const cooldownUntil = nowUnix() + cooldownHours * 3600
  const db = getSQLite()
  const tx = db.transaction(() => {
    s.deactivateClones.run(ownerId)
    s.activateClone.run(cooldownUntil, cloneId)
  })
  tx()

  return { ...target, cooldownUntil }
}

export function destroyClone(ownerId: string, cloneId: string): void {
  stmts().deleteClone.run(cloneId, ownerId)
}

export function getAllClones(ownerId: string): Record<string, unknown>[] {
  const s = stmts()
  const clones = s.getAllClones.all(ownerId) as Record<string, unknown>[]
  for (const clone of clones) {
    clone.implants = s.getImplantsForClone.all(clone.id as string)
  }
  return clones
}

export function installImplant(cloneId: string, implantTypeId: string, slot: number): void {
  const s = stmts()
  s.deleteImplant.run(cloneId, slot)
  s.insertImplant.run(uuid(), cloneId, implantTypeId, slot)
}

export function removeImplant(cloneId: string, slot: number): void {
  stmts().deleteImplant.run(cloneId, slot)
}

export function getImplantsForActiveClone(ownerId: string): Record<string, unknown>[] {
  const s = stmts()
  const active = s.getActiveClone.get(ownerId) as Record<string, unknown> | undefined
  if (!active) return []
  return s.getImplantsForClone.all(active.id as string) as Record<string, unknown>[]
}

// ============================================================================
// INVENTORY
// ============================================================================

export function addItem(
  ownerId: string, ownerType: 'character' | 'corporation',
  locationType: string, locationId: string,
  itemTypeId: string, quantity: number, hangarDiv: number = 1
): void {
  const s = stmts()
  const existing = s.getInventoryStack.get(ownerId, locationType, locationId, itemTypeId, hangarDiv) as { id: string; quantity: number } | undefined

  if (existing) {
    s.updateInventoryQty.run(existing.quantity + quantity, existing.id)
  } else {
    s.insertInventory.run(uuid(), ownerId, ownerType, locationType, locationId, itemTypeId, quantity, hangarDiv)
  }
}

export function removeItem(
  ownerId: string, locationType: string, locationId: string,
  itemTypeId: string, quantity: number, hangarDiv: number = 1
): boolean {
  const s = stmts()
  const existing = s.getInventoryStack.get(ownerId, locationType, locationId, itemTypeId, hangarDiv) as { id: string; quantity: number } | undefined
  if (!existing || existing.quantity < quantity) return false

  const newQty = existing.quantity - quantity
  if (newQty <= 0) {
    s.deleteInventory.run(existing.id)
  } else {
    s.updateInventoryQty.run(newQty, existing.id)
  }
  return true
}

export function moveItem(
  ownerId: string,
  fromLocType: string, fromLocId: string,
  toLocType: string, toLocId: string,
  itemTypeId: string, quantity: number
): boolean {
  const db = getSQLite()
  let success = false
  const tx = db.transaction(() => {
    if (!removeItem(ownerId, fromLocType, fromLocId, itemTypeId, quantity)) return
    addItem(ownerId, 'character', toLocType, toLocId, itemTypeId, quantity)
    success = true
  })
  tx()
  return success
}

export function getInventory(ownerId: string, locationType?: string, locationId?: string): Record<string, unknown>[] {
  const s = stmts()
  if (locationType && locationId) {
    return s.getInventoryByOwnerLocId.all(ownerId, locationType, locationId) as Record<string, unknown>[]
  }
  if (locationType) {
    return s.getInventoryByOwnerLoc.all(ownerId, locationType) as Record<string, unknown>[]
  }
  return s.getInventoryByOwner.all(ownerId) as Record<string, unknown>[]
}

// ============================================================================
// BLUEPRINTS & INDUSTRY
// ============================================================================

export function getBlueprint(id: string, ownerId: string): Record<string, unknown> | undefined {
  return stmts().getBlueprint.get(id, ownerId) as Record<string, unknown> | undefined
}

export function createBlueprint(ownerId: string, itemTypeId: string, isOriginal: boolean, runs: number, me: number, te: number, techLevel: number, locType: string, locId: string): string {
  const id = uuid()
  stmts().insertBlueprint.run(id, ownerId, itemTypeId, isOriginal ? 1 : 0, runs, me, te, techLevel, locType, locId)
  return id
}

export function updateBlueprintRuns(bpId: string, runs: number): void {
  if (runs <= 0) {
    stmts().deleteBlueprint.run(bpId)
  } else {
    stmts().updateBlueprintRuns.run(runs, bpId)
  }
}

export function updateBlueprintME(bpId: string, me: number): void {
  stmts().updateBlueprintME.run(me, bpId)
}

export function updateBlueprintTE(bpId: string, te: number): void {
  stmts().updateBlueprintTE.run(te, bpId)
}

export function createIndustryJob(
  ownerId: string, stationId: string, blueprintId: string, activity: string,
  outputItemTypeId: string | null, outputQty: number, durationSec: number,
  startsAt: number, endsAt: number, successProb: number
): string {
  const id = uuid()
  stmts().insertIndustryJob.run(id, ownerId, stationId, blueprintId, activity, outputItemTypeId, outputQty, durationSec, startsAt, endsAt, successProb)
  return id
}

export function getPendingIndustryJobs(nowUnixTs: number): Record<string, unknown>[] {
  return stmts().getPendingJobs.all(nowUnixTs) as Record<string, unknown>[]
}

export function completeIndustryJob(jobId: string, outcome: string): void {
  stmts().completeJob.run(outcome, jobId)
}

// ============================================================================
// PLANETARY INTERACTION
// ============================================================================

export function getAllColonyBuildings(): Record<string, unknown>[] {
  return stmts().getColonyBuildings.all() as Record<string, unknown>[]
}

export function getColonyStorageQty(buildingId: string, itemTypeId: string): number {
  const row = stmts().getColonyStorage.get(buildingId, itemTypeId) as { quantity: number } | undefined
  return row?.quantity ?? 0
}

export function setColonyStorage(buildingId: string, itemTypeId: string, qty: number): void {
  stmts().upsertColonyStorage.run(buildingId, itemTypeId, qty, qty)
}

export function updateColonyStorageQty(buildingId: string, itemTypeId: string, qty: number): void {
  stmts().updateColonyStorageQty.run(qty, buildingId, itemTypeId)
}

export function updateBuildingCycle(buildingId: string, nowTs: number): void {
  stmts().updateBuildingCycle.run(nowTs, buildingId)
}

export function getAllColonyRoutes(): Record<string, unknown>[] {
  return stmts().getAllRoutes.all() as Record<string, unknown>[]
}

// ============================================================================
// CONTRACTS
// ============================================================================

export function createContract(data: {
  issuerId: string; contractType: string; title: string; description: string
  price: number; reward: number; collateral: number; buyoutPrice: number | null
  startStationId: string; endStationId: string | null; volume: number
  daysToComplete: number; expiresAt: number
}): Record<string, unknown> {
  const id = uuid()
  const s = stmts()
  s.insertContract.run(
    id, data.issuerId, data.contractType, data.title, data.description,
    data.price, data.reward, data.collateral, data.buyoutPrice,
    data.startStationId, data.endStationId, data.volume, data.daysToComplete, data.expiresAt
  )
  return s.getContract.get(id) as Record<string, unknown>
}

export function getContract(contractId: string): Record<string, unknown> | undefined {
  return stmts().getContract.get(contractId) as Record<string, unknown> | undefined
}

export function getContractByStatus(contractId: string, status: string): Record<string, unknown> | undefined {
  return stmts().getContractByStatus.get(contractId, status) as Record<string, unknown> | undefined
}

export function updateContractStatus(contractId: string, status: string, assigneeId?: string | null, acceptedAt?: number | null, completedAt?: number | null): void {
  stmts().updateContractStatus.run(status, assigneeId ?? null, acceptedAt ?? null, completedAt ?? null, contractId)
}

export function updateContractBid(contractId: string, bid: number, bidderId: string): void {
  stmts().updateContractBidInfo.run(bid, bidderId, contractId)
}

export function addContractItem(contractId: string, itemTypeId: string, quantity: number, isIssuerItem: boolean): void {
  stmts().insertContractItem.run(uuid(), contractId, itemTypeId, quantity, isIssuerItem ? 1 : 0)
}

export function getContractItems(contractId: string): Record<string, unknown>[] {
  return stmts().getContractItems.all(contractId) as Record<string, unknown>[]
}

export function addContractBid(contractId: string, bidderId: string, amount: number): void {
  stmts().insertContractBid.run(uuid(), contractId, bidderId, amount)
}

export function getContractBids(contractId: string): Record<string, unknown>[] {
  return stmts().getContractBids.all(contractId) as Record<string, unknown>[]
}

export function browseContracts(contractType?: string): Record<string, unknown>[] {
  const s = stmts()
  if (contractType) return s.browseContractsByType.all(contractType) as Record<string, unknown>[]
  return s.browseContracts.all() as Record<string, unknown>[]
}

export function getMyContracts(userId: string): Record<string, unknown>[] {
  return stmts().getMyContracts.all(userId, userId) as Record<string, unknown>[]
}

// Contract ticker
export function expireOutstandingContracts(nowTs: number): void {
  const s = stmts()
  const rows = s.getExpiredOutstanding.all(nowTs) as { id: string }[]
  for (const row of rows) s.expireContract.run(row.id)
}

export function getExpiredAuctions(nowTs: number): Record<string, unknown>[] {
  return stmts().getExpiredAuctions.all(nowTs) as Record<string, unknown>[]
}

export function getOverdueCouriers(): Record<string, unknown>[] {
  return stmts().getOverdueCouriers.all() as Record<string, unknown>[]
}

export function finishContract(contractId: string, assigneeId: string, completedAt: number): void {
  stmts().finishContract.run(assigneeId, completedAt, contractId)
}

export function failContract(contractId: string): void {
  stmts().failContract.run(contractId)
}

// ============================================================================
// SOVEREIGNTY
// ============================================================================

export function getAllSovereignty(): Record<string, unknown>[] {
  return stmts().getAllSovereignty.all() as Record<string, unknown>[]
}

export function updateSovIndices(systemId: string, mil: number, ind: number, strat: number): void {
  stmts().updateSovIndices.run(mil, ind, strat, nowUnix(), systemId)
}

export function getSov(systemId: string): Record<string, unknown> | undefined {
  return stmts().getSov.get(systemId) as Record<string, unknown> | undefined
}

export function upsertSov(systemId: string, ownerCorpId: string, level: number): void {
  stmts().upsertSov.run(systemId, ownerCorpId, level, ownerCorpId, level)
}

export function deleteSov(systemId: string): void {
  stmts().deleteSov.run(systemId)
}

export function getReinforcedStructures(nowTs: number): Record<string, unknown>[] {
  return stmts().getReinforcedStructures.all(nowTs) as Record<string, unknown>[]
}

export function getAnchoringStructures(cutoffTs: number): Record<string, unknown>[] {
  return stmts().getAnchoringStructures.all(cutoffTs) as Record<string, unknown>[]
}

export function updateSovStructState(id: string, state: string, reinforcedUntil: number | null): void {
  stmts().updateSovStructState.run(state, reinforcedUntil, id)
}

export function getSovStructure(id: string): Record<string, unknown> | undefined {
  return stmts().getSovStructure.get(id) as Record<string, unknown> | undefined
}

export function updateSovStructHp(id: string, hp: number): void {
  stmts().updateSovStructHp.run(hp, id)
}

export function updateSovStructReinforce(id: string, hp: number, reinforcedUntil: number): void {
  stmts().updateSovStructReinforce.run(hp, 'reinforced', reinforcedUntil, id)
}

// ============================================================================
// MARKET / ECONOMY
// ============================================================================

export function placePlayerOrder(stationId: string, itemTypeId: string, isBuy: boolean, price: number, volume: number, characterId: string): string {
  const id = uuid()
  const nowTs = Math.floor(Date.now() / 1000)
  const expiresAt = nowTs + 90 * 24 * 60 * 60 // 90 days
  stmts().insertPlayerOrder.run(id, stationId, itemTypeId, isBuy ? 1 : 0, price, volume, volume, characterId, nowTs, expiresAt)
  return id
}

export function getStationOrders(stationId: string): Record<string, unknown>[] {
  return stmts().getStationOrders.all(stationId) as Record<string, unknown>[]
}

export function getPlayerOrders(characterId: string): Record<string, unknown>[] {
  return stmts().getPlayerOrders.all(characterId) as Record<string, unknown>[]
}

export function cleanupDepletedOrders(): void {
  stmts().deleteDepletedOrders.run()
}

export function upsertNpcMarketOrder(stationId: string, itemTypeId: string, isBuy: boolean, price: number, volume: number, issuedAt: number, expiresAt: number): void {
  const id = `npc_${stationId}_${itemTypeId}_${isBuy ? 'buy' : 'sell'}`
  stmts().upsertNpcOrder.run(id, stationId, itemTypeId, isBuy ? 1 : 0, price, volume, volume, 1, issuedAt, expiresAt, volume, price)
}

export function getBuyOrders(stationId: string, itemTypeId: string): Record<string, unknown>[] {
  return stmts().getBuyOrders.all(stationId, itemTypeId) as Record<string, unknown>[]
}

export function getSellOrders(stationId: string, itemTypeId: string): Record<string, unknown>[] {
  return stmts().getSellOrders.all(stationId, itemTypeId) as Record<string, unknown>[]
}

export function updateOrderVolume(orderId: string, volume: number): void {
  stmts().updateOrderVolume.run(volume, orderId)
}

export function insertTrade(buyOrderId: string, sellOrderId: string, itemTypeId: string, qty: number, price: number, stationId: string): void {
  stmts().insertTrade.run(buyOrderId, sellOrderId, itemTypeId, qty, price, stationId)
}

export function getRecentTrades(sinceTs: number): Record<string, unknown>[] {
  return stmts().getRecentTrades.all(sinceTs) as Record<string, unknown>[]
}

export function insertPriceHistory(itemTypeId: string, stationId: string, avg: number, low: number, high: number, vol: number): void {
  stmts().insertPriceHistory.run(itemTypeId, stationId, avg, low, high, vol)
}

// ============================================================================
// WORMHOLES
// ============================================================================

export function getAllWormholeSystems(): Record<string, unknown>[] {
  return stmts().getAllWhSystems.all() as Record<string, unknown>[]
}

export function getExpiredWormholes(nowTs: number): { id: string; connection_id: string }[] {
  return stmts().getExpiredWh.all(nowTs) as { id: string; connection_id: string }[]
}

export function collapseWormhole(whId: string): void {
  stmts().collapseWh.run(whId)
}

export function deleteCollapsedWormholes(): void {
  stmts().deleteCollapsedWh.run()
}

export function getActiveWormholes(): Record<string, unknown>[] {
  return stmts().getActiveWh.all() as Record<string, unknown>[]
}

export function updateWhStage(whId: string, stage: string, hoursLeft: number): void {
  stmts().updateWhStage.run(stage, hoursLeft, whId)
}

export function createWhConnection(connId: string | null, whType: string, massTotal: number, massPerJump: number, lifetimeHours: number, expiresAt: number): string {
  const id = uuid()
  stmts().insertWhConnection.run(id, connId, whType, massTotal, massTotal, massPerJump, 'fresh', lifetimeHours, expiresAt)
  return id
}

export function getWhByConnectionId(connId: string): Record<string, unknown> | undefined {
  return stmts().getWhByConnectionId.get(connId) as Record<string, unknown> | undefined
}

export function updateWhMass(whId: string, mass: number): void {
  stmts().updateWhMass.run(mass, whId)
}

export function createDynamicConnection(sysA: string, sysB: string, type: string, isStable: boolean, expiresAt: number | null): string {
  const id = uuid()
  stmts().insertDynConn.run(id, sysA, sysB, type, isStable ? 1 : 0, expiresAt)
  return id
}

export function deleteDynamicConnection(id: string): void {
  stmts().deleteDynConn.run(id)
}

export function countWhConnectionsForSystem(systemId: string): number {
  const row = stmts().countDynConnForSystem.get(systemId, systemId) as { cnt: number }
  return row.cnt
}

// ============================================================================
// SCANNING
// ============================================================================

export function launchProbes(userId: string, systemId: string, positions: Array<{ x: number; y: number; z: number }>, scanRadius: number, probeType: string): void {
  const s = stmts()
  const db = getSQLite()
  const expiresAt = nowUnix() + 3600
  const tx = db.transaction(() => {
    s.deleteProbesForUser.run(userId)
    for (const pos of positions) {
      s.insertProbe.run(uuid(), userId, systemId, pos.x, pos.y, pos.z, scanRadius, probeType, expiresAt)
    }
  })
  tx()
}

export function getProbes(userId: string, systemId: string): Record<string, unknown>[] {
  return stmts().getProbes.all(userId, systemId) as Record<string, unknown>[]
}

export function getScanResults(systemId: string, scannerId: string): Record<string, unknown>[] {
  return stmts().getScanResults.all(systemId, scannerId) as Record<string, unknown>[]
}

export function createScanResult(systemId: string, scannerId: string, sigId: string, sigType: string, x: number, y: number, z: number): Record<string, unknown> {
  const id = uuid()
  stmts().insertScanResult.run(id, systemId, scannerId, sigId, sigType, 0, 0, x, y, z)
  return { id, system_id: systemId, scanner_id: scannerId, signature_id: sigId, signature_type: sigType, scan_strength: 0, resolved: 0, position_x: x, position_y: y, position_z: z }
}

export function updateScanStrength(resultId: string, strength: number, resolved: boolean): void {
  stmts().updateScanStrength.run(strength, resolved ? 1 : 0, resultId)
}

// ============================================================================
// SKILLS
// ============================================================================

export function getActiveSkillQueues(): Record<string, unknown>[] {
  return stmts().getActiveSkillQueues.all() as Record<string, unknown>[]
}

export function getCharacterSkill(characterId: string, skillTypeId: number): Record<string, unknown> | undefined {
  return stmts().getCharSkill.get(characterId, skillTypeId) as Record<string, unknown> | undefined
}

export function upsertCharacterSkill(characterId: string, skillTypeId: number, sp: number, level: number): void {
  const id = uuid()
  stmts().upsertCharSkill.run(id, characterId, skillTypeId, sp, level, sp, level)
}

export function completeSkillQueueEntry(queueId: string): void {
  stmts().completeQueueEntry.run(nowUnix(), queueId)
}

export function advanceSkillQueue(characterId: string): void {
  const s = stmts()
  const next = s.getNextQueueEntry.get(characterId) as Record<string, unknown> | undefined
  if (next) {
    s.promoteQueueEntry.run(next.id)
  }
}

// ============================================================================
// STATIC DATA CACHE
// ============================================================================

export function cacheSkillDefinition(typeId: number, name: string, rank: number, primary: number, secondary: number, desc: string): void {
  stmts().upsertSkillDef.run(typeId, name, rank, primary, secondary, desc, name, rank, primary, secondary, desc)
}

export function getCachedSkillDefinitions(): Map<number, Record<string, unknown>> {
  const rows = stmts().getAllSkillDefs.all() as Array<Record<string, unknown>>
  const map = new Map<number, Record<string, unknown>>()
  for (const r of rows) map.set(r.type_id as number, r)
  return map
}

export function cacheImplantType(id: string, name: string, slot: number, attribute: string | null, bonus: number, desc: string): void {
  stmts().upsertImplantType.run(id, name, slot, attribute, bonus, desc, name, slot, attribute, bonus, desc)
}

export function getCachedImplantTypes(): Map<string, Record<string, unknown>> {
  const rows = stmts().getAllImplantTypes.all() as Array<Record<string, unknown>>
  const map = new Map<string, Record<string, unknown>>()
  for (const r of rows) map.set(r.id as string, r)
  return map
}
