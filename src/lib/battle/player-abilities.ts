/**
 * Player Combat Abilities — EVE-Style Fleet Commands
 *
 * The player cannot control individual ships, but can activate
 * fleet-wide abilities with cooldowns during combat.
 * These are applied between combat rounds.
 */

// ============================================================================
// TYPES
// ============================================================================

export type AbilityId = 'focus_fire' | 'emergency_shield' | 'overdrive' | 'emp_burst' | 'retreat'

export interface AbilityDefinition {
    id: AbilityId
    name: string
    description: string
    icon: string            // Emoji for quick UI
    cooldownRounds: number  // Rounds before it can be used again
    durationRounds: number  // How long the effect lasts
    maxUses: number         // Max times per battle (0 = unlimited)
    apply: AbilityEffect
}

export interface AbilityEffect {
    damageMultiplier?: number
    shieldRegenMultiplier?: number
    hullPenalty?: number          // Fraction of hull lost as cost
    disableEnemyCount?: number    // Number of enemy units disabled
    forceRetreat?: boolean        // End battle, flee with survivors
    focusFireTarget?: 'weakest' | 'strongest' | 'random'
}

export interface AbilityState {
    id: AbilityId
    cooldownRemaining: number
    usesRemaining: number
    activeRoundsRemaining: number
    isActive: boolean
}

export interface PlayerAbilityManager {
    abilities: AbilityState[]
    activateAbility: (id: AbilityId, currentRound: number) => AbilityEffect | null
    tick: () => void // Called at end of each round
    getAvailable: () => AbilityState[]
    getActiveEffects: () => AbilityEffect
    shouldRetreat: () => boolean
}

// ============================================================================
// ABILITY DEFINITIONS
// ============================================================================

export const ABILITY_DEFINITIONS: Record<AbilityId, AbilityDefinition> = {
    focus_fire: {
        id: 'focus_fire',
        name: 'Focus Fire',
        description: 'All ships concentrate fire on the weakest enemy for 1 round.',
        icon: '🎯',
        cooldownRounds: 3,
        durationRounds: 1,
        maxUses: 0,
        apply: {
            focusFireTarget: 'weakest',
            damageMultiplier: 1.15,
        },
    },
    emergency_shield: {
        id: 'emergency_shield',
        name: 'Emergency Shield',
        description: 'Boost shield regeneration by 50% for 1 round.',
        icon: '🛡️',
        cooldownRounds: 5,
        durationRounds: 1,
        maxUses: 0,
        apply: {
            shieldRegenMultiplier: 1.5,
        },
    },
    overdrive: {
        id: 'overdrive',
        name: 'Overdrive',
        description: '+30% damage for 1 round, but lose 10% hull integrity.',
        icon: '⚡',
        cooldownRounds: 4,
        durationRounds: 1,
        maxUses: 0,
        apply: {
            damageMultiplier: 1.3,
            hullPenalty: 0.1,
        },
    },
    emp_burst: {
        id: 'emp_burst',
        name: 'EMP Burst',
        description: 'Disable 1 random enemy ship for 1 round.',
        icon: '💥',
        cooldownRounds: 6,
        durationRounds: 1,
        maxUses: 3,
        apply: {
            disableEnemyCount: 1,
        },
    },
    retreat: {
        id: 'retreat',
        name: 'Emergency Retreat',
        description: 'Cancel battle and flee with surviving ships. Can only be used once.',
        icon: '🚀',
        cooldownRounds: 0,
        durationRounds: 0,
        maxUses: 1,
        apply: {
            forceRetreat: true,
        },
    },
}

// ============================================================================
// ABILITY MANAGER
// ============================================================================

/**
 * Create a new ability manager for a battle.
 * Call `activateAbility` between rounds and `tick` at end of each round.
 */
export function createAbilityManager(): PlayerAbilityManager {
    const abilities: AbilityState[] = Object.values(ABILITY_DEFINITIONS).map(def => ({
        id: def.id,
        cooldownRemaining: 0,
        usesRemaining: def.maxUses === 0 ? Infinity : def.maxUses,
        activeRoundsRemaining: 0,
        isActive: false,
    }))

    function getState(id: AbilityId): AbilityState | undefined {
        return abilities.find(a => a.id === id)
    }

    function activateAbility(id: AbilityId, _currentRound: number): AbilityEffect | null {
        const state = getState(id)
        const def = ABILITY_DEFINITIONS[id]

        if (!state || !def) return null
        if (state.cooldownRemaining > 0) return null
        if (state.usesRemaining <= 0) return null

        // Activate
        state.cooldownRemaining = def.cooldownRounds
        state.activeRoundsRemaining = def.durationRounds
        state.isActive = true
        if (state.usesRemaining !== Infinity) {
            state.usesRemaining--
        }

        return def.apply
    }

    function tick(): void {
        for (const state of abilities) {
            if (state.cooldownRemaining > 0) {
                state.cooldownRemaining--
            }
            if (state.activeRoundsRemaining > 0) {
                state.activeRoundsRemaining--
                if (state.activeRoundsRemaining === 0) {
                    state.isActive = false
                }
            }
        }
    }

    function getAvailable(): AbilityState[] {
        return abilities.filter(a => a.cooldownRemaining === 0 && a.usesRemaining > 0)
    }

    function getActiveEffects(): AbilityEffect {
        const combined: AbilityEffect = {}

        for (const state of abilities) {
            if (!state.isActive) continue
            const def = ABILITY_DEFINITIONS[state.id]

            if (def.apply.damageMultiplier) {
                combined.damageMultiplier = (combined.damageMultiplier || 1) * def.apply.damageMultiplier
            }
            if (def.apply.shieldRegenMultiplier) {
                combined.shieldRegenMultiplier = (combined.shieldRegenMultiplier || 1) * def.apply.shieldRegenMultiplier
            }
            if (def.apply.hullPenalty) {
                combined.hullPenalty = (combined.hullPenalty || 0) + def.apply.hullPenalty
            }
            if (def.apply.disableEnemyCount) {
                combined.disableEnemyCount = (combined.disableEnemyCount || 0) + def.apply.disableEnemyCount
            }
            if (def.apply.focusFireTarget) {
                combined.focusFireTarget = def.apply.focusFireTarget
            }
            if (def.apply.forceRetreat) {
                combined.forceRetreat = true
            }
        }

        return combined
    }

    function shouldRetreat(): boolean {
        const retreatState = getState('retreat')
        return retreatState?.isActive === true
    }

    return {
        abilities,
        activateAbility,
        tick,
        getAvailable,
        getActiveEffects,
        shouldRetreat,
    }
}
