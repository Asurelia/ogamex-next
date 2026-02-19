import * as THREE from 'three'
import { SeededRandom } from '@/lib/galaxy/prng'
import { createInstancedStars } from '@/lib/3d/instanced-stars'
import { createVolumetricNebula } from '@/lib/3d/volumetric-nebula'
import { createSunMaterial } from '@/lib/3d/materials'
import { BlackHoleSystem } from '@/lib/3d/black-hole-shader'
import { createProceduralPlanet, type ProceduralPlanetType } from '@/lib/3d/procedural-planet'
import type { SystemNode } from '@/data/universe-graph'
import type { SceneManager } from '../SceneManager'
import { createPulsarMaterial } from './shaders/pulsar-shader'

// Map StarTypeId strings to sun shader colors
const STAR_TYPE_COLORS: Record<string, { color: string; coronaColor: string; size: number }> = {
  O: { color: '#9bb0ff', coronaColor: '#aaccff', size: 8 },
  B: { color: '#c8d8ff', coronaColor: '#aabbff', size: 6 },
  A: { color: '#ffffff', coronaColor: '#eeeeff', size: 4 },
  F: { color: '#fffbe0', coronaColor: '#ffe4aa', size: 3.5 },
  G: { color: '#ffe066', coronaColor: '#ff8800', size: 3 },
  K: { color: '#ffa040', coronaColor: '#ff6600', size: 2.5 },
  M: { color: '#ff4444', coronaColor: '#cc2200', size: 2 },
}

const PLANET_TYPES: ProceduralPlanetType[] = [
  'rocky', 'desert', 'ice', 'water', 'jungle', 'gas_giant', 'lava',
]

export class SystemSceneBuilder {
  private pulsarMeshes: THREE.Mesh[] = []
  private pulsarTime: number = 0

  build(system: SystemNode, sceneManager: SceneManager): void {
    sceneManager.clearAllLayers()
    this.pulsarMeshes = []
    this.pulsarTime = 0

    const rng = new SeededRandom(system.seed)

    this.buildStarfield(system, sceneManager, rng)
    this.buildNebula(system, sceneManager, rng)

    if (system.hasBlackHole) {
      this.buildBlackHole(system, sceneManager, rng)
    } else if (system.hasPulsar) {
      this.buildPulsar(system, sceneManager, rng)
    } else {
      this.buildStar(system, sceneManager, rng)
    }

    this.buildPlanets(system, sceneManager, rng)
    this.buildAsteroidBelt(system, sceneManager, rng)
    this.buildStations(system, sceneManager, rng)
    this.buildStargates(system, sceneManager, rng)
  }

  private buildStarfield(
    system: SystemNode,
    sceneManager: SceneManager,
    rng: SeededRandom,
  ): void {
    const layer = sceneManager.getLayer('background')
    const starCount = rng.nextInt(1000, 3000)

    const stars = createInstancedStars({
      maxStars: starCount,
      lodNear: 200,
      lodMedium: 800,
      lodFar: 5000,
    })

    stars.generateRandomStars(starCount, 2000)
    layer.add(stars)
  }

  private buildNebula(
    system: SystemNode,
    sceneManager: SceneManager,
    rng: SeededRandom,
  ): void {
    const layer = sceneManager.getLayer('background')

    // Derive nebula colors from system seed
    const hue = rng.nextFloat(0, 1)
    const primaryH = hue
    const secondaryH = (hue + 0.25 + rng.nextFloat(-0.1, 0.1)) % 1
    const primaryColor = new THREE.Color().setHSL(primaryH, 0.7, 0.2)
    const secondaryColor = new THREE.Color().setHSL(secondaryH, 0.8, 0.3)
    const density = rng.nextFloat(0.15, 0.45)

    const nebula = createVolumetricNebula({
      primaryColor,
      secondaryColor,
      density,
      steps: 12,
      seed: rng.nextFloat(0, 1000),
    })

    layer.add(nebula)
  }

