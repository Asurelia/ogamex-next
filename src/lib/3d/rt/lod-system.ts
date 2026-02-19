/**
 * Ship LOD System
 *
 * Manages level-of-detail for ship rendering based on camera distance.
 * Level 0 (<10km): Full geometry model
 * Level 1 (<50km): Simplified geometry
 * Level 2 (<200km): Billboard sprite
 * Level 3 (>200km): Point/dot
 *
 * Pattern adapted from src/lib/3d/instanced-stars.ts
 */

import * as THREE from 'three'
import { LOD_FULL, LOD_SIMPLE, LOD_BILLBOARD } from '@shared/types/game-constants'

// ============================================================================
// TYPES
// ============================================================================

export type LODLevel = 0 | 1 | 2 | 3

export interface LODConfig {
  /** Distance threshold for full detail (default from game-constants) */
  fullDetail: number
  /** Distance threshold for simplified geometry */
  simplified: number
  /** Distance threshold for billboard */
  billboard: number
  /** Beyond billboard distance → point dot */
}

export interface LODEntity {
  id: string
  position: THREE.Vector3
  currentLevel: LODLevel
  visible: boolean
}

// ============================================================================
// GEOMETRY FACTORIES
// ============================================================================

const geometryCache = new Map<string, THREE.BufferGeometry>()

export function getShipGeometryForLOD(level: LODLevel, shipClass?: string): THREE.BufferGeometry {
  const key = `${level}_${shipClass || 'default'}`
  const cached = geometryCache.get(key)
  if (cached) return cached

  let geometry: THREE.BufferGeometry

  switch (level) {
    case 0:
      // Full detail: capsule-like shape
      geometry = new THREE.CapsuleGeometry(1, 2, 8, 16)
      break
    case 1:
      // Simplified: low-poly octahedron
      geometry = new THREE.OctahedronGeometry(1.2, 0)
      break
    case 2:
      // Billboard: flat quad
      geometry = new THREE.PlaneGeometry(2, 2)
      break
    case 3:
      // Point: tiny sphere
      geometry = new THREE.SphereGeometry(0.5, 4, 4)
      break
  }

  geometryCache.set(key, geometry)
  return geometry
}

// ============================================================================
// LOD CALCULATOR
// ============================================================================

const _tempVec = new THREE.Vector3()

export function calculateLODLevel(
  entityPosition: THREE.Vector3,
  cameraPosition: THREE.Vector3,
  config?: Partial<LODConfig>,
): LODLevel {
  const dist = _tempVec.copy(entityPosition).distanceTo(cameraPosition)

  const full = config?.fullDetail ?? LOD_FULL
  const simplified = config?.simplified ?? LOD_SIMPLE
  const billboard = config?.billboard ?? LOD_BILLBOARD

  if (dist < full) return 0
  if (dist < simplified) return 1
  if (dist < billboard) return 2
  return 3
}

/** Get scale multiplier for a LOD level to maintain visual consistency */
export function getLODScale(level: LODLevel, baseScale: number): number {
  switch (level) {
    case 0: return baseScale
    case 1: return baseScale * 1.5 // slightly larger simplified mesh compensates for less detail
    case 2: return baseScale * 3   // billboard needs to be bigger to be visible
    case 3: return baseScale * 5   // point is very small, scale up
  }
}

// ============================================================================
// BATCH LOD MANAGER
// ============================================================================

/**
 * Manages LOD levels for a batch of entities.
 * Call update() each frame with the camera to recalculate LOD levels.
 * Returns entities grouped by LOD level for efficient instanced rendering.
 */
export class ShipLODManager {
  private entities = new Map<string, LODEntity>()
  private config: LODConfig
  private frustum = new THREE.Frustum()
  private projScreenMatrix = new THREE.Matrix4()

  constructor(config?: Partial<LODConfig>) {
    this.config = {
      fullDetail: config?.fullDetail ?? LOD_FULL,
      simplified: config?.simplified ?? LOD_SIMPLE,
      billboard: config?.billboard ?? LOD_BILLBOARD,
    }
  }

  addEntity(id: string, position: THREE.Vector3): void {
    this.entities.set(id, {
      id,
      position: position.clone(),
      currentLevel: 3,
      visible: true,
    })
  }

  updateEntityPosition(id: string, x: number, y: number, z: number): void {
    const entity = this.entities.get(id)
    if (entity) {
      entity.position.set(x, y, z)
    }
  }

  removeEntity(id: string): void {
    this.entities.delete(id)
  }

  /**
   * Update all entity LOD levels based on camera.
   * Returns a Map of LOD level → array of entity IDs at that level.
   */
  update(camera: THREE.Camera): Map<LODLevel, string[]> {
    // Update frustum
    this.projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    )
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix)

    const groups = new Map<LODLevel, string[]>([
      [0, []],
      [1, []],
      [2, []],
      [3, []],
    ])

    this.entities.forEach((entity) => {
      // Frustum culling - skip entities outside view
      const inFrustum = this.frustum.containsPoint(entity.position)
      entity.visible = inFrustum

      if (!inFrustum) return

      // Calculate LOD level
      const newLevel = calculateLODLevel(entity.position, camera.position, this.config)
      entity.currentLevel = newLevel

      groups.get(newLevel)!.push(entity.id)
    })

    return groups
  }

  getEntity(id: string): LODEntity | undefined {
    return this.entities.get(id)
  }

  get size(): number {
    return this.entities.size
  }

  clear(): void {
    this.entities.clear()
  }
}

// ============================================================================
// INSTANCED MESH HELPERS
// ============================================================================

const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _quaternion = new THREE.Quaternion()
const _scale = new THREE.Vector3()

/**
 * Batch-update an InstancedMesh from a list of entity positions/rotations.
 * Minimizes matrix allocations by reusing temp objects.
 */
export function updateInstancedMeshBatch(
  mesh: THREE.InstancedMesh,
  entities: Array<{ x: number; y: number; z: number; rx?: number; ry?: number; rz?: number; scale: number }>,
): void {
  const count = Math.min(entities.length, mesh.count)

  for (let i = 0; i < count; i++) {
    const e = entities[i]
    _position.set(e.x, e.y, e.z)

    if (e.rx !== undefined && e.ry !== undefined && e.rz !== undefined) {
      _quaternion.setFromEuler(new THREE.Euler(e.rx, e.ry, e.rz))
    } else {
      _quaternion.identity()
    }

    _scale.setScalar(e.scale)
    _matrix.compose(_position, _quaternion, _scale)
    mesh.setMatrixAt(i, _matrix)
  }

  mesh.count = count
  mesh.instanceMatrix.needsUpdate = true
}

/**
 * Dispose of all cached geometries.
 * Call this on cleanup/unmount.
 */
export function disposeLODGeometries(): void {
  geometryCache.forEach((geom) => geom.dispose())
  geometryCache.clear()
}
