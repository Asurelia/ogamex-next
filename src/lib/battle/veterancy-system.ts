/**
 * Unit Veterancy System
 *
 * Experience-based progression system where units gain combat bonuses
 * based on accumulated battle experience. Units can achieve veterancy
 * ranks that provide permanent stat bonuses and unlock special abilities.
 */

import type { AdvancedCombatUnit, UnitClass } from './advanced-unit'

// ============================================================================
// VETERANCY TYPES
// ============================================================================

/**
 * Veterancy rank levels
 */
export type VeterancyRank =
  | 'recruit'     // No experience
  | 'trained'     // Basic training complete
  | 'veteran'     // Combat experienced
  | 'elite'       // Highly skilled
  | 'legendary'   // Battle-hardened heroes

/**
 * Experience gained from different actions
 */
export type ExperienceAction =
  | 'damage_dealt'
  | 'damage_taken'
  | 'kill'
  | 'critical_hit'
  | 'boarding_success'
  | 'boarding_defense'
  | 'survive_battle'
  | 'win_battle'
  | 'lose_battle'

// ============================================================================
// VETERANCY CONFIGURATION
// ============================================================================

/**
 * Experience requirements for each rank
 */
export const RANK_THRESHOLDS: Record<VeterancyRank, number> = {
  recruit: 0,
  trained: 100,
  veteran: 500,
  elite: 2000,
  legendary: 10000,
}

/**
 * Rank order for comparison
 */
export const RANK_ORDER: VeterancyRank[] = [
  'recruit',
  'trained',
  'veteran',
  'elite',
  'legendary',
]

/**
 * Experience gained per action
 */
export const EXPERIENCE_GAINS: Record<ExperienceAction, number> = {
  damage_dealt: 1,      // Per 100 damage dealt
  damage_taken: 0.5,    // Per 100 damage survived
  kill: 25,             // Per enemy destroyed
  critical_hit: 5,      // Per critical hit landed
  boarding_success: 50, // Successfully boarded enemy ship
  boarding_defense: 30, // Successfully defended against boarding
  survive_battle: 10,   // Survived any battle
  win_battle: 20,       // On winning side
  lose_battle: 5,       // On losing side (still survived)
}

/**
 * Stat bonuses per rank
 */
export interface RankBonuses {
  /** Damage multiplier (1.0 = no change) */
  damageMultiplier: number
  /** Defense multiplier */
  defenseMultiplier: number
  /** Accuracy bonus (percentage) */
  accuracyBonus: number
  /** Evasion bonus (percentage) */
  evasionBonus: number
  /** Critical hit chance bonus */
  critBonus: number
  /** Critical damage multiplier bonus */
  critDamageBonus: number
  /** Shield regen bonus */
  shieldRegenBonus: number
  /** Morale resistance (reduces chance to flee) */
  moraleBonus: number
}

/**
 * Bonuses for each veterancy rank
 */
export const RANK_BONUSES: Record<VeterancyRank, RankBonuses> = {
  recruit: {
    damageMultiplier: 1.0,
    defenseMultiplier: 1.0,
    accuracyBonus: 0,
    evasionBonus: 0,
    critBonus: 0,
    critDamageBonus: 0,
    shieldRegenBonus: 0,
    moraleBonus: 0,
  },
  trained: {
    damageMultiplier: 1.05,
    defenseMultiplier: 1.03,
    accuracyBonus: 2,
    evasionBonus: 1,
    critBonus: 1,
    critDamageBonus: 0.05,
    shieldRegenBonus: 2,
    moraleBonus: 5,
  },
  veteran: {
    damageMultiplier: 1.10,
    defenseMultiplier: 1.08,
    accuracyBonus: 5,
    evasionBonus: 3,
    critBonus: 3,
    critDamageBonus: 0.15,
    shieldRegenBonus: 5,
    moraleBonus: 15,
  },
  elite: {
    damageMultiplier: 1.18,
    defenseMultiplier: 1.15,
    accuracyBonus: 10,
    evasionBonus: 6,
    critBonus: 6,
    critDamageBonus: 0.30,
    shieldRegenBonus: 10,
    moraleBonus: 30,
  },
  legendary: {
    damageMultiplier: 1.30,
    defenseMultiplier: 1.25,
    accuracyBonus: 15,
    evasionBonus: 10,
    critBonus: 10,
    critDamageBonus: 0.50,
    shieldRegenBonus: 15,
    moraleBonus: 50,
  },
}

