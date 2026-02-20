'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { SpaceEffects } from '@/lib/3d/effects'
import { EngineController } from '@/engine/EngineController'
import { DamageVFX } from '@/components/game/3d/rt/DamageVFX'
import { WarpVFX } from '@/components/game/3d/rt/WarpVFX'
import { WeaponFireVFX } from '@/components/game/3d/rt/WeaponFireVFX'
import { ExplosionVFX } from '@/components/game/3d/rt/ExplosionVFX'
import { MiningLaserVFX } from '@/components/game/3d/rt/MiningLaserVFX'
import { EngineTrailVFX } from '@/components/game/3d/rt/EngineTrailVFX'

export function SpaceScene() {
  return (
    <Canvas
      camera={{ fov: 60, near: 1, far: 1000000, position: [0, 5000, 10000] }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%', background: '#000005' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.15} />
        <directionalLight position={[100000, 50000, 50000]} intensity={1.2} color="#fff8e0" />
        <EngineController />
        <DamageVFX />
        <WarpVFX />
        <WeaponFireVFX />
        <ExplosionVFX />
        <MiningLaserVFX />
        <EngineTrailVFX />
        <SpaceEffects bloomIntensity={0.4} bloomThreshold={0.7} />
      </Suspense>
    </Canvas>
  )
}
