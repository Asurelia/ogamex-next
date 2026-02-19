/**
 * Skill Training Ticker
 *
 * Runs every 60 seconds to advance skill training for all characters
 * with active skill queues. Uses the EVE-ported SP formulas from
 * skill-formulas.ts and skill-types.ts.
 *
 * Flow per tick:
 *   1. Load all active skill queues from Supabase
 *   2. For each queue entry, calculate SP earned this tick
 *   3. Advance skill_points in rt_character_skills
 *   4. If level threshold reached, increment level
 *   5. If skill completed, start next in queue
 */

import { getSupabaseAdmin } from '../db/supabase'
import { pointsPerMinute, pointsAtLevel, levelForPoints } from '../../../src/lib/game/skills/skill-formulas'
import { SKILL_CONSTANTS, SkillAttribute } from '../../../src/lib/game/skills/skill-types'

// ============================================================================
// TYPES
// ============================================================================

interface ActiveQueueRow {
  id: string
  character_id: string
  skill_type_id: number
  target_level: number
  queue_position: number
}

interface CharacterSkillRow {
  id: string
  character_id: string
  skill_type_id: number
  skill_points: number
  current_level: number
}

interface SkillDefinitionRow {
  type_id: number
  rank: number
  primary_attribute: number
  secondary_attribute: number
}

interface CharacterAttributesRow {
  character_id: string
  charisma: number
  intelligence: number
  memory: number
  perception: number
  willpower: number
  charisma_bonus: number
  intelligence_bonus: number
  memory_bonus: number
  perception_bonus: number
  willpower_bonus: number
}

// ============================================================================
// MAIN TICK FUNCTION
// ============================================================================

/**
 * Process one tick of skill training for all characters with active queues.
 * Should be called every SKILL_TICK_INTERVAL (60 seconds).
 */
