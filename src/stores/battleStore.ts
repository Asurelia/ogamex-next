import { create } from 'zustand'
import type { Battle, BattlePreviewData, BattleStore, BattleReportData } from '@/types/battle'
import type { FleetComposition, DefenseComposition } from '@/lib/battle/types'

/**
 * Battle Store
 *
 * Manages battle state for 3D combat visualization.
 */

const initialState = {
  currentBattle: null as Battle | null,
  battleHistory: [] as BattlePreviewData[],
  isLoading: false,
  error: null as string | null,
}

export const useBattleStore = create<BattleStore>((set, get) => ({
  ...initialState,

  loadBattle: async (battleId: string) => {
    set({ isLoading: true, error: null })

    try {
      const response = await fetch(`/api/v1/battles/${battleId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load battle')
      }

      set({ currentBattle: data.battle, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load battle',
        isLoading: false,
      })
    }
  },

  clearBattle: () => {
    set({ currentBattle: null, error: null })
  },

  setBattleHistory: (battles: BattlePreviewData[]) => {
    set({ battleHistory: battles })
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },
}))

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform database battle report to Battle format for 3D viewer
 */
export function transformBattleReport(
  report: {
    id: string
    coordinates: string
    winner: 'attacker' | 'defender' | 'draw'
    rounds: number
    attacker_losses: number
    defender_losses: number
    loot_metal: number
    loot_crystal: number
    loot_deuterium: number
    debris_metal: number
    debris_crystal: number
    moon_created: boolean
    report_data: BattleReportData
    created_at: string
  }
): Battle {
  const coords = parseCoordinates(report.coordinates)
  const data = report.report_data

  // Calculate losses
  const attackerLosses = calculateLosses(
    data.attacker.initialFleet,
    data.attacker.remainingFleet
  )
  const defenderLosses = calculateLosses(
    data.defender.initialFleet,
    data.defender.remainingFleet
  )
  const defenderDefenseLosses = calculateDefenseLosses(
    data.defender.initialDefense,
    data.defender.remainingDefense
  )

  // Transform rounds
  const battleRounds = data.rounds.map(round => ({
    roundNumber: round.roundNumber,
    attackerSnapshot: {
      ships: round.attacker.ships,
      totalAttack: round.attacker.totalAttack,
      totalShield: round.attacker.totalShield,
      totalHull: round.attacker.totalHull,
      unitCount: round.attacker.unitCount,
    },
    defenderSnapshot: {
      ships: round.defender.ships,
      defense: round.defender.defense,
      totalAttack: round.defender.totalAttack,
      totalShield: round.defender.totalShield,
      totalHull: round.defender.totalHull,
      unitCount: round.defender.unitCount,
    },
    attackerShots: round.attackerShots,
    defenderShots: round.defenderShots,
    attackerDamage: round.attackerDamage,
    defenderDamage: round.defenderDamage,
    attackerUnitsLost: round.attackerUnitsLost,
    defenderUnitsLost: round.defenderUnitsLost,
    events: [], // Events can be generated from round data for 3D
  }))

  return {
    id: report.id,
    timestamp: new Date(report.created_at),
    coordinates: coords,
    attacker: {
      userId: data.attacker.userId,
      playerName: data.attacker.playerName,
      allianceTag: data.attacker.allianceTag,
      fleet: data.attacker.initialFleet,
      losses: attackerLosses,
      technologies: data.attacker.technologies,
    },
    defender: {
      userId: data.defender.userId,
      playerName: data.defender.playerName,
      allianceTag: data.defender.allianceTag,
      fleet: data.defender.initialFleet,
      losses: defenderLosses,
      defense: data.defender.initialDefense,
      defenseLosses: defenderDefenseLosses,
      technologies: data.defender.technologies,
    },
    rounds: battleRounds,
    result: {
      winner: report.winner,
      totalRounds: report.rounds,
      moonChance: data.engineResult.moonChance,
      moonCreated: report.moon_created,
    },
    debris: {
      metal: report.debris_metal,
      crystal: report.debris_crystal,
    },
    loot: {
      metal: report.loot_metal,
      crystal: report.loot_crystal,
      deuterium: report.loot_deuterium,
    },
    attackerRemaining: data.attacker.remainingFleet,
    defenderRemaining: {
      ships: data.defender.remainingFleet,
      defense: data.defender.remainingDefense,
    },
  }
}

/**
 * Parse coordinates string "[1:234:5]" to object
 */
function parseCoordinates(coordString: string): { galaxy: number; system: number; position: number } {
  const match = coordString.match(/\[?(\d+):(\d+):(\d+)\]?/)
  if (!match) {
    return { galaxy: 1, system: 1, position: 1 }
  }
  return {
    galaxy: parseInt(match[1], 10),
    system: parseInt(match[2], 10),
    position: parseInt(match[3], 10),
  }
}

/**
 * Calculate ship losses from initial and remaining fleet
 */
function calculateLosses(
  initial: FleetComposition,
  remaining: FleetComposition
): Record<string, number> {
  const losses: Record<string, number> = {}

  for (const [key, initialCount] of Object.entries(initial)) {
    const remainingCount = remaining[key as keyof FleetComposition] || 0
    const lost = (initialCount || 0) - remainingCount
    if (lost > 0) {
      losses[key] = lost
    }
  }

  return losses
}

/**
 * Calculate defense losses
 */
function calculateDefenseLosses(
  initial: DefenseComposition,
  remaining: DefenseComposition
): Record<string, number> {
  const losses: Record<string, number> = {}

  for (const [key, initialCount] of Object.entries(initial)) {
    const remainingCount = remaining[key as keyof DefenseComposition] || 0
    const lost = (initialCount || 0) - remainingCount
    if (lost > 0) {
      losses[key] = lost
    }
  }

  return losses
}

/**
 * Create battle preview from full battle data
 */
export function createBattlePreview(
  battle: Battle,
  currentUserId: string
): BattlePreviewData {
  const isAttacker = battle.attacker.userId === currentUserId

  // Calculate loss values (simplified - would need ship costs for accurate value)
  const attackerLossValue = Object.values(battle.attacker.losses).reduce((a, b) => a + b, 0) * 1000
  const defenderLossValue = (
    Object.values(battle.defender.losses).reduce((a, b) => a + b, 0) +
    Object.values(battle.defender.defenseLosses || {}).reduce((a, b) => a + b, 0)
  ) * 1000

  return {
    id: battle.id,
    timestamp: battle.timestamp,
    coordinates: battle.coordinates,
    winner: battle.result.winner,
    isAttacker,
    opponentName: isAttacker ? battle.defender.playerName : battle.attacker.playerName,
    opponentAlliance: isAttacker ? battle.defender.allianceTag : battle.attacker.allianceTag,
    attackerLossValue,
    defenderLossValue,
    debris: battle.debris,
    loot: battle.loot,
    moonCreated: battle.result.moonCreated,
  }
}
