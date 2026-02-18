/**
 * Particle Effects System using three.quarks
 *
 * High-performance VFX for space combat:
 * - Explosions (ship destruction, missile impact)
 * - Laser/projectile trails
 * - Engine exhaust
 * - Shield impacts
 * - Warp effects
 *
 * Note: Type assertions are used due to three.quarks using its own
 * Vector types that are structurally compatible but not assignable
 * to THREE.Vector types.
 */

import * as THREE from 'three'
import {
  BatchedRenderer,
  ParticleSystem,
  ConstantValue,
  IntervalValue,
  ConstantColor,
  SizeOverLife,
  PiecewiseBezier,
  Bezier,
  ColorOverLife,
  Gradient,
  RenderMode,
  SphereEmitter,
  PointEmitter,
  ConeEmitter,
  ApplyForce,
} from 'three.quarks'

// ============================================================================
// BATCH RENDERER SINGLETON
// ============================================================================

let batchRenderer: BatchedRenderer | null = null

/**
 * Get or create the particle batch renderer
 * Add this to your scene once: scene.add(getParticleBatchRenderer())
 */
export function getParticleBatchRenderer(): BatchedRenderer {
  if (!batchRenderer) {
    batchRenderer = new BatchedRenderer()
  }
  return batchRenderer
}

/**
 * Update particles - call in animation loop
 */
export function updateParticles(delta: number): void {
  if (batchRenderer) {
    batchRenderer.update(delta)
  }
}

/**
 * Dispose of particle system
 */
export function disposeParticles(): void {
  if (batchRenderer) {
    // BatchedRenderer may not have dispose in all versions
    // Clean up by removing from parent if it exists
    if (batchRenderer.parent) {
      batchRenderer.parent.remove(batchRenderer)
    }
    batchRenderer = null
  }
}

// ============================================================================
// HELPER: Create Vector4 for quarks
// ============================================================================

function createColorVec(r: number, g: number, b: number, a: number = 1): unknown {
  // Return object with same structure as quarks Vector4
  return { x: r, y: g, z: b, w: a }
}

function createVec3(x: number, y: number, z: number): unknown {
  return { x, y, z }
}

// ============================================================================
// EXPLOSION EFFECTS
// ============================================================================

/**
 * Create a ship explosion effect
 */
export function createExplosionEffect(
  position: THREE.Vector3,
  scale: number = 1,
  color: THREE.Color = new THREE.Color(0xff6600)
): ParticleSystem {
  const system = new ParticleSystem({
    duration: 2,
    looping: false,
    startLife: new IntervalValue(0.5, 1.5),
    startSpeed: new IntervalValue(5 * scale, 15 * scale),
    startSize: new IntervalValue(0.5 * scale, 2 * scale),
    startColor: new ConstantColor(createColorVec(color.r, color.g, color.b, 1) as never),
    worldSpace: true,

    emissionOverTime: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(50),
        cycle: 1,
        interval: 0.01,
        probability: 1,
      },
    ],

    shape: new SphereEmitter({
      radius: 0.5 * scale,
      thickness: 1,
    }),

    material: new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),

    renderMode: RenderMode.BillBoard,
    renderOrder: 1,

    behaviors: [
      new SizeOverLife(
        new PiecewiseBezier([[new Bezier(1, 0.8, 0.2, 0), 0]])
      ),
      new ColorOverLife(
        new Gradient(
          [
            [createVec3(1, 0.8, 0.2) as never, 0],
            [createVec3(1, 0.3, 0) as never, 0.5],
            [createVec3(0.2, 0.1, 0.1) as never, 1],
          ],
          [
            [1, 0],
            [0.8, 0.5],
            [0, 1],
          ]
        )
      ),
    ],
  })

  system.emitter.position.copy(position)

  const renderer = getParticleBatchRenderer()
  renderer.addSystem(system)

  // Auto-remove after effect completes
  setTimeout(() => {
    renderer.deleteSystem(system)
  }, 3000)

  return system
}

/**
 * Create a small impact explosion (projectile hit)
 */
export function createImpactEffect(
  position: THREE.Vector3,
  normal: THREE.Vector3 = new THREE.Vector3(0, 1, 0),
  color: THREE.Color = new THREE.Color(0xffaa00)
): ParticleSystem {
  const system = new ParticleSystem({
    duration: 0.5,
    looping: false,
    startLife: new IntervalValue(0.1, 0.3),
    startSpeed: new IntervalValue(2, 5),
    startSize: new IntervalValue(0.1, 0.3),
    startColor: new ConstantColor(createColorVec(color.r, color.g, color.b, 1) as never),
    worldSpace: true,

    emissionOverTime: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(20),
        cycle: 1,
        interval: 0.01,
        probability: 1,
      },
    ],

    shape: new ConeEmitter({
      radius: 0.1,
      arc: Math.PI * 2,
      thickness: 0,
      angle: Math.PI / 6, // 30 degree cone
    }),

    material: new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),

    renderMode: RenderMode.BillBoard,
  })

  system.emitter.position.copy(position)
  system.emitter.lookAt(position.clone().add(normal))

  const renderer = getParticleBatchRenderer()
  renderer.addSystem(system)

  setTimeout(() => {
    renderer.deleteSystem(system)
  }, 1000)

  return system
}

