'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DataCardInventory, VaultView } from '@/components/game/cartography'

type Tab = 'inventory' | 'vault'

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('inventory')

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-white">Inventaire</h1>
        <p className="text-gray-400 mt-1">
          Gérez vos cartes de données et objets d'exploration
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'inventory'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <span className="mr-2">📜</span>
          Cartes de Données
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'vault'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <span className="mr-2">🏦</span>
          Coffre
        </button>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'inventory' && (
          <DataCardInventory userId="" />
        )}
        {activeTab === 'vault' && (
          <VaultView userId="" />
        )}
      </motion.div>
    </div>
  )
}
