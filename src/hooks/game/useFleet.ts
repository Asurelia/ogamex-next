import { useState, useMemo, useCallback } from 'react'
import { ShipCounts, SHIP_COUNTS_EMPTY, Coordinates } from '@/types/game-core'
import type { PlanetType, MissionType, FleetMission } from '@/types/database'
import { MissionService } from '@/lib/services/mission-service'

// Helpers
const DEFAULT_COORDS: Coordinates = { galaxy: 1, system: 1, position: 1 }

/**
 * Simple distance calculation between two coordinate sets
 * TODO: Move to a shared game-math utility when MissionManager is replaced
 */
function calculateDistance(origin: Coordinates, dest: Coordinates): number {
    if (origin.galaxy !== dest.galaxy) {
        return 20000 * Math.abs(origin.galaxy - dest.galaxy)
    }
    if (origin.system !== dest.system) {
        return 2700 + 95 * Math.abs(origin.system - dest.system)
    }
    if (origin.position !== dest.position) {
        return 1000 + 5 * Math.abs(origin.position - dest.position)
    }
    return 5 // Same position
}

/**
 * Simple flight time calculation
 * TODO: Move to shared game-math utility
 */
function calculateFlightTime(distance: number, minSpeed: number, speedPercent: number): number {
    const speedFactor = speedPercent / 10
    return Math.round(10 + 3500 * Math.sqrt(distance * 10 / minSpeed) / speedFactor)
}

/**
 * Simple fuel consumption estimate
 * TODO: Move to shared game-math utility
 */
function calculateFuelConsumption(distance: number, ships: ShipCounts, flightTime: number): number {
    // Simplified: 1 deuterium per 1000 distance per ship
    const totalShips = Object.values(ships).reduce((sum, count) => sum + count, 0)
    return Math.max(1, Math.floor(distance * totalShips / 1000))
}

export function useFleet(origin: Coordinates | null, availableShips: ShipCounts, userId: string) {
    // 1. Selection State
    const [selectedShips, setSelectedShips] = useState<ShipCounts>({ ...SHIP_COUNTS_EMPTY })

    // 2. Destination State
    const [destination, setDestination] = useState<Coordinates>({ ...DEFAULT_COORDS })
    const [destinationType, setDestinationType] = useState<PlanetType>('planet' as PlanetType)

    // 3. Mission State
    const [missionType, setMissionType] = useState<MissionType>('transport' as MissionType)
    const [speedPercent, setSpeedPercent] = useState(10) // 1-10

    // 4. Calculations
    const distance = useMemo(() => {
        if (!origin) return 0
        return calculateDistance(origin, destination)
    }, [origin, destination])

    const flightTime = useMemo(() => {
        const minSpeed = 10000 // TODO: Calculate real min speed based on selection
        return calculateFlightTime(distance, minSpeed, speedPercent)
    }, [distance, speedPercent, selectedShips])

    const fuelConsumption = useMemo(() => {
        return calculateFuelConsumption(distance, selectedShips, flightTime)
    }, [distance, selectedShips, flightTime])

    // 5. Actions
    const updateShipSelection = useCallback((shipId: string, count: number) => {
        setSelectedShips(prev => ({
            ...prev,
            [shipId]: count
        }))
    }, [])

    const launchMission = useCallback(async () => {
        if (!origin) return false

        // FleetMission uses snake_case property names matching the DB
        const missionData: Partial<FleetMission> = {
            user_id: userId,

            origin_galaxy: origin.galaxy,
            origin_system: origin.system,
            origin_position: origin.position,

            destination_galaxy: destination.galaxy,
            destination_system: destination.system,
            destination_position: destination.position,
            destination_type: destinationType,

            mission_type: missionType,
            ships: selectedShips as unknown as FleetMission['ships'],
            cargo_resources: { metal: 0, crystal: 0, deuterium: 0 } as unknown as FleetMission['cargo_resources'],

            departed_at: new Date().toISOString(),
            arrives_at: new Date(Date.now() + flightTime * 1000).toISOString()
        }

        const id = await MissionService.startMission(missionData)
        return !!id
    }, [userId, origin, destination, destinationType, missionType, selectedShips, flightTime])

    return {
        // State
        selectedShips,
        destination,
        destinationType,
        missionType,
        speedPercent,

        // Calculated
        distance,
        flightTime,
        fuelConsumption,

        // Setters
        setDestination,
        setDestinationType,
        setMissionType,
        setSpeedPercent,
        updateShipSelection,

        // Actions
        launchMission
    }
}