// ============================================================================
// VETERANCY ABILITIES
// ============================================================================

/**
 * Special ability types unlocked at higher ranks
 */
export type VeterancyAbilityType =
  | 'steady_aim'        // Bonus accuracy on first shot
  | 'battle_hardened'   // Reduced damage from first hit
  | 'adrenaline_surge'  // Bonus when low on health
  | 'kill_streak'       // Bonus damage after kills
  | 'leadership'        // Buff nearby allies
  | 'last_stand'        // Cannot die in one hit
  | 'tactical_genius'   // Increased critical damage
  | 'iron_will'         // Immunity to morale effects

/**
 * Veterancy ability definition
 */
export interface VeterancyAbility {
  type: VeterancyAbilityType
  name: string
  description: string
  /** Rank required to unlock */
  requiredRank: VeterancyRank
  /** Unit classes that can have this ability */
  eligibleClasses: UnitClass[]
  /** Effect parameters */
  params: Record<string, number>
}

/**
 * All available veterancy abilities
 */
export const VETERANCY_ABILITIES: VeterancyAbility[] = [
  {
    type: 'steady_aim',
    name: 'Steady Aim',
    description: '+20% accuracy on first shot each round',
    requiredRank: 'trained',
    eligibleClasses: ['fighter', 'corvette', 'frigate', 'cruiser', 'battlecruiser', 'battleship', 'dreadnought'],
    params: { accuracyBonus: 20 },
  },
  {
    type: 'battle_hardened',
    name: 'Battle Hardened',
    description: 'First hit each round deals 25% less damage',
    requiredRank: 'veteran',
    eligibleClasses: ['frigate', 'cruiser', 'battlecruiser', 'battleship', 'dreadnought', 'carrier'],
    params: { damageReduction: 25 },
  },
  {
    type: 'adrenaline_surge',
    name: 'Adrenaline Surge',
    description: '+30% damage when below 30% hull',
    requiredRank: 'veteran',
    eligibleClasses: ['fighter', 'corvette', 'frigate', 'cruiser', 'battlecruiser'],
    params: { damageBonus: 30, hullThreshold: 30 },
  },
  {
    type: 'kill_streak',
    name: 'Kill Streak',
    description: '+10% damage for each kill this battle (max 50%)',
    requiredRank: 'elite',
    eligibleClasses: ['fighter', 'corvette', 'cruiser', 'battlecruiser', 'battleship', 'dreadnought'],
    params: { damagePerKill: 10, maxBonus: 50 },
  },
  {
    type: 'leadership',
    name: 'Leadership',
    description: 'Nearby allies gain +5% accuracy and evasion',
    requiredRank: 'elite',
    eligibleClasses: ['battleship', 'dreadnought', 'carrier'],
    params: { accuracyBonus: 5, evasionBonus: 5, range: 3 },
  },
  {
    type: 'last_stand',
    name: 'Last Stand',
    description: 'Cannot be destroyed by a single hit (survives with 1 hull)',
    requiredRank: 'legendary',
    eligibleClasses: ['battleship', 'dreadnought', 'carrier'],
    params: {},
  },
  {
    type: 'tactical_genius',
    name: 'Tactical Genius',
    description: 'Critical hits deal 100% bonus damage instead of 50%',
    requiredRank: 'legendary',
    eligibleClasses: ['cruiser', 'battlecruiser', 'battleship', 'dreadnought'],
    params: { critMultiplierBonus: 0.5 },
  },
  {
    type: 'iron_will',
    name: 'Iron Will',
    description: 'Immune to morale effects and status effects last 50% shorter',
    requiredRank: 'legendary',
    eligibleClasses: ['frigate', 'cruiser', 'battlecruiser', 'battleship', 'dreadnought', 'carrier'],
    params: { statusDurationReduction: 50 },
  },
]

// ============================================================================
// UNIT EXPERIENCE DATA
// ============================================================================

/**
 * Experience data for a unit
 */
