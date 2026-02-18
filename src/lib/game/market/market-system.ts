/**
 * Market System Logic
 * 
 * Ported from C# OGameX.SharedLib.Market (MarketSystem.cs)
 */

import {
    MARKET_CONSTANTS,
    OrderType,
    OrderState,
    type MarketOrder,
    type PriceHistoryEntry,
    type MarketSkills
} from './market-types'

// ============================================================================
// MARKET FORMULAS
// ============================================================================

export const MarketFormulas = {
    /**
     * Broker fee for placing an order.
     * Formula: max(0.01 * (1 - 0.05*brSkill) * 2^(-2*wStanding) * orderValue, 100)
     */
    brokerFee(brokerRelationsLevel: number, factionStanding: number, corpStanding: number, orderValue: number): number {
        const wStanding = (0.7 * factionStanding + 0.3 * corpStanding) / 10.0

        // 2^(-2 * wStanding)
        const standingFactor = Math.pow(2, -2 * wStanding)

        const fee = 0.01 * (1.0 - 0.05 * brokerRelationsLevel) * standingFactor

        return Math.max(fee * orderValue, 100.0)
    },

    /**
     * Relist fee when modifying an existing order.
     */
    relistFee(oldPrice: number, newPrice: number, brokerPercent: number = 0.01, discount: number = 0): number {
        // max(0, brokerPercent * (newPrice - oldPrice)) + scale fee
        const diffFee = Math.max(0, brokerPercent * (newPrice - oldPrice))
        const baseFee = (1 - discount) * brokerPercent * newPrice
        // Simplified from C# logic which seemed to double count or have a specific logic.
        // C# code: Math.Max(0, brokerPercent * (newPrice - oldPrice)) + (1 - discount) * brokerPercent * newPrice;
        return diffFee + baseFee
    },

    /**
     * Sales tax applied when a sell order is filled.
     * Formula: baseTax * (1 - 0.1 * accountingLevel)
     */
    salesTax(baseSalesTax: number, accountingLevel: number): number {
        const maximumTax = baseSalesTax // e.g. 0.02
        const tax = maximumTax * (1 - 0.1 * accountingLevel)
        return Math.min(tax, maximumTax)
    },

    /**
     * Maximum number of active orders for a character.
     */
    maxOrderCount(skills: MarketSkills): number {
        return MARKET_CONSTANTS.BASE_ORDER_COUNT
            + skills.trade * MARKET_CONSTANTS.TRADE_PER_LEVEL
            + skills.retail * MARKET_CONSTANTS.RETAIL_PER_LEVEL
            + skills.wholesale * MARKET_CONSTANTS.WHOLESALE_PER_LEVEL
            + skills.tycoon * MARKET_CONSTANTS.TYCOON_PER_LEVEL
    },

    /**
     * Escrow required for margin trading buy orders.
     * Formula: orderCost * 0.75^marginTradingLevel
     */
    marginTradingEscrow(orderCost: number, marginTradingLevel: number): number {
        return orderCost * Math.pow(MARKET_CONSTANTS.MARGIN_TRADING_BASE, marginTradingLevel)
    }
}

// ============================================================================
// MARKET SYSTEM
// ============================================================================

export class MarketSystem {
    private _orders: Map<number, MarketOrder> = new Map()
    // Key: `${regionID}_${typeID}`
    private _priceHistory: Map<string, PriceHistoryEntry[]> = new Map()
    private _nextOrderID = 1

    // Events
    public onOrderPlaced?: (order: MarketOrder) => void
    public onOrderFilled?: (order: MarketOrder, qtyFilled: number) => void
    public onOrderCancelled?: (order: MarketOrder) => void
    public onOrderExpired?: (order: MarketOrder) => void

    // =====================================
    // QUERIES
    // =====================================

    getSellOrders(regionID: number, typeID: number): MarketOrder[] {
        return Array.from(this._orders.values())
            .filter(o =>
                o.regionID === regionID &&
                o.typeID === typeID &&
                o.type === OrderType.Sell &&
                o.state === OrderState.Open
            )
            .sort((a, b) => a.price - b.price) // Lowest price first
    }

    getBuyOrders(regionID: number, typeID: number): MarketOrder[] {
        return Array.from(this._orders.values())
            .filter(o =>
                o.regionID === regionID &&
                o.typeID === typeID &&
                o.type === OrderType.Buy &&
                o.state === OrderState.Open
            )
            .sort((a, b) => b.price - a.price) // Highest price first
    }

    getCharacterOrders(characterID: number): MarketOrder[] {
        return Array.from(this._orders.values())
            .filter(o => o.characterID === characterID && o.state === OrderState.Open)
    }

    getPriceHistory(regionID: number, typeID: number): PriceHistoryEntry[] {
        const key = `${regionID}_${typeID}`
        return this._priceHistory.get(key) || []
    }

    // =====================================
    // ACTIONS
    // =====================================

    placeSellOrder(
        characterID: number,
        typeID: number,
        regionID: number,
        stationID: number,
        price: number,
        quantity: number,
        duration: number,
        skills: MarketSkills
        // standing args removed for simplicity/context access
    ): number {
        const activeOrders = this.getCharacterOrders(characterID).length
        if (activeOrders >= MarketFormulas.maxOrderCount(skills)) return -1

        const orderID = this._nextOrderID++
        const now = Math.floor(Date.now() / 1000)

        const order: MarketOrder = {
            orderID,
            characterID,
            corporationID: 0, // TODO
            type: OrderType.Sell,
            state: OrderState.Open,
            typeID,
            regionID,
            stationID,
            price,
            volumeTotal: quantity,
            volumeRemaining: quantity,
            minVolume: 1,
            duration,
            issuedTimestamp: now,
            expiryTimestamp: now + duration * 86400,
            isCorp: false,
            escrow: 0
        }

        this._orders.set(orderID, order)
        this.onOrderPlaced?.(order)

        this.tryMatchSellOrder(order)
        return orderID
    }