// ============================================================================
// WEAPON EFFECTS
// ============================================================================

/**
 * Create a laser beam trail effect
 */
export function createLaserTrail(
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: THREE.Color = new THREE.Color(0x00ff00),
  duration: number = 0.3
): ParticleSystem {
  const direction = end.clone().sub(start)
  const length = direction.length()
  const midpoint = start.clone().add(direction.clone().multiplyScalar(0.5))

  const system = new ParticleSystem({
    duration: duration,
    looping: false,
    startLife: new ConstantValue(duration),
    startSpeed: new ConstantValue(0),
    startSize: new IntervalValue(0.05, 0.1),
    startColor: new ConstantColor(createColorVec(color.r, color.g, color.b, 1) as never),
    worldSpace: true,

    emissionOverTime: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(Math.floor(length * 10)),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],

    shape: new PointEmitter(),

    material: new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),

    renderMode: RenderMode.StretchedBillBoard,
    speedFactor: 0.1,
  })

  system.emitter.position.copy(midpoint)

  const renderer = getParticleBatchRenderer()
  renderer.addSystem(system)

  setTimeout(() => {
    renderer.deleteSystem(system)
  }, duration * 1000 + 500)

  return system
}

// ============================================================================
// ENGINE EFFECTS
// ============================================================================

/**
 * Create engine exhaust trail
 */
export function createEngineExhaust(
  position: THREE.Vector3,
  direction: THREE.Vector3,
  color: THREE.Color = new THREE.Color(0x3399ff),
  intensity: number = 1
): ParticleSystem {
  const system = new ParticleSystem({
    duration: -1, // Infinite
    looping: true,
    startLife: new IntervalValue(0.2, 0.5),
    startSpeed: new IntervalValue(3 * intensity, 8 * intensity),
    startSize: new IntervalValue(0.1 * intensity, 0.3 * intensity),
    startColor: new ConstantColor(createColorVec(color.r, color.g, color.b, 1) as never),
    worldSpace: true,

    emissionOverTime: new ConstantValue(50 * intensity),

    shape: new ConeEmitter({
      radius: 0.05 * intensity,
      arc: Math.PI * 2,
      thickness: 0,
      angle: Math.PI / 12, // 15 degree cone
    }),

    material: new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),

    renderMode: RenderMode.StretchedBillBoard,
    speedFactor: 0.5,

    behaviors: [
      new SizeOverLife(
        new PiecewiseBezier([[new Bezier(1, 0.5, 0.1, 0), 0]])
      ),
      new ColorOverLife(
        new Gradient(
          [
            [createVec3(color.r, color.g, color.b) as never, 0],
            [createVec3(0.2, 0.4, 1) as never, 0.5],
            [createVec3(0.1, 0.1, 0.5) as never, 1],
          ],
          [
            [1, 0],
            [0.5, 0.5],
            [0, 1],
          ]
        )
      ),
    ],
  })

  system.emitter.position.copy(position)
  system.emitter.lookAt(position.clone().add(direction))

  const renderer = getParticleBatchRenderer()
  renderer.addSystem(system)

  return system
}

/**
 * Stop and remove an engine exhaust effect
 */
export function removeEngineExhaust(system: ParticleSystem): void {
  const renderer = getParticleBatchRenderer()
  renderer.deleteSystem(system)
}

// ============================================================================
// SHIELD EFFECTS
// ============================================================================

/**
 * Create shield impact ripple effect
 */
export function createShieldImpact(
  position: THREE.Vector3,
  normal: THREE.Vector3,
  radius: number = 1,
  color: THREE.Color = new THREE.Color(0x00aaff)
): ParticleSystem {
  const system = new ParticleSystem({
    duration: 0.5,
    looping: false,
    startLife: new ConstantValue(0.5),
    startSpeed: new ConstantValue(0),
    startSize: new IntervalValue(0.5 * radius, radius),
    startColor: new ConstantColor(createColorVec(color.r, color.g, color.b, 0.8) as never),
    worldSpace: true,

    emissionOverTime: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(1),
        cycle: 1,
        interval: 0,
        probability: 1,
      },
    ],

    shape: new PointEmitter(),

    material: new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),

    renderMode: RenderMode.BillBoard,

    behaviors: [
      new SizeOverLife(
        new PiecewiseBezier([[new Bezier(0.2, 1, 1.5, 2), 0]])
      ),
      new ColorOverLife(
        new Gradient(
          [
            [createVec3(color.r, color.g, color.b) as never, 0],
            [createVec3(color.r * 0.5, color.g * 0.5, color.b * 0.5) as never, 1],
          ],
          [
            [0.8, 0],
            [0, 1],
          ]
        )
      ),
    ],
  })

  system.emitter.position.copy(position)

  const renderer = getParticleBatchRenderer()
  renderer.addSystem(system)

  setTimeout(() => {
    renderer.deleteSystem(system)
  }, 1000)

  return system
}

