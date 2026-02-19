import type { GameEngine } from '../GameEngine'
import { Position, RenderRef } from '../ecs/components'
import { query } from 'bitecs'
import { LOD_FULL, LOD_SIMPLE, LOD_BILLBOARD } from '@shared/types/game-constants'
import * as THREE from 'three'

let _cameraPosition: THREE.Vector3 = new THREE.Vector3()

export function setLODCameraPosition(pos: THREE.Vector3): void {
  _cameraPosition.copy(pos)
}

export function lodSystem(engine: GameEngine, _dt: number): void {
  const world = engine.getWorld()
  if (!world) return

  const entities = query(world, [Position, RenderRef])
  const cx = _cameraPosition.x
  const cy = _cameraPosition.y
  const cz = _cameraPosition.z

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]

    const dx = Position.x[eid] - cx
    const dy = Position.y[eid] - cy
    const dz = Position.z[eid] - cz
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    let lod: number
    if (dist < LOD_FULL) {
      lod = 0
    } else if (dist < LOD_SIMPLE) {
      lod = 1
    } else if (dist < LOD_BILLBOARD) {
      lod = 2
    } else {
      lod = 3
    }

    RenderRef.lodLevel[eid] = lod
  }
}
