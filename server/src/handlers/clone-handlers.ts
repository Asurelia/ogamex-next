/**
 * Clone & Implant Handlers
 *
 * Jump clone management, medical clone, implant installation.
 * All persistence via SQLite (persistence.ts).
 */

import { Room, Client } from 'colyseus'
import {
  installClone, jumpToClone, destroyClone, getAllClones,
  updatePlayerMedicalClone, installImplant, removeImplant,
  getImplantsForActiveClone,
} from '../services/persistence'

interface PlayerMeta {
  userId: string
  email?: string
  shipId: string
  dbShipId: string
}

export function registerCloneHandlers(
  room: Room,
  getPlayerMeta: (sessionId: string) => PlayerMeta | undefined
): void {

  // Install jump clone at station
  room.onMessage('clone_install', (client: Client, msg: { stationId: string; cloneName?: string }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const clone = installClone(meta.userId, msg.stationId, msg.cloneName || 'Jump Clone')
    if (!clone) {
      client.send('server_error', { code: 'MAX_CLONES', message: 'Maximum 5 jump clones' })
      return
    }

    client.send('clone_update', { action: 'installed', clone })
  })

  // Jump to clone
  room.onMessage('clone_jump', (client: Client, msg: { cloneId: string }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const result = jumpToClone(meta.userId, msg.cloneId)
    if (!result) {
      client.send('server_error', { code: 'COOLDOWN', message: 'Jump clone cooldown active or clone not found' })
      return
    }

    client.send('clone_update', { action: 'jumped', clone: result, cooldownUntil: result.cooldownUntil })

    // Note: system transfer would need station→system lookup from the Colyseus state
    // or cached station data. For now the client handles room switching.
    if (result.station_id) {
      client.send('system_transfer', {
        targetSystemId: '', // client resolves from station
        targetSystemName: `Clone Jump`,
      })
    }
  })

  // Destroy clone
  room.onMessage('clone_destroy', (client: Client, msg: { cloneId: string }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    destroyClone(meta.userId, msg.cloneId)
    client.send('clone_update', { action: 'destroyed', cloneId: msg.cloneId })
  })

  // Get all clones
  room.onMessage('clone_get_all', (client: Client) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const clones = getAllClones(meta.userId)
    client.send('clone_update', { action: 'list', clones })
  })

  // Set medical clone station
  room.onMessage('clone_set_medical', (client: Client, msg: { stationId: string }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    updatePlayerMedicalClone(meta.userId, msg.stationId)
    client.send('clone_update', { action: 'medical_set', stationId: msg.stationId })
  })

  // Install implant
  room.onMessage('implant_install', (client: Client, msg: { cloneId: string; implantTypeId: string; slot: number }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    installImplant(msg.cloneId, msg.implantTypeId, msg.slot)
    client.send('clone_update', { action: 'implant_installed', cloneId: msg.cloneId, slot: msg.slot, implantTypeId: msg.implantTypeId })
  })

  // Remove implant
  room.onMessage('implant_remove', (client: Client, msg: { cloneId: string; slot: number }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    removeImplant(msg.cloneId, msg.slot)
    client.send('clone_update', { action: 'implant_removed', cloneId: msg.cloneId, slot: msg.slot })
  })

  // Get all implants for active clone
  room.onMessage('implant_get_all', (client: Client) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const implants = getImplantsForActiveClone(meta.userId)
    client.send('clone_update', { action: 'implants', implants })
  })
}
