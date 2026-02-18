/**
 * Black Hole Shader System
 *
 * Advanced GPU-based black hole visualization with:
 * - Gravitational lensing distortion
 * - Animated accretion disk with procedural noise
 * - RGB chromatic aberration
 * - Film grain noise
 *
 * Based on shader techniques from black-hole-main asset
 */

import * as THREE from 'three'

// ============================================================================
// SHADER CODE
// ============================================================================

// Utility functions (included inline in shaders)
const shaderUtils = `
  float inverseLerp(float v, float minValue, float maxValue) {
    return (v - minValue) / (maxValue - minValue);
  }

  float remap(float v, float inMin, float inMax, float outMin, float outMax) {
    float t = inverseLerp(v, inMin, inMax);
    return mix(outMin, outMax, t);
  }

  float random2d(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // Periodic Perlin noise (Stefan Gustavson)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

  float perlin3dPeriodic(vec3 P, vec3 rep) {
    vec3 Pi0 = mod(floor(P), rep);
    vec3 Pi1 = mod(Pi0 + vec3(1.0), rep);
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;
    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);
    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);
    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }
`

// Accretion Disk Shaders
export const accretionDiskVertexShader = `
  varying vec2 vUv;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
  }
`

export const accretionDiskFragmentShader = `
  uniform float uTime;
  uniform sampler2D uGradientTexture;
  uniform sampler2D uNoisesTexture;

  varying vec2 vUv;

  ${shaderUtils}

  void main() {
    float noise1 = texture2D(uNoisesTexture, vUv - uTime * 0.1).r;
    float noise2 = texture2D(uNoisesTexture, vUv - uTime * 0.08).g;
    float noise3 = texture2D(uNoisesTexture, vUv - uTime * 0.06).b;
    float noise4 = texture2D(uNoisesTexture, vUv - uTime * 0.04).a;
    vec4 noiseVector = vec4(noise1, noise2, noise3, noise4);
    float noiseLength = length(noiseVector);

    float outerFalloff = remap(vUv.y, 0.4, 0.0, 1.0, 0.0);
    float innerFalloff = remap(vUv.y, 1.0, 0.95, 0.0, 1.0);
    float falloff = min(outerFalloff, innerFalloff);
    falloff = smoothstep(0.0, 1.0, falloff);

    vec2 uv = vUv;
    uv.y += noiseLength * 0.4;
    uv.y *= falloff;

    vec4 color = texture2D(uGradientTexture, uv);
    color.a = uv.y;
    gl_FragColor = color;
  }
`

// Distortion Hole Shaders (gravitational lensing center)
export const distortionHoleVertexShader = `
  varying vec2 vUv;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
  }
`

export const distortionHoleFragmentShader = `
  varying vec2 vUv;

  ${shaderUtils}

  void main() {
    float distanceToCenter = length(vUv - 0.5);
    float strength = remap(distanceToCenter, 0.2, 0.5, 1.0, 0.0);
    strength = smoothstep(0.0, 1.0, strength);
    gl_FragColor = vec4(vec3(strength), 1.0);
  }
`

// Distortion Disc Shaders (lensing around disc)
export const distortionDiscVertexShader = `
  varying vec2 vUv;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
  }
`

export const distortionDiscFragmentShader = `
  varying vec2 vUv;

  ${shaderUtils}

  void main() {
    float distanceToCenter = length(vUv - 0.5);
    float strength = remap(distanceToCenter, 0.2 / 3.0, 0.5 / 3.0, 1.0, 0.0);
    strength = smoothstep(0.0, 1.0, strength);

    float alpha = remap(distanceToCenter, 0.4, 0.5, 1.0, 0.0);
    alpha = smoothstep(0.0, 1.0, alpha);

    gl_FragColor = vec4(vec3(strength), 1.0);
  }
`

// Noise Generator Shaders
export const noisesVertexShader = `
  varying vec2 vUv;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
  }
`

export const noisesFragmentShader = `
  varying vec2 vUv;

  ${shaderUtils}

  void main() {
    float perlin1 = perlin3dPeriodic(vec3(vUv.xy * 5.0, 12.34), vec3(5.0));
    float perlin2 = perlin3dPeriodic(vec3(vUv.xy * 10.0, 34.56), vec3(10.0));
    float perlin3 = perlin3dPeriodic(vec3(vUv.xy * 20.0, 56.78), vec3(20.0));
    float perlin4 = perlin3dPeriodic(vec3(vUv.xy * 40.0, 56.78), vec3(40.0));
    gl_FragColor = vec4(perlin1, perlin2, perlin3, perlin4);
  }
`

// Composition/Post-processing Shaders (gravitational lensing + effects)
export const compositionVertexShader = `
  varying vec2 vUv;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
  }
`

