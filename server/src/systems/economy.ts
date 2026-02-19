/**
 * Economy System
 *
 * Handles market order management, trade execution, NPC liquidity,
 * price history aggregation, and ore refining conversion.
 */

import { getSupabaseAdmin } from '../db/supabase'

// ============================================================================
// TYPES
// ============================================================================

export interface MarketOrder {
  id: string
  station_id: string
  item_type_id: string
  is_buy_order: boolean
  price: number
  volume_remaining: number
  volume_total: number
  character_id: string | null // null = NPC order
  issued_at: string
  expires_at: string
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
  timestamp: string
}

// ============================================================================
// NPC MARKET PRICES
// ============================================================================

/**
 * Base NPC prices for common items.
 * NPC orders provide liquidity at slightly unfavorable prices to encourage
 * player-to-player trading.
 */
const NPC_BASE_PRICES: Record<string, number> = {
  // Ores
  veldspar: 10,
  scordite: 15,
  pyroxeres: 25,
  plagioclase: 35,
  omber: 50,
  kernite: 75,
  jaspet: 100,
  hemorphite: 150,
  hedbergite: 200,
  arkonor: 500,

  // Refined minerals
  tritanium: 5,
  pyerite: 10,
  mexallon: 40,
  isogen: 80,
  nocxium: 600,
  zydrine: 1200,
  megacyte: 3500,

  // Basic modules
  mining_laser_i: 5000,
  shield_booster_i: 8000,
  armor_repairer_i: 7500,
  weapon_upgrade_i: 10000,
}

/** NPC buy orders are placed at 90% of base price */
const NPC_BUY_SPREAD = 0.90

/** NPC sell orders are placed at 110% of base price */
const NPC_SELL_SPREAD = 1.10

/** Default NPC order volume */
const NPC_ORDER_VOLUME = 10000

// ============================================================================
// ORE REFINING
// ============================================================================

/**
 * Refining conversion rates: ore type -> mineral yields per 100 units of ore.
 */
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

/**
 * Calculate refined materials from a batch of ore.
 *
 * @param oreType     The type of ore being refined
 * @param quantity    The quantity of ore in units
 * @param efficiency  Refining efficiency (0.0 - 1.0), default 0.5 (50%)
 * @returns Map of mineral type -> quantity produced
 */
export function refineOre(
  oreType: string,
  quantity: number,
  efficiency: number = 0.5
): Record<string, number> {
  const rates = ORE_REFINING_RATES[oreType]
  if (!rates) return {}

  const batches = quantity / 100
  const result: Record<string, number> = {}

  for (const [mineral, yieldPer100] of Object.entries(rates)) {
    const total = Math.floor(batches * yieldPer100 * efficiency)
    if (total > 0) {
      result[mineral] = total
    }
  }

  return result
}

// ============================================================================
// NPC ORDER GENERATION
// ============================================================================

/**
 * Generate NPC market orders for a station to provide baseline liquidity.
 * Creates buy and sell orders at NPC spread prices.
 */
export async function generateNpcOrders(stationId: string): Promise<void> {
  const db = getSupabaseAdmin()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

  const orders: Array<Omit<MarketOrder, 'id'>> = []

  for (const [itemTypeId, basePrice] of Object.entries(NPC_BASE_PRICES)) {
    // NPC buy order (players sell to NPC at lower price)
    orders.push({
      station_id: stationId,
      item_type_id: itemTypeId,
      is_buy_order: true,
      price: Math.floor(basePrice * NPC_BUY_SPREAD),
      volume_remaining: NPC_ORDER_VOLUME,
      volume_total: NPC_ORDER_VOLUME,
      character_id: null,
      issued_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      min_volume: 1,
    })

    // NPC sell order (players buy from NPC at higher price)
    orders.push({
      station_id: stationId,
      item_type_id: itemTypeId,
      is_buy_order: false,
      price: Math.ceil(basePrice * NPC_SELL_SPREAD),
      volume_remaining: NPC_ORDER_VOLUME,
      volume_total: NPC_ORDER_VOLUME,
      character_id: null,
      issued_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      min_volume: 1,
    })
  }

  const { error } = await db
    .from('rt_market_orders')
    .upsert(orders, { onConflict: 'station_id,item_type_id,is_buy_order,character_id' })

  if (error) {
    console.error('[Economy] Failed to generate NPC orders:', error.message)
  }
}

// ============================================================================
// ORDER MATCHING
// ============================================================================

/**
 * Match buy and sell orders for an item at a station.
 * Executes trades when a buy price >= sell price (price-time priority).
 *
 * @returns Array of executed trades
 */
