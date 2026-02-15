'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAdminStore, useAdminPermission } from '@/stores/adminStore'
import { ADMIN_PERMISSIONS } from '@/types/admin'
import { getRoleBadgeColor, getRoleDisplayName } from '@/lib/admin/permissions'

interface NavItem {
  label: string
  href: string
  icon: string
  permission?: string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: '📊',
  },
  {
    label: 'Entities',
    href: '/admin/entities',
    icon: '🎮',
    permission: ADMIN_PERMISSIONS.ENTITIES_VIEW,
    children: [
      { label: 'Ships', href: '/admin/entities/ships', icon: '🚀' },
      { label: 'Buildings', href: '/admin/entities/buildings', icon: '🏗️' },
      { label: 'Defenses', href: '/admin/entities/defenses', icon: '🛡️' },
      { label: 'Research', href: '/admin/entities/research', icon: '🔬' },
      { label: 'Rapid Fire', href: '/admin/entities/rapid-fire', icon: '⚔️' },
    ],
  },
  {
    label: 'Configuration',
    href: '/admin/config',
    icon: '⚙️',
    permission: ADMIN_PERMISSIONS.CONFIG_VIEW,
    children: [
      { label: 'Production', href: '/admin/config/production', icon: '⛏️' },
      { label: 'Combat', href: '/admin/config/combat', icon: '💥' },
      { label: 'Fleet', href: '/admin/config/fleet', icon: '🛸' },
      { label: 'Universe', href: '/admin/config/universe', icon: '🌌' },
      { label: 'Formulas', href: '/admin/config/formulas', icon: '📐' },
    ],
  },
  {
    label: 'Players',
    href: '/admin/players',
    icon: '👥',
    permission: ADMIN_PERMISSIONS.PLAYERS_VIEW,
  },
  {
    label: 'Boosts',
    href: '/admin/boosts',
    icon: '⚡',
    permission: ADMIN_PERMISSIONS.CONFIG_VIEW,
  },
  {
    label: 'Currencies',
    href: '/admin/currencies',
    icon: '💎',
    permission: ADMIN_PERMISSIONS.CONFIG_VIEW,
  },
  {
    label: 'Audit Log',
    href: '/admin/audit',
    icon: '📜',
    permission: ADMIN_PERMISSIONS.AUDIT_VIEW,
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: '📈',
    permission: ADMIN_PERMISSIONS.ANALYTICS_VIEW,
    children: [
      { label: 'Overview', href: '/admin/analytics', icon: '📊' },
      { label: 'Economy', href: '/admin/analytics/economy', icon: '💰' },
      { label: 'Players', href: '/admin/analytics/players', icon: '👥' },
    ],
  },
  {
    label: 'Admin Users',
    href: '/admin/admins',
    icon: '🔐',
    permission: ADMIN_PERMISSIONS.ADMIN_VIEW,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { adminUser, sidebarCollapsed, setSidebarCollapsed } = useAdminStore()

  if (!adminUser) return null

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-gray-900/95 border-r border-cyan-500/20 transition-all duration-300 z-40 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-cyan-500/20">
        {!sidebarCollapsed && (
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-2xl">🎛️</span>
            <span className="font-bold text-cyan-400">OGameX Admin</span>
          </Link>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 hover:bg-cyan-500/10 rounded-lg transition-colors"
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* User Info */}
      {!sidebarCollapsed && (
        <div className="p-4 border-b border-cyan-500/20">
          <div className="text-sm text-gray-400">Logged in as</div>
          <div className="font-semibold text-white">{adminUser.username}</div>
          <span
            className={`inline-block mt-1 px-2 py-0.5 text-xs rounded border ${getRoleBadgeColor(
              adminUser.role
            )}`}
          >
            {getRoleDisplayName(adminUser.role)}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100%-140px)]">
        {navItems.map((item) => (
          <NavItemComponent
            key={item.href}
            item={item}
            pathname={pathname}
            collapsed={sidebarCollapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-cyan-500/20">
        <Link
          href="/game"
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-400 transition-colors"
        >
          <span>🎮</span>
          {!sidebarCollapsed && <span>Back to Game</span>}
        </Link>
      </div>
    </aside>
  )
}

function NavItemComponent({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem
  pathname: string
  collapsed: boolean
}) {
  const hasPermission = useAdminPermission(item.permission || '')
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

  // Check permission
  if (item.permission && !hasPermission) return null

  return (
    <div>
      <Link href={item.href}>
        <motion.div
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isActive
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
          whileHover={{ x: 2 }}
        >
          <span className="text-lg">{item.icon}</span>
          {!collapsed && <span>{item.label}</span>}
        </motion.div>
      </Link>

      {/* Children */}
      {!collapsed && item.children && isActive && (
        <div className="ml-6 mt-1 space-y-1">
          {item.children.map((child) => (
            <Link key={child.href} href={child.href}>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                  pathname === child.href
                    ? 'text-cyan-400'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                <span>{child.icon}</span>
                <span>{child.label}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminSidebar
