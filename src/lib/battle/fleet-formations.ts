/**
 * Fleet Formation System
 *
 * Tactical formations that provide combat bonuses based on:
 * - Ship positioning (vanguard, center, flanks, rear, reserve)
 * - Formation type (offensive, defensive, balanced)
 * - Fleet composition (synergies between ship types)
 */

import type { AdvancedCombatUnit, UnitClass } from './advanced-unit'
import type { DamageTypes } from './damage-types'

// ============================================================================
// FORMATION TYPES
// ============================================================================

/**
 * Available fleet formations
 */
export type FormationType =
  | 'line'              // Classic line formation
  | 'arrow'             // Aggressive wedge formation
  | 'defensive_sphere'  // Defensive ball formation
  | 'carrier_escort'    // Carriers protected in center
  | 'pincer'            // Flanking attack formation
  | 'echelon'           // Diagonal formation
  | 'wolf_pack'         // Small group tactics
  | 'siege'             // Optimized for planetary assault
  | 'ambush'            // Hidden approach formation
  | 'scattered'         // Spread out to minimize AoE damage

/**
 * Position in formation
 */
export type FormationPosition =
  | 'vanguard'   // Front line, takes initial fire
  | 'center'     // Main body of the fleet
  | 'flanks'     // Sides, can maneuver
  | 'rear'       // Back line, protected
  | 'reserve'    // Held back, can reinforce

/**
 * Role a unit plays in formation
 */
export type FormationRole =
  | 'assault'     // Primary attack force
  | 'defense'     // Damage absorption
  | 'support'     // Provides bonuses/healing
  | 'artillery'   // Long range damage
  | 'interception' // Anti-fighter/missile
  | 'command'     // Provides fleet bonuses

// ============================================================================
// FORMATION DEFINITION
// ============================================================================

/**
 * Complete formation definition
 */
export interface FleetFormation {
  /** Formation identifier */
  type: FormationType
  /** Display name */
  name: string
  /** Description */
  description: string

  /** Position configuration */
  positions: FormationPositionConfig[]

  /** Global formation bonuses */
  globalBonuses: FormationBonuses

  /** Requirements for this formation */
  requirements: FormationRequirements

  /** Effectiveness modifiers based on fleet composition */
  compositionModifiers: CompositionModifier[]
}

/**
 * Configuration for a position in formation
 */
export interface FormationPositionConfig {
  /** Position type */
  position: FormationPosition
  /** Role at this position */
  role: FormationRole
  /** Percentage of fleet at this position */
  fleetPercentage: number
  /** Unit classes suited for this position */
  preferredClasses: UnitClass[]
  /** Bonuses for units at this position */
  positionBonuses: FormationBonuses
  /** Whether this position is exposed (takes more damage) */
  exposed: boolean
  /** Priority for targeting (higher = targeted first) */
  targetingPriority: number
}

/**
 * Bonuses provided by formation
 */
export interface FormationBonuses {
  /** Attack multiplier (1.0 = no change) */
  attackMultiplier: number
  /** Defense multiplier */
  defenseMultiplier: number
  /** Speed multiplier */
  speedMultiplier: number
  /** Accuracy modifier (percentage) */
  accuracyBonus: number
  /** Evasion modifier (percentage) */
  evasionBonus: number
  /** Critical hit chance modifier */
  critBonus: number
  /** Shield effectiveness */
  shieldBonus: number
  /** Coordination bonus (affects rapid fire) */
  coordinationBonus: number
  /** Damage type bonuses */
  damageTypeBonuses?: Partial<DamageTypes>
}

/**
 * Requirements for using a formation
 */
export interface FormationRequirements {
  /** Minimum number of ships */
  minShips: number
  /** Maximum number of ships (0 = no limit) */
  maxShips: number
  /** Required ship classes */
  requiredClasses?: UnitClass[]
  /** Minimum percentage of capital ships */
  minCapitalShipPercent?: number
  /** Required commander level (future) */
  commanderLevel?: number
}

/**
 * Modifier based on fleet composition
 */
export interface CompositionModifier {
  /** Condition for this modifier */
  condition: CompositionCondition
  /** Bonuses when condition is met */
  bonuses: Partial<FormationBonuses>
  /** Description of this synergy */
  description: string
}

/**
 * Condition for composition modifier
 */
export interface CompositionCondition {
  /** Ship class to check */
  shipClass?: UnitClass
  /** Minimum percentage of this class */
  minPercent?: number
  /** Maximum percentage of this class */
  maxPercent?: number
  /** Minimum count of this class */
  minCount?: number
  /** Specific ship key */
  shipKey?: string
}

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
// FORMATION ASSIGNMENT
// ============================================================================

/**
 * Unit with assigned formation position
 */
export interface FormationUnit {
  unit: AdvancedCombatUnit
  position: FormationPosition
  role: FormationRole
  bonuses: FormationBonuses
}

/**
 * Result of applying a formation to a fleet
 */
export interface AppliedFormation {
  formation: FleetFormation
  units: FormationUnit[]
  totalBonuses: FormationBonuses
  compositionBonusesApplied: string[]
  effectiveness: number // 0-1 based on how well fleet fits formation
}

/**
 * Assign units to formation positions
 */
export function applyFormation(
  units: AdvancedCombatUnit[],
  formationType: FormationType
): AppliedFormation {
  const formation = FORMATIONS[formationType]
  const formationUnits: FormationUnit[] = []
  const unassignedUnits = [...units]

  // Calculate fleet composition
  const composition = calculateFleetComposition(units)

  // Check requirements
  if (!checkRequirements(formation, units, composition)) {
    throw new Error(`Fleet does not meet requirements for ${formation.name}`)
  }

  // Assign units to positions based on preference
  for (const posConfig of formation.positions) {
    const targetCount = Math.ceil(units.length * (posConfig.fleetPercentage / 100))

    for (let i = 0; i < targetCount && unassignedUnits.length > 0; i++) {
      // Find best unit for this position
      const bestUnitIndex = findBestUnitForPosition(unassignedUnits, posConfig)
      const unit = unassignedUnits.splice(bestUnitIndex, 1)[0]

      formationUnits.push({
        unit,
        position: posConfig.position,
        role: posConfig.role,
        bonuses: posConfig.positionBonuses,
      })
    }
  }

  // Assign remaining units to center by default
  for (const unit of unassignedUnits) {
    formationUnits.push({
      unit,
      position: 'center',
      role: 'assault',
      bonuses: { ...DEFAULT_FORMATION_BONUSES },
    })
  }

  // Calculate total bonuses
  const totalBonuses = calculateTotalBonuses(formation, formationUnits, composition)

  // Check composition modifiers
  const compositionBonusesApplied = applyCompositionModifiers(
    formation,
    composition,
    totalBonuses
  )

  // Calculate effectiveness (how well the fleet fits this formation)
  const effectiveness = calculateFormationEffectiveness(formation, formationUnits)

  return {
    formation,
    units: formationUnits,
    totalBonuses,
    compositionBonusesApplied,
    effectiveness,
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate fleet composition
 */
function calculateFleetComposition(
  units: AdvancedCombatUnit[]
): Map<string, { count: number; percent: number }> {
  const composition = new Map<string, { count: number; percent: number }>()
  const total = units.length

  // Count by class
  for (const unit of units) {
    const current = composition.get(unit.unitClass) ?? { count: 0, percent: 0 }
    current.count++
    current.percent = (current.count / total) * 100
    composition.set(unit.unitClass, current)
  }

  // Count by key
  for (const unit of units) {
    const key = `key:${unit.unitKey}`
    const current = composition.get(key) ?? { count: 0, percent: 0 }
    current.count++
    current.percent = (current.count / total) * 100
    composition.set(key, current)
  }

  return composition
}

/**
 * Check if fleet meets formation requirements
 */
function checkRequirements(
  formation: FleetFormation,
  units: AdvancedCombatUnit[],
  composition: Map<string, { count: number; percent: number }>
): boolean {
  const { requirements } = formation

  if (units.length < requirements.minShips) return false
  if (requirements.maxShips > 0 && units.length > requirements.maxShips) return false

  if (requirements.requiredClasses) {
    for (const cls of requirements.requiredClasses) {
      if (!composition.has(cls)) return false
    }
  }

  if (requirements.minCapitalShipPercent) {
    const capitalClasses = ['battleship', 'dreadnought', 'carrier']
    let capitalPercent = 0
    for (const cls of capitalClasses) {
      capitalPercent += composition.get(cls)?.percent ?? 0
    }
    if (capitalPercent < requirements.minCapitalShipPercent) return false
  }

  return true
}

/**
 * Find best unit for a position
 */
function findBestUnitForPosition(
  units: AdvancedCombatUnit[],
  posConfig: FormationPositionConfig
): number {
  let bestIndex = 0
  let bestScore = -1

  for (let i = 0; i < units.length; i++) {
    const unit = units[i]
    let score = 0

    // Prefer units of preferred classes
    if (posConfig.preferredClasses.includes(unit.unitClass)) {
      score += 100
    }

    // Consider unit stats based on role
    switch (posConfig.role) {
      case 'assault':
        score += unit.weaponPower / 100
        break
      case 'defense':
        score += (unit.defense.shield.max + unit.defense.armor.max) / 100
        break
      case 'support':
        score += unit.crew.max / 10
        break
      case 'artillery':
        score += unit.stats.accuracy
        break
      case 'interception':
        score += unit.stats.evasion + unit.stats.pointDefense
        break
      case 'command':
        score += unit.crew.max / 5
        break
    }

    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }

  return bestIndex
}

/**
 * Calculate total formation bonuses
 */
function calculateTotalBonuses(
  formation: FleetFormation,
  units: FormationUnit[],
  composition: Map<string, { count: number; percent: number }>
): FormationBonuses {
  // Start with global bonuses
  const total: FormationBonuses = { ...formation.globalBonuses }

  // Average position bonuses weighted by unit count at each position
  const positionCounts = new Map<FormationPosition, number>()
  const positionBonuses = new Map<FormationPosition, FormationBonuses>()

  for (const fu of units) {
    positionCounts.set(fu.position, (positionCounts.get(fu.position) ?? 0) + 1)
    if (!positionBonuses.has(fu.position)) {
      positionBonuses.set(fu.position, fu.bonuses)
    }
  }

  // Apply weighted position bonuses
  for (const [position, count] of positionCounts) {
    const bonuses = positionBonuses.get(position)
    if (!bonuses) continue

    const weight = count / units.length
    total.attackMultiplier += (bonuses.attackMultiplier - 1) * weight
    total.defenseMultiplier += (bonuses.defenseMultiplier - 1) * weight
    total.speedMultiplier += (bonuses.speedMultiplier - 1) * weight
    total.accuracyBonus += bonuses.accuracyBonus * weight
    total.evasionBonus += bonuses.evasionBonus * weight
    total.critBonus += bonuses.critBonus * weight
    total.shieldBonus += bonuses.shieldBonus * weight
  }

  return total
}

/**
 * Apply composition modifiers
 */
function applyCompositionModifiers(
  formation: FleetFormation,
  composition: Map<string, { count: number; percent: number }>,
  bonuses: FormationBonuses
): string[] {
  const applied: string[] = []

  for (const modifier of formation.compositionModifiers) {
    if (checkCompositionCondition(modifier.condition, composition)) {
      // Apply modifier bonuses
      if (modifier.bonuses.attackMultiplier) {
        bonuses.attackMultiplier *= modifier.bonuses.attackMultiplier
      }
      if (modifier.bonuses.defenseMultiplier) {
        bonuses.defenseMultiplier *= modifier.bonuses.defenseMultiplier
      }
      if (modifier.bonuses.speedMultiplier) {
        bonuses.speedMultiplier *= modifier.bonuses.speedMultiplier
      }
      if (modifier.bonuses.accuracyBonus) {
        bonuses.accuracyBonus += modifier.bonuses.accuracyBonus
      }
      if (modifier.bonuses.evasionBonus) {
        bonuses.evasionBonus += modifier.bonuses.evasionBonus
      }
      if (modifier.bonuses.critBonus) {
        bonuses.critBonus += modifier.bonuses.critBonus
      }
      if (modifier.bonuses.shieldBonus) {
        bonuses.shieldBonus += modifier.bonuses.shieldBonus
      }
      if (modifier.bonuses.coordinationBonus) {
        bonuses.coordinationBonus += modifier.bonuses.coordinationBonus
      }

      applied.push(modifier.description)
    }
  }

  return applied
}

/**
 * Check composition condition
 */
function checkCompositionCondition(
  condition: CompositionCondition,
  composition: Map<string, { count: number; percent: number }>
): boolean {
  let key: string | undefined = condition.shipClass
  if (condition.shipKey) {
    key = `key:${condition.shipKey}`
  }

  if (!key) return true

  const data = composition.get(key)
  if (!data) return false

  if (condition.minPercent && data.percent < condition.minPercent) return false
  if (condition.maxPercent && data.percent > condition.maxPercent) return false
  if (condition.minCount && data.count < condition.minCount) return false

  return true
}

/**
 * Calculate formation effectiveness
 */
function calculateFormationEffectiveness(
  formation: FleetFormation,
  units: FormationUnit[]
): number {
  let score = 0
  let maxScore = 0

  for (const fu of units) {
    maxScore += 100

    // Find position config
    const posConfig = formation.positions.find(p => p.position === fu.position)
    if (!posConfig) {
      score += 50 // Default score for unmatched positions
      continue
    }

    // Check if unit class matches preferred
    if (posConfig.preferredClasses.includes(fu.unit.unitClass)) {
      score += 100
    } else {
      score += 60 // Partial credit
    }
  }

  return maxScore > 0 ? score / maxScore : 0
}

/**
 * Get best formation for a fleet
 */
export function suggestFormation(
  units: AdvancedCombatUnit[]
): { formation: FormationType; effectiveness: number }[] {
  const suggestions: { formation: FormationType; effectiveness: number }[] = []
  const composition = calculateFleetComposition(units)

  for (const [type, formation] of Object.entries(FORMATIONS)) {
    try {
      if (checkRequirements(formation, units, composition)) {
        // Quick effectiveness estimate
        let effectiveness = 0
        let matchCount = 0

        for (const unit of units) {
          for (const pos of formation.positions) {
            if (pos.preferredClasses.includes(unit.unitClass)) {
              matchCount++
              break
            }
          }
        }

        effectiveness = matchCount / units.length

        suggestions.push({
          formation: type as FormationType,
          effectiveness,
        })
      }
    } catch {
      // Formation doesn't meet requirements
    }
  }

  return suggestions.sort((a, b) => b.effectiveness - a.effectiveness)
}

/**
 * Apply formation bonuses to a unit
 */
export function applyFormationBonusesToUnit(
  unit: AdvancedCombatUnit,
  formationUnit: FormationUnit,
  totalBonuses: FormationBonuses
): void {
  // Apply attack multiplier
  unit.damage.ballistic = Math.floor(
    unit.damage.ballistic * totalBonuses.attackMultiplier
  )
  unit.damage.ionic = Math.floor(unit.damage.ionic * totalBonuses.attackMultiplier)
  unit.damage.explosive = Math.floor(
    unit.damage.explosive * totalBonuses.attackMultiplier
  )

  // Apply defense multiplier
  unit.defense.shield.max = Math.floor(
    unit.defense.shield.max * totalBonuses.defenseMultiplier
  )
  unit.defense.shield.current = Math.floor(
    unit.defense.shield.current * totalBonuses.defenseMultiplier
  )
  unit.defense.armor.max = Math.floor(
    unit.defense.armor.max * totalBonuses.defenseMultiplier
  )
  unit.defense.armor.current = Math.floor(
    unit.defense.armor.current * totalBonuses.defenseMultiplier
  )

  // Apply stat bonuses
  unit.stats.accuracy += totalBonuses.accuracyBonus
  unit.stats.evasion += totalBonuses.evasionBonus
  unit.stats.critChance += totalBonuses.critBonus

  // Apply shield bonus
  if (totalBonuses.shieldBonus > 0) {
    const shieldIncrease = Math.floor(unit.defense.shield.max * totalBonuses.shieldBonus)
    unit.defense.shield.max += shieldIncrease
    unit.defense.shield.current += shieldIncrease
  }

  // Apply damage type bonuses
  if (totalBonuses.damageTypeBonuses) {
    if (totalBonuses.damageTypeBonuses.ballistic) {
      unit.damage.ballistic += totalBonuses.damageTypeBonuses.ballistic
    }
    if (totalBonuses.damageTypeBonuses.ionic) {
      unit.damage.ionic += totalBonuses.damageTypeBonuses.ionic
    }
    if (totalBonuses.damageTypeBonuses.explosive) {
      unit.damage.explosive += totalBonuses.damageTypeBonuses.explosive
    }
  }
}
