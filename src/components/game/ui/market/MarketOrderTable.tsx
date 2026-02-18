import type { MarketOrder } from '@/lib/game/market/market-types'

interface MarketOrderTableProps {
    orders: MarketOrder[]
    type: 'buy' | 'sell'
    onOrderClick?: (order: MarketOrder) => void
}

export default function MarketOrderTable({ orders, type, onOrderClick }: MarketOrderTableProps) {
    if (orders.length === 0) {
        return <div className="p-4 text-center text-gray-500 text-xs italic">No {type} orders available</div>
    }

    return (
        <table className="w-full text-left text-xs border-collapse">
            <thead>
                <tr className="text-gray-500 border-b border-gray-700">
                    <th className="pb-1 pl-2">Jumps</th>
                    <th className="pb-1">{type === 'sell' ? 'Quantity' : 'Vol Rem'}</th>
                    <th className="pb-1 text-right pr-2">Price</th>
                    <th className="pb-1 text-right pr-2">Location</th>
                    <th className="pb-1 text-right pr-2">Expires</th>
                </tr>
            </thead>
            <tbody>
                {orders.map((order) => (
                    <tr
                        key={order.orderID}
                        className={`
                            border-b border-gray-800 cursor-pointer transition-colors
                            ${type === 'sell' ? 'hover:bg-green-900/20 text-green-100' : 'hover:bg-blue-900/20 text-blue-100'}
                        `}
                        onClick={() => onOrderClick?.(order)}
                    >
                        <td className="py-1 pl-2 text-gray-400">0</td> {/* Mock Distance */}
                        <td className="py-1">{order.volumeRemaining.toLocaleString()}</td>
                        <td className="py-1 text-right pr-2 font-mono text-yellow-500">
                            {order.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-1 text-right pr-2 text-gray-400 truncate max-w-[100px]">Station {order.stationID}</td>
                        <td className="py-1 text-right pr-2 text-gray-500">
                            {Math.ceil((order.expiryTimestamp - Date.now() / 1000) / 86400)}d
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}
