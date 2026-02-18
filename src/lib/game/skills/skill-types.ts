/**
 * Skill System Types
 * 
 * Ported from C# OGameX.SharedLib.Skills (SkillSystem.cs)
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const SKILL_CONSTANTS = {
  MAX_SKILL_LEVEL: 5,
  SKILL_POINT_MULTIPLIER: 250, // Base SP multiplier
  // log(sqrt(32)) used for inverse SP -> Level calculation
  DIV_CONSTANT: Math.log(Math.sqrt(32)),

  // Character attributes
  BASE_ATTRIBUTE_POINTS: 17,
  BONUS_ATTRIBUTE_POINTS: 14,
  MIN_ATTRIBUTE: 17,
  MAX_ATTRIBUTE: 27, // Without implants

  // Training queue
  MAX_QUEUE_LENGTH: 50,
  MAX_QUEUE_TIME_SECONDS: 24 * 60 * 60, // 24h for Alpha, unlimited for Omega (concept)
} as const

// ============================================================================
// ENUMS
// ============================================================================

export enum SkillAttribute {
  Charisma = 164,
  Intelligence = 165,
  Memory = 166,
  Perception = 167,
  Willpower = 168,
}

export enum SkillInjectionResult {
  Success = 1,
  PrerequisitesIncomplete = 2,
  AlreadyKnown = 3,
  SplitFail = 4,
  LoadFail = 5,
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface SkillPrerequisite {
  skillTypeID: number
  requiredLevel: number
}

/**
 * Definition of a skill type (static data)
 */
export interface SkillDefinition {
  typeID: number
  name: string
  groupID: number
  rank: number // timeConstant - multiplier for training time
  primaryAttribute: SkillAttribute
  secondaryAttribute: SkillAttribute
  prerequisites: SkillPrerequisite[]
  description?: string
}

/**
 * A character's learned skill instance
 */
export interface CharacterSkill {
  typeID: number
  level: number
  skillPoints: number
  isTraining: boolean
  trainingStartTime: number // Unix timestamp (seconds)
  definition: SkillDefinition // Reference to static definition
}

/**
 * An entry in the skill training queue
 */
export interface SkillQueueEntry {
  typeID: number
  targetLevel: number
  startTime: number // Unix timestamp (seconds)
  endTime: number // Unix timestamp (seconds)
}

/**
 * Character attributes used for SP/min calculation
 */
export interface CharacterAttributesData {
  charisma: number
  intelligence: number
  memory: number
  perception: number
  willpower: number
  
  // Implant bonuses
  charismaBonus: number
  intelligenceBonus: number
  memoryBonus: number
  perceptionBonus: number
  willpowerBonus: number
}
