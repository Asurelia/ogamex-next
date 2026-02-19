import * as THREE from 'three'
import { getFaction } from '@/data/faction-identities'
import { getFactionInstanceColor } from './shaders/faction-material-factory'
import { LOD_FULL, LOD_SIMPLE } from '@shared/types/game-constants'

const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _quaternion = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _euler = new THREE.Euler()

function createShipGeometry(): THREE.BufferGeometry {
  // Simple elongated capsule-like ship silhouette
  return new THREE.CapsuleGeometry(0.5, 2.0, 4, 8)
}

function createShipMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x88aacc),
    metalness: 0.8,
    roughness: 0.3,
    vertexColors: false,
  })
}

export class ShipRenderer {
  instancedMesh: THREE.InstancedMesh | null = null
  maxInstances: number = 500

  private geometry: THREE.BufferGeometry | null = null
  private material: THREE.MeshStandardMaterial | null = null
  private activeCount: number = 0

  init(scene: THREE.Group): THREE.InstancedMesh {
    this.geometry = createShipGeometry()
    this.material = createShipMaterial()

    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.maxInstances)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.frustumCulled = false
    mesh.count = 0
    mesh.name = 'ship_instanced_renderer'

    scene.add(mesh)
    this.instancedMesh = mesh

    return mesh
  }

  updateInstance(
    index: number,
    position: THREE.Vector3,
    rotation: THREE.Euler,
    factionId: string,
    lodLevel: number,
  ): void {
    if (!this.instancedMesh) return
    if (index < 0 || index >= this.maxInstances) return

    // Compute scale based on LOD level
    let scale = 1.0
    if (lodLevel === 0) {
      scale = 1.0   // LOD_FULL: full size
    } else if (lodLevel === 1) {
      scale = 1.5   // LOD_SIMPLE: slightly larger simplified
    } else {
      scale = 3.0   // LOD_BILLBOARD / point: enlarged for visibility
    }

    _position.copy(position)
    _euler.copy(rotation)
    _quaternion.setFromEuler(_euler)
    _scale.setScalar(scale)
    _matrix.compose(_position, _quaternion, _scale)

    this.instancedMesh.setMatrixAt(index, _matrix)

    // Set faction color
    const color = getFactionInstanceColor(factionId)
    this.instancedMesh.setColorAt(index, color)

    this.instancedMesh.instanceMatrix.needsUpdate = true
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true
    }
  }

  setCount(count: number): void {
    if (!this.instancedMesh) return
    this.activeCount = Math.min(count, this.maxInstances)
    this.instancedMesh.count = this.activeCount
  }

  getCount(): number {
    return this.activeCount
  }

  dispose(): void {
    if (this.instancedMesh) {
      const parent = this.instancedMesh.parent
      if (parent) parent.remove(this.instancedMesh)
    }
    this.geometry?.dispose()
    this.material?.dispose()
    this.instancedMesh = null
    this.geometry = null
    this.material = null
    this.activeCount = 0
  }
}

// Re-export LOD constants for convenience
export { LOD_FULL, LOD_SIMPLE }
