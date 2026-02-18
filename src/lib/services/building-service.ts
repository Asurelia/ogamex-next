import { getSupabaseClient } from '@/lib/supabase/client'
import { PlanetService } from './planet-service'
import { GameConfigService } from '@/lib/game/GameConfigService'
import {
    calculateBuildingCostFromBase,
    calculateBuildingTime
} from '@/lib/game/formulas'
import { Resources } from '@/types/game-core'

export interface ConstructionRequirement {
    met: boolean
    current: number
    required: number
}

export interface BuildingCost {
    metal: number
    crystal: number
    deuterium: number
    energy: number
    time: number // seconds
}

export class BuildingService {
    private static supabase = getSupabaseClient()

    /**
     * Get cost and time for the NEXT level of a building
     */
    static async getUpgradeCost(planetId: string, buildingId: number): Promise<BuildingCost | null> {
        // 1. Get Current Level
        const planet = await PlanetService.getPlanetById(planetId)
        if (!planet) return null

        // Need mapping from ID to Column Name (e.g. 1 -> 'metal_mine')
        const config = GameConfigService.getInstance()
        const buildingDef = config.getBuildingById(buildingId)
        if (!buildingDef) return null

        // Planet type uses flat columns: metal_mine, robot_factory, etc.
        const currentLevel = (planet as unknown as Record<string, number>)[buildingDef.key] || 0
        const nextLevel = currentLevel + 1

        // 2. Calculate Cost
        const cost = calculateBuildingCostFromBase(
            buildingDef.baseCost,
            buildingDef.priceFactor,
            nextLevel
        )

        // 3. Calculate Time
        // Need Robotics Factory and Nanite Factory levels
        const roboticsLevel = (planet as unknown as Record<string, number>)['robotics_factory'] || 0
        const naniteLevel = (planet as unknown as Record<string, number>)['nanite_factory'] || 0
        const universeSpeed = 1 // TODO: Global setting

        const time = calculateBuildingTime(
            cost.metal,
            cost.crystal,
            roboticsLevel,
            naniteLevel,
            universeSpeed,
            buildingDef.key === 'nanite_factory'
        )

        return {
            metal: cost.metal,
            crystal: cost.crystal,
            deuterium: cost.deuterium,
            energy: 0, // Buildings usually don't cost energy to build, only to run (Cons)
            time: time
        }
    }

    /**
     * Start upgrading a building
     */
    static async startUpgrade(planetId: string, buildingId: number): Promise<{ success: boolean, error?: string }> {
        // 1. Check if queue is busy
        // Standard OGame: Only 1 building at a time (unless Commander?)
        const { data: queue } = await this.supabase
            .from('building_queue')
            .select('id')
            .eq('planet_id', planetId)
            .limit(1)

        if (queue && queue.length > 0) {
            return { success: false, error: 'Queue is busy' }
        }

        // 2. Get Cost
        const cost = await this.getUpgradeCost(planetId, buildingId)
        if (!cost) return { success: false, error: 'Invalid building' }

        // 3. Check Resources
        const planet = await PlanetService.getPlanetById(planetId)
        if (!planet) return { success: false, error: 'Planet not found' }

        if (planet.metal < cost.metal || planet.crystal < cost.crystal || planet.deuterium < cost.deuterium) {
            return { success: false, error: 'Insufficient resources' }
        }

        // 4. Deduct Resources & Add to Queue
        // Transaction ideally

        const now = new Date()
        const endTime = new Date(now.getTime() + cost.time * 1000)

        const config = GameConfigService.getInstance()
        const buildingDef = config.getBuildingById(buildingId)
        if (!buildingDef) return { success: false, error: 'Def invalid' } // Should not happen

        const currentLevel = (planet as unknown as Record<string, number>)[buildingDef.key] || 0

        const { error: insertError } = await this.supabase
            .from('building_queue')
            .insert({
                planet_id: planetId,
                building_id: buildingId,
                target_level: currentLevel + 1,
                start_time: now.toISOString(),
                end_time: endTime.toISOString()
            })

        if (insertError) {
            console.error('Queue Insert Error', insertError)
            return { success: false, error: 'Database error' }
        }

        // Deduct resources
        const { error: updateError } = await this.supabase
            .from('planets')
            .update({
                metal: planet.metal - cost.metal,
                crystal: planet.crystal - cost.crystal,
                deuterium: planet.deuterium - cost.deuterium
            })
            .eq('id', planetId)

        return { success: !updateError }
    }

    /**
     * Process finished buildings
     * Can be called by Cron or on Page Load
     */
    static async processFinishedBuildings(planetId: string): Promise<void> {
        const now = new Date().toISOString()

        // Find finished jobs
        const { data: jobs } = await this.supabase
            .from('building_queue')
            .select('*')
            .eq('planet_id', planetId)
            .lte('end_time', now)

        if (!jobs || jobs.length === 0) return

        const config = GameConfigService.getInstance()

        for (const job of jobs) {
            const buildingDef = config.getBuildingById(job.building_id)
            if (!buildingDef) continue

            // Update Planet Building Level
            // We need to construct dynamic update query because column name = building key
            const updateField = this.camelToSnake(buildingDef.key)

            // SECURITY: Ensure updateField is valid column (it comes from config, so assumed safe)

            // We can't use simple object literal key for dynamic column in supabase-js typings sometimes?
            // But usually it works if passed as object.

            const updateObj: any = {}
            updateObj[updateField] = job.target_level

            await this.supabase
                .from('planets')
                .update(updateObj)
                .eq('id', planetId)

            // Remove from queue
            await this.supabase
                .from('building_queue')
                .delete()
                .eq('id', job.id)
        }
    }

    private static camelToSnake(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    }
}
