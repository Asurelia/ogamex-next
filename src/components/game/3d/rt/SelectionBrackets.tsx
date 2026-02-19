/**
 * SelectionBrackets - EVE-style brackets around entities
 *
 * Shows name + distance labels on entities in 3D space.
 * Color: green=friendly, red=hostile, yellow=neutral, white=station, cyan=asteroid.
 */

'use client'

import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useRTGameStore } from '@/stores/rtGameStore'

function formatDistance(dist: number): string {
  if (dist < 1000) return `${Math.round(dist)} m`
  if (dist < 1000000) return `${(dist / 1000).toFixed(1)} km`
  return `${(dist / 149597870700).toFixed(2)} AU`
}

export function SelectionBrackets() {
  const ships = useRTGameStore((s) => s.ships)
  const asteroids = useRTGameStore((s) => s.asteroids)
  const stations = useRTGameStore((s) => s.stations)
  const myShipId = useRTGameStore((s) => s.myShipId)
  const selectedTargetId = useRTGameStore((s) => s.selectedTargetId)
  const setSelectedTarget = useRTGameStore((s) => s.setSelectedTarget)

  const { camera } = useThree()

  // Calculate brackets for visible entities
  const brackets = useMemo(() => {
    const items: Array<{
      id: string
      name: string
      type: string
      x: number
      y: number
      z: number
      color: string
      distance: number
    }> = []

    const camPos = camera.position

    // Ships
    ships.forEach((ship) => {
      if (ship.isDocked || ship.id === myShipId) return

      const dist = Math.sqrt(
        (ship.x - camPos.x) ** 2 +
        (ship.y - camPos.y) ** 2 +
        (ship.z - camPos.z) ** 2
      )

      if (dist > 250000) return // Don't show brackets beyond 250km

      const color = ship.isNpc
        ? (ship.faction === 'pirate' ? '#ff4444' : '#cccc44')
        : '#44ff44'

      items.push({
        id: ship.id,
        name: ship.ownerName || ship.shipTypeId,
        type: ship.shipTypeId,
        x: ship.x,
        y: ship.y,
        z: ship.z,
        color,
        distance: dist,
      })
    })

    // Stations
    stations.forEach((station) => {
      const dist = Math.sqrt(
        (station.x - camPos.x) ** 2 +
        (station.y - camPos.y) ** 2 +
        (station.z - camPos.z) ** 2
      )

      if (dist > 500000) return

      items.push({
        id: station.id,
        name: station.name,
        type: 'station',
        x: station.x,
        y: station.y,
        z: station.z,
        color: '#ffffff',
        distance: dist,
      })
    })

    // Asteroids (only show selected or nearby)
    asteroids.forEach((ast) => {
      const dist = Math.sqrt(
        (ast.x - camPos.x) ** 2 +
        (ast.y - camPos.y) ** 2 +
        (ast.z - camPos.z) ** 2
      )

      if (dist > 100000 && ast.id !== selectedTargetId) return

      items.push({
        id: ast.id,
        name: `${ast.oreType} (${ast.volume.toFixed(0)} m3)`,
        type: 'asteroid',
        x: ast.x,
        y: ast.y,
        z: ast.z,
        color: '#44cccc',
        distance: dist,
      })
    })

    return items
  }, [ships, stations, asteroids, myShipId, selectedTargetId, camera.position])

  return (
    <group>
      {brackets.map((bracket) => (
        <Html
          key={bracket.id}
          position={[bracket.x, bracket.y + 100, bracket.z]}
          center
          distanceFactor={15000}
          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
        >
          <div
            className={`text-xs px-1.5 py-0.5 rounded border whitespace-nowrap select-none ${
              bracket.id === selectedTargetId
                ? 'border-white bg-white/20'
                : 'border-transparent bg-black/40'
            }`}
            style={{ color: bracket.color }}
            onClick={() => setSelectedTarget(bracket.id)}
          >
            <span className="font-medium">{bracket.name}</span>
            <span className="ml-2 opacity-60">{formatDistance(bracket.distance)}</span>
          </div>
        </Html>
      ))}
    </group>
  )
}
