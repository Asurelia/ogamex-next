/**
 * Economy System
 *
 * Handles market order management, trade execution, NPC liquidity,
 * price history aggregation, and ore refining conversion.
 * All persistence via SQLite (persistence.ts).
 */

import {
  upsertNpcMarketOrder, getBuyOrders, getSellOrders,
  updateOrderVolume, insertTrade, getRecentTrades, insertPriceHistory,
} from '../services/persistence'

// ============================================================================
// TYPES
// ============================================================================

export interface MarketOrder {
  id: string
  station_id: string
  item_type_id: string
  is_buy_order: number
  price: number
  volume_remaining: number
  volume_total: number
  character_id: string | null
  issued_at: number
  expires_at: number
  min_volume: number
}

export interface TradeResult {
  buyOrderId: string
  sellOrderId: string
  itemTypeId: string
  quantity: number
  price: number
  stationId: string
}

export interface PriceHistory {
  item_type_id: string
  station_id: string
  average_price: number
  lowest_price: number
  highest_price: number
  volume: number
}

// ============================================================================
// NPC MARKET PRICES
// ============================================================================

const NPC_BASE_PRICES: Record<string, number> = {
  veldspar: 10, scordite: 15, pyroxeres: 25, plagioclase: 35, omber: 50,
  kernite: 75, jaspet: 100, hemorphite: 150, hedbergite: 200, arkonor: 500,
  tritanium: 5, pyerite: 10, mexallon: 40, isogen: 80, nocxium: 600,
  zydrine: 1200, megacyte: 3500,
  mining_laser_i: 5000, shield_booster_i: 8000, armor_repairer_i: 7500, weapon_upgrade_i: 10000,
}

const NPC_BUY_SPREAD = 0.90
const NPC_SELL_SPREAD = 1.10
const NPC_ORDER_VOLUME = 10000

// ============================================================================
// ORE REFINING
// ============================================================================

export const ORE_REFINING_RATES: Record<string, Record<string, number>> = {
  veldspar: { tritanium: 415 },
  scordite: { tritanium: 346, pyerite: 173 },
  pyroxeres: { tritanium: 351, pyerite: 25, mexallon: 50, nocxium: 5 },
  plagioclase: { tritanium: 256, pyerite: 512, mexallon: 256 },
  omber: { tritanium: 307, pyerite: 123, isogen: 307 },
  kernite: { tritanium: 386, mexallon: 773, isogen: 386 },
  jaspet: { tritanium: 259, pyerite: 259, mexallon: 518, nocxium: 259, zydrine: 8 },
  hemorphite: { tritanium: 212, isogen: 212, nocxium: 424, zydrine: 28 },
  hedbergite: { pyerite: 342, isogen: 171, nocxium: 171, zydrine: 57, megacyte: 17 },
  arkonor: { tritanium: 300, mexallon: 166, megacyte: 333 },
}

export function refineOre(oreType: string, quantity: number, efficiency: number = 0.5): Record<string, number> {
  const rates = ORE_REFINING_RATES[oreType]
  if (!rates) return {}

  const batches = quantity / 100
  const result: Record<string, number> = {}

  for (const [mineral, yieldPer100] of Object.entries(rates)) {
    const total = Math.floor(batches * yieldPer100 * efficiency)
    if (total > 0) result[mineral] = total
  }

  return result
}

// ============================================================================
// NPC ORDER GENERATION
// ============================================================================

export function generateNpcOrders(stationId: string): void {
  const nowTs = Math.floor(Date.now() / 1000)
  const expiresAt = nowTs + 30 * 24 * 60 * 60

  for (const [itemTypeId, basePrice] of Object.entries(NPC_BASE_PRICES)) {
    // NPC buy order
    upsertNpcMarketOrder(
      stationId, itemTypeId, true,
      Math.floor(basePrice * NPC_BUY_SPREAD),
      NPC_ORDER_VOLUME, nowTs, expiresAt
    )
    // NPC sell order
    upsertNpcMarketOrder(
      stationId, itemTypeId, false,
      Math.ceil(basePrice * NPC_SELL_SPREAD),
      NPC_ORDER_VOLUME, nowTs, expiresAt
    )
  }
}

// ============================================================================
// ORDER MATCHING
// ============================================================================

export function matchOrders(stationId: string, itemTypeId: string): TradeResult[] {
  const trades: TradeResult[] = []

  const buyOrders = getBuyOrders(stationId, itemTypeId) as unknown as MarketOrder[]
  if (buyOrders.length === 0) return trades

  const sellOrders = getSellOrders(stationId, itemTypeId) as unknown as MarketOrder[]
  if (sellOrders.length === 0) return trades

  let buyIdx = 0
  let sellIdx = 0

  while (buyIdx < buyOrders.length && sellIdx < sellOrders.length) {
    const buy = buyOrders[buyIdx]
    const sell = sellOrders[sellIdx]

    if (buy.price < sell.price) break

    const tradePrice = buy.issued_at <= sell.issued_at ? buy.price : sell.price
    const tradeQuantity = Math.min(buy.volume_remaining, sell.volume_remaining)

    if (tradeQuantity >= sell.min_volume && tradeQuantity >= buy.min_volume) {
      trades.push({
        buyOrderId: buy.id,
        sellOrderId: sell.id,
        itemTypeId,
        quantity: tradeQuantity,
        price: tradePrice,
        stationId,
      })

      buy.volume_remaining -= tradeQuantity
      sell.volume_remaining -= tradeQuantity
    }

    if (buy.volume_remaining <= 0) buyIdx++
    if (sell.volume_remaining <= 0) sellIdx++
  }

  // Persist
  if (trades.length > 0) {
    persistTrades(trades, buyOrders, sellOrders)
  }

  return trades
}

function persistTrades(trades: TradeResult[], buyOrders: MarketOrder[], sellOrders: MarketOrder[]): void {
  for (const buy of buyOrders) {
    if (buy.volume_remaining < buy.volume_total) {
      updateOrderVolume(buy.id, buy.volume_remaining)
    }
  }

  for (const sell of sellOrders) {
    if (sell.volume_remaining < sell.volume_total) {
      updateOrderVolume(sell.id, sell.volume_remaining)
    }
  }

  for (const t of trades) {
    insertTrade(t.buyOrderId, t.sellOrderId, t.itemTypeId, t.quantity, t.price, t.stationId)
  }
}

// ============================================================================
// PRICE HISTORY AGGREGATION
// ============================================================================

export function aggregatePriceHistory(): void {
  const oneHourAgoTs = Math.floor(Date.now() / 1000) - 3600
  const recentTrades = getRecentTrades(oneHourAgoTs)

  if (recentTrades.length === 0) return

  const groups = new Map<string, Array<{ price: number; quantity: number }>>()

  for (const trade of recentTrades) {
    const key = `${trade.item_type_id}:${trade.station_id}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push({ price: trade.price as number, quantity: trade.quantity as number })
  }

  for (const [key, trades] of groups) {
    const [itemTypeId, stationId] = key.split(':')

    let totalVolume = 0
    let totalValue = 0
    let lowest = Infinity
    let highest = 0

    for (const t of trades) {
      totalVolume += t.quantity
      totalValue += t.price * t.quantity
      if (t.price < lowest) lowest = t.price
      if (t.price > highest) highest = t.price
    }

    const averagePrice = totalVolume > 0 ? Math.round(totalValue / totalVolume) : 0

    insertPriceHistory(
      itemTypeId, stationId, averagePrice,
      lowest === Infinity ? 0 : lowest, highest, totalVolume
    )
  }
}