export async function matchOrders(
  stationId: string,
  itemTypeId: string
): Promise<TradeResult[]> {
  const db = getSupabaseAdmin()
  const trades: TradeResult[] = []

  // Load buy orders (highest price first)
  const { data: buyOrders, error: buyError } = await db
    .from('rt_market_orders')
    .select('*')
    .eq('station_id', stationId)
    .eq('item_type_id', itemTypeId)
    .eq('is_buy_order', true)
    .gt('volume_remaining', 0)
    .order('price', { ascending: false })
    .order('issued_at', { ascending: true })

  if (buyError || !buyOrders || buyOrders.length === 0) return trades

  // Load sell orders (lowest price first)
  const { data: sellOrders, error: sellError } = await db
    .from('rt_market_orders')
    .select('*')
    .eq('station_id', stationId)
    .eq('item_type_id', itemTypeId)
    .eq('is_buy_order', false)
    .gt('volume_remaining', 0)
    .order('price', { ascending: true })
    .order('issued_at', { ascending: true })

  if (sellError || !sellOrders || sellOrders.length === 0) return trades

  // Match orders
  let buyIdx = 0
  let sellIdx = 0

  while (buyIdx < buyOrders.length && sellIdx < sellOrders.length) {
    const buy = buyOrders[buyIdx] as MarketOrder
    const sell = sellOrders[sellIdx] as MarketOrder

    // No match if buy price < sell price
    if (buy.price < sell.price) break

    // Execute at the earlier order's price (price-time priority)
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

  // Persist order volume updates and create trade records
  if (trades.length > 0) {
    await persistTrades(trades, buyOrders as MarketOrder[], sellOrders as MarketOrder[])
  }

  return trades
}

/**
 * Persist trade execution results to the database.
 */
async function persistTrades(
  trades: TradeResult[],
  buyOrders: MarketOrder[],
  sellOrders: MarketOrder[]
): Promise<void> {
  const db = getSupabaseAdmin()

  // Update buy order volumes
  for (const buy of buyOrders) {
    if (buy.volume_remaining < (buy as MarketOrder).volume_total) {
      await db
        .from('rt_market_orders')
        .update({ volume_remaining: buy.volume_remaining })
        .eq('id', buy.id)
    }
  }

  // Update sell order volumes
  for (const sell of sellOrders) {
    if (sell.volume_remaining < (sell as MarketOrder).volume_total) {
      await db
        .from('rt_market_orders')
        .update({ volume_remaining: sell.volume_remaining })
        .eq('id', sell.id)
    }
  }

  // Record trades in trade history
  const tradeRecords = trades.map(t => ({
    buy_order_id: t.buyOrderId,
    sell_order_id: t.sellOrderId,
    item_type_id: t.itemTypeId,
    quantity: t.quantity,
    price: t.price,
    station_id: t.stationId,
    executed_at: new Date().toISOString(),
  }))

  const { error } = await db
    .from('rt_trade_history')
    .insert(tradeRecords)

  if (error) {
    console.error('[Economy] Failed to record trades:', error.message)
  }
}

// ============================================================================
// PRICE HISTORY AGGREGATION
// ============================================================================

/**
 * Aggregate hourly price history from recent trades.
 * Should be called once per hour by a scheduled task.
 */
export async function aggregatePriceHistory(): Promise<void> {
  const db = getSupabaseAdmin()

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // Load recent trades grouped by item and station
  const { data: recentTrades, error } = await db
    .from('rt_trade_history')
    .select('item_type_id, station_id, price, quantity')
    .gte('executed_at', oneHourAgo)

  if (error || !recentTrades || recentTrades.length === 0) return

  // Group by item_type_id + station_id
  const groups = new Map<string, Array<{ price: number; quantity: number }>>()

  for (const trade of recentTrades) {
    const key = `${trade.item_type_id}:${trade.station_id}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push({ price: trade.price, quantity: trade.quantity })
  }

  // Calculate aggregates
  const historyRecords: PriceHistory[] = []

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

    historyRecords.push({
      item_type_id: itemTypeId,
      station_id: stationId,
      average_price: averagePrice,
      lowest_price: lowest === Infinity ? 0 : lowest,
      highest_price: highest,
      volume: totalVolume,
      timestamp: new Date().toISOString(),
    })
  }

  if (historyRecords.length > 0) {
    const { error: insertError } = await db
      .from('rt_price_history')
      .insert(historyRecords)

    if (insertError) {
      console.error('[Economy] Failed to insert price history:', insertError.message)
    }
  }
}
