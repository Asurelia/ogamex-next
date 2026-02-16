/**
 * Procedural Planet Generator
 *
 * Generates infinite planet variations using GPU shaders instead of textures.
 * Uses seeded noise for reproducible results across sessions.
 *
 * Benefits:
 * - 0 texture files needed (saves ~50MB bandwidth)
 * - Infinite variety from seed
 * - GPU-accelerated rendering
 * - Consistent across all clients (deterministic)
 */

import * as THREE from 'three'

// ============================================================================
// PLANET CONFIGURATION TYPES
// ============================================================================

export type ProceduralPlanetType =
  | 'rocky'      // Inner planets, craters, barren
  | 'desert'     // Hot, sandy, dunes
  | 'ice'        // Frozen, blue-white
  | 'water'      // Ocean world, clouds
  | 'jungle'     // Green, vegetation
  | 'gas_giant'  // Bands, storms
  | 'lava'       // Volcanic, red-orange

export interface PlanetParams {
  type: ProceduralPlanetType
  seed: number
  radius: number
  hasAtmosphere: boolean
  atmosphereColor?: THREE.Color
  cloudDensity?: number  // 0-1
  ringSystem?: boolean
}

export interface PlanetColors {
  primary: THREE.Color
  secondary: THREE.Color
  accent: THREE.Color
  atmosphere: THREE.Color
}

// ============================================================================
// COLOR PALETTES BY PLANET TYPE
// ============================================================================

const PLANET_PALETTES: Record<ProceduralPlanetType, PlanetColors> = {
  rocky: {
    primary: new THREE.Color(0x8B7355),    // Brown
    secondary: new THREE.Color(0x696969),  // Gray
    accent: new THREE.Color(0x4a4a4a),     // Dark gray (craters)
    atmosphere: new THREE.Color(0x888888),
  },
  desert: {
    primary: new THREE.Color(0xD2B48C),    // Tan
    secondary: new THREE.Color(0xF4A460),  // Sandy brown
    accent: new THREE.Color(0x8B4513),     // Saddle brown
    atmosphere: new THREE.Color(0xFFE4B5),
  },
  ice: {
    primary: new THREE.Color(0xADD8E6),    // Light blue
    secondary: new THREE.Color(0xFFFFFF),  // White
    accent: new THREE.Color(0x87CEEB),     // Sky blue
    atmosphere: new THREE.Color(0xB0E0E6),
  },
  water: {
    primary: new THREE.Color(0x1E90FF),    // Dodger blue
    secondary: new THREE.Color(0x228B22),  // Forest green (land)
    accent: new THREE.Color(0x006400),     // Dark green
    atmosphere: new THREE.Color(0x87CEEB),
  },
  jungle: {
    primary: new THREE.Color(0x228B22),    // Forest green
    secondary: new THREE.Color(0x006400),  // Dark green
    accent: new THREE.Color(0x8FBC8F),     // Sea green
    atmosphere: new THREE.Color(0x90EE90),
  },
  gas_giant: {
    primary: new THREE.Color(0xDAA520),    // Goldenrod
    secondary: new THREE.Color(0xCD853F),  // Peru
    accent: new THREE.Color(0x8B4513),     // Storm bands
    atmosphere: new THREE.Color(0xFFE4C4),
  },
  lava: {
    primary: new THREE.Color(0x8B0000),    // Dark red
    secondary: new THREE.Color(0xFF4500),  // Orange red
    accent: new THREE.Color(0xFFD700),     // Gold (lava)
    atmosphere: new THREE.Color(0xFF6347),
  },
}

// ============================================================================
// GLSL SHADERS
// ============================================================================

const VERTEX_SHADER = /* glsl */`
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT_SHADER = /* glsl */`
uniform vec3 primaryColor;
uniform vec3 secondaryColor;
uniform vec3 accentColor;
uniform float seed;
uniform float time;
uniform int planetType;
uniform float cloudDensity;
uniform float noiseScale;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

