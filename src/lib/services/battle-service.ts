/**
 * Battle Service
 *
 * Handles battle report storage to Supabase.
 * IMPORTANT: Only stores RESULTS (winner, losses, loot, debris).
 * Full timeline/events are stored in local SQLite to avoid Supabase costs.
 */

import { getSupabaseClient } from '@/lib/supabase/client'
import type { FleetMission } from '@/types/database'
import type { AdvancedBattleResult } from '@/lib/battle/AdvancedBattleEngine'
import { Database } from '@/types/database'
import { getLocalDb } from '@/lib/db/local-db'

type DbBattleReport = Database['public']['Tables']['battle_reports']['Insert']

/**
 * Minimal battle result for Supabase storage
 * No timeline, no round-by-round data - just the outcome
 */
export interface BattleResultSummary {
    winner: 'attacker' | 'defender' | 'draw'
    totalRounds: number
    attackerLossesValue: number
    defenderLossesValue: number
    loot: { metal: number; crystal: number; deuterium: number }
    debris: { metal: number; crystal: number }
    moonCreated: boolean
}

export class BattleService {
    private static supabase = getSupabaseClient()

    /**
     * Save battle result ONLY (no timeline/events).
     * Timeline is stored in local SQLite via local-db.
     *
     * This is the preferred method for production to minimize Supabase usage.
     */
    static async saveBattleResult(
        battleId: string,
        attackerId: string,
        defenderId: string,
        planetId: string,
        coordinates: string,
        summary: BattleResultSummary
    ): Promise<string | null> {
        // Minimal report_data - full timeline stored locally for performance
        const dbReport: DbBattleReport = {
            attacker_id: attackerId,
            defender_id: defenderId,
            planet_id: planetId,
            coordinates,
            winner: summary.winner,
            rounds: summary.totalRounds,
            attacker_losses: summary.attackerLossesValue,
            defender_losses: summary.defenderLossesValue,
            loot_metal: summary.loot.metal,
            loot_crystal: summary.loot.crystal,
            loot_deuterium: summary.loot.deuterium,
            debris_metal: summary.debris.metal,
            debris_crystal: summary.debris.crystal,
            moon_created: summary.moonCreated,
            report_data: { summary: true }, // Minimal data - full timeline stored locally
        }

        const { data, error } = await this.supabase
            .from('battle_reports')
            .insert(dbReport)
            .select('id')
            .single()

        if (error) {
            console.error('Error saving battle result:', error)
            return null
        }

        return data.id
    }

    /**
     * Save battle result from AdvancedBattleResult
     * Extracts summary and stores result only
     */
    static async saveBattleResultFromReport(
        battleId: string,
        report: AdvancedBattleResult,
        attackerId: string,
        defenderId: string,
        planetId: string,
        coordinates: string
    ): Promise<string | null> {
        const summary: BattleResultSummary = {
            winner: report.winner,
            totalRounds: report.totalRounds,
            attackerLossesValue:
                report.attackerLosses.metalValue +
                report.attackerLosses.crystalValue +
                report.attackerLosses.deuteriumValue,
            defenderLossesValue:
                report.defenderLosses.metalValue +
                report.defenderLosses.crystalValue +
                report.defenderLosses.deuteriumValue,
            loot: {
                metal: report.loot.metal,
                crystal: report.loot.crystal,
                deuterium: report.loot.deuterium,
            },
            debris: report.debris,
            moonCreated: report.moonCreated,
        }

        // Also update local DB with full result if battle was tracked there
        try {
            const localDb = getLocalDb()
            localDb.updateCombatLogResult(battleId, summary.winner, summary.totalRounds, report.timeline || [], {
                attackerValue: summary.attackerLossesValue,
                defenderValue: summary.defenderLossesValue,
                loot: summary.loot,
                debris: summary.debris,
                moonCreated: summary.moonCreated,
            })
        } catch (e) {
            // Non-fatal - local DB might not have the battle
            console.warn('Could not update local combat log:', e)
        }

        return this.saveBattleResult(battleId, attackerId, defenderId, planetId, coordinates, summary)
    }

    /**
     * Legacy: Save a fully resolved report with full data
     * Use saveBattleResultFromReport instead for production
     */
    static async saveResolvedReport(
        report: AdvancedBattleResult,
        mission: FleetMission,
        defenderId: string,
        planetId: string
    ): Promise<string | null> {
        const coordinates = `${mission.destination_galaxy}:${mission.destination_system}:${mission.destination_position}`

        // Use new method, generate a battle ID
        const battleId = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        return this.saveBattleResultFromReport(battleId, report, mission.user_id, defenderId, planetId, coordinates)
    }

    /**
     * Get battle report by ID (summary only from Supabase)
     */
    static async getReport(reportId: string) {
        const { data, error } = await this.supabase
            .from('battle_reports')
            .select('*')
            .eq('id', reportId)
            .single()

        if (error) {
            console.error('Error fetching battle report:', error)
            return null
        }

        return data
    }

    /**
     * Get user's recent battles
     */
    static async getUserBattles(userId: string, limit = 20) {
        const { data, error } = await this.supabase
            .from('battle_reports')
            .select('*')
            .or(`attacker_id.eq.${userId},defender_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('Error fetching user battles:', error)
            return []
        }

        return data || []
    }
}
