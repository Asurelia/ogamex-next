/**
 * StationModel - 3D station rendering
 *
 * Renders stations as large structures with docking indicators.
 */

'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useRTGameStore } from '@/stores/rtGameStore'

export function StationModel() {
  const stations = useRTGameStore((s) => s.stations)
  const stationArray = useMemo(() => Array.from(stations.values()), [stations])

  return (
    <group>
      {stationArray.map((station) => (
        <group key={station.id} position={[station.x, station.y, station.z]}>
          {/* Station body */}
          <mesh>
            <cylinderGeometry args={[200, 300, 500, 8]} />
            <meshStandardMaterial
              color="#667788"
              metalness={0.9}
              roughness={0.2}
              emissive="#113344"
              emissiveIntensity={0.2}
            />
          </mesh>

          {/* Docking ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[350, 20, 8, 24]} />
            <meshStandardMaterial
              color="#44aacc"
              emissive="#44aacc"
              emissiveIntensity={0.5}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>

          {/* Station name label */}
          <Html
            position={[0, 400, 0]}
            center
            distanceFactor={20000}
            style={{ pointerEvents: 'none' }}
          >
            <div className="text-white text-xs bg-black/60 px-2 py-0.5 rounded whitespace-nowrap">
              {station.name}
            </div>
          </Html>

          {/* Docking beacon light */}
          <pointLight
            position={[0, 0, 350]}
            color="#44aacc"
            intensity={2}
            distance={5000}
          />
        </group>
      ))}
    </group>
  )
}
