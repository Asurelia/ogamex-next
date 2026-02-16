'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/stores/gameStore'
import type {
  MarketListing,
  CardRarity,
  PriceType,
  InventoryItem,
  CreateListingRequest
} from '@/lib/exploration'

const RARITY_COLORS: Record<CardRarity, string> = {
  common: 'text-gray-400 border-gray-500',
  uncommon: 'text-green-400 border-green-500',
  rare: 'text-blue-400 border-blue-500',
  epic: 'text-purple-400 border-purple-500',
  legendary: 'text-amber-400 border-amber-500',
}

const RARITY_BG: Record<CardRarity, string> = {
  common: 'from-gray-900 to-gray-800',
  uncommon: 'from-green-900/30 to-gray-900',
  rare: 'from-blue-900/30 to-gray-900',
  epic: 'from-purple-900/30 to-gray-900',
  legendary: 'from-amber-900/30 to-gray-900',
}

type Tab = 'browse' | 'my-listings' | 'sell'

interface MarketListingsResponse {
  listings: MarketListing[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function MarketplacePage() {
  const { currentPlanet } = useGameStore()
  const [activeTab, setActiveTab] = useState<Tab>('browse')
  const [listings, setListings] = useState<MarketListing[]>([])
  const [myListings, setMyListings] = useState<MarketListing[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    rarity: 'all' as CardRarity | 'all',
    priceType: 'all' as PriceType | 'all',
    sortBy: 'newest' as 'price_asc' | 'price_desc' | 'newest' | 'ending_soon',
    maxPrice: '',
  })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null)
  const [buyingId, setBuyingId] = useState<string | null>(null)

  // Sell form state
  const [sellItem, setSellItem] = useState<InventoryItem | null>(null)
  const [sellForm, setSellForm] = useState<Partial<CreateListingRequest>>({
    priceType: 'fixed',
    priceMetal: 0,
    priceCrystal: 0,
    priceDeuterium: 0,
    durationHours: 24,
  })
  const [sellLoading, setSellLoading] = useState(false)

