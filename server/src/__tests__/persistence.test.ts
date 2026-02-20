/**
 * Persistence Service Tests
 *
 * Tests SQLite-backed CRUD operations: players, wallet, inventory,
 * corporations, and market orders.
 *
 * Each test suite initializes a fresh in-memory-equivalent SQLite DB
 * via a temp file to ensure isolation.
 */

import path from 'path'
import fs from 'fs'
import os from 'os'

// We must set the SQLITE_PATH env var BEFORE importing the config module,
// so that CONFIG.SQLITE_PATH resolves to our temp file.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ogamex-test-'))
const tmpDbPath = path.join(tmpDir, 'test.db')
process.env.SQLITE_PATH = tmpDbPath

// Now import modules that depend on CONFIG
import { initSQLite, getSQLite } from '../db/sqlite'
import {
  getOrCreatePlayer,
  creditPlayer,
  debitPlayer,
  getPlayerBalance,
  placePlayerOrder,
  addItem,
  removeItem,
  getInventory,
  createCorporation,
  getCorporation,
  getCorpMember,
  getCorpMembers,
} from '../services/persistence'

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeAll(() => {
  initSQLite()
})

afterAll(() => {
  try {
    const db = getSQLite()
    db.close()
  } catch {
    // DB may already be closed
  }
  // Clean up temp files
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  } catch {
    // Best effort cleanup
  }
})

// ============================================================================
// PLAYERS
// ============================================================================

describe('getOrCreatePlayer', () => {
  it('should create a new player on first call', () => {
    const player = getOrCreatePlayer('user-001', 'alice@example.com')
    expect(player).toBeDefined()
    expect(player.id).toBe('user-001')
    expect(player.username).toBe('alice')
    expect(player.balance).toBe(5000)
  })

  it('should return existing player on second call', () => {
    const first = getOrCreatePlayer('user-002', 'bob@example.com')
    const second = getOrCreatePlayer('user-002', 'bob@example.com')
    expect(second.id).toBe(first.id)
    expect(second.username).toBe('bob')
  })

  it('should default username to Pilot when no email provided', () => {
    const player = getOrCreatePlayer('user-003')
    expect(player.username).toBe('Pilot')
  })

  it('should start with default attribute values', () => {
    const player = getOrCreatePlayer('user-004', 'carol@test.com')
    expect(player.charisma).toBe(20)
    expect(player.intelligence).toBe(20)
    expect(player.memory).toBe(20)
    expect(player.perception).toBe(20)
    expect(player.willpower).toBe(20)
  })
})

// ============================================================================
// WALLET
// ============================================================================

describe('creditPlayer / debitPlayer', () => {
  const userId = 'wallet-user-001'

  beforeAll(() => {
    getOrCreatePlayer(userId, 'wallet@test.com')
  })

  it('should credit player balance', () => {
    const result = creditPlayer(userId, 1000, 'mining', 'Ore sale')
    expect(result).toBe(true)
    expect(getPlayerBalance(userId)).toBe(6000) // 5000 starting + 1000
  })

  it('should debit player balance', () => {
    const result = debitPlayer(userId, 500, 'purchase', 'Ship module')
    expect(result).toBe(true)
    expect(getPlayerBalance(userId)).toBe(5500) // 6000 - 500
  })

  it('should reject debit that exceeds balance', () => {
    const result = debitPlayer(userId, 999999, 'purchase', 'Too expensive')
    expect(result).toBe(false)
    expect(getPlayerBalance(userId)).toBe(5500) // unchanged
  })

  it('should reject credit with zero amount', () => {
    const result = creditPlayer(userId, 0, 'test', 'Zero credit')
    expect(result).toBe(false)
  })

  it('should reject credit with negative amount', () => {
    const result = creditPlayer(userId, -100, 'test', 'Negative credit')
    expect(result).toBe(false)
  })

  it('should reject debit with zero amount', () => {
    const result = debitPlayer(userId, 0, 'test', 'Zero debit')
    expect(result).toBe(false)
  })

  it('should reject debit with negative amount', () => {
    const result = debitPlayer(userId, -50, 'test', 'Negative debit')
    expect(result).toBe(false)
  })
})

// ============================================================================
// MARKET ORDERS
// ============================================================================

