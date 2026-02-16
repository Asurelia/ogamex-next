'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DataCardInventory, VaultView } from '@/components/game/cartography'
import { useGameStore } from '@/stores/gameStore'

type Tab = 'inventory' | 'vault'

export default function InventoryPage() {
  const { user } = useGameStore()
  const [activeTab, setActiveTab] = useState<Tab>('inventory')

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-white">Inventaire</h1>
        <p className="text-gray-400 mt-1">
          Gerez vos cartes de donnees et objets d'exploration
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
          Cartes de Donnees
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'vault'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
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
          <DataCardInventory userId={user.id} />
        )}
        {activeTab === 'vault' && (
          <VaultView userId={user.id} />
        )}
      </motion.div>
    </div>
  )
}
