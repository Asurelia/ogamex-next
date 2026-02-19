/**
 * SpaceScene - Main R3F Canvas for the real-time game
 *
 * Contains all 3D sub-components: ships, asteroids, stations, effects, camera.
 */

'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { SpaceEffects } from '@/lib/3d/effects'
import { ShipInstances } from './ShipInstances'
import { AsteroidField } from './AsteroidField'
import { StationModel } from './StationModel'
import { RTCamera } from './RTCamera'
import { ShipEffects } from './ShipEffects'
import { SelectionBrackets } from './SelectionBrackets'

export function SpaceScene() {
  return (
    <Canvas
      camera={{ fov: 60, near: 1, far: 1000000, position: [0, 5000, 10000] }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%', background: '#000005' }}
    >
      <Suspense fallback={null}>
        {/* Lighting */}
        <ambientLight intensity={0.15} />
        <directionalLight position={[100000, 50000, 50000]} intensity={1.2} color="#fff8e0" />
        <pointLight position={[0, 0, 0]} intensity={0.5} color="#ffdd88" distance={200000} />

        {/* Background */}
        <Stars radius={500000} depth={200000} count={5000} factor={100} saturation={0.2} fade speed={0.5} />

        {/* Game entities */}
        <ShipInstances />
        <AsteroidField />
        <StationModel />
        <ShipEffects />
        <SelectionBrackets />

        {/* Camera */}
        <RTCamera />

        {/* Post-processing */}
        <SpaceEffects bloomIntensity={0.4} bloomThreshold={0.7} />
      </Suspense>
    </Canvas>
  )
}
