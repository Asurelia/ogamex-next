import { useState, useEffect } from 'react'
import { useMarket } from '@/hooks/game/useMarket'
import type { MarketSystem } from '@/lib/game/market/market-system'
import MarketOrderTable from './MarketOrderTable'
import { ItemCategory } from '@/lib/game/inventory/inventory-types'

// Mock Categories for Demo
const CATEGORIES = [
    { id: ItemCategory.Asteroid, name: 'Asteroids & Minerals' },
    { id: ItemCategory.Module, name: 'Ship Modules' },
    { id: ItemCategory.Ship, name: 'Ships' },
    { id: ItemCategory.Charge, name: 'Ammunition & Charges' },
]

// Mock Types per Category
const TYPES: Record<number, Array<{ id: number, name: string }>> = {
    [ItemCategory.Asteroid]: [
        { id: 1, name: 'Veldspar' },
        { id: 2, name: 'Scordite' }
    ],
    [ItemCategory.Module]: [
        { id: 3, name: '125mm Railgun I' },
        { id: 4, name: 'Small Shield Extender I' }
    ]
}

interface MarketBrowserProps {
    marketSystem: MarketSystem | null
    regionID: number
    onClose?: () => void
}

export default function MarketBrowser({ marketSystem, regionID, onClose }: MarketBrowserProps) {
    const { getSellOrders, getBuyOrders, fetchOrders, loading } = useMarket(marketSystem)

    const [selectedCategory, setSelectedCategory] = useState<number>(ItemCategory.Asteroid)
    const [selectedType, setSelectedType] = useState<number | null>(1) // Default to Veldspar

    useEffect(() => {
        if (selectedType) {
            fetchOrders(regionID, selectedType, false) // Sell Orders
            fetchOrders(regionID, selectedType, true)  // Buy Orders
        }
    }, [regionID, selectedType, fetchOrders])

    const sellOrders = selectedType ? getSellOrders(regionID, selectedType) : []
    const buyOrders = selectedType ? getBuyOrders(regionID, selectedType) : []

    const bestSell = sellOrders.length > 0 ? sellOrders[0].price : 0
    const bestBuy = buyOrders.length > 0 ? buyOrders[0].price : 0
    const spread = bestSell > 0 && bestBuy > 0 ? ((bestSell - bestBuy) / bestBuy * 100).toFixed(1) : '-'

    return (
        <div className="w-[800px] h-[600px] bg-black/90 border border-gray-600 flex flex-col shadow-2xl backdrop-blur-md">
            {/* Header */}
            <div className="bg-gray-800/80 px-3 py-2 flex justify-between items-center border-b border-gray-600 cursor-move">
                <span className="font-bold text-gray-200 uppercase tracking-widest text-sm">Regional Market</span>
                <button onClick={onClose} className="text-gray-500 hover:text-red-400">✕</button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Pane: Categories & Types */}
                <div className="w-1/4 border-r border-gray-700 flex flex-col bg-gray-900/50">
                    <div className="p-2 border-b border-gray-700 bg-gray-800/30 font-bold text-xs text-gray-400 uppercase">Browse</div>
                    <div className="flex-1 overflow-y-auto">
                        {CATEGORIES.map(cat => (
                            <div key={cat.id}>
                                <div
                                    className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-700/50 ${selectedCategory === cat.id ? 'text-cyan-400 font-bold' : 'text-gray-300'}`}
                                    onClick={() => { setSelectedCategory(cat.id); setSelectedType(null); }}
                                >
                                    {cat.name}
                                </div>

                                {selectedCategory === cat.id && TYPES[cat.id]?.map(type => (
                                    <div
                                        key={type.id}
                                        className={`pl-6 py-1 text-xs cursor-pointer hover:bg-gray-700/30 ${selectedType === type.id ? 'bg-cyan-900/30 text-white' : 'text-gray-400'}`}
                                        onClick={() => setSelectedType(type.id)}
                                    >
                                        {type.name}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Pane: Market Data */}
                <div className="flex-1 flex flex-col bg-black/20">
                    {selectedType ? (
                        <>
                            {/* Item Header */}
                            <div className="p-4 border-b border-gray-700 flex justify-between items-end bg-gradient-to-r from-gray-900 via-transparent to-transparent">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">
                                        {TYPES[selectedCategory]?.find(t => t.id === selectedType)?.name || 'Unknown Item'}
                                    </h2>
                                    <div className="text-xs text-gray-400 flex gap-4">
                                        <span>Best Sell: <span className="text-green-400">{bestSell > 0 ? bestSell.toLocaleString() : 'N/A'}</span></span>
                                        <span>Best Buy: <span className="text-blue-400">{bestBuy > 0 ? bestBuy.toLocaleString() : 'N/A'}</span></span>
                                        <span>Spread: {spread}%</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1 rounded border border-green-500/50">
                                        Place Sell Order
                                    </button>
                                    <button className="bg-blue-700 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded border border-blue-500/50">
                                        Place Buy Order
                                    </button>
                                </div>
                            </div>

                            {/* Tables Container */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-4">
                                {/* Sample Chart Placeholder */}
                                <div className="h-32 border border-gray-800 bg-gray-900/30 flex items-center justify-center text-gray-600 text-xs mb-4 rounded">
                                    [Price History Chart Placeholder]
                                </div>

                                {/* Orders */}
                                <div className="grid grid-cols-2 gap-4 h-full min-h-[300px]">
                                    <div className="border border-gray-700 bg-gray-900/20 flex flex-col">
                                        <div className="bg-gray-800/50 px-2 py-1 text-xs font-bold text-gray-400 border-b border-gray-700">SELLERS</div>
                                        <div className="flex-1 overflow-y-auto">
                                            <MarketOrderTable orders={sellOrders} type="sell" />
                                        </div>
                                    </div>
                                    <div className="border border-gray-700 bg-gray-900/20 flex flex-col">
                                        <div className="bg-gray-800/50 px-2 py-1 text-xs font-bold text-gray-400 border-b border-gray-700">BUYERS</div>
                                        <div className="flex-1 overflow-y-auto">
                                            <MarketOrderTable orders={buyOrders} type="buy" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 italic">
                            Select an item group to verify market data.
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-gray-700 bg-gray-900/50 flex justify-between text-xs text-gray-500">
                <span>Market Data Delay: Real-time</span>
                <span>Region: The Forge (ID: {regionID})</span>
            </div>
        </div>
    )
}
