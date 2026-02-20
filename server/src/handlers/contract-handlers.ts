/**
 * Contract Handlers
 *
 * 8 message handlers for the contracts system.
 * All persistence via SQLite (persistence.ts).
 */

import { Room, Client } from 'colyseus'
import {
  createContract, getContractByStatus, updateContractStatus,
  updateContractBid, addContractItem, addContractBid,
  browseContracts, getMyContracts, getContract, getContractItems,
  getContractBids, debitPlayer, creditPlayer,
} from '../services/persistence'

interface PlayerMeta {
  userId: string
  email?: string
  shipId: string
  dbShipId: string
}

function nowUnix(): number {
  return Math.floor(Date.now() / 1000)
}

export function registerContractHandlers(
  room: Room,
  getPlayerMeta: (sessionId: string) => PlayerMeta | undefined
): void {

  // Create contract
  room.onMessage('contract_create', (client: Client, msg: {
    contractType: 'item_exchange' | 'courier' | 'auction'
    title: string
    description?: string
    price: number
    reward?: number
    collateral?: number
    buyoutPrice?: number
    startStationId: string
    endStationId?: string
    volume?: number
    daysToComplete?: number
    items?: Array<{ itemTypeId: string; quantity: number; isIssuerItem: boolean }>
  }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const expiresAt = nowUnix() + (msg.daysToComplete ?? 7) * 86400

    const contract = createContract({
      issuerId: meta.userId,
      contractType: msg.contractType,
      title: msg.title,
      description: msg.description || '',
      price: msg.price,
      reward: msg.reward || 0,
      collateral: msg.collateral || 0,
      buyoutPrice: msg.buyoutPrice || null,
      startStationId: msg.startStationId,
      endStationId: msg.endStationId || null,
      volume: msg.volume || 0,
      daysToComplete: msg.daysToComplete || 7,
      expiresAt,
    })

    if (msg.items && msg.items.length > 0) {
      for (const item of msg.items) {
        addContractItem(contract.id as string, item.itemTypeId, item.quantity, item.isIssuerItem)
      }
    }

    client.send('contract_update', { action: 'created', contract })
  })

  // Accept contract
  room.onMessage('contract_accept', (client: Client, msg: { contractId: string }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const contract = getContractByStatus(msg.contractId, 'outstanding')
    if (!contract) {
      client.send('server_error', { code: 'NOT_FOUND', message: 'Contract not found or unavailable' })
      return
    }

    const now = nowUnix()

    if (contract.contract_type === 'item_exchange') {
      const debited = debitPlayer(meta.userId, contract.price as number, 'market_buy', `Contract: ${contract.title}`)
      if (!debited) {
        client.send('server_error', { code: 'INSUFFICIENT_FUNDS', message: 'Not enough ISK' })
        return
      }
      creditPlayer(contract.issuer_id as string, contract.price as number, 'market_sell', `Contract: ${contract.title}`)
      updateContractStatus(msg.contractId, 'finished', meta.userId, now, now)
    } else if (contract.contract_type === 'courier') {
      if ((contract.collateral as number) > 0) {
        const debited = debitPlayer(meta.userId, contract.collateral as number, 'market_buy', `Courier collateral: ${contract.title}`)
        if (!debited) {
          client.send('server_error', { code: 'INSUFFICIENT_FUNDS', message: 'Not enough ISK for collateral' })
          return
        }
      }
      updateContractStatus(msg.contractId, 'in_progress', meta.userId, now, null)
    }

    client.send('contract_update', { action: 'accepted', contractId: msg.contractId })
  })

  // Complete courier contract
  room.onMessage('contract_complete', (client: Client, msg: { contractId: string }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const contract = getContractByStatus(msg.contractId, 'in_progress')
    if (!contract || contract.assignee_id !== meta.userId) return

    if ((contract.collateral as number) > 0) {
      creditPlayer(meta.userId, contract.collateral as number, 'transfer', 'Collateral returned')
    }
    creditPlayer(meta.userId, contract.reward as number, 'market_sell', `Courier reward: ${contract.title}`)
    debitPlayer(contract.issuer_id as string, contract.reward as number, 'market_buy', `Courier payment: ${contract.title}`)

    updateContractStatus(msg.contractId, 'finished', meta.userId, null, nowUnix())
    client.send('contract_update', { action: 'completed', contractId: msg.contractId })
  })

  // Cancel contract
  room.onMessage('contract_cancel', (client: Client, msg: { contractId: string }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const contract = getContractByStatus(msg.contractId, 'outstanding')
    if (!contract || contract.issuer_id !== meta.userId) return

    updateContractStatus(msg.contractId, 'cancelled', null, null, null)
    client.send('contract_update', { action: 'cancelled', contractId: msg.contractId })
  })

  // Place bid on auction
  room.onMessage('contract_bid', (client: Client, msg: { contractId: string; amount: number }) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const contract = getContractByStatus(msg.contractId, 'outstanding')
    if (!contract || contract.contract_type !== 'auction') return

    if (msg.amount <= (contract.current_bid as number)) {
      client.send('server_error', { code: 'LOW_BID', message: 'Bid must be higher than current bid' })
      return
    }

    // Buyout check
    if (contract.buyout_price && msg.amount >= (contract.buyout_price as number)) {
      const debited = debitPlayer(meta.userId, contract.buyout_price as number, 'market_buy', `Auction buyout: ${contract.title}`)
      if (!debited) {
        client.send('server_error', { code: 'INSUFFICIENT_FUNDS', message: 'Not enough ISK' })
        return
      }
      creditPlayer(contract.issuer_id as string, contract.buyout_price as number, 'market_sell', `Auction: ${contract.title}`)
      updateContractStatus(msg.contractId, 'finished', meta.userId, null, nowUnix())
      updateContractBid(msg.contractId, contract.buyout_price as number, meta.userId)
      client.send('contract_update', { action: 'buyout', contractId: msg.contractId })
      return
    }

    addContractBid(msg.contractId, meta.userId, msg.amount)
    updateContractBid(msg.contractId, msg.amount, meta.userId)
    client.send('contract_update', { action: 'bid_placed', contractId: msg.contractId, amount: msg.amount })
  })

  // Browse contracts
  room.onMessage('contract_browse', (client: Client, msg: { contractType?: string; stationId?: string }) => {
    const contracts = browseContracts(msg.contractType)
    // Attach items to each contract
    for (const c of contracts) {
      c.items = getContractItems(c.id as string)
    }
    client.send('contract_update', { action: 'browse', contracts })
  })

  // Get my contracts
  room.onMessage('contract_get_mine', (client: Client) => {
    const meta = getPlayerMeta(client.sessionId)
    if (!meta) return

    const contracts = getMyContracts(meta.userId)
    for (const c of contracts) {
      c.items = getContractItems(c.id as string)
    }
    client.send('contract_update', { action: 'my_contracts', contracts })
  })

  // Get contract detail
  room.onMessage('contract_get_detail', (client: Client, msg: { contractId: string }) => {
    const contract = getContract(msg.contractId)
    if (contract) {
      contract.items = getContractItems(msg.contractId)
      contract.bids = getContractBids(msg.contractId)
    }
    client.send('contract_update', { action: 'detail', contract })
  })
}