export async function tickSkillTraining(): Promise<void> {
  const db = getSupabaseAdmin()

  // 1. Load all active queue entries (position 0 = currently training)
  const { data: activeQueues, error: queueError } = await db
    .from('rt_skill_queue')
    .select('id, character_id, skill_type_id, target_level, queue_position')
    .eq('queue_position', 0)
    .eq('is_active', true)

  if (queueError) {
    console.error('[SkillTicker] Failed to load skill queues:', queueError.message)
    return
  }

  if (!activeQueues || activeQueues.length === 0) return

  // 2. Collect unique character IDs and skill type IDs
  const characterIds = [...new Set(activeQueues.map((q: ActiveQueueRow) => q.character_id))]
  const skillTypeIds = [...new Set(activeQueues.map((q: ActiveQueueRow) => q.skill_type_id))]

  // 3. Load character attributes
  const { data: attributes, error: attrError } = await db
    .from('rt_character_attributes')
    .select('*')
    .in('character_id', characterIds)

  if (attrError) {
    console.error('[SkillTicker] Failed to load attributes:', attrError.message)
    return
  }

  const attrMap = new Map<string, CharacterAttributesRow>()
  for (const attr of (attributes ?? []) as CharacterAttributesRow[]) {
    attrMap.set(attr.character_id, attr)
  }

  // 4. Load skill definitions for SP calculations
  const { data: skillDefs, error: defError } = await db
    .from('rt_skill_definitions')
    .select('type_id, rank, primary_attribute, secondary_attribute')
    .in('type_id', skillTypeIds)

  if (defError) {
    console.error('[SkillTicker] Failed to load skill definitions:', defError.message)
    return
  }

  const defMap = new Map<number, SkillDefinitionRow>()
  for (const def of (skillDefs ?? []) as SkillDefinitionRow[]) {
    defMap.set(def.type_id, def)
  }

  // 5. Load current character skills
  const { data: charSkills, error: skillError } = await db
    .from('rt_character_skills')
    .select('id, character_id, skill_type_id, skill_points, current_level')
    .in('character_id', characterIds)
    .in('skill_type_id', skillTypeIds)

  if (skillError) {
    console.error('[SkillTicker] Failed to load character skills:', skillError.message)
    return
  }

  const skillMap = new Map<string, CharacterSkillRow>()
  for (const skill of (charSkills ?? []) as CharacterSkillRow[]) {
    const key = `${skill.character_id}:${skill.skill_type_id}`
    skillMap.set(key, skill)
  }

  // 6. Process each active queue entry
  const skillUpdates: Array<{ id: string; skill_points: number; current_level: number }> = []
  const queueCompletions: string[] = []
  const queueAdvances: string[] = []

  for (const queue of activeQueues as ActiveQueueRow[]) {
    const charAttrs = attrMap.get(queue.character_id)
    const skillDef = defMap.get(queue.skill_type_id)
    const key = `${queue.character_id}:${queue.skill_type_id}`
    const charSkill = skillMap.get(key)

    if (!charAttrs || !skillDef || !charSkill) continue

    // Calculate SP per minute from character attributes
    const primaryValue = getAttributeValue(charAttrs, skillDef.primary_attribute)
    const secondaryValue = getAttributeValue(charAttrs, skillDef.secondary_attribute)
    const spPerMinute = pointsPerMinute(primaryValue, secondaryValue)

    // SP earned this tick (1 minute)
    const spEarned = spPerMinute

    // Update skill points
    const newSP = charSkill.skill_points + spEarned

    // Calculate new level
    const targetSP = pointsAtLevel(queue.target_level, skillDef.rank)
    const newLevel = levelForPoints(newSP, skillDef.rank)

    // Cap at target level
    const effectiveLevel = Math.min(newLevel, queue.target_level)
    const effectiveSP = Math.min(newSP, targetSP)

    skillUpdates.push({
      id: charSkill.id,
      skill_points: Math.floor(effectiveSP),
      current_level: effectiveLevel,
    })

    // Check if target level reached
    if (effectiveLevel >= queue.target_level && effectiveSP >= targetSP) {
      queueCompletions.push(queue.id)
      queueAdvances.push(queue.character_id)
    }
  }

  // 7. Batch update skill points
  if (skillUpdates.length > 0) {
    for (const update of skillUpdates) {
      const { error } = await db
        .from('rt_character_skills')
        .update({
          skill_points: update.skill_points,
          current_level: update.current_level,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.id)

      if (error) {
        console.error(`[SkillTicker] Failed to update skill ${update.id}:`, error.message)
      }
    }
  }

  // 8. Mark completed queue entries and advance queues
  if (queueCompletions.length > 0) {
    const { error } = await db
      .from('rt_skill_queue')
      .update({ is_active: false, completed_at: new Date().toISOString() })
      .in('id', queueCompletions)

    if (error) {
      console.error('[SkillTicker] Failed to complete queue entries:', error.message)
    }

    // Advance next skill in queue for each character
    for (const characterId of queueAdvances) {
      await advanceQueue(characterId)
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Advance the skill queue: promote position 1 to position 0.
 */
async function advanceQueue(characterId: string): Promise<void> {
  const db = getSupabaseAdmin()

  // Find the next entry in queue
  const { data: nextEntries, error } = await db
    .from('rt_skill_queue')
    .select('id, queue_position')
    .eq('character_id', characterId)
    .eq('is_active', true)
    .order('queue_position', { ascending: true })
    .limit(1)

  if (error || !nextEntries || nextEntries.length === 0) return

  const next = nextEntries[0]

  // Promote to position 0 (actively training)
  await db
    .from('rt_skill_queue')
    .update({ queue_position: 0 })
    .eq('id', next.id)

  // Decrement all other positions
  await db.rpc('decrement_skill_queue_positions', {
    p_character_id: characterId,
    p_above_position: next.queue_position,
  })
}

/**
 * Resolve an attribute enum value to the character's effective attribute
 * (base + implant bonus).
 */
function getAttributeValue(
  attrs: CharacterAttributesRow,
  attributeId: number
): number {
  switch (attributeId) {
    case SkillAttribute.Charisma:
      return attrs.charisma + attrs.charisma_bonus
    case SkillAttribute.Intelligence:
      return attrs.intelligence + attrs.intelligence_bonus
    case SkillAttribute.Memory:
      return attrs.memory + attrs.memory_bonus
    case SkillAttribute.Perception:
      return attrs.perception + attrs.perception_bonus
    case SkillAttribute.Willpower:
      return attrs.willpower + attrs.willpower_bonus
    default:
      return SKILL_CONSTANTS.MIN_ATTRIBUTE
  }
}