// ============================================================================
// NOISE FUNCTIONS (Simplex 3D)
// ============================================================================

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
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

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

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

// Fractional Brownian Motion for terrain detail
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
// PLANET TYPE SPECIFIC RENDERING
// ============================================================================

vec3 renderRocky(vec3 pos, float seedOffset) {
  // Craters and barren surface
  float terrain = fbm(pos * noiseScale + seedOffset, 5);
  float craters = abs(snoise(pos * noiseScale * 3.0 + seedOffset));

  vec3 color = mix(primaryColor, secondaryColor, terrain * 0.5 + 0.5);
  color = mix(color, accentColor, smoothstep(0.6, 0.8, craters));

  return color;
}

vec3 renderDesert(vec3 pos, float seedOffset) {
  // Dunes and sand patterns
  float dunes = snoise(pos * noiseScale * 2.0 + seedOffset);
  float detail = fbm(pos * noiseScale * 4.0 + seedOffset, 3);

  vec3 color = mix(primaryColor, secondaryColor, dunes * 0.5 + 0.5);
  color = mix(color, accentColor, detail * 0.3);

  return color;
}

vec3 renderIce(vec3 pos, float seedOffset) {
  // Ice caps and frozen terrain
  float ice = fbm(pos * noiseScale + seedOffset, 4);
  float cracks = abs(snoise(pos * noiseScale * 5.0 + seedOffset));

  vec3 color = mix(primaryColor, secondaryColor, ice * 0.5 + 0.5);
  color = mix(color, accentColor, smoothstep(0.7, 0.9, cracks) * 0.5);

  return color;
}

vec3 renderWater(vec3 pos, float seedOffset) {
  // Oceans with continents
  float continents = fbm(pos * noiseScale * 0.8 + seedOffset, 5);
  float oceanThreshold = 0.3;

  // Water vs land
  vec3 color = continents > oceanThreshold
    ? mix(secondaryColor, accentColor, (continents - oceanThreshold) * 2.0)
    : primaryColor;

  // Shorelines
  float shore = smoothstep(oceanThreshold - 0.05, oceanThreshold + 0.05, continents);
  color = mix(color, vec3(0.9, 0.85, 0.7), (1.0 - abs(shore - 0.5) * 2.0) * 0.3);

  return color;
}

vec3 renderJungle(vec3 pos, float seedOffset) {
  // Dense vegetation with variation
  float vegetation = fbm(pos * noiseScale + seedOffset, 4);
  float rivers = abs(snoise(pos * noiseScale * 3.0 + seedOffset));

  vec3 color = mix(primaryColor, secondaryColor, vegetation * 0.5 + 0.5);

  // Rivers/water
  if (rivers < 0.1) {
    color = vec3(0.2, 0.4, 0.8);
  }

  return color;
}

vec3 renderGasGiant(vec3 pos, float seedOffset) {
  // Horizontal bands with storms
  float latitude = pos.y;
  float bands = sin(latitude * 15.0 + snoise(pos * 2.0 + seedOffset) * 2.0);
  float storms = snoise(pos * noiseScale * 0.5 + seedOffset + time * 0.02);

  vec3 color = mix(primaryColor, secondaryColor, bands * 0.5 + 0.5);

  // Great storm spots
  float stormIntensity = smoothstep(0.6, 0.8, storms);
  color = mix(color, accentColor, stormIntensity);

  return color;
}

vec3 renderLava(vec3 pos, float seedOffset) {
  // Volcanic surface with lava flows
  float crust = fbm(pos * noiseScale + seedOffset, 4);
  float lava = snoise(pos * noiseScale * 2.0 + seedOffset + time * 0.1);

  vec3 color = mix(primaryColor, secondaryColor, crust * 0.5 + 0.5);

  // Lava rivers
  float lavaFlow = smoothstep(0.4, 0.6, lava);
  color = mix(color, accentColor, lavaFlow);

  // Glow effect
  color += accentColor * lavaFlow * 0.3;

  return color;
}

