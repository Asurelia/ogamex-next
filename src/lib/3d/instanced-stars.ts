/**
 * Instanced Stars System
 *
 * High-performance star rendering using InstancedMesh with LOD.
 * Can render millions of stars with minimal draw calls.
 *
 * Features:
 * - InstancedMesh for batched rendering
 * - 3-level LOD system (near, mid, far)
 * - Frustum culling per-instance
 * - Dynamic visibility updates
 * - Star type variations (color, size)
 */

import * as THREE from 'three'

// ============================================================================
// TYPES
// ============================================================================

export interface Star {
  id: string
  position: THREE.Vector3
  color: THREE.Color
  size: number
  brightness: number
  type: StarType
}

export type StarType = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M'

export interface InstancedStarsConfig {
  /** Maximum stars to render (default: 100000) */
  maxStars?: number
  /** Near LOD distance (default: 100) */
  lodNear?: number
  /** Medium LOD distance (default: 500) */
  lodMedium?: number
  /** Far LOD distance (default: 2000) */
  lodFar?: number
  /** Enable frustum culling (default: true) */
  frustumCulling?: boolean
  /** Base star size (default: 1) */
  baseSize?: number
}

// Star type colors (based on spectral classification)
const STAR_COLORS: Record<StarType, THREE.Color> = {
  O: new THREE.Color(0x9bb0ff), // Blue
  B: new THREE.Color(0xaabfff), // Blue-white
  A: new THREE.Color(0xcad7ff), // White
  F: new THREE.Color(0xf8f7ff), // Yellow-white
  G: new THREE.Color(0xfff4ea), // Yellow (like Sun)
  K: new THREE.Color(0xffd2a1), // Orange
  M: new THREE.Color(0xffcc6f), // Red
}

// ============================================================================
// LOD GEOMETRIES
// ============================================================================

function createStarGeometryHigh(): THREE.BufferGeometry {
  // High detail: icosphere
  return new THREE.IcosahedronGeometry(1, 2)
}

function createStarGeometryMedium(): THREE.BufferGeometry {
  // Medium detail: octahedron
  return new THREE.OctahedronGeometry(1, 0)
}

function createStarGeometryLow(): THREE.BufferGeometry {
  // Low detail: billboard quad (point sprite)
  const geometry = new THREE.PlaneGeometry(2, 2)
  return geometry
}

// ============================================================================
// STAR MATERIAL
// ============================================================================

const STAR_VERTEX_SHADER = /* glsl */ `
varying vec3 vColor;
varying float vBrightness;

void main() {
  vColor = instanceColor;
  vBrightness = 1.0; // Could use instance attribute for per-star brightness

  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`

const STAR_FRAGMENT_SHADER = /* glsl */ `
varying vec3 vColor;
varying float vBrightness;

void main() {
  // Add glow effect
  vec3 color = vColor * vBrightness;
  color += vColor * 0.2; // Ambient glow

  gl_FragColor = vec4(color, 1.0);
}
`

// Billboard shader for far LOD
const BILLBOARD_VERTEX_SHADER = /* glsl */ `
varying vec3 vColor;
varying vec2 vUv;

void main() {
  vColor = instanceColor;
  vUv = uv;

  // Billboard: rotate to face camera
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

  // Scale based on distance
  float scale = length((instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);

  // Apply billboard position
  mvPosition.xy += position.xy * scale;

  gl_Position = projectionMatrix * mvPosition;
}
`

const BILLBOARD_FRAGMENT_SHADER = /* glsl */ `
varying vec3 vColor;
varying vec2 vUv;

void main() {
  // Soft circle
  vec2 center = vUv - 0.5;
  float dist = length(center) * 2.0;

  float alpha = smoothstep(1.0, 0.0, dist);
  float glow = exp(-dist * 2.0);

  vec3 color = vColor * (1.0 + glow * 0.5);

  gl_FragColor = vec4(color, alpha);
}
`

// ============================================================================
// INSTANCED STARS CLASS
// ============================================================================

export class InstancedStars extends THREE.Group {
  private config: Required<InstancedStarsConfig>
  private stars: Map<string, Star> = new Map()

  // LOD meshes
  private meshHigh: THREE.InstancedMesh
  private meshMedium: THREE.InstancedMesh
  private meshLow: THREE.InstancedMesh

  // Instance data
  private matrices: THREE.Matrix4[] = []
  private colors: THREE.Color[] = []

  // Visibility tracking
  private visibleHigh: number = 0
  private visibleMedium: number = 0
  private visibleLow: number = 0

