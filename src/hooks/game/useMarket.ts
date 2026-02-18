import { useState, useEffect, useCallback } from 'react'
import { MarketService } from '@/lib/services/market-service'
import type { MarketOrder, MarketSkills } from '@/lib/game/market/market-types'

/**
 * Hook to interact with the Market System via Supabase
 */
export function useMarket(marketSystem: any | null) { // Type loose for now as we transition away from class instance
    // Local state for cached orders to avoid spamming DB
    const [ordersCache, setOrdersCache] = useState<Record<string, MarketOrder[]>>({})
    const [loading, setLoading] = useState(false)

    // Helper key generator
    const getCacheKey = (regionID: number, typeID: number, isBuy: boolean) => `${regionID}-${typeID}-${isBuy}`

    // Fetch Orders
    const fetchOrders = useCallback(async (regionID: number, typeID: number, isBuy: boolean) => {
        const key = getCacheKey(regionID, typeID, isBuy)

        // Return cached if recent? For now, always fetch to be safe or simple
        setLoading(true)
        const orders = await MarketService.getOrders(regionID, typeID, isBuy)
        setLoading(false)

        setOrdersCache(prev => ({
            ...prev,
            [key]: orders
        }))

        return orders
    }, [])

    const getSellOrders = useCallback((regionID: number, typeID: number) => {
        // This is a synchronous getter in the component render loop
        // We need to trigger a fetch if not present, but for now we'll assume the component
        // calls a "search" or "load" effect. 
        // To keep the API compatible with the UI component:
        const key = getCacheKey(regionID, typeID, false)
        return ordersCache[key] || []
    }, [ordersCache])

    const getBuyOrders = useCallback((regionID: number, typeID: number) => {
        const key = getCacheKey(regionID, typeID, true)
        return ordersCache[key] || []
    }, [ordersCache])

    // Effect to auto-fetch when asked (naive implementation for demo)
    // In a real app, `MarketBrowser` would trigger `fetchOrders` on selection change

    // Actions
    const placeSellOrder = useCallback(async (
        characterID: number,
        typeID: number,
        regionID: number,
        stationID: number,
        price: number,
        quantity: number,
        duration: number,
        skills: MarketSkills
    ) => {
        // Calculate fees locally or on server? 
        // For Supabase, we just insert.
        // We need volumeTotal, etc.
        const orderData = {
            characterID,
            typeID,
            regionID,
            stationID,
            price,
            volumeTotal: quantity,
            volumeRemaining: quantity,
            minVolume: 1,
            duration,
            type: 1, // Sell
            escrow: 0,
            isCorp: false // Default
        }

        const id = await MarketService.placeOrder(orderData as any)

        // Invalidate cache
        if (id) {
            console.log("Order placed:", id)
            // simplified: clear cache to force refetch
            setOrdersCache({})
        }

        return id ? 0 : -1 // 0 = Success in old system
    }, [])

    const placeBuyOrder = useCallback(async (
        characterID: number,
        typeID: number,
        regionID: number,
        stationID: number,
        price: number,
        quantity: number,
        duration: number,
        minVolume: number,
        skills: MarketSkills
    ) => {
        const orderData = {
            characterID,
            typeID,
            regionID,
            stationID,
            price,
            volumeTotal: quantity,
            volumeRemaining: quantity,
            minVolume,
            duration,
            type: 0, // Buy
            escrow: price * quantity, // Simplified escrow
            isCorp: false
        }

        const id = await MarketService.placeOrder(orderData as any)

        if (id) {
            setOrdersCache({})
        }

        return id ? 0 : -1
    }, [])

    return {
        getSellOrders,
        getBuyOrders,
        fetchOrders, // Expose this so UI can trigger loads
        placeSellOrder,
        placeBuyOrder,
        loading
    }
}
