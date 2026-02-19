/**
 * Asset Manifest
 *
 * Central registry of all game assets with paths and metadata.
 * All paths are relative to /assets/ in the public directory.
 */

// ============================================================================
// 3D MODELS
// ============================================================================

const MODEL_BASE = '/assets/models/rt'

export const SHIP_MODELS = {
  // Kenney Space Kit - player ships
  craft_cargoA: `${MODEL_BASE}/ships/craft_cargoA.glb`,
  craft_cargoB: `${MODEL_BASE}/ships/craft_cargoB.glb`,
  craft_miner: `${MODEL_BASE}/ships/craft_miner.glb`,
  craft_racer: `${MODEL_BASE}/ships/craft_racer.glb`,
  craft_speederA: `${MODEL_BASE}/ships/craft_speederA.glb`,
  craft_speederB: `${MODEL_BASE}/ships/craft_speederB.glb`,
  craft_speederC: `${MODEL_BASE}/ships/craft_speederC.glb`,
  craft_speederD: `${MODEL_BASE}/ships/craft_speederD.glb`,
  // Quaternius - player ships
  spaceship_a: `${MODEL_BASE}/ships/spaceship_a.glb`,
  spaceship_b: `${MODEL_BASE}/ships/spaceship_b.glb`,
  spaceship_c: `${MODEL_BASE}/ships/spaceship_c.glb`,
  spaceship_d: `${MODEL_BASE}/ships/spaceship_d.glb`,
  // Quaternius - NPC ships
  npc_fighter: `${MODEL_BASE}/ships/npc_fighter.glb`,
  npc_battleship: `${MODEL_BASE}/ships/npc_battleship.glb`,
  npc_frigate: `${MODEL_BASE}/ships/npc_frigate.glb`,
} as const

export const ASTEROID_MODELS = {
  meteor: `${MODEL_BASE}/asteroids/meteor.glb`,
  meteor_detailed: `${MODEL_BASE}/asteroids/meteor_detailed.glb`,
  meteor_half: `${MODEL_BASE}/asteroids/meteor_half.glb`,
  rock_a: `${MODEL_BASE}/asteroids/Rock.glb`,
  rock_large_a: `${MODEL_BASE}/asteroids/Rock_Large.glb`,
  rock_large_b: `${MODEL_BASE}/asteroids/Rock_Large-d2VWOdthtR.glb`,
  rock_large_c: `${MODEL_BASE}/asteroids/Rock_Large-li0YBlBEMz.glb`,
  rock_b: `${MODEL_BASE}/asteroids/Rock-34W5ymEePk.glb`,
  rock_c: `${MODEL_BASE}/asteroids/Rock-b7gRkv0cEa.glb`,
  rock_d: `${MODEL_BASE}/asteroids/Rock-R2UjZAX3By.glb`,
} as const

export const STATION_MODELS = {
  base_large: `${MODEL_BASE}/stations/Base_Large.glb`,
  building: `${MODEL_BASE}/stations/Building_L.glb`,
  connector: `${MODEL_BASE}/stations/Connector.glb`,
  geodesic_dome: `${MODEL_BASE}/stations/Geodesic_Dome.glb`,
  house_cylinder: `${MODEL_BASE}/stations/House_Cylinder.glb`,
  house_long: `${MODEL_BASE}/stations/House_Long.glb`,
  house_open: `${MODEL_BASE}/stations/House_Open.glb`,
  house_pod: `${MODEL_BASE}/stations/House_Pod.glb`,
  house_single: `${MODEL_BASE}/stations/House_Single.glb`,
  house_support: `${MODEL_BASE}/stations/House_Single_Support.glb`,
  satellite_dish: `${MODEL_BASE}/stations/satelliteDish.glb`,
  satellite_detailed: `${MODEL_BASE}/stations/satelliteDish_detailed.glb`,
  satellite_large: `${MODEL_BASE}/stations/satelliteDish_large.glb`,
  turret_double: `${MODEL_BASE}/stations/turret_double.glb`,
  turret_single: `${MODEL_BASE}/stations/turret_single.glb`,
} as const

export const PLANET_MODELS = {
  planet_a: `${MODEL_BASE}/planets/Planet.glb`,
  planet_b: `${MODEL_BASE}/planets/Planet-18Uxrb2dIc.glb`,
  planet_c: `${MODEL_BASE}/planets/Planet-4NxxeyYMPJ.glb`,
  planet_d: `${MODEL_BASE}/planets/Planet-5zzi8WUMXj.glb`,
  planet_e: `${MODEL_BASE}/planets/Planet-9g1aIbfR9Y.glb`,
  planet_f: `${MODEL_BASE}/planets/Planet-B7xd3SZq0z.glb`,
  planet_g: `${MODEL_BASE}/planets/Planet-EC1Lk2IamI.glb`,
  planet_h: `${MODEL_BASE}/planets/Planet-hKZtOOMadH.glb`,
  planet_i: `${MODEL_BASE}/planets/Planet-IVnmauIgWX.glb`,
  planet_j: `${MODEL_BASE}/planets/Planet-pHZz4EMvVM.glb`,
  planet_k: `${MODEL_BASE}/planets/Planet-rYguWNNPvA.glb`,
} as const