  // Frustum for culling
  private frustum: THREE.Frustum = new THREE.Frustum()
  private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4()

  // Temp objects for calculations
  private tempMatrix = new THREE.Matrix4()
  private tempPosition = new THREE.Vector3()
  private tempColor = new THREE.Color()
  private tempSphere = new THREE.Sphere()

  constructor(config: InstancedStarsConfig = {}) {
    super()

    // Default config
    this.config = {
      maxStars: config.maxStars ?? 100000,
      lodNear: config.lodNear ?? 100,
      lodMedium: config.lodMedium ?? 500,
      lodFar: config.lodFar ?? 2000,
      frustumCulling: config.frustumCulling ?? true,
      baseSize: config.baseSize ?? 1,
    }

    // Create LOD meshes
    this.meshHigh = this.createInstancedMesh(
      createStarGeometryHigh(),
      this.createStarMaterial(false),
      Math.floor(this.config.maxStars * 0.1) // 10% high detail
    )

    this.meshMedium = this.createInstancedMesh(
      createStarGeometryMedium(),
      this.createStarMaterial(false),
      Math.floor(this.config.maxStars * 0.3) // 30% medium detail
    )

    this.meshLow = this.createInstancedMesh(
      createStarGeometryLow(),
      this.createStarMaterial(true),
      this.config.maxStars // 100% low detail (far stars)
    )

    // Add meshes to group
    this.add(this.meshHigh)
    this.add(this.meshMedium)
    this.add(this.meshLow)

    // Set initial counts to 0
    this.meshHigh.count = 0
    this.meshMedium.count = 0
    this.meshLow.count = 0
  }

