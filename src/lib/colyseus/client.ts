/**
 * Colyseus Client Singleton
 *
 * Manages connection to the Colyseus game server.
 */

import { Client, Room } from 'colyseus.js'

let client: Client | null = null
let currentRoom: Room | null = null

const COLYSEUS_URL = process.env.NEXT_PUBLIC_COLYSEUS_URL || 'ws://localhost:2567'

/**
 * Get or create the Colyseus client singleton
 */
export function getClient(): Client {
  if (!client) {
    client = new Client(COLYSEUS_URL)
  }
  return client
}

/**
 * Join a solar system room
 */
export async function joinSystem(systemId: string, token: string): Promise<Room> {
  // Leave current room if any
  if (currentRoom) {
    await currentRoom.leave()
    currentRoom = null
  }

  const c = getClient()
  currentRoom = await c.joinOrCreate('system', {
    systemId,
    token,
  })

  return currentRoom
}

/**
 * Get the current room (null if not connected)
 */
export function getCurrentRoom(): Room | null {
  return currentRoom
}

/**
 * Leave the current room
 */
export async function leaveRoom(): Promise<void> {
  if (currentRoom) {
    await currentRoom.leave()
    currentRoom = null
  }
}

/**
 * Send a message to the current room
 */
export function sendMessage(type: string, data?: unknown): void {
  if (currentRoom) {
    currentRoom.send(type, data)
  }
}

/**
 * Check if connected to a room
 */
export function isConnected(): boolean {
  return currentRoom !== null
}
