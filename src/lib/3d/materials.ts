/**
 * PBR Materials for OGameX 3D rendering
 * Provides immersive materials for planets, ships, UI elements, and effects
 */

'use client'

import * as THREE from 'three'
import { useMemo } from 'react'
import { ATMOSPHERE_COLORS, type PlanetType } from './constants'

// ============================================================================
// MATERIAL POOL — reuse materials to reduce VRAM usage (~1-5 MB per shader)
// ============================================================================

const materialPool = new Map<string, THREE.Material>()
let poolHits = 0
let poolMisses = 0

/**
 * Get or create a material from the pool.
 * Materials are cached by a composite key to avoid duplicate shader compilations.
 */
function getPooled<T extends THREE.Material>(
  key: string,
  factory: () => T
): T {
  const existing = materialPool.get(key)
  if (existing) {
    poolHits++
    return existing as T
  }
  poolMisses++
  const material = factory()
  materialPool.set(key, material)
  return material
}

/**
 * Build a stable cache key from type + options
 */
function buildKey(type: string, options: Record<string, unknown> = {}): string {
  return `${type}:${JSON.stringify(options, Object.keys(options).sort())}`
}

/**
 * Dispose all pooled materials and clear the pool.
 * Call on full scene teardown.
 */
export function disposeMaterialPool(): void {
  for (const material of materialPool.values()) {
    material.dispose()
  }
  materialPool.clear()
  poolHits = 0
  poolMisses = 0
}

/**
 * Get pool statistics for monitoring.
 */
export function getMaterialPoolStats() {
  const total = poolHits + poolMisses
  return {
    size: materialPool.size,
    hits: poolHits,
    misses: poolMisses,
    hitRate: total > 0 ? `${((poolHits / total) * 100).toFixed(1)}%` : 'N/A'
  }
}

// Material options interfaces
export interface PlanetMaterialOptions {
  atmosphereColor?: string
  emissiveIntensity?: number
  roughness?: number
  metalness?: number
  bumpScale?: number
}

export interface ShipMaterialOptions {
  color?: string
  metalness?: number
  roughness?: number
  emissive?: string
  emissiveIntensity?: number
}

export interface HologramMaterialOptions {
  color?: string
  opacity?: number
  scanlineIntensity?: number
  flickerSpeed?: number
}

export interface SunMaterialOptions {
  color?: string
  intensity?: number
  coronaColor?: string
}

/**
 * Create a PBR material for planet surfaces
 */
export function createPlanetMaterial(
  texture: THREE.Texture,
  options: PlanetMaterialOptions = {}
): THREE.MeshStandardMaterial {
  const {
    atmosphereColor = '#6699cc',
    emissiveIntensity = 0.02,
    roughness = 0.8,
    metalness = 0.1,
    bumpScale = 0.02,
  } = options

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness,
    metalness,
    emissive: new THREE.Color(atmosphereColor),
    emissiveIntensity,
    bumpMap: texture,
    bumpScale,
  })

  return material
}

/**
 * Hook to create planet material with memoization
 */
export function usePlanetMaterial(
  texture: THREE.Texture,
  planetType: PlanetType,
  options: Omit<PlanetMaterialOptions, 'atmosphereColor'> = {}
): THREE.MeshStandardMaterial {
  return useMemo(() => {
    return createPlanetMaterial(texture, {
      ...options,
      atmosphereColor: ATMOSPHERE_COLORS[planetType],
    })
  }, [texture, planetType, options])
}

/**
 * Create atmosphere/glow material for planets
 */
export function createAtmosphereMaterial(
  color: string = '#6699cc',
  opacity: number = 0.3
): THREE.ShaderMaterial {
  const key = buildKey('atmosphere', { color, opacity })
  return getPooled(key, () => {
    const atmosphereVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

    const atmosphereFragmentShader = `
    uniform vec3 glowColor;
    uniform float intensity;
    uniform float power;

    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec3 viewDirection = normalize(-vPosition);
      float rim = 1.0 - max(dot(viewDirection, vNormal), 0.0);
      rim = pow(rim, power);

      gl_FragColor = vec4(glowColor, rim * intensity);
    }
  `

    return new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(color) },
        intensity: { value: opacity },
        power: { value: 3.0 },
      },
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  })
}

/**
 * Hook to create atmosphere material
 */
export function useAtmosphereMaterial(
  planetType: PlanetType,
  opacity: number = 0.3
): THREE.ShaderMaterial {
  return useMemo(() => {
    return createAtmosphereMaterial(ATMOSPHERE_COLORS[planetType], opacity)
  }, [planetType, opacity])
}

/**
 * Create metallic material for spaceships
 */
export function createShipMaterial(options: ShipMaterialOptions = {}): THREE.MeshStandardMaterial {
  const key = buildKey('ship', options as Record<string, unknown>)
  return getPooled(key, () => {
    const {
      color = '#88ccff',
      metalness = 0.9,
      roughness = 0.3,
      emissive = '#001133',
      emissiveIntensity = 0.1,
    } = options

    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness,
      roughness,
      emissive: new THREE.Color(emissive),
      emissiveIntensity,
      envMapIntensity: 1.0,
    })
  })
}

/**
 * Hook to create ship material with memoization
 */
export function useShipMaterial(options: ShipMaterialOptions = {}): THREE.MeshStandardMaterial {
  return useMemo(() => createShipMaterial(options), [options])
}

/**
 * Create holographic material for 3D UI elements
 */
