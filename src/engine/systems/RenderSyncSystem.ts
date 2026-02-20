import type { GameEngine } from '../GameEngine'
import { Position, Rotation, RenderRef, ShipMeta } from '../ecs/components'
import { query } from 'bitecs'
import * as THREE from 'three'

let _instancedMesh: THREE.InstancedMesh | null = null

const _matrix = new THREE.Matrix4()
const _pos = new THREE.Vector3()
const _rot = new THREE.Euler()
const _quat = new THREE.Quaternion()
const _scale = new THREE.Vector3(1, 1, 1)
const _color = new THREE.Color()

// Pre-allocated zero matrix for hiding unused instances (avoids per-frame allocation)
const _zeroMatrix = new THREE.Matrix4().compose(
  new THREE.Vector3(0, 0, 0),
  new THREE.Quaternion(),
  new THREE.Vector3(0, 0, 0)
)

const FACTION_COLORS: readonly number[] = [
  0xffd700, // 0 amarr
  0x3399ff, // 1 caldari
  0x33cc66, // 2 gallente
  0xcc6633, // 3 minmatar
  0xff3333, // 4 pirate
  0x888888, // 5 npc
]

export function setInstancedMesh(mesh: THREE.InstancedMesh): void {
  _instancedMesh = mesh
}

export function renderSyncSystem(engine: GameEngine, _dt: number): void {
  if (!_instancedMesh) return

  const world = engine.getWorld()
  if (!world) return

  const entities = query(world, [Position, Rotation, RenderRef, ShipMeta])
  let instanceIdx = 0

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]
    const lod = RenderRef.lodLevel[eid]

    // Dots (lod 3) rendered differently, skip instanced mesh
    if (lod > 2) continue

    if (instanceIdx >= _instancedMesh.count) break

    _pos.set(Position.x[eid], Position.y[eid], Position.z[eid])
    _rot.set(Rotation.x[eid], Rotation.y[eid], Rotation.z[eid])
    _quat.setFromEuler(_rot)
    _matrix.compose(_pos, _quat, _scale)
    _instancedMesh.setMatrixAt(instanceIdx, _matrix)

    const factionIdx = ShipMeta.faction[eid]
    const hex = FACTION_COLORS[factionIdx] ?? FACTION_COLORS[5]
    _color.setHex(hex)
    _instancedMesh.setColorAt(instanceIdx, _color)

    instanceIdx++
  }

  // Hide unused instances (reuse pre-allocated matrix)
  for (let j = instanceIdx; j < _instancedMesh.count; j++) {
    _instancedMesh.setMatrixAt(j, _zeroMatrix)
  }

  _instancedMesh.instanceMatrix.needsUpdate = true
  if (_instancedMesh.instanceColor) {
    _instancedMesh.instanceColor.needsUpdate = true
  }
}
