'use client'

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { getEngine, type GameEngine } from './GameEngine'
import type { ECSSystem } from './GameLoop'
import { setCamera } from './systems/CameraSystem'
import { setInstancedMesh } from './systems/RenderSyncSystem'
import { inputSystem } from './systems/InputSystem'
import { networkReceiveSystem } from './systems/NetworkReceiveSystem'
import { clientPredictionSystem } from './systems/ClientPredictionSystem'
import { cameraSystem } from './systems/CameraSystem'
import { lodSystem } from './systems/LODSystem'
import { renderSyncSystem } from './systems/RenderSyncSystem'
import { particleUpdateSystem } from './systems/ParticleUpdateSystem'
import { navigationSystem } from './systems/NavigationSystem'
import { uiBridgeSystem } from './systems/UIBridgeSystem'
import { aiSystem } from './systems/AISystem'
import { intentExecutorSystem } from './systems/IntentExecutorSystem'
import { predictionBridgeSystem, destroyPredictionWorker } from './systems/PredictionBridgeSystem'
import * as THREE from 'three'

/** Wrap a standalone system function into an ECSSystem object */
function wrapSystem(
  engine: GameEngine,
  fn: (engine: GameEngine, dt: number) => void
): ECSSystem {
  return {
    execute(_world: unknown, dt: number) {
      fn(engine, dt)
    },
  }
}

export function EngineController() {
  const { scene, camera } = useThree()
  const meshRef = useRef<THREE.InstancedMesh | null>(null)

  useEffect(() => {
    const engine = getEngine()

    if (!engine.isInitialized()) {
      engine.init()
    }

    engine.getScene().init(scene)
    setCamera(camera)

    // Register all systems in execution order
    engine.clearSystems()
    engine.registerSystem(wrapSystem(engine, inputSystem))
    engine.registerSystem(wrapSystem(engine, networkReceiveSystem))
    engine.registerSystem(wrapSystem(engine, clientPredictionSystem))
    engine.registerSystem(wrapSystem(engine, predictionBridgeSystem))
    engine.registerSystem(wrapSystem(engine, aiSystem))
    engine.registerSystem(wrapSystem(engine, intentExecutorSystem))
    engine.registerSystem(wrapSystem(engine, navigationSystem))
    engine.registerSystem(wrapSystem(engine, cameraSystem))
    engine.registerSystem(wrapSystem(engine, lodSystem))
    engine.registerSystem(wrapSystem(engine, renderSyncSystem))
    engine.registerSystem(wrapSystem(engine, particleUpdateSystem))
    engine.registerSystem(wrapSystem(engine, uiBridgeSystem))

    console.log(`Engine: ${engine.getSystemCount()} systems registered`)

    const geometry = new THREE.SphereGeometry(200, 6, 4)
    const material = new THREE.MeshStandardMaterial({ vertexColors: true })
    const instancedMesh = new THREE.InstancedMesh(geometry, material, 500)
    instancedMesh.frustumCulled = false
    instancedMesh.layers.set(0)

    scene.add(instancedMesh)
    setInstancedMesh(instancedMesh)
    meshRef.current = instancedMesh

    return () => {
      engine.clearSystems()
      destroyPredictionWorker()
      if (meshRef.current) {
        scene.remove(meshRef.current)
        meshRef.current.geometry.dispose()
        ;(meshRef.current.material as THREE.Material).dispose()
        meshRef.current = null
      }
    }
  }, [scene, camera])

  useFrame((_state, delta) => {
    getEngine().tick(delta)
  })

  return null
}
