'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DataCardDisplay } from './DataCardDisplay'
import { CardCreationProgress } from './CardCreationProgress'
import type { InventoryItem, CardCreationQueueItem, CardRarity, CardType } from '@/lib/exploration'

interface DataCardInventoryProps {
  userId: string
}

const RARITY_FILTERS: CardRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const TYPE_FILTERS: CardType[] = ['system_map', 'galaxy_map', 'resource_map', 'route_map', 'wormhole_map', 'special_map']

export function DataCardInventory({ userId }: DataCardInventoryProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [queue, setQueue] = useState<CardCreationQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [rarityFilter, setRarityFilter] = useState<CardRarity | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<CardType | 'all'>('all')
  const [selectedCard, setSelectedCard] = useState<InventoryItem | null>(null)

  useEffect(() => {
    loadInventory()
    loadQueue()
  }, [])

  const loadInventory = async () => {
    try {
      const response = await fetch('/api/v1/cartography')
      const data = await response.json()
      if (data.success) {
        setItems(data.data.cards)
      }
    } catch (error) {
      console.error('Failed to load inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadQueue = async () => {
    try {
      const response = await fetch('/api/v1/cartography/queue')
      const data = await response.json()
      if (data.success) {
        setQueue(data.data.queue)
      }
    } catch (error) {
      console.error('Failed to load queue:', error)
    }
  }

  const handleUseCard = async (cardId: string) => {
    try {
      const response = await fetch(`/api/v1/cartography/${cardId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        // Refresh inventory
        loadInventory()
        setSelectedCard(null)
        // Show success message
        alert(`Carte utilisée! ${data.data.discoveries.length} système(s) révélé(s)`)
      } else {
        alert(data.error || 'Erreur lors de l\'utilisation de la carte')
      }
    } catch (error) {
      console.error('Failed to use card:', error)
      alert('Erreur lors de l\'utilisation de la carte')
    }
  }

  const handleCompleteCreation = async (queueItemId: string) => {
    try {
      const response = await fetch('/api/v1/cartography/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueItemId })
      })
      const data = await response.json()
      if (data.success) {
        loadInventory()
        loadQueue()
      }
    } catch (error) {
      console.error('Failed to complete creation:', error)
    }
  }

  const filteredItems = items.filter(item => {
    if (!item.dataCard) return false
    if (rarityFilter !== 'all' && item.dataCard.rarity !== rarityFilter) return false
    if (typeFilter !== 'all' && item.dataCard.cardType !== typeFilter) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Creation Queue */}
      {queue.length > 0 && (
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            En cours de création ({queue.length})
          </h3>
          <div className="space-y-3">
            {queue.map(item => (
              <CardCreationProgress
                key={item.id}
                queueItem={item}
                onComplete={() => handleCompleteCreation(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Rareté</label>
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value as CardRarity | 'all')}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          >
            <option value="all">Toutes</option>
            {RARITY_FILTERS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as CardType | 'all')}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          >
            <option value="all">Tous</option>
            {TYPE_FILTERS.map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">
          Total: <span className="text-white font-semibold">{items.length}</span>
        </span>
        <span className="text-gray-400">
          Affichées: <span className="text-white font-semibold">{filteredItems.length}</span>
        </span>
      </div>

      {/* Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {items.length === 0
            ? 'Aucune carte dans votre inventaire'
            : 'Aucune carte ne correspond aux filtres'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <AnimatePresence>
            {filteredItems.map((item, index) => (
              item.dataCard && (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <DataCardDisplay
                    card={item.dataCard}
                    size="md"
                    showActions
                    onClick={() => setSelectedCard(item)}
                    onUse={() => item.dataCard && handleUseCard(item.dataCard.id)}
                  />
                </motion.div>
              )
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Card Detail Modal */}
      <AnimatePresence>
        {selectedCard?.dataCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setSelectedCard(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl border border-gray-700 p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex gap-6">
                <DataCardDisplay card={selectedCard.dataCard} size="lg" />
                <div className="flex-1 space-y-4">
                  <h2 className="text-xl font-bold text-white">
                    {selectedCard.dataCard.name}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {selectedCard.dataCard.description}
                  </p>

                  {selectedCard.dataCard.dataPayload?.systems && (
                    <div>
                      <span className="text-xs text-gray-500">Systèmes inclus:</span>
                      <p className="text-white">
                        {selectedCard.dataCard.dataPayload.systems.length}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => handleUseCard(selectedCard.dataCard!.id)}
                      className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                    >
                      Utiliser
                    </button>
                    <button
                      onClick={() => setSelectedCard(null)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