// ============================================================================
// SKYBOXES
// ============================================================================

const SKYBOX_BASE = '/assets/skyboxes'

export const SKYBOXES = {
  rogland_night: `${SKYBOX_BASE}/rogland_clear_night_2k.hdr`,
  dikhololo_night: `${SKYBOX_BASE}/dikhololo_night_2k.hdr`,
} as const

// ============================================================================
// AUDIO - SFX
// ============================================================================

const SFX_BASE = '/assets/audio/sfx'

export const SFX = {
  // Engine sounds
  engine_loop_1: `${SFX_BASE}/engineCircular_000.ogg`,
  engine_loop_2: `${SFX_BASE}/engineCircular_001.ogg`,
  engine_loop_3: `${SFX_BASE}/engineCircular_002.ogg`,
  engine_loop_4: `${SFX_BASE}/engineCircular_003.ogg`,
  engine_loop_5: `${SFX_BASE}/engineCircular_004.ogg`,

  // Explosions
  explosion_1: `${SFX_BASE}/explosionCrunch_000.ogg`,
  explosion_2: `${SFX_BASE}/explosionCrunch_001.ogg`,
  explosion_3: `${SFX_BASE}/explosionCrunch_002.ogg`,
  explosion_4: `${SFX_BASE}/explosionCrunch_003.ogg`,

  // Lasers
  laser_1: `${SFX_BASE}/laserLarge_000.ogg`,
  laser_2: `${SFX_BASE}/laserLarge_001.ogg`,
  laser_3: `${SFX_BASE}/laserLarge_002.ogg`,
  laser_4: `${SFX_BASE}/laserLarge_003.ogg`,
  laser_small_1: `${SFX_BASE}/laserSmall_000.ogg`,
  laser_small_2: `${SFX_BASE}/laserSmall_001.ogg`,
  laser_small_3: `${SFX_BASE}/laserSmall_002.ogg`,
  laser_small_4: `${SFX_BASE}/laserSmall_003.ogg`,
  laser_retro_1: `${SFX_BASE}/laserRetro_000.ogg`,
  laser_retro_2: `${SFX_BASE}/laserRetro_001.ogg`,
  laser_retro_3: `${SFX_BASE}/laserRetro_002.ogg`,
  laser_retro_4: `${SFX_BASE}/laserRetro_003.ogg`,

  // Impacts / Shields
  impact_1: `${SFX_BASE}/impactMetal_000.ogg`,
  impact_2: `${SFX_BASE}/impactMetal_001.ogg`,
  impact_3: `${SFX_BASE}/impactMetal_002.ogg`,
  impact_4: `${SFX_BASE}/impactMetal_003.ogg`,
  impact_5: `${SFX_BASE}/impactMetal_004.ogg`,

  // Shield effects
  force_field_1: `${SFX_BASE}/forceField_000.ogg`,
  force_field_2: `${SFX_BASE}/forceField_001.ogg`,
  force_field_3: `${SFX_BASE}/forceField_002.ogg`,
  force_field_4: `${SFX_BASE}/forceField_003.ogg`,

  // Computer / UI
  computer_1: `${SFX_BASE}/computerNoise_000.ogg`,
  computer_2: `${SFX_BASE}/computerNoise_001.ogg`,
  computer_3: `${SFX_BASE}/computerNoise_002.ogg`,
  computer_4: `${SFX_BASE}/computerNoise_003.ogg`,

  // Door (docking)
  dock_open: `${SFX_BASE}/doorOpen_000.ogg`,
  dock_close: `${SFX_BASE}/doorClose_000.ogg`,

  // Low frequency explosions
  explosion_low_1: `${SFX_BASE}/lowFrequency_explosion_000.ogg`,
  explosion_low_2: `${SFX_BASE}/lowFrequency_explosion_001.ogg`,

  // Mining impacts
  mining_1: `${SFX_BASE}/impactMining_000.ogg`,
  mining_2: `${SFX_BASE}/impactMining_001.ogg`,
  mining_3: `${SFX_BASE}/impactMining_002.ogg`,
  mining_4: `${SFX_BASE}/impactMining_003.ogg`,
  mining_5: `${SFX_BASE}/impactMining_004.ogg`,

  // Space engines (additional loops)
  space_engine_1: `${SFX_BASE}/spaceEngine_000.ogg`,
  space_engine_2: `${SFX_BASE}/spaceEngine_001.ogg`,
  space_engine_large_1: `${SFX_BASE}/spaceEngineLarge_000.ogg`,
  space_engine_large_2: `${SFX_BASE}/spaceEngineLarge_001.ogg`,
  space_engine_low_1: `${SFX_BASE}/spaceEngineLow_000.ogg`,
  space_engine_low_2: `${SFX_BASE}/spaceEngineLow_001.ogg`,
  space_engine_small_1: `${SFX_BASE}/spaceEngineSmall_000.ogg`,
  space_engine_small_2: `${SFX_BASE}/spaceEngineSmall_001.ogg`,

  // Thruster
  thruster_1: `${SFX_BASE}/thrusterFire_000.ogg`,
  thruster_2: `${SFX_BASE}/thrusterFire_001.ogg`,
  thruster_3: `${SFX_BASE}/thrusterFire_002.ogg`,

  // UI sounds
  ui_click: `${SFX_BASE}/click_001.ogg`,
  ui_hover: `${SFX_BASE}/select_001.ogg`,
  ui_confirm: `${SFX_BASE}/confirmation_001.ogg`,
  ui_cancel: `${SFX_BASE}/error_004.ogg`,
  ui_open: `${SFX_BASE}/open_001.ogg`,
  ui_close: `${SFX_BASE}/close_001.ogg`,
  ui_switch: `${SFX_BASE}/switch_001.ogg`,
  ui_minimize: `${SFX_BASE}/minimize_001.ogg`,
} as const

