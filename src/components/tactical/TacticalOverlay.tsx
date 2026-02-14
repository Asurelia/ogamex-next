'use client'

import React from 'react'
import Link from 'next/link'
import { useGameStore } from '@/stores/gameStore'
import { Planet } from '@/types/database'

export function TacticalOverlay() {
    const { currentPlanet } = useGameStore()

    if (!currentPlanet) {
        return (
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <div className="ogame-panel p-4 animate-pulse">
                    <h2 className="text-ogame-text-header text-lg">System Scanning...</h2>
                    <p className="text-ogame-text-muted text-sm">Select a planet to view tactical data.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
            {/* Top Left: Planet Info */}
            <div className="flex justify-between items-start">
                <div className="ogame-panel p-4 w-80 pointer-events-auto bg-opacity-90 backdrop-blur-sm">
                    <div className="flex justify-between items-center border-b border-ogame-border mb-2 pb-2">
                        <h2 className="text-ogame-text-header font-bold text-lg">{currentPlanet.name}</h2>
                        <span className="text-xs text-ogame-text-muted">[{currentPlanet.galaxy}:{currentPlanet.system}:{currentPlanet.position}]</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                        <div className="text-ogame-text-muted">Diameter:</div>
                        <div className="text-right">{currentPlanet.diameter.toLocaleString()} km</div>
                        <div className="text-ogame-text-muted">Temp:</div>
                        <div className="text-right">{currentPlanet.temp_min}°C / {currentPlanet.temp_max}°C</div>
                    </div>

                    <div className="space-y-2">
                        <div className="text-xs uppercase text-ogame-text-muted tracking-wider mb-1">Resources</div>
                        <div className="flex justify-between text-xs">
                            <span className="text-ogame-metal">Metal</span>
                            <span>{Math.floor(currentPlanet.metal).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-ogame-crystal">Crystal</span>
                            <span>{Math.floor(currentPlanet.crystal).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-ogame-deuterium">Deuterium</span>
                            <span>{Math.floor(currentPlanet.deuterium).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-ogame-energy">Energy</span>
                            <span>{currentPlanet.energy_used} / {currentPlanet.energy_max}</span>
                        </div>
                    </div>
                </div>

                {/* Top Right: System Status (Fake) */}
                <div className="ogame-panel p-2 pointer-events-auto">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-mono text-ogame-text-header">TACTICAL ONLINE</span>
                    </div>
                </div>
            </div>

            {/* Bottom: Action Menu */}
            <div className="flex justify-center pointer-events-auto">
                <div className="ogame-panel p-2 flex space-x-2 bg-opacity-90 backdrop-blur-md">
                    <Link
                        href={`/game/overview?planet=${currentPlanet.id}`}
                        className="ogame-button bg-blue-900/50 hover:bg-blue-800/50 flex flex-col items-center justify-center w-24 h-16 text-xs"
                    >
                        <span className="text-lg mb-1">⌂</span>
                        OVERVIEW
                    </Link>
                    <Link
                        href={`/game/resources?planet=${currentPlanet.id}`}
                        className="ogame-button bg-yellow-900/50 hover:bg-yellow-800/50 flex flex-col items-center justify-center w-24 h-16 text-xs"
                    >
                        <span className="text-lg mb-1">⚡</span>
                        RESOURCES
                    </Link>
                    <Link
                        href={`/game/fleet?planet=${currentPlanet.id}`}
                        className="ogame-button bg-red-900/50 hover:bg-red-800/50 flex flex-col items-center justify-center w-24 h-16 text-xs"
                    >
                        <span className="text-lg mb-1">✈</span>
                        FLEET
                    </Link>
                    <Link
                        href={`/game/research?planet=${currentPlanet.id}`}
                        className="ogame-button bg-purple-900/50 hover:bg-purple-800/50 flex flex-col items-center justify-center w-24 h-16 text-xs"
                    >
                        <span className="text-lg mb-1">🔬</span>
                        RESEARCH
                    </Link>
                </div>
            </div>
        </div>
    )
}
