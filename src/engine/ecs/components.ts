/**
 * ECS Components (bitecs 0.4.x)
 *
 * Components are plain objects with TypedArrays indexed by entity ID.
 * Max 10,000 concurrent entities.
 */

const MAX_ENTITIES = 10_000

export const Position = {
  x: new Float64Array(MAX_ENTITIES),
  y: new Float64Array(MAX_ENTITIES),
  z: new Float64Array(MAX_ENTITIES),
}

export const Velocity = {
  x: new Float64Array(MAX_ENTITIES),
  y: new Float64Array(MAX_ENTITIES),
  z: new Float64Array(MAX_ENTITIES),
}

export const Rotation = {
  x: new Float32Array(MAX_ENTITIES),
  y: new Float32Array(MAX_ENTITIES),
  z: new Float32Array(MAX_ENTITIES),
}

export const Health = {
  hp: new Float32Array(MAX_ENTITIES),
  hpMax: new Float32Array(MAX_ENTITIES),
  shield: new Float32Array(MAX_ENTITIES),
  shieldMax: new Float32Array(MAX_ENTITIES),
  armor: new Float32Array(MAX_ENTITIES),
  armorMax: new Float32Array(MAX_ENTITIES),
}

export const ShipMeta = {
  shipTypeId: new Uint8Array(MAX_ENTITIES),
  faction: new Uint8Array(MAX_ENTITIES),
  state: new Uint8Array(MAX_ENTITIES),
  isNpc: new Uint8Array(MAX_ENTITIES),
  isDocked: new Uint8Array(MAX_ENTITIES),
}

export const NetworkId = {
  sessionIndex: new Uint32Array(MAX_ENTITIES),
}

export const RenderRef = {
  meshIndex: new Int32Array(MAX_ENTITIES),
  lodLevel: new Uint8Array(MAX_ENTITIES),
}

export const InputIntent = {
  targetEid: new Int32Array(MAX_ENTITIES),
  moveToX:   new Float64Array(MAX_ENTITIES),
  moveToY:   new Float64Array(MAX_ENTITIES),
  moveToZ:   new Float64Array(MAX_ENTITIES),
  wantFire:  new Uint8Array(MAX_ENTITIES),
  wantWarp:  new Uint8Array(MAX_ENTITIES),
  wantDock:  new Uint8Array(MAX_ENTITIES),
}

export const ALL_COMPONENTS = [
  Position,
  Velocity,
  Rotation,
  Health,
  ShipMeta,
  NetworkId,
  RenderRef,
  InputIntent,
] as const
