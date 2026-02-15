'use client'

import { motion } from 'framer-motion'

interface StatCardProps {
  title: string
  value: string | number
  icon: string
  change?: {
    value: number
    label: string
    positive?: boolean
  }
  color?: string
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  icon,
  change,
  color = '#00ffcc',
  onClick,
}: StatCardProps) {
  return (
    <motion.div
      className={`p-6 rounded-lg border border-gray-700 bg-gray-900/50 backdrop-blur ${
        onClick ? 'cursor-pointer' : ''
      }`}
      style={{
        boxShadow: `0 0 20px ${color}15`,
      }}
      whileHover={onClick ? { scale: 1.02, borderColor: color } : undefined}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p
            className="text-3xl font-bold"
            style={{ color }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change && (
            <div
              className={`flex items-center gap-1 mt-2 text-sm ${
                change.positive ? 'text-green-400' : 'text-red-400'
              }`}
            >
              <span>{change.positive ? '↑' : '↓'}</span>
              <span>{Math.abs(change.value)}%</span>
              <span className="text-gray-500">{change.label}</span>
            </div>
          )}
        </div>
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </motion.div>
  )
}

export default StatCard
