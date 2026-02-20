import type { GameEngine } from '../GameEngine'
import { Position, RenderRef } from '../ecs/components'
import { query } from 'bitecs'
import { LOD_FULL, LOD_SIMPLE, LOD_BILLBOARD } from '@shared/types/game-constants'
import * as THREE from 'three'

let _cameraPosition: THREE.Vector3 = new THREE.Vector3()

// Pre-compute squared thresholds to avoid sqrt per entity per frame
const LOD_FULL_SQ = LOD_FULL * LOD_FULL
const LOD_SIMPLE_SQ = LOD_SIMPLE * LOD_SIMPLE
const LOD_BILLBOARD_SQ = LOD_BILLBOARD * LOD_BILLBOARD

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
    const distSq = dx * dx + dy * dy + dz * dz

    // Compare squared distances to avoid sqrt
    let lod: number
    if (distSq < LOD_FULL_SQ) {
      lod = 0
    } else if (distSq < LOD_SIMPLE_SQ) {
      lod = 1
    } else if (distSq < LOD_BILLBOARD_SQ) {
      lod = 2
    } else {
      lod = 3
    }

    RenderRef.lodLevel[eid] = lod
  }
}
