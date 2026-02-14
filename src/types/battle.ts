/**
 * Battle Types for 3D Combat System
 *
 * Types for the battle viewer, reports, and combat integration.
 */

import type { FleetComposition, DefenseComposition, CombatRound, BattleResult as EngineBattleResult } from '@/lib/battle/types'

// ============================================================================
// COORDINATES
// ============================================================================

export interface Coordinates {
  galaxy: number
  system: number
  position: number
}

// ============================================================================
// PARTICIPANT INFO
// ============================================================================

export interface BattleParticipant {
  userId: string
  playerName: string
  allianceTag?: string
  fleet: FleetComposition
  losses: Record<string, number>
  technologies?: {
    weapons: number
    shields: number
    armor: number
  }
}

export interface DefenderParticipant extends BattleParticipant {
  defense?: DefenseComposition
  defenseLosses?: Record<string, number>
}

// ============================================================================
// BATTLE ROUND FOR 3D VISUALIZATION
// ============================================================================

export interface BattleRound {
  roundNumber: number
  attackerSnapshot: {
    ships: FleetComposition
    totalAttack: number
    totalShield: number
    totalHull: number
    unitCount: number
  }
  defenderSnapshot: {
    ships: FleetComposition
    defense: DefenseComposition
    totalAttack: number
    totalShield: number
    totalHull: number
    unitCount: number
  }
  attackerShots: number
  defenderShots: number
  attackerDamage: number
  defenderDamage: number
  attackerUnitsLost: number
  defenderUnitsLost: number
  // 3D visualization events
  events?: BattleEvent[]
}

// ============================================================================
// BATTLE EVENTS FOR 3D ANIMATION
// ============================================================================

export type BattleEventType =
  | 'shot_fired'
  | 'shield_hit'
  | 'hull_damage'
  | 'unit_destroyed'
  | 'rapid_fire'
  | 'explosion'

export interface BattleEvent {
  type: BattleEventType
  timestamp: number // Relative to round start
  attacker: {
    side: 'attacker' | 'defender'
    unitType: string
    unitIndex: number
  }
  target: {
    side: 'attacker' | 'defender'
    unitType: string
    unitIndex: number
  }
  damage?: number
  position?: { x: number; y: number; z: number }
}

// ============================================================================
// MAIN BATTLE INTERFACE
// ============================================================================

export interface Battle {
  id: string
  timestamp: Date
  coordinates: Coordinates
  attacker: BattleParticipant
  defender: DefenderParticipant
  rounds: BattleRound[]
  result: {
    winner: 'attacker' | 'defender' | 'draw'
    totalRounds: number
    moonChance: number
    moonCreated: boolean
  }
  debris: {
    metal: number
    crystal: number
  }
  loot?: {
    metal: number
    crystal: number
    deuterium: number
  }
  // Remaining forces
  attackerRemaining: FleetComposition
  defenderRemaining: {
    ships: FleetComposition
    defense: DefenseComposition
  }
}

// ============================================================================
// BATTLE PREVIEW (FOR MESSAGE LIST)
// ============================================================================

export interface BattlePreviewData {
  id: string
  timestamp: Date
  coordinates: Coordinates
  winner: 'attacker' | 'defender' | 'draw'
  isAttacker: boolean // Whether current user was the attacker
  opponentName: string
  opponentAlliance?: string
  // Quick stats
  attackerLossValue: number
  defenderLossValue: number
  debris: {
    metal: number
    crystal: number
  }
  loot?: {
    metal: number
    crystal: number
    deuterium: number
  }
  moonCreated: boolean
}

// ============================================================================
// BATTLE REPORT FROM DATABASE
// ============================================================================

export interface BattleReportDB {
  id: string
  attacker_id: string
  defender_id: string
  planet_id: string
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

export interface BattleReportData {
  attacker: {
    userId: string
    playerName: string
    allianceTag?: string
    initialFleet: FleetComposition
    remainingFleet: FleetComposition
    technologies: { weapons: number; shields: number; armor: number }
  }
  defender: {
    userId: string
    playerName: string
    allianceTag?: string
    initialFleet: FleetComposition
    initialDefense: DefenseComposition
    remainingFleet: FleetComposition
    remainingDefense: DefenseComposition
    technologies: { weapons: number; shields: number; armor: number }
  }
  rounds: CombatRound[]
  engineResult: EngineBattleResult
}

// ============================================================================
// BATTLE STORE STATE
// ============================================================================

export interface BattleState {
  currentBattle: Battle | null
  battleHistory: BattlePreviewData[]
  isLoading: boolean
  error: string | null
}

export interface BattleActions {
  loadBattle: (battleId: string) => Promise<void>
  clearBattle: () => void
  setBattleHistory: (battles: BattlePreviewData[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export type BattleStore = BattleState & BattleActions

// ============================================================================
// API RESPONSES
// ============================================================================

export interface BattleApiResponse {
  success: boolean
  battle?: Battle
  error?: string
}

export interface BattleListApiResponse {
  success: boolean
  battles: BattlePreviewData[]
  total: number
}
