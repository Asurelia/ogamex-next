/**
 * Wallet Service — Re-exports from persistence.ts
 *
 * Kept for backward compatibility with any remaining imports.
 */

export {
  getPlayerBalance,
  creditPlayer,
  debitPlayer,
  transferBetweenPlayers,
  getCorpBalance,
  creditCorp,
  debitCorp,
} from './persistence'
