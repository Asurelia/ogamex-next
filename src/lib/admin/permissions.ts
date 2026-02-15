/**
 * Admin Permissions Helper
 * Client-side permission checking utilities
 */

import type { AdminRole, AdminUser } from '@/types/admin'
import { ROLE_PERMISSIONS, ADMIN_PERMISSIONS } from '@/types/admin'

/**
 * Check if user has permission (client-side)
 */
export function hasPermission(user: AdminUser | null, permission: string): boolean {
  if (!user) return false
  if (user.role === 'super_admin') return true
  if (user.permissions.includes('*')) return true
  if (user.permissions.includes(permission)) return true

  const rolePerms = ROLE_PERMISSIONS[user.role] || []
  return rolePerms.includes(permission)
}

/**
 * Get all effective permissions for a user
 */
export function getEffectivePermissions(user: AdminUser): string[] {
  if (user.role === 'super_admin') {
    return Object.values(ADMIN_PERMISSIONS)
  }

  const rolePerms = ROLE_PERMISSIONS[user.role] || []
  const customPerms = user.permissions || []

  // Merge and dedupe
  return [...new Set([...rolePerms, ...customPerms])]
}

/**
 * Check if role has higher or equal privilege than target
 */
export function isRoleHigherOrEqual(role: AdminRole, target: AdminRole): boolean {
  const hierarchy: Record<AdminRole, number> = {
    super_admin: 4,
    game_master: 3,
    support: 2,
    readonly: 1,
  }
  return hierarchy[role] >= hierarchy[target]
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: AdminRole): string {
  const names: Record<AdminRole, string> = {
    super_admin: 'Super Admin',
    game_master: 'Game Master',
    support: 'Support',
    readonly: 'Read Only',
  }
  return names[role] || role
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: AdminRole): string {
  const colors: Record<AdminRole, string> = {
    super_admin: 'bg-red-500/20 text-red-400 border-red-500/50',
    game_master: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    support: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    readonly: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
  }
  return colors[role] || colors.readonly
}

/**
 * Permission categories for UI grouping
 */
export const PERMISSION_CATEGORIES = {
  entities: {
    label: 'Entity Management',
    permissions: [
      ADMIN_PERMISSIONS.ENTITIES_VIEW,
      ADMIN_PERMISSIONS.ENTITIES_CREATE,
      ADMIN_PERMISSIONS.ENTITIES_UPDATE,
      ADMIN_PERMISSIONS.ENTITIES_DELETE,
    ],
  },
  players: {
    label: 'Player Management',
    permissions: [
      ADMIN_PERMISSIONS.PLAYERS_VIEW,
      ADMIN_PERMISSIONS.PLAYERS_MODIFY,
      ADMIN_PERMISSIONS.PLAYERS_BAN,
      ADMIN_PERMISSIONS.PLAYERS_RESOURCES,
      ADMIN_PERMISSIONS.PLAYERS_BOOSTS,
    ],
  },
  config: {
    label: 'Configuration',
    permissions: [
      ADMIN_PERMISSIONS.CONFIG_VIEW,
      ADMIN_PERMISSIONS.CONFIG_UPDATE,
    ],
  },
  admin: {
    label: 'Admin Management',
    permissions: [
      ADMIN_PERMISSIONS.ADMIN_VIEW,
      ADMIN_PERMISSIONS.ADMIN_MANAGE,
    ],
  },
  audit: {
    label: 'Audit & Analytics',
    permissions: [
      ADMIN_PERMISSIONS.AUDIT_VIEW,
      ADMIN_PERMISSIONS.AUDIT_EXPORT,
      ADMIN_PERMISSIONS.ANALYTICS_VIEW,
    ],
  },
  dev: {
    label: 'Developer Tools',
    permissions: [
      ADMIN_PERMISSIONS.DEV_OVERLAY,
      ADMIN_PERMISSIONS.DEV_TIMESKIP,
      ADMIN_PERMISSIONS.DEV_SPAWN,
    ],
  },
}

/**
 * Get permission display name
 */
export function getPermissionDisplayName(permission: string): string {
  const names: Record<string, string> = {
    [ADMIN_PERMISSIONS.ENTITIES_VIEW]: 'View Entities',
    [ADMIN_PERMISSIONS.ENTITIES_CREATE]: 'Create Entities',
    [ADMIN_PERMISSIONS.ENTITIES_UPDATE]: 'Update Entities',
    [ADMIN_PERMISSIONS.ENTITIES_DELETE]: 'Delete Entities',
    [ADMIN_PERMISSIONS.PLAYERS_VIEW]: 'View Players',
    [ADMIN_PERMISSIONS.PLAYERS_MODIFY]: 'Modify Players',
    [ADMIN_PERMISSIONS.PLAYERS_BAN]: 'Ban Players',
    [ADMIN_PERMISSIONS.PLAYERS_RESOURCES]: 'Manage Resources',
    [ADMIN_PERMISSIONS.PLAYERS_BOOSTS]: 'Manage Boosts',
    [ADMIN_PERMISSIONS.CONFIG_VIEW]: 'View Config',
    [ADMIN_PERMISSIONS.CONFIG_UPDATE]: 'Update Config',
    [ADMIN_PERMISSIONS.ADMIN_VIEW]: 'View Admins',
    [ADMIN_PERMISSIONS.ADMIN_MANAGE]: 'Manage Admins',
    [ADMIN_PERMISSIONS.AUDIT_VIEW]: 'View Audit Log',
    [ADMIN_PERMISSIONS.AUDIT_EXPORT]: 'Export Audit Log',
    [ADMIN_PERMISSIONS.ANALYTICS_VIEW]: 'View Analytics',
    [ADMIN_PERMISSIONS.DEV_OVERLAY]: 'Dev Overlay',
    [ADMIN_PERMISSIONS.DEV_TIMESKIP]: 'Time Skip',
    [ADMIN_PERMISSIONS.DEV_SPAWN]: 'Spawn Entities',
  }
  return names[permission] || permission
}
