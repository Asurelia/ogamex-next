/**
 * Admin Middleware
 * Authentication and authorization for admin endpoints
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AdminRole, AdminUser, AuditAction } from '@/types/admin'
import { ROLE_PERMISSIONS } from '@/types/admin'

export interface AdminContext {
  user: AdminUser
  supabase: Awaited<ReturnType<typeof createClient>>
}

export type AdminHandler<T = unknown> = (
  request: NextRequest,
  context: AdminContext
) => Promise<NextResponse<T>>

/**
 * Wrap an API route handler with admin authentication
 */
export function withAdminAuth<T = unknown>(
  handler: AdminHandler<T>,
  requiredPermission?: string
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const supabase = await createClient()

      // Get authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authError || !authUser) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Get admin role
      const { data: adminRole, error: roleError } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (roleError || !adminRole) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Admin access required' },
          { status: 403 }
        )
      }

      // Get user details
      const { data: userData } = await supabase
        .from('users')
        .select('username, email')
        .eq('id', authUser.id)
        .single()

      const adminUser: AdminUser = {
        id: authUser.id,
        username: userData?.username || 'Unknown',
        email: userData?.email || authUser.email || '',
        role: adminRole.role as AdminRole,
        permissions: adminRole.permissions || ROLE_PERMISSIONS[adminRole.role as AdminRole],
        expires_at: adminRole.expires_at,
      }

      // Check specific permission if required
      if (requiredPermission) {
        const hasPermission = checkPermission(adminUser, requiredPermission)
        if (!hasPermission) {
          return NextResponse.json(
            { success: false, error: `Forbidden: Missing permission ${requiredPermission}` },
            { status: 403 }
          )
        }
      }

      // Execute handler with admin context
      return handler(request, { user: adminUser, supabase })
    } catch (error) {
      console.error('[Admin Middleware] Error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Check if admin has a specific permission
 */
export function checkPermission(admin: AdminUser, permission: string): boolean {
  // Super admin has all permissions
  if (admin.role === 'super_admin') return true

  // Check custom permissions first
  if (admin.permissions.includes(permission)) return true
  if (admin.permissions.includes('*')) return true

  // Check role default permissions
  const rolePerms = ROLE_PERMISSIONS[admin.role] || []
  return rolePerms.includes(permission)
}

/**
 * Check if admin has any of the specified permissions
 */
export function hasAnyPermission(admin: AdminUser, permissions: string[]): boolean {
  return permissions.some(p => checkPermission(admin, p))
}

/**
 * Check if admin has all specified permissions
 */
export function hasAllPermissions(admin: AdminUser, permissions: string[]): boolean {
  return permissions.every(p => checkPermission(admin, p))
}

/**
 * Log an admin action to the audit log
 */
export async function logAdminAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  adminId: string,
  action: AuditAction | string,
  options: {
    entityType?: string
    entityId?: string
    oldValue?: Record<string, unknown>
    newValue?: Record<string, unknown>
    metadata?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  } = {}
): Promise<string | null> {
  try {
    const { data: adminUser } = await supabase
      .from('users')
      .select('username')
      .eq('id', adminId)
      .single()

    const { data, error } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: adminId,
        admin_username: adminUser?.username,
        action,
        entity_type: options.entityType,
        entity_id: options.entityId,
        old_value: options.oldValue,
        new_value: options.newValue,
        metadata: options.metadata || {},
        ip_address: options.ipAddress,
        user_agent: options.userAgent,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[Audit Log] Failed to log action:', error)
      return null
    }

    return data.id
  } catch (error) {
    console.error('[Audit Log] Error:', error)
    return null
  }
}

/**
 * Extract request metadata for audit logging
 */
export function getRequestMetadata(request: NextRequest): {
  ipAddress: string | null
  userAgent: string | null
} {
  const forwarded = request.headers.get('x-forwarded-for')
  const ipAddress = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null
  const userAgent = request.headers.get('user-agent') || null

  return { ipAddress, userAgent }
}

/**
 * Validate admin role hierarchy
 * Returns true if the acting admin can modify the target role
 */
export function canManageRole(actingRole: AdminRole, targetRole: AdminRole): boolean {
  const hierarchy: Record<AdminRole, number> = {
    super_admin: 4,
    game_master: 3,
    support: 2,
    readonly: 1,
  }

  return hierarchy[actingRole] > hierarchy[targetRole]
}

/**
 * Get admin role from user ID (server-side helper)
 */
export async function getAdminRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<AdminRole | null> {
  const { data, error } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('active', true)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error || !data) return null
  return data.role as AdminRole
}

/**
 * Check if user is any kind of admin
 */
export async function isAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  const role = await getAdminRole(supabase, userId)
  return role !== null
}
