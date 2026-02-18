/**
 * Warp/Hyperspace Effect
 *
 * Creates immersive FTL/warp transition effects:
 * - Star streak tunnel effect
 * - Chromatic aberration
 * - Time dilation distortion
 * - Speed lines
 *
 * Inspired by Elite Dangerous, EVE Online, and Star Trek.
 */

import * as THREE from 'three'

// ============================================================================
// WARP CONFIGURATION
// ============================================================================

export interface WarpConfig {
  /** Tunnel radius (default: 10) */
  radius?: number
  /** Tunnel length (default: 100) */
  length?: number
  /** Number of star particles (default: 5000) */
  starCount?: number
  /** Star color (default: white-blue) */
  starColor?: THREE.Color
  /** Speed of stars during warp (default: 50) */
  speed?: number
  /** Tunnel color (default: blue) */
  tunnelColor?: THREE.Color
  /** Enable chromatic aberration (default: true) */
  chromaticAberration?: boolean
}

// ============================================================================
// WARP TUNNEL SHADER
// ============================================================================

const TUNNEL_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
varying float vDepth;

void main() {
  vUv = uv;
  vDepth = position.z;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const TUNNEL_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 tunnelColor;
uniform float time;
uniform float intensity;
uniform float speed;

varying vec2 vUv;
varying float vDepth;

// Noise function for energy effect
float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  // Circular UV for tunnel
  vec2 center = vUv - 0.5;
  float dist = length(center);
  float angle = atan(center.y, center.x);

  // Energy lines flowing through tunnel
  float energy = fbm(vec2(angle * 4.0, vDepth * 0.1 - time * speed));
  energy = smoothstep(0.3, 0.7, energy);

  // Edge glow
  float edge = smoothstep(0.5, 0.3, dist);
  float innerGlow = smoothstep(0.1, 0.3, dist);

  // Combine effects
  vec3 color = tunnelColor * energy * edge * innerGlow;

  // Add streaks
  float streaks = sin(angle * 20.0 + time * 5.0) * 0.5 + 0.5;
  streaks = pow(streaks, 4.0);
  color += tunnelColor * streaks * edge * 0.3;

  // Intensity modulation
  color *= intensity;

  // Alpha based on edge
  float alpha = edge * intensity * 0.8;

  gl_FragColor = vec4(color, alpha);
}
`

// ============================================================================
// STAR STREAK SHADER
// ============================================================================

const STAR_VERTEX_SHADER = /* glsl */ `
attribute float size;
attribute float speed;
attribute float offset;

uniform float time;
uniform float warpSpeed;
uniform float tunnelLength;

varying float vAlpha;
varying float vStretch;

void main() {
  // Calculate star position with wrap-around
  vec3 pos = position;

  // Move along z-axis with individual speed
  float zPos = mod(pos.z - time * warpSpeed * speed + offset, tunnelLength) - tunnelLength * 0.5;
  pos.z = zPos;

  // Stretch based on speed
  vStretch = warpSpeed * speed * 0.1;

  // Alpha based on distance (fade at edges)
  float distFromCenter = length(pos.xy) / 10.0;
  vAlpha = 1.0 - smoothstep(0.5, 1.0, distFromCenter);

  // Fade based on z position (fade in front)
  vAlpha *= smoothstep(-tunnelLength * 0.5, -tunnelLength * 0.3, zPos);
  vAlpha *= smoothstep(tunnelLength * 0.5, tunnelLength * 0.3, zPos);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  // Size based on distance and stretch
  gl_PointSize = size * (300.0 / -mvPosition.z) * (1.0 + vStretch * 2.0);

  gl_Position = projectionMatrix * mvPosition;
}
`

const STAR_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 starColor;
uniform float warpSpeed;

varying float vAlpha;
varying float vStretch;

void main() {
  // Point UV
  vec2 uv = gl_PointCoord - 0.5;

  // Stretch horizontally when warping
  uv.x /= (1.0 + vStretch);

  float dist = length(uv);

  // Soft circle with glow
  float alpha = smoothstep(0.5, 0.0, dist);
  alpha *= vAlpha;

  // Bright core
  float core = smoothstep(0.2, 0.0, dist);

  vec3 color = starColor + vec3(1.0) * core * 0.5;

  // Blue shift at high speed
  color = mix(color, vec3(0.5, 0.7, 1.0), warpSpeed * 0.01);

  gl_FragColor = vec4(color, alpha);
}
`

