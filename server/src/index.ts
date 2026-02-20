/**
 * Colyseus Game Server Entry Point
 *
 * Express + Colyseus with system rooms, health endpoint, and optional monitor.
 * Bootstraps static data from Supabase into SQLite/memory at startup.
 */

import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'colyseus'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { monitor } from '@colyseus/monitor'
import { CONFIG, validateConfig } from './config'
import { SystemRoom } from './rooms/SystemRoom'
import { initSQLite } from './db/sqlite'
import {
  loadSkillDefinitions, loadImplantTypes,
  loadWormholeSystems, loadPlanetResources,
} from './db/supabase'
import {
  cacheSkillDefinition, cacheImplantType,
} from './services/persistence'
import { getSQLite } from './db/sqlite'

// Validate environment
validateConfig()

const app = express()

// Middleware
app.use(cors({ origin: CONFIG.CORS_ORIGINS }))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    rooms: gameServer.rooms.size,
    timestamp: Date.now(),
  })
})

// Create HTTP server
const httpServer = createServer(app)

// Create Colyseus server
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
})

// Define rooms
gameServer.define('system', SystemRoom)

// Monitor (development only)
if (CONFIG.ENABLE_MONITOR) {
  app.use('/colyseus', monitor())
}

// Initialize SQLite for all gameplay persistence + ephemeral data
initSQLite()

// ============================================================================
// BOOTSTRAP: Load static data from Supabase into SQLite/memory
// ============================================================================

async function bootstrapStaticData(): Promise<void> {
  console.log('[Bootstrap] Loading static data from Supabase...')

  // 1. Skill definitions → cached_skill_definitions table + in-memory
  try {
    const skillDefs = await loadSkillDefinitions()
    for (const def of skillDefs) {
      cacheSkillDefinition(
        def.type_id as number,
        (def.name as string) || '',
        (def.rank as number) || 1,
        def.primary_attribute as number,
        def.secondary_attribute as number,
        (def.description as string) || ''
      )
    }
    console.log(`[Bootstrap] Cached ${skillDefs.length} skill definitions`)
  } catch (e) {
    console.error('[Bootstrap] Failed to load skill definitions:', e)
  }

  // 2. Implant types → cached_implant_types table + in-memory
  try {
    const implantTypes = await loadImplantTypes()
    for (const imp of implantTypes) {
      cacheImplantType(
        imp.id as string,
        (imp.name as string) || '',
        (imp.slot as number) || 0,
        (imp.attribute as string) || null,
        (imp.bonus as number) || 0,
        (imp.description as string) || ''
      )
    }
    console.log(`[Bootstrap] Cached ${implantTypes.length} implant types`)
  } catch (e) {
    console.error('[Bootstrap] Failed to load implant types:', e)
  }

  // 3. Wormhole systems → wormhole_systems table in SQLite
  try {
    const whSystems = await loadWormholeSystems()
    const db = getSQLite()
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO wormhole_systems (system_id, wh_class, effect, static_connection_type)
      VALUES (?, ?, ?, ?)
    `)
    const tx = db.transaction(() => {
      for (const wh of whSystems) {
        stmt.run(wh.system_id, wh.wh_class, wh.effect || null, wh.static_connection_type || null)
      }
    })
    tx()
    console.log(`[Bootstrap] Cached ${whSystems.length} wormhole systems`)
  } catch (e) {
    console.error('[Bootstrap] Failed to load wormhole systems:', e)
  }

  // 4. Planet resources → planet_resources table in SQLite
  try {
    const resources = await loadPlanetResources()
    const db = getSQLite()
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO planet_resources (id, planet_id, resource_type, abundance)
      VALUES (?, ?, ?, ?)
    `)
    const tx = db.transaction(() => {
      for (const r of resources) {
        stmt.run(r.id, r.planet_id, r.resource_type, r.abundance)
      }
    })
    tx()
    console.log(`[Bootstrap] Cached ${resources.length} planet resources`)
  } catch (e) {
    console.error('[Bootstrap] Failed to load planet resources:', e)
  }

  console.log('[Bootstrap] Static data loading complete')
}

// Start server
async function start() {
  await bootstrapStaticData()

  await gameServer.listen(CONFIG.PORT)
  console.log(`[Server] Colyseus game server running on port ${CONFIG.PORT}`)
  console.log(`[Server] Environment: ${CONFIG.NODE_ENV}`)
  console.log(`[Server] Tick rate: ${CONFIG.TICK_RATE}Hz`)
  if (CONFIG.ENABLE_MONITOR) {
    console.log(`[Server] Monitor: http://localhost:${CONFIG.PORT}/colyseus`)
  }
}

start().catch(err => {
  console.error('[Server] Failed to start:', err)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...')
  gameServer.gracefullyShutdown().then(() => {
    console.log('[Server] Shutdown complete')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down...')
  gameServer.gracefullyShutdown().then(() => {
    console.log('[Server] Shutdown complete')
    process.exit(0)
  })
})
