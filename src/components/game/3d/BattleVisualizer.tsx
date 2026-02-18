/**
 * BattleVisualizer.tsx
 * 
 * High-performance battle visualization using InstancedMesh.
 * Renders fleets positioned by the useBattle hook.
 */

'use client'

import { useMemo } from 'react'
import { Instances, Instance, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useBattle, type VisualUnit } from '@/hooks/game/useBattle'
import type { FleetComposition, DefenseComposition, AdvancedTechLevels } from '@/lib/game/types'

interface BattleVisualizerProps {
    attackerFleet: FleetComposition
    defenderFleet: FleetComposition
    defenderDefense: DefenseComposition
    attackerTech: AdvancedTechLevels
    defenderTech: AdvancedTechLevels
}

// Reusable geometries
// We create them outside component to avoid recreation
const boxGeo = new THREE.BoxGeometry(1, 1, 3)
const coneGeo = new THREE.ConeGeometry(0.5, 2, 8)
coneGeo.rotateX(Math.PI / 2) // Point forward

function FleetInstances({ units, color, type }: { units: VisualUnit[], color: string, type: 'ship' | 'defense' }) {
    if (units.length === 0) return null

    return (
        <Instances range={units.length} geometry={type === 'ship' ? coneGeo : boxGeo}>
            <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
            {units.map((unit) => (
                <Instance
                    key={unit.id}
                    position={[unit.position.x, unit.position.y, unit.position.z]}
                    rotation={[unit.rotation.x, unit.rotation.y, unit.rotation.z]}
                />
            ))}
        </Instances>
    )
}

export default function BattleVisualizer({
    attackerFleet,
    defenderFleet,
    defenderDefense,
    attackerTech,
    defenderTech
}: BattleVisualizerProps) {
    const { visualUnits, currentRound, togglePlay, isPlaying, battleResult } = useBattle({
        attackerFleet,
        defenderFleet,
        defenderDefense,
        attackerTech,
        defenderTech
    })

    // Group units for instancing
    const groupedUnits = useMemo(() => {
        const attackerUnits: VisualUnit[] = []
        const defenderUnits: VisualUnit[] = []

        visualUnits.forEach((u) => {
            if (u.destroyed) return // Don't render destroyed for now
            if (u.owner === 'attacker') attackerUnits.push(u)
            else defenderUnits.push(u)
        })

        return { attackerUnits, defenderUnits }
    }, [visualUnits]) // Update when visualUnits changes (which happens on init)

    // Dynamic stats for UI
    const attackerCount = groupedUnits.attackerUnits.length
    const defenderCount = groupedUnits.defenderUnits.length

    return (
        <group>
            {/* Lighting */}
            <ambientLight intensity={0.2} />
            <pointLight position={[100, 100, 100]} intensity={1} />
            <pointLight position={[-100, -100, -100]} intensity={0.5} color="#4444ff" />

            {/* Grid for depth perception */}
            <gridHelper args={[1000, 50, 0x333333, 0x111111]} position={[0, -50, 0]} />

            {/* Fleets */}
            <FleetInstances units={groupedUnits.attackerUnits} color="#44aaff" type="ship" />
            <FleetInstances units={groupedUnits.defenderUnits} color="#ff4444" type="ship" />
            <FleetInstances units={groupedUnits.defenderUnits.filter(u => u.unitKey.includes('defense'))} color="#aa4444" type="defense" />

            {/* UI Overlay for Battle Controls inside Canvas */}
            <Html position={[0, 0, 0]} fullscreen style={{ pointerEvents: 'none' }}>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto bg-black/80 p-4 rounded-lg border border-white/20 backdrop-blur-md">
                    <div className="text-xl font-bold text-white">Round {currentRound} / 6</div>
                    <div className="text-sm text-gray-400">
                        Attacker: {attackerCount} units vs Defender: {defenderCount} units
                    </div>

                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={togglePlay}
                            className={`px-6 py-2 rounded font-bold transition-colors ${isPlaying ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} text-white`}
                        >
                            {isPlaying ? 'PAUSE' : 'START SIMULATION'}
                        </button>
                    </div>

                    {battleResult && (
                        <div className="mt-2 text-xs text-green-400">
                            Winner: {battleResult.winner.toUpperCase()}
                        </div>
                    )}
                </div>
            </Html>
        </group>
    )
}