// ============================================================================
// WARP EFFECTS
// ============================================================================

/**
 * Create warp/FTL entry effect
 */
export function createWarpEffect(
  position: THREE.Vector3,
  direction: THREE.Vector3,
  color: THREE.Color = new THREE.Color(0x6699ff)
): ParticleSystem {
  const system = new ParticleSystem({
    duration: 1,
    looping: false,
    startLife: new IntervalValue(0.5, 1),
    startSpeed: new IntervalValue(20, 50),
    startSize: new IntervalValue(0.1, 0.3),
    startColor: new ConstantColor(createColorVec(color.r, color.g, color.b, 1) as never),
    worldSpace: true,

    emissionOverTime: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(100),
        cycle: 1,
        interval: 0.01,
        probability: 1,
      },
    ],

    shape: new ConeEmitter({
      radius: 2,
      arc: Math.PI * 2,
      thickness: 0,
      angle: Math.PI / 8,
    }),

    material: new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),

    renderMode: RenderMode.StretchedBillBoard,
    speedFactor: 1,

    behaviors: [
      new SizeOverLife(
        new PiecewiseBezier([[new Bezier(0.5, 1, 0.5, 0), 0]])
      ),
    ],
  })

  system.emitter.position.copy(position)
  system.emitter.lookAt(position.clone().add(direction))

  const renderer = getParticleBatchRenderer()
  renderer.addSystem(system)

  setTimeout(() => {
    renderer.deleteSystem(system)
  }, 2000)

  return system
}

// ============================================================================
// DEBRIS EFFECTS
// ============================================================================

/**
 * Create floating debris particles
 */
export function createDebrisField(
  position: THREE.Vector3,
  radius: number = 5,
  count: number = 30
): ParticleSystem {
  const system = new ParticleSystem({
    duration: -1, // Infinite
    looping: true,
    startLife: new IntervalValue(5, 10),
    startSpeed: new IntervalValue(0.1, 0.5),
    startSize: new IntervalValue(0.05, 0.2),
    startColor: new ConstantColor(createColorVec(0.5, 0.5, 0.5, 1) as never),
    worldSpace: true,

    emissionOverTime: new ConstantValue(count / 5),

    shape: new SphereEmitter({
      radius: radius,
      thickness: 1,
    }),

    material: new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
    }),

    renderMode: RenderMode.Mesh,

    behaviors: [
      new ApplyForce(createVec3(0, 0, 0) as never, new ConstantValue(0)), // No gravity in space
    ],
  })

  system.emitter.position.copy(position)

  const renderer = getParticleBatchRenderer()
  renderer.addSystem(system)

  return system
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Create a custom particle effect from parameters
 */
export interface CustomEffectParams {
  position: THREE.Vector3
  color?: THREE.Color
  particleCount?: number
  lifetime?: number
  speed?: number
  size?: number
  looping?: boolean
}

export function createCustomEffect(params: CustomEffectParams): ParticleSystem {
  const {
    position,
    color = new THREE.Color(0xffffff),
    particleCount = 50,
    lifetime = 1,
    speed = 5,
    size = 0.2,
    looping = false,
  } = params

  const system = new ParticleSystem({
    duration: looping ? -1 : lifetime * 2,
    looping,
    startLife: new IntervalValue(lifetime * 0.5, lifetime),
    startSpeed: new IntervalValue(speed * 0.5, speed),
    startSize: new IntervalValue(size * 0.5, size),
    startColor: new ConstantColor(createColorVec(color.r, color.g, color.b, 1) as never),
    worldSpace: true,

    emissionOverTime: looping ? new ConstantValue(particleCount / lifetime) : new ConstantValue(0),
    emissionBursts: looping
      ? []
      : [
          {
            time: 0,
            count: new ConstantValue(particleCount),
            cycle: 1,
            interval: 0,
            probability: 1,
          },
        ],

    shape: new SphereEmitter({ radius: 0.5, thickness: 1 }),

    material: new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),

    renderMode: RenderMode.BillBoard,

    behaviors: [
      new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.5, 0.1, 0), 0]])),
    ],
  })

  system.emitter.position.copy(position)

  const renderer = getParticleBatchRenderer()
  renderer.addSystem(system)

  if (!looping) {
    setTimeout(() => {
      renderer.deleteSystem(system)
    }, lifetime * 2000 + 500)
  }

  return system
}