export interface UnitExperience {
  /** Total experience points */
  totalXP: number
  /** Current veterancy rank */
  rank: VeterancyRank
  /** Progress to next rank (0-100%) */
  progressToNextRank: number
  /** Unlocked abilities */
  unlockedAbilities: VeterancyAbilityType[]
  /** Active ability (one can be active at a time for most) */
  activeAbility?: VeterancyAbilityType
  /** Combat statistics */
  stats: CombatStatistics
  /** Kill streak in current battle */
  currentKillStreak: number
  /** Highest kill streak ever */
  highestKillStreak: number
  /** Total battles participated */
  battlesParticipated: number
  /** Total battles won */
  battlesWon: number
}

/**
 * Combat statistics tracking
 */
export interface CombatStatistics {
  totalKills: number
  totalDamageDealt: number
  totalDamageTaken: number
  criticalHits: number
  boardingAttempts: number
  boardingSuccesses: number
  boardingsDefended: number
  totalBattleSurvived: number
}

/**
 * Default experience data for new unit
 */
export const DEFAULT_UNIT_EXPERIENCE: UnitExperience = {
  totalXP: 0,
  rank: 'recruit',
  progressToNextRank: 0,
  unlockedAbilities: [],
  activeAbility: undefined,
  stats: {
    totalKills: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    criticalHits: 0,
    boardingAttempts: 0,
    boardingSuccesses: 0,
    boardingsDefended: 0,
    totalBattleSurvived: 0,
  },
  currentKillStreak: 0,
  highestKillStreak: 0,
  battlesParticipated: 0,
  battlesWon: 0,
}

// ============================================================================
// EXPERIENCE FUNCTIONS
// ============================================================================

/**
 * Get rank from total XP
 */
export function getRankFromXP(xp: number): VeterancyRank {
  for (let i = RANK_ORDER.length - 1; i >= 0; i--) {
    const rank = RANK_ORDER[i]
    if (xp >= RANK_THRESHOLDS[rank]) {
      return rank
    }
  }
  return 'recruit'
}

/**
 * Get XP required for next rank
 */
export function getXPForNextRank(currentRank: VeterancyRank): number | null {
  const currentIndex = RANK_ORDER.indexOf(currentRank)
  if (currentIndex >= RANK_ORDER.length - 1) {
    return null // Already at max rank
  }
  return RANK_THRESHOLDS[RANK_ORDER[currentIndex + 1]]
}

/**
 * Calculate progress to next rank
 */
export function calculateProgress(xp: number): number {
  const currentRank = getRankFromXP(xp)
  const nextXP = getXPForNextRank(currentRank)

  if (nextXP === null) return 100 // Max rank

  const currentThreshold = RANK_THRESHOLDS[currentRank]
  const progressXP = xp - currentThreshold
  const requiredXP = nextXP - currentThreshold

  return Math.min(100, (progressXP / requiredXP) * 100)
}

/**
 * Award experience for an action
 */
export function awardExperience(
  experience: UnitExperience,
  action: ExperienceAction,
  amount: number = 1
): { xpGained: number; rankUp: boolean; newRank?: VeterancyRank } {
  const baseXP = EXPERIENCE_GAINS[action]
  let xpGained = 0

  switch (action) {
    case 'damage_dealt':
      xpGained = Math.floor((amount / 100) * baseXP)
      experience.stats.totalDamageDealt += amount
      break
    case 'damage_taken':
      xpGained = Math.floor((amount / 100) * baseXP)
      experience.stats.totalDamageTaken += amount
      break
    case 'kill':
      xpGained = baseXP * amount
      experience.stats.totalKills += amount
      experience.currentKillStreak += amount
      if (experience.currentKillStreak > experience.highestKillStreak) {
        experience.highestKillStreak = experience.currentKillStreak
      }
      break
    case 'critical_hit':
      xpGained = baseXP * amount
      experience.stats.criticalHits += amount
      break
    case 'boarding_success':
      xpGained = baseXP * amount
      experience.stats.boardingAttempts += amount
      experience.stats.boardingSuccesses += amount
      break
    case 'boarding_defense':
      xpGained = baseXP * amount
      experience.stats.boardingsDefended += amount
      break
    case 'survive_battle':
      xpGained = baseXP
      experience.stats.totalBattleSurvived++
      experience.battlesParticipated++
      break
    case 'win_battle':
      xpGained = baseXP
      experience.battlesWon++
      break
    case 'lose_battle':
      xpGained = baseXP
      break
  }

  const oldRank = experience.rank
  experience.totalXP += xpGained
  experience.rank = getRankFromXP(experience.totalXP)
  experience.progressToNextRank = calculateProgress(experience.totalXP)

  const rankUp = experience.rank !== oldRank

  return {
    xpGained,
    rankUp,
    newRank: rankUp ? experience.rank : undefined,
  }
}