// ============================================================================
// WARP EFFECT CLASS
// ============================================================================

export class WarpEffect extends THREE.Group {
  private tunnel: THREE.Mesh
  private stars: THREE.Points
  private tunnelMaterial: THREE.ShaderMaterial
  private starsMaterial: THREE.ShaderMaterial
  private config: Required<WarpConfig>
  private _active: boolean = false
  private _intensity: number = 0

  constructor(config: WarpConfig = {}) {
    super()

    // Default config
    const defaultConfig: Required<WarpConfig> = {
      radius: 10,
      length: 100,
      starCount: 5000,
      starColor: new THREE.Color(0xaaccff),
      speed: 50,
      tunnelColor: new THREE.Color(0x0066ff),
      chromaticAberration: true,
    }

    this.config = { ...defaultConfig, ...config }

    // Create tunnel
    this.tunnel = this.createTunnel()
    this.tunnelMaterial = this.tunnel.material as THREE.ShaderMaterial
    this.add(this.tunnel)

    // Create stars
    this.stars = this.createStars()
    this.starsMaterial = this.stars.material as THREE.ShaderMaterial
    this.add(this.stars)

    // Start hidden
    this.visible = false
  }

  private createTunnel(): THREE.Mesh {
    // Cylinder for tunnel effect
    const geometry = new THREE.CylinderGeometry(
      this.config.radius,
      this.config.radius * 1.5,
      this.config.length,
      32,
      1,
      true
    )
    // Rotate to face -Z
    geometry.rotateX(Math.PI / 2)

    const material = new THREE.ShaderMaterial({
      vertexShader: TUNNEL_VERTEX_SHADER,
      fragmentShader: TUNNEL_FRAGMENT_SHADER,
      uniforms: {
        tunnelColor: { value: this.config.tunnelColor },
        time: { value: 0 },
        intensity: { value: 0 },
        speed: { value: this.config.speed },
      },
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    return new THREE.Mesh(geometry, material)
  }

  private createStars(): THREE.Points {
    const positions = new Float32Array(this.config.starCount * 3)
    const sizes = new Float32Array(this.config.starCount)
    const speeds = new Float32Array(this.config.starCount)
    const offsets = new Float32Array(this.config.starCount)

    for (let i = 0; i < this.config.starCount; i++) {
      // Random position within tunnel
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * this.config.radius * 0.9

      positions[i * 3] = Math.cos(angle) * r
      positions[i * 3 + 1] = Math.sin(angle) * r
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.config.length

      sizes[i] = 1 + Math.random() * 2
      speeds[i] = 0.5 + Math.random() * 1.0
      offsets[i] = Math.random() * this.config.length
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1))
    geometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1))

