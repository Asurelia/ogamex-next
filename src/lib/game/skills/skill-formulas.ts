/**
 * Skill System Formulas
 * 
 * Ported from C# OGameX.SharedLib.Skills (SkillFormulas class)
 * Source formulas: http://wiki.eve-id.net/Equations
 */

import { SKILL_CONSTANTS } from './skill-types'

/**
 * Calculate SP required to reach a given level for a skill of given rank.
 * Formula: ceil(sqrt(32)^(level-1) * 250 * rank)
 */
export function pointsAtLevel(level: number, rank: number): number {
    if (level <= 0) return 0
    if (level > SKILL_CONSTANTS.MAX_SKILL_LEVEL) {
        level = SKILL_CONSTANTS.MAX_SKILL_LEVEL
    }

    const result = Math.pow(Math.sqrt(32), level - 1) *
        SKILL_CONSTANTS.SKILL_POINT_MULTIPLIER *
        rank

    return Math.ceil(result)
}

/**
 * Determine skill level from current SP and rank.
 * Inverse of pointsAtLevel.
 */
export function levelForPoints(currentSP: number, rank: number): number {
    const baseSLC = rank * SKILL_CONSTANTS.SKILL_POINT_MULTIPLIER
    if (baseSLC <= 0 || currentSP < baseSLC) return 0

    const level = Math.floor(Math.log(currentSP / baseSLC) / SKILL_CONSTANTS.DIV_CONSTANT) + 1
    return Math.min(level, SKILL_CONSTANTS.MAX_SKILL_LEVEL)
}

/**
 * Skill points earned per minute based on character attributes.
 * Formula: primaryAttr + 0.5 * secondaryAttr
 */
export function pointsPerMinute(primaryAttr: number, secondaryAttr: number): number {
    return primaryAttr + 0.5 * secondaryAttr
}

/**
 * Calculate training time in seconds for remaining SP.
 */
export function trainingTimeSeconds(remainingSP: number, spPerMinute: number): number {
    if (spPerMinute <= 0) return Number.MAX_SAFE_INTEGER
    return Math.ceil((remainingSP / spPerMinute) * 60)
}

/**
 * End timestamp for training, given current SP, target SP, and rate.
 */
export function endTime(currentSP: number, nextLevelSP: number, spPerMinute: number, timeNow: number): number {
    if (currentSP >= nextLevelSP) return 0
    const trainingSeconds = Math.ceil(((nextLevelSP - currentSP) / spPerMinute) * 60)
    return timeNow + trainingSeconds
}
