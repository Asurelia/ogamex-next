'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { StatCard } from '@/components/admin/common'
import type { OverviewAnalytics } from '@/types/admin'

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<OverviewAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics/overview')
      const data = await response.json()
      if (data.success) {
        setAnalytics(data.data)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 mt-1">Overview of your OGameX universe</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Players"
          value={analytics?.total_users || 0}
          icon="👥"
          color="#00ffcc"
          change={
            analytics?.new_users_24h
              ? { value: analytics.new_users_24h, label: 'new today', positive: true }
              : undefined
          }
        />
        <StatCard
          title="Active (24h)"
          value={analytics?.active_users_24h || 0}
          icon="🟢"
          color="#00ff88"
        />
        <StatCard
          title="Active (7d)"
          value={analytics?.active_users_7d || 0}
          icon="📊"
          color="#ffaa00"
        />
        <StatCard
          title="Battles (24h)"
          value={analytics?.total_battles_24h || 0}
          icon="⚔️"
          color="#ff6b6b"
        />
      </div>

      {/* Analytics Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/analytics/economy">
          <motion.div
            className="p-6 rounded-lg border border-gray-700 bg-gray-900/50 hover:border-cyan-500/50 transition-colors cursor-pointer"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-lg bg-yellow-500/20">
                <span className="text-3xl">💰</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Economy Analytics</h2>
                <p className="text-gray-400">Resource production, distribution, top producers</p>
              </div>
            </div>
          </motion.div>
        </Link>

        <Link href="/admin/analytics/players">
          <motion.div
            className="p-6 rounded-lg border border-gray-700 bg-gray-900/50 hover:border-cyan-500/50 transition-colors cursor-pointer"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-lg bg-purple-500/20">
                <span className="text-3xl">👥</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Player Analytics</h2>
                <p className="text-gray-400">Registration trends, activity, retention</p>
              </div>
            </div>
          </motion.div>
        </Link>
      </div>

      {/* Economy Summary */}
      {analytics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-lg border border-gray-700 bg-gray-900/50"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Economy Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-gray-800/50">
              <p className="text-sm text-gray-400 mb-1">Total Metal</p>
              <p className="text-2xl font-bold text-gray-300">
                {formatNumber(analytics.economy?.total_metal || 0)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-800/50">
              <p className="text-sm text-gray-400 mb-1">Total Crystal</p>
              <p className="text-2xl font-bold text-blue-400">
                {formatNumber(analytics.economy?.total_crystal || 0)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-800/50">
              <p className="text-sm text-gray-400 mb-1">Total Deuterium</p>
              <p className="text-2xl font-bold text-green-400">
                {formatNumber(analytics.economy?.total_deuterium || 0)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-800/50">
              <p className="text-sm text-gray-400 mb-1">Total Dark Matter</p>
              <p className="text-2xl font-bold text-purple-400">
                {formatNumber(analytics.economy?.total_dark_matter || 0)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Activity Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6 rounded-lg border border-gray-700 bg-gray-900/50"
      >
        <h2 className="text-xl font-semibold text-white mb-4">Activity Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-gray-800/50">
            <p className="text-sm text-gray-400 mb-1">Total Planets</p>
            <p className="text-2xl font-bold text-white">
              {analytics?.total_planets?.toLocaleString() || 0}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gray-800/50">
            <p className="text-sm text-gray-400 mb-1">Fleets in Motion</p>
            <p className="text-2xl font-bold text-cyan-400">
              {analytics?.total_fleets_in_motion?.toLocaleString() || 0}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gray-800/50">
            <p className="text-sm text-gray-400 mb-1">New Users (24h)</p>
            <p className="text-2xl font-bold text-green-400">
              +{analytics?.new_users_24h || 0}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B'
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M'
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + 'K'
  }
  return num.toLocaleString()
}