export function createHologramMaterial(options: HologramMaterialOptions = {}): THREE.ShaderMaterial {
  const {
    color = '#00ffff',
    opacity = 0.7,
    scanlineIntensity = 0.1,
    flickerSpeed = 2.0,
  } = options

  const hologramVertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const hologramFragmentShader = `
    uniform vec3 hologramColor;
    uniform float opacity;
    uniform float time;
    uniform float scanlineIntensity;
    uniform float flickerSpeed;

    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
      // Scanlines effect
      float scanline = sin(vUv.y * 100.0) * scanlineIntensity;

      // Flicker effect
      float flicker = 0.95 + 0.05 * sin(time * flickerSpeed * 10.0);

      // Edge glow (fresnel-like)
      vec3 viewDirection = normalize(cameraPosition - vPosition);
      float edge = 1.0 - abs(dot(viewDirection, vNormal));
      edge = pow(edge, 2.0);

      // Combine effects
      float alpha = (opacity + edge * 0.3) * flicker;
      vec3 finalColor = hologramColor * (1.0 + scanline + edge * 0.5);

      gl_FragColor = vec4(finalColor, alpha);
    }
  `

  return new THREE.ShaderMaterial({
    uniforms: {
      hologramColor: { value: new THREE.Color(color) },
      opacity: { value: opacity },
      time: { value: 0 },
      scanlineIntensity: { value: scanlineIntensity },
      flickerSpeed: { value: flickerSpeed },
    },
    vertexShader: hologramVertexShader,
    fragmentShader: hologramFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
}

/**
 * Hook to create hologram material with time animation
 */
export function useHologramMaterial(options: HologramMaterialOptions = {}): THREE.ShaderMaterial {
  return useMemo(() => createHologramMaterial(options), [options])
}

/**
 * Create glowing material for stars/suns
 */
export function createSunMaterial(options: SunMaterialOptions = {}): THREE.ShaderMaterial {
  const {
    color = '#ffff44',
    intensity = 1.5,
    coronaColor = '#ff8800',
  } = options

  const sunVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const sunFragmentShader = `
    uniform vec3 sunColor;
    uniform vec3 coronaColor;
    uniform float intensity;
    uniform float time;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    // Simplex noise function for solar surface
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

    void main() {
      // Animated noise for solar surface
      vec3 noiseCoord = vec3(vUv * 3.0, time * 0.1);
      float noise = snoise(noiseCoord) * 0.5 + 0.5;
      float noise2 = snoise(noiseCoord * 2.0 + 100.0) * 0.5 + 0.5;

      // Mix sun and corona colors based on noise
      vec3 finalColor = mix(sunColor, coronaColor, noise * noise2);

      // Add glow based on view angle
      vec3 viewDir = normalize(-vPosition);
      float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
      rim = pow(rim, 1.5);

      finalColor += coronaColor * rim * 0.5;
      finalColor *= intensity;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `

  return new THREE.ShaderMaterial({
    uniforms: {
      sunColor: { value: new THREE.Color(color) },
      coronaColor: { value: new THREE.Color(coronaColor) },
      intensity: { value: intensity },
      time: { value: 0 },
    },
    vertexShader: sunVertexShader,
    fragmentShader: sunFragmentShader,
  })
}

/**
 * Hook to create sun material
 */
export function useSunMaterial(options: SunMaterialOptions = {}): THREE.ShaderMaterial {
  return useMemo(() => createSunMaterial(options), [options])
}

/**
 * Create shield/energy field material
 */
export function createShieldMaterial(
  color: string = '#44ff88',
  opacity: number = 0.3
): THREE.ShaderMaterial {
  const shieldVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const shieldFragmentShader = `
    uniform vec3 shieldColor;
    uniform float opacity;
    uniform float time;

    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

    void main() {
      // Hexagonal pattern
      vec2 uv = vUv * 20.0;
      vec2 hex = fract(uv) - 0.5;
      float hexPattern = smoothstep(0.4, 0.5, length(hex));

      // Pulse effect
      float pulse = 0.5 + 0.5 * sin(time * 2.0);

      // Fresnel effect
      vec3 viewDir = normalize(-vPosition);
      float fresnel = 1.0 - abs(dot(viewDir, vNormal));
      fresnel = pow(fresnel, 2.0);

      float alpha = (opacity + fresnel * 0.5) * (0.8 + hexPattern * 0.2) * (0.9 + pulse * 0.1);

      gl_FragColor = vec4(shieldColor * (1.0 + fresnel), alpha);
    }
  `

  return new THREE.ShaderMaterial({
    uniforms: {
      shieldColor: { value: new THREE.Color(color) },
      opacity: { value: opacity },
      time: { value: 0 },
    },
    vertexShader: shieldVertexShader,
    fragmentShader: shieldFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
}

/**
 * Create engine trail/exhaust material
 */
export function createEngineTrailMaterial(
  color: string = '#4488ff',
  intensity: number = 1.0
): THREE.MeshBasicMaterial {
  const key = buildKey('engineTrail', { color, intensity })
  return getPooled(key, () =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.8 * intensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  )
}

/**
 * Create laser beam material
 */
export function createLaserMaterial(color: string = '#ff0000'): THREE.MeshBasicMaterial {
  const key = buildKey('laser', { color })
  return getPooled(key, () =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  )
}

/**
 * Update time-based uniforms for animated materials
 */
export function updateMaterialTime(
  material: THREE.ShaderMaterial,
  time: number
): void {
  if (material.uniforms.time) {
    material.uniforms.time.value = time
  }
}
