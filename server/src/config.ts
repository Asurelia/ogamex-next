/**
 * Server Configuration
 *
 * Central configuration for the Colyseus game server.
 * Values here override shared constants where server-specific tuning is needed.
 */

import dotenv from 'dotenv'
dotenv.config({ path: '../.env' })
dotenv.config({ path: '../.env.local' })

// ============================================================================
// ENVIRONMENT
// ============================================================================

export const CONFIG = {
  // Server
  PORT: parseInt(process.env.COLYSEUS_PORT || '2567', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Tick rates
  TICK_RATE: 20,            // Hz - main simulation loop
  NPC_AI_TICK_RATE: 2,      // Hz - NPC decision making
  SKILL_TICK_RATE: 1 / 60,  // Hz - skill training (once per minute)

  // System limits
  MAX_SHIPS_PER_SYSTEM: 200,
  MAX_ASTEROIDS_PER_SYSTEM: 100,
  MAX_NPCS_PER_SYSTEM: 30,
  VISIBILITY_RADIUS: 200000, // 200km in meters

  // Persistence
  SAVE_INTERVAL_MS: 30000,   // Save ship states every 30s
  BATCH_SAVE: true,           // Batch all ships in one write

  // Database
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET || '',

  // SQLite (ephemeral data)
  SQLITE_PATH: process.env.SQLITE_PATH || './data/server.db',
  SQLITE_WAL_MODE: true,

  // CORS
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),

  // Monitor
  ENABLE_MONITOR: process.env.NODE_ENV !== 'production',
} as const

// ============================================================================
// VALIDATION
// ============================================================================

export function validateConfig(): void {
  if (!CONFIG.SUPABASE_URL) {
    console.error('Missing required config: SUPABASE_URL')
    console.error('Make sure .env or .env.local is configured correctly.')
    process.exit(1)
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[Config] SUPABASE_SERVICE_ROLE_KEY not set — using anon key for bootstrap reads (dev mode)')
  }
}