// ============================================================================
// MAIN
// ============================================================================

void main() {
  float seedOffset = seed * 100.0;
  vec3 pos = vPosition;
  vec3 color;

  // Select rendering based on planet type
  if (planetType == 0) {
    color = renderRocky(pos, seedOffset);
  } else if (planetType == 1) {
    color = renderDesert(pos, seedOffset);
  } else if (planetType == 2) {
    color = renderIce(pos, seedOffset);
  } else if (planetType == 3) {
    color = renderWater(pos, seedOffset);
  } else if (planetType == 4) {
    color = renderJungle(pos, seedOffset);
  } else if (planetType == 5) {
    color = renderGasGiant(pos, seedOffset);
  } else if (planetType == 6) {
    color = renderLava(pos, seedOffset);
  } else {
    color = primaryColor;
  }

  // Add clouds for atmospheric planets
  if (cloudDensity > 0.0 && planetType != 5) { // Not gas giants
    float clouds = fbm(pos * noiseScale * 1.5 + time * 0.01, 3);
    clouds = smoothstep(0.3, 0.7, clouds);
    color = mix(color, vec3(1.0), clouds * cloudDensity);
  }

  // Basic lighting
  vec3 lightDir = normalize(vec3(1.0, 0.5, 0.5));
  float diffuse = max(dot(vNormal, lightDir), 0.0);
  float ambient = 0.3;

  color *= (ambient + diffuse * 0.7);

  gl_FragColor = vec4(color, 1.0);
}
`

// Atmosphere shader
const ATMOSPHERE_VERTEX = /* glsl */`
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const ATMOSPHERE_FRAGMENT = /* glsl */`
uniform vec3 atmosphereColor;
uniform float intensity;
uniform float power;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 viewDirection = normalize(-vPosition);
  float rim = 1.0 - max(dot(viewDirection, vNormal), 0.0);
  rim = pow(rim, power);

  gl_FragColor = vec4(atmosphereColor, rim * intensity);
}
`

// ============================================================================
// PROCEDURAL PLANET CLASS
// ============================================================================

export class ProceduralPlanet extends THREE.Group {
  private planetMesh: THREE.Mesh
  private atmosphereMesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial
  private params: PlanetParams

