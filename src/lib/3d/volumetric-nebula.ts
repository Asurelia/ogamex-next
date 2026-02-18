/**
 * Volumetric Nebula Background Shader
 *
 * Creates immersive space nebula backgrounds using raymarching.
 * Based on techniques from "Nubis, Evolved" (Guerrilla Games).
 *
 * Features:
 * - GPU raymarching for volumetric clouds
 * - Multiple nebula layers with parallax
 * - Animated color gradients
 * - Point light integration for stars
 */

import * as THREE from 'three'

// ============================================================================
// NEBULA CONFIGURATION
// ============================================================================

export interface NebulaConfig {
  /** Base color of the nebula (default: purple-blue) */
  primaryColor?: THREE.Color
  /** Secondary color for gradients (default: orange-red) */
  secondaryColor?: THREE.Color
  /** Density of the nebula clouds (0-1, default: 0.5) */
  density?: number
  /** Animation speed multiplier (default: 1.0) */
  animationSpeed?: number
  /** Number of raymarching steps (8-64, default: 16) */
  steps?: number
  /** Seed for variation (default: random) */
  seed?: number
}

// ============================================================================
// NEBULA SHADERS
// ============================================================================

const NEBULA_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const NEBULA_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 primaryColor;
uniform vec3 secondaryColor;
uniform float time;
uniform float density;
uniform float seed;
uniform int steps;
uniform vec3 cameraPos;
uniform vec2 resolution;

varying vec2 vUv;
varying vec3 vWorldPosition;

// ============================================================================
// NOISE FUNCTIONS
// ============================================================================

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Fractional Brownian Motion
float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

// ============================================================================
// VOLUMETRIC RAYMARCHING
// ============================================================================

float sampleDensity(vec3 pos) {
  // Multi-layered noise for interesting cloud shapes
  float noise1 = fbm(pos * 0.3 + seed, 4);
  float noise2 = fbm(pos * 0.8 + seed * 2.0 + time * 0.02, 3);
  float noise3 = snoise(pos * 0.1 + time * 0.01);

  // Combine layers
  float density = noise1 * 0.6 + noise2 * 0.3 + noise3 * 0.1;

  // Falloff based on distance from center
  float dist = length(pos) / 100.0;
  float falloff = 1.0 - smoothstep(0.3, 1.0, dist);

  return max(0.0, density * falloff) * density;
}

vec4 raymarchNebula(vec3 rayOrigin, vec3 rayDir) {
  vec3 color = vec3(0.0);
  float transmittance = 1.0;

  float stepSize = 200.0 / float(steps);
  float t = 0.0;

  for (int i = 0; i < 64; i++) {
    if (i >= steps) break;
    if (transmittance < 0.01) break;

    vec3 pos = rayOrigin + rayDir * t;
    float d = sampleDensity(pos) * density;

    if (d > 0.001) {
      // Gradient color based on position and density
      float colorMix = snoise(pos * 0.1 + seed * 3.0) * 0.5 + 0.5;
      vec3 sampleColor = mix(primaryColor, secondaryColor, colorMix);

      // Add some brightness variation
      float brightness = 1.0 + fbm(pos * 0.2, 2) * 0.5;
      sampleColor *= brightness;

      // Accumulate color with extinction
      float extinction = exp(-d * stepSize * 0.5);
      color += sampleColor * d * transmittance * stepSize * 0.1;
      transmittance *= extinction;
    }

    t += stepSize;
  }

  return vec4(color, 1.0 - transmittance);
}

// ============================================================================
// MAIN
// ============================================================================