/**
 * Reset kill streak (called at battle end or on death)
 */
export function resetKillStreak(experience: UnitExperience): void {
  experience.currentKillStreak = 0
}

/**
 * Get available abilities for a unit
 */
export function getAvailableAbilities(
  unitClass: UnitClass,
  rank: VeterancyRank
): VeterancyAbility[] {
  const rankIndex = RANK_ORDER.indexOf(rank)

  return VETERANCY_ABILITIES.filter(ability => {
    // Check rank requirement
    const abilityRankIndex = RANK_ORDER.indexOf(ability.requiredRank)
    if (abilityRankIndex > rankIndex) return false

    // Check class eligibility
    if (!ability.eligibleClasses.includes(unitClass)) return false

    return true
  })
}

/**
 * Unlock abilities based on current rank
 */
export function updateUnlockedAbilities(
  experience: UnitExperience,
  unitClass: UnitClass
): VeterancyAbilityType[] {
  const available = getAvailableAbilities(unitClass, experience.rank)
  const newAbilities: VeterancyAbilityType[] = []

  for (const ability of available) {
    if (!experience.unlockedAbilities.includes(ability.type)) {
      experience.unlockedAbilities.push(ability.type)
      newAbilities.push(ability.type)
    }
  }

  return newAbilities
}

/**
 * Set active ability
 */
export function setActiveAbility(
  experience: UnitExperience,
  abilityType: VeterancyAbilityType | undefined
): boolean {
  if (abilityType === undefined) {
    experience.activeAbility = undefined
    return true
  }

  if (!experience.unlockedAbilities.includes(abilityType)) {
    return false
  }

  experience.activeAbility = abilityType
  return true
}

/**
 * Get bonuses for current rank
 */
export function getRankBonuses(rank: VeterancyRank): RankBonuses {
  return RANK_BONUSES[rank]
}

/**
 * Apply veterancy bonuses to a unit
 */
export function applyVeterancyToUnit(
  unit: AdvancedCombatUnit,
  experience: UnitExperience
): void {
  const bonuses = getRankBonuses(experience.rank)

  // Apply multiplicative bonuses
  unit.damage.ballistic = Math.floor(unit.damage.ballistic * bonuses.damageMultiplier)
  unit.damage.ionic = Math.floor(unit.damage.ionic * bonuses.damageMultiplier)
  unit.damage.explosive = Math.floor(unit.damage.explosive * bonuses.damageMultiplier)

  unit.defense.shield.max = Math.floor(unit.defense.shield.max * bonuses.defenseMultiplier)
  unit.defense.shield.current = Math.floor(unit.defense.shield.current * bonuses.defenseMultiplier)
  unit.defense.armor.max = Math.floor(unit.defense.armor.max * bonuses.defenseMultiplier)
  unit.defense.armor.current = Math.floor(unit.defense.armor.current * bonuses.defenseMultiplier)

  // Apply additive bonuses
  unit.stats.accuracy += bonuses.accuracyBonus
  unit.stats.evasion += bonuses.evasionBonus
  unit.stats.critChance += bonuses.critBonus
  unit.stats.critMultiplier += bonuses.critDamageBonus
  unit.defense.shield.regenRate += bonuses.shieldRegenBonus
}

/**
 * Check if ability triggers
 */
