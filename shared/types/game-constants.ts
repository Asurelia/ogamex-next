/**
 * Game Constants - Shared between client and server
 *
 * All values that both client and server need to agree on.
 */

// ============================================================================
// TICK RATES
// ============================================================================

/** Server simulation tick rate (Hz) */
export const TICK_RATE = 20

/** Server tick interval in milliseconds */
export const TICK_INTERVAL_MS = 1000 / TICK_RATE

/** NPC AI update rate (Hz) - lower to save CPU */
export const NPC_AI_TICK_RATE = 2

/** Skill training tick interval (seconds) */
export const SKILL_TICK_INTERVAL = 60

// ============================================================================
// PHYSICS
// ============================================================================

/** Maximum ship speed cap (m/s) */
export const MAX_SHIP_SPEED = 20000

/** Warp spool-up time (seconds) */
export const WARP_SPOOL_TIME = 3.0

/** Minimum warp distance (m) */
export const MIN_WARP_DISTANCE = 150000 // 150km

/** 1 AU in meters (Astronomical Unit) */
export const AU_IN_METERS = 149_597_870_700

/** Default orbit range if not specified (m) */
export const DEFAULT_ORBIT_RANGE = 5000

/** Approach complete distance (m) */
export const APPROACH_THRESHOLD = 500

// ============================================================================
// COMBAT
// ============================================================================

/** Minimum weapon range (m) */
export const MIN_WEAPON_RANGE = 1000

/** Maximum weapon range (m) */
export const MAX_WEAPON_RANGE = 250000

/** Lock-on time per scan resolution point (seconds) */
export const LOCK_TIME_BASE = 40000

/** Maximum locked targets per ship (hard cap) */
export const MAX_LOCKED_TARGETS = 10

/** Aggression timer duration (seconds) */
export const AGGRESSION_TIMER = 60

/** Weapons timer duration (seconds) */
export const WEAPONS_TIMER = 60

// ============================================================================
// MINING
// ============================================================================

/** Mining range (m) */
export const MINING_RANGE = 10000

/** Base mining yield per cycle (m3) */
export const BASE_MINING_YIELD = 10

/** Mining cycle time (seconds) */
export const MINING_CYCLE_TIME = 30

// ============================================================================
// VISIBILITY / INTEREST MANAGEMENT
// ============================================================================

/** Maximum visibility radius (m) */
export const VISIBILITY_RADIUS = 200000 // 200km

/** Spatial grid cell size (m) */
export const SPATIAL_GRID_CELL_SIZE = 50000 // 50km

/** Near range for high-frequency updates (m) */
export const NEAR_RANGE = 20000

/** Medium range for regular updates (m) */
export const MID_RANGE = 100000

// ============================================================================
// SYSTEM LIMITS
// ============================================================================

/** Maximum ships in a single system room */
export const MAX_SHIPS_PER_SYSTEM = 200

/** Maximum asteroids per system */
export const MAX_ASTEROIDS_PER_SYSTEM = 100

/** Maximum NPCs per system */
export const MAX_NPCS_PER_SYSTEM = 30

// ============================================================================
// PERSISTENCE
// ============================================================================

/** Save interval for ship states to Supabase (ms) */
export const SAVE_INTERVAL_MS = 30000

/** Chat log rotation interval (hours) */
export const CHAT_LOG_ROTATION_HOURS = 24

// ============================================================================
// CLIENT
// ============================================================================

/** Client interpolation frames buffer */
export const INTERPOLATION_BUFFER_SIZE = 3

/** Client prediction lerp factor */
export const PREDICTION_LERP_FACTOR = 0.1

/** Client max reconnect attempts */
export const MAX_RECONNECT_ATTEMPTS = 5

/** Client reconnect base delay (ms) */
export const RECONNECT_BASE_DELAY = 1000

// ============================================================================
// LOD DISTANCES (m)
// ============================================================================

/** Full detail model */
export const LOD_FULL = 10000

/** Simplified model */
export const LOD_SIMPLE = 50000

/** Billboard sprite */
export const LOD_BILLBOARD = 200000

// ============================================================================
// SECURITY LEVELS
// ============================================================================

export const SECURITY_COLORS: Record<string, string> = {
  '1.0': '#00ff00',
  '0.9': '#22dd22',
  '0.8': '#44cc44',
  '0.7': '#66bb66',
  '0.6': '#88aa44',
  '0.5': '#aa9922',
  '0.4': '#cc7700',
  '0.3': '#dd5500',
  '0.2': '#ee3300',
  '0.1': '#ff1100',
  '0.0': '#ff0000',
}

/**
 * Get security status color
 */
export function getSecurityColor(secLevel: number): string {
  const rounded = (Math.round(secLevel * 10) / 10).toFixed(1)
  return SECURITY_COLORS[rounded] ?? '#ff0000'
}

/**
 * Security classification
 */
export function getSecurityClass(secLevel: number): 'highsec' | 'lowsec' | 'nullsec' {
  if (secLevel >= 0.5) return 'highsec'
  if (secLevel > 0.0) return 'lowsec'
  return 'nullsec'
}
