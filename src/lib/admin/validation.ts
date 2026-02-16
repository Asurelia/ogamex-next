/**
 * Admin Validation Schemas
 * Zod schemas for validating admin operations
 */

import { z } from 'zod'

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const uuidSchema = z.string().uuid('Invalid UUID format')

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const searchSchema = z.object({
  search: z.string().max(100).optional(),
})

// ============================================================================
// FLEET SCHEMAS
// ============================================================================

export const fleetMissionTypeSchema = z.enum([
  'attack',
  'transport',
  'deploy',
  'colonize',
  'recycle',
  'espionage',
  'expedition',
  'acs_attack',
  'acs_defend',
  'destroy',
  'harvest',
])

export const fleetFilterSchema = z.object({
  user_id: uuidSchema.optional(),
  mission_type: fleetMissionTypeSchema.optional(),
  returning: z.coerce.boolean().optional(),
  status: z.enum(['active', 'returning', 'all']).default('all'),
  ...paginationSchema.shape,
  ...searchSchema.shape,
})

export const fleetShipsSchema = z.record(
  z.string(),
  z.number().int().min(0)
).refine(
  (ships) => Object.values(ships).some(count => count > 0),
  'At least one ship type must have a count > 0'
)

export const fleetCreateSchema = z.object({
  user_id: uuidSchema,
  origin_planet_id: uuidSchema,
  target_galaxy: z.number().int().min(1).max(9),
  target_system: z.number().int().min(1).max(499),
  target_position: z.number().int().min(1).max(15),
  mission_type: fleetMissionTypeSchema,
  ships: fleetShipsSchema,
  cargo_metal: z.number().int().min(0).default(0),
  cargo_crystal: z.number().int().min(0).default(0),
  cargo_deuterium: z.number().int().min(0).default(0),
  speed_percent: z.number().int().min(10).max(100).default(100),
  arrival_time: z.string().datetime().optional(),
})

export const fleetUpdateSchema = z.object({
  id: uuidSchema,
  arrival_time: z.string().datetime().optional(),
  returning: z.coerce.boolean().optional(),
  cargo_metal: z.number().int().min(0).optional(),
  cargo_crystal: z.number().int().min(0).optional(),
  cargo_deuterium: z.number().int().min(0).optional(),
  cancelled: z.coerce.boolean().optional(),
})

export const fleetDeleteSchema = z.object({
  id: uuidSchema,
  reason: z.string().min(3).max(500),
})

export const fleetBulkDeleteSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(50),
  reason: z.string().min(3).max(500),
})

// ============================================================================
// PLANET SCHEMAS
// ============================================================================

export const planetTypeSchema = z.enum([
  'planet',
  'moon',
  'asteroid',
  'gas_giant',
])

export const planetFilterSchema = z.object({
  user_id: uuidSchema.optional(),
  galaxy: z.coerce.number().int().min(1).max(9).optional(),
  system: z.coerce.number().int().min(1).max(499).optional(),
  planet_type: planetTypeSchema.optional(),
  ...paginationSchema.shape,
  ...searchSchema.shape,
})

export const planetResourcesSchema = z.object({
  metal: z.number().min(0).optional(),
  crystal: z.number().min(0).optional(),
  deuterium: z.number().min(0).optional(),
})

export const planetBuildingsSchema = z.record(
  z.string(),
  z.number().int().min(0).max(100)
)

export const planetCreateSchema = z.object({
  user_id: uuidSchema,
  name: z.string().min(2).max(32),
  galaxy: z.number().int().min(1).max(9),
  system: z.number().int().min(1).max(499),
  position: z.number().int().min(1).max(15),
  planet_type: planetTypeSchema.default('planet'),
  diameter: z.number().int().min(1000).max(20000).optional(),
  temperature_min: z.number().int().min(-200).max(200).optional(),
  temperature_max: z.number().int().min(-200).max(300).optional(),
  fields_max: z.number().int().min(1).max(500).optional(),
  resources: planetResourcesSchema.optional(),
})

