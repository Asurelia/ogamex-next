/**
 * Skill Training Ticker
 *
 * Runs every 60 seconds to advance skill training for all characters
 * with active skill queues. All data from SQLite (persistence.ts).
 */

import {
  getActiveSkillQueues, getPlayerAttributes, getCharacterSkill,
  upsertCharacterSkill, completeSkillQueueEntry, advanceSkillQueue,
  getCachedSkillDefinitions,
} from '../services/persistence'
import { pointsPerMinute, pointsAtLevel, levelForPoints } from '../../../src/lib/game/skills/skill-formulas'
import { SKILL_CONSTANTS, SkillAttribute } from '../../../src/lib/game/skills/skill-types'

// ============================================================================
// MAIN TICK FUNCTION
// ============================================================================

export function tickSkillTraining(): void {
  // 1. Load all active queue entries (position 0 = currently training)
  const activeQueues = getActiveSkillQueues()
  if (activeQueues.length === 0) return

  // 2. Load cached skill definitions
  const defMap = getCachedSkillDefinitions()

  // 3. Process each active queue entry
  for (const queue of activeQueues) {
    const characterId = queue.character_id as string
    const skillTypeId = queue.skill_type_id as number
    const targetLevel = queue.target_level as number

    const charAttrs = getPlayerAttributes(characterId)
    const skillDef = defMap.get(skillTypeId)

    if (!charAttrs || !skillDef) continue

    // Get or create character skill record
    let charSkill = getCharacterSkill(characterId, skillTypeId)
    if (!charSkill) {
      upsertCharacterSkill(characterId, skillTypeId, 0, 0)
      charSkill = getCharacterSkill(characterId, skillTypeId)
      if (!charSkill) continue
    }

    // Calculate SP per minute from character attributes
    const primaryValue = getAttributeValue(charAttrs, skillDef.primary_attribute as number)
    const secondaryValue = getAttributeValue(charAttrs, skillDef.secondary_attribute as number)
    const spPerMinute = pointsPerMinute(primaryValue, secondaryValue)

    // SP earned this tick (1 minute)
    const currentSP = charSkill.skill_points as number
    const newSP = currentSP + spPerMinute

    // Calculate new level
    const targetSP = pointsAtLevel(targetLevel, skillDef.rank as number)
    const newLevel = levelForPoints(newSP, skillDef.rank as number)

    // Cap at target level
    const effectiveLevel = Math.min(newLevel, targetLevel)
    const effectiveSP = Math.min(newSP, targetSP)

    // Update skill
    upsertCharacterSkill(characterId, skillTypeId, Math.floor(effectiveSP), effectiveLevel)

    // Check if target level reached
    if (effectiveLevel >= targetLevel && effectiveSP >= targetSP) {
      completeSkillQueueEntry(queue.id as string)
      advanceSkillQueue(characterId)
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getAttributeValue(attrs: Record<string, number>, attributeId: number): number {
  switch (attributeId) {
    case SkillAttribute.Charisma:
      return (attrs.charisma ?? 20) + (attrs.charisma_bonus ?? 0)
    case SkillAttribute.Intelligence:
      return (attrs.intelligence ?? 20) + (attrs.intelligence_bonus ?? 0)
    case SkillAttribute.Memory:
      return (attrs.memory ?? 20) + (attrs.memory_bonus ?? 0)
    case SkillAttribute.Perception:
      return (attrs.perception ?? 20) + (attrs.perception_bonus ?? 0)
    case SkillAttribute.Willpower:
      return (attrs.willpower ?? 20) + (attrs.willpower_bonus ?? 0)
    default:
      return SKILL_CONSTANTS.MIN_ATTRIBUTE
  }
}
