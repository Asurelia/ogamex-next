'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { StatCard } from '@/components/admin/common'
import type { OverviewAnalytics } from '@/types/admin'

export default function AdminDashboard() {
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your OGameX universe</p>
      </div>

      {/* Stats Grid */}
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
          title="Total Planets"
          value={analytics?.total_planets || 0}
          icon="🌍"
          color="#ffaa00"
        />
        <StatCard
          title="Fleets in Motion"
          value={analytics?.total_fleets_in_motion || 0}
          icon="🚀"
          color="#00aaff"
        />
      </div>

      {/* Economy Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Economy Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-lg border border-gray-700 bg-gray-900/50"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Economy Overview</h2>
          <div className="space-y-4">
            <ResourceRow
              label="Total Metal"
              value={analytics?.economy?.total_metal || 0}
              icon="🔩"
              color="#9ca3af"
            />
            <ResourceRow
              label="Total Crystal"
              value={analytics?.economy?.total_crystal || 0}
              icon="💎"
              color="#60a5fa"
            />
            <ResourceRow
              label="Total Deuterium"
              value={analytics?.economy?.total_deuterium || 0}
              icon="⚗️"
              color="#34d399"
            />
            <ResourceRow
              label="Total Dark Matter"
              value={analytics?.economy?.total_dark_matter || 0}
              icon="💜"
              color="#a78bfa"
            />
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-lg border border-gray-700 bg-gray-900/50"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              href="/admin/players"
              icon="👥"
              label="Manage Players"
              color="#00ffcc"
            />
            <QuickAction
              href="/admin/entities/ships"
              icon="🚀"
              label="Edit Ships"
              color="#ffaa00"
            />
            <QuickAction
              href="/admin/config"
              icon="⚙️"
              label="Configuration"
              color="#aa88ff"
            />
            <QuickAction
              href="/admin/audit"
              icon="📜"
              label="Audit Log"
              color="#ff6b6b"
            />
            <QuickAction
              href="/admin/boosts"
              icon="⚡"
              label="Boost Types"
              color="#00aaff"
            />
            <QuickAction
              href="/admin/analytics"
              icon="📈"
              label="Analytics"
              color="#4ade80"
            />
          </div>
        </motion.div>
      </div>

      {/* System Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 rounded-lg border border-gray-700 bg-gray-900/50"
      >
        <h2 className="text-xl font-semibold text-white mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusIndicator label="Database" status="healthy" />
          <StatusIndicator label="Game Config Cache" status="healthy" />
          <StatusIndicator label="Fleet Processor" status="healthy" />
        </div>
      </motion.div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-gray-950/50 flex items-center justify-center z-50">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full"
          />
        </div>
      )}
    </div>
  )
}

function ResourceRow({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number
  icon: string
  color: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-gray-400">{label}</span>
      </div>
      <span className="font-mono font-semibold" style={{ color }}>
        {formatNumber(value)}
      </span>
    </div>
  )
}

function QuickAction({
  href,
  icon,
  label,
  color,
}: {
  href: string
  icon: string
  label: string
  color: string
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors group"
    >
      <div
        className="p-2 rounded-lg transition-colors"
        style={{ backgroundColor: `${color}20` }}
      >
        <span className="text-xl">{icon}</span>
      </div>
      <span className="text-gray-300 group-hover:text-white transition-colors">
        {label}
      </span>
    </a>
  )
}

function StatusIndicator({
  label,
  status,
}: {
  label: string
  status: 'healthy' | 'warning' | 'error'
}) {
  const colors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
      <span className="text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${colors[status]} animate-pulse`}
        />
        <span className="text-sm capitalize text-gray-300">{status}</span>
      </div>
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
