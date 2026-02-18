/**
 * Market System Types
 * 
 * Ported from C# OGameX.SharedLib.Market (MarketSystem.cs)
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const MARKET_CONSTANTS = {
    BASE_COMMISSION: 0.01,
    BASE_SALES_TAX: 0.02,
    DEFAULT_ORDER_DURATION: 90, // days

    // Skill-based limits
    BASE_ORDER_COUNT: 5,
    TRADE_PER_LEVEL: 4,
    RETAIL_PER_LEVEL: 8,
    WHOLESALE_PER_LEVEL: 16,
    TYCOON_PER_LEVEL: 32,

    MARGIN_TRADING_BASE: 0.75,
} as const

// ============================================================================
// ENUMS
// ============================================================================

export enum OrderType {
    Buy = 0,
    Sell = 1,
}

export enum OrderState {
    Open = 0,
    Fulfilled = 1,
    Expired = 2,
    Cancelled = 3,
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * A market order — buy or sell.
 */
export interface MarketOrder {
    orderID: number
    characterID: number
    corporationID: number
    type: OrderType
    state: OrderState
    typeID: number
    regionID: number
    stationID: number
    price: number
    volumeTotal: number
    volumeRemaining: number
    minVolume: number
    duration: number        // days
    issuedTimestamp: number // unix seconds
    expiryTimestamp: number // unix seconds
    isCorp: boolean
    escrow: number          // ISK held for buy orders
}

/**
 * Price history entry for a type in a region.
 */
export interface PriceHistoryEntry {
    timestamp: number       // day timestamp
    average: number
    high: number
    low: number
    volume: number          // units traded
    orderCount: number
}

/**
 * Player market skill levels for fee/limit calculations.
 */
export interface MarketSkills {
    trade: number
    retail: number
    wholesale: number
    tycoon: number
    accounting: number
    brokerRelations: number
    marginTrading: number
    marketing: number       // sell order range
    procurement: number     // buy order range
    visibility: number      // order visibility range
    daytrading: number      // modify range
}