  const loadListings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        sortBy: filters.sortBy,
      })
      if (filters.rarity !== 'all') params.set('rarity', filters.rarity)
      if (filters.priceType !== 'all') params.set('priceType', filters.priceType)
      if (filters.maxPrice) params.set('maxPriceMetal', filters.maxPrice)

      const response = await fetch(`/api/v1/market?${params}`)
      const data = await response.json()

      if (data.success) {
        const marketData = data.data as MarketListingsResponse
        setListings(marketData.listings)
        setTotalPages(marketData.totalPages)
      }
    } catch (error) {
      console.error('Failed to load listings:', error)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  const loadMyListings = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/market/listings')
      const data = await response.json()
      if (data.success) {
        setMyListings(data.data.listings || [])
      }
    } catch (error) {
      console.error('Failed to load my listings:', error)
    }
  }, [])

  const loadInventory = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/cartography')
      const data = await response.json()
      if (data.success) {
        // Only show cards not already listed
        setInventory(data.data.cards.filter((c: InventoryItem) => !c.listedOnMarket))
      }
    } catch (error) {
      console.error('Failed to load inventory:', error)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'browse') {
      loadListings()
    } else if (activeTab === 'my-listings') {
      loadMyListings()
    } else if (activeTab === 'sell') {
      loadInventory()
    }
  }, [activeTab, loadListings, loadMyListings, loadInventory])

  const handleBuy = async (listing: MarketListing) => {
    if (!currentPlanet) return

    setBuyingId(listing.id)
    try {
      const response = await fetch(`/api/v1/market/${listing.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planetId: currentPlanet.id })
      })

      const data = await response.json()
      if (data.success) {
        setSelectedListing(null)
        loadListings()
        // TODO: Refresh resources after purchase
        alert('Achat effectue avec succes!')
      } else {
        alert(data.error || 'Erreur lors de l\'achat')
      }
    } catch (error) {
      console.error('Failed to buy:', error)
      alert('Erreur lors de l\'achat')
    } finally {
      setBuyingId(null)
    }
  }

  const handleCancelListing = async (listingId: string) => {
    try {
      const response = await fetch(`/api/v1/market/${listingId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        loadMyListings()
        alert('Annonce annulee')
      } else {
        alert(data.error || 'Erreur lors de l\'annulation')
      }
    } catch (error) {
      console.error('Failed to cancel listing:', error)
    }
  }

  const handleCreateListing = async () => {
    if (!sellItem || !sellForm.inventoryItemId) return

    setSellLoading(true)
    try {
      const response = await fetch('/api/v1/market/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sellForm)
      })

      const data = await response.json()
      if (data.success) {
        setSellItem(null)
        setSellForm({
          priceType: 'fixed',
          priceMetal: 0,
          priceCrystal: 0,
          priceDeuterium: 0,
          durationHours: 24,
        })
        loadInventory()
        setActiveTab('my-listings')
        alert('Annonce creee avec succes!')
      } else {
        alert(data.error || 'Erreur lors de la creation')
      }
    } catch (error) {
      console.error('Failed to create listing:', error)
      alert('Erreur lors de la creation')
    } finally {
      setSellLoading(false)
    }
  }

  const formatPrice = (listing: MarketListing): string => {
    const parts: string[] = []
    if (listing.priceMetal > 0) parts.push(`${listing.priceMetal.toLocaleString()} M`)
    if (listing.priceCrystal > 0) parts.push(`${listing.priceCrystal.toLocaleString()} C`)
    if (listing.priceDeuterium > 0) parts.push(`${listing.priceDeuterium.toLocaleString()} D`)
    return parts.join(' / ') || 'Gratuit'
  }

  const formatTimeRemaining = (expiresAt: string): string => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = expires.getTime() - now.getTime()

    if (diff <= 0) return 'Expire'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      return `${days}j ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-white">Marche Galactique</h1>
        <p className="text-gray-400 mt-1">
          Achetez et vendez des cartes de donnees avec d'autres joueurs
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'browse'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          Parcourir
        </button>
        <button
          onClick={() => setActiveTab('my-listings')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'my-listings'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          Mes Annonces
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'sell'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          Vendre
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'browse' && (
          <motion.div
            key="browse"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Filters */}
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Rarete</label>
                  <select
                    value={filters.rarity}
                    onChange={(e) => setFilters(f => ({ ...f, rarity: e.target.value as CardRarity | 'all' }))}
                    className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                  >
                    <option value="all">Toutes</option>
                    <option value="common">Commune</option>
                    <option value="uncommon">Peu commune</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epique</option>
                    <option value="legendary">Legendaire</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                  <select
                    value={filters.priceType}
                    onChange={(e) => setFilters(f => ({ ...f, priceType: e.target.value as PriceType | 'all' }))}
                    className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                  >
                    <option value="all">Tous</option>
                    <option value="fixed">Prix fixe</option>
                    <option value="auction">Enchere</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Trier par</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(f => ({ ...f, sortBy: e.target.value as typeof filters.sortBy }))}
                    className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                  >
                    <option value="newest">Plus recentes</option>
                    <option value="ending_soon">Bientot terminees</option>
                    <option value="price_asc">Prix croissant</option>
                    <option value="price_desc">Prix decroissant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Prix max (metal)</label>
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                    placeholder="Illimite"
                    className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm w-32"
                  />
                </div>
              </div>
            </div>

            {/* Listings Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full"
                />
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p className="text-xl">Aucune annonce trouvee</p>
                <p className="text-sm mt-2">Essayez de modifier vos filtres</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {listings.map((listing) => (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      className={`
                        p-4 rounded-lg cursor-pointer transition-all
                        bg-gradient-to-br ${RARITY_BG[listing.itemRarity || 'common']}
                        border ${RARITY_COLORS[listing.itemRarity || 'common']}
                      `}
                      onClick={() => setSelectedListing(listing)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs uppercase font-bold ${RARITY_COLORS[listing.itemRarity || 'common']}`}>
                          {listing.itemRarity || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTimeRemaining(listing.expiresAt)}
                        </span>
                      </div>

                      <h3 className="text-white font-semibold mb-1">
                        {listing.item?.dataCard?.cardType?.replace(/_/g, ' ').toUpperCase() || listing.itemType}
                      </h3>

                      <p className="text-gray-400 text-sm mb-3">
                        Vendeur: {listing.sellerUsername || 'Inconnu'}
                      </p>

                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-bold ${listing.priceType === 'auction' ? 'text-amber-400' : 'text-cyan-400'}`}>
                          {listing.priceType === 'auction' ? 'Enchere' : 'Prix fixe'}
                        </span>
                        <span className="text-white font-mono text-sm">
                          {formatPrice(listing)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-gray-800 rounded text-white disabled:opacity-50"
                    >
                      Precedent
                    </button>
                    <span className="px-4 py-2 text-white">
                      Page {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-gray-800 rounded text-white disabled:opacity-50"
                    >
                      Suivant
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'my-listings' && (
          <motion.div
            key="my-listings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {myListings.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p className="text-xl">Vous n'avez aucune annonce active</p>
                <p className="text-sm mt-2">
                  <button
                    onClick={() => setActiveTab('sell')}
                    className="text-cyan-400 hover:underline"
                  >
                    Creer une annonce
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myListings.map((listing) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`
                      p-4 rounded-lg
                      bg-gradient-to-r ${RARITY_BG[listing.itemRarity || 'common']}
                      border ${RARITY_COLORS[listing.itemRarity || 'common']}
                    `}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className={`text-xs uppercase font-bold ${RARITY_COLORS[listing.itemRarity || 'common']}`}>
                          {listing.itemRarity}
                        </span>
                        <h3 className="text-white font-semibold">
                          {listing.item?.dataCard?.cardType?.replace(/_/g, ' ').toUpperCase() || listing.itemType}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Prix: {formatPrice(listing)} | Expire dans: {formatTimeRemaining(listing.expiresAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {listing.status === 'active' && (
                          <button
                            onClick={() => handleCancelListing(listing.id)}
                            className="px-4 py-2 bg-red-600/20 border border-red-500/50 rounded text-red-400 hover:bg-red-600/30"
                          >
                            Annuler
                          </button>
                        )}
                        {listing.status === 'sold' && (
                          <span className="px-4 py-2 bg-green-600/20 text-green-400 rounded">
                            Vendu
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'sell' && (
          <motion.div
            key="sell"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {!sellItem ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Selectionnez un objet a vendre</h3>
                {inventory.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <p className="text-xl">Aucun objet disponible</p>
                    <p className="text-sm mt-2">Vous n'avez aucune carte de donnees a vendre</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inventory.map((item) => (
                      <motion.div
                        key={item.id}
                        whileHover={{ scale: 1.02 }}
                        className={`
                          p-4 rounded-lg cursor-pointer
                          bg-gradient-to-br ${RARITY_BG[item.dataCard?.rarity || 'common']}
                          border ${RARITY_COLORS[item.dataCard?.rarity || 'common']}
                        `}
                        onClick={() => {
                          setSellItem(item)
                          setSellForm(f => ({ ...f, inventoryItemId: item.id }))
                        }}
                      >
                        <span className={`text-xs uppercase font-bold ${RARITY_COLORS[item.dataCard?.rarity || 'common']}`}>
                          {item.dataCard?.rarity}
                        </span>
                        <h3 className="text-white font-semibold mt-1">
                          {item.dataCard?.cardType?.replace(/_/g, ' ').toUpperCase()}
                        </h3>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-lg space-y-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSellItem(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    &larr; Retour
                  </button>
                  <h3 className="text-lg font-semibold text-white">
                    Creer une annonce
                  </h3>
                </div>

                <div className={`
                  p-4 rounded-lg
                  bg-gradient-to-br ${RARITY_BG[sellItem.dataCard?.rarity || 'common']}
                  border ${RARITY_COLORS[sellItem.dataCard?.rarity || 'common']}
                `}>
                  <span className={`text-xs uppercase font-bold ${RARITY_COLORS[sellItem.dataCard?.rarity || 'common']}`}>
                    {sellItem.dataCard?.rarity}
                  </span>
                  <h3 className="text-white font-semibold mt-1">
                    {sellItem.dataCard?.cardType?.replace(/_/g, ' ').toUpperCase()}
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Type de vente</label>
                    <select
                      value={sellForm.priceType}
                      onChange={(e) => setSellForm(f => ({ ...f, priceType: e.target.value as PriceType }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    >
                      <option value="fixed">Prix fixe</option>
                      <option value="auction">Enchere</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Metal</label>
                      <input
                        type="number"
                        value={sellForm.priceMetal || ''}
                        onChange={(e) => setSellForm(f => ({ ...f, priceMetal: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Cristal</label>
                      <input
                        type="number"
                        value={sellForm.priceCrystal || ''}
                        onChange={(e) => setSellForm(f => ({ ...f, priceCrystal: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Deuterium</label>
                      <input
                        type="number"
                        value={sellForm.priceDeuterium || ''}
                        onChange={(e) => setSellForm(f => ({ ...f, priceDeuterium: Number(e.target.value) }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Duree (heures)</label>
                    <select
                      value={sellForm.durationHours}
                      onChange={(e) => setSellForm(f => ({ ...f, durationHours: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    >
                      <option value={12}>12 heures</option>
                      <option value={24}>24 heures</option>
                      <option value={48}>48 heures</option>
                      <option value={72}>72 heures</option>
                      <option value={168}>7 jours</option>
                    </select>
                  </div>

                  <button
                    onClick={handleCreateListing}
                    disabled={sellLoading || (!sellForm.priceMetal && !sellForm.priceCrystal && !sellForm.priceDeuterium)}
                    className="w-full py-3 bg-green-600 rounded text-white font-semibold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sellLoading ? 'Creation...' : 'Creer l\'annonce'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listing Detail Modal */}
      <AnimatePresence>
        {selectedListing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedListing(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`
                w-full max-w-md p-6 rounded-lg
                bg-gradient-to-br ${RARITY_BG[selectedListing.itemRarity || 'common']}
                border-2 ${RARITY_COLORS[selectedListing.itemRarity || 'common']}
              `}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className={`text-xs uppercase font-bold ${RARITY_COLORS[selectedListing.itemRarity || 'common']}`}>
                    {selectedListing.itemRarity}
                  </span>
                  <h2 className="text-xl font-bold text-white">
                    {selectedListing.item?.dataCard?.cardType?.replace(/_/g, ' ').toUpperCase() || selectedListing.itemType}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedListing(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Vendeur</span>
                  <span className="text-white">{selectedListing.sellerUsername || 'Inconnu'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type</span>
                  <span className={selectedListing.priceType === 'auction' ? 'text-amber-400' : 'text-cyan-400'}>
                    {selectedListing.priceType === 'auction' ? 'Enchere' : 'Prix fixe'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Prix</span>
                  <span className="text-white font-mono">{formatPrice(selectedListing)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Expire dans</span>
                  <span className="text-white">{formatTimeRemaining(selectedListing.expiresAt)}</span>
                </div>
              </div>

              {selectedListing.priceType === 'fixed' ? (
                <button
                  onClick={() => handleBuy(selectedListing)}
                  disabled={buyingId === selectedListing.id}
                  className="w-full py-3 bg-cyan-600 rounded text-white font-semibold hover:bg-cyan-500 disabled:opacity-50"
                >
                  {buyingId === selectedListing.id ? 'Achat en cours...' : 'Acheter maintenant'}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Enchere actuelle</span>
                    <span className="text-amber-400 font-mono">
                      {selectedListing.currentBid?.toLocaleString() || 0} Metal
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Votre enchere"
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                      min={(selectedListing.currentBid || 0) + (selectedListing.minBidIncrement || 100)}
                    />
                    <button
                      className="px-6 py-2 bg-amber-600 rounded text-white font-semibold hover:bg-amber-500"
                    >
                      Encherir
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