export function checkAbilityTrigger(
  ability: VeterancyAbility,
  experience: UnitExperience,
  unit: AdvancedCombatUnit,
  context: {
    isFirstShot?: boolean
    isFirstHit?: boolean
    hullPercent?: number
    killsThisBattle?: number
  }
): { triggers: boolean; bonus?: number } {
  switch (ability.type) {
    case 'steady_aim':
      if (context.isFirstShot) {
        return { triggers: true, bonus: ability.params.accuracyBonus }
      }
      break

    case 'battle_hardened':
      if (context.isFirstHit) {
        return { triggers: true, bonus: ability.params.damageReduction }
      }
      break

    case 'adrenaline_surge':
      if (
        context.hullPercent !== undefined &&
        context.hullPercent <= ability.params.hullThreshold
      ) {
        return { triggers: true, bonus: ability.params.damageBonus }
      }
      break

    case 'kill_streak':
      if (context.killsThisBattle && context.killsThisBattle > 0) {
        const bonus = Math.min(
          context.killsThisBattle * ability.params.damagePerKill,
          ability.params.maxBonus
        )
        return { triggers: true, bonus }
      }
      break

    case 'last_stand':
      // Always active as a passive effect
      return { triggers: true }

    case 'tactical_genius':
      // Always active, bonus applied on critical
      return { triggers: true, bonus: ability.params.critMultiplierBonus }

    case 'iron_will':
      // Always active
      return { triggers: true, bonus: ability.params.statusDurationReduction }
  }

  return { triggers: false }
}

/**
 * Get ability by type
 */
export function getAbility(type: VeterancyAbilityType): VeterancyAbility | undefined {
  return VETERANCY_ABILITIES.find(a => a.type === type)
}

/**
 * Create experience data for a new unit
 */
export function createUnitExperience(initialXP: number = 0): UnitExperience {
  const experience: UnitExperience = {
    ...DEFAULT_UNIT_EXPERIENCE,
    totalXP: initialXP,
    rank: getRankFromXP(initialXP),
    progressToNextRank: calculateProgress(initialXP),
    stats: { ...DEFAULT_UNIT_EXPERIENCE.stats },
    unlockedAbilities: [],
  }

  return experience
}

/**
 * Compare two ranks
 */
export function compareRanks(rank1: VeterancyRank, rank2: VeterancyRank): number {
  return RANK_ORDER.indexOf(rank1) - RANK_ORDER.indexOf(rank2)
}

/**
 * Check if rank1 is at least rank2
 */
export function isAtLeastRank(current: VeterancyRank, required: VeterancyRank): boolean {
  return compareRanks(current, required) >= 0
}

/**
 * Format XP with thousands separator
 */
export function formatXP(xp: number): string {
  return xp.toLocaleString()
}

/**
 * Get rank display info
 */
export function getRankDisplayInfo(rank: VeterancyRank): {
  name: string
  color: string
  icon: string
} {
  const displayInfo: Record<VeterancyRank, { name: string; color: string; icon: string }> = {
    recruit: { name: 'Recruit', color: '#808080', icon: '⚪' },
    trained: { name: 'Trained', color: '#4CAF50', icon: '🟢' },
    veteran: { name: 'Veteran', color: '#2196F3', icon: '🔵' },
    elite: { name: 'Elite', color: '#9C27B0', icon: '🟣' },
    legendary: { name: 'Legendary', color: '#FFD700', icon: '⭐' },
  }

  return displayInfo[rank]
}

/**
 * Calculate total fleet experience
 */
export function calculateFleetExperience(
  units: Array<{ experience: UnitExperience }>
): {
  totalXP: number
  averageRank: VeterancyRank
  highestRank: VeterancyRank
  rankDistribution: Record<VeterancyRank, number>
} {
  if (units.length === 0) {
    return {
      totalXP: 0,
      averageRank: 'recruit',
      highestRank: 'recruit',
      rankDistribution: {
        recruit: 0,
        trained: 0,
        veteran: 0,
        elite: 0,
        legendary: 0,
      },
    }
  }

  let totalXP = 0
  let totalRankIndex = 0
  let highestRankIndex = 0
  const rankDistribution: Record<VeterancyRank, number> = {
    recruit: 0,
    trained: 0,
    veteran: 0,
    elite: 0,
    legendary: 0,
  }

  for (const unit of units) {
    totalXP += unit.experience.totalXP
    const rankIndex = RANK_ORDER.indexOf(unit.experience.rank)
    totalRankIndex += rankIndex
    if (rankIndex > highestRankIndex) {
      highestRankIndex = rankIndex
    }
    rankDistribution[unit.experience.rank]++
  }

  const averageRankIndex = Math.floor(totalRankIndex / units.length)

  return {
    totalXP,
    averageRank: RANK_ORDER[averageRankIndex],
    highestRank: RANK_ORDER[highestRankIndex],
    rankDistribution,
  }
}
