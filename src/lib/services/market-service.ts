import { getSupabaseClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import type { MarketOrder, PriceHistoryEntry, OrderState } from '@/lib/game/market/market-types'

type DbMarketOrder = Database['public']['Tables']['market_orders']['Row']

export class MarketService {
    private static supabase = getSupabaseClient()

    /**
     * Fetch active orders for a specific item in a region.
     */
    static async getOrders(regionID: number, typeID: number, isBuyOrder: boolean): Promise<MarketOrder[]> {
        const { data, error } = await this.supabase
            .from('market_orders')
            .select('*')
            .eq('region_id', regionID)
            .eq('type_id', typeID)
            .eq('is_buy_order', isBuyOrder)
            .eq('state', 0) // Open
            .gt('expires_at', new Date().toISOString())

        if (error) {
            console.error('Error fetching market orders:', error)
            return []
        }

        return data.map(this.mapDbOrderToMarketOrder)
    }

    /**
     * Place a new order.
     */
    static async placeOrder(order: Omit<MarketOrder, 'orderID' | 'state' | 'issuedTimestamp'>): Promise<number | null> {
        const { data, error } = await this.supabase
            .from('market_orders')
            .insert({
                character_id: '00000000-0000-0000-0000-000000000000', // Mock User ID for now, should come from auth
                type_id: order.typeID,
                region_id: order.regionID,
                station_id: order.stationID,
                is_buy_order: order.type === 0, // Buy=0, Sell=1 in Types but boolean in DB. Fix enum mapping!
                price: order.price,
                volume_total: order.volumeTotal,
                volume_remaining: order.volumeTotal,
                min_volume: order.minVolume,
                duration: order.duration,
                issued_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + order.duration * 86400 * 1000).toISOString(),
                state: 0, // Open
                escrow: order.escrow
            })
            .select('id')
            .single()

        if (error) {
            console.error('Error placing order:', error)
            return null
        }

        return data.id
    }

    /**
     * Cancel an order.
     */
    static async cancelOrder(orderID: number): Promise<boolean> {
        const { error } = await this.supabase
            .from('market_orders')
            .update({ state: 3 }) // Cancelled
            .eq('id', orderID)

        return !error
    }

    // Helper: Map DB to Game Type
    private static mapDbOrderToMarketOrder(dbOrder: DbMarketOrder): MarketOrder {
        return {
            orderID: dbOrder.id,
            characterID: 0, // Need to map UUID to int or change Game Type to string
            corporationID: 0,
            type: dbOrder.is_buy_order ? 0 : 1, // Buy=0, Sell=1
            state: dbOrder.state, // Map Enum
            typeID: dbOrder.type_id,
            regionID: dbOrder.region_id,
            stationID: dbOrder.station_id,
            price: Number(dbOrder.price),
            volumeTotal: dbOrder.volume_total,
            volumeRemaining: dbOrder.volume_remaining,
            minVolume: dbOrder.min_volume,
            duration: dbOrder.duration,
            issuedTimestamp: new Date(dbOrder.issued_at).getTime() / 1000,
            expiryTimestamp: dbOrder.expires_at ? new Date(dbOrder.expires_at).getTime() / 1000 : 0,
            isCorp: false,
            escrow: Number(dbOrder.escrow)
        }
    }
}
