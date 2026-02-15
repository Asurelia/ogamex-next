'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DataCardDisplay } from './DataCardDisplay'
import type { PlayerVault, InventoryItem } from '@/lib/exploration'

interface VaultViewProps {
  userId: string
}

export function VaultView({ userId }: VaultViewProps) {
  const [vault, setVault] = useState<PlayerVault | null>(null)
  const [contents, setContents] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    loadVault()
  }, [])

  const loadVault = async () => {
    try {
      const response = await fetch('/api/v1/vault')
      const data = await response.json()
      if (data.success) {
        setVault(data.data.vault)
        setContents(data.data.contents)
      }
    } catch (error) {
      console.error('Failed to load vault:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async (itemId: string) => {
    try {
      const response = await fetch('/api/v1/vault/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventoryItemId: itemId })
      })
      const data = await response.json()
      if (data.success) {
        loadVault()
      } else {
        alert(data.error || 'Erreur lors du retrait')
      }
    } catch (error) {
      console.error('Failed to withdraw:', error)
    }
  }

  const handleUpgrade = async () => {
    if (!vault) return
    setUpgrading(true)

    try {
      const response = await fetch('/api/v1/vault/upgrade', {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        setVault({
          ...vault,
          vaultLevel: data.data.newLevel,
          maxSlots: data.data.newMaxSlots,
          nextUpgradeCost: data.data.nextUpgradeCost
        })
      } else {
        alert(data.error || 'Erreur lors de l\'amélioration')
      }
    } catch (error) {
      console.error('Failed to upgrade:', error)
    } finally {
      setUpgrading(false)
    }
  }

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

  if (!vault) {
    return (
      <div className="text-center py-12 text-gray-500">
        Impossible de charger le coffre
      </div>
    )
  }

  const emptySlots = Array(vault.maxSlots - contents.length).fill(null)

  return (
    <div className="space-y-6">
      {/* Vault Header */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-amber-900/30 to-yellow-900/20 border border-amber-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🏦</div>
            <div>
              <h2 className="text-xl font-bold text-amber-400">Coffre</h2>
              <p className="text-sm text-gray-400">Niveau {vault.vaultLevel}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {vault.usedSlots} / {vault.maxSlots}
            </div>
            <p className="text-sm text-gray-400">emplacements utilisés</p>
          </div>
        </div>

        {/* Capacity bar */}
        <div className="mt-4 h-3 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              vault.usedSlots >= vault.maxSlots
                ? 'bg-red-500'
                : vault.usedSlots >= vault.maxSlots * 0.8
                ? 'bg-yellow-500'
                : 'bg-amber-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${(vault.usedSlots / vault.maxSlots) * 100}%` }}
          />
        </div>

        {/* Upgrade section */}
        <div className="mt-4 pt-4 border-t border-amber-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Amélioration suivante:</p>
              <p className="text-xs text-gray-500">
                +{vault.nextUpgradeCost.slots_gained} emplacements
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-xs">
                <div className="text-gray-400">
                  🔩 {vault.nextUpgradeCost.metal.toLocaleString()}
                </div>
                <div className="text-gray-400">
                  💎 {vault.nextUpgradeCost.crystal.toLocaleString()}
                </div>
                <div className="text-gray-400">
                  ⚗️ {vault.nextUpgradeCost.deuterium.toLocaleString()}
                </div>
              </div>
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600
                  text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {upgrading ? 'Amélioration...' : 'Améliorer'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vault Grid */}
      <div className="grid grid-cols-5 gap-4">
        <AnimatePresence>
          {contents.map((item, index) => (
            item.dataCard && (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="relative group"
              >
                <DataCardDisplay card={item.dataCard} size="sm" />
                <motion.button
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  onClick={() => handleWithdraw(item.id)}
                  className="absolute inset-0 flex items-center justify-center
                    bg-black/60 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Retirer
                </motion.button>
              </motion.div>
            )
          ))}

          {/* Empty slots */}
          {emptySlots.map((_, index) => (
            <motion.div
              key={`empty-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-32 h-44 rounded-lg border-2 border-dashed border-gray-700
                flex items-center justify-center text-gray-600"
            >
              <span className="text-3xl">📦</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {contents.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Votre coffre est vide. Déposez des objets depuis votre inventaire.
        </div>
      )}
    </div>
  )
}
