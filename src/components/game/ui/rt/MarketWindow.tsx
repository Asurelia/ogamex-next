'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'

// ============================================================================
// TYPES
// ============================================================================

type MarketTab = 'buy' | 'sell' | 'myorders'

// ============================================================================
// MARKET CONTENT
// ============================================================================

const MarketContent = memo(function MarketContent() {
  const { marketOrders, placeOrder } = useRTGameStore()
  const [activeTab, setActiveTab] = useState<MarketTab>('buy')
  const [formItem, setFormItem] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formQty, setFormQty] = useState('')

  const filteredOrders = useMemo(() => {
    if (activeTab === 'myorders') return marketOrders.filter((o) => o.isOwn)
    return marketOrders.filter((o) => o.type === activeTab)
  }, [marketOrders, activeTab])

  const handlePlace = useCallback(() => {
    const price = parseFloat(formPrice)
    const qty = parseInt(formQty, 10)
    if (!formItem.trim() || isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) return
    placeOrder(formItem.trim(), price, qty, activeTab === 'sell' ? 'sell' : 'buy')
    setFormItem('')
    setFormPrice('')
    setFormQty('')
  }, [formItem, formPrice, formQty, activeTab, placeOrder])

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {([
          { key: 'buy' as MarketTab, label: 'Buy Orders', color: 'text-green-400' },
          { key: 'sell' as MarketTab, label: 'Sell Orders', color: 'text-red-400' },
          { key: 'myorders' as MarketTab, label: 'My Orders', color: 'text-cyan-400' },
        ]).map((tab) => (
          <button
            key={tab.key}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? `${tab.color} border-b-2 border-current bg-slate-800/50`
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_80px_60px_50px] gap-1 px-2 py-1 bg-slate-800/50 border-b border-slate-700 text-slate-400">
        <span>Item</span>
        <span className="text-right">Price</span>
        <span className="text-right">Qty</span>
        <span className="text-center">Type</span>
      </div>

      {/* Order List */}
      <div className="flex-1 overflow-y-auto">
        {filteredOrders.length === 0 && (
          <div className="text-center text-slate-500 py-4">No orders</div>
        )}
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="grid grid-cols-[1fr_80px_60px_50px] gap-1 px-2 py-1 hover:bg-slate-800/30 items-center"
          >
            <span className="text-slate-200 truncate">{order.itemName}</span>
            <span className="text-right text-yellow-300">{order.price.toLocaleString()}</span>
            <span className="text-right text-slate-300">{order.quantity.toLocaleString()}</span>
            <span
              className={`text-center text-[10px] px-1 py-0.5 rounded ${
                order.type === 'buy'
                  ? 'bg-green-900/40 text-green-400'
                  : 'bg-red-900/40 text-red-400'
              }`}
            >
              {order.type.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      {/* Place Order Form */}
      {activeTab !== 'myorders' && (
        <div className="border-t border-slate-700 p-2 space-y-1.5">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider">
            Place {activeTab === 'buy' ? 'Buy' : 'Sell'} Order
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={formItem}
              onChange={(e) => setFormItem(e.target.value)}
              placeholder="Item name"
              className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600"
            />
          </div>
          <div className="flex gap-1">
            <input
              type="number"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              placeholder="Price"
              min="0"
              step="0.01"
              className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600"
            />
            <input
              type="number"
              value={formQty}
              onChange={(e) => setFormQty(e.target.value)}
              placeholder="Qty"
              min="1"
              step="1"
              className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600"
            />
            <button
              onClick={handlePlace}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'buy'
                  ? 'bg-green-700/50 hover:bg-green-600/50 text-green-300'
                  : 'bg-red-700/50 hover:bg-red-600/50 text-red-300'
              }`}
            >
              Place
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

// ============================================================================
// EXPORT
// ============================================================================

export function MarketWindow() {
  return (
    <ManagedWindow
      id="rt-market"
      title="Market"
      icon="💰"
      defaultPosition={{ x: 250, y: 120 }}
      defaultSize={{ width: 420, height: 400 }}
      minWidth={340}
      minHeight={280}
    >
      <MarketContent />
    </ManagedWindow>
  )
}