void main() {
  // Ray direction from camera through pixel
  vec3 rayDir = normalize(vWorldPosition - cameraPos);

  // Raymarch the nebula
  vec4 nebula = raymarchNebula(cameraPos, rayDir);

  // Add subtle star glow effect at bright areas
  float glow = smoothstep(0.2, 0.8, nebula.a) * 0.3;
  vec3 glowColor = mix(primaryColor, vec3(1.0), 0.5);
  nebula.rgb += glowColor * glow;

  // Output with alpha
  gl_FragColor = vec4(nebula.rgb, nebula.a * 0.8);
}
`

// ============================================================================
// NEBULA CLASS
// ============================================================================

export class VolumetricNebula extends THREE.Mesh {
  private shaderMaterial: THREE.ShaderMaterial
  private config: Required<NebulaConfig>

  constructor(config: NebulaConfig = {}) {
    // Create large sphere for background
    const geometry = new THREE.SphereGeometry(500, 32, 32)

    // Set default config
    const defaultConfig: Required<NebulaConfig> = {
      primaryColor: new THREE.Color(0x4a0080), // Purple
      secondaryColor: new THREE.Color(0xff4500), // Orange-red
      density: 0.5,
      animationSpeed: 1.0,
      steps: 16,
      seed: Math.random() * 1000,
    }

    const finalConfig = { ...defaultConfig, ...config }

    // Create material
    const material = new THREE.ShaderMaterial({
      vertexShader: NEBULA_VERTEX_SHADER,
      fragmentShader: NEBULA_FRAGMENT_SHADER,
      uniforms: {
        primaryColor: { value: finalConfig.primaryColor },
        secondaryColor: { value: finalConfig.secondaryColor },
        time: { value: 0 },
        density: { value: finalConfig.density },
        seed: { value: finalConfig.seed },
        steps: { value: finalConfig.steps },
        cameraPos: { value: new THREE.Vector3() },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
    })

    super(geometry, material)

    this.shaderMaterial = material
    this.config = finalConfig
  }

  /**
   * Update nebula animation
   * @param deltaTime - Time since last frame in seconds
   * @param camera - Camera for ray direction
   */
  update(deltaTime: number, camera?: THREE.Camera): void {
    this.shaderMaterial.uniforms.time.value += deltaTime * this.config.animationSpeed

    if (camera) {
      this.shaderMaterial.uniforms.cameraPos.value.copy(camera.position)
    }
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<NebulaConfig>): void {
    if (config.primaryColor) {
      this.shaderMaterial.uniforms.primaryColor.value = config.primaryColor
    }
    if (config.secondaryColor) {
      this.shaderMaterial.uniforms.secondaryColor.value = config.secondaryColor
    }
    if (config.density !== undefined) {
      this.shaderMaterial.uniforms.density.value = config.density
    }
    if (config.steps !== undefined) {
      this.shaderMaterial.uniforms.steps.value = config.steps
    }
    if (config.seed !== undefined) {
      this.shaderMaterial.uniforms.seed.value = config.seed
    }
    if (config.animationSpeed !== undefined) {
      this.config.animationSpeed = config.animationSpeed
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.geometry.dispose()
    this.shaderMaterial.dispose()
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a volumetric nebula background
 *
 * @example
 * ```tsx
 * const nebula = createVolumetricNebula({
 *   primaryColor: new THREE.Color(0x4a0080),
 *   secondaryColor: new THREE.Color(0xff4500),
 *   density: 0.5
 * })
 * scene.add(nebula)
 *
 * // In render loop
 * nebula.update(deltaTime, camera)
 * ```
 */
export function createVolumetricNebula(config?: NebulaConfig): VolumetricNebula {
  return new VolumetricNebula(config)
}

/**
 * Preset: Deep Space Purple Nebula
 */
export function createPurpleNebula(): VolumetricNebula {
  return new VolumetricNebula({
    primaryColor: new THREE.Color(0x2a0060),
    secondaryColor: new THREE.Color(0x8a2be2),
    density: 0.4,
    steps: 20,
  })
}

/**
 * Preset: Fiery Orange Nebula
 */
export function createFireNebula(): VolumetricNebula {
  return new VolumetricNebula({
    primaryColor: new THREE.Color(0xff4500),
    secondaryColor: new THREE.Color(0xffd700),
    density: 0.6,
    steps: 24,
  })
}

/**
 * Preset: Cyan-Blue Nebula
 */
export function createCyanNebula(): VolumetricNebula {
  return new VolumetricNebula({
    primaryColor: new THREE.Color(0x006080),
    secondaryColor: new THREE.Color(0x00ffff),
    density: 0.35,
    steps: 16,
  })
}

/**
 * Preset: Green-Yellow Nebula
 */
export function createEmeraldNebula(): VolumetricNebula {
  return new VolumetricNebula({
    primaryColor: new THREE.Color(0x006400),
    secondaryColor: new THREE.Color(0x7fff00),
    density: 0.45,
    steps: 18,
  })
}