export const compositionFragmentShader = `
  uniform float uTime;
  uniform sampler2D uDefaultTexture;
  uniform sampler2D uDistortionTexture;
  uniform vec2 uConvergencePosition;
  uniform float uDistortionStrength;
  uniform float uVignetteStrength;
  uniform float uNoiseStrength;

  varying vec2 vUv;

  ${shaderUtils}

  void main() {
    float distortionStrength = texture2D(uDistortionTexture, vUv).r * uDistortionStrength;
    vec2 toConvergence = uConvergencePosition - vUv;
    vec2 distortedUv = vUv + toConvergence * distortionStrength;

    // Vignette
    float distanceToCenter = length(vUv - 0.5);
    float vignetteStrength = remap(distanceToCenter, 0.3, 0.7, 0.0, 1.0);
    vignetteStrength = smoothstep(0.0, 1.0, vignetteStrength) * uVignetteStrength;

    // RGB Shift (chromatic aberration)
    float r = texture2D(uDefaultTexture, distortedUv + vec2(sin(0.0), cos(0.0)) * 0.02 * vignetteStrength).r;
    float g = texture2D(uDefaultTexture, distortedUv + vec2(sin(2.1), cos(2.1)) * 0.02 * vignetteStrength).g;
    float b = texture2D(uDefaultTexture, distortedUv + vec2(sin(-2.1), cos(-2.1)) * 0.02 * vignetteStrength).b;
    vec4 color = vec4(r, g, b, 1.0);

    // Film grain noise
    float noise = random2d(vUv + uTime);
    noise = noise - 0.5;
    float grayscale = r * 0.299 + g * 0.587 + b * 0.114;
    noise *= grayscale;
    color += noise * uNoiseStrength;

    gl_FragColor = color;
  }
`

// Stars background shaders
export const starsVertexShader = `
  attribute float size;
  attribute vec3 color;

  varying vec3 vColor;

  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size;
    vColor = color;
  }
`

export const starsFragmentShader = `
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord;
    float distanceToCenter = length(uv - 0.5);
    float alpha = 0.02 / distanceToCenter;
    alpha *= 1.0 - distanceToCenter * 2.0;
    gl_FragColor = vec4(vColor, alpha);
  }
`

// ============================================================================
// BLACK HOLE SYSTEM CLASS
// ============================================================================

export interface BlackHoleConfig {
  size?: number
  discInnerRadius?: number
  discOuterRadius?: number
  rotationSpeed?: number
  distortionStrength?: number
  vignetteStrength?: number
  noiseStrength?: number
  discColors?: string[]
}

const DEFAULT_CONFIG: Required<BlackHoleConfig> = {
  size: 1.5,
  discInnerRadius: 1.5,
  discOuterRadius: 6,
  rotationSpeed: 0.5,
  distortionStrength: 1.0,
  vignetteStrength: 1.0,
  noiseStrength: 0.5,
  discColors: ['#fffbf9', '#ffbc68', '#ff5600', '#ff0053', '#cc00ff'],
}

/**
 * GPU-accelerated Black Hole visualization system
 */
export class BlackHoleSystem {
  public group: THREE.Group
  private config: Required<BlackHoleConfig>

  // Components
  private disc: THREE.Mesh | null = null
  private distortionHole: THREE.Mesh | null = null
  private distortionDisc: THREE.Mesh | null = null

  // Render targets
  private noisesRenderTarget: THREE.WebGLRenderTarget | null = null

  // Textures
  private gradientTexture: THREE.CanvasTexture | null = null
  private noisesTexture: THREE.Texture | null = null

  // Materials (for uniform updates)
  private discMaterial: THREE.ShaderMaterial | null = null

  constructor(config: BlackHoleConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.group = new THREE.Group()
    this.init()
  }

  private init(): void {
    this.createGradientTexture()
    this.createNoisesTexture()
    this.createDisc()
    this.createDistortionElements()
    this.createEventHorizon()
  }

  private createGradientTexture(): void {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 128

    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)

