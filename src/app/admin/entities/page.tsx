'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const entityTypes = [
  {
    title: 'Ships',
    description: 'Manage military and civil ships',
    icon: '🚀',
    href: '/admin/entities/ships',
    color: '#00ffcc',
    count: '17 ships',
  },
  {
    title: 'Buildings',
    description: 'Resource, facility, and moon buildings',
    icon: '🏗️',
    href: '/admin/entities/buildings',
    color: '#ffaa00',
    count: '20 buildings',
  },
  {
    title: 'Defenses',
    description: 'Planetary defense units',
    icon: '🛡️',
    href: '/admin/entities/defenses',
    color: '#ff6b6b',
    count: '10 defenses',
  },
  {
    title: 'Research',
    description: 'Technology research types',
    icon: '🔬',
    href: '/admin/entities/research',
    color: '#aa88ff',
    count: '15 research',
  },
  {
    title: 'Rapid Fire',
    description: 'Ship/defense rapid fire matrix',
    icon: '⚔️',
    href: '/admin/entities/rapid-fire',
    color: '#00aaff',
    count: 'Matrix editor',
  },
]

export default function EntitiesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Entity Management</h1>
        <p className="text-gray-400 mt-1">
          Manage game entities like ships, buildings, defenses, and research
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entityTypes.map((entity, index) => (
          <motion.div
            key={entity.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={entity.href}>
              <div
                className="p-6 rounded-lg border border-gray-700 bg-gray-900/50 hover:border-opacity-50 transition-all group"
                style={{
                  '--hover-color': entity.color,
                } as React.CSSProperties}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${entity.color}20` }}
                  >
                    <span className="text-3xl">{entity.icon}</span>
                  </div>
                  <span className="text-xs text-gray-500">{entity.count}</span>
                </div>
                <h2
                  className="text-xl font-semibold mb-2 group-hover:text-[var(--hover-color)] transition-colors"
                  style={{ color: 'white' }}
                >
                  {entity.title}
                </h2>
                <p className="text-gray-400 text-sm">{entity.description}</p>
                <div className="mt-4 flex items-center text-sm" style={{ color: entity.color }}>
                  <span>Manage</span>
                  <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
