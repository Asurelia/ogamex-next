/**
 * Combat AI — EVE-Style Autonomous Behavior System
 *
 * Provides target selection strategies for the AdvancedBattleEngine.
 * Ships act autonomously based on fleet-wide behavior presets.
 * The player cannot control individual ships, but can set fleet behavior.
 */

import type { AdvancedCombatUnit } from './advanced-unit'
import { getTotalHP, getMaxHP } from './advanced-unit'

// ============================================================================
// TYPES
// ============================================================================

export type AIBehavior = 'aggressive' | 'defensive' | 'sniper' | 'swarm'

export interface AIBehaviorConfig {
    name: AIBehavior
    description: string
    targetSelector: TargetSelector
    damageModifier: number       // Multiplier applied to outgoing damage
    shieldModifier: number       // Multiplier applied to shield regen
    spreadFire: boolean          // If true, spread damage across targets
}

/**
 * Target selector function — given alive targets, returns the best target.
 * Returns null if no valid target exists.
 */
export type TargetSelector = (
    attacker: AdvancedCombatUnit,
    targets: AdvancedCombatUnit[],
    random: () => number
) => AdvancedCombatUnit | null

// ============================================================================
// TARGET SELECTORS
// ============================================================================

/**
 * Aggressive — Focus fire on the weakest (lowest total HP) target.
 * Maximizes kill rate by finishing off damaged units quickly.
 */
const aggressiveSelector: TargetSelector = (_attacker, targets) => {
    if (targets.length === 0) return null

    let weakest = targets[0]
    let lowestHP = getTotalHP(weakest)

    for (let i = 1; i < targets.length; i++) {
        const hp = getTotalHP(targets[i])
        if (hp < lowestHP) {
            lowestHP = hp
            weakest = targets[i]
        }
    }

    return weakest
}

/**
 * Defensive — Spread damage, prioritize threats with highest weapon power.
 * Reduces incoming DPS by eliminating high-damage units first.
 */
const defensiveSelector: TargetSelector = (_attacker, targets) => {
    if (targets.length === 0) return null

    let highestThreat = targets[0]
    let maxAttack = highestThreat.weaponPower

    for (let i = 1; i < targets.length; i++) {
        if (targets[i].weaponPower > maxAttack) {
            maxAttack = targets[i].weaponPower
            highestThreat = targets[i]
        }
    }

    return highestThreat
}

/**
 * Sniper — Target the highest-value unit (most maxHP = most expensive).
 * Maximizes resource damage per shot.
 */
const sniperSelector: TargetSelector = (_attacker, targets) => {
    if (targets.length === 0) return null

    let highValue = targets[0]
    let maxValue = getMaxHP(highValue)

    for (let i = 1; i < targets.length; i++) {
        const value = getMaxHP(targets[i])
        if (value > maxValue) {
            maxValue = value
            highValue = targets[i]
        }
    }

    return highValue
}

/**
 * Swarm — All units focus fire on first alive target until it dies.
 * Simple but effective for overwhelming individual units.
 */
const swarmSelector: TargetSelector = (_attacker, targets, _random) => {
    if (targets.length === 0) return null
    return targets[0]
}

// ============================================================================
// BEHAVIOR CONFIGS
// ============================================================================

export const AI_BEHAVIORS: Record<AIBehavior, AIBehaviorConfig> = {
    aggressive: {
        name: 'aggressive',
        description: 'Focus fire on weakest targets. +10% damage, -10% shields.',
        targetSelector: aggressiveSelector,
        damageModifier: 1.1,
        shieldModifier: 0.9,
        spreadFire: false,
    },
    defensive: {
        name: 'defensive',
        description: 'Target highest-DPS enemies. -10% damage, +20% shields.',
        targetSelector: defensiveSelector,
        damageModifier: 0.9,
        shieldModifier: 1.2,
        spreadFire: true,
    },
    sniper: {
        name: 'sniper',
        description: 'Target most expensive units. +20% damage, -20% shields.',
        targetSelector: sniperSelector,
        damageModifier: 1.2,
        shieldModifier: 0.8,
        spreadFire: false,
    },
    swarm: {
        name: 'swarm',
        description: 'All units focus one target. Normal damage and shields.',
        targetSelector: swarmSelector,
        damageModifier: 1.0,
        shieldModifier: 1.0,
        spreadFire: false,
    },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the behavior config for a given AI behavior type.
 */
export function getBehavior(behavior: AIBehavior): AIBehaviorConfig {
    return AI_BEHAVIORS[behavior]
}

/**
 * Select a target for a unit based on the fleet's AI behavior.
 */
export function selectTarget(
    behavior: AIBehavior,
    attacker: AdvancedCombatUnit,
    targets: AdvancedCombatUnit[],
    random: () => number = Math.random
): AdvancedCombatUnit | null {
    const aliveTargets = targets.filter(t => !t.destroyed)
    if (aliveTargets.length === 0) return null
    return AI_BEHAVIORS[behavior].targetSelector(attacker, aliveTargets, random)
}

/**
 * Get all available AI behaviors.
 */
export function getAvailableBehaviors(): AIBehaviorConfig[] {
    return Object.values(AI_BEHAVIORS)
}