    const colors = this.config.discColors
    colors.forEach((color, i) => {
      gradient.addColorStop(i / (colors.length - 1), color)
    })

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    this.gradientTexture = new THREE.CanvasTexture(canvas)
  }

  private createNoisesTexture(): void {
    // Create a simple noise texture using canvas
    // In production, this would use the render target approach
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    const imageData = ctx.createImageData(size, size)
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise1 = Math.random()
      const noise2 = Math.random()
      const noise3 = Math.random()
      const noise4 = Math.random()
      imageData.data[i] = noise1 * 255
      imageData.data[i + 1] = noise2 * 255
      imageData.data[i + 2] = noise3 * 255
      imageData.data[i + 3] = noise4 * 255
    }
    ctx.putImageData(imageData, 0, 0)

    this.noisesTexture = new THREE.CanvasTexture(canvas)
    this.noisesTexture.wrapS = THREE.RepeatWrapping
    this.noisesTexture.wrapT = THREE.RepeatWrapping
  }

  private createDisc(): void {
    const geometry = new THREE.CylinderGeometry(
      this.config.discInnerRadius,
      this.config.discOuterRadius,
      0,
      64,
      8,
      true
    )

    this.discMaterial = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: accretionDiskVertexShader,
      fragmentShader: accretionDiskFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uGradientTexture: { value: this.gradientTexture },
        uNoisesTexture: { value: this.noisesTexture },
      },
    })

    this.disc = new THREE.Mesh(geometry, this.discMaterial)
    this.group.add(this.disc)
  }

  private createDistortionElements(): void {
    // Distortion hole (center)
    const holeGeometry = new THREE.PlaneGeometry(4 * this.config.size, 4 * this.config.size)
    const holeMaterial = new THREE.ShaderMaterial({
      vertexShader: distortionHoleVertexShader,
      fragmentShader: distortionHoleFragmentShader,
      transparent: true,
    })
    this.distortionHole = new THREE.Mesh(holeGeometry, holeMaterial)
    // Don't add to main group - this is for separate render pass

    // Distortion disc
    const discDistGeometry = new THREE.PlaneGeometry(12 * this.config.size, 12 * this.config.size)
    const discDistMaterial = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: distortionDiscVertexShader,
      fragmentShader: distortionDiscFragmentShader,
    })
    this.distortionDisc = new THREE.Mesh(discDistGeometry, discDistMaterial)
    this.distortionDisc.rotation.x = -Math.PI * 0.5
    // Don't add to main group - this is for separate render pass
  }

  private createEventHorizon(): void {
    // Pure black event horizon sphere
    const geometry = new THREE.SphereGeometry(this.config.size, 32, 32)
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const eventHorizon = new THREE.Mesh(geometry, material)
    this.group.add(eventHorizon)

    // Photon sphere (dim outer glow)
    const photonGeometry = new THREE.SphereGeometry(this.config.size * 1.1, 32, 32)
    const photonMaterial = new THREE.MeshBasicMaterial({
      color: 0x220033,
      transparent: true,
      opacity: 0.8,
    })
    const photonSphere = new THREE.Mesh(photonGeometry, photonMaterial)
    this.group.add(photonSphere)
  }

  /**
   * Update animation
   */
  update(deltaTime: number, elapsedTime: number): void {
    // Rotate disc
    if (this.disc) {
      this.disc.rotation.y = elapsedTime * this.config.rotationSpeed
    }

    // Update shader uniforms
    if (this.discMaterial) {
      this.discMaterial.uniforms.uTime.value = elapsedTime
    }
  }

  /**
   * Get distortion meshes for separate render pass
   */
  getDistortionMeshes(): { hole: THREE.Mesh | null; disc: THREE.Mesh | null } {
    return {
      hole: this.distortionHole,
      disc: this.distortionDisc,
    }
  }

  /**
   * Update config
   */
  setConfig(config: Partial<BlackHoleConfig>): void {
    this.config = { ...this.config, ...config }
    // Would need to rebuild meshes for geometry changes
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.gradientTexture?.dispose()
    this.noisesTexture?.dispose()
    this.noisesRenderTarget?.dispose()

    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (child.material instanceof THREE.Material) {
          child.material.dispose()
        }
      }
    })
  }
}

/**
 * Create shader material presets for use in R3F
 */
export function createBlackHoleShaderMaterials(config: BlackHoleConfig = {}): {
  discMaterial: THREE.ShaderMaterial
  distortionHoleMaterial: THREE.ShaderMaterial
  distortionDiscMaterial: THREE.ShaderMaterial
} {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }

  // Gradient texture
  const gradientCanvas = document.createElement('canvas')
  gradientCanvas.width = 1
  gradientCanvas.height = 128
  const ctx = gradientCanvas.getContext('2d')!
  const gradient = ctx.createLinearGradient(0, 0, 0, gradientCanvas.height)
  fullConfig.discColors.forEach((color, i) => {
    gradient.addColorStop(i / (fullConfig.discColors.length - 1), color)
  })
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, gradientCanvas.width, gradientCanvas.height)
  const gradientTexture = new THREE.CanvasTexture(gradientCanvas)

  // Simple noise texture
  const noiseCanvas = document.createElement('canvas')
  noiseCanvas.width = 256
  noiseCanvas.height = 256
  const noiseCtx = noiseCanvas.getContext('2d')!
  const imageData = noiseCtx.createImageData(256, 256)
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = Math.random() * 255
    imageData.data[i + 1] = Math.random() * 255
    imageData.data[i + 2] = Math.random() * 255
    imageData.data[i + 3] = Math.random() * 255
  }
  noiseCtx.putImageData(imageData, 0, 0)
  const noisesTexture = new THREE.CanvasTexture(noiseCanvas)
  noisesTexture.wrapS = THREE.RepeatWrapping
  noisesTexture.wrapT = THREE.RepeatWrapping

  return {
    discMaterial: new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: accretionDiskVertexShader,
      fragmentShader: accretionDiskFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uGradientTexture: { value: gradientTexture },
        uNoisesTexture: { value: noisesTexture },
      },
    }),
    distortionHoleMaterial: new THREE.ShaderMaterial({
      vertexShader: distortionHoleVertexShader,
      fragmentShader: distortionHoleFragmentShader,
      transparent: true,
    }),
    distortionDiscMaterial: new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: distortionDiscVertexShader,
      fragmentShader: distortionDiscFragmentShader,
    }),
  }
}
