import { useState } from 'react'
import { useFleet } from '@/hooks/game/useFleet'
import { ShipCounts, Coordinates, SHIP_KEYS } from '@/types/game-core'
import type { PlanetType, MissionType } from '@/types/database'

// DB uses lowercase string unions, not runtime enums
const PLANET_TYPES: PlanetType[] = ['planet', 'moon', 'debris_field'] as PlanetType[]
const MISSION_TYPES: MissionType[] = [
    'attack', 'transport', 'deployment', 'espionage',
    'colonization', 'recycle', 'expedition', 'acs_attack',
    'acs_defend', 'moon_destruction'
] as MissionType[]


interface FleetDispatchProps {
    origin: Coordinates
    availableShips: ShipCounts
    userId: string
    onClose: () => void
}

export default function FleetDispatch({ origin, availableShips, userId, onClose }: FleetDispatchProps) {
    const {
        selectedShips, destination, destinationType, missionType, speedPercent,
        distance, flightTime, fuelConsumption,
        setDestination, setDestinationType, setMissionType, setSpeedPercent, updateShipSelection,
        launchMission
    } = useFleet(origin, availableShips, userId)

    const [step, setStep] = useState(1) // 1: Ships, 2: Destination, 3: Mission
    const [submitting, setSubmitting] = useState(false)

    // Render Helpers
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)
        return `${h}h ${m}m ${s}s`
    }

    const handleLaunch = async () => {
        setSubmitting(true)
        const success = await launchMission()
        setSubmitting(false)
        if (success) {
            alert("Fleet dispatched successfully!")
            onClose()
        } else {
            alert("Failed to dispatch fleet.")
        }
    }

    return (
        <div className="w-[600px] h-[500px] bg-gray-900 border border-teal-600 flex flex-col shadow-2xl relative">
            {/* Header */}
            <div className="bg-teal-900/40 p-2 border-b border-teal-600 flex justify-between items-center">
                <span className="font-bold text-teal-100 uppercase tracking-widest">Fleet Dispatch - Step {step}/3</span>
                <button onClick={onClose} className="text-teal-400 hover:text-white">✕</button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto">

                {/* Step 1: Ships */}
                {step === 1 && (
                    <div className="space-y-4">
                        <h3 className="text-teal-400 font-bold border-b border-gray-700 pb-1">Select Ships</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(availableShips).map(([key, count]) => (
                                count > 0 && (
                                    <div key={key} className="flex justify-between items-center bg-gray-800 p-2 rounded border border-gray-700">
                                        <span className="text-sm text-gray-300 capitalize">{key}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Max: {count}</span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={count}
                                                value={selectedShips[key as keyof ShipCounts] || 0}
                                                onChange={(e) => updateShipSelection(key, parseInt(e.target.value) || 0)}
                                                className="w-16 bg-black border border-gray-600 px-1 text-right text-white text-sm"
                                            />
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Destination */}
                {step === 2 && (
                    <div className="space-y-6">
                        <h3 className="text-teal-400 font-bold border-b border-gray-700 pb-1">Destination</h3>

                        <div className="flex gap-2 justify-center py-4">
                            <input
                                type="number"
                                value={destination.galaxy}
                                onChange={e => setDestination({ ...destination, galaxy: Number(e.target.value) })}
                                className="w-16 bg-black border border-teal-500 p-2 text-center text-xl text-white font-mono"
                            />
                            <span className="text-2xl text-gray-500">:</span>
                            <input
                                type="number"
                                value={destination.system}
                                onChange={e => setDestination({ ...destination, system: Number(e.target.value) })}
                                className="w-16 bg-black border border-teal-500 p-2 text-center text-xl text-white font-mono"
                            />
                            <span className="text-2xl text-gray-500">:</span>
                            <input
                                type="number"
                                value={destination.position}
                                onChange={e => setDestination({ ...destination, position: Number(e.target.value) })}
                                className="w-16 bg-black border border-teal-500 p-2 text-center text-xl text-white font-mono"
                            />
                        </div>

                        <div className="flex gap-4 justify-center">
                            {PLANET_TYPES.map(type => (
                                <button
                                    key={type}
                                    onClick={() => setDestinationType(type)}
                                    className={`px-4 py-2 border rounded ${destinationType === type ? 'bg-teal-700 border-teal-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        <div className="text-center text-sm text-gray-400 mt-4">
                            Distance: <span className="text-white">{distance.toLocaleString()}</span> units
                        </div>
                    </div>
                )}

                {/* Step 3: Mission */}
                {step === 3 && (
                    <div className="space-y-4">
                        <h3 className="text-teal-400 font-bold border-b border-gray-700 pb-1">Mission & Settings</h3>

                        <div className="grid grid-cols-2 gap-2">
                            {MISSION_TYPES.map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMissionType(m)}
                                    className={`px-3 py-2 border text-sm text-left rounded ${missionType === m ? 'bg-teal-700 border-teal-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                                >
                                    {m.replace(/_/g, ' ')}
                                </button>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-gray-700">
                            <label className="block text-xs text-gray-400 mb-1">Fleet Speed: {speedPercent * 10}%</label>
                            <input
                                type="range"
                                min={1} max={10}
                                value={speedPercent}
                                onChange={e => setSpeedPercent(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div className="bg-black/50 p-2 rounded border border-gray-700 text-sm space-y-1">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Duration (one way):</span>
                                <span className="text-white">{formatTime(flightTime)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Fuel Consumption:</span>
                                <span className="text-white">{fuelConsumption.toLocaleString()} Deals</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Arrival:</span>
                                <span className="text-white">{new Date(Date.now() + flightTime * 1000).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Navigation */}
            <div className="p-3 bg-gray-900 border-t border-gray-700 flex justify-between">
                {step > 1 ? (
                    <button
                        onClick={() => setStep(s => s - 1)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded border border-gray-500"
                    >
                        Back
                    </button>
                ) : <div></div>}

                {step < 3 ? (
                    <button
                        onClick={() => setStep(s => s + 1)}
                        className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded border border-teal-500"
                    >
                        Next
                    </button>
                ) : (
                    <button
                        onClick={handleLaunch}
                        disabled={submitting}
                        className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded border border-orange-400 disabled:opacity-50"
                    >
                        {submitting ? 'Launching...' : 'Send Fleet'}
                    </button>
                )}
            </div>
        </div>
    )
}
