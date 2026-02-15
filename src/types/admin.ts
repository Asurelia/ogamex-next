/**
 * Admin System Types
 * Types for admin roles, permissions, audit logging, and configuration
 */

// ============================================================================
// ADMIN ROLES
// ============================================================================

export type AdminRole = 'super_admin' | 'game_master' | 'support' | 'readonly'

export interface AdminRoleRecord {
  id: string
  user_id: string
  role: AdminRole
  permissions: string[]
  granted_by: string | null
  expires_at: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface AdminUser {
  id: string
  username: string
  email: string
  role: AdminRole
  permissions: string[]
  expires_at: string | null
}

// Permission constants
export const ADMIN_PERMISSIONS = {
  // Entity management
  ENTITIES_VIEW: 'entities:view',
  ENTITIES_CREATE: 'entities:create',
  ENTITIES_UPDATE: 'entities:update',
  ENTITIES_DELETE: 'entities:delete',

  // Player management
  PLAYERS_VIEW: 'players:view',
  PLAYERS_MODIFY: 'players:modify',
  PLAYERS_BAN: 'players:ban',
  PLAYERS_RESOURCES: 'players:resources',
  PLAYERS_BOOSTS: 'players:boosts',

  // Config management
  CONFIG_VIEW: 'config:view',
  CONFIG_UPDATE: 'config:update',

  // Admin management
  ADMIN_VIEW: 'admin:view',
  ADMIN_MANAGE: 'admin:manage',

  // Audit
  AUDIT_VIEW: 'audit:view',
  AUDIT_EXPORT: 'audit:export',

  // Analytics
  ANALYTICS_VIEW: 'analytics:view',

  // Dev tools
  DEV_OVERLAY: 'dev:overlay',
  DEV_TIMESKIP: 'dev:timeskip',
  DEV_SPAWN: 'dev:spawn',
} as const

// Default permissions per role
export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: Object.values(ADMIN_PERMISSIONS),
  game_master: [
    ADMIN_PERMISSIONS.ENTITIES_VIEW,
    ADMIN_PERMISSIONS.ENTITIES_CREATE,
    ADMIN_PERMISSIONS.ENTITIES_UPDATE,
    ADMIN_PERMISSIONS.ENTITIES_DELETE,
    ADMIN_PERMISSIONS.PLAYERS_VIEW,
    ADMIN_PERMISSIONS.PLAYERS_MODIFY,
    ADMIN_PERMISSIONS.PLAYERS_BAN,
    ADMIN_PERMISSIONS.PLAYERS_RESOURCES,
    ADMIN_PERMISSIONS.PLAYERS_BOOSTS,
    ADMIN_PERMISSIONS.CONFIG_VIEW,
    ADMIN_PERMISSIONS.CONFIG_UPDATE,
    ADMIN_PERMISSIONS.AUDIT_VIEW,
    ADMIN_PERMISSIONS.ANALYTICS_VIEW,
    ADMIN_PERMISSIONS.DEV_OVERLAY,
    ADMIN_PERMISSIONS.DEV_TIMESKIP,
    ADMIN_PERMISSIONS.DEV_SPAWN,
  ],
  support: [
    ADMIN_PERMISSIONS.PLAYERS_VIEW,
    ADMIN_PERMISSIONS.PLAYERS_RESOURCES,
    ADMIN_PERMISSIONS.PLAYERS_BOOSTS,
    ADMIN_PERMISSIONS.AUDIT_VIEW,
    ADMIN_PERMISSIONS.DEV_OVERLAY,
  ],
  readonly: [
    ADMIN_PERMISSIONS.ENTITIES_VIEW,
    ADMIN_PERMISSIONS.PLAYERS_VIEW,
    ADMIN_PERMISSIONS.CONFIG_VIEW,
    ADMIN_PERMISSIONS.AUDIT_VIEW,
    ADMIN_PERMISSIONS.ANALYTICS_VIEW,
  ],
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'grant_admin_role'
  | 'revoke_admin_role'
  | 'ban_player'
  | 'unban_player'
  | 'inject_resources'
  | 'remove_resources'
  | 'grant_boost'
  | 'revoke_boost'
  | 'invalidate_cache'
  | 'config_update'
  | 'time_skip'
  | 'spawn_entity'

export interface AuditLogEntry {
  id: string
  admin_id: string
  admin_username: string | null
  action: AuditAction
  entity_type: string | null
  entity_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AuditLogFilters {
  admin_id?: string
  action?: AuditAction | AuditAction[]
  entity_type?: string
  entity_id?: string
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}

// ============================================================================
// GAME CONFIG
// ============================================================================

export type ConfigCategory =
  | 'production'
  | 'construction'
  | 'research'
  | 'combat'
  | 'fleet'
  | 'economy'
  | 'universe'
  | 'features'
  | 'limits'
  | 'formulas'

export type ConfigValueType = 'number' | 'string' | 'boolean' | 'json' | 'formula'

export interface GameConfigEntry {
  id: string
  key: string
  value: unknown
  category: ConfigCategory
  value_type: ConfigValueType
  default_value: unknown
  min_value: unknown | null
  max_value: unknown | null
  description: string | null
  requires_restart: boolean
  created_at: string
  updated_at: string
}

export interface GameConfigUpdate {
  key: string
  value: unknown
}

// ============================================================================
// BOOST TYPES
// ============================================================================

export type BoostScope = 'global' | 'planet' | 'fleet'

export interface GameBoostType {
  [key: string]: unknown
  id: string
  key: string
  name: string
  description: string | null
  icon: string
  color: string
  glow_color: string
  multiplier: number
  duration_minutes: number
  energy_cost: number
  scope: BoostScope
  stackable: boolean
  max_stacks: number
  cooldown_minutes: number
  enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BoostTypeCreate {
  key: string
  name: string
  description?: string
  icon: string
  color?: string
  glow_color?: string
  multiplier: number
  duration_minutes: number
  energy_cost: number
  scope?: BoostScope
  stackable?: boolean
  max_stacks?: number
  cooldown_minutes?: number
  enabled?: boolean
  sort_order?: number
}

export interface BoostTypeUpdate extends Partial<BoostTypeCreate> {
  id: string
}

// ============================================================================
// CURRENCIES
// ============================================================================

export interface GameCurrency {
  id: string
  key: string
  name: string
  description: string | null
  icon: string
  color: string
  is_premium: boolean
  regen_rate: number
  regen_interval_seconds: number
  max_amount: number | null
  default_amount: number
  can_be_traded: boolean
  can_be_gifted: boolean
  enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CurrencyCreate {
  key: string
  name: string
  description?: string
  icon: string
  color?: string
  is_premium?: boolean
  regen_rate?: number
  regen_interval_seconds?: number
  max_amount?: number | null
  default_amount?: number
  can_be_traded?: boolean
  can_be_gifted?: boolean
  enabled?: boolean
  sort_order?: number
}

export interface CurrencyUpdate extends Partial<CurrencyCreate> {
  id: string
}

// ============================================================================
// PLAYER MANAGEMENT
// ============================================================================

export interface PlayerOverview {
  id: string
  username: string
  email: string
  created_at: string
  last_activity: string | null
  dark_matter: number
  boost_energy: number
  character_class: string | null
  vacation_mode: boolean
  alliance_id: string | null
  alliance_name: string | null
  planets_count: number
  total_points: number
  rank: number
  is_banned: boolean
  ban_reason: string | null
  ban_expires_at: string | null
}

export interface PlayerDetails extends PlayerOverview {
  planets: Array<{
    id: string
    name: string
    galaxy: number
    system: number
    position: number
    planet_type: string
    metal: number
    crystal: number
    deuterium: number
    fields_used: number
    fields_max: number
  }>
  research: Record<string, number>
  active_boosts: Array<{
    id: string
    boost_type: string
    multiplier: number
    ends_at: string
  }>
  fleet_missions: Array<{
    id: string
    mission_type: string
    arrives_at: string
    returning: boolean
  }>
}

export interface ResourceInjection {
  user_id: string
  planet_id?: string
  metal?: number
  crystal?: number
  deuterium?: number
  dark_matter?: number
  boost_energy?: number
  reason: string
}

export interface BanAction {
  user_id: string
  reason: string
  duration_hours?: number
  permanent?: boolean
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface OverviewAnalytics {
  total_users: number
  active_users_24h: number
  active_users_7d: number
  new_users_24h: number
  total_planets: number
  total_fleets_in_motion: number
  total_battles_24h: number
  economy: {
    total_metal: number
    total_crystal: number
    total_deuterium: number
    total_dark_matter: number
  }
}

export interface EconomyAnalytics {
  resource_production: {
    metal_per_hour: number
    crystal_per_hour: number
    deuterium_per_hour: number
  }
  top_producers: Array<{
    user_id: string
    username: string
    metal_per_hour: number
    crystal_per_hour: number
    deuterium_per_hour: number
  }>
  resource_distribution: {
    metal_percentiles: number[]
    crystal_percentiles: number[]
    deuterium_percentiles: number[]
  }
}

export interface PlayerAnalytics {
  registration_trend: Array<{
    date: string
    count: number
  }>
  activity_heatmap: Array<{
    hour: number
    day: number
    count: number
  }>
  class_distribution: Array<{
    class: string
    count: number
  }>
  retention: {
    day_1: number
    day_7: number
    day_30: number
  }
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface AdminApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  has_more: boolean
}
