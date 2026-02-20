/**
 * Corporation Handlers
 *
 * 15 message handlers for corporation management.
 * All persistence via SQLite (persistence.ts).
 */

import { Room, Client } from 'colyseus'
import {
  getOrCreatePlayer, createCorporation, getCorporation,
  getCorpMember, getCorpMembers, setCorpMemberRole, addCorpMember,
  removeCorpMember, transferCeo, setCorpTaxRate, setCorpRecruiting,
  createCorpApplication, getCorpApplication, getCorpPendingApplications,
  updateCorpApplicationStatus, creditCorp, debitCorp, creditPlayer,
  debitPlayer,
} from '../services/persistence'

interface PlayerMeta {
  userId: string
  email?: string
  shipId: string
  dbShipId: string
}

export function registerCorpHandlers(
  room: Room,
  getPlayerMeta: (sessionId: string) => PlayerMeta | undefined
): void {

  // Create corporation
  room.onMessage('corp_create', (client: Client, msg: { name: string; ticker: string }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    if (!msg.ticker || msg.ticker.length < 2 || msg.ticker.length > 5) {
      client.send('server_error', { code: 'INVALID_TICKER', message: 'Ticker must be 2-5 characters' })
      return
    }

    const player = getOrCreatePlayer(meta.userId)
    if (player.corp_id) {
      client.send('server_error', { code: 'ALREADY_IN_CORP', message: 'Leave your current corporation first' })
      return
    }

    try {
      const corp = createCorporation(msg.name, msg.ticker, meta.userId)
      client.send('corp_update', { action: 'created', corp })
    } catch (e: unknown) {
      client.send('server_error', { code: 'CORP_CREATE_FAILED', message: (e as Error).message })
    }
  })

  // Get corporation info
  room.onMessage('corp_get_info', (client: Client, msg: { corpId: string }) => {
    const corp = getCorporation(msg.corpId)
    if (!corp) {
      client.send('server_error', { code: 'CORP_NOT_FOUND', message: 'Corporation not found' })
      return
    }
    client.send('corp_update', { action: 'info', corp })
  })

  // Get members
  room.onMessage('corp_get_members', (client: Client, msg: { corpId: string }) => {
    const members = getCorpMembers(msg.corpId)
    client.send('corp_update', { action: 'members', members })
  })

  // Set member role
  room.onMessage('corp_set_role', (client: Client, msg: { corpId: string; userId: string; role: string }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const callerMember = getCorpMember(msg.corpId, meta.userId)
    if (!callerMember || (callerMember.role !== 'ceo' && callerMember.role !== 'director')) {
      client.send('server_error', { code: 'NO_PERMISSION', message: 'Insufficient permissions' })
      return
    }

    setCorpMemberRole(msg.corpId, msg.userId, msg.role)
    client.send('corp_update', { action: 'role_set', userId: msg.userId, role: msg.role })
  })

  // Set tax rate
  room.onMessage('corp_set_tax', (client: Client, msg: { corpId: string; taxRate: number }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const member = getCorpMember(msg.corpId, meta.userId)
    if (!member || member.role !== 'ceo') {
      client.send('server_error', { code: 'NO_PERMISSION', message: 'Only CEO can set tax rate' })
      return
    }

    const rate = Math.max(0, Math.min(1, msg.taxRate))
    setCorpTaxRate(msg.corpId, rate)
    client.send('corp_update', { action: 'tax_updated', taxRate: rate })
  })

  // Apply to corporation
  room.onMessage('corp_apply', (client: Client, msg: { corpId: string; message?: string }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const player = getOrCreatePlayer(meta.userId)
    if (player.corp_id) {
      client.send('server_error', { code: 'ALREADY_IN_CORP', message: 'Leave your current corporation first' })
      return
    }

    createCorpApplication(msg.corpId, meta.userId, msg.message || '')
    client.send('corp_update', { action: 'application_sent', corpId: msg.corpId })
  })

  // Accept application
  room.onMessage('corp_accept_application', (client: Client, msg: { applicationId: string }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const app = getCorpApplication(msg.applicationId)
    if (!app || app.status !== 'pending') {
      client.send('server_error', { code: 'APP_NOT_FOUND', message: 'Application not found' })
      return
    }

    const callerMember = getCorpMember(app.corp_id as string, meta.userId)
    if (!callerMember || !['ceo', 'director', 'recruiter'].includes(callerMember.role as string)) {
      client.send('server_error', { code: 'NO_PERMISSION', message: 'Insufficient permissions' })
      return
    }

    updateCorpApplicationStatus(msg.applicationId, 'accepted', meta.userId)
    addCorpMember(app.corp_id as string, app.applicant_id as string)
    client.send('corp_update', { action: 'application_accepted', applicantId: app.applicant_id })
  })

  // Reject application
  room.onMessage('corp_reject_application', (client: Client, msg: { applicationId: string }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    updateCorpApplicationStatus(msg.applicationId, 'rejected', meta.userId)
    client.send('corp_update', { action: 'application_rejected' })
  })

  // Leave corporation
  room.onMessage('corp_leave', (client: Client) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const player = getOrCreatePlayer(meta.userId)
    if (!player.corp_id) return

    const corpId = player.corp_id as string
    const member = getCorpMember(corpId, meta.userId)
    if (member?.role === 'ceo') {
      client.send('server_error', { code: 'CEO_CANNOT_LEAVE', message: 'Transfer CEO before leaving' })
      return
    }

    removeCorpMember(corpId, meta.userId)
    client.send('corp_update', { action: 'left' })
  })

  // Kick member
  room.onMessage('corp_kick', (client: Client, msg: { corpId: string; userId: string }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const callerMember = getCorpMember(msg.corpId, meta.userId)
    if (!callerMember || !['ceo', 'director'].includes(callerMember.role as string)) {
      client.send('server_error', { code: 'NO_PERMISSION', message: 'Insufficient permissions' })
      return
    }

    removeCorpMember(msg.corpId, msg.userId)
    client.send('corp_update', { action: 'member_kicked', userId: msg.userId })
  })

  // Transfer CEO
  room.onMessage('corp_transfer_ceo', (client: Client, msg: { corpId: string; newCeoId: string }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const corp = getCorporation(msg.corpId)
    if (!corp || corp.ceo_id !== meta.userId) {
      client.send('server_error', { code: 'NOT_CEO', message: 'Only current CEO can transfer' })
      return
    }

    transferCeo(msg.corpId, meta.userId, msg.newCeoId)
    client.send('corp_update', { action: 'ceo_transferred', newCeoId: msg.newCeoId })
  })

  // Deposit to corp wallet
  room.onMessage('corp_deposit', (client: Client, msg: { corpId: string; amount: number; division?: number }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const debited = debitPlayer(meta.userId, msg.amount, 'transfer', `Corp deposit to div ${msg.division ?? 1}`)
    if (!debited) {
      client.send('server_error', { code: 'INSUFFICIENT_FUNDS', message: 'Not enough ISK' })
      return
    }

    creditCorp(msg.corpId, msg.amount, msg.division ?? 1, 'deposit', 'Player deposit', meta.userId)
    client.send('corp_update', { action: 'deposit_complete', amount: msg.amount })
  })

  // Withdraw from corp wallet
  room.onMessage('corp_withdraw', (client: Client, msg: { corpId: string; amount: number; division?: number }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const member = getCorpMember(msg.corpId, meta.userId)
    if (!member || !['ceo', 'director', 'accountant'].includes(member.role as string)) {
      client.send('server_error', { code: 'NO_PERMISSION', message: 'Insufficient permissions' })
      return
    }

    const debited = debitCorp(msg.corpId, msg.amount, msg.division ?? 1, 'withdrawal', 'Player withdrawal', meta.userId)
    if (!debited) {
      client.send('server_error', { code: 'INSUFFICIENT_FUNDS', message: 'Corp wallet insufficient' })
      return
    }

    creditPlayer(meta.userId, msg.amount, 'transfer', `Corp withdrawal from div ${msg.division ?? 1}`)
    client.send('corp_update', { action: 'withdrawal_complete', amount: msg.amount })
  })

  // Set recruiting status
  room.onMessage('corp_set_recruiting', (client: Client, msg: { corpId: string; recruiting: boolean }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    setCorpRecruiting(msg.corpId, msg.recruiting)
    client.send('corp_update', { action: 'recruiting_updated', recruiting: msg.recruiting })
  })

  // Get applications
  room.onMessage('corp_get_applications', (client: Client, msg: { corpId: string }) => {
    const apps = getCorpPendingApplications(msg.corpId)
    client.send('corp_update', { action: 'applications', applications: apps })
  })
}
