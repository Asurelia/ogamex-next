/**
 * Contract Ticker
 *
 * Runs every 5 minutes. Expires contracts, finalizes auctions,
 * handles overdue couriers. All persistence via SQLite.
 */

import {
  expireOutstandingContracts, getExpiredAuctions, getOverdueCouriers,
  finishContract, failContract, creditPlayer, debitPlayer,
} from '../services/persistence'

export function tickContracts(): void {
  const nowTs = Math.floor(Date.now() / 1000)

  // 1. Expire outstanding contracts
  expireOutstandingContracts(nowTs)

  // 2. Finalize auctions
  const expiredAuctions = getExpiredAuctions(nowTs)
  for (const auction of expiredAuctions) {
    if (auction.current_bidder_id && (auction.current_bid as number) > 0) {
      const debited = debitPlayer(
        auction.current_bidder_id as string,
        auction.current_bid as number,
        'market_buy',
        `Auction won: ${auction.title}`
      )

      if (debited) {
        creditPlayer(
          auction.issuer_id as string,
          auction.current_bid as number,
          'market_sell',
          `Auction: ${auction.title}`
        )
        finishContract(auction.id as string, auction.current_bidder_id as string, nowTs)
      } else {
        failContract(auction.id as string)
      }
    } else {
      // No bids → expire
      failContract(auction.id as string)
    }
  }

  // 3. Handle overdue couriers
  const overdueCouriers = getOverdueCouriers()
  for (const courier of overdueCouriers) {
    const acceptedAt = courier.accepted_at as number
    const deadline = acceptedAt + (courier.days_to_complete as number) * 86400

    if (nowTs > deadline) {
      if ((courier.collateral as number) > 0) {
        creditPlayer(
          courier.issuer_id as string,
          courier.collateral as number,
          'insurance',
          `Courier collateral forfeited: ${courier.title}`
        )
      }
      failContract(courier.id as string)
    }
  }
}