  private createInstancedMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    count: number
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geometry, material, count)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.frustumCulled = false // We do our own culling
    return mesh
  }

  private createStarMaterial(isBillboard: boolean): THREE.ShaderMaterial {
    if (isBillboard) {
      return new THREE.ShaderMaterial({
        vertexShader: BILLBOARD_VERTEX_SHADER,
        fragmentShader: BILLBOARD_FRAGMENT_SHADER,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    }

    return new THREE.ShaderMaterial({
      vertexShader: STAR_VERTEX_SHADER,
      fragmentShader: STAR_FRAGMENT_SHADER,
    })
  }

  /**
   * Add stars to the system
   */
  addStars(stars: Star[]): void {
    for (const star of stars) {
      this.stars.set(star.id, star)

      // Create matrix
      const matrix = new THREE.Matrix4()
      matrix.setPosition(star.position)
      matrix.scale(new THREE.Vector3(
        star.size * this.config.baseSize,
        star.size * this.config.baseSize,
        star.size * this.config.baseSize
      ))

      this.matrices.push(matrix)
      this.colors.push(star.color.clone())
    }
  }

  /**
   * Add star from parameters
   */
  addStar(
    id: string,
    x: number,
    y: number,
    z: number,
    type: StarType = 'G',
    size: number = 1,
    brightness: number = 1
  ): void {
    const star: Star = {
      id,
      position: new THREE.Vector3(x, y, z),
      color: STAR_COLORS[type].clone(),
      size,
      brightness,
      type,
    }
    this.addStars([star])
  }

  /**
   * Generate random stars for testing
   */
  generateRandomStars(count: number, radius: number = 1000): void {
    const types: StarType[] = ['O', 'B', 'A', 'F', 'G', 'K', 'M']
    const typeWeights = [1, 2, 5, 10, 15, 20, 47] // Realistic distribution

    const totalWeight = typeWeights.reduce((a, b) => a + b, 0)

    const getRandomType = (): StarType => {
      let r = Math.random() * totalWeight
      for (let i = 0; i < types.length; i++) {
        r -= typeWeights[i]
        if (r <= 0) return types[i]
      }
      return 'M'
    }

    const stars: Star[] = []

    for (let i = 0; i < count; i++) {
      // Spherical distribution
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.cbrt(Math.random()) * radius // Cube root for uniform volume

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      const type = getRandomType()

      stars.push({
        id: `star_${i}`,
        position: new THREE.Vector3(x, y, z),
        color: STAR_COLORS[type].clone(),
        size: 0.5 + Math.random() * 1.5,
        brightness: 0.5 + Math.random() * 0.5,
        type,
      })
    }

    this.addStars(stars)
  }

  /**
   * Update LOD and visibility based on camera
   * Call this in render loop
   */
  update(camera: THREE.Camera): void {
    // Update frustum
    if (this.config.frustumCulling) {
      this.projScreenMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      )
      this.frustum.setFromProjectionMatrix(this.projScreenMatrix)
    }

    // Reset counts
    this.visibleHigh = 0
    this.visibleMedium = 0
    this.visibleLow = 0

    const cameraPosition = camera.position

    // Sort stars into LOD buckets
    for (let i = 0; i < this.matrices.length; i++) {
      const matrix = this.matrices[i]
      const color = this.colors[i]

      // Extract position from matrix
      this.tempPosition.setFromMatrixPosition(matrix)

      // Frustum culling
      if (this.config.frustumCulling) {
        this.tempSphere.center.copy(this.tempPosition)
        this.tempSphere.radius = 2 // Approximate star radius

        if (!this.frustum.intersectsSphere(this.tempSphere)) {
          continue
        }
      }

      // Calculate distance
      const distance = this.tempPosition.distanceTo(cameraPosition)

      // Assign to LOD bucket
      if (distance < this.config.lodNear && this.visibleHigh < this.meshHigh.instanceMatrix.count) {
        this.meshHigh.setMatrixAt(this.visibleHigh, matrix)
        this.meshHigh.setColorAt(this.visibleHigh, color)
        this.visibleHigh++
      } else if (distance < this.config.lodMedium && this.visibleMedium < this.meshMedium.instanceMatrix.count) {
        this.meshMedium.setMatrixAt(this.visibleMedium, matrix)
        this.meshMedium.setColorAt(this.visibleMedium, color)
        this.visibleMedium++
      } else if (distance < this.config.lodFar && this.visibleLow < this.meshLow.instanceMatrix.count) {
        this.meshLow.setMatrixAt(this.visibleLow, matrix)
        this.meshLow.setColorAt(this.visibleLow, color)
        this.visibleLow++
      }
    }

    // Update instance counts
    this.meshHigh.count = this.visibleHigh
    this.meshMedium.count = this.visibleMedium
    this.meshLow.count = this.visibleLow

    // Flag for update
    this.meshHigh.instanceMatrix.needsUpdate = true
    this.meshMedium.instanceMatrix.needsUpdate = true
    this.meshLow.instanceMatrix.needsUpdate = true

    if (this.meshHigh.instanceColor) this.meshHigh.instanceColor.needsUpdate = true
    if (this.meshMedium.instanceColor) this.meshMedium.instanceColor.needsUpdate = true
    if (this.meshLow.instanceColor) this.meshLow.instanceColor.needsUpdate = true
  }

  /**
   * Get star by ID
   */
  getStar(id: string): Star | undefined {
    return this.stars.get(id)
  }

  /**
   * Get visible star counts by LOD
   */
  getStats(): { high: number; medium: number; low: number; total: number } {
    return {
      high: this.visibleHigh,
      medium: this.visibleMedium,
      low: this.visibleLow,
      total: this.visibleHigh + this.visibleMedium + this.visibleLow,
    }
  }

  /**
   * Clear all stars
   */
  clearStars(): void {
    this.stars.clear()
    this.matrices = []
    this.colors = []
    this.meshHigh.count = 0
    this.meshMedium.count = 0
    this.meshLow.count = 0
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.meshHigh.geometry.dispose()
    this.meshMedium.geometry.dispose()
    this.meshLow.geometry.dispose()
    ;(this.meshHigh.material as THREE.Material).dispose()
    ;(this.meshMedium.material as THREE.Material).dispose()
    ;(this.meshLow.material as THREE.Material).dispose()
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create an instanced stars system
 *
 * @example
 * ```tsx
 * const stars = createInstancedStars({
 *   maxStars: 100000,
 *   lodNear: 100,
 *   lodMedium: 500,
 *   lodFar: 2000
 * })
 *
 * // Generate random stars
 * stars.generateRandomStars(50000, 1000)
 *
 * // Add to scene
 * scene.add(stars)
 *
 * // In render loop
 * stars.update(camera)
 * ```
 */
export function createInstancedStars(config?: InstancedStarsConfig): InstancedStars {
  return new InstancedStars(config)
}

/**
 * Get star color by spectral type
 */
export function getStarColor(type: StarType): THREE.Color {
  return STAR_COLORS[type].clone()
}

/**
 * Get random star type based on realistic distribution
 */
export function getRandomStarType(): StarType {
  const types: StarType[] = ['O', 'B', 'A', 'F', 'G', 'K', 'M']
  const weights = [0.01, 0.02, 0.05, 0.10, 0.15, 0.20, 0.47]

  const r = Math.random()
  let cumulative = 0

  for (let i = 0; i < types.length; i++) {
    cumulative += weights[i]
    if (r <= cumulative) return types[i]
  }

  return 'M'
}