    const material = new THREE.ShaderMaterial({
      vertexShader: STAR_VERTEX_SHADER,
      fragmentShader: STAR_FRAGMENT_SHADER,
      uniforms: {
        starColor: { value: this.config.starColor },
        time: { value: 0 },
        warpSpeed: { value: 0 },
        tunnelLength: { value: this.config.length },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    return new THREE.Points(geometry, material)
  }

  /**
   * Start the warp effect
   * @param duration - Fade in duration in seconds
   */
  async start(duration: number = 1.0): Promise<void> {
    this._active = true
    this.visible = true

    // Animate intensity from 0 to 1
    return new Promise((resolve) => {
      const startTime = performance.now()
      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000
        const progress = Math.min(elapsed / duration, 1)

        // Ease in
        this._intensity = progress * progress

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }
      animate()
    })
  }

  /**
   * Stop the warp effect
   * @param duration - Fade out duration in seconds
   */
  async stop(duration: number = 0.5): Promise<void> {
    return new Promise((resolve) => {
      const startIntensity = this._intensity
      const startTime = performance.now()

      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000
        const progress = Math.min(elapsed / duration, 1)

        // Ease out
        this._intensity = startIntensity * (1 - progress * progress)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          this._active = false
          this.visible = false
          resolve()
        }
      }
      animate()
    })
  }

  /**
   * Update the warp effect - call in render loop
   */
  update(deltaTime: number): void {
    if (!this._active) return

    const time = this.tunnelMaterial.uniforms.time.value + deltaTime
    const warpSpeed = this.config.speed * this._intensity

    // Update tunnel
    this.tunnelMaterial.uniforms.time.value = time
    this.tunnelMaterial.uniforms.intensity.value = this._intensity

    // Update stars
    this.starsMaterial.uniforms.time.value = time
    this.starsMaterial.uniforms.warpSpeed.value = warpSpeed
  }

  /**
   * Check if warp is active
   */
  get active(): boolean {
    return this._active
  }

  /**
   * Get current intensity
   */
  get intensity(): number {
    return this._intensity
  }

  /**
   * Set speed
   */
  setSpeed(speed: number): void {
    this.config.speed = speed
    this.tunnelMaterial.uniforms.speed.value = speed
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.tunnel.geometry.dispose()
    this.tunnelMaterial.dispose()
    this.stars.geometry.dispose()
    this.starsMaterial.dispose()
  }
}

// ============================================================================
// SIMPLE WARP FLASH EFFECT
// ============================================================================

/**
 * Quick warp flash effect for instant transitions
 */
export class WarpFlash extends THREE.Mesh {
  private shaderMaterial: THREE.ShaderMaterial
  private _active: boolean = false

  constructor() {
    const geometry = new THREE.PlaneGeometry(2, 2)

    const material = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float intensity;
        uniform float time;
        uniform vec3 color;

        varying vec2 vUv;

        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center);

          // Radial burst
          float burst = smoothstep(1.0, 0.0, dist * 2.0);

          // Speed lines
          float angle = atan(center.y, center.x);
          float lines = sin(angle * 32.0 + time * 10.0) * 0.5 + 0.5;
          lines = pow(lines, 8.0);

          // Combine
          float alpha = burst * intensity;
          alpha += lines * burst * intensity * 0.5;

          vec3 finalColor = color + vec3(1.0) * lines * 0.3;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      uniforms: {
        intensity: { value: 0 },
        time: { value: 0 },
        color: { value: new THREE.Color(0x4488ff) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    })

    super(geometry, material)
    this.shaderMaterial = material
    this.frustumCulled = false
    this.renderOrder = 9999
    this.visible = false
  }

  /**
   * Trigger flash effect
   */
  async flash(duration: number = 0.3): Promise<void> {
    this._active = true
    this.visible = true

    return new Promise((resolve) => {
      const startTime = performance.now()

      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000
        const progress = Math.min(elapsed / duration, 1)

        this.shaderMaterial.uniforms.time.value = elapsed

        // Flash curve: quick rise, slow fall
        const flash = progress < 0.2
          ? progress / 0.2
          : 1 - (progress - 0.2) / 0.8

        this.shaderMaterial.uniforms.intensity.value = flash * flash

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          this._active = false
          this.visible = false
          resolve()
        }
      }
      animate()
    })
  }

  dispose(): void {
    this.geometry.dispose()
    this.shaderMaterial.dispose()
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a full warp tunnel effect
 *
 * @example
 * ```tsx
 * const warp = createWarpEffect()
 * scene.add(warp)
 *
 * // Start warp
 * await warp.start(1.0)
 *
 * // In render loop
 * warp.update(deltaTime)
 *
 * // Stop warp
 * await warp.stop(0.5)
 * ```
 */
export function createWarpEffect(config?: WarpConfig): WarpEffect {
  return new WarpEffect(config)
}

/**
 * Create a quick warp flash effect
 *
 * @example
 * ```tsx
 * const flash = createWarpFlash()
 * camera.add(flash) // Attach to camera for screen-space effect
 *
 * // Trigger flash
 * await flash.flash(0.3)
 * ```
 */
export function createWarpFlash(): WarpFlash {
  return new WarpFlash()
}