export const planetUpdateSchema = z.object({
  id: uuidSchema,
  name: z.string().min(2).max(32).optional(),
  metal: z.number().min(0).optional(),
  crystal: z.number().min(0).optional(),
  deuterium: z.number().min(0).optional(),
  fields_max: z.number().int().min(1).max(500).optional(),
  buildings: planetBuildingsSchema.optional(),
})

export const planetDeleteSchema = z.object({
  id: uuidSchema,
  reason: z.string().min(3).max(500),
})

export const planetTransferSchema = z.object({
  planet_id: uuidSchema,
  new_user_id: uuidSchema,
  reason: z.string().min(3).max(500),
})

// ============================================================================
// ALLIANCE SCHEMAS
// ============================================================================

export const allianceRankSchema = z.enum([
  'leader',
  'co_leader',
  'officer',
  'veteran',
  'member',
  'applicant',
])

export const allianceFilterSchema = z.object({
  min_members: z.coerce.number().int().min(0).optional(),
  max_members: z.coerce.number().int().min(1).optional(),
  ...paginationSchema.shape,
  ...searchSchema.shape,
})

export const allianceCreateSchema = z.object({
  name: z.string().min(3).max(32),
  tag: z.string().min(2).max(8).toUpperCase(),
  founder_id: uuidSchema,
  description: z.string().max(2000).optional(),
  logo_url: z.string().url().optional(),
  homepage: z.string().url().optional(),
  application_open: z.boolean().default(true),
})

export const allianceUpdateSchema = z.object({
  id: uuidSchema,
  name: z.string().min(3).max(32).optional(),
  tag: z.string().min(2).max(8).toUpperCase().optional(),
  description: z.string().max(2000).optional(),
  logo_url: z.string().url().nullable().optional(),
  homepage: z.string().url().nullable().optional(),
  application_open: z.boolean().optional(),
})

export const allianceDeleteSchema = z.object({
  id: uuidSchema,
  reason: z.string().min(3).max(500),
  reassign_members_to: uuidSchema.optional(), // Alliance to move members to
})

export const allianceMemberActionSchema = z.object({
  alliance_id: uuidSchema,
  user_id: uuidSchema,
  action: z.enum(['add', 'remove', 'promote', 'demote', 'set_rank']),
  rank: allianceRankSchema.optional(),
  reason: z.string().min(3).max(500).optional(),
})

export const allianceBulkMemberActionSchema = z.object({
  alliance_id: uuidSchema,
  user_ids: z.array(uuidSchema).min(1).max(50),
  action: z.enum(['remove', 'set_rank']),
  rank: allianceRankSchema.optional(),
  reason: z.string().min(3).max(500),
})

// ============================================================================
// AUDIT LOG SCHEMA
// ============================================================================

export const auditLogEntrySchema = z.object({
  admin_id: uuidSchema,
  action: z.string(),
  entity_type: z.string(),
  entity_id: uuidSchema.optional(),
  old_value: z.record(z.unknown()).optional(),
  new_value: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type FleetFilter = z.infer<typeof fleetFilterSchema>
export type FleetCreate = z.infer<typeof fleetCreateSchema>
export type FleetUpdate = z.infer<typeof fleetUpdateSchema>
export type FleetDelete = z.infer<typeof fleetDeleteSchema>
export type FleetBulkDelete = z.infer<typeof fleetBulkDeleteSchema>

export type PlanetFilter = z.infer<typeof planetFilterSchema>
export type PlanetCreate = z.infer<typeof planetCreateSchema>
export type PlanetUpdate = z.infer<typeof planetUpdateSchema>
export type PlanetDelete = z.infer<typeof planetDeleteSchema>
export type PlanetTransfer = z.infer<typeof planetTransferSchema>

export type AllianceFilter = z.infer<typeof allianceFilterSchema>
export type AllianceCreate = z.infer<typeof allianceCreateSchema>
export type AllianceUpdate = z.infer<typeof allianceUpdateSchema>
export type AllianceDelete = z.infer<typeof allianceDeleteSchema>
export type AllianceMemberAction = z.infer<typeof allianceMemberActionSchema>
export type AllianceBulkMemberAction = z.infer<typeof allianceBulkMemberActionSchema>

export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>
