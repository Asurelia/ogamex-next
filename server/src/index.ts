/**
 * Colyseus Game Server Entry Point
 *
 * Express + Colyseus with system rooms, health endpoint, and optional monitor.
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

// Initialize SQLite for ephemeral data
initSQLite()

// Start server
gameServer.listen(CONFIG.PORT).then(() => {
  console.log(`[Server] Colyseus game server running on port ${CONFIG.PORT}`)
  console.log(`[Server] Environment: ${CONFIG.NODE_ENV}`)
  console.log(`[Server] Tick rate: ${CONFIG.TICK_RATE}Hz`)
  if (CONFIG.ENABLE_MONITOR) {
    console.log(`[Server] Monitor: http://localhost:${CONFIG.PORT}/colyseus`)
  }
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