    placeBuyOrder(
        characterID: number,
        typeID: number,
        regionID: number,
        stationID: number,
        price: number,
        quantity: number,
        duration: number,
        minVolume: number,
        skills: MarketSkills
    ): number {
        const activeOrders = this.getCharacterOrders(characterID).length
        if (activeOrders >= MarketFormulas.maxOrderCount(skills)) return -1

        const orderID = this._nextOrderID++
        const now = Math.floor(Date.now() / 1000)

        // Calculate Escrow
        const totalCost = price * quantity
        const escrow = MarketFormulas.marginTradingEscrow(totalCost, skills.marginTrading)

        const order: MarketOrder = {
            orderID,
            characterID,
            corporationID: 0,
            type: OrderType.Buy,
            state: OrderState.Open,
            typeID,
            regionID,
            stationID,
            price,
            volumeTotal: quantity,
            volumeRemaining: quantity,
            minVolume: Math.max(1, minVolume),
            duration,
            issuedTimestamp: now,
            expiryTimestamp: now + duration * 86400,
            isCorp: false,
            escrow
        }

        this._orders.set(orderID, order)
        this.onOrderPlaced?.(order)

        this.tryMatchBuyOrder(order)
        return orderID
    }

    cancelOrder(orderID: number, characterID: number): boolean {
        const order = this._orders.get(orderID)
        if (!order) return false
        if (order.characterID !== characterID) return false
        if (order.state !== OrderState.Open) return false

        order.state = OrderState.Cancelled
        this.onOrderCancelled?.(order)
        return true
    }

    // =====================================
    // MATCHING ENGINE
    // =====================================

    private tryMatchSellOrder(sellOrder: MarketOrder) {
        const buyOrders = this.getBuyOrders(sellOrder.regionID, sellOrder.typeID)

        for (const buy of buyOrders) {
            if (sellOrder.volumeRemaining <= 0) break
            if (buy.price < sellOrder.price) break // No match possible (sorted desc)
            if (sellOrder.volumeRemaining < buy.minVolume) continue

            const fillQty = Math.min(sellOrder.volumeRemaining, buy.volumeRemaining)
            this.executeTrade(buy, sellOrder, fillQty, buy.price)
        }
    }

    private tryMatchBuyOrder(buyOrder: MarketOrder) {
        const sellOrders = this.getSellOrders(buyOrder.regionID, buyOrder.typeID)

        for (const sell of sellOrders) {
            if (buyOrder.volumeRemaining <= 0) break
            if (sell.price > buyOrder.price) break // No match possible (sorted asc)

            // Buy order minVolume check vs sell order? 
            // Usually standard matching just takes what it can, but strict minVolume might prevent partial fills.
            // Logic from C#: int fillQty = Math.Min(buyOrder.VolumeRemaining, sell.VolumeRemaining);

            const fillQty = Math.min(buyOrder.volumeRemaining, sell.volumeRemaining)
            // Check if this fill satisfies min volume ONLY IF it's the total trade? 
            // The C# logic didn't strictly block small chunks from *singular* sell orders if the BUY order had minVolume?
            // Wait, C# code: if (sellOrder.VolumeRemaining < buy.MinVolume) continue; in TryMatchSellOrder.
            // In TryMatchBuyOrder, it just fills.

            this.executeTrade(buyOrder, sell, fillQty, sell.price)
        }
    }

    private executeTrade(buyOrder: MarketOrder, sellOrder: MarketOrder, quantity: number, price: number) {
        buyOrder.volumeRemaining -= quantity
        sellOrder.volumeRemaining -= quantity

        this.onOrderFilled?.(buyOrder, quantity)
        this.onOrderFilled?.(sellOrder, quantity)

        if (buyOrder.volumeRemaining <= 0) buyOrder.state = OrderState.Fulfilled
        if (sellOrder.volumeRemaining <= 0) sellOrder.state = OrderState.Fulfilled

        this.recordTrade(buyOrder.regionID, buyOrder.typeID, price, quantity)
    }

    // =====================================
    // HISTORY
    // =====================================

    private recordTrade(regionID: number, typeID: number, price: number, quantity: number) {
        const key = `${regionID}_${typeID}`
        if (!this._priceHistory.has(key)) {
            this._priceHistory.set(key, [])
        }

        const history = this._priceHistory.get(key)!

        // Day timestamp (UTC midnight)
        const now = new Date()
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime() / 1000

        const lastEntry = history.length > 0 ? history[history.length - 1] : null

        if (lastEntry && lastEntry.timestamp === today) {
            lastEntry.high = Math.max(lastEntry.high, price)
            lastEntry.low = Math.min(lastEntry.low, price)
            lastEntry.orderCount++

            // Update weighted average
            // newAvg = (oldAvg * oldVol + price * newQty) / (oldVol + newQty)
            const totalVol = lastEntry.volume + quantity
            lastEntry.average = ((lastEntry.average * lastEntry.volume) + (price * quantity)) / totalVol
            lastEntry.volume = totalVol
        } else {
            history.push({
                timestamp: today,
                average: price,
                high: price,
                low: price,
                volume: quantity,
                orderCount: 1
            })
        }
    }
}
