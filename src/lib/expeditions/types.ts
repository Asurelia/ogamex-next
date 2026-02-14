/**
 * Expedition Types
 * Types for expedition mission events and outcomes
 */

import type { Resources, ShipCounts } from '@/lib/missions/types'

/**
 * Expedition event types with their descriptions
 */
export enum ExpeditionEventType {
  /** No discovery - empty result */
  NOTHING = 'nothing',
  /** Found resources floating in space */
  RESOURCES = 'resources',
  /** Found abandoned ships */
  SHIPS = 'ships',
  /** Found dark matter */
  DARK_MATTER = 'dark_matter',
  /** Attacked by pirates */
  PIRATES = 'pirates',
  /** Attacked by hostile aliens */
  ALIENS = 'aliens',
  /** Caught in a black hole */
  BLACK_HOLE = 'black_hole',
  /** Navigation delay */
  DELAY = 'delay',
  /** Found shortcut - faster return */
  SPEED_BONUS = 'speed_bonus',
}

/**
 * Expedition event probabilities (must sum to 100)
 */
export const EXPEDITION_PROBABILITIES: Record<ExpeditionEventType, number> = {
  [ExpeditionEventType.NOTHING]: 30,
  [ExpeditionEventType.RESOURCES]: 25,
  [ExpeditionEventType.SHIPS]: 10,
  [ExpeditionEventType.DARK_MATTER]: 5,
  [ExpeditionEventType.PIRATES]: 10,
  [ExpeditionEventType.ALIENS]: 5,
  [ExpeditionEventType.BLACK_HOLE]: 2,
  [ExpeditionEventType.DELAY]: 8,
  [ExpeditionEventType.SPEED_BONUS]: 5,
}

/**
 * Expedition event with result details
 */
export interface ExpeditionEvent {
  /** Type of event that occurred */
  type: ExpeditionEventType
  /** Numeric value (resources amount, dark matter, time modifier %) */
  value?: number
  /** Resources found (for RESOURCES event) */
  resources?: Resources
  /** Ships found or lost */
  ships?: Partial<ShipCounts>
  /** Event message for the player */
  message: string
}

/**
 * Result of expedition processing
 */
export interface ExpeditionResult {
  /** Event that occurred */
  event: ExpeditionEvent
  /** Resources to add to return cargo */
  resourcesGained: Resources
  /** Dark matter gained */
  darkMatterGained: number
  /** Ships gained (found) */
  shipsGained: Partial<ShipCounts>
  /** Ships lost (combat/black hole) */
  shipsLost: Partial<ShipCounts>
  /** Time modifier for return trip (1.0 = normal, 0.5 = 50% faster, 1.5 = 50% slower) */
  timeModifier: number
}

/**
 * Expedition messages by event type
 */
export const EXPEDITION_MESSAGES: Record<ExpeditionEventType, string[]> = {
  [ExpeditionEventType.NOTHING]: [
    'The expedition explored the sector but found nothing of interest.',
    'Despite thorough scanning, the fleet returned empty-handed.',
    'The region of space was completely empty. The fleet is returning.',
    'Your expedition found only the cold void of space.',
  ],
  [ExpeditionEventType.RESOURCES]: [
    'Your expedition discovered an asteroid field rich with resources!',
    'The fleet found debris from an ancient battle containing valuable materials.',
    'Scanners detected a derelict cargo ship with its hold still intact.',
    'Your explorers located a mineral-rich planetoid and extracted resources.',
  ],
  [ExpeditionEventType.SHIPS]: [
    'Your expedition discovered an abandoned fleet drifting in space!',
    'The crew found derelict ships that could be restored to operational status.',
    'An ancient warship graveyard was discovered with salvageable vessels.',
    'Your fleet encountered survivors with functional ships who joined you.',
  ],
  [ExpeditionEventType.DARK_MATTER]: [
    'Your scientists detected an anomaly containing dark matter!',
    'The expedition found a dark matter pocket in a spatial rift.',
    'Rare dark matter crystals were discovered in an asteroid field.',
    'An ancient research station contained preserved dark matter samples.',
  ],
  [ExpeditionEventType.PIRATES]: [
    'Your fleet was ambushed by pirates!',
    'Space pirates attacked your expedition from hidden positions!',
    'A pirate armada emerged from behind an asteroid and engaged your fleet!',
    'Raiders attempted to capture your expedition ships!',
  ],
  [ExpeditionEventType.ALIENS]: [
    'Hostile alien vessels engaged your expedition!',
    'Unknown alien warships attacked without warning!',
    'Your fleet encountered aggressive extraterrestrial hostiles!',
    'Alien defenders emerged to protect their territory!',
  ],
  [ExpeditionEventType.BLACK_HOLE]: [
    'Your expedition was caught in a black hole\'s gravitational pull!',
    'A sudden gravitational anomaly consumed part of your fleet!',
    'An unstable wormhole opened and swallowed several ships!',
    'Dark matter instability caused a micro black hole to form!',
  ],
  [ExpeditionEventType.DELAY]: [
    'Navigation errors caused your fleet to take a longer route.',
    'Engine malfunctions forced your expedition to travel at reduced speed.',
    'An asteroid field blocked the direct path, requiring a detour.',
    'Spatial interference disrupted navigation systems.',
  ],
  [ExpeditionEventType.SPEED_BONUS]: [
    'Your fleet discovered a stable wormhole shortcut!',
    'Favorable solar winds boosted your fleet\'s speed.',
    'The navigation AI calculated an optimal return trajectory.',
    'A gravitational slingshot around a gas giant accelerated the fleet.',
  ],
}

/**
 * Fleet power thresholds for expedition outcomes
 * Higher fleet power = better chances and rewards
 */
export const FLEET_POWER_TIERS = {
  /** Minimum fleet for expedition */
  MINIMUM: 1_000,
  /** Small fleet - basic rewards */
  SMALL: 10_000,
  /** Medium fleet - moderate rewards */
  MEDIUM: 100_000,
  /** Large fleet - good rewards */
  LARGE: 1_000_000,
  /** Huge fleet - maximum rewards */
  HUGE: 10_000_000,
} as const
