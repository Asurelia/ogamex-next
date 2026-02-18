import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createMissionProcessor } from '@/lib/missions'

/**
 * Unified Game Tick — CRON endpoint
 *
 * Runs every 60s via Vercel CRON. Processes:
 * 1. Fleet missions (arrivals, returns, combat)
 * 2. Resource production (per-planet since last tick)
 * 3. Build queues (buildings, research, units)
 *
 * Protected by CRON_SECRET header.
 */

const RESOURCE_PRODUCTION_BASE: Record<string, { metal: number; crystal: number; deuterium: number }> = {
    metal_mine: { metal: 30, crystal: 0, deuterium: 0 },
    crystal_mine: { metal: 0, crystal: 20, deuterium: 0 },
    deuterium_synthesizer: { metal: 0, crystal: 0, deuterium: 10 },
}

// Production formula: base * level * 1.1^level * universeSpeed
function calculateProduction(base: number, level: number, universeSpeed = 1): number {
    if (level <= 0) return 0
    return Math.floor(base * level * Math.pow(1.1, level) * universeSpeed)
}

export async function GET(request: Request) {
    // Validate CRON secret (skip in dev)
    if (process.env.NODE_ENV === 'production') {
        const authHeader = request.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const results = {
        missions: { processed: 0, errors: 0 },
        resources: { updated: 0 },
        buildQueue: { completed: 0 },
        researchQueue: { completed: 0 },
        unitQueue: { completed: 0 },
        tickDurationMs: 0,
    }

    const tickStart = Date.now()

    try {
        // ─── 1. Process Fleet Missions ───────────────────────────────
        try {
            const processor = createMissionProcessor(supabase)
            const missionResult = await processor.processPendingMissions()
            results.missions.processed = missionResult.processedCount ?? 0
            results.missions.errors = missionResult.errors?.length ?? 0
        } catch (err) {
            console.error('[GameTick] Mission processing error:', err)
            results.missions.errors = -1
        }

        // ─── 2. Update Planet Resources ──────────────────────────────
        try {
            const now = new Date().toISOString()
            const { data: planets, error } = await supabase
                .from('planets')
                .select('id, user_id, metal, crystal, deuterium, metal_mine, crystal_mine, deuterium_synthesizer, solar_plant, last_resource_update')
                .not('user_id', 'is', null)

            if (!error && planets) {
                for (const planet of planets) {
                    const lastUpdate = planet.last_resource_update
                        ? new Date(planet.last_resource_update).getTime()
                        : Date.now() - 60_000

                    const elapsedHours = (Date.now() - lastUpdate) / 3_600_000
                    if (elapsedHours < 0.0001) continue // Skip if < 0.36s

                    const metalProd = calculateProduction(30, planet.metal_mine || 0)
                    const crystalProd = calculateProduction(20, planet.crystal_mine || 0)
                    const deuteriumProd = calculateProduction(10, planet.deuterium_synthesizer || 0)

                    const metalGain = Math.floor(metalProd * elapsedHours)
                    const crystalGain = Math.floor(crystalProd * elapsedHours)
                    const deuteriumGain = Math.floor(deuteriumProd * elapsedHours)

                    if (metalGain + crystalGain + deuteriumGain > 0) {
                        await supabase
                            .from('planets')
                            .update({
                                metal: (planet.metal || 0) + metalGain,
                                crystal: (planet.crystal || 0) + crystalGain,
                                deuterium: (planet.deuterium || 0) + deuteriumGain,
                                last_resource_update: now,
                            })
                            .eq('id', planet.id)

                        results.resources.updated++
                    }
                }
            }
        } catch (err) {
            console.error('[GameTick] Resource update error:', err)
        }

        // ─── 3. Process Building Queue ───────────────────────────────
        try {
            const now = new Date().toISOString()
            const { data: completed } = await supabase
                .from('building_queue')
                .select('*')
                .lte('finish_time', now)
                .eq('cancelled', false)
                .order('finish_time', { ascending: true })

            if (completed) {
                for (const item of completed) {
                    // Apply the building upgrade
                    const buildingKey = item.building_key
                    const targetLevel = item.target_level

                    await supabase
                        .from('planets')
                        .update({ [buildingKey]: targetLevel })
                        .eq('id', item.planet_id)

                    // Mark as completed
                    await supabase
                        .from('building_queue')
                        .delete()
                        .eq('id', item.id)

                    results.buildQueue.completed++
                }
            }
        } catch (err) {
            console.error('[GameTick] Building queue error:', err)
        }

        // ─── 4. Process Research Queue ───────────────────────────────
        try {
            const now = new Date().toISOString()
            const { data: completed } = await supabase
                .from('research_queue')
                .select('*')
                .lte('finish_time', now)
                .eq('cancelled', false)
                .order('finish_time', { ascending: true })

            if (completed) {
                for (const item of completed) {
                    const researchKey = item.research_key
                    const targetLevel = item.target_level

                    await supabase
                        .from('user_research')
                        .update({ [researchKey]: targetLevel })
                        .eq('user_id', item.user_id)

                    await supabase
                        .from('research_queue')
                        .delete()
                        .eq('id', item.id)

                    results.researchQueue.completed++
                }
            }
        } catch (err) {
            console.error('[GameTick] Research queue error:', err)
        }

        // ─── 5. Process Shipyard/Unit Queue ──────────────────────────
        try {
            const now = new Date().toISOString()
            const { data: completed } = await supabase
                .from('shipyard_queue')
                .select('*')
                .lte('finish_time', now)
                .eq('cancelled', false)
                .order('finish_time', { ascending: true })

            if (completed) {
                for (const item of completed) {
                    const unitKey = item.unit_key
                    const count = item.count || 1

                    // Increment the unit count on the planet
                    const { data: planet } = await supabase
                        .from('planets')
                        .select(unitKey)
                        .eq('id', item.planet_id)
                        .single()

                    if (planet) {
                        const currentCount = (planet as unknown as Record<string, number>)[unitKey] || 0
                        await supabase
                            .from('planets')
                            .update({ [unitKey]: currentCount + count })
                            .eq('id', item.planet_id)
                    }

                    await supabase
                        .from('shipyard_queue')
                        .delete()
                        .eq('id', item.id)

                    results.unitQueue.completed++
                }
            }
        } catch (err) {
            console.error('[GameTick] Shipyard queue error:', err)
        }

    } catch (err) {
        console.error('[GameTick] Critical error:', err)
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
    }

    results.tickDurationMs = Date.now() - tickStart

    return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        ...results,
    })
}

// Allow POST for manual triggers
export async function POST(request: Request) {
    return GET(request)
}