  private buildStar(
    system: SystemNode,
    sceneManager: SceneManager,
    rng: SeededRandom,
  ): void {
    const layer = sceneManager.getLayer('midground')
    const starId = String(system.starType).toUpperCase()
    const preset = STAR_TYPE_COLORS[starId] ?? STAR_TYPE_COLORS['G']

    const geometry = new THREE.SphereGeometry(preset.size, 32, 32)
    const material = createSunMaterial({
      color: preset.color,
      coronaColor: preset.coronaColor,
      intensity: 1.0 + rng.nextFloat(0, 0.5),
    })

    const starMesh = new THREE.Mesh(geometry, material)
    starMesh.name = 'system_star'

    // Point light from star
    const light = new THREE.PointLight(new THREE.Color(preset.color), 3, 0, 1.5)
    starMesh.add(light)

    layer.add(starMesh)
  }

  private buildBlackHole(
    system: SystemNode,
    sceneManager: SceneManager,
    rng: SeededRandom,
  ): void {
    const layer = sceneManager.getLayer('midground')
    const bh = new BlackHoleSystem({
      size: rng.nextFloat(1.2, 2.0),
      discInnerRadius: 2,
      discOuterRadius: 7,
      rotationSpeed: rng.nextFloat(0.3, 0.8),
    })
    bh.group.name = 'black_hole'
    layer.add(bh.group)
  }

  private buildPulsar(
    system: SystemNode,
    sceneManager: SceneManager,
    rng: SeededRandom,
  ): void {
    const layer = sceneManager.getLayer('midground')

    const geometry = new THREE.SphereGeometry(rng.nextFloat(1.0, 2.0), 32, 32)
    const material = createPulsarMaterial()

    const pulsarMesh = new THREE.Mesh(geometry, material)
    pulsarMesh.name = 'pulsar'

    // Pulsing point light
    const light = new THREE.PointLight(0x00ffff, 2, 0, 2)
    pulsarMesh.add(light)

    this.pulsarMeshes.push(pulsarMesh)
    layer.add(pulsarMesh)
  }

  private buildPlanets(
    system: SystemNode,
    sceneManager: SceneManager,
    rng: SeededRandom,
  ): void {
    const layer = sceneManager.getLayer('midground')
    const planetCount = rng.nextInt(2, 5)

    for (let i = 0; i < planetCount; i++) {
      const orbitDistance = 15 + i * (12 + rng.nextFloat(0, 8))
      const angle = rng.nextFloat(0, Math.PI * 2)
      const x = Math.cos(angle) * orbitDistance
      const z = Math.sin(angle) * orbitDistance
      const y = rng.nextFloat(-2, 2)

      const planetType = PLANET_TYPES[rng.nextInt(0, PLANET_TYPES.length - 1)]
      const radius = rng.nextFloat(0.4, 1.5)
      const hasAtmosphere = rng.nextBool(0.6)
      const hasRings = rng.nextBool(0.15)

      const planet = createProceduralPlanet({
        type: planetType,
        seed: rng.nextFloat(0, 1),
        radius,
        hasAtmosphere,
        cloudDensity: hasAtmosphere ? rng.nextFloat(0, 0.5) : 0,
        ringSystem: hasRings,
      })

      planet.position.set(x, y, z)
      planet.name = `planet_${i}`
      layer.add(planet)
    }
  }