describe('placePlayerOrder', () => {
  const userId = 'market-user-001'

  beforeAll(() => {
    getOrCreatePlayer(userId, 'trader@test.com')
  })

  it('should create a buy order and return an id', () => {
    const orderId = placePlayerOrder('station-001', 'tritanium', true, 5, 100, userId)
    expect(orderId).toBeDefined()
    expect(typeof orderId).toBe('string')
    expect(orderId.length).toBeGreaterThan(0)
  })

  it('should create a sell order and return an id', () => {
    const orderId = placePlayerOrder('station-001', 'pyerite', false, 12, 50, userId)
    expect(orderId).toBeDefined()
    expect(typeof orderId).toBe('string')
    expect(orderId.length).toBeGreaterThan(0)
  })

  it('should create distinct orders with unique ids', () => {
    const id1 = placePlayerOrder('station-001', 'mexallon', true, 40, 200, userId)
    const id2 = placePlayerOrder('station-001', 'mexallon', true, 42, 150, userId)
    expect(id1).not.toBe(id2)
  })
})

// ============================================================================
// INVENTORY
// ============================================================================

describe('addItem / removeItem', () => {
  const userId = 'inv-user-001'

  beforeAll(() => {
    getOrCreatePlayer(userId, 'hoarder@test.com')
  })

  it('should add items to inventory', () => {
    addItem(userId, 'character', 'station_hangar', 'station-001', 'tritanium', 500)
    const inv = getInventory(userId, 'station_hangar', 'station-001')
    const tritStack = inv.find(i => i.item_type_id === 'tritanium')
    expect(tritStack).toBeDefined()
    expect(tritStack!.quantity).toBe(500)
  })

  it('should stack items of the same type', () => {
    addItem(userId, 'character', 'station_hangar', 'station-001', 'tritanium', 300)
    const inv = getInventory(userId, 'station_hangar', 'station-001')
    const tritStack = inv.find(i => i.item_type_id === 'tritanium')
    expect(tritStack!.quantity).toBe(800) // 500 + 300
  })

  it('should remove items from inventory', () => {
    const result = removeItem(userId, 'station_hangar', 'station-001', 'tritanium', 200)
    expect(result).toBe(true)
    const inv = getInventory(userId, 'station_hangar', 'station-001')
    const tritStack = inv.find(i => i.item_type_id === 'tritanium')
    expect(tritStack!.quantity).toBe(600) // 800 - 200
  })

  it('should fail to remove more items than available', () => {
    const result = removeItem(userId, 'station_hangar', 'station-001', 'tritanium', 99999)
    expect(result).toBe(false)
  })

  it('should fail to remove items that do not exist in inventory', () => {
    const result = removeItem(userId, 'station_hangar', 'station-001', 'nonexistent_item', 1)
    expect(result).toBe(false)
  })

  it('should delete the stack when removing exactly all remaining quantity', () => {
    // Current trit = 600
    const result = removeItem(userId, 'station_hangar', 'station-001', 'tritanium', 600)
    expect(result).toBe(true)
    const inv = getInventory(userId, 'station_hangar', 'station-001')
    const tritStack = inv.find(i => i.item_type_id === 'tritanium')
    expect(tritStack).toBeUndefined()
  })
})

// ============================================================================
// CORPORATIONS
// ============================================================================

describe('createCorporation', () => {
  const ceoId = 'corp-ceo-001'

  beforeAll(() => {
    getOrCreatePlayer(ceoId, 'ceo@megacorp.com')
  })

  it('should create a corporation with the CEO as first member', () => {
    const corp = createCorporation('Mega Corp', 'MEGA', ceoId)
    expect(corp).toBeDefined()
    expect(corp.name).toBe('Mega Corp')
    expect(corp.ticker).toBe('MEGA')
    expect(corp.ceo_id).toBe(ceoId)
    expect(corp.member_count).toBe(1)
  })

  it('should persist the corporation and be retrievable', () => {
    const corps = createCorporation('Test Corp', 'TEST', 'corp-ceo-002')
    const fetched = getCorporation(corps.id as string)
    expect(fetched).toBeDefined()
    expect(fetched!.name).toBe('Test Corp')
  })

  it('should add the CEO as a member with ceo role', () => {
    const corp = createCorporation('Role Corp', 'ROLE', 'corp-ceo-003')
    const member = getCorpMember(corp.id as string, 'corp-ceo-003')
    expect(member).toBeDefined()
    expect(member!.role).toBe('ceo')
  })

  it('should uppercase the ticker', () => {
    const corp = createCorporation('Lower Corp', 'lower', 'corp-ceo-004')
    expect(corp.ticker).toBe('LOWER')
  })

  it('should set default tax rate to 0.05', () => {
    const corp = createCorporation('Tax Corp', 'TAXC', 'corp-ceo-005')
    expect(corp.tax_rate).toBe(0.05)
  })
})
