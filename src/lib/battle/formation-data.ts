/**
 * Formation Data and Templates
 *
 * This module contains all predefined fleet formation configurations.
 * Extracted from fleet-formations.ts to reduce file size and improve maintainability.
 */

import type {
  FleetFormation,
  FormationType,
  FormationBonuses,
} from './fleet-formations'

// ============================================================================
// DEFAULT BONUSES
// ============================================================================

/**
 * Default (neutral) formation bonuses
 */
export const DEFAULT_FORMATION_BONUSES: FormationBonuses = {
  attackMultiplier: 1.0,
  defenseMultiplier: 1.0,
  speedMultiplier: 1.0,
  accuracyBonus: 0,
  evasionBonus: 0,
  critBonus: 0,
  shieldBonus: 0,
  coordinationBonus: 0,
}

// ============================================================================
// PREDEFINED FORMATIONS
// ============================================================================

/**
 * All available formations
 */
export const FORMATIONS: Record<FormationType, FleetFormation> = {
  line: {
    type: 'line',
    name: 'Line Formation',
    description: 'Classic battle line. Balanced offense and defense.',
    positions: [
      {
        position: 'vanguard',
        role: 'assault',
        fleetPercentage: 30,
        preferredClasses: ['cruiser', 'battleship'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          attackMultiplier: 1.1,
          defenseMultiplier: 0.95,
        },
        exposed: true,
        targetingPriority: 3,
      },
      {
        position: 'center',
        role: 'assault',
        fleetPercentage: 40,
        preferredClasses: ['battleship', 'dreadnought'],
        positionBonuses: { ...DEFAULT_FORMATION_BONUSES },
        exposed: false,
        targetingPriority: 2,
      },
      {
        position: 'rear',
        role: 'artillery',
        fleetPercentage: 30,
        preferredClasses: ['frigate', 'carrier'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          defenseMultiplier: 1.1,
          accuracyBonus: 5,
        },
        exposed: false,
        targetingPriority: 1,
      },
    ],
    globalBonuses: {
      ...DEFAULT_FORMATION_BONUSES,
      coordinationBonus: 0.1,
    },
    requirements: {
      minShips: 10,
      maxShips: 0,
    },
    compositionModifiers: [],
  },

  arrow: {
    type: 'arrow',
    name: 'Arrow Formation',
    description: 'Aggressive wedge. Maximum offensive power at the cost of defense.',
    positions: [
      {
        position: 'vanguard',
        role: 'assault',
        fleetPercentage: 50,
        preferredClasses: ['cruiser', 'battleship', 'dreadnought'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          attackMultiplier: 1.2,
          defenseMultiplier: 0.85,
          critBonus: 5,
        },
        exposed: true,
        targetingPriority: 3,
      },
      {
        position: 'flanks',
        role: 'interception',
        fleetPercentage: 30,
        preferredClasses: ['fighter', 'corvette'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          evasionBonus: 10,
          speedMultiplier: 1.1,
        },
        exposed: true,
        targetingPriority: 2,
      },
      {
        position: 'rear',
        role: 'support',
        fleetPercentage: 20,
        preferredClasses: ['transport', 'utility'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          defenseMultiplier: 1.15,
        },
        exposed: false,
        targetingPriority: 1,
      },
    ],
    globalBonuses: {
      ...DEFAULT_FORMATION_BONUSES,
      attackMultiplier: 1.15,
      defenseMultiplier: 0.9,
      speedMultiplier: 1.1,
    },
    requirements: {
      minShips: 20,
      maxShips: 0,
    },
    compositionModifiers: [
      {
        condition: { shipClass: 'dreadnought', minCount: 1 },
        bonuses: { attackMultiplier: 1.1, critBonus: 3 },
        description: 'Spearhead bonus: Dreadnought leading the charge',
      },
    ],
  },

  defensive_sphere: {
    type: 'defensive_sphere',
    name: 'Defensive Sphere',
    description: 'All-around defense. Protects valuable units in the center.',
    positions: [
      {
        position: 'vanguard',
        role: 'defense',
        fleetPercentage: 25,
        preferredClasses: ['battleship', 'cruiser'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          defenseMultiplier: 1.2,
          shieldBonus: 0.15,
        },
        exposed: true,
        targetingPriority: 3,
      },
      {
        position: 'flanks',
        role: 'defense',
        fleetPercentage: 25,
        preferredClasses: ['cruiser', 'frigate'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          defenseMultiplier: 1.15,
          evasionBonus: 5,
        },
        exposed: true,
        targetingPriority: 3,
      },
      {
        position: 'center',
        role: 'artillery',
        fleetPercentage: 30,
        preferredClasses: ['carrier', 'dreadnought'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          defenseMultiplier: 1.25,
          attackMultiplier: 1.05,
        },
        exposed: false,
        targetingPriority: 1,
      },
      {
        position: 'rear',
        role: 'support',
        fleetPercentage: 20,
        preferredClasses: ['transport', 'utility'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          defenseMultiplier: 1.3,
        },
        exposed: false,
        targetingPriority: 1,
      },
    ],
    globalBonuses: {
      ...DEFAULT_FORMATION_BONUSES,
      attackMultiplier: 0.9,
      defenseMultiplier: 1.2,
      speedMultiplier: 0.9,
      shieldBonus: 0.1,
    },
    requirements: {
      minShips: 15,
      maxShips: 0,
    },
    compositionModifiers: [
      {
        condition: { shipClass: 'battleship', minPercent: 30 },
        bonuses: { shieldBonus: 0.1, defenseMultiplier: 1.05 },
        description: 'Fortress bonus: Battleship wall',
      },
    ],
  },

  carrier_escort: {
    type: 'carrier_escort',
    name: 'Carrier Escort',
    description: 'Protect carriers while maximizing fighter deployment.',
    positions: [
      {
        position: 'vanguard',
        role: 'interception',
        fleetPercentage: 40,
        preferredClasses: ['fighter', 'corvette', 'cruiser'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          evasionBonus: 15,
          attackMultiplier: 1.1,
        },
        exposed: true,
        targetingPriority: 3,
      },
      {
        position: 'center',
        role: 'command',
        fleetPercentage: 20,
        preferredClasses: ['carrier', 'dreadnought'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          defenseMultiplier: 1.2,
          coordinationBonus: 0.2,
        },
        exposed: false,
        targetingPriority: 1,
      },
      {
        position: 'flanks',
        role: 'defense',
        fleetPercentage: 25,
        preferredClasses: ['battleship', 'cruiser'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          defenseMultiplier: 1.1,
        },
        exposed: false,
        targetingPriority: 2,
      },
      {
        position: 'reserve',
        role: 'support',
        fleetPercentage: 15,
        preferredClasses: ['fighter', 'utility'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          evasionBonus: 20,
        },
        exposed: false,
        targetingPriority: 1,
      },
    ],
    globalBonuses: {
      ...DEFAULT_FORMATION_BONUSES,
      coordinationBonus: 0.15,
      evasionBonus: 5,
    },
    requirements: {
      minShips: 30,
      maxShips: 0,
      requiredClasses: ['carrier'],
    },
    compositionModifiers: [
      {
        condition: { shipClass: 'fighter', minPercent: 40 },
        bonuses: { attackMultiplier: 1.15, evasionBonus: 10 },
        description: 'Fighter swarm bonus',
      },
    ],
  },

  pincer: {
    type: 'pincer',
    name: 'Pincer Movement',
    description: 'Flanking attack from multiple sides.',
    positions: [
      {
        position: 'center',
        role: 'defense',
        fleetPercentage: 20,
        preferredClasses: ['battleship'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          defenseMultiplier: 1.1,
        },
        exposed: true,
        targetingPriority: 3,
      },
      {
        position: 'flanks',
        role: 'assault',
        fleetPercentage: 60,
        preferredClasses: ['cruiser', 'battlecruiser', 'fighter'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          attackMultiplier: 1.2,
          critBonus: 10,
          evasionBonus: 5,
        },
        exposed: true,
        targetingPriority: 2,
      },
      {
        position: 'rear',
        role: 'artillery',
        fleetPercentage: 20,
        preferredClasses: ['frigate', 'utility'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          accuracyBonus: 10,
        },
        exposed: false,
        targetingPriority: 1,
      },
    ],
    globalBonuses: {
      ...DEFAULT_FORMATION_BONUSES,
      attackMultiplier: 1.1,
      critBonus: 5,
      coordinationBonus: 0.1,
    },
    requirements: {
      minShips: 25,
      maxShips: 0,
    },
    compositionModifiers: [
      {
        condition: { shipClass: 'cruiser', minPercent: 40 },
        bonuses: { attackMultiplier: 1.1, speedMultiplier: 1.05 },
        description: 'Cruiser pincer bonus',
      },
    ],
  },

  echelon: {
    type: 'echelon',
    name: 'Echelon Formation',
    description: 'Diagonal formation for sweeping attacks.',
    positions: [
      {
        position: 'vanguard',
        role: 'assault',
        fleetPercentage: 35,
        preferredClasses: ['cruiser', 'battlecruiser'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          attackMultiplier: 1.15,
          speedMultiplier: 1.1,
        },
        exposed: true,
        targetingPriority: 3,
      },
      {
        position: 'center',
        role: 'assault',
        fleetPercentage: 35,
        preferredClasses: ['battleship', 'dreadnought'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          attackMultiplier: 1.1,
        },
        exposed: false,
        targetingPriority: 2,
      },
      {
        position: 'rear',
        role: 'artillery',
        fleetPercentage: 30,
        preferredClasses: ['frigate', 'carrier'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          accuracyBonus: 5,
          defenseMultiplier: 1.1,
        },
        exposed: false,
        targetingPriority: 1,
      },
    ],
    globalBonuses: {
      ...DEFAULT_FORMATION_BONUSES,
      speedMultiplier: 1.05,
      attackMultiplier: 1.05,
    },
    requirements: {
      minShips: 15,
      maxShips: 0,
    },
    compositionModifiers: [],
  },

  wolf_pack: {
    type: 'wolf_pack',
    name: 'Wolf Pack',
    description: 'Small group tactics. Excellent for hit-and-run.',
    positions: [
      {
        position: 'vanguard',
        role: 'assault',
        fleetPercentage: 100,
        preferredClasses: ['fighter', 'corvette', 'frigate'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          attackMultiplier: 1.2,
          evasionBonus: 20,
          speedMultiplier: 1.2,
          critBonus: 10,
        },
        exposed: true,
        targetingPriority: 2,
      },
    ],
    globalBonuses: {
      ...DEFAULT_FORMATION_BONUSES,
      attackMultiplier: 1.15,
      evasionBonus: 15,
      speedMultiplier: 1.15,
      defenseMultiplier: 0.85,
    },
    requirements: {
      minShips: 5,
      maxShips: 50,
    },
    compositionModifiers: [
      {
        condition: { shipClass: 'fighter', minPercent: 70 },
        bonuses: { evasionBonus: 10, critBonus: 5 },
        description: 'All-fighter pack bonus',
      },
    ],
  },

  siege: {
    type: 'siege',
    name: 'Siege Formation',
    description: 'Optimized for attacking planetary defenses.',
    positions: [
      {
        position: 'vanguard',
        role: 'defense',
        fleetPercentage: 25,
        preferredClasses: ['battleship', 'dreadnought'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          defenseMultiplier: 1.15,
          shieldBonus: 0.1,
        },
        exposed: true,
        targetingPriority: 3,
      },
      {
        position: 'center',
        role: 'artillery',
        fleetPercentage: 50,
        preferredClasses: ['frigate', 'cruiser', 'dreadnought'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          attackMultiplier: 1.25,
          accuracyBonus: 10,
          damageTypeBonuses: { explosive: 50 },
        },
        exposed: false,
        targetingPriority: 2,
      },
      {
        position: 'rear',
        role: 'support',
        fleetPercentage: 25,
        preferredClasses: ['transport', 'utility', 'carrier'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          defenseMultiplier: 1.2,
        },
        exposed: false,
        targetingPriority: 1,
      },
    ],
    globalBonuses: {
      ...DEFAULT_FORMATION_BONUSES,
      attackMultiplier: 1.1,
      speedMultiplier: 0.85,
      damageTypeBonuses: { explosive: 25 },
    },
    requirements: {
      minShips: 20,
      maxShips: 0,
      minCapitalShipPercent: 20,
    },
    compositionModifiers: [
      {
        condition: { shipKey: 'bomber', minPercent: 20 },
        bonuses: { attackMultiplier: 1.15 },
        description: 'Bomber squadron bonus',
      },
      {
        condition: { shipKey: 'deathstar', minCount: 1 },
        bonuses: { attackMultiplier: 1.3 },
        description: 'Ultimate siege weapon bonus',
      },
    ],
  },

  ambush: {
    type: 'ambush',
    name: 'Ambush Formation',
    description: 'Hidden approach. Devastating first strike.',
    positions: [
      {
        position: 'reserve',
        role: 'assault',
        fleetPercentage: 100,
        preferredClasses: ['fighter', 'corvette', 'cruiser', 'battlecruiser'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          attackMultiplier: 1.3,
          critBonus: 20,
          evasionBonus: 15,
        },
        exposed: false,
        targetingPriority: 1,
      },
    ],
    globalBonuses: {
      ...DEFAULT_FORMATION_BONUSES,
      attackMultiplier: 1.25,
      critBonus: 15,
      evasionBonus: 10,
      defenseMultiplier: 0.9,
      coordinationBonus: 0.2,
    },
    requirements: {
      minShips: 10,
      maxShips: 100,
    },
    compositionModifiers: [
      {
        condition: { shipKey: 'pathfinder', minCount: 1 },
        bonuses: { critBonus: 10, evasionBonus: 10 },
        description: 'Pathfinder reconnaissance bonus',
      },
    ],
  },

  scattered: {
    type: 'scattered',
    name: 'Scattered Formation',
    description: 'Spread out to minimize area damage.',
    positions: [
      {
        position: 'vanguard',
        role: 'assault',
        fleetPercentage: 25,
        preferredClasses: ['fighter', 'corvette'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          evasionBonus: 25,
        },
        exposed: true,
        targetingPriority: 2,
      },
      {
        position: 'center',
        role: 'assault',
        fleetPercentage: 25,
        preferredClasses: ['cruiser', 'battleship'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          evasionBonus: 15,
        },
        exposed: false,
        targetingPriority: 2,
      },
      {
        position: 'flanks',
        role: 'assault',
        fleetPercentage: 25,
        preferredClasses: ['cruiser', 'frigate'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          evasionBonus: 20,
        },
        exposed: false,
        targetingPriority: 2,
      },
      {
        position: 'rear',
        role: 'support',
        fleetPercentage: 25,
        preferredClasses: ['transport', 'utility'],
        positionBonuses: {
          ...DEFAULT_FORMATION_BONUSES,
          evasionBonus: 25,
          defenseMultiplier: 1.1,
        },
        exposed: false,
        targetingPriority: 1,
      },
    ],
    globalBonuses: {
      ...DEFAULT_FORMATION_BONUSES,
      evasionBonus: 15,
      defenseMultiplier: 1.05,
      coordinationBonus: -0.1, // Harder to coordinate
    },
    requirements: {
      minShips: 5,
      maxShips: 0,
    },
    compositionModifiers: [],
  },
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all formation types
 */
export function getFormationTypes(): FormationType[] {
  return Object.keys(FORMATIONS) as FormationType[]
}

/**
 * Get formation by type
 */
export function getFormation(type: FormationType): FleetFormation {
  return FORMATIONS[type]
}

/**
 * Check if formation type exists
 */
export function isValidFormationType(type: string): type is FormationType {
  return type in FORMATIONS
}
