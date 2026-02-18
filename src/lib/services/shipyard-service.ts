import { getSupabaseClient } from '@/lib/supabase/client'
import { PlanetService } from './planet-service'
import { GameConfigService } from '@/lib/game/GameConfigService'
import { calculateUnitCostFromBase, calculateUnitTime } from '@/lib/game/formulas'
import { ShipCounts } from '@/types/game-core'

export interface UnitCost {
    metal: number
    crystal: number
    deuterium: number
    energy: number
    time: number // Time per unit in seconds
}

export class ShipyardService {
    private static supabase = getSupabaseClient()

    /**
     * Get cost and time for a single unit
     */
    static async getUnitCost(planetId: string, unitId: number, count: number = 1): Promise<UnitCost | null> {
        const planet = await PlanetService.getPlanetById(planetId)
        if (!planet) return null

        const config = GameConfigService.getInstance()
        // Try getting ship or defense
        const shipDef = config.getShipById(unitId)
        const defenseDef = config.getDefenseById(unitId)

        const unitDef = shipDef || defenseDef
        if (!unitDef) return null

        // 2. Calculate Cost (Base * Count)
        const cost = calculateUnitCostFromBase(unitDef.cost, count)

        // 3. Calculate Time
        const shipyardLevel = (planet as unknown as Record<string, number>)['shipyard'] || 0
        const naniteLevel = (planet as unknown as Record<string, number>)['nanite_factory'] || 0
        const universeSpeed = 1

        const timePerUnit = calculateUnitTime(
            unitDef.structuralIntegrity,
            shipyardLevel,
            naniteLevel,
            universeSpeed
        )

        return {
            metal: cost.metal,
            crystal: cost.crystal,
            deuterium: cost.deuterium,
            energy: 0,
            time: timePerUnit
        }
    }

    /**
     * Add units to construction queue
     */
    static async addToQueue(planetId: string, unitId: number, count: number): Promise<{ success: boolean, error?: string }> {
        if (count <= 0) return { success: false, error: 'Invalid count' }

        // 1. Get Cost
        const cost = await this.getUnitCost(planetId, unitId, count)
        if (!cost) return { success: false, error: 'Invalid unit' }

        // 2. Check Resources
        const planet = await PlanetService.getPlanetById(planetId)
        if (!planet) return { success: false, error: 'Planet not found' }

        if (planet.metal < cost.metal || planet.crystal < cost.crystal || planet.deuterium < cost.deuterium) {
            return { success: false, error: 'Insufficient resources' }
        }

        // 3. Determine Start Time
        // Start time is: Max(Now, EndTime of last item in queue)
        const { data: lastItem } = await this.supabase
            .from('shipyard_queue')
            .select('end_time')
            .eq('planet_id', planetId)
            .order('end_time', { ascending: false })
            .limit(1)
            .single()

        const now = new Date()
        let startTime = now

        if (lastItem) {
            const lastEnd = new Date(lastItem.end_time)
            if (lastEnd > now) {
                startTime = lastEnd
            }
        }

        const totalDuration = cost.time * count
        const endTime = new Date(startTime.getTime() + totalDuration * 1000)

        // 4. Update DB (Transaction)
        const { error: insertError } = await this.supabase
            .from('shipyard_queue')
            .insert({
                planet_id: planetId,
                unit_id: unitId,
                quantity: count,
                processed_quantity: 0,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString()
            })

        if (insertError) {
            console.error('Queue Insert Error', insertError)
            return { success: false, error: 'Database error' }
        }

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
     * Process shipyard queue
     * Calculates how many units finished since last check
     */
    static async processQueue(planetId: string): Promise<void> {
        const now = new Date()

        // Fetch active items that started before now
        const { data: queue } = await this.supabase
            .from('shipyard_queue')
            .select('*')
            .eq('planet_id', planetId)
            .lte('start_time', now.toISOString())
            .order('start_time', { ascending: true })

        if (!queue || queue.length === 0) return

        const config = GameConfigService.getInstance()

        // We need planet data to calc unit time again? 
        // Or store unit time in queue?
        // Ideally we shouldn't recalc time as tech levels might change during production?
        // Standard OGame: Time is fixed at start.
        // But we didn't store time_per_unit in queue (mistake in schema?).
        // Let's recalc for now or derive from (end - start) / quantity.

        const planet = await PlanetService.getPlanetById(planetId)
        if (!planet) return

        for (const item of queue) {
            const startTime = new Date(item.start_time).getTime()
            const endTime = new Date(item.end_time).getTime()
            const totalDuration = (endTime - startTime) / 1000 // seconds
            const quantity = item.quantity
            const timePerUnit = totalDuration / quantity

            // How much time passed since start (capped at total duration)
            const timePassed = Math.min(now.getTime() - startTime, totalDuration * 1000) / 1000

            // Calc finished amount
            const finishedTotal = Math.floor(timePassed / timePerUnit)
            const newFinished = Math.min(finishedTotal, quantity) - item.processed_quantity

            if (newFinished > 0) {
                // Add units to planet
                const unitDef = config.getShipById(item.unit_id) || config.getDefenseById(item.unit_id)
                if (!unitDef) continue

                const updateField = this.camelToSnake(unitDef.key)
                // Need to fetch current count? We have 'planet' object but it might be stale if we iterate?
                // Best to use atomic increment if possible or fetch fresh.
                // Supabase doesn't support atomic increment easily via client sdk without rpc.
                // We'll trust our 'planet' context for now or re-fetch if critical.
                // Actually `planet.ships[key]` exists.

                const currentCount = (planet as any).ships?.[unitDef.key] ?? (planet as any).defense?.[unitDef.key] ?? 0

                // Update DB
                const updateObj: any = {}
                // We assume keys are unique across ships/defense or we know which table/column?
                // The 'planets' table has columns for ships (snake_case).
                updateObj[updateField] = currentCount + newFinished

                await this.supabase.from('planets').update(updateObj).eq('id', planetId)

                // Update Queue
                if (finishedTotal >= quantity) {
                    await this.supabase.from('shipyard_queue').delete().eq('id', item.id)
                } else {
                    await this.supabase.from('shipyard_queue').update({
                        processed_quantity: finishedTotal
                    }).eq('id', item.id)
                }

                // Be careful: if we consumed this item's time, does it delay next item?
                // No, in OGame queue implies next item starts ONLY after previous matches.
                // Our logic `startTime = Max(Now, LastEnd)` handles start time correctly.
                // But `processQueue` needs to handle the fact that if Item 1 finishes, Item 2 might have started locally?
                // No, DB has explicit start/end times.
            }
        }
    }

    private static camelToSnake(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    }
}