// ============================================================================
// AUDIO - MUSIC
// ============================================================================

const MUSIC_BASE = '/assets/audio/music'

export const MUSIC = {
  space_out_there: `${MUSIC_BASE}/space_out_there.ogg`,
  ambient_monoliths: `${MUSIC_BASE}/ambient_monoliths.mp3`,
  ambient_caller: `${MUSIC_BASE}/ambient_caller.mp3`,
  ambient_booya: `${MUSIC_BASE}/ambient_booya.mp3`,
} as const

const AMBIENT_BASE = '/assets/audio/ambient'

export const AMBIENT = {
  scifi_city: `${AMBIENT_BASE}/scifi_city_loop.ogg`,
} as const

// ============================================================================
// TEXTURES
// ============================================================================

const TEXTURE_BASE = '/assets/textures/rt'

export const PARTICLE_TEXTURES = {
  circle: `${TEXTURE_BASE}/particles/circle_01.png`,
  flare: `${TEXTURE_BASE}/particles/flare_01.png`,
  light: `${TEXTURE_BASE}/particles/light_01.png`,
  smoke: `${TEXTURE_BASE}/particles/smoke_01.png`,
  spark: `${TEXTURE_BASE}/particles/spark_01.png`,
  star: `${TEXTURE_BASE}/particles/star_01.png`,
  trace: `${TEXTURE_BASE}/particles/trace_01.png`,
  twirl: `${TEXTURE_BASE}/particles/twirl_01.png`,
} as const

// ============================================================================
// SHIP TYPE → MODEL MAPPING (for game logic)
// ============================================================================

/** Maps game ship_type_id to a 3D model path */
export const SHIP_TYPE_MODEL_MAP: Record<string, string> = {
  // Frigates
  rifter: SHIP_MODELS.craft_speederA,
  punisher: SHIP_MODELS.craft_speederB,
  merlin: SHIP_MODELS.craft_speederC,
  incursus: SHIP_MODELS.craft_speederD,
  // Cruisers
  rupture: SHIP_MODELS.spaceship_a,
  maller: SHIP_MODELS.spaceship_b,
  caracal: SHIP_MODELS.spaceship_c,
  thorax: SHIP_MODELS.spaceship_d,
  // Industrials
  mammoth: SHIP_MODELS.craft_cargoA,
  bestower: SHIP_MODELS.craft_cargoB,
  // Mining
  venture: SHIP_MODELS.craft_miner,
  // Fast
  interceptor: SHIP_MODELS.craft_racer,
  // NPCs
  npc_fighter: SHIP_MODELS.npc_fighter,
  npc_battleship: SHIP_MODELS.npc_battleship,
  npc_frigate: SHIP_MODELS.npc_frigate,
}

/** Get 3D model path for a ship type, with fallback */
export function getShipModel(shipTypeId: string): string {
  return SHIP_TYPE_MODEL_MAP[shipTypeId] ?? SHIP_MODELS.craft_speederA
}

/** Get a random asteroid model path */
export function getRandomAsteroidModel(seed: number): string {
  const models = Object.values(ASTEROID_MODELS)
  return models[Math.abs(seed) % models.length]
}

/** Get a random planet model path */
export function getRandomPlanetModel(seed: number): string {
  const models = Object.values(PLANET_MODELS)
  return models[Math.abs(seed) % models.length]
}