  private buildAsteroidBelt(
    system: SystemNode,
    sceneManager: SceneManager,
    rng: SeededRandom,
  ): void {
    const layer = sceneManager.getLayer('midground')

    const beltRng = new SeededRandom(system.asteroidBeltSeed)
    const beltRadius = 60 + beltRng.nextFloat(0, 20)
    const rockCount = 300

    const geometry = new THREE.IcosahedronGeometry(0.15, 0)
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x555555),
      roughness: 0.9,
      metalness: 0.1,
    })

    const belt = new THREE.InstancedMesh(geometry, material, rockCount)
    belt.name = 'asteroid_belt'

    const matrix = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const rot = new THREE.Euler()
    const quat = new THREE.Quaternion()
    const scale = new THREE.Vector3()

    for (let i = 0; i < rockCount; i++) {
      const angle = beltRng.nextFloat(0, Math.PI * 2)
      const spread = beltRng.nextFloat(-4, 4)
      const r = beltRadius + spread
      pos.set(
        Math.cos(angle) * r,
        beltRng.nextFloat(-1.5, 1.5),
        Math.sin(angle) * r,
      )
      rot.set(
        beltRng.nextFloat(0, Math.PI * 2),
        beltRng.nextFloat(0, Math.PI * 2),
        beltRng.nextFloat(0, Math.PI * 2),
      )
      quat.setFromEuler(rot)
      const s = beltRng.nextFloat(0.5, 2.5)
      scale.set(s, s * beltRng.nextFloat(0.5, 1.5), s)
      matrix.compose(pos, quat, scale)
      belt.setMatrixAt(i, matrix)
    }

    belt.instanceMatrix.needsUpdate = true
    layer.add(belt)
  }

  private buildStations(
    system: SystemNode,
    sceneManager: SceneManager,
    rng: SeededRandom,
  ): void {
    const layer = sceneManager.getLayer('foreground')
    const count = system.stationCount ?? rng.nextInt(1, 3)

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rng.nextFloat(-0.2, 0.2)
      const dist = rng.nextFloat(8, 18)
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      const y = rng.nextFloat(-1, 1)

      const geometry = new THREE.BoxGeometry(
        rng.nextFloat(0.8, 1.5),
        rng.nextFloat(0.4, 0.8),
        rng.nextFloat(0.8, 1.5),
      )
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x334466),
        metalness: 0.8,
        roughness: 0.3,
        emissive: new THREE.Color(0x112233),
        emissiveIntensity: 0.5,
      })

      const station = new THREE.Mesh(geometry, material)
      station.position.set(x, y, z)
      station.rotation.y = rng.nextFloat(0, Math.PI * 2)
      station.name = `station_${i}`
      layer.add(station)
    }
  }

  private buildStargates(
    system: SystemNode,
    sceneManager: SceneManager,
    rng: SeededRandom,
  ): void {
    const layer = sceneManager.getLayer('foreground')
    const gateCount = Math.min(system.connections?.length ?? 2, 4)

    for (let i = 0; i < gateCount; i++) {
      const angle = (i / gateCount) * Math.PI * 2
      const dist = rng.nextFloat(80, 120)
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      const y = rng.nextFloat(-5, 5)

      // Double torus stargate placeholder
      const outerTorus = new THREE.TorusGeometry(1.5, 0.2, 8, 24)
      const innerTorus = new THREE.TorusGeometry(0.8, 0.1, 6, 16)
      const gateMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x4488cc),
        metalness: 0.9,
        roughness: 0.2,
        emissive: new THREE.Color(0x0044aa),
        emissiveIntensity: 0.6,
      })

      const gateGroup = new THREE.Group()
      gateGroup.name = `stargate_${i}`

      const outerMesh = new THREE.Mesh(outerTorus, gateMaterial)
      const innerMesh = new THREE.Mesh(innerTorus, gateMaterial)
      innerMesh.rotation.x = Math.PI / 4

      gateGroup.add(outerMesh)
      gateGroup.add(innerMesh)
      gateGroup.position.set(x, y, z)
      gateGroup.lookAt(0, 0, 0)

      layer.add(gateGroup)
    }
  }

  update(deltaTime: number): void {
    this.pulsarTime += deltaTime
    for (const mesh of this.pulsarMeshes) {
      const mat = mesh.material as THREE.ShaderMaterial
      if (mat.uniforms?.uTime) {
        mat.uniforms.uTime.value = this.pulsarTime
      }
    }
  }
}