  constructor(params: PlanetParams) {
    super()
    this.params = params

    const palette = PLANET_PALETTES[params.type]
    const planetTypeIndex = this.getPlanetTypeIndex(params.type)

    // Create planet material
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        primaryColor: { value: palette.primary },
        secondaryColor: { value: palette.secondary },
        accentColor: { value: palette.accent },
        seed: { value: params.seed },
        time: { value: 0 },
        planetType: { value: planetTypeIndex },
        cloudDensity: { value: params.cloudDensity ?? 0 },
        noiseScale: { value: this.getNoiseScale(params.type) },
      },
    })

    // Create planet geometry
    const geometry = new THREE.SphereGeometry(params.radius, 64, 64)
    this.planetMesh = new THREE.Mesh(geometry, this.material)
    this.add(this.planetMesh)

    // Add atmosphere if enabled
    if (params.hasAtmosphere) {
      this.createAtmosphere(palette.atmosphere)
    }

    // Add ring system if enabled
    if (params.ringSystem) {
      this.createRings()
    }
  }

  private getPlanetTypeIndex(type: ProceduralPlanetType): number {
    const types: ProceduralPlanetType[] = [
      'rocky', 'desert', 'ice', 'water', 'jungle', 'gas_giant', 'lava'
    ]
    return types.indexOf(type)
  }

  private getNoiseScale(type: ProceduralPlanetType): number {
    const scales: Record<ProceduralPlanetType, number> = {
      rocky: 3.0,
      desert: 2.5,
      ice: 2.0,
      water: 1.5,
      jungle: 2.0,
      gas_giant: 1.0,
      lava: 2.5,
    }
    return scales[type]
  }

  private createAtmosphere(color: THREE.Color): void {
    const atmMaterial = new THREE.ShaderMaterial({
      vertexShader: ATMOSPHERE_VERTEX,
      fragmentShader: ATMOSPHERE_FRAGMENT,
      uniforms: {
        atmosphereColor: { value: color },
        intensity: { value: 0.6 },
        power: { value: 3.0 },
      },
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const atmGeometry = new THREE.SphereGeometry(this.params.radius * 1.15, 32, 32)
    this.atmosphereMesh = new THREE.Mesh(atmGeometry, atmMaterial)
    this.add(this.atmosphereMesh)
  }

  private createRings(): void {
    const innerRadius = this.params.radius * 1.4
    const outerRadius = this.params.radius * 2.2

    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xccaa88,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    })

    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.rotation.x = Math.PI / 2
    ring.rotation.y = Math.random() * 0.3
    this.add(ring)
  }

  /**
   * Update animation time (call in render loop)
   */
  update(deltaTime: number): void {
    this.material.uniforms.time.value += deltaTime
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.planetMesh.geometry.dispose()
    this.material.dispose()

    if (this.atmosphereMesh) {
      this.atmosphereMesh.geometry.dispose()
      ;(this.atmosphereMesh.material as THREE.Material).dispose()
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a procedural planet from seed
 *
 * @example
 * ```tsx
 * // In React Three Fiber
 * const planet = createProceduralPlanet({
 *   type: 'water',
 *   seed: 12345,
 *   radius: 1,
 *   hasAtmosphere: true,
 *   cloudDensity: 0.3
 * })
 *
 * scene.add(planet)
 *
 * // In render loop
 * planet.update(deltaTime)
 * ```
 */
export function createProceduralPlanet(params: PlanetParams): ProceduralPlanet {
  return new ProceduralPlanet(params)
}

/**
 * Map legacy planet types to procedural types
 */
export function mapLegacyType(legacyType: string): ProceduralPlanetType {
  const mapping: Record<string, ProceduralPlanetType> = {
    'desert': 'desert',
    'dry': 'rocky',
    'gas': 'gas_giant',
    'ice': 'ice',
    'jungle': 'jungle',
    'normal': 'water',
    'water': 'water',
  }
  return mapping[legacyType] || 'rocky'
}

/**
 * Generate seed from celestial body ID for consistent appearance
 *
 * Converts UUID string to a normalized float (0-1) that can be
 * passed to GLSL shaders. Uses FNV-1a hash for good distribution.
 *
 * @example
 * ```ts
 * const seed = seedFromId('d69bdce0-1234-5678-9abc-def012345678')
 * // Returns: 0.7234... (consistent for same UUID)
 * ```
 */
export function seedFromId(id: string): number {
  // FNV-1a hash - better distribution than simple char code sum
  const FNV_PRIME = 0x01000193
  const FNV_OFFSET = 0x811c9dc5

  let hash = FNV_OFFSET

  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, FNV_PRIME)
  }

  // Convert to unsigned 32-bit
  hash = hash >>> 0

  // Normalize to 0-1 range for shader
  return hash / 0xFFFFFFFF
}

/**
 * Generate multiple seeds from a single ID
 * Useful for different planet properties (surface, clouds, etc.)
 *
 * @example
 * ```ts
 * const seeds = multiSeedFromId('uuid-here', 4)
 * // Returns: [0.234, 0.891, 0.456, 0.123]
 * ```
 */
export function multiSeedFromId(id: string, count: number): number[] {
  const seeds: number[] = []

  for (let i = 0; i < count; i++) {
    // Append index to create variation
    seeds.push(seedFromId(`${id}_${i}`))
  }

  return seeds
}

/**
 * Convert seed to integer for shader uniforms
 * Some shaders expect integer seeds
 */
export function seedToInt(seed: number, maxValue: number = 65535): number {
  return Math.floor(seed * maxValue)
}
