import { useState, useEffect, useCallback, useRef } from 'react'
import { AdvancedBattleEngine, type AdvancedBattleResult, type BattleTimelineEvent } from '@/lib/battle/AdvancedBattleEngine'
import { getFormationPositions, type Vector3 } from '@/lib/battle/formation-positions'
import type { FleetComposition, DefenseComposition, AdvancedTechLevels } from '@/lib/game/types'
import type { AdvancedCombatUnit } from '@/lib/battle/advanced-unit'
import type { FormationType } from '@/lib/battle/fleet-formations'

interface UseBattleProps {
    attackerFleet: FleetComposition
    defenderFleet: FleetComposition
    defenderDefense: DefenseComposition
    attackerTech: AdvancedTechLevels
    defenderTech: AdvancedTechLevels
    attackerFormation?: FormationType
    defenderFormation?: FormationType
    autoPlay?: boolean
}

export interface VisualUnit {
    id: string
    unitKey: string
    owner: 'attacker' | 'defender'
    position: Vector3
    rotation: Vector3
    maxHull: number
    currentHull: number
    maxShield: number
    currentShield: number
    destroyed: boolean
    isFiring: boolean
    targetPosition?: Vector3
    effects: string[] // Visual effect keys
}

export function useBattle({
    attackerFleet,
    defenderFleet,
    defenderDefense,
    attackerTech,
    defenderTech,
    attackerFormation = 'line',
    defenderFormation = 'defensive_sphere',
    autoPlay = true
}: UseBattleProps) {
    const [battleResult, setBattleResult] = useState<AdvancedBattleResult | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentRound, setCurrentRound] = useState(0)
    const [playbackSpeed, setPlaybackSpeed] = useState(1) // 1 round per 5 seconds by default
    const [progress, setProgress] = useState(0) // 0 to 1 (overall battle progress)

    // Refs for animation loop to avoid re-renders
    const visualUnitsRef = useRef<Map<string, VisualUnit>>(new Map())
    const timelineRef = useRef<BattleTimelineEvent[]>([])
    const engineRef = useRef<AdvancedBattleEngine | null>(null)

    // Animation state
    const startTimeRef = useRef<number>(0)
    const pausedTimeRef = useRef<number>(0)
    const animationFrameRef = useRef<number>(0)

    // Initialize Simulation
    useEffect(() => {
        let mounted = true

        const initBattle = async () => {
            // 1. Create Engine
            const engine = await AdvancedBattleEngine.create(attackerTech, defenderTech, {
                maxRounds: 6,
                trackEvents: true, // Crucial for visuals
                useAdvancedDamage: true
            })

            if (!mounted) return

            // 2. Run Simulation
            const result = engine.simulate(
                attackerFleet,
                defenderFleet,
                defenderDefense
            )

            engineRef.current = engine
            timelineRef.current = result.timeline
            setBattleResult(result)

            // 3. Initialize Visual Units & Positions
            const units = new Map<string, VisualUnit>()

            // Helper to init units
            const initSide = (
                fleet: FleetComposition | DefenseComposition,
                side: 'attacker' | 'defender',
                formation: FormationType,
                baseZ: number,
                facing: number // 1 or -1
            ) => {
                let totalCount = 0
                Object.values(fleet).forEach(c => {
                    if (typeof c === 'number') totalCount += c
                })

                // Generate positions
                const positions = getFormationPositions(formation, totalCount, side === 'attacker' ? 123 : 456)

                // Map units to positions
                let posIdx = 0
                Object.entries(fleet).forEach(([key, count]) => {
                    if (typeof count !== 'number' || count <= 0) return
                    for (let i = 0; i < count; i++) {
                        if (posIdx >= positions.length) break

                        const rawPos = positions[posIdx]
                        const id = `${side}-${key}-${i}`

                        units.set(id, {
                            id,
                            unitKey: key,
                            owner: side,
                            // Offset fleets by Z to face each other
                            position: {
                                x: rawPos.x,
                                y: rawPos.y,
                                z: rawPos.z * (side === 'defender' ? -1 : 1) + baseZ
                            },
                            rotation: { x: 0, y: facing * Math.PI, z: 0 },
                            maxHull: 100, // TODO: Get real max from stats
                            currentHull: 100,
                            maxShield: 100,
                            currentShield: 100,
                            destroyed: false,
                            isFiring: false,
                            effects: []
                        })
                        posIdx++
                    }
                })
            }

            initSide(attackerFleet, 'attacker', attackerFormation, 200, 0) // Attacker at +200Z facing 0
            initSide({ ...defenderFleet, ...defenderDefense }, 'defender', defenderFormation, -200, 1) // Defender at -200Z facing PI

            visualUnitsRef.current = units

            if (autoPlay) {
                setIsPlaying(true)
            }
        }

        initBattle()

        return () => {
            mounted = false
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        }
    }, [attackerFleet, defenderFleet, defenderDefense, attackerTech, defenderTech, attackerFormation, defenderFormation, autoPlay])

    // Playback Loop
    const updateVisuals = useCallback((timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp

        // Calculate Battle Time
        const elapsed = (timestamp - startTimeRef.current) / 1000 * playbackSpeed
        const totalDuration = 60 // Assume 10s per round max? Or derive from timeline

        // Sync Timeline
        // This is where we would interpolate state based on 'elapsed' and 'timelineRef.current'
        // For now, simple round progression

        const calculatedRound = Math.min(Math.floor(elapsed / 5), 6) // 5s per round
        if (calculatedRound !== currentRound) {
            setCurrentRound(calculatedRound)
        }

        // Update Units (Simple Mock Animation for now)
        // In a real implementation, we'd apply damage/destruction events from timeline at specific times

        if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(updateVisuals)
        }
    }, [isPlaying, playbackSpeed, currentRound])

    useEffect(() => {
        if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(updateVisuals)
        } else {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        }
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        }
    }, [isPlaying, updateVisuals])

    const togglePlay = () => setIsPlaying(!isPlaying)
    const reset = () => {
        setCurrentRound(0)
        startTimeRef.current = 0
        setIsPlaying(false)
    }

    return {
        battleResult,
        visualUnits: visualUnitsRef.current,
        isPlaying,
        currentRound,
        togglePlay,
        reset,
        setPlaybackSpeed
    }
}
